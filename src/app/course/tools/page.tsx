
 "use client";
import BottomBar from "@/components/BottomBar";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Joystick as IconJoystick,
  CalendarDays as IconCalendarDays,
  Calculator as IconCalculator,
  GraduationCap as IconGraduationCap,
  Flame,
  Zap,
  X,
  ChevronLeft,
} from "lucide-react";

type Gender = "male" | "female";

const pad = (n:number)=>String(n).padStart(2,"0");
const dateKey = ()=> {
  const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

export default function Tools(){
  const [openCal, setOpenCal] = useState(false);
  const [open1RM, setOpen1RM] = useState(false);

  return (
    <main className="max-w-md mx-auto p-4 space-y-4 pb-28">
      <header className="rounded-2xl bg-neutral-900 p-4">
        <div className="text-xl font-extrabold">Розрахунки</div>
      </header>

      <section className="rounded-2xl bg-neutral-900">
        <button onClick={()=>setOpenCal(true)} className="w-full flex items-center gap-3 px-4 py-5 border-b border-neutral-800">
          <Flame className="text-lime-400" size={22}/>
          <div className="flex-1 text-left font-medium">Калькулятор калорій</div>
          <IconCalculator size={18}/>
        </button>
        <button onClick={()=>setOpen1RM(true)} className="w-full flex items-center gap-3 px-4 py-5">
          <Zap className="text-lime-400" size={22}/>
          <div className="flex-1 text-left font-medium">Одноповторний максимум</div>
          <IconCalculator size={18}/>
        </button>
      </section>

      {/* Bottom Nav */}
      <BottomBar active="tools" />

      {openCal && <CalorieWizard onClose={()=>setOpenCal(false)} />}
      {open1RM && <OneRMModal onClose={()=>setOpen1RM(false)} />}
    </main>
  );
}

// ---- Calorie Wizard ----
function CalorieWizard({onClose}:{onClose:()=>void}){
  const [step,setStep]=useState(1);
  const [gender,setGender]=useState<Gender>("male");
  const [height,setHeight]=useState<string>("");
  const [weight,setWeight]=useState<string>("");
  const [age,setAge]=useState<string>("");
  const [activity,setActivity]=useState<number>(3);

  useEffect(()=>{
    // preload last answers
    const raw = localStorage.getItem("calorie_profile");
    if (raw) {
      try{
        const p = JSON.parse(raw);
        setGender(p.gender ?? "male");
        setHeight(p.height ?? "");
        setWeight(p.weight ?? "");
        setAge(p.age ?? "");
        setActivity(p.activity ?? 3);
      }catch{}
    }
  },[]);

  const next = ()=> setStep(s=>Math.min(4,s+1));
  const prev = ()=> setStep(s=>Math.max(1,s-1));

  const bmr = useMemo(()=>{
    const h=Number(height), w=Number(weight), a=Number(age);
    if(!h||!w||!a) return 0;
    // Mifflin-St Jeor
    return gender==="male" ? (10*w + 6.25*h - 5*a + 5) : (10*w + 6.25*h - 5*a - 161);
  },[gender,height,weight,age]);

  const tdee = useMemo(()=>{
    const factors=[1.2,1.375,1.55,1.725,1.9];
    if(!bmr) return 0;
    return Math.round(bmr * factors[Math.min(4,Math.max(0,activity-1))]);
  },[bmr,activity]);

  const save = ()=>{
    const payload={gender,height,weight,age,activity,tdee,updated:dateKey()};
    try{ localStorage.setItem("calorie_profile", JSON.stringify(payload)); }catch{}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div className="relative w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-4 -right-4 h-14 w-14 rounded-full bg-white text-black text-3xl flex items-center justify-center shadow-xl" aria-label="Закрити">×</button>
        <div className="rounded-2xl overflow-hidden bg-neutral-900 p-5">
          <div className="text-center text-lg font-extrabold mb-2">Калькулятор калорій</div>
          <div className="h-2 rounded-full bg-neutral-800 overflow-hidden mb-4">
            <div className="h-2 bg-lime-500 transition-all" style={{width:`${(step-1)/3*100}%`}}/>
          </div>

          {step===1 && (
            <div className="space-y-4">
              <div className="text-2xl font-extrabold text-center">Оберіть стать</div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setGender("male")} className={`rounded-xl p-4 bg-neutral-800 border ${gender==="male"?"border-lime-500":"border-neutral-700"}`}>Чоловік</button>
                <button onClick={()=>setGender("female")} className={`rounded-xl p-4 bg-neutral-800 border ${gender==="female"?"border-lime-500":"border-neutral-700"}`}>Жінка</button>
              </div>
            </div>
          )}
          {step===2 && (
            <div className="space-y-3">
              <div className="text-2xl font-extrabold text-center">Розкажіть про себе</div>
              <input value={height} onChange={e=>setHeight(e.target.value)} placeholder="Зріст, см" inputMode="decimal" className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-3" />
              <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Вага, кг" inputMode="decimal" className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-3" />
              <input value={age} onChange={e=>setAge(e.target.value)} placeholder="Вік, років" inputMode="numeric" className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-3" />
            </div>
          )}
          {step===3 && (
            <div className="space-y-3">
              <div className="text-2xl font-extrabold text-center">Рівень активності</div>
              <div className="grid grid-cols-5 gap-2">
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setActivity(n)} className={`rounded-xl py-4 ${activity===n?"bg-lime-500 text-neutral-900":"bg-neutral-800"}`}>{n}</button>
                ))}
              </div>
              <ul className="text-sm opacity-80 space-y-1 mt-2">
                <li><span className="text-lime-400 font-bold">1.</span> Мінімум активності, сидяча робота</li>
                <li><span className="text-lime-400 font-bold">2.</span> Легка активність 1–2 р/тиж</li>
                <li><span className="text-lime-400 font-bold">3.</span> 3–4 тренування на тиждень</li>
                <li><span className="text-lime-400 font-bold">4.</span> 5–7 тренувань на тиждень</li>
                <li><span className="text-lime-400 font-bold">5.</span> Важка щоденна активність</li>
              </ul>
            </div>
          )}
          {step===4 && (
            <div className="space-y-3 text-center">
              <div className="text-2xl font-extrabold">Ваш результат</div>
              <div className="text-4xl font-black">{tdee || 0} ккал/день</div>
              <div className="text-xs opacity-70">Зберігаємо профіль локально і будемо підставляти далі</div>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button onClick={prev} disabled={step===1} className="flex-1 rounded-xl py-3 bg-neutral-800 disabled:opacity-40">Назад</button>
            {step<4 ? (
              <button onClick={next} className="flex-1 rounded-xl py-3 bg-lime-500 text-neutral-900 font-bold">Далі →</button>
            ) : (
              <button onClick={save} className="flex-1 rounded-xl py-3 bg-lime-500 text-neutral-900 font-bold">Зберегти</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- One Rep Max ----
function OneRMModal({onClose}:{onClose:()=>void}){
  const [w,setW]=useState<string>("");
  const [r,setR]=useState<string>("");
  const orm = useMemo(()=>{
    const weight=Number(w), reps=Number(r);
    if(!weight||!reps) return 0;
    // Epley: 1RM = w*(1+reps/30)
    return Math.round(weight*(1+reps/30));
  },[w,r]);

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div className="relative w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-4 -right-4 h-14 w-14 rounded-full bg-white text-black text-3xl flex items-center justify-center shadow-xl" aria-label="Закрити">×</button>
        <div className="rounded-2xl overflow-hidden bg-neutral-900 p-5">
          <div className="text-center text-lg font-extrabold mb-2">1ПМ — розрахунок</div>
          <div className="space-y-3">
            <input value={w} onChange={e=>setW(e.target.value)} placeholder="Вага, кг" inputMode="decimal" className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-3" />
            <input value={r} onChange={e=>setR(e.target.value)} placeholder="Повторів" inputMode="numeric" className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-3" />
            <div className="text-4xl font-black text-center">{orm || 0} кг</div>
          </div>
        </div>
      </div>
    </div>
  );
}