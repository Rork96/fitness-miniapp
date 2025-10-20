
 "use client";
import BottomBar from "@/components/BottomBar";
import Link from "next/link";
import { Joystick as IconJoystick, CalendarDays as IconCalendarDays, Calculator as IconCalculator, GraduationCap as IconGraduationCap } from "lucide-react";
import { useState } from "react";

type Article = { id:string; title:string; important?:boolean; body:string };

const ARTICLES: Article[] = [
  { id:"periodization", title:"Повторення (періодизація)", important:true, body:`Пояснення простою мовою: змінюй діапазон повторень хвилями (напр. 12→10→8), щоб прогресувати без перевтоми.` },
  { id:"progression", title:"Вага снаряда (прогресія навантажень)", important:true, body:`Додавай +2.5–5 кг коли виконав усі підходи в заданих повторах дві сесії поспіль.` },
  { id:"working-weight", title:"Як підібрати робочу вагу", important:true, body:`Орієнтир — останні 2 повтори важкі, але контрольовані. Краще недодати, ніж зірвати техніку.` },
  { id:"superset-how", title:"Як робити суперсет", important:true, body:`Чергуй 2 вправи з мінімальним відпочинком. Один таймер — на обидві вправи.` },
];

export default function Knowledge(){
  const [open,setOpen]=useState<Article|null>(null);
  return (
    <main className="max-w-md mx-auto p-4 space-y-4 pb-28">
      <header className="rounded-2xl bg-neutral-900 p-4"><div className="text-xl font-extrabold">База знань</div></header>

      <section className="grid grid-cols-2 gap-3">
        {ARTICLES.map(a=> (
          <button key={a.id} onClick={()=>setOpen(a)} className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden text-left">
            <div className="h-28 bg-neutral-800/60 flex items-center justify-center text-neutral-700 text-xs">обкладинка зʼявиться пізніше</div>
            <div className="p-3">
              {a.important && <span className="inline-block mb-2 text-[10px] font-bold px-2 py-1 rounded-md bg-lime-500 text-neutral-900">ВАЖЛИВО</span>}
              <div className="font-medium leading-snug">{a.title}</div>
            </div>
          </button>
        ))}
      </section>

      {/* Bottom Nav */}
      <BottomBar active="knowledge" />

      {open && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-3" onClick={()=>setOpen(null)}>
          <div className="relative w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setOpen(null)} className="absolute -top-4 -right-4 h-14 w-14 rounded-full bg-white text-black text-3xl flex items-center justify-center shadow-xl" aria-label="Закрити">×</button>
            <div className="rounded-2xl overflow-hidden bg-neutral-900 p-5">
              <div className="text-lg font-extrabold mb-2">{open.title}</div>
              <div className="text-sm opacity-90 whitespace-pre-line">{open.body}</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}