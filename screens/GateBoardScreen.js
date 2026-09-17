import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, AppState } from 'react-native';
import { Warning } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { schoolApi, ApiError } from '../api';

import { useT } from '../i18n';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import CountsRow from '../components/CountsRow';
import SectionLabel from '../components/SectionLabel';
import MovementList from '../components/MovementList';
import StateBlock from '../components/StateBlock';

/* How often the board asks again while somebody is watching it.
 *
 * The web board is pushed to over an event stream; this app has no client for one, and adding a
 * long-lived socket to a phone that spends its day in a pocket on mobile data is the wrong trade.
 * Twelve seconds is fast enough that a gate keeper sees the arrival they just watched happen, and
 * slow enough to cost almost nothing — and it stops dead the moment the screen is left or the app
 * goes to the background, which is the part that actually matters for a battery. */
const POLL_MS = 12000;

/**
 * The gate, on the phone.
 *
 * For the two people who need it away from a desk: the askari standing at the gate, and the head
 * teacher who wants to know who is on the premises without walking to the office.
 *
 * It shows what the web board shows, from the same endpoint, so the two cannot disagree about how
 * many children are in the school. Narrower, because a phone is: the day's four figures, then the
 * movements as a single list. "Who is here" is a name-by-name roster that belongs on a wider
 * screen; the count is what somebody reads on a phone, and the list of movements is what tells
 * them the gate is working.
 */
export default function GateBoardScreen({ onBack }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useT();

  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setError('');
    try {
      setBoard(await schoolApi.gateBoard());
      /* A quiet poll that succeeds clears a failure from an earlier one. Without this the screen
         keeps an error banner over figures that are now current, which reads as broken. */
      setError('');
    } catch (err) {
      if (!quiet) setBoard(null);
      setError(err instanceof ApiError ? err.message : t('gate.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  /* Poll while the screen is open and the app is in front. Both halves are needed: a phone left
     face-up on a desk would otherwise poll all day, and one in a pocket would poll all night. */
  const timer = useRef(null);
  useEffect(() => {
    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    const start = () => {
      stop();
      timer.current = setInterval(() => load({ quiet: true }), POLL_MS);
    };

    start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        /* Ask at once as well as resuming the timer: coming back to the app is exactly when the
           figures on screen are most likely to be stale. */
        load({ quiet: true });
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load({ quiet: true });
    setRefreshing(false);
  };

  const totals = board?.totals;
  const movements = board?.recent || [];

  return (
    <Screen style={styles.safe}>
      <ScreenHeader title={t('gate.title')} onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.neutral[400]} />
        }
      >
        {error ? <StateBlock kind="error" message={error} /> : null}

        <CountsRow
          counts={[
            [totals ? String(totals.on_site) : '—', t('gate.onSite')],
            [totals ? String(totals.checked_in) : '—', t('gate.checkedIn')],
            [totals ? String(totals.checked_out) : '—', t('gate.checkedOut')],
          ]}
        />

        {totals && totals.turned_back > 0 ? (
          <Card style={styles.warnCard}>
            <Warning size={18} color={colors.accentRamp[300]} weight="regular" />
            <Text style={styles.warnText}>
              {t('gate.turnedBackCount', { count: totals.turned_back })}
            </Text>
          </Card>
        ) : null}

        <SectionLabel>{t('gate.movements')}</SectionLabel>

        {!board && !error ? (
          <StateBlock kind="loading" message={t('gate.loading')} />
        ) : movements.length === 0 ? (
          <StateBlock kind="empty" message={t('gate.noMovements')} />
        ) : (
          <Card style={styles.list}>
            {/* The same rows the gate log and a student's own history draw. `full_name` is what
                that component reads; the board calls it `student_name` because the web board does,
                so the mapping happens here rather than either side being renamed to suit the
                other. */}
            <MovementList
              movements={movements.map((row) => ({ ...row, full_name: row.student_name }))}
            />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl * 2,
      gap: spacing.lg,
    },
    warnCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.xl,
    },
    warnText: {
      ...type(colors).body(14),
      flex: 1,
    },
    list: {
      paddingVertical: spacing.xs,
    },
    /* Allowed to shrink, or a long name pushes the time off the row. */
  });
