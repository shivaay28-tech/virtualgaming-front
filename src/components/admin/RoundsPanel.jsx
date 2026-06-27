import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { useAdminLive } from "../../context/AdminLiveContext";
import { Pair, copyText, downloadCsv, inputCls } from "./shared";

const REFRESH_DEBOUNCE_MS = 1500;
const limit = 50;

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatTs(iso) {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

function StatusBadge({ status }) {
  const cls = {
    settled: "bg-emerald-500/20 text-emerald-300",
    settling: "bg-amber-500/20 text-amber-300",
    aborted: "bg-red-500/20 text-red-300",
    betting: "bg-amber-500/20 text-amber-300",
  }[status] || "bg-white/10 text-white/50";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide ${cls}`}>
      {status || "—"}
    </span>
  );
}

export function RoundsPanel() {
  const { data } = useAdminLive();
  const todaySession = data?.table?.session_date || "";
  const liveRoundId = data?.round?.id;

  const [rounds, setRounds] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [bets, setBets] = useState([]);
  const [status, setStatus] = useState("");
  const [winner, setWinner] = useState("");
  const [sessionScope, setSessionScope] = useState("today");
  const [offset, setOffset] = useState(0);
  const [verifyOk, setVerifyOk] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshDebounceRef = useRef(null);
  const lastLiveRoundRef = useRef(null);
  const lastLivePhaseRef = useRef(null);
  const autoSelectDoneRef = useRef(false);

  const view = useCallback(async (r) => {
    setSelected(r);
    setVerifyOk(null);
    try {
      const { data: betData } = await api.get(`/admin/rounds/${r.id}/bets`);
      setBets(betData.bets || []);
    } catch {
      setBets([]);
    }
    if (r.server_seed && r.server_seed_hash) {
      const hash = await sha256Hex(r.server_seed);
      setVerifyOk(hash === r.server_seed_hash);
    }
  }, []);

  const load = useCallback(async (off) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
      if (status) params.set("status", status);
      if (winner) params.set("winner", winner);
      if (sessionScope === "today" && todaySession) {
        params.set("session_date", todaySession);
      }
      const { data: res } = await api.get(`/admin/rounds?${params}`);
      const rows = res.rounds || [];
      setRounds(rows);
      setTotal(res.total || 0);
      setOffset(off);

      if (!autoSelectDoneRef.current && off === 0 && rows.length) {
        const settled = rows.find((r) => r.status === "settled");
        if (settled) {
          autoSelectDoneRef.current = true;
          view(settled);
        }
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load rounds");
    } finally {
      setLoading(false);
    }
  }, [status, winner, sessionScope, todaySession, view]);

  useEffect(() => {
    autoSelectDoneRef.current = false;
    load(0);
  }, [load]);

  const livePhase = data?.round?.phase;
  useEffect(() => {
    const roundChanged =
      liveRoundId && lastLiveRoundRef.current && liveRoundId !== lastLiveRoundRef.current;
    const justSettled = livePhase === "settled" && lastLivePhaseRef.current !== "settled";
    lastLiveRoundRef.current = liveRoundId;
    lastLivePhaseRef.current = livePhase;
    if (!roundChanged && !justSettled) return undefined;

    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => load(0), REFRESH_DEBOUNCE_MS);
    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, [liveRoundId, livePhase, load]);

  const exportCsv = () => {
    downloadCsv("rounds.csv", rounds.map((r) => ({
      session_date: r.session_date || "",
      round_number: r.round_number,
      status: r.status,
      winner: r.winner || "",
      a_hand: r.a_hand_name || "",
      b_hand: r.b_hand_name || "",
      total_bet_count: r.total_bet_count ?? "",
      total_bet_amount: r.total_bet_amount ?? "",
      settled_at: r.settled_at || "",
    })));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={sessionScope}
            onChange={(e) => setSessionScope(e.target.value)}
            className={inputCls + " w-auto"}
            data-testid="admin-rounds-session"
          >
            <option value="today">Today{todaySession ? ` (${todaySession})` : ""}</option>
            <option value="all">All sessions</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls + " w-auto"}>
            <option value="">All statuses</option>
            <option value="settled">settled</option>
            <option value="settling">settling</option>
            <option value="aborted">aborted</option>
            <option value="betting">betting</option>
          </select>
          <select value={winner} onChange={(e) => setWinner(e.target.value)} className={inputCls + " w-auto"}>
            <option value="">All winners</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="TIE">TIE</option>
          </select>
          <button
            type="button"
            onClick={() => load(offset)}
            disabled={loading}
            className="px-3 py-2 text-xs border border-white/10 rounded-sm inline-flex items-center gap-1"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" onClick={exportCsv} className="px-3 py-2 text-xs border border-white/10 rounded-sm">
            Export CSV
          </button>
          <span className="text-xs text-white/40 ml-auto">
            {total} rounds · page {Math.floor(offset / limit) + 1}
          </span>
        </div>
        <div className="rounded-md border border-white/10 overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-rounds-table">
            <thead className="bg-white/[0.04] text-[10px] tracking-[0.2em] uppercase text-white/50">
              <tr>
                <th className="text-left px-3 py-2">Session</th>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Winner</th>
                <th className="text-left px-3 py-2">Hands</th>
                <th className="text-right px-3 py-2">Bets</th>
                <th className="text-right px-3 py-2">Volume</th>
                <th className="text-left px-3 py-2">Settled</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => {
                const isLive = liveRoundId && r.id === liveRoundId;
                return (
                  <tr
                    key={r.id}
                    onClick={() => view(r)}
                    className={`border-t border-white/5 cursor-pointer hover:bg-white/[0.04] ${
                      selected?.id === r.id ? "bg-white/[0.04]" : ""
                    } ${isLive ? "ring-1 ring-inset ring-[color:var(--theme-primary)]/40" : ""}`}
                    data-testid={`admin-round-row-${r.round_number}`}
                  >
                    <td className="px-3 py-2 text-xs text-white/40">{r.session_date || "—"}</td>
                    <td className="px-3 py-2 font-mono-data">
                      #{r.round_number}
                      {isLive && (
                        <span className="ml-1 text-[8px] uppercase tracking-wider text-[color:var(--theme-primary)]">
                          live
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2 font-bold">{r.winner || "—"}</td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {r.a_hand_name || "—"} / {r.b_hand_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono-data text-xs">
                      {r.total_bet_count ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono-data text-xs">
                      {r.total_bet_amount != null ? `₹${r.total_bet_amount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/40">{formatTs(r.settled_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            disabled={offset <= 0}
            onClick={() => load(Math.max(0, offset - limit))}
            className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={offset + limit >= total}
            onClick={() => load(offset + limit)}
            className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>

      <div className="rounded-md border border-white/10 p-4 bg-white/[0.02]">
        {!selected && (
          <div className="text-white/40 text-sm">Select a round for provably-fair details.</div>
        )}
        {selected && (
          <div className="space-y-3 text-xs" data-testid="admin-round-detail">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">Round</div>
              <div className="font-display text-2xl">
                #{selected.round_number}
                <span className="text-sm text-white/40 ml-2">{selected.session_date}</span>
              </div>
              <div className="mt-1">
                <StatusBadge status={selected.status} />
              </div>
            </div>
            {selected.status === "aborted" && (
              <div className="px-2 py-1.5 rounded bg-amber-500/10 text-amber-200 text-[11px]">
                Round was aborted (e.g. server restart). Stakes were refunded; provably-fair verification is not available.
              </div>
            )}
            {selected.status !== "aborted" && !selected.server_seed && (
              <div className="px-2 py-1.5 rounded bg-white/5 text-white/50 text-[11px]">
                Server seed is revealed after settlement only.
              </div>
            )}
            {verifyOk !== null && (
              <div
                className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${
                  verifyOk ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                }`}
              >
                Provably fair hash {verifyOk ? "verified" : "mismatch"}
              </div>
            )}
            <Pair label="Server seed (revealed)" value={selected.server_seed} onCopy={copyText} />
            <Pair label="Server seed hash" value={selected.server_seed_hash} onCopy={copyText} />
            <Pair label="Client seed" value={selected.client_seed} onCopy={copyText} />
            <Pair label="Nonce" value={selected.nonce} />
            <Pair label="Cards A" value={(selected.player_a_cards || []).join(" ")} />
            <Pair label="Cards B" value={(selected.player_b_cards || []).join(" ")} />
            <Pair
              label="Winner"
              value={`${selected.winner || "—"} (${selected.a_hand_name || ""} vs ${selected.b_hand_name || ""})`}
            />
            <div className="border-t border-white/10 pt-3">
              <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1">
                Bets ({bets.length})
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {bets.map((b) => (
                  <div key={b.id} className="flex justify-between items-center font-mono-data text-[11px] gap-2">
                    <span className="text-white/60 truncate">
                      {b.user_name || b.user_email || b.user_id?.slice(0, 8)}
                    </span>
                    <span>{b.market.replace(/_/g, " ")}</span>
                    <span>₹{b.amount}</span>
                    <span className={b.won ? "text-emerald-400" : b.tie ? "text-yellow-400" : "text-red-400"}>
                      {b.tie ? "tie" : b.won ? `+${b.payout}` : "lost"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
