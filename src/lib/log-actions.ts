
'use server';

import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  writeBatch,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
  where,
  Query,
  DocumentData,
  endBefore
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import type { MessageLog } from './log-schema';

const LOGS_COLLECTION = 'message_logs';
const LOGS_PAGE_SIZE = 20;

type CreateLogData = Omit<MessageLog, 'id' | 'sentAt'>;

export async function createMessageLog(data: CreateLogData) {
  try {
    const logCollectionRef = collection(db, LOGS_COLLECTION);
    const dataToSave = {
        ...data,
        sentAt: Timestamp.now(), // Always use a server timestamp
    };
    await addDoc(logCollectionRef, dataToSave);
  } catch (error) {
    console.error("Error creating message log:", error);
  }
}

export async function getMessageLogs(
  cursor: string | null,
  direction: 'next' | 'prev',
  startDate?: Date
): Promise<{ logs: MessageLog[], lastVisible: string | null, firstVisible: string | null, hasMore: boolean }> {
  try {
    const logsCollectionRef = collection(db, LOGS_COLLECTION);
    let q: Query<DocumentData>;
    let baseQuery: any[] = [];

    // Order by descending date for standard view
    baseQuery.push(orderBy('sentAt', 'desc'));

    // Add date filter if provided
    if (startDate) {
        baseQuery.push(where('sentAt', '>=', Timestamp.fromDate(startDate)));
    }
    
    // Limit the results per page
    baseQuery.push(limit(LOGS_PAGE_SIZE));

    // Handle pagination cursor
    if (cursor) {
      const cursorDoc = await getDoc(doc(db, LOGS_COLLECTION, cursor));
      if (cursorDoc.exists()) {
        baseQuery.push(startAfter(cursorDoc));
      }
    }
    
    q = query(logsCollectionRef, ...baseQuery);

    const logSnapshot = await getDocs(q);

    const logs = logSnapshot.docs.map(doc => {
        const data = doc.data();
        const sentAt = (data.sentAt as Timestamp).toDate().toISOString();
        return { 
            id: doc.id,
            ...data,
            sentAt,
        } as MessageLog;
    });

    const lastVisible = logSnapshot.docs.length > 0 ? logSnapshot.docs[logSnapshot.docs.length - 1].id : null;
    const firstVisible = logSnapshot.docs.length > 0 ? logSnapshot.docs[0].id : null;
    
    let hasMore = false;
    if (lastVisible) {
        const nextDocRef = doc(db, LOGS_COLLECTION, lastVisible);
        const nextDoc = await getDoc(nextDocRef);
        if (nextDoc.exists()) {
             const nextQuery = query(logsCollectionRef, orderBy('sentAt', 'desc'), limit(1), startAfter(nextDoc));
             const nextSnapshot = await getDocs(nextQuery);
             hasMore = !nextSnapshot.empty;
        }
    }

    return { logs, lastVisible, firstVisible, hasMore };
  } catch (error) {
    console.error("Error getting message logs:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido en la base de datos.";
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
