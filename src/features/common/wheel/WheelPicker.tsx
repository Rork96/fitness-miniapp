"use client";

import * as React from "react";
import "./WheelPicker.css";
import { hapticTick } from "./haptics";

export type WheelValue = number | string;

export type WheelPickerProps = {
  values: WheelValue[];
  value: WheelValue;
  onChange: (value: WheelValue) => void;
  visibleCount?: number;
  ariaLabel?: string;
};

export type DualWheelProps = {
  value: { major: number; minor: number };
  majorValues: number[];
  minorValues: number[];
  onChange: (value: { major: number; minor: number }) => void;
  majorLabel?: string;
  minorLabel?: string;
  ariaLabelMajor?: string;
  ariaLabelMinor?: string;
};

const ROW_HEIGHT = 44;
const DEFAULT_VISIBLE_ROWS = 7;
const SNAP_DELAY_MS = 120;
const PROGRAMMATIC_SCROLL_RESET_MS = 220;

export function WheelPicker({ values, value, onChange, visibleCount = DEFAULT_VISIBLE_ROWS, ariaLabel }: WheelPickerProps) {
  const sanitizedRows = visibleCount % 2 === 0 ? visibleCount + 1 : visibleCount;
  const lensOffset = Math.floor(sanitizedRows / 2) * ROW_HEIGHT;
  const listboxId = React.useId();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const snapTimeoutRef = React.useRef<number | null>(null);
  const programmaticScrollRef = React.useRef(false);
  const highlightIndexRef = React.useRef(0);
  const lastReportedValueRef = React.useRef<WheelValue | null>(null);

  const clampIndex = React.useCallback(
    (index: number) => {
      if (values.length === 0) return 0;
      return Math.max(0, Math.min(values.length - 1, index));
    },
    [values.length]
  );

  const initialIndex = React.useMemo(() => {
    if (values.length === 0) return 0;
    const found = values.findIndex((item) => item === value);
    return clampIndex(found === -1 ? 0 : found);
  }, [clampIndex, value, values]);

  const [highlightIndex, setHighlightIndex] = React.useState(initialIndex);

  highlightIndexRef.current = highlightIndex;

  const emitChange = React.useCallback(
    (index: number) => {
      const clamped = clampIndex(index);
      const nextValue = values[clamped];
      if (nextValue === undefined) return;
      if (lastReportedValueRef.current === nextValue) return;
      lastReportedValueRef.current = nextValue;
      hapticTick();
      onChange(nextValue);
    },
    [clampIndex, onChange, values]
  );

  const scrollToIndex = React.useCallback(
    (index: number, smooth = true) => {
      const container = containerRef.current;
      if (!container) return;
      const clamped = clampIndex(index);
      programmaticScrollRef.current = true;
      container.scrollTo({ top: clamped * ROW_HEIGHT, behavior: smooth ? "smooth" : "auto" });
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, PROGRAMMATIC_SCROLL_RESET_MS);
    },
    [clampIndex]
  );

  const snapToIndex = React.useCallback(
    (index: number) => {
      const clamped = clampIndex(index);
      scrollToIndex(clamped);
      setHighlightIndex(clamped);
      highlightIndexRef.current = clamped;
      emitChange(clamped);
    },
    [clampIndex, emitChange, scrollToIndex]
  );

  const scheduleSnap = React.useCallback(
    (index: number) => {
      if (snapTimeoutRef.current) {
        window.clearTimeout(snapTimeoutRef.current);
      }
      snapTimeoutRef.current = window.setTimeout(() => snapToIndex(index), SNAP_DELAY_MS);
    },
    [snapToIndex]
  );

  const handleScroll = React.useCallback(() => {
    if (programmaticScrollRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const rawIndex = container.scrollTop / ROW_HEIGHT;
      const nextIndex = clampIndex(Math.round(rawIndex));
      if (highlightIndexRef.current !== nextIndex) {
        hapticTick();
        highlightIndexRef.current = nextIndex;
        setHighlightIndex(nextIndex);
      }
      scheduleSnap(nextIndex);
    });
  }, [clampIndex, scheduleSnap]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  React.useEffect(() => {
    if (values.length === 0) return;
    const nextIndex = initialIndex;
    lastReportedValueRef.current = values[nextIndex] ?? null;
    setHighlightIndex(nextIndex);
    highlightIndexRef.current = nextIndex;
    scrollToIndex(nextIndex, false);
  }, [initialIndex, scrollToIndex, values]);

  React.useEffect(
    () => () => {
      if (snapTimeoutRef.current) window.clearTimeout(snapTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  React.useEffect(() => {
    if (values.length === 0) return;
    const nextIndex = clampIndex(values.findIndex((item) => item === value));
    lastReportedValueRef.current = values[nextIndex] ?? null;
    if (nextIndex === highlightIndexRef.current) return;
    setHighlightIndex(nextIndex);
    highlightIndexRef.current = nextIndex;
    scrollToIndex(nextIndex);
  }, [clampIndex, scrollToIndex, value, values]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let delta = 0;
    switch (event.key) {
      case "ArrowUp":
        delta = -1;
        break;
      case "ArrowDown":
        delta = 1;
        break;
      case "PageUp":
        delta = -3;
        break;
      case "PageDown":
        delta = 3;
        break;
      case "Home":
        snapToIndex(0);
        event.preventDefault();
        return;
      case "End":
        snapToIndex(values.length - 1);
        event.preventDefault();
        return;
      default:
        return;
    }
    event.preventDefault();
    if (delta === 0) return;
    snapToIndex(highlightIndexRef.current + delta);
  };

  if (values.length === 0) {
    return <div className="relative" style={{ "--rows": String(sanitizedRows), "--rowH": `${ROW_HEIGHT}px` } as React.CSSProperties} />;
  }

  const overscan = Math.max(3, sanitizedRows);
  const startIndex = Math.max(0, highlightIndex - overscan);
  const endIndex = Math.min(values.length - 1, highlightIndex + overscan);
  const topSpacer = startIndex * ROW_HEIGHT;
  const bottomSpacer = Math.max(0, (values.length - 1 - endIndex) * ROW_HEIGHT);

  return (
    <div
      className="relative"
      style={{ "--rows": String(sanitizedRows), "--rowH": `${ROW_HEIGHT}px` } as React.CSSProperties}
    >
      <div
        ref={containerRef}
        role="listbox"
        aria-orientation="vertical"
        aria-label={ariaLabel}
        aria-activedescendant={`${listboxId}-option-${highlightIndex}`}
        tabIndex={0}
        className="wheel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
        style={{ paddingTop: lensOffset, paddingBottom: lensOffset }}
        onKeyDown={handleKeyDown}
      >
        <div style={{ height: topSpacer }} aria-hidden />
        {Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => {
          const itemIndex = startIndex + offset;
          const itemValue = values[itemIndex];
          const isActive = itemIndex === highlightIndex;
          const itemClass = `wheel__item text-lg ${
            isActive ? "text-white font-semibold opacity-100 scale-100" : "text-white opacity-40 scale-[0.96]"
          }`;
          return (
            <div
              key={`${listboxId}-${itemIndex}`}
              id={`${listboxId}-option-${itemIndex}`}
              role="option"
              aria-selected={isActive}
              className={itemClass}
            >
              {typeof itemValue === "string" ? itemValue : itemValue.toString()}
            </div>
          );
        })}
        <div style={{ height: bottomSpacer }} aria-hidden />
      </div>
      <div className="wheel__lens ring-1 ring-white/30" aria-hidden />
    </div>
  );
}

export function DualWheel({
  value,
  majorValues,
  minorValues,
  onChange,
  majorLabel,
  minorLabel,
  ariaLabelMajor,
  ariaLabelMinor,
}: DualWheelProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-1 text-center">
        <WheelPicker
          values={majorValues}
          value={value.major}
          onChange={(nextMajor) => onChange({ major: Number(nextMajor), minor: value.minor })}
          visibleCount={7}
          ariaLabel={ariaLabelMajor ?? majorLabel}
        />
        {majorLabel && <div className="mt-2 text-xs opacity-70">{majorLabel}</div>}
      </div>
      <div className="flex-1 text-center">
        <WheelPicker
          values={minorValues}
          value={value.minor}
          onChange={(nextMinor) => onChange({ major: value.major, minor: Number(nextMinor) })}
          visibleCount={7}
          ariaLabel={ariaLabelMinor ?? minorLabel}
        />
        {minorLabel && <div className="mt-2 text-xs opacity-70">{minorLabel}</div>}
      </div>
    </div>
  );
}

export default WheelPicker;
