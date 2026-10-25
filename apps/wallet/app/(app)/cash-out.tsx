import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { POLICY, cashOutAgentFee, cashOutAtmFee, formatMinor, normalizeBdMobile } from '@air-wallet/core';
import { api, errorMessage, newKey } from '@/lib/api';
import { toMinor } from '@/lib/forms';
import { useActiveAtmCode, useWallets, toDate } from '@/lib/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { AmountInput, Button, Card, Field, Header, Notice, Pills, Screen, Segmented, SummaryRow, Text } from '@/components/ui';
import { Done, ReviewCard, useMoneyFlow } from '@/components/flow';

export default function CashOut() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'agent' | 'atm'>(params.mode === 'atm' ? 'atm' : 'agent');
  return (
    <Screen>
      <Header title={mode === 'atm' ? 'Cash out from ATM' : 'Cash out'} />
      <Segmented value={mode} onChange={setMode} options={[{ label: 'Agent', value: 'agent' }, { label: 'ATM', value: 'atm' }]} />
      {mode === 'agent' ? <Agent /> : <Atm />}
    </Screen>
  );
}

function Agent() {
  const { colors } = useTheme();
  const balance = useWallets().data?.find((w) => w.currency === 'BDT')?.balanceMinor ?? 0;
  const [agent, setAgent] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const flow = useMoneyFlow<{ transactionId: string; feeMinor: number; totalMinor: number }>();
  const minor = toMinor(amount);
  const fee = minor ? cashOutAgentFee(minor) : 0;
  const agentNumber = normalizeBdMobile(agent);

  const next = () => {
    setErr('');
    if (!agentNumber) return setErr('Enter the agent number (01XXXXXXXXX).');
    if (minor < POLICY.cashOutAgent.minMinor || minor > POLICY.cashOutAgent.maxMinor)
      return setErr(`Cash out between ${formatMinor(POLICY.cashOutAgent.minMinor, 'BDT')} and ${formatMinor(POLICY.cashOutAgent.maxMinor, 'BDT')}.`);
    if (minor + fee > balance) return setErr('Not enough balance for amount + fee.');
    flow.review();
  };

  if (flow.step === 'done') return <Done title="Cash out sent" subtitle={`Collect ${formatMinor(minor, 'BDT')} from the agent.`} />;
  if (flow.step === 'review' && agentNumber)
    return (
      <ReviewCard busy={flow.busy} error={flow.error} onEdit={flow.edit} confirmLabel="Cash out"
        onConfirm={() => flow.confirm((idempotencyKey) => api.cashOutAgent({ agentNumber, amountMinor: minor, idempotencyKey }))}>
        <SummaryRow label="Agent" value={agentNumber} />
        <SummaryRow label="Amount" value={formatMinor(minor, 'BDT')} />
        <SummaryRow label={`Fee (${POLICY.cashOutAgent.feeBps / 100}%)`} value={formatMinor(fee, 'BDT')} />
        <SummaryRow label="Total deducted" value={formatMinor(minor + fee, 'BDT')} strong />
      </ReviewCard>
    );

  return (
    <View style={{ gap: 14 }}>
      <Field label="Agent number" keyboardType="phone-pad" value={agent} onChangeText={setAgent} placeholder="01XXXXXXXXX" />
      <AmountInput value={amount} onChangeText={setAmount} label="BDT" />
      <Text size={13} color={colors.muted} style={{ textAlign: 'center' }}>Available {formatMinor(balance, 'BDT')}</Text>
      <Pills selected={amount} onPick={setAmount} options={['1000', '2000', '5000', '10000'].map((a) => ({ label: `৳${Number(a).toLocaleString()}`, value: a }))} />
      <Card style={{ gap: 2 }}>
        <SummaryRow label="Amount" value={formatMinor(minor, 'BDT')} />
        <SummaryRow label={`Fee (${POLICY.cashOutAgent.feeBps / 100}%)`} value={formatMinor(fee, 'BDT')} />
        <SummaryRow label="Total deducted" value={formatMinor(minor + fee, 'BDT')} strong />
      </Card>
      {err ? <Notice text={err} tone="danger" /> : null}
      <Button title="Continue" onPress={next} />
      <Notice tone="warning" text="Demo fee. Set your real tariff in packages/core/src/fees.ts." />
    </View>
  );
}

function Atm() {
  const { colors } = useTheme();
  const balance = useWallets().data?.find((w) => w.currency === 'BDT')?.balanceMinor ?? 0;
  const active = useActiveAtmCode().data;
  const [amount, setAmount] = useState('3000');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [left, setLeft] = useState(0);
  const minor = toMinor(amount);
  const fee = cashOutAtmFee(minor);
  const expires = toDate(active?.expiresAt);

  useEffect(() => {
    if (!expires) return;
    const tick = () => setLeft(Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expires?.getTime()]);

  const create = async () => {
    setErr('');
    const { stepMinor, minMinor, maxMinor } = POLICY.cashOutAtm;
    if (minor < minMinor || minor > maxMinor || minor % stepMinor) return setErr(`Pick ৳500 – ৳20,000 in steps of ৳500.`);
    if (minor + fee > balance) return setErr('Not enough balance for amount + fee.');
    setBusy(true);
    try {
      await api.createAtmCode({ amountMinor: minor, idempotencyKey: newKey() });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await api.cancelAtmCode({ codeId: active.id });
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (active) {
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, '0');
    return (
      <View style={{ gap: 14 }}>
        <LinearGradient colors={[...colors.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 22, alignItems: 'center', gap: 6 }}>
          <Text size={13} color="rgba(255,255,255,0.85)">Your one-time cash code · {formatMinor(active.amountMinor, 'BDT')}</Text>
          <Text weight="bold" size={40} color="#fff" style={{ letterSpacing: 6 }} accessibilityLabel={`Code ${active.code.split('').join(' ')}`}>
            {active.code.slice(0, 3)} {active.code.slice(3)}
          </Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 }}>
            <Text weight="semibold" size={12} color="#fff">{left ? `Expires in ${mm}:${ss}` : 'Expired'}</Text>
          </View>
        </LinearGradient>
        <Card style={{ gap: 10 }}>
          {['Go to any partner ATM', 'Tap “Cardless cash”', 'Enter your phone number and this code', 'Take your cash'].map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text weight="bold" size={12} color={colors.primary}>{i + 1}</Text>
              </View>
              <Text size={13}>{s}</Text>
            </View>
          ))}
        </Card>
        <Card style={{ gap: 2 }}>
          <SummaryRow label="Amount" value={formatMinor(active.amountMinor, 'BDT')} />
          <SummaryRow label="ATM fee" value={formatMinor(active.feeMinor, 'BDT')} />
          <SummaryRow label="Held from wallet" value={formatMinor(active.amountMinor + active.feeMinor, 'BDT')} strong />
        </Card>
        {err ? <Notice text={err} tone="danger" /> : null}
        <Button title="Cancel code" variant="secondary" onPress={cancel} loading={busy} />
        <Notice tone="warning" text="Unused codes expire and the money returns to your wallet." />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Text color={colors.muted}>Get a one-time code and withdraw cash at a partner ATM, no card needed.</Text>
      <AmountInput value={amount} onChangeText={setAmount} label="BDT" />
      <Pills selected={amount} onPick={setAmount} options={['1000', '2000', '3000', '5000', '10000'].map((a) => ({ label: `৳${Number(a).toLocaleString()}`, value: a }))} />
      <Card style={{ gap: 2 }}>
        <SummaryRow label="Amount" value={formatMinor(minor, 'BDT')} />
        <SummaryRow label="ATM fee" value={formatMinor(fee, 'BDT')} />
        <SummaryRow label="Held from wallet" value={formatMinor(minor + fee, 'BDT')} strong />
      </Card>
      {err ? <Notice text={err} tone="danger" /> : null}
      <Button title="Get ATM code" onPress={create} loading={busy} />
      <Notice tone="warning" text="Demo: needs an ATM network partner to dispense real cash." />
    </View>
  );
}
