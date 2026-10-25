import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { errorMessage, newKey } from '@/lib/api';
import { Button, Card, Notice, Text } from './ui';
import { Icon } from './Icon';

/**
 * Form → Review → Done pattern shared by every money screen.
 * One idempotency key per review: a retry after a network error reuses it, so money never moves twice.
 */
export function useMoneyFlow<R>() {
  const [step, setStep] = useState<'form' | 'review' | 'done'>('form');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<R | null>(null);
  const key = useRef('');

  return {
    step,
    error,
    busy,
    result,
    review: () => {
      key.current = newKey();
      setError('');
      setStep('review');
    },
    edit: () => setStep('form'),
    confirm: async (run: (idempotencyKey: string) => Promise<R>) => {
      setBusy(true);
      setError('');
      try {
        setResult(await run(key.current));
        setStep('done');
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
  };
}

export function ReviewCard({ children, error, busy, onConfirm, onEdit, confirmLabel = 'Confirm' }: {
  children: ReactNode; error?: string; busy?: boolean; onConfirm: () => void; onEdit: () => void; confirmLabel?: string;
}) {
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 2 }}>{children}</Card>
      {error ? <Notice text={error} tone="danger" /> : null}
      <Button title={confirmLabel} onPress={onConfirm} loading={busy} />
      <Button title="Edit" variant="secondary" onPress={onEdit} disabled={busy} />
    </View>
  );
}

export function Done({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 16, alignItems: 'center', marginTop: 30 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={36} color={colors.success} strokeWidth={2.2} />
      </View>
      <Text weight="bold" size={22} style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">{title}</Text>
      {subtitle ? <Text color={colors.muted} style={{ textAlign: 'center' }}>{subtitle}</Text> : null}
      {children}
      <View style={{ alignSelf: 'stretch' }}><Button title="Back to home" onPress={() => router.replace('/home')} /></View>
    </View>
  );
}
