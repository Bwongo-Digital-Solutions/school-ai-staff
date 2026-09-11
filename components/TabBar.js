import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { House, QrCode, Users, Sparkle, UserCircle } from 'phosphor-react-native';
import { useTheme, spacing, fonts } from '../theme';
import { allowedTabs } from '../roles';
import { useT } from '../i18n';

/* The label is a key; the tab bar is rendered by a screen that has `t`. */
const TABS = [
  { key: 'home', label: 'tab.home', icon: House },
  { key: 'scan', label: 'tab.scan', icon: QrCode },
  { key: 'students', label: 'tab.students', icon: Users },
  { key: 'assistant', label: 'tab.assistant', icon: Sparkle },
  { key: 'profile', label: 'tab.profile', icon: UserCircle },
];

export default function TabBar({ active, user, onSelect }) {
  const { t } = useT();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const visible = useMemo(() => {
    const allowed = allowedTabs(user);
    return TABS.filter((tab) => allowed.includes(tab.key));
  }, [user]);

  return (
    <View style={styles.bar}>
      {visible.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;
        const color = isActive ? colors.accentRamp[300] : colors.neutral[500];
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onSelect(tab.key)}
          >
            <Icon
              size={24}
              color={color}
              weight={isActive ? 'fill' : 'regular'}
            />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {t(tab.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.neutral[800],
      backgroundColor: colors.bg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 10.5,
      marginTop: 4,
    },
  });
