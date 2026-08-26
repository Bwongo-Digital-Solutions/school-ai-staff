import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, fonts } from '../theme';

export default function Button({
  label,
  icon: Icon,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}) {
  const variantStyle = styles[variant] || styles.primary;
  const textColor =
    variant === 'secondary' ? colors.text : colors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {Icon ? (
          <Icon size={18} color={textColor} weight="regular" style={styles.icon} />
        ) : null}
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
