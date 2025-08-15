
'use server';

import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  writeBatch,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import type { MessageLog } from './log-schema';

const LOGS_COLLECTION = 'message_logs';

type CreateLogData = Omit<MessageLog, 'id' | 'sentAt'>;

export async function createMessageLog(data: CreateLogData) {
  try {
    const logCollectionRef = collection(db, LOGS_COLLECTION);
    // Always use a server-side timestamp for consistency and to avoid client-side format issues.
    await addDoc(logCollectionRef, {
      ...data,
      sentAt: Timestamp.now(), 
    });
  } catch (error) {
    console.error("Error creating message log:", error);
    // Log the error but don't throw, as the primary action (e.g., sending a message) might have succeeded.
  }
}

export async function getMessageLogs(): Promise<{ logs: MessageLog[] }> {
  try {
    const logsCollectionRef = collection(db, LOGS_COLLECTION);
    const q = query(logsCollectionRef); // Simplest possible query
    
    const logSnapshot = await getDocs(q);

    const logs = logSnapshot.docs.map(doc => {
        const data = doc.data();
        // Robustly convert different possible date formats to a JS Date object
        let sentAtDate: Date;
        if (data.sentAt instanceof Timestamp) {
            sentAtDate = data.sentAt.toDate();
        } else if (typeof data.sentAt === 'string') {
            sentAtDate = new Date(data.sentAt);
        } else if (data.sentAt && typeof data.sentAt === 'object' && data.sentAt.seconds) {
            sentAtDate = new Date(data.sentAt.seconds * 1000);
        } else {
            sentAtDate = new Date(); // Fallback
        }

        return { 
            id: doc.id,
            ...data,
            sentAt: sentAtDate 
        } as MessageLog;
    });
    
    // Sort manually in the backend to avoid complex indexed queries
    logs.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());

    return { logs };
  } catch (error) {
    console.error("Error getting message logs:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido en la base de datos.";
    // Throw the error so the calling component can catch it and display it.
    throw new Error(`Error al leer los logs de Firestore: ${errorMessage}`);
  }
}


export async function clearAllLogs(): Promise<{ success: boolean; message: string }> {
  try {
    const logsCollectionRef = collection(db, LOGS_COLLECTION);
    const snapshot = await getDocs(logsCollectionRef);

    if (snapshot.empty) {
        return { success: true, message: 'No hay logs para eliminar.' };
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    revalidatePath('/logs');
    
    return { success: true, message: `${snapshot.size} logs eliminados con éxito.` };
  } catch (error) {
    console.error("Error clearing logs:", error);
    return { success: false, message: 'Ocurrió un error al intentar limpiar los logs.' };
  }
}
