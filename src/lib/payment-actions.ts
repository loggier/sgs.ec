
'use server';

import { revalidatePath } from 'next/cache';
import { addMonths } from 'date-fns';
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
        unitUpdateData.fechaSiguientePago = addMonths(newVencimiento, 1);
        
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
    // 1. Fetch all necessary data in parallel
    const [clientsSnapshot, unitsSnapshot, usersSnapshot, paymentsSnapshot] = await Promise.all([
      getDocs(collection(db, 'clients')),
      getDocs(collectionGroup(db, 'units')),
      getDocs(collection(db, 'users')),
      getDocs(collectionGroup(db, 'payments'))
    ]);

    // 2. Create maps for efficient lookups
    const clientMap = new Map(clientsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Client]));
    const unitMap = new Map(unitsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Unit]));
    const userMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

    // 3. Process payments
    let paymentList: PaymentHistoryEntry[] = paymentsSnapshot.docs.map(doc => {
      const payment = convertTimestamps(doc.data()) as Payment;
      payment.id = doc.id; // Manually add the payment ID

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

    // 4. Filter based on user role
    if (currentUserRole !== 'master') {
      paymentList = paymentList.filter(p => p.ownerId === currentUserId);
    }
    
    // 5. Sort by most recent payment date
    paymentList.sort((a, b) => (b.fechaPago as Date).getTime() - (a.fechaPago as Date).getTime());

    return paymentList;

  } catch (error) {
    console.error("Error fetching payment history:", error);
    return [];
  }
}
