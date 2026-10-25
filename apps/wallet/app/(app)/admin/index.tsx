import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { formatMinor } from '@air-wallet/core';
import { useAdminAudit, useAdminStats, useAdminTransactions, useAdminUsers } from '@/lib/admin';
import { useTheme } from '@/theme/ThemeProvider';
import { Empty, Loading, Screen, Text } from '@/components/ui';
import { AdminNav, AdminTxRow, AuditRow, namesOf, Rows, Stat, UserRow } from '@/components/admin';
import { useWindowDimensions } from 'react-native';

function SectionHead({ title, href, link }: { title: string; href: Parameters<typeof router.push>[0]; link: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
      <Text weight="bold" size={16}>{title}</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push(href)}>
        <Text weight="semibold" color={colors.primary}>{link}</Text>
      </Pressable>
    </View>
  );
}

const n = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString());

export default function AdminOverview() {
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const stats = useAdminStats().data;
  const users = useAdminUsers(200).data;
  const tx = useAdminTransactions({ max: 8 }).data;
  const audit = useAdminAudit({ max: 6 }).data;
  const names = namesOf(users);

  if (!stats && !users) return <Loading />;

  const newest = (users ?? []).slice(0, 5);

  return (
    <Screen maxWidth={1100}>
      <AdminNav />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Users" value={n(stats?.users)} sub="all accounts" onPress={() => router.push('/admin/users')} />
        <Stat label="Suspended" value={n(stats?.suspended)} sub="locked out" onPress={() => router.push({ pathname: '/admin/users', params: { status: 'suspended' } })} />
        <Stat label="Transactions, 24 h" value={`${n(stats?.tx24h)}${stats?.capped ? '+' : ''}`} sub="all types" onPress={() => router.push('/admin/transactions')} />
        <Stat label="Taka moved, 24 h" value={stats ? formatMinor(stats.bdtVolume24h, 'BDT') : '—'} sub="BDT transactions" />
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1.3 : undefined, width: wide ? undefined : '100%', gap: 10 }}>
          <SectionHead title="Latest transactions" href="/admin/transactions" link="See all" />
          {tx === undefined ? null : tx.length ? (
            <Rows items={tx} render={(t) => <AdminTxRow tx={t} names={names} />} />
          ) : (
            <Empty icon="activity" text="No transactions yet." />
          )}
        </View>

        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', gap: 10 }}>
          <SectionHead title="New users" href="/admin/users" link="All users" />
          {newest.length ? <Rows items={newest} render={(u) => <UserRow u={u} />} /> : <Empty icon="user" text="No users yet." />}

          <SectionHead title="Admin actions" href="/admin/audit" link="Audit log" />
          {audit === undefined ? null : audit.length ? (
            <Rows items={audit} render={(a) => <AuditRow a={a} names={names} />} />
          ) : (
            <Empty icon="lock" text="No admin actions yet." />
          )}
        </View>
      </View>
    </Screen>
  );
}
