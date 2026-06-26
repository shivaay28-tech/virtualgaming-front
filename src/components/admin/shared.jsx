import React from "react";

/* ─── Shared helpers ─────────────────────────────────────────────────── */

/** Format rupees — always integer, with ₹ prefix */
export function formatCurrency(v) {
  return `₹${Math.round(v || 0).toLocaleString()}`;
}

/** Format signed house PNL — green +, red - */
export function formatSignedCurrency(v) {
  const n = Math.round(v || 0);
  return n >= 0 ? `+₹${n.toLocaleString()}` : `-₹${Math.abs(n).toLocaleString()}`;
}

/* ─── StatCard (compact) ─────────────────────────────────────────────── */
/** Compact stat tile. Use KpiStrip when you have 3+ metrics. */
export function StatCard({ label, value, testId, sub }) {
  return (
    <div className="border border-white/10 rounded-sm px-3 py-2 bg-white/[0.02]">
      <div className="text-[9px] tracking-[0.2em] uppercase text-white/40">{label}</div>
      <div className="font-mono-data text-base mt-1 text-white leading-none" data-testid={testId}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-white/35 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Card (compact) ─────────────────────────────────────────────────── */
export function Card({ title, children, actions }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">{title}</div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/* ─── Form primitives ────────────────────────────────────────────────── */
export function Field({ label, children }) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.2em] uppercase text-white/40 mb-1">{label}</div>
      {children}
    </div>
  );
}

export function IconBtn({ children, onClick, title, testId, className = "" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      data-testid={testId}
      className={`p-1 rounded-sm border border-white/10 text-white/55 hover:text-white hover:border-white/25 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function Pair({ label, value, onCopy }) {
  return (
    <div className="border border-white/10 rounded-sm p-2 bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <div className="text-[9px] tracking-[0.2em] uppercase text-white/40">{label}</div>
        {onCopy && value && (
          <button type="button" onClick={() => onCopy(value)} className="text-[9px] text-[color:var(--theme-primary)] uppercase tracking-wider">
            Copy
          </button>
        )}
      </div>
      <div className="font-mono-data text-[11px] text-white/80 break-all mt-0.5">{value || "—"}</div>
    </div>
  );
}

/* ─── Utilities ──────────────────────────────────────────────────────── */
export function copyText(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/** Compact input class — 8px horizontal, 6px vertical, text-xs */
export const inputCls =
  "bg-white/[0.04] border border-white/10 rounded-sm px-2 py-1.5 text-xs w-full outline-none focus:border-[color:var(--theme-primary)]/50 transition-colors placeholder:text-white/25";

/** Status badge */
export function StatusBadge({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium ${
        ok
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
          : "bg-red-500/15 text-red-400 border border-red-500/20"
      }`}
    >
      {label}
    </span>
  );
}

/** Result badge for bets: won / lost / tie / open */
export function ResultBadge({ settled, won, tie, payout }) {
  if (!settled) return <span className="text-white/35">Open</span>;
  if (tie)      return <span className="text-amber-400">Tie</span>;
  if (won)      return <span className="text-emerald-400">+₹{payout}</span>;
  return <span className="text-red-400">Lost</span>;
}
