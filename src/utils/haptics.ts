export type VibrationPattern = number | number[];
export type VibrationHandler = (pattern: VibrationPattern) => boolean;

export function triggerHapticFeedback(
  pattern: VibrationPattern = 12,
  vibrate: VibrationHandler | undefined = typeof navigator !== 'undefined' && 'vibrate' in navigator
    ? navigator.vibrate.bind(navigator)
    : undefined,
): boolean {
  return vibrate?.(pattern) ?? false;
}
