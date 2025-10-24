"use client";

import type { ReactNode } from "react";

type IconBadgeProps = {
  children: ReactNode;
  className?: string;
};

export function IconBadge({ children, className }: IconBadgeProps) {
  const fallback = className ?? "bg-white/10 text-white";
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm ${fallback}`}
    >
      {children}
    </span>
  );
}

export default IconBadge;
