import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Check, MagnifyingGlass, QrCode, X } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts } from '../theme';
import { schoolApi, ApiError } from '../api';
import { formatDate, humanise, initialsOf, todayIso } from '../format';
import Card from '../components/Card';
import StateBlock from '../components/StateBlock';
import ScreenHeader from '../components/ScreenHeader';
import CountsRow from '../components/CountsRow';
import Select from '../components/Select';
import { FormError } from '../components/Field';

/* Calling the register and scanning cards are the same act from two directions: both land
   in attendance_records for the day, and the server upserts, so a class can be half-called
   and half-scanned without the two fighting. */
export default function RollCallScreen({
  user,
  selectedClass,
  onSelectClass,
  pinned,
  onSetPinned,
  onScan,
  onBack,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [classes, setClasses] = useState(null);
  const [classesError, setClassesError] = useState('');
  const [register, setRegister] = useState(null);
  const [registerError, setRegisterError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setClassesError('');
    schoolApi
      .rollCallClasses()
      .then((rows) => {
        if (cancelled) return;
        setClasses(rows);
        if (!selectedClass && rows.length) {
          onSelectClass(`${rows[0].grade_level}|${rows[0].class_section}`);
        }
      })
      .catch((err) => {
        if (!cancelled) setClassesError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // `selectedClass` is read to seed the first choice only; re-running on every change
    // would refetch the class list each time the teacher switches class.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectClass]);

  const loadRegister = useCallback(() => {
    if (!selectedClass) return undefined;
    let cancelled = false;
    const [gradeLevel, classSection] = selectedClass.split('|');
    setRegister(null);
    setRegisterError('');
    schoolApi
      .rollCallRegister({ gradeLevel, classSection })
      .then((next) => {
        if (!cancelled) setRegister(next);
      })
      .catch((err) => {
        if (!cancelled) setRegisterError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  useEffect(loadRegister, [loadRegister, attempt]);

  const markOne = async (student, status) => {
    setBusyId(student.student_id);
    setSaveError('');
    try {
      const res = await schoolApi.markAttendance({
        code: student.student_id,
        status,
        markedBy: (user && user.display_name) || '',
      });
      // The server echoes the row it wrote, so a mark that did not reach the database
      // cannot look like one that did.
      if (!res || !res.record || res.record.status !== status) {
        throw new ApiError('The server did not confirm the mark. Nothing was saved.', 0);
      }

      // Updated in place so a long register does not jump back to the top after every mark.
      setRegister((prev) => {
        if (!prev) return prev;
        const students = prev.students.map((s) =>
          s.student_id === student.student_id ? { ...s, status } : s,
        );
        const tally = (name) => students.filter((s) => s.status === name).length;
        return {
          ...prev,
          students,
          counts: {
            ...prev.counts,
            present: tally('present'),
            absent: tally('absent'),
            late: tally('late'),
            excused: tally('excused'),
            unmarked: students.filter((s) => !s.status).length,
          },
        };
      });
      if (pinned && pinned.student_id === student.student_id) {
        onSetPinned({ ...pinned, status });
      }
    } catch (err) {
      // Leave the row unmarked and say why, rather than a toast that scrolls away and
      // leaves the teacher believing the register is saved.
      setSaveError(
        err.status === 404
          ? 'This server has no roll call endpoint. It is running an older build than this app.'
          : `Not saved — ${err.message}`,
      );
    } finally {
      setBusyId('');
    }
  };

  const classOptions = useMemo(
    () =>
      (classes || []).map((c) => ({
        value: `${c.grade_level}|${c.class_section}`,
        label: `Grade ${c.grade_level} · ${c.class_section} — ${c.students} student${
          c.students === 1 ? '' : 's'
        }`,
      })),
    [classes],
  );

  const query = filter.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!register) return [];
    if (!query) return register.students;
    return register.students.filter(
      (s) =>
        String(s.full_name || '').toLowerCase().includes(query) ||
        String(s.student_id || '').toLowerCase().includes(query),
    );
  }, [register, query]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Roll call"
        onBack={onBack}
        right={
          <Pressable onPress={onScan} hitSlop={12}>
            <QrCode size={22} color={colors.text} weight="regular" />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.date}>{formatDate(todayIso())}</Text>

        {classesError ? (
          <StateBlock
            kind="error"
            message={classesError}
            onRetry={() => {
              setClasses(null);
              setClassesError('');
              setAttempt((n) => n + 1);
            }}
          />
        ) : !classes ? (
          <StateBlock kind="loading" message="Loading classes…" />
        ) : (
          <>
            <Select
              label="Class"
              title="Choose a class"
              value={selectedClass || ''}
              options={classOptions}
              onChange={onSelectClass}
              placeholder="Choose a class…"
            />

            <View style={styles.searchWrap}>
              <MagnifyingGlass size={18} color={colors.neutral[500]} weight="regular" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name or student ID"
                placeholderTextColor={colors.neutral[600]}
                value={filter}
                onChangeText={setFilter}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {filter ? (
                <Pressable onPress={() => setFilter('')} hitSlop={10}>
                  <X size={16} color={colors.neutral[500]} weight="regular" />
                </Pressable>
              ) : null}
            </View>

            <FormError message={saveError} style={styles.saveError} />

            {/* A student pulled up by a scan sits above the register, so marking somebody
                the class list does not contain still works — attendance belongs to a
                student, not to a class. */}
            {pinned ? (
              <View style={styles.pinnedWrap}>
                <View style={styles.pinnedHead}>
                  <Text style={styles.pinnedLabel}>Pulled up</Text>
                  <Pressable onPress={() => onSetPinned(null)} hitSlop={12}>
                    <X size={15} color={colors.neutral[500]} weight="regular" />
                  </Pressable>
                </View>
                <Card style={styles.pinnedCard}>
                  <MarkRow
                    student={pinned}
                    busy={busyId === pinned.student_id}
                    onMark={(status) => markOne(pinned, status)}
                    isLast
                    styles={styles}
                    colors={colors}
                  />
                </Card>
              </View>
            ) : null}

            {registerError ? (
              <StateBlock
                kind="error"
                message={registerError}
                onRetry={() => setAttempt((n) => n + 1)}
              />
            ) : !register ? (
              <StateBlock kind="loading" message="Loading the register…" />
            ) : (
              <>
                <CountsRow
                  style={styles.counts}
                  counts={[
                    [register.counts.present, 'Present'],
                    [register.counts.absent, 'Absent'],
                    [register.counts.unmarked, 'Unmarked'],
                  ]}
                />

                {!register.students.length ? (
                  <StateBlock message="No active students in this class." />
                ) : !shown.length ? (
                  <StateBlock message={`Nobody in this class matches “${filter.trim()}”.`} />
                ) : (
                  <Card style={styles.listCard}>
                    {shown.map((student, index) => (
                      <MarkRow
                        key={student.student_id}
                        student={student}
                        busy={busyId === student.student_id}
                        onMark={(status) => markOne(student, status)}
                        isLast={index === shown.length - 1}
                        styles={styles}
                        colors={colors}
                      />
                    ))}
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MarkRow({ student, busy, onMark, isLast, styles, colors }) {
  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(student.full_name) || '?'}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {student.full_name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {`${student.student_id}${student.status ? ` · ${humanise(student.status)}` : ''}`}
        </Text>
      </View>
      <View style={styles.markButtons}>
        {[
          ['present', Check, colors.status.green, colors.status.greenBg],
          ['absent', X, colors.status.red, colors.status.redBg],
        ].map(([status, Icon, tint, tintBg]) => {
          const on = student.status === status;
          return (
            <Pressable
              key={status}
              accessibilityLabel={`Mark ${student.full_name} ${status}`}
              disabled={busy}
              onPress={() => onMark(status)}
              style={({ pressed }) => [
                styles.markBtn,
                { borderColor: on ? tint : colors.neutral[800] },
                on && { backgroundColor: tintBg },
                (pressed || busy) && styles.markBtnPressed,
              ]}
            >
              <Icon size={16} color={on ? tint : colors.neutral[500]} weight="bold" />
            </Pressable>
          );
        })}
      </View>
    </View>
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
      paddingBottom: spacing.xxl * 2,
    },
    date: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: colors.neutral[500],
      marginBottom: spacing.lg,
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
      marginTop: spacing.lg,
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
    saveError: {
      marginTop: spacing.md,
    },
    counts: {
      marginTop: spacing.lg,
    },
    pinnedWrap: {
      marginTop: spacing.xl,
    },
    pinnedHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    pinnedLabel: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.accentRamp[300],
    },
    pinnedCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
      borderColor: colors.accentRamp[700],
    },
    listCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
      marginTop: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[800],
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: radius.lg,
      backgroundColor: colors.accentRamp[800],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
    },
    avatarText: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      color: colors.accentRamp[100],
    },
    rowBody: {
      flex: 1,
      marginRight: spacing.md,
    },
    rowName: {
      fontFamily: fonts.medium,
      fontSize: 14.5,
      color: colors.text,
      marginBottom: 2,
    },
    rowSub: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: colors.neutral[500],
    },
    markButtons: {
      flexDirection: 'row',
    },
    markBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.sm,
    },
    markBtnPressed: {
      opacity: 0.6,
    },
  });
