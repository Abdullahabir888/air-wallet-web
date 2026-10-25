import type { ExpoConfig } from 'expo/config';

/**
 * One config for every environment. Values come from EXPO_PUBLIC_* env vars
 * (.env locally, Vercel/EAS environment variables in CI). Firebase web config is public by design;
 * security comes from Auth + Firestore rules + App Check, not from hiding these values.
 */
const env = process.env.APP_ENV ?? 'development';
const isProd = env === 'production';

// Reversed iOS client ID from Google Cloud / GoogleService-Info.plist, e.g. com.googleusercontent.apps.1234-abcd
const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;

const config: ExpoConfig = {
  name: isProd ? 'Air Wallet' : 'Air Wallet (Dev)',
  slug: 'air-wallet',
  scheme: 'airwallet',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: isProd ? 'com.airwallet.app' : 'com.airwallet.app.dev',
    supportsTablet: true,
    config: { usesNonExemptEncryption: false },
    usesAppleSignIn: true, // adds the Sign in with Apple capability / entitlement
  },
  android: {
    package: isProd ? 'com.airwallet.app' : 'com.airwallet.app.dev',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#FFFFFF' },
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
    name: 'Air Wallet',
    themeColor: '#2563EB',
  },
  plugins: [
    'expo-router',
    'expo-apple-authentication',
    // Native Google Sign-In. Needs the reversed iOS client ID as a URL scheme; skipped if not set
    // (web Google sign-in and Android still work without it).
    ...(googleIosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }] as [string, object]] : []),
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        backgroundColor: '#FFFFFF',
        dark: { image: './assets/splash-icon.png', backgroundColor: '#0A1020' },
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    appEnv: env,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
