import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let db: Firestore;

function initializeDb(): Firestore {
  if (getApps().length) {
    return getFirestore(getApps()[0]);
  }

  const credentialsPath = path.resolve(process.cwd(), 'credentials.json');
  if (!fs.existsSync(credentialsPath)) {
    throw new Error('Fallo en la inicialización de Firebase: credentials.json no encontrado en la raíz del proyecto.');
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const app: App = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin SDK inicializado correctamente.");
    return getFirestore(app);
  } catch (error: any) {
    console.error("Error crítico al inicializar Firebase Admin SDK:", error.message);
    throw new Error(`Fallo al analizar credentials.json o al inicializar Firebase: ${error.message}`);
  }
}

export function getDb(): Firestore {
  if (!db) {
    db = initializeDb();
  }
  return db;
}
