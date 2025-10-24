"use client";

import type { ReactNode } from "react";

type SegmentedTabsProps<T> = {
  items: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string | number>({ items, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div className="flex rounded-2xl bg-[hsl(var(--panel))] p-1">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={String(item.value)}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex-1 rounded-2xl py-2 text-sm font-semibold transition ${
              active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

type CardOptionProps = {
  title: string;
  description?: string;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
};

export function CardOption({ title, description, active, onClick, icon }: CardOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-3xl border px-4 py-4 text-left transition ${
        active
          ? "border-accent-500/40 bg-white text-neutral-900 shadow-lg"
          : "border-transparent bg-[hsl(var(--panel))] text-white"
      }`}
    >
      {icon && <span className="mt-1 text-accent-500">{icon}</span>}
      <span className="flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        {description && <span className="block text-sm opacity-80">{description}</span>}
      </span>
    </button>
  );
}

type ChecklistOptionProps = CardOptionProps & { checked: boolean };

export function ChecklistOption({ title, description, checked, onClick, icon }: ChecklistOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-3xl border px-4 py-4 text-left transition ${
        checked
          ? "border-accent-500/40 bg-white text-neutral-900 shadow-lg"
          : "border-transparent bg-[hsl(var(--panel))] text-white"
      }`}
    >
      {icon && <span className="mt-1 text-accent-500">{icon}</span>}
      <span className="flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        {description && <span className="block text-sm opacity-80">{description}</span>}
      </span>
      <span
        className={`mt-1 h-6 w-6 rounded-full border ${checked ? "border-accent-500 bg-accent-500 text-neutral-900" : "border-neutral-600"}`}
        aria-hidden
      />
    </button>
  );
}

type ToggleCardProps = {
  title: string;
  active?: boolean;
  onClick?: () => void;
};

export function ToggleCard({ title, active, onClick }: ToggleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
        active
          ? "border-accent-500/40 bg-white text-neutral-900 shadow"
          : "border-transparent bg-[hsl(var(--panel))] text-neutral-100"
      }`}
    >
      {title}
    </button>
  );
}
