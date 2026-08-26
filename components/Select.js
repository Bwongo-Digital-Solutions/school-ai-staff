import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { CaretDown, Check } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

/* React Native has no `<select>`, and pulling in a picker library for four dropdowns is
   not worth a dependency, so this is the same control built from a Pressable and a Modal.
   `options` is `[{ value, label, disabled }]`; a disabled option stays listed and greyed
   rather than being hidden, so an unconfigured AI provider is visible as unavailable
   instead of simply missing. */
export default function Select({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Choose…',
  title,
  disabled = false,
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value) || null;

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ pressed }) => [
          styles.control,
          disabled && styles.controlDisabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text
          style={[styles.value, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <CaretDown size={16} color={colors.neutral[500]} weight="regular" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.dim} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{title || label || 'Choose'}</Text>
            <ScrollView style={styles.list} bounces={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={String(option.value)}
                    disabled={option.disabled}
                    onPress={() => {
                      setOpen(false);
                      if (option.value !== value) onChange(option.value);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      pressed && !option.disabled && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        option.disabled && styles.optionDisabled,
                        isSelected && styles.optionSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Check size={16} color={colors.accent} weight="bold" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      width: '100%',
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 12.5,
      color: colors.neutral[400],
      marginBottom: spacing.sm,
    },
    control: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      backgroundColor: colors.bg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    controlDisabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.65,
    },
    value: {
      flex: 1,
      marginRight: spacing.md,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
    },
    placeholder: {
      color: colors.neutral[600],
    },
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    dim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scrim,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderColor: colors.neutral[800],
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxl * 1.5,
      maxHeight: '70%',
    },
    sheetTitle: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.neutral[500],
      marginBottom: spacing.md,
    },
    list: {
      flexGrow: 0,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[900],
    },
    optionLabel: {
      flex: 1,
      marginRight: spacing.md,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
    },
    optionSelected: {
      fontFamily: fonts.medium,
      color: colors.accent,
    },
    optionDisabled: {
      color: colors.neutral[600],
    },
  });
