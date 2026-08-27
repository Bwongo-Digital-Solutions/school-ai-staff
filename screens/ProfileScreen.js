import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Moon, Cloud, ArrowsClockwise, LockSimple, SignOut } from 'phosphor-react-native';
import { useBranding } from '../branding';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { hasRoster, roleLabel, scanPurpose } from '../roles';
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
  const { name: schoolName } = useBranding();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNote('');
    try {
      await onRefresh();
      setRefreshNote('Data refreshed.');
    } catch (err) {
      setRefreshNote(err.message || 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  };

  const displayName = (user && user.display_name) || 'Not signed in';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile</Text>

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
          {user ? <Chip label={roleLabel(user)} /> : null}
        </View>

        <Card style={styles.listCard}>
          <DetailRow
            icon={Moon}
            title="Light theme"
            value="Switch between the dark and light palette"
            action={
              <Switch
                value={theme === 'light'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.neutral[800], true: colors.accentRamp[600] }}
                thumbColor={colors.neutral[100]}
              />
            }
          />
          <DetailRow
            icon={Cloud}
            title="Server"
            value={apiBase || 'Not configured'}
            action={
              <Button
                label="Change"
                variant="secondary"
                onPress={onOpenSettings}
                style={styles.rowButton}
              />
            }
          />
          {!hasRoster(user) ? (
            <DetailRow
              icon={LockSimple}
              title="Access"
              value={scanPurpose(user)}
              isLast
            />
          ) : (
            <DetailRow
              icon={ArrowsClockwise}
              title="Refresh data"
              value={refreshNote || `${studentCount} students cached`}
              isLast
              action={
                <Button
                  label="Refresh"
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
          label="Sign out"
          icon={SignOut}
          variant="danger"
          onPress={onSignOut}
          style={styles.signOut}
        />

        <Text style={styles.footNote}>{schoolName} · Staff App</Text>
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
  });
