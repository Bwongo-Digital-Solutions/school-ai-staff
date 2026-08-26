import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, radius, spacing } from '../theme';

export default function Card({ children, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.neutral[800],
    },
  });
