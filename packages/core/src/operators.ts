/** Bangladesh mobile operators, detected from the number prefix. */
export const OPERATORS = {
  GP: { id: 'GP', name: 'Grameenphone', short: 'GP', prefixes: ['013', '017'], color: '#1A9BD7' },
  ROBI: { id: 'ROBI', name: 'Robi', short: 'Robi', prefixes: ['018'], color: '#D32F2F' },
  BL: { id: 'BL', name: 'Banglalink', short: 'Banglalink', prefixes: ['014', '019'], color: '#F28C28' },
  AIRTEL: { id: 'AIRTEL', name: 'Airtel', short: 'Airtel', prefixes: ['016'], color: '#C2185B' },
  TT: { id: 'TT', name: 'Teletalk', short: 'Teletalk', prefixes: ['015'], color: '#2E7D32' },
} as const;

export type OperatorId = keyof typeof OPERATORS;
export const OPERATOR_IDS = Object.keys(OPERATORS) as OperatorId[];

/** Accepts 01XXXXXXXXX, +8801XXXXXXXXX or 8801XXXXXXXXX. Returns 01XXXXXXXXX or null. */
export function normalizeBdMobile(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  const local = digits.startsWith('880') ? '0' + digits.slice(3) : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

export function detectOperator(input: string): OperatorId | null {
  const n = normalizeBdMobile(input);
  if (!n) return null;
  const p = n.slice(0, 3);
  return OPERATOR_IDS.find((id) => (OPERATORS[id].prefixes as readonly string[]).includes(p)) ?? null;
}

/** 01712345678 → 017••••5678 */
export function maskMobile(n: string): string {
  return n.length >= 11 ? `${n.slice(0, 3)}••••${n.slice(-4)}` : n;
}
