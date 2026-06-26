/** Mirror backend round_timing.py — TEENPATTI.mp4 full-cycle sync (~56s). */

export const VIDEO_TOTAL_SECS = 56;
export const BETTING_SECS = 20;
export const LOCKED_SECS = 2;
export const DEALING_SECS = 6;
export const REVEAL_START_SECS = 28;
export const REVEAL_SECS = 20;
export const SETTLED_SECS = 8;

/** Middle → third → first per player (matches video card reveals). */
export const REVEAL_ORDER = [
  { side: "a", index: 1 },
  { side: "b", index: 1 },
  { side: "a", index: 2 },
  { side: "b", index: 2 },
  { side: "a", index: 0 },
  { side: "b", index: 0 },
];

/** Absolute video times when each card becomes visible. */
export const REVEAL_ABSOLUTE_TIMES = [26, 31, 36, 39, 44, 48];

/** Seconds from reveal phase start when each card becomes visible. */
export const REVEAL_OFFSETS = REVEAL_ABSOLUTE_TIMES.map((t) => t - REVEAL_START_SECS);

function countRevealed(elapsed) {
  let count = 0;
  for (const offset of REVEAL_OFFSETS) {
    if (elapsed >= offset) count += 1;
    else break;
  }
  return Math.min(6, count);
}

/** How many cards are visible per backend rules (1..6 during reveal, 6 when settled). */
export function revealedCount(phase, timeLeft, phaseDuration) {
  if (phase === "settled") return 6;
  if (phase !== "reveal") return 0;
  const elapsed = Math.max(0, phaseDuration - timeLeft);
  return countRevealed(elapsed);
}

/** Reveal count from absolute video playback time (video t=0 = betting start). */
export function revealedCountFromVideoTime(videoTime) {
  const elapsed = Math.max(0, videoTime - REVEAL_START_SECS);
  return countRevealed(elapsed);
}

/** Target video time for the current game phase (late-join seek). */
export function videoTimeForPhase(phase, timeLeft, phaseDuration) {
  const elapsed = Math.max(0, phaseDuration - timeLeft);
  if (phase === "betting") return Math.min(elapsed, BETTING_SECS);
  if (phase === "locked") return BETTING_SECS + Math.min(elapsed, LOCKED_SECS);
  if (phase === "dealing") return BETTING_SECS + LOCKED_SECS + Math.min(elapsed, DEALING_SECS);
  if (phase === "reveal") return REVEAL_START_SECS + Math.min(elapsed, REVEAL_SECS);
  if (phase === "settled") {
    return REVEAL_START_SECS + REVEAL_SECS + Math.min(elapsed, SETTLED_SECS);
  }
  return 0;
}

/** Cards currently in flight (arrived at slot but not yet face-up). */
export function cardsInFlight(phase, timeLeft, phaseDuration) {
  if (phase !== "reveal") return 0;
  const elapsed = Math.max(0, phaseDuration - timeLeft);
  let flying = 0;
  for (let i = 0; i < REVEAL_OFFSETS.length; i += 1) {
    const start = REVEAL_OFFSETS[i];
    const next = REVEAL_OFFSETS[i + 1] ?? REVEAL_SECS;
    const step = next - start;
    const flyPortion = step * 0.42;
    if (elapsed >= start && elapsed < start + flyPortion) flying += 1;
  }
  return flying;
}

/** Build progressive card faces from full outcome (for client-side interpolation). */
export function buildProgressiveCards(phase, timeLeft, phaseDuration, outcomeCards) {
  const blank = { a: [null, null, null], b: [null, null, null] };
  if (!outcomeCards) return blank;
  const count = revealedCount(phase, timeLeft, phaseDuration);
  if (count <= 0) return blank;
  const a = [null, null, null];
  const b = [null, null, null];
  for (let i = 0; i < count; i += 1) {
    const { side, index } = REVEAL_ORDER[i];
    const card = side === "a" ? outcomeCards.a[index] : outcomeCards.b[index];
    if (side === "a") a[index] = card;
    else b[index] = card;
  }
  return { a, b };
}

/** Per-card animation schedule during reveal (seconds from reveal phase start). */
export function cardRevealSchedule(order) {
  const start = REVEAL_OFFSETS[order];
  const nextStart = REVEAL_OFFSETS[order + 1] ?? REVEAL_SECS;
  const step = nextStart - start;
  const flyDur = step * 0.42;
  const flipDur = step * 0.28;
  return {
    flyStart: start,
    flyEnd: start + flyDur,
    flipStart: start + flyDur * 0.55,
    flipEnd: start + flyDur + flipDur,
    step,
  };
}
