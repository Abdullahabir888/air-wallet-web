import * as firebaseAuth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Native: keep the session across app restarts with AsyncStorage.
 * getReactNativePersistence ships in Firebase's React Native build of firebase/auth,
 * but the default (web) type declarations don't list it — hence the narrow cast.
 */
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

export function authPersistence(): Persistence {
  return getReactNativePersistence(AsyncStorage);
}
