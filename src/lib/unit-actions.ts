'use server';

import { revalidatePath } from 'next/cache';
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
import { getCurrentUser } from './auth';
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
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    // Security check: Make sure user owns the client or is a master
    const clientDocRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists()) return [];

    const clientData = clientDoc.data() as Client;
    if (user.role !== 'master' && clientData.ownerId !== user.id) {
        console.warn(`Security violation: User ${user.id} attempting to access units for client ${clientId}`);
        return [];
    }

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
    const user = await getCurrentUser();
    if (!user) return null;

    const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
    const unitDoc = await getDoc(unitDocRef);
    if (!unitDoc.exists()) return null;

    const clientDocRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists()) return null;

    const clientData = clientDoc.data() as Client;
    if (user.role !== 'master' && clientData.ownerId !== user.id) {
        return null; // Security check
    }

    const data = convertTimestamps(unitDoc.data());
    return { id: unitDoc.id, clientId, ...data } as Unit;
}


export async function saveUnit(
  data: UnitFormInput,
  clientId: string,
  unitId?: string
): Promise<{ success: boolean; message:string; unit?: Unit }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: 'No autenticado.' };

  const clientDocRef = doc(db, 'clients', clientId);
  const clientDoc = await getDoc(clientDocRef);
  if (!clientDoc.exists() || (user.role !== 'master' && clientDoc.data().ownerId !== user.id)) {
      return { success: false, message: 'No tiene permiso para modificar este cliente.' };
  }
  
  const validation = UnitFormSchema.safeParse(data);

  if (!validation.success) {
    console.log(validation.error.errors);
    return { success: false, message: 'Datos de unidad no válidos.' };
  }
  
  try {
    const unitDataForFirestore: any = {
      ...validation.data,
      ultimoPago: null,
      fechaSiguientePago: validation.data.fechaSiguientePago || new Date(),
    };
    
    if (validation.data.tipoContrato === 'sin_contrato') {
      delete unitDataForFirestore.costoTotalContrato;
      delete unitDataForFirestore.mesesContrato;
    } else {
      delete unitDataForFirestore.costoMensual;
    }

    const unitsCollectionRef = collection(db, 'clients', clientId, 'units');
    let savedUnitId = unitId;

    if (unitId) {
      // Update
      const unitDocRef = doc(unitsCollectionRef, unitId);
      await updateDoc(unitDocRef, unitDataForFirestore);
    } else {
      // Create
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

export async function deleteUnit(unitId: string, clientId: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: 'No autenticado.' };

  try {
    const clientDocRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists() || (user.role !== 'master' && clientDoc.data().ownerId !== user.id)) {
        return { success: false, message: 'No tiene permiso para eliminar unidades de este cliente.' };
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

export async function getAllUnits(): Promise<(Unit & { clientName: string; ownerName?: string })[]> {
    const user = await getCurrentUser();
    if (!user) return [];

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

        if (user.role !== 'master') {
            allUnits = allUnits.filter(unit => unit.ownerId === user.id);
        }

        return allUnits;
    } catch (error) {
        console.error("Error getting all units:", error);
        return [];
    }
}
