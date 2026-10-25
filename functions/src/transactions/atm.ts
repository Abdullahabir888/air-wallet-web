import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { atmCodeInput, cancelAtmCodeInput, redeemAtmCodeInput } from '@air-wallet/validation';
import { POLICY, cashOutAtmFee } from '@air-wallet/core';
import { db, FieldValue, Timestamp, callableOpts } from '../shared/app';
import { parse, rateLimit, requireUser, audit } from '../shared/guard';
import { post, userWallet } from '../shared/ledger';

/**
 * Cardless ATM cash-out.
 * 1) User creates a one-time 6-digit code → amount + fee is HELD (moved to system_HOLD_ATM_BDT).
 * 2) A partner ATM redeems it (atmPartner claim) → hold settles to the ATM network + fee wallet.
 * 3) Unused codes are cancelled by the user or expire after 15 min → hold returns to the user.
 */
const HOLD = 'system_HOLD_ATM_BDT';

export const createAtmCode = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(atmCodeInput, req.data);
  await rateLimit(me.uid);
  const fee = cashOutAtmFee(input.amountMinor);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeRef = db.collection('atmCodes').doc();
  const expiresAt = Timestamp.fromMillis(Date.now() + POLICY.cashOutAtm.codeTtlMinutes * 60_000);

  return post({
    uid: me.uid,
    idempotencyKey: input.idempotencyKey,
    request: input,
    read: async (t) => {
      const active = await t.get(db.collection('atmCodes').where('uid', '==', me.uid).where('status', '==', 'ACTIVE').limit(1));
      if (!active.empty) throw new HttpsError('failed-precondition', 'You already have an active ATM code. Use or cancel it first.');
    },
    legs: () => [
      { walletId: userWallet(me.uid), deltaMinor: -(input.amountMinor + fee), currency: 'BDT' },
      { walletId: HOLD, deltaMinor: input.amountMinor + fee, currency: 'BDT' },
    ],
    header: () => ({
      type: 'CASH_OUT_ATM',
      status: 'PENDING',
      participants: [me.uid],
      fromWalletId: userWallet(me.uid),
      toWalletId: HOLD,
      amountMinor: input.amountMinor,
      currency: 'BDT',
      feeMinor: fee,
      title: 'ATM cash out',
      subtitle: 'Code active',
      meta: { codeId: codeRef.id },
      createdBy: me.uid,
    }),
    after: (t, txRef) =>
      t.create(codeRef, {
        uid: me.uid,
        code,
        amountMinor: input.amountMinor,
        feeMinor: fee,
        status: 'ACTIVE',
        attempts: 0,
        holdTransactionId: txRef.id,
        expiresAt,
        createdAt: FieldValue.serverTimestamp(),
      }),
    result: (transactionId) => ({ transactionId, codeId: codeRef.id, code, expiresAtMillis: expiresAt.toMillis(), feeMinor: fee }),
  });
});

/** Return a held ATM amount to the user (cancel or expiry). */
async function releaseHold(codeId: string, actorUid: string, reason: 'CANCELLED' | 'EXPIRED') {
  const ref = db.doc(`atmCodes/${codeId}`);
  return post({
    uid: actorUid,
    idempotencyKey: `release_${codeId}`,
    request: { codeId },
    read: async (t) => {
      const s = await t.get(ref);
      if (!s.exists) throw new HttpsError('not-found', 'Code not found.');
      if (reason === 'CANCELLED' && s.get('uid') !== actorUid) throw new HttpsError('permission-denied', 'Not your code.');
      if (s.get('status') !== 'ACTIVE') throw new HttpsError('failed-precondition', 'This code is no longer active.');
      return {
        uid: s.get('uid') as string,
        total: (s.get('amountMinor') as number) + (s.get('feeMinor') as number),
        hold: s.get('holdTransactionId') as string,
      };
    },
    legs: (c) => [
      { walletId: HOLD, deltaMinor: -c.total, currency: 'BDT' },
      { walletId: userWallet(c.uid), deltaMinor: c.total, currency: 'BDT' },
    ],
    header: (c) => ({
      type: 'ATM_RELEASE',
      participants: [c.uid],
      fromWalletId: HOLD,
      toWalletId: userWallet(c.uid),
      amountMinor: c.total,
      currency: 'BDT',
      feeMinor: 0,
      title: 'ATM code ' + (reason === 'EXPIRED' ? 'expired' : 'cancelled'),
      subtitle: 'Money returned',
      meta: { codeId },
      createdBy: actorUid,
    }),
    after: (t, _tx, c) => {
      t.update(ref, { status: reason, updatedAt: FieldValue.serverTimestamp() });
      t.update(db.doc(`transactions/${c.hold}`), { status: 'REVERSED', subtitle: reason === 'EXPIRED' ? 'Expired' : 'Cancelled' });
    },
  });
}

export const cancelAtmCode = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const { codeId } = parse(cancelAtmCodeInput, req.data);
  return releaseHold(codeId, me.uid, 'CANCELLED');
});

export const expireAtmCodes = onSchedule('every 5 minutes', async () => {
  const due = await db.collection('atmCodes').where('status', '==', 'ACTIVE').where('expiresAt', '<=', Timestamp.now()).limit(200).get();
  for (const d of due.docs) {
    try {
      await releaseHold(d.id, 'system', 'EXPIRED');
    } catch (e) {
      console.error('expire failed', d.id, e);
    }
  }
});

/** Called by a partner ATM switch (service account user with the atmPartner claim). */
export const redeemAtmCode = onCall(callableOpts, async (req) => {
  const partner = await requireUser(req, { verified: false });
  if (!partner.atmPartner) throw new HttpsError('permission-denied', 'ATM partners only.');
  const input = parse(redeemAtmCodeInput, req.data);
  await rateLimit(partner.uid, 'atm', 120);
  const idx = await db.doc(`phoneIndex/${input.phone}`).get();
  if (!idx.exists) throw new HttpsError('not-found', 'Invalid code.');
  const uid = idx.get('uid') as string;
  const q = await db.collection('atmCodes').where('uid', '==', uid).where('status', '==', 'ACTIVE').limit(1).get();
  const doc = q.docs[0];
  if (!doc) throw new HttpsError('not-found', 'Invalid code.');
  const ref = doc.ref;

  const result = await post({
    uid: partner.uid,
    idempotencyKey: `redeem_${doc.id}`,
    request: { codeId: doc.id, atmId: input.atmId },
    read: async (t) => {
      const s = await t.get(ref);
      if (s.get('status') !== 'ACTIVE') throw new HttpsError('failed-precondition', 'Code no longer active.');
      if ((s.get('expiresAt') as Timestamp).toMillis() < Date.now()) throw new HttpsError('deadline-exceeded', 'Code expired.');
      const a = Buffer.from(String(s.get('code')));
      const b = Buffer.from(input.code);
      const ok = a.length === b.length && timingSafeEqual(a, b);
      if (!ok) {
        // Burn the code after 5 wrong attempts (released by the expiry job).
        const attempts = ((s.get('attempts') as number) ?? 0) + 1;
        throw new HttpsError('permission-denied', attempts >= 5 ? 'Too many attempts.' : 'Invalid code.', { attempts, codeId: s.id });
      }
      return { amount: s.get('amountMinor') as number, fee: s.get('feeMinor') as number, hold: s.get('holdTransactionId') as string };
    },
    legs: (c) => [
      { walletId: HOLD, deltaMinor: -(c.amount + c.fee), currency: 'BDT' },
      { walletId: 'system_ATM_SETTLEMENT_BDT', deltaMinor: c.amount, currency: 'BDT' },
      { walletId: 'system_FEES_BDT', deltaMinor: c.fee, currency: 'BDT' },
    ],
    header: (c) => ({
      type: 'CASH_OUT_ATM',
      // Settlement leg is internal; the user already sees the original (now COMPLETED) entry.
      participants: [],
      fromWalletId: HOLD,
      toWalletId: 'system_ATM_SETTLEMENT_BDT',
      amountMinor: c.amount,
      currency: 'BDT',
      feeMinor: c.fee,
      title: 'ATM cash out',
      subtitle: `Dispensed at ${input.atmId}`,
      meta: { codeId: doc.id, settlement: true },
      createdBy: partner.uid,
    }),
    after: (t, _tx, c) => {
      t.update(ref, { status: 'REDEEMED', atmId: input.atmId, redeemedAt: FieldValue.serverTimestamp() });
      t.update(db.doc(`transactions/${c.hold}`), { status: 'COMPLETED', subtitle: 'Cash collected' });
    },
  }).catch(async (e: unknown) => {
    const details = (e as { details?: { attempts?: number } }).details;
    if (details?.attempts) {
      await ref.update({ attempts: details.attempts, ...(details.attempts >= 5 ? { expiresAt: Timestamp.now() } : {}) });
    }
    throw e;
  });
  await audit(partner.uid, 'atm.redeem', { codeId: doc.id, atmId: input.atmId }, uid);
  return result;
});
