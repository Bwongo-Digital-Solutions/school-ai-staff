import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import {
  Bed,
  BookOpen,
  BowlFood,
  Cake,
  CalendarBlank,
  ChalkboardTeacher,
  Check,
  Clipboard,
  ClipboardText,
  Coffee,
  Coins,
  Cookie,
  EnvelopeSimple,
  Export,
  FirstAidKit,
  IdentificationCard,
  MapPin,
  Phone,
  SealCheck,
  SealWarning,
  ShieldCheck,
  SignIn,
  SignOut,
  Siren,
  UserCircle,
  X,
} from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts } from '../theme';
import { schoolApi, ApiError, receiptUrl } from '../api';
import { decideGatePass, gateFailureText } from '../gate';
import { designationOf } from '../roles';
import { dateTime, formatDate, humanise, money } from '../format';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import DetailRow from '../components/DetailRow';
import StateBlock from '../components/StateBlock';
import ScreenHeader from '../components/ScreenHeader';
import SectionLabel from '../components/SectionLabel';
import PermissionSlip from '../components/PermissionSlip';
import MovementList from '../components/MovementList';
import StudentHeader from '../components/StudentHeader';
import Field, { FormError } from '../components/Field';
import { alertSuccess, alertWarning, alertError } from '../alerts';
import { shareDocument } from '../share';

/* The server sends only the sections this profile may see, so rendering walks the section
   list it returns. An unknown section is skipped rather than guessed at. */
const SECTION_RENDERERS = {
  fees: FeesSection,
  payments: PaymentsSection,
  exam_clearance: ExamSection,
  exam_clearance_grant: ExamGrantSection,
  roll_call: RollCallSection,
  academics: AcademicsSection,
  attendance: AttendanceSection,
  dormitory: DormitorySection,
  bio: BioSection,
  class: ClassSection,
  parents: ParentsSection,
  gate_pass: GatePassSection,
  gate_permission: GatePermissionSection,
  meal_card: MealCardSection,
};

export default function StudentCardScreen({ code, user, onBack, onSendReport }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [card, setCard] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    schoolApi
      .studentCard(code, user && user.role, designationOf(user))
      .then((next) => {
        if (!cancelled) setCard(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Could not load the student card.');
      });
    return () => {
      cancelled = true;
    };
  }, [code, user, attempt]);

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Student" onBack={onBack} />
        <StateBlock kind="error" message={error} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Student" onBack={onBack} />
        <StateBlock kind="loading" message="Loading student card…" />
      </SafeAreaView>
    );
  }

  const student = card.student;
  /* Reports carry marks and payment history, so the server only builds one for staff who
     already hold the roster. Offering the button to anyone else would be a dead end. */
  const canSendReport = !!onSendReport && ['admin', 'teacher'].includes((user && user.role) || '');

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={student.full_name}
        onBack={onBack}
        right={
          canSendReport ? (
            <Pressable onPress={() => onSendReport(card)} hitSlop={12} accessibilityLabel="Send a report">
              <Export size={22} color={colors.text} weight="regular" />
            </Pressable>
          ) : null
        }
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StudentHeader
          student={student}
          badge={{
            label: humanise(student.status),
            tone: student.status === 'active' ? 'green' : 'neutral',
          }}
        />

        <View style={styles.scopeNote}>
          <IdentificationCard size={16} color={colors.neutral[500]} weight="regular" />
          <Text style={styles.scopeText}>
            {`Showing what a ${String(card.profile.label || '').toLowerCase()} may see`}
          </Text>
        </View>

        {card.sections.map((section) => {
          const Section = SECTION_RENDERERS[section];
          if (!Section) return null;
          return <Section key={section} card={card} user={user} reload={reload} />;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── fees ──────────────────────────────────────────────────────────── */

function FeesSection({ card }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const f = card.fees;

  if (!f || f.status === 'no_invoices') {
    return (
      <>
        <SectionLabel>Fees</SectionLabel>
        <Card style={styles.sectionCard}>
          <Text style={styles.caption}>Payment status</Text>
          <Text style={styles.bigValue}>No invoices</Text>
          <Text style={styles.meta}>Nothing has been billed to this student yet.</Text>
        </Card>
      </>
    );
  }

  const cleared = f.status === 'cleared';
  return (
    <>
      <SectionLabel>Fees</SectionLabel>
      <Card style={styles.sectionCard}>
        <View style={styles.spread}>
          <Text style={styles.caption}>Payment status</Text>
          <Badge label={cleared ? 'Cleared' : 'Outstanding'} tone={cleared ? 'green' : 'amber'} />
        </View>
        <Text style={styles.hugeValue}>{money(f.balance_due, f.currency)}</Text>
        <Text style={styles.meta}>
          {`${cleared ? 'All invoices settled' : 'Outstanding balance'} · ${f.invoice_count} invoice${
            f.invoice_count === 1 ? '' : 's'
          } totalling ${money(f.total_invoiced, f.currency)}`}
        </Text>
      </Card>
    </>
  );
}

/* ── payment history ───────────────────────────────────────────────── */

/* The ledger behind the fees balance. Every payment the school has recorded, newest first,
   and the receipt it issued — which a parent who is querying a balance will ask for by
   number, so it is shown and can be handed straight back to them. */
function PaymentsSection({ card, user }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState('');

  const p = card.payments;
  if (!p) return null;

  const shareReceipt = async (entry) => {
    setBusy(entry.id);
    try {
      await shareDocument(
        receiptUrl({ paymentId: entry.id, requesterRole: (user && user.role) || '' }),
        `${entry.receipt_number || 'receipt'}.pdf`,
        { title: `Receipt ${entry.receipt_number}` },
      );
    } catch (err) {
      alertError('Receipt not shared', err);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <SectionLabel>Payment history</SectionLabel>
      <Card style={styles.sectionCard}>
        <View style={styles.spread}>
          <Text style={styles.caption}>Total received</Text>
          <Text style={styles.bigValue}>{money(p.total_paid, p.currency)}</Text>
        </View>
        <Text style={styles.meta}>
          {p.count === 0
            ? 'Nothing has been paid against this student yet.'
            : `${p.count} payment${p.count === 1 ? '' : 's'} recorded`}
        </Text>

        {p.entries.map((entry) => (
          <View key={entry.id} style={styles.ledgerRow}>
            <View style={styles.ledgerLeft}>
              <Text style={styles.ledgerAmount}>{money(entry.amount, entry.currency)}</Text>
              <Text style={styles.ledgerMeta} numberOfLines={1}>
                {[formatDate(entry.paid_at), entry.method, entry.reference]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {entry.receipt_number ? (
                <Text style={styles.ledgerReceipt}>{entry.receipt_number}</Text>
              ) : (
                <Text style={styles.ledgerReceipt}>No receipt issued</Text>
              )}
            </View>
            {entry.receipt_number ? (
              <Button
                label={busy === entry.id ? 'Opening…' : 'Share'}
                icon={Export}
                variant="ghost"
                onPress={() => shareReceipt(entry)}
                loading={busy === entry.id}
                disabled={!!busy}
              />
            ) : null}
          </View>
        ))}
      </Card>
    </>
  );
}

/* ── roll call on a scanned card ───────────────────────────────────── */

const ATTENDANCE_TONE = {
  present: 'green', late: 'amber', excused: 'neutral', absent: 'red',
};

function RollCallSection({ card, user, reload }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const r = card.roll_call;
  if (!r) return null;
  const marked = r.marked;
  const Icon = marked ? ClipboardText : Clipboard;

  const mark = async (status) => {
    setBusy(true);
    setError('');
    try {
      const res = await schoolApi.markAttendance({
        code: card.student.student_id,
        status,
        markedBy: (user && user.display_name) || '',
      });
      // The server echoes the row it wrote, so a mark that did not reach the database
      // cannot look like one that did.
      if (!res || !res.record || res.record.status !== status) {
        throw new ApiError('The server did not confirm the mark. Nothing was saved.', 0);
      }
      alertSuccess(`Marked ${status}`);
      reload();
    } catch (err) {
      const detail =
        err.status === 404
          ? 'This server has no roll call endpoint. It is running an older build than this app.'
          : err.message;
      setError(err.status === 404 ? detail : `Not saved — ${detail}`);
      alertError('Not saved', detail);
      setBusy(false);
    }
  };

  const detail = [
    formatDate(r.date),
    marked && marked.marked_by ? `by ${marked.marked_by}` : '',
    marked && marked.reason ? marked.reason : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <SectionLabel>Roll call</SectionLabel>
      <Card style={styles.sectionCard}>
        <View style={styles.headlineRow}>
          <Icon
            size={28}
            color={marked ? colors.accent : colors.neutral[500]}
            weight="regular"
            style={styles.headlineIcon}
          />
          <View style={styles.headlineBody}>
            <Text style={styles.headline}>
              {marked ? humanise(marked.status) : 'Not yet marked'}
            </Text>
            <Text style={styles.meta}>{detail}</Text>
          </View>
          {marked ? (
            <Badge
              label={humanise(marked.status)}
              tone={ATTENDANCE_TONE[marked.status] || 'neutral'}
            />
          ) : null}
        </View>

        <View style={styles.markActions}>
          {['present', 'late', 'absent', 'excused'].map((status) => (
            <Button
              key={status}
              label={humanise(status)}
              variant={status === 'present' ? 'primary' : 'secondary'}
              disabled={busy}
              onPress={() => mark(status)}
              style={styles.markButton}
            />
          ))}
        </View>

        <FormError message={error} />
      </Card>
    </>
  );
}

/* ── exam clearance: the invigilator's door ────────────────────────── */

function ExamSection({ card, user, reload }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const e = card.exam_clearance;
  if (!e) return null;

  const submit = async (decision) => {
    setError('');
    const trimmed = note.trim();
    if (decision === 'rejected' && !trimmed) {
      setError('Say why the student was turned away.');
      return;
    }
    setBusy(true);
    try {
      await schoolApi.admitToExam({
        code: card.student.student_id,
        decision,
        note: trimmed,
        recordedBy: (user && user.display_name) || '',
      });
      alertSuccess(decision === 'approved' ? 'Admitted to the exam' : 'Turned away');
      reload();
    } catch (err) {
      setError(err.message);
      alertError('Not recorded', err);
      setBusy(false);
    }
  };

  const Icon = e.cleared ? SealCheck : SealWarning;

  return (
    <>
      <SectionLabel>Exam clearance</SectionLabel>
      <Card style={styles.sectionCard}>
        <View style={styles.headlineRow}>
          <Icon
            size={30}
            color={e.cleared ? colors.status.green : colors.status.amber}
            weight="regular"
            style={styles.headlineIcon}
          />
          <View style={styles.headlineBody}>
            <Text style={styles.headline}>
              {e.cleared ? 'Cleared to sit exams' : 'Not cleared'}
            </Text>
            <Text style={styles.meta}>{e.reason}</Text>
          </View>
        </View>

        {/* The ledger's position is shown alongside, because it is context for the
            decision rather than the decision itself. */}
        <View style={styles.feesNote}>
          <Coins size={16} color={colors.neutral[500]} weight="regular" />
          <Text style={styles.feesNoteText}>
            {e.fees_settled ? 'Fees settled' : `Owing ${money(e.balance_due, e.currency)}`}
          </Text>
        </View>

        {e.clearance && e.clearance.note ? (
          <Text style={styles.quietNote}>{e.clearance.note}</Text>
        ) : null}

        {e.last_admission ? (
          <Text style={styles.quietNote}>
            {`Last checked ${dateTime(e.last_admission.recorded_at)} — ${humanise(
              e.last_admission.decision,
            )}${e.last_admission.note ? ` · ${e.last_admission.note}` : ''}`}
          </Text>
        ) : null}

        <Field
          label={`Note${e.cleared ? ' (required to reject)' : ''}`}
          value={note}
          onChangeText={setNote}
          placeholder="Anything worth recording"
          editable={!busy}
          style={styles.formField}
        />
        <FormError message={error} />

        <View style={styles.buttonPair}>
          <Button
            label="Admit"
            icon={Check}
            variant="primary"
            disabled={busy}
            onPress={() => submit('approved')}
            style={styles.pairButton}
          />
          <Button
            label="Reject"
            icon={X}
            variant="danger"
            disabled={busy}
            onPress={() => submit('rejected')}
            style={[styles.pairButton, styles.pairButtonRight]}
          />
        </View>
      </Card>
    </>
  );
}

/* ── granting clearance (admin / bursar) ───────────────────────────── */

function ExamGrantSection({ card, user, reload }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const g = card.exam_clearance_grant;
  if (!g) return null;

  if (g.active) {
    const revoke = async () => {
      setBusy(true);
      try {
        await schoolApi.revokeExamClearance({
          clearanceId: g.active.id,
          by: (user && user.display_name) || '',
        });
        alertSuccess('Clearance revoked');
        reload();
      } catch (err) {
        alertError('Not revoked', err);
        setBusy(false);
      }
    };

    const rows = [
      ['Granted by', g.active.granted_by],
      ['When', dateTime(g.active.granted_at)],
    ];
    if (g.active.note) rows.push(['Note', g.active.note]);

    return (
      <>
        <SectionLabel>Grant exam clearance</SectionLabel>
        <Card style={styles.sectionCard}>
          <PermissionSlip title="Cleared to sit exams" rows={rows} />
          <Button
            label="Revoke clearance"
            variant="secondary"
            disabled={busy}
            onPress={revoke}
            style={styles.blockButton}
          />
        </Card>
      </>
    );
  }

  const grant = async () => {
    setError('');
    setBusy(true);
    try {
      await schoolApi.grantExamClearance({
        code: card.student.student_id,
        note: note.trim(),
        grantedBy: (user && user.display_name) || '',
        grantedByEmail: (user && user.auth_email) || '',
      });
      alertSuccess('Clearance granted');
      reload();
    } catch (err) {
      setError(err.message);
      alertError('Not granted', err);
      setBusy(false);
    }
  };

  return (
    <>
      <SectionLabel>Grant exam clearance</SectionLabel>
      <Card style={styles.sectionCard}>
        <View style={styles.feesNoteTop}>
          <Coins size={16} color={colors.neutral[500]} weight="regular" />
          <Text style={styles.feesNoteText}>
            {g.fees_settled ? 'Fees settled' : `Owing ${money(g.balance_due, g.currency)}`}
          </Text>
        </View>
        <Text style={styles.explainer}>
          Clearing a student lets the invigilator admit them, whatever the balance says.
        </Text>
        <Field
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Paid in cash, receipt 1182"
          editable={!busy}
        />
        <FormError message={error} />
        <Button
          label="Grant clearance"
          icon={SealCheck}
          variant="primary"
          disabled={busy}
          onPress={grant}
          style={styles.blockButton}
        />
      </Card>
    </>
  );
}

/* ── read-only sections ────────────────────────────────────────────── */

function AcademicsSection({ card }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const a = card.academics;
  if (!a) return null;

  return (
    <>
      <SectionLabel>Marks</SectionLabel>
      <Card style={styles.sectionCard}>
        {!a.entry_count ? (
          <Text style={styles.meta}>No marks recorded yet.</Text>
        ) : (
          <>
            <View style={styles.spread}>
              <Text style={styles.caption}>Average</Text>
              <Text style={styles.figure}>
                {a.average_percent === null ? '—' : `${a.average_percent}%`}
              </Text>
            </View>
            <View style={styles.tightList}>
              {a.entries.map((entry, index) => (
                <View
                  key={entry.id || index}
                  style={[styles.lineRow, index === a.entries.length - 1 && styles.lineRowLast]}
                >
                  <Text style={styles.lineLabel} numberOfLines={1}>
                    {entry.remarks || 'Assessment'}
                  </Text>
                  <Text style={styles.lineValue}>
                    {`${entry.score}/${entry.max_score}${entry.grade ? ` · ${entry.grade}` : ''}`}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>
    </>
  );
}

function AttendanceSection({ card }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const a = card.attendance;
  if (!a) return null;

  return (
    <>
      <SectionLabel>Attendance history</SectionLabel>
      <Card style={styles.sectionCard}>
        <View style={styles.spread}>
          <Text style={styles.caption}>Attendance rate</Text>
          <Text style={styles.figure}>{`${Number(a.rate || 0).toFixed(0)}%`}</Text>
        </View>
        <Text style={styles.meta}>
          {`${a.present} present · ${a.absent} absent of ${a.recorded} recorded`}
        </Text>
        {a.recent.length ? (
          <View style={styles.tightList}>
            {a.recent.map((r, index) => (
              <View
                key={r.id || index}
                style={[styles.lineRow, index === a.recent.length - 1 && styles.lineRowLast]}
              >
                <Text style={styles.lineLabel}>{formatDate(r.attendance_date)}</Text>
                <Badge
                  label={humanise(r.status)}
                  tone={r.status === 'present' ? 'green' : 'amber'}
                />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.metaSpaced}>No roll call recorded yet.</Text>
        )}
      </Card>
    </>
  );
}

function DormitorySection({ card }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const d = card.dormitory;

  return (
    <>
      <SectionLabel>Dormitory</SectionLabel>
      <Card style={styles.sectionCard}>
        {!d ? (
          <Text style={styles.meta}>
            Not assigned to a dormitory — this student is a day scholar or has no active bed.
          </Text>
        ) : (
          <View style={styles.headlineRow}>
            <Bed size={26} color={colors.accent} weight="regular" style={styles.headlineIcon} />
            <View style={styles.headlineBody}>
              <Text style={styles.headline}>
                {`${d.hostel_name} · Room ${d.room_number}`}
              </Text>
              <Text style={styles.meta}>
                {`Bed ${d.bed_number || '—'} · since ${formatDate(d.since)}`}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </>
  );
}

function InfoRows({ rows }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={styles.listCard}>
      {rows.map(([Icon, title, value], index) => (
        <DetailRow
          key={title}
          icon={Icon}
          title={title}
          value={value || '—'}
          isLast={index === rows.length - 1}
        />
      ))}
    </Card>
  );
}

function BioSection({ card }) {
  const b = card.bio;
  if (!b) return null;
  return (
    <>
      <SectionLabel>Bio data</SectionLabel>
      <InfoRows
        rows={[
          [Cake, 'Date of birth', formatDate(b.date_of_birth)],
          [UserCircle, 'Gender', humanise(b.gender)],
          [FirstAidKit, 'Blood group', b.blood_group],
          [MapPin, 'Address', b.address],
          [CalendarBlank, 'Enrolled', formatDate(b.enrollment_date)],
        ]}
      />
    </>
  );
}

function ClassSection({ card }) {
  const c = card.class_allocation;
  if (!c) return null;
  const subjects = Array.isArray(c.subjects) ? c.subjects : [];
  return (
    <>
      <SectionLabel>Class allocation</SectionLabel>
      <InfoRows
        rows={[
          [
            ChalkboardTeacher,
            'Class',
            `Grade ${c.grade_level == null ? '—' : c.grade_level}${
              c.class_section ? ` · ${c.class_section}` : ''
            }`,
          ],
          [BookOpen, 'Subjects', subjects.length ? subjects.join(', ') : 'None recorded'],
        ]}
      />
    </>
  );
}

function ParentsSection({ card }) {
  const p = card.parents;
  if (!p) return null;
  return (
    <>
      <SectionLabel>Parent&apos;s contact</SectionLabel>
      <InfoRows
        rows={[
          [UserCircle, 'Guardian', p.parent_name],
          [Phone, 'Phone', p.parent_phone],
          [EnvelopeSimple, 'Email', p.parent_email],
          [
            Siren,
            'Emergency contact',
            p.emergency_contact_name
              ? `${p.emergency_contact_name}${
                  p.emergency_contact_phone ? ` · ${p.emergency_contact_phone}` : ''
                }`
              : '',
          ],
        ]}
      />
    </>
  );
}

/* ── gate pass (askari) ────────────────────────────────────────────── */

function GatePassSection({ card, user, reload }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const g = card.gate_pass;
  if (!g) return null;

  const last = g.last_movement;
  const Icon = g.on_premises ? ShieldCheck : SignOut;
  const lastLine = last
    ? `Last ${last.direction} ${dateTime(last.recorded_at)}${
        last.authorised_by ? ` · authorised by ${last.authorised_by}` : ''
      }`
    : 'No movements recorded';

  return (
    <>
      <SectionLabel>Gate pass</SectionLabel>
      <Card style={styles.sectionCard}>
        <View style={styles.headlineRow}>
          <Icon
            size={30}
            color={g.on_premises ? colors.status.green : colors.status.amber}
            weight="regular"
            style={styles.headlineIcon}
          />
          <View style={styles.headlineBody}>
            <Text style={styles.headline}>
              {g.on_premises ? 'On the premises' : 'Signed out'}
            </Text>
            <Text style={styles.meta}>{lastLine}</Text>
          </View>
        </View>

        {g.on_premises ? (
          <ExitDecision card={card} gate={g} user={user} reload={reload} />
        ) : (
          <RecordReturn card={card} user={user} reload={reload} />
        )}
      </Card>

      {g.history && g.history.length ? (
        <>
          <SectionLabel>Recent movements</SectionLabel>
          <Card style={styles.listCard}>
            <MovementList movements={g.history} withNames={false} />
          </Card>
        </>
      ) : null}
    </>
  );
}

/* Leaving runs off a permission slip granted elsewhere. The gate reads it and decides;
   with no slip the officer must name whoever authorised the trip, so an override still
   answers to someone in the log. */
function ExitDecision({ card, gate, user, reload }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [authorisedBy, setAuthorisedBy] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const p = gate.permission;

  const submit = async (decision) => {
    setError('');
    const trimmedNote = note.trim();
    const trimmedAuth = p ? '' : authorisedBy.trim();

    if (decision === 'declined' && !trimmedNote) {
      setError('Say why the student was turned back.');
      return;
    }
    if (decision === 'approved' && !p && !trimmedAuth) {
      setError('Name who authorised this exit.');
      return;
    }

    setBusy(true);
    try {
      await decideGatePass({
        code: card.student.student_id,
        direction: 'out',
        decision,
        permission: p || null,
        note: trimmedNote,
        authorisedBy: trimmedAuth,
        reason: p ? '' : reason.trim(),
        recordedBy: (user && user.display_name) || '',
      });
      alertSuccess(decision === 'approved' ? 'Exit approved' : 'Exit declined');
      reload();
    } catch (err) {
      const detail = gateFailureText(err);
      setError(err.status === 404 ? detail : `Not recorded — ${detail}`);
      alertError('Not recorded', detail);
      setBusy(false);
    }
  };

  const slipRows = p
    ? [
        ['Allowed by', p.granted_by || '—'],
        ['Reason', p.reason || '—'],
        ['Destination', p.destination || '—'],
        ['Granted', dateTime(p.granted_at)],
        ...(p.expected_return ? [['Back by', formatDate(p.expected_return)]] : []),
      ]
    : [];

  return (
    <View style={styles.formBlock}>
      <PermissionSlip
        title={p ? 'Permission to leave' : 'No permission on file'}
        missing={!p}
        rows={slipRows}
        note={
          p
            ? ''
            : 'Nobody has granted this student permission to leave. Approving anyway records you as letting them out, so name who authorised it.'
        }
      />

      {!p ? (
        <>
          <Field
            label="Authorised by"
            value={authorisedBy}
            onChangeText={setAuthorisedBy}
            placeholder="Who permitted this exit?"
            editable={!busy}
            style={styles.formField}
          />
          <Field
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Family emergency"
            editable={!busy}
            style={styles.formField}
          />
        </>
      ) : null}

      <Field
        label={`Note${p ? ' (required to decline)' : ''}`}
        value={note}
        onChangeText={setNote}
        placeholder="Anything worth recording"
        editable={!busy}
        style={styles.formField}
      />
      <FormError message={error} />

      <View style={styles.buttonPair}>
        <Button
          label="Approve exit"
          icon={Check}
          variant="primary"
          disabled={busy}
          onPress={() => submit('approved')}
          style={styles.pairButton}
        />
        <Button
          label="Decline"
          icon={X}
          variant="danger"
          disabled={busy}
          onPress={() => submit('declined')}
          style={[styles.pairButton, styles.pairButtonRight]}
        />
      </View>
    </View>
  );
}

function RecordReturn({ card, user, reload }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await decideGatePass({
        code: card.student.student_id,
        direction: 'in',
        decision: 'approved',
        recordedBy: (user && user.display_name) || '',
      });
      alertSuccess('Return recorded');
      reload();
    } catch (err) {
      const detail = gateFailureText(err);
      setError(err.status === 404 ? detail : `Not recorded — ${detail}`);
      alertError('Not recorded', detail);
      setBusy(false);
    }
  };

  return (
    <View style={styles.formBlock}>
      <FormError message={error} />
      <Button
        label="Record return to school"
        icon={SignIn}
        variant="primary"
        disabled={busy}
        onPress={submit}
        style={styles.blockButton}
      />
    </View>
  );
}

/* ── granting permission (teacher, matron, admin) ──────────────────── */

function GatePermissionSection({ card, user, reload }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const gp = card.gate_permission;
  if (!gp) return null;
  const active = gp.active;

  if (active) {
    const cancel = async () => {
      setBusy(true);
      try {
        await schoolApi.cancelGatePermission({
          permissionId: active.id,
          by: (user && user.display_name) || '',
        });
        alertSuccess('Permission cancelled');
        reload();
      } catch (err) {
        alertError('Not cancelled', err);
        setBusy(false);
      }
    };

    const rows = [
      ['Reason', active.reason],
      ['Destination', active.destination],
      ['Allowed by', active.granted_by],
      ...(active.expected_return ? [['Back by', formatDate(active.expected_return)]] : []),
    ];

    return (
      <>
        <SectionLabel>Permission to go home</SectionLabel>
        <Card style={styles.sectionCard}>
          <PermissionSlip title="Waiting at the gate" rows={rows} />
          <Button
            label="Cancel this permission"
            variant="secondary"
            disabled={busy}
            onPress={cancel}
            style={styles.blockButton}
          />
        </Card>
      </>
    );
  }

  const grant = async () => {
    setError('');
    const trimmedReason = reason.trim();
    const trimmedDestination = destination.trim();
    const trimmedReturn = expectedReturn.trim();

    if (!trimmedReason || !trimmedDestination) {
      setError('A reason and a destination are both required.');
      return;
    }
    // React Native has no date input, so the date is typed and checked here instead.
    if (trimmedReturn && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedReturn)) {
      setError('Write the return date as YYYY-MM-DD, or leave it blank.');
      return;
    }

    setBusy(true);
    try {
      await schoolApi.grantGatePermission({
        code: card.student.student_id,
        reason: trimmedReason,
        destination: trimmedDestination,
        expectedReturn: trimmedReturn || null,
        grantedBy: (user && user.display_name) || '',
        grantedByEmail: (user && user.auth_email) || '',
      });
      alertSuccess('Permission granted');
      reload();
    } catch (err) {
      setError(err.message);
      alertError('Not granted', err);
      setBusy(false);
    }
  };

  return (
    <>
      <SectionLabel>Permission to go home</SectionLabel>
      <Card style={styles.sectionCard}>
        <Text style={styles.explainerTop}>
          The gate will see who allowed the trip, why, and where the student is going.
        </Text>
        <Field
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Going home for mid-term"
          editable={!busy}
        />
        <Field
          label="Destination"
          value={destination}
          onChangeText={setDestination}
          placeholder="Where the student is going"
          editable={!busy}
          style={styles.formField}
        />
        <Field
          label="Expected back (optional)"
          value={expectedReturn}
          onChangeText={setExpectedReturn}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          editable={!busy}
          style={styles.formField}
        />
        <FormError message={error} />
        <Button
          label="Grant permission"
          icon={SealCheck}
          variant="primary"
          disabled={busy}
          onPress={grant}
          style={styles.blockButton}
        />
      </Card>
    </>
  );
}

/* ── meal card (cook) ──────────────────────────────────────────────── */

const MEAL_ICONS = { breakfast: Coffee, lunch: BowlFood, supper: Cookie };

function MealCardSection({ card, user, reload }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState('');

  const m = card.meal_card;
  if (!m) return null;

  const serve = async (meal) => {
    setBusy(meal);
    try {
      const res = await schoolApi.recordMeal({
        code: card.student.student_id,
        meal,
        servedBy: (user && user.display_name) || '',
      });
      if (res.already_served) alertWarning('Already served today');
      else alertSuccess(`${humanise(meal)} recorded`);
      reload();
    } catch (err) {
      alertError('Not recorded', err);
      setBusy('');
    }
  };

  return (
    <>
      <SectionLabel>Meal card</SectionLabel>
      <Card style={styles.sectionCard}>
        <Text style={styles.caption}>{`Today · ${formatDate(m.meal_date)}`}</Text>
        {m.meals.map((meal, index) => {
          const Icon = MEAL_ICONS[meal.meal] || BowlFood;
          return (
            <View
              key={meal.meal}
              style={[styles.mealRow, index === m.meals.length - 1 && styles.mealRowLast]}
            >
              <Icon
                size={20}
                color={meal.eaten ? colors.status.green : colors.neutral[500]}
                weight="regular"
                style={styles.headlineIcon}
              />
              <View style={styles.headlineBody}>
                <Text style={styles.mealTitle}>{humanise(meal.meal)}</Text>
                <Text style={styles.meta}>
                  {meal.eaten
                    ? `Served${meal.served_by ? ` by ${meal.served_by}` : ''}`
                    : 'Not yet served'}
                </Text>
              </View>
              {meal.eaten ? (
                <Badge label="Ate" tone="green" />
              ) : (
                <Button
                  label="Mark served"
                  variant="secondary"
                  disabled={!!busy}
                  onPress={() => serve(meal.meal)}
                  style={styles.rowButton}
                />
              )}
            </View>
          );
        })}
      </Card>
    </>
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
    scopeNote: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
    },
    scopeText: {
      flex: 1,
      marginLeft: spacing.md,
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[400],
    },
    sectionCard: {
      padding: spacing.lg,
    },
    listCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    spread: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    caption: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[400],
    },
    figure: {
      fontFamily: fonts.medium,
      fontSize: 20,
      color: colors.text,
    },
    ledgerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.neutral[800],
      paddingTop: spacing.lg,
      marginTop: spacing.lg,
    },
    ledgerLeft: {
      flex: 1,
      marginRight: spacing.lg,
    },
    ledgerAmount: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      color: colors.text,
    },
    ledgerMeta: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[500],
      marginTop: 2,
    },
    ledgerReceipt: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: colors.neutral[600],
      marginTop: 2,
    },
    bigValue: {
      fontFamily: fonts.medium,
      fontSize: 22,
      color: colors.text,
      marginTop: spacing.sm,
    },
    hugeValue: {
      fontFamily: fonts.medium,
      fontSize: 28,
      lineHeight: 32,
      color: colors.text,
      marginTop: spacing.md,
    },
    meta: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginTop: spacing.xs,
    },
    metaSpaced: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginTop: spacing.lg,
    },
    headlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headlineIcon: {
      marginRight: spacing.lg,
    },
    headlineBody: {
      flex: 1,
      marginRight: spacing.md,
    },
    headline: {
      fontFamily: fonts.medium,
      fontSize: 16,
      color: colors.text,
    },
    markActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.lg,
      marginHorizontal: -spacing.xs,
    },
    markButton: {
      flexGrow: 1,
      flexBasis: '46%',
      marginHorizontal: spacing.xs,
      marginTop: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    feesNote: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
    },
    feesNoteTop: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.sm,
      backgroundColor: colors.surface2,
    },
    feesNoteText: {
      marginLeft: spacing.md,
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.text,
    },
    quietNote: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[400],
      marginTop: spacing.lg,
    },
    explainer: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    explainerTop: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      marginBottom: spacing.lg,
    },
    formBlock: {
      marginTop: spacing.lg,
    },
    formField: {
      marginTop: spacing.lg,
    },
    blockButton: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
    buttonPair: {
      flexDirection: 'row',
      marginTop: spacing.lg,
    },
    pairButton: {
      flex: 1,
    },
    pairButtonRight: {
      marginLeft: spacing.md,
    },
    tightList: {
      marginTop: spacing.md,
    },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[900],
    },
    lineRowLast: {
      borderBottomWidth: 0,
    },
    lineLabel: {
      flex: 1,
      marginRight: spacing.md,
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
    },
    lineValue: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.text,
    },
    mealRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[900],
    },
    mealRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    mealTitle: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.text,
    },
    rowButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
  });
