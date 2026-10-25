import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { randomInt } from 'node:crypto';
import { demoPan } from './pan';
import { cardUpdateInput } from '@air-wallet/validation';
import { db, FieldValue, callableOpts } from '../shared/app';
import { parse, requireUser, audit } from '../shared/guard';
import { userWallet } from '../shared/ledger';

/**
 * Virtual card — DEMO ISSUER.
 * Numbers use the 9-prefix (not assigned to any card network) and cannot be used for real payments.
 * A production card needs an issuing partner (BIN sponsor); swap issueCard/revealCard for their API.
 */

export const issueCard = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const cardRef = db.doc(`cards/${me.uid}`); // one virtual card per user
  const secretRef = db.doc(`cardSecrets/${me.uid}`);
  const now = new Date();
  return db.runTransaction(async (t) => {
    const s = await t.get(cardRef);
    if (s.exists) return { cardId: cardRef.id, created: false };
    const pan = demoPan();
    t.create(cardRef, {
      uid: me.uid,
      style: 'black',
      last4: pan.slice(-4),
      expMonth: now.getMonth() + 1,
      expYear: now.getFullYear() + 3,
      holderName: me.name.toUpperCase().slice(0, 26),
      status: 'ACTIVE',
      onlineEnabled: true,
      internationalEnabled: false,
      linkedWalletId: userWallet(me.uid),
      demo: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    t.create(secretRef, { pan, cvv: String(randomInt(0, 1000)).padStart(3, '0') });
    return { cardId: cardRef.id, created: true };
  });
});

export const updateCard = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(cardUpdateInput, req.data);
  const ref = db.doc(`cards/${me.uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'No card yet.');
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.style) patch.style = input.style;
  if (input.onlineEnabled !== undefined) patch.onlineEnabled = input.onlineEnabled;
  if (input.internationalEnabled !== undefined) patch.internationalEnabled = input.internationalEnabled;
  if (input.frozen !== undefined) patch.status = input.frozen ? 'FROZEN' : 'ACTIVE';
  await ref.update(patch);
  if (input.frozen !== undefined) await audit(me.uid, input.frozen ? 'card.freeze' : 'card.unfreeze', {});
  return { ok: true };
});

/** Full number + CVV. Requires a sign-in within the last 5 minutes (app re-prompts for password). */
export const revealCard = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  if (Date.now() / 1000 - me.authTime > 300) {
    throw new HttpsError('unauthenticated', 'Please confirm your password to view card details.', { reauth: true });
  }
  const [card, secret] = await Promise.all([db.doc(`cards/${me.uid}`).get(), db.doc(`cardSecrets/${me.uid}`).get()]);
  if (!card.exists || !secret.exists) throw new HttpsError('not-found', 'No card yet.');
  await audit(me.uid, 'card.reveal', {});
  return {
    pan: secret.get('pan') as string,
    cvv: secret.get('cvv') as string,
    expMonth: card.get('expMonth') as number,
    expYear: card.get('expYear') as number,
  };
});
