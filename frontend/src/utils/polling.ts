export const getPollIntervalMs = (fallbackMs: number) => {
  const raw = Number((import.meta as any).env?.VITE_POLL_INTERVAL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : fallbackMs;
};

export const shouldPollNow = () => {
  if (typeof document !== 'undefined' && document.hidden) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  return true;
};

