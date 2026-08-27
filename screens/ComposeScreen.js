import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PaperPlaneTilt } from 'phosphor-react-native';
import { useTheme, spacing, fonts } from '../theme';
import { schoolApi } from '../api';
import { AUDIENCE_LABELS } from '../roles';
import { humanise } from '../format';
import Button from '../components/Button';
import StateBlock from '../components/StateBlock';
import ScreenHeader from '../components/ScreenHeader';
import Select from '../components/Select';
import Field, { FormError } from '../components/Field';
import { alertSuccess, alertError } from '../alerts';

export default function ComposeScreen({ user, onSent, onBack }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [directory, setDirectory] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const [audience, setAudience] = useState('all');
  const [person, setPerson] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError('');
    schoolApi
      .staffDirectory({ actorEmail: user.auth_email })
      .then((dir) => {
        if (cancelled) return;
        setDirectory(dir);
        const first = (dir.staff || [])[0];
        if (first) setPerson(first.auth_email);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [user.auth_email, attempt]);

  /* Groups are offered only where somebody is actually in them, so the picker never lists
     an audience that would reach nobody. */
  const audienceOptions = useMemo(() => {
    if (!directory) return [];
    const groups = directory.groups || [];
    const roles = [...new Set(groups.map((g) => g.role))];
    const designations = [...new Set(groups.map((g) => g.designation).filter(Boolean))];
    return [
      { value: 'all', label: 'Everybody' },
      ...roles.map((r) => ({
        value: `role:${r}`,
        label: AUDIENCE_LABELS[r] || humanise(r),
      })),
      ...designations.map((d) => ({
        value: `designation:${d}`,
        label: AUDIENCE_LABELS[d] || humanise(d),
      })),
      { value: 'user', label: 'One person…' },
    ];
  }, [directory]);

  const personOptions = useMemo(
    () =>
      ((directory && directory.staff) || []).map((u) => ({
        value: u.auth_email,
        label: `${u.display_name} — ${
          AUDIENCE_LABELS[u.designation] || AUDIENCE_LABELS[u.role] || u.role
        }`,
      })),
    [directory],
  );

  const send = async () => {
    setError('');
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || !trimmedBody) {
      setError('A subject and a message are both required.');
      return;
    }
    if (audience === 'user' && !person) {
      setError('Choose who this is going to.');
      return;
    }

    const [kind, value] = audience.includes(':') ? audience.split(':') : [audience, ''];

    setBusy(true);
    try {
      await schoolApi.sendMessage({
        actorEmail: user.auth_email,
        audienceKind: kind,
        audienceValue: value,
        recipientEmail: kind === 'user' ? person : '',
        subject: trimmedSubject,
        body: trimmedBody,
        priority: important ? 'high' : 'normal',
      });
      setSubject('');
      setBody('');
      setImportant(false);
      alertSuccess('Message sent');
      onSent();
    } catch (err) {
      setError(err.message);
      alertError('Not sent', err);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="New message" onBack={onBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loadError ? (
            <StateBlock
              kind="error"
              message={loadError}
              onRetry={() => setAttempt((n) => n + 1)}
            />
          ) : !directory ? (
            <StateBlock kind="loading" message="Loading the staff list…" />
          ) : (
            <>
              <Select
                label="To"
                title="Who receives this?"
                value={audience}
                options={audienceOptions}
                onChange={setAudience}
                disabled={busy}
              />

              {audience === 'user' ? (
                <Select
                  label="Person"
                  title="Choose a person"
                  value={person}
                  options={personOptions}
                  onChange={setPerson}
                  disabled={busy}
                  style={styles.spaced}
                />
              ) : null}

              <Field
                label="Subject"
                value={subject}
                onChangeText={setSubject}
                placeholder="What is this about?"
                editable={!busy}
                style={styles.spaced}
              />

              <Field
                label="Message"
                value={body}
                onChangeText={setBody}
                placeholder="Write your message"
                editable={!busy}
                multiline
                style={styles.spaced}
              />

              <View style={styles.switchRow}>
                <View style={styles.switchBody}>
                  <Text style={styles.switchTitle}>Important</Text>
                  <Text style={styles.switchSub}>Adds a badge and stands out in the feed</Text>
                </View>
                <Switch
                  value={important}
                  onValueChange={setImportant}
                  disabled={busy}
                  trackColor={{ false: colors.neutral[800], true: colors.accentRamp[600] }}
                  thumbColor={colors.neutral[100]}
                />
              </View>

              <FormError message={error} />

              <Button
                label="Send"
                icon={PaperPlaneTilt}
                variant="primary"
                loading={busy}
                onPress={send}
                style={styles.send}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    scrollContent: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl * 2,
    },
    spaced: {
      marginTop: spacing.xl,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    switchBody: {
      flex: 1,
      marginRight: spacing.lg,
    },
    switchTitle: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.text,
      marginBottom: 2,
    },
    switchSub: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: colors.neutral[500],
    },
    send: {
      marginTop: spacing.xxl,
      alignSelf: 'stretch',
    },
  });
