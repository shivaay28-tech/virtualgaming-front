import React from "react";
import { HOME } from "../constants/testIds";

const MARKET_LABELS = {
  player_a: "Player A",
  player_b: "Player B",
  pair_plus_a: "Pair Plus A",
  pair_plus_b: "Pair Plus B",
};

function marketLabel(id) {
  return MARKET_LABELS[id] || id;
}

function formatStake(amount, betCount) {
  const count = betCount || 1;
  if (count <= 1) return `₹${amount.toLocaleString()}`;
  const each = Math.round(amount / count);
  return `${count}×₹${each.toLocaleString()} = ₹${amount.toLocaleString()}`;
}

function formatBetResult(b) {
  if (b.tie) return { label: "Tie", cls: "text-amber-400" };
  if (b.won) return { label: `+₹${b.payout}`, cls: "text-emerald-400" };
  return { label: "Lost", cls: "text-red-400" };
}

export function RecentBetsPanel({ rounds = [], initialLoading = false }) {
  const hasRows = rounds.some((r) => (r.bets || []).length > 0);

  if (initialLoading && !hasRows) {
    return <div className="text-xs text-white/40 py-2">Loading…</div>;
  }

  if (!hasRows) {
    return <div className="text-xs text-white/40 py-2">No bets yet</div>;
  }

  return (
    <div
      className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto scroll-smooth-ios"
      data-testid={HOME.recentBetsPanel}
    >
      {rounds.map((round) => {
        const bets = round.bets || [];
        if (!bets.length) return null;
        return (
          <div key={round.round_id} className="rounded-sm border border-white/5 bg-white/[0.02]">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-[color:var(--theme-primary)] border-b border-white/5">
              Round #{round.round_number}
            </div>
            <div className="divide-y divide-white/5">
              {bets.map((b, i) => {
                const result = formatBetResult(b);
                return (
                  <div
                    key={b.id || `${round.round_id}-${i}`}
                    className="px-2 py-2 text-xs font-mono-data"
                    data-testid={`${HOME.recentBetRow}-${round.round_number}-${i}`}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-white/70 truncate">{marketLabel(b.market)}</span>
                      <span className={`shrink-0 ${result.cls}`}>{result.label}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-white/55">
                      <span className="truncate">{formatStake(b.amount, b.bet_count)}</span>
                      {b.display_balance != null && (
                        <span className="shrink-0 text-white/45" title="Closing balance">
                          → ₹{b.display_balance.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
