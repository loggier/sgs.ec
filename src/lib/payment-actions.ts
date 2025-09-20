
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
  startAfter,
  collectionGroup,
  Query,
  DocumentData,
  endBefore
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment, type PaymentHistoryEntry } from './payment-schema';
import type { Unit } from './unit-schema';
import type { User } from './user-schema';
import type { Client } from './schema';
import { sendGroupedTemplatedWhatsAppMessage } from './notification-actions';

const PAYMENTS_PAGE_SIZE = 20;

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
            const unitsToProcess: { ref: any, data: Unit }[] = [];
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
                
                unitsToProcess.push({ ref: unitSnapshot.ref, data: unitDataFromDB });
            }

            for (const { ref, data: unitDataFromDB } of unitsToProcess) {
                const currentNextPaymentDate = unitDataFromDB.fechaSiguientePago ? new Date(unitDataFromDB.fechaSiguientePago) : null;
                const contractStartDate = new Date(unitDataFromDB.fechaInicioContrato);
                
                const baseDateForCalculation = (currentNextPaymentDate && isValid(currentNextPaymentDate) && isBefore(contractStartDate, currentNextPaymentDate))
                    ? currentNextPaymentDate
                    : contractStartDate;
                
                const newNextPaymentDate = addMonths(baseDateForCalculation, mesesPagados);

                const unitUpdateData: Partial<Record<keyof Unit, any>> = {
                    ultimoPago: Timestamp.fromDate(new Date(fechaPago)),
                    fechaSiguientePago: newNextPaymentDate,
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
                    unitUpdateData.fechaVencimiento = addMonths(baseExpirationDate, mesesPagados);
                }

                transaction.update(ref, unitUpdateData);

                const newPayment: Omit<Payment, 'id'> = {
                    unitId: ref.id,
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
                const paymentDocRef = doc(collection(db, 'clients', safeClientId, 'units', ref.id, 'payments'));
                transaction.set(paymentDocRef, newPayment);

                updatedUnitsForNotification.push({ ...unitDataFromDB, ...unitUpdateData, id: ref.id });
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


export async function getAllPayments(
  currentUser: User,
  cursor?: string
): Promise<{ payments: PaymentHistoryEntry[]; nextCursor: string | null }> {
  if (!currentUser) return { payments: [], nextCursor: null };

  try {
    const paymentsGroupRef = collectionGroup(db, 'payments');
    let q: Query<DocumentData>;

    // Base query constraints
    const queryConstraints: any[] = [];
    
    // Determine the correct owner ID to filter by
    const ownerIdToFilter = currentUser.role === 'analista' && currentUser.creatorId 
      ? currentUser.creatorId 
      : currentUser.id;

    // Apply role-based filtering
    if (currentUser.role !== 'master') {
        queryConstraints.push(where('ownerId', '==', ownerIdToFilter));
    }
    
    // Always order by payment date descending
    queryConstraints.push(orderBy('fechaPago', 'desc'));
    
    // Handle pagination cursor
    if (cursor) {
        const cursorDoc = await getDoc(doc(db, cursor));
        if (cursorDoc.exists()) {
            queryConstraints.push(startAfter(cursorDoc));
        }
    }
    
    // Limit the results per page
    queryConstraints.push(limit(PAYMENTS_PAGE_SIZE));

    q = query(paymentsGroupRef, ...queryConstraints);
    const paymentSnapshot = await getDocs(q);

    if (paymentSnapshot.empty) {
      return { payments: [], nextCursor: null };
    }
    
    // For master users, we need to fetch all users to map owner names
    let usersMap: Map<string, User> | null = null;
    if (currentUser.role === 'master') {
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      usersMap = new Map(allUsersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));
    }

    const payments = paymentSnapshot.docs.map(doc => {
      const data = convertTimestamps(doc.data()) as Payment;
      let ownerName: string | undefined = undefined;

      if (currentUser.role === 'master' && data.ownerId && usersMap) {
          ownerName = usersMap.get(data.ownerId)?.nombre;
      }

      return {
        ...data,
        id: doc.id,
        refPath: doc.ref.path,
        ownerName: ownerName,
      } as PaymentHistoryEntry;
    });

    const lastVisibleDoc = paymentSnapshot.docs[paymentSnapshot.docs.length - 1];
    
    // Construct the next query to check if there are more results
    const nextQueryCheckConstraints = [...queryConstraints];
    // Remove the previous limit
    if (nextQueryCheckConstraints[nextQueryCheckConstraints.length -1]?.type === 'limit') {
        nextQueryCheckConstraints.pop(); 
    }
    // Add new startAfter and limit(1)
    const nextQuery = query(paymentsGroupRef, ...nextQueryCheckConstraints, startAfter(lastVisibleDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);

    return {
      payments,
      nextCursor: !nextSnapshot.empty ? lastVisibleDoc.ref.path : null,
    };

  } catch (error) {
    console.error("Error fetching paginated payment history:", error);
    // In case of an error, return an empty result to avoid crashing the UI
    return { payments: [], nextCursor: null };
  }
}

export async function deletePayment(paymentId: string, clientId: string, unitId: string): Promise<{ success: boolean; message: string }> {
    try {
        const paymentDocRef = doc(db, 'clients', clientId, 'units', unitId, 'payments', paymentId);
        
        await runTransaction(db, async (transaction) => {
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
            
            // Find the new "last payment"
            const paymentsCollectionRef = collection(db, 'clients', clientId, 'units', unitId, 'payments');
            const otherPaymentsQuery = query(paymentsCollectionRef, where('__name__', '!=', paymentId), orderBy('fechaPago', 'desc'), limit(1));
            const otherPaymentsSnapshotDocs = (await getDocs(otherPaymentsQuery)).docs; // Execute query inside transaction
            
            unitUpdate.ultimoPago = otherPaymentsSnapshotDocs.length > 0
                ? (otherPaymentsSnapshotDocs[0].data().fechaPago as Timestamp)
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
