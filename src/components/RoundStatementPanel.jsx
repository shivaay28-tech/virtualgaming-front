import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";

const MARKET_LABELS = {
  player_a: "Player A",
  player_b: "Player B",
  pair_plus_a: "Pair Plus A",
  pair_plus_b: "Pair Plus B",
};

function marketLabel(id) {
  return MARKET_LABELS[id] || id;
}

function formatBetRow(b) {
  if (b.tie) return { label: "Tie refund", cls: "text-amber-400" };
  if (b.won) return { label: `+₹${(b.payout || 0).toLocaleString()}`, cls: "text-emerald-400" };
  if (b.settled) return { label: "Lost", cls: "text-red-400" };
  return { label: "Open", cls: "text-white/50" };
}

function RoundDetail({ roundId, open }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !roundId) return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/wallet/statement/rounds/${roundId}`)
      .then(({ data }) => {
        if (!cancelled) setDetail(data);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(formatApiError(e.response?.data?.detail) || "Failed to load round detail");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, roundId]);

  if (!open) return null;
  if (loading) return <div className="px-3 py-3 text-xs text-white/40">Loading bets…</div>;
  if (!detail) return null;

  return (
    <div className="border-t border-white/5 bg-black/20 px-3 py-3 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Bets</div>
        {!detail.bets?.length ? (
          <div className="text-xs text-white/40">No bets</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-left">
                <th className="pb-1 font-normal">Market</th>
                <th className="pb-1 font-normal text-right">Stake</th>
                <th className="pb-1 font-normal text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {detail.bets.map((b) => {
                const r = formatBetRow(b);
                return (
                  <tr key={b.id} className="border-t border-white/5">
                    <td className="py-1.5">{marketLabel(b.market)}</td>
                    <td className="py-1.5 text-right font-mono-data">₹{(b.amount || 0).toLocaleString()}</td>
                    <td className={`py-1.5 text-right font-mono-data ${r.cls}`}>{r.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {detail.transactions?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Ledger</div>
          <div className="space-y-1">
            {detail.transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between gap-2 text-[11px] font-mono-data text-white/60">
                <span className="truncate">{tx.type} — {tx.note}</span>
                <span className={tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RoundStatementPanel({ testIdPrefix = "statement-rounds" }) {
  const [rounds, setRounds] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/wallet/statement/rounds?limit=${limit}&offset=${offset}`);
      setRounds(data.rounds || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load rounds");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4" data-testid={`${testIdPrefix}-panel`}>
      <p className="text-sm text-white/50">
        Rounds where you placed bets. Expand a round to see every bet and ledger line.
      </p>
      <div className="rounded-md border border-white/10 overflow-hidden">
        {rounds.length === 0 && !loading ? (
          <div className="px-4 py-8 text-center text-sm text-white/40">No round activity yet</div>
        ) : (
          rounds.map((r) => {
            const isOpen = expanded === r.round_id;
            return (
              <div key={r.round_id} className="border-b border-white/5 last:border-b-0">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-white/[0.03] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : r.round_id)}
                  data-testid={`${testIdPrefix}-row-${r.round_number}`}
                >
                  {isOpen ? (
                    <ChevronDown size={14} className="text-white/40 shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-white/40 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <span className="font-mono-data text-[color:var(--theme-primary)]">
                      #{r.round_number || "—"}
                    </span>
                    <span className="text-white/50 truncate">{r.last_at?.slice(0, 16) || "—"}</span>
                    <span className="text-white/70">Wagered ₹{(r.wagered || 0).toLocaleString()}</span>
                    <span className={r.net >= 0 ? "text-emerald-400" : "text-red-400"}>
                      Net {r.net >= 0 ? "+" : ""}₹{(r.net || 0).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 shrink-0 hidden sm:inline">
                    {isOpen ? "Hide" : "Show all bets"}
                  </span>
                </button>
                <RoundDetail roundId={r.round_id} open={isOpen} />
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - limit))}
          className="px-2 py-1 text-xs border border-white/10 rounded-sm disabled:opacity-30"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={offset + limit >= total || loading}
          onClick={() => setOffset(offset + limit)}
          className="px-2 py-1 text-xs border border-white/10 rounded-sm disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
