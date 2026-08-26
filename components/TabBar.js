import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { House, QrCode, Users, UserCircle } from 'phosphor-react-native';
import { colors, spacing, fonts } from '../theme';

const TABS = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'scan', label: 'Scan', icon: QrCode },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'profile', label: 'Profile', icon: UserCircle },
];

export default function TabBar({ active, onSelect }) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
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
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 4,
  },
});
