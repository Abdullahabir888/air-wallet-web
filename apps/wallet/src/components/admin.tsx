import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { formatMinor, isCurrency, type CurrencyCode, type TransactionDoc, type UserDoc } from '@air-wallet/core';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { relativeDay } from '@/lib/forms';
import { toDate, type WithId } from '@/lib/hooks';
import { auditDate, describeAudit, type AuditDoc } from '@/lib/admin';
import { Button, Card, Text } from './ui';
import { Icon } from './Icon';
import { Icon3D, type Icon3DName } from './Icon3D';

const TABS: { label: string; href: Href; match: string }[] = [
  { label: 'Overview', href: '/admin', match: '/admin' },
  { label: 'Users', href: '/admin/users', match: '/admin/user' },
  { label: 'Transactions', href: '/admin/transactions', match: '/admin/transactions' },
  { label: 'Audit log', href: '/admin/audit', match: '/admin/audit' },
];

/** Section switcher shown at the top of every admin screen. Same on web, Android and iOS. */
export function AdminNav() {
  const { colors } = useTheme();
  const path = usePathname();
  const active = [...TABS].reverse().find((t) => path.startsWith(t.match))?.match ?? '/admin';
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave admin panel"
          onPress={() => router.replace('/settings')}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={20} color={colors.ink} />
        </Pressable>
        <Text weight="bold" size={20} accessibilityRole="header" style={{ flex: 1 }}>Admin</Text>
        <View style={{ backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
          <Text weight="semibold" size={12} color={colors.primary}>Live</Text>
        </View>
      </View>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TABS.map((t) => {
          const on = t.match === active;
          return (
            <Pressable key={t.match} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}
              onPress={() => router.replace(t.href)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? colors.ink : colors.card }}>
              <Text weight="semibold" size={13} color={on ? colors.bg : colors.muted}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Stat({ label, value, sub, onPress }: { label: string; value: string; sub?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const body = (
    <Card style={{ gap: 2, flex: 1, minWidth: 150 }}>
      <Text size={12} color={colors.muted}>{label}</Text>
      <Text weight="bold" size={22}>{value}</Text>
      {sub ? <Text size={11} color={colors.muted}>{sub}</Text> : null}
    </Card>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={{ flex: 1, minWidth: 150 }}>{body}</Pressable>
  ) : body;
}

export function StatusBadge({ status }: { status: UserDoc['status'] | TransactionDoc['status'] }) {
  const { colors } = useTheme();
  const good = status === 'active' || status === 'COMPLETED';
  const bad = status === 'suspended' || status === 'FAILED';
  const c = good ? colors.success : bad ? colors.danger : colors.warning;
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return (
    <View style={{ backgroundColor: `${c}1F`, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text weight="semibold" size={11} color={c}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text weight="bold" size={size * 0.36} color={colors.primary}>{initials}</Text>
    </View>
  );
}

export function UserRow({ u }: { u: WithId<UserDoc> }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${u.displayName}, ${u.status}`}
      onPress={() => router.push({ pathname: '/admin/user/[uid]', params: { uid: u.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <Avatar name={u.displayName || u.email} />
      <View style={{ flex: 1 }}>
        <Text weight="medium" size={14} numberOfLines={1}>{u.displayName || 'No name'}</Text>
        <Text size={12} color={colors.muted} numberOfLines={1}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</Text>
      </View>
      <StatusBadge status={u.status} />
    </Pressable>
  );
}

export function Rows<T extends { id: string }>({ items, render }: { items: T[]; render: (t: T) => ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card style={{ paddingVertical: 2 }}>
      {items.map((t, i) => (
        <View key={t.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>{render(t)}</View>
      ))}
    </Card>
  );
}

const txIcon: Record<TransactionDoc['type'], Icon3DName> = {
  TRANSFER: 'send', REQUEST_PAYMENT: 'request', BILL_PAYMENT: 'bill', RECHARGE: 'recharge',
  CASH_OUT_AGENT: 'cashout', CASH_OUT_ATM: 'atm', ATM_RELEASE: 'atm', EXCHANGE: 'exchange', CREDIT: 'request', REVERSAL: 'exchange',
};

export const TX_TYPE_LABEL: Record<TransactionDoc['type'], string> = {
  TRANSFER: 'Send money', REQUEST_PAYMENT: 'Request paid', BILL_PAYMENT: 'Bill', RECHARGE: 'Recharge',
  CASH_OUT_AGENT: 'Agent cash out', CASH_OUT_ATM: 'ATM cash out', ATM_RELEASE: 'ATM refund', EXCHANGE: 'Exchange',
  CREDIT: 'Admin credit', REVERSAL: 'Reversal',
};

/** Who did what, from a neutral point of view: "Rafi K. → Abir A." */
export function txParties(tx: TransactionDoc, names: Record<string, string>) {
  const sender = tx.createdBy;
  const other = tx.participants.find((p) => p !== sender);
  const nameOf = (uid: string | undefined, fallbackFrom?: string) =>
    (uid && names[uid]) || (fallbackFrom ? tx.counterparty?.[fallbackFrom] : undefined) || 'Air Wallet user';
  if ((tx.type === 'TRANSFER' || tx.type === 'REQUEST_PAYMENT') && other) {
    return `${nameOf(sender, other)} → ${nameOf(other, sender)}`;
  }
  const owner = tx.type === 'CREDIT' ? tx.participants[0] : sender;
  return nameOf(owner);
}

export function AdminTxRow({ tx, names }: { tx: WithId<TransactionDoc>; names: Record<string, string> }) {
  const { colors } = useTheme();
  const who = txParties(tx, names);
  const reversed = tx.status === 'REVERSED';
  return (
    <Pressable onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: tx.id } })} accessibilityRole="button"
      accessibilityLabel={`${TX_TYPE_LABEL[tx.type]}, ${who}, ${formatMinor(tx.amountMinor, tx.currency)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' }}>
        <Icon3D name={txIcon[tx.type]} size={24} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="medium" size={14} numberOfLines={1}>{who}</Text>
        <Text size={12} color={colors.muted} numberOfLines={1}>
          {TX_TYPE_LABEL[tx.type]} · {relativeDay(toDate(tx.createdAt)) || 'Processing'}{tx.status !== 'COMPLETED' ? ` · ${tx.status.toLowerCase()}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text weight="semibold" size={14} color={reversed ? colors.muted : colors.ink} style={reversed ? { textDecorationLine: 'line-through' } : undefined}>
          {formatMinor(tx.amountMinor, tx.currency)}
        </Text>
        {tx.feeMinor > 0 ? <Text size={11} color={colors.muted}>fee {formatMinor(tx.feeMinor, tx.currency)}</Text> : null}
      </View>
    </Pressable>
  );
}

export function AuditRow({ a, names }: { a: WithId<AuditDoc>; names: Record<string, string> }) {
  const { colors } = useTheme();
  const { title, detail } = describeAudit(a);
  const who = a.actorUid === 'system' ? 'System' : names[a.actorUid] ?? 'Admin';
  const target = a.targetUid ? names[a.targetUid] ?? 'a user' : null;
  const when = auditDate(a);
  const cur = isCurrency(String(a.details?.currency ?? '')) ? (a.details.currency as CurrencyCode) : 'BDT';
  const amount = typeof a.details?.amountMinor === 'number' ? formatMinor(a.details.amountMinor, cur) : null;
  return (
    <Pressable
      disabled={!a.targetUid}
      onPress={() => a.targetUid && router.push({ pathname: '/admin/user/[uid]', params: { uid: a.targetUid } })}
      accessibilityRole={a.targetUid ? 'button' : 'text'}
      style={{ paddingVertical: 12, gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text weight="medium" size={14} style={{ flex: 1 }}>{title}{target ? ` · ${target}` : ''}</Text>
        {amount && a.action === 'wallet.credit' ? <Text weight="semibold" size={14} color={colors.success}>+{amount}</Text> : null}
      </View>
      <Text size={12} color={colors.muted}>
        By {who}{when ? ` · ${relativeDay(when)} ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}{detail ? ` · ${detail}` : ''}
      </Text>
    </Pressable>
  );
}

/** Two-step confirm for actions that affect someone else's account. */
export function ConfirmCard({ title, body, confirmLabel, tone = 'danger', busy, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; tone?: 'danger' | 'primary'; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 12, borderWidth: 1.5, borderColor: tone === 'danger' ? colors.danger : colors.primary }}>
      <Text weight="semibold" size={15}>{title}</Text>
      <Text size={13} color={colors.muted}>{body}</Text>
      <Button title={confirmLabel} variant={tone === 'danger' ? 'danger' : 'primary'} onPress={onConfirm} loading={busy} />
      <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={busy} />
    </Card>
  );
}

/** uid → display name, from whatever user list is loaded. */
export function namesOf(users: WithId<UserDoc>[] | undefined): Record<string, string> {
  const m: Record<string, string> = {};
  for (const u of users ?? []) m[u.id] = u.displayName || u.email;
  return m;
}
