import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { errorMessage } from '@/lib/api';
import { Button, Notice, Screen, Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

export default function VerifyEmail() {
  const { colors } = useTheme();
  const [msg, setMsg] = useState<{ t: string; tone: 'success' | 'danger' } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const check = async () => {
    const u = auth.currentUser;
    if (!u) return router.replace('/sign-in');
    setChecking(true);
    await u.reload();
    if (u.emailVerified) {
      await u.getIdToken(true); // refresh token so the server sees email_verified
      router.replace('/home');
    } else setMsg({ t: 'Not verified yet. Open the link in your email first.', tone: 'danger' });
    setChecking(false);
  };

  const resend = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setMsg({ t: 'Sent. Check your inbox and spam folder.', tone: 'success' });
      setCooldown(60);
    } catch (e) {
      setMsg({ t: errorMessage(e), tone: 'danger' });
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 12, marginTop: 60 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={32} color={colors.primary} />
        </View>
        <Text weight="bold" size={22}>Verify your email</Text>
        <Text color={colors.muted} style={{ textAlign: 'center' }}>
          We sent a link to {auth.currentUser?.email}. Tap it, then come back here.
        </Text>
      </View>
      <Button title="I've verified" onPress={check} loading={checking} />
      <Button title={cooldown ? `Resend in ${cooldown}s` : 'Resend email'} variant="secondary" onPress={resend} disabled={cooldown > 0} />
      {msg ? <Notice text={msg.t} tone={msg.tone} /> : null}
      <Button title="Use another account" variant="secondary" icon="logout" onPress={() => signOut(auth)} />
    </Screen>
  );
}
