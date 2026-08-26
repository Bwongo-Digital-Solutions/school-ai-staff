import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { api, schoolApi, ApiError } from '../api';
import Button from './Button';

export default function SettingsSheet({ visible, onClose, onSaved }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [value, setValue] = useState('');
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState('neutral');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(api.base());
      setStatus('');
      setStatusTone('neutral');
      setChecking(false);
    }
  }, [visible]);

  const handleSave = async () => {
    const entered = value.trim();
    if (!entered) {
      setStatusTone('error');
      setStatus('Enter the server address.');
      return;
    }
    const saved = await api.setBase(entered);
    setChecking(true);
    setStatusTone('neutral');
    setStatus(`Checking ${saved} …`);
    try {
      const health = await schoolApi.health();
      setStatusTone('ok');
      setStatus(`Connected · ${(health && health.students) || 0} students`);
      setChecking(false);
      onSaved(saved);
    } catch (err) {
      setChecking(false);
      setStatusTone('error');
      setStatus(err instanceof ApiError ? err.message : 'Could not reach that address.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dim} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <Text style={styles.title}>Server settings</Text>
            <Text style={styles.caption}>
              The address of your school-ai-search server, including the protocol.
            </Text>

            <TextInput
              value={value}
              onChangeText={setValue}
              style={styles.input}
              placeholder="http://192.168.1.10:8787"
              placeholderTextColor={colors.neutral[600]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!checking}
            />

            {status ? (
              <Text
                style={[
                  styles.status,
                  statusTone === 'error' && styles.statusError,
                  statusTone === 'ok' && styles.statusOk,
                ]}
              >
                {status}
              </Text>
            ) : null}

            <Button
              label={checking ? 'Checking…' : 'Save and verify'}
              variant="primary"
              onPress={handleSave}
              loading={checking}
              style={styles.save}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={onClose}
              disabled={checking}
              style={styles.cancel}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    dim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scrim,
    },
    sheetWrap: {
      width: '100%',
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
    title: {
      ...type(colors).heading(18),
      marginBottom: spacing.xs,
    },
    caption: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.neutral[500],
      marginBottom: spacing.xl,
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
      backgroundColor: colors.bg,
    },
    status: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.neutral[400],
      marginTop: spacing.lg,
    },
    statusError: {
      color: colors.status.red,
    },
    statusOk: {
      color: colors.status.green,
    },
    save: {
      marginTop: spacing.xl,
    },
    cancel: {
      marginTop: spacing.sm,
    },
  });
