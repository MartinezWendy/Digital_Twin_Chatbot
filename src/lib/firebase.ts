
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration is now managed in the .env file.
// See the .env file for instructions on where to find these values
// in your Firebase project settings.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let firestore: Firestore | null = null;

// Check that all environment variables are set and don't contain placeholders
const configIsComplete = !Object.values(firebaseConfig).some(
  (value) => !value || value.includes('your_')
);

if (configIsComplete) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  storage = getStorage(app);
  firestore = getFirestore(app);
} else {
  // In a development environment, log a detailed error to the console.
  // In production, this would fail silently to avoid exposing config details.
  if (process.env.NODE_ENV !== 'production') {
    console.error(
      'FIREBASE NOT INITIALIZED: One or more Firebase environment variables are missing or still contain placeholders. Please check your .env file.'
    );
  }
}

export { auth, storage, firestore };
export default app;
