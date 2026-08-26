import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

export default function Badge({ label, tone = 'neutral', style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toneStyle = styles[tone] || styles.neutral;
  const toneLabel = styles[`${tone}Label`] || styles.neutralLabel;
  return (
    <View style={[styles.badge, toneStyle, style]}>
      <Text style={[styles.label, toneLabel]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 11,
      letterSpacing: 0.3,
    },
    neutral: {
      backgroundColor: colors.neutral[900],
    },
    neutralLabel: {
      color: colors.neutral[300],
    },
    green: {
      backgroundColor: colors.status.greenBg,
    },
    greenLabel: {
      color: colors.status.green,
    },
    amber: {
      backgroundColor: colors.status.amberBg,
    },
    amberLabel: {
      color: colors.status.amber,
    },
    red: {
      backgroundColor: colors.status.redBg,
    },
    redLabel: {
      color: colors.status.red,
    },
  });
