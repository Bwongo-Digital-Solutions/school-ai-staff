/* A whole class's documents, from the phone.

   Printing one child at a time is the Report screen; this is the end of term, when a teacher wants
   the set. The server builds it as one file — thirty report cards, or thirty whole records — and
   the phone either hands it to the print dialog or passes it on through the share sheet.

   A class set of records is a big document: several pages each, built while somebody waits, and
   then carried over whatever connection the school has. So the screen says how many children are
   in the class before anything starts, and it says which document is the heavy one. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, Pressable, StyleSheet } from 'react-native';
import { CheckSquare, Square, Export, Printer } from 'phosphor-react-native';

import { useTheme, spacing, fonts } from '../theme';
import { schoolApi, classReportCardsUrl, classReportsUrl, ApiError } from '../api';
import { shareDocument, printDocument } from '../share';
import { alertError } from '../alerts';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import { FormError } from '../components/Field';
import SectionLabel from '../components/SectionLabel';
import StateBlock from '../components/StateBlock';
import { useT } from '../i18n';

const CARDS = 'cards';
const RECORDS = 'records';

export default function PrintClassScreen({ user, onBack }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useT();

  const [classes, setClasses] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [chosen, setChosen] = useState(null);
  const [document, setDocument] = useState(CARDS);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const role = (user && user.role) || '';

  const load = useCallback(async () => {
    setLoadError('');
    try {
      setClasses(await schoolApi.rollCallClasses());
    } catch (err) {
      setClasses([]);
      setLoadError(err instanceof ApiError ? err.message : t('printClass.loadFailed'));
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  /* The same file either way, named for what it holds so a folder of these can be told apart
     after the fact — which class, which stream, which document. */
  const documentSource = () => {
    const grade = chosen.grade_level;
    const section = chosen.class_section;
    const where = `grade-${grade}${section ? `-${section}` : ''}`;

    return document === CARDS
      ? {
          url: classReportCardsUrl({ grade, section, requesterRole: role }),
          filename: `report-cards-${where}.pdf`,
        }
      : {
          url: classReportsUrl({ grade, section, requesterRole: role }),
          filename: `student-records-${where}.pdf`,
        };
  };

  /* A class with nobody in it has no document to build, and the server would refuse it anyway.
     Caught here so the refusal is a sentence about this class rather than a failed download —
     and so the count message below is never asked about zero students, where French would make
     "one student, this will be quick" out of an empty class. */
  const emptyClass = !!chosen && (Number(chosen.students) || 0) === 0;

  const run = async (which, action) => {
    if (!chosen) {
      setError(t('printClass.chooseClass'));
      return;
    }
    if (emptyClass) {
      setError(t('printClass.classEmpty'));
      return;
    }
    setBusy(which);
    setError('');
    try {
      const { url, filename } = documentSource();
      await action(url, filename);
    } catch (err) {
      const said = err instanceof ApiError ? err.message : t('printClass.failed');
      setError(said);
      alertError(t('printClass.notDone'), err);
    } finally {
      setBusy('');
    }
  };

  const print = () => run('print', (url, filename) => printDocument(url, filename));
  const share = () => run('share', (url, filename) => shareDocument(url, filename, {
    title: t(document === CARDS ? 'printClass.documentCards' : 'printClass.documentRecords'),
  }));

  const Choice = ({ on, label, hint, onPress, spaced }) => (
    <Pressable
      onPress={onPress}
      style={[styles.option, spaced && styles.optionSpaced]}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
    >
      {on ? (
        <CheckSquare size={22} color={colors.accent} weight="fill" />
      ) : (
        <Square size={22} color={colors.neutral[600]} weight="regular" />
      )}
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        {hint ? <Text style={styles.optionHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={t('printClass.title')} onBack={onBack} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <SectionLabel>{t('printClass.whichClass')}</SectionLabel>

        {loadError ? (
          <StateBlock kind="error" message={loadError} onRetry={load} />
        ) : !classes ? (
          <StateBlock kind="loading" message={t('printClass.loading')} />
        ) : classes.length === 0 ? (
          <StateBlock kind="empty" message={t('printClass.noClasses')} />
        ) : (
          <Card style={styles.card}>
            {classes.map((entry, index) => {
              const key = `${entry.grade_level}|${entry.class_section}`;
              const on = !!chosen && `${chosen.grade_level}|${chosen.class_section}` === key;
              return (
                <Choice
                  key={key}
                  on={on}
                  spaced={index > 0}
                  onPress={() => { setError(''); setChosen(entry); }}
                  label={t('printClass.className', {
                    grade: entry.grade_level,
                    section: entry.class_section || '',
                  })}
                  hint={t('printClass.studentCount', { count: Number(entry.students) || 0 })}
                />
              );
            })}
          </Card>
        )}

        <SectionLabel>{t('printClass.whichDocument')}</SectionLabel>
        <Card style={styles.card}>
          <Choice
            on={document === CARDS}
            onPress={() => { setError(''); setDocument(CARDS); }}
            label={t('printClass.documentCards')}
            hint={t('printClass.documentCardsHint')}
          />
          <Choice
            spaced
            on={document === RECORDS}
            onPress={() => { setError(''); setDocument(RECORDS); }}
            label={t('printClass.documentRecords')}
            hint={t('printClass.documentRecordsHint')}
          />
        </Card>

        <SectionLabel>{t('printClass.sendIt')}</SectionLabel>
        <Card style={styles.card}>
          {!chosen ? (
            <Text style={styles.caption}>{t('printClass.chooseClass')}</Text>
          ) : emptyClass ? (
            <Text style={styles.caption}>{t('printClass.classEmpty')}</Text>
          ) : (
            <Text style={styles.caption}>
              {t('printClass.about', { count: Number(chosen.students) || 0 })}
            </Text>
          )}

          <Button
            label={busy === 'print' ? t('printClass.building') : t('printClass.print')}
            icon={Printer}
            variant="primary"
            onPress={print}
            loading={busy === 'print'}
            disabled={!!busy || !chosen || emptyClass}
            style={styles.action}
          />
          <Button
            label={busy === 'share' ? t('printClass.building') : t('printClass.share')}
            icon={Export}
            variant="secondary"
            onPress={share}
            loading={busy === 'share'}
            disabled={!!busy || !chosen || emptyClass}
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
      marginBottom: spacing.xl,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.lg,
    },
    optionSpaced: { marginTop: spacing.xl },
    optionText: { flex: 1 },
    optionLabel: {
      fontFamily: fonts.medium,
      fontSize: 14.5,
      color: colors.text,
    },
    optionHint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[600],
      marginTop: spacing.xs,
    },
    caption: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.neutral[600],
      marginBottom: spacing.lg,
    },
    action: { marginTop: spacing.md },
  });
