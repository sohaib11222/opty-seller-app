import { Platform } from 'react-native';

export const colors = {
  ink: '#0B1930',
  muted: '#60718B',
  subtle: '#7B8CA1',
  line: '#E6EBF2',
  background: '#F7F9FD',
  surface: '#FFFFFF',
  soft: '#F6F8FC',
  blue: '#1465D8',
  blueDark: '#0D4CA6',
  blueSoft: '#EDF4FF',
  teal: '#18A787',
  green: '#21855C',
  greenSoft: '#E9F8F0',
  amber: '#D58B16',
  amberSoft: '#FFF5DC',
  red: '#C54C52',
};

export const gradients = {
  primary: ['#1465D8', '#0D4CA6'] as const,
  storeCover: ['#0A3F79', '#1765C9', '#23B09B'] as const,
  revenue: ['#112B52', '#1B539D'] as const,
  auth: ['#072D5C', '#1161BD', '#1EA88E'] as const,
};

export const typography = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#1A2D4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 3,
  },
  floating: {
    shadowColor: '#152D4E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
};
