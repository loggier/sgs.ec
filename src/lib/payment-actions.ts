
'use server';

import { revalidatePath } from 'next/cache';
import { addMonths, subMonths } from 'date-fns';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  Timestamp,
  writeBatch,
  collectionGroup,
  query,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentFormSchema, type PaymentFormInput, type Payment, type PaymentHistoryEntry } from './payment-schema';
import type { Unit } from './unit-schema';
import type { User } from './user-schema';
import type { Client } from './schema';

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
  // Use the base schema as client/batch forms provide the necessary data
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

        const unit = { id: unitSnapshot.id, clientId, ...convertTimestamps(unitSnapshot.data()) } as Unit;
        
        const unitUpdateData: Partial<Record<keyof Unit, any>> = {
            ultimoPago: fechaPago,
        };

        const currentVencimiento = unit.fechaVencimiento;
        const baseDateForVencimiento = currentVencimiento > new Date() ? currentVencimiento : new Date();
        const newVencimiento = addMonths(baseDateForVencimiento, mesesPagados);
        
        unitUpdateData.fechaVencimiento = newVencimiento;
        unitUpdateData.fechaSiguientePago = newVencimiento;
        
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
    const [clientsSnapshot, unitsSnapshot, usersSnapshot, paymentsSnapshot] = await Promise.all([
      getDocs(collection(db, 'clients')),
      getDocs(collectionGroup(db, 'units')),
      getDocs(collection(db, 'users')),
      getDocs(query(collectionGroup(db, 'payments'), orderBy('fechaPago', 'desc')))
    ]);

    const clientMap = new Map(clientsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Client]));
    const unitMap = new Map(unitsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Unit]));
    const userMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

    let paymentList: PaymentHistoryEntry[] = paymentsSnapshot.docs.map(doc => {
      const payment = convertTimestamps(doc.data()) as Payment;
      payment.id = doc.id; 

      const unit = unitMap.get(payment.unitId);
      const client = clientMap.get(payment.clientId);
      const owner = client ? userMap.get(client.ownerId) : undefined;
      
      return {
        ...payment,
        clientName: client?.nomSujeto ?? 'Cliente no encontrado',
        unitPlaca: unit?.placa ?? 'Placa no encontrada',
        ownerId: client?.ownerId,
        ownerName: owner?.nombre ?? 'Propietario no encontrado',
      };
    });

    if (currentUserRole !== 'master') {
      paymentList = paymentList.filter(p => p.ownerId === currentUserId);
    }

    return paymentList;

  } catch (error) {
    console.error("Error fetching payment history:", error);
    return [];
  }
}

export async function deletePayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    try {
        const paymentQuery = query(collectionGroup(db, 'payments'), where('__name__', '==', paymentId), limit(1));
        const paymentSnapshot = await getDocs(paymentQuery);
        if (paymentSnapshot.empty) {
            return { success: false, message: 'Pago no encontrado.' };
        }
        
        const paymentDoc = paymentSnapshot.docs[0];
        const paymentData = convertTimestamps(paymentDoc.data()) as Payment;
        const paymentDocRef = paymentDoc.ref;

        const unitDocRef = doc(db, 'clients', paymentData.clientId, 'units', paymentData.unitId);
        const unitDoc = await getDoc(unitDocRef);

        if (!unitDoc.exists()) {
            return { success: false, message: 'No se pudo encontrar la unidad asociada.' };
        }
        
        const unitData = convertTimestamps(unitDoc.data()) as Unit;

        const unitUpdate: Partial<Unit> = {};

        // Revertimos fechaVencimiento y fechaSiguientePago
        const newVencimiento = subMonths(new Date(unitData.fechaVencimiento), paymentData.mesesPagados);
        unitUpdate.fechaVencimiento = newVencimiento;
        unitUpdate.fechaSiguientePago = newVencimiento;

        // Buscamos el pago anterior para revertir ultimoPago
        const paymentsCollectionRef = collection(unitDocRef, 'payments');
        const prevPaymentQuery = query(paymentsCollectionRef, orderBy('fechaPago', 'desc'), limit(2));
        const prevPaymentSnapshot = await getDocs(prevPaymentQuery);
        
        // El pago anterior será el segundo en la lista (si existe), ya que el primero es el que estamos eliminando.
        const previousPaymentDoc = prevPaymentSnapshot.docs.find(doc => doc.id !== paymentId);

        if (previousPaymentDoc) {
            unitUpdate.ultimoPago = convertTimestamps(previousPaymentDoc.data()).fechaPago;
        } else {
            // Si no hay pagos anteriores, volvemos a la fecha de inicio del contrato
            unitUpdate.ultimoPago = null;
        }
        
        const batch = writeBatch(db);
        batch.update(unitDocRef, unitUpdate);
        batch.delete(paymentDocRef);
        await batch.commit();

        revalidatePath(`/clients/${paymentData.clientId}/units`);
        revalidatePath('/units');
        revalidatePath('/payments');
        revalidatePath('/');
        
        return { success: true, message: 'Pago eliminado y estado de la unidad revertido con éxito.' };

    } catch (error) {
        console.error("Error deleting payment:", error);
        return { success: false, message: 'Error al eliminar el pago.' };
    }
}
