
'use server';

import { revalidatePath } from 'next/cache';
import { addMonths, subMonths, isBefore, isValid } from 'date-fns';
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
import type { Client, ClientDisplay } from './schema';
import { getClients } from './actions';
import { getUnitsByClientId } from './unit-actions';
import { getCurrentUser } from './auth';
// import { sendGroupedTemplatedWhatsAppMessage } from './notification-actions';

const convertTimestamps = (docData: any) => {
    if (!docData) {
        return docData;
    }
    const data: { [key: string]: any } = {};
    for (const key in docData) {
        if (Object.prototype.hasOwnProperty.call(docData, key) && docData[key] instanceof Timestamp) {
            data[key] = docData[key].toDate().toISOString();
        } else {
            data[key] = docData[key];
        }
    }
    return data;
};


export async function registerPayment(
    data: PaymentFormInput,
    unitIdsInput: unknown,
    clientIdInput: unknown
): Promise<{ success: boolean; message: string; units?: Unit[] }> {
    // 1) Validate form input
    const validation = PaymentFormSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Datos de pago no válidos.' };
    }

    // 2) Validate and sanitize clientId
    const safeClientId = typeof clientIdInput === 'string' ? clientIdInput.trim() : '';
    if (!safeClientId) {
        return { success: false, message: "Error Crítico: El 'clientId' es inválido o no fue proporcionado." };
    }

    // 3) Sanitize, filter, and deduplicate unitIds
    const uniqueUnitIds = Array.from(
        new Set(
            (Array.isArray(unitIdsInput) ? unitIdsInput : [])
            .map(id => typeof id === 'string' ? id.trim() : '')
            .filter(id => id.length > 0)
        )
    );

    if (uniqueUnitIds.length === 0) {
        return { success: false, message: 'No se seleccionó ninguna unidad válida.' };
    }

    try {
        const { fechaPago, mesesPagados, ...paymentData } = validation.data;
        const updatedUnitsForNotification: Unit[] = [];
        let processedCount = 0;

        // The transaction logic is now split into a "read" phase and a "write" phase.
        await runTransaction(db, async (transaction) => {
            // --- READ PHASE ---
            // First, read all necessary documents.
            const unitSnapshots = await Promise.all(
                uniqueUnitIds.map(unitId => {
                    if (!unitId) { // Defensive check
                        throw new Error('Se encontró un unitId vacío o inválido antes de la lectura.');
                    }
                    const unitDocRef = doc(db, 'clients', safeClientId, 'units', unitId);
                    return transaction.get(unitDocRef);
                })
            );

            const unitsData = [];
            for (let i = 0; i < unitSnapshots.length; i++) {
                const unitSnapshot = unitSnapshots[i];
                if (!unitSnapshot.exists()) {
                    throw new Error(`La unidad con ID ${uniqueUnitIds[i]} no fue encontrada.`);
                }
                const unitDataFromDB = convertTimestamps(unitSnapshot.data()) as Unit;
                
                // Validate critical date field before proceeding
                if (!unitDataFromDB.fechaInicioContrato || !isValid(new Date(unitDataFromDB.fechaInicioContrato))) {
                     throw new Error(`La unidad con placa ${unitDataFromDB.placa} tiene una fecha de inicio de contrato inválida.`);
                }
                
                unitsData.push({ ref: unitSnapshot.ref, data: unitDataFromDB });
            }

            // --- WRITE PHASE ---
            // Now that all reads are done, perform all writes.
            for (const { ref, data: unitDataFromDB } of unitsData) {
                // Robust date calculation logic
                const lastPaymentDate = unitDataFromDB.ultimoPago ? new Date(unitDataFromDB.ultimoPago) : null;
                const contractStartDate = new Date(unitDataFromDB.fechaInicioContrato);

                const baseDateForCalculation = (lastPaymentDate && isValid(lastPaymentDate))
                    ? lastPaymentDate
                    : contractStartDate;
                
                const newNextPaymentDate = addMonths(baseDateForCalculation, mesesPagados);

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
                    const expirationDateCandidate = unitDataFromDB.fechaVencimiento ? new Date(unitDataFromDB.fechaVencimiento) : null;
                    const baseExpirationDate = (expirationDateCandidate && isValid(expirationDateCandidate)) ? expirationDateCandidate : baseDateForCalculation;
                    unitUpdateData.fechaVencimiento = addMonths(baseExpirationDate, mesesPagados);
                }

                transaction.update(ref, unitUpdateData);

                const newPayment: Omit<Payment, 'id'> = {
                    unitId: ref.id,
                    clientId: safeClientId,
                    fechaPago,
                    mesesPagados,
                    ...paymentData,
                };
                const paymentDocRef = doc(collection(ref, 'payments'));
                transaction.set(paymentDocRef, newPayment);

                updatedUnitsForNotification.push({ ...unitDataFromDB, ...unitUpdateData, id: ref.id });
                processedCount++;
            }
        });

        // The notification is commented out as requested previously for debugging.
        // if (updatedUnitsForNotification.length > 0) {
        //   const clientDoc = await getDoc(doc(db, 'clients', safeClientId));
        //   if (clientDoc.exists()) {
        //     await sendGroupedTemplatedWhatsAppMessage('payment_received', {id: clientDoc.id, ...clientDoc.data()} as Client, updatedUnitsForNotification);
        //   }
        // }

        revalidatePath(`/clients/${safeClientId}/units`);
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
        console.error("Error al registrar el pago:", errorMessage);
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
          const owner = client.ownerId ? userMap.get(client.ownerId) : undefined;

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

            // --- Robust Date Reversal ---
            const nextPaymentDate = unitData.fechaSiguientePago ? new Date(unitData.fechaSiguientePago) : null;
            if (!nextPaymentDate || !isValid(nextPaymentDate)) {
                throw new Error('La fecha de siguiente pago actual de la unidad es inválida. No se puede revertir el pago.');
            }
            
            const unitUpdate: Partial<Record<keyof Unit, any>> = {
                fechaSiguientePago: subMonths(nextPaymentDate, paymentData.mesesPagados)
            };

            if (unitData.tipoContrato === 'con_contrato') {
                const monthlyCost = (unitData.costoTotalContrato ?? 0) / (unitData.mesesContrato ?? 1);
                const paymentAmountToRestore = monthlyCost * paymentData.mesesPagados;
                unitUpdate.saldoContrato = (unitData.saldoContrato ?? 0) + paymentAmountToRestore;
            } else {
                const expirationDate = unitData.fechaVencimiento ? new Date(unitData.fechaVencimiento) : null;
                if (expirationDate && isValid(expirationDate)) {
                     unitUpdate.fechaVencimiento = subMonths(expirationDate, paymentData.mesesPagados);
                }
            }
            
            const paymentsCollectionRef = collection(db, 'clients', clientId, 'units', unitId, 'payments');
            const otherPaymentsQuery = query(paymentsCollectionRef, where('__name__', '!=', paymentId), orderBy('fechaPago', 'desc'), limit(1));
            const otherPaymentsSnapshot = await getDocs(otherPaymentsQuery);
            
            unitUpdate.ultimoPago = !otherPaymentsSnapshot.empty
                ? otherPaymentsSnapshot.docs[0].data().fechaPago.toDate().toISOString()
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

    