import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatMinor, POLICY } from '@air-wallet/core';
import { recipient } from '@air-wallet/validation';
import { api } from '@/lib/api';
import { amountField, toMinor } from '@/lib/forms';
import { useWallets } from '@/lib/hooks';
import { AmountInput, Button, Field, Header, Pills, Screen, SummaryRow, Text } from '@/components/ui';
import { Done, ReviewCard, useMoneyFlow } from '@/components/flow';
import { useTheme } from '@/theme/ThemeProvider';

const schema = z.object({
  to: z.string().min(1, 'Enter an email or mobile number').refine((v) => recipient.safeParse(v).success, 'Enter a valid email or 01XXXXXXXXX'),
  amount: amountField(POLICY.transfer.minMinor, POLICY.transfer.maxMinor),
  note: z.string().max(140).optional(),
});
type Form = z.infer<typeof schema>;

export default function Send() {
  const { colors } = useTheme();
  const balance = useWallets().data?.find((w) => w.currency === 'BDT')?.balanceMinor ?? 0;
  const flow = useMoneyFlow<{ transactionId: string }>();
  const { control, handleSubmit, setValue, watch, setError } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { to: '', amount: '', note: '' } });
  const v = watch();
  const minor = toMinor(v.amount);

  const next = handleSubmit((f) => {
    if (toMinor(f.amount) > balance) return setError('amount', { message: 'Not enough balance' });
    flow.review();
  });

  if (flow.step === 'done')
    return <Screen><Done title={`${formatMinor(minor, 'BDT')} sent`} subtitle={`To ${v.to}`} /></Screen>;

  return (
    <Screen>
      <Header title="Send money" />
      {flow.step === 'review' ? (
        <ReviewCard busy={flow.busy} error={flow.error} onEdit={flow.edit} confirmLabel="Send now"
          onConfirm={() => flow.confirm((idempotencyKey) => api.transfer({ to: v.to, amountMinor: minor, note: v.note, idempotencyKey }))}>
          <SummaryRow label="To" value={v.to} />
          <SummaryRow label="Amount" value={formatMinor(minor, 'BDT')} />
          <SummaryRow label="Fee" value={formatMinor(0, 'BDT')} />
          {v.note ? <SummaryRow label="Note" value={v.note} /> : null}
          <SummaryRow label="Total" value={formatMinor(minor, 'BDT')} strong />
        </ReviewCard>
      ) : (
        <>
          <Controller control={control} name="to" render={({ field, fieldState }) => (
            <Field label="To (email or mobile)" autoCapitalize="none" placeholder="rafi@example.com or 01XXXXXXXXX"
              value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
          <Controller control={control} name="amount" render={({ field, fieldState }) => (
            <AmountInput value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} label="BDT" />
          )} />
          <Text size={13} color={colors.muted} style={{ textAlign: 'center' }}>Available {formatMinor(balance, 'BDT')} · No fees · Arrives instantly</Text>
          <Pills selected={v.amount} onPick={(a) => setValue('amount', a, { shouldValidate: true })}
            options={['500', '1000', '2000', '5000'].map((a) => ({ label: `৳${Number(a).toLocaleString()}`, value: a }))} />
          <Controller control={control} name="note" render={({ field }) => (
            <Field label="Note (optional)" value={field.value} onChangeText={field.onChange} maxLength={140} />
          )} />
          <Button title="Review transfer" onPress={next} />
        </>
      )}
    </Screen>
  );
}
