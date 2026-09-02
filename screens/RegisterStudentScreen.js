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
} from 'react-native';
import { UserPlus } from 'phosphor-react-native';
import { useTheme, spacing, fonts, type } from '../theme';
import { schoolApi, ApiError } from '../api';
import Button from '../components/Button';
import Select from '../components/Select';
import ScreenHeader from '../components/ScreenHeader';
import Field, { FormError } from '../components/Field';
import { alertSuccess, alertError } from '../alerts';

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
      });

      // Only done once the server hands back the row it wrote, as everywhere else in this app.
      if (!res || !res.student || !res.student.student_id) {
        throw new ApiError('The server did not confirm the registration. Nothing was saved.', 0);
      }

      const student = res.student;
      alertSuccess(
        'Registered',
        `${student.first_name} ${student.last_name} is ${student.student_id}`,
      );
      setForm(EMPTY);
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
  });
