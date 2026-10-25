import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  GoogleAuthProvider,
  OAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithCredential,
  updateProfile,
  type AuthCredential,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';
import { getPendingName, setPendingName } from './pendingName';

/**
 * NATIVE social sign-in.
 * - Google: native account picker (@react-native-google-signin) → Google ID token → Firebase.
 * - Apple (iPhone only): native Sign in with Apple sheet with a hashed nonce → Firebase.
 * Both need a development / production build; they are not inside Expo Go.
 */
export type SocialProvider = 'google' | 'apple';

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
let googleMod: GoogleModule | null = null;
let configured = false;

function loadGoogle(): GoogleModule {
  if (!googleMod) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      googleMod = require('@react-native-google-signin/google-signin') as GoogleModule;
    } catch {
      throw new Error('Google sign-in needs the Air Wallet app build (not Expo Go).');
    }
  }
  if (!configured) {
    googleMod.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // required: makes Google return an ID token Firebase accepts
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      scopes: ['email', 'profile'],
    });
    configured = true;
  }
  return googleMod;
}

export const googleSupported = true;

export async function appleSupported(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const Apple = await import('expo-apple-authentication');
  return Apple.isAvailableAsync();
}

/** Returns a Firebase credential, or null if the user cancelled. */
async function getCredential(provider: SocialProvider): Promise<AuthCredential | null> {
  if (provider === 'google') {
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = loadGoogle();
    try {
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return null;
      if (!res.data.idToken) throw new Error('Google did not return an ID token. Check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
      return GoogleAuthProvider.credential(res.data.idToken);
    } catch (e) {
      if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return null;
      if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play services is needed for Google sign-in.');
      throw e;
    }
  }

  // Apple — raw nonce goes to Firebase, its SHA-256 goes to Apple (prevents token replay).
  const Apple = await import('expo-apple-authentication');
  const rawNonce = Crypto.randomUUID() + Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const res = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    if (!res.identityToken) throw new Error('Apple did not return an identity token.');
    // Apple sends the name only on the very first sign-in — keep it for the profile step.
    const name = [res.fullName?.givenName, res.fullName?.familyName].filter(Boolean).join(' ');
    if (name) setPendingName(name);
    return new OAuthProvider('apple.com').credential({ idToken: res.identityToken, rawNonce });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

export async function signInWithSocial(provider: SocialProvider): Promise<UserCredential | null> {
  const cred = await getCredential(provider);
  if (!cred) return null;
  const result = await signInWithCredential(auth, cred);
  if (!result.user.displayName && provider === 'apple') {
    const n = getPendingName();
    if (n) await updateProfile(result.user, { displayName: n }).catch(() => {});
  }
  return result;
}

export async function linkSocial(provider: SocialProvider): Promise<UserCredential | null> {
  if (!auth.currentUser) throw new Error('Sign in first.');
  const cred = await getCredential(provider);
  return cred ? linkWithCredential(auth.currentUser, cred) : null;
}

export async function reauthWithSocial(provider: SocialProvider): Promise<void> {
  if (!auth.currentUser) throw new Error('Sign in first.');
  const cred = await getCredential(provider);
  if (!cred) throw new Error('Cancelled.');
  await reauthenticateWithCredential(auth.currentUser, cred);
}

/** So the account chooser shows next time instead of silently reusing the last Google account. */
export async function socialSignOut(): Promise<void> {
  if (googleMod) await googleMod.GoogleSignin.signOut().catch(() => {});
}
