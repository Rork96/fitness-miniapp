"use client";

import { motion } from "framer-motion";
import { ReactNode, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/lib/useHaptics";

type Props = {
  title: string;
  value: number;
  unit: string;
  percent: number;
  accentClass?: string;
  icon?: ReactNode;
  onEdit?: () => void;
};

export function RingCard({
  title,
  value,
  unit,
  percent,
  accentClass = "stroke-white",
  icon,
  onEdit,
}: Props) {
  const { tapLight } = useHaptics();
  const size = 124;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = useMemo(() => Math.max(0, Math.min(1, percent)) * circumference, [percent, circumference]);

  const handleEdit = () => {
    if (!onEdit) return;
    tapLight();
    onEdit();
  };

  return (
    <div className="relative rounded-2xl bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-white/60">
        <span className="inline-flex items-center gap-1 font-semibold text-white/70">
          {icon}
          {title}
        </span>
        {onEdit && (
          <button onClick={handleEdit} className="text-[10px] font-semibold text-white/60 underline">
            Edit
          </button>
        )}
      </div>

      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className="stroke-white/15"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className={cn("fill-none", accentClass)}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - dash }}
              transition={{ type: "spring", stiffness: 120, damping: 24 }}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              fill="none"
            />
          </svg>

          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center leading-none">
              <div className="font-black text-[clamp(18px,4.2vw,28px)]">{Math.round(value)}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/50">{unit}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
