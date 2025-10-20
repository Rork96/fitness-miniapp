

"use client";

import Link from "next/link";
import {
  Joystick as IconJoystick,
  CalendarDays as IconCalendarDays,
  Calculator as IconCalculator,
  GraduationCap as IconGraduationCap,
} from "lucide-react";

type Tab = "course" | "progress" | "tools" | "knowledge";
type Props = { active: Tab };

/**
 * Unified bottom navigation bar used across all /course pages.
 * Matches the rounded, glassy style from the latest mock:
 *  - semi-transparent background
 *  - icon-only buttons
 *  - active item: bright icon + white dot indicator
 *  - safe-area aware for iOS
 */
export default function BottomBar({ active }: Props) {
  const Item = ({
    name,
    href,
    Icon,
    label,
  }: {
    name: Tab;
    href: string;
    Icon: React.ComponentType<React.ComponentProps<"svg"> & { size?: number }>;
    label: string;
  }) => {
    const isActive = active === name;
    return (
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        aria-label={label}
        className="group rounded-2xl px-6 py-3 text-center outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
      >
        <div className="flex flex-col items-center justify-center">
          <Icon
            size={26}
            className={isActive ? "text-white" : "text-white/45 group-hover:text-white/80"}
          />
          <span
            className={`mt-1 h-2 w-2 rounded-full ${isActive ? "bg-white" : "bg-transparent"}`}
          />
        </div>
      </Link>
    );
  };

  return (
    <nav
      role="navigation"
      className="fixed bottom-0 left-0 right-0 z-40"
    >
      <div className="mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
          <div className="grid grid-cols-4 place-items-stretch">
            <Item name="course" href="/course" Icon={IconJoystick} label="Тренування" />
            <Item name="progress" href="/course/progress" Icon={IconCalendarDays} label="Щоденник" />
            <Item name="tools" href="/course/tools" Icon={IconCalculator} label="Розрахунки" />
            <Item name="knowledge" href="/course/knowledge" Icon={IconGraduationCap} label="База знань" />
          </div>
        </div>
      </div>
    </nav>
  );
}