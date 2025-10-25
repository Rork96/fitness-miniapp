"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeft, Globe2, ExternalLink } from "lucide-react";
import { useHaptics } from "@/lib/useHaptics";
import { cn } from "@/lib/cn";

type StepShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  back?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  progress?: number;
  localeLabel?: string;
  onToggleLocale?: () => void;
  centerContent?: boolean;
  toolsHref?: string;
  toolsLabel?: string;
};

export function StepShell({
  title,
  subtitle,
  children,
  back,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  progress,
  localeLabel = "EN / UA",
  onToggleLocale,
  centerContent,
  toolsHref,
  toolsLabel = "Tools",
}: StepShellProps) {
  const { tapLight } = useHaptics();
  const clampedProgress = typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : null;

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-gradient-to-b from-[#0c1117] to-[#0a0f14] text-white">
      <div className="sticky top-0 z-20 mx-4 flex items-center justify-between gap-2 pb-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button
          aria-label="Back"
          onClick={() => {
            if (!back) return;
            tapLight();
            back();
          }}
          disabled={!back}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {toolsHref ? (
            <Link
              href={toolsHref}
              onClick={() => tapLight()}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/5 ring-1 ring-white/10 text-white transition hover:bg-white/10"
              aria-label={toolsLabel}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              tapLight();
              onToggleLocale?.();
            }}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white"
          >
            <Globe2 className="h-4 w-4" />
            {localeLabel}
          </button>
        </div>
      </div>

      {clampedProgress !== null && (
        <div className="mx-auto mb-4 h-[2px] w-[calc(100%-32px)] max-w-[366px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#8ee000] transition-[width]"
            style={{ width: `${Math.round(clampedProgress * 100)}%` }}
          />
        </div>
      )}

      <div className="px-5 pb-[120px]">
        <h1 className="mb-2 text-[clamp(1.75rem,6vw,2.35rem)] font-black leading-tight">{title}</h1>
        {subtitle && <p className="mb-6 text-sm text-neutral-400">{subtitle}</p>}
        <div
          className={cn(
            "mt-4",
            centerContent ? "grid min-h-[60vh] place-items-center" : ""
          )}
        >
          {children}
        </div>
      </div>

      {onNext && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
          <div className="pointer-events-auto mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3">
            <button
              onClick={() => {
                tapLight();
                onNext();
              }}
              disabled={nextDisabled}
              className="h-14 w-full rounded-full bg-[#8ee000] text-lg font-bold text-black shadow-[0_10px_30px_rgba(142,224,0,0.35)] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {nextLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
