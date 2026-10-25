import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatMinor, POLICY } from '@air-wallet/core';
import { api } from '@/lib/api';
import { amountField, toMinor } from '@/lib/forms';
import { useBillers, useWallets } from '@/lib/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { AmountInput, Button, Field, Header, Notice, Screen, SummaryRow, Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Done, ReviewCard, useMoneyFlow } from '@/components/flow';

const schema = z.object({
  account: z.string().trim().min(4, 'Enter the account / meter number').max(32),
  amount: amountField(POLICY.bill.minMinor, POLICY.bill.maxMinor),
});
type Form = z.infer<typeof schema>;

export default function PayBill() {
  const { colors } = useTheme();
  const billers = useBillers().data ?? [];
  const balance = useWallets().data?.find((w) => w.currency === 'BDT')?.balanceMinor ?? 0;
  const [billerId, setBillerId] = useState<string | null>(null);
  const biller = billers.find((b) => b.id === billerId);
  const flow = useMoneyFlow<{ transactionId: string }>();
  const { control, handleSubmit, watch, setError } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { account: '', amount: '' } });
  const v = watch();
  const minor = toMinor(v.amount);

  const next = handleSubmit((f) => {
    if (toMinor(f.amount) > balance) return setError('amount', { message: 'Not enough balance' });
    flow.review();
  });

  if (flow.step === 'done') return <Screen><Done title="Bill paid" subtitle={`${biller?.name} · ${formatMinor(minor, 'BDT')}`} /></Screen>;

  if (!biller)
    return (
      <Screen>
        <Header title="Pay bill" />
        <Text color={colors.muted}>Choose a biller</Text>
        <View style={{ gap: 8 }}>
          {billers.map((b) => (
            <Pressable key={b.id} onPress={() => setBillerId(b.id)} accessibilityRole="button" accessibilityLabel={b.name}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 }}>
              <Icon name="bill" size={24} color={colors.primary} />
              <Text weight="medium" style={{ flex: 1 }}>{b.name}</Text>
              <Icon name="chevron" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
        <Notice tone="warning" text="Demo billers: payments settle inside Air Wallet until a biller aggregator is connected." />
      </Screen>
    );

  return (
    <Screen>
      <Header title={biller.name} />
      {flow.step === 'review' ? (
        <ReviewCard busy={flow.busy} error={flow.error} onEdit={flow.edit} confirmLabel="Pay bill"
          onConfirm={() => flow.confirm((idempotencyKey) => api.payBill({ billerId: biller.id, accountNumber: v.account, amountMinor: minor, idempotencyKey }))}>
          <SummaryRow label="Biller" value={biller.name} />
          <SummaryRow label={biller.accountLabel} value={v.account} />
          <SummaryRow label="Fee" value={formatMinor(0, 'BDT')} />
          <SummaryRow label="Total" value={formatMinor(minor, 'BDT')} strong />
        </ReviewCard>
      ) : (
        <>
          <Controller control={control} name="account" render={({ field, fieldState }) => (
            <Field label={biller.accountLabel} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
          )} />
          <Controller control={control} name="amount" render={({ field, fieldState }) => (
            <AmountInput value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} label="Bill amount (BDT)" />
          )} />
          <Text size={13} color={colors.muted} style={{ textAlign: 'center' }}>Available {formatMinor(balance, 'BDT')}</Text>
          <Button title="Review" onPress={next} />
          <Button title="Choose another biller" variant="secondary" onPress={() => setBillerId(null)} />
        </>
      )}
    </Screen>
  );
}
