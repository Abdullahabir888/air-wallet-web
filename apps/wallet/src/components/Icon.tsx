import Svg, { Path, Rect, Circle } from 'react-native-svg';

/** Apple-style outline icon set (1.6 stroke, rounded) used across the app. */
export type IconName =
  | 'send' | 'request' | 'bill' | 'recharge' | 'cashout' | 'atm' | 'exchange' | 'card'
  | 'home' | 'activity' | 'settings' | 'eye' | 'eyeOff' | 'snow' | 'back' | 'check'
  | 'plus' | 'copy' | 'logout' | 'moon' | 'help' | 'user' | 'chevron' | 'swap' | 'close' | 'lock';

const shapes: Record<IconName, React.ReactNode> = {
  send: (<><Path d="M21.5 2.5 10.6 13.4" /><Path d="M21.5 2.5 14.6 21.5l-3.9-8.1-8.2-3.9z" /></>),
  request: (<><Circle cx={12} cy={12} r={9.5} /><Path d="M15.5 8.5l-7 7M8.5 10v5.5H14" /></>),
  bill: (<><Path d="M6 2.5h12a1 1 0 0 1 1 1V21l-2.4-1.5L14.2 21 12 19.5 9.8 21l-2.4-1.5L5 21V3.5a1 1 0 0 1 1-1z" /><Path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4" /></>),
  recharge: (<><Rect x={6} y={2} width={12} height={20} rx={3} /><Path d="m12.8 6.5-2.8 4.8h4l-2.8 4.8M10.5 19h3" /></>),
  cashout: (<><Rect x={2.5} y={7} width={19} height={12} rx={2.5} /><Circle cx={12} cy={13} r={2.5} /><Path d="M12 2.5v2.5M10 4l2-1.5L14 4" /></>),
  atm: (<><Rect x={3.5} y={3} width={17} height={10} rx={2.5} /><Path d="M7.5 7.5h9M8 13v7.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V13M10.5 17h3" /></>),
  exchange: (<Path d="M7 3.5 3.5 7 7 10.5M3.5 7h17M17 13.5l3.5 3.5-3.5 3.5M20.5 17h-17" />),
  card: (<><Rect x={2.5} y={5} width={19} height={14} rx={2.5} /><Path d="M2.5 9.5h19M6 15h4" /></>),
  home: (<Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  activity: (<Path d="M3 12h4l3-8 4 16 3-8h4" />),
  settings: (<Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />),
  eye: (<><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><Circle cx={12} cy={12} r={3} /></>),
  eyeOff: (<><Path d="M3 3l18 18M10.6 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.6 3.6M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>),
  snow: (<Path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9" />),
  back: (<Path d="M15 5l-7 7 7 7" />),
  check: (<Path d="M4 12.5l5 5L20 6.5" />),
  plus: (<Path d="M12 5v14M5 12h14" />),
  copy: (<><Rect x={8} y={8} width={13} height={13} rx={2.5} /><Path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8" /></>),
  logout: (<Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />),
  moon: (<Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
  help: (<><Circle cx={12} cy={12} r={9.5} /><Path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>),
  user: (<><Circle cx={12} cy={8} r={4} /><Path d="M4 21a8 8 0 0 1 16 0" /></>),
  chevron: (<Path d="M9 5l7 7-7 7" />),
  swap: (<Path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5" />),
  close: (<Path d="M6 6l12 12M18 6 6 18" />),
  lock: (<><Rect x={4} y={11} width={16} height={10} rx={2.5} /><Path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
};

export function Icon({ name, size = 24, color, strokeWidth = 1.6 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {shapes[name]}
    </Svg>
  );
}
