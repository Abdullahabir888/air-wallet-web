import { HttpsError } from 'firebase-functions/v2/https';
import { auth, db } from './app';
import type { Recipient } from '@air-wallet/validation';

const NOT_FOUND = "We couldn't find an active Air Wallet account for that recipient.";

/** Resolve an email or BD mobile to a uid without exposing a user directory. */
export async function resolveRecipient(r: Recipient): Promise<{ uid: string; name: string }> {
  let uid: string | null = null;
  if (r.kind === 'email') {
    try {
      uid = (await auth.getUserByEmail(r.value)).uid;
    } catch {
      uid = null;
    }
  } else {
    const s = await db.doc(`phoneIndex/${r.value}`).get();
    uid = s.exists ? (s.get('uid') as string) : null;
  }
  if (!uid) throw new HttpsError('not-found', NOT_FOUND);
  const u = await db.doc(`users/${uid}`).get();
  if (!u.exists || u.get('status') !== 'active') throw new HttpsError('not-found', NOT_FOUND);
  return { uid, name: (u.get('displayName') as string) || 'Air Wallet user' };
}

export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]}.` : parts[0] ?? full;
}
