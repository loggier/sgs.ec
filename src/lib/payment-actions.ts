'use server';

import { revalidatePath } from 'next/cache';
import { addMonths } from 'date-fns';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment } from './payment-schema';
import type { Unit } from './unit-schema';
import { z } from 'zod';

const convertTimestamps = (docData: any): any => {
    const data = { ...docData };
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate();
        }
    }
    return data;
};

const getUnit = async (clientId: string, unitId: string): Promise<Unit | null> => {
    const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
    const unitDoc = await getDoc(unitDocRef);
    if (!unitDoc.exists()) return null;
    const data = convertTimestamps(unitDoc.data());
    return { id: unitDoc.id, clientId, ...data } as Unit;
}


export async function registerPayment(
  data: PaymentFormInput,
  unitIds: string[],
  clientId: string
): Promise<{ success: boolean; message: string; units?: Unit[] }> {
  // Use the base schema as client/batch forms provide the necessary data
  const validation = PaymentFormSchema.safeParse(data);

  if (!validation.success) {
    console.error(validation.error.flatten().fieldErrors);
    return { success: false, message: 'Datos de pago no válidos.' };
  }
  
  if (!unitIds || unitIds.length === 0) {
    return { success: false, message: 'No se seleccionó ninguna unidad.' };
  }
  
  try {
    const batch = writeBatch(db);
    const { fechaPago, mesesPagados, ...paymentData } = validation.data;
    const updatedUnits: Unit[] = [];
    let processedCount = 0;

    for (const unitId of unitIds) {
        const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
        const unitSnapshot = await getDoc(unitDocRef);

        if (!unitSnapshot.exists()) {
            console.warn(`Unidad con ID ${unitId} no encontrada. Saltando.`);
            continue;
        }

        const unit = { id: unitSnapshot.id, clientId, ...convertTimestamps(unitSnapshot.data()) } as Unit;
        
        // 1. Update unit dates
        const unitUpdateData: Partial<Record<keyof Unit, any>> = {
            ultimoPago: fechaPago,
        };

        const currentVencimiento = unit.fechaVencimiento;
        const baseDateForVencimiento = currentVencimiento > new Date() ? currentVencimiento : new Date();
        const newVencimiento = addMonths(baseDateForVencimiento, mesesPagados);
        
        unitUpdateData.fechaVencimiento = newVencimiento;
        unitUpdateData.fechaSiguientePago = addMonths(newVencimiento, 1);
        
        batch.update(unitDocRef, unitUpdateData);

        // 2. Create and save the payment record
        const newPayment: Omit<Payment, 'id'> = {
            unitId,
            clientId,
            fechaPago,
            mesesPagados,
            ...paymentData,
        };
        const paymentDocRef = doc(collection(db, 'clients', clientId, 'units', unitId, 'payments'));
        batch.set(paymentDocRef, newPayment);
        
        updatedUnits.push({ ...unit, ...unitUpdateData });
        processedCount++;
    }
    
    await batch.commit();
    
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/');
    revalidatePath('/units');

    return { 
        success: true, 
        message: `${processedCount} pago(s) registrado(s) con éxito.`, 
        units: updatedUnits 
    };

  } catch (error) {
    console.error("Error registering payment:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al registrar el pago: ${errorMessage}` };
  }
}
