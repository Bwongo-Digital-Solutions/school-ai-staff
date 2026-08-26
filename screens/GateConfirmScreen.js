import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Check, SealCheck, SignIn, SignOut, WarningCircle, X } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts } from '../theme';
import { schoolApi, ApiError } from '../api';
import { formatDate } from '../format';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import PermissionSlip from '../components/PermissionSlip';
import StudentHeader from '../components/StudentHeader';
import Field, { FormError } from '../components/Field';
import { useToast } from '../components/Toast';

/* Picking an action opens the scanner, and the scan lands here rather than writing straight
   away — the officer sees who they are about to let through before the movement is
   recorded. Nothing is written until Accept; Cancel writes nothing at all. */
export const GATE_ACTIONS = {
  pass: {
    label: 'Gate pass',
    hint: 'Check the permission slip, then let the student out or turn them back.',
    icon: SealCheck,
    direction: 'out',
    confirm: 'Approve exit',
  },
  checkout: {
    label: 'Check out student',
    hint: 'Record a student leaving the school.',
    icon: SignOut,
    direction: 'out',
    confirm: 'Check out',
  },
  checkin: {
    label: 'Check in student',
    hint: 'Record a student arriving back at the school.',
    icon: SignIn,
    direction: 'in',
    confirm: 'Check in',
  },
};

export default function GateConfirmScreen({
  action: actionKey,
  card,
  user,
  onDone,
  onCancel,
  onBack,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toast = useToast();

  const [authorisedBy, setAuthorisedBy] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const action = GATE_ACTIONS[actionKey];
  if (!card || !action) return null;

  const student = card.student;
  const gate = card.gate_pass || {};
  const ActionIcon = action.icon;
  const needsAuthoriser = actionKey !== 'checkin' && !gate.permission;

  // Checking a student in who is already inside — or out who is already out — is almost
  // always a mistake at the gate, so it is called out rather than silently recorded.
  const contradicts =
    (action.direction === 'in' && gate.on_premises) ||
    (action.direction === 'out' && gate.on_premises === false);

  const submit = async (decision) => {
    setError('');
    const trimmedNote = note.trim();
    const trimmedAuth = needsAuthoriser ? authorisedBy.trim() : '';

    if (decision === 'declined' && !trimmedNote) {
      setError('Say why the student was turned back.');
      return;
    }
    if (decision === 'approved' && needsAuthoriser && !trimmedAuth) {
      setError('Name who authorised this.');
      return;
    }

    setBusy(true);
    try {
      const res = await schoolApi.recordGatePass({
        code: student.student_id,
        direction: action.direction,
        decision,
        note: trimmedNote,
        authorisedBy: trimmedAuth,
        recordedBy: (user && user.display_name) || '',
      });
      // Only call it done once the server hands back the row it wrote.
      if (!res || !res.pass || res.pass.decision !== decision) {
        throw new ApiError('The server did not confirm the movement. Nothing was recorded.', 0);
      }
      toast(decision === 'declined' ? 'Turned back' : `${action.confirm} recorded`);
      onDone();
    } catch (err) {
      setError(
        err.status === 404
          ? 'This server has no gate endpoint. It is running an older build than this app.'
          : `Not recorded — ${err.message}`,
      );
      setBusy(false);
    }
  };

  const p = gate.permission;
  const slipRows = p
    ? [
        ['Allowed by', p.granted_by || '—'],
        ['Reason', p.reason || '—'],
        ['Destination', p.destination || '—'],
        ...(p.expected_return ? [['Back by', formatDate(p.expected_return)]] : []),
      ]
    : [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={action.label} onBack={onBack || onCancel} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StudentHeader
          student={student}
          badge={{
            label: gate.on_premises ? 'On premises' : 'Signed out',
            tone: gate.on_premises ? 'green' : 'amber',
          }}
        />

        <View style={styles.banner}>
          <ActionIcon size={18} color={colors.accentRamp[300]} weight="regular" />
          <Text style={styles.bannerText}>{action.label}</Text>
        </View>

        {/* A gate pass runs off a slip somebody else issued, so show it before anything
            is recorded. */}
        {actionKey === 'pass' ? (
          <PermissionSlip
            title={p ? 'Permission to leave' : 'No permission on file'}
            missing={!p}
            rows={slipRows}
            note={
              p
                ? ''
                : 'Nobody has granted this student permission to leave. Letting them out anyway records you as doing so, so name who authorised it.'
            }
            style={styles.slip}
          />
        ) : null}

        {contradicts ? (
          <View style={styles.warn}>
            <WarningCircle size={18} color={colors.status.amber} weight="regular" />
            <Text style={styles.warnText}>
              {action.direction === 'in'
                ? 'This student is already recorded as on the premises.'
                : 'This student is already recorded as signed out.'}
            </Text>
          </View>
        ) : null}

        {needsAuthoriser ? (
          <Field
            label="Authorised by"
            value={authorisedBy}
            onChangeText={setAuthorisedBy}
            placeholder="Who permitted this?"
            editable={!busy}
            style={styles.field}
          />
        ) : null}

        <Field
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Anything worth recording"
          editable={!busy}
          style={styles.field}
        />

        <FormError message={error} />

        <Button
          label={action.confirm}
          icon={Check}
          variant="primary"
          disabled={busy}
          onPress={() => submit('approved')}
          style={styles.action}
        />
        {actionKey === 'pass' ? (
          <Button
            label="Decline and turn back"
            icon={X}
            variant="danger"
            disabled={busy}
            onPress={() => submit('declined')}
            style={styles.actionTight}
          />
        ) : null}
        <Button
          label="Cancel"
          variant="secondary"
          disabled={busy}
          onPress={onCancel}
          style={styles.actionTight}
        />
      </ScrollView>
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
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.accentRamp[900],
      borderWidth: 1,
      borderColor: colors.accentRamp[800],
    },
    bannerText: {
      flex: 1,
      marginLeft: spacing.md,
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.accentRamp[200],
    },
    slip: {
      marginTop: spacing.lg,
    },
    warn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.status.amberBg,
      borderWidth: 1,
      borderColor: colors.status.amber,
    },
    warnText: {
      flex: 1,
      marginLeft: spacing.md,
      fontFamily: fonts.medium,
      fontSize: 13,
      lineHeight: 19,
      color: colors.status.amber,
    },
    field: {
      marginTop: spacing.xl,
    },
    action: {
      marginTop: spacing.xl,
      alignSelf: 'stretch',
    },
    actionTight: {
      marginTop: spacing.md,
      alignSelf: 'stretch',
    },
  });
