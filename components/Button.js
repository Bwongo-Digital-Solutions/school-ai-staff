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
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const variantStyle = styles[variant] || styles.primary;
  const textColor =
    variant === 'secondary' ? colors.text : variant === 'danger' ? colors.status.red : colors.accent;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
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
