import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palette, type Colors } from './tokens';
import { usePrefs } from '@/lib/store';

interface ThemeValue {
  scheme: 'light' | 'dark';
  colors: Colors;
}

const ThemeContext = createContext<ThemeValue>({ scheme: 'light', colors: palette.light });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = usePrefs((s) => s.theme);
  const scheme: 'light' | 'dark' = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const value = useMemo(() => ({ scheme, colors: palette[scheme] }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
