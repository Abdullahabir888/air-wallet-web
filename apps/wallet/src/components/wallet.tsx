import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { formatMinor, type CardDoc, type CurrencyCode, type FxRatesDoc, type TransactionDoc } from '@air-wallet/core';
import { useTheme } from '@/theme/ThemeProvider';
import { cardStyles, radius } from '@/theme/tokens';
import { usePrefs } from '@/lib/store';
import { relativeDay } from '@/lib/forms';
import { toDate, type WithId } from '@/lib/hooks';
import { useAuth } from '@/providers/AuthProvider';
import { Card, Text } from './ui';
import { LogoMark } from './Logo';
import { Icon3D, tileTint, type Icon3DName } from './Icon3D';
import { useDeviceProfile } from '@/lib/device';

export { Logo } from './Logo';

export function BalanceCard({ balanceMinor, currency, name, label = 'Main wallet' }: { balanceMinor: number; currency: CurrencyCode; name: string; label?: string }) {
  const { colors } = useTheme();
  const hide = usePrefs((s) => s.hideBalance);
  const toggle = usePrefs((s) => s.toggleBalance);
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={hide ? 'Show balance' : 'Hide balance'}>
      <LinearGradient colors={[...colors.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -60, top: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text size={13} color="rgba(255,255,255,0.85)">{label}</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill }}>
            <Text weight="semibold" size={12} color="#fff">{currency}</Text>
          </View>
        </View>
        <Text weight="bold" size={32} color="#fff" style={{ marginVertical: 8 }}>
          {hide ? '৳ ••••••' : formatMinor(balanceMinor, currency)}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text size={13} color="rgba(255,255,255,0.9)">Hi, {name.split(' ')[0]}</Text>
          <Text size={13} color="rgba(255,255,255,0.9)">{hide ? 'Tap to show' : 'Tap to hide'}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const actions: { icon: Icon3DName; label: string; href: Href }[] = [
  { icon: 'send', label: 'Send money', href: '/send' },
  { icon: 'request', label: 'Request', href: '/request' },
  { icon: 'bill', label: 'Pay bill', href: '/pay-bill' },
  { icon: 'recharge', label: 'Recharge', href: '/recharge' },
  { icon: 'cashout', label: 'Cash out', href: '/cash-out' },
  { icon: 'atm', label: 'ATM', href: '/cash-out?mode=atm' },
  { icon: 'exchange', label: 'Exchange', href: '/exchange' },
  { icon: 'card', label: 'Card', href: '/card' },
];

/** Quick actions: glossy gradient icons on soft tinted tiles. Columns and tile size follow the device. */
export function ActionGrid() {
  const { colors, scheme } = useTheme();
  const device = useDeviceProfile();
  const tile = device.tileSize;
  const col = `${100 / device.gridColumns}%` as const;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
      {actions.map((a) => {
        const t = tileTint[a.icon]!;
        return (
          <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={() => router.push(a.href)}
            style={({ pressed }) => ({ width: col, alignItems: 'center', gap: 7, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
            <View
              style={{
                width: tile, height: tile, borderRadius: tile * 0.32, alignItems: 'center', justifyContent: 'center',
                backgroundColor: scheme === 'dark' ? `${t.accent}29` : t.light,
                borderWidth: 1, borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.06)' : `${t.accent}2E`,
                shadowColor: t.accent, shadowOpacity: scheme === 'dark' ? 0 : 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
                elevation: scheme === 'dark' ? 0 : 2,
              }}
            >
              <Icon3D name={a.icon} size={tile * 0.63} />
            </View>
            <Text weight="medium" size={device.size === 'compact' ? 11 : 12} color={colors.ink} numberOfLines={1}>{a.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RatesStrip({ rates }: { rates: FxRatesDoc | null | undefined }) {
  const { colors } = useTheme();
  const codes = ['USD', 'GBP', 'EUR'] as const;
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text size={13} color={colors.muted}>BDT rates</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: rates?.source === 'demo' ? colors.warning : colors.success }} />
          <Text weight="semibold" size={13} color={rates?.source === 'demo' ? colors.warning : colors.success}>{rates?.source === 'demo' ? 'Demo' : 'Live'}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {codes.map((c) => {
          const now = rates?.bdtPer?.[c];
          const prev = rates?.previous?.[c];
          // Display-only arithmetic on rates (never on balances).
          const diff = now && prev ? Number(now) - Number(prev) : null;
          const up = diff === null || diff >= 0;
          return (
            <View key={c} style={{ flex: 1, backgroundColor: colors.chip, borderRadius: 12, padding: 10 }}>
              <Text size={11} color={colors.muted}>{c}</Text>
              <Text weight="bold" size={15}>{now ?? '—'}</Text>
              {diff !== null ? <Text size={11} color={up ? colors.success : colors.danger}>{up ? '▲' : '▼'}{Math.abs(diff).toFixed(2)}</Text> : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const txIcon: Record<TransactionDoc['type'], Icon3DName> = {
  TRANSFER: 'send', REQUEST_PAYMENT: 'request', BILL_PAYMENT: 'bill', RECHARGE: 'recharge',
  CASH_OUT_AGENT: 'cashout', CASH_OUT_ATM: 'atm', ATM_RELEASE: 'atm', EXCHANGE: 'exchange', CREDIT: 'request', REVERSAL: 'exchange',
};

export function TxRow({ tx }: { tx: WithId<TransactionDoc> }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const me = user?.uid ?? '';
  const incoming = tx.type === 'CREDIT' || tx.type === 'ATM_RELEASE' || ((tx.type === 'TRANSFER' || tx.type === 'REQUEST_PAYMENT') && tx.createdBy !== me);
  const title = tx.type === 'TRANSFER' || tx.type === 'REQUEST_PAYMENT'
    ? `${incoming ? 'From' : 'To'} ${tx.counterparty?.[me] ?? 'Air Wallet user'}`
    : tx.title;
  const amount = tx.type === 'EXCHANGE' ? tx.amountMinor : tx.amountMinor + (incoming ? 0 : tx.feeMinor);
  const reversed = tx.status === 'REVERSED';
  return (
    <Pressable onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: tx.id } })} accessibilityRole="button"
      accessibilityLabel={`${title}, ${incoming ? 'received' : 'paid'} ${formatMinor(amount, tx.currency)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' }}>
        <Icon3D name={txIcon[tx.type]} size={24} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="medium" size={14} numberOfLines={1}>{title}</Text>
        <Text size={12} color={colors.muted} numberOfLines={1}>
          {relativeDay(toDate(tx.createdAt))} · {tx.subtitle ?? tx.type.replace(/_/g, ' ').toLowerCase()}{tx.note ? ` · “${tx.note}”` : ''}
        </Text>
      </View>
      <Text weight="semibold" size={14} color={reversed ? colors.muted : incoming ? colors.success : colors.ink} style={reversed ? { textDecorationLine: 'line-through' } : undefined}>
        {formatMinor(incoming ? amount : -amount, tx.currency, { sign: incoming ? 'always' : 'auto' })}
      </Text>
    </Pressable>
  );
}

export function TxList({ items }: { items: WithId<TransactionDoc>[] }) {
  const { colors } = useTheme();
  return (
    <Card style={{ paddingVertical: 2 }}>
      {items.map((t, i) => (
        <View key={t.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}><TxRow tx={t} /></View>
      ))}
    </Card>
  );
}

export function VirtualCard({ card, reveal }: { card: Pick<CardDoc, 'style' | 'last4' | 'holderName' | 'expMonth' | 'expYear' | 'status'>; reveal?: { pan: string; cvv: string } | null }) {
  const s = cardStyles[card.style];
  const pan = reveal ? reveal.pan.replace(/(\d{4})(?=\d)/g, '$1 ') : `••••  ••••  ••••  `;
  return (
    <LinearGradient colors={[...s.colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ borderRadius: 22, height: 214, padding: 20, overflow: 'hidden', opacity: card.status === 'FROZEN' ? 0.6 : 1 }}
      accessible accessibilityLabel={`${s.name} virtual card ending ${card.last4}${card.status === 'FROZEN' ? ', frozen' : ''}`}>
      {card.style === 'red' && <View style={{ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(233,196,106,0.55)' }} />}
      {card.style === 'purple' && <View style={{ position: 'absolute', right: -30, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(250,204,21,0.30)' }} />}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <LogoMark size={40} mono={s.markColor} />
        <View style={{ backgroundColor: s.tagBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
          <Text weight="semibold" size={11} color={s.tagText}>{card.status === 'FROZEN' ? 'FROZEN' : 'VIRTUAL'}</Text>
        </View>
      </View>
      <LinearGradient colors={['#FFF1B8', '#C9A227', '#8C6A12']} style={{ width: 42, height: 31, borderRadius: 7, marginTop: 18, marginBottom: 14 }} />
      <Text weight="semibold" size={19} color={s.text} style={{ letterSpacing: 2 }}>
        {pan}{reveal ? '' : <Text weight="bold" size={19} color={s.accent}>{card.last4}</Text>}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <View>
          <Text size={10} color={s.text} style={{ opacity: 0.7, letterSpacing: 0.5 }}>CARDHOLDER</Text>
          <Text weight="medium" size={13} color={s.text}>{card.holderName}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {reveal && (
            <View>
              <Text size={10} color={s.text} style={{ opacity: 0.7 }}>CVV</Text>
              <Text weight="medium" size={13} color={s.text}>{reveal.cvv}</Text>
            </View>
          )}
          <View>
            <Text size={10} color={s.text} style={{ opacity: 0.7, letterSpacing: 0.5 }}>EXPIRES</Text>
            <Text weight="medium" size={13} color={s.text}>{String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
