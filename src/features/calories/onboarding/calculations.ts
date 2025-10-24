import { activityFactors, macroBounds, speedRange } from "./constants";
import type { Gender, Goal, WorkoutsBucket } from "./state";

export type PlanInput = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  desiredWeightKg: number;
  goal: Goal;
  speedKgWeek: number;
  activity: WorkoutsBucket;
  allowRollover: boolean;
  addExerciseBack: boolean;
  overrides?: Partial<Record<"calories" | "protein_g" | "fat_g" | "carbs_g", number>>;
};

export type PlanResult = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  deltaPerDay: number;
  weeksToGoal: number;
  targetDateISO: string;
  metabolicAge: number;
  allowRollover: boolean;
  addExerciseBack: boolean;
};

export function calculatePlan(input: PlanInput): PlanResult {
  const {
    gender,
    age,
    heightCm,
    weightKg,
    desiredWeightKg,
    goal,
    speedKgWeek,
    activity,
    allowRollover,
    addExerciseBack,
    overrides = {},
  } = input;

  const clampedSpeed = clamp(speedKgWeek, speedRange.min, speedRange.max);

  const bmr = calculateBmr(gender, weightKg, heightCm, age);
  const tdee = calculateTdee(bmr, activity);

  const diffKg = desiredWeightKg - weightKg;
  const weeklyEnergy = clampedSpeed * 7700;
  const dailyAdjustment = goal === "maintain" ? 0 : clampAdjustment(goal, weeklyEnergy / 7);

  let targetCalories = clamp(tdee + (goal === "lose" ? -dailyAdjustment : goal === "gain" ? dailyAdjustment : 0), macroBounds.calories.min, macroBounds.calories.max);
  if (overrides.calories) {
    targetCalories = clamp(overrides.calories, macroBounds.calories.min, macroBounds.calories.max);
  }

  const baseProtein = goal === "lose" ? macroBounds.protein.lose : goal === "gain" ? macroBounds.protein.gain : macroBounds.protein.maintain;
  let protein_g = Math.round((overrides.protein_g ?? baseProtein * weightKg) * 10) / 10;
  let fat_g = Math.round((overrides.fat_g ?? Math.max(macroBounds.fat.min, macroBounds.fat.base) * weightKg) * 10) / 10;
  let carbs_g = overrides.carbs_g ?? Math.max(0, (targetCalories - protein_g * 4 - fat_g * 9) / 4);
  carbs_g = Math.round(carbs_g * 10) / 10;

  const weeksToGoal = diffKg === 0 ? 0 : Math.max(0, Math.ceil(Math.abs(diffKg) / clampedSpeed));
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);

  const metabolicAge = estimateMetabolicAge({ age, bmr, weightKg });

  return {
    bmr,
    tdee,
    targetCalories: Math.round(targetCalories),
    protein_g,
    fat_g,
    carbs_g,
    deltaPerDay: Math.round(goal === "maintain" ? 0 : goal === "lose" ? -dailyAdjustment : dailyAdjustment),
    weeksToGoal,
    targetDateISO: targetDate.toISOString(),
    metabolicAge,
    allowRollover,
    addExerciseBack,
  };
}

export function calculateBmr(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const offset = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  return Math.round(base + offset);
}

export function calculateTdee(bmr: number, bucket: WorkoutsBucket): number {
  const factor = activityFactors[bucket];
  return Math.round(bmr * factor);
}

export function estimateMetabolicAge({ age, bmr, weightKg }: { age: number; bmr: number; weightKg: number }): number {
  const baseline = 370 + 21.6 * weightKg;
  const delta = bmr - baseline;
  const noise = Math.sin(weightKg) * 2;
  const adjustment = delta / 50 + noise;
  return Math.round(clamp(age - adjustment, 18, 75));
}

function clampAdjustment(goal: Goal, value: number): number {
  if (goal === "lose") {
    return clamp(value, macroBounds.deficit.min, macroBounds.deficit.max);
  }
  if (goal === "gain") {
    return clamp(value, macroBounds.surplus.min, macroBounds.surplus.max);
  }
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
