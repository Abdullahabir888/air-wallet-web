import type { User } from 'firebase/auth';

export type SignInMethod = 'password' | 'google' | 'apple';

/** Which ways this account can sign in (an account can have several once linked). */
export function signInMethods(user: User | null): SignInMethod[] {
  if (!user) return [];
  const map: Record<string, SignInMethod> = { password: 'password', 'google.com': 'google', 'apple.com': 'apple' };
  return user.providerData.map((p) => map[p.providerId]).filter((m): m is SignInMethod => !!m);
}

/** Preferred way to confirm identity for sensitive actions: password if set, else the social provider. */
export function primaryMethod(user: User | null): SignInMethod | null {
  const m = signInMethods(user);
  return m.includes('password') ? 'password' : m[0] ?? null;
}

export const methodLabel: Record<SignInMethod, string> = { password: 'Email & password', google: 'Google', apple: 'Apple' };
