import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './ui';
import { Icon3D, type Icon3DName } from './Icon3D';

/**
 * iPhone tab bar in Apple's Liquid Glass style: a floating, rounded glass capsule above the
 * home indicator. On iOS 26+ it uses the real system material (expo-glass-effect → UIGlassEffect),
 * so it refracts and tints with whatever scrolls underneath. Older iOS falls back to a frosted
 * blur with a light specular edge. The active tab sits in a glass "lens" with the gradient underline.
 */
export const GLASS_BAR_HEIGHT = 68;
export const GLASS_BAR_GAP = 8;

const liquid = Platform.OS === 'ios' && isLiquidGlassAvailable();

function GlassSurface({ scheme, children }: { scheme: 'light' | 'dark'; children: ReactNode }) {
  if (liquid) {
    return <GlassView glassEffectStyle="regular" colorScheme={scheme} isInteractive style={styles.capsule}>{children}</GlassView>;
  }
  return (
    <BlurView intensity={scheme === 'dark' ? 80 : 60} tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={styles.capsule}>
      {/* specular top edge + soft inner sheen, like light hitting glass */}
      <LinearGradient
        colors={scheme === 'dark' ? ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.15)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </BlurView>
  );
}

export function GlassTabBar({ state, descriptors, emitter, navigateToTab, insets, icons }: BottomTabBarProps & { icons: Record<string, Icon3DName> }) {
  const { colors, scheme } = useTheme();
  // Sit just above the home indicator (iPhone bottom inset is ~34 pt).
  const bottom = Math.max(insets.bottom, 12);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View
        style={[
          styles.shadow,
          {
            borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.9)',
            shadowColor: scheme === 'dark' ? '#000' : '#1E3A8A',
          },
        ]}
      >
        <GlassSurface scheme={scheme}>
          <View style={styles.row} accessibilityRole="tablist">
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const { options } = descriptors[route.key]!;
              const title = typeof options.title === 'string' ? options.title : route.name;
              const onPress = () => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              };
              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={title}
                  style={styles.item}
                >
                  <View
                    style={[
                      styles.lens,
                      focused && {
                        backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
                        borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.95)',
                      },
                    ]}
                  >
                    <Icon3D name={icons[route.name] ?? 'home'} size={focused ? 26 : 24} />
                    <Text weight={focused ? 'semibold' : 'medium'} size={10.5} color={focused ? colors.primary : colors.muted}>
                      {title}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  shadow: {
    borderRadius: GLASS_BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  capsule: { height: GLASS_BAR_HEIGHT, borderRadius: GLASS_BAR_HEIGHT / 2, overflow: 'hidden', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center' },
  lens: {
    alignItems: 'center',
    gap: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'transparent',
  },
});
