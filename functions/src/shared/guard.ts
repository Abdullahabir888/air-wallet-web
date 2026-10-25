import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { z } from 'zod';
import { db, FieldValue, Timestamp } from './app';
import { POLICY } from '@air-wallet/core';

export interface Caller {
  uid: string;
  email: string | undefined;
  name: string;
  admin: boolean;
  atmPartner: boolean;
  authTime: number;
}

/** Signed in + (optionally) email verified + not suspended. */
export async function requireUser(req: CallableRequest, opts: { verified?: boolean } = { verified: true }): Promise<Caller> {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in.');
  const t = req.auth.token;
  if (opts.verified !== false && !t.email_verified) {
    throw new HttpsError('failed-precondition', 'Verify your email first.');
  }
  const snap = await db.doc(`users/${req.auth.uid}`).get();
  if (snap.exists && snap.get('status') === 'suspended') {
    throw new HttpsError('permission-denied', 'This account is suspended. Contact support.');
  }
  return {
    uid: req.auth.uid,
    email: t.email,
    name: (snap.get('displayName') as string) || t.name || 'Air Wallet user',
    admin: t.admin === true,
    atmPartner: t.atmPartner === true,
    authTime: Number(t.auth_time ?? 0),
  };
}

export function requireAdmin(c: Caller) {
  if (!c.admin) throw new HttpsError('permission-denied', 'Admins only.');
}

/** Parse with the shared Zod schema; turn failures into a clean invalid-argument error. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => i.message).join('; ');
    throw new HttpsError('invalid-argument', msg || 'Invalid input.');
  }
  return r.data;
}

/** Fixed-window rate limit per user for money operations. */
export async function rateLimit(uid: string, op = 'money', perMinute: number = POLICY.rateLimitPerMinute) {
  const ref = db.doc(`rateLimits/${uid}_${op}`);
  await db.runTransaction(async (t) => {
    const s = await t.get(ref);
    const now = Date.now();
    const start = s.exists ? (s.get('windowStart') as Timestamp).toMillis() : 0;
    if (now - start > 60_000) {
      t.set(ref, { windowStart: Timestamp.fromMillis(now), count: 1 });
      return;
    }
    const count = (s.get('count') as number) ?? 0;
    if (count >= perMinute) throw new HttpsError('resource-exhausted', 'Too many requests. Wait a minute and try again.');
    t.update(ref, { count: FieldValue.increment(1) });
  });
}

export async function audit(actorUid: string, action: string, details: Record<string, unknown>, targetUid?: string) {
  await db.collection('auditLog').add({ actorUid, action, targetUid: targetUid ?? null, details, createdAt: FieldValue.serverTimestamp() });
}
