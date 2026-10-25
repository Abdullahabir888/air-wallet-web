import { useState } from 'react';
import type { TxType } from '@air-wallet/core';
import { useAdminTransactions, useAdminUsers } from '@/lib/admin';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Empty, Pills, Screen, Text } from '@/components/ui';
import { AdminNav, AdminTxRow, namesOf, Rows, TX_TYPE_LABEL } from '@/components/admin';

const TYPES: (TxType | 'ALL')[] = ['ALL', 'TRANSFER', 'REQUEST_PAYMENT', 'BILL_PAYMENT', 'RECHARGE', 'CASH_OUT_AGENT', 'CASH_OUT_ATM', 'EXCHANGE', 'CREDIT', 'REVERSAL'];
const PAGE = 50;

export default function AdminTransactions() {
  const { colors } = useTheme();
  const [type, setType] = useState<TxType | 'ALL'>('ALL');
  const [max, setMax] = useState(PAGE);
  const tx = useAdminTransactions({ type: type === 'ALL' ? undefined : type, max }).data;
  const names = namesOf(useAdminUsers(200).data);

  return (
    <Screen maxWidth={900}>
      <AdminNav />
      <Pills
        selected={type}
        onPick={(v) => {
          setType(v as TxType | 'ALL');
          setMax(PAGE);
        }}
        options={TYPES.map((t) => ({ value: t, label: t === 'ALL' ? 'All' : TX_TYPE_LABEL[t] }))}
      />
      {tx === undefined ? null : tx.length === 0 ? (
        <Empty icon="activity" text="No transactions of this type yet." />
      ) : (
        <>
          <Text size={12} color={colors.muted}>Newest first. New transactions appear here as they happen.</Text>
          <Rows items={tx} render={(t) => <AdminTxRow tx={t} names={names} />} />
          {tx.length >= max && <Button title="Show more" variant="secondary" onPress={() => setMax((m) => m + PAGE)} />}
        </>
      )}
    </Screen>
  );
}
