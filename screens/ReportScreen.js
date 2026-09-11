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
import { CheckSquare, Square, Export, EnvelopeSimple, Printer } from 'phosphor-react-native';

import { useTheme, spacing, fonts, type } from '../theme';
import { schoolApi, reportUrl, reportCardUrl, ApiError } from '../api';
import { shareDocument, printDocument } from '../share';
import { alertSuccess, alertError } from '../alerts';
import { classOf, dateTime } from '../format';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Field, { FormError } from '../components/Field';
import SectionLabel from '../components/SectionLabel';
import { useT } from '../i18n';

/* Mirrors REPORT_SECTIONS on the server. A section the server does not know is dropped
   there rather than rejected, so the two can drift by a release without breaking a send. */
const SECTIONS = [
  { key: 'performance', label: 'report.sectionPerformance', hint: 'report.sectionPerformanceHint' },
  { key: 'attendance', label: 'report.sectionAttendance', hint: 'report.sectionAttendanceHint' },
  { key: 'fees', label: 'report.sectionFees', hint: 'report.sectionFeesHint' },
  { key: 'payments', label: 'report.sectionPayments', hint: 'report.sectionPaymentsHint' },
  { key: 'info', label: 'report.sectionInfo', hint: 'report.sectionInfoHint' },
];

const DEFAULT_SELECTION = ['performance', 'attendance', 'fees', 'info'];

/* The two documents a family can be given. The record is everything on file; the card is the
   term's marks, laid out the way a report card is. The section list below belongs to the record
   only — a report card has no parts to choose between. */
const RECORD = 'record';
const CARD = 'card';

export default function ReportScreen({ card, user, onBack }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useT();

  const student = card.student;
  const parentEmail = (card.parents && card.parents.parent_email) || '';
  const parentPhone = (card.parents && card.parents.parent_phone) || '';

  const [document, setDocument] = useState(RECORD);
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

  const isCard = document === CARD;

  /* Where the chosen document lives, and what the file should be called once it is on the phone.
     Both actions below need the pair, and a report card has no sections to pass. */
  const documentSource = () =>
    isCard
      ? {
          url: reportCardUrl({ code: student.student_id, requesterRole: role }),
          filename: `${student.student_id}-report-card.pdf`,
        }
      : {
          url: reportUrl({ code: student.student_id, sections: ordered, requesterRole: role, actorName }),
          filename: `${student.student_id}-report.pdf`,
        };

  /* A record with nothing ticked is the one way either action can be asked for something that
     cannot be built. A card has no sections, so it is never in that state. */
  const missingSections = () => {
    if (isCard || ordered.length) return false;
    setError(t('report.chooseSection'));
    return true;
  };

  const share = async () => {
    if (missingSections()) return;
    setBusy('share');
    setError('');
    try {
      const { url, filename } = documentSource();
      await shareDocument(url, filename, { title: student.full_name });

      /* Android does not say which app was chosen, or whether the share completed. This
         records that the report was handed over, which is all anyone can honestly claim.

         Only the record is logged as a report to the family. A report card handed to a parent is
         the same act, but the send log is keyed to the sections a report carried, and a card has
         none — recording it as a report with no sections would read as an empty one. */
      if (!isCard) {
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
        refreshLastSent();
      }
      alertSuccess(t('report.handedOver'), t('report.handedOverWhere'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('report.shareFailed'));
      alertError(t('report.notShared'), err);
    } finally {
      setBusy('');
    }
  };

  /* Printing opens Android's own dialog, which lists whatever printers this phone knows about and
     offers Save as PDF besides. Like the share sheet it belongs to the operating system and never
     says whether anything was printed — so nothing is written to the send log here. */
  const print = async () => {
    if (missingSections()) return;
    setBusy('print');
    setError('');
    try {
      const { url, filename } = documentSource();
      await printDocument(url, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('report.printFailed'));
      alertError(t('report.notPrinted'), err);
    } finally {
      setBusy('');
    }
  };

  const sendEmail = async () => {
    if (missingSections()) return;
    const to = email.trim();
    if (!to.includes('@')) {
      setError(t('report.enterEmail'));
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
      alertSuccess(t('report.emailed'), to);
      refreshLastSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('report.emailFailed'));
      alertError(t('report.notEmailed'), err);
    } finally {
      setBusy('');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={t('report.title')} onBack={onBack} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.name}>{student.full_name}</Text>
          <Text style={styles.meta}>
            {`${student.student_id} · ${classOf(student)}`}
          </Text>
          {lastSent ? (
            <Text style={styles.lastSent}>
              {t(lastSent.channel === 'email' ? 'report.lastEmailed' : 'report.lastHandedOver', {
                when: dateTime(lastSent.at),
                who: lastSent.by,
              })}
            </Text>
          ) : (
            <Text style={styles.lastSent}>{t('report.noneYet')}</Text>
          )}
        </Card>

        <SectionLabel>{t('report.whichDocument')}</SectionLabel>
        <Card style={styles.card}>
          {[
            { key: RECORD, label: 'report.documentRecord', hint: 'report.documentRecordHint' },
            { key: CARD, label: 'report.documentCard', hint: 'report.documentCardHint' },
          ].map((option, index) => {
            const on = document === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => { setError(''); setDocument(option.key); }}
                style={[styles.option, index > 0 && styles.optionSpaced]}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                {on ? (
                  <CheckSquare size={22} color={colors.accent} weight="fill" />
                ) : (
                  <Square size={22} color={colors.neutral[600]} weight="regular" />
                )}
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{t(option.label)}</Text>
                  <Text style={styles.optionHint}>{t(option.hint)}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>

        {isCard ? null : (
          <>
        <SectionLabel>{t('report.whatToInclude')}</SectionLabel>
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
                  <Text style={styles.optionLabel}>{t(section.label)}</Text>
                  <Text style={styles.optionHint}>{t(section.hint)}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
          </>
        )}

        <SectionLabel>{t('report.sendIt')}</SectionLabel>
        <Card style={styles.card}>
          <Text style={styles.caption}>{t('report.printWhat')}</Text>
          <Button
            label={busy === 'print' ? t('report.preparing') : t('report.print')}
            icon={Printer}
            variant="primary"
            onPress={print}
            loading={busy === 'print'}
            disabled={!!busy}
            style={styles.action}
          />

          <Text style={styles.caption}>{t('report.shareWhat')}</Text>
          <Button
            label={busy === 'share' ? t('report.preparing') : t('report.share')}
            icon={Export}
            variant="secondary"
            onPress={share}
            loading={busy === 'share'}
            disabled={!!busy}
            style={styles.action}
          />

          {/* Email carries the record only. The server builds an emailed report from the list of
              sections it was given, and a report card has none — offering the button here would
              email the record while the screen said "report card". */}
          {isCard ? (
            <Text style={styles.caption}>{t('report.cardNoEmail')}</Text>
          ) : (
            <>
              <View style={styles.divider} />

              <Field
                label={t('report.parentEmail')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('report.parentEmailHint')}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!busy}
              />
              <Button
                label={busy === 'email' ? t('report.sending') : t('report.email')}
                icon={EnvelopeSimple}
                variant="ghost"
                onPress={sendEmail}
                loading={busy === 'email'}
                disabled={!!busy}
                style={styles.action}
              />
            </>
          )}

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
