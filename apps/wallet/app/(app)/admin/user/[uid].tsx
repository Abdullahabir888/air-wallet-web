import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { formatMinor, CURRENCIES, type CurrencyCode } from '@air-wallet/core';
import { api, errorMessage } from '@/lib/api';
import { toMinor } from '@/lib/forms';
import { toDate } from '@/lib/hooks';
import { useAuth } from '@/providers/AuthProvider';
import {
  useAdminAudit,
  useAdminTransactions,
  useAdminUser,
  useAdminUserCard,
  useAdminUserWallets,
  useAdminUsers,
} from '@/lib/admin';
import { useTheme } from '@/theme/ThemeProvider';
import { cardStyles } from '@/theme/tokens';
import { Button, Card, Empty, Field, Loading, Notice, Screen, Segmented, SummaryRow, Text } from '@/components/ui';
import { ReviewCard, useMoneyFlow } from '@/components/flow';
import { AdminNav, AdminTxRow, AuditRow, Avatar, ConfirmCard, namesOf, Rows, StatusBadge } from '@/components/admin';

/** Same cap the server enforces in adminCreditInput. */
const MAX_CREDIT_MINOR = 1_000_000_00;

function CreditMoney({ wallets, name }: { wallets: { id: string; currency: CurrencyCode }[]; name: string }) {
  const { colors } = useTheme();
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const [done, setDone] = useState('');
  const flow = useMoneyFlow<{ transactionId: string }>();
  const wallet = wallets.find((w) => w.id === walletId) ?? wallets[0];
  if (!wallet) return <Notice text="This user has no wallets yet." />;
  const minor = toMinor(amount, wallet.currency);

  const review = () => {
    const e: typeof errors = {};
    if (minor <= 0) e.amount = 'Enter an amount.';
    else if (minor > MAX_CREDIT_MINOR) e.amount = `Maximum is ${formatMinor(MAX_CREDIT_MINOR, wallet.currency)}.`;
    if (reason.trim().length < 3) e.reason = 'Say why, so the audit log makes sense.';
    setErrors(e);
    setDone('');
    if (!Object.keys(e).length) flow.review();
  };

  if (flow.step === 'review') {
    return (
      <ReviewCard
        confirmLabel={`Add ${formatMinor(minor, wallet.currency)}`}
        error={flow.error}
        busy={flow.busy}
        onEdit={flow.edit}
        onConfirm={() =>
          flow.confirm(async (key) => {
            const r = await api.adminCreditWallet({ walletId: wallet.id, amountMinor: minor, reason: reason.trim(), idempotencyKey: key });
            setDone(`Added ${formatMinor(minor, wallet.currency)} to ${name}'s ${wallet.currency} wallet.`);
            setAmount('');
            setReason('');
            return r;
          })
        }
      >
        <SummaryRow label="To" value={`${name}, ${wallet.currency} wallet`} />
        <SummaryRow label="Amount" value={formatMinor(minor, wallet.currency)} strong />
        <SummaryRow label="Reason" value={reason.trim()} />
        <Text size={12} color={colors.muted} style={{ marginTop: 6 }}>Logged in the audit log under your name. The user sees it right away.</Text>
      </ReviewCard>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {wallets.length > 1 && (
        <Segmented value={walletId} onChange={setWalletId} options={wallets.map((w) => ({ label: w.currency, value: w.id }))} />
      )}
      <Field
        label={`Amount (${CURRENCIES[wallet.currency].symbol})`}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
        error={errors.amount}
      />
      <Field label="Reason" placeholder="e.g. Refund for failed bill payment" value={reason} onChangeText={setReason} error={errors.reason} maxLength={200} />
      <Button title="Review" variant="secondary" onPress={review} />
      {done ? <Notice text={done} tone="success" /> : null}
    </View>
  );
}

export default function AdminUserDetail() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { colors } = useTheme();
  const { user: me } = useAuth();
  const user = useAdminUser(uid);
  const wallets = useAdminUserWallets(uid).data;
  const card = useAdminUserCard(uid).data;
  const tx = useAdminTransactions({ uid, max: 20 }).data;
  const audit = useAdminAudit({ targetUid: uid, max: 20 }).data;
  const names = namesOf(useAdminUsers(200).data);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: 'success' | 'danger' } | null>(null);

  if (user.loading) return <Loading />;
  const u = user.data;
  if (!u) {
    return (
      <Screen maxWidth={900}>
        <AdminNav />
        <Empty icon="user" text="This user doesn't exist." />
      </Screen>
    );
  }

  if (uid) names[uid] = u.displayName || u.email;
  const isMe = me?.uid === u.id;
  const suspended = u.status === 'suspended';
  const joined = toDate(u.createdAt);

  const setStatus = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.adminSetUserStatus({ uid: u.id, status: suspended ? 'active' : 'suspended' });
      setMsg({ t: suspended ? `${u.displayName} can use Air Wallet again.` : `${u.displayName} is suspended and signed out everywhere.`, tone: 'success' });
      setConfirm(false);
    } catch (e) {
      setMsg({ t: errorMessage(e), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen maxWidth={900}>
      <AdminNav />

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={u.displayName || u.email} size={52} />
          <View style={{ flex: 1 }}>
            <Text weight="bold" size={18} numberOfLines={1}>{u.displayName || 'No name'}</Text>
            <Text size={13} color={colors.muted} numberOfLines={1}>{u.email}</Text>
          </View>
          <StatusBadge status={u.status} />
        </View>
        <View>
          <SummaryRow label="Mobile" value={u.phone ?? 'Not added'} />
          <SummaryRow label="Joined" value={joined ? joined.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          <SummaryRow label="User ID" value={u.id} />
        </View>
        <Button title="Copy user ID" variant="secondary" icon="copy" onPress={() => Clipboard.setStringAsync(u.id)} />
      </Card>

      <Text weight="bold" size={16}>Wallets</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(wallets ?? []).map((w) => (
          <Card key={w.id} style={{ flex: 1, minWidth: 140, gap: 2 }}>
            <Text size={12} color={colors.muted}>{w.currency}{w.status === 'frozen' ? ' · frozen' : ''}</Text>
            <Text weight="bold" size={18}>{formatMinor(w.balanceMinor, w.currency)}</Text>
          </Card>
        ))}
        {wallets && wallets.length === 0 && <Text color={colors.muted}>No wallets yet.</Text>}
      </View>

      {card ? (
        <Card style={{ gap: 2 }}>
          <SummaryRow label="Virtual card" value={`${cardStyles[card.style].name} ·· ${card.last4}`} />
          <SummaryRow label="Card status" value={card.status === 'FROZEN' ? 'Frozen by owner' : 'Active'} />
          <SummaryRow label="Online / international" value={`${card.onlineEnabled ? 'On' : 'Off'} / ${card.internationalEnabled ? 'On' : 'Off'}`} />
        </Card>
      ) : null}

      <Text weight="bold" size={16}>Account</Text>
      {isMe ? (
        <Notice text="This is your own account. Another admin has to change its status." />
      ) : confirm ? (
        <ConfirmCard
          title={suspended ? `Reactivate ${u.displayName}?` : `Suspend ${u.displayName}?`}
          body={suspended
            ? 'They can sign in and move money again.'
            : "They're signed out on every device and can't send, pay or cash out. Their balance stays as it is."}
          confirmLabel={suspended ? 'Reactivate account' : 'Suspend account'}
          tone={suspended ? 'primary' : 'danger'}
          busy={busy}
          onConfirm={setStatus}
          onCancel={() => setConfirm(false)}
        />
      ) : (
        <Button title={suspended ? 'Reactivate account' : 'Suspend account'} variant={suspended ? 'primary' : 'danger'} icon={suspended ? 'check' : 'lock'}
          onPress={() => { setMsg(null); setConfirm(true); }} />
      )}
      {msg ? <Notice text={msg.t} tone={msg.tone} /> : null}

      <Text weight="bold" size={16}>Add money</Text>
      <Card style={{ gap: 4 }}>
        <Text size={13} color={colors.muted}>For refunds and support credits. Comes from the Air Wallet funding account.</Text>
      </Card>
      {wallets ? <CreditMoney wallets={wallets} name={u.displayName || u.email} /> : null}

      <Text weight="bold" size={16}>Transactions</Text>
      {tx === undefined ? null : tx.length ? <Rows items={tx} render={(t) => <AdminTxRow tx={t} names={names} />} /> : <Empty icon="activity" text="No transactions yet." />}

      <Text weight="bold" size={16}>Admin history</Text>
      {audit === undefined ? null : audit.length ? <Rows items={audit} render={(a) => <AuditRow a={a} names={names} />} /> : <Empty icon="lock" text="No admin actions on this account." />}
    </Screen>
  );
}
