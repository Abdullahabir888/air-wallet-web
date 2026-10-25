import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { formatMinor } from '@air-wallet/core';
import { useProfile, useRates, useTransactions, useWallets } from '@/lib/hooks';
import { greeting } from '@/lib/forms';
import { useDeviceProfile } from '@/lib/device';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Empty, Screen, Text } from '@/components/ui';
import { ActionGrid, BalanceCard, Logo, RatesStrip, TxList } from '@/components/wallet';

export default function Home() {
  const { colors } = useTheme();
  const device = useDeviceProfile();
  const profile = useProfile().data;
  const { admin } = useAuth();
  const wallets = useWallets().data ?? [];
  const rates = useRates().data;
  const tx = useTransactions(5).data;
  const main = wallets.find((w) => w.currency === 'BDT');
  const others = wallets.filter((w) => w.currency !== 'BDT' && w.balanceMinor > 0);
  const name = profile?.displayName ?? '';
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'AW';

  return (
    <Screen>
      {device.largeHeader ? (
        // Samsung One UI: large title zone at the top keeps actions within thumb reach.
        <View style={{ paddingTop: 24, paddingBottom: 12, paddingHorizontal: 4 }}>
          <Text size={14} color={colors.muted}>{greeting()},</Text>
          <Text weight="bold" size={30}>{name ? name.split(' ')[0] : 'Welcome'}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo height={36} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {admin ? (
          <Pressable onPress={() => router.push('/admin')} accessibilityRole="button" accessibilityLabel="Open admin panel"
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text weight="semibold" size={12} color={colors.bg}>Admin</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Open settings"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text weight="bold" color={colors.primary}>{initials}</Text>
        </Pressable>
        </View>
      </View>
      {device.largeHeader ? null : (
        <Text size={13} color={colors.muted}>{greeting()}{name ? ', ' : ''}<Text weight="semibold" size={13}>{name ? name.split(' ')[0] : ''}</Text></Text>
      )}
      <BalanceCard balanceMinor={main?.balanceMinor ?? 0} currency="BDT" name={name || 'there'} />
      {others.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {others.map((w) => (
            <View key={w.id} style={{ backgroundColor: colors.card, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text size={11} color={colors.muted}>{w.currency} wallet</Text>
              <Text weight="semibold">{formatMinor(w.balanceMinor, w.currency)}</Text>
            </View>
          ))}
        </View>
      )}
      <ActionGrid />
      <RatesStrip rates={rates} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text weight="bold" size={16}>Recent</Text>
        <Pressable onPress={() => router.push('/activity')} accessibilityRole="link"><Text weight="semibold" color={colors.primary}>See all</Text></Pressable>
      </View>
      {tx === undefined ? null : tx.length ? <TxList items={tx} /> : <Empty icon="activity" text="No transactions yet. Ask a friend to send you money to get started." />}
    </Screen>
  );
}
