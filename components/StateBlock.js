import React, { useMemo } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Tray, WarningCircle } from 'phosphor-react-native';
import { useTheme, spacing, fonts } from '../theme';
import Button from './Button';

export default function StateBlock({
  kind = 'empty',
  message,
  onRetry,
  retryLabel = 'Try again',
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Icon = kind === 'error' ? WarningCircle : Tray;

  return (
    <View style={[styles.wrap, style]}>
      {kind === 'loading' ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Icon
          size={24}
          color={kind === 'error' ? colors.status.red : colors.neutral[600]}
          weight="regular"
        />
      )}
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          label={retryLabel}
          variant="secondary"
          onPress={onRetry}
          style={styles.retry}
        />
      ) : null}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
    },
    message: {
      fontFamily: fonts.regular,
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.neutral[500],
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    retry: {
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
  });
