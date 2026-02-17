/**
 * Lightweight haptic feedback utility.
 * Uses the Vibration API (works on Android + some PWA contexts).
 * Falls back silently on unsupported devices.
 */

export const haptics = {
  /** Light tap — task complete, toggle, like */
  light: () => {
    try { navigator?.vibrate?.(10); } catch {}
  },
  /** Medium tap — send message, confirm action */
  medium: () => {
    try { navigator?.vibrate?.(25); } catch {}
  },
  /** Heavy tap — error, destructive action */
  heavy: () => {
    try { navigator?.vibrate?.(50); } catch {}
  },
  /** Success pattern — double pulse */
  success: () => {
    try { navigator?.vibrate?.([15, 50, 15]); } catch {}
  },
};
