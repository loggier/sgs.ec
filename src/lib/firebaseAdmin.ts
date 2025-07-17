import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let db: Firestore;

export function getDb(): Firestore {
  if (db) {
    return db;
  }

  if (!getApps().length) {
    try {
      const credentialsPath = path.resolve(process.cwd(), 'credentials.json');
      
      if (!fs.existsSync(credentialsPath)) {
        throw new Error(
          'El archivo credentials.json no se encontró en la raíz del proyecto. ' +
          'Por favor, crea este archivo y pega el contenido de tu archivo de credenciales de la cuenta de servicio de Firebase.'
        );
      }
      
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error("Error al inicializar Firebase Admin SDK:", error);
      throw new Error("Fallo en la inicialización de Firebase. Revisa el archivo credentials.json y los logs del servidor.");
    }
  }

  db = getFirestore();
  return db;
}
