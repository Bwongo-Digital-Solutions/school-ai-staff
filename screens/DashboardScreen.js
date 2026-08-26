import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { MagnifyingGlass, QrCode, CloudCheck } from 'phosphor-react-native';
import { colors, spacing, fonts, type } from '../theme';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Button from '../components/Button';
import StudentRow from '../components/StudentRow';
import StatTile from '../components/StatTile';
import TabBar from '../components/TabBar';
import { staff, classSnapshot } from '../data/mock';

export default function DashboardScreen({
  recentStudents,
  activeTab,
  onSelectTab,
  onScanPress,
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {staff.name}</Text>
            <Chip label={staff.role} style={styles.chip} />
          </View>
          <View style={styles.syncStatus}>
            <CloudCheck size={16} color={colors.neutral[400]} weight="regular" />
            <Text style={styles.syncText}>{staff.lastSynced}</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <MagnifyingGlass size={18} color={colors.neutral[500]} weight="regular" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or student ID"
            placeholderTextColor={colors.neutral[600]}
            editable={false}
          />
        </View>

        <Button
          label="Scan QR / Student ID"
          icon={QrCode}
          variant="primary"
          onPress={onScanPress}
          style={styles.scanButton}
        />

        <Text style={styles.sectionLabel}>Recent students</Text>
        <Card style={styles.listCard}>
          {recentStudents.map((student, index) => (
            <StudentRow
              key={student.id}
              student={student}
              onPress={() => {}}
              isLast={index === recentStudents.length - 1}
            />
          ))}
        </Card>

        <Text style={styles.sectionLabel}>Class snapshot · P5 Blue</Text>
        <View style={styles.statGrid}>
          {classSnapshot.map((stat) => (
            <StatTile
              key={stat.key}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              variant={stat.variant}
            />
          ))}
        </View>
      </ScrollView>

      <TabBar active={activeTab} onSelect={onSelectTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...type.heading(22),
    marginBottom: spacing.sm,
  },
  chip: {
    marginTop: 2,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  syncText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.neutral[400],
    marginLeft: spacing.xs,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[800],
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  scanButton: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  listCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    marginBottom: spacing.xxl,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.lg,
  },
});
