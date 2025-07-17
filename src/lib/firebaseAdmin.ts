import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let app: App;
let db: Firestore;

const credentialsPath = path.resolve(process.cwd(), 'credentials.json');

if (!getApps().length) {
  if (!fs.existsSync(credentialsPath)) {
    console.error(
      'El archivo credentials.json no se encontró en la raíz del proyecto. ' +
      'Por favor, asegúrate de que el archivo existe y contiene tus credenciales de la cuenta de servicio de Firebase.'
    );
    throw new Error(
        'Fallo en la inicialización de Firebase: credentials.json no encontrado.'
    );
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    db = getFirestore(app);
    console.log("Firebase Admin SDK inicializado correctamente.");
  } catch (error) {
    console.error("Error crítico al inicializar Firebase Admin SDK:", error);
    throw new Error("Fallo en la inicialización de Firebase. Revisa el archivo credentials.json y los logs del servidor.");
  }
} else {
  // If already initialized, get the default app
  app = getApps()[0];
  db = getFirestore(app);
}

export { db };
