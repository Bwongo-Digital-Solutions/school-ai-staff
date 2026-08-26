import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SignIn, SignOut, Prohibit } from 'phosphor-react-native';
import { useTheme, spacing, fonts } from '../theme';
import { formatTime, humanise } from '../format';
import Badge from './Badge';

/* One row per movement, whichever board it is shown on: the gate's log names the student,
   a single card's history does not, and the two otherwise read the same. */
export default function MovementList({ movements = [], withNames = true, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={style}>
      {movements.map((m, index) => {
        const declined = m.decision === 'declined';
        const Icon = declined ? Prohibit : m.direction === 'out' ? SignOut : SignIn;
        const tint = declined
          ? colors.status.red
          : m.direction === 'out'
            ? colors.status.amber
            : colors.status.green;
        const name = withNames ? m.full_name : null;
        const detail = [formatTime(m.recorded_at), m.destination, m.note]
          .filter(Boolean)
          .join(' · ');

        return (
          <View
            key={m.id || `${m.recorded_at}-${index}`}
            style={[styles.row, index === movements.length - 1 && styles.lastRow]}
          >
            <Icon size={19} color={tint} weight="regular" style={styles.icon} />
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {name || humanise(m.direction)}
                {name ? <Text style={styles.direction}>{`  ${m.direction}`}</Text> : null}
              </Text>
              <Text style={styles.sub} numberOfLines={2}>
                {detail}
              </Text>
            </View>
            {declined ? <Badge label="Declined" tone="red" /> : null}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[900],
    },
    lastRow: {
      borderBottomWidth: 0,
    },
    icon: {
      marginRight: spacing.lg,
    },
    body: {
      flex: 1,
      marginRight: spacing.md,
    },
    title: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.text,
      marginBottom: 2,
    },
    direction: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[500],
    },
    sub: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
    },
  });
