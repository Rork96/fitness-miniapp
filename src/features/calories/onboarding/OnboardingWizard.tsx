"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, ShieldCheck, Sparkles, Target, Wheat, Drumstick, Droplets, CalendarCheck, ExternalLink, Pencil } from "lucide-react";
import { CardOption, ChecklistOption, ToggleCard } from "./ui/controls";
import { StepShell } from "./ui/StepShell";
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
  speedRangeImperial,
  speedZonesMetric,
  speedZonesImperial,
  speedThresholds,
  PROFILE_STORAGE_KEY,
} from "./constants";
import { caloriesUk } from "@/lib/i18n/calories.uk";
import { caloriesEn } from "@/lib/i18n/calories.en";
import LoadingStage from "./LoadingStage";
import { useHaptics } from "@/lib/useHaptics";
import { RingCard } from "./ui/RingCard";
import { EditMacroSheet } from "./ui/EditMacroSheet";
import SpeedExact from "./ui/SpeedExact";

type SpeedKey = "slow" | "recommended" | "aggressive";
type MacroKey = "calories" | "carbs_g" | "protein_g" | "fat_g";

const dictionaries = { uk: caloriesUk, en: caloriesEn };


export default function OnboardingWizard() {
  const { state, dispatch, next, prev, go } = useOnboardingMachine();
  const dict = dictionaries[state.locale];
  const feetText = state.locale === "uk" ? "Фути" : "Feet";
  const inchesText = state.locale === "uk" ? "Дюйми" : "Inches";
  const { tapLight, tapMedium } = useHaptics();

  const [showReview, setShowReview] = useState(false);
  const [editingMacro, setEditingMacro] = useState<MacroKey | null>(null);
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


  const desiredDiff = state.desiredWeightKg - state.weightKg;
  const desiredDiffAbs = Math.abs(desiredDiff);
  const desiredAction = desiredDiffAbs < 0.25 ? "maintain" : desiredDiff < 0 ? "lose" : "gain";

  const speedKey = computeSpeedLabel(state.speedKgWeek);
  const speedLabel =
    speedKey === "slow" ? dict.speed.slow : speedKey === "recommended" ? dict.speed.recommended : dict.speed.aggressive;
  const speedWarning = speedKey === "aggressive" ? (state.goal === "lose" ? dict.speed.warningLose : dict.speed.warningGain) : null;
  const speedSubtitle =
    desiredAction === "gain"
      ? dict.speed.subtitleGain
      : desiredAction === "lose"
      ? dict.speed.subtitleLose
      : dict.speed.subtitleMaintain;
  const speedUnitLabel =
    desiredAction === "gain"
      ? dict.speed.perWeekGain
      : desiredAction === "lose"
      ? dict.speed.perWeekLose
      : dict.speed.perWeekMaintain;
  const speedDisplayValue =
    state.units === "metric" ? state.speedKgWeek : Number(kgToLb(state.speedKgWeek).toFixed(1));
  const speedDisplayRange = state.units === "metric" ? speedRange : speedRangeImperial;
  const speedDisplayZones = state.units === "metric" ? speedZonesMetric : speedZonesImperial;
  const speedTickLabels: [number, number, number] =
    state.units === "metric" ? [0.1, 0.8, 1.5] : [0.2, 1.5, 3.0];

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
        icon: <Drumstick size={18} />,
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
        icon: <Droplets size={18} />,
      },
    ];
    return entries;
  }, [dict.results.cards, plan]);

  const ringAccentClass: Record<MacroKey, string> = {
    calories: "stroke-black",
    carbs_g: "stroke-amber-400",
    protein_g: "stroke-rose-500",
    fat_g: "stroke-sky-400",
  };

  const macroValueOptions = useMemo(
    () => ({
      calories: range(1200, 3900, 25),
      carbs_g: range(10, 350, 5),
      protein_g: range(10, 250, 5),
      fat_g: range(10, 150, 5),
    }),
    []
  );

  const computePlanWithOverrides = useCallback(
    (overridesInput: Partial<Record<MacroKey, number | undefined>>) => {
      const sanitized: Partial<Record<MacroKey, number>> = {};
      (Object.keys(overridesInput) as MacroKey[]).forEach((key) => {
        const val = overridesInput[key];
        if (typeof val === "number" && Number.isFinite(val)) {
          sanitized[key] = val;
        }
      });
      return calculatePlan({
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
        overrides: sanitized,
      });
    },
    [
      age,
      state.activity,
      state.addBurnedBack,
      state.allowRollover,
      state.desiredWeightKg,
      state.gender,
      state.goal,
      state.heightCm,
      state.speedKgWeek,
      state.weightKg,
    ]
  );

  const applyMacroOverride = useCallback(
    (key: MacroKey, value: number) => {
      const updatedOverrides: Partial<Record<MacroKey, number | undefined>> = {
        ...state.macrosOverride,
        [key]: value,
      };
      dispatch({ type: "setMacrosOverride", payload: { [key]: value } });
      const computed = computePlanWithOverrides(updatedOverrides);
      setPlan(computed);
      dispatch({ type: "setPlan", plan: computed });
    },
    [computePlanWithOverrides, dispatch, state.macrosOverride]
  );

  const revertMacroOverride = useCallback(
    (key: MacroKey) => {
      const updatedOverrides: Partial<Record<MacroKey, number | undefined>> = { ...state.macrosOverride };
      delete updatedOverrides[key];
      dispatch({ type: "setMacrosOverride", payload: { [key]: undefined } });
      const computed = computePlanWithOverrides(updatedOverrides);
      setPlan(computed);
      dispatch({ type: "setPlan", plan: computed });
    },
    [computePlanWithOverrides, dispatch, state.macrosOverride]
  );

  const activeMacroStat = editingMacro ? macroStats.find((macro) => macro.key === editingMacro) ?? null : null;

  const resourceLinks = [
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
  ];

  const handleLocaleToggle = useCallback(() => {
    const nextLocale = state.locale === "uk" ? "en" : "uk";
    dispatch({ type: "setLocale", locale: nextLocale });
  }, [dispatch, state.locale]);

  const sheetValues = editingMacro ? macroValueOptions[editingMacro] : [];
  const sheetUnit = activeMacroStat?.unit ?? "";
  const sheetTitle = activeMacroStat?.label ?? "";
  const sheetValue = activeMacroStat
    ? editingMacro === "calories"
      ? Math.round(activeMacroStat.value / 25) * 25
      : Math.round(activeMacroStat.value / 5) * 5
    : 0;

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

  const canGoBack = state.step > 1 && state.step !== 13;

  const handleBack = useCallback(() => {
    if (!canGoBack) return;
    tapLight();
    prev();
  }, [canGoBack, prev, tapLight]);

  const handleContinue = useCallback(() => {
    tapLight();
    if (state.step === 13) return;
    if (state.step === MAX_STEP) {
      saveProfile();
      return;
    }
    next();
  }, [next, saveProfile, state.step, tapLight]);

  const handleLoadingDone = useCallback(() => {
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
    tapMedium();
    next();
  }, [
    age,
    dispatch,
    next,
    tapMedium,
    state.activity,
    state.addBurnedBack,
    state.allowRollover,
    state.desiredWeightKg,
    state.gender,
    state.goal,
    state.heightCm,
    state.macrosOverride,
    state.speedKgWeek,
    state.weightKg,
  ]);

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
      : state.step === 11
      ? dict.privacy.continue
      : dict.buttons.next;
  const primaryDisabled = state.step === 13 ? true : state.step < MAX_STEP ? nextDisabled : false;
  const desiredConfirmTitle = dict.desiredConfirm.title(state.desiredWeightKg);
  const desiredConfirmBody =
    desiredAction === "gain"
      ? dict.desiredConfirm.gain(desiredDiffAbs)
      : desiredAction === "lose"
      ? dict.desiredConfirm.lose(desiredDiffAbs)
      : dict.desiredConfirm.maintain;

  const localeLabel = state.locale === "uk" ? "UA / EN" : "EN / UA";
  const nextProps = state.step === 13
    ? {}
    : { onNext: handleContinue, nextLabel: primaryCtaLabel, nextDisabled: primaryDisabled };
  const shellSharedProps = {
    back: canGoBack ? handleBack : undefined,
    progress: stepProgress,
    localeLabel,
    onToggleLocale: handleLocaleToggle,
    toolsHref: "/tools",
    toolsLabel: dict.common.tools,
  };

  const handleUnitsChange = useCallback(
    (units: "metric" | "imperial") => {
      if (units === state.units) return;

      if (units === "imperial") {
        const clampedWeightLb = Math.max(
          weightImperialRange.min,
          Math.min(weightImperialRange.max, kgToLb(state.weightKg))
        );
        const clampedDesiredLb = Math.max(
          weightImperialRange.min,
          Math.min(weightImperialRange.max, kgToLb(state.desiredWeightKg))
        );
        dispatch({
          type: "setWeightKg",
          weightKg: Math.round(lbToKg(clampedWeightLb) * 10) / 10,
        });
        dispatch({
          type: "setDesiredWeightKg",
          desiredWeightKg: Math.round(lbToKg(clampedDesiredLb) * 10) / 10,
        });
      } else {
        dispatch({
          type: "setWeightKg",
          weightKg: Math.max(weightMetricRange.min, Math.min(weightMetricRange.max, state.weightKg)),
        });
        dispatch({
          type: "setDesiredWeightKg",
          desiredWeightKg: Math.max(
            weightMetricRange.min,
            Math.min(weightMetricRange.max, state.desiredWeightKg)
          ),
        });
      }

      dispatch({ type: "setUnits", units });
      tapLight();
    },
    [dispatch, state.desiredWeightKg, state.units, state.weightKg, tapLight]
  );

  const handleSpeedChange = useCallback(
    (value: number) => {
      const prevZone = computeSpeedLabel(state.speedKgWeek);
      const nextZone = computeSpeedLabel(value);
      tapLight();
      if (prevZone !== nextZone) {
        tapMedium();
      }
      const clamped = Math.max(speedRange.min, Math.min(speedRange.max, value));
      dispatch({ type: "setSpeedKgWeek", speedKgWeek: Number(clamped.toFixed(1)) });
    },
    [dispatch, state.speedKgWeek, tapLight, tapMedium]
  );

  return (
    <div className="min-h-dvh bg-[#05090d] text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex justify-center"
        >
          {state.step === 1 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.gender.title}
              subtitle={dict.gender.subtitle}
            >
              <div className="grid gap-3">
                    <CardOption
                      title={dict.gender.male}
                      description={dict.gender.maleHint}
                      active={state.gender === "male"}
                      onClick={() => {
                        dispatch({ type: "setGender", gender: "male" });
                        tapLight();
                      }}
                    />
                    <CardOption
                      title={dict.gender.female}
                      description={dict.gender.femaleHint}
                      active={state.gender === "female"}
                      onClick={() => {
                        dispatch({ type: "setGender", gender: "female" });
                        tapLight();
                      }}
                    />
                    <CardOption
                      title={dict.gender.other}
                      description={dict.gender.otherHint}
                      active={state.gender === "other"}
                      onClick={() => {
                        dispatch({ type: "setGender", gender: "other" });
                        tapLight();
                      }}
                    />
              </div>
            </StepShell>
          )}

          {state.step === 2 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.birth.title}
              subtitle={dict.birth.subtitle}
            >
                  <div className="grid grid-cols-3 gap-3">
                    <WheelPicker
                      values={monthOptions.map((item) => item.label)}
                      value={monthDisplayValue}
                      onChange={(label) => {
                        const option = monthOptions.find((item) => item.label === label);
                        if (!option) return;
                        dispatch({ type: "setBirth", birth: { ...state.birth, month: option.value } });
                        tapLight();
                      }}
                      ariaLabel={dict.birth.month}
                      visibleCount={7}
                    />
                    <WheelPicker
                      values={range(1, 31)}
                      value={state.birth.day}
                      onChange={(val) => {
                        dispatch({ type: "setBirth", birth: { ...state.birth, day: Number(val) } });
                        tapLight();
                      }}
                      ariaLabel={dict.birth.day}
                      visibleCount={7}
                    />
                    <WheelPicker
                      values={range(1950, 2010)}
                      value={state.birth.year}
                      onChange={(val) => {
                        dispatch({ type: "setBirth", birth: { ...state.birth, year: Number(val) } });
                        tapLight();
                      }}
                      ariaLabel={dict.birth.year}
                      visibleCount={7}
                    />
              </div>
            </StepShell>
          )}

          {state.step === 3 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.measurements.title}
              subtitle={dict.measurements.subtitle}
            >
                  <div className="mx-auto mb-4 grid w-full max-w-sm grid-cols-2 rounded-full bg-neutral-800 p-1">
                    <button
                      type="button"
                      className={`rounded-full py-2 text-center text-sm font-semibold transition ${state.units === "metric" ? "bg-white text-black" : "text-neutral-400"}`}
                      onClick={() => handleUnitsChange("metric")}
                    >
                      {dict.measurements.metric}
                    </button>
                    <button
                      type="button"
                      className={`rounded-full py-2 text-center text-sm font-semibold transition ${state.units === "imperial" ? "bg-white text-black" : "text-neutral-400"}`}
                      onClick={() => handleUnitsChange("imperial")}
                    >
                      {dict.measurements.imperial}
                    </button>
              </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-2 text-sm opacity-70">
                        {state.units === "metric" ? dict.measurements.heightMetric : dict.measurements.heightImperial}
                  </div>
                      {state.units === "metric" ? (
                        <WheelPicker
                          values={range(heightMetricRange.min, heightMetricRange.max)}
                          value={Math.round(state.heightCm)}
                          onChange={(val) => {
                            dispatch({ type: "setHeightCm", heightCm: Number(val) });
                            tapLight();
                          }}
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
                          onChange={(val) => {
                            dispatch({ type: "setHeightCm", heightCm: feetInchesToCm(val.major, val.minor) });
                            tapLight();
                          }}
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
                          onChange={(val) => {
                            dispatch({ type: "setWeightKg", weightKg: Number(val) });
                            tapLight();
                          }}
                          ariaLabel={dict.measurements.weightMetric}
                          visibleCount={7}
                        />
                      ) : (
                        <WheelPicker
                          values={range(weightImperialRange.min, weightImperialRange.max)}
                          value={weightImperial}
                          onChange={(val) => {
                            dispatch({ type: "setWeightKg", weightKg: Math.round(lbToKg(Number(val)) * 10) / 10 });
                            tapLight();
                          }}
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
              {...shellSharedProps}
              {...nextProps}
              title={dict.goal.title}
            >
              <div className="grid gap-3">
                    <CardOption
                      title={dict.goal.lose}
                      description={dict.goal.loseHint}
                      icon={<Target size={18} />}
                      active={state.goal === "lose"}
                      onClick={() => {
                        dispatch({ type: "setGoal", goal: "lose" });
                        tapLight();
                      }}
                    />
                    <CardOption
                      title={dict.goal.maintain}
                      description={dict.goal.maintainHint}
                      icon={<ShieldCheck size={18} />}
                      active={state.goal === "maintain"}
                      onClick={() => {
                        dispatch({ type: "setGoal", goal: "maintain" });
                        tapLight();
                      }}
                    />
                    <CardOption
                      title={dict.goal.gain}
                      description={dict.goal.gainHint}
                      icon={<Sparkles size={18} />}
                      active={state.goal === "gain"}
                      onClick={() => {
                        dispatch({ type: "setGoal", goal: "gain" });
                        tapLight();
                      }}
                    />
              </div>
            </StepShell>
          )}

          {state.step === 5 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.desired.title}
            >
                  <div className="text-center font-black text-white text-[clamp(2.5rem,8vw,3.5rem)]">
                    {desiredDisplayLabel}
                    <span className="ml-2 align-middle text-base font-semibold uppercase tracking-wide opacity-70">
                      {state.units === "metric" ? "кг" : "lb"}
                    </span>
              </div>
                  <RulerSlider
                    value={state.units === "metric" ? state.desiredWeightKg : desiredDisplayValue}
                    onChange={(val) => {
                      const nextKg = state.units === "metric" ? val : lbToKg(val);
                      dispatch({ type: "setDesiredWeightKg", desiredWeightKg: Math.round(nextKg * 10) / 10 });
                      tapLight();
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
              {...shellSharedProps}
              {...nextProps}
              title={dict.desiredConfirm.heading}
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
              {...shellSharedProps}
              {...nextProps}
              title={dict.speed.title}
              subtitle={speedSubtitle}
            >
              <div className="space-y-6 pt-1">
                <SpeedExact
                  value={speedDisplayValue}
                  onChange={(nextValue) => {
                    const nextKg = state.units === "metric" ? nextValue : lbToKg(nextValue);
                    handleSpeedChange(nextKg);
                  }}
                  unit={state.units === "metric" ? "kg" : "lbs"}
                  range={speedDisplayRange}
                  zones={speedDisplayZones}
                  labels={{
                    slow: dict.speed.slow,
                    recommended: dict.speed.recommended,
                    aggressive: dict.speed.aggressive,
                  }}
                  unitLabel={speedUnitLabel}
                  recommendedLabel={dict.speed.recommendedChip}
                  tickLabels={speedTickLabels}
                />

                <div
                  className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold ${
                    speedKey === "slow"
                      ? "bg-sky-500/10 text-sky-200"
                      : speedKey === "recommended"
                      ? "bg-lime-500/10 text-lime-200"
                      : "bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {speedLabel}
                </div>

                {speedWarning && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {speedWarning}
                  </div>
                )}
              </div>
            </StepShell>
          )}

          {state.step === 8 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.activity.title}
              subtitle={dict.activity.subtitle}
            >
              <div className="grid gap-3">
                    <CardOption
                      title={dict.activity.low}
                      description={dict.activity.lowHint}
                      active={state.activity === "0-2"}
                      onClick={() => {
                        dispatch({ type: "setActivity", activity: "0-2" });
                        tapLight();
                      }}
                    />
                    <CardOption
                      title={dict.activity.moderate}
                      description={dict.activity.moderateHint}
                      active={state.activity === "3-5"}
                      onClick={() => {
                        dispatch({ type: "setActivity", activity: "3-5" });
                        tapLight();
                      }}
                    />
                    <CardOption
                      title={dict.activity.high}
                      description={dict.activity.highHint}
                      active={state.activity === "6+"}
                      onClick={() => {
                        dispatch({ type: "setActivity", activity: "6+" });
                        tapLight();
                      }}
                    />
              </div>
            </StepShell>
          )}

          {state.step === 9 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.diet.title}
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
                          tapLight();
                        }}
                      />
                    ))}
              </div>
            </StepShell>
          )}

          {state.step === 10 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.barriers.title}
              subtitle={dict.barriers.subtitle}
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
                          tapLight();
                        }}
                      />
                    ))}
              </div>
            </StepShell>
          )}

          {state.step === 11 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.privacy.title}
            >
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
                {dict.privacy.body}
              </div>
            </StepShell>
          )}

          {state.step === 12 && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.options.title}
            >
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-sm opacity-80">{dict.options.rolloverQuestion}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleCard
                          title={dict.options.yes}
                          active={state.allowRollover}
                          onClick={() => {
                            tapLight();
                            dispatch({ type: "setAllowRollover", value: true });
                          }}
                        />
                        <ToggleCard
                          title={dict.options.no}
                          active={!state.allowRollover}
                          onClick={() => {
                            tapLight();
                            dispatch({ type: "setAllowRollover", value: false });
                          }}
                        />
                  </div>
                </div>
                    <div>
                      <div className="mb-2 text-sm opacity-80">{dict.options.addBackQuestion}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleCard
                          title={dict.options.yes}
                          active={state.addBurnedBack}
                          onClick={() => {
                            tapLight();
                            dispatch({ type: "setAddBurnedBack", value: true });
                          }}
                        />
                        <ToggleCard
                          title={dict.options.no}
                          active={!state.addBurnedBack}
                          onClick={() => {
                            tapLight();
                            dispatch({ type: "setAddBurnedBack", value: false });
                          }}
                        />
                  </div>
                </div>
              </div>
            </StepShell>
          )}

          {state.step === 13 && (
            <StepShell
              {...shellSharedProps}
              title={dict.loading.title}
              subtitle={dict.loading.caption}
            >
              <LoadingStage onDone={handleLoadingDone} />
            </StepShell>
          )}

          {state.step === 14 && plan && (
            <StepShell
              {...shellSharedProps}
              {...nextProps}
              title={dict.results.heading}
            >
              <div className="space-y-6 -mt-2">
                <div className="flex items-start gap-3 rounded-2xl border border-lime-400/40 bg-lime-400/15 px-4 py-3 text-sm text-lime-100">
                  <CalendarCheck className="mt-0.5 h-5 w-5" />
                  <span>{summaryLine}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {macroStats.map((macro) => (
                    <RingCard
                      key={macro.key}
                      title={macro.label}
                      unit={macro.unit}
                      value={macro.value}
                      percent={macro.percent}
                      accentClass={ringAccentClass[macro.key as MacroKey]}
                      icon={
                        macro.key === "calories" ? (
                          <Flame className="h-4 w-4 text-white/70" />
                        ) : macro.key === "carbs_g" ? (
                          <Wheat className="h-4 w-4 text-white/70" />
                        ) : macro.key === "protein_g" ? (
                          <Drumstick className="h-4 w-4 text-white/70" />
                        ) : (
                          <Droplets className="h-4 w-4 text-white/70" />
                        )
                      }
                      onEdit={() => setEditingMacro(macro.key)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    tapLight();
                    setShowReview(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent py-3 text-sm font-semibold text-white/80"
                >
                  <Pencil className="h-4 w-4" />
                  {dict.results.editInputs}
                </button>

                <section className="rounded-2xl bg-white/5 p-4">
                  <h3 className="mb-3 text-lg font-semibold">How to reach your goals</h3>
                  <ul className="space-y-3 text-sm text-white/80">
                    <li className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                      <ShieldCheck className="h-4 w-4 text-lime-200" />
                      Use health scores to improve your routine
                    </li>
                    <li className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                      <Sparkles className="h-4 w-4 text-amber-200" />
                      Track your food daily
                    </li>
                    <li className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                      <Flame className="h-4 w-4 text-orange-300" />
                      Follow your daily calorie recommendation
                    </li>
                    <li className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                      <Wheat className="h-4 w-4 text-sky-200" />
                      Balance your carbs, proteins, and fat
                    </li>
                  </ul>
                </section>

                <section className="space-y-2 text-sm text-white/60">
                  <h3 className="text-white/80">Sources</h3>
                  {resourceLinks.map((source) => (
                    <a
                      key={source.href}
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-lime-200 underline decoration-dotted"
                    >
                      {source.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </section>
              </div>
            </StepShell>
          )}
            </motion.div>
          </AnimatePresence>

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
                <button
                  type="button"
                  onClick={() => {
                    tapLight();
                    setShowReview(false);
                  }}
                  className="text-sm text-neutral-400 underline"
                >
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
                        tapLight();
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

      <EditMacroSheet
        open={Boolean(editingMacro && activeMacroStat)}
        title={sheetTitle}
        unit={sheetUnit}
        values={sheetValues}
        value={sheetValue}
        onApply={(val) => {
          if (editingMacro) {
            applyMacroOverride(editingMacro, val);
          }
        }}
        onRevert={() => {
          if (editingMacro) {
            revertMacroOverride(editingMacro);
          }
        }}
        onClose={() => setEditingMacro(null)}
      />
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
