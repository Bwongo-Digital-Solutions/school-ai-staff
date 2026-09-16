import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { CalendarBlank } from 'phosphor-react-native';
import Select from './Select';
import { useTheme, radius, spacing, fonts } from '../theme';
import { useT } from '../i18n';
import { formatDate, monthNames, weekdayInitials, todayIso } from '../format';
import { parseIso, toIso, monthGrid, yearRange } from '../date-core.js';

/**
 * Picking a date, rather than typing one.
 *
 * What this replaces is a plain text box with `placeholder="YYYY-MM-DD"`. On a phone that is the
 * worst version of the problem: the whole date is keyed by hand on a numeric keypad, the format is
 * a suggestion rather than a rule, and nothing refuses `2011-13-45` or a year typed one digit
 * short. The field it matters most for is a date of birth taken at registration, which is the
 * value every report card that child ever receives is printed against.
 *
 * Built out of the app's own pieces — a Pressable, a Modal and the existing Select — for the
 * reason Select itself gives: a picker library is not worth a dependency here. It is also worth
 * more than that. A native date picker is a native module, so it would not reach a single phone
 * until every one of them had a rebuilt APK installed; this ships in an ordinary JavaScript
 * update, like the rest of the app.
 *
 * Month and year are dropdowns rather than arrows. A date of birth is fifteen years back, and
 * stepping a month at a time is what makes people give up and type.
 *
 * The value crossing this boundary is an ISO `YYYY-MM-DD` string in both directions, which is what
 * the forms already hold and what the server is sent.
 */

/** A hundred years back covers a grandparent; ten forward covers a return date. */
const YEARS_BACK = 100;
const YEARS_FORWARD = 10;

export default function DateField({
  label,
  value,
  onChange,
  placeholder,
  editable = true,
  /** ISO bounds. A day outside them cannot be tapped, and the year list stops there. */
  minIso,
  maxIso,
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parseIso(value), [value]);
  const min = useMemo(() => parseIso(minIso), [minIso]);
  const max = useMemo(() => parseIso(maxIso), [maxIso]);
  const todayParts = useMemo(() => parseIso(todayIso()), []);

  /* Which month the grid is showing. Seeded from the selected date so reopening a filled field
     lands where the reader left it, and from today when there is nothing set yet. */
  const [view, setView] = useState(() => selected || todayParts);

  const months = monthNames();
  const weekdays = weekdayInitials();

  /* Bounded by min/max when a caller gave them, and always widened to include the year already
     selected — a record holding a date outside the range must still show its own year rather than
     quietly displaying a different one. */
  const years = useMemo(
    () =>
      yearRange({
        today: todayParts.year,
        back: YEARS_BACK,
        forward: YEARS_FORWARD,
        min: min && min.year,
        max: max && max.year,
        selected: selected && selected.year,
      }).map((year) => ({ value: year, label: String(year) })),
    [min, max, selected, todayParts],
  );

  const outOfRange = (iso) => (minIso && iso < minIso) || (maxIso && iso > maxIso);

  const commit = (iso) => {
    setOpen(false);
    onChange(iso);
  };

  /* Whole weeks, with the leading blanks that keep the 1st under its own weekday — without them a
     month starting on Thursday reads as starting on Monday, and every date in it is wrong. */
  const cells = useMemo(() => monthGrid(view.year, view.month), [view]);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={() => {
          if (!editable) return;
          // Reopening always starts from what is in the field now, not from where the reader
          // happened to browse to last time and then cancelled.
          setView(selected || todayParts);
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.control,
          !editable && styles.controlDisabled,
          pressed && editable && styles.pressed,
        ]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? formatDate(value) : placeholder || t('date.choose')}
        </Text>
        <CalendarBlank size={16} color={colors.neutral[500]} weight="regular" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.dim} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label || t('date.choose')}</Text>

            <View style={styles.selects}>
              <Select
                style={styles.select}
                title={t('date.month')}
                value={view.month}
                onChange={(month) => setView({ ...view, month })}
                options={months.map((name, index) => ({ value: index + 1, label: name }))}
              />
              <Select
                style={styles.select}
                title={t('date.year')}
                value={view.year}
                onChange={(year) => setView({ ...view, year })}
                options={years}
              />
            </View>

            <View style={styles.weekRow}>
              {weekdays.map((day, index) => (
                <Text key={index} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, index) => {
                if (day === null) return <View key={`blank-${index}`} style={styles.cell} />;
                const iso = toIso(view.year, view.month, day);
                const isSelected = value === iso;
                const isToday = todayIso() === iso;
                const disabled = outOfRange(iso);
                return (
                  <Pressable
                    key={iso}
                    disabled={disabled}
                    onPress={() => commit(iso)}
                    style={({ pressed }) => [
                      styles.cell,
                      isSelected && styles.cellSelected,
                      // A ring rather than a fill, so today is never mistaken for the chosen day.
                      isToday && !isSelected && styles.cellToday,
                      pressed && !disabled && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.day,
                        isSelected && styles.daySelected,
                        disabled && styles.dayDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.foot}>
              <Pressable
                disabled={outOfRange(todayIso())}
                onPress={() => commit(todayIso())}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <Text
                  style={[styles.actionLabel, outOfRange(todayIso()) && styles.dayDisabled]}
                >
                  {t('date.today')}
                </Text>
              </Pressable>
              {/* Offered only when there is something to clear, so the row does not invite a
                  reader to empty a field they have not filled. */}
              {selected ? (
                <Pressable
                  onPress={() => commit('')}
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                >
                  <Text style={styles.actionLabel}>{t('date.clear')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      width: '100%',
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 12.5,
      color: colors.neutral[400],
      marginBottom: spacing.sm,
    },
    control: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      backgroundColor: colors.bg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    controlDisabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.65,
    },
    value: {
      flex: 1,
      marginRight: spacing.md,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
    },
    placeholder: {
      color: colors.neutral[600],
    },
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    dim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scrim,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderColor: colors.neutral[800],
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxl * 1.5,
    },
    sheetTitle: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.neutral[500],
      marginBottom: spacing.md,
    },
    selects: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    select: {
      flex: 1,
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    weekday: {
      // Every cell is a seventh of the row, header and day alike, so the columns line up.
      width: `${100 / 7}%`,
      textAlign: 'center',
      fontFamily: fonts.medium,
      fontSize: 11.5,
      color: colors.neutral[500],
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    cellSelected: {
      backgroundColor: colors.accent,
    },
    cellToday: {
      borderWidth: 1,
      borderColor: colors.accent,
    },
    day: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
    },
    daySelected: {
      fontFamily: fonts.medium,
      color: colors.bg,
    },
    dayDisabled: {
      color: colors.neutral[700],
    },
    foot: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[900],
    },
    action: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    actionLabel: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.accent,
    },
  });
