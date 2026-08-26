import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'kps.theme';

/* Both palettes carry the same token names so every style rule is written
   once. The tonal ramps are reversed in light mode (900 is the lightest step)
   so that "hairline = neutral 800" stays correct in either theme. */
export const palettes = {
  dark: {
    bg: '#161826',
    surface: '#232532',
    surface2: '#2b2d3c',
    text: '#e9e9ed',
    accent: '#9184d9',
    divider: 'rgba(233,233,237,0.16)',
    scrim: 'rgba(8,9,15,0.62)',
    neutral: {
      100: '#f3f5fe',
      200: '#e4e7f5',
      300: '#cfd3e5',
      400: '#b2b6ca',
      500: '#9397ab',
      600: '#75798c',
      700: '#595d6c',
      800: '#3f424d',
      900: '#292b31',
    },
    accentRamp: {
      100: '#f5f4ff',
      200: '#e7e5fe',
      300: '#d2cefd',
      400: '#b5abfc',
      500: '#968ae0',
      600: '#796cbf',
      700: '#5d5294',
      800: '#423a6a',
      900: '#2b2741',
    },
    status: {
      green: '#8fd6b4',
      greenBg: 'rgba(111,191,154,0.16)',
      amber: '#e6c589',
      amberBg: 'rgba(217,176,106,0.16)',
      red: '#e6a5a5',
      redBg: 'rgba(217,138,138,0.16)',
    },
  },
  light: {
    bg: '#eef0fa',
    surface: '#f9fafe',
    surface2: '#f1f3fb',
    text: '#1a1c2a',
    accent: '#5d52a4',
    divider: 'rgba(26,28,42,0.16)',
    scrim: 'rgba(26,28,42,0.45)',
    neutral: {
      100: '#24263a',
      200: '#33364b',
      300: '#454962',
      400: '#5c6079',
      500: '#6f7490',
      600: '#8b90a8',
      700: '#adb2c6',
      800: '#ccd0e0',
      900: '#e2e5f1',
    },
    accentRamp: {
      100: '#221d3d',
      200: '#302a55',
      300: '#453c78',
      400: '#5d5294',
      500: '#7568ba',
      600: '#9184d9',
      700: '#b5abfc',
      800: '#ddd8ff',
      900: '#eeebff',
    },
    status: {
      green: '#1d6b4a',
      greenBg: 'rgba(111,191,154,0.26)',
      amber: '#8a6212',
      amberBg: 'rgba(217,176,106,0.26)',
      red: '#9c3434',
      redBg: 'rgba(217,138,138,0.24)',
    },
  },
};

export const spacing = {
  xs: 3,
  sm: 6,
  md: 8,
  lg: 11,
  xl: 17,
  xxl: 22,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const type = (colors) => ({
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },
  heading: (size) => ({
    fontFamily: fonts.medium,
    fontSize: size,
    letterSpacing: size * -0.015,
    color: colors.text,
  }),
});

const ThemeContext = createContext({
  theme: 'dark',
  colors: palettes.dark,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (!cancelled && (stored === 'light' || stored === 'dark')) setTheme(stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, colors: palettes[theme] || palettes.dark, toggleTheme }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default { palettes, spacing, radius, fonts, type, ThemeProvider, useTheme };
