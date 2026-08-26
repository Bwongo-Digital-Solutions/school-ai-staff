import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

/* The web app's transient confirmation. It reports what happened; it never carries the
   only copy of an error a user must act on — those stay on the screen that caused them. */

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const VISIBLE_MS = 2400;

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const show = useCallback(
    (text) => {
      const next = String(text == null ? '' : text);
      if (!next) return;
      setMessage(next);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setMessage(''));
      }, VISIBLE_MS);
    },
    [opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <ToastLayer message={message} opacity={opacity} />
    </ToastContext.Provider>
  );
}

function ToastLayer({ message, opacity }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!message) return null;
  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.toast, { opacity }]}>
        <Text style={styles.text} numberOfLines={3}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    host: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: spacing.xxl * 4,
      paddingHorizontal: spacing.xxl,
    },
    toast: {
      maxWidth: '100%',
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    text: {
      fontFamily: fonts.medium,
      fontSize: 13.5,
      lineHeight: 19,
      color: colors.text,
      textAlign: 'center',
    },
  });
