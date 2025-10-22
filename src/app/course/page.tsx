
 "use client";
import Link from "next/link";
import BottomBar from "@/components/BottomBar";
import Image from "next/image";
import Script from "next/script";
import { getProgress, toggleDayDone } from "@/lib/storage";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Timer as IconTimer,
  X as IconX,
  Play as IconPlay,
  RefreshCw as IconRefreshCw,
  Plus as IconPlus,
  ChevronDown as IconChevronDown,
  Settings as IconSettings,
  Joystick as IconJoystick,
  CalendarDays as IconCalendarDays,
  Calculator as IconCalculator,
  GraduationCap as IconGraduationCap,
} from "lucide-react";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    Telegram?: {
      WebApp?: {
        HapticFeedback?: {
          impactOccurred?: (type: "light" | "medium" | "heavy") => void;
          notificationOccurred?: (type: "success" | "warning" | "error") => void;
        };
      };
    };
  }
}

type Level = "beginner" | "intermediate" | "advanced";
type Track = "gym" | "home";

// --- Hydration-safe hook ---
function useHydrated(){
  const [h,setH]=useState(false);
  useEffect(()=>{ setH(true); },[]);
  return h;
}

export default function Lessons(){
  const [active,setActive]=useState(1);
  const [done,setDone]=useState<number[]>([]);
  const [level,setLevel]=useState<Level>("beginner");
  const [track,setTrack]=useState<Track>("gym");
  const [supersets,setSupersets]=useState(true);
  const [openInstr, setOpenInstr] = useState(false);
  const [openNav, setOpenNav] = useState(false);

  // --- Hydration flag ---
  const hydrated = useHydrated();

  // ---- BANNERS (auto-rotate with background images) ----
  type Banner = { title: string; cta: string; href: string; img?: string };
  const banners: Banner[] = [
    { title: "Ласкаво\nПросимо! 👋", cta: "Розпочати тренування", href: "#start", img: "/banners/coach-1.png" },
    { title: "ПРОРАХУЙ ДЕННУ\nНОРМУ 🔥 КАЛОРІЙ", cta: "ПЕРЕЙТИ ДО РОЗРАХУНКУ", href: "/course/tools", img: "/banners/tools.png" },
    { title: "ОБОВЯЗКОВО ОЗНАЙОМСЯ\nБАЗА 💡 ЗНАНЬ", cta: "В БАЗУ ЗНАНЬ", href: "/course/knowledge", img: "/banners/knowledge.png" },
    { title: "РОЗБЛОКУЙ ВСІ 🔐 МОЖЛИВОСТІ", cta: "ПЕРЕЙТИ НА САЙТ", href: "https://example.com", img: "/banners/unlock.png" },
  ];
  const [bannerIdx, setBannerIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      setBannerIdx(i => (dx < 0 ? (i + 1) % banners.length : (i - 1 + banners.length) % banners.length));
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };
  useEffect(() => {
    const id = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 7000);
    return () => clearInterval(id);
  }, [banners.length]);

  // ---- TIMER (per‑day) ----
  const PRESETS = [2,3,4,5,7,10]; // minutes (small -> big)
  const [fabOpen, setFabOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0); // seconds remaining
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ---- SOUND & HAPTICS ----
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ensureAudio = () => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctor: typeof AudioContext | undefined = window.AudioContext ?? window.webkitAudioContext;
      if (Ctor) audioCtxRef.current = new Ctor();
    }
    return audioCtxRef.current;
  };
  const haptic = (type: "light"|"medium"|"heavy"|"success"|"warning"|"error" = "light") => {
    try {
      const api = window?.Telegram?.WebApp?.HapticFeedback;
      if (!api) return;
      if (type==="success"||type==="warning"||type==="error") api.notificationOccurred?.(type);
      else api.impactOccurred?.(type);
    } catch {}
  };
  const playGong = () => {
    const ctx = ensureAudio(); if (!ctx) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = "sine"; o2.type = "sine";
    o1.frequency.value = 660; o2.frequency.value = 528; o2.detune.value = -10;
    o1.connect(gain); o2.connect(gain);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.9, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    o1.start(now); o2.start(now);
    o1.stop(now + 1.25); o2.stop(now + 1.25);
    // extra haptic
    haptic("success");
  };

  // Preload external bell sound (public/sounds/gong.wav)
  const bellBufRef = useRef<AudioBuffer | null>(null);
  const loadBell = useCallback(async () => {
    const ctx = ensureAudio(); if (!ctx || bellBufRef.current) return;
    try {
      const res = await fetch("/sounds/gong.wav");
      const arr = await res.arrayBuffer();
      bellBufRef.current = await ctx.decodeAudioData(arr);
    } catch {}
  }, []);
  useEffect(() => { void loadBell(); }, [loadBell]);
  const playBell = () => {
    const ctx = ensureAudio(); if (!ctx || !bellBufRef.current) return;
    const src = ctx.createBufferSource();
    src.buffer = bellBufRef.current;
    src.connect(ctx.destination);
    src.start();
    haptic("success");
  };

  // --- Helpers for date-keyed logs (YYYY-MM-DD) ---
  const pad = (n:number) => String(n).padStart(2, "0");
  const dateKeyLocal = (d = new Date()) => {
    // local date (no timezone shift), e.g. 2025-10-19
    const y = d.getFullYear();
    const m = pad(d.getMonth()+1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day}`;
  };
  // ---- GLOBAL TIMER PERSISTENCE ----
  useEffect(()=>{
    if (typeof window === "undefined") return;
    const rem = Number(localStorage.getItem("timer_rem") || "0");
    const run = localStorage.getItem("timer_running") === "1";
    if (Number.isFinite(rem) && rem > 0) {
      setRemaining(rem);
      setRunning(run);
    }
  },[]);

  // ---- LOG / VARIANT state ----
  type LogRow = { kg: string; reps: string };
  const [logOpen, setLogOpen] = useState<{ index:number } | null>(null);
  const [logRows, setLogRows] = useState<LogRow[]>([{ kg:"", reps:"" }]);
  const [variantSheetIdx, setVariantSheetIdx] = useState<number | null>(null);
  const [variants, setVariants] = useState<Record<string,string>>({}); // key: `${day}_${idx}` -> chosen title
  useEffect(()=>{
    if (variantSheetIdx === null) return;
    const el = document.querySelector(`[data-ex-id="${variantSheetIdx}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [variantSheetIdx]);
  const [logDate, setLogDate] = useState<string>(dateKeyLocal());
  const loadLogFor = (dateStr: string, index: number) => {
    if (typeof window === "undefined") return;
    const newKey = `log_${dateStr}_${active}_${index}`;
    const oldKey = `log_${active}_${index}`;
    let raw = localStorage.getItem(newKey);
    if (!raw) {
      raw = localStorage.getItem(oldKey);
      if (raw) { try { localStorage.setItem(newKey, raw); } catch {} }
    }
    if (raw) {
      try { setLogRows(JSON.parse(raw)); }
      catch { setLogRows([{ kg:"", reps:"" }]); }
    } else {
      setLogRows([{ kg:"", reps:"" }]);
    }
  };

  // Load local progress
  useEffect(()=>{
    (async ()=>{
      try{
        const p = await getProgressSafe();
        setDone(p?.done || []);
      }catch{
        try { setDone((getProgressSafe as () => ProgressResp)().done || []); } catch {}
      }
    })();
  },[]);

  // Load per-day persisted UI (variants only) — keep focus (no scroll)
useEffect(()=>{
  setFabOpen(false);
  if (typeof window !== "undefined") {
    const v = localStorage.getItem(`variants_${active}`);
    setVariants(v ? JSON.parse(v) : {});
  }
},[active]);

  // Tick countdown (global keys, not per-day)
  useEffect(()=>{
    if (!running) return;
    if (remaining <= 0) { setRunning(false); return; }
    timerRef.current = setInterval(()=>{
      setRemaining(prev=>{
        const next = Math.max(0, prev-1);
        if (typeof window !== "undefined") {
          localStorage.setItem("timer_rem", String(next));
          localStorage.setItem("timer_running", next > 0 ? "1" : "0");
        }
        if (next === 0) {
          try { window?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success"); } catch {}
          if (bellBufRef.current) playBell(); else playGong();
        }
        return next;
      });
    }, 1000);
    return ()=> { if (timerRef.current) clearInterval(timerRef.current); };
  },[running, remaining]);

  const startPreset = (min:number)=>{
    const secs = min*60;
    setRemaining(secs);
    if (typeof window !== "undefined") {
      localStorage.setItem("timer_rem", String(secs));
      localStorage.setItem("timer_running", "1");
    }
    setRunning(true);
    setFabOpen(false);
    haptic("light");
    try { window?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch {}
  };

  const resetTimer = ()=>{
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setRemaining(0);
    if (typeof window !== "undefined") {
      localStorage.setItem("timer_rem", "0");
      localStorage.setItem("timer_running", "0");
    }
    try { window?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch {}
    {
      const ctx = ensureAudio();
      if (ctx) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now); osc.stop(now + 0.1);
      }
    }
  };

  // Unified FAB handler for open/cancel
  const onFabClick = () => {
    if (running) {
      // If timer is running: cancel timer and close menu, turning back into the clock icon
      resetTimer();
      setFabOpen(false);
    } else {
      // If not running: just toggle the menu with presets
      setFabOpen(o => !o);
    }
  };

  const minutes = Math.floor(remaining/60).toString();
  const seconds = (remaining%60).toString().padStart(2,"0");

  type ProgressResp = { done: number[] };
  const getProgressSafe = getProgress as unknown as () => Promise<ProgressResp> | ProgressResp;
  const toggleDayDoneSafe = toggleDayDone as unknown as (day:number) => Promise<ProgressResp> | ProgressResp;

  // ---- COURSE STATE ----
  // Structured Programs (3 levels × 2 tracks)
  type Exercise = { title:string; sets?:string };
  type DayPlan = { title:string; exercises: Exercise[] };
  type Program = { level: Level; track: Track; goal: string; days: [DayPlan, DayPlan, DayPlan] };

  const programs: Program[] = [
    {
      level: "beginner", track: "gym",
      goal: "Навчитися техніці, зміцнити все тіло, відчути м’язи.",
      days: [
        { title:"День 1 — Ноги + Сідниці", exercises: [
          { title:"Присідання зі штангою / гоблет-присідання", sets:"3×12" },
          { title:"Ягодичний міст", sets:"3×15" },
          { title:"Випади назад", sets:"3×10" },
          { title:"Розгинання ніг у тренажері", sets:"3×15" },
          { title:"Планка", sets:"3×30 сек" },
        ]},
        { title:"День 2 — Спина + Руки", exercises: [
          { title:"Тяга горизонтального блока", sets:"3×12" },
          { title:"Підтягування в гравітроні / тяга верхнього блока", sets:"3×10" },
          { title:"Жим гантелей сидячи", sets:"3×12" },
          { title:"Згинання рук з гантелями", sets:"3×12" },
          { title:"Класичні скручування", sets:"3×15" },
        ]},
        { title:"День 3 — Все тіло", exercises: [
          { title:"Присідання", sets:"3×15" },
          { title:"Тяга гантелей у нахилі", sets:"3×12" },
          { title:"Віджимання від лавки", sets:"3×12" },
          { title:"Велосипед на прес", sets:"3×20" },
          { title:"Планка", sets:"3×40 сек" },
        ]},
      ]
    },
    {
      level: "beginner", track: "home",
      goal: "Без ваги або з еспандером.",
      days: [
        { title:"День 1", exercises: [
          { title:"Присідання", sets:"4×15" },
          { title:"Випади", sets:"3×12" },
          { title:"Віджимання з колін", sets:"3×10" },
          { title:"Планка", sets:"3×30 сек" },
          { title:"Місток на сідниці", sets:"3×20" },
          { title:"Скручування на прес", sets:"3×20" },
        ]},
        { title:"День 2", exercises: [
          { title:"Присідання", sets:"4×15" },
          { title:"Випади", sets:"3×12" },
          { title:"Віджимання з колін", sets:"3×10" },
          { title:"Планка", sets:"3×30 сек" },
          { title:"Місток на сідниці", sets:"3×20" },
          { title:"Скручування на прес", sets:"3×20" },
        ]},
        { title:"День 3", exercises: [
          { title:"Присідання", sets:"4×15" },
          { title:"Випади", sets:"3×12" },
          { title:"Віджимання з колін", sets:"3×10" },
          { title:"Планка", sets:"3×30 сек" },
          { title:"Місток на сідниці", sets:"3×20" },
          { title:"Скручування на прес", sets:"3×20" },
        ]},
      ]
    },
    {
      level: "intermediate", track: "gym",
      goal: "Розвиток м’язової маси, акцент на сідниці та плечі.",
      days: [
        { title:"День 1 — Сідниці + Ноги", exercises: [
          { title:"Румунська тяга", sets:"4×10" },
          { title:"Присідання", sets:"4×10" },
          { title:"Гіперекстензії", sets:"3×15" },
          { title:"Випади ходьбою", sets:"3×12" },
          { title:"Ягодичний міст з вагою", sets:"4×12" },
        ]},
        { title:"День 2 — Спина + Плечі + Прес", exercises: [
          { title:"Тяга горизонтального блока", sets:"4×10" },
          { title:"Тяга гантелей у нахилі", sets:"3×12" },
          { title:"Жим гантелей над головою", sets:"3×10" },
          { title:"Махи гантелей в сторони", sets:"3×15" },
          { title:"Підйом ніг у висі / лежачи", sets:"3×15" },
        ]},
        { title:"День 3 — Все тіло", exercises: [
          { title:"Тяга штанги з підлоги (легка)", sets:"4×8" },
          { title:"Жим лежачи", sets:"4×8" },
          { title:"Присідання з гантелями", sets:"3×12" },
          { title:"Планка", sets:"3×30 сек" },
        ]},
      ]
    },
    {
      level: "intermediate", track: "home",
      goal: "Зберегти форму, розвинути сідниці та прес.",
      days: [
        { title:"День 1", exercises: [
          { title:"Болгарські випади", sets:"4×12" },
          { title:"Місток на сідниці з еспандером", sets:"4×15" },
          { title:"Віджимання", sets:"4×10" },
          { title:"Планка", sets:"3×45 сек" },
          { title:"Скручування + ножиці", sets:"3×20" },
          { title:"Присідання з паузою", sets:"4×12" },
        ]},
        { title:"День 2", exercises: [
          { title:"Болгарські випади", sets:"4×12" },
          { title:"Місток на сідниці з еспандером", sets:"4×15" },
          { title:"Віджимання", sets:"4×10" },
          { title:"Планка", sets:"3×45 сек" },
          { title:"Скручування + ножиці", sets:"3×20" },
          { title:"Присідання з паузою", sets:"4×12" },
        ]},
        { title:"День 3", exercises: [
          { title:"Болгарські випади", sets:"4×12" },
          { title:"Місток на сідниці з еспандером", sets:"4×15" },
          { title:"Віджимання", sets:"4×10" },
          { title:"Планка", sets:"3×45 сек" },
          { title:"Скручування + ножиці", sets:"3×20" },
          { title:"Присідання з паузою", sets:"4×12" },
        ]},
      ]
    },
    {
      level: "advanced", track: "gym",
      goal: "Нарощування м’язів, акцент на сідниці, плечі та спину.",
      days: [
        { title:"День 1 — Сідниці + Ноги", exercises: [
          { title:"Присідання зі штангою", sets:"5×8" },
          { title:"Ягодичний міст (важкий)", sets:"5×10" },
          { title:"Румунська тяга", sets:"4×10" },
          { title:"Болгарські випади", sets:"3×12" },
          { title:"Відведення ноги в кросовері", sets:"3×15" },
        ]},
        { title:"День 2 — Верх тіла", exercises: [
          { title:"Жим штанги лежачи", sets:"4×8" },
          { title:"Тяга штанги до пояса", sets:"4×10" },
          { title:"Жим над головою", sets:"4×10" },
          { title:"Підйом гантелей в сторони", sets:"4×15" },
          { title:"Табата прес (маятник/скелелаз)", sets:"—" },
        ]},
        { title:"День 3 — Комбінація", exercises: [
          { title:"Станова тяга", sets:"4×6" },
          { title:"Присідання фронтальні в сміті", sets:"4×10" },
          { title:"Випади ходьбою", sets:"3×14" },
          { title:"Скручування + планка", sets:"3 раунди" },
        ]},
      ]
    },
    {
      level: "advanced", track: "home",
      goal: "Підтримка форми з мінімальним обладнанням (гантелі + еспандер).",
      days: [
        { title:"День 1", exercises: [
          { title:"Присідання з гантелями", sets:"4×15" },
          { title:"Місток з вагою", sets:"4×15" },
          { title:"Випади", sets:"4×12" },
          { title:"Віджимання", sets:"3×12" },
          { title:"Планка", sets:"3×1 хв" },
          { title:"Берпі", sets:"3×15" },
        ]},
        { title:"День 2", exercises: [
          { title:"Присідання з гантелями", sets:"4×15" },
          { title:"Місток з вагою", sets:"4×15" },
          { title:"Випади", sets:"4×12" },
          { title:"Віджимання", sets:"3×12" },
          { title:"Планка", sets:"3×1 хв" },
          { title:"Берпі", sets:"3×15" },
        ]},
        { title:"День 3", exercises: [
          { title:"Присідання з гантелями", sets:"4×15" },
          { title:"Місток з вагою", sets:"4×15" },
          { title:"Випади", sets:"4×12" },
          { title:"Віджимання", sets:"3×12" },
          { title:"Планка", sets:"3×1 хв" },
          { title:"Берпі", sets:"3×15" },
        ]},
      ]
    },
  ];

  const program = useMemo(
    () => programs.find(p => p.level===level && p.track===track)!,
    [level, track]
  );

  // Persist selected program meta and days to localStorage for calendar use
  useEffect(() => {
    if (typeof window === "undefined" || !program) return;
    // Save meta
    try {
      localStorage.setItem(
        "program_meta",
        JSON.stringify({
          level: program.level,
          track: program.track,
          updated: Date.now(),
        })
      );
    } catch {}
    // Save days: { "1": [...], "2": [...], "3": [...] }
    try {
      const days: Record<string, string[]> = {};
      for (let i = 0; i < 3; ++i) {
        days[String(i + 1)] = (program.days[i]?.exercises ?? []).map(ex => {
          // Only base title (not variant)
          return ex.title;
        });
      }
      localStorage.setItem("program_days", JSON.stringify(days));
      try {
        const setsMap: Record<string, number[]> = {};
        for (let i = 0; i < 3; ++i) {
          setsMap[String(i + 1)] = (program.days[i]?.exercises ?? []).map(ex => {
            const m = ex.sets?.match(/(\d+)\s*[x×\*]/i);
            return m ? Number(m[1]) : 0;
          });
        }
        localStorage.setItem("program_sets", JSON.stringify(setsMap));
      } catch {}
    } catch {}
  }, [program.level, program.track, program.days]);
  const totalDays = 21;
  const percent = useMemo(()=> Math.min(100, Math.round((done.length/totalDays)*100)), [done.length]);
  const currentDay = program.days[Math.max(0, Math.min(2, active-1))];
  const isCompleted = done.includes(active);

  const goPrev = () => setActive(prev => Math.max(1, prev-1));
  const goNext = () => setActive(prev => Math.min(3, prev+1));


  // ---- VIDEO MODAL ----
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const openVideo = (src?: string) => {
    setVideoSrc(src || "/demo-video.mp4"); // заміни на свій CDN/URL
    setVideoOpen(true);
    try { window?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch {}
  };
  const closeVideo = () => { setVideoOpen(false); setVideoSrc(null); };

  const handleVideoEnded = async () => {
    if (!done.includes(active)) {
      try{
        const p = await toggleDayDoneSafe(active);
        setDone(p?.done || []);
      }catch{
        const p = (toggleDayDoneSafe as (d:number)=>ProgressResp)(active);
        setDone(p?.done || []);
      }
    }
    setVideoOpen(false);
  };

  // ---- LOG MODAL helpers ----
  const openLog = useCallback((index:number, dateStr?: string) => {
    setVariantSheetIdx(null);
    setLogOpen({ index });
    const dKey = dateStr || logDate || dateKeyLocal(); // keep provided date or existing modal date
    setLogDate(dKey);
    loadLogFor(dKey, index);
  }, [logDate, dateKeyLocal, loadLogFor]);
  // Consume intent from calendar (open log modal for specific date/day)
  useEffect(()=>{
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("open_log_intent");
    if (!raw) return;
    try {
      const intent = JSON.parse(raw) as {date:string; day:number; exId?:number};
      localStorage.removeItem("open_log_intent");
      // switch to requested day, then open log for provided date
      setActive(intent.day);
      setTimeout(()=>{
        setLogDate(intent.date);
        openLog(intent.exId ?? 0, intent.date);
      }, 0);
    } catch {}
  },[openLog]);
  const saveLog = () => {
    if (!logOpen) return;
    if (typeof window !== "undefined") {
      const dKey = logDate || dateKeyLocal();
      const newKey = `log_${dKey}_${active}_${logOpen.index}`;
      const oldKey = `log_${active}_${logOpen.index}`; // legacy (to be removed later)
      const payload = JSON.stringify(logRows);
      localStorage.setItem(newKey, payload);
      try { localStorage.setItem(oldKey, payload); } catch {}
      try { window?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success"); } catch {}
    }
    setLogOpen(null);
  };

  useEffect(()=>{
    if (!logOpen) return;
    loadLogFor(logDate, logOpen.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logDate, logOpen?.index]);

  const addRow = () => setLogRows(prev => [...prev, {kg:"", reps:""}]);
  const updateRow = (i:number, field:keyof LogRow, val:string) => {
    setLogRows(prev => prev.map((r,idx)=> idx===i ? { ...r, [field]: val } : r));
  };
  const removeRow = (i:number) => setLogRows(prev => prev.filter((_,idx)=> idx!==i));

  // ---- VARIANT helpers ----
  const keyFor = (idx:number) => `${active}_${idx}`;
  const chooseVariant = (idx:number, title:string) => {
    const key = keyFor(idx);
    const next = { ...variants, [key]: title };
    setVariants(next);
    if (typeof window !== "undefined") {
      try { localStorage.setItem(`variants_${active}`, JSON.stringify(next)); } catch {}
      try {
        const compact: Record<string, string> = {};
        Object.entries(next).forEach(([k, val]) => {
          const ix = k.split("_").pop();
          if (ix != null) compact[ix] = val;
        });
        localStorage.setItem(`variants_${active}_byIndex`, JSON.stringify(compact));
      } catch {}
    }
    setVariantSheetIdx(null);
  };

  // ---- Helpers for supersets & resume ----
  // Basic parser: "4×12" -> 4
  const parseSets = (s?: string) => {
    if (!s) return 0;
    const m = s.match(/(\d+)\s*[x×\*]/i);
    return m ? Number(m[1]) : 0;
  };

  // Helpers for reading done sets from localStorage and getting today key
  const todayKey = dateKeyLocal();
  const readDoneSets = (exIdx:number, dKey = todayKey) => {
    if (typeof window === "undefined") return 0;
    try{
      const raw = localStorage.getItem(`log_${dKey}_${active}_${exIdx}`);
      if(!raw) return 0;
      const rows = JSON.parse(raw);
      return Array.isArray(rows) ? rows.length : 0;
    }catch{return 0}
  };

  // Raw list from plan (each item is an "exercise block")
  const rawBlocks = (currentDay?.exercises ?? []).map(ex => ({ title: ex.title, sets: ex.sets }));

  // Build grouped supersets (A/B/C) by pairing consecutive exercises
  type SupersetGroup = { title: string; items: { title: string; sets?: string }[] };
  const supersetGroups: SupersetGroup[] = useMemo(() => {
    const groups: SupersetGroup[] = [];
    for (let i = 0; i < rawBlocks.length; i += 2) {
      if (i + 1 < rawBlocks.length) {
        groups.push({
          title: `Суперсет ${groups.length + 1}`,
          items: [rawBlocks[i], rawBlocks[i + 1]],
        });
      } else {
        groups.push({
          title: `Суперсет ${groups.length + 1}`,
          items: [rawBlocks[i]],
        });
      }
    }
    return groups;
  }, [rawBlocks]);
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // Mini-resume: total sets for the day (sum of declared sets)
  const totalSetsPlanned = useMemo(
    () => rawBlocks.reduce((acc, b) => acc + parseSets(b.sets), 0),
    [rawBlocks]
  );

  // Flat list with stable ids
  type FlatExercise = { id: number; title: string; sets?: string };
  const flatList: FlatExercise[] = useMemo(() => {
    return rawBlocks.map((b, i) => ({ id: i, title: b.title, sets: b.sets }));
  }, [rawBlocks]);

  const lessonsRef = useRef<HTMLDivElement | null>(null);
  const scrollToLessons = (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    lessonsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Render
  return (
    <main className="max-w-md mx-auto p-4 space-y-4 pb-28">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {/* Floating TIMER with presets 2->10 */}
      <div
        className="fixed z-30 select-none"
        style={{
          left: "calc(50% - 208px)",  // 448px/2 - 16px padding ≈ 208px
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)"
        }}
      >
        {/* When running: show one big time bubble above the FAB */}
        {running && (
          <div className="flex flex-col items-start gap-3 mb-3">
            <div className="h-14 w-14 rounded-full bg-neutral-900 border border-neutral-800 shadow-md flex items-center justify-center text-lime-400 text-base font-extrabold">
              {minutes}:{seconds}
            </div>
          </div>
        )}

        {/* When menu is open and not running: show vertical presets */}
        {fabOpen && !running && (
          <div className="flex flex-col items-start gap-3 mb-3">
            {PRESETS.map((m)=>(
              <button key={m}
                onClick={()=>startPreset(m)}
                className="h-14 w-14 rounded-full bg-neutral-900 border border-neutral-800 shadow-md flex items-center justify-center text-white text-xl font-extrabold"
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* FAB: clock to open menu; X to close menu or cancel running timer */}
        <button
          aria-label={(fabOpen || running) ? "Закрити таймер/меню" : "Відкрити меню таймера"}
          onClick={onFabClick}
          className="h-16 w-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-lg text-white"
        >
          {(fabOpen || running)
            ? <IconX size={28} />
            : <IconTimer size={28} />}
        </button>
      </div>

      {/* HERO BANNERS with image background */}
      {(() => {
        // fallback for banner image
        const bannerImg = banners[bannerIdx]?.img || "/banners/coach-1.png";
        return (
          <section className="rounded-2xl overflow-hidden relative">
            <div
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="relative h-[280px] md:h-[300px] overflow-hidden"
            >
              {(() => {
                const png = bannerImg.endsWith(".png") ? bannerImg : bannerImg.replace(/\.webp$/i, ".png");
                const webp = png.replace(/\.png$/i, ".webp");
                return (
                  <picture>
                    <source srcSet={webp} type="image/webp" />
                    <img src={png} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  </picture>
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
              <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                <h2 className="text-3xl font-extrabold leading-tight whitespace-pre-line">
                  {banners[bannerIdx].title}
                </h2>
                <a
                  href="#lessons"
                  onClick={scrollToLessons}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white text-neutral-900 font-extrabold py-3 transition-transform active:scale-[0.98]"
                >
                  {banners[bannerIdx].cta}
                </a>
                <div className="mt-4 flex items-center gap-3">
                  {banners.map((_,i)=>(
                    <button
                      key={i}
                      onClick={()=>setBannerIdx(i)}
                      aria-label={`Перейти до банера ${i+1}`}
                      aria-current={i===bannerIdx ? "true" : undefined}
                      className={`h-2 rounded-full transition-all focus:outline-none ${i===bannerIdx?'w-16 bg-white/90':'w-8 bg-white/30 hover:w-16 hover:bg-white/60 focus:ring-2 focus:ring-white/70'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* PROGRESS HEADER */}
      <section id="start" className="rounded-2xl bg-neutral-900 p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">Тренування</h1>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-neutral-800 text-xs">{done.length}/{totalDays} днів</span>
            <span className="px-2 py-1 rounded-md bg-neutral-100 text-neutral-900 text-xs font-bold">{percent}%</span>
          </div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-neutral-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="h-2 rounded-full bg-green-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-1 text-xs opacity-70">
          {percent < 100 ? (
            <>Наступна позначка: <span className="font-semibold">{percent < 25 ? "25%" : percent < 50 ? "50%" : percent < 75 ? "75%" : "100%"}</span></>
          ) : "Курс завершено — ти топ!"}
        </div>
      </section>

      {/* ACCORDIONS */}
      <section className="space-y-3">
        <div className="rounded-2xl bg-neutral-900">
          <button onClick={()=>setOpenInstr(v=>!v)} className="w-full px-4 py-4 flex items-center justify-between text-white" aria-expanded={openInstr}>
            <div className="flex items-center gap-3"><IconSettings size={18} aria-hidden /><span className="font-semibold">Інструктаж</span></div>
            <IconChevronDown size={20} className={`transition-transform ${openInstr?'rotate-180':''}`} aria-hidden />
          </button>
          {openInstr && (
            <div className="px-5 pb-4 text-sm opacity-80 space-y-4">
              <p>Графік: <em>пн — День 1, ср — День 2, пт — День 3.</em></p>
              <p>Йдемо зверху вниз. Розігрівні підходи не рахуємо — пишемо тільки робочі.</p>
              <p>Можеш міняти вправи (🔄), дивитися відео (▶️) і вносити підходи (**+**). Усі записи прив’язуються до дати (YYYY‑MM‑DD), тому в щоденнику підсвічуються саме реальні тренування.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-neutral-900">
          <button onClick={()=>setOpenNav(v=>!v)} className="w-full px-4 py-4 flex items-center justify-between text-white" aria-expanded={openNav}>
            <span className="font-semibold">Навігація</span>
            <IconChevronDown size={20} className={`transition-transform ${openNav?'rotate-180':''}`} aria-hidden />
          </button>
          {openNav && (
            <div className="px-5 pb-4 text-sm opacity-80 space-y-2">
              <ol className="list-decimal pl-5 space-y-1">
                <li><strong>Тренування.</strong> Записуй підходи та дивись техніку.</li>
                <li><strong>Щоденник.</strong> Історія тренувань по датах.</li>
                <li><strong>Калькулятори.</strong> Ккал та 1ПМ — швидкі розрахунки.</li>
                <li><strong>База знань.</strong> Поради про техніку, прогресію й харчування.</li>
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* LEVEL SELECTOR */}
      <section className="rounded-2xl bg-neutral-900 p-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { key:"beginner", label:"Початковий" },
            { key:"intermediate", label:"Середній" },
            { key:"advanced", label:"Високий" },
          ].map(it=>(
            <button
              key={it.key}
              onClick={()=>setLevel(it.key as Level)}
              className={`rounded-xl py-3 font-extrabold transition text-xs ${level===it.key ? "bg-neutral-100 text-neutral-900" : "bg-neutral-900 border border-neutral-800 text-neutral-500"}`}
              aria-pressed={level===it.key}
            >
              {it.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={()=>setTrack("gym")} className={`rounded-xl py-3 font-extrabold uppercase transition ${track==="gym" ? "bg-neutral-800 text-neutral-100 opacity-90" : "bg-neutral-900 border border-neutral-800 text-neutral-500"}`} aria-pressed={track==="gym"}>В Залі</button>
          <button onClick={()=>setTrack("home")} className={`rounded-xl py-3 font-extrabold uppercase transition ${track==="home" ? "bg-neutral-100 text-neutral-900" : "bg-neutral-900 border border-neutral-800 text-neutral-500"}`} aria-pressed={track==="home"}>Вдома</button>
        </div>
        <div className="mt-2 text-xs opacity-70">
          Мета: <span className="font-semibold">{program.goal}</span>
        </div>
      </section>

      {/* SUPERSETS TOGGLE */}
      <section className="rounded-2xl bg-neutral-900 p-4 flex items-center justify-between">
        <div className="font-semibold">Суперсети</div>
        <button onClick={()=>setSupersets(v=>!v)} className={`w-14 h-8 rounded-full relative transition ${supersets ? "bg-lime-500/90" : "bg-neutral-700"}`} aria-pressed={supersets}>
          <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white transition-transform ${supersets ? "translate-x-6" : ""}`} />
        </button>
      </section>

      {/* DAY TABS (demo 1–3) */}
      <div className="rounded-2xl bg-neutral-900 p-2" ref={lessonsRef} id="lessons">
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(d=>(
            <button key={d} onClick={()=>setActive(d)} className={`rounded-xl py-3 font-extrabold transition ${active===d?'bg-green-600 text-neutral-900':'bg-neutral-800 text-neutral-400'}`} aria-current={active===d ? "page" : undefined}>{d} ДЕНЬ</button>
          ))}
        </div>
      </div>

      {/* current day content */}
      <section className="space-y-3">
        <div className="rounded-2xl bg-neutral-900 p-4 border border-neutral-800">
          <div className="font-bold opacity-90">{currentDay?.title}</div>
          <div className="mt-1 text-xs opacity-70">План: <span className="font-semibold">{totalSetsPlanned}</span> підходів</div>
        </div>
        {/* Supersets ON -> grouped; OFF -> flat list */}
        {supersets ? (
          (() => {
            let gId = 0;
            return (supersetGroups ?? []).map((grp, gi) => {
              const groupPlanned = grp.items.reduce((a,b)=> a + parseSets(b.sets), 0);
              const startId = gId; // first index in this group
              const groupDone = hydrated ? grp.items.reduce((a, _b, offset)=> a + readDoneSets(startId + offset), 0) : 0;
              const groupTint = !hydrated ? "border-neutral-800" : (groupDone === 0 ? "border-neutral-800" : (groupDone < groupPlanned ? "border-amber-500/70" : "border-green-500/80"));
              return (
                <div key={gi} className={`rounded-xl bg-neutral-900 p-4 border ${groupTint}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-neutral-800 text-xs">{alpha[gi] || ""}</span>{grp.title}</div>
                    <div className="text-xs opacity-70">
                      {hydrated ? `${groupDone}/${groupPlanned}` : `—/${groupPlanned}`}
                    </div>
                  </div>
                  <ul className="opacity-90 space-y-2">
                    {grp.items.map((b) => {
                      const id = gId++;
                      const planned = parseSets(b.sets);
                      const done = hydrated ? readDoneSets(id) : 0;
                      return (
                        <ExerciseRow
                          key={id}
                          idx={id}
                          title={variants[keyFor(id)] || b.title}
                          planned={planned}
                          done={done}
                          openVideo={openVideo}
                          openLog={openLog}
                          onOpenVariant={(i) => setVariantSheetIdx(i)}
                        />
                      );
                    })}
                  </ul>
                </div>
              );
            });
          })()
        ) : (
          <div className="rounded-xl bg-neutral-900 p-4 border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">Список вправ</div>
              <div className="text-xs opacity-70">
                {hydrated ? flatList.reduce((a,b)=> a + readDoneSets(b.id), 0) : 0}/{flatList.reduce((a,b)=> a + parseSets(b.sets), 0)}
              </div>
            </div>
            <ul className="opacity-90 space-y-2">
              {flatList.map(ex=>(
                <ExerciseRow
                  key={ex.id}
                  idx={ex.id}
                  title={variants[keyFor(ex.id)] || ex.title}
                  planned={parseSets(ex.sets)}
                  done={hydrated ? readDoneSets(ex.id) : 0}
                  openVideo={openVideo}
                  openLog={openLog}
                  onOpenVariant={(i)=>setVariantSheetIdx(i)}
                />
              ))}
            </ul>
          </div>
        )}
      </section>



      {/* VARIANT BOTTOM-SHEET */}
      {variantSheetIdx !== null && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/50" onClick={()=>setVariantSheetIdx(null)} aria-label="Закрити меню варіантів" />
          <div className="absolute inset-x-0 bottom-0 max-w-md mx-auto rounded-t-2xl bg-neutral-900 border border-neutral-800 p-4">
            <div className="h-1 w-12 bg-neutral-700 rounded-full mx-auto mb-3" />
            <div className="font-extrabold mb-2">Заміна вправи</div>
            <div className="rounded-lg border border-neutral-700 overflow-hidden">
              {["Варіант: гантелі", "Варіант: тренажер", "Варіант: штанга"].map(opt=>(
                <button
                  key={opt}
                  onClick={()=>chooseVariant(variantSheetIdx, opt)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-800 active:bg-neutral-700"
                >
                  {opt}
                </button>
              ))}
            </div>
            <button onClick={()=>setVariantSheetIdx(null)} className="mt-3 w-full rounded-xl py-3 bg-neutral-800 border border-neutral-700">Скасувати</button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <BottomBar active="course" />

      {/* VIDEO MODAL */}
      {videoOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-3" onClick={closeVideo}>
          <div className="relative w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <button onClick={closeVideo} className="absolute -top-4 -right-4 h-14 w-14 rounded-full bg-white text-black text-3xl flex items-center justify-center shadow-xl" aria-label="Закрити відео">×</button>
            <div className="rounded-2xl overflow-hidden bg-neutral-900">
              <video
                src={videoSrc || undefined}
                controls
                playsInline
                onEnded={handleVideoEnded}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* LOG MODAL */}
      {logOpen && (
        <LogModal
          active={active}
          logOpen={logOpen}
          setLogOpen={setLogOpen}
          logRows={logRows}
          setLogRows={setLogRows}
          logDate={logDate}
          setLogDate={setLogDate}
          updateRow={updateRow}
          removeRow={removeRow}
          addRow={addRow}
          saveLog={saveLog}
        />
      )}
    </main>
  );
}

// --- ExerciseRow with swipe-to-reveal and bottom-sheet variant menu ---
function ExerciseRow({
  idx, title, planned, done, openVideo, openLog, onOpenVariant
}:{
  idx:number;
  title:string;
  planned?:number;
  done?:number;
  openVideo:(src?:string)=>void;
  openLog:(idx:number, dateStr?:string)=>void;
  onOpenVariant:(idx:number)=>void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef<number | null>(null);

  // Local haptic helper
  const hapticLight = () => {
    try { window?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch {}
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    // reveal on left swipe
    const next = Math.min(0, Math.max(-96, dx)); // cap to -96px
    setSwipeX(next);
  };
  const onTouchEnd = () => {
    if (startX.current === null) return;
    const willOpen = swipeX < -48;
    setOpen(willOpen);
    if (willOpen) hapticLight();
    setSwipeX(0);
    startX.current = null;
  };
  // Add revealed boolean after touch handlers, before return
  const revealed = open || swipeX < 0;

  return (
    <li
      className="relative overflow-hidden"
      data-ex-id={idx}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Actions revealed */}
      <div
        className={`absolute inset-y-0 right-0 flex items-stretch gap-1 pr-1 transition-opacity ${revealed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!revealed}
      >
        <button onClick={()=>onOpenVariant(idx)} className="my-1 h-[42px] w-[42px] rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
          <IconRefreshCw size={18} />
        </button>
        <button onClick={()=>openVideo("/demo-video.mp4")} className="my-1 h-[42px] w-[42px] rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
          <IconPlay size={18} />
        </button>
        <button onClick={()=>openLog(idx)} className="my-1 h-[42px] w-[42px] rounded-lg bg-green-600 text-neutral-900 font-bold flex items-center justify-center">
          <IconPlus size={18} />
        </button>
      </div>

      {/* Row content */}
      <div
        className={`relative flex items-center justify-between rounded-lg bg-neutral-800 px-3 py-3 transition-transform`}
        style={{ transform: `translateX(${open ? -96 : 0}px) translateX(${swipeX}px)` }}
      >
        <span className="pr-3">{title}</span>
        {typeof planned !== "undefined" && (
          <span className={`ml-auto mr-2 text-xs rounded-md px-2 py-0.5 ${!done ? "bg-neutral-700 text-white/80" : (done! < (planned||0) ? "bg-amber-500/80 text-neutral-900" : "bg-green-500/90 text-neutral-900")}`}>
            {done ?? 0}/{planned}
          </span>
        )}
        <div className="hidden md:flex items-center gap-2">
          <button onClick={()=>onOpenVariant(idx)} className="h-10 w-10 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white" title="Заміна вправи">
            <IconRefreshCw size={18} />
          </button>
          <button onClick={()=>openVideo("/demo-video.mp4")} className="h-10 w-10 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white" title="Відео">
            <IconPlay size={18} />
          </button>
          <button onClick={()=>openLog(idx)} className="h-10 px-3 rounded-full bg-green-600 text-neutral-900 font-bold" title="Записати підходи">
            <IconPlus size={18} />
          </button>
        </div>
      </div>
    </li>
  );
}

// --- Log Modal extracted for clarity and quick entry improvements ---
function LogModal({
  active, logOpen, setLogOpen, logRows, setLogRows, logDate, setLogDate,
  updateRow, removeRow, addRow, saveLog
}:{
  active:number;
  logOpen:{index:number};
  setLogOpen:(v:null)=>void;
  logRows:Array<{kg:string;reps:string}>;
  setLogRows:React.Dispatch<React.SetStateAction<Array<{kg:string;reps:string}>>>;
  logDate:string;
  setLogDate:(d:string)=>void;
  updateRow:(i:number,field:"kg"|"reps",val:string)=>void;
  removeRow:(i:number)=>void;
  addRow:()=>void;
  saveLog:()=>void;
}) {
  const cloneLast = () => {
    setLogRows(prev => {
      const last = prev[prev.length - 1] || { kg:"", reps:"" };
      return [...prev, { ...last }];
    });
  };
  const repsInputs = useRef<Array<HTMLInputElement | null>>([]);
  const focusNext = (i:number) => {
    const el = repsInputs.current[i+1];
    if (el) el.focus();
  };
  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end justify-center p-3">
      <div className="w-full max-w-md rounded-t-2xl bg-neutral-900 border border-neutral-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold text-lg">Запис тренування</div>
          <button onClick={()=>setLogOpen(null)} className="h-10 w-10 rounded-full bg-neutral-800">✕</button>
        </div>
        <div className="text-xs opacity-70 mb-3">День {active} • Вправа #{logOpen.index+1}</div>
        <label className="block text-xs opacity-80 mb-2">
          Дата тренування
          <input
            type="date"
            value={logDate}
            onChange={(e)=>setLogDate(e.target.value)}
            className="mt-1 w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-2"
          />
        </label>

        <div className="space-y-2">
          {logRows.map((row, i)=>(
            <div key={i} className="grid grid-cols-7 gap-2 items-center">
              <label className="col-span-3 text-xs opacity-80">кг
                <input value={row.kg} onChange={e=>updateRow(i,"kg",e.target.value)}
                  className="mt-1 w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-2" inputMode="decimal" />
              </label>
              <label className="col-span-3 text-xs opacity-80">раз
                <input
                  ref={el=>repsInputs.current[i]=el}
                  value={row.reps}
                  onChange={e=>updateRow(i,"reps",e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); i===logRows.length-1 ? cloneLast() : focusNext(i); }}}
                  className="mt-1 w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-2"
                  inputMode="numeric"
                />
              </label>
              <button onClick={()=>removeRow(i)} className="col-span-1 h-9 self-end rounded-lg bg-neutral-800 border border-neutral-700">−</button>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={cloneLast} className="rounded-lg bg-neutral-800 border border-neutral-700 py-2">Клонувати останній</button>
            <button onClick={addRow} className="rounded-lg bg-neutral-800 border border-neutral-700 py-2">+ Додати підхід</button>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={()=>setLogOpen(null)} className="flex-1 rounded-xl py-3 bg-neutral-800 border border-neutral-700">Відмінити</button>
          <button onClick={saveLog} className="flex-1 rounded-xl py-3 bg-green-600 text-neutral-900 font-bold">Зберегти</button>
        </div>
      </div>
    </div>
  );
}
