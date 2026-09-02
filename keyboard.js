/* How much of the screen the keyboard is currently taking.

   Android normally handles this for you: the activity is declared adjustResize, so the window
   shrinks when the keyboard opens and a ScrollView takes up the slack. That does not reach a
   Modal. A React Native Modal is its own dialog window on Android, and the activity's resize
   setting has no bearing on it — which is why the server settings sheet sat behind the
   keyboard while the sign-in screen behind it coped fine.

   KeyboardAvoidingView cannot rescue that either: it works from the window it is inside, and
   that window never resizes. So the height is measured directly here and applied as spacing.

   `keyboardDidShow` and `keyboardDidHide` are the pair to use — the `Will` variants exist only
   on iOS and never fire on Android, which is the platform this ships to. */

import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * The keyboard's height in points, or 0 when it is closed.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      const measured = event && event.endCoordinates ? event.endCoordinates.height : 0;
      setHeight(measured || 0);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));

    /* Both subscriptions go on unmount. The sheet is closed while its input still holds focus
       often enough that leaving one attached would mean setting state on a gone component. */
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return height;
}

export default { useKeyboardHeight };
