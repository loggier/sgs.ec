import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

try {
  const firebaseCreds = process.env.FIREBASE_CREDS;
  if (!firebaseCreds) {
    throw new Error(
      'La variable de entorno FIREBASE_CREDS no está definida. Por favor, copia el contenido completo de tu archivo JSON de credenciales de Firebase en la variable FIREBASE_CREDS en tu archivo .env.local.'
    );
  }

  const serviceAccount = JSON.parse(firebaseCreds);

  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
} catch (e: any) {
  console.error('Error al inicializar Firebase Admin SDK:', e);
  // Lanzamos un error para que la aplicación no continúe con una instancia de 'db' no válida.
  throw new Error(`Fallo en la inicialización de Firebase: ${e.message}`);
}


export { db };
