import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.local' });

let db: Firestore;

function initializeDb(): Firestore {
  if (getApps().length > 0) {
    return getFirestore(getApps()[0]);
  }

  const firebaseCreds = process.env.FIREBASE_CREDS;
  if (!firebaseCreds) {
    throw new Error(
      'La variable de entorno FIREBASE_CREDS no está definida. Por favor, copia el contenido completo de tu archivo JSON de credenciales de Firebase en la variable FIREBASE_CREDS en tu archivo .env.local.'
    );
  }

  try {
    const serviceAccount = JSON.parse(firebaseCreds);
    const app = initializeApp({
      credential: cert(serviceAccount),
    });
    return getFirestore(app);
  } catch (e: any) {
    console.error('Error al inicializar Firebase Admin SDK:', e);
    throw new Error(`Fallo en la inicialización de Firebase: ${e.message}`);
  }
}

export function getDb(): Firestore {
  if (!db) {
    db = initializeDb();
  }
  return db;
}
