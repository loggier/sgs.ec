

'use server';

import { revalidatePath } from 'next/cache';
import { addMonths, isBefore, isValid } from 'date-fns';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc,
  collectionGroup,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { UnitFormSchema, type Unit, type UnitFormInput } from './unit-schema';
import type { Client, ClientDisplay } from './schema';
import type { User } from './user-schema';
import { getPgpsDevicesByClientId, getPgpsDeviceDetails, setPgpsDeviceStatus } from './pgps-actions';
import { sendGroupedTemplatedWhatsAppMessage } from './notification-actions';

const convertTimestamps = (docData: any) => {
  const data: { [key: string]: any } = {};
  for (const key in docData) {
      const value = docData[key];
      if (value instanceof Timestamp) {
          data[key] = value.toDate().toISOString();
      } else {
          // This will handle nested objects, though it's not strictly necessary for the current structure.
          if (value && typeof value === 'object' && !Array.isArray(value)) {
              data[key] = convertTimestamps(value);
          } else {
              data[key] = value;
          }
      }
  }
  return data;
};

// This action is no longer needed, as the upload is handled client-side.
// We keep saveContractUrl as it's still used.

export async function saveContractUrl(
    clientId: string,
    unitId: string,
    urlContrato: string
): Promise<{ success: boolean; message: string }> {
    try {
        const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
        await updateDoc(unitDocRef, { urlContrato });
        revalidatePath(`/clients/${clientId}/units`);
        return { success: true, message: 'URL del contrato actualizada.' };
    } catch (error) {
        console.error("Error saving contract URL:", error);
        const message = error instanceof Error ? error.message : 'Error desconocido.';
        return { success: false, message };
    }
}


export async function getUnitsByClientId(clientId: string): Promise<Unit[]> {
  try {
    const unitsCollectionRef = collection(db, 'clients', clientId, 'units');
    const unitSnapshot = await getDocs(unitsCollectionRef);

    const unitsList = await Promise.all(unitSnapshot.docs.map(async (doc) => {
      const data = convertTimestamps(doc.data());
      let unit: Unit = { id: doc.id, clientId, ...data } as Unit;

      // Ensure fechaSuspension is a string if it exists
      if (data.fechaSuspension) {
          unit.fechaSuspension = data.fechaSuspension;
      }
      
      // Enrich with P. GPS device status if linked
      if (unit.pgpsDeviceId) {
        const { device } = await getPgpsDeviceDetails(unit.pgpsDeviceId);
        if (device) {
          unit.pgpsDeviceActive = device.active;
        }
      }
      return unit;
    }));

    return unitsList;
  } catch (error) {
    console.error("Error getting units by client ID:", error);
    return [];
  }
}

const getUnit = async (clientId: string, unitId: string): Promise<Unit | null> => {
    const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
    const unitDoc = await getDoc(unitDocRef);
    if (!unitDoc.exists()) return null;

    const data = convertTimestamps(unitDoc.data());
    let unit: Unit = { id: unitDoc.id, clientId, ...data } as Unit;

     // Ensure fechaSuspension is a string if it exists
    if (data.fechaSuspension) {
        unit.fechaSuspension = data.fechaSuspension;
    }

    // Enrich with P. GPS device status if linked
    if (unit.pgpsDeviceId) {
        const { device } = await getPgpsDeviceDetails(unit.pgpsDeviceId);
        if (device) {
            unit.pgpsDeviceActive = device.active;
        }
    }

    return unit;
}


export async function saveUnit(
  data: UnitFormInput,
  clientId: string,
  user: User | null,
  unitId?: string
): Promise<{ success: boolean; message:string; unit?: Unit }> {
  if (!user || !['master', 'manager', 'analista'].includes(user.role)) {
      return { success: false, message: 'No tiene permiso para modificar unidades.' };
  }
  
  const clientDocRef = doc(db, 'clients', clientId);
  const clientDoc = await getDoc(clientDocRef);
  if (!clientDoc.exists()) {
      return { success: false, message: 'El cliente especificado no existe.' };
  }
  const clientData = clientDoc.data() as Client;

  const clientOwnerId = clientData.ownerId;
  const canModify = user.role === 'master' ||
                    clientOwnerId === user.id ||
                    (user.role === 'analista' && clientOwnerId === user.creatorId);

  if (!canModify) {
      return { success: false, message: 'No tiene permiso para añadir/editar unidades para este cliente.' };
  }

  const validation = UnitFormSchema.safeParse(data);

  if (!validation.success) {
    console.log(validation.error.errors);
    return { success: false, message: 'Datos de unidad no válidos.' };
  }
  
  try {
    const { ...unitDataForFirestore } = validation.data;
    
    // Auto-link with P. GPS device based on IMEI
    if (clientData.pgpsId && unitDataForFirestore.imei) {
        const { devices: pgpsDevices } = await getPgpsDevicesByClientId(clientData.pgpsId);
        const matchedDevice = pgpsDevices.find(d => d.imei === unitDataForFirestore.imei);
        unitDataForFirestore.pgpsDeviceId = matchedDevice ? String(matchedDevice.id) : undefined;
    } else {
        unitDataForFirestore.pgpsDeviceId = undefined;
    }
    
    if (unitDataForFirestore.tipoContrato === 'sin_contrato') {
      unitDataForFirestore.costoTotalContrato = undefined;
      unitDataForFirestore.mesesContrato = undefined;
      unitDataForFirestore.saldoContrato = undefined;
      unitDataForFirestore.numeroOperacion = undefined;
    } else {
      unitDataForFirestore.costoMensual = undefined;
    }

    // When creating a new unit, set the balance and initial dates.
    if (!unitId) {
        unitDataForFirestore.ultimoPago = null;
        if(unitDataForFirestore.tipoContrato === 'con_contrato') {
            unitDataForFirestore.saldoContrato = unitDataForFirestore.costoTotalContrato;
        }
    }
    
    const unitsCollectionRef = collection(db, 'clients', clientId, 'units');
    let savedUnitId = unitId;

    // Clean up undefined/null/empty values before saving
    const cleanedData = Object.entries(unitDataForFirestore).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            (acc as any)[key] = value;
        }
        return acc;
    }, {});


    if (savedUnitId) {
        await updateDoc(doc(unitsCollectionRef, savedUnitId), cleanedData);
    } else {
        const newUnitRef = await addDoc(unitsCollectionRef, cleanedData);
        savedUnitId = newUnitRef.id;
    }

    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/units');
    const savedUnit = await getUnit(clientId, savedUnitId!);
    return { success: true, message: 'Unidad guardada con éxito.', unit: savedUnit! };

  } catch (error) {
    console.error("Error saving unit:", error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado al guardar la unidad.';
    return { success: false, message: errorMessage };
  }
}

export async function deleteUnit(unitId: string, clientId: string, user: User | null): Promise<{ success: boolean; message: string }> {
  if (!user || !['master', 'manager', 'analista'].includes(user.role)) {
    return { success: false, message: 'Acción no permitida.' };
  }

  try {
    const clientDocRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists()) {
      return { success: false, message: 'El cliente especificado no existe.' };
    }

    const clientOwnerId = clientDoc.data().ownerId;
    const canDelete =
      user.role === 'master' ||
      clientOwnerId === user.id ||
      (user.role === 'analista' && clientOwnerId === user.creatorId);

    if (!canDelete) {
      return {
        success: false,
        message: 'No tiene permiso para eliminar unidades de este cliente.',
      };
    }
    
    const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
    await deleteDoc(unitDocRef);
    
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/units');
    return { success: true, message: 'Unidad eliminada con éxito.' };
  } catch (error) {
    console.error("Error deleting unit:", error);
    return { success: false, message: 'Error al eliminar la unidad.' };
  }
}

export async function bulkDeleteUnits(
  units: { unitId: string; clientId: string }[],
  user: User | null
): Promise<{ success: boolean; message: string }> {
  if (!user || !['master', 'manager'].includes(user.role)) {
    return { success: false, message: 'No tiene permiso para eliminar unidades.' };
  }

  try {
    const batch = writeBatch(db);
    let successCount = 0;

    for (const { unitId, clientId } of units) {
      const clientDocRef = doc(db, 'clients', clientId);
      const clientDoc = await getDoc(clientDocRef);
      if (clientDoc.exists()) {
        const clientOwnerId = clientDoc.data().ownerId;
        const canDelete =
          user.role === 'master' ||
          clientOwnerId === user.id ||
          (user.role === 'analista' && clientOwnerId === user.creatorId);

        if (canDelete) {
          const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
          batch.delete(unitDocRef);
          successCount++;
        }
      }
    }

    if (successCount === 0) {
      return { success: false, message: 'No se pudo eliminar ninguna de las unidades seleccionadas (verifique permisos).' };
    }

    await batch.commit();
    revalidatePath('/units');
    if (units.length > 0) {
        revalidatePath(`/clients/${units[0].clientId}/units`);
    }

    return { success: true, message: `${successCount} unidad(es) eliminada(s) con éxito.` };
  } catch (error) {
    console.error("Error during bulk delete:", error);
    return { success: false, message: 'Ocurrió un error al eliminar las unidades.' };
  }
}


export async function getAllUnits(currentUser: User): Promise<(Unit)[]> {
    if (!currentUser) return [];

    try {
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        
        let ownerIdToFilter = currentUser.id;
        if (currentUser.role === 'analista' && currentUser.creatorId) {
            ownerIdToFilter = currentUser.creatorId;
        }

        const userClients = clientsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ClientDisplay))
            .filter(client => currentUser.role === 'master' || client.ownerId === ownerIdToFilter);

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

        const allUnitsPromises = userClients.map(async (client) => {
            const unitsSnapshot = await getDocs(collection(db, 'clients', client.id, 'units'));
            const owner = client.ownerId ? usersMap.get(client.ownerId) : null;

            const clientUnitsPromises = unitsSnapshot.docs.map(async (unitDoc) => {
                const data = convertTimestamps(unitDoc.data());
                
                const unit: any = {
                    id: unitDoc.id,
                    clientId: client.id,
                    clientName: client.nomSujeto,
                    ownerId: client.ownerId,
                    ownerName: owner?.nombre || 'Propietario Desconocido',
                    ...data,
                };
                
                // Enrich with P. GPS device status if linked
                if (unit.pgpsDeviceId) {
                    const { device } = await getPgpsDeviceDetails(unit.pgpsDeviceId);
                    if (device) {
                        unit.pgpsDeviceActive = device.active;
                    }
                }
                return unit;
            });
            return Promise.all(clientUnitsPromises);
        });
        
        const allUnitsNested = await Promise.all(allUnitsPromises);
        const allUnits = allUnitsNested.flat();

        return allUnits as Unit[];
    } catch (error) {
        console.error("Error getting all units:", error);
        return [];
    }
}


export async function importPgpsDevicesAsUnits(
    clientId: string,
    clientPgpsId: string
): Promise<{ success: boolean; message: string; importedCount?: number }> {
    try {
        // 1. Fetch devices from P. GPS
        const { devices: pgpsDevices, error: pgpsError } = await getPgpsDevicesByClientId(clientPgpsId);
        if (pgpsError) {
            return { success: false, message: `No se pudo obtener dispositivos de P. GPS: ${pgpsError}` };
        }
        if (pgpsDevices.length === 0) {
            return { success: true, message: 'No hay nuevos dispositivos para importar desde P. GPS.', importedCount: 0 };
        }

        // 2. Fetch existing units from local DB
        const existingUnits = await getUnitsByClientId(clientId);
        const existingImeis = new Set(existingUnits.map(unit => unit.imei));

        // 3. Filter for new devices to import
        const devicesToImport = pgpsDevices.filter(device => !existingImeis.has(device.imei));

        if (devicesToImport.length === 0) {
            return { success: true, message: 'Todas las unidades de P. GPS ya están sincronizadas.', importedCount: 0 };
        }

        // 4. Create new unit objects and batch write to Firestore
        const batch = writeBatch(db);
        const unitsCollectionRef = collection(db, 'clients', clientId, 'units');

        devicesToImport.forEach(device => {
            const newUnitRef = doc(unitsCollectionRef); // Create a new doc reference
            const now = new Date();
            const newUnitData: Omit<Unit, 'id' | 'clientId'> = {
                pgpsDeviceId: String(device.id),
                estaSuspendido: false,
                imei: device.imei,
                placa: device.name, // Use P. GPS device name as default plate
                modelo: 'Importado desde P. GPS',
                tipoPlan: 'estandar-sc',
                tipoContrato: 'sin_contrato',
                costoMensual: 0, // Default cost, indicating it needs configuration
                fechaInstalacion: now,
                fechaSuspension: null,
                fechaInicioContrato: now,
                fechaVencimiento: addMonths(now, 1),
                ultimoPago: null,
                fechaSiguientePago: addMonths(now, 1),
                diasCorte: 0,
                observacion: `Importado automáticamente desde P. GPS el ${now.toLocaleDateString('es-EC')}`,
            };
            batch.set(newUnitRef, newUnitData);
        });

        await batch.commit();

        revalidatePath(`/clients/${clientId}/units`);

        return {
            success: true,
            message: `${devicesToImport.length} unidad(es) nueva(s) importada(s) con éxito.`,
            importedCount: devicesToImport.length,
        };
    } catch (error) {
        console.error("Error importing P. GPS devices:", error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return { success: false, message: `Error al importar unidades: ${errorMessage}` };
    }
}

export async function updateUnitStatus(
  unitId: string,
  clientId: string,
  suspend: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
    const unitSnapshot = await getDoc(unitDocRef);
    if (!unitSnapshot.exists()) {
        return { success: false, message: 'La unidad no fue encontrada.' };
    }
    const unitData = unitSnapshot.data() as Unit;
    const clientDocRef = doc(db, 'clients', clientId);
    const clientSnapshot = await getDoc(clientDocRef);
     if (!clientSnapshot.exists()) {
        return { success: false, message: 'El cliente no fue encontrado.' };
    }
    const clientData = clientSnapshot.data() as Client;

    // If unit is linked to P. GPS, update status there first
    if (unitData.pgpsDeviceId) {
        const pgpsResult = await setPgpsDeviceStatus(unitData.pgpsDeviceId, !suspend);
        if (!pgpsResult.success) {
            return pgpsResult; // Propagate error message from P. GPS action
        }
    }

    // Update the local unit document in Firestore
    const updateData: Partial<Unit> = {
      estaSuspendido: suspend,
      fechaSuspension: suspend ? new Date() : null,
    };
    await updateDoc(unitDocRef, updateData);

    // Send notification
    const eventType = suspend ? 'service_suspended' : 'service_reactivated';
    // await sendGroupedTemplatedWhatsAppMessage(eventType, clientData, [{ id: unitId, ...unitData, ...updateData } as Unit]);

    // Revalidate paths to refresh data on the client
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/units');

    const actionText = suspend ? 'suspendió' : 'activó';
    return { success: true, message: `La unidad se ${actionText} con éxito.` };
  } catch (error) {
    console.error("Error updating unit status:", error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message };
  }
}

export async function bulkUpdateUnitPgpsStatus(
    units: { unitId: string; clientId: string; pgpsDeviceId?: string }[],
    suspend: boolean
): Promise<{ success: boolean; message: string; failures: number }> {
    let successCount = 0;
    let failureCount = 0;
    const batch = writeBatch(db);
    const eventType = suspend ? 'service_suspended' : 'service_reactivated';
    
    const unitsByClient: { [clientId: string]: Unit[] } = {};

    for (const { unitId, clientId, pgpsDeviceId } of units) {
        try {
            // Update P. GPS only if the device is linked
            if (pgpsDeviceId) {
                const pgpsResult = await setPgpsDeviceStatus(pgpsDeviceId, !suspend);
                if (!pgpsResult.success) {
                    failureCount++;
                    continue; // Skip to next unit if P. GPS update fails
                }
            }
            
            // Always update local status
            const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
            const updateData = { 
                estaSuspendido: suspend,
                fechaSuspension: suspend ? new Date() : null 
            };
            batch.update(unitDocRef, updateData);
            
            if (!unitsByClient[clientId]) {
                unitsByClient[clientId] = [];
            }
            const unitDoc = await getDoc(unitDocRef);
            if (unitDoc.exists()) {
                 const clientDoc = await getDoc(doc(db, 'clients', clientId)); // Fetch client for notification
                 if (clientDoc.exists()) {
                    const fullUnitData = { id: unitId, clientId, ...unitDoc.data(), ...updateData } as Unit;
                    unitsByClient[clientId].push(fullUnitData);
                 }
            }

            successCount++;
        } catch (error) {
            console.error(`Error processing unit ${unitId} in bulk update:`, error);
            failureCount++;
        }
    }

    try {
        await batch.commit();
        if (units.length > 0) {
            revalidatePath(`/clients/${units[0].clientId}/units`);
            revalidatePath('/units');
        }
        
        // Send grouped notifications after successful batch commit
        for(const clientId in unitsByClient) {
            if (unitsByClient[clientId].length > 0) {
                 const clientDoc = await getDoc(doc(db, 'clients', clientId));
                 if (clientDoc.exists()) {
                    // await sendGroupedTemplatedWhatsAppMessage(eventType, clientDoc.data() as Client, unitsByClient[clientId]);
                 }
            }
        }

    } catch (error) {
        console.error("Error committing batch update to Firestore:", error);
        return {
            success: false,
            message: 'Error al actualizar los datos locales, aunque algunos estados en P. GPS pueden haber cambiado.',
            failures: units.length,
        };
    }

    let message = '';
    const actionText = suspend ? 'suspendida(s)' : 'activada(s)';
    if (successCount > 0) {
        message += `${successCount} unidad(es) ${actionText} con éxito. `;
    }
    if (failureCount > 0) {
        message += `${failureCount} unidad(es) no se pudieron actualizar.`;
    }
    if (successCount === 0 && failureCount === 0) {
        message = 'No se seleccionaron unidades para actualizar.';
    }

    return {
        success: failureCount === 0,
        message: message.trim(),
        failures: failureCount,
    };
}

    