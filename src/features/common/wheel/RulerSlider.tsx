"use client";

import * as React from "react";

function hapticLight() {
  try {
    const haptics = (globalThis as {
      Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred?: (type: string) => void } } };
    })?.Telegram?.WebApp?.HapticFeedback;
    haptics?.impactOccurred?.("light");
  } catch {
    // ignore
  }
  try {
    navigator?.vibrate?.(5);
  } catch {
    // ignore
  }
}

function hapticMedium() {
  try {
    const haptics = (globalThis as {
      Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred?: (type: string) => void } } };
    })?.Telegram?.WebApp?.HapticFeedback;
    haptics?.impactOccurred?.("medium");
  } catch {
    // ignore
  }
  try {
    navigator?.vibrate?.(8);
  } catch {
    // ignore
  }
}

export type RulerSliderProps = {
  value: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

const STEP_PIXEL = 14;
const CANVAS_HEIGHT = 120;
const DECELERATION = 0.0032;

type PointerState = {
  active: boolean;
  startX: number;
  startPosition: number;
  lastX: number;
  lastTime: number;
  velocity: number;
};

export function RulerSlider({
  value,
  onChange,
  onChangeEnd,
  min,
  max,
  step = 1,
  className,
  disabled,
  ariaLabel,
}: RulerSliderProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const pointerStateRef = React.useRef<PointerState>({
    active: false,
    startX: 0,
    startPosition: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const animationRef = React.useRef<number | null>(null);
  const positionRef = React.useRef(0);
  const [position, setPosition] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const lastValueRef = React.useRef<number | null>(null);

  const clampValue = React.useCallback(
    (val: number) => Math.max(min, Math.min(max, val)),
    [max, min]
  );

  const sanitizedStep = React.useMemo(() => (step <= 0 ? 1 : step), [step]);
  const totalSteps = React.useMemo(() => {
    const range = max - min;
    if (range <= 0) return 0;
    return Math.round(range / sanitizedStep);
  }, [max, min, sanitizedStep]);

  const maxOffset = React.useMemo(() => totalSteps * STEP_PIXEL, [totalSteps]);

  const decimals = React.useMemo(() => {
    const decimal = sanitizedStep.toString().split(".")[1];
    return decimal ? decimal.length : 0;
  }, [sanitizedStep]);

  const clampPosition = React.useCallback(
    (pos: number) => {
      if (maxOffset <= 0) return 0;
      return Math.max(0, Math.min(maxOffset, pos));
    },
    [maxOffset]
  );

  const offsetToValue = React.useCallback(
    (offset: number) => min + (offset / STEP_PIXEL) * sanitizedStep,
    [min, sanitizedStep]
  );

  const snapValue = React.useCallback(
    (input: number) => {
      const clamped = clampValue(input);
      const stepsFromMin = Math.round((clamped - min) / sanitizedStep);
      const snapped = min + stepsFromMin * sanitizedStep;
      const fixed = Number(snapped.toFixed(decimals));
      return clampValue(fixed);
    },
    [clampValue, decimals, min, sanitizedStep]
  );

  const valueToOffset = React.useCallback(
    (val: number) => {
      const snapped = snapValue(val);
      const offset = ((snapped - min) / sanitizedStep) * STEP_PIXEL;
      return clampPosition(offset);
    },
    [clampPosition, min, sanitizedStep, snapValue]
  );

  const emitValue = React.useCallback(
    (rawValue: number, shouldHaptic: boolean) => {
      const snapped = snapValue(rawValue);
      if (lastValueRef.current === snapped) return snapped;
      lastValueRef.current = snapped;
      if (shouldHaptic) hapticLight();
      onChange(snapped);
      return snapped;
    },
    [onChange, snapValue]
  );

  const updatePosition = React.useCallback(
    (next: number, options?: { emit?: boolean; haptic?: boolean }) => {
      const { emit = true, haptic = true } = options ?? {};
      const clamped = clampPosition(next);
      if (positionRef.current === clamped) {
        if (emit) emitValue(offsetToValue(clamped), false);
        return;
      }
      positionRef.current = clamped;
      setPosition(clamped);
      if (emit) emitValue(offsetToValue(clamped), haptic);
    },
    [clampPosition, emitValue, offsetToValue]
  );

  const stopInertia = React.useCallback(() => {
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const snapToNearest = React.useCallback(() => {
    const snappedValue = snapValue(offsetToValue(positionRef.current));
    const snappedOffset = valueToOffset(snappedValue);
    positionRef.current = snappedOffset;
    setPosition(snappedOffset);
    emitValue(snappedValue, false);
    hapticMedium();
    onChangeEnd?.(snappedValue);
  }, [emitValue, offsetToValue, onChangeEnd, snapValue, valueToOffset]);

  const startInertia = React.useCallback(
    (initialVelocity: number) => {
      if (Math.abs(initialVelocity) < 0.02) {
        snapToNearest();
        return;
      }
      stopInertia();
      let velocity = initialVelocity;
      let lastTimestamp: number | null = null;
      const tick = (timestamp: number) => {
        if (lastTimestamp == null) {
          lastTimestamp = timestamp;
          animationRef.current = requestAnimationFrame(tick);
          return;
        }
        const delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        const displacement = velocity * delta;
        if (displacement !== 0) {
          const next = clampPosition(positionRef.current + displacement);
          updatePosition(next, { emit: true, haptic: false });
          if (next === 0 || next === maxOffset) {
            velocity = 0;
          }
        }
        const decel = DECELERATION * delta;
        if (Math.abs(velocity) <= decel) {
          velocity = 0;
        } else {
          velocity -= Math.sign(velocity) * decel;
        }
        if (velocity === 0) {
          animationRef.current = null;
          snapToNearest();
          return;
        }
        animationRef.current = requestAnimationFrame(tick);
      };
      animationRef.current = requestAnimationFrame(tick);
    },
    [clampPosition, maxOffset, snapToNearest, stopInertia, updatePosition]
  );

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => setContainerWidth(el.clientWidth);
    updateWidth();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  React.useEffect(() => {
    if (totalSteps === 0) {
      positionRef.current = 0;
      setPosition(0);
      lastValueRef.current = snapValue(clampValue(value));
      return;
    }
    const clampedValue = clampValue(value);
    const snapped = snapValue(clampedValue);
    lastValueRef.current = snapped;
    const nextOffset = valueToOffset(snapped);
    positionRef.current = nextOffset;
    setPosition(nextOffset);
  }, [clampValue, snapValue, totalSteps, value, valueToOffset]);

  const sidePadding = React.useMemo(() => Math.max(160, containerWidth / 2 + 48), [containerWidth]);
  const tapeWidth = React.useMemo(() => Math.max(0, sidePadding * 2 + maxOffset), [maxOffset, sidePadding]);

  const computeMajorSteps = React.useCallback(() => {
    if (totalSteps <= 0) return 1;
    const range = max - min;
    if (range <= 0) return 1;
    const desiredTicks = 7;
    const niceNumber = (value: number, round: boolean) => {
      const exponent = Math.floor(Math.log10(value));
      const fraction = value / Math.pow(10, exponent);
      let niceFraction: number;
      if (round) {
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3) niceFraction = 2;
        else if (fraction < 7) niceFraction = 5;
        else niceFraction = 10;
      } else {
        if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
      }
      return niceFraction * Math.pow(10, exponent);
    };
    const niceRange = niceNumber(range, false);
    const spacing = niceNumber(niceRange / (desiredTicks - 1), true);
    const aligned = Math.max(sanitizedStep, Math.round(spacing / sanitizedStep) * sanitizedStep);
    const steps = Math.max(1, Math.round(aligned / sanitizedStep));
    return steps;
  }, [max, min, sanitizedStep, totalSteps]);

  const majorSteps = React.useMemo(() => computeMajorSteps(), [computeMajorSteps]);

  const mediumSteps = React.useMemo(() => {
    if (majorSteps <= 1) return majorSteps;
    if (majorSteps % 5 === 0) return majorSteps / 5;
    if (majorSteps % 4 === 0) return majorSteps / 4;
    if (majorSteps % 2 === 0) return majorSteps / 2;
    return majorSteps;
  }, [majorSteps]);

  const drawTape = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drawingWidth = tapeWidth;
    if (drawingWidth === 0) return;
    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(drawingWidth * ratio);
    canvas.height = Math.round(CANVAS_HEIGHT * ratio);
    canvas.style.width = `${drawingWidth}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, drawingWidth, CANVAS_HEIGHT);
    context.scale(ratio, ratio);

    const baseline = CANVAS_HEIGHT - 52;
    context.fillStyle = "rgba(255,255,255,0.03)";
    context.fillRect(0, baseline, drawingWidth, CANVAS_HEIGHT - baseline);

    context.strokeStyle = "rgba(255,255,255,0.08)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, baseline);
    context.lineTo(drawingWidth, baseline);
    context.stroke();

    for (let stepIndex = 0; stepIndex <= totalSteps; stepIndex += 1) {
      const x = sidePadding + stepIndex * STEP_PIXEL;
      const isMajor = stepIndex % majorSteps === 0;
      const isMedium = !isMajor && mediumSteps !== majorSteps && stepIndex % mediumSteps === 0;
      const tickHeight = isMajor ? 40 : isMedium ? 26 : 18;
      context.beginPath();
      context.lineWidth = isMajor ? 2 : 1;
      context.strokeStyle = isMajor ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)";
      context.moveTo(x, baseline - tickHeight);
      context.lineTo(x, baseline);
      context.stroke();

      if (isMajor) {
        const valueForLabel = min + stepIndex * sanitizedStep;
        const label =
          decimals === 0 && Number.isInteger(valueForLabel)
            ? String(Math.round(valueForLabel))
            : valueForLabel.toFixed(decimals);
        context.font = "500 14px \"SF Pro Text\",\"Helvetica Neue\",\"Segoe UI\",sans-serif";
        context.fillStyle = "rgba(255,255,255,0.82)";
        context.textAlign = "center";
        context.textBaseline = "top";
        context.fillText(label, x, baseline + 8);
      }
    }
  }, [decimals, majorSteps, mediumSteps, min, sanitizedStep, sidePadding, tapeWidth, totalSteps]);

  React.useEffect(() => {
    drawTape();
  }, [drawTape]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    stopInertia();
    event.preventDefault();
    const state = pointerStateRef.current;
    state.active = true;
    state.startX = event.clientX;
    state.startPosition = positionRef.current;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
    state.velocity = 0;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    containerRef.current?.focus({ preventScroll: true });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const state = pointerStateRef.current;
    if (!state.active) return;
    event.preventDefault();
    const delta = event.clientX - state.startX;
    updatePosition(state.startPosition + delta, { emit: true, haptic: true });
    const dt = event.timeStamp - state.lastTime;
    if (dt > 0) {
      const velocity = (event.clientX - state.lastX) / dt;
      state.velocity = velocity;
      state.lastX = event.clientX;
      state.lastTime = event.timeStamp;
    }
  };

  const completePointerGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    if (!state.active) return;
    state.active = false;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
    const clampedVelocity = Math.max(-1.5, Math.min(1.5, state.velocity));
    if (Math.abs(clampedVelocity) > 0.05) {
      startInertia(clampedVelocity);
    } else {
      snapToNearest();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    completePointerGesture(event);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    completePointerGesture(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let multiplier = 0;
    if (event.key === "ArrowLeft") {
      multiplier = -1;
    } else if (event.key === "ArrowRight") {
      multiplier = 1;
    } else if (event.key === "PageUp") {
      multiplier = -5;
    } else if (event.key === "PageDown") {
      multiplier = 5;
    } else if (event.key === "Home") {
      event.preventDefault();
      const snapped = snapValue(min);
      const offset = valueToOffset(snapped);
      positionRef.current = offset;
      setPosition(offset);
      emitValue(snapped, true);
      onChangeEnd?.(snapped);
      return;
    } else if (event.key === "End") {
      event.preventDefault();
      const snapped = snapValue(max);
      const offset = valueToOffset(snapped);
      positionRef.current = offset;
      setPosition(offset);
      emitValue(snapped, true);
      onChangeEnd?.(snapped);
      return;
    } else {
      return;
    }
    event.preventDefault();
    const currentValue =
      lastValueRef.current ?? snapValue(offsetToValue(positionRef.current));
    const nextValue = snapValue(currentValue + multiplier * sanitizedStep);
    const offset = valueToOffset(nextValue);
    positionRef.current = offset;
    setPosition(offset);
    emitValue(nextValue, true);
    onChangeEnd?.(nextValue);
  };

  React.useEffect(
    () => () => {
      stopInertia();
    },
    [stopInertia]
  );

  const translateX = React.useMemo(() => {
    if (tapeWidth === 0) return 0;
    return containerWidth / 2 - (sidePadding + position);
  }, [containerWidth, position, sidePadding, tapeWidth]);

  const caretClasses =
    "pointer-events-none absolute inset-y-6 left-1/2 z-20 w-[3px] -translate-x-1/2 rounded-full bg-accent-500 shadow-[0_0_12px_rgba(163,247,191,0.45)]";

  const gradientClass =
    "pointer-events-none absolute inset-y-0 w-16 z-10";

  const tapeStyle: React.CSSProperties = {
    width: tapeWidth,
    transform: `translate3d(${translateX}px, 0, 0)`,
  };

  const rootClassName = `relative w-full select-none ${className ?? ""} ${disabled ? "opacity-60" : ""}`;

  return (
    <div className={rootClassName}>
      <div
        ref={containerRef}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={snapValue(offsetToValue(positionRef.current))}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className={`relative h-28 overflow-hidden rounded-3xl bg-[hsl(var(--panel-70))] backdrop-blur-sm ${
          isDragging ? "ring-2 ring-accent-500/40" : ""
        }`}
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
      >
        <div className={caretClasses} aria-hidden />
        <div className={`${gradientClass} left-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent`} aria-hidden />
        <div className={`${gradientClass} right-0 bg-gradient-to-l from-neutral-950 via-neutral-950/70 to-transparent`} aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-neutral-950/70 via-transparent to-transparent" aria-hidden />
        <div className="absolute inset-0" style={tapeStyle}>
          <canvas ref={canvasRef} aria-hidden />
        </div>
      </div>
    </div>
  );
}

export default RulerSlider;
