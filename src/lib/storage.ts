export type Progress = { done: number[] };

export const getProgress = (): Progress => {
  try {
    const raw = localStorage.getItem("progress");
    if (raw) return JSON.parse(raw) as Progress;
  } catch {}
  return { done: [] };
};

export const toggleDayDone = (day: number): Progress => {
  const p = getProgress();
  const has = p.done.includes(day);
  const done = has ? p.done.filter((d: number) => d !== day) : [...p.done, day];
  localStorage.setItem("progress", JSON.stringify({ done }));
  return { done };
};
