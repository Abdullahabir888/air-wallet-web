/** Currencies the wallet supports. BDT is the home currency. */
export const CURRENCIES = {
  BDT: { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', exponent: 2, flag: 'BD' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', exponent: 2, flag: 'US' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', exponent: 2, flag: 'GB' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', exponent: 2, flag: 'EU' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const HOME_CURRENCY: CurrencyCode = 'BDT';
export const FOREIGN_CURRENCIES: CurrencyCode[] = ['USD', 'GBP', 'EUR'];
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrency(code: string): code is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, code);
}
