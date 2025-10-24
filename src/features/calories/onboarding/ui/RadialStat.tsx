"use client";

import type { ReactNode } from "react";

type RadialStatProps = {
  percent: number;
  strokeClassName: string;
  children?: ReactNode;
  size?: number;
  strokeWidth?: number;
  trackClassName?: string;
};

export function RadialStat({
  percent,
  strokeClassName,
  children,
  size = 112,
  strokeWidth = 10,
  trackClassName = "text-white/12",
}: RadialStatProps) {
  const clamped = Math.min(1, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="-rotate-90 transform text-white/12"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          className={trackClassName}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className={`transition-all duration-500 ease-out ${strokeClassName}`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export default RadialStat;
