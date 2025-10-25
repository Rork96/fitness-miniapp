"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { PROFILE_STORAGE_KEY } from "@/features/calories/onboarding/constants";

type Locale = "en" | "uk";

const copy: Record<
  Locale,
  {
    heading: string;
    subtitle: string;
    back: string;
    items: Array<{ label: string; href: string; description: string }>;
  }
> = {
  en: {
    heading: "Tools",
    subtitle: "Jump to any area and continue exploring.",
    back: "Back to onboarding",
    items: [
      {
        label: "Calories onboarding",
        href: "/calories",
        description: "Update answers or restart the flow.",
      },
      {
        label: "Course tools",
        href: "/course/tools",
        description: "Demo actions for daily routines.",
      },
      {
        label: "Progress dashboard",
        href: "/course/progress",
        description: "Track training history and insights.",
      },
    ],
  },
  uk: {
    heading: "Інструменти",
    subtitle: "Переходьте до будь-якого розділу й продовжуйте роботу.",
    back: "Назад до онбордингу",
    items: [
      {
        label: "Онбординг калорій",
        href: "/calories",
        description: "Оновити відповіді або пройти заново.",
      },
      {
        label: "Інструменти курсу",
        href: "/course/tools",
        description: "Демо-дії для щоденних сценаріїв.",
      },
      {
        label: "Дашборд прогресу",
        href: "/course/progress",
        description: "Відстежити історію тренувань та інсайти.",
      },
    ],
  },
};

export default function ToolsPage() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { locale?: Locale };
      if (parsed?.locale === "uk" || parsed?.locale === "en") {
        setLocale(parsed.locale);
      }
    } catch {
      // ignore storage parsing issues
    }
  }, []);

  const t = copy[locale];

  return (
    <main className="min-h-dvh bg-[#05090d] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-[calc(env(safe-area-inset-top)+24px)]">
        <header className="mb-6 flex items-center justify-between">
          <Link
            href="/calories"
            className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.back}
          </Link>
          <span className="text-sm font-semibold uppercase tracking-[0.24em] text-white/50">{t.heading}</span>
          <span className="w-12" />
        </header>

        <p className="mb-6 text-sm text-white/60">{t.subtitle}</p>

        <div className="grid gap-4">
          {t.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:border-white/20 hover:bg-white/[0.12]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-white">{item.label}</div>
                  <p className="mt-1 text-xs text-white/60">{item.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-white/50 transition group-hover:text-white/80" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
