import * as v1 from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { bdMobile, createWalletInput, z } from '@air-wallet/validation';
import type { CurrencyCode } from '@air-wallet/core';
import { CURRENCIES } from '@air-wallet/core';
import { db, FieldValue, REGION, callableOpts } from '../shared/app';
import { parse, requireUser } from '../shared/guard';
import { userWallet } from '../shared/ledger';

/** New Auth user → profile doc + zero-balance BDT wallet. */
export const onUserCreated = v1
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const now = FieldValue.serverTimestamp();
    const defaults: Record<string, unknown> = {
      displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Air Wallet user'),
      email: user.email ?? '',
      phone: null,
      photoPath: null,
      defaultCurrency: 'BDT',
      theme: 'system',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    // registerPhone (called right after sign-up) or the seed script may have written first:
    // only fill fields that are still missing, never overwrite.
    const userRef = db.doc(`users/${user.uid}`);
    await db.runTransaction(async (t) => {
      const snap = await t.get(userRef);
      const current = snap.exists ? snap.data()! : {};
      const missing = Object.fromEntries(Object.entries(defaults).filter(([k]) => current[k] === undefined));
      if (Object.keys(missing).length) t.set(userRef, missing, { merge: true });
    });
    // create() never overwrites: if a wallet already exists (seed/import), leave it alone.
    await db
      .doc(`wallets/${userWallet(user.uid, 'BDT')}`)
      .create({
        ownerUid: user.uid,
        currency: 'BDT',
        balanceMinor: 0,
        label: 'Main wallet',
        status: 'active',
        version: 0,
        createdAt: now,
        updatedAt: now,
      })
      .catch((e: { code?: number }) => {
        if (e.code !== 6) throw e; // 6 = ALREADY_EXISTS
      });
  });

/** Claim a unique mobile number for the account (used for send / request / ATM). */
export const registerPhone = onCall(callableOpts, async (req) => {
  const me = await requireUser(req, { verified: false });
  const { phone, displayName } = parse(z.object({ phone: bdMobile, displayName: z.string().trim().min(2).max(60).optional() }), req.data);
  await db.runTransaction(async (t) => {
    const idx = db.doc(`phoneIndex/${phone}`);
    const s = await t.get(idx);
    if (s.exists && s.get('uid') !== me.uid) throw new HttpsError('already-exists', 'This number is already linked to another account.');
    const user = await t.get(db.doc(`users/${me.uid}`));
    const old = user.get('phone') as string | null;
    if (old && old !== phone) t.delete(db.doc(`phoneIndex/${old}`));
    t.set(idx, { uid: me.uid, createdAt: FieldValue.serverTimestamp() });
    t.set(
      db.doc(`users/${me.uid}`),
      { phone, ...(displayName ? { displayName } : {}), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });
  return { phone };
});

/** Open a wallet in another supported currency (USD / GBP / EUR). */
export const createWallet = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const { currency } = parse(createWalletInput, req.data);
  const id = userWallet(me.uid, currency as CurrencyCode);
  const ref = db.doc(`wallets/${id}`);
  await db.runTransaction(async (t) => {
    if ((await t.get(ref)).exists) return;
    t.create(ref, {
      ownerUid: me.uid,
      currency,
      balanceMinor: 0,
      label: `${CURRENCIES[currency as CurrencyCode].name} wallet`,
      status: 'active',
      version: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { walletId: id };
});
