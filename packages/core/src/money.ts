import { CURRENCIES, type CurrencyCode } from './currencies';

/**
 * All money is stored and moved as integer minor units (paisa, cents, pence).
 * Never use floats for balances. These helpers only convert at the edges (UI input / display).
 */

export function assertMinor(value: number): asserts value is number {
  if (!Number.isSafeInteger(value)) throw new Error(`Amount must be a safe integer of minor units, got ${value}`);
}

/** "1,250.50" / "1250.5" / "1250" → 125050 (for BDT). Returns null if not a valid amount. */
export function parseToMinor(input: string, currency: CurrencyCode): number | null {
  const exp = CURRENCIES[currency].exponent;
  const clean = input.replace(/[,\s৳$£€]/g, '');
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const [whole = '0', frac = ''] = clean.split('.');
  if (frac.length > exp) return null;
  const minor = BigInt(whole) * 10n ** BigInt(exp) + BigInt((frac + '0'.repeat(exp)).slice(0, exp) || '0');
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(minor);
}

/** Group digits. BDT uses the South Asian lakh/crore pattern (12,34,567); others use thousands. */
function group(whole: string, currency: CurrencyCode): string {
  if (currency !== 'BDT' || whole.length <= 3) return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export interface FormatOptions {
  symbol?: boolean;
  sign?: 'auto' | 'always' | 'never';
}

/** 4825000 BDT → "৳48,250.00" */
export function formatMinor(minor: number, currency: CurrencyCode, opts: FormatOptions = {}): string {
  assertMinor(minor);
  const { symbol = true, sign = 'auto' } = opts;
  const exp = CURRENCIES[currency].exponent;
  const neg = minor < 0;
  const abs = Math.abs(minor).toString().padStart(exp + 1, '0');
  const whole = abs.slice(0, abs.length - exp);
  const frac = exp ? abs.slice(-exp) : '';
  const body = `${symbol ? CURRENCIES[currency].symbol : ''}${group(whole, currency)}${exp ? '.' + frac : ''}`;
  if (sign === 'never') return body;
  if (neg) return `−${body}`;
  return sign === 'always' ? `+${body}` : body;
}

/** Percentage fee in basis points, rounded up to the next minor unit (fees never under-charge). */
export function percentFee(amountMinor: number, basisPoints: number): number {
  assertMinor(amountMinor);
  return Math.ceil((amountMinor * basisPoints) / 10_000);
}
