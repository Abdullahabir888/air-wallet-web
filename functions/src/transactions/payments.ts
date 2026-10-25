import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { payBillInput, rechargeInput, cashOutAgentInput } from '@air-wallet/validation';
import { OPERATORS, cashOutAgentFee, detectOperator, maskMobile, type OperatorId } from '@air-wallet/core';
import { db, callableOpts } from '../shared/app';
import { parse, rateLimit, requireUser } from '../shared/guard';
import { post, userWallet } from '../shared/ledger';

/**
 * DEMO SETTLEMENT: bills, recharge and agent cash-out move money inside Air Wallet only.
 * Real billers/telcos/agents need a licensed aggregator or MFS partner — see docs/FEATURES.md.
 */

export const payBill = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(payBillInput, req.data);
  await rateLimit(me.uid);
  const biller = await db.doc(`billers/${input.billerId}`).get();
  if (!biller.exists || biller.get('active') !== true) throw new HttpsError('not-found', 'Biller not available.');
  const name = biller.get('name') as string;

  return post({
    uid: me.uid,
    idempotencyKey: input.idempotencyKey,
    request: input,
    legs: () => [
      { walletId: userWallet(me.uid), deltaMinor: -input.amountMinor, currency: 'BDT' },
      { walletId: `system_BILLER_${input.billerId}_BDT`, deltaMinor: input.amountMinor, currency: 'BDT' },
    ],
    header: () => ({
      type: 'BILL_PAYMENT',
      participants: [me.uid],
      fromWalletId: userWallet(me.uid),
      toWalletId: `system_BILLER_${input.billerId}_BDT`,
      amountMinor: input.amountMinor,
      currency: 'BDT',
      feeMinor: 0,
      title: name,
      subtitle: 'Bill pay',
      meta: { billerId: input.billerId, category: biller.get('category') as string, account: input.accountNumber.slice(-4) },
      createdBy: me.uid,
    }),
  });
});

export const recharge = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(rechargeInput, req.data);
  await rateLimit(me.uid);
  const detected = detectOperator(input.msisdn);
  // Mobile number portability exists in BD, so a mismatch is allowed — the user's choice wins.
  const op = OPERATORS[input.operator as OperatorId];

  return post({
    uid: me.uid,
    idempotencyKey: input.idempotencyKey,
    request: input,
    legs: () => [
      { walletId: userWallet(me.uid), deltaMinor: -input.amountMinor, currency: 'BDT' },
      { walletId: `system_TELCO_${op.id}_BDT`, deltaMinor: input.amountMinor, currency: 'BDT' },
    ],
    header: () => ({
      type: 'RECHARGE',
      participants: [me.uid],
      fromWalletId: userWallet(me.uid),
      toWalletId: `system_TELCO_${op.id}_BDT`,
      amountMinor: input.amountMinor,
      currency: 'BDT',
      feeMinor: 0,
      title: `Recharge ${maskMobile(input.msisdn)}`,
      subtitle: op.name,
      meta: { operator: op.id, msisdnMasked: maskMobile(input.msisdn), connection: input.connection, portedGuess: detected !== op.id },
      createdBy: me.uid,
    }),
  });
});

/** Cash out to a registered agent. Agent gets the amount; the fee goes to the fee wallet. */
export const cashOutAgent = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(cashOutAgentInput, req.data);
  await rateLimit(me.uid);
  const agent = await db.doc(`agents/${input.agentNumber}`).get();
  if (!agent.exists || agent.get('active') !== true) throw new HttpsError('not-found', 'No active agent with that number.');
  const fee = cashOutAgentFee(input.amountMinor);
  const agentWallet = `agent_${input.agentNumber}_BDT`;

  return post({
    uid: me.uid,
    idempotencyKey: input.idempotencyKey,
    request: input,
    legs: () => [
      { walletId: userWallet(me.uid), deltaMinor: -(input.amountMinor + fee), currency: 'BDT' },
      { walletId: agentWallet, deltaMinor: input.amountMinor, currency: 'BDT' },
      { walletId: 'system_FEES_BDT', deltaMinor: fee, currency: 'BDT' },
    ],
    header: () => ({
      type: 'CASH_OUT_AGENT',
      participants: [me.uid],
      fromWalletId: userWallet(me.uid),
      toWalletId: agentWallet,
      amountMinor: input.amountMinor,
      currency: 'BDT',
      feeMinor: fee,
      title: 'Cash out',
      subtitle: agent.get('name') as string,
      meta: { agent: maskMobile(input.agentNumber) },
      createdBy: me.uid,
    }),
    result: (transactionId) => ({ transactionId, feeMinor: fee, totalMinor: input.amountMinor + fee }),
  });
});
