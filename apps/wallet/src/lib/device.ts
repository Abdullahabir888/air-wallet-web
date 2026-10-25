import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import * as Device from 'expo-device';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Reads the phone model + display and turns it into layout decisions.
 *
 * - Samsung (One UI): large greeting zone at the top so actions sit in thumb reach.
 * - Google Pixel / other Android: Material layout, centre punch-hole, gesture bar.
 * - iPhone: Dynamic Island / notch handled by safe-area insets, home indicator spacing.
 * - Compact screens (< 360 dp wide) get smaller tiles; tablets/foldables get a wider grid.
 *
 * Cutouts and system bars are never hard-coded: safe-area insets come from the OS at runtime,
 * so a new phone with a different cutout still lays out correctly.
 */
export type DeviceFamily = 'samsung' | 'pixel' | 'android' | 'iphone' | 'ipad' | 'web';
export type Cutout = 'dynamic-island' | 'notch' | 'punch-hole' | 'none';
export type SizeClass = 'compact' | 'regular' | 'large';

export interface DeviceProfile {
  family: DeviceFamily;
  model: string;
  cutout: Cutout;
  size: SizeClass;
  width: number;
  insets: { top: number; bottom: number; left: number; right: number };
  /** One UI style: big title area before content. */
  largeHeader: boolean;
  /** Quick-action grid columns and tile size. */
  gridColumns: number;
  tileSize: number;
  /** Bottom tab bar total height including the system gesture area. */
  tabBarHeight: number;
  label: string;
}

export function detectFamily(os: string, brand: string | null, manufacturer: string | null, model: string | null, deviceType: Device.DeviceType | null): DeviceFamily {
  if (os === 'web') return 'web';
  if (os === 'ios') return deviceType === Device.DeviceType.TABLET ? 'ipad' : 'iphone';
  const b = `${brand ?? ''} ${manufacturer ?? ''}`.toLowerCase();
  if (b.includes('samsung')) return 'samsung';
  if (b.includes('google') || (model ?? '').toLowerCase().includes('pixel')) return 'pixel';
  return 'android';
}

export function detectCutout(family: DeviceFamily, topInset: number): Cutout {
  if (family === 'iphone') return topInset >= 59 ? 'dynamic-island' : topInset >= 44 ? 'notch' : 'none';
  if (family === 'samsung' || family === 'pixel' || family === 'android') return topInset >= 28 ? 'punch-hole' : 'none';
  return 'none';
}

export function sizeClassFor(width: number): SizeClass {
  if (width < 360) return 'compact';
  if (width >= 600) return 'large';
  return 'regular';
}

export function buildProfile(input: {
  os: string;
  brand: string | null;
  manufacturer: string | null;
  model: string | null;
  deviceType: Device.DeviceType | null;
  width: number;
  insets: DeviceProfile['insets'];
}): DeviceProfile {
  const family = detectFamily(input.os, input.brand, input.manufacturer, input.model, input.deviceType);
  const size = sizeClassFor(input.width);
  const cutout = detectCutout(family, input.insets.top);
  const gridColumns = size === 'large' ? 8 : 4;
  const tileSize = size === 'compact' ? 52 : size === 'large' ? 64 : 60;
  const tabBarHeight = (family === 'iphone' || family === 'ipad' ? 52 : 60) + input.insets.bottom;
  const names: Record<DeviceFamily, string> = {
    samsung: 'Samsung · One UI layout',
    pixel: 'Google Pixel · Android layout',
    android: 'Android layout',
    iphone: 'iPhone · iOS layout',
    ipad: 'iPad · iPadOS layout',
    web: 'Web layout',
  };
  return {
    family,
    model: input.model ?? (input.os === 'web' ? 'Browser' : 'Unknown device'),
    cutout,
    size,
    width: input.width,
    insets: input.insets,
    largeHeader: family === 'samsung' && size !== 'compact',
    gridColumns,
    tileSize,
    tabBarHeight,
    label: names[family],
  };
}

export function useDeviceProfile(): DeviceProfile {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return useMemo(
    () =>
      buildProfile({
        os: Platform.OS,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        model: Device.modelName,
        deviceType: Device.deviceType,
        width,
        insets,
      }),
    [width, insets.top, insets.bottom, insets.left, insets.right],
  );
}
