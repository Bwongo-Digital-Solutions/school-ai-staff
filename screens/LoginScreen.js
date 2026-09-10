import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { GraduationCap, Cloud } from 'phosphor-react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { useBranding } from '../branding';
import { APP_FOOTER } from '../version';
import { alertSuccess, alertError } from '../alerts';
import { schoolApi, ApiError } from '../api';
import Button from '../components/Button';

export default function LoginScreen({ apiBase, onSignedIn, onOpenSettings }) {
  const { colors } = useTheme();
  const { name: schoolName, tagline, logo, isDefaultLogo } = useBranding();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* The second half of a sign-in, for a school that has switched on two-factor. Holding the
     challenge rather than the password is the point: the password has done its job by the time this
     is set, and keeping it in component state through another round trip is a habit worth not
     having. */
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');

  const finish = (user) => {
    if (!user) throw new ApiError('Sign in failed.', 0);
    alertSuccess('Signed in', user.display_name || '');
    onSignedIn(user);
  };

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const result = await schoolApi.signIn(email.trim(), password);

      if (result && result.mfaRequired) {
        setChallenge(result.challenge || '');
        setPassword('');
        setCode('');
        return;
      }

      finish(result && result.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed.');
      alertError('Sign in failed', err instanceof ApiError ? err : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    if (code.trim().length < 6) {
      setError('Type the six digits from your authenticator app.');
      return;
    }
    setBusy(true);
    try {
      finish(await schoolApi.verifyCode(challenge, code.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed.');
      alertError('Sign in failed', err instanceof ApiError ? err : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  /* There is no way back to the password field except starting over. A code step that can be
     dismissed is a code step that can be skipped. */
  const startOver = () => {
    setChallenge('');
    setCode('');
    setError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      /* 'height' rather than nothing on Android: an undefined behaviour makes this component
         a plain View that does not avoid anything. The activity is declared adjustResize, so
         this is the belt to that window's braces — it keeps the focused field in view rather
         than leaving it to how far the scroll happens to be. */
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* The school's own logo where one has been uploaded; the generic mark until then. */}
        <View style={styles.badge}>
          {isDefaultLogo ? (
            <GraduationCap size={32} color={colors.accentRamp[300]} weight="regular" />
          ) : (
            <Image source={logo} style={styles.badgeLogo} resizeMode="contain" />
          )}
        </View>

        <Text style={styles.heading}>{challenge ? 'One more step' : 'Staff sign in'}</Text>
        <Text style={styles.subtext}>
          {challenge
            ? 'Open your authenticator app and type the six digits'
            : (tagline ? `${schoolName} · ${tagline}` : schoolName)}
        </Text>

        {challenge ? (
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>Code from your authenticator app</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={colors.neutral[600]}
              /* A numeric pad rather than a full keyboard, and one-time-code so the phone offers
                 the digits it has just shown in a notification. */
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
              editable={!busy}
              onSubmitEditing={handleVerify}
              returnKeyType="go"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={busy ? 'Checking…' : 'Sign in'}
              variant="primary"
              onPress={handleVerify}
              loading={busy}
              style={styles.signInButton}
            />
            <Button label="Start again" variant="ghost" onPress={startOver} disabled={busy} />

            <Text style={styles.mfaNote}>
              Lost the phone with your authenticator on it? An administrator at your school can clear
              it from your account, and you can enrol a new one.
            </Text>
          </View>
        ) : (
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
        )}
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
        <Text style={styles.poweredBy}>{APP_FOOTER}</Text>
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
      overflow: 'hidden',
    },
    badgeLogo: {
      width: 48,
      height: 48,
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
    mfaNote: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 18,
      color: colors.neutral[600],
      marginTop: spacing.xl,
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
    poweredBy: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: colors.neutral[700],
      marginTop: spacing.sm,
    },
  });
