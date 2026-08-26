import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SealCheck, SealWarning } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

/* The slip somebody else issued, as the gate and the office both read it: a headline, then
   the facts of the trip. The `missing` variant is what an officer sees when nobody has
   granted permission at all — it is deliberately loud, because approving anyway makes the
   officer answerable for it. */
export default function PermissionSlip({ title, rows = [], note, missing = false, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Icon = missing ? SealWarning : SealCheck;

  return (
    <View style={[styles.slip, missing && styles.missing, style]}>
      <View style={styles.head}>
        <Icon
          size={18}
          color={missing ? colors.status.amber : colors.status.green}
          weight="regular"
        />
        <Text style={[styles.headText, missing && styles.headTextMissing]}>{title}</Text>
      </View>

      {note ? <Text style={styles.note}>{note}</Text> : null}

      {rows.length ? (
        <View style={styles.grid}>
          {rows.map(([key, value]) => (
            <View key={key} style={styles.gridRow}>
              <Text style={styles.key}>{key}</Text>
              <Text style={styles.value}>{value || '—'}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    slip: {
      borderWidth: 1,
      borderColor: colors.status.green,
      backgroundColor: colors.status.greenBg,
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    missing: {
      borderColor: colors.status.amber,
      backgroundColor: colors.status.amberBg,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headText: {
      fontFamily: fonts.semibold,
      fontSize: 13.5,
      color: colors.status.green,
      marginLeft: spacing.md,
      flex: 1,
    },
    headTextMissing: {
      color: colors.status.amber,
    },
    note: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[400],
      marginTop: spacing.md,
    },
    grid: {
      marginTop: spacing.md,
    },
    gridRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 3,
    },
    key: {
      width: 96,
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
    },
    value: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.text,
    },
  });
