import { z } from 'zod';
import { POLICY, formatMinor, parseToMinor, type CurrencyCode } from '@air-wallet/core';

/** Form-side amount field: text input → validated minor units, using the same limits as the server. */
export function amountField(min: number, max: number, currency: CurrencyCode = 'BDT') {
  return z.string().superRefine((v, ctx) => {
    const m = parseToMinor(v || '', currency);
    if (m === null || m <= 0) return ctx.addIssue({ code: 'custom', message: 'Enter an amount' });
    if (m < min) ctx.addIssue({ code: 'custom', message: `Minimum is ${formatMinor(min, currency)}` });
    if (m > max) ctx.addIssue({ code: 'custom', message: `Maximum is ${formatMinor(max, currency)}` });
  });
}

export const toMinor = (v: string, c: CurrencyCode = 'BDT') => parseToMinor(v, c) ?? 0;

export const limits = POLICY;

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function relativeDay(d: Date | null): string {
  if (!d) return '';
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
