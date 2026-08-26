import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { colors, radius, spacing, fonts } from '../theme';

export default function StudentRow({ student, onPress, isLast }) {
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
        <Text style={styles.avatarText}>{student.initials}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.subtext}>
          {student.id} · {student.class}
        </Text>
      </View>
      <CaretRight size={18} color={colors.neutral[500]} weight="regular" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
