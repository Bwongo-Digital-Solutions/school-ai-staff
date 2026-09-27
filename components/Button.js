import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, StyleSheet, View } from 'react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

export default function Button({
  label,
  icon: Icon,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  /**
   * A count to show after the label — how many things are waiting behind this button.
   *
   * Zero draws nothing rather than a `0`. A badge reading zero is a worse answer than no badge:
   * it asks the reader to notice a figure and then to work out that it means "nothing here", and
   * it makes the button look busy from the corner of the eye when it is not.
   */
  badge = 0,
  /** What the count means, for a screen reader — the label alone reads as a bare number. */
  badgeLabel,
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const variantStyle = styles[variant] || styles.primary;
  const textColor =
    variant === 'secondary' ? colors.text : variant === 'danger' ? colors.status.red : colors.accent;
  const isDisabled = disabled || loading;
  const count = Number(badge) > 0 ? Math.floor(Number(badge)) : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      /* Spoken as one phrase. Without this the badge reads as a stray number after the label,
         which is exactly the part a blind user cannot infer from position. */
      accessibilityLabel={count ? `${label}, ${badgeLabel || count}` : label}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} style={styles.icon} />
        ) : Icon ? (
          <Icon size={18} color={textColor} weight="regular" style={styles.icon} />
        ) : null}
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        {count ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: spacing.sm,
    },
    /* The same pill the message bell wears, so a count means the same thing wherever it appears:
       accent on the button's own ground, the label reversed out of it. */
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
      marginLeft: spacing.sm,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      lineHeight: 20,
      color: colors.bg,
    },
    primary: {
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: 'transparent',
    },
    secondary: {
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: 'transparent',
    },
    danger: {
      borderWidth: 1,
      borderColor: colors.status.red,
      backgroundColor: 'transparent',
    },
    ghost: {
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      fontFamily: fonts.semibold,
      fontSize: 15,
    },
  });
