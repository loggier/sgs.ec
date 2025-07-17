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
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment, ClientPaymentFormSchema } from './payment-schema';
import type { Unit } from './unit-schema';

export async function registerPayment(
  data: PaymentFormInput | z.infer<typeof ClientPaymentFormSchema>,
  unitId: string,
  clientId: string
): Promise<{ success: boolean; message: string; unit?: Unit }> {
  const validation = PaymentFormSchema.safeParse(data);

  if (!validation.success) {
    console.error(validation.error.flatten().fieldErrors);
    return { success: false, message: 'Datos de pago no válidos.' };
  }
  
  const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);

  try {
    const unitDoc = await getDoc(unitDocRef);
    if (!unitDoc.exists()) {
      return { success: false, message: 'Unidad no encontrada.' };
    }

    const unit = { id: unitDoc.id, ...unitDoc.data() } as Unit;
    const { fechaPago, mesesPagados } = validation.data;
    
    // 1. Update unit dates
    const unitUpdateData: Partial<Unit> = {
      ultimoPago: fechaPago,
    };

    if (unit.tipoContrato === 'sin_contrato') {
      const currentVencimientoTimestamp = unit.fechaVencimiento as unknown as Timestamp;
      const currentVencimiento = currentVencimientoTimestamp.toDate();
      const baseDateForVencimiento = currentVencimiento > new Date() ? currentVencimiento : new Date();
      unitUpdateData.fechaVencimiento = addMonths(baseDateForVencimiento, mesesPagados);
    }
    
    if(unitUpdateData.fechaVencimiento) {
        unitUpdateData.fechaSiguientePago = addMonths(unitUpdateData.fechaVencimiento, 1);
    }

    await updateDoc(unitDocRef, unitUpdateData);

    // 2. Create and save the payment record
    const newPayment: Omit<Payment, 'id'> = {
      unitId,
      clientId,
      ...validation.data,
    };
    const paymentsCollectionRef = collection(db, 'clients', clientId, 'units', unitId, 'payments');
    await addDoc(paymentsCollectionRef, newPayment);

    const updatedUnitDoc = await getDoc(unitDocRef);
    const updatedUnit = { id: updatedUnitDoc.id, ...updatedUnitDoc.data() } as Unit;
    
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/');
    return { success: true, message: `Pago registrado con éxito para la unidad ${unit.placa}.`, unit: updatedUnit };

  } catch (error) {
    console.error("Error registering payment:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al registrar el pago: ${errorMessage}` };
  }
}
