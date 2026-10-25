import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { transferInput, requestMoneyInput, respondRequestInput } from '@air-wallet/validation';
import { db, FieldValue, callableOpts } from '../shared/app';
import { parse, rateLimit, requireUser } from '../shared/guard';
import { post, userWallet } from '../shared/ledger';
import { resolveRecipient, shortName } from '../shared/lookup';

/** Send money (BDT) to another Air Wallet user by email or mobile. */
export const transfer = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(transferInput, req.data);
  await rateLimit(me.uid);
  const to = await resolveRecipient(input.to);
  if (to.uid === me.uid) throw new HttpsError('invalid-argument', "You can't send money to yourself.");

  return post({
    uid: me.uid,
    idempotencyKey: input.idempotencyKey,
    request: input,
    legs: () => [
      { walletId: userWallet(me.uid), deltaMinor: -input.amountMinor, currency: 'BDT' },
      { walletId: userWallet(to.uid), deltaMinor: input.amountMinor, currency: 'BDT' },
    ],
    header: () => ({
      type: 'TRANSFER',
      participants: [me.uid, to.uid],
      fromWalletId: userWallet(me.uid),
      toWalletId: userWallet(to.uid),
      amountMinor: input.amountMinor,
      currency: 'BDT',
      feeMinor: 0,
      title: 'Transfer',
      note: input.note,
      counterparty: { [me.uid]: shortName(to.name), [to.uid]: shortName(me.name) },
      createdBy: me.uid,
    }),
  });
});

/** Ask someone to pay you. Creates a PENDING request they can pay or decline. */
export const requestMoney = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(requestMoneyInput, req.data);
  await rateLimit(me.uid, 'request', 20);
  const payer = await resolveRecipient(input.from);
  if (payer.uid === me.uid) throw new HttpsError('invalid-argument', "You can't request money from yourself.");
  const ref = await db.collection('moneyRequests').add({
    requesterUid: me.uid,
    payerUid: payer.uid,
    participants: [me.uid, payer.uid],
    amountMinor: input.amountMinor,
    currency: 'BDT',
    note: input.note,
    status: 'PENDING',
    requesterName: shortName(me.name),
    payerName: shortName(payer.name),
    transactionId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { requestId: ref.id };
});

/** Payer pays/declines, or requester cancels. Paying moves money in the same transaction. */
export const respondRequest = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(respondRequestInput, req.data);
  const ref = db.doc(`moneyRequests/${input.requestId}`);

  if (input.action !== 'pay') {
    await db.runTransaction(async (t) => {
      const s = await t.get(ref);
      if (!s.exists) throw new HttpsError('not-found', 'Request not found.');
      if (s.get('status') !== 'PENDING') throw new HttpsError('failed-precondition', 'This request is already closed.');
      const allowed = input.action === 'decline' ? s.get('payerUid') === me.uid : s.get('requesterUid') === me.uid;
      if (!allowed) throw new HttpsError('permission-denied', 'Not your request.');
      t.update(ref, { status: input.action === 'decline' ? 'DECLINED' : 'CANCELLED', updatedAt: FieldValue.serverTimestamp() });
    });
    return { ok: true };
  }

  if (!input.idempotencyKey) throw new HttpsError('invalid-argument', 'Missing idempotency key.');
  await rateLimit(me.uid);
  return post({
    uid: me.uid,
    idempotencyKey: input.idempotencyKey,
    request: input,
    read: async (t) => {
      const s = await t.get(ref);
      if (!s.exists) throw new HttpsError('not-found', 'Request not found.');
      if (s.get('payerUid') !== me.uid) throw new HttpsError('permission-denied', 'Not your request.');
      if (s.get('status') !== 'PENDING') throw new HttpsError('failed-precondition', 'This request is already closed.');
      return {
        requester: s.get('requesterUid') as string,
        requesterName: s.get('requesterName') as string,
        amount: s.get('amountMinor') as number,
        note: (s.get('note') as string) ?? '',
      };
    },
    legs: (r) => [
      { walletId: userWallet(me.uid), deltaMinor: -r.amount, currency: 'BDT' },
      { walletId: userWallet(r.requester), deltaMinor: r.amount, currency: 'BDT' },
    ],
    header: (r) => ({
      type: 'REQUEST_PAYMENT',
      participants: [me.uid, r.requester],
      fromWalletId: userWallet(me.uid),
      toWalletId: userWallet(r.requester),
      amountMinor: r.amount,
      currency: 'BDT',
      feeMinor: 0,
      title: 'Request paid',
      note: r.note,
      counterparty: { [me.uid]: r.requesterName, [r.requester]: shortName(me.name) },
      createdBy: me.uid,
    }),
    after: (t, txRef) => t.update(ref, { status: 'PAID', transactionId: txRef.id, updatedAt: FieldValue.serverTimestamp() }),
  });
});
