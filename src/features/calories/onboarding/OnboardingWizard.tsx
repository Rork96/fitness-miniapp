"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  Check,
  Dumbbell,
  ExternalLink,
  Flame,
  Globe,
  Pencil,
  ShieldCheck,
  Sparkles,
  Target,
  Wheat,
  Droplet,
} from "lucide-react";
import { SegmentedTabs, CardOption, ChecklistOption, ToggleCard } from "./ui/controls";
import { StepShell } from "./ui/StepShell";
import { StickyCTA } from "@/features/common/ui/StickyCTA";
import { IconBadge } from "@/features/common/ui/IconBadge";
import { WheelPicker, DualWheel } from "../../common/wheel/WheelPicker";
import { RulerSlider } from "../../common/wheel/RulerSlider";
import { useOnboardingMachine, calcAge } from "./state";
import type { OnboardingState } from "./state";
import { calculatePlan } from "./calculations";
import type { PlanResult } from "./calculations";
import {
  MAX_STEP,
  weightMetricRange,
  weightImperialRange,
  heightMetricRange,
  speedRange,
  speedThresholds,
  PROFILE_STORAGE_KEY,
} from "./constants";
import { caloriesUk } from "@/lib/i18n/calories.uk";
import { caloriesEn } from "@/lib/i18n/calories.en";

const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.default), { ssr: false });

type SpeedKey = "slow" | "recommended" | "aggressive";

const lottieUrl: Record<SpeedKey, string> = {
  slow: "/lottie/sloth.json",
  recommended: "/lottie/rabbit.json",
  aggressive: "/lottie/tiger.json",
};

const dictionaries = { uk: caloriesUk, en: caloriesEn };

function useLottie(url?: string) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setData(null);
      return;
    }
    fetch(url)
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return data;
}


export default function OnboardingWizard() {
  const { state, dispatch, next, prev, go } = useOnboardingMachine();
  const dict = dictionaries[state.locale];
  const feetText = state.locale === "uk" ? "Фути" : "Feet";
  const inchesText = state.locale === "uk" ? "Дюйми" : "Inches";

  const [loadingPercent, setLoadingPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [editingMacro, setEditingMacro] = useState<null | "calories" | "carbs_g" | "protein_g" | "fat_g">(null);
  const [plan, setPlan] = useState<PlanResult | null>(state.lastPlan);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const autosaveInitializedRef = useRef(false);

  const age = useMemo(() => calcAge(state.birth), [state.birth]);
  const heightImperial = useMemo(() => cmToFeetInches(state.heightCm), [state.heightCm]);
  const weightImperial = useMemo(() => Math.round(kgToLb(state.weightKg)), [state.weightKg]);
  const monthOptions = useMemo(
    () => range(1, 12).map((month) => ({ value: month, label: monthName(month, state.locale) })),
    [state.locale]
  );
  const monthDisplayValue =
    monthOptions.find((option) => option.value === state.birth.month)?.label ?? monthOptions[0]?.label ?? "";
  const macrosOverrideKey = useMemo(() => JSON.stringify(state.macrosOverride ?? {}), [state.macrosOverride]);

  useEffect(() => {
    if (state.step === 13) {
      setIsLoading(true);
      setLoadingPercent(0);
      const duration = 2000;
      const start = performance.now();
      const tick = (timestamp: number) => {
        const elapsed = timestamp - start;
        const pct = Math.min(100, Math.round((elapsed / duration) * 100));
        setLoadingPercent(pct);
        if (pct < 100) {
          requestAnimationFrame(tick);
        } else {
          const computed = calculatePlan({
            gender: state.gender ?? "female",
            age,
            heightCm: state.heightCm,
            weightKg: state.weightKg,
            desiredWeightKg: state.desiredWeightKg,
            goal: state.goal ?? "maintain",
            speedKgWeek: state.speedKgWeek,
            activity: state.activity ?? "0-2",
            allowRollover: state.allowRollover,
            addExerciseBack: state.addBurnedBack,
            overrides: state.macrosOverride,
          });
          setPlan(computed);
          dispatch({ type: "setPlan", plan: computed });
          setIsLoading(false);
          setTimeout(() => {
            next();
            triggerHaptic("light");
          }, 300);
        }
      };
      requestAnimationFrame(tick);
    } else {
      setIsLoading(false);
      setLoadingPercent(0);
    }
  }, [
    age,
    dispatch,
    next,
    state.activity,
    state.allowRollover,
    state.birth,
    state.desiredWeightKg,
    state.gender,
    state.goal,
    state.heightCm,
    state.macrosOverride,
    state.speedKgWeek,
    state.step,
    state.weightKg,
    state.addBurnedBack,
  ]);

  const desiredDiff = state.desiredWeightKg - state.weightKg;
  const desiredDiffAbs = Math.abs(desiredDiff);
  const desiredAction = desiredDiffAbs < 0.25 ? "maintain" : desiredDiff < 0 ? "lose" : "gain";

  const speedKey = computeSpeedLabel(state.speedKgWeek);
  const speedLabel =
    speedKey === "slow" ? dict.speed.slow : speedKey === "recommended" ? dict.speed.recommended : dict.speed.aggressive;
  const speedLottieData = useLottie(lottieUrl[speedKey]);
  const speedWarning = speedKey === "aggressive" ? (state.goal === "lose" ? dict.speed.warningLose : dict.speed.warningGain) : null;

  const summaryLine = useMemo(() => {
    if (!plan) return dict.results.badgeMaintain;
    if (desiredAction === "maintain") {
      return dict.results.badgeMaintain;
    }
    const targetDate = new Date(plan.targetDateISO);
    const formattedDate = targetDate.toLocaleDateString(state.locale === "uk" ? "uk-UA" : "en-US", {
      day: "2-digit",
      month: "long",
    });
    return desiredAction === "lose"
      ? dict.results.badgeLose(desiredDiffAbs, formattedDate)
      : dict.results.badgeGain(desiredDiffAbs, formattedDate);
  }, [desiredAction, desiredDiffAbs, dict.results, plan, state.locale]);

  const healthScore = useMemo(() => {
    if (!plan) return 7;
    const balance = plan.targetCalories / 350;
    const proteinScore = plan.protein_g / (state.weightKg * 2);
    return Math.min(10, Math.max(3, Math.round((balance + proteinScore * 4) / 2)));
  }, [plan, state.weightKg]);

  const macroStats = useMemo(() => {
    if (!plan) return [];
    const safeCalories = Math.max(1, plan.targetCalories);
    const entries = [
      {
        key: "calories" as const,
        label: dict.results.cards.calories,
        value: plan.targetCalories,
        displayValue: Math.round(plan.targetCalories).toString(),
        unit: "kcal",
        percent: 1,
        tint: "hsl(var(--accent-500))",
        badgeClassName: "bg-accent-500/20 text-accent-200",
        icon: <Flame size={18} />,
      },
      {
        key: "carbs_g" as const,
        label: dict.results.cards.carbs,
        value: plan.carbs_g,
        displayValue: Math.round(plan.carbs_g).toString(),
        unit: "g",
        percent: Math.min(1, (plan.carbs_g * 4) / safeCalories),
        tint: "#fbbf24",
        badgeClassName: "bg-amber-400/15 text-amber-300",
        icon: <Wheat size={18} />,
      },
      {
        key: "protein_g" as const,
        label: dict.results.cards.protein,
        value: plan.protein_g,
        displayValue: Math.round(plan.protein_g).toString(),
        unit: "g",
        percent: Math.min(1, (plan.protein_g * 4) / safeCalories),
        tint: "#fb7185",
        badgeClassName: "bg-rose-400/15 text-rose-200",
        icon: <Dumbbell size={18} />,
      },
      {
        key: "fat_g" as const,
        label: dict.results.cards.fats,
        value: plan.fat_g,
        displayValue: Math.round(plan.fat_g).toString(),
        unit: "g",
        percent: Math.min(1, (plan.fat_g * 9) / safeCalories),
        tint: "#38bdf8",
        badgeClassName: "bg-sky-400/15 text-sky-200",
        icon: <Droplet size={18} />,
      },
    ];
    return entries;
  }, [dict.results.cards, plan]);

  const loadingStages = useMemo(
    () => [
      { key: "custom", label: dict.loading.stageCustomize, threshold: 15 },
      { key: "bmr", label: dict.loading.stageEstimate, threshold: 45 },
      { key: "macros", label: dict.loading.stageMacros, threshold: 75 },
      { key: "final", label: dict.loading.stageFinalize, threshold: 95 },
    ],
    [dict.loading.stageCustomize, dict.loading.stageEstimate, dict.loading.stageMacros, dict.loading.stageFinalize]
  );

  const handleLocaleToggle = useCallback(() => {
    const nextLocale = state.locale === "uk" ? "en" : "uk";
    dispatch({ type: "setLocale", locale: nextLocale });
  }, [dispatch, state.locale]);

  const localeSwitch = (
    <button
      type="button"
      onClick={handleLocaleToggle}
      className="flex items-center gap-2 rounded-full bg-[hsl(var(--panel))] px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
    >
      <Globe size={16} />
      {state.locale === "uk" ? "UA" : "EN"}
    </button>
  );

  const saveProfile = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        ...state,
        step: state.step,
        lastPlan: plan ?? state.lastPlan ?? null,
      };
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // noop
    }
  }, [plan, state]);

  const showToast = useCallback(() => {
    if (typeof window === "undefined") return;
    setShowSavedToast(true);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setShowSavedToast(false);
    }, 1600);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }
    if (!autosaveInitializedRef.current) {
      autosaveInitializedRef.current = true;
      return;
    }
    autosaveTimeoutRef.current = window.setTimeout(() => {
      saveProfile();
      showToast();
    }, 500);
    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [
    saveProfile,
    showToast,
    state.gender,
    state.birth.day,
    state.birth.month,
    state.birth.year,
    state.heightCm,
    state.weightKg,
    state.units,
    state.goal,
    state.desiredWeightKg,
    state.speedKgWeek,
    state.activity,
    state.diet,
    state.barriers,
    state.allowRollover,
    state.addBurnedBack,
    macrosOverrideKey,
    plan,
    state.step,
  ]);

  useEffect(
    () => () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      saveProfile();
    },
    [saveProfile]
  );

  const canGoBack = state.step > 1 && !isLoading;

  const handleBack = useCallback(() => {
    if (!canGoBack) return;
    triggerHaptic("light");
    prev();
  }, [canGoBack, prev]);

  const handleContinue = useCallback(() => {
    if (state.step === 13) return;
    if (state.step === MAX_STEP) {
      saveProfile();
      return;
    }
    triggerHaptic("light");
    next();
  }, [next, saveProfile, state.step]);

  const backLabel = dict.buttons.back;
  const stepProgress = (state.step - 1) / (MAX_STEP - 1);
  const nextDisabled = !isStepValid(state);

  const desiredRange = state.units === "metric" ? weightMetricRange : weightImperialRange;
  const desiredDisplayValue =
    state.units === "metric" ? state.desiredWeightKg : Math.max(desiredRange.min, Math.min(desiredRange.max, kgToLb(state.desiredWeightKg)));
  const desiredDisplayLabel = desiredDisplayValue.toFixed(1);

  const primaryCtaLabel =
    state.step === MAX_STEP
      ? dict.results.cta
      : state.step === 13
      ? dict.loading.generating
      : dict.buttons.next;
  const primaryDisabled = state.step === 13 ? true : state.step < MAX_STEP ? nextDisabled : false;
  const desiredConfirmTitle = dict.desiredConfirm.title(state.desiredWeightKg);
  const desiredConfirmBody =
    desiredAction === "gain"
      ? dict.desiredConfirm.gain(desiredDiffAbs)
      : desiredAction === "lose"
      ? dict.desiredConfirm.lose(desiredDiffAbs)
      : dict.desiredConfirm.maintain;

  return (
    <div className="relative flex min-h-screen flex-col bg-[hsl(var(--surface))] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_60%)]" />
      <main className="relative flex-1 px-6 pb-36 pt-12">
        <div className="mx-auto flex h-full max-w-lg flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex h-full flex-col rounded-3xl bg-[hsl(var(--panel-70))] p-6 shadow-2xl backdrop-blur"
            >
              {state.step === 1 && (
                <StepShell
                  title={dict.gender.title}
                  subtitle={dict.gender.subtitle}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="grid gap-3">
                    <CardOption
                      title={dict.gender.male}
                      description={dict.gender.maleHint}
                      active={state.gender === "male"}
                      onClick={() => {
                        dispatch({ type: "setGender", gender: "male" });
                        triggerHaptic("light");
                      }}
                    />
                    <CardOption
                      title={dict.gender.female}
                      description={dict.gender.femaleHint}
                      active={state.gender === "female"}
                      onClick={() => {
                        dispatch({ type: "setGender", gender: "female" });
                        triggerHaptic("light");
                      }}
                    />
                    <CardOption
                      title={dict.gender.other}
                      description={dict.gender.otherHint}
                      active={state.gender === "other"}
                      onClick={() => {
                        dispatch({ type: "setGender", gender: "other" });
                        triggerHaptic("light");
                      }}
                    />
                  </div>
                </StepShell>
              )}

              {state.step === 2 && (
                <StepShell
                  title={dict.birth.title}
                  subtitle={dict.birth.subtitle}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="grid grid-cols-3 gap-3">
                    <WheelPicker
                      values={monthOptions.map((item) => item.label)}
                      value={monthDisplayValue}
                      onChange={(label) => {
                        const option = monthOptions.find((item) => item.label === label);
                        if (!option) return;
                        dispatch({ type: "setBirth", birth: { ...state.birth, month: option.value } });
                      }}
                      ariaLabel={dict.birth.month}
                      visibleCount={7}
                    />
                    <WheelPicker
                      values={range(1, 31)}
                      value={state.birth.day}
                      onChange={(val) => dispatch({ type: "setBirth", birth: { ...state.birth, day: Number(val) } })}
                      ariaLabel={dict.birth.day}
                      visibleCount={7}
                    />
                    <WheelPicker
                      values={range(1950, 2010)}
                      value={state.birth.year}
                      onChange={(val) => dispatch({ type: "setBirth", birth: { ...state.birth, year: Number(val) } })}
                      ariaLabel={dict.birth.year}
                      visibleCount={7}
                    />
                  </div>
                </StepShell>
              )}

              {state.step === 3 && (
                <StepShell
                  title={dict.measurements.title}
                  subtitle={dict.measurements.subtitle}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <SegmentedTabs
                    items={[
                      { label: dict.measurements.metric, value: "metric" },
                      { label: dict.measurements.imperial, value: "imperial" },
                    ]}
                    value={state.units}
                    onChange={(units) => {
                      dispatch({ type: "setUnits", units });
                      triggerHaptic("light");
                    }}
                  />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-2 text-sm opacity-70">
                        {state.units === "metric" ? dict.measurements.heightMetric : dict.measurements.heightImperial}
                      </div>
                      {state.units === "metric" ? (
                        <WheelPicker
                          values={range(heightMetricRange.min, heightMetricRange.max)}
                          value={Math.round(state.heightCm)}
                          onChange={(val) => dispatch({ type: "setHeightCm", heightCm: Number(val) })}
                          ariaLabel={dict.measurements.heightMetric}
                          visibleCount={7}
                        />
                      ) : (
                        <DualWheel
                          value={{ major: heightImperial.ft, minor: heightImperial.inch }}
                          majorValues={[4, 5, 6, 7]}
                          minorValues={range(0, 11)}
                          majorLabel={feetText}
                          minorLabel={inchesText}
                          ariaLabelMajor={feetText}
                          ariaLabelMinor={inchesText}
                          onChange={(val) => dispatch({ type: "setHeightCm", heightCm: feetInchesToCm(val.major, val.minor) })}
                        />
                      )}
                    </div>
                    <div>
                      <div className="mb-2 text-sm opacity-70">
                        {state.units === "metric" ? dict.measurements.weightMetric : dict.measurements.weightImperial}
                      </div>
                      {state.units === "metric" ? (
                        <WheelPicker
                          values={range(weightMetricRange.min, weightMetricRange.max)}
                          value={Math.round(state.weightKg)}
                          onChange={(val) => dispatch({ type: "setWeightKg", weightKg: Number(val) })}
                          ariaLabel={dict.measurements.weightMetric}
                          visibleCount={7}
                        />
                      ) : (
                        <WheelPicker
                          values={range(weightImperialRange.min, weightImperialRange.max)}
                          value={weightImperial}
                          onChange={(val) =>
                            dispatch({ type: "setWeightKg", weightKg: Math.round(lbToKg(Number(val)) * 10) / 10 })
                          }
                          ariaLabel={dict.measurements.weightImperial}
                          visibleCount={7}
                        />
                      )}
                    </div>
                  </div>
                </StepShell>
              )}

              {state.step === 4 && (
                <StepShell
                  title={dict.goal.title}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="grid gap-3">
                    <CardOption
                      title={dict.goal.lose}
                      description={dict.goal.loseHint}
                      icon={<Target size={18} />}
                      active={state.goal === "lose"}
                      onClick={() => {
                        dispatch({ type: "setGoal", goal: "lose" });
                        triggerHaptic("light");
                      }}
                    />
                    <CardOption
                      title={dict.goal.maintain}
                      description={dict.goal.maintainHint}
                      icon={<ShieldCheck size={18} />}
                      active={state.goal === "maintain"}
                      onClick={() => {
                        dispatch({ type: "setGoal", goal: "maintain" });
                        triggerHaptic("light");
                      }}
                    />
                    <CardOption
                      title={dict.goal.gain}
                      description={dict.goal.gainHint}
                      icon={<Sparkles size={18} />}
                      active={state.goal === "gain"}
                      onClick={() => {
                        dispatch({ type: "setGoal", goal: "gain" });
                        triggerHaptic("light");
                      }}
                    />
                  </div>
                </StepShell>
              )}

              {state.step === 5 && (
                <StepShell
                  title={dict.desired.title}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="text-center text-5xl font-black text-white">
                    {desiredDisplayLabel}
                    <span className="ml-2 text-lg opacity-70">{state.units === "metric" ? "кг" : "lb"}</span>
                  </div>
                  <RulerSlider
                    value={state.units === "metric" ? state.desiredWeightKg : desiredDisplayValue}
                    onChange={(val) => {
                      const nextKg = state.units === "metric" ? val : lbToKg(val);
                      dispatch({ type: "setDesiredWeightKg", desiredWeightKg: Math.round(nextKg * 10) / 10 });
                    }}
                    min={desiredRange.min}
                    max={desiredRange.max}
                    step={state.units === "metric" ? 0.5 : 1}
                    ariaLabel={dict.desired.title}
                  />
                  <div className="rounded-3xl bg-[hsl(var(--panel-70))] p-4 text-sm opacity-90">
                    {desiredAction === "maintain"
                      ? dict.desired.hintMaintain
                      : desiredAction === "lose"
                      ? dict.desired.hintLose(desiredDiffAbs)
                      : dict.desired.hintGain(desiredDiffAbs)}
                  </div>
                </StepShell>
              )}

              {state.step === 6 && (
                <StepShell
                  title={dict.desiredConfirm.heading}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                    <IconBadge className="bg-accent-500/20 text-accent-200">
                      <Target size={20} />
                    </IconBadge>
                    <div className="space-y-3">
                      <div className="text-4xl font-black text-white">{desiredConfirmTitle}</div>
                      <p className="text-sm text-neutral-400">{desiredConfirmBody}</p>
                    </div>
                  </div>
                </StepShell>
              )}

              {state.step === 7 && (
                <StepShell
                  title={dict.speed.title}
                  subtitle={dict.speed.subtitle}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="grid h-40 w-40 place-items-center overflow-hidden rounded-full bg-[hsl(var(--panel-70))]">
                      {speedLottieData ? (
                        <Lottie key={speedKey} animationData={speedLottieData || undefined} loop />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-neutral-700" />
                      )}
                    </div>
                    <span
                      className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${
                        speedKey === "slow"
                          ? "bg-sky-500/20 text-sky-200"
                          : speedKey === "recommended"
                          ? "bg-accent-500/20 text-accent-500"
                          : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {speedLabel}
                    </span>
                    <div className="text-5xl font-black">{state.speedKgWeek.toFixed(1)} kg</div>
                    <input
                      type="range"
                      min={speedRange.min}
                      max={speedRange.max}
                      step={speedRange.step}
                      value={state.speedKgWeek}
                      onChange={(event) => {
                        dispatch({ type: "setSpeedKgWeek", speedKgWeek: Number(event.target.value) });
                        triggerHaptic("light");
                      }}
                      aria-label={dict.speed.title}
                      className="w-full accent-accent-500 bg-white/10"
                    />
                    {speedWarning && (
                      <div className="rounded-2xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                        {speedWarning}
                      </div>
                    )}
                  </div>
                </StepShell>
              )}

              {state.step === 8 && (
                <StepShell
                  title={dict.activity.title}
                  subtitle={dict.activity.subtitle}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="grid gap-3">
                    <CardOption
                      title={dict.activity.low}
                      description={dict.activity.lowHint}
                      active={state.activity === "0-2"}
                      onClick={() => {
                        dispatch({ type: "setActivity", activity: "0-2" });
                        triggerHaptic("light");
                      }}
                    />
                    <CardOption
                      title={dict.activity.moderate}
                      description={dict.activity.moderateHint}
                      active={state.activity === "3-5"}
                      onClick={() => {
                        dispatch({ type: "setActivity", activity: "3-5" });
                        triggerHaptic("light");
                      }}
                    />
                    <CardOption
                      title={dict.activity.high}
                      description={dict.activity.highHint}
                      active={state.activity === "6+"}
                      onClick={() => {
                        dispatch({ type: "setActivity", activity: "6+" });
                        triggerHaptic("light");
                      }}
                    />
                  </div>
                </StepShell>
              )}

              {state.step === 9 && (
                <StepShell
                  title={dict.diet.title}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="grid gap-3">
                    {(
                      [
                        { key: "classic", title: dict.diet.classic, hint: dict.diet.classicHint },
                        { key: "pescatarian", title: dict.diet.pescatarian, hint: dict.diet.pescatarianHint },
                        { key: "vegetarian", title: dict.diet.vegetarian, hint: dict.diet.vegetarianHint },
                        { key: "vegan", title: dict.diet.vegan, hint: dict.diet.veganHint },
                      ] as const
                    ).map((item) => (
                      <CardOption
                        key={item.key}
                        title={item.title}
                        description={item.hint}
                        active={state.diet === item.key}
                        onClick={() => {
                          dispatch({ type: "setDiet", diet: item.key });
                          triggerHaptic("light");
                        }}
                      />
                    ))}
                  </div>
                </StepShell>
              )}

              {state.step === 10 && (
                <StepShell
                  title={dict.barriers.title}
                  subtitle={dict.barriers.subtitle}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="grid gap-3">
                    {(
                      [
                        { key: "consistency", title: dict.barriers.consistency },
                        { key: "habits", title: dict.barriers.habits },
                        { key: "busy", title: dict.barriers.busy },
                        { key: "inspiration", title: dict.barriers.inspiration },
                      ] as const
                    ).map((item) => (
                      <ChecklistOption
                        key={item.key}
                        title={item.title}
                        checked={state.barriers.includes(item.key)}
                        onClick={() => {
                          dispatch({ type: "toggleBarrier", barrier: item.key });
                          triggerHaptic("light");
                        }}
                      />
                    ))}
                  </div>
                </StepShell>
              )}

              {state.step === 11 && (
                <StepShell
                  title={dict.privacy.title}
                  subtitle={dict.privacy.body}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="flex h-full items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        next();
                      }}
                      className="rounded-full bg-accent-500 px-8 py-3 text-sm font-semibold text-neutral-900 shadow-lg"
                    >
                      {dict.privacy.continue}
                    </button>
                  </div>
                </StepShell>
              )}

              {state.step === 12 && (
                <StepShell
                  title={dict.options.title}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-sm opacity-80">{dict.options.rolloverQuestion}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleCard
                          title={dict.options.yes}
                          active={state.allowRollover}
                          onClick={() => dispatch({ type: "setAllowRollover", value: true })}
                        />
                        <ToggleCard
                          title={dict.options.no}
                          active={!state.allowRollover}
                          onClick={() => dispatch({ type: "setAllowRollover", value: false })}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-sm opacity-80">{dict.options.addBackQuestion}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleCard
                          title={dict.options.yes}
                          active={state.addBurnedBack}
                          onClick={() => dispatch({ type: "setAddBurnedBack", value: true })}
                        />
                        <ToggleCard
                          title={dict.options.no}
                          active={!state.addBurnedBack}
                          onClick={() => dispatch({ type: "setAddBurnedBack", value: false })}
                        />
                      </div>
                    </div>
                  </div>
                </StepShell>
              )}

              {state.step === 13 && (
                <StepShell
                  title={dict.loading.title}
                  subtitle={dict.loading.caption}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={false}
              progress={stepProgress}
            >
                  <div className="flex h-full flex-col items-center justify-center gap-4">
                    <div className="text-7xl font-black md:text-8xl">{loadingPercent}%</div>
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-accent-500"
                        initial={{ width: "0%" }}
                        animate={{ width: `${loadingPercent}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <div className="mt-4 w-full space-y-3">
                      {loadingStages.map((stage) => {
                        const reached = loadingPercent >= stage.threshold;
                        return (
                          <div key={stage.key} className="flex items-center gap-3 text-left">
                            <motion.span
                              initial={{ scale: 0.85, rotate: -90 }}
                              animate={reached ? { scale: 1, rotate: 0 } : { scale: 0.85, rotate: -90 }}
                              transition={{ duration: 0.18 }}
                              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
                                reached
                                  ? "border-accent-500 bg-accent-500 text-neutral-900"
                                  : "border-white/20 text-white/70"
                              }`}
                            >
                              {reached ? <Check size={18} /> : <span className="h-2.5 w-2.5 rounded-full bg-white/40" />}
                            </motion.span>
                            <span className="text-sm text-neutral-300">{stage.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </StepShell>
              )}

              {state.step === 14 && plan && (
                <StepShell
                  title={dict.results.heading}
                  topRight={localeSwitch}
                  backLabel={backLabel}
                  onBack={handleBack}
                  canGoBack={canGoBack}
                  progress={stepProgress}
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 rounded-3xl border border-accent-500/40 bg-accent-500/20 px-4 py-3 text-sm text-accent-500">
                      <CalendarCheck size={18} />
                      <span>{summaryLine}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReview(true)}
                      className="flex items-center gap-2 text-sm font-semibold text-accent-500 underline decoration-dotted underline-offset-4"
                    >
                      <Pencil size={16} /> {dict.results.editInputs}
                    </button>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {macroStats.map((macro) => {
                        const isEditing = editingMacro === macro.key;
                        const pickerValues =
                          macro.key === "calories" ? range(1200, 3900, 25) : range(10, 350, 5);
                        const wheelValue =
                          macro.key === "calories"
                            ? Math.round(macro.value / 25) * 25
                            : Math.round(macro.value / 5) * 5;
                        const percentLabel = Math.round(macro.percent * 100);
                        const sweep = Math.max(0, Math.min(1, macro.percent)) * 360;
                        return (
                          <div key={macro.key} className="relative overflow-hidden rounded-3xl bg-[hsl(var(--panel-70))] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <IconBadge className={macro.badgeClassName}>{macro.icon}</IconBadge>
                              <button
                                type="button"
                                onClick={() => setEditingMacro(macro.key)}
                                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                              >
                                <Pencil size={14} />
                                {dict.results.edit}
                              </button>
                            </div>
                            <div className="mt-4 flex flex-col items-center gap-3">
                              <div className="relative flex h-32 w-32 items-center justify-center">
                                <div
                                  className="absolute inset-0 rounded-full opacity-80"
                                  style={{
                                    backgroundImage: `conic-gradient(${macro.tint} ${sweep}deg, rgba(255,255,255,0.06) 0deg)`,
                                  }}
                                  aria-hidden
                                />
                                <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-black/50 text-white shadow-inner">
                                  <span className="text-3xl font-bold">{macro.displayValue}</span>
                                  <span className="text-xs uppercase tracking-wide opacity-70">{macro.unit}</span>
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-white">{macro.label}</div>
                              <div className="text-xs uppercase tracking-wide text-neutral-400">
                                {percentLabel}% {dict.results.cards.ofCalories}
                              </div>
                            </div>
                            {isEditing && (
                              <div className="mt-4 space-y-3">
                                <WheelPicker
                                  values={pickerValues}
                                  value={wheelValue}
                                  onChange={(val) => {
                                    const numeric = Number(val);
                                    dispatch({ type: "setMacrosOverride", payload: { [macro.key]: numeric } });
                                    setPlan((prev) =>
                                      prev
                                        ? macro.key === "calories"
                                          ? { ...prev, targetCalories: numeric }
                                          : { ...prev, [macro.key]: numeric }
                                        : prev
                                    );
                                    triggerHaptic("light");
                                  }}
                                  ariaLabel={macro.label}
                                  visibleCount={7}
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingMacro(null)}
                                  className="text-xs text-neutral-400 underline"
                                >
                                  {dict.common.done}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-3xl bg-[hsl(var(--panel-70))] p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm opacity-70">{dict.results.healthScore}</span>
                        <span className="text-lg font-semibold">{healthScore}/10</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-accent-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(healthScore / 10) * 100}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-lg font-semibold">{dict.results.checklistTitle}</h3>
                      <ul className="space-y-2 text-sm opacity-80">
                        <li>• Track meals daily to stay aware of intake.</li>
                        <li>• Prioritise sleep & hydration for recovery.</li>
                        <li>• Align workouts with energy availability.</li>
                        <li>• Review progress every two weeks and adjust.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold opacity-80">{dict.results.sourcesTitle}</h3>
                      <ul className="space-y-2 text-sm">
                        {[
                          {
                            label: "Basal metabolic rate — Healthline",
                            href: "https://www.healthline.com/health/what-is-basal-metabolic-rate",
                          },
                          {
                            label: "Calorie counting — Harvard",
                            href: "https://www.health.harvard.edu/staying-healthy/calorie-counting-made-easy",
                          },
                          { label: "ISSN — PubMed 28630601", href: "https://pubmed.ncbi.nlm.nih.gov/28630601/" },
                          { label: "NIH Guidelines (NHLBI)", href: "https://www.nhlbi.nih.gov/files/docs/guidelines/ob_gdlns.pdf" },
                        ].map((source) => (
                          <li key={source.href}>
                            <a
                              className="inline-flex items-center gap-1 text-accent-500 underline decoration-dotted underline-offset-4"
                              target="_blank"
                              rel="noopener noreferrer"
                              href={source.href}
                            >
                              {source.label}
                              <ExternalLink size={14} />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </StepShell>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <StickyCTA className="mt-6" label={primaryCtaLabel} disabled={primaryDisabled} onClick={handleContinue} />
      </main>

      <AnimatePresence>
        {showReview && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-[hsl(var(--panel))] p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Review inputs</h3>
                <button type="button" onClick={() => setShowReview(false)} className="text-sm text-neutral-400 underline">
                  Close
                </button>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  { step: 1, label: dict.gender.title },
                  { step: 2, label: dict.birth.title },
                  { step: 3, label: dict.measurements.title },
                  { step: 4, label: dict.goal.title },
                  { step: 5, label: dict.desired.title },
                  { step: 6, label: dict.desiredConfirm.heading },
                  { step: 7, label: dict.speed.title },
                  { step: 8, label: dict.activity.title },
                  { step: 9, label: dict.diet.title },
                  { step: 10, label: dict.barriers.title },
                  { step: 12, label: dict.options.title },
                ].map((item) => (
                  <li key={item.step}>
                    <button
                      type="button"
                      onClick={() => {
                        go(item.step);
                        setShowReview(false);
                      }}
                      className="w-full rounded-2xl bg-[hsl(var(--panel))] px-4 py-3 text-left transition hover:bg-white/10"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            className="pointer-events-none fixed bottom-6 right-6 z-50 rounded-full bg-[hsl(var(--panel-70))] px-4 py-2 text-sm font-semibold text-white shadow-lg"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {dict.common.saved}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function isStepValid(state: OnboardingState): boolean {
  switch (state.step) {
    case 1:
      return state.gender !== null;
    case 2: {
      const age = calcAge(state.birth);
      return age >= 14 && age <= 80;
    }
    case 3:
      return state.heightCm >= heightMetricRange.min && state.heightCm <= heightMetricRange.max && state.weightKg >= 40 && state.weightKg <= 200;
    case 4:
      return state.goal !== null;
    case 5:
      return state.desiredWeightKg >= 40 && state.desiredWeightKg <= 200;
    case 6:
      return true;
    case 7:
      return state.speedKgWeek >= speedRange.min && state.speedKgWeek <= speedRange.max;
    case 8:
      return state.activity !== null;
    case 9:
      return state.diet !== null;
    default:
      return true;
  }
}

function monthName(index: number, locale: "uk" | "en") {
  const date = new Date(2000, index - 1, 1);
  return date.toLocaleString(locale === "uk" ? "uk-UA" : "en-US", { month: "long" });
}

function range(start: number, end: number, step = 1) {
  const items: number[] = [];
  for (let value = start; value <= end; value += step) {
    items.push(Number(value.toFixed(2)));
  }
  return items;
}

function cmToFeetInches(cm: number) {
  const totalInches = Math.round(cm / 2.54);
  const ft = Math.floor(totalInches / 12);
  return { ft, inch: totalInches - ft * 12 };
}

function feetInchesToCm(ft: number, inch: number) {
  return Math.round((ft * 12 + inch) * 2.54);
}

function kgToLb(kg: number) {
  return kg * 2.20462;
}

function lbToKg(lb: number) {
  return lb * 0.453592;
}

function computeSpeedLabel(speed: number): SpeedKey {
  if (speed <= speedThresholds.slow) return "slow";
  if (speed < speedThresholds.aggressive) return "recommended";
  return "aggressive";
}

function triggerHaptic(type: "light" | "medium" | "heavy") {
  try {
    window?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(type);
  } catch {
    // no-op
  }
}
