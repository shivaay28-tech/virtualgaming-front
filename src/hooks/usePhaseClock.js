import { useEffect, useState } from "react";

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
  const [, setTick] = useState(0);
  const active = state != null;

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [active, state?.phase, state?.round_id, state?.phase_started_at]);

  if (!state) return null;

  const startedMs = parseStartedAt(state.phase_started_at);
  const duration = state.phase_duration || 0;
  const timeLeft =
    startedMs != null
      ? Math.round(computeTimeLeft(duration, startedMs) * 100) / 100
      : state.time_left;

  return { ...state, time_left: timeLeft };
}
