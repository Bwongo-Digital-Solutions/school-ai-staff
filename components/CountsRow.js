import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

/* The three-figure tally the gate log and the register both lead with. `counts` is
   `[[value, label], …]`. */
export default function CountsRow({ counts = [], style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, style]}>
      {counts.map(([value, label]) => (
        <View key={label} style={styles.count}>
          <Text style={styles.value}>{String(value)}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingVertical: spacing.lg,
    },
    count: {
      flex: 1,
      alignItems: 'center',
    },
    value: {
      fontFamily: fonts.semibold,
      fontSize: 20,
      lineHeight: 26,
      color: colors.text,
    },
    label: {
      fontFamily: fonts.regular,
      fontSize: 11.5,
      color: colors.neutral[500],
      marginTop: 2,
    },
  });
