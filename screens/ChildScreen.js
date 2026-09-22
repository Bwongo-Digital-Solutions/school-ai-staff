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
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { CaretDown, PaperPlaneTilt } from 'phosphor-react-native';

import { useTheme, spacing, fonts } from '../theme';
import { schoolApi, ApiError } from '../api';
import { alertSuccess, alertError } from '../alerts';
import { classOf, dateTime, money } from '../format';
import { useT } from '../i18n';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Field from '../components/Field';
import StateBlock from '../components/StateBlock';

const clock = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

export default function ChildScreen() {
  const { colors } = useTheme();
  const t = useT();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState(null);
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <Screen>
      <ScreenHeader title={child ? child.full_name : t('parent.title')} />
      {child && <Text style={s.who}>{`${child.student_id} · ${classOf(child)}`}</Text>}

      <ScrollView
        contentContainerStyle={s.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(selected)} />}
      >
        {/* Only where a family has more than one child at this school. */}
        {children.length > 1 && (
          <View style={s.switcher}>
            {children.map((one) => (
              <Pressable
                key={one.id}
                onPress={() => load(one.id)}
                style={[s.chip, one.id === selected && s.chipOn]}
              >
                <Text style={[s.chipText, one.id === selected && s.chipTextOn]}>
                  {one.full_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ------------------------------------------------------------------ the figures */}
        <View style={s.tiles}>
          {fees && (
            <Card style={s.tile}>
              <Text style={s.tileLabel}>{t('parent.balance')}</Text>
              <Text style={s.tileValue}>{money(fees.balance_due || 0, fees.currency)}</Text>
              <Text style={s.tileNote}>
                {t('parent.paidOf', { paid: money(fees.total_paid || 0, fees.currency) })}
              </Text>
            </Card>
          )}
          {attendance && (
            <Card style={s.tile}>
              <Text style={s.tileLabel}>{t('parent.attendance')}</Text>
              <Text style={s.tileValue}>{`${Math.round(attendance.rate || 0)}%`}</Text>
            </Card>
          )}
          {academics && academics.average !== undefined && (
            <Card style={s.tile}>
              <Text style={s.tileLabel}>{t('parent.average')}</Text>
              <Text style={s.tileValue}>{`${Math.round(Number(academics.average))}%`}</Text>
              {academics.position !== undefined && (
                <Text style={s.tileNote}>
                  {t('parent.position', { position: academics.position, of: academics.class_size || 0 })}
                </Text>
              )}
            </Card>
          )}
        </View>

        {/* ------------------------------------------------------------------ the gate */}
        {overview && overview.gate && (
          <Card>
            <Text style={s.cardTitle}>{t('parent.gateTitle')}</Text>
            <Text style={s.cardNote}>{t('parent.gateNote')}</Text>
            {overview.gate.days.length === 0 ? (
              <Text style={s.empty}>{t('parent.gateEmpty')}</Text>
            ) : (
              overview.gate.days.slice(0, 7).map((day) => (
                <View key={day.day} style={s.row}>
                  <Text style={s.rowMain}>{dateTime(day.day)}</Text>
                  <Text style={s.rowNote}>
                    {day.arrived ? t('parent.arrived', { time: clock(day.arrived) }) : t('parent.noArrival')}
                    {day.left ? ` · ${t('parent.left', { time: clock(day.left) })}` : ''}
                  </Text>
                </View>
              ))
            )}
          </Card>
        )}

        {/* ------------------------------------------------------------------ sick bay */}
        {overview && overview.health && (
          <Card>
            <Text style={s.cardTitle}>{t('parent.healthTitle')}</Text>
            {overview.health.length === 0 ? (
              <Text style={s.empty}>{t('parent.healthEmpty')}</Text>
            ) : (
              overview.health.map((visit) => (
                <View key={visit.id} style={s.row}>
                  <Text style={s.rowMain}>{visit.complaint}</Text>
                  <Text style={s.rowNote}>
                    {dateTime(visit.admitted_at)}
                    {visit.treatment ? ` · ${visit.treatment}` : ''}
                  </Text>
                </View>
              ))
            )}
          </Card>
        )}

        {/* ------------------------------------------------------------------ behaviour */}
        {overview && overview.discipline && (
          <Card>
            <Text style={s.cardTitle}>{t('parent.disciplineTitle')}</Text>
            {overview.discipline.length === 0 ? (
              <Text style={s.empty}>{t('parent.disciplineEmpty')}</Text>
            ) : (
              overview.discipline.map((record) => (
                <View key={record.id} style={s.row}>
                  <Text style={s.rowMain}>{record.category}</Text>
                  <Text style={s.rowNote}>
                    {dateTime(record.incident_date)} · {record.description}
                  </Text>
                </View>
              ))
            )}
          </Card>
        )}

        {/* ------------------------------------------------------------------ asking */}
        <Card>
          <Text style={s.cardTitle}>{t('parentReq.title')}</Text>
          <Text style={s.cardNote}>{t('parentReq.note')}</Text>

          <View style={s.switcher}>
            {['pickup', 'absence'].map((option) => (
              <Pressable
                key={option}
                onPress={() => setKind(option)}
                style={[s.chip, option === kind && s.chipOn]}
              >
                <Text style={[s.chipText, option === kind && s.chipTextOn]}>
                  {t(`parentReq.${option}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Field
            label={t('parentReq.reason')}
            value={reason}
            onChangeText={setReason}
            placeholder={kind === 'pickup' ? t('parentReq.pickupHint') : t('parentReq.absenceHint')}
          />

          <Button
            title={t('parentReq.send')}
            icon={PaperPlaneTilt}
            onPress={ask}
            disabled={busy || !reason.trim()}
          />

          {requests.map((request) => (
            <View key={request.id} style={s.row}>
              <Text style={s.rowMain}>{t(`parentReq.${request.kind}`)}</Text>
              <Text style={s.rowNote}>
                {request.reason}
                {request.decided_note ? ` · ${request.decided_note}` : ''}
              </Text>
              <Text style={s.status}>{t(`parentReq.status.${request.status}`)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
    who: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, paddingHorizontal: spacing.lg },
    switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
    chipTextOn: { color: colors.onPrimary || '#fff' },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tile: { flexGrow: 1, flexBasis: '45%' },
    tileLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
    tileValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
    tileNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
    cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
    cardNote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted, marginBottom: spacing.sm },
    row: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.neutral[200], gap: 2 },
    rowMain: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
    rowNote: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
    status: { fontFamily: fonts.regular, fontSize: 12, color: colors.primary },
    empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, paddingVertical: spacing.md, textAlign: 'center' },
  });
