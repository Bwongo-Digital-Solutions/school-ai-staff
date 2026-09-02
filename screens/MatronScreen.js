/* The matron's screen, on the phone she carries round the dormitories.

   She could already scan a card and see a student's room and contacts. What she could not do was
   work from her own list — and a matron's evening is a list: who is in bed, who is in the sick bay,
   and who arrived without their bedding.

   Three tabs, in the order the evening runs. The roll call is first because it is what she opens
   the app for at nine o'clock.

   The four answers at roll call are deliberate. A child in the sick bay and a child nobody can find
   are both "not in bed", and recording them the same way would turn every sick child into a missing
   person. 'away' is the one the office signed out. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, StyleSheet, RefreshControl } from 'react-native';
import { Bed, FirstAid, Heartbeat, Moon, SignOut, Warning } from 'phosphor-react-native';

import { useTheme, spacing, fonts, radius, type } from '../theme';
import { schoolApi, ApiError } from '../api';
import { alertSuccess, alertError } from '../alerts';
import { formatTime } from '../format';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Field, { FormError } from '../components/Field';
import StatTile from '../components/StatTile';
import StateBlock from '../components/StateBlock';

const TABS = [
  { key: 'roll', label: 'Roll call' },
  { key: 'sickbay', label: 'Sick bay' },
  { key: 'welfare', label: 'Welfare' },
];

const ANSWERS = [
  { value: 'present', label: 'Present' },
  { value: 'sick_bay', label: 'Sick bay' },
  { value: 'away', label: 'Away' },
  { value: 'absent', label: 'Absent' },
];

const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  sick_bay: 'Sick bay',
  away: 'Away',
};

export default function MatronScreen({ user, onBack }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState('roll');
  const [summary, setSummary] = useState(null);
  const [roll, setRoll] = useState(null);
  const [sick, setSick] = useState(null);
  const [welfare, setWelfare] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');

  // Admitting somebody: which student, and what is wrong with them.
  const [admitting, setAdmitting] = useState('');
  const [complaint, setComplaint] = useState('');
  const [temperature, setTemperature] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setError('');
    try {
      const [dash, rollData, sickData, welfareData] = await Promise.all([
        schoolApi.matronDashboard(),
        schoolApi.dormRoll(),
        schoolApi.sickBay(),
        schoolApi.matronWelfare(),
      ]);
      setSummary(dash);
      setRoll((rollData && rollData.students) || []);
      setSick(sickData);
      setWelfare(welfareData);
    } catch (err) {
      setRoll([]); setSick([]); setWelfare([]);
      setError(err instanceof ApiError ? err.message : 'Could not load the dormitories.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load({ quiet: true });
    setRefreshing(false);
  };

  const mark = async (entry, status) => {
    setBusy(entry.id);
    setError('');
    try {
      await schoolApi.markDorm({ studentId: entry.id, status });
      alertSuccess(STATUS_LABELS[status], entry.full_name);
      /* Refetched rather than patched here: the roll should be what the server says it is, not
         what this screen believes it just did. */
      await load({ quiet: true });
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : 'Not recorded.';
      setError(detail);
      alertError('Not recorded', detail);
    } finally {
      setBusy('');
    }
  };

  const admit = async (entry) => {
    if (!complaint.trim()) {
      setError('Say what the student is complaining of.');
      return;
    }
    setBusy(entry.id);
    setError('');
    try {
      const result = await schoolApi.admitToSickBay({
        studentId: entry.id,
        complaint: complaint.trim(),
        temperature: temperature.trim() ? Number(temperature) : undefined,
      });
      // Already lying there: say so rather than reporting a second admission.
      if (result && result.already) alertSuccess('Already in the sick bay', entry.full_name);
      else alertSuccess('Admitted', entry.full_name);
      setAdmitting('');
      setComplaint('');
      setTemperature('');
      await load({ quiet: true });
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : 'Not recorded.';
      setError(detail);
      alertError('Not recorded', detail);
    } finally {
      setBusy('');
    }
  };

  const discharge = async (record) => {
    setBusy(record.id);
    setError('');
    try {
      await schoolApi.dischargeFromSickBay({ recordId: record.id, outcome: 'discharged' });
      alertSuccess('Discharged', record.full_name);
      await load({ quiet: true });
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : 'Not recorded.';
      setError(detail);
      alertError('Not recorded', detail);
    } finally {
      setBusy('');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Dormitories" onBack={onBack} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.neutral[400]} />
        }
      >
        {summary ? (
          <View style={styles.tiles}>
            <StatTile icon={Bed} label="Boarders" value={String(summary.boarders)} />
            <StatTile icon={Warning} label="Not marked" value={String(summary.roll.unmarked)} />
            <StatTile icon={FirstAid} label="Sick bay" value={String(summary.in_sick_bay)} />
            <StatTile icon={SignOut} label="Signed out" value={String(summary.signed_out)} />
          </View>
        ) : null}

        {/* A segmented control built from the app's own Button rather than the shared TabBar:
            that component is the bottom navigation and is driven by the signed-in user's allowed
            tabs, which is a different thing from three sections inside one screen. */}
        <View style={styles.tabs}>
          {TABS.map((entry) => (
            <Button
              key={entry.key}
              label={entry.label}
              variant={tab === entry.key ? 'primary' : 'ghost'}
              onPress={() => { setTab(entry.key); setError(''); }}
              style={styles.tabButton}
            />
          ))}
        </View>

        {error ? <FormError message={error} style={styles.topError} /> : null}

        {tab === 'roll' && (
          roll === null ? (
            <StateBlock kind="loading" message="Loading the roll…" />
          ) : roll.length === 0 ? (
            <StateBlock message="Nobody has been given a bed yet." />
          ) : (
            roll.map((entry) => (
              <Card key={entry.id} style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.rowMain}>
                    <Text style={styles.name}>{entry.full_name}</Text>
                    <Text style={styles.meta}>
                      {`${entry.hostel_name} ${entry.room_number}`}
                      {entry.bed_number ? ` · bed ${entry.bed_number}` : ''}
                    </Text>
                  </View>
                  {entry.status ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{STATUS_LABELS[entry.status]}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Shown beside an unmarked name so nobody goes hunting a child who is already
                    accounted for somewhere else. */}
                {!entry.status && entry.in_sick_bay ? (
                  <Text style={styles.hint}>In the sick bay</Text>
                ) : null}
                {!entry.status && entry.signed_out ? (
                  <Text style={styles.hint}>Signed out at the gate</Text>
                ) : null}

                <View style={styles.answers}>
                  {ANSWERS.map((answer) => (
                    <Button
                      key={answer.value}
                      label={answer.label}
                      variant={entry.status === answer.value ? 'primary' : 'ghost'}
                      onPress={() => mark(entry, answer.value)}
                      disabled={!!busy}
                      loading={busy === entry.id}
                      style={styles.answerButton}
                    />
                  ))}
                </View>

                {admitting === entry.id ? (
                  <>
                    <Field
                      label="What is wrong?"
                      value={complaint}
                      onChangeText={setComplaint}
                      placeholder="Headache and fever"
                      editable={!busy}
                      style={styles.field}
                    />
                    <Field
                      label="Temperature (°C)"
                      value={temperature}
                      onChangeText={setTemperature}
                      placeholder="38.4"
                      keyboardType="decimal-pad"
                      editable={!busy}
                    />
                    <Button
                      label={busy === entry.id ? 'Admitting…' : 'Admit to the sick bay'}
                      icon={FirstAid}
                      variant="primary"
                      onPress={() => admit(entry)}
                      loading={busy === entry.id}
                      disabled={!!busy}
                      style={styles.action}
                    />
                    <Button
                      label="Cancel"
                      variant="ghost"
                      onPress={() => { setAdmitting(''); setComplaint(''); setTemperature(''); setError(''); }}
                      disabled={!!busy}
                    />
                  </>
                ) : (
                  <Button
                    label="Take to the sick bay"
                    icon={FirstAid}
                    variant="ghost"
                    onPress={() => { setAdmitting(entry.id); setComplaint(''); setTemperature(''); setError(''); }}
                    disabled={!!busy}
                  />
                )}
              </Card>
            ))
          )
        )}

        {tab === 'sickbay' && (
          sick === null ? (
            <StateBlock kind="loading" message="Loading the sick bay…" />
          ) : sick.length === 0 ? (
            <StateBlock message="Nobody is unwell just now." />
          ) : (
            sick.map((record) => (
              <Card key={record.id} style={styles.card}>
                <Text style={styles.name}>{record.full_name}</Text>
                <Text style={styles.meta}>{record.student_number}</Text>

                <View style={styles.detail}>
                  <Heartbeat size={15} color={colors.neutral[500]} weight="regular" />
                  <Text style={styles.detailText}>
                    {record.complaint}
                    {record.temperature ? ` · ${record.temperature}°C` : ''}
                  </Text>
                </View>
                <View style={styles.detail}>
                  <Moon size={15} color={colors.neutral[500]} weight="regular" />
                  <Text style={styles.detailText}>
                    {`Admitted ${formatTime(record.admitted_at)}`}
                    {record.recorded_by ? ` by ${record.recorded_by}` : ''}
                  </Text>
                </View>
                {record.parent_phone ? (
                  <Text style={styles.hint}>{`${record.parent_name || 'Guardian'} · ${record.parent_phone}`}</Text>
                ) : null}

                <Button
                  label={busy === record.id ? 'Recording…' : 'Discharge'}
                  variant="primary"
                  onPress={() => discharge(record)}
                  loading={busy === record.id}
                  disabled={!!busy}
                  style={styles.action}
                />
              </Card>
            ))
          )
        )}

        {tab === 'welfare' && (
          welfare === null ? (
            <StateBlock kind="loading" message="Loading…" />
          ) : welfare.length === 0 ? (
            <StateBlock message="Every boarder has brought what was asked of them." />
          ) : (
            welfare.map((student) => (
              <Card key={student.id} style={styles.card}>
                <Text style={styles.name}>{student.full_name}</Text>
                <Text style={styles.meta}>
                  {[student.hostel_name, student.room_number].filter(Boolean).join(' ')}
                </Text>
                <Text style={styles.owing}>
                  {`Still to bring ${student.owing} item${student.owing === 1 ? '' : 's'}`}
                </Text>
                <Text style={styles.detailText}>{student.items}</Text>
              </Card>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl * 2,
    },
    tiles: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.sm,
    },
    tabs: {
      flexDirection: 'row',
      marginVertical: spacing.xl,
      marginHorizontal: -spacing.xs,
    },
    tabButton: {
      flex: 1,
      marginHorizontal: spacing.xs,
    },
    topError: { marginBottom: spacing.lg },
    card: {
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    rowMain: { flex: 1 },
    name: { ...type(colors).heading(17) },
    meta: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: colors.neutral[500],
      marginTop: 2,
    },
    badge: {
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.neutral[700],
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    badgeText: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: colors.neutral[400],
    },
    hint: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: colors.neutral[500],
      marginTop: spacing.sm,
    },
    answers: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.lg,
      marginHorizontal: -spacing.xs,
    },
    answerButton: {
      flexGrow: 1,
      flexBasis: '45%',
      marginHorizontal: spacing.xs,
      marginBottom: spacing.sm,
    },
    detail: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: spacing.lg,
    },
    detailText: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.neutral[400],
      marginLeft: spacing.sm,
    },
    owing: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.status.amber || colors.text,
      marginTop: spacing.lg,
    },
    field: { marginTop: spacing.xl },
    action: {
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
  });
