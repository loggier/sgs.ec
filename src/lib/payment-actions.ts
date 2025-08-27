

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
  limit,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment, type PaymentHistoryEntry } from './payment-schema';
import type { Unit } from './unit-schema';
import type { User } from './user-schema';
import { getClients } from './actions';
import { getUnitsByClientId } from './unit-actions';
import { getCurrentUser } from './auth';
import { sendGroupedTemplatedWhatsAppMessage } from './notification-actions';
import { getQyvooSettingsForUser } from './settings-actions';
import type { Client } from './schema';

const convertTimestamps = (docData: any): any => {
    if (!docData) return docData;
    const data: { [key: string]: any } = {};
    for (const key in docData) {
        if (Object.prototype.hasOwnProperty.call(docData, key)) {
            const value = docData[key];
            if (value instanceof Timestamp) {
                data[key] = value.toDate().toISOString();
            } else {
                data[key] = value;
            }
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
    const updatedUnitsForNotification: Unit[] = [];
    let processedCount = 0;

    await runTransaction(db, async (transaction) => {
        const unitsFromDB: { id: string; ref: any; data: Unit; }[] = [];

        // 1. PHASE: READ ALL DOCUMENTS FIRST
        for (const unitId of unitIds) {
            const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
            const unitSnapshot = await transaction.get(unitDocRef);
            if (!unitSnapshot.exists()) {
                throw new Error(`Unidad con ID ${unitId} no encontrada.`);
            }
            unitsFromDB.push({ 
                id: unitId,
                ref: unitDocRef,
                data: convertTimestamps(unitSnapshot.data()) as Unit,
            });
        }
        
        // 2. PHASE: CALCULATE AND WRITE ALL CHANGES
        for (const { ref: unitDocRef, data: unitDataFromDB } of unitsFromDB) {
            // Use current date as a fallback if fechaSiguientePago is missing
            let newNextPaymentDate = unitDataFromDB.fechaSiguientePago ? new Date(unitDataFromDB.fechaSiguientePago) : new Date();
            
            // If the next payment date is in the past, start calculating from today
            if(isBefore(newNextPaymentDate, new Date())) {
                newNextPaymentDate = new Date();
            }

            let newExpirationDate = unitDataFromDB.fechaVencimiento ? new Date(unitDataFromDB.fechaVencimiento) : new Date();

            // Calculate new dates by adding one month at a time
            for (let i = 0; i < mesesPagados; i++) {
                newNextPaymentDate = addMonths(newNextPaymentDate, 1);
                if (unitDataFromDB.tipoContrato !== 'con_contrato') {
                    newExpirationDate = addMonths(newExpirationDate, 1);
                }
            }

            const unitUpdateData: Partial<Record<keyof Unit, any>> = {
                ultimoPago: fechaPago,
                fechaSiguientePago: newNextPaymentDate,
            };
            
            if (unitDataFromDB.tipoContrato === 'con_contrato') {
                const monthlyCost = (unitDataFromDB.costoTotalContrato ?? 0) / (unitDataFromDB.mesesContrato ?? 1);
                const paymentAmountForBalance = monthlyCost * mesesPagados;
                const currentBalance = unitDataFromDB.saldoContrato ?? unitDataFromDB.costoTotalContrato ?? 0;
                unitUpdateData.saldoContrato = currentBalance - paymentAmountForBalance;
            } else {
                unitUpdateData.fechaVencimiento = newExpirationDate;
            }
            
            transaction.update(unitDocRef, unitUpdateData);

            const newPayment: Omit<Payment, 'id'> = {
                unitId: unitDataFromDB.id,
                clientId,
                fechaPago,
                mesesPagados,
                ...paymentData,
            };
            const paymentDocRef = doc(collection(db, 'clients', clientId, 'units', unitDataFromDB.id, 'payments'));
            transaction.set(paymentDocRef, newPayment);
            
            updatedUnitsForNotification.push({ ...unitDataFromDB, ...unitUpdateData });
            processedCount++;
        }
    });

    // Post-transaction logic: Send notification only if possible
    const clientDoc = await getDoc(doc(db, 'clients', clientId));
    if (clientDoc.exists()) {
        const clientData = clientDoc.data() as Client;
        if (clientData.ownerId) {
            const qyvooSettings = await getQyvooSettingsForUser(clientData.ownerId);
            // Only attempt to send if settings and phone number exist.
            if (qyvooSettings?.apiKey && qyvooSettings.userId && clientData.telefono) {
                await sendGroupedTemplatedWhatsAppMessage('payment_received', clientId, updatedUnitsForNotification);
            }
        }
    }
    
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/');
    revalidatePath('/units');
    revalidatePath('/payments');

    return { 
        success: true, 
        message: `${processedCount} pago(s) registrado(s) con éxito.`, 
        units: updatedUnitsForNotification
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
          const owner = client.ownerId ? userMap.get(client.ownerId) : null;

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
    
    allPayments.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());

    return allPayments;
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return [];
  }
}

export async function deletePayment(paymentId: string, clientId: string, unitId: string): Promise<{ success: boolean; message: string }> {
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
            
            // Correctly find the new "ultimoPago" by querying all other payments for the unit
            const paymentsCollectionRef = collection(db, 'clients', clientId, 'units', unitId, 'payments');
            const otherPaymentsQuery = query(
                paymentsCollectionRef, 
                where('__name__', '!=', paymentId),
                orderBy('fechaPago', 'desc'),
                limit(1)
            );
            // This needs to be done outside the transaction's read phase, but we can do it before.
            // Let's adjust the logic. We will read all payments first.
            
            const allPaymentsSnapshot = await getDocs(query(paymentsCollectionRef, orderBy('fechaPago', 'desc')));
            const otherPayments = allPaymentsSnapshot.docs.filter(doc => doc.id !== paymentId);

            unitUpdate.ultimoPago = otherPayments.length > 0
                ? (otherPayments[0].data().fechaPago as Timestamp)
                : null;


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
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado al eliminar el pago.';
        return { success: false, message: errorMessage };
    }
}
