import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme, spacing, fonts } from '../theme';

export default function SectionLabel({ children, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const createStyles = (colors) =>
  StyleSheet.create({
    label: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      color: colors.neutral[500],
      textTransform: 'uppercase',
      marginTop: spacing.xxl,
      marginBottom: spacing.md,
    },
  });
