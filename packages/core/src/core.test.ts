import {
  parseToMinor,
  formatMinor,
  percentFee,
  cashOutAgentFee,
  detectOperator,
  normalizeBdMobile,
  maskMobile,
  isCurrency,
} from './index';

describe('money', () => {
  test('parses user input into minor units', () => {
    expect(parseToMinor('48,250', 'BDT')).toBe(4825000);
    expect(parseToMinor('1250.5', 'BDT')).toBe(125050);
    expect(parseToMinor('0.01', 'USD')).toBe(1);
    expect(parseToMinor('৳1,000.00', 'BDT')).toBe(100000);
  });

  test('rejects bad input', () => {
    expect(parseToMinor('abc', 'BDT')).toBeNull();
    expect(parseToMinor('1.234', 'BDT')).toBeNull();
    expect(parseToMinor('-5', 'BDT')).toBeNull();
    expect(parseToMinor('', 'BDT')).toBeNull();
    expect(parseToMinor('99999999999999999999', 'BDT')).toBeNull();
  });

  test('formats BDT with lakh grouping', () => {
    expect(formatMinor(4825000, 'BDT')).toBe('৳48,250.00');
    expect(formatMinor(12345678900, 'BDT')).toBe('৳12,34,56,789.00');
    expect(formatMinor(5, 'BDT')).toBe('৳0.05');
  });

  test('formats foreign currencies with thousands grouping and signs', () => {
    expect(formatMinor(123456789, 'USD')).toBe('$1,234,567.89');
    expect(formatMinor(-10000, 'GBP')).toBe('−£100.00');
    expect(formatMinor(10000, 'EUR', { sign: 'always' })).toBe('+€100.00');
  });

  test('rejects non-integer amounts', () => {
    expect(() => formatMinor(1.5, 'BDT')).toThrow();
  });

  test('fees round up', () => {
    expect(percentFee(500000, 185)).toBe(9250); // ৳5,000 @1.85% = ৳92.50
    expect(percentFee(1, 185)).toBe(1);
    expect(cashOutAgentFee(500000)).toBe(9250);
  });
});

describe('operators', () => {
  test('normalizes BD numbers', () => {
    expect(normalizeBdMobile('+8801712345678')).toBe('01712345678');
    expect(normalizeBdMobile('01712 345 678')).toBe('01712345678');
    expect(normalizeBdMobile('0171234567')).toBeNull();
    expect(normalizeBdMobile('01212345678')).toBeNull();
  });

  test('detects operator from prefix', () => {
    expect(detectOperator('01712345678')).toBe('GP');
    expect(detectOperator('01312345678')).toBe('GP');
    expect(detectOperator('01812345678')).toBe('ROBI');
    expect(detectOperator('01912345678')).toBe('BL');
    expect(detectOperator('01612345678')).toBe('AIRTEL');
    expect(detectOperator('01512345678')).toBe('TT');
    expect(detectOperator('123')).toBeNull();
  });

  test('masks numbers', () => {
    expect(maskMobile('01712345678')).toBe('017••••5678');
  });
});

test('currency guard', () => {
  expect(isCurrency('BDT')).toBe(true);
  expect(isCurrency('BTC')).toBe(false);
});
