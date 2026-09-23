/* What a parent sees on their phone: one child, everything the school holds about them.
 *
 * ## Absent is not empty
 *
 * Every section of the payload is optional, and the server omits a key rather than sending an
 * empty array when the school has switched that section off. So each card is drawn only when its
 * key is present — a school that does not show discipline records has no discipline card here,
 * rather than one reading "nothing recorded", which is a different and untrue claim.
 *
 * ## Asking is not being granted
 *
 * The request form at the bottom sends a message to the office. It does not open a gate, and the
 * wording says so plainly in both languages: a parent who believes collection is arranged and
 * arrives to find the askari has no record of it is worse served than one told somebody has to
 * agree first.
 *
 * ## Only theme tokens, and only ones that exist
 *
 * This screen was written against `colors.muted`, `colors.primary` and `colors.onPrimary`, none of
 * which are in either palette — no other file in the app names them. React Native has no fallback
 * for an undefined colour: it paints the text black, so on the dark theme a parent's child's ID,
 * every explanatory note and every empty state rendered black on a near-black card, and the
 * selected chip had no fill at all. Secondary text is `neutral[500]`, quieter text `neutral[400]`,
 * hairlines `neutral[800]` / `neutral[900]`, and the accent is `accent` / the `accentRamp`. Both
 * ramps are reversed between the palettes (see theme.js), which is what makes one rule read
 * correctly in both themes — so a token is always right where a literal would be right once.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { PaperPlaneTilt } from 'phosphor-react-native';

import { useTheme, radius, spacing, fonts } from '../theme';
import { schoolApi, ApiError } from '../api';
import { alertSuccess, alertError } from '../alerts';
import { classOf, dateTime, money } from '../format';
import { useT } from '../i18n';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Field from '../components/Field';
import StatTile from '../components/StatTile';
import DetailRow from '../components/DetailRow';
import SectionLabel from '../components/SectionLabel';
import StateBlock from '../components/StateBlock';
import StudentHeader from '../components/StudentHeader';

const clock = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

/* The office's answer, in the colour the rest of the app uses for that answer. Anything the
   server adds later falls through to neutral rather than to an undefined tone. */
const STATUS_TONE = {
  pending: 'amber',
  approved: 'green',
  declined: 'red',
  cancelled: 'neutral',
};

/* One option in a two- or three-way switch, drawn the way ScannerScreen and AssistantScreen draw
   theirs, so a parent's controls look like the rest of the app rather than like this screen. */
function Segment({ label, active, onPress, styles }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, active && styles.segmentActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ChildScreen() {
  const { colors } = useTheme();
  /* `useT()` hands back the whole language context — { t, language, setLanguage } — so the
     translator has to be picked out of it. Taking the object as `t` made every `t('…')` in this
     file a call on a plain object, which threw on the first one and tore the tree down: a blank
     screen with no tab bar, for guardians only, because this is the only screen they get. Every
     other screen in this app destructures; this one did not. */
  const { t } = useT();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState(null);
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('pickup');
  const [reason, setReason] = useState('');

  const load = useCallback(async (childId) => {
    setLoading(true);
    try {
      const kids = childId ? children : await schoolApi.parentChildren();
      if (!childId) setChildren(kids);

      const id = childId || (kids[0] && kids[0].id) || null;
      setSelected(id);

      if (!id) {
        setOverview(null);
        setRequests([]);
      } else {
        const [data, asked] = await Promise.all([
          schoolApi.parentOverview(id),
          schoolApi.parentRequests(id),
        ]);
        setOverview(data);
        setRequests(asked);
      }
    } catch (err) {
      // A guardian whose claim is still with the office gets an empty list rather than an error,
      // so the waiting message below is what they see instead of a failure.
      setOverview(null);
      if (!(err instanceof ApiError)) setChildren([]);
    }
    setLoading(false);
  }, [children]);

  useEffect(() => { load(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Pull-to-refresh keeps its own flag. Driving the spinner from `loading` put it on screen during
     the first load as well, so the screen opened mid-refresh over an empty page. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(selected);
    setRefreshing(false);
  }, [load, selected]);

  const ask = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await schoolApi.parentAsk({ studentId: selected, kind, reason: reason.trim() });
      setReason('');
      alertSuccess(t('parentReq.sent'), t('parentReq.sentBody'));
      setRequests(await schoolApi.parentRequests(selected));
    } catch (err) {
      alertError(t('parentReq.failed'), err instanceof ApiError ? err.message : undefined);
    }
    setBusy(false);
  };

  // ---------------------------------------------------------------- waiting on the office
  if (!loading && children.length === 0) {
    return (
      <Screen>
        <ScreenHeader title={t('parent.title')} />
        <StateBlock kind="empty" message={`${t('parent.pendingTitle')}\n\n${t('parent.pendingBody')}`} />
      </Screen>
    );
  }

  const child = overview && overview.child;
  const fees = (overview && overview.fees) || null;
  const academics = (overview && overview.academics) || null;
  const attendance = (overview && overview.attendance) || null;
  const gateDays = overview && overview.gate ? overview.gate.days.slice(0, 7) : [];
  const health = (overview && overview.health) || [];
  const discipline = (overview && overview.discipline) || [];

  /* Built as a list rather than three conditional elements so the last one can be widened when
     the count is odd. A two-column grid leaves a lone tile sitting in half a row beside nothing,
     which reads as a figure that failed to load rather than as the last of three. */
  const tiles = [];
  if (fees) {
    tiles.push({
      key: 'balance',
      label: t('parent.balance'),
      value: money(fees.balance_due || 0, fees.currency),
    });
  }
  if (attendance) {
    tiles.push({
      key: 'attendance',
      label: t('parent.attendance'),
      value: `${Math.round(attendance.rate || 0)}%`,
    });
  }
  if (academics && academics.average !== undefined) {
    tiles.push({
      key: 'average',
      label: t('parent.average'),
      value: `${Math.round(Number(academics.average))}%`,
    });
  }

  return (
    <Screen>
      {/* The title stays put and the child's name rides in the identity block below, the way the
          staff student card does it. Putting the name in the header left its ID line pinned in the
          gap above the scroll, colliding with whatever had scrolled up behind it. */}
      <ScreenHeader title={t('parent.title')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.neutral[400]} />
        }
      >
        {child ? (
          <StudentHeader
            student={child}
            sub={`${child.student_id} · ${classOf(child)}`}
            style={styles.identity}
          />
        ) : null}

        {/* Only where a family has more than one child at this school. */}
        {children.length > 1 && (
          <View style={styles.segmented}>
            {children.map((one) => (
              <Segment
                key={one.id}
                label={one.full_name}
                active={one.id === selected}
                onPress={() => load(one.id)}
                styles={styles}
              />
            ))}
          </View>
        )}

        {/* ------------------------------------------------------------------ the figures */}
        {tiles.length > 0 && (
          <>
            <SectionLabel style={styles.firstLabel}>{t('parent.overview')}</SectionLabel>
            <View style={styles.statGrid}>
              {tiles.map((tile, index) => (
                <StatTile
                  key={tile.key}
                  variant="gradient"
                  label={tile.label}
                  value={tile.value}
                  style={
                    tiles.length % 2 === 1 && index === tiles.length - 1 ? styles.wideTile : null
                  }
                />
              ))}
            </View>
            {fees ? (
              <Text style={styles.meta}>
                {t('parent.paidOf', { paid: money(fees.total_paid || 0, fees.currency) })}
              </Text>
            ) : null}
            {academics && academics.position !== undefined ? (
              <Text style={styles.meta}>
                {t('parent.position', { position: academics.position, of: academics.class_size || 0 })}
              </Text>
            ) : null}
          </>
        )}

        {/* ------------------------------------------------------------------ the gate */}
        {overview && overview.gate && (
          <>
            <SectionLabel>{t('parent.gateTitle')}</SectionLabel>
            <Card style={gateDays.length ? styles.listCard : styles.sectionCard}>
              {gateDays.length === 0 ? (
                <>
                  <Text style={styles.explainerTop}>{t('parent.gateNote')}</Text>
                  <Text style={styles.empty}>{t('parent.gateEmpty')}</Text>
                </>
              ) : (
                gateDays.map((day, index) => (
                  <DetailRow
                    key={day.day}
                    title={dateTime(day.day)}
                    value={
                      (day.arrived
                        ? t('parent.arrived', { time: clock(day.arrived) })
                        : t('parent.noArrival')) +
                      (day.left ? ` · ${t('parent.left', { time: clock(day.left) })}` : '')
                    }
                    isLast={index === gateDays.length - 1}
                  />
                ))
              )}
            </Card>
            {gateDays.length ? <Text style={styles.quietNote}>{t('parent.gateNote')}</Text> : null}
          </>
        )}

        {/* ------------------------------------------------------------------ sick bay */}
        {overview && overview.health && (
          <>
            <SectionLabel>{t('parent.healthTitle')}</SectionLabel>
            <Card style={health.length ? styles.listCard : styles.sectionCard}>
              {health.length === 0 ? (
                <Text style={styles.empty}>{t('parent.healthEmpty')}</Text>
              ) : (
                health.map((visit, index) => (
                  <DetailRow
                    key={visit.id}
                    title={visit.complaint}
                    value={dateTime(visit.admitted_at) + (visit.treatment ? ` · ${visit.treatment}` : '')}
                    isLast={index === health.length - 1}
                  />
                ))
              )}
            </Card>
          </>
        )}

        {/* ------------------------------------------------------------------ behaviour */}
        {overview && overview.discipline && (
          <>
            <SectionLabel>{t('parent.disciplineTitle')}</SectionLabel>
            <Card style={discipline.length ? styles.listCard : styles.sectionCard}>
              {discipline.length === 0 ? (
                <Text style={styles.empty}>{t('parent.disciplineEmpty')}</Text>
              ) : (
                discipline.map((record, index) => (
                  <DetailRow
                    key={record.id}
                    title={record.category}
                    value={`${dateTime(record.incident_date)} · ${record.description}`}
                    isLast={index === discipline.length - 1}
                  />
                ))
              )}
            </Card>
          </>
        )}

        {/* ------------------------------------------------------------------ asking */}
        <SectionLabel>{t('parentReq.title')}</SectionLabel>
        <Card style={styles.sectionCard}>
          <Text style={styles.explainerTop}>{t('parentReq.note')}</Text>

          <View style={styles.segmented}>
            {['pickup', 'absence'].map((option) => (
              <Segment
                key={option}
                label={t(`parentReq.${option}`)}
                active={option === kind}
                onPress={() => setKind(option)}
                styles={styles}
              />
            ))}
          </View>

          <View style={styles.formField}>
            <Field
              label={t('parentReq.reason')}
              value={reason}
              onChangeText={setReason}
              placeholder={kind === 'pickup' ? t('parentReq.pickupHint') : t('parentReq.absenceHint')}
            />
          </View>

          {/* `label`, not `title`: Button takes label, and the wrong prop name rendered a button
              with no words on it rather than failing anywhere visible. */}
          <Button
            label={t('parentReq.send')}
            icon={PaperPlaneTilt}
            onPress={ask}
            loading={busy}
            disabled={busy || !reason.trim()}
            style={styles.blockButton}
          />
        </Card>

        {requests.length ? (
          <Card style={styles.listCard}>
            {requests.map((request, index) => (
              <DetailRow
                key={request.id}
                title={t(`parentReq.${request.kind}`)}
                value={request.reason + (request.decided_note ? ` · ${request.decided_note}` : '')}
                isLast={index === requests.length - 1}
                action={
                  <Badge
                    label={t(`parentReq.status.${request.status}`)}
                    tone={STATUS_TONE[request.status] || 'neutral'}
                  />
                }
              />
            ))}
          </Card>
        ) : null}
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
    identity: {
      marginBottom: spacing.md,
    },
    // SectionLabel carries its own top margin; the first one sits under the identity block.
    firstLabel: {
      marginTop: spacing.xl,
    },
    sectionCard: {
      padding: spacing.lg,
    },
    listCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.lg,
    },
    // StatTile is 48% wide so two sit per row; an odd last one takes the whole row instead.
    wideTile: {
      flexBasis: '100%',
    },
    meta: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginTop: spacing.md,
    },
    quietNote: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[400],
      marginTop: spacing.md,
    },
    explainerTop: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginBottom: spacing.lg,
    },
    /* Left-aligned, like the staff card's own "No roll call recorded yet." A centred line under a
       left-aligned explainer put two alignments in one small card. */
    empty: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.neutral[500],
      paddingVertical: spacing.xs,
    },
    segmented: {
      flexDirection: 'row',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      backgroundColor: colors.surface,
      padding: 3,
      marginTop: spacing.lg,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
    },
    segmentActive: {
      backgroundColor: colors.accentRamp[900],
    },
    segmentLabel: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.neutral[500],
    },
    segmentLabelActive: {
      color: colors.accentRamp[200],
    },
    formField: {
      marginTop: spacing.lg,
    },
    blockButton: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
  });
