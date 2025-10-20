 "use client";
import Link from "next/link";
import BottomBar from "@/components/BottomBar";
function getVariantsForDay(day:number){
  try{
    const rawBI = localStorage.getItem(`variants_${day}_byIndex`);
    if (rawBI) return JSON.parse(rawBI);
    const raw = localStorage.getItem(`variants_${day}`);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj?.byIndex) return obj.byIndex;
    const map: Record<string,string> = {};
    Object.entries(obj).forEach(([k,v]: any) => {
      const idx = String(k).split("_").pop();
      if (idx !== undefined) map[idx] = String(v);
    });
    return map;
  }catch{ return {}; }
}
function getPlannedSets(day:number): number[] {
  try{
    const raw = localStorage.getItem("program_sets");
    const obj = raw ? JSON.parse(raw) : null;
    const arr = obj?.[String(day)];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays as IconCalendarDays,
  Joystick as IconJoystick,
  CalendarDays,
  Calculator as IconCalculator,
  GraduationCap as IconGraduationCap,
  ArrowRight as IconArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Utilities
 */
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Map date -> program day number (1..3) by weekday: Mon=1, Wed=2, Fri=3
function mapDateToProgramDay(dt: Date): number | null {
  const wd = dt.getDay(); // 0 Sun ... 6 Sat
  if (wd === 1) return 1; // Mon
  if (wd === 3) return 2; // Wed
  if (wd === 5) return 3; // Fri
  return null;
}

// Flatten exercise titles for a program day
function flattenExercises(day: number): string[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("program_days");
      if (raw) {
        const days = JSON.parse(raw);
        if (days && typeof days === "object" && Array.isArray(days[String(day)])) {
          return days[String(day)];
        }
      }
    } catch {}
  }
  // fallback if nothing is saved yet
  return ["Вправа 1", "Вправа 2", "Вправа 3"];
}

// Helper: goToLogIntent - sets localStorage and navigates to lessons
function goToLogIntent(router: any, dateKey: string, programDay: number, exId: number) {
  try {
    localStorage.setItem("open_log_intent", JSON.stringify({ date: dateKey, day: programDay, exId }));
  } catch {}
  router.push("/course");
}

type MonthMatrixCell = {
  date: Date | null;   // null for blanks
  key: string;         // unique key for rendering
};

function buildMonthMatrix(year: number, monthIndex0: number): MonthMatrixCell[] {
  const first = new Date(year, monthIndex0, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon-first (Sun=0 -> 6)
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();

  const cells: MonthMatrixCell[] = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null, key: `b-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, monthIndex0, d);
    cells.push({ date: dt, key: keyOf(dt) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, key: `t-${cells.length}` });
  while (cells.length < 42) cells.push({ date: null, key: `t2-${cells.length}` });
  return cells;
}

type LogRow = { kg: string; reps: string };
type DaySummary = {
  programDay: number | null;
  totalSets: number;
  exercises: {
    title: string;
    sets: number;
    last?: { kg: string; reps: string };
  }[];
};

// Read summary for any real-world date (derives program day by weekday)
function readDaySummaryForDate(dt: Date, opts: { includeLegacy?: boolean } = {}): DaySummary {
  const programDay = mapDateToProgramDay(dt);
  if (!programDay) return { programDay: null, totalSets: 0, exercises: [] };

  const titles = flattenExercises(programDay);
  const variantsByIndex = (typeof window!=="undefined") ? getVariantsForDay(programDay) : {};
  const exercises: DaySummary["exercises"] = [];
  let totalSets = 0;

  if (typeof window !== "undefined") {
    const dKey = keyOf(dt); // YYYY-MM-DD
    titles.forEach((title, idx) => {
      let raw = localStorage.getItem(`log_${dKey}_${programDay}_${idx}`); // NEW per-date
      if (!raw && opts.includeLegacy) {
        // Fallback to legacy (no date) to avoid data loss during transition (used in detail view only)
        raw = localStorage.getItem(`log_${programDay}_${idx}`);
      }
      if (raw) {
        try {
          const rows: LogRow[] = JSON.parse(raw);
          const sets = rows.length;
          totalSets += sets;
          const last = sets > 0 ? rows[rows.length - 1] : undefined;
          exercises.push({ title: (variantsByIndex?.[String(idx)] || title), sets, last });
        } catch {
          exercises.push({ title: (variantsByIndex?.[String(idx)] || title), sets: 0 });
        }
      } else {
        exercises.push({ title: (variantsByIndex?.[String(idx)] || title), sets: 0 });
      }
    });
  }

  return { programDay, totalSets, exercises };
}

// Compute current and best streaks over a rolling window (default 180 days)
function computeStreaks(windowDays = 180) {
  const today = new Date();
  let currentStreak = 0;
  let bestStreak = 0;
  let running = 0;

  for (let i = 0; i < windowDays; i++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - i);
    const sets = readDaySummaryForDate(dt).totalSets;

    if (sets > 0) {
      running += 1;
      if (i === 0) currentStreak = running; // current streak is from today backwards
      bestStreak = Math.max(bestStreak, running);
    } else {
      // break current streak only if we are still near "today" chain
      if (i === 0) currentStreak = 0;
      running = 0;
    }
  }

  return { currentStreak, bestStreak };
}

export default function Progress() {
  const router = useRouter();
  const today = new Date();
  const [monthBase, setMonthBase] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(today);
  const selectedKey = useMemo(() => (selected ? keyOf(selected) : null), [selected]);

  // Recompute streaks on mount and when navigating months (cheap enough)
  const { currentStreak, bestStreak } = useMemo(() => computeStreaks(180), [monthBase]);

  const year = monthBase.getFullYear();
  const month = monthBase.getMonth();
  const matrix = useMemo(() => buildMonthMatrix(year, month), [year, month]);
  const monthName = monthBase.toLocaleDateString("uk-UA", { month: "long", year: "numeric" });

  // Precompute totals for the visible month (for coloring)
  const totalsByKey = useMemo(() => {
    const map: Record<string, number> = {};
    matrix.forEach((cell) => {
      if (!cell.date) return;
      const k = keyOf(cell.date);
      // NO legacy fallback here, only date-keyed logs count for coloring
      map[k] = readDaySummaryForDate(cell.date, { includeLegacy: false }).totalSets;
    });
    return map;
  }, [matrix]);

  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

  // Rebuild details when selected changes
  const summary: DaySummary | null = useMemo(() => {
    if (!selected) return null;
    return readDaySummaryForDate(selected, { includeLegacy: true });
  }, [selected, monthBase]);

  // Focus and scroll the selected day into view
  useEffect(() => {
    if (!selected) return;
    const k = keyOf(selected);
    const el = document.querySelector(`button[data-key="${k}"]`) as HTMLButtonElement | null;
    if (el) {
      // Focus without re-scrolling first, then ensure it's visible smoothly.
      try { el.focus({ preventScroll: true }); } catch {}
      el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }, [selected]);

  // Memoized handler to go to log (and set intent)
  const toLog = useCallback((dateStr: string, day: number, exId: number) => {
    try { localStorage.setItem("open_log_intent", JSON.stringify({ date: dateStr, day, exId })); } catch {}
    router.push("/course");
  }, [router]);

  return (
    <main className="max-w-md mx-auto p-4 space-y-4 pb-28">
      <header className="rounded-2xl bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconCalendarDays className="text-white" size={20} />
            <h1 className="text-xl font-extrabold">Щоденник</h1>
          </div>
          <div className="text-xs opacity-80">
            Серія: <span className="font-semibold">{currentStreak}</span> • Рекорд: <span className="font-semibold">{bestStreak}</span>
          </div>
        </div>
      </header>

      {/* Month navigation */}
      <section className="rounded-2xl bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <button
            className="h-10 w-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white"
            onClick={() => setMonthBase(new Date(year, month - 1, 1))}
            aria-label="Попередній місяць"
          >
            <ChevronLeft size={18} />
          </button>
        <div className="text-lg font-semibold capitalize">{monthName}</div>
          <button
            className="h-10 w-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white"
            onClick={() => setMonthBase(new Date(year, month + 1, 1))}
            aria-label="Наступний місяць"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday header */}
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs opacity-70">
          {weekdays.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        {/* Calendar grid (auto-colored by totals) */}
        <div className="mt-2 grid grid-cols-7 gap-2">
          {matrix.map((cell) => {
            if (!cell.date) {
              return <div key={cell.key} className="aspect-square rounded-lg bg-neutral-850/40 opacity-50" />;
            }
            const k = keyOf(cell.date);
            const isToday = keyOf(new Date()) === k;
            const total = totalsByKey[k] || 0;

            let bg = "bg-neutral-900 border-neutral-800 text-white"; // 0 sets
            if (total >= 6) bg = "bg-green-600/90 border-green-500 text-neutral-900";
            else if (total >= 1) bg = "bg-amber-500/90 border-amber-400 text-neutral-900";

            const isSelected = selectedKey === k;
            const ring = isSelected ? "ring-2 ring-white shadow-[0_0_0_2px_rgba(255,255,255,0.18)]" : (isToday ? "ring-2 ring-white/60" : "");

            return (
              <button
                key={cell.key}
                onClick={() => {
                  const d = cell.date!;
                  setSelected(d); // лише вибрати і показати деталі нижче
                }}
              onDoubleClick={() => {
                const d = cell.date!;
                const programDay = mapDateToProgramDay(d);
                if (programDay) {
                  toLog(k, programDay, 0);
                }
              }}
                className={`aspect-square rounded-xl border transition-all flex items-center justify-center relative focus:outline-none focus:ring-2 focus:ring-white/50 ${bg} ${ring}`}
                data-key={k}
                tabIndex={0}
                aria-selected={isSelected}
              aria-label={`Дата ${k}. Підходів: ${total}${total === 0 && mapDateToProgramDay(cell.date!) ? ". Подвійний клік — додати підхід" : ""}`}
              title={total === 0 && mapDateToProgramDay(cell.date!) ? "Подвійний клік — додати підхід" : undefined}
              >
                <span className="font-semibold">{cell.date.getDate()}</span>
                {total > 0 && (
                  <span className="absolute bottom-1 right-1 text-[10px] opacity-80">{total}</span>
                )}
                {total === 0 && mapDateToProgramDay(cell.date!) && (
                  <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-white/90 text-neutral-900 text-[12px] leading-4 font-bold flex items-center justify-center" aria-label="Додати підхід">+</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-sm opacity-80">
          У {monthName} тренувальних днів:{" "}
          <span className="font-semibold">
            {Object.values(totalsByKey).filter((n) => n > 0).length}
          </span>
        </div>
      </section>

      {/* Selected day details */}
      <section className="rounded-2xl bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div className="font-extrabold">Журнал дня</div>
          <div className="text-sm opacity-70">
            {selected ? new Date(selected).toLocaleDateString("uk-UA", { day: "2-digit", month: "long", year: "numeric" }) : "--"}
          </div>
        </div>

        {summary?.programDay ? (
          <>
            <div className="mt-2 text-sm opacity-80">
              Програма: <span className="font-semibold">День {summary.programDay}</span> • Всього підходів:{" "}
              <span className="font-semibold">{summary.totalSets}</span>
            </div>
            {(() => {
              const plannedArr = getPlannedSets(summary.programDay!);
              const dKeyLocal = selectedKey!;
              const getFact = (i:number) => {
                try{
                  const raw = localStorage.getItem(`log_${dKeyLocal}_${summary.programDay}_${i}`);
                  if (!raw) return 0;
                  const arr = JSON.parse(raw);
                  return Array.isArray(arr) ? arr.length : 0;
                }catch{ return 0; }
              };
              const groupBadges: {label:string; plan:number; fact:number}[] = [];
              for (let i=0;i<plannedArr.length;i+=2){
                const plan = (plannedArr[i] || 0) + (plannedArr[i+1] || 0);
                const fact = getFact(i) + getFact(i+1);
                groupBadges.push({ label: String.fromCharCode(65 + groupBadges.length), plan, fact });
              }
              return groupBadges.length>0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {groupBadges.map(g=>{
                    const tint = g.fact === 0 ? "bg-neutral-800 border-neutral-700" : (g.fact < g.plan ? "bg-amber-500/20 border-amber-400/60" : "bg-green-500/20 border-green-400/60");
                    return (
                      <div key={g.label} className={`px-3 py-1 rounded-lg border text-xs ${tint}`}>
                        <span className="font-bold mr-2">Група {g.label}</span>{g.fact}/{g.plan}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <ul className="mt-3 space-y-2">
              {summary.exercises.map((ex, i) => (
                <li key={i} className="rounded-lg bg-neutral-800/60 border border-neutral-700 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <div className="font-medium truncate max-w-[160px] sm:max-w-xs">{ex.title}</div>
                      <span className="text-xs opacity-70">{ex.sets} підход(и/ів)</span>
                      {selectedKey && summary.programDay !== null && (
                        <button
                          onClick={() => toLog(selectedKey!, summary.programDay!, i)}
                          className="ml-3 shrink-0 rounded-lg bg-lime-500 text-neutral-900 text-xs px-3 py-1 inline-flex items-center gap-1"
                          aria-label="Перейти до логів вправи"
                        >
                          Логи <IconArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {ex.last && (
                    <div className="mt-2 text-xs opacity-80">
                      Останній: <span className="font-semibold">{ex.last.kg || 0} кг × {ex.last.reps || 0}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-2 text-sm opacity-70">
            Для цієї дати немає тренувального дня за розкладом (працюємо Пн/Ср/Пт). Обери одну з цих дат, щоб побачити журнал.
          </div>
        )}
      </section>

      {/* Bottom Nav */}
      <BottomBar active="progress" />
    </main>
  );
}
