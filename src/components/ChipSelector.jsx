import React from "react";
import { motion } from "framer-motion";

const CHIPS = [
  { value: 10, color: "#9ca3af" },
  { value: 50, color: "#3b82f6" },
  { value: 100, color: "#ef4444" },
  { value: 500, color: "#22c55e" },
  { value: 1000, color: "#d4af37" },
  { value: 5000, color: "#a855f7" },
];

/**
 * ChipSelector
 *
 * @param {number}  value     – currently selected chip value
 * @param {function} onChange  – called with new chip value
 * @param {boolean} disabled  – disable all chips
 * @param {boolean} compact   – mobile sticky tray mode (horizontal scroll, smaller chips)
 */
export function ChipSelector({ value, onChange, disabled, compact = false }) {
  return (
    <div
      className={compact ? "chip-scroll" : "flex items-center gap-3 flex-wrap"}
      data-testid="chip-selector"
    >
      {CHIPS.map((c) => {
        const active = c.value === value;
        return (
          <motion.button
            key={c.value}
            whileTap={{ scale: 0.92 }}
            whileHover={{ y: -2 }}
            disabled={disabled}
            onClick={() => onChange(c.value)}
            data-testid={`chip-${c.value}`}
            className={[
              "chip relative rounded-full flex items-center justify-center",
              "text-white font-mono-data font-bold select-none transition-transform",
              compact ? "w-11 h-11 text-xs flex-shrink-0" : "w-14 h-14 text-sm",
              active ? "scale-110" : "",
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--chip-color": c.color }}
          >
            {c.value >= 1000 ? `${c.value / 1000}K` : c.value}
            {active && (
              <span
                className="absolute -inset-1 rounded-full pointer-events-none"
                style={{
                  boxShadow:
                    "0 0 0 2px var(--theme-primary), 0 0 18px var(--theme-primary)",
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
