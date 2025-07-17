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

    // Firestore data needs to be converted before being used as a Unit
    const unitData = unitDoc.data();
    const unit: Unit = {
        id: unitDoc.id,
        clientId: unitData.clientId,
        imei: unitData.imei,
        placa: unitData.placa,
        modelo: unitData.modelo,
        tipoPlan: unitData.tipoPlan,
        tipoContrato: unitData.tipoContrato,
        costoMensual: unitData.costoMensual,
        costoTotalContrato: unitData.costoTotalContrato,
        mesesContrato: unitData.mesesContrato,
        fechaInicioContrato: (unitData.fechaInicioContrato as Timestamp).toDate(),
        fechaVencimiento: (unitData.fechaVencimiento as Timestamp).toDate(),
        ultimoPago: unitData.ultimoPago ? (unitData.ultimoPago as Timestamp).toDate() : null,
        fechaSiguientePago: (unitData.fechaSiguientePago as Timestamp).toDate(),
        observacion: unitData.observacion,
    };

    const { fechaPago, mesesPagados } = validation.data;
    
    // 1. Update unit dates
    const unitUpdateData: Partial<Record<keyof Unit, any>> = {
      ultimoPago: fechaPago,
    };

    const currentVencimiento = unit.fechaVencimiento;
    const baseDateForVencimiento = currentVencimiento > new Date() ? currentVencimiento : new Date();
    const newVencimiento = addMonths(baseDateForVencimiento, mesesPagados);
    
    unitUpdateData.fechaVencimiento = newVencimiento;
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

    const updatedUnitDoc = await getDoc(unitDocRef);
    const updatedUnitData = updatedUnitDoc.data()!;
    const updatedUnit: Unit = {
        id: updatedUnitDoc.id,
        clientId: updatedUnitData.clientId,
        imei: updatedUnitData.imei,
        placa: updatedUnitData.placa,
        modelo: updatedUnitData.modelo,
        tipoPlan: updatedUnitData.tipoPlan,
        tipoContrato: updatedUnitData.tipoContrato,
        costoMensual: updatedUnitData.costoMensual,
        costoTotalContrato: updatedUnitData.costoTotalContrato,
        mesesContrato: updatedUnitData.mesesContrato,
        fechaInicioContrato: (updatedUnitData.fechaInicioContrato as Timestamp).toDate(),
        fechaVencimiento: (updatedUnitData.fechaVencimiento as Timestamp).toDate(),
        ultimoPago: updatedUnitData.ultimoPago ? (updatedUnitData.ultimoPago as Timestamp).toDate() : null,
        fechaSiguientePago: (updatedUnitData.fechaSiguientePago as Timestamp).toDate(),
        observacion: updatedUnitData.observacion,
    };
    
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/');
    return { success: true, message: `Pago registrado con éxito para la unidad ${unit.placa}.`, unit: updatedUnit };

  } catch (error) {
    console.error("Error registering payment:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al registrar el pago: ${errorMessage}` };
  }
}
