import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let db: Firestore;

export function getDb(): Firestore {
  if (db) {
    return db;
  }

  const firebaseCreds = process.env.FIREBASE_CREDS;
  if (!firebaseCreds) {
    throw new Error(
      'La variable de entorno FIREBASE_CREDS no está definida. Asegúrate de que tu archivo .env.local esté en la raíz del proyecto y que el servidor se haya reiniciado.'
    );
  }

  let serviceAccount;
  try {
     serviceAccount = JSON.parse(firebaseCreds);
  } catch (e) {
    throw new Error('No se pudo analizar FIREBASE_CREDS. Asegúrate de que sea un JSON válido.');
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  db = getFirestore();
  return db;
}
