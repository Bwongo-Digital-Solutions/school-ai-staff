/* Who the office has cleared to leave today, and the gate keeper's verdict on each.

   Before this, the only way to see a permission was to scan the student's card — which is
   no help at all before the student walks up. This is the list he opens to answer "is
   anybody expected out?", and it is also where he acts: Approve records the movement and
   closes the permission, Reject turns the student back and says why.

   The list is the school's own day. A slip nobody used is retired by the server at the end
   of the day it was granted, so nothing here is left over from yesterday. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, StyleSheet, RefreshControl } from 'react-native';
import { SignOut, Prohibit, MapPin, Clock } from 'phosphor-react-native';

import { useTheme, spacing, fonts, type } from '../theme';
import { schoolApi, ApiError } from '../api';
import { alertSuccess, alertError } from '../alerts';
import { formatTime } from '../format';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Field, { FormError } from '../components/Field';
import StateBlock from '../components/StateBlock';

export default function PendingGateScreen({ user, onBack }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');
  /* Which row is being turned back, and why. A rejection without a reason tells the office
     nothing when they ask later why the child never left. */
  const [rejecting, setRejecting] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setError('');
    try {
      setPending(await schoolApi.pendingGatePasses());
    } catch (err) {
      setPending([]);
      setError(err instanceof ApiError ? err.message : 'Could not load the gate list.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load({ quiet: true });
    setRefreshing(false);
  };

  const decide = async (entry, decision) => {
    if (decision === 'declined' && !reason.trim()) {
      setError('Say why the student is being turned back.');
      return;
    }
    setBusy(entry.id);
    setError('');
    try {
      const res = await schoolApi.recordGatePass({
        code: entry.student_number,
        direction: 'out',
        decision,
        reason: entry.reason,
        destination: entry.destination,
        note: decision === 'declined' ? reason.trim() : '',
        authorisedBy: entry.granted_by,
        recordedBy: (user && user.display_name) || '',
      });
      // The server echoes the row it wrote, so a movement that never reached the database
      // cannot look like one that did.
      if (!res || !res.pass || res.pass.decision !== decision) {
        throw new ApiError('The server did not confirm the movement. Nothing was recorded.', 0);
      }
      alertSuccess(
        decision === 'approved' ? 'Let out' : 'Turned back',
        entry.full_name,
      );
      setRejecting('');
      setReason('');
      /* Refetched rather than filtered here: the list should be what the server says it is,
         not what this screen believes it did. */
      await load({ quiet: true });
    } catch (err) {
      const detail =
        err.status === 404
          ? 'This server has no gate endpoint. It is running an older build than this app.'
          : err.message;
      setError(`Not recorded — ${detail}`);
      alertError('Not recorded', detail);
    } finally {
      setBusy('');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Expected out today" onBack={onBack} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.neutral[400]} />
        }
      >
        {error ? <FormError message={error} style={styles.topError} /> : null}

        {pending === null ? (
          <StateBlock kind="loading" message="Loading the gate list…" />
        ) : pending.length === 0 ? (
          <StateBlock message="Nobody has been cleared to leave today." />
        ) : (
          pending.map((entry) => {
            const rejectingThis = rejecting === entry.id;
            return (
              <Card key={entry.id} style={styles.card}>
                <Text style={styles.name}>{entry.full_name}</Text>
                <Text style={styles.meta}>
                  {`${entry.student_number} · Grade ${entry.grade_level ?? '—'} ${
                    entry.class_section || ''
                  }`.trim()}
                </Text>

                <View style={styles.detail}>
                  <MapPin size={15} color={colors.neutral[500]} weight="regular" />
                  <Text style={styles.detailText} numberOfLines={2}>
                    {entry.destination || 'No destination given'}
                  </Text>
                </View>
                <View style={styles.detail}>
                  <Clock size={15} color={colors.neutral[500]} weight="regular" />
                  <Text style={styles.detailText} numberOfLines={2}>
                    {`${entry.reason || 'No reason given'} · cleared ${formatTime(entry.granted_at)} by ${
                      entry.granted_by || 'the office'
                    }`}
                  </Text>
                </View>

                {rejectingThis ? (
                  <>
                    <Field
                      label="Why is the student being turned back?"
                      value={reason}
                      onChangeText={setReason}
                      placeholder="No uniform, sent back"
                      editable={!busy}
                      style={styles.reason}
                    />
                    <Button
                      label={busy === entry.id ? 'Recording…' : 'Confirm turn back'}
                      icon={Prohibit}
                      variant="danger"
                      onPress={() => decide(entry, 'declined')}
                      loading={busy === entry.id}
                      disabled={!!busy}
                      style={styles.action}
                    />
                    <Button
                      label="Cancel"
                      variant="ghost"
                      onPress={() => {
                        setRejecting('');
                        setReason('');
                        setError('');
                      }}
                      disabled={!!busy}
                    />
                  </>
                ) : (
                  <>
                    <Button
                      label={busy === entry.id ? 'Recording…' : 'Let out'}
                      icon={SignOut}
                      variant="primary"
                      onPress={() => decide(entry, 'approved')}
                      loading={busy === entry.id}
                      disabled={!!busy}
                      style={styles.action}
                    />
                    <Button
                      label="Turn back"
                      icon={Prohibit}
                      variant="ghost"
                      onPress={() => {
                        setRejecting(entry.id);
                        setReason('');
                        setError('');
                      }}
                      disabled={!!busy}
                    />
                  </>
                )}
              </Card>
            );
          })
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
    topError: {
      marginBottom: spacing.lg,
    },
    card: {
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    name: {
      ...type(colors).heading(17),
    },
    meta: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      color: colors.neutral[500],
      marginTop: 2,
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
    reason: {
      marginTop: spacing.xl,
    },
    action: {
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
  });
