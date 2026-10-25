import { z } from 'zod';
import { CURRENCY_CODES, FOREIGN_CURRENCIES, OPERATOR_IDS, POLICY, normalizeBdMobile } from '@air-wallet/core';

/**
 * Shared schemas. Forms use them through zodResolver; Cloud Functions run the SAME schema
 * again on the server, so a modified client can never skip validation.
 */

const minor = z.number().int('Amount must be whole minor units').positive('Amount must be more than 0');
export const currency = z.enum(CURRENCY_CODES as [string, ...string[]]);
export const foreignCurrency = z.enum(FOREIGN_CURRENCIES as [string, ...string[]]);
export const idempotencyKey = z.string().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/);
const note = z.string().trim().max(140).optional().default('');

export const bdMobile = z
  .string()
  .transform((v, ctx) => {
    const n = normalizeBdMobile(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid Bangladesh mobile number (01XXXXXXXXX)' });
      return z.NEVER;
    }
    return n;
  });

/** Recipient: email or BD mobile. */
export const recipient = z
  .string()
  .trim()
  .min(3)
  .transform((v, ctx) => {
    if (v.includes('@')) {
      const r = z.email().safeParse(v.toLowerCase());
      if (!r.success) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid email' });
        return z.NEVER;
      }
      return { kind: 'email' as const, value: r.data };
    }
    const n = normalizeBdMobile(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Enter an email or a mobile number' });
      return z.NEVER;
    }
    return { kind: 'phone' as const, value: n };
  });

const inRange = (min: number, max: number) =>
  minor.min(min, `Minimum is ${min / 100}`).max(max, `Maximum is ${max / 100}`);

// ---------- Auth & profile ----------
export const password = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number');

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Enter your name').max(60),
    email: z.email('Enter a valid email'),
    phone: bdMobile,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const signInSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const forgotSchema = z.object({ email: z.email('Enter a valid email') });

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  theme: z.enum(['system', 'light', 'dark']),
});

export const changePasswordSchema = z
  .object({ current: z.string().min(1), next: password, confirm: z.string() })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

// ---------- Money operations (server inputs) ----------
export const transferInput = z.object({
  to: recipient,
  amountMinor: inRange(POLICY.transfer.minMinor, POLICY.transfer.maxMinor),
  note,
  idempotencyKey,
});

export const requestMoneyInput = z.object({
  from: recipient,
  amountMinor: inRange(POLICY.request.minMinor, POLICY.request.maxMinor),
  note,
});

export const respondRequestInput = z.object({
  requestId: z.string().min(1),
  action: z.enum(['pay', 'decline', 'cancel']),
  idempotencyKey: idempotencyKey.optional(),
});

export const payBillInput = z.object({
  billerId: z.string().min(1),
  accountNumber: z.string().trim().min(4, 'Enter the account / meter number').max(32),
  amountMinor: inRange(POLICY.bill.minMinor, POLICY.bill.maxMinor),
  idempotencyKey,
});

export const rechargeInput = z.object({
  msisdn: bdMobile,
  operator: z.enum(OPERATOR_IDS as [string, ...string[]]),
  connection: z.enum(['prepaid', 'postpaid']),
  amountMinor: inRange(POLICY.recharge.minMinor, POLICY.recharge.maxMinor),
  idempotencyKey,
});

export const cashOutAgentInput = z.object({
  agentNumber: bdMobile,
  amountMinor: inRange(POLICY.cashOutAgent.minMinor, POLICY.cashOutAgent.maxMinor),
  idempotencyKey,
});

export const atmCodeInput = z.object({
  amountMinor: inRange(POLICY.cashOutAtm.minMinor, POLICY.cashOutAtm.maxMinor).refine(
    (v) => v % POLICY.cashOutAtm.stepMinor === 0,
    `ATM amounts must be in steps of ${POLICY.cashOutAtm.stepMinor / 100}`,
  ),
  idempotencyKey,
});

export const cancelAtmCodeInput = z.object({ codeId: z.string().min(1) });

export const redeemAtmCodeInput = z.object({
  phone: bdMobile,
  code: z.string().regex(/^\d{6}$/),
  atmId: z.string().min(1),
});

export const exchangeQuoteInput = z
  .object({
    from: currency,
    to: currency,
    amountMinor: minor.min(POLICY.exchange.minMinor),
  })
  .refine((v) => v.from !== v.to, { message: 'Pick two different currencies' })
  .refine((v) => v.from === 'BDT' || v.to === 'BDT', { message: 'One side must be BDT' });

export const executeExchangeInput = z.object({ quoteId: z.string().min(1), idempotencyKey });

export const createWalletInput = z.object({ currency });

export const cardUpdateInput = z.object({
  style: z.enum(['black', 'purple', 'red']).optional(),
  frozen: z.boolean().optional(),
  onlineEnabled: z.boolean().optional(),
  internationalEnabled: z.boolean().optional(),
});

export const adminCreditInput = z.object({
  walletId: z.string().min(1),
  amountMinor: minor.max(1_000_000_00),
  reason: z.string().trim().min(3).max(200),
  idempotencyKey,
});

export const adminSetStatusInput = z.object({ uid: z.string().min(1), status: z.enum(['active', 'suspended']) });

export type SignUpValues = z.input<typeof signUpSchema>;
export type SignInValues = z.input<typeof signInSchema>;
export type TransferInput = z.output<typeof transferInput>;
export type Recipient = z.output<typeof recipient>;
export { z };
