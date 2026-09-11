import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Moon, Cloud, ArrowsClockwise, LockSimple, SignOut, Translate } from 'phosphor-react-native';
import { useBranding } from '../branding';
import { APP_FOOTER } from '../version';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { hasRoster, roleLabel, scanPurposeKey } from '../roles';
import { LANGUAGES, LANGUAGE_LABELS, useT } from '../i18n';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Button from '../components/Button';
import DetailRow from '../components/DetailRow';

export default function ProfileScreen({
  user,
  apiBase,
  studentCount,
  onOpenSettings,
  onRefresh,
  onSignOut,
}) {
  const { colors, theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useT();
  const { name: schoolName } = useBranding();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNote('');
    try {
      await onRefresh();
      setRefreshNote(t('profile.refreshed'));
    } catch (err) {
      setRefreshNote(err.message || t('profile.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  const displayName = (user && user.display_name) || t('profile.notSignedIn');

  /* Two languages, so the row is a single button that names the *other* one — "Français" when you
     are reading English. A picker for a choice between two is a sheet to open and a list to read
     where one tap would do; this is the same judgement the theme row makes with its switch. */
  const otherLanguage = LANGUAGES.find((code) => code !== language) || 'en';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.subtext} numberOfLines={1}>
              {(user && user.auth_email) || ''}
            </Text>
          </View>
          {user ? <Chip label={roleLabel(user, t)} /> : null}
        </View>

        <Card style={styles.listCard}>
          <DetailRow
            icon={Moon}
            title={t('profile.lightTheme')}
            value={t('profile.lightThemeWhy')}
            action={
              <Switch
                value={theme === 'light'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.neutral[800], true: colors.accentRamp[600] }}
                thumbColor={colors.neutral[100]}
              />
            }
          />
          {/* Beside the theme, because they are the same kind of thing: a preference that belongs
              to whoever is holding the phone, not to the school. */}
          <DetailRow
            icon={Translate}
            title={t('profile.language')}
            value={t('profile.languageWhy')}
            action={
              <Button
                label={LANGUAGE_LABELS[otherLanguage]}
                variant="secondary"
                onPress={() => setLanguage(otherLanguage)}
                style={styles.rowButton}
              />
            }
          />
          <DetailRow
            icon={Cloud}
            title={t('profile.server')}
            value={apiBase || t('common.notConfigured')}
            action={
              <Button
                label={t('common.change')}
                variant="secondary"
                onPress={onOpenSettings}
                style={styles.rowButton}
              />
            }
          />
          {!hasRoster(user) ? (
            <DetailRow
              icon={LockSimple}
              title={t('profile.access')}
              value={t(scanPurposeKey(user))}
              isLast
            />
          ) : (
            <DetailRow
              icon={ArrowsClockwise}
              title={t('profile.refreshData')}
              value={refreshNote || t('profile.cached', { count: studentCount })}
              isLast
              action={
                <Button
                  label={t('common.refresh')}
                  variant="secondary"
                  onPress={handleRefresh}
                  loading={refreshing}
                  style={styles.rowButton}
                />
              }
            />
          )}
        </Card>

        <Button
          label={t('common.signOut')}
          icon={SignOut}
          variant="danger"
          onPress={onSignOut}
          style={styles.signOut}
        />

        <Text style={styles.footNote}>{schoolName} · {t('profile.staffApp')}</Text>
        <Text style={styles.footVersion}>{APP_FOOTER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxl,
    },
    title: {
      ...type(colors).heading(22),
      marginBottom: spacing.xl,
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xl,
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
    identityBody: {
      flex: 1,
      marginRight: spacing.md,
    },
    name: {
      ...type(colors).heading(17),
      marginBottom: 2,
    },
    subtext: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: colors.neutral[500],
    },
    listCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    rowButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    signOut: {
      marginTop: spacing.xxl,
    },
    footNote: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[600],
      textAlign: 'center',
      marginTop: spacing.xxl,
    },
    footVersion: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: colors.neutral[700],
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
