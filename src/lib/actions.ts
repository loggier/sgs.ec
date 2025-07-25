
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
  Timestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { ClientSchema, type Client, type ClientWithOwner } from './schema';
import type { User } from './user-schema';

// Helper function to convert Firestore Timestamps to Dates in a document
const convertTimestamps = (docData: any) => {
  const data = { ...docData };
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      data[key] = data[key].toDate();
    }
  }
  return data;
};

export async function getClients(currentUserId: string, currentUserRole: User['role']): Promise<ClientWithOwner[]> {
    if (!currentUserId) return [];
  
    try {
      let clientsQuery;
      const clientsCollectionRef = collection(db, 'clients');
  
      if (currentUserRole === 'master') {
        // Master users see all clients
        clientsQuery = query(clientsCollectionRef);
      } else {
        // Other users only see their own clients
        clientsQuery = query(clientsCollectionRef, where('ownerId', '==', currentUserId));
      }
      
      const clientSnapshot = await getDocs(clientsQuery);
  
      let clientsList: ClientWithOwner[] = clientSnapshot.docs.map(doc => {
          const data = convertTimestamps(doc.data());
          return { id: doc.id, ...data } as ClientWithOwner;
      });
  
      // For master users, fetch and attach the owner's name for display
      if (currentUserRole === 'master') {
          const usersCollection = collection(db, 'users');
          const usersSnapshot = await getDocs(usersCollection);
          const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));
          
          clientsList = clientsList.map(client => ({
              ...client,
              ownerName: usersMap.get(client.ownerId)?.nombre || 'Desconocido',
          }));
      }
  
      return clientsList;
    } catch (error) {
      console.error("Error getting clients:", error);
      return [];
    }
}
  
export async function getClientById(id: string, currentUserId: string, currentUserRole: User['role']): Promise<ClientWithOwner | undefined> {
     if (!currentUserId) return undefined;
  
    try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);
      if (!clientDoc.exists()) {
        return undefined;
      }
  
      const data = convertTimestamps(clientDoc.data()) as Client;
      
      // Security check: non-master users can only access their own clients
      if (currentUserRole !== 'master' && data.ownerId !== currentUserId) {
          return undefined;
      }
      
      let clientData: ClientWithOwner = { id: clientDoc.id, ...data };
      
      // For master users, show owner name
      if (currentUserRole === 'master' && data.ownerId) {
          const ownerDocRef = doc(db, 'users', data.ownerId);
          const ownerDoc = await getDoc(ownerDocRef);
          if (ownerDoc.exists()) {
              clientData.ownerName = (ownerDoc.data() as User).nombre;
          }
      }
  
      return clientData;
    } catch (error) {
      console.error("Error getting client by ID:", error);
      return undefined;
    }
}

export async function saveClient(
    data: Omit<Client, 'id'>,
    ownerId: string, // ownerId is now passed explicitly
    clientId?: string
  ): Promise<{ success: boolean; message: string; client?: ClientWithOwner; }> {
    if (!ownerId) {
        return { success: false, message: 'No se pudo identificar al propietario.' };
    }

    const userDoc = await getDoc(doc(db, 'users', ownerId));
    if (!userDoc.exists() || !['master', 'manager'].includes(userDoc.data()?.role)) {
        return { success: false, message: 'No tiene permiso para guardar clientes.' };
    }
  
    const dataWithOwner = { ...data, ownerId: ownerId };
    const validation = ClientSchema.omit({ id: true }).safeParse(dataWithOwner);
  
    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors);
      return { success: false, message: 'Datos proporcionados no válidos.' };
    }
  
    const { ...clientData } = validation.data;
  
    try {
      let savedClientId = clientId;
      const dataToSave: { [key: string]: any } = { ...clientData };
      Object.keys(dataToSave).forEach(key => {
          const K = key as keyof typeof dataToSave;
          if (dataToSave[K] === null || dataToSave[K] === undefined || dataToSave[K] === '') {
              delete dataToSave[K];
          }
      });
      
      if (clientId) {
        const clientDocRef = doc(db, 'clients', clientId);
        const currentClientDoc = await getDoc(clientDocRef);
        if (!currentClientDoc.exists()) {
            return { success: false, message: 'Cliente no encontrado.' };
        }
        if (userDoc.data()?.role !== 'master' && currentClientDoc.data()?.ownerId !== ownerId) {
            return { success: false, message: 'No tiene permiso para editar este cliente.' };
        }
        await updateDoc(clientDocRef, dataToSave);
      } else {
        const clientsCollection = collection(db, 'clients');
        const newClientRef = await addDoc(clientsCollection, dataToSave);
        savedClientId = newClientRef.id;
      }
  
      revalidatePath('/');
      const savedClient = await getClientById(savedClientId!, ownerId, userDoc.data()?.role);
      return {
        success: true,
        message: `Cliente ${clientId ? 'actualizado' : 'creado'} con éxito.`,
        client: savedClient,
      };
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
      return { success: false, message: `Error al guardar el cliente: ${errorMessage}` };
    }
}
  
export async function deleteClient(id: string, currentUserId: string, currentUserRole: User['role']): Promise<{ success: boolean; message: string }> {
     if (!currentUserId) {
         return { success: false, message: 'Acción no permitida.' };
     }
  
     try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);
      if (!clientDoc.exists()) {
        return { success: false, message: 'Cliente no encontrado.' };
      }
     
      if (currentUserRole !== 'master' && clientDoc.data()?.ownerId !== currentUserId) {
          return { success: false, message: 'No tiene permiso para eliminar este cliente.' };
      }
  
      const unitsCollectionRef = collection(db, 'clients', id, 'units');
      const unitsSnapshot = await getDocs(unitsCollectionRef);
      const deletePromises = unitsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
  
      await deleteDoc(doc(db, 'clients', id));
      
      revalidatePath('/');
      revalidatePath(`/clients/${id}/units`);
      return { success: true, message: 'Cliente y todas sus unidades eliminados con éxito.' };
    } catch (error) {
      console.error("Error deleting client:", error);
      return { success: false, message: 'Error al eliminar el cliente.' };
    }
}
