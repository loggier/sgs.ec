import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Validate that all required environment variables are set
if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  throw new Error(
    'Firebase credentials are not set in the environment. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.'
  );
}

let db: ReturnType<typeof getFirestore>;

if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert(serviceAccount),
    });
    db = getFirestore();
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // You might want to throw the error or handle it gracefully
    throw new Error('Could not initialize Firebase Admin SDK.');
  }
} else {
  // If already initialized, get the existing instance
  db = getFirestore();
}

export { db };
