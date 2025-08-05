
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
} from 'firebase/firestore';
import { db } from './firebase';
import { ClientSchema, type Client, type ClientDisplay } from './schema';
import type { User } from './user-schema';
import { getWoxClients } from './wox-actions';


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
export async function getClients(currentUserId: string, currentUserRole: User['role'], creatorId?: string): Promise<ClientDisplay[]> {
    if (!currentUserId) return [];
  
    try {
      let clientsQuery;
      const clientsCollectionRef = collection(db, 'clients');
      let ownerIdToFilter = currentUserId;

      // If the user is an analyst, they should see the clients of their manager
      if (currentUserRole === 'analista' && creatorId) {
          ownerIdToFilter = creatorId;
      }
  
      if (currentUserRole === 'master') {
        clientsQuery = query(clientsCollectionRef);
      } else {
        clientsQuery = query(clientsCollectionRef, where('ownerId', '==', ownerIdToFilter));
      }
      
      const clientSnapshot = await getDocs(clientsQuery);
  
      let clientsList: ClientDisplay[] = clientSnapshot.docs.map(doc => {
          const data = convertTimestamps(doc.data());
          return { id: doc.id, ...data } as ClientDisplay;
      });
  
      if (currentUserRole === 'master') {
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
  
export async function getClientById(id: string, currentUser: User): Promise<ClientDisplay | undefined> {
     if (!currentUser) return undefined;
  
    try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);
      if (!clientDoc.exists()) {
        return undefined;
      }
  
      const data = convertTimestamps(clientDoc.data()) as Client;
      
      let ownerIdToCheck = data.ownerId;
      if (currentUser.role === 'analista' && currentUser.creatorId) {
          if (ownerIdToCheck !== currentUser.creatorId) {
              return undefined;
          }
      } else if (currentUser.role !== 'master' && ownerIdToCheck !== currentUser.id) {
          return undefined;
      }
      
      let clientData: ClientDisplay = { id: clientDoc.id, ...data };
      
      if (currentUser.role === 'master' && data.ownerId) {
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
    data: Omit<Client, 'id'>,
    currentUser: User,
    clientId?: string
  ): Promise<{ success: boolean; message: string; client?: ClientDisplay; }> {
    if (!currentUser) {
        return { success: false, message: 'No se pudo identificar al usuario.' };
    }
    
    // Determine the owner of the client. For analysts, it's their creator.
    const ownerId = currentUser.role === 'analista' ? currentUser.creatorId : currentUser.id;
    if (!ownerId) {
         return { success: false, message: 'No se pudo determinar el propietario del cliente.' };
    }

    if (!['master', 'manager', 'analista'].includes(currentUser.role)) {
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
        const dataToSave: { [key: string]: any } = { ...clientData };
        let woxLinkMessage = '';

        // Check for unique 'usuario' (API email) and link to WOX
        const apiEmail = clientData.usuario ? clientData.usuario.trim().toLowerCase() : '';
        
        if (apiEmail) {
            const q = query(collection(db, 'clients'), where("usuario", "==", apiEmail), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== clientId) {
                return { success: false, message: 'El Usuario (API) ya está en uso por otro cliente.' };
            }
            
            const { clients: woxClients, error: woxError } = await getWoxClients();
            if (woxError) {
              return { success: false, message: `No se pudo guardar: ${woxError}`};
            }
            
            const matchedWoxClient = woxClients.find(wc => wc.correo?.trim().toLowerCase() === apiEmail);
            if (matchedWoxClient) {
              dataToSave.woxId = matchedWoxClient.id!.replace('wox-', '');
              woxLinkMessage = 'Cliente vinculado a WOX exitosamente.';
            } else {
              dataToSave.woxId = null;
              woxLinkMessage = 'No se encontró un cliente coincidente en WOX para vincular.';
            }
        } else {
            // If usuario is cleared, unlink from wox
            dataToSave.woxId = null;
        }

        // Clean up undefined/null/empty values before saving
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
            const canEdit = currentUser.role === 'master' || 
                            currentOwnerId === currentUser.id || 
                            (currentUser.role === 'analista' && currentOwnerId === currentUser.creatorId);

            if (!canEdit) {
                return { success: false, message: 'No tiene permiso para editar este cliente.' };
            }
            await updateDoc(clientDocRef, dataToSave);
        } else {
            const clientsCollection = collection(db, 'clients');
            const newClientRef = await addDoc(clientsCollection, dataToSave);
            savedClientId = newClientRef.id;
        }
  
      revalidatePath('/');
      const savedClient = await getClientById(savedClientId!, currentUser);
      const baseMessage = `Cliente ${clientId ? 'actualizado' : 'creado'} con éxito.`;
      return {
        success: true,
        message: `${baseMessage} ${woxLinkMessage}`,
        client: savedClient,
      };
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      return { success: false, message: `Error al guardar el cliente: ${errorMessage}` };
    }
}
  
export async function deleteClient(id: string, currentUser: User): Promise<{ success: boolean; message: string }> {
     if (!currentUser) {
         return { success: false, message: 'Acción no permitida.' };
     }
  
     try {
      const clientDocRef = doc(db, 'clients', id);
      const clientDoc = await getDoc(clientDocRef);
      if (!clientDoc.exists()) {
        return { success: false, message: 'Cliente no encontrado.' };
      }
     
      const clientOwnerId = clientDoc.data()?.ownerId;
      const canDelete = currentUser.role === 'master' || 
                        clientOwnerId === currentUser.id ||
                        (currentUser.role === 'analista' && clientOwnerId === currentUser.creatorId);

      if (!canDelete) {
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
