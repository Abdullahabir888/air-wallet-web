import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { formatMinor } from '@air-wallet/core';
import { useTransaction, toDate } from '@/lib/hooks';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, Header, Loading, Screen, SummaryRow, Text, Button } from '@/components/ui';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user, admin } = useAuth();
  const { data: tx, loading } = useTransaction(id);
  if (loading) return <Loading />;
  if (!tx) return <Screen><Header title="Transaction" /><Text color={colors.muted}>Not found.</Text></Screen>;

  const when = toDate(tx.createdAt);
  const meta = Object.entries(tx.meta ?? {}).filter(([k]) => !['codeId', 'quoteId', 'settlement', 'portedGuess'].includes(k));
  return (
    <Screen>
      <Header title="Transaction" />
      <Card style={{ alignItems: 'center', gap: 6 }}>
        <Text size={13} color={colors.muted}>{tx.title}</Text>
        <Text weight="bold" size={30}>{formatMinor(tx.amountMinor, tx.currency)}</Text>
        {tx.toAmountMinor && tx.toCurrency ? <Text color={colors.muted}>→ {formatMinor(tx.toAmountMinor, tx.toCurrency)}</Text> : null}
        <Text size={12} weight="semibold" color={tx.status === 'COMPLETED' ? colors.success : tx.status === 'REVERSED' ? colors.muted : colors.warning}>{tx.status}</Text>
      </Card>
      <Card style={{ gap: 2 }}>
        <SummaryRow label="Type" value={tx.type.replace(/_/g, ' ').toLowerCase()} />
        {tx.counterparty?.[user?.uid ?? ''] ? <SummaryRow label="With" value={tx.counterparty[user!.uid]!} /> : null}
        {admin && !tx.participants.includes(user?.uid ?? '') && tx.counterparty ? (
          <SummaryRow label="Between" value={Object.values(tx.counterparty).join(' and ')} />
        ) : null}
        {tx.subtitle ? <SummaryRow label="Details" value={tx.subtitle} /> : null}
        {tx.rate ? <SummaryRow label="Rate" value={`৳${tx.rate}`} /> : null}
        <SummaryRow label="Fee" value={formatMinor(tx.feeMinor, tx.currency)} />
        {tx.note ? <SummaryRow label="Note" value={tx.note} /> : null}
        {meta.map(([k, v]) => <SummaryRow key={k} label={k} value={String(v)} />)}
        <SummaryRow label="Date" value={when ? when.toLocaleString() : 'Processing'} />
        <SummaryRow label="Transaction ID" value={tx.id} />
      </Card>
      <Button title="Copy transaction ID" variant="secondary" icon="copy" onPress={() => Clipboard.setStringAsync(tx.id)} />
    </Screen>
  );
}
