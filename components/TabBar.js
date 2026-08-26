import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { House, QrCode, Users, Sparkle, UserCircle } from 'phosphor-react-native';
import { useTheme, spacing, fonts } from '../theme';
import { allowedTabs } from '../roles';

const TABS = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'scan', label: 'Scan', icon: QrCode },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'assistant', label: 'Assistant', icon: Sparkle },
  { key: 'profile', label: 'Profile', icon: UserCircle },
];

export default function TabBar({ active, user, onSelect }) {
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
              {tab.label}
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
