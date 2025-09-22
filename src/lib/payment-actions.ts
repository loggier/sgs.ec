

'use server';

import { revalidatePath } from 'next/revalidate';
import { addMonths, subMonths, isValid } from 'date-fns';
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
  collectionGroup,
  startAfter,
  addDoc,
  QueryDocumentSnapshot,
  DocumentData,
  deleteDoc,
  endBefore
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment, type PaymentHistoryEntry } from './payment-schema';
import type { Unit } from './unit-schema';
import type { User } from './user-schema';
import type { Client } from './schema';
import { sendGroupedTemplatedWhatsAppMessage } from './notification-actions';

const PAYMENTS_PAGE_SIZE = 10;

const convertTimestamps = (data: any): any => {
    if (!data) return data;

    const newData: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            if (value instanceof Timestamp) {
                newData[key] = value.toDate().toISOString();
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                newData[key] = convertTimestamps(value); // Recursively convert nested objects
            } else {
                newData[key] = value;
            }
        }
    }
    return newData;
};


export async function registerPayment(
    data: PaymentFormInput,
    unitIdsInput: unknown,
    clientIdInput: unknown
): Promise<{ success: boolean; message: string; units?: Unit[] }> {
    const validation = PaymentFormSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Datos de pago no válidos.' };
    }

    const safeClientId = typeof clientIdInput === 'string' ? clientIdInput.trim() : '';
    if (!safeClientId) {
        return { success: false, message: "Error Crítico: El 'clientId' es inválido o no fue proporcionado." };
    }

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
    
    const clientDocRef = doc(db, 'clients', safeClientId);
    const clientSnapshot = await getDoc(clientDocRef);
    if (!clientSnapshot.exists()) {
        return { success: false, message: 'El cliente asociado al pago no fue encontrado.' };
    }
    const clientData = { id: clientSnapshot.id, ...clientSnapshot.data() } as Client;

    try {
        const { fechaPago, mesesPagados, ...paymentData } = validation.data;
        const updatedUnitsForNotification: Unit[] = [];
        let processedCount = 0;

        await runTransaction(db, async (transaction) => {
            for (const unitId of uniqueUnitIds) {
                const unitDocRef = doc(db, 'clients', safeClientId, 'units', unitId);
                const unitSnapshot = await transaction.get(unitDocRef);
                
                if (!unitSnapshot.exists()) {
                    throw new Error(`La unidad con ID ${unitId} no fue encontrada.`);
                }
                
                const unitDataFromDB = convertTimestamps(unitSnapshot.data()) as Unit;

                if (!unitDataFromDB.fechaInicioContrato || !isValid(new Date(unitDataFromDB.fechaInicioContrato))) {
                     throw new Error(`La unidad con placa ${unitDataFromDB.placa} tiene una fecha de inicio de contrato inválida.`);
                }
                
                const currentNextPaymentDate = unitDataFromDB.fechaSiguientePago ? new Date(unitDataFromDB.fechaSiguientePago) : null;
                const contractStartDate = new Date(unitDataFromDB.fechaInicioContrato);
                
                const baseDateForCalculation = (currentNextPaymentDate && isValid(currentNextPaymentDate))
                    ? currentNextPaymentDate
                    : contractStartDate;
                
                const newNextPaymentDate = addMonths(baseDateForCalculation, mesesPagados);

                const unitUpdateData: Partial<Record<keyof Unit, any>> = {
                    ultimoPago: Timestamp.fromDate(new Date(fechaPago)),
                    fechaSiguientePago: Timestamp.fromDate(newNextPaymentDate),
                };
                
                const getMonthlyCost = (unit: Unit): number => {
                    if (unit.tipoContrato === 'con_contrato') {
                        return (unit.costoTotalContrato ?? 0) / (unit.mesesContrato || 1);
                    }
                    return unit.costoMensual ?? 0;
                };
                
                const individualMonthlyCost = getMonthlyCost(unitDataFromDB);
                const individualPaymentAmount = individualMonthlyCost * mesesPagados;

                if (unitDataFromDB.tipoContrato === 'con_contrato') {
                    const currentBalance = unitDataFromDB.saldoContrato ?? unitDataFromDB.costoTotalContrato ?? 0;
                    unitUpdateData.saldoContrato = currentBalance - individualPaymentAmount;
                } else {
                    const expirationDateCandidate = unitDataFromDB.fechaVencimiento ? new Date(unitDataFromDB.fechaVencimiento) : null;
                    const baseExpirationDate = (expirationDateCandidate && isValid(expirationDateCandidate)) ? expirationDateCandidate : baseDateForCalculation;
                    unitUpdateData.fechaVencimiento = Timestamp.fromDate(addMonths(baseExpirationDate, mesesPagados));
                }

                transaction.update(unitDocRef, unitUpdateData);

                const newPayment: Omit<Payment, 'id'> = {
                    unitId: unitId,
                    clientId: safeClientId,
                    clientName: clientData.nomSujeto,
                    unitPlaca: unitDataFromDB.placa,
                    ownerId: clientData.ownerId,
                    fechaPago: Timestamp.fromDate(new Date(fechaPago)),
                    mesesPagados,
                    monto: individualPaymentAmount,
                    formaPago: paymentData.formaPago,
                    numeroFactura: paymentData.numeroFactura,
                };
                const paymentDocRef = doc(collection(db, 'payments'));
                transaction.set(paymentDocRef, newPayment);

                updatedUnitsForNotification.push({ ...unitDataFromDB, ...unitUpdateData, id: unitId });
                processedCount++;
            }
        });
        
        if (updatedUnitsForNotification.length > 0) {
             await sendGroupedTemplatedWhatsAppMessage('payment_received', clientData, updatedUnitsForNotification);
        }

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

export async function getPayments(
    user: User,
    cursor: string | null = null,
    direction: 'next' | 'prev' = 'next'
): Promise<{ payments: PaymentHistoryEntry[], lastVisible: string | null, firstVisible: string | null, hasMore: boolean }> {
    if (!user) {
        return { payments: [], lastVisible: null, firstVisible: null, hasMore: false };
    }

    try {
        const ownerIdToFilter = user.role === 'analista' ? user.creatorId : user.id;

        const paymentsCollectionRef = collection(db, 'payments');
        const queryConstraints: any[] = [orderBy('fechaPago', 'desc'), limit(PAYMENTS_PAGE_SIZE)];

        if (user.role !== 'master') {
            queryConstraints.unshift(where('ownerId', '==', ownerIdToFilter));
        }

        if (cursor) {
            const cursorDoc = await getDoc(doc(paymentsCollectionRef, cursor));
            if (cursorDoc.exists()) {
                 queryConstraints.push(startAfter(cursorDoc));
            }
        }
        
        const q = query(paymentsCollectionRef, ...queryConstraints);
        const paymentsSnapshot = await getDocs(q);
        const paymentDocs = paymentsSnapshot.docs;

        if (paymentDocs.length === 0) {
            return { payments: [], lastVisible: null, firstVisible: null, hasMore: false };
        }

        const [allUserDocs, allClientDocs] = await Promise.all([
            getDocs(query(collection(db, 'users'))),
            getDocs(query(collection(db, 'clients')))
        ]);
        const userMap = new Map(allUserDocs.docs.map(doc => [doc.id, doc.data() as User]));
        const clientMap = new Map(allClientDocs.docs.map(doc => [doc.id, doc.data() as Client]));

        const uniqueUnitRefs = paymentDocs
            .map(p => ({ clientId: p.data().clientId as string, unitId: p.data().unitId as string }))
            .filter(ref => ref.clientId && ref.unitId)
            .filter((v, i, a) => a.findIndex(t => (t.clientId === v.clientId && t.unitId === v.unitId)) === i)
            .map(ref => getDoc(doc(db, 'clients', ref.clientId, 'units', ref.unitId)));
            
        const unitDocs = await Promise.all(uniqueUnitRefs);
        const unitMap = new Map(unitDocs
            .filter(doc => doc.exists())
            .map(doc => [doc.id, doc.data()])
        );

        const payments = paymentDocs.map(doc => {
            const data = convertTimestamps(doc.data()) as Payment;
            const ownerName = data.ownerId ? userMap.get(data.ownerId)?.nombre : undefined;
            const clientName = data.clientId ? clientMap.get(data.clientId)?.nomSujeto : 'Cliente no encontrado';
            
            let unitPlaca = 'Placa no encontrada';
            if (data.unitPlaca) {
              unitPlaca = data.unitPlaca;
            } else if (data.unitId) {
              const unitData = unitMap.get(data.unitId);
              if (unitData) {
                  unitPlaca = unitData.placa || 'Placa sin definir';
              }
            }
            
            return {
                id: doc.id,
                ...data,
                clientName: clientName,
                unitPlaca: unitPlaca,
                ownerName,
            };
        });

        const lastVisibleDoc = paymentDocs[paymentDocs.length - 1];
        const firstVisibleDoc = paymentDocs[0];

        let hasMore = false;
        if (lastVisibleDoc) {
            const nextQueryConstraints = [orderBy('fechaPago', 'desc'), limit(1), startAfter(lastVisibleDoc)];
            if (user.role !== 'master') {
                nextQueryConstraints.unshift(where('ownerId', '==', ownerIdToFilter));
            }
            const nextQuery = query(paymentsCollectionRef, ...nextQueryConstraints);
            const nextSnapshot = await getDocs(nextQuery);
            hasMore = !nextSnapshot.empty;
        }

        return { 
            payments, 
            lastVisible: lastVisibleDoc?.id || null, 
            firstVisible: firstVisibleDoc?.id || null, 
            hasMore 
        };

    } catch (error) {
        console.error("Error fetching payments:", error);
        throw error;
    }
}


export async function deletePayment(paymentId: string, clientId: string, unitId: string): Promise<{ success: boolean; message: string }> {
    try {
        await runTransaction(db, async (transaction) => {
            const paymentDocRef = doc(db, 'payments', paymentId);
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

            const nextPaymentDate = unitData.fechaSiguientePago ? new Date(unitData.fechaSiguientePago) : null;
            if (!nextPaymentDate || !isValid(nextPaymentDate)) {
                throw new Error('La fecha de siguiente pago actual de la unidad es inválida. No se puede revertir el pago.');
            }
            
            const unitUpdate: Partial<Record<keyof Unit, any>> = {
                fechaSiguientePago: Timestamp.fromDate(subMonths(nextPaymentDate, paymentData.mesesPagados))
            };

            if (unitData.tipoContrato === 'con_contrato') {
                const monthlyCost = (unitData.costoTotalContrato ?? 0) / (unitData.mesesContrato ?? 1);
                const paymentAmountToRestore = monthlyCost * paymentData.mesesPagados;
                unitUpdate.saldoContrato = (unitData.saldoContrato ?? 0) + paymentAmountToRestore;
            } else {
                const expirationDate = unitData.fechaVencimiento ? new Date(unitData.fechaVencimiento) : null;
                if (expirationDate && isValid(expirationDate)) {
                     unitUpdate.fechaVencimiento = Timestamp.fromDate(subMonths(expirationDate, paymentData.mesesPagados));
                }
            }
            
            // Find the new "last payment"
            const otherPaymentsQuery = query(
                collection(db, 'payments'), 
                where('unitId', '==', unitId),
                orderBy('fechaPago', 'desc'), 
                startAfter(paymentDoc),
                limit(1)
            );
            const otherPaymentsSnapshot = await getDocs(otherPaymentsQuery);
            
            unitUpdate.ultimoPago = !otherPaymentsSnapshot.empty
                ? otherPaymentsSnapshot.docs[0].data().fechaPago
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

  