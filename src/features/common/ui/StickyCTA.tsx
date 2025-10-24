"use client";

import type { ReactNode } from "react";
type StickyCTAProps = {
  label: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

export function StickyCTA({ label, disabled, onClick, className }: StickyCTAProps) {
  return (
    <div className={`sticky bottom-0 z-10 pt-6 ${className ?? ""} relative`}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="rounded-full bg-[hsl(var(--panel-70))] px-4 py-3 shadow-2xl">
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className="w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-neutral-900 shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 disabled:opacity-40"
        >
          {label}
        </button>
      </div>
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}

export default StickyCTA;
