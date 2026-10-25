import Decimal from 'decimal.js';
import { CURRENCIES, type CurrencyCode } from '@air-wallet/core';

export type Foreign = 'USD' | 'GBP' | 'EUR';

/** Pure quote math, exported for tests. Results always floored in the wallet's favour of not over-paying. */
export function quoteAmount(from: CurrencyCode, to: CurrencyCode, amountMinor: number, bdtPer: Record<Foreign, string>) {
  if (CURRENCIES[from].exponent !== CURRENCIES[to].exponent) throw new Error('Exponent mismatch not supported');
  if (from === 'BDT') {
    const rate = new Decimal(bdtPer[to as Foreign]);
    return { toAmountMinor: new Decimal(amountMinor).div(rate).floor().toNumber(), rate: rate.toString() };
  }
  const rate = new Decimal(bdtPer[from as Foreign]);
  return { toAmountMinor: new Decimal(amountMinor).mul(rate).floor().toNumber(), rate: rate.toString() };
}

