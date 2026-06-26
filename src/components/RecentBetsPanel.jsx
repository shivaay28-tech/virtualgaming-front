import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
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
  if (!b.settled) return { label: "Pending", cls: "text-white/40" };
  if (b.tie) return { label: "Tie", cls: "text-amber-400" };
  if (b.won) return { label: `+₹${b.payout}`, cls: "text-emerald-400" };
  return { label: "Lost", cls: "text-red-400" };
}

export function RecentBetsPanel({ refreshKey }) {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/game/my-bets?limit=10");
        if (!cancelled) setBets(data.bets || []);
      } catch (e) {
        if (!cancelled) {
          toast.error(
            formatApiError(e.response?.data?.detail) || "Failed to load bets"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return <div className="text-xs text-white/40 py-2">Loading…</div>;
  }

  if (!bets.length) {
    return <div className="text-xs text-white/40 py-2">No bets yet</div>;
  }

  return (
    /* max-h-40 on mobile keeps the panel compact; scroll-smooth-ios for momentum */
    <div
      className="space-y-0 max-h-40 sm:max-h-52 overflow-y-auto scroll-smooth-ios"
      data-testid={HOME.recentBetsPanel}
    >
      {bets.map((b, i) => {
        const result = formatBetResult(b);
        return (
          <div
            key={b.id}
            className="border-b border-white/5 py-2 text-xs font-mono-data"
            data-testid={`${HOME.recentBetRow}-${i}`}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0 truncate">
                <span className="text-white/50">#{b.round_number}</span>
                <span className="text-white/70 ml-2">{marketLabel(b.market)}</span>
              </div>
              <span className={`shrink-0 ${result.cls}`}>{result.label}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-white/55">
              <span className="truncate">{formatStake(b.amount, b.bet_count)}</span>
              {b.display_balance != null && (
                <span
                  className="shrink-0 text-white/45"
                  title={b.settled ? "Closing balance" : "Balance after bet"}
                >
                  → ₹{b.display_balance.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
