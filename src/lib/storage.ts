export const getProgress = () => {
  if (typeof window==="undefined") return { done: [] as number[] };
  try { return JSON.parse(localStorage.getItem("progress") || '{"done":[]}'); }
  catch { return { done: [] as number[] }; }
};
export const toggleDayDone = (day:number) => {
  const p=getProgress(); const has=p.done.includes(day);
  const done = has ? p.done.filter(d=>d!==day) : [...p.done, day];
  localStorage.setItem("progress", JSON.stringify({ done })); return { done };
};
