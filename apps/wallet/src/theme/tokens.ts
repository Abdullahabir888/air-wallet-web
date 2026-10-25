/** Design tokens — match docs/DESIGN_SYSTEM.md and the approved mockups. */
type Tuple3 = readonly [string, string, string];

export interface Colors {
  primary: string; primarySoft: string; onPrimary: string; bg: string; card: string; ink: string; muted: string;
  line: string; chip: string; success: string; danger: string; warning: string; tabBar: string; gradient: Tuple3;
}

export const palette: { light: Colors; dark: Colors } = {
  light: {
    primary: '#2563EB',
    primarySoft: '#E6EEFF',
    onPrimary: '#FFFFFF',
    bg: '#F4F7FC',
    card: '#FFFFFF',
    ink: '#0F1A33',
    muted: '#6B7A99',
    line: '#E4EAF5',
    chip: '#EEF3FB',
    success: '#16A34A',
    danger: '#DC2626',
    warning: '#C7811A',
    tabBar: '#FFFFFF',
    gradient: ['#3B82F6', '#2563EB', '#1E3A8A'],
  },
  dark: {
    primary: '#60A5FA',
    primarySoft: '#16264A',
    onPrimary: '#06142E',
    bg: '#0A1020',
    card: '#121B2E',
    ink: '#E7EEFB',
    muted: '#8A9BBA',
    line: '#1D2942',
    chip: '#18233A',
    success: '#4ADE80',
    danger: '#FF7A7A',
    warning: '#F2B54A',
    tabBar: '#0E1628',
    gradient: ['#2563EB', '#1E40AF', '#172554'],
  },
};


export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 };
export const space = (n: number) => n * 4;

export const font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

/** Virtual card styles. */
export const cardStyles = {
  black: {
    name: 'Midnight Black',
    colors: ['#3A3D46', '#16171C', '#050506'] as const,
    accent: '#D1D5DB',
    text: '#F3F4F6',
    tagBg: 'rgba(255,255,255,0.14)',
    tagText: '#E5E7EB',
    markColor: '#C9CED6',
  },
  purple: {
    name: 'Royal Purple',
    colors: ['#2E0854', '#6D28D9', '#A855F7'] as const,
    accent: '#FDE047',
    text: '#FFFFFF',
    tagBg: '#FACC15',
    tagText: '#3B0764',
    markColor: '#F5F3FF',
  },
  red: {
    name: 'Ruby Gold',
    colors: ['#3F0A0A', '#991B1B', '#DC2626'] as const,
    accent: '#FFE7A0',
    text: '#F7E3A1',
    tagBg: '#E9C46A',
    tagText: '#4A0D0D',
    markColor: '#E9C46A',
  },
};
