import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FirebaseError } from 'firebase/app';
import { appleSupported, googleSupported, signInWithSocial, type SocialProvider } from '@/lib/socialAuth';
import { errorMessage } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Notice, Text } from './ui';

/** Google "G" mark, per Google's sign-in branding guidelines. */
function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

function AppleMark({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.53zM14.18 6.13c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.58-2.57 1.32-.56.65-1.06 1.69-.93 2.69.98.08 1.98-.5 2.59-1.23z" />
    </Svg>
  );
}

function SocialButton({ provider, label, onPress, busy }: { provider: SocialProvider; label: string; onPress: () => void; busy: boolean }) {
  const { colors, scheme } = useTheme();
  // Apple HIG: black button in light mode, white in dark mode. Google: white/neutral with the G mark.
  const apple = provider === 'apple';
  const bg = apple ? (scheme === 'dark' ? '#FFFFFF' : '#000000') : colors.card;
  const fg = apple ? (scheme === 'dark' ? '#000000' : '#FFFFFF') : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: radius.lg,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: apple ? 0 : 1,
        borderColor: colors.line,
        opacity: pressed || busy ? 0.75 : 1,
      })}
    >
      {busy ? <ActivityIndicator color={fg} /> : apple ? <AppleMark color={fg} /> : <GoogleG />}
      <Text weight="semibold" size={15} color={fg}>{label}</Text>
    </Pressable>
  );
}

/** "Continue with Google" everywhere; "Continue with Apple" on iPhone. */
export function SocialButtons({ mode = 'in' }: { mode?: 'in' | 'up' }) {
  const { colors } = useTheme();
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    appleSupported().then(setApple).catch(() => setApple(false));
  }, []);

  const go = async (p: SocialProvider) => {
    setErr('');
    setBusy(p);
    try {
      await signInWithSocial(p); // AuthProvider + route guards take it from here
    } catch (e) {
      if (e instanceof FirebaseError && e.code === 'auth/account-exists-with-different-credential') {
        setErr('This email already has an Air Wallet password. Sign in with your password, then link Google or Apple in Settings.');
      } else setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const verb = mode === 'up' ? 'Sign up' : 'Continue';
  return (
    <View style={{ gap: 12, marginTop: 10, marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Text size={12} color={colors.muted}>or continue with</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>
      {apple && <SocialButton provider="apple" label={`${verb} with Apple`} onPress={() => go('apple')} busy={busy === 'apple'} />}
      {googleSupported && <SocialButton provider="google" label={`${verb} with Google`} onPress={() => go('google')} busy={busy === 'google'} />}
      {err ? <Notice text={err} tone="danger" /> : null}
    </View>
  );
}

export { GoogleG, AppleMark };
export const isIOS = Platform.OS === 'ios';
