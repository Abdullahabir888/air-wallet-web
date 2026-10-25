import { buildProfile, detectCutout, detectFamily, sizeClassFor } from '@/lib/device';

jest.mock('expo-device', () => ({ DeviceType: { PHONE: 1, TABLET: 2 } }));

const insets = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 0 });

describe('device detection', () => {
  test('family from brand / model', () => {
    expect(detectFamily('android', 'samsung', 'samsung', 'SM-S921B', 1)).toBe('samsung');
    expect(detectFamily('android', 'google', 'Google', 'Pixel 9', 1)).toBe('pixel');
    expect(detectFamily('android', 'Xiaomi', 'Xiaomi', 'Redmi Note 13', 1)).toBe('android');
    expect(detectFamily('ios', 'Apple', 'Apple', 'iPhone 16 Pro', 1)).toBe('iphone');
    expect(detectFamily('ios', 'Apple', 'Apple', 'iPad Air', 2)).toBe('ipad');
    expect(detectFamily('web', null, null, null, null)).toBe('web');
  });

  test('cutout from real safe-area insets', () => {
    expect(detectCutout('iphone', 59)).toBe('dynamic-island');
    expect(detectCutout('iphone', 47)).toBe('notch');
    expect(detectCutout('iphone', 20)).toBe('none');
    expect(detectCutout('samsung', 36)).toBe('punch-hole');
  });

  test('size classes', () => {
    expect(sizeClassFor(340)).toBe('compact');
    expect(sizeClassFor(412)).toBe('regular');
    expect(sizeClassFor(720)).toBe('large');
  });

  test('Samsung gets the One UI large header; small phones get smaller tiles', () => {
    const s = buildProfile({ os: 'android', brand: 'samsung', manufacturer: 'samsung', model: 'Galaxy S24', deviceType: 1, width: 384, insets: insets(36, 24) });
    expect(s.largeHeader).toBe(true);
    expect(s.tileSize).toBe(60);
    const small = buildProfile({ os: 'android', brand: 'samsung', manufacturer: 'samsung', model: 'Galaxy A05', deviceType: 1, width: 340, insets: insets(28, 48) });
    expect(small.largeHeader).toBe(false);
    expect(small.tileSize).toBe(52);
  });

  test('tab bar height includes the system bottom area', () => {
    const iphone = buildProfile({ os: 'ios', brand: 'Apple', manufacturer: 'Apple', model: 'iPhone 16', deviceType: 1, width: 393, insets: insets(59, 34) });
    expect(iphone.tabBarHeight).toBe(52 + 34);
    const pixel3btn = buildProfile({ os: 'android', brand: 'google', manufacturer: 'Google', model: 'Pixel 8', deviceType: 1, width: 412, insets: insets(40, 48) });
    expect(pixel3btn.tabBarHeight).toBe(60 + 48);
  });

  test('tablets and unfolded foldables show all 8 actions in one row', () => {
    const fold = buildProfile({ os: 'android', brand: 'samsung', manufacturer: 'samsung', model: 'Galaxy Z Fold6', deviceType: 2, width: 720, insets: insets(32, 24) });
    expect(fold.gridColumns).toBe(8);
  });
});
