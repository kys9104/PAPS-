import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, Auth, signInAnonymously } from 'firebase/auth';
import appletConfig from '../../firebase-applet-config.json';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

// 1. Initialize Firebase App and Firestore with provisioned project
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(appletConfig);
export const db: Firestore = getFirestore(app, appletConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth: Auth = getAuth(app);

// Attempt anonymous sign-in in background
signInAnonymously(auth).catch(() => {
  // Silent fallback if anonymous auth provider is not configured
});

// 2. Validate Connection to Firestore on startup as required by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

// Auto-run connection test
testFirestoreConnection().catch((err) => {
  console.warn('Initial Firestore connection test notice:', err);
});

export function getStoredFirebaseConfig(): FirebaseCustomConfig | null {
  try {
    const saved = localStorage.getItem('shinan_marine_firebase_config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to parse local firebase config', e);
  }

  // Return applet config if available
  if (appletConfig && appletConfig.apiKey && appletConfig.projectId) {
    return {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain || `${appletConfig.projectId}.firebaseapp.com`,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket || `${appletConfig.projectId}.appspot.com`,
      messagingSenderId: appletConfig.messagingSenderId || '',
      appId: appletConfig.appId || '',
      firestoreDatabaseId: appletConfig.firestoreDatabaseId || '(default)'
    };
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseCustomConfig | null): void {
  if (!config) {
    localStorage.removeItem('shinan_marine_firebase_config');
  } else {
    localStorage.setItem('shinan_marine_firebase_config', JSON.stringify(config));
  }
}

export function getFirebaseFirestore(): Firestore | null {
  return db;
}
