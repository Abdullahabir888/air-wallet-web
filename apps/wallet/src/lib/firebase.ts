import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { authPersistence } from './authPersistence';
import { startAppCheck } from './appCheck';

/**
 * Single Firebase client for web, Android and iOS (Firebase JS SDK).
 * Auth persistence: IndexedDB on web, AsyncStorage on native (see authPersistence*.ts).
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-air-wallet.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-air-wallet',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-air-wallet.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '0',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:0:web:0',
};

const firstInit = getApps().length === 0;
export const app = firstInit ? initializeApp(config) : getApp();

export const auth: Auth = initializeAuth(app, { persistence: authPersistence() });
export const db = getFirestore(app);
export const functions = getFunctions(app, process.env.EXPO_PUBLIC_FUNCTIONS_REGION || 'asia-south1');
export const storage = getStorage(app);

export const usingEmulators = process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';

if (firstInit) {
  if (usingEmulators) {
    const host = process.env.EXPO_PUBLIC_EMULATOR_HOST || '127.0.0.1';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
    connectStorageEmulator(storage, host, 9199);
  } else {
    startAppCheck(app);
  }
}
