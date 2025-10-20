"use client";
import { demoDays } from "@/lib/demoData";
import { getProgress, toggleDayDone } from "@/lib/storage";
import { useEffect, useMemo, useState } from "react";

export default function Lessons(){
  const [active,setActive]=useState(1);
  const [done,setDone]=useState<number[]>([]);

  // Load local progress
  useEffect(()=>{
    (async ()=>{
      try{
        const p = await (getProgress as any)(); // supports async/local fallback
        setDone(p?.done || []);
      }catch{
        // fallback to old sync version in case user didn't update storage yet
        try { setDone((getProgress as any)().done || []); } catch {}
      }
    })();
  },[]);

  const totalDays = 21; // visual target of the full program
  const percent = useMemo(()=> Math.min(100, Math.round((done.length/totalDays)*100)), [done.length]);

  const current = demoDays.find(d=>d.day===active);
  const isCompleted = done.includes(active);

  const goPrev = () => setActive(prev => Math.max(1, prev-1));
  const goNext = () => setActive(prev => Math.min(demoDays[demoDays.length-1].day, prev+1));

  const onToggleDay = async () => {
    try{
      const p = await (toggleDayDone as any)(active);
      setDone(p?.done || []);
    }catch{
      // legacy sync fallback
      const p = (toggleDayDone as any)(active);
      setDone(p?.done || []);
    }
  };

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      {/* header */}
      <section className="rounded-2xl bg-neutral-900 p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">Програма • Уроки</h1>
          <span className="text-sm opacity-80">{done.length}/{totalDays} днів</span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-neutral-800">
          <div
            className="h-2 rounded-full bg-green-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-1 text-xs opacity-70">Прогрес {percent}%</div>
      </section>

      {/* day chips - horizontal scroll */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {demoDays.map(d=>(
            <button
              key={d.day}
              onClick={()=>setActive(d.day)}
              className={[
                "px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-colors",
                active===d.day ? "bg-green-600 border-green-600 text-neutral-900 font-bold"
                                : "bg-neutral-900 border-neutral-800 text-neutral-100"
              ].join(" ")}
              aria-pressed={active===d.day}
            >
              День {d.day} {done.includes(d.day) ? "✅" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* current day content */}
      <section className="space-y-3">
        {current?.blocks.map((b,i)=>(
          <div key={i} className="rounded-xl bg-neutral-900 p-4 border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">{b.title}</div>
              {"sets" in b ? (
                <span className="text-xs opacity-70">{(b as any).sets}</span>
              ) : null}
            </div>

            {"items" in b ? (
              <ul className="list-disc pl-5 opacity-90 space-y-1">
                {(b as any).items!.map((x:string,idx:number)=><li key={idx}>{x}</li>)}
              </ul>
            ) : (
              <p className="opacity-80 text-sm">Виконай підхід(-и) у комфортному темпі, контролюй техніку.</p>
            )}
          </div>
        ))}

        {/* video placeholder */}
        <div className="rounded-xl bg-neutral-900 p-4 border border-neutral-800">
          <div className="mb-2 font-bold">Відео тренування (демо)</div>
          <div className="aspect-video w-full rounded-lg bg-black/50 flex items-center justify-center text-sm opacity-70">
            Тут буде відео/плеєр
          </div>
        </div>
      </section>

      {/* action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="flex-1 rounded-xl py-3 font-semibold bg-neutral-900 border border-neutral-800"
        >
          Попередній
        </button>

        <button
          onClick={onToggleDay}
          className={`flex-[2] rounded-xl py-3 font-bold ${isCompleted?'bg-white text-neutral-900':'bg-green-600 text-neutral-900'}`}
        >
          {isCompleted ? "ЗАВЕРШЕНО ✅" : "ЗАВЕРШИТИ ДЕНЬ"}
        </button>

        <button
          onClick={goNext}
          className="flex-1 rounded-xl py-3 font-semibold bg-neutral-900 border border-neutral-800"
        >
          Далі
        </button>
      </div>

      {/* helper legend */}
      <p className="text-xs opacity-60 text-center">
        Перші 3 дні — демо. Повний курс відкриється після оплати.
      </p>
    </main>
  );
}
