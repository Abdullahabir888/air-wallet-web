import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Glossy gradient icon set (matches the approved reference): filled shapes, top-left light,
 * soft shine on top. Gradient ids are prefixed per icon so several icons can share a screen.
 */
export type Icon3DName =
  | 'send' | 'request' | 'bill' | 'recharge' | 'cashout' | 'atm' | 'exchange' | 'card'
  | 'home' | 'activity' | 'settings';

type G = [string, string, string?];
const grad = (id: string, [a, b, c]: G, dir: 'diag' | 'h' | 'up' = 'diag') => {
  const v = dir === 'h' ? { x1: '0', y1: '0', x2: '1', y2: '0' } : dir === 'up' ? { x1: '0', y1: '1', x2: '0', y2: '0' } : { x1: '0', y1: '0', x2: '1', y2: '1' };
  const stops = c
    ? [<Stop key="0" offset="0" stopColor={a} />, <Stop key="1" offset="0.55" stopColor={b} />, <Stop key="2" offset="1" stopColor={c} />]
    : [<Stop key="0" offset="0" stopColor={a} />, <Stop key="2" offset="1" stopColor={b} />];
  return <LinearGradient id={id} {...v}>{stops}</LinearGradient>;
};
const shine = (id: string) => (
  <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <Stop offset="0" stopColor="#fff" stopOpacity={0.55} />
    <Stop offset="1" stopColor="#fff" stopOpacity={0} />
  </LinearGradient>
);

const BLUE: G = ['#7CB8FF', '#2F7BF5', '#1747C9'];
const BLUE_DEEP: G = ['#3B82F6', '#1E3FAE'];

function body(name: Icon3DName, p: string) {
  const u = (s: string) => `url(#${p}${s})`;
  switch (name) {
    case 'send':
      return (<>
        <Defs>{grad(`${p}a`, BLUE)}{grad(`${p}b`, BLUE_DEEP)}{grad(`${p}c`, ['#BFDBFE', '#60A5FA'])}{shine(`${p}s`)}</Defs>
        <Path d="M8 34l6-3M6 40l7-3.5" stroke={u('c')} strokeWidth={3.2} strokeLinecap="round" opacity={0.7} />
        <Path d="M42 6 9 21.5c-1.3.6-1.2 2.5.2 2.9l11 3.2 3.2 11c.4 1.4 2.3 1.5 2.9.2z" fill={u('a')} />
        <Path d="M42 6 20.2 27.6l3.2 11c.4 1.4 2.3 1.5 2.9.2z" fill={u('b')} />
        <Path d="M42 6 9 21.5c-1.3.6-1.2 2.5.2 2.9l11 3.2z" fill={u('s')} opacity={0.6} />
      </>);
    case 'request':
      return (<>
        <Defs>{grad(`${p}a`, ['#4AE3B5', '#0E9F6E'])}</Defs>
        <Path d="M36.5 11.5A16 16 0 1 0 40 24" fill="none" stroke={u('a')} strokeWidth={5} strokeLinecap="round" />
        <Path d="M40.2 15.5a16 16 0 0 1 .8 3.5" fill="none" stroke="#5EEAD4" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
        <Path d="M24 15v15M17.5 24l6.5 6.5 6.5-6.5" fill="none" stroke={u('a')} strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
      </>);
    case 'bill':
      return (<>
        <Defs>{grad(`${p}a`, ['#FFD24A', '#FF9F1C', '#F97316'])}{shine(`${p}s`)}</Defs>
        <Path d="M14 5h20a3 3 0 0 1 3 3v35l-3.4-2.3-3.3 2.3-3.3-2.3-3.3 2.3-3.4-2.3-3.3 2.3-3.4-2.3L11 43V8a3 3 0 0 1 3-3z" fill={u('a')} />
        <Path d="M34 5h1a4 4 0 0 1 4 4v24h-2V8a3 3 0 0 0-3-3z" fill="#FDBA74" opacity={0.8} />
        <Path d="M17 14h14M17 21h14M17 28h9" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" />
        <Path d="M14 5h20a3 3 0 0 1 3 3v8H11V8a3 3 0 0 1 3-3z" fill={u('s')} opacity={0.45} />
      </>);
    case 'recharge':
      return (<>
        <Defs>{grad(`${p}a`, ['#A78BFA', '#7C3AED', '#4C1D95'])}{shine(`${p}s`)}</Defs>
        <Rect x={13} y={4} width={22} height={40} rx={6} fill={u('a')} />
        <Rect x={16} y={8} width={16} height={32} rx={3.5} fill="#6D28D9" opacity={0.55} />
        <Path d="M26.5 12 19 25.5h6l-2.5 10.5 7.5-13.5h-6z" fill="#fff" />
        <Rect x={13} y={4} width={22} height={14} rx={6} fill={u('s')} opacity={0.5} />
      </>);
    case 'cashout':
      return (<>
        <Defs>{grad(`${p}a`, ['#FF8FB1', '#F43F6B', '#D61F4F'])}{grad(`${p}b`, ['#F43F5E', '#FB7B3C'], 'up')}</Defs>
        <Rect x={7} y={18} width={34} height={24} rx={6} fill={u('a')} />
        <Path d="M10 18h26a4 4 0 0 1 4 4H7v-1a3 3 0 0 1 3-3z" fill="#FDA4AF" opacity={0.6} />
        <Rect x={29} y={25} width={14} height={10} rx={4} fill="#E11D48" />
        <Circle cx={35} cy={30} r={2.3} fill="#fff" />
        <Path d="M24 22V6M17.5 12 24 5.5 30.5 12" fill="none" stroke={u('b')} strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
      </>);
    case 'atm':
      return (<>
        <Defs>{grad(`${p}a`, BLUE)}{grad(`${p}b`, BLUE_DEEP)}{shine(`${p}s`)}</Defs>
        <Rect x={7} y={6} width={34} height={18} rx={5} fill={u('a')} />
        <Rect x={12} y={11} width={24} height={6} rx={3} fill="#DBEAFE" />
        <Rect x={15} y={20} width={18} height={23} rx={3.5} fill={u('b')} />
        <Path d="M24 26v11" stroke="#BFDBFE" strokeWidth={3.2} strokeLinecap="round" />
        <Rect x={7} y={6} width={34} height={8} rx={4} fill={u('s')} opacity={0.5} />
      </>);
    case 'exchange':
      return (<>
        <Defs>{grad(`${p}a`, ['#10B981', '#2DD4BF'], 'h')}{grad(`${p}b`, ['#2DD4BF', '#22D3EE'], 'h')}</Defs>
        <Path d="M38 16H12m6-7-7 7 7 7" fill="none" stroke={u('a')} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M10 32h26m-6-7 7 7-7 7" fill="none" stroke={u('b')} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </>);
    case 'card':
      return (<>
        <Defs>{grad(`${p}a`, BLUE)}{shine(`${p}s`)}</Defs>
        <Rect x={5} y={10} width={38} height={28} rx={6} fill={u('a')} />
        <Rect x={5} y={16} width={38} height={5} fill="#DBEAFE" opacity={0.8} />
        <Rect x={11} y={28} width={9} height={4} rx={2} fill="#E0ECFF" />
        <Rect x={5} y={10} width={38} height={8} rx={5} fill={u('s')} opacity={0.45} />
      </>);
    case 'home':
      return (<>
        <Defs>{grad(`${p}a`, BLUE)}{grad(`${p}b`, BLUE_DEEP)}</Defs>
        <Path d="M8 22.5 24 8l16 14.5V38a4 4 0 0 1-4 4h-7V32a5 5 0 0 0-10 0v10h-7a4 4 0 0 1-4-4z" fill={u('a')} />
        <Path d="M5 22 24 5l19 17" fill="none" stroke={u('b')} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      </>);
    case 'activity':
      return (<>
        <Defs>{grad(`${p}a`, ['#22D3EE', '#2563EB'], 'h')}</Defs>
        <Path d="M5 26h8l6-15 9 25 5-11h10" fill="none" stroke={u('a')} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </>);
    case 'settings':
      return (<>
        <Defs>{grad(`${p}a`, ['#94A3B8', '#475569'])}</Defs>
        <Path d="M21 4h6l1.3 5.2a15 15 0 0 1 3.9 2.2l5.1-1.6 3 5.2-3.8 3.7a15 15 0 0 1 0 4.6l3.8 3.7-3 5.2-5.1-1.6a15 15 0 0 1-3.9 2.2L27 44h-6l-1.3-5.2a15 15 0 0 1-3.9-2.2l-5.1 1.6-3-5.2 3.8-3.7a15 15 0 0 1 0-4.6l-3.8-3.7 3-5.2 5.1 1.6a15 15 0 0 1 3.9-2.2z" fill={u('a')} />
        <Circle cx={24} cy={24} r={6.5} fill="#fff" />
      </>);
  }
}

export function Icon3D({ name, size = 36 }: { name: Icon3DName; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      {body(name, `i3${name}`)}
    </Svg>
  );
}

/** Tile tint per action (light / dark), from the reference. */
export const tileTint: Record<string, { accent: string; light: string }> = {
  send: { accent: '#2563EB', light: '#EEF4FF' },
  request: { accent: '#10B981', light: '#E9FBF4' },
  bill: { accent: '#F59E0B', light: '#FFF5E6' },
  recharge: { accent: '#7C3AED', light: '#F3EEFF' },
  cashout: { accent: '#F43F5E', light: '#FFEEF2' },
  atm: { accent: '#2563EB', light: '#EEF4FF' },
  exchange: { accent: '#14B8A6', light: '#E8FAF6' },
  card: { accent: '#2563EB', light: '#EEF4FF' },
};
