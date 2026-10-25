import type { FirebaseApp } from 'firebase/app';

/**
 * Native App Check (Play Integrity / App Attest) needs @react-native-firebase/app-check
 * in a development build. Until that is added, native requests are not attested — keep
 * APP_CHECK_ENFORCE=false on Functions. See docs/DEPLOYMENT.md → "App Check".
 */
export function startAppCheck(_app: FirebaseApp) {}
