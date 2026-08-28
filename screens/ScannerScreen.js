import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, Keyboard, CameraSlash, Flashlight } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { schoolApi, ApiError, parseStudentCode } from '../api';
import { designationOf } from '../roles';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';

const FRAME_SIZE = 240;
const BRACKET = 28;
const INSET = 12;                                  // matches the corner bracket inset
const SWEEP_TRAVEL = FRAME_SIZE - INSET * 2 - 3;   // bar height is 3

const TITLES = {
  card: 'Scan student',
  gate: 'Scan at the gate',
  rollcall: 'Scan for the register',
};

const HINTS = {
  gate: 'The scan opens a confirmation — nothing is recorded until you accept it.',
  rollcall: 'The scanned student is pinned above the register.',
};

/* One scanner, three destinations. A scan begun from the gate belongs to the action the
   officer chose, and one begun from the register belongs to the register — not to the
   student's card. The lookup itself is the same either way: it confirms the student exists
   before navigating, so a bad scan reports itself here rather than opening an empty card. */
export default function ScannerScreen({
  user,
  intent = 'card',
  onCardScanned,
  onGateScanned,
  onRollCallScanned,
  onBack,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState('qr');
  const [manualId, setManualId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState(false);
  /* Where the found code sits in the frame, when the camera tells us. */
  const [lockRect, setLockRect] = useState(null);
  const [flash, setFlash] = useState(false);

  /* A single QR stays in frame for many frames, so the first hit latches the scanner
     until the lookup settles. */
  const lockRef = useRef(false);

  const sweep = useRef(new Animated.Value(0)).current;

  const lookup = useCallback(
    async (number, scanned) => {
      if (!number) {
        setError('Enter a student ID.');
        lockRef.current = false;
        return;
      }
      setError('');
      setNotice(`Looking up ${number}…`);
      setBusy(true);
      try {
        const card = await schoolApi.studentCard(
          number,
          user && user.role,
          designationOf(user),
        );
        setNotice(scanned ? `Scanned ${number}` : '');

        if (intent === 'gate') onGateScanned(card);
        else if (intent === 'rollcall') onRollCallScanned(card);
        else onCardScanned(card.student.student_id);
      } catch (err) {
        setNotice('');
        setError(
          err.status === 404
            ? `No student found with ID “${number}”.`
            : err instanceof ApiError
              ? err.message
              : 'Lookup failed.',
        );
      } finally {
        setBusy(false);
        setLockRect(null);
        lockRef.current = false;
      }
    },
    [user, intent, onCardScanned, onGateScanned, onRollCallScanned],
  );

  const handleBarcode = useCallback(
    (result) => {
      if (lockRef.current) return;
      lockRef.current = true;

      /* expo-camera's geometry is not dependable — on Android it is frequently absent
         or reported in a different space than the preview. Take it only when it lands
         inside the frame; otherwise flash the whole viewfinder instead. Either way the
         lookup below is identical, so a device that reports nothing still scans. */
      const rect = frameRect(result);
      if (rect) setLockRect(rect);
      setFlash(true);
      setTimeout(() => setFlash(false), 320);
      Vibration.vibrate(40);

      lookup(parseStudentCode((result && result.data) || ''), true);
    },
    [lookup],
  );

  const selectMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
    setLockRect(null);
    lockRef.current = false;
  };

  const granted = permission && permission.granted;
  const hint = HINTS[intent];
  const hunting = granted && mode === 'qr' && !busy && !lockRect;

  /* The sweep runs only while the camera is actually hunting — it stops once a code is
     found or a lookup is in flight, so motion always means "still looking". */
  useEffect(() => {
    if (!hunting) {
      sweep.stopAnimation();
      sweep.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hunting, sweep]);

  // Leaving the screen with the torch lit would strand it on.
  useEffect(() => () => setTorch(false), []);

  return (
    <SafeAreaView style={styles.safe}>
      {onBack ? (
        <ScreenHeader title={TITLES[intent] || TITLES.card} onBack={onBack} />
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{TITLES[intent] || TITLES.card}</Text>
        </View>
      )}

      <View style={styles.content}>
        {hint ? <Text style={styles.intentHint}>{hint}</Text> : null}

        <View style={styles.segmented}>
          <SegmentButton
            label="QR code"
            icon={QrCode}
            active={mode === 'qr'}
            onPress={() => selectMode('qr')}
            styles={styles}
            colors={colors}
          />
          <SegmentButton
            label="Manual ID"
            icon={Keyboard}
            active={mode === 'manual'}
            onPress={() => selectMode('manual')}
            styles={styles}
            colors={colors}
          />
        </View>

        {mode === 'qr' ? (
          <>
            <View style={styles.viewfinder}>
              {granted ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={torch}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={busy ? undefined : handleBarcode}
                />
              ) : (
                <View style={styles.placeholder}>
                  <CameraSlash size={72} color={colors.neutral[700]} weight="regular" />
                </View>
              )}
              {hunting ? (
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: sweep.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, SWEEP_TRAVEL],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ) : null}
              <Corner style={styles.cornerTL} styles={styles} />
              <Corner style={styles.cornerTR} styles={styles} />
              <Corner style={styles.cornerBL} styles={styles} />
              <Corner style={styles.cornerBR} styles={styles} />
              {lockRect ? <View style={[styles.lockBox, lockRect]} /> : null}
              {flash ? <View style={styles.hitFlash} /> : null}
              {granted ? (
                <Pressable
                  style={[styles.torchBtn, torch && styles.torchBtnOn]}
                  onPress={() => setTorch((on) => !on)}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle the torch"
                  accessibilityState={{ selected: torch }}
                  hitSlop={8}
                >
                  <Flashlight
                    size={20}
                    color={torch ? '#fff' : colors.neutral[800]}
                    weight={torch ? 'fill' : 'regular'}
                  />
                </Pressable>
              ) : null}
              {busy ? (
                <View style={styles.busyOverlay}>
                  <ActivityIndicator color={colors.accentRamp[200]} />
                </View>
              ) : null}
            </View>

            {!permission ? (
              <Text style={styles.caption}>Preparing the camera…</Text>
            ) : granted ? (
              <Text style={styles.caption}>Point at the QR on the student&apos;s ID card</Text>
            ) : permission.canAskAgain ? (
              <>
                <Text style={styles.caption}>
                  The camera is needed to read student ID cards.
                </Text>
                <Button
                  label="Allow camera"
                  variant="primary"
                  onPress={requestPermission}
                  style={styles.permissionButton}
                />
              </>
            ) : (
              <Text style={styles.caption}>
                Camera access is blocked. Enable it in your device settings, or use Manual
                ID below.
              </Text>
            )}
          </>
        ) : (
          <View style={styles.manualForm}>
            <TextInput
              style={styles.input}
              placeholder="Student ID, e.g. STU-2026-011"
              placeholderTextColor={colors.neutral[600]}
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              onSubmitEditing={() => lookup(parseStudentCode(manualId), false)}
              returnKeyType="search"
            />
            <Button
              label={busy ? 'Looking up…' : 'Look up'}
              variant="primary"
              onPress={() => lookup(parseStudentCode(manualId), false)}
              loading={busy}
            />
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!error && notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      {mode === 'qr' ? (
        <View style={styles.footer}>
          <Button
            label="Enter ID manually"
            icon={Keyboard}
            variant="secondary"
            onPress={() => selectMode('manual')}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function SegmentButton({ label, icon: Icon, active, onPress, styles, colors }) {
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

/* Reduce whatever geometry expo-camera gave us to a rect in preview coordinates, or
   null when it is unusable. Accepts cornerPoints first (more precise) then bounds, and
   rejects anything that does not sit inside the frame — Android sometimes reports image
   coordinates, which would otherwise paint a box far outside the viewfinder. */
function frameRect(result) {
  if (!result) return null;
  let left;
  let top;
  let width;
  let height;

  const pts = result.cornerPoints;
  if (Array.isArray(pts) && pts.length >= 2 && pts.every((pt) => pt && isFinite(pt.x) && isFinite(pt.y))) {
    const xs = pts.map((pt) => pt.x);
    const ys = pts.map((pt) => pt.y);
    left = Math.min(...xs);
    top = Math.min(...ys);
    width = Math.max(...xs) - left;
    height = Math.max(...ys) - top;
  } else if (result.bounds && result.bounds.origin && result.bounds.size) {
    const { origin, size } = result.bounds;
    left = origin.x;
    top = origin.y;
    width = size.width;
    height = size.height;
  } else {
    return null;
  }

  if (![left, top, width, height].every((n) => isFinite(n))) return null;
  if (width <= 0 || height <= 0) return null;
  // Must land inside the preview, with a little slack for a code at the very edge.
  const slack = 24;
  if (left < -slack || top < -slack) return null;
  if (left + width > FRAME_SIZE + slack || top + height > FRAME_SIZE + slack) return null;

  const pad = 8;
  return {
    left: left - pad,
    top: top - pad,
    width: width + pad * 2,
    height: height + pad * 2,
  };
}

function Corner({ style, styles }) {
  return <View style={[styles.cornerBase, style]} />;
}

const createStyles = (colors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    headerTitle: {
      ...type(colors).heading(18),
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.xxl,
      alignItems: 'center',
    },
    intentHint: {
      fontFamily: fonts.regular,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.neutral[500],
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    segmented: {
      flexDirection: 'row',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.neutral[800],
      backgroundColor: colors.surface,
      padding: 3,
      width: '100%',
      marginBottom: spacing.xxl,
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
    viewfinder: {
      width: FRAME_SIZE,
      height: FRAME_SIZE,
      backgroundColor: colors.neutral[900],
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    placeholder: {
      opacity: 0.35,
    },
    busyOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.scrim,
    },
    scanLine: {
      position: 'absolute',
      left: INSET,
      right: INSET,
      top: INSET,
      height: 3,
      borderRadius: 3,
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: 0.9,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    lockBox: {
      position: 'absolute',
      borderWidth: 3,
      borderRadius: 10,
      borderColor: colors.status.green,
      shadowColor: colors.status.green,
      shadowOpacity: 0.8,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 6,
    },
    hitFlash: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(111, 191, 154, 0.28)',
    },
    /* Centred between the two top brackets; a corner-pinned control sits on one. */
    torchBtn: {
      position: 'absolute',
      top: 10,
      left: (FRAME_SIZE - 38) / 2,
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    torchBtnOn: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    cornerBase: {
      position: 'absolute',
      width: BRACKET,
      height: BRACKET,
      borderColor: colors.accent,
    },
    cornerTL: {
      top: 12,
      left: 12,
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderTopLeftRadius: radius.sm,
    },
    cornerTR: {
      top: 12,
      right: 12,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderTopRightRadius: radius.sm,
    },
    cornerBL: {
      bottom: 12,
      left: 12,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderBottomLeftRadius: radius.sm,
    },
    cornerBR: {
      bottom: 12,
      right: 12,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderBottomRightRadius: radius.sm,
    },
    caption: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.neutral[500],
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    permissionButton: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
    manualForm: {
      width: '100%',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.neutral[800],
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
      marginBottom: spacing.lg,
    },
    error: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.status.red,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    notice: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.neutral[500],
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    footer: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xl,
      paddingTop: spacing.lg,
    },
  });
