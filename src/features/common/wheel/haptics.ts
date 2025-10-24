"use client";

let lastTick = 0;

export function hapticTick() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastTick < 35) return;
  lastTick = now;
  try {
    window?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");
  } catch {
    // noop
  }
  try {
    navigator?.vibrate?.(5);
  } catch {
    // noop
  }
}
