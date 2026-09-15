/* "Three things are waiting to reach the office."

   The counterpart to the outbox. Work done without a signal is kept on the device and sent when the
   network returns, and this is how the person knows that — because the alternative is an app that
   quietly says "saved" and means "saved here", which is a worse lie than the error it replaced.

   A banner rather than a dialog, for the same reason UpdateBanner is one: this app is used standing
   at a gate with a queue in front of somebody, and anything modal is then in the way of the scan.

   It is not dismissible. An update can be waved away because ignoring it costs nothing today;
   unsent work is the person's own, and hiding it is how it gets forgotten. It disappears by being
   sent, which is the only ending that should make it go away. */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { CloudArrowUp } from 'phosphor-react-native';

import { useTheme, radius, spacing, fonts } from '../theme';
import { useT } from '../i18n';

export default function SyncBanner({ pending, busy, onRetry }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { t } = useT();

  if (!pending) return null;

  return (
    <View style={styles.banner}>
      <CloudArrowUp size={20} color={colors.accent} weight="bold" />
      <View style={styles.body}>
        <Text style={styles.title}>{t('sync.waiting', { count: pending })}</Text>
        <Text style={styles.detail}>{t('sync.explain')}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Pressable onPress={onRetry} style={styles.action} accessibilityRole="button">
          <Text style={styles.actionText}>{t('sync.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
      padding: spacing.xl,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    body: { flex: 1 },
    title: {
      fontFamily: fonts.medium,
      fontSize: 14.5,
      color: colors.text,
    },
    detail: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[600],
      marginTop: spacing.xs,
    },
    action: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    actionText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.accent,
    },
  });
