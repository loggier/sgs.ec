
'use server';

import { revalidatePath } from 'next/cache';
import { addMonths, subMonths } from 'date-fns';
import {
  collection,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  writeBatch,
  query,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment, type PaymentHistoryEntry } from './payment-schema';
import type { Unit } from './unit-schema';
import type { User } from './user-schema';
import type { Client } from './schema';
import { getClients } from './actions';
import { getUnitsByClientId } from './unit-actions';

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
    const batch = writeBatch(db);
    const { fechaPago, mesesPagados, ...paymentData } = validation.data;
    const updatedUnits: Unit[] = [];
    let processedCount = 0;

    for (const unitId of unitIds) {
        const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
        const unitSnapshot = await getDoc(unitDocRef);

        if (!unitSnapshot.exists()) {
            console.warn(`Unidad con ID ${unitId} no encontrada. Saltando.`);
            continue;
        }

        const unitDataFromDB = convertTimestamps(unitSnapshot.data()) as Omit<Unit, 'id' | 'clientId'>;
        const unit = { id: unitSnapshot.id, clientId, ...unitDataFromDB } as Unit;
        
        const unitUpdateData: Partial<Record<keyof Unit, any>> = {
            ultimoPago: fechaPago,
            fechaSiguientePago: addMonths(new Date(unit.fechaSiguientePago), mesesPagados)
        };

        if (unit.tipoContrato === 'sin_contrato') {
            const newVencimiento = addMonths(new Date(unit.fechaVencimiento), mesesPagados);
            unitUpdateData.fechaVencimiento = newVencimiento;
        }
        
        batch.update(unitDocRef, unitUpdateData);

        const newPayment: Omit<Payment, 'id'> = {
            unitId,
            clientId,
            fechaPago,
            mesesPagados,
            ...paymentData,
        };
        const paymentDocRef = doc(collection(db, 'clients', clientId, 'units', unitId, 'payments'));
        batch.set(paymentDocRef, newPayment);
        
        updatedUnits.push({ ...unit, ...unitUpdateData });
        processedCount++;
    }
    
    await batch.commit();
    
    revalidatePath(`/clients/${clientId}/units`);
    revalidatePath('/');
    revalidatePath('/units');
    revalidatePath('/payments');

    return { 
        success: true, 
        message: `${processedCount} pago(s) registrado(s) con éxito.`, 
        units: updatedUnits 
    };

  } catch (error) {
    console.error("Error registering payment:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al registrar el pago: ${errorMessage}` };
  }
}


export async function getAllPayments(
  currentUserId: string,
  currentUserRole: User['role']
): Promise<PaymentHistoryEntry[]> {
  if (!currentUserId) return [];

  try {
    const userClients = await getClients(currentUserId, currentUserRole);
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const userMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

    const allPayments: PaymentHistoryEntry[] = [];

    for (const client of userClients) {
      const units = await getUnitsByClientId(client.id);
      for (const unit of units) {
        const paymentsCollectionRef = collection(db, 'clients', client.id, 'units', unit.id, 'payments');
        const paymentsSnapshot = await getDocs(paymentsCollectionRef);

        paymentsSnapshot.forEach(paymentDoc => {
          const paymentData = convertTimestamps(paymentDoc.data()) as Payment;
          const owner = userMap.get(client.ownerId);

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
    try {
        const paymentDocRef = doc(db, 'clients', clientId, 'units', unitId, 'payments', paymentId);
        const paymentDoc = await getDoc(paymentDocRef);

        if (!paymentDoc.exists()) {
            return { success: false, message: 'Pago no encontrado.' };
        }
        
        const paymentData = convertTimestamps(paymentDoc.data()) as Payment;

        const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
        const unitDoc = await getDoc(unitDocRef);

        if (!unitDoc.exists()) {
            return { success: false, message: 'No se pudo encontrar la unidad asociada.' };
        }
        
        const unitData = convertTimestamps(unitDoc.data()) as Unit;

        const unitUpdate: Partial<Unit> = {
            fechaSiguientePago: subMonths(new Date(unitData.fechaSiguientePago), paymentData.mesesPagados)
        };

        if (unitData.tipoContrato === 'sin_contrato') {
            const newVencimiento = subMonths(new Date(unitData.fechaVencimiento), paymentData.mesesPagados);
            unitUpdate.fechaVencimiento = newVencimiento;
        }

        const paymentsCollectionRef = collection(unitDocRef, 'payments');
        const q = query(paymentsCollectionRef, orderBy('fechaPago', 'desc'));
        const paymentsSnapshot = await getDocs(q);
        
        const previousPaymentDoc = paymentsSnapshot.docs.find(doc => doc.id !== paymentId);

        if (previousPaymentDoc) {
            unitUpdate.ultimoPago = convertTimestamps(previousPaymentDoc.data()).fechaPago;
        } else {
            unitUpdate.ultimoPago = null;
        }
        
        const batch = writeBatch(db);
        batch.update(unitDocRef, unitUpdate);
        batch.delete(paymentDocRef);
        await batch.commit();

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
