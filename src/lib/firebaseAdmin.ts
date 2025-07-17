import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

let app: App;
let db: Firestore;

if (getApps().length === 0) {
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(
      'Las credenciales de Firebase no están configuradas correctamente en las variables de entorno. Por favor, revisa tu archivo .env.local y asegúrate de que las variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, y FIREBASE_PRIVATE_KEY estén presentes y sean correctas.'
    );
  }
  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  app = getApps()[0];
}

db = getFirestore(app);

export { db };
