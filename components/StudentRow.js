import React, { useMemo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts } from '../theme';
import { classOf, fullName, initials } from '../format';

export default function StudentRow({ student, onPress, isLast }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(student) || '?'}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {fullName(student) || 'Unnamed student'}
        </Text>
        <Text style={styles.subtext} numberOfLines={1}>
          {student.student_id} · {classOf(student)}
        </Text>
      </View>
      <CaretRight size={18} color={colors.neutral[500]} weight="regular" />
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[800],
    },
    pressed: {
      opacity: 0.6,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: colors.accentRamp[800],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
    },
    avatarText: {
      fontFamily: fonts.semibold,
      fontSize: 14,
      color: colors.accentRamp[100],
    },
    meta: {
      flex: 1,
    },
    name: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: colors.text,
      marginBottom: 2,
    },
    subtext: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.neutral[500],
    },
  });
