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
import { MagnifyingGlass, X } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { fullName } from '../format';
import Card from '../components/Card';
import StudentRow from '../components/StudentRow';
import StateBlock from '../components/StateBlock';

export default function StudentsScreen({
  students,
  loading,
  error,
  onRetry,
  onOpenStudent,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    ? `${matches.length} of ${students.length}`
    : `${students.length} enrolled`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        {loading || error ? null : <Text style={styles.count}>{count}</Text>}
      </View>

      <View style={styles.searchWrap}>
        <MagnifyingGlass size={18} color={colors.neutral[500]} weight="regular" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, ID or guardian"
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
