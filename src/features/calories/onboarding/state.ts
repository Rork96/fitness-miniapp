import { useCallback, useEffect, useReducer } from "react";
import { activityFactors, MAX_STEP, STORAGE_KEY } from "./constants";
import { calculatePlan } from "./calculations";
import type { PlanResult } from "./calculations";

export type Units = "metric" | "imperial";
export type Gender = "male" | "female" | "other";
export type Goal = "lose" | "maintain" | "gain";
export type Diet = "classic" | "pescatarian" | "vegetarian" | "vegan";
export type Obstacle = "consistency" | "habits" | "busy" | "inspiration";
export type WorkoutsBucket = "0-2" | "3-5" | "6+";
export type Locale = "uk" | "en";

export type BirthDate = { day: number; month: number; year: number };

export type OnboardingState = {
  step: number;
  locale: Locale;
  gender: Gender | null;
  birth: BirthDate;
  units: Units;
  heightCm: number;
  weightKg: number;
  goal: Goal | null;
  desiredWeightKg: number;
  speedKgWeek: number;
  activity: WorkoutsBucket | null;
  diet: Diet | null;
  barriers: Obstacle[];
  allowRollover: boolean;
  addBurnedBack: boolean;
  macrosOverride: Partial<Record<"calories" | "protein_g" | "fat_g" | "carbs_g", number>>;
  lastPlan: PlanResult | null;
};

export type OnboardingAction =
  | { type: "setStep"; step: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "setLocale"; locale: Locale }
  | { type: "setGender"; gender: Gender }
  | { type: "setBirth"; birth: BirthDate }
  | { type: "setUnits"; units: Units }
  | { type: "setHeightCm"; heightCm: number }
  | { type: "setWeightKg"; weightKg: number }
  | { type: "setGoal"; goal: Goal }
  | { type: "setDesiredWeightKg"; desiredWeightKg: number }
  | { type: "setSpeedKgWeek"; speedKgWeek: number }
  | { type: "setActivity"; activity: WorkoutsBucket }
  | { type: "toggleBarrier"; barrier: Obstacle }
  | { type: "setDiet"; diet: Diet }
  | { type: "setAllowRollover"; value: boolean }
  | { type: "setAddBurnedBack"; value: boolean }
  | { type: "setMacrosOverride"; payload: OnboardingState["macrosOverride"] }
  | { type: "setPlan"; plan: PlanResult }
  | { type: "hydrate"; payload: OnboardingState };

export const defaultState: OnboardingState = {
  step: 1,
  locale: "uk",
  gender: null,
  birth: { day: 1, month: 1, year: 1995 },
  units: "metric",
  heightCm: 170,
  weightKg: 68,
  goal: null,
  desiredWeightKg: 65,
  speedKgWeek: 0.5,
  activity: null,
  diet: null,
  barriers: [],
  allowRollover: true,
  addBurnedBack: true,
  macrosOverride: {},
  lastPlan: null,
};

function reduce(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.payload };
    case "setStep":
      return { ...state, step: clamp(action.step, 1, MAX_STEP) };
    case "next":
      return { ...state, step: clamp(state.step + 1, 1, MAX_STEP) };
    case "prev":
      return { ...state, step: clamp(state.step - 1, 1, MAX_STEP) };
    case "setLocale":
      return { ...state, locale: action.locale };
    case "setGender":
      return { ...state, gender: action.gender };
    case "setBirth":
      return { ...state, birth: action.birth };
    case "setUnits":
      return { ...state, units: action.units };
    case "setHeightCm":
      return { ...state, heightCm: action.heightCm };
    case "setWeightKg":
      return { ...state, weightKg: action.weightKg };
    case "setGoal":
      return { ...state, goal: action.goal };
    case "setDesiredWeightKg":
      return { ...state, desiredWeightKg: action.desiredWeightKg };
    case "setSpeedKgWeek":
      return { ...state, speedKgWeek: action.speedKgWeek };
    case "setActivity":
      return { ...state, activity: action.activity };
    case "toggleBarrier":
      return state.barriers.includes(action.barrier)
        ? { ...state, barriers: state.barriers.filter((item) => item !== action.barrier) }
        : { ...state, barriers: [...state.barriers, action.barrier] };
    case "setDiet":
      return { ...state, diet: action.diet };
    case "setAllowRollover":
      return { ...state, allowRollover: action.value };
    case "setAddBurnedBack":
      return { ...state, addBurnedBack: action.value };
    case "setMacrosOverride":
      return { ...state, macrosOverride: { ...state.macrosOverride, ...action.payload } };
    case "setPlan":
      return { ...state, lastPlan: action.plan };
    default:
      return state;
  }
}

export function useOnboardingMachine() {
  const [state, dispatch] = useReducer(reduce, defaultState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as OnboardingState;
      dispatch({ type: "hydrate", payload: { ...defaultState, ...parsed } });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const next = useCallback(() => dispatch({ type: "next" }), []);
  const prev = useCallback(() => dispatch({ type: "prev" }), []);
  const go = useCallback((step: number) => dispatch({ type: "setStep", step }), []);

  const computePlan = useCallback(() => {
    if (!state.gender || !state.goal || !state.activity) return null;
    const plan = calculatePlan({
      gender: state.gender,
      age: calcAge(state.birth),
      heightCm: state.heightCm,
      weightKg: state.weightKg,
      desiredWeightKg: state.desiredWeightKg,
      goal: state.goal,
      speedKgWeek: state.speedKgWeek,
      activity: state.activity,
      allowRollover: state.allowRollover,
      addExerciseBack: state.addBurnedBack,
      overrides: state.macrosOverride,
    });
    dispatch({ type: "setPlan", plan });
    return plan;
  }, [state]);

  const activityFactor = state.activity ? activityFactors[state.activity] : activityFactors["0-2"];

  return {
    state,
    dispatch,
    next,
    prev,
    go,
    computePlan,
    activityFactor,
  };
}

export function calcAge(birth: BirthDate): number {
  const { day, month, year } = birth;
  const birthDate = new Date(year, month - 1, day);
  if (Number.isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDifference = today.getMonth() - (month - 1);
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
