// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let app: App;
let db: Firestore;

try {
  if (!getApps().length) {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(
        "FATAL: 'credentials.json' not found. Please create this file in the project root."
      );
    }
    const serviceAccountString = fs.readFileSync(credentialsPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountString);

    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
} catch (error) {
  console.error(
    'FATAL: Firebase Admin SDK initialization failed.',
    error
  );
  // We throw an error to stop the application if the database cannot be initialized.
  // This makes it clear that something is wrong with the configuration.
  throw new Error('Could not initialize Firebase Admin SDK.');
}

export { db };
