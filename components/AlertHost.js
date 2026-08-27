/* Draws whatever alerts.js raises: the tick, the cross, the words, and — on a failure —
   the button that has to be pressed before the app moves on.

   Mounted once, above every screen, so an action can report itself from wherever it was
   started without the screen holding any of this state. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Modal, Animated, Easing, StyleSheet } from 'react-native';
import { CheckCircle, WarningCircle, XCircle } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { subscribeToAlerts, dismissAlert } from '../alerts';
import Button from './Button';

const TONES = {
  success: { Icon: CheckCircle, colour: 'green', fallbackTitle: 'Done' },
  warning: { Icon: WarningCircle, colour: 'amber', fallbackTitle: 'Nothing to do' },
  error: { Icon: XCircle, colour: 'red', fallbackTitle: 'Failed' },
};

export default function AlertHost() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [alert, setAlert] = useState(null);
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => subscribeToAlerts(setAlert), []);

  /* A small settle on the way in. Successes are gone in well under two seconds, so the
     entrance has to be quick enough not to eat the time the words are readable. */
  useEffect(() => {
    if (!alert) {
      scale.setValue(0.9);
      return;
    }
    Animated.timing(scale, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  }, [alert, scale]);

  if (!alert) return null;

  const tone = TONES[alert.tone] || TONES.success;
  const { Icon } = tone;
  const accent = colors.status[tone.colour];
  const wash = colors.status[`${tone.colour}Bg`];

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      /* Android's back button closes an acknowledgeable alert, and is ignored while a
         failure is waiting to be read. */
      onRequestClose={() => {
        if (!alert.wait) dismissAlert();
      }}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.badge, { backgroundColor: wash }]}>
            <Icon size={44} color={accent} weight="fill" />
          </View>

          <Text style={styles.title}>{alert.title || tone.fallbackTitle}</Text>
          {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}

          {/* Only a failure is worth a button. A success is already on its way out, and a
              button there would invite a tap that lands on the screen behind it. */}
          {alert.wait ? (
            <Button label="OK" variant="primary" onPress={dismissAlert} style={styles.button} />
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      backgroundColor: colors.scrim,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.lg,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xl,
    },
    badge: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      ...type(colors).heading(19),
      textAlign: 'center',
    },
    message: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.neutral[500],
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    button: {
      alignSelf: 'stretch',
      marginTop: spacing.xl,
    },
  });
