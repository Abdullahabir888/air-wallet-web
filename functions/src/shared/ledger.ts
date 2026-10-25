import { HttpsError } from 'firebase-functions/v2/https';
import type { Transaction, DocumentReference } from 'firebase-admin/firestore';
import { db, FieldValue } from './app';
import type { TransactionDoc } from '@air-wallet/core';
import { assertBalanced, hashRequest, isSystemWallet, mergeLegs, type Leg } from './ledger-math';
export { assertBalanced, hashRequest, isSystemWallet, mergeLegs, type Leg };

/**
 * Double-entry posting engine. Every balance change in the system goes through post().
 *  - runs in ONE Firestore transaction (all-or-nothing, retried on contention)
 *  - legs must sum to zero per currency
 *  - user wallets can never go below zero; system_* wallets may (they model bank/FX liquidity)
 *  - writes immutable ledgerEntries + a transactions header
 *  - idempotent: same uid + key returns the first result; same key with a different request is rejected
 */

export type Header = Omit<TransactionDoc, 'createdAt' | 'idempotencyKey' | 'status'> & { status?: TransactionDoc['status'] };

export interface PostOptions<R, P> {
  uid: string;
  idempotencyKey?: string;
  request: unknown;
  /** Extra reads (must happen before any write). Its return value is passed to legs()/after(). */
  read?: (t: Transaction) => Promise<P>;
  legs: (pre: P) => Leg[];
  header: (pre: P) => Header;
  /** Extra writes in the same transaction (e.g. mark a request PAID). */
  after?: (t: Transaction, txRef: DocumentReference, pre: P) => void;
  result?: (txId: string, pre: P) => R;
}

export async function post<R = { transactionId: string }, P = undefined>(o: PostOptions<R, P>): Promise<R> {
  const idemRef = o.idempotencyKey ? db.doc(`idempotency/${o.uid}_${o.idempotencyKey}`) : null;
  const requestHash = hashRequest(o.request);

  return db.runTransaction(async (t) => {
    // 1) idempotency
    if (idemRef) {
      const s = await t.get(idemRef);
      if (s.exists) {
        if (s.get('requestHash') !== requestHash) {
          throw new HttpsError('failed-precondition', 'This request key was already used for a different operation.');
        }
        return s.get('result') as R;
      }
    }

    // 2) extra reads
    const pre = (o.read ? await o.read(t) : undefined) as P;
    const rawLegs = o.legs(pre);
    assertBalanced(rawLegs);
    const legs = mergeLegs(rawLegs);

    // 3) wallet reads
    const refs = legs.map((l) => db.doc(`wallets/${l.walletId}`));
    const snaps = refs.length ? await t.getAll(...refs) : [];

    const txRef = db.collection('transactions').doc();
    const now = FieldValue.serverTimestamp();

    // 4) validate + write
    legs.forEach((leg, i) => {
      const snap = snaps[i]!;
      let balance = 0;
      let owner = leg.create?.ownerUid ?? 'system';
      if (snap.exists) {
        if (snap.get('currency') !== leg.currency) throw new HttpsError('failed-precondition', 'Wallet currency mismatch.');
        if (snap.get('status') !== 'active') throw new HttpsError('failed-precondition', 'This wallet is frozen.');
        balance = snap.get('balanceMinor') as number;
        owner = snap.get('ownerUid') as string;
      } else if (!leg.create && !isSystemWallet(leg.walletId)) {
        throw new HttpsError('not-found', 'Wallet not found.');
      }
      const next = balance + leg.deltaMinor;
      if (next < 0 && !isSystemWallet(leg.walletId)) {
        throw new HttpsError('failed-precondition', 'Insufficient balance.');
      }
      if (snap.exists) {
        t.update(refs[i]!, { balanceMinor: next, version: FieldValue.increment(1), updatedAt: now });
      } else {
        t.set(refs[i]!, {
          ownerUid: owner,
          currency: leg.currency,
          balanceMinor: next,
          label: leg.create?.label ?? leg.walletId,
          status: 'active',
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
      t.create(db.collection('ledgerEntries').doc(), {
        transactionId: txRef.id,
        walletId: leg.walletId,
        ownerUid: owner,
        currency: leg.currency,
        deltaMinor: leg.deltaMinor,
        balanceAfterMinor: next,
        createdAt: now,
      });
    });

    const h = o.header(pre);
    t.create(txRef, { status: 'COMPLETED', ...h, idempotencyKey: o.idempotencyKey ?? '', createdAt: now });
    o.after?.(t, txRef, pre);

    const result = (o.result ? o.result(txRef.id, pre) : { transactionId: txRef.id }) as R;
    if (idemRef) {
      t.create(idemRef, {
        requestHash,
        result,
        createdAt: now,
        expireAt: new Date(Date.now() + 24 * 3600 * 1000),
      });
    }
    return result;
  });
}

export { userWallet } from './ledger-math';
