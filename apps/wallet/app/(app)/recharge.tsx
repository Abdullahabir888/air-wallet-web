import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { OPERATORS, OPERATOR_IDS, POLICY, detectOperator, formatMinor, maskMobile, normalizeBdMobile, type OperatorId } from '@air-wallet/core';
import { api } from '@/lib/api';
import { toMinor } from '@/lib/forms';
import { useProfile, useWallets } from '@/lib/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button, Card, Field, Header, Notice, Screen, Segmented, SummaryRow, Text } from '@/components/ui';
import { Done, ReviewCard, useMoneyFlow } from '@/components/flow';

const AMOUNTS = ['20', '50', '100', '200', '300', '500', '1000'];

export default function Recharge() {
  const { colors } = useTheme();
  const profile = useProfile().data;
  const balance = useWallets().data?.find((w) => w.currency === 'BDT')?.balanceMinor ?? 0;
  const [number, setNumber] = useState('');
  const [op, setOp] = useState<OperatorId | null>(null);
  const [conn, setConn] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [amount, setAmount] = useState('100');
  const [other, setOther] = useState(false);
  const [err, setErr] = useState('');
  const flow = useMoneyFlow<{ transactionId: string }>();

  useEffect(() => { if (!number && profile?.phone) setNumber(profile.phone); }, [profile?.phone]);
  useEffect(() => { const d = detectOperator(number); if (d) setOp(d); }, [number]);

  const msisdn = normalizeBdMobile(number);
  const minor = toMinor(amount);

  const next = () => {
    setErr('');
    if (!msisdn) return setErr('Enter a valid mobile number (01XXXXXXXXX).');
    if (!op) return setErr('Choose the operator.');
    if (minor < POLICY.recharge.minMinor || minor > POLICY.recharge.maxMinor)
      return setErr(`Recharge between ${formatMinor(POLICY.recharge.minMinor, 'BDT')} and ${formatMinor(POLICY.recharge.maxMinor, 'BDT')}.`);
    if (minor > balance) return setErr('Not enough balance.');
    flow.review();
  };

  if (flow.step === 'done' && msisdn && op)
    return <Screen><Done title="Recharge successful" subtitle={`${formatMinor(minor, 'BDT')} to ${maskMobile(msisdn)} · ${OPERATORS[op].name}`} /></Screen>;

  return (
    <Screen>
      <Header title="Mobile recharge" />
      {flow.step === 'review' && msisdn && op ? (
        <ReviewCard busy={flow.busy} error={flow.error} onEdit={flow.edit} confirmLabel="Recharge now"
          onConfirm={() => flow.confirm((idempotencyKey) => api.recharge({ msisdn, operator: op, connection: conn, amountMinor: minor, idempotencyKey }))}>
          <SummaryRow label="Number" value={msisdn} />
          <SummaryRow label="Operator" value={`${OPERATORS[op].name} · ${conn}`} />
          <SummaryRow label="Fee" value={formatMinor(0, 'BDT')} />
          <SummaryRow label="You pay" value={formatMinor(minor, 'BDT')} strong />
        </ReviewCard>
      ) : (
        <>
          <Field label="Mobile number" keyboardType="phone-pad" value={number} onChangeText={setNumber} placeholder="01XXXXXXXXX" />
          <Segmented value={conn} onChange={setConn} options={[{ label: 'Prepaid', value: 'prepaid' }, { label: 'Postpaid', value: 'postpaid' }]} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {OPERATOR_IDS.map((id) => {
              const o = OPERATORS[id];
              const on = op === id;
              return (
                <Pressable key={id} onPress={() => setOp(id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.name}
                  style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: on ? colors.primary : 'transparent' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: o.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Text weight="bold" size={11} color="#fff">{o.short.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text size={10} weight="medium" numberOfLines={1}>{o.short}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[...AMOUNTS, 'Other'].map((a) => {
              const on = a === 'Other' ? other : !other && amount === a;
              return (
                <Pressable key={a} onPress={() => (a === 'Other' ? (setOther(true), setAmount('')) : (setOther(false), setAmount(a)))}
                  accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={{ width: '23%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: on ? colors.primary : 'transparent' }}>
                  <Text weight="semibold" color={on ? colors.primary : colors.ink}>{a === 'Other' ? a : `৳${a}`}</Text>
                </Pressable>
              );
            })}
          </View>
          {other && <Field label="Amount (৳20 – ৳1,000)" keyboardType="number-pad" value={amount} onChangeText={(t) => setAmount(t.replace(/\D/g, ''))} />}
          <Card style={{ gap: 2 }}>
            <SummaryRow label="Recharge" value={formatMinor(minor, 'BDT')} />
            <SummaryRow label="Fee" value={formatMinor(0, 'BDT')} />
            <SummaryRow label="You pay" value={formatMinor(minor, 'BDT')} strong />
          </Card>
          {err ? <Notice text={err} tone="danger" /> : null}
          <Button title="Continue" onPress={next} />
          <Notice text="Operator is detected from the number. Ported number? Pick the right one." />
        </>
      )}
    </Screen>
  );
}
