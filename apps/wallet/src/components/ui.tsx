import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text as RNText,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { font, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

/** Small accessible design-system primitives. Every touchable has a role + label. */

type Weight = keyof typeof font;
export function Text({ weight = 'regular', size = 14, color, style, ...p }: TextProps & { weight?: Weight; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <RNText {...p} style={[{ fontFamily: font[weight], fontSize: size, color: color ?? colors.ink }, style]} />;
}

export function Screen({ children, scroll = true, padded = true, edges, maxWidth = 560 }: { children: ReactNode; scroll?: boolean; padded?: boolean; edges?: ('top' | 'bottom')[]; maxWidth?: number }) {
  const { colors } = useTheme();
  const inner = <View style={{ padding: padded ? 20 : 0, paddingTop: padded ? 8 : 0, gap: 14, maxWidth, width: '100%', alignSelf: 'center' }}>{children}</View>;
  return (
    <SafeAreaView edges={edges ?? ['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 130 : 40 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({ title, back = true, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, marginBottom: 6 }}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={20} color={colors.ink} />
        </Pressable>
      )}
      <Text weight="bold" size={20} style={{ flex: 1 }} accessibilityRole="header">{title}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16 }, style]}>{children}</View>;
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon }: {
  title: string; onPress?: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; icon?: IconName;
}) {
  const { colors } = useTheme();
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : colors.chip;
  const fg = variant === 'primary' ? colors.onPrimary : variant === 'danger' ? '#fff' : colors.ink;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg, opacity: off ? 0.55 : pressed ? 0.85 : 1, borderRadius: radius.lg,
        paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
      })}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text weight="semibold" size={16} color={fg}>{title}</Text>
    </Pressable>
  );
}

export const Field = forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps & { label: string; error?: string; hint?: string }>(function Field(
  { label, error, hint, style, ...p },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5, borderColor: error ? colors.danger : 'transparent' }}>
        <Text size={12} color={colors.muted}>{label}</Text>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          style={[{ fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 4 }, style]}
          {...p}
        />
      </View>
      {error ? <Text size={12} color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text size={12} color={colors.muted}>{hint}</Text> : null}
    </View>
  );
});

export function AmountInput({ value, onChangeText, error, symbol = '৳', label = 'Amount' }: { value: string; onChangeText: (v: string) => void; error?: string; symbol?: string; label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 4, marginVertical: 8 }}>
      <Text size={14} color={colors.muted}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text weight="bold" size={40}>{symbol}</Text>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^\d.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
          style={{ fontFamily: font.bold, fontSize: 40, color: colors.ink, minWidth: 60, textAlign: 'center', padding: 0 }}
        />
      </View>
      {error ? <Text size={12} color={colors.danger}>{error}</Text> : null}
    </View>
  );
}

export function Pills({ options, onPick, selected }: { options: { label: string; value: string }[]; onPick: (v: string) => void; selected?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {options.map((o) => {
        const on = o.value === selected;
        return (
          <Pressable key={o.value} accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: on }} onPress={() => onPick(o.value)}
            style={{ backgroundColor: colors.card, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: on ? colors.primary : 'transparent' }}>
            <Text weight="semibold" size={13} color={on ? colors.primary : colors.ink}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', backgroundColor: on ? colors.primary : 'transparent' }}>
            <Text weight="medium" size={13} color={on ? colors.onPrimary : colors.muted}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text size={13} color={colors.muted}>{label}</Text>
      <Text weight={strong ? 'bold' : 'semibold'} size={strong ? 15 : 13}>{value}</Text>
    </View>
  );
}

export function ToggleRow({ title, subtitle, value, onChange, disabled }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text size={14}>{title}</Text>
        {subtitle ? <Text size={12} color={colors.muted}>{subtitle}</Text> : null}
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#fff" />
    </View>
  );
}

export function Notice({ text, tone = 'info' }: { text: string; tone?: 'info' | 'warning' | 'danger' | 'success' }) {
  const { colors } = useTheme();
  const c = tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.muted;
  return <Text size={12} color={c} style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">{text}</Text>;
}

export function Loading() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.primary} size="large" /></View>;
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 10 }}>
      <Icon name={icon} size={30} color={colors.muted} />
      <Text color={colors.muted} style={{ textAlign: 'center' }}>{text}</Text>
    </View>
  );
}
