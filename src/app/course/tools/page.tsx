"use client";

import BottomBar from "@/components/BottomBar";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Zap, Calculator as IconCalculator } from "lucide-react";

export default function Tools() {
  const router = useRouter();
  const [openOneRM, setOpenOneRM] = useState(false);

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pb-28 text-white">
      <header className="rounded-2xl bg-neutral-900 p-4">
        <div className="text-xl font-extrabold">Розрахунки</div>
      </header>

      <section className="rounded-2xl bg-neutral-900">
        <button
          type="button"
          onClick={() => router.push("/calories")}
          className="flex w-full items-center gap-3 border-b border-neutral-800 px-4 py-5 text-left transition hover:bg-neutral-850"
        >
          <Flame className="text-lime-400" size={22} />
          <div className="flex-1 text-left text-base font-medium">Онбординг калорій</div>
          <IconCalculator size={18} />
        </button>
        <button
          type="button"
          onClick={() => setOpenOneRM(true)}
          className="flex w-full items-center gap-3 px-4 py-5 text-left transition hover:bg-neutral-850"
        >
          <Zap className="text-lime-400" size={22} />
          <div className="flex-1 text-left text-base font-medium">Одноповторний максимум</div>
          <IconCalculator size={18} />
        </button>
      </section>

      <BottomBar active="tools" />

      {openOneRM && <OneRMModal onClose={() => setOpenOneRM(false)} />}
    </main>
  );
}

function OneRMModal({ onClose }: { onClose: () => void }) {
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<string>("");

  const orm = useMemo(() => {
    const w = Number(weight);
    const r = Number(reps);
    if (!w || !r) return 0;
    return Math.round(w * (1 + r / 30));
  }, [weight, reps]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div className="relative w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-4 -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl text-black shadow-xl"
          aria-label="Закрити"
        >
          ×
        </button>
        <div className="rounded-2xl bg-neutral-900 p-5">
          <div className="mb-4 text-center text-lg font-extrabold">1ПМ — розрахунок</div>
          <div className="space-y-3">
            <input
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="Вага, кг"
              inputMode="decimal"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-3"
            />
            <input
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              placeholder="Повторів"
              inputMode="numeric"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-3"
            />
            <div className="text-center text-4xl font-black">{orm || 0} кг</div>
          </div>
        </div>
      </div>
    </div>
  );
}
