
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
import { getLoginSession } from './auth';
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

export async function getClients(): Promise<ClientWithOwner[]> {
  const session = await getLoginSession();
  if (!session) return [];

  try {
    const clientsCollectionRef = collection(db, 'clients');
    let q;

    if (session.role === 'master') {
      q = query(clientsCollectionRef);
    } else {
      q = query(clientsCollectionRef, where('ownerId', '==', session.id));
    }
    
    const clientSnapshot = await getDocs(q);

    let clientsList: ClientWithOwner[] = clientSnapshot.docs.map(doc => {
        const data = convertTimestamps(doc.data());
        return { id: doc.id, ...data } as ClientWithOwner;
    });

    if (session.role === 'master') {
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

export async function getClientById(id: string): Promise<ClientWithOwner | undefined> {
   const session = await getLoginSession();
   if (!session) return undefined;

  try {
    const clientDocRef = doc(db, 'clients', id);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists()) {
      return undefined;
    }

    const data = convertTimestamps(clientDoc.data()) as Client;
    
    // Security check: ensure user owns the client or is a master user
    if (session.role !== 'master' && data.ownerId !== session.id) {
        console.warn(`Security violation: User ${session.id} attempted to access client ${id} owned by ${data.ownerId}`);
        return undefined;
    }

    let clientData: ClientWithOwner = { id: clientDoc.id, ...data };
    
    if (session.role === 'master') {
        if (data.ownerId) {
            const ownerDocRef = doc(db, 'users', data.ownerId);
            const ownerDoc = await getDoc(ownerDocRef);
            if (ownerDoc.exists()) {
                clientData.ownerName = (ownerDoc.data() as User).nombre;
            }
        }
    }

    return clientData;
  } catch (error) {
    console.error("Error getting client by ID:", error);
    return undefined;
  }
}

export async function saveClient(
  data: Omit<Client, 'id' | 'ownerId'>,
  id?: string
): Promise<{ success: boolean; message: string; client?: ClientWithOwner; }> {
  const session = await getLoginSession();
  if (!session) {
      return { success: false, message: 'No autenticado. Inicie sesión para continuar.' };
  }

  const dataWithOwner = { ...data, ownerId: session.id };
  const validation = ClientSchema.omit({ id: true }).safeParse(dataWithOwner);

  if (!validation.success) {
    console.error(validation.error.flatten().fieldErrors);
    return { success: false, message: 'Datos proporcionados no válidos.' };
  }

  const { ...clientData } = validation.data;

  try {
    let savedClientId = id;
    const dataToSave: { [key: string]: any } = { ...clientData };

    Object.keys(dataToSave).forEach(key => {
        const K = key as keyof typeof dataToSave;
        if (dataToSave[K] === null || dataToSave[K] === undefined || dataToSave[K] === '') {
            delete dataToSave[K];
        }
    });

    if (id) {
      const existingClientRef = doc(db, 'clients', id);
      const existingClientSnap = await getDoc(existingClientRef);
      if (!existingClientSnap.exists()) {
          return { success: false, message: 'Cliente no encontrado.' };
      }
      const existingClient = existingClientSnap.data();
      // Security check
      if (session.role !== 'master' && existingClient.ownerId !== session.id) {
        return { success: false, message: 'No tiene permiso para editar este cliente.' };
      }
      
      // Re-assign ownerId to prevent it from being changed on update
      dataToSave.ownerId = existingClient.ownerId;
      await updateDoc(existingClientRef, dataToSave);
    } else {
      const clientsCollection = collection(db, 'clients');
      const newClientRef = await addDoc(clientsCollection, dataToSave);
      savedClientId = newClientRef.id;
    }

    revalidatePath('/');
    const savedClient = await getClientById(savedClientId!);
    return {
      success: true,
      message: `Cliente ${id ? 'actualizado' : 'creado'} con éxito.`,
      client: savedClient,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message: `Error al guardar el cliente: ${errorMessage}` };
  }
}

export async function deleteClient(id: string): Promise<{ success: boolean; message: string }> {
   const session = await getLoginSession();
   if (!session) return { success: false, message: 'No autenticado.' };

   try {
    const clientDocRef = doc(db, 'clients', id);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists()) {
      return { success: false, message: 'Cliente no encontrado.' };
    }
    const existingClient = clientDoc.data();
    // Security check
    if (session.role !== 'master' && existingClient.ownerId !== session.id) {
        return { success: false, message: 'No tiene permiso para eliminar este cliente.' };
    }

    // Optional: Also delete subcollections like units if necessary
    const unitsCollectionRef = collection(db, 'clients', id, 'units');
    const unitsSnapshot = await getDocs(unitsCollectionRef);
    const deletePromises = unitsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Delete the client document itself
    await deleteDoc(doc(db, 'clients', id));
    
    revalidatePath('/');
    revalidatePath(`/clients/${id}/units`);
    return { success: true, message: 'Cliente y todas sus unidades eliminados con éxito.' };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { success: false, message: 'Error al eliminar el cliente.' };
  }
}
