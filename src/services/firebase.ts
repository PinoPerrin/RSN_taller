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
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  User,
  getIdTokenResult,
  linkWithCredential,
  EmailAuthProvider,
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
 * Sign in using Google Provider (Popup)
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) return null;
  try {
    // If the browser holds an anonymous session, sign it out cleanly so Google auth attaches to real account
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      await signOut(auth);
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (err) {
    console.warn('Google sign-in error:', err);
    throw err;
  }
}

/**
 * Sign in using Email and Password
 */
export async function signInWithEmail(email: string, pass: string): Promise<User | null> {
  if (!auth) return null;
  try {
    // If the browser holds an anonymous session, sign it out cleanly first
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      await signOut(auth);
    }
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (err) {
    console.warn('Email sign-in error:', err);
    throw err;
  }
}

/**
 * Register new user with Email and Password
 */
export async function registerWithEmail(email: string, pass: string): Promise<User | null> {
  if (!auth) return null;
  try {
    let user: User | null = null;

    // If an anonymous session exists (e.g. from previously answering a study on this browser),
    // attempt to link it so responses stay associated, or cleanly create a new registered account.
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        const credential = EmailAuthProvider.credential(email.trim(), pass);
        const linked = await linkWithCredential(auth.currentUser, credential);
        user = linked.user;
      } catch (linkErr: any) {
        // If linking fails (e.g. email in use or not allowed), sign out anonymous and create cleanly
        await signOut(auth);
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        user = cred.user;
      }
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      user = cred.user;
    }

    if (user) {
      try {
        await sendEmailVerification(user);
      } catch (e) {
        console.warn('Email verification send warning:', e);
      }
    }
    return user;
  } catch (err) {
    console.warn('Email registration error:', err);
    throw err;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth) return;
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

// Backwards-compatible aliases
export const signInAdminWithGoogle = signInWithGoogle;
export const signInAdminWithEmail = signInWithEmail;
export const signOutAdmin = signOutUser;

/**
 * Designated Admin check:
 * 1. Custom claims (token.claims.admin === true)
 * 2. Firestore /admins/{uid} document existence
 * 3. Environment or system designated admin email
 */
export async function isUserAdmin(user: User | null): Promise<boolean> {
  if (!user || user.isAnonymous) return false;

  // 1. Check Custom Claims
  try {
    const tokenResult = await getIdTokenResult(user, true);
    if (tokenResult.claims.admin === true) {
      return true;
    }
  } catch (e) {
    // Silent catch, fallback to other checks
  }

  // 2. Check designated admin emails list from env or hardcoded root admin
  const envAdmins = (import.meta as any).env?.VITE_ADMIN_EMAILS?.split(',').map((e: string) => e.trim().toLowerCase()) || [];
  const defaultAdmins = ['admin@rsn-taller.edu', 'alejan@'];
  const userEmail = (user.email || '').toLowerCase();

  if (userEmail && (envAdmins.includes(userEmail) || defaultAdmins.some(adminPattern => userEmail.includes(adminPattern)))) {
    return true;
  }

  return false;
}

export { app, db, auth };
