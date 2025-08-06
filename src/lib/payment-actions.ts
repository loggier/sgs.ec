
'use server';

import { revalidatePath } from 'next/cache';
import { addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import {
  collection,
  doc,
  getDoc,
  Timestamp,
  writeBatch,
  query,
  getDocs,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment, type PaymentHistoryEntry } from './payment-schema';
import type { Unit } from './unit-schema';
import type { User } from './user-schema';
import { getClients } from './actions';
import { getUnitsByClientId } from './unit-actions';
import { getCurrentUser } from './user-actions';
import { sendTemplatedWhatsAppMessage } from './notification-actions';

const convertTimestamps = (docData: any): any => {
    const data = { ...docData };
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate();
        }
    }
    return data;
};

export async function registerPayment(
  data: PaymentFormInput,
  unitIds: string[],
  clientId: string
): Promise<{ success: boolean; message: string; units?: Unit[] }> {
  const validation = PaymentFormSchema.safeParse(data);

  if (!validation.success) {
    console.error(validation.error.flatten().fieldErrors);
    return { success: false, message: 'Datos de pago no válidos.' };
  }
  
  if (!unitIds || unitIds.length === 0) {
    return { success: false, message: 'No se seleccionó ninguna unidad.' };
  }
  
  try {
    const { fechaPago, mesesPagados, ...paymentData } = validation.data;
    const updatedUnits: Unit[] = [];
    let processedCount = 0;

    await runTransaction(db, async (transaction) => {
        for (const unitId of unitIds) {
            const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
            const unitSnapshot = await transaction.get(unitDocRef);

            if (!unitSnapshot.exists()) {
                throw new Error(`Unidad con ID ${unitId} no encontrada.`);
            }

            const unitDataFromDB = convertTimestamps(unitSnapshot.data()) as Unit;
            
            const unitUpdateData: Partial<Record<keyof Unit, any>> = {
                ultimoPago: fechaPago,
                fechaSiguientePago: addMonths(new Date(unitDataFromDB.fechaSiguientePago), mesesPagados),
            };
            
            if (unitDataFromDB.tipoContrato === 'con_contrato') {
                const monthlyCost = (unitDataFromDB.costoTotalContrato ?? 0) / (unitDataFromDB.mesesContrato ?? 1);
                const paymentAmountForBalance = monthlyCost * mesesPagados;
                const currentBalance = unitDataFromDB.saldoContrato ?? unitDataFromDB.costoTotalContrato ?? 0;
                unitUpdateData.saldoContrato = currentBalance - paymentAmountForBalance;
            } else {
                unitUpdateData.fechaVencimiento = addMonths(new Date(unitDataFromDB.fechaVencimiento), mesesPagados);
            }
            
            transaction.update(unitDocRef, unitUpdateData);

            const newPayment: Omit<Payment, 'id'> = {
                unitId,
                clientId,
                fechaPago,
                mesesPagados,
                ...paymentData,
            };
            const paymentDocRef = doc(collection(db, 'clients', clientId, 'units', unitId, 'payments'));
            transaction.set(paymentDocRef, newPayment);
            
            updatedUnits.push({ ...unitDataFromDB, ...unitUpdateData });
            processedCount++;
        }
    });

    // Send notifications after transaction is successful
    for (const unitId of unitIds) {
        await sendTemplatedWhatsAppMessage('payment_received', clientId, unitId);
    }
    
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/');
    revalidatePath('/units');
    revalidatePath('/payments');

    return { 
        success: true, 
        message: `${processedCount} pago(s) registrado(s) con éxito. Se enviaron las notificaciones.`, 
        units: updatedUnits 
    };

  } catch (error) {
    console.error("Error registering payment:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al registrar el pago: ${errorMessage}` };
  }
}


export async function getAllPayments(
  currentUser: User
): Promise<PaymentHistoryEntry[]> {
  if (!currentUser) return [];

  try {
    // This call now correctly uses the user's role and creatorId to get the right clients.
    const userClients = await getClients(currentUser.id, currentUser.role, currentUser.creatorId);
    
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const userMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

    const allPayments: PaymentHistoryEntry[] = [];

    for (const client of userClients) {
      const units = await getUnitsByClientId(client.id);
      for (const unit of units) {
        const paymentsCollectionRef = collection(db, 'clients', client.id, 'units', unit.id, 'payments');
        const paymentsSnapshot = await getDocs(query(paymentsCollectionRef, orderBy('fechaPago', 'desc')));

        paymentsSnapshot.forEach(paymentDoc => {
          const paymentData = convertTimestamps(paymentDoc.data()) as Payment;
          const owner = userMap.get(client.ownerId!);

          allPayments.push({
            ...paymentData,
            id: paymentDoc.id,
            clientName: client.nomSujeto,
            unitPlaca: unit.placa,
            ownerId: client.ownerId,
            ownerName: owner?.nombre,
          });
        });
      }
    }
    
    allPayments.sort((a, b) => b.fechaPago.getTime() - a.fechaPago.getTime());

    return allPayments;
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return [];
  }
}

export async function deletePayment(paymentId: string, clientId: string, unitId: string): Promise<{ success: boolean; message: string }> {
    const currentUser = await getCurrentUser();
    if (!currentUser || !['master', 'manager'].includes(currentUser.role)) {
        return { success: false, message: 'No tiene permiso para eliminar pagos.' };
    }
    
    try {
        await runTransaction(db, async (transaction) => {
            const paymentDocRef = doc(db, 'clients', clientId, 'units', unitId, 'payments', paymentId);
            const paymentDoc = await transaction.get(paymentDocRef);

            if (!paymentDoc.exists()) {
                throw new Error('Pago no encontrado.');
            }
            
            const paymentData = convertTimestamps(paymentDoc.data()) as Payment;

            const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
            const unitDoc = await transaction.get(unitDocRef);

            if (!unitDoc.exists()) {
                throw new Error('No se pudo encontrar la unidad asociada.');
            }
            
            const unitData = convertTimestamps(unitDoc.data()) as Unit;
            const unitUpdate: Partial<Record<keyof Unit, any>> = {
                fechaSiguientePago: subMonths(new Date(unitData.fechaSiguientePago), paymentData.mesesPagados)
            };

            if (unitData.tipoContrato === 'con_contrato') {
                const monthlyCost = (unitData.costoTotalContrato ?? 0) / (unitData.mesesContrato ?? 1);
                const paymentAmountToRestore = monthlyCost * paymentData.mesesPagados;
                unitUpdate.saldoContrato = (unitData.saldoContrato ?? 0) + paymentAmountToRestore;
            } else {
                unitUpdate.fechaVencimiento = subMonths(new Date(unitData.fechaVencimiento), paymentData.mesesPagados);
            }

            const paymentsCollectionRef = collection(unitDocRef, 'payments');
            const q = query(paymentsCollectionRef, orderBy('fechaPago', 'desc'));
            const paymentsSnapshot = await getDocs(q);
            
            const previousPaymentDoc = paymentsSnapshot.docs.find(doc => doc.id !== paymentId);

            unitUpdate.ultimoPago = previousPaymentDoc ? convertTimestamps(previousPaymentDoc.data()).fechaPago : null;
            
            transaction.update(unitDocRef, unitUpdate);
            transaction.delete(paymentDocRef);
        });

        revalidatePath(`/clients/${clientId}/units`);
        revalidatePath('/units');
        revalidatePath('/payments');
        revalidatePath('/');
        
        return { success: true, message: 'Pago eliminado y estado de la unidad revertido con éxito.' };

    } catch (error) {
        console.error("Error deleting payment:", error);
        return { success: false, message: 'Error al eliminar el pago.' };
    }
}
