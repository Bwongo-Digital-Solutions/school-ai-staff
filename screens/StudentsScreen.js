import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { MagnifyingGlass, X, Printer } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { fullName } from '../format';
import Card from '../components/Card';
import StudentRow from '../components/StudentRow';
import StateBlock from '../components/StateBlock';
import { useT } from '../i18n';

export default function StudentsScreen({
  students,
  loading,
  error,
  onRetry,
  onOpenStudent,
  onPrintClass,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useT();
  const [search, setSearch] = useState('');

  /* The gateway has no substring operator, so matching happens over the list
     already fetched rather than as a query. */
  const query = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return students;
    return students.filter(
      (s) =>
        fullName(s).toLowerCase().includes(query) ||
        String(s.student_id || '').toLowerCase().includes(query) ||
        String(s.parent_name || '').toLowerCase().includes(query),
    );
  }, [students, query]);

  const count = query
    ? t('students.matching', { count: matches.length, total: students.length })
    : t('students.enrolled', { count: students.length });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tab.students')}</Text>
        {/* The count and the print button travel together on the right. Grouped rather than left
            as two more children of a space-between row, which would strand the count in the
            middle, and given their own centre alignment because the row's baseline is set for
            text and an icon has none. */}
        <View style={styles.headerRight}>
          {loading || error ? null : <Text style={styles.count}>{count}</Text>}
          {onPrintClass ? (
            <Pressable
              onPress={onPrintClass}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('printClass.title')}
            >
              <Printer size={22} color={colors.text} weight="regular" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <MagnifyingGlass size={18} color={colors.neutral[500]} weight="regular" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('students.search')}
          placeholderTextColor={colors.neutral[600]}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <X size={16} color={colors.neutral[500]} weight="regular" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <StateBlock kind="loading" message="Loading students…" />
        ) : error ? (
          <StateBlock kind="error" message={error} onRetry={onRetry} />
        ) : !students.length ? (
          <StateBlock message="No students found in the database." />
        ) : !matches.length ? (
          <StateBlock message={`Nothing matches “${search.trim()}”.`} />
        ) : (
          <Card style={styles.listCard}>
            {matches.map((student, index) => (
              <StudentRow
                key={student.id}
                student={student}
                onPress={() => onOpenStudent(student)}
                isLast={index === matches.length - 1}
              />
            ))}
          </Card>
        )}
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
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.lg,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    title: {
      ...type(colors).heading(22),
    },
    count: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.neutral[500],
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
    },
    searchInput: {
      flex: 1,
      marginLeft: spacing.sm,
      marginRight: spacing.sm,
      paddingVertical: 0,
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.text,
    },
    scrollContent: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl,
    },
    listCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
  });
