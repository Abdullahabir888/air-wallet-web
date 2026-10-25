import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthState {
  user: User | null;
  ready: boolean;
  admin: boolean;
}

const Ctx = createContext<AuthState>({ user: null, ready: false, admin: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false, admin: false });
  useEffect(
    () =>
      onIdTokenChanged(auth, async (user) => {
        const admin = user ? (await user.getIdTokenResult()).claims.admin === true : false;
        setState({ user, ready: true, admin });
      }),
    [],
  );
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
