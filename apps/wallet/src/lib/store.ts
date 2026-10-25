import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemePref } from '@air-wallet/core';

/** Small device-local UI preferences. Server data lives in Firestore, not here. */
interface Prefs {
  theme: ThemePref;
  hideBalance: boolean;
  setTheme: (t: ThemePref) => void;
  toggleBalance: () => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      theme: 'system',
      hideBalance: false,
      setTheme: (theme) => set({ theme }),
      toggleBalance: () => set((s) => ({ hideBalance: !s.hideBalance })),
    }),
    { name: 'air-wallet-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
