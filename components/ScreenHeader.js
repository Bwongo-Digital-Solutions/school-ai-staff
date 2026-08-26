import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';
import { useTheme, spacing, type } from '../theme';

export default function ScreenHeader({ title, onBack, right }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text} weight="regular" />
        </Pressable>
      ) : (
        <View style={styles.slot} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.slot}>{right}</View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    backButton: {
      padding: spacing.xs,
      width: 28,
    },
    slot: {
      width: 28,
      alignItems: 'flex-end',
    },
    title: {
      ...type(colors).heading(18),
      flex: 1,
      textAlign: 'center',
      marginHorizontal: spacing.md,
    },
  });
