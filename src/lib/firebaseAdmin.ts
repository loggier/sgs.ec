// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let db: Firestore;

if (!getApps().length) {
  try {
    // Construye la ruta al archivo credentials.json en la raíz del proyecto
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    // Comprueba si el archivo existe antes de intentar leerlo
    if (!fs.existsSync(credentialsPath)) {
        throw new Error("El archivo 'credentials.json' no se encontró en la raíz del proyecto. Por favor, asegúrate de que el archivo existe y está en el lugar correcto.");
    }

    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e: any) {
    console.error('Error al inicializar Firebase Admin SDK:', e);
    // Lanza un error más descriptivo para facilitar la depuración
    throw new Error(`Fallo en la inicialización de Firebase. Revisa el error anterior y asegúrate de que 'credentials.json' es un archivo JSON válido. Error original: ${e.message}`);
  }
}

db = getFirestore(getApps()[0]);

export { db };
