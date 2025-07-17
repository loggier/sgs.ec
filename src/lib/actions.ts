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
} from 'firebase/firestore';
import { getDb } from './firebaseAdmin';
import { ClientSchema, type Client } from './schema';
import { assessCreditRisk, type AssessCreditRiskOutput } from '@/ai/flows/credit-risk-assessment';

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

export async function getClients(): Promise<Omit<Client, 'placaVehiculo'>[]> {
  const db = getDb();
  try {
    const clientsCollection = collection(db, 'clients');
    const clientSnapshot = await getDocs(clientsCollection);
    const clientsList = clientSnapshot.docs.map(doc => {
      const data = convertTimestamps(doc.data());
      return { id: doc.id, ...data } as Omit<Client, 'placaVehiculo'>;
    });
    return clientsList;
  } catch (error) {
    console.error("Error getting clients:", error);
    return [];
  }
}

export async function getClientById(id: string): Promise<Omit<Client, 'placaVehiculo'> | undefined> {
  const db = getDb();
  try {
    const clientDocRef = doc(db, 'clients', id);
    const clientDoc = await getDoc(clientDocRef);
    if (!clientDoc.exists()) {
      return undefined;
    }
    const data = convertTimestamps(clientDoc.data());
    return { id: clientDoc.id, ...data } as Omit<Client, 'placaVehiculo'>;
  } catch (error) {
    console.error("Error getting client by ID:", error);
    return undefined;
  }
}

export async function saveClient(
  data: Omit<Client, 'id'>,
  id?: string
): Promise<{ success: boolean; message: string; client?: Omit<Client, 'placaVehiculo'>; assessment?: AssessCreditRiskOutput }> {
  const db = getDb();
  const validation = ClientSchema.omit({ id: true }).safeParse(data);

  if (!validation.success) {
    return { success: false, message: 'Datos proporcionados no válidos.' };
  }

  const { ...clientData } = validation.data;
  let assessmentResult: AssessCreditRiskOutput | undefined;

  try {
    let savedClientId = id;
    if (id) {
      // Update existing client
      const clientDocRef = doc(db, 'clients', id);
      await updateDoc(clientDocRef, clientData);
    } else {
      // Create new client
      const clientsCollection = collection(db, 'clients');
      const newClientRef = await addDoc(clientsCollection, clientData);
      savedClientId = newClientRef.id;

      // Perform AI credit risk assessment for new clients
      assessmentResult = await assessCreditRisk({
        ...clientData,
        fecConcesion: clientData.fecConcesion.toISOString().split('T')[0],
        fecVencimiento: clientData.fecVencimiento.toISOString().split('T')[0],
      });
    }

    revalidatePath('/');
    const savedClient = await getClientById(savedClientId!);
    return {
      success: true,
      message: `Cliente ${id ? 'actualizado' : 'creado'} con éxito.`,
      client: savedClient,
      assessment: assessmentResult,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message: `Error al guardar el cliente: ${errorMessage}` };
  }
}

export async function deleteClient(id: string): Promise<{ success: boolean; message: string }> {
   const db = getDb();
   try {
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
