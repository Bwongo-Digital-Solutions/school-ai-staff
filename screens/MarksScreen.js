/* Recording marks, three ways.

   Typing is the default because it is the one that always works. A photograph and a file both go
   the same way afterwards: the server reads them, matches the names against this class, and hands
   back a proposal. Nothing is written until the teacher looks at it and presses save — a misread
   digit is an academic record nobody goes back and checks.

   The screen never decides who a mark belongs to. It shows what the server matched, flags what it
   could not, and lets the teacher put it right. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import {
  Camera, FileArrowUp, FloppyDisk, Keyboard, Printer, WarningCircle, X,
} from 'phosphor-react-native';
import { useTheme, spacing, fonts, type } from '../theme';
import { schoolApi, broadsheetUrl, ApiError } from '../api';
import { printDocument } from '../share';
import { canPrintDocuments } from '../roles';
import Button from '../components/Button';
import Select from '../components/Select';
import StateBlock from '../components/StateBlock';
import ScreenHeader from '../components/ScreenHeader';
import { FormError } from '../components/Field';
import { alertSuccess, alertError, alertWarning } from '../alerts';
import { useT } from '../i18n';
import { classOf } from '../format';

const MODES = [
  { key: 'type', label: 'marks.modeType', icon: Keyboard },
  { key: 'photo', label: 'marks.modePhoto', icon: Camera },
  { key: 'file', label: 'marks.modeFile', icon: FileArrowUp },
];

const classKey = (row) => `${row.grade_level}|${row.class_section}|${row.subject_id}`;

export default function MarksScreen({ user, onBack }) {
  const { colors } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState('type');
  const [classes, setClasses] = useState(null);
  const [chosen, setChosen] = useState('');
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [camera, setCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef(null);

  const selected = useMemo(
    () => (classes || []).find((row) => classKey(row) === chosen) || null,
    [classes, chosen],
  );

  useEffect(() => {
    let cancelled = false;
    schoolApi.markClasses()
      .then((rows) => { if (!cancelled) setClasses(rows); })
      .catch((err) => { if (!cancelled) { setClasses([]); setError(err.message); } });
    return () => { cancelled = true; };
  }, []);

  const loadRoster = useCallback(async (row) => {
    if (!row) return;
    setBusy('roster');
    setError('');
    setProposal(null);
    try {
      const res = await schoolApi.markRoster({
        gradeLevel: row.grade_level, classSection: row.class_section, subjectId: row.subject_id,
      });
      setStudents(res.students || []);
      // Marks already recorded are shown as they stand, so nobody types over what is there.
      const existing = {};
      (res.students || []).forEach((student) => {
        if (student.score !== null && student.score !== undefined) existing[student.id] = String(student.score);
      });
      setScores(existing);
    } catch (err) {
      setError(err.message);
      setStudents([]);
    } finally {
      setBusy('');
    }
  }, []);

  useEffect(() => { if (selected) loadRoster(selected); }, [selected, loadRoster]);

  /* One place that sends a file, whichever way it was chosen. The server decides how to read it
     from the name and type — this end only carries the bytes. */
  const sendForReading = async ({ uri, filename, mimeType }) => {
    setBusy('reading');
    setError('');
    try {
      const file = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const res = await schoolApi.extractMarks({
        gradeLevel: selected.grade_level,
        classSection: selected.class_section,
        subjectId: selected.subject_id,
        filename,
        mimeType,
        file,
      });
      setProposal(res);
      if (res && res.note) setError(res.note);
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : t('marks.fileUnreadable');
      setError(detail);
      alertError(t('marks.notRead'), detail);
    } finally {
      setBusy('');
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
      setCamera(false);
      await sendForReading({ uri: shot.uri, filename: 'marksheet.jpg', mimeType: 'image/jpeg' });
    } catch {
      setCamera(false);
      setError(t('marks.cameraFailed'));
    }
  };

  const pickFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/pdf', 'text/csv', 'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      await sendForReading({ uri: asset.uri, filename: asset.name, mimeType: asset.mimeType });
    } catch {
      setError(t('marks.fileUnopenable'));
    }
  };

  /** What will be written: typed marks, or the proposal as the teacher has left it. */
  const pending = useMemo(() => {
    if (proposal) {
      return (proposal.rows || [])
        .filter((row) => row.student_id && row.score !== null && row.score !== undefined && row.score !== '')
        .map((row) => ({ studentId: row.student_id, score: row.score, maxScore: row.max_score }));
    }
    return students
      .map((student) => ({ studentId: student.id, score: scores[student.id] }))
      .filter((row) => String(row.score ?? '').trim() !== '');
  }, [proposal, students, scores]);

  const save = async () => {
    if (!pending.length) {
      setError(t('marks.nothingToSave'));
      return;
    }
    setBusy('saving');
    setError('');
    try {
      const res = await schoolApi.saveMarks({
        gradeLevel: selected.grade_level,
        classSection: selected.class_section,
        subjectId: selected.subject_id,
        marks: pending,
        source: proposal ? (proposal.read_by === 'model' ? 'photo' : 'file') : 'manual',
      });
      /* No signal: the marks are on the outbox and go when the network returns. Said as a warning
         rather than a success, because "saved on this phone" and "saved at the school" are
         different facts and a teacher is entitled to know which one happened. */
      if (res && res.queued) {
        alertWarning(t('sync.queued'), t('sync.queuedDetail'));
        setPending({});
        return;
      }

      // Reported only once the server says how many rows it wrote.
      if (!res || typeof res.saved !== 'number') {
        throw new ApiError(t('marks.unconfirmed'), 0);
      }
      alertSuccess(
        t('marks.saved'),
        t('marks.savedCount', { count: res.saved, subject: selected.subject_name }),
      );
      setProposal(null);
      await loadRoster(selected);
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : t('marks.saveFailed');
      setError(detail);
      alertError(t('marks.notSaved'), detail);
    } finally {
      setBusy('');
    }
  };

  /* Printing the sheet a teacher has just filled in, without asking them which class again — they
     are looking at it. The whole stream goes on the table, every subject, not only the one they
     entered: what a teacher wants after entering marks is the class's standing, and a table with a
     single column is a list they already have above. */
  const printClassMarks = async () => {
    if (!selected) return;
    setBusy('printing');
    setError('');
    try {
      await printDocument(
        broadsheetUrl({
          grade: selected.grade_level,
          section: selected.class_section,
          requesterRole: (user && user.role) || '',
        }),
        `broadsheet-grade-${selected.grade_level}-${selected.class_section || ''}.pdf`,
      );
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : t('marks.printFailed');
      setError(detail);
      alertError(t('marks.notPrinted'), detail);
    } finally {
      setBusy('');
    }
  };

  if (camera) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={t('marks.photographTitle')} onBack={() => setCamera(false)} />
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        </View>
        <View style={styles.cameraBar}>
          <Text style={styles.hint}>
            {t('marks.framingHint')}
          </Text>
          <Button label={t('marks.takePicture')} icon={Camera} variant="primary" onPress={takePhoto} />
        </View>
      </SafeAreaView>
    );
  }

  const needsReview = (proposal?.rows || []).filter((row) => row.needs_review).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={t('marks.title')} onBack={onBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {classes === null ? (
            <StateBlock kind="loading" message={t('marks.loadingClasses')} />
          ) : classes.length === 0 ? (
            <StateBlock message={t('marks.noClasses')} />
          ) : (
            <>
              <Select
                label={t('marks.classAndSubject')}
                value={chosen}
                onChange={setChosen}
                options={classes.map((row) => ({
                  value: classKey(row),
                  label: t('marks.classOption', {
                    class: classOf(row),
                    subject: row.subject_name,
                  }),
                }))}
                placeholder={t('marks.chooseClass')}
              />

              {selected ? (
                <>
                  <View style={styles.modes}>
                    {MODES.map((option) => (
                      <Pressable
                        key={option.key}
                        onPress={() => { setMode(option.key); setProposal(null); setError(''); }}
                        style={[styles.mode, mode === option.key && styles.modeOn]}
                      >
                        <option.icon
                          size={16}
                          color={mode === option.key ? colors.accent : colors.neutral[500]}
                          weight={mode === option.key ? 'fill' : 'regular'}
                        />
                        <Text style={[styles.modeLabel, mode === option.key && styles.modeLabelOn]}>
                          {t(option.label)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {mode === 'photo' && !proposal ? (
                    <View style={styles.card}>
                      <Text style={styles.hint}>
                        Photograph a mark sheet and the marks are read off it. You check them before
                        anything is saved.
                      </Text>
                      {/* Asking again after Android has been told not to resolves silently, so the
                          button would sit there doing nothing. Once that has happened the device's
                          settings screen is the only way through. */}
                      <Button
                        label={
                          permission?.granted
                            ? t('marks.openCamera')
                            : permission && !permission.canAskAgain
                              ? t('marks.openSettings')
                              : t('marks.allowCamera')
                        }
                        icon={Camera}
                        variant="secondary"
                        onPress={() => {
                          if (permission?.granted) setCamera(true);
                          else if (permission && !permission.canAskAgain) Linking.openSettings();
                          else requestPermission();
                        }}
                      />
                    </View>
                  ) : null}

                  {mode === 'file' && !proposal ? (
                    <View style={styles.card}>
                      <Text style={styles.hint}>
                        A spreadsheet, a Word file or a PDF. Names in one column, marks in another.
                      </Text>
                      <Button label={t('marks.chooseFile')} icon={FileArrowUp} variant="secondary" onPress={pickFile} />
                    </View>
                  ) : null}

                  {busy === 'reading' ? <StateBlock kind="loading" message={t('marks.reading')} /> : null}

                  {proposal ? (
                    <>
                      <View style={styles.reviewBanner}>
                        <WarningCircle size={16} color={colors.accent} weight="fill" />
                        <Text style={styles.reviewText}>
                          {needsReview > 0
                            ? t('marks.needsChecking', { count: needsReview })
                            : t('marks.checkThese')}
                        </Text>
                        <Pressable onPress={() => setProposal(null)} hitSlop={8}>
                          <X size={16} color={colors.neutral[500]} />
                        </Pressable>
                      </View>

                      {(proposal.rows || []).map((row, index) => (
                        <ProposalRow
                          key={`${row.student_id || row.read_name}-${index}`}
                          row={row}
                          styles={styles}
                          colors={colors}
                          t={t}
                          onScore={(value) => setProposal((prev) => ({
                            ...prev,
                            rows: prev.rows.map((each, i) => (
                              i === index ? { ...each, score: value === '' ? null : Number(value) } : each
                            )),
                          }))}
                        />
                      ))}
                    </>
                  ) : busy === 'roster' ? (
                    <StateBlock kind="loading" message={t('marks.loadingClass')} />
                  ) : (
                    students.map((student) => (
                      <View key={student.id} style={styles.row}>
                        <Text style={styles.name} numberOfLines={1}>{student.full_name}</Text>
                        <TextInput
                          value={scores[student.id] ?? ''}
                          onChangeText={(value) => setScores((prev) => ({ ...prev, [student.id]: value }))}
                          keyboardType="numeric"
                          placeholder="—"
                          placeholderTextColor={colors.neutral[500]}
                          style={styles.scoreInput}
                        />
                      </View>
                    ))
                  )}

                  <FormError message={error} style={styles.error} />

                  <Button
                    label={busy === 'saving' ? t('marks.saving') : t('marks.save', { count: pending.length })}
                    icon={FloppyDisk}
                    variant="primary"
                    onPress={save}
                    disabled={busy === 'saving' || pending.length === 0}
                    style={styles.submit}
                  />

                  {canPrintDocuments(user) ? (
                    <Button
                      label={busy === 'printing' ? t('marks.building') : t('marks.printClass')}
                      icon={Printer}
                      variant="secondary"
                      onPress={printClassMarks}
                      loading={busy === 'printing'}
                      disabled={!!busy}
                      style={styles.submit}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** One proposed mark. Says who the server matched it to, or that it could not. */
function ProposalRow({ row, styles, colors, onScore, t }) {
  const unmatched = !row.student_id;
  return (
    <View style={[styles.row, row.needs_review && styles.rowFlagged]}>
      <View style={styles.rowText}>
        <Text style={[styles.name, unmatched && styles.nameUnmatched]} numberOfLines={1}>
          {row.matched_name || row.read_name || t('marks.unnamed')}
        </Text>
        {row.needs_review ? (
          <Text style={styles.matchNote} numberOfLines={1}>
            {unmatched
              ? t('marks.readAs', { name: row.read_name, match: row.match })
              : row.match === 'not on the sheet'
                ? t('marks.notOnTheSheet')
                : row.match}
          </Text>
        ) : null}
      </View>
      <TextInput
        value={row.score === null || row.score === undefined ? '' : String(row.score)}
        onChangeText={onScore}
        keyboardType="numeric"
        placeholder="—"
        placeholderTextColor={colors.neutral[500]}
        editable={!unmatched}
        style={[styles.scoreInput, unmatched && styles.scoreDisabled]}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    hint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.neutral[500],
    },
    modes: { flexDirection: 'row', gap: spacing.xs },
    mode: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    modeOn: { borderColor: colors.accent, backgroundColor: colors.surface2 || colors.surface },
    modeLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.neutral[500] },
    modeLabelOn: { color: colors.accent },
    reviewBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    reviewText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.text },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 9,
      paddingHorizontal: spacing.md,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    rowFlagged: { borderColor: colors.accent },
    rowText: { flex: 1 },
    name: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
    nameUnmatched: { color: colors.neutral[500], fontStyle: 'italic' },
    matchNote: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.neutral[500], marginTop: 2 },
    scoreInput: {
      width: 68,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 8,
      textAlign: 'center',
      fontFamily: fonts.semibold,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    scoreDisabled: { opacity: 0.45 },
    cameraWrap: { flex: 1, backgroundColor: '#000' },
    cameraBar: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.bg },
    error: { marginTop: spacing.xs },
    submit: { marginTop: spacing.sm },
  });
