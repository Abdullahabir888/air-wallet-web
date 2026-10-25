import type { User } from 'firebase/auth';
import { primaryMethod, signInMethods } from '@/lib/providers';

const user = (...ids: string[]) => ({ providerData: ids.map((providerId) => ({ providerId })) }) as unknown as User;

describe('sign-in methods', () => {
  test('maps Firebase provider ids', () => {
    expect(signInMethods(user('password'))).toEqual(['password']);
    expect(signInMethods(user('google.com', 'apple.com'))).toEqual(['google', 'apple']);
    expect(signInMethods(user('phone'))).toEqual([]);
    expect(signInMethods(null)).toEqual([]);
  });

  test('password wins for re-authentication when linked', () => {
    expect(primaryMethod(user('google.com', 'password'))).toBe('password');
    expect(primaryMethod(user('apple.com'))).toBe('apple');
    expect(primaryMethod(user('google.com'))).toBe('google');
    expect(primaryMethod(null)).toBeNull();
  });
});
