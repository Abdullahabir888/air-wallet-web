import { Linking, View } from 'react-native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';
import { socialSignOut } from '@/lib/socialAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/lib/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Loading, Text } from '@/components/ui';
import { Icon } from '@/components/Icon';

/** Shown the moment an admin suspends the account, on every device the user is signed in on. */
function Suspended() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <View style={{ maxWidth: 420, width: '100%', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={colors.danger} />
        </View>
        <Text weight="bold" size={22} accessibilityRole="header" style={{ textAlign: 'center' }}>Your account is suspended</Text>
        <Text color={colors.muted} style={{ textAlign: 'center' }}>
          You can't send, pay or cash out right now. Your balance is safe. Contact support to sort it out.
        </Text>
        <Text weight="semibold" color={colors.primary} onPress={() => Linking.openURL('mailto:support@airwallet.app')}>support@airwallet.app</Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="Sign out" variant="secondary" icon="logout" onPress={async () => {
            qc.clear();
            await socialSignOut().catch(() => {});
            await signOut(auth);
          }} />
        </View>
      </View>
    </View>
  );
}

/** Client-side guard for every signed-in screen. The server re-checks auth and status on every call. */
export default function AppLayout() {
  const { user, ready } = useAuth();
  const { colors } = useTheme();
  const profile = useProfile();
  const segments = useSegments();
  const onCompleteProfile = segments[segments.length - 1] === 'complete-profile';

  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/sign-in" />;
  if (!user.emailVerified) return <Redirect href="/verify-email" />;
  // Live: flips the instant an admin changes the status, no reload needed. Checked first so it wins over everything.
  if (profile.data?.status === 'suspended') return <Suspended />;
  // Google / Apple sign-ups arrive without a mobile number — needed for send, request and ATM.
  if (!profile.loading && !profile.data?.phone && !onCompleteProfile) return <Redirect href="/complete-profile" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
