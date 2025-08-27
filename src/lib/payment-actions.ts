

'use server';

import { revalidatePath } from 'next/cache';
import { addMonths, subMonths, isBefore, startOfDay, isValid } from 'date-fns';
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
    
    const clientDoc = await getDoc(doc(db, 'clients', clientId));
    if (!clientDoc.exists()) {
        return { success: false, message: 'El cliente especificado no existe.' };
    }
    const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;

    await runTransaction(db, async (transaction) => {
        const unitsFromDB: { id: string; ref: any; data: Unit; }[] = [];

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
        
        for (const { ref: unitDocRef, data: unitDataFromDB } of unitsFromDB) {
            const nextPaymentDateCandidate = unitDataFromDB.fechaSiguientePago ? new Date(unitDataFromDB.fechaSiguientePago) : null;
            let baseNextPaymentDate = (nextPaymentDateCandidate && isValid(nextPaymentDateCandidate)) ? nextPaymentDateCandidate : new Date();
            
            if (isBefore(baseNextPaymentDate, startOfDay(new Date()))) {
                baseNextPaymentDate = new Date();
            }

            const expirationDateCandidate = unitDataFromDB.fechaVencimiento ? new Date(unitDataFromDB.fechaVencimiento) : null;
            let baseExpirationDate = (expirationDateCandidate && isValid(expirationDateCandidate)) ? expirationDateCandidate : new Date();

            let newNextPaymentDate = baseNextPaymentDate;
            let newExpirationDate = baseExpirationDate;

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
            
            const fullUpdatedUnit = { ...unitDataFromDB, ...unitUpdateData };
            updatedUnitsForNotification.push(fullUpdatedUnit);
            processedCount++;
        }
    });
    
    // --- DEBUGGING ---
    // He comentado temporalmente la notificación para aislar el error.
    /*
    try {
        if (clientData.ownerId && updatedUnitsForNotification.length > 0) {
            const qyvooSettings = await getQyvooSettingsForUser(clientData.ownerId);
            if (qyvooSettings?.apiKey && qyvooSettings.userId) {
                await sendGroupedTemplatedWhatsAppMessage('payment_received', clientData, updatedUnitsForNotification);
            }
        }
    } catch (notificationError) {
        console.error("Error en el bloque de notificación:", notificationError);
        // Devolvemos éxito en el pago, pero avisamos del fallo en la notificación.
        revalidatePaths(clientId);
        return { 
            success: true, 
            message: `Pago registrado, pero la notificación falló: ${notificationError instanceof Error ? notificationError.message : 'Error desconocido'}.`,
            units: updatedUnitsForNotification
        };
    }
    */
    
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
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error("Error detallado en registerPayment:", error);
    return { 
        success: false, 
        message: `Error al registrar el pago: ${errorMessage}` 
    };
  }
}


export async function getAllPayments(
  currentUser: User
): Promise<PaymentHistoryEntry[]> {
  if (!currentUser) return [];

  try {
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
            const unitUpdate: Partial<Record<keyof Unit, any>> = {};
            
            const currentNextPaymentDate = unitData.fechaSiguientePago ? new Date(unitData.fechaSiguientePago) : null;
            if (currentNextPaymentDate && isValid(currentNextPaymentDate)) {
                 unitUpdate.fechaSiguientePago = subMonths(currentNextPaymentDate, paymentData.mesesPagados);
            }

            if (unitData.tipoContrato === 'con_contrato') {
                const monthlyCost = (unitData.costoTotalContrato ?? 0) / (unitData.mesesContrato ?? 1);
                const paymentAmountToRestore = monthlyCost * paymentData.mesesPagados;
                unitUpdate.saldoContrato = (unitData.saldoContrato ?? 0) + paymentAmountToRestore;
            } else {
                 const currentExpirationDate = unitData.fechaVencimiento ? new Date(unitData.fechaVencimiento) : null;
                 if (currentExpirationDate && isValid(currentExpirationDate)) {
                    unitUpdate.fechaVencimiento = subMonths(currentExpirationDate, paymentData.mesesPagados);
                }
            }
            
            const paymentsCollectionRef = collection(db, 'clients', clientId, 'units', unitId, 'payments');
            const q = query(
                paymentsCollectionRef, 
                where('fechaPago', '<', paymentData.fechaPago),
                orderBy('fechaPago', 'desc'), 
                limit(1)
            );
            const previousPaymentsSnapshot = await getDocs(q);

            unitUpdate.ultimoPago = previousPaymentsSnapshot.docs.length > 0
                ? (previousPaymentsSnapshot.docs[0].data().fechaPago as Timestamp).toDate()
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
