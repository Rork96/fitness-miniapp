"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { WheelPicker } from "@/features/common/wheel/WheelPicker";
import { useHaptics } from "@/lib/useHaptics";

type EditMacroSheetProps = {
  open: boolean;
  title: string;
  unit: string;
  values: number[];
  value: number;
  onApply: (value: number) => void;
  onClose: () => void;
  onRevert: () => void;
};

export function EditMacroSheet({ open, title, unit, values, value, onApply, onClose, onRevert }: EditMacroSheetProps) {
  const { tapLight, tapMedium } = useHaptics();
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    if (open) {
      setCurrent(value);
    }
  }, [open, value]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 320 }}
            animate={{ y: 0 }}
            exit={{ y: 320 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-full rounded-t-3xl bg-[#111821] px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-sm text-white/50">Adjust your target</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  tapLight();
                  onClose();
                }}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6">
              <WheelPicker
                values={values}
                value={current}
                onChange={(v) => {
                  const numeric = Number(v);
                  setCurrent(numeric);
                  tapLight();
                }}
                ariaLabel={title}
                visibleCount={7}
              />
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-sm text-white/60">Selected</span>
              <span className="text-2xl font-bold">
                {Math.round(current)}
                <span className="ml-1 text-sm font-semibold uppercase text-white/40">{unit}</span>
              </span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  tapLight();
                  onRevert();
                  onClose();
                }}
                className="h-12 flex-1 rounded-full border border-white/15 bg-transparent text-sm font-semibold text-white/70"
              >
                Revert
              </button>
              <button
                type="button"
                onClick={() => {
                  tapMedium();
                  onApply(current);
                  onClose();
                }}
                className="h-12 flex-1 rounded-full bg-[#8ee000] text-sm font-bold text-black shadow-[0_10px_24px_rgba(142,224,0,0.25)]"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
