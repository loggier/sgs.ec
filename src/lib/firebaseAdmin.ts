import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let db: Firestore;

try {
  const credentialsPath = path.resolve(process.cwd(), 'credentials.json');

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
        'Fallo en la inicialización de Firebase: credentials.json no encontrado.'
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

  if (!getApps().length) {
    const app: App = initializeApp({
      credential: cert(serviceAccount),
    });
    db = getFirestore(app);
    console.log("Firebase Admin SDK inicializado correctamente.");
  } else {
    db = getFirestore(getApps()[0]);
  }
} catch (error) {
  console.error("Error crítico al inicializar Firebase Admin SDK:", error);
  throw new Error("Fallo en la inicialización de Firebase. Revisa el archivo credentials.json y los logs del servidor.");
}

export { db };
