import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { ChatCircleDots, PencilSimple, Prohibit, SignOut, WarningCircle } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts } from '../theme';
import { schoolApi, ApiError } from '../api';
import { AUDIENCE_LABELS } from '../roles';
import { dateTime, humanise } from '../format';
import Badge from '../components/Badge';
import Button from '../components/Button';
import StateBlock from '../components/StateBlock';
import ScreenHeader from '../components/ScreenHeader';
import { useToast } from '../components/Toast';
import { alertSuccess, alertError } from '../alerts';

/* One bell for two things: staff writing to each other, and the system reporting something
   that happened. The server decides who a message reaches; this only renders the feed. */
function audienceLabel(m) {
  if (m.audience_kind === 'all') return AUDIENCE_LABELS.all;
  if (m.audience_kind === 'user') return 'Direct';
  return AUDIENCE_LABELS[m.audience_value] || humanise(m.audience_value);
}

export default function MessagesScreen({
  user,
  inbox,
  onInboxChange,
  onReload,
  onCompose,
  onBack,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toast = useToast();

  /* A gate permission alert is worth acting on only while the permission is still open.
     The pending list is the server's answer to that, so the two are cross-referenced rather
     than the message being trusted on its own: one that was already used, cancelled or
     retired at the end of its day shows no buttons instead of buttons that would fail. */
  const [openPermissions, setOpenPermissions] = useState({});
  const [deciding, setDeciding] = useState('');

  const loadPending = useCallback(async () => {
    try {
      const rows = await schoolApi.pendingGatePasses();
      const byStudent = {};
      rows.forEach((row) => {
        byStudent[row.student_id] = row;
        byStudent[row.student_number] = row;
      });
      setOpenPermissions(byStudent);
    } catch {
      /* the list is what makes the buttons appear; without it the message is still readable */
      setOpenPermissions({});
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const decideFromMessage = async (entry, decision) => {
    setDeciding(entry.id);
    try {
      const res = await schoolApi.recordGatePass({
        code: entry.student_number,
        direction: 'out',
        decision,
        reason: entry.reason,
        destination: entry.destination,
        authorisedBy: entry.granted_by,
        recordedBy: (user && user.display_name) || '',
      });
      if (!res || !res.pass || res.pass.decision !== decision) {
        throw new ApiError('The server did not confirm the movement. Nothing was recorded.', 0);
      }
      alertSuccess(decision === 'approved' ? 'Let out' : 'Turned back', entry.full_name);
      await loadPending();
    } catch (err) {
      alertError('Not recorded', err);
    } finally {
      setDeciding('');
    }
  };
  const [busy, setBusy] = useState(false);

  const messages = inbox.messages || [];

  // Opened straight from a notification-free session, the feed may never have been
  // fetched; Home's heartbeat is the usual source, this is the fallback.
  useEffect(() => {
    if (!inbox.loaded && !inbox.error) onReload();
  }, [inbox.loaded, inbox.error, onReload]);

  const markRead = async (message) => {
    if (message.read) return;
    try {
      const res = await schoolApi.markMessageRead({
        actorEmail: user.auth_email,
        messageId: message.id,
      });
      onInboxChange({
        messages: res.messages || messages,
        unread: res.unread || 0,
        loaded: true,
      });
    } catch (err) {
      toast(err.message);
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      const res = await schoolApi.markAllMessagesRead({ actorEmail: user.auth_email });
      onInboxChange({ messages: res.messages || [], unread: res.unread || 0, loaded: true });
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Notifications"
        onBack={onBack}
        right={
          <Pressable onPress={onCompose} hitSlop={12}>
            <PencilSimple size={20} color={colors.text} weight="regular" />
          </Pressable>
        }
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {inbox.error ? (
          <StateBlock kind="error" message={inbox.error} onRetry={onReload} />
        ) : !inbox.loaded ? (
          <StateBlock kind="loading" message="Loading notifications…" />
        ) : !messages.length ? (
          <StateBlock message="Nothing yet. Messages from other staff and important events appear here." />
        ) : (
          <>
            {inbox.unread ? (
              <Button
                label="Mark all read"
                variant="secondary"
                loading={busy}
                onPress={markAll}
                style={styles.readAll}
              />
            ) : null}

            {messages.map((m) => {
              const isEvent = m.category === 'event';
              const Icon = isEvent ? WarningCircle : ChatCircleDots;
              const tint =
                m.priority === 'high'
                  ? colors.status.amber
                  : isEvent
                    ? colors.neutral[400]
                    : colors.accent;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => markRead(m)}
                  style={({ pressed }) => [
                    styles.row,
                    !m.read && styles.rowUnread,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon size={20} color={tint} weight="regular" style={styles.icon} />
                  <View style={styles.body}>
                    <View style={styles.head}>
                      <Text style={styles.subject} numberOfLines={2}>
                        {m.subject}
                      </Text>
                      {m.priority === 'high' ? <Badge label="Important" tone="amber" /> : null}
                    </View>
                    <Text style={styles.text}>{m.body}</Text>
                    <Text style={styles.meta}>
                      {`${isEvent ? 'System' : m.sender_name || 'Staff'} · ${audienceLabel(
                        m,
                      )} · ${dateTime(m.created_at)}`}
                    </Text>

                    {m.event_type === 'gate_permission' && openPermissions[m.student_id] ? (
                      <View style={styles.gateActions}>
                        <Button
                          label={deciding === openPermissions[m.student_id].id ? 'Recording…' : 'Let out'}
                          icon={SignOut}
                          variant="primary"
                          onPress={() => decideFromMessage(openPermissions[m.student_id], 'approved')}
                          loading={deciding === openPermissions[m.student_id].id}
                          disabled={!!deciding}
                        />
                        <Button
                          label="Turn back"
                          icon={Prohibit}
                          variant="ghost"
                          onPress={() => decideFromMessage(openPermissions[m.student_id], 'declined')}
                          disabled={!!deciding}
                          style={styles.gateSecondary}
                        />
                      </View>
                    ) : null}
                  </View>
                  {m.read ? null : <View style={styles.dot} accessibilityLabel="Unread" />}
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    gateActions: {
      marginTop: spacing.lg,
    },
    gateSecondary: {
      marginTop: spacing.sm,
    },
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
    readAll: {
      alignSelf: 'flex-end',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    rowUnread: {
      borderColor: colors.accentRamp[700],
    },
    pressed: {
      opacity: 0.7,
    },
    icon: {
      marginRight: spacing.lg,
      marginTop: 2,
    },
    body: {
      flex: 1,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    subject: {
      flex: 1,
      marginRight: spacing.md,
      fontFamily: fonts.medium,
      fontSize: 14.5,
      lineHeight: 20,
      color: colors.text,
    },
    text: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.neutral[400],
      marginTop: spacing.xs,
    },
    meta: {
      fontFamily: fonts.regular,
      fontSize: 11.5,
      lineHeight: 17,
      color: colors.neutral[500],
      marginTop: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
      marginLeft: spacing.md,
      marginTop: 6,
    },
  });
