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
} from 'firebase/firestore';
import { db } from './firebase';
import { UnitFormSchema, type Unit, type UnitFormInput } from './unit-schema';

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
    const unitData: Omit<Unit, 'id' | 'clientId'> = {
      ...validation.data,
      ultimoPago: null,
      fechaSiguientePago: validation.data.fechaSiguientePago || new Date(),
    };
    
    if (validation.data.tipoContrato === 'sin_contrato') {
      unitData.costoTotalContrato = undefined;
      unitData.mesesContrato = undefined;
    } else {
      unitData.costoMensual = undefined;
    }

    const unitsCollectionRef = collection(db, 'clients', clientId, 'units');
    let savedUnit: Unit;

    if (unitId) {
      // Update
      const unitDocRef = doc(unitsCollectionRef, unitId);
      await updateDoc(unitDocRef, unitData);
      savedUnit = { id: unitId, clientId, ...unitData };
    } else {
      // Create
      const newUnitRef = await addDoc(unitsCollectionRef, unitData);
      savedUnit = { id: newUnitRef.id, clientId, ...unitData };
    }

    revalidatePath(`/clients/${clientId}/units`);
    return { success: true, message: 'Unidad guardada con éxito.', unit: savedUnit };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al guardar la unidad: ${errorMessage}` };
  }
}

export async function deleteUnit(unitId: string, clientId: string): Promise<{ success: boolean; message: string }> {
  try {
    const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
    await deleteDoc(unitDocRef);
    revalidatePath(`/clients/${clientId}/units`);
    return { success: true, message: 'Unidad eliminada con éxito.' };
  } catch (error) {
    console.error("Error deleting unit:", error);
    return { success: false, message: 'Error al eliminar la unidad.' };
  }
}
