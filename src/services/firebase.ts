// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Standard environment variables for Firebase
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-rsn.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-rsn-project',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-rsn.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef',
};

export const isFirebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_API_KEY !== 'demo-api-key'
);

let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (isFirebaseConfigured) {
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (err) {
  console.warn('Firebase initialization in offline/demo mode:', err);
}

export { app, db, auth };
