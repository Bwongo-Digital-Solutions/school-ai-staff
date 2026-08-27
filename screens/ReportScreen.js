/* The report a parent actually receives.

   Staff pick what goes in it, then hand it over: Share opens the phone's own sheet, where
   WhatsApp sits alongside everything else, and Email asks the server to send it with the
   PDF attached.

   The two are not equally knowable, and the screen says so. An email either left the
   server or it did not. A share leaves through Android, which never tells the app which
   app was picked or whether anything was sent — so the wording is "handed over", never
   "sent to the parent", and the log records the same distinction. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, Pressable, StyleSheet } from 'react-native';
import { CheckSquare, Square, Export, EnvelopeSimple } from 'phosphor-react-native';

import { useTheme, spacing, fonts, type } from '../theme';
import { schoolApi, reportUrl, ApiError } from '../api';
import { shareDocument } from '../share';
import { alertSuccess, alertError } from '../alerts';
import { dateTime } from '../format';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Field, { FormError } from '../components/Field';
import SectionLabel from '../components/SectionLabel';

/* Mirrors REPORT_SECTIONS on the server. A section the server does not know is dropped
   there rather than rejected, so the two can drift by a release without breaking a send. */
const SECTIONS = [
  { key: 'performance', label: 'Academic performance', hint: 'Subject marks, grades and the average' },
  { key: 'attendance', label: 'Attendance', hint: 'Rate, days present and days missed' },
  { key: 'fees', label: 'Fees', hint: 'What has been billed and what is outstanding' },
  { key: 'payments', label: 'Payment history', hint: 'Every payment recorded, with receipt numbers' },
  { key: 'info', label: 'Student details', hint: 'Date of birth, guardian and emergency contact' },
];

const DEFAULT_SELECTION = ['performance', 'attendance', 'fees', 'info'];

export default function ReportScreen({ card, user, onBack }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const student = card.student;
  const parentEmail = (card.parents && card.parents.parent_email) || '';
  const parentPhone = (card.parents && card.parents.parent_phone) || '';

  const [chosen, setChosen] = useState(DEFAULT_SELECTION);
  const [email, setEmail] = useState(parentEmail);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [lastSent, setLastSent] = useState(null);

  const role = (user && user.role) || '';
  const actorName = (user && user.display_name) || '';
  const actorEmail = (user && user.auth_email) || '';

  const refreshLastSent = useCallback(async () => {
    try {
      setLastSent(await schoolApi.lastReportSent({ code: student.student_id, requesterRole: role }));
    } catch {
      /* the history is a courtesy — a server that cannot answer must not block a send */
    }
  }, [student.student_id, role]);

  useEffect(() => {
    refreshLastSent();
  }, [refreshLastSent]);

  const toggle = (key) => {
    setError('');
    setChosen((prev) => (prev.includes(key) ? prev.filter((name) => name !== key) : [...prev, key]));
  };

  /* Kept in the server's order rather than the order they were tapped, so the document
     always reads the same way round. */
  const ordered = SECTIONS.filter((section) => chosen.includes(section.key)).map((s) => s.key);

  const share = async () => {
    if (!ordered.length) {
      setError('Choose at least one section to include.');
      return;
    }
    setBusy('share');
    setError('');
    try {
      await shareDocument(
        reportUrl({ code: student.student_id, sections: ordered, requesterRole: role, actorName }),
        `${student.student_id}-report.pdf`,
        { title: `${student.full_name} — report` },
      );
      /* Android does not say which app was chosen, or whether the share completed. This
         records that the report was handed over, which is all anyone can honestly claim. */
      await schoolApi
        .recordReportShare({
          code: student.student_id,
          channel: 'share',
          target: parentPhone,
          sections: ordered,
          requesterRole: role,
          actorName,
          actorEmail,
        })
        .catch(() => {});
      alertSuccess('Report handed over', 'Saved to this student’s record');
      refreshLastSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The report could not be shared.');
      alertError('Not shared', err);
    } finally {
      setBusy('');
    }
  };

  const sendEmail = async () => {
    if (!ordered.length) {
      setError('Choose at least one section to include.');
      return;
    }
    const to = email.trim();
    if (!to.includes('@')) {
      setError('Enter the parent’s email address.');
      return;
    }
    setBusy('email');
    setError('');
    try {
      await schoolApi.sendReportEmail({
        code: student.student_id,
        to,
        sections: ordered,
        requesterRole: role,
        actorName,
        actorEmail,
      });
      alertSuccess('Report emailed', to);
      refreshLastSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The report could not be emailed.');
      alertError('Not emailed', err);
    } finally {
      setBusy('');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Send a report" onBack={onBack} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.name}>{student.full_name}</Text>
          <Text style={styles.meta}>
            {`${student.student_id} · Grade ${student.grade_level ?? '—'} ${student.class_section || ''}`.trim()}
          </Text>
          {lastSent ? (
            <Text style={styles.lastSent}>
              {`Last report ${lastSent.channel === 'email' ? 'emailed' : 'handed over'} ${dateTime(
                lastSent.at,
              )} by ${lastSent.by}`}
            </Text>
          ) : (
            <Text style={styles.lastSent}>No report has been sent to this family yet.</Text>
          )}
        </Card>

        <SectionLabel>What to include</SectionLabel>
        <Card style={styles.card}>
          {SECTIONS.map((section, index) => {
            const on = chosen.includes(section.key);
            const Icon = on ? CheckSquare : Square;
            return (
              <Pressable
                key={section.key}
                onPress={() => toggle(section.key)}
                style={[styles.option, index > 0 && styles.optionSpaced]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <Icon size={22} color={on ? colors.accent : colors.neutral[600]} weight={on ? 'fill' : 'regular'} />
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{section.label}</Text>
                  <Text style={styles.optionHint}>{section.hint}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>

        <SectionLabel>Send it</SectionLabel>
        <Card style={styles.card}>
          <Text style={styles.caption}>
            Share opens this phone’s share sheet, where WhatsApp sits alongside everything else.
          </Text>
          <Button
            label={busy === 'share' ? 'Preparing…' : 'Share the report'}
            icon={Export}
            variant="primary"
            onPress={share}
            loading={busy === 'share'}
            disabled={!!busy}
            style={styles.action}
          />

          <View style={styles.divider} />

          <Field
            label="Parent email"
            value={email}
            onChangeText={setEmail}
            placeholder="parent@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!busy}
          />
          <Button
            label={busy === 'email' ? 'Sending…' : 'Email the report'}
            icon={EnvelopeSimple}
            variant="ghost"
            onPress={sendEmail}
            loading={busy === 'email'}
            disabled={!!busy}
            style={styles.action}
          />

          {error ? <FormError message={error} /> : null}
        </Card>
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
    card: {
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    name: {
      ...type(colors).heading(18),
    },
    meta: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.neutral[500],
      marginTop: 2,
    },
    lastSent: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[600],
      marginTop: spacing.lg,
    },
    caption: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.neutral[500],
      marginBottom: spacing.lg,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    optionSpaced: {
      marginTop: spacing.xl,
    },
    optionText: {
      flex: 1,
      marginLeft: spacing.lg,
    },
    optionLabel: {
      fontFamily: fonts.medium,
      fontSize: 14.5,
      color: colors.text,
    },
    optionHint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 17,
      color: colors.neutral[600],
      marginTop: 2,
    },
    action: {
      marginTop: spacing.lg,
    },
    divider: {
      height: 1,
      backgroundColor: colors.neutral[800],
      marginVertical: spacing.xl,
    },
  });
