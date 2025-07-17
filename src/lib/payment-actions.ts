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
} from 'firebase/firestore';
import { db } from './firebase'; // <-- Cambiado a firebase
import { PaymentFormSchema, type PaymentFormInput, type Payment, ClientPaymentFormSchema } from './payment-schema';
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
  data: PaymentFormInput | z.infer<typeof ClientPaymentFormSchema>,
  unitId: string,
  clientId: string
): Promise<{ success: boolean; message: string; unit?: Unit }> {
  const validation = ClientPaymentFormSchema.safeParse(data);

  if (!validation.success) {
    console.error(validation.error.flatten().fieldErrors);
    return { success: false, message: 'Datos de pago no válidos.' };
  }
  
  try {
    const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);

    const unit = await getUnit(clientId, unitId);
    if (!unit) {
      return { success: false, message: 'Unidad no encontrada.' };
    }

    const { fechaPago, mesesPagados } = validation.data;
    
    // 1. Update unit dates
    const unitUpdateData: Partial<Record<keyof Unit, any>> = {
      ultimoPago: fechaPago,
    };

    const currentVencimiento = unit.fechaVencimiento;
    const baseDateForVencimiento = currentVencimiento > new Date() ? currentVencimiento : new Date();
    const newVencimiento = addMonths(baseDateForVencimiento, mesesPagados);
    
    unitUpdateData.fechaVencimiento = newVencimiento;
    // Set next payment date to one month after the new expiration date
    unitUpdateData.fechaSiguientePago = addMonths(newVencimiento, 1);
    
    await updateDoc(unitDocRef, unitUpdateData);

    // 2. Create and save the payment record
    const newPayment: Omit<Payment, 'id'> = {
      unitId,
      clientId,
      ...validation.data,
    };
    const paymentsCollectionRef = collection(db, 'clients', clientId, 'units', unitId, 'payments');
    await addDoc(paymentsCollectionRef, newPayment);

    const updatedUnit = await getUnit(clientId, unitId);
    
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/');
    return { success: true, message: `Pago registrado con éxito para la unidad ${unit.placa}.`, unit: updatedUnit! };

  } catch (error) {
    console.error("Error registering payment:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al registrar el pago: ${errorMessage}` };
  }
}