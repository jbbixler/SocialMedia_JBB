/** Trigger device vibration via the Web Vibration API (Android Chrome; no-op on iOS). */
export function haptic(pattern: number | number[] = 40) {
  try { navigator.vibrate?.(pattern) } catch {}
}
