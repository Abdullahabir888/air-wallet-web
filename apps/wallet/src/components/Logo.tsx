import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './ui';

/**
 * Air Wallet logo — vector, so it stays sharp on every screen density.
 * Mark: wallet + "A" + air swoosh + paper plane. `mono` draws a single-colour version
 * (used on the virtual cards: silver, white or gold).
 */
export function LogoMark({ size = 40, mono }: { size?: number; mono?: string }) {
  const f = (gradientId: string) => (mono ? mono : `url(#${gradientId})`);
  const soft = mono ? 0.55 : 1;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Air Wallet">
      {!mono && (
        <Defs>
          <LinearGradient id="awBody" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#4F9BFF" />
            <Stop offset="0.55" stopColor="#2563EB" />
            <Stop offset="1" stopColor="#1E3A8A" />
          </LinearGradient>
          <LinearGradient id="awBack" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#22D3EE" />
            <Stop offset="1" stopColor="#60A5FA" />
          </LinearGradient>
          <LinearGradient id="awSwoosh" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#A5F3FC" />
            <Stop offset="1" stopColor="#FFFFFF" />
          </LinearGradient>
          <LinearGradient id="awShine" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
      )}
      <G opacity={soft}>
        <Rect x={13} y={8} width={38} height={16} rx={6} fill={f('awBack')} transform="rotate(-8 32 16)" />
      </G>
      <Rect x={6} y={16} width={48} height={40} rx={12} fill={f('awBody')} opacity={mono ? 0.9 : 1} />
      {!mono && <Rect x={6} y={16} width={48} height={14} rx={10} fill="url(#awShine)" opacity={0.35} />}
      <Path d="M18 48 28.5 24 39 48" fill="none" stroke={mono ? '#000' : '#fff'} strokeOpacity={mono ? 0.35 : 1} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 42c10-5 22-4 34-14" fill="none" stroke={mono ? '#000' : 'url(#awSwoosh)'} strokeOpacity={mono ? 0.25 : 1} strokeWidth={4} strokeLinecap="round" />
      <Path d="M60 18 44 25.5l6 1.8 1.8 6z" fill={mono ?? '#fff'} />
      <Path d="M60 18 50 27.3l1.8 6z" fill={mono ? '#000' : '#DBEAFE'} fillOpacity={mono ? 0.2 : 1} />
      <Rect x={43} y={33} width={14} height={11} rx={5.5} fill={mono ? '#000' : '#1D4ED8'} fillOpacity={mono ? 0.25 : 1} />
      <Circle cx={50} cy={38.5} r={2.4} fill={mono ? '#000' : '#fff'} fillOpacity={mono ? 0.35 : 1} />
    </Svg>
  );
}

export function Logo({ height = 36 }: { height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible accessibilityRole="image" accessibilityLabel="Air Wallet">
      <LogoMark size={height} />
      <Text weight="bold" size={height * 0.58} style={{ letterSpacing: -0.4 }}>
        Air<Text weight="semibold" size={height * 0.58} color={colors.primary}>Wallet</Text>
      </Text>
    </View>
  );
}
