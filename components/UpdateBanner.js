/* "There is a newer version" — as a banner, not a dialog.

   A dialog was the obvious shape and the wrong one. This app is used standing at a gate with a
   queue of children in front of somebody, and anything modal is then in the way of the scan. The
   banner sits above the content, says what is new, and can be pushed aside.

   Dismissal is remembered per version, not as a flag: waving away 1.2.0 should not silence 1.3.0
   as well. */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { ArrowCircleUp, X } from 'phosphor-react-native';

import { useTheme, radius, spacing, fonts } from '../theme';
import { useT } from '../i18n';

export default function UpdateBanner({ update, onDismiss }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { t } = useT();

  if (!update) return null;

  /* Obtainium where the phone has it, because it keeps the app updated afterwards and this prompt
     need not appear again. Otherwise the APK itself, which is the plain path everybody has. */
  const open = () => {
    const target = update.obtainium || update.apkUrl;
    if (target) Linking.openURL(target).catch(() => {});
  };

  return (
    <View style={styles.banner}>
      <ArrowCircleUp size={22} color={colors.accent} weight="fill" />
      <View style={styles.text}>
        <Text style={styles.title}>{t('update.available', { version: update.version })}</Text>
        {update.notes ? (
          <Text style={styles.notes} numberOfLines={3}>{update.notes}</Text>
        ) : (
          <Text style={styles.notes}>{t('update.installed', { version: update.installed })}</Text>
        )}
        <Pressable onPress={open} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.action}>{t('update.install')}</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={onDismiss}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('update.dismiss')}
      >
        <X size={18} color={colors.neutral[600]} weight="bold" />
      </Pressable>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.lg,
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
      padding: spacing.xl,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    text: { flex: 1 },
    title: {
      fontFamily: fonts.medium,
      fontSize: 14.5,
      color: colors.text,
    },
    notes: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[600],
      marginTop: spacing.xs,
    },
    action: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.accent,
      marginTop: spacing.md,
    },
  });
