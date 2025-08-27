
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
import { sendGroupedTemplatedWhatsAppMessage } from './notification-actions';
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
    return { success: false, message: 'Datos de pago no válidos.' };
  }

  // 2) Validar clientId
  const safeClientId = typeof clientId === 'string' ? clientId.trim() : '';
  if (!safeClientId) {
    return { success: false, message: 'ID de cliente inválido o ausente.' };
  }

  // 3) Normalizar y validar unitIds
  const arrayUnitIds = Array.isArray(unitIds) ? unitIds : [];
  const cleanedUnitIds = arrayUnitIds
    .map(u => (typeof u === 'string' ? u.trim() : ''))
    .filter(u => u.length > 0);

  // Opcional: detectar inválidos para mejor diagnóstico
  const invalids = arrayUnitIds.filter(u => typeof u !== 'string' || !String(u).trim());
  if (invalids.length > 0) {
    console.error('[registerPayment] Se encontraron unitIds inválidos que fueron filtrados:', invalids);
  }

  // Quitar duplicados
  const uniqueUnitIds = Array.from(new Set(cleanedUnitIds));

  if (uniqueUnitIds.length === 0) {
    return { success: false, message: 'No se seleccionó ninguna unidad válida para procesar.' };
  }
  
  try {
    const { fechaPago, mesesPagados, ...paymentData } = validation.data;
    const updatedUnitsForNotification: Unit[] = [];
    let processedCount = 0;
    
    const clientDoc = await getDoc(doc(db, 'clients', safeClientId));
    if (!clientDoc.exists()) {
        return { success: false, message: 'El cliente especificado no existe.' };
    }
    const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;

    await runTransaction(db, async (transaction) => {
        for (const unitId of uniqueUnitIds) {
            if (!unitId) {
              throw new Error('Encontrado unitId vacío durante la transacción.');
            }

            const unitDocRef = doc(db, 'clients', safeClientId, 'units', unitId);
            const unitSnapshot = await transaction.get(unitDocRef);

            if (!unitSnapshot.exists()) {
                throw new Error(`Unidad con ID ${unitId} no encontrada.`);
            }

            const unitDataFromDB = convertTimestamps(unitSnapshot.data()) as Unit;

            // --- Lógica de Fecha Robusta ---
            const lastPaymentDate = unitDataFromDB.ultimoPago ? new Date(unitDataFromDB.ultimoPago) : null;
            const contractStartDate = unitDataFromDB.fechaInicioContrato ? new Date(unitDataFromDB.fechaInicioContrato) : null;
            
            let baseDateForCalculation: Date;

            if (lastPaymentDate && isValid(lastPaymentDate)) {
                baseDateForCalculation = lastPaymentDate;
            } else if (contractStartDate && isValid(contractStartDate)) {
                baseDateForCalculation = contractStartDate;
            } else {
                baseDateForCalculation = new Date(); // Fallback seguro
            }

            let newNextPaymentDate = addMonths(baseDateForCalculation, mesesPagados);
            
            if (isBefore(newNextPaymentDate, new Date())) {
                newNextPaymentDate = addMonths(new Date(), mesesPagados);
            }
            // --- Fin de la Lógica de Fecha Robusta ---

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
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { 
        success: false, 
        message: `Error al registrar el pago. Detalles: ${errorMessage}` 
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
            
            // --- Lógica de reversión de fecha BLINDADA ---
            const currentNextPaymentDate = unitData.fechaSiguientePago ? new Date(unitData.fechaSiguientePago) : null;
            if (currentNextPaymentDate && isValid(currentNextPaymentDate)) {
                 unitUpdate.fechaSiguientePago = subMonths(currentNextPaymentDate, paymentData.mesesPagados);
            }
            // Si la fecha actual es inválida, no la tocamos para evitar corrupción.

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
                unitUpdate.ultimoPago = null;
            } else {
                 const lastPaymentData = previousPaymentsSnapshot.docs[0].data();
                 if (lastPaymentData.fechaPago && lastPaymentData.fechaPago instanceof Timestamp) {
                    unitUpdate.ultimoPago = lastPaymentData.fechaPago.toDate();
                 } else {
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

    