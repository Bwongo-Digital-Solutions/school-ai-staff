import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

export default function Chip({ label, style, textStyle }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.chip, style]}>
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accentRamp[800],
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
    },
    label: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 0.4,
      color: colors.accentRamp[100],
      textTransform: 'uppercase',
    },
  });
