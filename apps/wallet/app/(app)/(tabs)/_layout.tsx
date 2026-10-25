import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { Icon3D, type Icon3DName } from '@/components/Icon3D';
import { useDeviceProfile } from '@/lib/device';
import { GlassTabBar } from '@/components/GlassTabBar';

const ICONS = { home: 'home', activity: 'activity', card: 'card', exchange: 'exchange', settings: 'settings' } as const;

const SCREENS: [route: string, icon: Icon3DName, title: string][] = [
  ['home', 'home', 'Home'],
  ['activity', 'activity', 'Activity'],
  ['card', 'card', 'Card'],
  ['exchange', 'exchange', 'Exchange'],
  ['settings', 'settings', 'Settings'],
];

/** Colourful glossy icon; the active tab gets a soft glow blob behind it. */
function TabIcon({ name, focused, glow }: { name: Icon3DName; focused: boolean; glow: string }) {
  return (
    <View style={{ width: 48, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? glow : 'transparent' }}>
      <View style={{ opacity: focused ? 1 : 0.85 }}>
        <Icon3D name={name} size={26} />
      </View>
    </View>
  );
}

/** Label + gradient underline on the active tab. */
function TabLabel({ title, focused, color, small }: { title: string; focused: boolean; color: string; small: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text weight={focused ? 'semibold' : 'medium'} size={small ? 10 : 11} color={color}>{title}</Text>
      {focused ? (
        <LinearGradient colors={['#22D3EE', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: 22, height: 4, borderRadius: 2, marginTop: 3 }} />
      ) : (
        <View style={{ height: 7 }} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, scheme } = useTheme();
  const device = useDeviceProfile();
  const glow = scheme === 'dark' ? 'rgba(96,165,250,0.16)' : 'rgba(37,99,235,0.10)';
  const small = device.size === 'compact';

  return (
    <Tabs
      // iPhone: floating Liquid Glass capsule. Android & web: classic bar sized to the device.
      tabBar={Platform.OS === 'ios' ? (props) => <GlassTabBar {...props} icons={ICONS} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        // Height follows the device: iOS home indicator, Android gesture bar or 3-button nav.
        tabBarStyle: Platform.OS === 'ios' ? { position: 'absolute' } : {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.line,
          height: device.tabBarHeight + 14,
          paddingTop: 6,
          paddingBottom: Math.max(device.insets.bottom, 6),
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {SCREENS.map(([route, icon, title]) => (
        <Tabs.Screen
          key={route}
          name={route}
          options={{
            title,
            tabBarAccessibilityLabel: title,
            tabBarIcon: ({ focused }) => <TabIcon name={icon} focused={focused} glow={glow} />,
            tabBarLabel: ({ focused, color }) => <TabLabel title={title} focused={focused} color={String(color)} small={small} />,
          }}
        />
      ))}
    </Tabs>
  );
}
