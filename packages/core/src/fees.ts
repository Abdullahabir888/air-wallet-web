import { percentFee } from './money';

/**
 * Fee and limit policy. These are DEMO values — set your real tariff here.
 * Amounts are in BDT paisa (1 BDT = 100 paisa).
 */
export const POLICY = {
  transfer: { feeBps: 0, minMinor: 1_000, maxMinor: 25_000_00 },
  request: { minMinor: 1_000, maxMinor: 25_000_00 },
  bill: { feeBps: 0, minMinor: 1_000, maxMinor: 50_000_00 },
  recharge: { feeBps: 0, minMinor: 20_00, maxMinor: 1_000_00 },
  cashOutAgent: { feeBps: 185, minMinor: 50_00, maxMinor: 25_000_00 },
  cashOutAtm: { feeFlatMinor: 15_00, minMinor: 500_00, maxMinor: 20_000_00, stepMinor: 500_00, codeTtlMinutes: 15 },
  exchange: { quoteTtlSeconds: 60, minMinor: 100_00 },
  rateLimitPerMinute: 10,
} as const;

export function cashOutAgentFee(amountMinor: number): number {
  return percentFee(amountMinor, POLICY.cashOutAgent.feeBps);
}

export function cashOutAtmFee(_amountMinor: number): number {
  return POLICY.cashOutAtm.feeFlatMinor;
}
