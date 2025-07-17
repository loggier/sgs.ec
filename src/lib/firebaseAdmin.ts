import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// This is a robust way to ensure a single instance of Firestore is created and used.
// It handles initialization in a way that's compatible with Next.js server environments.

let db: Firestore;

if (!getApps().length) {
  try {
    const credentialsPath = path.resolve(process.cwd(), 'credentials.json');

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(
        'El archivo credentials.json no se encontró en la raíz del proyecto. ' +
        'Por favor, asegúrate de que el archivo existe y contiene tus credenciales de la cuenta de servicio de Firebase.'
      );
    }

    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    initializeApp({
      credential: cert(serviceAccount),
    });

  } catch (error) {
    console.error("Error crítico al inicializar Firebase Admin SDK:", error);
    // This will stop the application from running if Firebase can't be initialized,
    // which is better than failing silently later.
    throw new Error("Fallo en la inicialización de Firebase. Revisa el archivo credentials.json y los logs del servidor.");
  }
}

db = getFirestore();

export { db };
