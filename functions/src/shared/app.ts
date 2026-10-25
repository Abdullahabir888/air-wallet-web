import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { setGlobalOptions } from 'firebase-functions/v2';

if (!getApps().length) initializeApp();

// asia-south1 (Mumbai) is the closest Firebase region to Bangladesh.
export const REGION = process.env.FUNCTIONS_REGION || 'asia-south1';
setGlobalOptions({ region: REGION, maxInstances: 20 });

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
export const auth = getAuth();
export { FieldValue, Timestamp };

/**
 * App Check: the web build attests with reCAPTCHA Enterprise. Native builds need
 * @react-native-firebase/app-check (see docs/DEPLOYMENT.md) before you turn this on,
 * otherwise mobile calls will be rejected.
 */
export const ENFORCE_APP_CHECK = process.env.APP_CHECK_ENFORCE === 'true';

export const callableOpts = { enforceAppCheck: ENFORCE_APP_CHECK, cors: true } as const;
