import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  CaretRight,
  ChatCircleDots,
  MagnifyingGlass,
  PaperPlaneTilt,
  Sparkle,
  X,
} from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { schoolApi } from '../api';
import { humanise, initialsOf } from '../format';
import Card from '../components/Card';
import StateBlock from '../components/StateBlock';
import SectionLabel from '../components/SectionLabel';
import Select from '../components/Select';
import Markdown from '../components/Markdown';

const SUGGESTIONS = [
  'Who are the top 5 students by GPA?',
  'Which students have attendance below 90%?',
  'Show all students in Grade 10',
  'Which students have outstanding fees?',
];

/* Two panels behind one tab. Both are refused server-side for anyone but an admin or a
   teacher, which is why `requesterRole` goes with every request rather than the tab's
   visibility being trusted on its own. */
export default function AssistantScreen({ user, chat, onChatChange, onOpenStudentCode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [panel, setPanel] = useState('chat');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Assistant</Text>
      </View>

      <View style={styles.segmented}>
        <Segment
          label="Chat"
          icon={ChatCircleDots}
          active={panel === 'chat'}
          onPress={() => setPanel('chat')}
          styles={styles}
          colors={colors}
        />
        <Segment
          label="Search"
          icon={MagnifyingGlass}
          active={panel === 'search'}
          onPress={() => setPanel('search')}
          styles={styles}
          colors={colors}
        />
      </View>

      {panel === 'chat' ? (
        <ChatPanel user={user} chat={chat} onChatChange={onChatChange} styles={styles} colors={colors} />
      ) : (
        <SearchPanel
          user={user}
          onOpenStudentCode={onOpenStudentCode}
          styles={styles}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
}

function Segment({ label, icon: Icon, active, onPress, styles, colors }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Icon
        size={16}
        color={active ? colors.accentRamp[200] : colors.neutral[500]}
        weight="regular"
      />
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/* ── chat ──────────────────────────────────────────────────────────── */

function ChatPanel({ user, chat, onChatChange, styles, colors }) {
  const [input, setInput] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    if (chat.modelsLoaded) return undefined;
    let cancelled = false;
    schoolApi
      .aiModels()
      .then((models) => {
        if (cancelled) return;
        // A model with no credentials configured stays listed but is marked, so the
        // reason a provider is unavailable is visible rather than a mystery failure later.
        const usable = models.find((m) => m.configured) || models[0];
        onChatChange((prev) => ({
          ...prev,
          models,
          modelsLoaded: true,
          modelId: prev.modelId || (usable ? usable.id : null),
        }));
      })
      .catch(() => {
        if (!cancelled) onChatChange((prev) => ({ ...prev, models: [], modelsLoaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [chat.modelsLoaded, onChatChange]);

  const send = useCallback(
    async (text) => {
      const message = String(text || '').trim();
      if (!message || chat.busy) return;

      setInput('');
      onChatChange((prev) => ({
        ...prev,
        busy: true,
        messages: [
          ...prev.messages,
          { role: 'user', content: message },
          { role: 'assistant', pending: true },
        ],
      }));

      try {
        const res = await schoolApi.aiChat({
          message,
          conversationId: chat.conversationId,
          modelId: chat.modelId,
          requesterRole: user && user.role,
          actorName: (user && user.display_name) || '',
          actorEmail: (user && user.auth_email) || '',
        });
        onChatChange((prev) => ({
          ...prev,
          busy: false,
          conversationId: res.conversationId || prev.conversationId,
          messages: [
            ...prev.messages.slice(0, -1),
            {
              role: 'assistant',
              content: res.message,
              model: (res.model && res.model.label) || '',
            },
          ],
        }));
      } catch (err) {
        onChatChange((prev) => ({
          ...prev,
          busy: false,
          messages: [
            ...prev.messages.slice(0, -1),
            {
              role: 'assistant',
              content:
                err.status === 403
                  ? 'The assistant is only available to administrators and teaching staff.'
                  : err.message,
              model: '',
            },
          ],
        }));
      }
    },
    [chat.busy, chat.conversationId, chat.modelId, onChatChange, user],
  );

  const modelOptions = useMemo(
    () =>
      (chat.models || []).map((m) => ({
        value: m.id,
        label: `${m.label}${m.configured ? '' : ' (not configured)'}`,
        disabled: !m.configured,
      })),
    [chat.models],
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {modelOptions.length ? (
        <View style={styles.modelWrap}>
          <Select
            value={chat.modelId}
            options={modelOptions}
            title="Model"
            placeholder="Choose a model…"
            onChange={(id) => onChatChange((prev) => ({ ...prev, modelId: id }))}
          />
        </View>
      ) : null}

      <ScrollView
        ref={logRef}
        style={styles.flex}
        contentContainerStyle={styles.chatLog}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => logRef.current && logRef.current.scrollToEnd({ animated: true })}
      >
        {!chat.messages.length ? (
          <View style={styles.intro}>
            <Sparkle size={30} color={colors.accent} weight="regular" />
            <Text style={styles.introTitle}>Ask about your students</Text>
            <Text style={styles.introSub}>Questions are answered from the school database.</Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => send(q)}
                  style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                >
                  <Text style={styles.suggestionText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          chat.messages.map((m, index) => {
            const key = `${m.role}-${index}`;
            if (m.role === 'user') {
              return (
                <View key={key} style={styles.userRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{m.content}</Text>
                  </View>
                </View>
              );
            }
            if (m.pending) {
              return (
                <View key={key} style={styles.assistantRow}>
                  <View style={styles.assistantBubble}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                </View>
              );
            }
            return (
              <View key={key} style={styles.assistantRow}>
                <View style={styles.assistantBubble}>
                  {/* The reply is Markdown — tables of students, headed lists — so it is
                      rendered as such rather than dumped as text. */}
                  <Markdown source={m.content} />
                </View>
                {m.model ? <Text style={styles.modelTag}>{m.model}</Text> : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Ask a question"
          placeholderTextColor={colors.neutral[600]}
          value={input}
          onChangeText={setInput}
          editable={!chat.busy}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={chat.busy || !input.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            (chat.busy || !input.trim()) && styles.sendDisabled,
            pressed && styles.pressed,
          ]}
        >
          <PaperPlaneTilt size={18} color={colors.accent} weight="regular" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── search ────────────────────────────────────────────────────────── */

/** Search hits arrive with <mark> highlights; there is no markup here, so they are stripped. */
function stripMarks(value) {
  return String(value == null ? '' : value).replace(/<\/?mark>/g, '');
}

function SearchPanel({ user, onOpenStudentCode, styles, colors }) {
  const [term, setTerm] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const seqRef = useRef(0);

  const run = useCallback(
    async (text) => {
      const query = String(text || '').trim();
      if (!query) {
        setResult(null);
        setError('');
        setLoading(false);
        return;
      }
      const seq = ++seqRef.current;
      setLoading(true);
      setError('');
      try {
        const res = await schoolApi.search({
          query,
          requesterRole: user && user.role,
          actorName: (user && user.display_name) || '',
          actorEmail: (user && user.auth_email) || '',
        });
        // A slower earlier query must not overwrite a newer one's results.
        if (seq !== seqRef.current) return;
        setResult({ query, res });
        setLoading(false);
      } catch (err) {
        if (seq !== seqRef.current) return;
        setError(
          err.status === 403
            ? 'Search is only available to administrators and teaching staff.'
            : err.message,
        );
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    const handle = setTimeout(() => run(term), 300);
    return () => clearTimeout(handle);
  }, [term, run]);

  // The Postgres fallback returns a group even when it matched nothing, so empty groups
  // are dropped here rather than rendered as a heading with no rows under it.
  const groups = result ? (result.res.groups || []).filter((g) => (g.hits || []).length > 0) : [];

  return (
    <View style={styles.flex}>
      <View style={styles.searchWrap}>
        <MagnifyingGlass size={18} color={colors.neutral[500]} weight="regular" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students, staff and records"
          placeholderTextColor={colors.neutral[600]}
          value={term}
          onChangeText={setTerm}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => run(term)}
        />
        {term ? (
          <Pressable onPress={() => setTerm('')} hitSlop={10}>
            <X size={16} color={colors.neutral[500]} weight="regular" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.searchResults}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <StateBlock kind="error" message={error} onRetry={() => run(term)} />
        ) : loading ? (
          <StateBlock kind="loading" message="Searching…" />
        ) : !result ? null : !groups.length ? (
          <>
            <StateBlock message={`Nothing matches “${result.query}”.`} />
            {result.res.notice ? <Text style={styles.notice}>{result.res.notice}</Text> : null}
          </>
        ) : (
          <>
            {groups.map((group) => (
              <View key={group.index}>
                <SectionLabel>{`${humanise(group.index)} · ${group.total}`}</SectionLabel>
                <Card style={styles.listCard}>
                  {group.hits.map((hit, index) => {
                    const isStudent = hit.kind === 'student';
                    const title = stripMarks(hit.title) || '—';
                    return (
                      <Pressable
                        key={hit.id || index}
                        disabled={!isStudent}
                        onPress={() => onOpenStudentCode(hit.id)}
                        style={({ pressed }) => [
                          styles.hitRow,
                          index !== group.hits.length - 1 && styles.hitDivider,
                          pressed && isStudent && styles.pressed,
                        ]}
                      >
                        <View style={styles.hitAvatar}>
                          <Text style={styles.hitAvatarText}>{initialsOf(title) || '?'}</Text>
                        </View>
                        <View style={styles.hitBody}>
                          <Text style={styles.hitTitle} numberOfLines={1}>
                            {title}
                          </Text>
                          <Text style={styles.hitSub} numberOfLines={1}>
                            {stripMarks(hit.subtitle)}
                          </Text>
                        </View>
                        {isStudent ? (
                          <CaretRight size={18} color={colors.neutral[500]} weight="regular" />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            ))}
            {result.res.notice ? <Text style={styles.notice}>{result.res.notice}</Text> : null}
          </>
        )}
      </ScrollView>
    </View>
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
    header: {
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.lg,
    },
    title: {
      ...type(colors).heading(22),
    },
    segmented: {
      flexDirection: 'row',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      backgroundColor: colors.surface,
      padding: 3,
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
    },
    segmentActive: {
      backgroundColor: colors.accentRamp[900],
    },
    segmentLabel: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.neutral[500],
      marginLeft: spacing.xs,
    },
    segmentLabelActive: {
      color: colors.accentRamp[200],
    },
    modelWrap: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.lg,
    },
    chatLog: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xl,
    },
    intro: {
      alignItems: 'center',
      paddingTop: spacing.xxl * 2,
    },
    introTitle: {
      fontFamily: fonts.medium,
      fontSize: 16,
      color: colors.text,
      marginTop: spacing.lg,
    },
    introSub: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.neutral[500],
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    suggestions: {
      alignSelf: 'stretch',
      marginTop: spacing.xxl,
    },
    suggestion: {
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    suggestionText: {
      fontFamily: fonts.regular,
      fontSize: 13.5,
      color: colors.neutral[300],
    },
    pressed: {
      opacity: 0.65,
    },
    userRow: {
      alignItems: 'flex-end',
      marginTop: spacing.lg,
    },
    userBubble: {
      maxWidth: '86%',
      backgroundColor: colors.accentRamp[900],
      borderWidth: 1,
      borderColor: colors.accentRamp[800],
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    userText: {
      fontFamily: fonts.regular,
      fontSize: 14.5,
      lineHeight: 21,
      color: colors.text,
    },
    assistantRow: {
      alignItems: 'flex-start',
      marginTop: spacing.lg,
    },
    assistantBubble: {
      maxWidth: '100%',
      alignSelf: 'stretch',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    modelTag: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: colors.neutral[600],
      marginTop: spacing.xs,
      marginLeft: spacing.xs,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[900],
    },
    composerInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      fontFamily: fonts.regular,
      fontSize: 14.5,
      color: colors.text,
    },
    sendButton: {
      width: 44,
      height: 44,
      marginLeft: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: {
      opacity: 0.4,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      marginHorizontal: spacing.xxl,
    },
    searchInput: {
      flex: 1,
      marginLeft: spacing.sm,
      marginRight: spacing.sm,
      paddingVertical: 0,
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.text,
    },
    searchResults: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl,
    },
    listCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    hitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    hitDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[800],
    },
    hitAvatar: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: colors.accentRamp[800],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
    },
    hitAvatarText: {
      fontFamily: fonts.semibold,
      fontSize: 14,
      color: colors.accentRamp[100],
    },
    hitBody: {
      flex: 1,
      marginRight: spacing.md,
    },
    hitTitle: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: colors.text,
      marginBottom: 2,
    },
    hitSub: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.neutral[500],
    },
    notice: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 18,
      color: colors.neutral[600],
      marginTop: spacing.lg,
    },
  });
