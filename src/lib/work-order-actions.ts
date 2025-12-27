
'use server';

import { revalidatePath } from 'next/cache';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { WorkOrderSchema, type WorkOrder, type WorkOrderFormInput } from './work-order-schema';
import type { User } from './user-schema';

const WORK_ORDERS_COLLECTION = 'work_orders';

// Helper to convert Timestamps
const convertTimestamps = (data: any): any => {
    if (!data) return data;
    const newData: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            if (value instanceof Timestamp) {
                newData[key] = value.toDate().toISOString();
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                newData[key] = convertTimestamps(value);
            } else {
                newData[key] = value;
            }
        }
    }
    return newData;
};


export async function getWorkOrders(currentUser: User): Promise<WorkOrder[]> {
  try {
    if (!currentUser || !['master', 'manager'].includes(currentUser.role)) {
      return [];
    }

    const ordersCollectionRef = collection(db, WORK_ORDERS_COLLECTION);
    let ordersQuery;

    if (currentUser.role === 'master') {
        ordersQuery = query(ordersCollectionRef);
    } else { // manager
        ordersQuery = query(ordersCollectionRef, where("ownerId", "==", currentUser.id));
    }
    
    const orderSnapshot = await getDocs(ordersQuery);
    
    const techniciansSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'tecnico')));
    const techniciansMap = new Map(techniciansSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

    const orders = orderSnapshot.docs.map(doc => {
      const data = convertTimestamps(doc.data()) as Omit<WorkOrder, 'id'>;
      const tecnico = data.tecnicoId ? techniciansMap.get(data.tecnicoId) : null;
      return {
        id: doc.id,
        ...data,
        tecnicoNombre: tecnico?.nombre || tecnico?.username,
      } as WorkOrder;
    });

    return orders.sort((a, b) => new Date(b.fechaProgramada).getTime() - new Date(a.fechaProgramada).getTime());

  } catch (error) {
    console.error("Error getting work orders:", error);
    return [];
  }
}

export async function getWorkOrderById(orderId: string): Promise<WorkOrder | null> {
    try {
        const orderDocRef = doc(db, WORK_ORDERS_COLLECTION, orderId);
        const docSnap = await getDoc(orderDocRef);
        if (!docSnap.exists()) {
            return null;
        }
        return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as WorkOrder;
    } catch (error) {
        console.error("Error getting work order by ID:", error);
        return null;
    }
}


export async function saveWorkOrder(
  data: WorkOrderFormInput,
  currentUser: User,
  orderId?: string
): Promise<{ success: boolean; message: string; order?: WorkOrder }> {

    if (!currentUser || !['master', 'manager'].includes(currentUser.role)) {
        return { success: false, message: 'No tiene permiso para realizar esta acción.' };
    }
  
    const validation = WorkOrderSchema.omit({id: true}).safeParse(data);
    if (!validation.success) {
        console.error(validation.error.flatten().fieldErrors);
        return { success: false, message: 'Datos proporcionados no válidos.' };
    }

    const dataToSave: any = { 
        ...validation.data,
        ownerId: currentUser.id,
        fechaProgramada: Timestamp.fromDate(new Date(validation.data.fechaProgramada)),
    };
    
  try {
    const ordersCollection = collection(db, WORK_ORDERS_COLLECTION);
    let savedOrderId = orderId;
    let message = '';

    if (orderId) {
      const orderDocRef = doc(db, WORK_ORDERS_COLLECTION, orderId);
      const docSnap = await getDoc(orderDocRef);
      if(!docSnap.exists() || (currentUser.role === 'manager' && docSnap.data().ownerId !== currentUser.id)) {
          return { success: false, message: 'Orden no encontrada o sin permisos para editar.' };
      }
      await updateDoc(orderDocRef, dataToSave);
      message = 'Orden de trabajo actualizada con éxito.';
    } else {
      const newOrderRef = await addDoc(ordersCollection, dataToSave);
      savedOrderId = newOrderRef.id;
      message = 'Orden de trabajo creada con éxito.';
    }

    revalidatePath('/work-orders');

    const finalDoc = await getDoc(doc(db, WORK_ORDERS_COLLECTION, savedOrderId!));
    const finalData = convertTimestamps(finalDoc.data());

    return {
      success: true,
      message,
      order: { id: savedOrderId!, ...finalData } as WorkOrder,
    };
  } catch (error) {
    console.error("Error saving work order:", error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return { success: false, message: `Error al guardar la orden: ${errorMessage}` };
  }
}
