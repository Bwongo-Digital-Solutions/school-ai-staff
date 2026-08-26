import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme, radius, spacing, fonts } from '../theme';

/* The assistant answers in Markdown — tables of students, headed lists — so a plain-text
   render would be unreadable. This is the same deliberately small subset the web app
   renders: fenced code, tables, headings, bullet and numbered lists, paragraphs, and
   inline code / bold / italic / links.

   The web version escapes to HTML and hands the result to the browser. Here there is no
   HTML at all: the source is parsed into blocks and each block becomes real views, so a
   reply cannot inject markup by construction rather than by escaping. */

/* Inline spans, matched in one pass so precedence falls out of the ordering rather than
   from chained replaces: code, then bold, then italic, then links (rendered as their
   label, exactly as the web app does). */
const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;

function inlineParts(text) {
  const source = String(text == null ? '' : text);
  const parts = [];
  let last = 0;
  let match = null;

  INLINE.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = INLINE.exec(source)) !== null) {
    if (match.index > last) parts.push({ kind: 'text', text: source.slice(last, match.index) });
    if (match[1] != null) parts.push({ kind: 'code', text: match[1] });
    else if (match[2] != null) parts.push({ kind: 'strong', text: match[2] });
    else if (match[3] != null) parts.push({ kind: 'em', text: match[3] });
    else parts.push({ kind: 'text', text: match[4] });
    last = match.index + match[0].length;
  }
  if (last < source.length) parts.push({ kind: 'text', text: source.slice(last) });
  return parts;
}

function Inline({ text, style, styles }) {
  const parts = useMemo(() => inlineParts(text), [text]);
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        const key = `${part.kind}-${index}`;
        if (part.kind === 'code') {
          return (
            <Text key={key} style={styles.inlineCode}>
              {part.text}
            </Text>
          );
        }
        if (part.kind === 'strong') {
          return (
            <Text key={key} style={styles.strong}>
              {part.text}
            </Text>
          );
        }
        if (part.kind === 'em') {
          return (
            <Text key={key} style={styles.em}>
              {part.text}
            </Text>
          );
        }
        return <Text key={key}>{part.text}</Text>;
      })}
    </Text>
  );
}

const cells = (row) =>
  row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

/** Source in, an array of block descriptors out. Mirrors the web renderer's loop. */
export function parseMarkdown(src) {
  const lines = String(src == null ? '' : src).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  let list = null;

  const closeList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      closeList();
      const body = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }

    // A table is a header row, a dashed separator, then body rows.
    if (line.includes('|') && /^\s*\|?[\s:-]*-[\s:|-]*\|/.test(lines[i + 1] || '')) {
      closeList();
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(cells(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', head, rows });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || numbered) {
      const wanted = bullet ? 'ul' : 'ol';
      if (!list || list.ordered !== (wanted === 'ol')) {
        closeList();
        list = { type: 'list', ordered: wanted === 'ol', items: [] };
      }
      list.items.push((bullet || numbered)[1]);
      i += 1;
      continue;
    }

    if (!line.trim()) {
      closeList();
      i += 1;
      continue;
    }

    closeList();
    blocks.push({ type: 'paragraph', text: line });
    i += 1;
  }

  closeList();
  return blocks;
}

const HEADING_SIZE = { 1: 18, 2: 16.5, 3: 15.5, 4: 14.5 };

export default function Markdown({ source, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const blocks = useMemo(() => parseMarkdown(source), [source]);

  return (
    <View style={style}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === 'heading') {
          return (
            <Inline
              key={key}
              text={block.text}
              styles={styles}
              style={[
                styles.heading,
                { fontSize: HEADING_SIZE[block.level] || 14.5 },
                index === 0 && styles.firstBlock,
              ]}
            />
          );
        }

        if (block.type === 'code') {
          return (
            <ScrollView
              key={key}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.codeBlock, index === 0 && styles.firstBlock]}
              contentContainerStyle={styles.codeBlockInner}
            >
              <Text style={styles.codeText}>{block.text}</Text>
            </ScrollView>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={key} style={[styles.list, index === 0 && styles.firstBlock]}>
              {block.items.map((item, itemIndex) => (
                <View key={`${key}-${itemIndex}`} style={styles.listItem}>
                  <Text style={styles.bullet}>
                    {block.ordered ? `${itemIndex + 1}.` : '•'}
                  </Text>
                  <Inline text={item} styles={styles} style={styles.listText} />
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'table') {
          /* A table of students is wider than a phone, so it scrolls sideways inside its
             own frame rather than squeezing the columns to nothing. */
          return (
            <ScrollView
              key={key}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.tableWrap, index === 0 && styles.firstBlock]}
            >
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeadRow]}>
                  {block.head.map((cell, cellIndex) => (
                    <Inline
                      key={`h-${cellIndex}`}
                      text={cell}
                      styles={styles}
                      style={[styles.tableCell, styles.tableHeadCell]}
                    />
                  ))}
                </View>
                {block.rows.map((row, rowIndex) => (
                  <View
                    key={`r-${rowIndex}`}
                    style={[styles.tableRow, rowIndex === block.rows.length - 1 && styles.tableLastRow]}
                  >
                    {row.map((cell, cellIndex) => (
                      <Inline
                        key={`c-${cellIndex}`}
                        text={cell}
                        styles={styles}
                        style={styles.tableCell}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }

        return (
          <Inline
            key={key}
            text={block.text}
            styles={styles}
            style={[styles.paragraph, index === 0 && styles.firstBlock]}
          />
        );
      })}
    </View>
  );
}

const CELL_WIDTH = 132;

const createStyles = (colors) =>
  StyleSheet.create({
    firstBlock: {
      marginTop: 0,
    },
    paragraph: {
      fontFamily: fonts.regular,
      fontSize: 14.5,
      lineHeight: 21,
      color: colors.text,
      marginTop: spacing.md,
    },
    heading: {
      fontFamily: fonts.semibold,
      color: colors.text,
      lineHeight: 24,
      marginTop: spacing.xl,
      marginBottom: 2,
    },
    strong: {
      fontFamily: fonts.semibold,
    },
    em: {
      fontStyle: 'italic',
    },
    inlineCode: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.accentRamp[300],
    },
    codeBlock: {
      marginTop: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.neutral[800],
    },
    codeBlockInner: {
      padding: spacing.lg,
    },
    codeText: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[300],
    },
    list: {
      marginTop: spacing.md,
    },
    listItem: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    bullet: {
      fontFamily: fonts.regular,
      fontSize: 14.5,
      lineHeight: 21,
      color: colors.neutral[500],
      width: 22,
    },
    listText: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 14.5,
      lineHeight: 21,
      color: colors.text,
    },
    tableWrap: {
      marginTop: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.sm,
    },
    table: {
      minWidth: '100%',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[900],
    },
    tableLastRow: {
      borderBottomWidth: 0,
    },
    tableHeadRow: {
      backgroundColor: colors.surface2,
      borderBottomColor: colors.neutral[800],
    },
    tableCell: {
      width: CELL_WIDTH,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    tableHeadCell: {
      fontFamily: fonts.semibold,
      color: colors.neutral[300],
    },
  });
