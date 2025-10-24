export const STORAGE_KEY = "cal.onboarding.v1";
export const PROFILE_STORAGE_KEY = "cal.profile.v1";

export const MAX_STEP = 14;

export const heightMetricRange = { min: 140, max: 220 };
export const weightMetricRange = { min: 40, max: 200 };
export const weightImperialRange = { min: 90, max: 440 };

export const speedThresholds = {
  slow: 0.4,
  recommendedMin: 0.5,
  recommendedMax: 1.0,
  aggressive: 1.1,
};

export const activityFactors: Record<"0-2" | "3-5" | "6+", number> = {
  "0-2": 1.375,
  "3-5": 1.55,
  "6+": 1.725,
};

export const macroBounds = {
  protein: { lose: 2.2, gain: 2.0, maintain: 2.0 },
  fat: { min: 0.6, base: 0.8 },
  calories: { min: 1200, max: 3900 },
  deficit: { min: 300, max: 1100 },
  surplus: { min: 200, max: 800 },
};

export const speedRange = { min: 0.1, max: 1.5, step: 0.1 };
