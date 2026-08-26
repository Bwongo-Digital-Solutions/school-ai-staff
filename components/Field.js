import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

/* The labelled input the web app's `.field` renders. Every form in the app is built from
   these, so the label/placeholder wording ports across one for one. */
export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  multiline = false,
  autoCapitalize = 'sentences',
  keyboardType,
  onSubmitEditing,
  returnKeyType,
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[600]}
        style={[styles.input, multiline && styles.multiline]}
        editable={editable}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

/** The inline `.form-error` — a message that stays put until the problem is fixed. */
export function FormError({ message, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!message) return null;
  return <Text style={[styles.error, style]}>{message}</Text>;
}

const createStyles = (colors) =>
  StyleSheet.create({
    field: {
      width: '100%',
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 12.5,
      color: colors.neutral[400],
      marginBottom: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.bg,
    },
    multiline: {
      minHeight: 96,
      paddingTop: spacing.lg,
    },
    error: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.status.red,
      marginTop: spacing.lg,
    },
  });
