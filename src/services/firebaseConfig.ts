import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

let cachedDb: Firestore | null = null;
let cachedApp: FirebaseApp | null = null;

export function getStoredFirebaseConfig(): FirebaseCustomConfig | null {
  try {
    const saved = localStorage.getItem('shinan_marine_firebase_config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse local firebase config', e);
  }

  // Check Vite env
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env || {};
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || '',
      firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || '(default)'
    };
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseCustomConfig | null): void {
  if (!config) {
    localStorage.removeItem('shinan_marine_firebase_config');
    cachedDb = null;
    cachedApp = null;
  } else {
    localStorage.setItem('shinan_marine_firebase_config', JSON.stringify(config));
    cachedDb = null;
    cachedApp = null;
  }
}

export function getFirebaseFirestore(): Firestore | null {
  if (cachedDb) return cachedDb;

  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length === 0) {
      cachedApp = initializeApp(config);
    } else {
      cachedApp = getApps()[0];
    }
    cachedDb = getFirestore(cachedApp, config.firestoreDatabaseId || '(default)');
    return cachedDb;
  } catch (err) {
    console.error('Firebase Firestore init error:', err);
    return null;
  }
}
