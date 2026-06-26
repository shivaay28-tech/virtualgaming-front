import React from "react";

/**
 * KpiStrip
 *
 * Horizontal compact KPI bar. Replaces 3-4xl StatCard grids.
 *
 * @param {Array}  items   – [{ label, value, sub, testId, tone, hero }]
 * @param {string} className
 */
export function KpiStrip({ items = [], className = "" }) {
  return (
    <div
      className={`flex flex-wrap gap-px border border-white/10 rounded-md overflow-hidden ${className}`}
    >
      {items.map((item, i) => (
        <KpiCell key={i} {...item} />
      ))}
    </div>
  );
}

function toneClass(tone) {
  if (tone === "positive") return "text-emerald-400";
  if (tone === "negative") return "text-red-400";
  if (tone === "warn")     return "text-amber-400";
  if (tone === "neutral")  return "text-white/60";
  return "text-white";
}

function KpiCell({ label, value, sub, testId, tone, hero = false }) {
  return (
    <div
      className={`flex-1 min-w-[120px] px-3 py-2 bg-white/[0.02] border-r border-white/6 last:border-r-0 ${
        hero ? "min-w-[200px] bg-white/[0.035]" : ""
      }`}
    >
      <div className="text-[9px] tracking-[0.2em] uppercase text-white/35 mb-0.5">
        {label}
      </div>
      <div
        className={`font-mono-data leading-none ${hero ? "text-xl" : "text-base"} ${toneClass(tone)}`}
        data-testid={testId}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[9px] text-white/30 mt-0.5 font-mono-data">{sub}</div>
      )}
    </div>
  );
}
