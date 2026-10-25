import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

/** Web App Check with reCAPTCHA Enterprise. Skipped when no site key is configured. */
export function startAppCheck(app: FirebaseApp) {
  const key = process.env.EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY;
  if (!key) return;
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(key), isTokenAutoRefreshEnabled: true });
}
