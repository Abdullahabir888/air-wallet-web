import { httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import * as Crypto from 'expo-crypto';
import { functions } from './firebase';

/** One random key per user action. Reusing it on retry makes the server return the first result. */
export const newKey = () => Crypto.randomUUID().replace(/-/g, '');

async function call<I, O>(name: string, data: I): Promise<O> {
  const fn = httpsCallable<I, O>(functions, name);
  const res: HttpsCallableResult<O> = await fn(data);
  return res.data;
}

type Tx = { transactionId: string };

export const api = {
  registerPhone: (d: { phone: string; displayName?: string }) => call<typeof d, { phone: string }>('registerPhone', d),
  transfer: (d: { to: string; amountMinor: number; note?: string; idempotencyKey: string }) => call<typeof d, Tx>('transfer', d),
  requestMoney: (d: { from: string; amountMinor: number; note?: string }) => call<typeof d, { requestId: string }>('requestMoney', d),
  respondRequest: (d: { requestId: string; action: 'pay' | 'decline' | 'cancel'; idempotencyKey?: string }) => call<typeof d, Tx | { ok: true }>('respondRequest', d),
  payBill: (d: { billerId: string; accountNumber: string; amountMinor: number; idempotencyKey: string }) => call<typeof d, Tx>('payBill', d),
  recharge: (d: { msisdn: string; operator: string; connection: 'prepaid' | 'postpaid'; amountMinor: number; idempotencyKey: string }) => call<typeof d, Tx>('recharge', d),
  cashOutAgent: (d: { agentNumber: string; amountMinor: number; idempotencyKey: string }) => call<typeof d, Tx & { feeMinor: number; totalMinor: number }>('cashOutAgent', d),
  createAtmCode: (d: { amountMinor: number; idempotencyKey: string }) =>
    call<typeof d, Tx & { codeId: string; code: string; expiresAtMillis: number; feeMinor: number }>('createAtmCode', d),
  cancelAtmCode: (d: { codeId: string }) => call<typeof d, Tx>('cancelAtmCode', d),
  refreshRates: () => call<Record<string, never>, { bdtPer: Record<string, string>; previous: Record<string, string>; source: string; fetchedAtMillis: number }>('refreshRates', {}),
  getExchangeQuote: (d: { from: string; to: string; amountMinor: number }) =>
    call<typeof d, { quoteId: string; toAmountMinor: number; rate: string; source: string; expiresAtMillis: number }>('getExchangeQuote', d),
  executeExchange: (d: { quoteId: string; idempotencyKey: string }) => call<typeof d, Tx>('executeExchange', d),
  issueCard: () => call<Record<string, never>, { cardId: string; created: boolean }>('issueCard', {}),
  updateCard: (d: { style?: string; frozen?: boolean; onlineEnabled?: boolean; internationalEnabled?: boolean }) => call<typeof d, { ok: true }>('updateCard', d),
  revealCard: () => call<Record<string, never>, { pan: string; cvv: string; expMonth: number; expYear: number }>('revealCard', {}),

  // Admin only. The server checks the admin claim on every call.
  adminCreditWallet: (d: { walletId: string; amountMinor: number; reason: string; idempotencyKey: string }) =>
    call<typeof d, Tx>('adminCreditWallet', d),
  adminSetUserStatus: (d: { uid: string; status: 'active' | 'suspended' }) => call<typeof d, { ok: true }>('adminSetUserStatus', d),
};

/** Human message for any error thrown by Firebase or the network. */
export function errorMessage(e: unknown): string {
  if (e instanceof FirebaseError) {
    const map: Record<string, string> = {
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/wrong-password': 'Email or password is incorrect.',
      'auth/user-not-found': 'Email or password is incorrect.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
      'auth/network-request-failed': 'No connection. Check your internet and try again.',
      'functions/unavailable': 'Service unavailable. Try again shortly.',
    };
    if (map[e.code]) return map[e.code]!;
    if (e.code.startsWith('functions/')) return e.message;
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}
