import React from "react";

function Cell({ label, value, testId }) {
  return (
    <div className="border border-white/10 rounded-sm p-2 sm:p-3 bg-white/[0.02]">
      <div className="text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-white/40 truncate">
        {label}
      </div>
      <div
        className="font-mono-data text-lg sm:text-xl mt-1 text-white"
        data-testid={testId}
      >
        {value}
      </div>
    </div>
  );
}

function formatTimeRange(summary) {
  if (!summary?.range_start || !summary?.range_end) return null;
  const opts = { dateStyle: "medium", timeStyle: "short" };
  const tz = summary.timezone || undefined;
  try {
    const start = new Date(summary.range_start).toLocaleString(undefined, {
      ...opts,
      timeZone: tz,
    });
    const end = new Date(summary.range_end).toLocaleString(undefined, {
      ...opts,
      timeZone: tz,
    });
    return `${start} – ${end}`;
  } catch {
    return null;
  }
}

export function StatsPanel({ sessionSummary, currentRoundNumber }) {
  const summary = sessionSummary || {};
  const timeRange = formatTimeRange(summary);
  const roundsDisplay =
    currentRoundNumber ?? summary.current_round_number ?? 0;

  return (
    <div data-testid="stats-panel">
      {timeRange && (
        <div
          className="text-[10px] text-white/35 mb-3 font-mono-data"
          data-testid="session-time-range"
        >
          {timeRange}
        </div>
      )}
      {/* 2 cols on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <Cell label="Rounds" value={roundsDisplay} testId="stat-rounds" />
        <Cell label="A Win %" value={`${summary.a_win_pct ?? 0}%`} testId="stat-a-rate" />
        <Cell label="B Win %" value={`${summary.b_win_pct ?? 0}%`} testId="stat-b-rate" />
        <Cell label="Pair+ A %" value={`${summary.pair_plus_a_pct ?? 0}%`} testId="stat-pair-a" />
        <Cell label="Pair+ B %" value={`${summary.pair_plus_b_pct ?? 0}%`} testId="stat-pair-b" />
        <Cell label="Streak" value={summary.streak ?? "—"} testId="stat-streak" />
      </div>
    </div>
  );
}
