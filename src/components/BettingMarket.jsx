import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LockKeyhole, Zap } from "lucide-react";

/**
 * BettingMarket — compact professional betting tile
 */
export function BettingMarket({
  id,
  label,
  subLabel,
  odds,
  onBet,
  total,
  betCount = 0,
  disabled,
  disabledReason,
  highlight,
  winner,
  selectedAmount = 0,
  canBet = false,
}) {
  const stakeEach =
    betCount > 1 && total > 0 ? Math.round(total / betCount) : 0;

  const statusText = (() => {
    if (!disabled && canBet && selectedAmount > 0)
      return { label: `Tap to bet ₹${selectedAmount.toLocaleString()}`, type: "prompt" };
    if (!disabled && !canBet && selectedAmount > 0)
      return { label: "Fix amount", type: "warn" };
    if (disabledReason) return { label: disabledReason, type: "closed" };
    if (disabled) return { label: "Closed", type: "closed" };
    return null;
  })();

  return (
    <motion.button
      type="button"
      onClick={onBet}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      whileHover={!disabled ? { y: -2, transition: { duration: 0.15 } } : {}}
      data-testid={`bet-market-${id}`}
      className={[
        /* base */
        "relative w-full rounded-lg text-left border transition-all duration-200 overflow-hidden",
        "flex flex-col",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        /* border / bg */
        highlight
          ? "border-[color:var(--theme-primary)]/60 glow-gold bg-[color:var(--theme-primary)]/[0.04]"
          : "border-white/10 bg-white/[0.025]",
        !disabled ? "hover:bg-white/[0.05] hover:border-white/18" : "",
        /* winner states */
        winner === true  ? "ring-1 ring-emerald-400/60 border-emerald-400/35" : "",
        winner === false ? "opacity-50" : "",
      ].filter(Boolean).join(" ")}
    >
      {/* Disabled overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-black/25 z-10 pointer-events-none rounded-lg" />
      )}

      {/* Winner glow */}
      <AnimatePresence>
        {winner === true && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-0 rounded-lg"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.10) 0%, transparent 65%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Card body ─────────────────────────────────────────────── */}
      <div className="relative z-[1] p-2.5 sm:p-3 flex flex-col gap-2">

        {/* Row 1: sub-label + odds badge */}
        <div className="flex items-start justify-between gap-1.5">
          <span className="text-[8px] tracking-[0.2em] uppercase text-white/40 leading-none pt-0.5">
            {subLabel}
          </span>
          <div
            className={[
              "shrink-0 font-mono-data font-bold text-[11px] px-1.5 py-0.5 rounded-sm leading-none",
              winner === true
                ? "bg-emerald-400/15 text-emerald-400 border border-emerald-400/25"
                : "bg-[color:var(--theme-primary)]/10 text-[color:var(--theme-primary)] border border-[color:var(--theme-primary)]/20",
              disabled ? "opacity-50" : "",
            ].join(" ")}
          >
            {odds.toFixed(2)}×
          </div>
        </div>

        {/* Row 2: market name */}
        <div className="font-display text-base sm:text-lg text-white leading-none">
          {label}
        </div>

        {/* Row 3: your bet + status */}
        <div className="flex items-end justify-between gap-1.5 pt-0.5 border-t border-white/[0.06]">
          <div className="min-w-0">
            <div className="text-[8px] uppercase tracking-[0.12em] text-white/30 mb-0.5">
              Your bet
            </div>
            {betCount > 1 && total > 0 && (
              <div
                className="text-[9px] text-white/30 font-mono-data leading-none mb-0.5"
                data-testid={`bet-breakdown-${id}`}
              >
                {betCount}×₹{stakeEach.toLocaleString()}
              </div>
            )}
            <div
              className={[
                "font-mono-data text-sm font-semibold leading-none",
                total > 0 ? "text-white" : "text-white/25",
              ].join(" ")}
              data-testid={`bet-total-${id}`}
            >
              ₹{total.toLocaleString()}
            </div>
          </div>

          {/* Status prompt */}
          <AnimatePresence mode="wait">
            {statusText && (
              <motion.div
                key={statusText.type + statusText.label}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.16 }}
                className={[
                  "shrink-0 flex items-center gap-1 text-[9px] font-mono-data rounded-sm px-1.5 py-0.5 leading-none",
                  statusText.type === "prompt"
                    ? "text-[color:var(--theme-primary)] bg-[color:var(--theme-primary)]/10 border border-[color:var(--theme-primary)]/22"
                    : statusText.type === "warn"
                    ? "text-amber-400/80 bg-amber-400/5 border border-amber-400/15"
                    : "text-white/25 bg-white/[0.03] border border-white/6",
                ].join(" ")}
              >
                {statusText.type === "prompt" && (
                  <Zap size={8} className="shrink-0" />
                )}
                {statusText.type === "closed" && (
                  <LockKeyhole size={8} className="shrink-0" />
                )}
                {statusText.label}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.button>
  );
}
