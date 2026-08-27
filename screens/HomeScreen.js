import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import {
  CalendarCheck,
  ChartLineUp,
  Coins,
  ListChecks,
  Moon,
  QrCode,
  UsersThree,
} from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { useBranding } from '../branding';
import { schoolApi } from '../api';
import { amount, todayIso } from '../format';
import { designationOf, hasRoster, roleLabel, scanPurpose } from '../roles';
import { GATE_ACTIONS } from './GateConfirmScreen';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Button from '../components/Button';
import Select from '../components/Select';
import StudentRow from '../components/StudentRow';
import StatTile from '../components/StatTile';
import StateBlock from '../components/StateBlock';
import SectionLabel from '../components/SectionLabel';
import CountsRow from '../components/CountsRow';
import AnimatedBell from '../components/AnimatedBell';
import MovementList from '../components/MovementList';

function summarise(students, fees, roster) {
  if (!roster) return { students: '', gpa: '', attendance: '', owing: '' };
  if (!students.length) return { students: 0, gpa: '—', attendance: '—', owing: '—' };
  const gpa = students.reduce((a, s) => a + Number(s.gpa || 0), 0) / students.length;
  const attendance =
    students.reduce((a, s) => a + Number(s.attendance_rate || 0), 0) / students.length;
  const owing = fees.reduce((a, f) => a + Number(f.balance_due || 0), 0);
  return {
    students: students.length,
    gpa: gpa ? gpa.toFixed(2) : '—',
    attendance: attendance ? `${attendance.toFixed(0)}%` : '—',
    owing: fees.length ? amount(owing) : '—',
  };
}

export default function HomeScreen({
  user,
  students,
  fees,
  recent,
  loading,
  error,
  unread,
  onRetry,
  onScanPress,
  onOpenStudent,
  onOpenMessages,
  onOpenRollCall,
  onStartGateAction,
}) {
  const { colors, toggleTheme } = useTheme();
  const { name: schoolName, logo } = useBranding();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const roster = hasRoster(user);
  const totals = useMemo(() => summarise(students, fees, roster), [students, fees, roster]);
  const recentStudents = useMemo(
    () => recent.map((id) => students.find((s) => s.id === id)).filter(Boolean),
    [recent, students],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />

          <View style={styles.headerLeft}>
            <Text style={styles.schoolName} numberOfLines={1}>
              {schoolName}
            </Text>
            <Text style={styles.greeting} numberOfLines={1}>
              Hello, {(user && user.display_name) || 'there'}
            </Text>
            {user ? <Chip label={roleLabel(user)} style={styles.chip} /> : null}
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={toggleTheme} hitSlop={10} style={styles.iconButton}>
              <Moon size={20} color={colors.neutral[400]} weight="regular" />
            </Pressable>
            <AnimatedBell unread={unread} onPress={onOpenMessages} style={styles.iconButton} />
          </View>
        </View>

        <Button
          label="Scan QR / Student ID"
          icon={QrCode}
          variant="primary"
          onPress={onScanPress}
          style={styles.scanButton}
        />

        {roster && loading ? (
          <StateBlock kind="loading" message="Loading school data…" />
        ) : roster && error ? (
          <StateBlock kind="error" message={error} onRetry={onRetry} />
        ) : (
          <>
            <SectionLabel style={styles.firstLabel}>School overview</SectionLabel>
            <View style={styles.statGrid}>
              <StatTile
                icon={UsersThree}
                label="Students"
                value={String(totals.students)}
                variant="gradient"
              />
              <StatTile
                icon={ChartLineUp}
                label="Average GPA"
                value={totals.gpa}
                variant="gradient"
              />
              <StatTile icon={CalendarCheck} label="Attendance" value={totals.attendance} />
              <StatTile icon={Coins} label="Fees owing" value={totals.owing} />
            </View>

            {!roster ? (
              designationOf(user) === 'askari' ? (
                <>
                  <GateActions onStart={onStartGateAction} styles={styles} />
                  {/* The gate's own board: today's traffic, without scanning anyone. */}
                  <GateLog styles={styles} />
                </>
              ) : (
                <StateBlock message={scanPurpose(user)} style={styles.supportHint} />
              )
            ) : (
              <>
                {/* Calling the register is a daily job for a class teacher, so it gets its
                    own way in rather than being reachable only by scanning somebody. */}
                <Button
                  label="Call the register"
                  icon={ListChecks}
                  variant="secondary"
                  onPress={onOpenRollCall}
                  style={styles.rollCallButton}
                />

                <SectionLabel>Recent students</SectionLabel>
                {recentStudents.length ? (
                  <Card style={styles.listCard}>
                    {recentStudents.map((student, index) => (
                      <StudentRow
                        key={student.id}
                        student={student}
                        onPress={() => onOpenStudent(student)}
                        isLast={index === recentStudents.length - 1}
                      />
                    ))}
                  </Card>
                ) : (
                  <StateBlock message="Students you open will appear here." />
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* The gate keeper's home leads with the three jobs they actually do. Choosing one opens
   the scanner; the scan lands on a confirmation rather than writing straight away. */
function GateActions({ onStart, styles }) {
  const [choice, setChoice] = useState('');
  const options = useMemo(
    () => Object.keys(GATE_ACTIONS).map((key) => ({ value: key, label: GATE_ACTIONS[key].label })),
    [],
  );
  const hint = choice ? GATE_ACTIONS[choice].hint : 'Pick an action and the scanner opens.';

  return (
    <>
      <SectionLabel>At the gate</SectionLabel>
      <Card style={styles.gateCard}>
        <Select
          label="What are you doing?"
          title="What are you doing?"
          value={choice}
          options={options}
          placeholder="Choose an action…"
          onChange={(next) => {
            setChoice(next);
            onStart(next);
          }}
        />
        <Text style={styles.gateHint}>{hint}</Text>
      </Card>
    </>
  );
}

function GateLog({ styles }) {
  const [log, setLog] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setLog(null);
    schoolApi
      .gateLog({ date: todayIso(), limit: 60 })
      .then((next) => {
        if (!cancelled) setLog(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <>
      <SectionLabel>Today at the gate</SectionLabel>
      {error ? (
        <StateBlock kind="error" message={error} onRetry={reload} />
      ) : !log ? (
        <StateBlock kind="loading" message="Loading the gate log…" />
      ) : (
        <>
          <CountsRow
            counts={[
              [log.counts.out, 'Out'],
              [log.counts.in, 'In'],
              [log.counts.declined, 'Declined'],
            ]}
          />
          {!log.movements.length ? (
            <StateBlock message="Nobody has passed the gate today." />
          ) : (
            <Card style={styles.listCard}>
              <MovementList movements={log.movements} />
            </Card>
          )}
        </>
      )}
    </>
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
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    headerLeft: {
      flex: 1,
      marginRight: spacing.lg,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      padding: spacing.sm,
      marginLeft: spacing.sm,
    },
    logo: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      marginRight: spacing.lg,
    },
    schoolName: {
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 0.3,
      color: colors.neutral[500],
      marginBottom: 2,
    },
    greeting: {
      ...type(colors).heading(22),
      marginBottom: spacing.sm,
    },
    chip: {
      marginTop: 2,
    },
    scanButton: {
      marginBottom: spacing.md,
    },
    firstLabel: {
      marginTop: spacing.lg,
    },
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.lg,
    },
    rollCallButton: {
      marginTop: spacing.xxl,
    },
    listCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    gateCard: {
      padding: spacing.lg,
    },
    gateHint: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginTop: spacing.lg,
    },
    supportHint: {
      paddingTop: spacing.xxl * 1.5,
    },
  });
