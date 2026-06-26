import React from "react";

/* ─── AdminCard ──────────────────────────────────────────────────────────
   Thin card wrapper. Replaces the fat Card (p-5) with compact p-3 defaults.
   All admin panels should use this instead of the old Card.
   ─────────────────────────────────────────────────────────────────────── */
export function AdminCard({ title, children, actions, className = "", testId }) {
  return (
    <div
      className={`rounded-md border border-white/10 bg-white/[0.02] p-3 ${className}`}
      data-testid={testId}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-2">
          {title && (
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">
              {title}
            </div>
          )}
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
