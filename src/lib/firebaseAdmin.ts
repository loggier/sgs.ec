// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Esta variable almacenará la instancia de la aplicación de Firebase para evitar reinicializaciones.
let app: App;

export async function initializeDb(): Promise<Firestore> {
  // Comprueba si la aplicación ya está inicializada. Si es así, devuelve la instancia de Firestore existente.
  if (getApps().length) {
    if (!app) {
      app = getApps()[0];
    }
    return getFirestore(app);
  }

  // Si la aplicación no está inicializada, la configura.
  try {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      throw new Error("FATAL: 'credentials.json' no se encontró en la raíz del proyecto.");
    }

    const serviceAccountString = fs.readFileSync(credentialsPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountString);

    app = initializeApp({
      credential: cert(serviceAccount),
    });

    console.log("Firebase Admin SDK inicializado correctamente.");
    return getFirestore(app);
  } catch (error) {
    console.error('ERROR FATAL: Fallo en la inicialización de Firebase Admin SDK.', error);
    // Lanzamos el error para detener la ejecución si la base de datos no se puede inicializar.
    throw new Error('No se pudo inicializar la base de datos de Firebase.');
  }
}
