
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
  documentId,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment, type PaymentHistoryEntry } from './payment-schema';
import type { Unit } from './unit-schema';
import type { User } from './user-schema';
import { getClients } from './actions';
import { getUnitsByClientId } from './unit-actions';
import { getCurrentUser } from './auth';
import type { Client } from './schema';

const convertTimestamps = (docData: any): any => {
    // Defensive check to prevent error on undefined/null input
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
  unitIds: unknown,
  clientId: unknown
): Promise<{ success: boolean; message: string; units?: Unit[] }> {
  // 1) Validar input del formulario
  const validation = PaymentFormSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.errors[0]?.message || 'Datos de pago no válidos.';
    return { success: false, message: firstError };
  }

  // 2) Validar clientId de forma agresiva
  const safeClientId = typeof clientId === 'string' ? clientId.trim() : '';
  if (!safeClientId) {
    console.error('[DIAGNOSTICO] registerPayment falló porque safeClientId está vacío. clientId recibido:', clientId);
    return { success: false, message: "Error Crítico: El 'clientId' es undefined o vacío. No se puede continuar." };
  }

  // 3) Normalizar y validar unitIds de forma agresiva
  const arrayUnitIds = Array.isArray(unitIds) ? unitIds : [];
  const cleanedUnitIds = arrayUnitIds
    .map(u => (typeof u === 'string' ? u.trim() : ''))
    .filter(u => u.length > 0);

  const uniqueUnitIds = Array.from(new Set(cleanedUnitIds));

  if (uniqueUnitIds.length === 0) {
    return { success: false, message: 'No se seleccionó ninguna unidad válida para procesar el pago.' };
  }
  
  try {
    const { fechaPago, mesesPagados, ...paymentData } = validation.data;
    const updatedUnitsForNotification: Unit[] = [];
    let processedCount = 0;
    
    const clientDocRef = doc(db, 'clients', safeClientId);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists()) {
        return { success: false, message: 'El cliente especificado no existe.' };
    }
    const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;

    await runTransaction(db, async (transaction) => {
        for (const unitId of uniqueUnitIds) {
            // Guarda defensiva final
            if (!unitId) {
                console.error('[DIAGNOSTICO] registerPayment falló porque un unitId está vacío. unitIds recibidos:', uniqueUnitIds);
                throw new Error("Error Crítico: Una de las 'unitId' es undefined o vacía. No se puede continuar.");
            }

            const unitDocRef = doc(db, 'clients', safeClientId, 'units', unitId);
            const unitSnapshot = await transaction.get(unitDocRef);

            if (!unitSnapshot.exists()) {
                throw new Error(`La unidad con ID ${unitId} no fue encontrada. La operación fue cancelada.`);
            }

            const unitDataFromDB = convertTimestamps(unitSnapshot.data()) as Unit;

            // --- Lógica de Fecha Blindada ---
            const lastPaymentDate = unitDataFromDB.ultimoPago ? new Date(unitDataFromDB.ultimoPago) : null;
            const contractStartDate = unitDataFromDB.fechaInicioContrato ? new Date(unitDataFromDB.fechaInicioContrato) : null;
            
            let baseDateForCalculation: Date;

            if (lastPaymentDate && isValid(lastPaymentDate)) {
                baseDateForCalculation = lastPaymentDate;
            } else if (contractStartDate && isValid(contractStartDate)) {
                baseDateForCalculation = contractStartDate; 
            } else {
                 throw new Error(`La unidad con placa ${unitDataFromDB.placa} no tiene una fecha de inicio de contrato válida. No se puede registrar el pago.`);
            }

            let newNextPaymentDate = addMonths(baseDateForCalculation, mesesPagados);
            
            // If calculated next payment is still in the past, calculate from today
            if (isBefore(newNextPaymentDate, startOfDay(new Date()))) {
                newNextPaymentDate = addMonths(new Date(), mesesPagados);
            }
            // --- Fin de la Lógica de Fecha Blindada ---

            const unitUpdateData: Partial<Record<keyof Unit, any>> = {
                ultimoPago: fechaPago,
                fechaSiguientePago: newNextPaymentDate,
            };
            
            if (unitDataFromDB.tipoContrato === 'con_contrato') {
                const monthlyCost = (unitDataFromDB.costoTotalContrato ?? 0) / (unitDataFromDB.mesesContrato ?? 1);
                const paymentAmountForBalance = monthlyCost * mesesPagados;
                const currentBalance = unitDataFromDB.saldoContrato ?? unitDataFromDB.costoTotalContrato ?? 0;
                unitUpdateData.saldoContrato = currentBalance - paymentAmountForBalance;
            }
            
            const expirationDateCandidate = unitDataFromDB.fechaVencimiento ? new Date(unitDataFromDB.fechaVencimiento) : null;
            let baseExpirationDate = (expirationDateCandidate && isValid(expirationDateCandidate)) ? expirationDateCandidate : new Date();
            if (isBefore(baseExpirationDate, startOfDay(new Date()))) {
                baseExpirationDate = new Date();
            }
            unitUpdateData.fechaVencimiento = addMonths(baseExpirationDate, mesesPagados);
            
            transaction.update(unitDocRef, unitUpdateData);

            const newPayment: Omit<Payment, 'id'> = {
                unitId: unitDataFromDB.id,
                clientId: safeClientId,
                fechaPago,
                mesesPagados,
                ...paymentData,
            };
            const paymentDocRef = doc(collection(db, 'clients', safeClientId, 'units', unitDataFromDB.id, 'payments'));
            transaction.set(paymentDocRef, newPayment);
            
            const fullUpdatedUnit = { ...unitDataFromDB, ...unitUpdateData };
            updatedUnitsForNotification.push(fullUpdatedUnit);
            processedCount++;
        }
    });
    
    // The notification block is commented out as requested in previous steps.
    /*
    try {
        if (clientData.ownerId && updatedUnitsForNotification.length > 0) {
            await sendGroupedTemplatedWhatsAppMessage('payment_received', clientData, updatedUnitsForNotification);
        }
    } catch (notificationError) {
        console.error("[SERVER] Error en el bloque de notificación (se ignora para no afectar al usuario):", notificationError);
    }
    */
    
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
    console.error('[registerPayment] Error en la transacción:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar el pago.';
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
                throw new Error('Pago no encontrado. No se puede revertir.');
            }
            
            const paymentData = convertTimestamps(paymentDoc.data()) as Payment;

            const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
            const unitDoc = await transaction.get(unitDocRef);

            if (!unitDoc.exists()) {
                throw new Error('No se pudo encontrar la unidad asociada para revertir el estado.');
            }
            
            const unitData = convertTimestamps(unitDoc.data()) as Unit;
            const unitUpdate: Partial<Record<keyof Unit, any>> = {};
            
            // --- Lógica de reversión de fecha BLINDADA ---
            const currentNextPaymentDate = unitData.fechaSiguientePago ? new Date(unitData.fechaSiguientePago) : null;
            if (currentNextPaymentDate && isValid(currentNextPaymentDate)) {
                 unitUpdate.fechaSiguientePago = subMonths(currentNextPaymentDate, paymentData.mesesPagados);
            }

            if (unitData.tipoContrato === 'con_contrato') {
                const monthlyCost = (unitData.costoTotalContrato ?? 0) / (unitData.mesesContrato ?? 1);
                const paymentAmountToRestore = monthlyCost * paymentData.mesesPagados;
                unitUpdate.saldoContrato = (unitData.saldoContrato ?? 0) + paymentAmountToRestore;
            }
            
            const currentExpirationDate = unitData.fechaVencimiento ? new Date(unitData.fechaVencimiento) : null;
            if (currentExpirationDate && isValid(currentExpirationDate)) {
                unitUpdate.fechaVencimiento = subMonths(currentExpirationDate, paymentData.mesesPagados);
            }
            // --- Fin de la lógica blindada ---
            
            const paymentsCollectionRef = collection(db, 'clients', clientId, 'units', unitId, 'payments');
            const q = query(
                paymentsCollectionRef,
                orderBy('fechaPago', 'desc'),
                where(documentId(), '!=', paymentId), // Excluir el documento que se está eliminando
                limit(1)
            );
            
            const previousPaymentsSnapshot = await getDocs(q);
            
            if (previousPaymentsSnapshot.empty) {
                // If no payments are left, set last payment to null.
                unitUpdate.ultimoPago = null;
            } else {
                 const lastPaymentData = previousPaymentsSnapshot.docs[0].data();
                 // Ensure the 'fechaPago' from the previous document is valid before setting it.
                 if (lastPaymentData.fechaPago && lastPaymentData.fechaPago instanceof Timestamp) {
                    unitUpdate.ultimoPago = lastPaymentData.fechaPago.toDate();
                 } else {
                    // This case should be rare, but as a fallback, we nullify it.
                    unitUpdate.ultimoPago = null;
                 }
            }
            
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
