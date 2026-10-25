import { randomInt } from 'node:crypto';

export function luhnDigit(partial: string): number {
  let sum = 0;
  for (let i = 0; i < partial.length; i++) {
    let d = Number(partial[partial.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

export function demoPan(): string {
  let p = '9';
  while (p.length < 15) p += String(randomInt(0, 10));
  return p + luhnDigit(p);
}

