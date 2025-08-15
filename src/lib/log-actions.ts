
'use server';

import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  writeBatch,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import type { MessageLog } from './log-schema';

const LOGS_COLLECTION = 'message_logs';
const LOGS_PER_PAGE = 25;

// This type now includes the status and optional error message.
type CreateLogData = Omit<MessageLog, 'id' | 'sentAt'>;

const convertTimestamps = (docData: any) => {
  const data: { [key: string]: any } = {};
  for (const key in docData) {
    if (Object.prototype.hasOwnProperty.call(docData, key) && docData[key] instanceof Timestamp) {
      data[key] = docData[key].toDate(); // Convert to JS Date object
    } else {
      data[key] = docData[key];
    }
  }
  return data;
};

// The function now accepts the full data object to be logged.
export async function createMessageLog(data: CreateLogData) {
  try {
    const logCollectionRef = collection(db, LOGS_COLLECTION);
    await addDoc(logCollectionRef, {
      ...data,
      sentAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error creating message log:", error);
    // We don't throw here to avoid interrupting the user flow
  }
}

export async function getMessageLogs(lastVisible?: any): Promise<{ logs: MessageLog[], hasMore: boolean, lastDoc: any | null }> {
  try {
    const logsCollectionRef = collection(db, LOGS_COLLECTION);
    
    let q;
    if (lastVisible) {
        q = query(logsCollectionRef, orderBy('sentAt', 'desc'), startAfter(lastVisible), limit(LOGS_PER_PAGE));
    } else {
        q = query(logsCollectionRef, orderBy('sentAt', 'desc'), limit(LOGS_PER_PAGE));
    }

    const logSnapshot = await getDocs(q);

    const logs = logSnapshot.docs.map(doc => {
        const data = convertTimestamps(doc.data());
        return { id: doc.id, ...data } as MessageLog;
    });

    const hasMore = logs.length === LOGS_PER_PAGE;
    const lastDoc = logSnapshot.docs.length > 0 ? logSnapshot.docs[logSnapshot.docs.length - 1] : null;

    return { logs, hasMore, lastDoc };
  } catch (error) {
    console.error("Error getting message logs:", error);
    return { logs: [], hasMore: false, lastDoc: null };
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
