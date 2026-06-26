import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Zap } from "lucide-react";

const CHIPS = [
  { value: 10,   color: "#9ca3af", label: "10" },
  { value: 50,   color: "#3b82f6", label: "50" },
  { value: 100,  color: "#ef4444", label: "100" },
  { value: 500,  color: "#22c55e", label: "500" },
  { value: 1000, color: "#d4af37", label: "1K" },
  { value: 5000, color: "#a855f7", label: "5K" },
];

export function BetControls({
  amount,
  onAmountChange,
  minBet = 10,
  maxBet = 50000,
  balance = 0,
  disabled = false,
  compact = false,
}) {
  const [inputVal, setInputVal] = useState(String(amount));
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (!inputFocused) setInputVal(String(amount));
  }, [amount, inputFocused]);

  const commitAmount = useCallback(
    (raw) => {
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n <= 0) return;
      onAmountChange(n);
    },
    [onAmountChange]
  );

  const clamp = (v) =>
    Math.max(minBet, Math.min(maxBet, Math.min(balance > 0 ? balance : maxBet, v)));

  const handleDouble = () => onAmountChange(clamp(amount * 2));
  const handleHalf   = () => onAmountChange(clamp(Math.floor(amount / 2)));
  const handleMin    = () => onAmountChange(minBet);
  const handleMax    = () => onAmountChange(Math.max(minBet, Math.min(maxBet, balance || maxBet)));

  const error = (() => {
    const n = parseInt(inputVal, 10);
    if (!Number.isFinite(n) || n <= 0) return "Enter a valid amount";
    if (n < minBet) return `Min ₹${minBet.toLocaleString()}`;
    if (n > maxBet) return `Max ₹${maxBet.toLocaleString()}`;
    if (balance > 0 && n > balance) return "Insufficient balance";
    return null;
  })();

  const isValid = !error;

  /* ── MOBILE COMPACT (sticky tray) ─────────────────────────────────── */
  if (compact) {
    return (
      <div className="w-full" data-testid="bet-controls">
        {/* Row 1: preview + input */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <AnimatePresence mode="wait">
            {isValid ? (
              <motion.div
                key="ok"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[color:var(--theme-primary)]/40 bg-[color:var(--theme-primary)]/10"
              >
                <Zap size={10} className="text-[color:var(--theme-primary)] shrink-0" />
                <span className="text-[10px] font-mono-data font-bold text-[color:var(--theme-primary)]">
                  ₹{amount.toLocaleString()}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="err"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[10px] text-red-400 font-mono-data"
              >
                <AlertCircle size={10} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline input */}
          <div
            className={`flex items-center gap-1 rounded-sm border px-2 py-1 bg-black/50 transition-colors ${
              inputFocused
                ? "border-[color:var(--theme-primary)]"
                : error
                ? "border-red-500/50"
                : "border-white/12"
            }`}
          >
            <span className="text-[10px] text-white/35 font-mono-data">₹</span>
            <input
              type="number"
              inputMode="numeric"
              value={inputVal}
              disabled={disabled}
              aria-label="Bet amount"
              onChange={(e) => setInputVal(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => { setInputFocused(false); commitAmount(inputVal); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="w-16 bg-transparent text-white text-xs font-mono-data outline-none disabled:opacity-50"
              data-testid="bet-amount-input"
            />
          </div>
        </div>

        {/* Row 2: chips + utility */}
        <div className="chip-scroll" data-testid="chip-selector">
          {CHIPS.map((c) => {
            const active = c.value === amount;
            return (
              <motion.button
                key={c.value}
                type="button"
                whileTap={{ scale: 0.9 }}
                disabled={disabled}
                onClick={() => onAmountChange(c.value)}
                data-testid={`chip-${c.value}`}
                className={[
                  "chip relative flex-shrink-0 rounded-full flex items-center justify-center",
                  "w-11 h-11 text-xs text-white font-mono-data font-bold select-none transition-transform",
                  active ? "scale-110" : "",
                  disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                ].filter(Boolean).join(" ")}
                style={{ "--chip-color": c.color }}
              >
                {c.label}
                {active && (
                  <span
                    className="absolute -inset-1 rounded-full pointer-events-none"
                    style={{ boxShadow: "0 0 0 2px var(--theme-primary), 0 0 14px var(--theme-primary)" }}
                  />
                )}
              </motion.button>
            );
          })}
          <UtilChip label="Min" onClick={handleMin} disabled={disabled} />
          <UtilChip label="2×"  onClick={handleDouble} disabled={disabled} />
          <UtilChip label="½"   onClick={handleHalf}   disabled={disabled} />
          <UtilChip label="Max" onClick={handleMax} disabled={disabled} highlight />
        </div>
      </div>
    );
  }

  /* ── DESKTOP FULL ──────────────────────────────────────────────────── */
  return (
    <div
      className="rounded-lg border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] overflow-hidden"
      data-testid="bet-controls"
    >
      {/* Top strip: BET AMOUNT label */}
      <div className="px-4 pt-3 pb-0 flex items-center justify-between">
        <span className="text-[9px] tracking-[0.25em] uppercase text-white/35">
          Bet Amount
        </span>
        <span
          className="text-[9px] tracking-[0.12em] uppercase text-white/25 font-mono-data"
          data-testid="bet-limits"
        >
          Min ₹{minBet.toLocaleString()} · Max ₹{maxBet.toLocaleString()} · Balance ₹{balance.toLocaleString()}
        </span>
      </div>

      {/* Main controls row */}
      <div className="px-4 pt-2 pb-3 flex items-center gap-3 flex-wrap">

        {/* ₹ Input */}
        <div
          className={[
            "flex items-center gap-2 rounded-md border px-3 py-2 bg-black/40 min-w-[120px] transition-all",
            inputFocused
              ? "border-[color:var(--theme-primary)] shadow-[0_0_0_1px_var(--theme-primary),0_0_12px_rgba(212,175,55,0.18)]"
              : error
              ? "border-red-500/50"
              : "border-white/10",
          ].join(" ")}
        >
          <span className="text-white/40 font-mono-data text-sm">₹</span>
          <input
            id="bet-amount-desktop"
            type="number"
            inputMode="numeric"
            min={minBet}
            max={maxBet}
            value={inputVal}
            disabled={disabled}
            aria-label="Bet amount"
            onChange={(e) => setInputVal(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => { setInputFocused(false); commitAmount(inputVal); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="w-20 bg-transparent text-white text-sm font-mono-data font-semibold outline-none disabled:opacity-50"
            data-testid="bet-amount-input"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/8 shrink-0" />

        {/* Quick chips */}
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {CHIPS.map((c) => {
            const active = c.value === amount;
            return (
              <motion.button
                key={c.value}
                type="button"
                whileTap={{ scale: 0.92 }}
                whileHover={!disabled ? { y: -2 } : {}}
                disabled={disabled}
                onClick={() => onAmountChange(c.value)}
                data-testid={`chip-${c.value}`}
                className={[
                  "chip relative rounded-full flex items-center justify-center",
                  "w-11 h-11 text-xs text-white font-mono-data font-bold select-none transition-transform",
                  active ? "scale-110" : "",
                  disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                ].filter(Boolean).join(" ")}
                style={{ "--chip-color": c.color }}
              >
                {c.label}
                {active && (
                  <span
                    className="absolute -inset-1 rounded-full pointer-events-none"
                    style={{ boxShadow: "0 0 0 2px var(--theme-primary), 0 0 18px var(--theme-primary)" }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/8 shrink-0" />

        {/* Utility buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <UtilBtn label="Min" onClick={handleMin}    disabled={disabled} />
          <UtilBtn label="½"   onClick={handleHalf}   disabled={disabled} />
          <UtilBtn label="2×"  onClick={handleDouble} disabled={disabled} />
          <UtilBtn label="Max" onClick={handleMax}    disabled={disabled} highlight />
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="border-t border-white/6 px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Validation feedback */}
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="err"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[11px] text-red-400 font-mono-data"
            >
              <AlertCircle size={12} />
              {error}
            </motion.div>
          ) : (
            <motion.div
              key="ok"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-white/30 font-mono-data"
            >
              {disabled ? "Betting is closed" : "Select a chip or enter amount"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ★ TAP TO BET CTA — the hero element */}
        <AnimatePresence mode="wait">
          {isValid && !disabled ? (
            <motion.div
              key="cta"
              initial={{ opacity: 0, scale: 0.88, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="relative flex items-center gap-2 px-4 py-2 rounded-full cursor-default select-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 100%)",
                border: "1px solid rgba(212,175,55,0.45)",
                boxShadow:
                  "0 0 0 1px rgba(212,175,55,0.12), 0 0 20px rgba(212,175,55,0.22)",
              }}
            >
              {/* animated pulse ring */}
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                animate={{ boxShadow: ["0 0 0 0 rgba(212,175,55,0.4)", "0 0 0 6px rgba(212,175,55,0)"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
              <Zap size={13} className="text-[color:var(--theme-primary)] shrink-0" />
              <span className="text-xs font-semibold tracking-wide text-[color:var(--theme-primary)] font-mono-data whitespace-nowrap">
                Tap a market to bet{" "}
                <span className="text-white font-bold">
                  ₹{amount.toLocaleString()}
                </span>
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function UtilBtn({ label, onClick, disabled, highlight = false }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.93 }}
      whileHover={!disabled ? { y: -1 } : {}}
      disabled={disabled}
      onClick={onClick}
      className={[
        "px-2.5 py-1.5 rounded-md border text-[10px] font-mono-data tracking-[0.1em] uppercase transition-colors select-none",
        highlight
          ? "border-[color:var(--theme-primary)]/45 text-[color:var(--theme-primary)] hover:bg-[color:var(--theme-primary)]/10"
          : "border-white/10 text-white/55 hover:text-white hover:border-white/20 bg-white/[0.02]",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].filter(Boolean).join(" ")}
    >
      {label}
    </motion.button>
  );
}

function UtilChip({ label, onClick, disabled, highlight = false }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex-shrink-0 rounded-full flex items-center justify-center",
        "w-11 h-11 text-[10px] font-mono-data font-bold border select-none transition-colors",
        highlight
          ? "border-[color:var(--theme-primary)]/50 text-[color:var(--theme-primary)] bg-[color:var(--theme-primary)]/[0.07]"
          : "border-white/15 text-white/55 bg-white/[0.04]",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].filter(Boolean).join(" ")}
    >
      {label}
    </motion.button>
  );
}
