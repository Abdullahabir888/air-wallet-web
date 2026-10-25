import { assertBalanced, mergeLegs, hashRequest } from '../src/shared/ledger-math';
import { quoteAmount } from '../src/exchange/quote';
import { demoPan } from '../src/cards/pan';

const rates = { USD: '121.80', GBP: '158.42', EUR: '131.95' };

describe('ledger rules', () => {
  test('balanced legs pass', () => {
    expect(() =>
      assertBalanced([
        { walletId: 'a_BDT', deltaMinor: -500, currency: 'BDT' },
        { walletId: 'b_BDT', deltaMinor: 500, currency: 'BDT' },
      ]),
    ).not.toThrow();
  });

  test('unbalanced legs fail', () => {
    expect(() =>
      assertBalanced([
        { walletId: 'a_BDT', deltaMinor: -500, currency: 'BDT' },
        { walletId: 'b_BDT', deltaMinor: 400, currency: 'BDT' },
      ]),
    ).toThrow(/do not balance/);
  });

  test('exchange balances per currency, not in total', () => {
    expect(() =>
      assertBalanced([
        { walletId: 'u_BDT', deltaMinor: -1584200, currency: 'BDT' },
        { walletId: 'system_FX_BDT', deltaMinor: 1584200, currency: 'BDT' },
        { walletId: 'system_FX_GBP', deltaMinor: -10000, currency: 'GBP' },
        { walletId: 'u_GBP', deltaMinor: 10000, currency: 'GBP' },
      ]),
    ).not.toThrow();
  });

  test('float amounts are rejected', () => {
    expect(() =>
      assertBalanced([
        { walletId: 'a', deltaMinor: -0.5, currency: 'BDT' },
        { walletId: 'b', deltaMinor: 0.5, currency: 'BDT' },
      ]),
    ).toThrow();
  });

  test('merge combines legs on the same wallet', () => {
    const m = mergeLegs([
      { walletId: 'fees', deltaMinor: 100, currency: 'BDT' },
      { walletId: 'fees', deltaMinor: 50, currency: 'BDT' },
      { walletId: 'u', deltaMinor: -150, currency: 'BDT' },
    ]);
    expect(m).toHaveLength(2);
    expect(m.find((l) => l.walletId === 'fees')!.deltaMinor).toBe(150);
  });

  test('request hash is stable and sensitive to content', () => {
    expect(hashRequest({ a: 1 })).toBe(hashRequest({ a: 1 }));
    expect(hashRequest({ a: 1 })).not.toBe(hashRequest({ a: 2 }));
  });
});

describe('exchange quotes', () => {
  test('BDT → GBP matches the design example', () => {
    expect(quoteAmount('BDT', 'GBP', 1584200, rates).toAmountMinor).toBe(10000);
  });
  test('BDT → USD floors fractions', () => {
    expect(quoteAmount('BDT', 'USD', 100000, rates).toAmountMinor).toBe(821); // 1000/121.80 = 8.2101…
  });
  test('USD → BDT', () => {
    expect(quoteAmount('USD', 'BDT', 10000, rates).toAmountMinor).toBe(1218000);
  });
});

describe('demo card numbers', () => {
  const luhnOk = (n: string) =>
    n
      .split('')
      .reverse()
      .map(Number)
      .reduce((s, d, i) => s + (i % 2 ? (d * 2 > 9 ? d * 2 - 9 : d * 2) : d), 0) % 10 === 0;

  test('16 digits, 9-prefix (non-network), Luhn valid', () => {
    for (let i = 0; i < 50; i++) {
      const p = demoPan();
      expect(p).toMatch(/^9\d{15}$/);
      expect(luhnOk(p)).toBe(true);
    }
  });
});
