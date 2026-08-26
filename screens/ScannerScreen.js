import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import {
  ArrowLeft,
  QrCode,
  Keyboard,
  Lightning,
  WifiSlash,
} from 'phosphor-react-native';
import { colors, radius, spacing, fonts, type } from '../theme';
import Button from '../components/Button';

const SCAN_DURATION = 800;
const FRAME_SIZE = 240;

export default function ScannerScreen({ onBack, onScanComplete }) {
  const [mode, setMode] = useState('qr');
  const [manualId, setManualId] = useState('');
  const [scanning, setScanning] = useState(false);
  const sweepAnim = useRef(new Animated.Value(0)).current;

  const runScan = () => {
    if (scanning) return;
    setScanning(true);
    sweepAnim.setValue(0);
    Animated.timing(sweepAnim, {
      toValue: 1,
      duration: SCAN_DURATION,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      setScanning(false);
      onScanComplete();
    });
  };

  const sweepTranslate = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 4],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text} weight="regular" />
        </Pressable>
        <Text style={styles.headerTitle}>Scan student</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.segmented}>
          <SegmentButton
            label="QR code"
            icon={QrCode}
            active={mode === 'qr'}
            onPress={() => setMode('qr')}
          />
          <SegmentButton
            label="Manual ID"
            icon={Keyboard}
            active={mode === 'manual'}
            onPress={() => setMode('manual')}
          />
        </View>

        {mode === 'qr' ? (
          <>
            <Pressable
              onPress={runScan}
              style={styles.viewfinderWrap}
              disabled={scanning}
            >
              <View style={styles.viewfinder}>
                <View style={styles.faintIcon}>
                  <QrCode size={96} color={colors.neutral[700]} weight="regular" />
                </View>
                <Corner style={styles.cornerTL} />
                <Corner style={styles.cornerTR} />
                <Corner style={styles.cornerBL} />
                <Corner style={styles.cornerBR} />
                {scanning && (
                  <Animated.View
                    style={[
                      styles.sweepLine,
                      { transform: [{ translateY: sweepTranslate }] },
                    ]}
                  />
                )}
              </View>
            </Pressable>
            <Text style={styles.caption}>
              Point at the QR on the student's ID card
            </Text>
          </>
        ) : (
          <View style={styles.manualForm}>
            <TextInput
              style={styles.input}
              placeholder="Student ID, e.g. KPS-2024-0512"
              placeholderTextColor={colors.neutral[600]}
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Button
              label={scanning ? 'Looking up…' : 'Look up'}
              variant="primary"
              onPress={runScan}
              disabled={scanning}
              style={styles.lookupButton}
            />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label="Torch"
          icon={Lightning}
          variant="secondary"
          onPress={() => {}}
          style={styles.torchButton}
        />
        <View style={styles.offlineRow}>
          <WifiSlash size={14} color={colors.neutral[500]} weight="regular" />
          <Text style={styles.offlineText}>
            Offline — will sync when connected
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SegmentButton({ label, icon: Icon, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, active && styles.segmentActive]}
    >
      <Icon
        size={16}
        color={active ? colors.accentRamp[200] : colors.neutral[500]}
        weight="regular"
      />
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Corner({ style }) {
  return <View style={[styles.cornerBase, style]} />;
}

const BRACKET = 28;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...type.heading(18),
    flex: 1,
    textAlign: 'center',
    marginRight: 22,
  },
  headerSpacer: {
    width: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
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
  viewfinderWrap: {
    marginTop: spacing.xl,
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
  faintIcon: {
    opacity: 0.35,
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
  sweepLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: colors.accent,
    top: 0,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  manualForm: {
    width: '100%',
    marginTop: spacing.xl,
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
  lookupButton: {},
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  torchButton: {
    marginBottom: spacing.lg,
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: spacing.sm,
  },
});
