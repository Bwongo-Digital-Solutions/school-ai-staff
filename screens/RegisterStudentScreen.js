/* Enrolling a student at the desk, or wherever the queue actually is.

   The student number is issued by the server rather than typed: it is the identity every later
   scan depends on, and two people registering at once from two phones would otherwise pick the
   same one. It is fetched when the screen opens so it can be read aloud while the rest of the
   form is filled in, and the server checks it again before inserting — the suggestion can go
   stale in the minute between. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Check, UserPlus } from 'phosphor-react-native';
import { useTheme, spacing, fonts, radius, type } from '../theme';
import { LEVEL_LABELS, levelForGrade } from '../roles';
import { schoolApi, ApiError } from '../api';
import Button from '../components/Button';
import Select from '../components/Select';
import ScreenHeader from '../components/ScreenHeader';
import Field, { FormError } from '../components/Field';
import { alertSuccess, alertError, alertWarning } from '../alerts';

const GRADES = [7, 8, 9, 10, 11, 12, 13];
const SECTIONS = ['A', 'B', 'C', 'D'];
const GENDERS = [
  { value: '', label: 'Not recorded' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

const EMPTY = {
  firstName: '',
  lastName: '',
  gradeLevel: '',
  classSection: '',
  gender: '',
  dateOfBirth: '',
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  address: '',
};

export default function RegisterStudentScreen({ user, onRegistered, onBack }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [form, setForm] = useState(EMPTY);
  const [suggested, setSuggested] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* What the school offers, and what this class is asked to bring. Held apart from `form` because
     neither is a column on the student: both are recorded against them once they exist. */
  const [clubs, setClubs] = useState(null);
  const [chosenClubs, setChosenClubs] = useState([]);
  const [requirements, setRequirements] = useState(null);
  const [broughtItems, setBroughtItems] = useState([]);

  const level = levelForGrade(form.gradeLevel);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const loadNumber = useCallback(async () => {
    try {
      setSuggested(await schoolApi.nextStudentNumber());
    } catch {
      /* The server issues the real one at registration; a suggestion that will not load is a
         cosmetic loss, not a reason to block enrolling somebody. */
      setSuggested('');
    }
  }, []);

  useEffect(() => { loadNumber(); }, [loadNumber]);

  /* The clubs are the same whoever is being enrolled, so they load once. */
  useEffect(() => {
    let live = true;
    schoolApi.clubs()
      .then((list) => { if (live) setClubs(list); })
      .catch(() => { if (live) setClubs([]); });
    return () => { live = false; };
  }, []);

  /* The requirements list is not: it belongs to the class being chosen, so it is refetched when
     that changes. Boarding items are left out — there is no bed to attach them to yet, and asking
     a day student for a mosquito net is how a list stops being believed. */
  useEffect(() => {
    if (!level) {
      setRequirements(null);
      setBroughtItems([]);
      return undefined;
    }

    let live = true;
    setRequirements(null);
    schoolApi.requirementCatalogue(level)
      .then((items) => {
        if (!live) return;
        const grade = Number(form.gradeLevel);
        setRequirements(items.filter((item) => (
          !item.boarding_only
          && (item.grade_level === null || Number(item.grade_level) === grade)
        )));
      })
      .catch(() => { if (live) setRequirements([]); });
    return () => { live = false; };
  }, [level, form.gradeLevel]);

  /* A tick against an item that is no longer on the list would be sent for a requirement this
     student was never asked for, so the selection is narrowed whenever the list changes. */
  useEffect(() => {
    if (!requirements) return;
    const offered = new Set(requirements.map((item) => item.id));
    setBroughtItems((prev) => prev.filter((id) => offered.has(id)));
  }, [requirements]);

  const submit = async () => {
    setError('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('A first and last name are both required.');
      return;
    }
    if (!form.gradeLevel) {
      setError('Choose the class this student is joining.');
      return;
    }
    if (!form.classSection) {
      setError('Choose a section.');
      return;
    }

    setBusy(true);
    try {
      const res = await schoolApi.registerStudent({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gradeLevel: Number(form.gradeLevel),
        classSection: form.classSection,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth.trim(),
        parentName: form.parentName.trim(),
        parentPhone: form.parentPhone.trim(),
        parentEmail: form.parentEmail.trim(),
        address: form.address.trim(),
        /* Sent with the registration rather than as follow-up calls: this screen posts to the
           registry endpoint, which writes both in the same request. A club that filled up while
           the form was open comes back as a note, never as a refused enrolment. */
        clubs: chosenClubs,
        requirementsBrought: broughtItems,
      });

      // Only done once the server hands back the row it wrote, as everywhere else in this app.
      if (!res || !res.student || !res.student.student_id) {
        throw new ApiError('The server did not confirm the registration. Nothing was saved.', 0);
      }

      const student = res.student;
      const clubProblems = Array.isArray(res.club_errors) ? res.club_errors : [];

      /* The enrolment succeeded either way. A club that could not be joined is said out loud
         because the parent is standing there and can still be offered another one. */
      if (clubProblems.length) {
        alertWarning('Registered, with one thing outstanding', clubProblems.join(' '));
      } else {
        alertSuccess(
          'Registered',
          `${student.first_name} ${student.last_name} is ${student.student_id}`,
        );
      }

      setForm(EMPTY);
      setChosenClubs([]);
      setBroughtItems([]);
      loadNumber();
      onRegistered?.(student);
    } catch (err) {
      const detail = err instanceof ApiError
        ? err.message
        : 'Could not register this student.';
      setError(detail);
      alertError('Not registered', detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Register a student" onBack={onBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.numberCard}>
            <Text style={styles.numberLabel}>Student number</Text>
            <Text style={styles.number}>{suggested || 'issued on saving'}</Text>
            <Text style={styles.numberHint}>
              Issued by the office system, not typed. Confirmed again when you save.
            </Text>
          </View>

          <Field
            label="First name"
            value={form.firstName}
            onChangeText={set('firstName')}
            autoCapitalize="words"
          />
          <Field
            label="Last name"
            value={form.lastName}
            onChangeText={set('lastName')}
            autoCapitalize="words"
          />

          <Select
            label="Class"
            value={form.gradeLevel}
            onChange={set('gradeLevel')}
            options={GRADES.map((g) => ({ value: String(g), label: `Grade ${g}` }))}
            placeholder="Choose a class…"
          />
          <Select
            label="Section"
            value={form.classSection}
            onChange={set('classSection')}
            options={SECTIONS.map((s) => ({ value: s, label: s }))}
            placeholder="Choose a section…"
          />
          <Select
            label="Gender"
            value={form.gender}
            onChange={set('gender')}
            options={GENDERS}
          />
          <Field
            label="Date of birth"
            value={form.dateOfBirth}
            onChangeText={set('dateOfBirth')}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />

          {/* Clubs. A student joins any number; a full one cannot be chosen at all, which is a
              kinder way to say no than accepting the tap and refusing on save. */}
          <Text style={styles.sectionLabel}>Clubs</Text>
          {clubs === null ? (
            <Text style={styles.pickerHint}>Loading the clubs…</Text>
          ) : clubs.length === 0 ? (
            <Text style={styles.pickerHint}>
              No clubs have been set up yet. An administrator adds them in the web app.
            </Text>
          ) : (
            <View style={styles.chips}>
              {clubs.map((club) => {
                const chosen = chosenClubs.includes(club.id);
                const blocked = club.full && !chosen;
                return (
                  <Pressable
                    key={club.id}
                    onPress={() => {
                      if (blocked || busy) return;
                      setChosenClubs((prev) =>
                        chosen ? prev.filter((id) => id !== club.id) : [...prev, club.id]);
                    }}
                    style={[
                      styles.chip,
                      chosen && styles.chipOn,
                      blocked && styles.chipOff,
                    ]}
                  >
                    <Text style={[styles.chipText, chosen && styles.chipTextOn]}>
                      {club.name}
                      {club.capacity ? ` · ${club.member_count}/${club.capacity}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* School requirements, for the class chosen above. The list changes when the class
              changes, which is the whole point of scoping it by class. */}
          <Text style={styles.sectionLabel}>
            {level ? `Requirements · ${LEVEL_LABELS[level]}` : 'Requirements'}
          </Text>
          {!form.gradeLevel ? (
            <Text style={styles.pickerHint}>Choose a class to see what this student should bring.</Text>
          ) : requirements === null ? (
            <Text style={styles.pickerHint}>Loading the list…</Text>
          ) : requirements.length === 0 ? (
            <Text style={styles.pickerHint}>
              Nothing is set for this class yet. An administrator publishes the list in the web app.
            </Text>
          ) : (
            <>
              {requirements.map((item) => {
                const brought = broughtItems.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (busy) return;
                      setBroughtItems((prev) =>
                        brought ? prev.filter((id) => id !== item.id) : [...prev, item.id]);
                    }}
                    style={styles.checkRow}
                  >
                    <View style={[styles.checkBox, brought && styles.checkBoxOn]}>
                      {brought ? <Check size={14} color={colors.bg} weight="bold" /> : null}
                    </View>
                    <View style={styles.checkLabel}>
                      <Text style={styles.checkName}>
                        {item.item_name}
                        {item.quantity > 1 || item.unit ? ` — ${item.quantity} ${item.unit}`.trimEnd() : ''}
                      </Text>
                      {item.mandatory ? null : <Text style={styles.checkNote}>Optional</Text>}
                      {item.notes ? <Text style={styles.checkNote}>{item.notes}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
              <Text style={styles.pickerHint}>
                Tick what has actually arrived. The rest is recorded as still owed rather than
                forgotten.
              </Text>
            </>
          )}

          <Text style={styles.sectionLabel}>Parent or guardian</Text>
          <Field
            label="Name"
            value={form.parentName}
            onChangeText={set('parentName')}
            autoCapitalize="words"
          />
          <Field
            label="Phone"
            value={form.parentPhone}
            onChangeText={set('parentPhone')}
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            value={form.parentEmail}
            onChangeText={set('parentEmail')}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="Home address"
            value={form.address}
            onChangeText={set('address')}
            multiline
          />

          <FormError message={error} style={styles.error} />

          <Button
            label={busy ? 'Registering…' : 'Register student'}
            icon={UserPlus}
            variant="primary"
            onPress={submit}
            disabled={busy}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
    numberCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    numberLabel: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: colors.neutral[500],
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    number: {
      ...type(colors).heading(22),
      fontFamily: fonts.bold,
      color: colors.accent,
      marginTop: 4,
    },
    numberHint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 17,
      color: colors.neutral[500],
      marginTop: 4,
    },
    sectionLabel: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      color: colors.neutral[600],
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: spacing.sm,
    },
    error: { marginTop: spacing.xs },
    submit: { marginTop: spacing.sm },

    pickerHint: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginTop: spacing.xs,
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.xs,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.neutral[800],
      // A pill, which the theme has no token for — the ramp stops at lg (14).
      borderRadius: 999,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginRight: spacing.sm,
      marginTop: spacing.sm,
      backgroundColor: colors.surface,
    },
    chipOn: {
      borderColor: colors.accentRamp[300],
      backgroundColor: colors.accentRamp[800],
    },
    // A club with no places left is shown, not hidden: the parent can see it exists and is full.
    chipOff: {
      opacity: 0.4,
    },
    chipText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.neutral[400],
    },
    chipTextOn: {
      fontFamily: fonts.medium,
      color: colors.text,
    },

    checkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
      marginTop: spacing.xs,
    },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.neutral[700],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
      marginTop: 1,
    },
    checkBoxOn: {
      backgroundColor: colors.accentRamp[300],
      borderColor: colors.accentRamp[300],
    },
    checkLabel: { flex: 1 },
    checkName: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    checkNote: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[600],
      marginTop: 1,
    },
  });
