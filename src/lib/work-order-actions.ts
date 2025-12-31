

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
import { getNotificationUrlForUser } from './settings-actions';
import { sendNotificationMessage } from './notification-actions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
    if (!currentUser) {
      return [];
    }

    const ordersCollectionRef = collection(db, WORK_ORDERS_COLLECTION);
    let ordersQuery;

    if (currentUser.role === 'master') {
        ordersQuery = query(ordersCollectionRef);
    } else if (currentUser.role === 'manager') {
        ordersQuery = query(ordersCollectionRef, where("ownerId", "==", currentUser.id));
    } else if (currentUser.role === 'tecnico') {
        ordersQuery = query(ordersCollectionRef, where("tecnicoId", "==", currentUser.id));
    } else {
        return []; // Other roles see nothing
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

    if (!currentUser || !['master', 'manager', 'tecnico'].includes(currentUser.role)) {
        return { success: false, message: 'No tiene permiso para realizar esta acción.' };
    }
  
    const validation = WorkOrderSchema.omit({id: true, ownerId: true, tecnicoNombre: true}).safeParse(data);
    if (!validation.success) {
        console.error(validation.error.flatten().fieldErrors);
        return { success: false, message: 'Datos proporcionados no válidos.' };
    }
    
    const isEditingByTechnician = orderId && currentUser.role === 'tecnico';
    let dataToSave: any;
    let ownerIdForNotification: string;
    
    if (isEditingByTechnician) {
        // Technicians can only update the status and observation
        dataToSave = {
            estado: validation.data.estado,
            observacion: validation.data.observacion,
        };
        const existingOrder = await getWorkOrderById(orderId!);
        ownerIdForNotification = existingOrder?.ownerId || currentUser.id;
    } else {
        // Managers/Masters have full control
        if (!['master', 'manager'].includes(currentUser.role)) {
            return { success: false, message: 'No tiene permiso para crear o editar esta orden.' };
        }
        ownerIdForNotification = currentUser.id;
        dataToSave = { 
            ...validation.data,
            ownerId: currentUser.id,
            fechaProgramada: Timestamp.fromDate(new Date(validation.data.fechaProgramada)),
        };
    }
    
  try {
    const ordersCollection = collection(db, WORK_ORDERS_COLLECTION);
    let savedOrderId = orderId;
    let message = '';
    let notificationSent = false;
    let oldTecnicoId: string | undefined = undefined;


    if (orderId) {
      const orderDocRef = doc(db, WORK_ORDERS_COLLECTION, orderId);
      const docSnap = await getDoc(orderDocRef);
      if(!docSnap.exists()) {
          return { success: false, message: 'Orden no encontrada.' };
      }
      
      const orderData = docSnap.data();
      oldTecnicoId = orderData.tecnicoId;
      const canEdit = currentUser.role === 'master' || 
                      (currentUser.role === 'manager' && orderData.ownerId === currentUser.id) ||
                      (isEditingByTechnician && orderData.tecnicoId === currentUser.id);

      if (!canEdit) {
           return { success: false, message: 'No tiene permisos para editar esta orden.' };
      }

      await updateDoc(orderDocRef, dataToSave);
      message = 'Orden de trabajo actualizada con éxito.';
    } else {
      const newOrderRef = await addDoc(ordersCollection, dataToSave);
      savedOrderId = newOrderRef.id;
      message = 'Orden de trabajo creada con éxito.';
    }

    // --- Send notification to technician ---
    if ('tecnicoId' in dataToSave && dataToSave.tecnicoId && dataToSave.tecnicoId !== oldTecnicoId) {
        const tecnicoDoc = await getDoc(doc(db, 'users', dataToSave.tecnicoId));
        if (tecnicoDoc.exists()) {
            const tecnico = tecnicoDoc.data() as User;
            const notificationSettings = await getNotificationUrlForUser(ownerIdForNotification);
            
            if (tecnico.telefono && notificationSettings?.notificationUrl) {
                const dateString = format(new Date(data.fechaProgramada), 'PPP', {locale: es});
                const timeString = data.horaProgramada || '';
                const fullUrl = `https://sgi.gpsplataforma.net/work-orders/${savedOrderId}/edit`;
                const notifMessage = `*Nueva orden de soporte asignada:*\n- *Cliente:* ${data.nombreCliente}\n- *Placa:* ${data.placaVehiculo}\n- *Ciudad:* ${data.ciudad}\n- *Fecha:* ${dateString} ${timeString}\n\n*Ver detalles aquí:*\n${fullUrl}`;
                
                await sendNotificationMessage(
                    tecnico.telefono, 
                    notifMessage, 
                    notificationSettings,
                    { ownerId: ownerIdForNotification, clientId: 'N/A', clientName: data.nombreCliente }
                );
                notificationSent = true;
            }
        }
    }


    revalidatePath('/work-orders');
    revalidatePath('/');

    const finalDoc = await getDoc(doc(db, WORK_ORDERS_COLLECTION, savedOrderId!));
    const finalData = convertTimestamps(finalDoc.data());

    return {
      success: true,
      message: message + (notificationSent ? ' Notificación enviada al técnico.' : ''),
      order: { id: savedOrderId!, ...finalData } as WorkOrder,
    };
  } catch (error) {
    console.error("Error saving work order:", error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return { success: false, message: `Error al guardar la orden: ${errorMessage}` };
  }
}

export async function deleteWorkOrder(id: string, user: User): Promise<{ success: boolean; message: string }> {
     if (!user) {
         return { success: false, message: 'Acción no permitida.' };
     }
  
     try {
      const orderDocRef = doc(db, WORK_ORDERS_COLLECTION, id);
      const orderDoc = await getDoc(orderDocRef);
      if (!orderDoc.exists()) {
        return { success: false, message: 'Orden de trabajo no encontrada.' };
      }
     
      const orderOwnerId = orderDoc.data()?.ownerId;
      const canDelete = user.role === 'master' || orderOwnerId === user.id;

      if (!canDelete) {
          return { success: false, message: 'No tiene permiso para eliminar esta orden.' };
      }
  
      await deleteDoc(orderDocRef);
      
      revalidatePath('/work-orders');
      return { success: true, message: 'Orden de trabajo eliminada con éxito.' };
    } catch (error) {
      console.error("Error deleting work order:", error);
      return { success: false, message: 'Error al eliminar la orden de trabajo.' };
    }
}
