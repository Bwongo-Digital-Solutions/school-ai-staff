import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, fonts } from '../theme';

export default function DetailRow({ icon: Icon, title, value, isLast, action }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, !isLast && styles.divider]}>
      {Icon ? (
        <Icon size={18} color={colors.neutral[500]} weight="regular" style={styles.icon} />
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {action}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[800],
    },
    icon: {
      marginRight: spacing.lg,
    },
    body: {
      flex: 1,
      marginRight: spacing.md,
    },
    title: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.text,
      marginBottom: 2,
    },
    value: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.neutral[500],
    },
  });
