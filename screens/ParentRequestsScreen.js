/**
 * What parents have asked the school, and answering it.
 *
 * ## This queue did not exist
 *
 * A guardian could raise a collection request and no screen anywhere showed it to staff —
 * `parent_requests` was written by the portal and read only by the parent who wrote it. The office
 * learned about a collection when the parent arrived at the gate, which is the situation the
 * request was meant to avoid. Letting a parent address a request to a named post is worth nothing
 * unless the post can see it, so the queue lands with that change.
 *
 * ## Answering is not opening the gate
 *
 * Approving records the school's answer on the request and nothing else. It does not write a
 * `gate_permissions` row, so a compromised staff phone cannot walk a child out by tapping Approve
 * — turning an approved pickup into a live pass stays a deliberate, separate act at the office.
 * The screen says so, because a head teacher who believes otherwise would stop telling the askari.
 *
 * ## Whose request is whose
 *
 * The server sorts the reader's own addressed requests first and flags them; anything addressed to
 * a colleague still appears, marked, and can still be answered. A child waiting at a gate because
 * the Director of Studies is away for the day is a worse outcome than a head teacher covering.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Check, X } from 'phosphor-react-native';

import { useTheme, spacing, fonts } from '../theme';
import { schoolApi, ApiError } from '../api';
import { alertSuccess, alertError } from '../alerts';
import { classOf, dateTime } from '../format';
import { useT } from '../i18n';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Field from '../components/Field';
import StateBlock from '../components/StateBlock';

export default function ParentRequestsScreen({ onBack }) {
  const { colors } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await schoolApi.pendingParentRequests();
      setRequests((data && data.requests) || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('parentQueue.failed'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const decide = async (request, approve) => {
    setBusyId(request.id);
    try {
      await schoolApi.decideParentRequest({
        requestId: request.id,
        approve,
        note: (notes[request.id] || '').trim(),
      });
      alertSuccess(
        approve ? t('parentQueue.approved') : t('parentQueue.declined'),
        approve ? t('parentQueue.approvedBody') : undefined,
      );
      /* Dropped from the list rather than re-fetched: the row is gone either way, and a parent
         waiting on an answer is better served by the next screen being instant. */
      setRequests((list) => list.filter((row) => row.id !== request.id));
    } catch (err) {
      alertError(t('parentQueue.decideFailed'), err instanceof ApiError ? err.message : undefined);
      // Whatever went wrong, the list in hand may now be stale — another person may have answered it.
      await load();
    }
    setBusyId('');
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title={t('parentQueue.title')} onBack={onBack} />
        <StateBlock kind="loading" message={t('parentQueue.loading')} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title={t('parentQueue.title')} onBack={onBack} />
        <StateBlock kind="error" message={error} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('parentQueue.title')} onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.neutral[400]} />
        }
      >
        {requests.length === 0 ? (
          <StateBlock kind="empty" message={t('parentQueue.empty')} />
        ) : (
          <>
            <Text style={styles.note}>{t('parentQueue.note')}</Text>

            {requests.map((request) => (
              <Card key={request.id} style={styles.card}>
                <View style={styles.head}>
                  <View style={styles.headText}>
                    <Text style={styles.student} numberOfLines={1}>
                      {request.student.full_name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {`${request.student.student_id} · ${classOf(request.student)}`}
                    </Text>
                  </View>
                  <Badge
                    label={t(`parentReq.${request.kind}`)}
                    tone={request.kind === 'pickup' ? 'amber' : 'neutral'}
                  />
                </View>

                {/* Addressed to you, or to somebody else — said either way, because answering a
                    colleague's request should be a choice rather than an accident. */}
                <Text style={[styles.addressed, request.addressed_to_me && styles.addressedMine]}>
                  {request.addressed_to_me
                    ? t('parentQueue.forYou')
                    : request.addressed_to
                      ? t('parentQueue.forOther', { post: request.addressed_to.replace(/_/g, ' ') })
                      : t('parentQueue.forAnyone')}
                </Text>

                <Text style={styles.reason}>{request.reason}</Text>
                <Text style={styles.meta}>
                  {`${request.guardian.name || t('parentQueue.aGuardian')} · ${dateTime(request.created_at)}`}
                </Text>

                <View style={styles.formField}>
                  <Field
                    label={t('parentQueue.noteLabel')}
                    value={notes[request.id] || ''}
                    onChangeText={(text) => setNotes((all) => ({ ...all, [request.id]: text }))}
                    placeholder={t('parentQueue.noteHint')}
                  />
                </View>

                <View style={styles.actions}>
                  <Button
                    label={t('parentQueue.approve')}
                    icon={Check}
                    onPress={() => decide(request, true)}
                    disabled={busyId === request.id}
                    loading={busyId === request.id}
                    style={styles.action}
                  />
                  <Button
                    label={t('parentQueue.decline')}
                    icon={X}
                    variant="danger"
                    onPress={() => decide(request, false)}
                    disabled={busyId === request.id}
                    style={styles.action}
                  />
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl * 2,
    },
    note: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginBottom: spacing.lg,
    },
    card: {
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headText: {
      flex: 1,
    },
    student: {
      fontFamily: fonts.medium,
      fontSize: 16,
      color: colors.text,
    },
    meta: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 18,
      color: colors.neutral[500],
      marginTop: 2,
    },
    addressed: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[500],
      marginTop: spacing.md,
    },
    addressedMine: {
      fontFamily: fonts.semibold,
      color: colors.accent,
    },
    reason: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
      marginTop: spacing.md,
    },
    formField: {
      marginTop: spacing.lg,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    action: {
      flex: 1,
    },
  });
