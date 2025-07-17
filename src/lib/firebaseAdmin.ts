// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let db: Firestore;

try {
  // Construye la ruta absoluta al archivo de credenciales
  const credentialsPath = path.join(process.cwd(), 'credentials.json');

  // Comprueba si el archivo existe antes de intentar leerlo
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      "FATAL: El archivo 'credentials.json' no se encontró en la raíz del proyecto. Por favor, crea este archivo."
    );
  }
  
  // Lee y analiza el archivo de credenciales
  const serviceAccountString = fs.readFileSync(credentialsPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountString);

  // Inicializa la app de Firebase solo si no ha sido inicializada antes
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  // Obtiene la instancia de Firestore
  db = getFirestore();

} catch (error) {
  console.error(
    'FATAL: La inicialización de Firebase Admin SDK ha fallado.',
    error
  );
  // Lanza un error para detener la aplicación si la base de datos no se puede inicializar.
  // Esto deja claro que hay un problema con la configuración.
  throw new Error('No se pudo inicializar Firebase Admin SDK.');
}

// Exporta la instancia de la base de datos ya inicializada
export { db };
