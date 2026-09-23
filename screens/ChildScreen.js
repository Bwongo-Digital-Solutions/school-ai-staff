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
import { Minus, PaperPlaneTilt, TrendDown, TrendUp } from 'phosphor-react-native';

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
import Select from '../components/Select';
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

/**
 * The child's average per day of marking, as a column of bars.
 *
 * Drawn with Views rather than a chart library: one series, no axes worth the room on a phone, and
 * the alternative is a native dependency and a new APK for a picture six bars wide.
 *
 * Bars are scaled against 100, not against the child's own best. A series normalised to its own
 * maximum makes every child look like they peak, and a parent reading "the last bar is tallest"
 * would be reading an artefact of the scaling rather than a mark.
 */
function Sparkline({ rounds, styles, colors }) {
  if (rounds.length < 2) return null;
  return (
    <View style={styles.spark} accessible accessibilityLabel={rounds.map((r) => `${r.percent}%`).join(', ')}>
      {rounds.map((round, index) => (
        <View key={round.day} style={styles.sparkCol}>
          <View
            style={[
              styles.sparkBar,
              { height: `${Math.max(4, Math.min(100, round.percent))}%` },
              index === rounds.length - 1 && { backgroundColor: colors.accent },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

/* Direction is never carried by colour alone: the arrow and the number say it too, which is what
   makes it readable to somebody who cannot separate the green from the red. */
const DIRECTION = {
  up: { icon: TrendUp, tone: 'green' },
  down: { icon: TrendDown, tone: 'red' },
  steady: { icon: Minus, tone: 'neutral' },
  first: { icon: null, tone: 'neutral' },
};

function SubjectRow({ subject, isLast, styles, colors, t }) {
  const direction = DIRECTION[subject.direction] || DIRECTION.steady;
  const Icon = direction.icon;
  const toneColor =
    direction.tone === 'green' ? colors.status.green
      : direction.tone === 'red' ? colors.status.red
        : colors.neutral[500];

  const change = subject.change === null ? null : Math.abs(subject.change);
  const changeLabel = subject.direction === 'first'
    ? t('parent.firstMark')
    : subject.direction === 'steady'
      ? t('parent.steady')
      : t(subject.direction === 'up' ? 'parent.up' : 'parent.down', { change: `${change}` });

  return (
    <View style={[styles.subjectRow, isLast && styles.subjectRowLast]}>
      <View style={styles.subjectTop}>
        <Text style={styles.subjectName} numberOfLines={1}>{subject.subject}</Text>
        <Text style={styles.subjectScore}>
          {subject.latest === null ? '—' : `${subject.latest}%`}
        </Text>
      </View>

      {/* Against 100, for the same reason the sparkline is. */}
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${Math.max(2, Math.min(100, subject.latest || 0))}%` }]} />
      </View>

      <View style={styles.subjectMeta}>
        {Icon ? <Icon size={13} color={toneColor} weight="bold" /> : null}
        <Text style={[styles.changeText, { color: toneColor }]}>{changeLabel}</Text>
        <Text style={styles.subjectCount}>
          {`· ${t('parent.subjectMarks', { count: subject.marks })}`}
          {subject.best !== null && subject.marks > 1 ? ` · ${t('parent.best', { percent: subject.best })}` : ''}
        </Text>
      </View>
    </View>
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
  /* Who the request is addressed to. Posts, not people — the server builds the list from the posts
     this school actually has somebody approved in, so a parent cannot address a collection to an
     empty desk and then wait for an answer that was never coming. */
  const [approvers, setApprovers] = useState([]);
  const [addressedTo, setAddressedTo] = useState('');

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

  /* Fetched once. A school that appoints a Director of Studies mid-term needs a parent to reopen
     the app to see them, which is the right trade against asking on every render. */
  useEffect(() => {
    let cancelled = false;
    schoolApi.parentApprovers()
      .then((list) => {
        if (cancelled) return;
        setApprovers(list);
        // Pre-selected only when there is exactly one, where a dropdown would be a formality.
        if (list.length === 1) setAddressedTo(list[0].key);
      })
      .catch(() => { /* the form still works unaddressed — the office sees it either way */ });
    return () => { cancelled = true; };
  }, []);

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
      await schoolApi.parentAsk({ studentId: selected, kind, reason: reason.trim(), addressedTo });
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
  const performance = (overview && overview.performance) || null;

  /* The post a request went to, in this school's own words. Falls back to the stored key rather
     than to nothing: a school that has since abolished the post should still show where an old
     request was sent. */
  const approverLabel = (key) =>
    (approvers.find((a) => a.key === key) || {}).label || key.replace(/_/g, ' ');

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

        {/* ------------------------------------------------- how they are doing, over time */}
        {performance && (
          <>
            <SectionLabel>{t('parent.progressTitle')}</SectionLabel>
            <Card style={styles.sectionCard}>
              {performance.marksRecorded === 0 ? (
                <Text style={styles.empty}>{t('parent.progressEmpty')}</Text>
              ) : (
                <>
                  <View style={styles.progressHead}>
                    <View style={styles.progressHeadText}>
                      <Text style={styles.progressFigure}>
                        {performance.average === null ? '—' : `${Math.round(performance.average)}%`}
                      </Text>
                      <Text style={styles.progressCaption}>{t('parent.progressAverage')}</Text>
                    </View>
                    <Sparkline rounds={performance.overall} styles={styles} colors={colors} />
                  </View>

                  {performance.overall.length > 1 ? (
                    <Text style={styles.quietNote}>{t('parent.progressRounds')}</Text>
                  ) : null}

                  <View style={styles.subjectList}>
                    {performance.subjects.map((subject, index) => (
                      <SubjectRow
                        key={subject.id}
                        subject={subject}
                        isLast={index === performance.subjects.length - 1}
                        styles={styles}
                        colors={colors}
                        t={t}
                      />
                    ))}
                  </View>

                  <Text style={styles.quietNote}>
                    {`${t('parent.progressMarks', { count: performance.marksRecorded })} · ${t('parent.progressNote')}`}
                  </Text>
                </>
              )}
            </Card>
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

          {/* Who to ask. Drawn only when the school has somebody to ask and the choice is real —
              with a single post the dropdown would be a formality, and it is pre-selected instead. */}
          {approvers.length > 1 && (
            <View style={styles.formField}>
              <Select
                label={t('parentReq.addressTo')}
                title={t('parentReq.addressTo')}
                placeholder={t('parentReq.addressToHint')}
                value={addressedTo}
                onChange={setAddressedTo}
                options={approvers.map((a) => ({ value: a.key, label: a.label }))}
              />
            </View>
          )}

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
                title={
                  request.addressed_to
                    ? `${t(`parentReq.${request.kind}`)} · ${approverLabel(request.addressed_to)}`
                    : t(`parentReq.${request.kind}`)
                }
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
    /* ── the progress tracker ───────────────────────────────────────────────── */
    progressHead: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    progressHeadText: {
      flexShrink: 1,
    },
    progressFigure: {
      fontFamily: fonts.medium,
      fontSize: 28,
      lineHeight: 32,
      color: colors.text,
    },
    progressCaption: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[500],
      marginTop: 2,
    },
    spark: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      height: 44,
      flexShrink: 0,
    },
    sparkCol: {
      width: 8,
      height: '100%',
      justifyContent: 'flex-end',
    },
    sparkBar: {
      width: '100%',
      borderRadius: 2,
      backgroundColor: colors.accentRamp[700],
      minHeight: 3,
    },
    subjectList: {
      marginTop: spacing.lg,
    },
    subjectRow: {
      paddingBottom: spacing.lg,
      marginBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[900],
    },
    subjectRowLast: {
      paddingBottom: 0,
      marginBottom: 0,
      borderBottomWidth: 0,
    },
    subjectTop: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    subjectName: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.text,
    },
    subjectScore: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      color: colors.text,
    },
    // The track is the full width; the fill is the mark out of 100.
    meter: {
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.neutral[900],
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    meterFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    subjectMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    changeText: {
      fontFamily: fonts.medium,
      fontSize: 12,
    },
    subjectCount: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[500],
    },
    formField: {
      marginTop: spacing.lg,
    },
    blockButton: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
  });
