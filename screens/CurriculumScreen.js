/**
 * The competency-based curriculum guide, on the phone.
 *
 * ## The text is not in this file
 *
 * It comes from the server — `server/curriculum/uganda-cbc.mjs` in school-ai-search — and the web
 * app renders the same payload. Two copies of guidance about a national curriculum would
 * eventually disagree, and the disagreement would be invisible from either side.
 *
 * ## Why it renders a block vocabulary rather than markup
 *
 * The server sends a closed set — paragraph, list, definition list, note, table — and never HTML.
 * React Native has no HTML renderer, so markup would have needed a parser and a dependency here;
 * and a server that could send markup into a client would be a stored-XSS hole on the web side
 * for anyone who later gains write access to the content. One fixed vocabulary solves both.
 *
 * `**bold**` is the only inline markup, split on rather than parsed, so it cannot express anything
 * else.
 *
 * ## The table is the hard part on a phone
 *
 * Three columns of prose do not fit 360 points, and a horizontally scrolling table is a thing
 * people miss. So a table is drawn as a stack of records — one block per row, each cell labelled
 * with its column heading — which is how the same data reads without a second axis. The heading
 * row is kept for the reader who wants to know what the columns were.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Linking, Pressable } from 'react-native';
import { ArrowSquareOut, BookOpen } from 'phosphor-react-native';

import { useTheme, radius, spacing, fonts } from '../theme';
import { schoolApi, ApiError } from '../api';
import { formatDate } from '../format';
import { useT } from '../i18n';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import SectionLabel from '../components/SectionLabel';
import StateBlock from '../components/StateBlock';

/* `**bold**` without a parser: the odd segments are the emphasised ones. Nested Text keeps the
   surrounding paragraph's line-height, which a separate element would not. */
const inline = (text, styles) =>
  String(text).split('**').map((part, index) =>
    index % 2 === 1
      ? <Text key={index} style={styles.strong}>{part}</Text>
      : <Text key={index}>{part}</Text>,
  );

function Block({ block, styles, colors }) {
  switch (block.kind) {
    case 'p':
      return <Text style={styles.para}>{inline(block.text, styles)}</Text>;

    case 'ul':
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{inline(item, styles)}</Text>
            </View>
          ))}
        </View>
      );

    case 'dl':
      return (
        <View style={styles.defs}>
          {block.items.map((item, index) => (
            <View key={item.term} style={[styles.def, index === 0 && styles.defFirst]}>
              <Text style={styles.term}>{item.term}</Text>
              <Text style={styles.detail}>{inline(item.detail, styles)}</Text>
            </View>
          ))}
        </View>
      );

    case 'note':
      return (
        <View
          style={[
            styles.note,
            {
              borderLeftColor: block.tone === 'warning' ? colors.status.amber : colors.accent,
              backgroundColor: block.tone === 'warning' ? colors.status.amberBg : colors.surface2,
            },
          ]}
        >
          <Text style={styles.noteText}>{inline(block.text, styles)}</Text>
        </View>
      );

    /* Stacked records, not a grid — see the note at the top of this file.
       A two-column table needs no per-cell label: the caption above already names the one value
       column, so repeating it on every record is noise. Three or more columns do need them, which
       is the whole reason the records carry labels at all. */
    case 'table': {
      const labelCells = block.head.length > 2;
      return (
        <View style={styles.table}>
          <Text style={styles.tableCaption}>{block.head.join(' · ')}</Text>
          {block.rows.map((row) => (
            <View key={row[0]} style={styles.record}>
              <Text style={styles.recordTitle}>{row[0]}</Text>
              {row.slice(1).map((cell, index) => (
                <View key={index} style={styles.recordLine}>
                  {labelCells ? <Text style={styles.recordLabel}>{block.head[index + 1]}</Text> : null}
                  <Text style={styles.recordValue}>{inline(cell, styles)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    default:
      // A kind this build does not know about. Skipped rather than drawn as JSON: the server can
      // gain one before every phone has been updated, and a gap reads better than an object.
      return null;
  }
}

function SourceLink({ source, styles, colors }) {
  return (
    <Pressable
      style={styles.sourceRow}
      onPress={() => Linking.openURL(source.url).catch(() => {})}
      accessibilityRole="link"
    >
      <View style={styles.sourceBody}>
        <Text style={styles.sourceTitle}>{source.title}</Text>
        <Text style={styles.sourcePublisher}>{source.publisher}</Text>
      </View>
      <ArrowSquareOut size={16} color={colors.neutral[500]} weight="regular" />
    </Pressable>
  );
}

export default function CurriculumScreen({ onBack }) {
  const { colors } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setGuide(await schoolApi.curriculumGuide());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('curriculum.failed'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const [official, reporting] = useMemo(() => {
    const all = (guide && guide.sources) || [];
    return [all.filter((s) => s.official), all.filter((s) => !s.official)];
  }, [guide]);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title={t('curriculum.title')} onBack={onBack} />
        <StateBlock kind="loading" message={t('curriculum.loading')} />
      </Screen>
    );
  }

  if (error || !guide) {
    return (
      <Screen>
        <ScreenHeader title={t('curriculum.title')} onBack={onBack} />
        <StateBlock kind="error" message={error || t('curriculum.failed')} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={t('curriculum.title')} onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.neutral[400]} />
        }
      >
        <View style={styles.lead}>
          <BookOpen size={26} color={colors.accent} weight="regular" />
          <Text style={styles.leadText}>{t('curriculum.subtitle')}</Text>
        </View>

        {/* A school on another country's scheme is told before it reads a word of the rest. */}
        {!guide.appliesToThisSchool && (
          <View
            style={[
              styles.note,
              styles.topNote,
              { borderLeftColor: colors.status.amber, backgroundColor: colors.status.amberBg },
            ]}
          >
            <Text style={styles.noteText}>{t('curriculum.otherCountry')}</Text>
          </View>
        )}

        <Text style={styles.revised}>
          {`${t('curriculum.revised', { date: formatDate(guide.revised) })} · ${t('curriculum.notASubstitute')}`}
        </Text>

        {guide.sections.map((section) => (
          <React.Fragment key={section.id}>
            <SectionLabel>{section.title}</SectionLabel>
            <Card style={styles.sectionCard}>
              <Text style={styles.summary}>{section.summary}</Text>
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} styles={styles} colors={colors} />
              ))}
              {section.sources.length > 0 && (
                <Text style={styles.cites}>
                  {`${t('curriculum.basedOn')} ${section.sources.map((s) => s.publisher).join(' · ')}`}
                </Text>
              )}
            </Card>
          </React.Fragment>
        ))}

        <SectionLabel>{t('curriculum.sources')}</SectionLabel>
        <Card style={styles.sectionCard}>
          <Text style={styles.summary}>{t('curriculum.sourcesNote')}</Text>

          <Text style={styles.sourceGroup}>{t('curriculum.officialSources')}</Text>
          {official.map((source) => (
            <SourceLink key={source.key} source={source} styles={styles} colors={colors} />
          ))}

          {reporting.length > 0 && (
            <>
              <Text style={styles.sourceGroup}>{t('curriculum.reportingSources')}</Text>
              {reporting.map((source) => (
                <SourceLink key={source.key} source={source} styles={styles} colors={colors} />
              ))}
            </>
          )}
        </Card>
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
    lead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.lg,
      marginBottom: spacing.md,
    },
    leadText: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.text,
    },
    revised: {
      fontFamily: fonts.regular,
      fontSize: 11.5,
      lineHeight: 17,
      color: colors.neutral[500],
      marginBottom: spacing.sm,
    },
    sectionCard: {
      padding: spacing.lg,
    },
    summary: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 17,
      color: colors.neutral[500],
      marginBottom: spacing.lg,
    },
    para: {
      fontFamily: fonts.regular,
      fontSize: 13.5,
      lineHeight: 21,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    strong: {
      fontFamily: fonts.semibold,
    },
    list: {
      marginBottom: spacing.lg,
    },
    bulletRow: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    bullet: {
      fontFamily: fonts.regular,
      fontSize: 13.5,
      lineHeight: 21,
      color: colors.neutral[500],
      width: 16,
    },
    bulletText: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 13.5,
      lineHeight: 21,
      color: colors.text,
    },
    defs: {
      marginBottom: spacing.lg,
    },
    def: {
      paddingTop: spacing.md,
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[900],
    },
    defFirst: {
      paddingTop: 0,
      marginTop: 0,
      borderTopWidth: 0,
    },
    term: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      color: colors.text,
      marginBottom: 2,
    },
    detail: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 20,
      color: colors.neutral[500],
    },
    note: {
      borderLeftWidth: 3,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.lg,
    },
    topNote: {
      marginTop: spacing.sm,
    },
    noteText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 20,
      color: colors.text,
    },
    table: {
      marginBottom: spacing.lg,
    },
    tableCaption: {
      fontFamily: fonts.medium,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.neutral[500],
      marginBottom: spacing.md,
    },
    record: {
      backgroundColor: colors.surface2,
      borderRadius: radius.sm,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    recordTitle: {
      fontFamily: fonts.semibold,
      fontSize: 14,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    recordLine: {
      marginTop: spacing.sm,
    },
    recordLabel: {
      fontFamily: fonts.regular,
      fontSize: 11,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: colors.neutral[500],
      marginBottom: 1,
    },
    recordValue: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 20,
      color: colors.text,
    },
    cites: {
      fontFamily: fonts.regular,
      fontSize: 11.5,
      lineHeight: 17,
      color: colors.neutral[500],
      paddingTop: spacing.md,
      marginTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[900],
    },
    sourceGroup: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.neutral[500],
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[900],
    },
    sourceBody: {
      flex: 1,
    },
    sourceTitle: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.accent,
    },
    sourcePublisher: {
      fontFamily: fonts.regular,
      fontSize: 11.5,
      color: colors.neutral[500],
      marginTop: 1,
    },
  });
