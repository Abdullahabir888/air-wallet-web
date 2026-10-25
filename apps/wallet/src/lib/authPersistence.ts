import { browserLocalPersistence, indexedDBLocalPersistence, type Persistence } from 'firebase/auth';

/** Web: keep the session in IndexedDB, fall back to localStorage. */
export function authPersistence(): Persistence[] {
  return [indexedDBLocalPersistence, browserLocalPersistence];
}
