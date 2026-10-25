import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { bdMobile } from '@air-wallet/validation';
import { auth } from '@/lib/firebase';
import { api, errorMessage } from '@/lib/api';
import { getPendingName } from '@/lib/pendingName';
import { socialSignOut } from '@/lib/socialAuth';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Field, Notice, Screen, Text } from '@/components/ui';
import { Logo } from '@/components/Logo';

/** One-time step after Google / Apple sign-up: confirm name and add a Bangladesh mobile number. */
export default function CompleteProfile() {
  const { colors } = useTheme();
  const user = auth.currentUser;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user?.displayName || getPendingName() || '');
  }, [user?.uid]);

  const save = async () => {
    setErr('');
    const p = bdMobile.safeParse(phone);
    if (name.trim().length < 2) return setErr('Enter your full name.');
    if (!p.success) return setErr('Enter a valid Bangladesh mobile number (01XXXXXXXXX).');
    setBusy(true);
    try {
      await api.registerPhone({ phone: p.data, displayName: name.trim() });
      router.replace('/home');
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, marginTop: 36, marginBottom: 8 }}>
        <Logo height={44} />
        <Text weight="bold" size={22}>Almost there</Text>
        <Text color={colors.muted} style={{ textAlign: 'center' }}>
          Add your mobile number so friends can send you money and you can use ATM cash-out.
        </Text>
      </View>
      <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
      <Field label="Signed in as" value={user?.email ?? ''} editable={false} />
      <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01XXXXXXXXX" autoComplete="tel" />
      {err ? <Notice text={err} tone="danger" /> : null}
      <Button title="Continue" onPress={save} loading={busy} />
      <Button title="Use another account" variant="secondary" icon="logout" onPress={async () => { await socialSignOut(); await signOut(auth); }} />
    </Screen>
  );
}
