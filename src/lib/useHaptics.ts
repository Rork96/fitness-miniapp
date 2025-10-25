'use client';

type HapticType = 'light' | 'medium' | 'heavy';

const vibrateFallback = (duration: number) => {
  try {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(duration);
    }
  } catch {
    // ignore vibration errors
  }
};

type TelegramHapticAPI = {
  impactOccurred?: (type: HapticType) => void;
};

const getTelegramHaptics = (): TelegramHapticAPI | undefined => {
  const maybeGlobal = globalThis as {
    Telegram?: {
      WebApp?: {
        HapticFeedback?: TelegramHapticAPI;
      };
    };
  };
  return maybeGlobal.Telegram?.WebApp?.HapticFeedback;
};

const impact = (type: HapticType) => {
  const hapticApi = getTelegramHaptics();
  try {
    if (hapticApi?.impactOccurred) {
      hapticApi.impactOccurred(type);
      return;
    }
  } catch {
    // ignore telegram errors
  }

  if (type === 'heavy') {
    vibrateFallback(30);
  } else if (type === 'medium') {
    vibrateFallback(20);
  } else {
    vibrateFallback(10);
  }
};

export function useHaptics() {
  return {
    tapLight: () => impact('light'),
    tapMedium: () => impact('medium'),
    impactHeavy: () => impact('heavy'),
  };
}
