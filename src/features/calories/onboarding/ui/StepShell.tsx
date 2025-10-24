"use client";

import type { ReactNode } from "react";

type StepShellProps = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  topRight?: ReactNode;
  backLabel: string;
  onBack?: () => void;
  canGoBack?: boolean;
  progress: number;
};

export function StepShell({
  title,
  subtitle,
  children,
  topRight,
  onBack,
  canGoBack = true,
  progress,
  backLabel,
}: StepShellProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack ?? (() => undefined)}
            disabled={!canGoBack}
            className="rounded-full bg-[hsl(var(--panel))] px-4 py-2 text-sm font-semibold text-neutral-200 transition disabled:opacity-40"
          >
            {backLabel}
          </button>
          {topRight}
        </div>
        <div className="h-[3px] w-full rounded bg-white/10">
          <div
            className="h-full rounded bg-accent-500 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-6 flex-1 overflow-y-auto pb-8">{children}</div>
    </div>
  );
}
