
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
} from 'firebase/firestore';
import { db } from './firebase';
import { UnitFormSchema, type Unit, type UnitFormInput } from './unit-schema';
import type { Client, ClientWithOwner } from './schema';
import type { User } from './user-schema';

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
    const unitsList = unitSnapshot.docs.map(doc => {
      const data = convertTimestamps(doc.data());
      return { id: doc.id, clientId, ...data } as Unit;
    });
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
    return { id: unitDoc.id, clientId, ...data } as Unit;
}


export async function saveUnit(
  data: UnitFormInput,
  clientId: string,
  user: { id: string; role: User['role'] } | null,
  unitId?: string
): Promise<{ success: boolean; message:string; unit?: Unit }> {
  if (!user || !['master', 'manager'].includes(user.role)) {
      return { success: false, message: 'No tiene permiso para modificar unidades.' };
  }
  
  const clientDocRef = doc(db, 'clients', clientId);
  const clientDoc = await getDoc(clientDocRef);
  if (!clientDoc.exists()) {
      return { success: false, message: 'El cliente especificado no existe.' };
  }
  if (user.role !== 'master' && clientDoc.data().ownerId !== user.id) {
      return { success: false, message: 'No tiene permiso para añadir unidades a este cliente.' };
  }

  const validation = UnitFormSchema.safeParse(data);

  if (!validation.success) {
    console.log(validation.error.errors);
    return { success: false, message: 'Datos de unidad no válidos.' };
  }
  
  try {
    const { fechaInicioContrato, tipoContrato, mesesContrato, costoTotalContrato, ...restOfData } = validation.data;
    
    const unitDataForFirestore: any = {
      ...restOfData,
      fechaInicioContrato: new Date(fechaInicioContrato),
      tipoContrato,
      mesesContrato,
      costoTotalContrato,
    };
    
    if (tipoContrato === 'sin_contrato') {
      delete unitDataForFirestore.costoTotalContrato;
      delete unitDataForFirestore.mesesContrato;
      delete unitDataForFirestore.saldoContrato;
    } else {
      delete unitDataForFirestore.costoMensual;
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

      // If start date has changed, reset the payment cycle
      if (newStartDate.getTime() !== oldStartDate.getTime()) {
        unitDataForFirestore.ultimoPago = null;
        unitDataForFirestore.fechaSiguientePago = addMonths(newStartDate, 1);
        
        if (tipoContrato === 'con_contrato') {
            unitDataForFirestore.saldoContrato = costoTotalContrato; // Reset balance if start date changes
            if (mesesContrato) {
              unitDataForFirestore.fechaVencimiento = addMonths(newStartDate, mesesContrato);
            }
        } else {
          unitDataForFirestore.fechaVencimiento = addMonths(newStartDate, 1);
        }
      }

      await updateDoc(unitDocRef, unitDataForFirestore);
    } else { // Creating new unit
      const newStartDate = new Date(fechaInicioContrato);
      unitDataForFirestore.ultimoPago = null;
      unitDataForFirestore.fechaSiguientePago = addMonths(newStartDate, 1);
      
      if (tipoContrato === 'con_contrato') {
        unitDataForFirestore.saldoContrato = costoTotalContrato; // Initialize balance
        if (mesesContrato) {
          unitDataForFirestore.fechaVencimiento = addMonths(newStartDate, mesesContrato);
        }
      } else {
        unitDataForFirestore.fechaVencimiento = addMonths(newStartDate, 1);
      }
      
      const newUnitRef = await addDoc(unitsCollectionRef, unitDataForFirestore);
      savedUnitId = newUnitRef.id;
    }

    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/units');
    const savedUnit = await getUnit(clientId, savedUnitId!);
    return { success: true, message: 'Unidad guardada con éxito.', unit: savedUnit! };

  } catch (error) {
    console.error("Error saving unit:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al guardar la unidad: ${errorMessage}` };
  }
}

export async function deleteUnit(unitId: string, clientId: string, userId: string, userRole: User['role']): Promise<{ success: boolean; message: string }> {
  if (!userId || !['master', 'manager'].includes(userRole)) {
      return { success: false, message: 'Acción no permitida.' };
  }
  
  const clientDocRef = doc(db, 'clients', clientId);
  const clientDoc = await getDoc(clientDocRef);
  if (!clientDoc.exists()) {
      return { success: false, message: 'El cliente especificado no existe.' };
  }
  if (userRole !== 'master' && clientDoc.data().ownerId !== userId) {
      return { success: false, message: 'No tiene permiso para eliminar unidades de este cliente.' };
  }

  try {
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

export async function getAllUnits(currentUserId: string, currentUserRole: User['role']): Promise<(Unit & { clientName: string; ownerName?: string })[]> {
    if (!currentUserId) return [];

    try {
        const clientsCollection = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsCollection);
        const allClients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientWithOwner));
        const clientMap = new Map(allClients.map(c => [c.id, c]));

        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

        const unitsQuery = query(collectionGroup(db, 'units'));
        const unitsSnapshot = await getDocs(unitsQuery);

        let allUnits = unitsSnapshot.docs.map(doc => {
            const data = convertTimestamps(doc.data());
            const clientId = doc.ref.parent.parent!.id;
            const client = clientMap.get(clientId);
            const owner = client ? usersMap.get(client.ownerId) : undefined;
            
            return {
                id: doc.id,
                clientId,
                clientName: client?.nomSujeto || 'Cliente Desconocido',
                ownerId: client?.ownerId,
                ownerName: owner?.nombre || 'Propietario Desconocido',
                ...data
            } as Unit & { clientName: string; ownerId: string; ownerName?: string };
        });

        if (currentUserRole !== 'master') {
            allUnits = allUnits.filter(unit => unit.ownerId === currentUserId);
        }

        return allUnits;
    } catch (error) {
        console.error("Error getting all units:", error);
        return [];
    }
}
