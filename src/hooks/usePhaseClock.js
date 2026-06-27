import { useEffect, useMemo, useRef, useState } from "react";

function parseStartedAt(iso) {
  if (!iso) return null;
  const ms = Date.parse(String(iso).replace("Z", "+00:00"));
  return Number.isFinite(ms) ? ms : null;
}

function computeTimeLeft(phaseDuration, startedMs) {
  if (!startedMs || !phaseDuration) return 0;
  const elapsed = (Date.now() - startedMs) / 1000;
  return Math.max(0, phaseDuration - elapsed);
}

/** Local countdown synced from server phase_started_at — avoids fast HTTP polling. */
export function usePhaseClock(state) {
  const [tick, setTick] = useState(0);
  const syncRef = useRef({ phase: null, roundId: null, duration: 0, startedMs: null });

  useEffect(() => {
    if (!state) return undefined;
    const startedMs = parseStartedAt(state.phase_started_at);
    const changed =
      state.phase !== syncRef.current.phase ||
      state.round_id !== syncRef.current.roundId ||
      state.phase_duration !== syncRef.current.duration ||
      startedMs !== syncRef.current.startedMs;

    if (changed) {
      syncRef.current = {
        phase: state.phase,
        roundId: state.round_id,
        duration: state.phase_duration || 0,
        startedMs,
      };
      setTick((n) => n + 1);
    }

    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [state?.phase, state?.round_id, state?.phase_duration, state?.phase_started_at]);

  return useMemo(() => {
    if (!state) return null;
    const { duration, startedMs } = syncRef.current;
    const timeLeft =
      startedMs != null
        ? Math.round(computeTimeLeft(duration, startedMs) * 100) / 100
        : state.time_left;
    return { ...state, time_left: timeLeft };
  }, [state, tick]);
}
