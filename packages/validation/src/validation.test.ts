import {
  signUpSchema,
  transferInput,
  rechargeInput,
  atmCodeInput,
  exchangeQuoteInput,
  recipient,
  password,
} from './index';

const key = 'k_1234567890abcdef';

describe('auth', () => {
  test('sign-up passes with valid data and normalizes phone', () => {
    const r = signUpSchema.parse({
      displayName: 'Abir',
      email: 'abir@example.com',
      phone: '+8801712345678',
      password: 'Secret123',
      confirm: 'Secret123',
    });
    expect(r.phone).toBe('01712345678');
  });

  test('sign-up rejects mismatched passwords and weak passwords', () => {
    expect(signUpSchema.safeParse({ displayName: 'A b', email: 'a@b.co', phone: '01712345678', password: 'Secret123', confirm: 'x' }).success).toBe(false);
    expect(password.safeParse('short').success).toBe(false);
    expect(password.safeParse('alllowercase1').success).toBe(false);
  });
});

describe('recipient', () => {
  test('accepts email or BD mobile', () => {
    expect(recipient.parse('Rafi@Example.com')).toEqual({ kind: 'email', value: 'rafi@example.com' });
    expect(recipient.parse('01812-345678')).toEqual({ kind: 'phone', value: '01812345678' });
  });
  test('rejects junk', () => {
    expect(recipient.safeParse('hello').success).toBe(false);
  });
});

describe('money inputs', () => {
  test('transfer enforces integer minor units and limits', () => {
    expect(transferInput.safeParse({ to: 'a@b.co', amountMinor: 250000, idempotencyKey: key }).success).toBe(true);
    expect(transferInput.safeParse({ to: 'a@b.co', amountMinor: 10.5, idempotencyKey: key }).success).toBe(false);
    expect(transferInput.safeParse({ to: 'a@b.co', amountMinor: -100, idempotencyKey: key }).success).toBe(false);
    expect(transferInput.safeParse({ to: 'a@b.co', amountMinor: 999_999_999, idempotencyKey: key }).success).toBe(false);
  });

  test('recharge range ৳20–৳1,000', () => {
    const base = { msisdn: '01712345678', operator: 'GP', connection: 'prepaid', idempotencyKey: key };
    expect(rechargeInput.safeParse({ ...base, amountMinor: 10000 }).success).toBe(true);
    expect(rechargeInput.safeParse({ ...base, amountMinor: 1000 }).success).toBe(false);
  });

  test('ATM amounts in ৳500 steps', () => {
    expect(atmCodeInput.safeParse({ amountMinor: 300000, idempotencyKey: key }).success).toBe(true);
    expect(atmCodeInput.safeParse({ amountMinor: 320000, idempotencyKey: key }).success).toBe(false);
  });

  test('exchange needs BDT on one side', () => {
    expect(exchangeQuoteInput.safeParse({ from: 'BDT', to: 'GBP', amountMinor: 1584200 }).success).toBe(true);
    expect(exchangeQuoteInput.safeParse({ from: 'USD', to: 'GBP', amountMinor: 10000 }).success).toBe(false);
    expect(exchangeQuoteInput.safeParse({ from: 'BDT', to: 'BDT', amountMinor: 10000 }).success).toBe(false);
  });

  test('idempotency key format', () => {
    expect(transferInput.safeParse({ to: 'a@b.co', amountMinor: 250000, idempotencyKey: 'bad key!' }).success).toBe(false);
  });
});
