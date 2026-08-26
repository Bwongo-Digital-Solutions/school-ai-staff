import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { GraduationCap, IdentificationBadge, WifiSlash } from 'phosphor-react-native';
import { colors, radius, spacing, fonts, type } from '../theme';
import Button from '../components/Button';
import PinDots from '../components/PinDots';
import { staff } from '../data/mock';

export default function LoginScreen({ onLogin }) {
  const [staffId, setStaffId] = useState(staff.staffId);
  const [pin, setPin] = useState(staff.pin);
  const [error, setError] = useState('');

  const handleSignIn = () => {
    if (staffId.trim() === staff.staffId && pin === staff.pin) {
      setError('');
      onLogin();
    } else {
      setError('Staff ID or PIN incorrect. Try again.');
    }
  };

  const handleScanBadge = () => {
    setError('');
    onLogin();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.badge}>
          <GraduationCap size={32} color={colors.accentRamp[300]} weight="regular" />
        </View>

        <Text style={styles.heading}>Staff sign in</Text>
        <Text style={styles.subtext}>{staff.school}</Text>

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Staff ID</Text>
          <TextInput
            value={staffId}
            onChangeText={setStaffId}
            style={styles.input}
            placeholder="e.g. OKL-0248"
            placeholderTextColor={colors.neutral[600]}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>PIN</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            style={styles.input}
            placeholder="4-digit PIN"
            placeholderTextColor={colors.neutral[600]}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={4}
          />

          <View style={styles.pinDotsWrap}>
            <PinDots />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Sign in"
            variant="primary"
            onPress={handleSignIn}
            style={styles.signInButton}
          />

          <Button
            label="Scan my staff badge"
            icon={IdentificationBadge}
            variant="ghost"
            onPress={handleScanBadge}
            style={styles.scanButton}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <WifiSlash size={16} color={colors.neutral[500]} weight="regular" />
        <Text style={styles.footerText}>
          Offline · last synced {staff.lastSynced}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl * 3,
    alignItems: 'stretch',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.accentRamp[800],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  heading: {
    ...type.heading(24),
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtext: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.xxl * 1.5,
  },
  form: {
    width: '100%',
  },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.neutral[400],
    marginBottom: spacing.sm,
  },
  fieldLabelSpaced: {
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
  },
  pinDotsWrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#e0899a',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  signInButton: {
    marginTop: spacing.xxl,
  },
  scanButton: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: spacing.sm,
  },
});
