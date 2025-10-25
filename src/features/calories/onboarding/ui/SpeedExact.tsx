"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type ZoneKey = "slow" | "recommended" | "aggressive";

type RangeConfig = {
  min: number;
  max: number;
  step: number;
};

type ZoneConfig = {
  slow: number;
  recommended: number;
  aggressive: number;
};

type Labels = Partial<Record<ZoneKey, string>>;

export type Props = {
  value: number;
  onChange: (v: number) => void;
  unit: "kg" | "lbs";
  range: RangeConfig;
  zones: ZoneConfig;
  labels?: Labels;
  unitLabel?: string;
  recommendedLabel?: string;
  tickLabels?: [number, number, number];
};

const EMOJIS: Record<ZoneKey, string> = {
  slow: "🦥",
  recommended: "🐇",
  aggressive: "🐆",
};

const DEFAULT_LABELS: Labels = {
  slow: "Slow",
  recommended: "Recommended",
  aggressive: "Aggressive",
};

const DEFAULT_UNIT_LABEL: Record<"kg" | "lbs", string> = {
  kg: "kg/week",
  lbs: "lbs/week",
};

const buzz = (pattern?: number | number[]) => {
  try {
    if (typeof navigator !== "undefined") {
      navigator?.vibrate?.(pattern ?? 8);
    }
  } catch {
    // ignore unsupported environments
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const zoneKey = (value: number, config: ZoneConfig): ZoneKey => {
  const entries: Array<[ZoneKey, number]> = [
    ["slow", config.slow],
    ["recommended", config.recommended],
    ["aggressive", config.aggressive],
  ];
  return entries.reduce((closest, candidate) => {
    const [, currentValue] = closest;
    const [, candidateValue] = candidate;
    return Math.abs(candidateValue - value) < Math.abs(currentValue - value) ? candidate : closest;
  })[0];
};

export function SpeedExact({
  value,
  onChange,
  unit,
  range,
  zones,
  labels,
  unitLabel,
  recommendedLabel,
  tickLabels,
}: Props) {
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const resolvedUnitLabel = unitLabel ?? DEFAULT_UNIT_LABEL[unit];
  const marks = tickLabels ?? [range.min, zones.recommended, range.max];

  const activeZone = useMemo(() => zoneKey(value, zones), [value, zones]);
  const previousZoneRef = useRef<ZoneKey>(activeZone);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousZoneRef.current = activeZone;
      return;
    }

    if (previousZoneRef.current !== activeZone) {
      previousZoneRef.current = activeZone;
      buzz([8, 20, 8]);
    }
  }, [activeZone]);

  const handleValueChange = (nextValue: number) => {
    const snapped = Number((Math.round(nextValue / range.step) * range.step).toFixed(1));
    const clamped = clamp(snapped, range.min, range.max);
    if (clamped !== value) {
      buzz(8);
      onChange(clamped);
    }
  };

  const handleRecommended = () => {
    const recommended = Number(zones.recommended.toFixed(1));
    handleValueChange(recommended);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="grid w-full grid-cols-3 items-center px-2">
        {(Object.keys(EMOJIS) as ZoneKey[]).map((key) => {
          const active = key === activeZone;
          return (
            <div
              key={key}
              className={cn(
                "flex flex-col items-center gap-2 transition duration-300",
                active ? "opacity-100" : "opacity-40"
              )}
            >
              <motion.span
                animate={{
                  scale: active ? [1, 1.14, 0.94, 1.1] : 1,
                }}
                transition={{
                  duration: active ? 0.5 : 0.2,
                  ease: active ? "easeInOut" : "linear",
                }}
                className={cn(
                  "text-4xl",
                  active ? "drop-shadow-[0_8px_12px_rgba(142,224,0,0.35)]" : ""
                )}
              >
                {EMOJIS[key]}
              </motion.span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {resolvedLabels[key]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <div className="text-sm uppercase tracking-wide text-white/50">{resolvedUnitLabel}</div>
        <div
          className="mt-2 font-black leading-none text-[clamp(2.5rem,8vw,3.5rem)]"
          data-testid="speed-value"
        >
          {value.toFixed(1)}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 px-1">
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          aria-label="Weekly speed"
          value={value}
          onChange={(event) => handleValueChange(Number(event.target.value))}
          data-testid="speed-slider"
          className="h-2 w-full appearance-none rounded-full bg-white/15
            accent-white
            [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10
            [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/10
            [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/70 [&::-webkit-slider-thumb]:bg-white
            [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white/70 [&::-moz-range-thumb]:bg-white"
        />
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
          <span>{marks[0].toFixed(1)}</span>
          <span>{marks[1].toFixed(1)}</span>
          <span>{marks[2].toFixed(1)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRecommended}
        className="rounded-full bg-gradient-to-r from-lime-300 via-emerald-300 to-lime-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black shadow-[0_10px_30px_rgba(142,224,0,0.35)] transition hover:brightness-110 active:scale-[0.99]"
      >
        {recommendedLabel ?? resolvedLabels.recommended}
      </button>
    </div>
  );
}

export default SpeedExact;
