import { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import type { CardStyle } from '@air-wallet/core';
import { api, errorMessage } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { primaryMethod, methodLabel } from '@/lib/providers';
import { reauthWithSocial } from '@/lib/socialAuth';
import { useCard } from '@/lib/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { cardStyles, radius } from '@/theme/tokens';
import { Button, Card, Field, Notice, Screen, Text, ToggleRow } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { VirtualCard } from '@/components/wallet';
import { LinearGradient } from 'expo-linear-gradient';

const styleOrder: CardStyle[] = ['black', 'purple', 'red'];

export default function CardScreen() {
  const { colors } = useTheme();
  const { data: card, loading } = useCard();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reveal, setReveal] = useState<{ pan: string; cvv: string } | null>(null);
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const showDetails = () =>
    run(async () => {
      if (reveal) return setReveal(null);
      try {
        const r = await api.revealCard();
        setReveal({ pan: r.pan, cvv: r.cvv });
        setTimeout(() => setReveal(null), 30_000); // auto-hide
      } catch (e) {
        if (e instanceof FirebaseError && e.code === 'functions/unauthenticated') setNeedPassword(true);
        else throw e;
      }
    });

  const confirmPassword = () =>
    run(async () => {
      const u = auth.currentUser;
      if (!u) return;
      const method = primaryMethod(u);
      if (method === 'password' && u.email) {
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
      } else if (method === 'google' || method === 'apple') {
        await reauthWithSocial(method);
      }
      await u.getIdToken(true);
      setNeedPassword(false);
      setPassword('');
      const r = await api.revealCard();
      setReveal({ pan: r.pan, cvv: r.cvv });
      setTimeout(() => setReveal(null), 30_000);
    });

  if (!loading && !card) {
    return (
      <Screen>
        <Text weight="bold" size={22} style={{ marginTop: 6 }}>Virtual card</Text>
        <VirtualCard card={{ style: 'purple', last4: '0000', holderName: 'YOUR NAME', expMonth: 12, expYear: 2029, status: 'ACTIVE' }} />
        <Text color={colors.muted}>Get a free virtual card linked to your BDT wallet. Pick Midnight Black, Royal Purple or Ruby Gold.</Text>
        {err ? <Notice text={err} tone="danger" /> : null}
        <Button title="Get my card" icon="card" loading={busy} onPress={() => run(() => api.issueCard())} />
        <Notice tone="warning" text="Demo card: works inside Air Wallet only until a card-issuing partner is connected." />
      </Screen>
    );
  }
  if (!card) return <Screen><Text>Loading…</Text></Screen>;

  const frozen = card.status === 'FROZEN';
  const action = (icon: IconName, label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} disabled={busy}
      style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', gap: 8 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <Text weight="medium" size={13}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <Text weight="bold" size={22} style={{ marginTop: 6 }}>Virtual card</Text>
      <VirtualCard card={card} reveal={reveal} />
      {reveal && (
        <Pressable onPress={() => Clipboard.setStringAsync(reveal.pan)} accessibilityRole="button" style={{ flexDirection: 'row', gap: 6, alignSelf: 'center', alignItems: 'center' }}>
          <Icon name="copy" size={16} color={colors.primary} /><Text weight="semibold" color={colors.primary}>Copy card number</Text>
        </Pressable>
      )}

      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
        <View>
          <Text size={11} color={colors.muted}>Card style</Text>
          <Text weight="semibold">{cardStyles[card.style].name}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {styleOrder.map((s) => {
            const on = s === card.style;
            return (
              <Pressable key={s} onPress={() => run(() => api.updateCard({ style: s }))} accessibilityRole="radio"
                accessibilityState={{ selected: on }} accessibilityLabel={cardStyles[s].name}
                style={{ padding: 2, borderRadius: 18, borderWidth: 2, borderColor: on ? colors.primary : 'transparent' }}>
                <LinearGradient colors={[...cardStyles[s].colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 28, height: 28, borderRadius: 14 }} />
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {action(reveal ? 'eyeOff' : 'eye', reveal ? 'Hide details' : 'Show details', showDetails)}
        {action('snow', frozen ? 'Unfreeze' : 'Freeze', () => run(() => api.updateCard({ frozen: !frozen })))}
        {action('lock', 'Security', () => setErr('Card limits follow your wallet limits in this version.'))}
      </View>

      {needPassword && (
        <Card style={{ gap: 10 }}>
          <Text weight="semibold">Confirm it's you</Text>
          {primaryMethod(auth.currentUser) === 'password' ? (
            <>
              <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
              <Button title="Show card details" onPress={confirmPassword} loading={busy} />
            </>
          ) : (
            <Button title={`Confirm with ${methodLabel[primaryMethod(auth.currentUser) ?? 'google']}`} onPress={confirmPassword} loading={busy} />
          )}
        </Card>
      )}

      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow title="Online payments" subtitle="Pay on websites and apps" value={card.onlineEnabled} disabled={busy || frozen}
          onChange={(v) => run(() => api.updateCard({ onlineEnabled: v }))} />
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <ToggleRow title="International use" subtitle="Payments outside Bangladesh" value={card.internationalEnabled} disabled={busy || frozen}
          onChange={(v) => run(() => api.updateCard({ internationalEnabled: v }))} />
      </Card>
      {err ? <Notice text={err} tone="danger" /> : null}
      <Notice tone="warning" text="Demo card number — not valid on Visa/Mastercard networks." />
    </Screen>
  );
}
