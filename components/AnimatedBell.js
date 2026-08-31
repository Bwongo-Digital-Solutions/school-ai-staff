/* The header's message bell. It rings — a short burst of swings, repeated every few
   seconds — for as long as anything is unread, so a message that arrived while the phone
   was in a pocket is still announcing itself when the screen is next looked at.

   The audible half of the same alert lives in notify.js. */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { Bell } from 'phosphor-react-native';
import { useTheme, fonts } from '../theme';

/* Long enough that the bell is not in constant motion, short enough that a glance at the
   screen within a few seconds catches it. */
const RING_EVERY_MS = 4000;
const SWINGS = 3;

export default function AnimatedBell({ unread = 0, label = 'Messages', onPress, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const swing = useRef(new Animated.Value(0)).current;
  const ringing = unread > 0;

  useEffect(() => {
    if (!ringing) {
      swing.setValue(0);
      return undefined;
    }

    const leg = (toValue, duration) =>
      Animated.timing(swing, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });

    /* One burst: over to one side, then back and forth a few times with the throw
       decaying, then settle upright — a struck bell rather than a metronome. */
    const burst = () => {
      const legs = [leg(1, 90)];
      for (let i = 1; i <= SWINGS; i += 1) {
        const throwLeft = -1 + i / (SWINGS + 1);
        const throwRight = 1 - i / (SWINGS + 1);
        legs.push(leg(throwLeft, 110), leg(throwRight, 110));
      }
      legs.push(leg(0, 90));
      return Animated.sequence(legs);
    };

    let animation = burst();
    animation.start();
    const timer = setInterval(() => {
      animation = burst();
      animation.start();
    }, RING_EVERY_MS);

    return () => {
      clearInterval(timer);
      animation.stop();
      swing.setValue(0);
    };
  }, [ringing, swing]);

  const rotate = swing.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-14deg', '14deg'],
  });

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `${label}, ${unread}` : label}
    >
      {/* The badge sits outside the animated view so the count stays upright and legible
          while the bell swings under it. */}
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Bell
          size={20}
          color={unread > 0 ? colors.accent : colors.neutral[400]}
          weight={unread > 0 ? 'fill' : 'regular'}
        />
      </Animated.View>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: fonts.semibold,
      fontSize: 9.5,
      lineHeight: 16,
      color: colors.bg,
    },
  });
