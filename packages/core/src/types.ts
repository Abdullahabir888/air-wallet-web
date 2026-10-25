import type { CurrencyCode } from './currencies';
import type { OperatorId } from './operators';

/** Firestore document shapes shared by app and Functions. Timestamps are typed loosely so both SDKs fit. */
type Ts = { toMillis(): number } | Date | number;

export type CardStyle = 'black' | 'purple' | 'red';
export type ThemePref = 'system' | 'light' | 'dark';

export interface UserDoc {
  displayName: string;
  email: string;
  phone: string | null;
  photoPath: string | null;
  defaultCurrency: CurrencyCode;
  theme: ThemePref;
  status: 'active' | 'suspended';
  createdAt: Ts;
  updatedAt: Ts;
}

export interface WalletDoc {
  ownerUid: string;
  currency: CurrencyCode;
  balanceMinor: number;
  label: string;
  status: 'active' | 'frozen';
  version: number;
  createdAt: Ts;
  updatedAt: Ts;
}

export type TxType =
  | 'TRANSFER'
  | 'REQUEST_PAYMENT'
  | 'BILL_PAYMENT'
  | 'RECHARGE'
  | 'CASH_OUT_AGENT'
  | 'CASH_OUT_ATM'
  | 'ATM_RELEASE'
  | 'EXCHANGE'
  | 'CREDIT'
  | 'REVERSAL';

export interface TransactionDoc {
  type: TxType;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED';
  participants: string[];
  fromWalletId: string | null;
  toWalletId: string | null;
  amountMinor: number;
  currency: CurrencyCode;
  feeMinor: number;
  toAmountMinor?: number;
  toCurrency?: CurrencyCode;
  rate?: string;
  title: string;
  subtitle?: string;
  note?: string;
  meta?: Record<string, string | number | boolean | null>;
  counterparty?: Record<string, string>;
  createdBy: string;
  idempotencyKey: string;
  createdAt: Ts;
}

export interface LedgerEntryDoc {
  transactionId: string;
  walletId: string;
  ownerUid: string;
  currency: CurrencyCode;
  deltaMinor: number;
  balanceAfterMinor: number;
  createdAt: Ts;
}

export interface MoneyRequestDoc {
  requesterUid: string;
  payerUid: string;
  participants: string[];
  amountMinor: number;
  currency: CurrencyCode;
  note: string;
  status: 'PENDING' | 'PAID' | 'DECLINED' | 'CANCELLED';
  requesterName: string;
  payerName: string;
  transactionId: string | null;
  createdAt: Ts;
  updatedAt: Ts;
}

export interface AtmCodeDoc {
  uid: string;
  code: string;
  amountMinor: number;
  feeMinor: number;
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED' | 'EXPIRED';
  holdTransactionId: string;
  expiresAt: Ts;
  createdAt: Ts;
}

export interface CardDoc {
  uid: string;
  style: CardStyle;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  status: 'ACTIVE' | 'FROZEN';
  onlineEnabled: boolean;
  internationalEnabled: boolean;
  linkedWalletId: string;
  createdAt: Ts;
  updatedAt: Ts;
}

export interface BillerDoc {
  name: string;
  category: 'electricity' | 'gas' | 'water' | 'internet' | 'tv' | 'education' | 'other';
  accountLabel: string;
  active: boolean;
  demo: true;
}

export interface FxRatesDoc {
  base: 'BDT';
  /** Units of BDT per 1 unit of the foreign currency, as decimal strings. */
  bdtPer: Record<'USD' | 'GBP' | 'EUR', string>;
  previous?: Record<'USD' | 'GBP' | 'EUR', string>;
  source: string;
  fetchedAt: Ts;
}

export interface RechargeMeta {
  operator: OperatorId;
  msisdnMasked: string;
  connection: 'prepaid' | 'postpaid';
}
