
'use server';

import { revalidatePath } from 'next/cache';
import { addMonths } from 'date-fns';
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
import { sendTemplatedWhatsAppMessage } from './notification-actions';

const convertTimestamps = (docData: any) => {
  const data = { ...docData };
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      data[key] = data[key].toDate();
    }
  }
  return data;
};

export async function getUnitsByClientId(clientId: string): Promise<Unit[]> {
  try {
    const unitsCollectionRef = collection(db, 'clients', clientId, 'units');
    const unitSnapshot = await getDocs(unitsCollectionRef);

    const unitsList = await Promise.all(unitSnapshot.docs.map(async (doc) => {
      const data = convertTimestamps(doc.data());
      let unit: Unit = { id: doc.id, clientId, ...data } as Unit;

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
    const { fechaInicioContrato, tipoContrato, mesesContrato, costoTotalContrato, imei, ...restOfData } = validation.data;
    
    const unitDataForFirestore: { [key: string]: any } = {
      ...restOfData,
      imei,
      fechaInicioContrato: new Date(fechaInicioContrato),
      tipoContrato,
      mesesContrato,
      costoTotalContrato,
      estaSuspendido: data.estaSuspendido ?? false, // Default to active
    };

    // Auto-link with P. GPS device based on IMEI
    if (clientData.pgpsId && imei) {
        const { devices: pgpsDevices } = await getPgpsDevicesByClientId(clientData.pgpsId);
        const matchedDevice = pgpsDevices.find(d => d.imei === imei);
        unitDataForFirestore.pgpsDeviceId = matchedDevice ? String(matchedDevice.id) : undefined;
    } else {
        unitDataForFirestore.pgpsDeviceId = undefined;
    }
    
    if (tipoContrato === 'sin_contrato') {
      unitDataForFirestore.costoTotalContrato = undefined;
      unitDataForFirestore.mesesContrato = undefined;
      unitDataForFirestore.saldoContrato = undefined;
    } else {
      unitDataForFirestore.costoMensual = undefined;
    }

    const unitsCollectionRef = collection(db, 'clients', clientId, 'units');
    let savedUnitId = unitId;

    if (unitId) { // Editing existing unit
      const unitDocRef = doc(unitsCollectionRef, unitId);
      const currentUnitDoc = await getDoc(unitDocRef);
      if (!currentUnitDoc.exists()) {
          return { success: false, message: 'Unidad no encontrada.' };
      }
      const currentUnitData = convertTimestamps(currentUnitDoc.data()) as Unit;

      const newStartDate = new Date(fechaInicioContrato);
      const oldStartDate = new Date(currentUnitData.fechaInicioContrato);

      // Reset payment cycle and balance if start date changes
      if (newStartDate.getTime() !== oldStartDate.getTime() || tipoContrato !== currentUnitData.tipoContrato) {
        unitDataForFirestore.ultimoPago = null;
        unitDataForFirestore.fechaSiguientePago = addMonths(newStartDate, 1);
        
        if (tipoContrato === 'con_contrato') {
            unitDataForFirestore.saldoContrato = costoTotalContrato;
            if (mesesContrato) {
              unitDataForFirestore.fechaVencimiento = addMonths(newStartDate, mesesContrato);
            }
        } else {
          unitDataForFirestore.fechaVencimiento = addMonths(newStartDate, 1);
        }
      }
      
      if (tipoContrato === 'con_contrato' && (unitDataForFirestore.saldoContrato === undefined || unitDataForFirestore.saldoContrato === null)) {
         unitDataForFirestore.saldoContrato = costoTotalContrato;
      }

    } else { // Creating new unit
      const newStartDate = new Date(fechaInicioContrato);
      unitDataForFirestore.ultimoPago = null;
      unitDataForFirestore.fechaSiguientePago = addMonths(newStartDate, 1);
      
      if (tipoContrato === 'con_contrato') {
        unitDataForFirestore.saldoContrato = costoTotalContrato;
        if (mesesContrato) {
          unitDataForFirestore.fechaVencimiento = addMonths(newStartDate, mesesContrato);
        }
      } else {
        unitDataForFirestore.fechaVencimiento = addMonths(newStartDate, 1);
      }
    }
    
    // Clean up undefined/null/empty values before saving
    Object.keys(unitDataForFirestore).forEach(key => {
      const k = key as keyof typeof unitDataForFirestore;
      if (unitDataForFirestore[k] === undefined || unitDataForFirestore[k] === null || unitDataForFirestore[k] === '') {
        delete unitDataForFirestore[k];
      }
    });

    if (savedUnitId) {
        await updateDoc(doc(unitsCollectionRef, savedUnitId), unitDataForFirestore);
    } else {
        const newUnitRef = await addDoc(unitsCollectionRef, unitDataForFirestore);
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


export async function getAllUnits(currentUser: User): Promise<(Unit & { clientName: string; ownerName?: string; fechaSiguientePago: Timestamp | null; })[]> {
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
            const owner = usersMap.get(client.ownerId);

            const clientUnitsPromises = unitsSnapshot.docs.map(async (unitDoc) => {
                const data = unitDoc.data();
                
                // Keep dates as Timestamps for backend consistency
                const unit: any = {
                    id: unitDoc.id,
                    clientId: client.id,
                    clientName: client.nomSujeto,
                    ownerId: client.ownerId,
                    ownerName: owner?.nombre || 'Propietario Desconocido',
                    ...data,
                    // Ensure the date is a Timestamp object, not converted
                    fechaSiguientePago: data.fechaSiguientePago instanceof Timestamp ? data.fechaSiguientePago : null,
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

        return allUnits as (Unit & { clientName: string; ownerName?: string; fechaSiguientePago: Timestamp | null; })[];
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
    await sendTemplatedWhatsAppMessage(eventType, clientId, unitId);

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
            
            // Send notification for each successful update
            await sendTemplatedWhatsAppMessage(eventType, clientId, unitId);

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
