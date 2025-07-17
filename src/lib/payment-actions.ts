'use server';

import { revalidatePath } from 'next/cache';
import { addMonths } from 'date-fns';
import { units } from './unit-data';
import { payments } from './payment-data';
import { PaymentFormSchema, type PaymentFormInput, type Payment } from './payment-schema';
import type { Unit } from './unit-schema';

export async function registerPayment(
  data: PaymentFormInput,
  unitId: string,
  clientId: string
): Promise<{ success: boolean; message: string; unit?: Unit }> {
  const validation = PaymentFormSchema.safeParse(data);

  if (!validation.success) {
    console.error(validation.error.flatten().fieldErrors);
    return { success: false, message: 'Datos de pago no válidos.' };
  }

  const unitIndex = units.findIndex(u => u.id === unitId);
  if (unitIndex === -1) {
    return { success: false, message: 'Unidad no encontrada.' };
  }
  
  const unit = units[unitIndex];
  const { fechaPago, mesesPagados } = validation.data;

  try {
    // 1. Update unit dates
    unit.ultimoPago = fechaPago;
    
    // For 'sin_contrato', extend the expiration date. For 'con_contrato', this logic might differ,
    // but for now we assume payment just registers without changing contract end date.
    if (unit.tipoContrato === 'sin_contrato') {
      const currentVencimiento = unit.fechaVencimiento > new Date() ? unit.fechaVencimiento : new Date();
      unit.fechaVencimiento = addMonths(currentVencimiento, mesesPagados);
    }
    
    // Calculate next payment date based on the new expiration date
    unit.fechaSiguientePago = addMonths(unit.fechaVencimiento, 1);

    // 2. Create and save the payment record
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      unitId,
      clientId,
      ...validation.data,
    };
    payments.push(newPayment);
    
    // 3. Update the unit in our mock DB
    units[unitIndex] = unit;

    revalidatePath(`/clients/${clientId}/units`);
    return { success: true, message: `Pago registrado con éxito para la unidad ${unit.placa}.`, unit };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al registrar el pago: ${errorMessage}` };
  }
}
