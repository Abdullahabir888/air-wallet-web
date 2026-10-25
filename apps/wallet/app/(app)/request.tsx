import { useState } from 'react';
import { View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatMinor, POLICY } from '@air-wallet/core';
import { recipient } from '@air-wallet/validation';
import { api, errorMessage, newKey } from '@/lib/api';
import { amountField, toMinor, relativeDay } from '@/lib/forms';
import { useRequests, toDate } from '@/lib/hooks';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { AmountInput, Button, Card, Empty, Field, Header, Notice, Screen, Text } from '@/components/ui';

const schema = z.object({
  from: z.string().refine((v) => recipient.safeParse(v).success, 'Enter a valid email or 01XXXXXXXXX'),
  amount: amountField(POLICY.request.minMinor, POLICY.request.maxMinor),
  note: z.string().max(140).optional(),
});
type Form = z.infer<typeof schema>;

export default function RequestMoney() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const requests = useRequests().data ?? [];
  const [msg, setMsg] = useState<{ t: string; tone: 'danger' | 'success' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { from: '', amount: '', note: '' } });

  const send = handleSubmit(async (f) => {
    setMsg(null);
    try {
      await api.requestMoney({ from: f.from, amountMinor: toMinor(f.amount), note: f.note });
      reset();
      setMsg({ t: 'Request sent.', tone: 'success' });
    } catch (e) {
      setMsg({ t: errorMessage(e), tone: 'danger' });
    }
  });

  const respond = async (id: string, action: 'pay' | 'decline' | 'cancel') => {
    setBusyId(id + action);
    setMsg(null);
    try {
      await api.respondRequest({ requestId: id, action, idempotencyKey: action === 'pay' ? newKey() : undefined });
      if (action === 'pay') setMsg({ t: 'Paid.', tone: 'success' });
    } catch (e) {
      setMsg({ t: errorMessage(e), tone: 'danger' });
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDING');
  const toMe = pending.filter((r) => r.payerUid === user?.uid);
  const mine = requests.filter((r) => r.requesterUid === user?.uid).slice(0, 10);

  return (
    <Screen>
      <Header title="Request money" />
      <Controller control={control} name="from" render={({ field, fieldState }) => (
        <Field label="From (email or mobile)" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="amount" render={({ field, fieldState }) => (
        <AmountInput value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} label="BDT" />
      )} />
      <Controller control={control} name="note" render={({ field }) => (
        <Field label="Reason" value={field.value} onChangeText={field.onChange} maxLength={140} placeholder="Movie tickets" />
      )} />
      <Button title="Send request" onPress={send} loading={formState.isSubmitting} />
      {msg ? <Notice text={msg.t} tone={msg.tone} /> : null}

      <Text weight="bold" size={16}>Waiting on you</Text>
      {toMe.length === 0 ? <Empty icon="request" text="No requests waiting." /> : (
        <Card style={{ paddingVertical: 4 }}>
          {toMe.map((r, i) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <View style={{ flex: 1 }}>
                <Text weight="medium">{r.requesterName} · {formatMinor(r.amountMinor, 'BDT')}</Text>
                <Text size={12} color={colors.muted}>{r.note ? `“${r.note}” · ` : ''}{relativeDay(toDate(r.createdAt))}</Text>
              </View>
              <View style={{ width: 84 }}><Button title="Decline" variant="secondary" onPress={() => respond(r.id, 'decline')} loading={busyId === r.id + 'decline'} /></View>
              <View style={{ width: 70 }}><Button title="Pay" onPress={() => respond(r.id, 'pay')} loading={busyId === r.id + 'pay'} /></View>
            </View>
          ))}
        </Card>
      )}

      <Text weight="bold" size={16}>You requested</Text>
      {mine.length === 0 ? <Empty icon="request" text="You haven't requested money yet." /> : (
        <Card style={{ paddingVertical: 4 }}>
          {mine.map((r, i) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <View style={{ flex: 1 }}>
                <Text weight="medium">{r.payerName} · {formatMinor(r.amountMinor, 'BDT')}</Text>
                <Text size={12} color={colors.muted}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()} · {relativeDay(toDate(r.createdAt))}</Text>
              </View>
              {r.status === 'PENDING' ? (
                <Text weight="semibold" color={colors.primary} onPress={() => respond(r.id, 'cancel')} accessibilityRole="button">Cancel</Text>
              ) : null}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
