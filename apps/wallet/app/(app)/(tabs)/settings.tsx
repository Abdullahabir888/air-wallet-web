import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import type { ThemePref } from '@air-wallet/core';
import { changePasswordSchema } from '@air-wallet/validation';
import { auth, db, usingEmulators } from '@/lib/firebase';
import { errorMessage } from '@/lib/api';
import { useProfile } from '@/lib/hooks';
import { usePrefs } from '@/lib/store';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Field, Notice, Screen, Segmented, Text } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useDeviceProfile } from '@/lib/device';
import { signInMethods, methodLabel, type SignInMethod } from '@/lib/providers';
import { appleSupported, linkSocial, socialSignOut } from '@/lib/socialAuth';
import { GoogleG, AppleMark } from '@/components/SocialButtons';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';

export default function Settings() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const device = useDeviceProfile();
  const profile = useProfile().data;
  const { admin } = useAuth();
  const [methods, setMethods] = useState<SignInMethod[]>(signInMethods(auth.currentUser));
  const [appleOk, setAppleOk] = useState(false);
  useEffect(() => { appleSupported().then(setAppleOk).catch(() => {}); }, []);

  const link = async (m: 'google' | 'apple') => {
    setBusy(m);
    setMsg(null);
    try {
      const r = await linkSocial(m);
      if (r) {
        setMethods(signInMethods(r.user));
        setMsg({ t: `${methodLabel[m]} linked. You can now sign in with it.`, tone: 'success' });
      }
    } catch (e) {
      const code = (e as { code?: string }).code;
      setMsg({ t: code === 'auth/credential-already-in-use' ? `That ${methodLabel[m]} account already belongs to another Air Wallet account.` : errorMessage(e), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const [name, setName] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState<{ t: string; tone: 'danger' | 'success' } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (profile?.displayName) setName(profile.displayName); }, [profile?.displayName]);

  const changeTheme = async (t: ThemePref) => {
    setTheme(t);
    if (auth.currentUser) await updateDoc(doc(db, 'users', auth.currentUser.uid), { theme: t, updatedAt: serverTimestamp() }).catch(() => {});
  };

  const saveName = async () => {
    if (!auth.currentUser) return;
    setBusy('name');
    setMsg(null);
    try {
      if (name.trim().length < 2) throw new Error('Name is too short.');
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName: name.trim(), updatedAt: serverTimestamp() });
      setMsg({ t: 'Name updated.', tone: 'success' });
    } catch (e) {
      setMsg({ t: errorMessage(e), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async () => {
    const u = auth.currentUser;
    if (!u?.email) return;
    setBusy('pw');
    setMsg(null);
    try {
      const r = changePasswordSchema.safeParse(pw);
      if (!r.success) throw new Error(r.error.issues[0]?.message ?? 'Check the password fields.');
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, pw.current));
      await updatePassword(u, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setMsg({ t: 'Password changed.', tone: 'success' });
    } catch (e) {
      setMsg({ t: errorMessage(e), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Text weight="bold" size={22} style={{ marginTop: 6 }}>Settings</Text>

      <Card style={{ gap: 4 }}>
        <Text weight="semibold">{profile?.displayName}</Text>
        <Text size={13} color={colors.muted}>{profile?.email}</Text>
        <Text size={13} color={colors.muted}>{profile?.phone ?? 'No mobile number'}</Text>
      </Card>

      {admin ? (
        <Card style={{ gap: 10 }}>
          <Text weight="semibold">Admin panel</Text>
          <Text size={13} color={colors.muted}>Users, live transactions, account status and the audit log.</Text>
          <Button title="Open admin panel" icon="lock" onPress={() => router.push('/admin')} />
        </Card>
      ) : null}

      <Text weight="semibold">Appearance</Text>
      <Segmented value={theme} onChange={changeTheme} options={[
        { label: 'System', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' },
      ]} />

      <Text weight="semibold">Profile</Text>
      <Field label="Display name" value={name} onChangeText={setName} />
      <Button title="Save name" variant="secondary" onPress={saveName} loading={busy === 'name'} />

      <Text weight="semibold">Sign-in methods</Text>
      <Card style={{ gap: 10 }}>
        {methods.map((m) => (
          <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {m === 'google' ? <GoogleG size={18} /> : m === 'apple' ? <AppleMark size={18} color={colors.ink} /> : null}
            <Text style={{ flex: 1 }}>{methodLabel[m]}</Text>
            <Text size={12} weight="semibold" color={colors.success}>Linked</Text>
          </View>
        ))}
        {!methods.includes('google') && <Button title="Link Google" variant="secondary" onPress={() => link('google')} loading={busy === 'google'} />}
        {appleOk && !methods.includes('apple') && <Button title="Link Apple" variant="secondary" onPress={() => link('apple')} loading={busy === 'apple'} />}
      </Card>

      {methods.includes('password') ? (
        <>
          <Text weight="semibold">Change password</Text>
          <Field label="Current password" secureTextEntry value={pw.current} onChangeText={(v) => setPw({ ...pw, current: v })} />
          <Field label="New password" secureTextEntry value={pw.next} onChangeText={(v) => setPw({ ...pw, next: v })} hint="8+ characters, upper & lower case, a number" />
          <Field label="Confirm new password" secureTextEntry value={pw.confirm} onChangeText={(v) => setPw({ ...pw, confirm: v })} />
          <Button title="Change password" variant="secondary" onPress={savePassword} loading={busy === 'pw'} />
        </>
      ) : null}

      {msg ? <Notice text={msg.t} tone={msg.tone} /> : null}

      <Card style={{ gap: 6 }}>
        <Text weight="semibold">Help</Text>
        <Text size={13} color={colors.muted}>Money sent to the wrong person? Contact support with the transaction ID from Activity.</Text>
        <Text size={13} color={colors.primary} onPress={() => Linking.openURL('mailto:support@airwallet.app')}>support@airwallet.app</Text>
      </Card>

      <Card style={{ gap: 4 }}>
        <Text weight="semibold">This device</Text>
        <Text size={13} color={colors.muted}>{device.model} · {device.label}</Text>
        <Text size={12} color={colors.muted}>
          Screen {Math.round(device.width)} dp ({device.size}) · {device.cutout.replace('-', ' ')} · top {Math.round(device.insets.top)} / bottom {Math.round(device.insets.bottom)} dp
        </Text>
      </Card>

      <Button title="Sign out" variant="danger" icon="logout" onPress={async () => { qc.clear(); await socialSignOut(); await signOut(auth); }} />
      <View style={{ alignItems: 'center' }}>
        <Text size={11} color={colors.muted}>Air Wallet 1.0.0{usingEmulators ? ' · emulator' : ''}</Text>
      </View>
    </Screen>
  );
}
