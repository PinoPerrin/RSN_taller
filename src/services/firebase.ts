// Firebase Modular Configuration and Initialization
// Official configuration for project: rsn-taller
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';

const env = (import.meta as any).env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBPNnSIyw8v-Cz36VWS3hmht4SZDhTJ0h0",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "rsn-taller.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "rsn-taller",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "rsn-taller.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "728253762049",
  appId: env.VITE_FIREBASE_APP_ID || "1:728253762049:web:df7bcc1db1b2b8e34e8e00",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-YNJY0DX6F6"
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'demo-api-key'
);

// Singleton instances
let app: FirebaseApp;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (isFirebaseConfigured) {
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (err) {
  console.warn('Firebase initialization in offline/fallback mode:', err);
  app = (getApps().length > 0 ? getApp() : null) as any;
}

// Optional Analytics initialized only in compatible browser environments
if (typeof window !== 'undefined' && isFirebaseConfigured) {
  import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
    isSupported().then(supported => {
      if (supported && app) {
        getAnalytics(app);
      }
    }).catch(() => {
      // Analytics blocked or unsupported, ignore gracefully
    });
  }).catch(() => {
    // Analytics module not loaded, ignore
  });
}

let lastAuthFailTime = 0;

/**
 * Ensures the participant has an active authenticated session.
 * Uses Firebase Anonymous Authentication so participants can submit responses
 * without entering an email or password, while fulfilling Firestore security rules.
 */
export async function ensureAnonymousAuth(): Promise<User | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;

  // Avoid repeated blocking network calls if auth already failed recently (e.g. offline / sandbox)
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (Date.now() - lastAuthFailTime < (isTest ? 10000 : 5000)) {
    return null;
  }

  const timeoutMs = isTest ? 300 : 2500;
  try {
    const cred = await Promise.race([
      signInAnonymously(auth),
      new Promise<never>((_, reject) => {
        const t = setTimeout(() => reject(new Error('Auth timeout')), timeoutMs);
        if (typeof t === 'object' && t !== null && 'unref' in t) (t as any).unref();
      }),
    ]);
    return cred.user;
  } catch (err) {
    lastAuthFailTime = Date.now();
    console.warn('Anonymous auth failed or offline fallback:', err);
    return null;
  }
}

/**
 * Admin authentication with Google Sign-In
 */
export async function signInAdminWithGoogle(): Promise<User | null> {
  if (!auth) return null;
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (err) {
    console.warn('Google sign-in error:', err);
    throw err;
  }
}

/**
 * Admin authentication with Email & Password
 */
export async function signInAdminWithEmail(email: string, pass: string): Promise<User | null> {
  if (!auth) return null;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (err) {
    console.warn('Email sign-in error:', err);
    throw err;
  }
}

/**
 * Admin sign out
 */
export async function signOutAdmin(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export { app, db, auth };
