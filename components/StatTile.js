import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, radius, spacing, fonts } from '../theme';

export default function StatTile({ icon: Icon, label, value, variant = 'plain', style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const content = (
    <View style={styles.inner}>
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={20} color={colors.accentRamp[300]} weight="regular" />
        </View>
      ) : null}
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[colors.accentRamp[900], colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, style]}
      >
        {content}
      </LinearGradient>
    );
  }

  return <View style={[styles.tile, styles.plainTile, style]}>{content}</View>;
}

const createStyles = (colors) =>
  StyleSheet.create({
    tile: {
      flexBasis: '48%',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      padding: spacing.lg,
    },
    plainTile: {
      backgroundColor: colors.surface,
    },
    inner: {
      alignItems: 'flex-start',
    },
    iconWrap: {
      marginBottom: spacing.md,
    },
    value: {
      fontFamily: fonts.semibold,
      fontSize: 20,
      lineHeight: 26,
      minHeight: 26,
      color: colors.text,
      marginBottom: 2,
    },
    label: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[400],
    },
  });
