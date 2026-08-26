import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { initialsOf } from '../format';
import Badge from './Badge';

/* Who the card is about. The card screen and the gate's confirmation both open with it, so
   the officer about to let somebody through is looking at the same identity block the
   office sees. */
export default function StudentHeader({ student, badge, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const name = (student && student.full_name) || '—';
  const grade = student && student.grade_level != null ? student.grade_level : '—';
  const section = student && student.class_section ? ` · ${student.class_section}` : '';

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(name) || '?'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {`${(student && student.student_id) || '—'} · Grade ${grade}${section}`}
        </Text>
      </View>
      {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.accentRamp[800],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
    },
    avatarText: {
      fontFamily: fonts.semibold,
      fontSize: 16,
      color: colors.accentRamp[100],
    },
    body: {
      flex: 1,
      marginRight: spacing.md,
    },
    name: {
      ...type(colors).heading(17),
      marginBottom: 2,
    },
    sub: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: colors.neutral[500],
    },
  });
