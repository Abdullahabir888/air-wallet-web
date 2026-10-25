import { createHash } from 'node:crypto';
import type { CurrencyCode } from '@air-wallet/core';

/** Pure ledger helpers — no Firebase imports, so they unit-test cleanly. */
export interface Leg {
  walletId: string;
  deltaMinor: number;
  currency: CurrencyCode;
  /** Create the wallet if missing (system wallets, or a user's own new-currency wallet). */
  create?: { ownerUid: string; label: string };
}

export const isSystemWallet = (id: string) => id.startsWith('system_') || id.startsWith('agent_');

export function hashRequest(req: unknown): string {
  return createHash('sha256').update(JSON.stringify(req)).digest('hex');
}

/** Pure check, exported for unit tests. */
export function assertBalanced(legs: Leg[]) {
  const sums = new Map<string, number>();
  for (const l of legs) {
    if (!Number.isSafeInteger(l.deltaMinor) || l.deltaMinor === 0) throw new Error('Leg amounts must be non-zero integers');
    sums.set(l.currency, (sums.get(l.currency) ?? 0) + l.deltaMinor);
  }
  for (const [cur, s] of sums) if (s !== 0) throw new Error(`Legs do not balance for ${cur}: ${s}`);
}

/** Merge legs that touch the same wallet so each wallet is read/updated once. */
export function mergeLegs(legs: Leg[]): Leg[] {
  const m = new Map<string, Leg>();
  for (const l of legs) {
    const cur = m.get(l.walletId);
    if (cur) {
      if (cur.currency !== l.currency) throw new Error('Currency mismatch on one wallet');
      cur.deltaMinor += l.deltaMinor;
    } else m.set(l.walletId, { ...l });
  }
  return [...m.values()].filter((l) => l.deltaMinor !== 0);
}


export const userWallet = (uid: string, currency: CurrencyCode = 'BDT') => `${uid}_${currency}`;
