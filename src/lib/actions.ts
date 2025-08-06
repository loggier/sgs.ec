
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
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { ClientSchema, type Client, type ClientDisplay } from './schema';
import type { User } from './user-schema';
import { getPgpsClients } from './pgps-actions';


// Helper function to convert Firestore Timestamps to a document
const convertTimestamps = (docData: any) => {
  const data = { ...docData };
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      data[key] = data[key].toDate();
    }
  }
  return data;
};

// Gets locally stored clients
export async function getClients(userId: string, userRole: User['role'], creatorId?: string): Promise<ClientDisplay[]> {
    if (!userId) return [];
  
    try {
      let clientsQuery;
      const clientsCollectionRef = collection(db, 'clients');
      
      // For analysts, they see the clients of their manager (creator).
      const ownerIdToFilter = userRole === 'analista' && creatorId ? creatorId : userId;
  
      if (userRole === 'master') {
        clientsQuery = query(clientsCollectionRef);
      } else {
        clientsQuery = query(clientsCollectionRef, where('ownerId', '==', ownerIdToFilter));
      }
      
      const clientSnapshot = await getDocs(clientsQuery);
  
      let clientsList: ClientDisplay[] = clientSnapshot.docs.map(doc => {
          const data = convertTimestamps(doc.data());
          return { id: doc.id, ...data } as ClientDisplay;
      });
  
      if (userRole === 'master') {
          const usersCollection = collection(db, 'users');
          const usersSnapshot = await getDocs(usersCollection);
          const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));
          
          clientsList = clientsList.map(client => ({
              ...client,
              ownerName: usersMap.get(client.ownerId!)?.nombre || 'Desconocido',
          }));
      }
  
      return clientsList;
    } catch (error) {
      console.error("Error getting clients:", error);
      return [];
    }
}
  
export async function getClientById(id: string, user: User): Promise<ClientDisplay | undefined> {
     if (!user) return undefined;
  
    try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);
      if (!clientDoc.exists()) {
        return undefined;
      }
  
      const data = convertTimestamps(clientDoc.data()) as Client;
      
      // Determine whose clients the current user is allowed to see.
      const allowedOwnerId = user.role === 'analista' && user.creatorId ? user.creatorId : user.id;

      // Master can see everything. Others can only see clients belonging to their allowed scope.
      if (user.role !== 'master' && data.ownerId !== allowedOwnerId) {
          return undefined;
      }
      
      let clientData: ClientDisplay = { id: clientDoc.id, ...data };
      
      if (user.role === 'master' && data.ownerId) {
          const ownerDocRef = doc(db, 'users', data.ownerId);
          const ownerDoc = await getDoc(ownerDocRef);
          if (ownerDoc.exists()) {
              clientData.ownerName = (ownerDoc.data() as User).nombre;
          }
      }
  
      return clientData;
    } catch (error)
    {
      console.error("Error getting client by ID:", error);
      return undefined;
    }
}

export async function saveClient(
    data: Omit<Client, 'id' | 'ownerId'>,
    user: User,
    clientId?: string
  ): Promise<{ success: boolean; message: string; client?: ClientDisplay; }> {
    if (!user) {
        return { success: false, message: 'No se pudo identificar al usuario.' };
    }
    
    if (!['master', 'manager', 'analista'].includes(user.role)) {
        return { success: false, message: 'No tiene permiso para guardar clientes.' };
    }

    // Correctly determine the owner of the client.
    // If the creator is an analyst, the owner is their manager (creatorId).
    const ownerId = user.role === 'analista' ? user.creatorId : user.id;
    if (!ownerId) {
         return { success: false, message: 'No se pudo determinar el propietario del cliente.' };
    }

    const dataWithOwner = { ...data, ownerId: ownerId };
    const validation = ClientSchema.omit({ id: true }).safeParse(dataWithOwner);
  
    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors);
      return { success: false, message: 'Datos proporcionados no válidos.' };
    }
  
    const { ...clientData } = validation.data;
  
    try {
        const dataToSave: { [key: string]: any } = { ...clientData };
        let pgpsLinkMessage = '';

        const apiEmail = clientData.usuario ? clientData.usuario.trim().toLowerCase() : '';
        
        if (apiEmail) {
            const q = query(collection(db, 'clients'), where("usuario", "==", apiEmail), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== clientId) {
                return { success: false, message: 'El Usuario (API) ya está en uso por otro cliente.' };
            }
            
            const { clients: pgpsClients, error: pgpsError } = await getPgpsClients();
            if (pgpsError) {
              return { success: false, message: `No se pudo guardar: ${pgpsError}`};
            }
            
            const matchedPgpsClient = pgpsClients.find(wc => wc.correo?.trim().toLowerCase() === apiEmail);
            if (matchedPgpsClient) {
              dataToSave.pgpsId = matchedPgpsClient.id!.replace('pgps-', '');
              pgpsLinkMessage = 'Cliente vinculado a P. GPS exitosamente.';
            } else {
              dataToSave.pgpsId = null;
              pgpsLinkMessage = 'No se encontró un cliente coincidente en P. GPS para vincular.';
            }
        } else {
            dataToSave.pgpsId = null;
        }

        Object.keys(dataToSave).forEach(key => {
            const K = key as keyof typeof dataToSave;
            if (dataToSave[K] === null || dataToSave[K] === undefined || dataToSave[K] === '') {
                delete dataToSave[K];
            }
        });
      
        let savedClientId = clientId;
        if (clientId) {
            const clientDocRef = doc(db, 'clients', clientId);
            const currentClientDoc = await getDoc(clientDocRef);
            if (!currentClientDoc.exists()) {
                return { success: false, message: 'Cliente no encontrado.' };
            }
            
            const currentOwnerId = currentClientDoc.data()?.ownerId;
            const allowedOwnerId = user.role === 'analista' ? user.creatorId : user.id;

            const canEdit = user.role === 'master' || currentOwnerId === allowedOwnerId;

            if (!canEdit) {
                return { success: false, message: 'No tiene permiso para editar este cliente.' };
            }
            await updateDoc(clientDocRef, dataToSave);
        } else {
            const clientsCollection = collection(db, 'clients');
            const newClientRef = await addDoc(clientsCollection, dataToSave);
            savedClientId = newClientRef.id;
        }
  
      revalidatePath('/clients');
      const savedClient = await getClientById(savedClientId!, user);
      const baseMessage = `Cliente ${clientId ? 'actualizado' : 'creado'} con éxito.`;
      return {
        success: true,
        message: `${baseMessage} ${pgpsLinkMessage}`,
        client: savedClient,
      };
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      return { success: false, message: `Error al guardar el cliente: ${errorMessage}` };
    }
}
  
export async function deleteClient(id: string, user: User): Promise<{ success: boolean; message: string }> {
     if (!user) {
         return { success: false, message: 'Acción no permitida.' };
     }
  
     try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);
      if (!clientDoc.exists()) {
        return { success: false, message: 'Cliente no encontrado.' };
      }
     
      const clientOwnerId = clientDoc.data()?.ownerId;
      const allowedOwnerId = user.role === 'analista' ? user.creatorId : user.id;
      const canDelete = user.role === 'master' || clientOwnerId === allowedOwnerId;

      if (!canDelete) {
          return { success: false, message: 'No tiene permiso para eliminar este cliente.' };
      }
  
      const unitsCollectionRef = collection(db, 'clients', id, 'units');
      const unitsSnapshot = await getDocs(unitsCollectionRef);
      const deletePromises = unitsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
  
      await deleteDoc(doc(db, 'clients', id));
      
      revalidatePath('/clients');
      revalidatePath(`/clients/${id}/units`);
      return { success: true, message: 'Cliente y todas sus unidades eliminados con éxito.' };
    } catch (error) {
      console.error("Error deleting client:", error);
      return { success: false, message: 'Error al eliminar el cliente.' };
    }
}

export async function deleteClientById(id: string, userId: string, userRole: string): Promise<{ success: boolean; message: string }> {
  if (!userId || !userRole) {
      return { success: false, message: 'Acción no permitida. Usuario no autenticado.' };
  }

  try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);

      if (!clientDoc.exists()) {
          return { success: false, message: 'Cliente no encontrado.' };
      }
      
      const clientData = clientDoc.data();
      
      // Permission check: only master or the owner can delete.
      if (userRole !== 'master' && clientData.ownerId !== userId) {
          return { success: false, message: 'No tiene permiso para eliminar este cliente.' };
      }

      // Delete all subcollections (units and their payments) first
      const unitsCollectionRef = collection(db, 'clients', id, 'units');
      const unitsSnapshot = await getDocs(unitsCollectionRef);
      const batch = writeBatch(db);

      for (const unitDoc of unitsSnapshot.docs) {
          const paymentsCollectionRef = collection(unitDoc.ref, 'payments');
          const paymentsSnapshot = await getDocs(paymentsCollectionRef);
          paymentsSnapshot.forEach(paymentDoc => batch.delete(paymentDoc.ref));
          batch.delete(unitDoc.ref);
      }
      
      // Delete the client itself
      batch.delete(clientDocRef);

      await batch.commit();

      revalidatePath('/clients');
      revalidatePath(`/clients/${id}/units`);
      return { success: true, message: 'Cliente y todos sus datos asociados eliminados con éxito.' };
  } catch (error) {
      console.error("Error deleting client by ID:", error);
      return { success: false, message: 'Error al eliminar el cliente.' };
  }
}

    