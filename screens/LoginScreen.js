import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { GraduationCap, Cloud } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { schoolApi, ApiError } from '../api';
import Button from '../components/Button';
import { school } from '../data/mock';

export default function LoginScreen({ apiBase, onSignedIn, onOpenSettings }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const user = await schoolApi.signIn(email.trim(), password);
      if (!user) throw new ApiError('Sign in failed.', 0);
      onSignedIn(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
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
        <Text style={styles.subtext}>{school.name}</Text>

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="you@school.ac.ug"
            placeholderTextColor={colors.neutral[600]}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor={colors.neutral[600]}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            autoCorrect={false}
            editable={!busy}
            onSubmitEditing={handleSignIn}
            returnKeyType="go"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={busy ? 'Signing in…' : 'Sign in'}
            variant="primary"
            onPress={handleSignIn}
            loading={busy}
            style={styles.signInButton}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Server settings"
          icon={Cloud}
          variant="ghost"
          onPress={onOpenSettings}
        />
        <Text style={styles.footerText} numberOfLines={1}>
          {apiBase || 'No server configured'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
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
      ...type(colors).heading(24),
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
    error: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.status.red,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    signInButton: {
      marginTop: spacing.xxl,
    },
    footer: {
      alignItems: 'center',
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.xxl,
    },
    footerText: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.neutral[600],
      marginTop: spacing.xs,
    },
  });
