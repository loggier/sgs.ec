// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let db: Firestore;

if (!getApps().length) {
  try {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(
        "FATAL: El archivo 'credentials.json' no se encontró en la raíz del proyecto."
      );
    }
    
    const serviceAccountString = fs.readFileSync(credentialsPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountString);

    initializeApp({
      credential: cert(serviceAccount),
    });
    
  } catch (error: any) {
    console.error(
      'FATAL: La inicialización de Firebase Admin SDK ha fallado.',
      error
    );
    throw new Error(`No se pudo inicializar Firebase Admin SDK. Causa: ${error.message}`);
  }
}

db = getFirestore();

export { db };
