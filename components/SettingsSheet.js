import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme, radius, spacing, fonts, type } from '../theme';
import { api, schoolApi, ApiError } from '../api';
import Button from './Button';
import { alertSuccess, alertError } from '../alerts';
import { probeServer, explainProbe, summariseProbe } from '../probe';
import { useKeyboardHeight } from '../keyboard';

export default function SettingsSheet({ visible, onClose, onSaved }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  /* This sheet is inside a Modal, which on Android is its own window and does not resize
     when the keyboard opens however the activity is declared. The height is measured and
     applied here instead, because nothing else is going to do it. */
  const keyboardHeight = useKeyboardHeight();

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
      alertSuccess('Server connected', `${(health && health.students) || 0} students`);
      setChecking(false);
      onSaved(saved);
    } catch (err) {
      /* fetch cannot say why it failed — whatwg-fetch flattens every transport error into one
         sentence — so the same question is asked again through XMLHttpRequest, which keeps
         the phone's own words. This is the screen where somebody is asking exactly that, and
         a second request costs nothing next to a connection that is already broken. */
      const probe = await probeServer(saved);
      setChecking(false);
      setStatusTone('error');
      const fallback = err instanceof ApiError ? err.message : 'Could not reach that address.';
      /* The screen gets the phone's exact words, which is what a server administrator needs.
         The dialog gets one sentence, because it cannot scroll. */
      setStatus(explainProbe(probe) || fallback);
      alertError('Cannot reach that server', summariseProbe(probe) || fallback);
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
        {/* Lifted clear of the keyboard, so the address stays visible while it is typed. */}
        <View style={[styles.sheetWrap, { paddingBottom: keyboardHeight }]}>
          <View style={styles.sheet}>
            {/* Scrollable because the sheet can outgrow what is left above a keyboard: a
                refused certificate reports the phone's own words, which run to a paragraph. */}
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
            </ScrollView>
          </View>
        </View>
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
      /* Capped so the scroll below has somewhere to scroll to. Without a ceiling the sheet
         simply grows past the top of the screen and takes the buttons with it. */
      maxHeight: '85%',
    },
    sheetScroll: {
      flexGrow: 0,
    },
    sheetContent: {
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
