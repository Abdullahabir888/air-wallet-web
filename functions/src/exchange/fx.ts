import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import Decimal from 'decimal.js';
import { exchangeQuoteInput, executeExchangeInput } from '@air-wallet/validation';
import { CURRENCIES, POLICY, FOREIGN_CURRENCIES, type CurrencyCode } from '@air-wallet/core';
import { db, FieldValue, Timestamp, callableOpts } from '../shared/app';
import { parse, rateLimit, requireUser } from '../shared/guard';
import { post, userWallet } from '../shared/ledger';

/**
 * Live BDT rates. Provider: exchangerate-api.com v6 (key in Secret Manager as EXCHANGE_API_KEY).
 * Without a key, a clearly-labelled DEMO rate set is served so the app still works locally.
 * Rates are cached in fxRates/BDT and refreshed at most once a minute, no matter how many users watch.
 */
const EXCHANGE_API_KEY = defineSecret('EXCHANGE_API_KEY');
const MAX_AGE_MS = 60_000;
const DEMO: Record<'USD' | 'GBP' | 'EUR', string> = { USD: '121.80', GBP: '158.42', EUR: '131.95' };
import { quoteAmount, type Foreign } from './quote';

async function fetchProvider(key: string): Promise<Record<Foreign, string>> {
  const res = await fetch(`https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/latest/BDT`);
  if (!res.ok) throw new Error(`FX provider HTTP ${res.status}`);
  const j = (await res.json()) as { result: string; conversion_rates?: Record<string, number> };
  if (j.result !== 'success' || !j.conversion_rates) throw new Error('FX provider returned an error');
  const out = {} as Record<Foreign, string>;
  for (const c of FOREIGN_CURRENCIES as Foreign[]) {
    const perBdt = j.conversion_rates[c];
    if (!perBdt) throw new Error(`Missing rate for ${c}`);
    out[c] = new Decimal(1).div(perBdt).toDecimalPlaces(4).toString(); // BDT per 1 unit of foreign
  }
  return out;
}

export async function getRates(force = false) {
  const ref = db.doc('fxRates/BDT');
  const snap = await ref.get();
  const fetchedAt = snap.exists ? (snap.get('fetchedAt') as Timestamp).toMillis() : 0;
  if (!force && snap.exists && Date.now() - fetchedAt < MAX_AGE_MS) return snap.data()!;

  let bdtPer: Record<Foreign, string>;
  let source = 'exchangerate-api.com';
  const key = process.env.EXCHANGE_API_KEY || '';
  try {
    if (!key) throw new Error('no key');
    bdtPer = await fetchProvider(key);
  } catch (e) {
    if (snap.exists && snap.get('source') !== 'demo') {
      console.warn('FX refresh failed, serving cached rates', e);
      return snap.data()!;
    }
    bdtPer = DEMO;
    source = 'demo';
  }
  const data = {
    base: 'BDT',
    bdtPer,
    previous: snap.exists ? snap.get('bdtPer') : bdtPer,
    source,
    fetchedAt: Timestamp.now(),
  };
  await ref.set(data);
  return data;
}

/** App calls this while the rates screen is open; it's cheap because of the cache. */
export const refreshRates = onCall({ ...callableOpts, secrets: [EXCHANGE_API_KEY] }, async (req) => {
  await requireUser(req, { verified: false });
  const r = await getRates();
  return { bdtPer: r.bdtPer, previous: r.previous, source: r.source, fetchedAtMillis: (r.fetchedAt as Timestamp).toMillis() };
});

export const scheduledRates = onSchedule({ schedule: 'every 15 minutes', secrets: [EXCHANGE_API_KEY] }, async () => {
  await getRates(true);
});

export const getExchangeQuote = onCall({ ...callableOpts, secrets: [EXCHANGE_API_KEY] }, async (req) => {
  const me = await requireUser(req);
  const input = parse(exchangeQuoteInput, req.data);
  const from = input.from as CurrencyCode;
  const to = input.to as CurrencyCode;
  const rates = await getRates();
  const q = quoteAmount(from, to, input.amountMinor, rates.bdtPer as Record<Foreign, string>);
  if (q.toAmountMinor <= 0) throw new HttpsError('invalid-argument', 'Amount too small to exchange.');
  const expiresAt = Timestamp.fromMillis(Date.now() + POLICY.exchange.quoteTtlSeconds * 1000);
  const ref = await db.collection('exchangeQuotes').add({
    uid: me.uid,
    fromCurrency: from,
    toCurrency: to,
    amountMinor: input.amountMinor,
    toAmountMinor: q.toAmountMinor,
    rate: q.rate,
    source: rates.source,
    used: false,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    expireAt: Timestamp.fromMillis(expiresAt.toMillis() + 24 * 3600 * 1000),
  });
  return { quoteId: ref.id, ...q, source: rates.source, expiresAtMillis: expiresAt.toMillis() };
});

export const executeExchange = onCall(callableOpts, async (req) => {
  const me = await requireUser(req);
  const input = parse(executeExchangeInput, req.data);
  await rateLimit(me.uid);
  const ref = db.doc(`exchangeQuotes/${input.quoteId}`);

  return post({
    uid: me.uid,
    idempotencyKey: input.idempotencyKey,
    request: input,
    read: async (t) => {
      const s = await t.get(ref);
      if (!s.exists || s.get('uid') !== me.uid) throw new HttpsError('not-found', 'Quote not found.');
      if (s.get('used')) throw new HttpsError('failed-precondition', 'Quote already used. Get a new rate.');
      if ((s.get('expiresAt') as Timestamp).toMillis() < Date.now()) throw new HttpsError('deadline-exceeded', 'Rate expired. Get a new rate.');
      return {
        from: s.get('fromCurrency') as CurrencyCode,
        to: s.get('toCurrency') as CurrencyCode,
        amount: s.get('amountMinor') as number,
        toAmount: s.get('toAmountMinor') as number,
        rate: s.get('rate') as string,
      };
    },
    legs: (q) => [
      { walletId: userWallet(me.uid, q.from), deltaMinor: -q.amount, currency: q.from },
      { walletId: `system_FX_${q.from}`, deltaMinor: q.amount, currency: q.from },
      { walletId: `system_FX_${q.to}`, deltaMinor: -q.toAmount, currency: q.to },
      {
        walletId: userWallet(me.uid, q.to),
        deltaMinor: q.toAmount,
        currency: q.to,
        create: { ownerUid: me.uid, label: `${CURRENCIES[q.to].name} wallet` },
      },
    ],
    header: (q) => ({
      type: 'EXCHANGE',
      participants: [me.uid],
      fromWalletId: userWallet(me.uid, q.from),
      toWalletId: userWallet(me.uid, q.to),
      amountMinor: q.amount,
      currency: q.from,
      toAmountMinor: q.toAmount,
      toCurrency: q.to,
      rate: q.rate,
      feeMinor: 0,
      title: `${q.from} → ${q.to}`,
      subtitle: 'Exchange',
      meta: { quoteId: input.quoteId },
      createdBy: me.uid,
    }),
    after: (t) => t.update(ref, { used: true }),
  });
});
