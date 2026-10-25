import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { adminCreditInput, adminSetStatusInput, z } from '@air-wallet/validation';
import { db, auth, callableOpts } from '../shared/app';
import { parse, requireAdmin, requireUser, audit } from '../shared/guard';
import { post } from '../shared/ledger';
import type { CurrencyCode } from '@air-wallet/core';

/** The only way money enters the system in this build (demo top-up / support credit). Audited. */
export const adminCreditWallet = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  requireAdmin(me);
  const input = parse(adminCreditInput, req.data);
  const w = await db.doc(`wallets/${input.walletId}`).get();
  if (!w.exists) throw new HttpsError('not-found', 'Wallet not found.');
  const currency = w.get('currency') as CurrencyCode;
  const owner = w.get('ownerUid') as string;
  const res = await post({
    uid: me.uid,
    idempotencyKey: input.idempotencyKey,
    request: input,
    legs: () => [
      { walletId: `system_FUNDING_${currency}`, deltaMinor: -input.amountMinor, currency },
      { walletId: input.walletId, deltaMinor: input.amountMinor, currency },
    ],
    header: () => ({
      type: 'CREDIT',
      participants: [owner],
      fromWalletId: `system_FUNDING_${currency}`,
      toWalletId: input.walletId,
      amountMinor: input.amountMinor,
      currency,
      feeMinor: 0,
      title: 'Wallet credit',
      subtitle: 'Added by Air Wallet',
      createdBy: me.uid,
    }),
  });
  await audit(me.uid, 'wallet.credit', { walletId: input.walletId, amountMinor: input.amountMinor, currency, reason: input.reason }, owner);
  return res;
});

export const adminSetUserStatus = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  requireAdmin(me);
  const input = parse(adminSetStatusInput, req.data);
  // An admin locking themselves out would leave no one able to undo it.
  if (input.uid === me.uid) throw new HttpsError('failed-precondition', "You can't change your own account status.");
  if (!(await db.doc(`users/${input.uid}`).get()).exists) throw new HttpsError('not-found', 'User not found.');
  await db.doc(`users/${input.uid}`).update({ status: input.status });
  if (input.status === 'suspended') await auth.revokeRefreshTokens(input.uid);
  await audit(me.uid, 'user.status', { status: input.status }, input.uid);
  return { ok: true };
});

export const adminListUsers = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  requireAdmin(me);
  const { after } = parse(z.object({ after: z.string().optional() }), req.data ?? {});
  let q = db.collection('users').orderBy('createdAt', 'desc').limit(50);
  if (after) q = q.startAfter(await db.doc(`users/${after}`).get());
  const snap = await q.get();
  return {
    users: snap.docs.map((d) => ({ uid: d.id, displayName: d.get('displayName'), email: d.get('email'), phone: d.get('phone'), status: d.get('status') })),
    next: snap.size === 50 ? snap.docs[snap.size - 1]!.id : null,
  };
});

/** Nightly: wallet balance must equal the sum of its ledger entries. Mismatches go to auditLog. */
export const reconcileLedger = onSchedule('every day 03:00', async () => {
  const wallets = await db.collection('wallets').get();
  for (const w of wallets.docs) {
    const entries = await db.collection('ledgerEntries').where('walletId', '==', w.id).select('deltaMinor').get();
    const sum = entries.docs.reduce((a, e) => a + (e.get('deltaMinor') as number), 0);
    if (sum !== w.get('balanceMinor')) {
      await audit('system', 'ledger.mismatch', { walletId: w.id, balance: w.get('balanceMinor'), ledgerSum: sum });
    }
  }
});
