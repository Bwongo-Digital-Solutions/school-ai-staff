import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

/**
 * The outermost view of a screen.
 *
 * This replaces sixteen copies of `<SafeAreaView style={styles.safe}>`, and the reason is worth
 * writing down rather than filing under tidying: **`SafeAreaView` from react-native is iOS-only.**
 * On Android it renders as a plain `View` and contributes no inset whatsoever. So every screen in
 * this app looked like it was handling the system bars and none of it was, which is how the header
 * ended up sitting inside the status bar — see `screenTopInset` in theme.js for what was actually
 * happening, and App.js's `root` for where the inset is applied now.
 *
 * It is still a `SafeAreaView`, because on iOS that is the right answer and a notch is not a fixed
 * height. It just is not the thing keeping Android clear of anything, and naming it here means the
 * next person does not have to find that out the way this was found out.
 *
 * A drop-in for what it replaces: same props, same `style`, and the caller's style still wins.
 */
export default function Screen({ style, children, ...rest }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={[styles.screen, style]} {...rest}>
      {children}
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
  });
