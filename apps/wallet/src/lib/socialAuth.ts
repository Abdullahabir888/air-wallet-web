import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithPopup,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * WEB social sign-in (Firebase popup). Native lives in socialAuth.native.ts.
 * Apple is offered on iPhone only (App Store rule 4.8); on web it needs an Apple Services ID —
 * see docs/DEPLOYMENT.md if you want to enable it here too.
 */
export type SocialProvider = 'google' | 'apple';

const google = () => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

export const googleSupported = true;
export async function appleSupported(): Promise<boolean> {
  return false;
}

export async function signInWithSocial(provider: SocialProvider): Promise<UserCredential | null> {
  if (provider !== 'google') throw new Error('Sign in with Apple is available in the iPhone app.');
  return signInWithPopup(auth, google()).catch(cancelled);
}

export async function linkSocial(provider: SocialProvider): Promise<UserCredential | null> {
  if (provider !== 'google' || !auth.currentUser) throw new Error('Not available here.');
  return linkWithPopup(auth.currentUser, google()).catch(cancelled);
}

export async function reauthWithSocial(provider: SocialProvider): Promise<void> {
  if (provider !== 'google' || !auth.currentUser) throw new Error('Not available here.');
  await reauthenticateWithPopup(auth.currentUser, google());
}

export async function socialSignOut(): Promise<void> {}

/** Closing the popup is a normal "cancel", not an error. */
function cancelled(e: { code?: string }): null {
  if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return null;
  throw e;
}
