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
} from 'firebase/firestore';
import { db } from './firebase';
import { UnitFormSchema, type Unit, type UnitFormInput } from './unit-schema';
import type { Client } from './schema';

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
  unitId?: string
): Promise<{ success: boolean; message:string; unit?: Unit }> {
  const validation = UnitFormSchema.safeParse(data);

  if (!validation.success) {
    console.log(validation.error.errors);
    return { success: false, message: 'Datos de unidad no válidos.' };
  }
  
  try {
    // Create a new object for Firestore to avoid passing undefined, which is not allowed.
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

export async function getAllUnits(): Promise<(Unit & { clientName: string })[]> {
    try {
        const clientsCollection = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsCollection);
        const allClients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<Client, 'placaVehiculo'>));
        const clientMap = new Map(allClients.map(c => [c.id, c.nomSujeto]));

        const unitsQuery = query(collectionGroup(db, 'units'));
        const unitsSnapshot = await getDocs(unitsQuery);

        const allUnits = unitsSnapshot.docs.map(doc => {
            const data = convertTimestamps(doc.data());
            const clientId = doc.ref.parent.parent!.id;
            const clientName = clientMap.get(clientId) || 'Cliente Desconocido';
            return {
                id: doc.id,
                clientId,
                clientName,
                ...data
            } as Unit & { clientName: string };
        });

        return allUnits;
    } catch (error) {
        console.error("Error getting all units:", error);
        return [];
    }
}
