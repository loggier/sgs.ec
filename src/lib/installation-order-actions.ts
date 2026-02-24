

'use server';

import { revalidatePath } from 'next/cache';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { InstallationOrderFormSchema, type InstallationOrder, type InstallationOrderFormInput } from './installation-order-schema';
import type { User } from './user-schema';
import { getNotificationUrlForUser } from './settings-actions';
import { sendNotificationMessage } from './notification-actions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const INSTALLATION_ORDERS_COLLECTION = 'installation_orders';

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


export async function getInstallationOrders(currentUser: User): Promise<InstallationOrder[]> {
  try {
    if (!currentUser) {
      return [];
    }

    const ordersCollectionRef = collection(db, INSTALLATION_ORDERS_COLLECTION);
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
      const data = convertTimestamps(doc.data()) as Omit<InstallationOrder, 'id'>;
      const tecnico = data.tecnicoId ? techniciansMap.get(data.tecnicoId) : null;
      return {
        id: doc.id,
        ...data,
        tecnicoNombre: tecnico?.nombre || tecnico?.username,
      } as InstallationOrder;
    });

    return orders.sort((a, b) => new Date(b.fechaProgramada).getTime() - new Date(a.fechaProgramada).getTime());

  } catch (error) {
    console.error("Error getting installation orders:", error);
    return [];
  }
}

export async function getInstallationOrderById(orderId: string): Promise<InstallationOrder | null> {
    try {
        const orderDocRef = doc(db, INSTALLATION_ORDERS_COLLECTION, orderId);
        const docSnap = await getDoc(orderDocRef);
        if (!docSnap.exists()) {
            return null;
        }

        const data = convertTimestamps(docSnap.data()) as Omit<InstallationOrder, 'id'>;
        const techniciansSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'tecnico')));
        const techniciansMap = new Map(techniciansSnapshot.docs.map(doc => [doc.id, doc.data() as User]));
        const tecnico = data.tecnicoId ? techniciansMap.get(data.tecnicoId) : null;

        return {
            id: docSnap.id,
            ...data,
            tecnicoNombre: tecnico?.nombre || tecnico?.username,
        } as InstallationOrder;

    } catch (error) {
        console.error("Error getting installation order by ID:", error);
        return null;
    }
}


export async function saveInstallationOrder(
  data: InstallationOrderFormInput,
  currentUser: User,
  orderId?: string
): Promise<{ success: boolean; message: string; order?: InstallationOrder }> {

    if (!currentUser || !['master', 'manager', 'tecnico'].includes(currentUser.role)) {
        return { success: false, message: 'No tiene permiso para realizar esta acción.' };
    }
  
    const validation = InstallationOrderFormSchema.safeParse(data);
    if (!validation.success) {
        console.error(validation.error.flatten().fieldErrors);
        return { success: false, message: 'Datos proporcionados no válidos.' };
    }
    
    const isEditingByTechnician = orderId && currentUser.role === 'tecnico';
    let dataToSave: any;
    let ownerIdForNotification: string;

    if (isEditingByTechnician) {
        // Technicians can only update a limited set of fields.
        const technicianUpdatableFields: { [key: string]: any } = {
            estado: validation.data.estado,
            observacion: validation.data.observacion,
        };
        
        if (validation.data.estado === 'terminado') {
            technicianUpdatableFields.metodoPago = validation.data.metodoPago;
            if (validation.data.metodoPago === 'efectivo') {
                technicianUpdatableFields.montoEfectivo = validation.data.montoEfectivo;
            } else {
                technicianUpdatableFields.montoEfectivo = null; // Clear if not cash
            }
            technicianUpdatableFields.corteDeMotor = validation.data.corteDeMotor;
            if (validation.data.corteDeMotor) {
              technicianUpdatableFields.lugarCorteMotor = validation.data.lugarCorteMotor;
            } else {
              technicianUpdatableFields.lugarCorteMotor = null;
            }

            technicianUpdatableFields.instalacionAccesorios = validation.data.instalacionAccesorios;
            technicianUpdatableFields.accesorioBotonPanico = validation.data.accesorioBotonPanico ?? false;
            technicianUpdatableFields.accesorioAperturaSeguro = validation.data.accesorioAperturaSeguro ?? false;
        }
        dataToSave = technicianUpdatableFields;
        const existingOrder = await getInstallationOrderById(orderId!);
        ownerIdForNotification = existingOrder?.ownerId || currentUser.id;
    } else {
        // Managers/Masters have full control when creating or editing.
        if (!['master', 'manager'].includes(currentUser.role)) {
            return { success: false, message: 'No tiene permiso para crear o editar esta orden.' };
        }
        ownerIdForNotification = currentUser.id;

        const dataFromValidation = { ...validation.data };
        if (dataFromValidation.metodoPago !== 'efectivo') {
            dataFromValidation.montoEfectivo = undefined;
        }

        dataToSave = { 
            ...dataFromValidation,
            ownerId: currentUser.id,
            fechaProgramada: Timestamp.fromDate(new Date(dataFromValidation.fechaProgramada)),
        };
    }
    
  try {
    const ordersCollection = collection(db, INSTALLATION_ORDERS_COLLECTION);
    let savedOrderId = orderId;
    let message = '';
    let notificationSent = false;
    let oldTecnicoId: string | undefined = undefined;

    if (orderId) {
      const orderDocRef = doc(db, INSTALLATION_ORDERS_COLLECTION, orderId);
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
      message = 'Orden de instalación actualizada con éxito.';
    } else {
      const newOrderRef = await addDoc(ordersCollection, dataToSave);
      savedOrderId = newOrderRef.id;
      message = 'Orden de instalación creada con éxito.';
    }

    // --- Send notification to technician ---
    if ('tecnicoId' in dataToSave && dataToSave.tecnicoId && dataToSave.tecnicoId !== oldTecnicoId) {
        const tecnicoDoc = await getDoc(doc(db, 'users', dataToSave.tecnicoId));
        if (tecnicoDoc.exists()) {
            const tecnico = tecnicoDoc.data() as User;
            const notificationSettings = await getNotificationUrlForUser(ownerIdForNotification);
            
            if (tecnico.telefono && notificationSettings?.notificationUrl) {
                const dateString = format(new Date(data.fechaProgramada), 'PPP', {locale: es});
                const timeString = format(new Date(`1970-01-01T${data.horaProgramada || '00:00'}`), 'p', { locale: es });
                const fullUrl = `https://sgi.gpsplataforma.net/installations/${savedOrderId}/edit`;
                const notifMessage = `*Nueva orden de instalación asignada:*\n- *Cliente:* ${data.nombreCliente}\n- *Número del cliente:* ${data.numeroCliente}\n- *Placa:* ${data.placaVehiculo}\n- *Ciudad:* ${data.ciudad}\n- *Fecha:* ${dateString} ${timeString}\n- *Plan a instalar:* ${data.tipoPlan}\n- *Tipo de vehículo:* ${data.tipoVehiculo}\n- *Ubicación:* ${data.ubicacionGoogleMaps || 'No especificada'}\n\n*Ver detalles aquí:*\n${fullUrl}`;
                
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

    revalidatePath('/installations');
    revalidatePath('/');

    const finalDoc = await getDoc(doc(db, INSTALLATION_ORDERS_COLLECTION, savedOrderId!));
    const finalData = convertTimestamps(finalDoc.data());

    return {
      success: true,
      message: message + (notificationSent ? ' Notificación enviada al técnico.' : ''),
      order: { id: savedOrderId!, ...finalData } as InstallationOrder,
    };
  } catch (error) {
    console.error("Error saving installation order:", error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return { success: false, message: `Error al guardar la orden: ${errorMessage}` };
  }
}

export async function deleteInstallationOrder(id: string, user: User): Promise<{ success: boolean; message: string }> {
     if (!user) {
         return { success: false, message: 'Acción no permitida.' };
     }
  
     try {
      const orderDocRef = doc(db, INSTALLATION_ORDERS_COLLECTION, id);
      const orderDoc = await getDoc(orderDocRef);
      if (!orderDoc.exists()) {
        return { success: false, message: 'Orden de instalación no encontrada.' };
      }
     
      const orderOwnerId = orderDoc.data()?.ownerId;
      const canDelete = user.role === 'master' || orderOwnerId === user.id;

      if (!canDelete) {
          return { success: false, message: 'No tiene permiso para eliminar esta orden.' };
      }
  
      await deleteDoc(orderDocRef);
      
      revalidatePath('/installations');
      return { success: true, message: 'Orden de instalación eliminada con éxito.' };
    } catch (error) {
      console.error("Error deleting installation order:", error);
      return { success: false, message: 'Error al eliminar la orden de instalación.' };
    }
}
