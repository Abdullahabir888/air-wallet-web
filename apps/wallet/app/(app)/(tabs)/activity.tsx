import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { TransactionDoc } from '@air-wallet/core';
import { useTransactions, toDate } from '@/lib/hooks';
import { relativeDay } from '@/lib/forms';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Empty, Screen, Segmented, Text } from '@/components/ui';
import { TxList } from '@/components/wallet';

type Filter = 'all' | 'sent' | 'received' | 'bills';
const bills: TransactionDoc['type'][] = ['BILL_PAYMENT', 'RECHARGE'];

export default function Activity() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const all = useTransactions(100).data;

  const groups = useMemo(() => {
    const me = user?.uid;
    const items = (all ?? []).filter((t) => {
      const incoming = t.type === 'CREDIT' || t.type === 'ATM_RELEASE' || ((t.type === 'TRANSFER' || t.type === 'REQUEST_PAYMENT') && t.createdBy !== me);
      if (filter === 'sent') return !incoming && !bills.includes(t.type);
      if (filter === 'received') return incoming;
      if (filter === 'bills') return bills.includes(t.type);
      return true;
    });
    const map = new Map<string, typeof items>();
    for (const t of items) {
      const k = relativeDay(toDate(t.createdAt)) || 'Pending';
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.entries()];
  }, [all, filter, user?.uid]);

  return (
    <Screen>
      <Text weight="bold" size={22} accessibilityRole="header" style={{ marginTop: 6 }}>Activity</Text>
      <Segmented value={filter} onChange={setFilter} options={[
        { label: 'All', value: 'all' }, { label: 'Sent', value: 'sent' }, { label: 'Received', value: 'received' }, { label: 'Bills', value: 'bills' },
      ]} />
      {all !== undefined && groups.length === 0 && <Empty icon="activity" text="Nothing here yet." />}
      {groups.map(([day, items]) => (
        <View key={day} style={{ gap: 8 }}>
          <Text weight="semibold" size={12} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>{day}</Text>
          <TxList items={items} />
        </View>
      ))}
    </Screen>
  );
}
