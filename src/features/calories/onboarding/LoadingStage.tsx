'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LottieFromPath } from '@/lib/LottieFromPath';

const STAGES = [
  'Customizing health plan…',
  'Estimating your metabolic age…',
  'Computing macros…',
  'Finalizing results…',
] as const;

export default function LoadingStage({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setIdx((i) => Math.min(i + 1, STAGES.length));
    }, 1000);

    const endTimer = setTimeout(onDone, 4200);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(endTimer);
    };
  }, [onDone]);

  const percent = Math.round((idx / STAGES.length) * 100);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-white -translate-y-8 md:-translate-y-10">
      <div className="text-6xl md:text-7xl font-black">{percent}%</div>
      <p className="text-xl text-neutral-400">
        {STAGES[Math.min(idx, STAGES.length - 1)]}
      </p>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-lime-400"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>

      <div className="mt-3 md:mt-4 w-full max-w-sm rounded-2xl bg-neutral-900/90 p-4 backdrop-blur">
        {STAGES.map((stage, stageIdx) => {
          const done = stageIdx < idx;
          return (
            <div key={stage} className="mb-3 flex items-center gap-3 last:mb-0">
              <div className="h-6 w-6 shrink-0">
                {done ? (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <LottieFromPath path="/lottie/check.json" className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <div className="h-6 w-6 rounded-full border border-neutral-600" />
                )}
              </div>
              <span className={stageIdx <= idx ? 'text-white' : 'text-neutral-500'}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
