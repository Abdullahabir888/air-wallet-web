import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { CURRENCIES, POLICY, formatMinor, parseToMinor, type CurrencyCode } from '@air-wallet/core';
import { api, errorMessage, newKey } from '@/lib/api';
import { useRates, useWallets, toDate } from '@/lib/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { AmountInput, Button, Card, Notice, Screen, Segmented, SummaryRow, Text } from '@/components/ui';
import { Icon } from '@/components/Icon';

type Foreign = 'USD' | 'GBP' | 'EUR';
const FOREIGN: Foreign[] = ['USD', 'GBP', 'EUR'];
type Quote = { quoteId: string; toAmountMinor: number; rate: string; expiresAtMillis: number; source: string };

export default function Exchange() {
  const { colors } = useTheme();
  const rates = useRates().data;
  const wallets = useWallets().data ?? [];
  const [dir, setDir] = useState<'buy' | 'sell'>('buy'); // buy = BDT → foreign
  const [foreign, setForeign] = useState<Foreign>('USD');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tone: 'danger' | 'success' } | null>(null);

  const from: CurrencyCode = dir === 'buy' ? 'BDT' : foreign;
  const to: CurrencyCode = dir === 'buy' ? foreign : 'BDT';
  const fromWallet = wallets.find((w) => w.currency === from);
  const minor = parseToMinor(amount, from);
  const rate = rates?.bdtPer?.[foreign];
  const estimate = useMemo(() => {
    if (!minor || !rate) return null;
    const r = Number(rate); // display estimate only — the server quote is authoritative
    return dir === 'buy' ? Math.floor(minor / r) : Math.floor(minor * r);
  }, [minor, rate, dir]);

  useEffect(() => setQuote(null), [dir, foreign, amount]);
  useEffect(() => {
    if (!quote) return;
    const tick = () => setLeft(Math.max(0, Math.round((quote.expiresAtMillis - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [quote]);

  const lockRate = async () => {
    setMsg(null);
    if (!minor || minor < POLICY.exchange.minMinor) return setMsg({ t: `Minimum is ${formatMinor(POLICY.exchange.minMinor, from)}`, tone: 'danger' });
    if ((fromWallet?.balanceMinor ?? 0) < minor) return setMsg({ t: 'Not enough balance.', tone: 'danger' });
    setBusy(true);
    try {
      setQuote(await api.getExchangeQuote({ from, to, amountMinor: minor }));
    } catch (e) {
      setMsg({ t: errorMessage(e), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!quote) return;
    setBusy(true);
    try {
      await api.executeExchange({ quoteId: quote.quoteId, idempotencyKey: newKey() });
      setMsg({ t: `Done. ${formatMinor(quote.toAmountMinor, to)} added to your ${to} wallet.`, tone: 'success' });
      setQuote(null);
      setAmount('');
    } catch (e) {
      setMsg({ t: errorMessage(e), tone: 'danger' });
      setQuote(null);
    } finally {
      setBusy(false);
    }
  };

  const updated = toDate(rates?.fetchedAt);
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <Text weight="bold" size={22}>Exchange</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: rates?.source === 'demo' ? colors.warning : colors.success }} />
          <Text weight="semibold" size={12} color={rates?.source === 'demo' ? colors.warning : colors.success}>
            {rates?.source === 'demo' ? 'Demo rates' : 'Live'}{updated ? ` · ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </Text>
        </View>
      </View>

      <Card style={{ paddingVertical: 4 }}>
        {FOREIGN.map((c, i) => {
          const now = rates?.bdtPer?.[c];
          const prev = rates?.previous?.[c];
          const diff = now && prev ? Number(now) - Number(prev) : 0;
          const pct = now && prev ? (diff / Number(prev)) * 100 : 0;
          const up = diff >= 0;
          const pts = up ? '0,18 14,15 28,12 42,9 56,6' : '0,6 14,9 28,12 42,14 56,17';
          return (
            <Pressable key={c} onPress={() => setForeign(c)} accessibilityRole="button" accessibilityLabel={`${CURRENCIES[c].name} ${now ?? ''} taka`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text weight="bold" size={14} color={colors.primary}>{CURRENCIES[c].symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="semibold">{c}</Text>
                <Text size={12} color={colors.muted}>{CURRENCIES[c].name}</Text>
              </View>
              <Svg width={56} height={24}><Polyline points={pts} fill="none" stroke={up ? colors.success : colors.danger} strokeWidth={2} /></Svg>
              <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                <Text weight="bold">৳{now ?? '—'}</Text>
                <Text size={11} color={up ? colors.success : colors.danger}>{up ? '▲' : '▼'}{Math.abs(pct).toFixed(2)}%</Text>
              </View>
            </Pressable>
          );
        })}
      </Card>

      <Segmented value={dir} onChange={setDir} options={[{ label: 'BDT → Foreign', value: 'buy' }, { label: 'Foreign → BDT', value: 'sell' }]} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FOREIGN.map((c) => (
          <Pressable key={c} onPress={() => setForeign(c)} accessibilityRole="radio" accessibilityState={{ selected: c === foreign }}
            style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1.5, borderColor: c === foreign ? colors.primary : 'transparent' }}>
            <Text weight="semibold" color={c === foreign ? colors.primary : colors.ink}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <AmountInput value={amount} onChangeText={setAmount} symbol={CURRENCIES[from].symbol} label={`You send (${from})`} />
        <Text size={12} color={colors.muted} style={{ textAlign: 'center' }}>Balance {formatMinor(fromWallet?.balanceMinor ?? 0, from)}</Text>
        <View style={{ alignItems: 'center', marginVertical: 8 }}><Icon name="swap" size={22} color={colors.primary} /></View>
        <Text size={13} color={colors.muted} style={{ textAlign: 'center' }}>You get about</Text>
        <Text weight="bold" size={28} style={{ textAlign: 'center' }}>{formatMinor(quote?.toAmountMinor ?? estimate ?? 0, to)}</Text>
      </Card>

      {quote ? (
        <Card style={{ gap: 4 }}>
          <SummaryRow label="Rate" value={`1 ${foreign} = ৳${quote.rate}`} />
          <SummaryRow label="You send" value={formatMinor(minor ?? 0, from)} />
          <SummaryRow label="You get" value={formatMinor(quote.toAmountMinor, to)} strong />
          <Text size={12} color={left ? colors.primary : colors.danger} style={{ textAlign: 'center', marginTop: 4 }}>
            {left ? `Rate locked for 0:${String(left).padStart(2, '0')}` : 'Rate expired — lock a new one'}
          </Text>
        </Card>
      ) : null}
      {msg ? <Notice text={msg.t} tone={msg.tone} /> : null}
      {quote && left > 0
        ? <Button title="Exchange now" onPress={confirm} loading={busy} />
        : <Button title="Lock rate" onPress={lockRate} loading={busy} disabled={!minor} />}
      <Notice text="Rates lock for 60 seconds when you tap Lock rate." />
    </Screen>
  );
}
