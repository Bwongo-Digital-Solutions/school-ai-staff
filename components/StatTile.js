import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Coins,
  ChartLineUp,
  CalendarCheck,
  WarningCircle,
} from 'phosphor-react-native';
import { colors, radius, spacing, fonts } from '../theme';

const ICONS = {
  Coins,
  ChartLineUp,
  CalendarCheck,
  WarningCircle,
};

export default function StatTile({ icon, label, value, variant }) {
  const Icon = ICONS[icon] || Coins;
  const content = (
    <View style={styles.inner}>
      <View style={styles.iconWrap}>
        <Icon size={20} color={colors.accentRamp[300]} weight="regular" />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[colors.accentRamp[900], colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}
      >
        {content}
      </LinearGradient>
    );
  }

  return <View style={[styles.tile, styles.plainTile]}>{content}</View>;
}

const styles = StyleSheet.create({
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
    color: colors.text,
    marginBottom: 2,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral[400],
  },
});
