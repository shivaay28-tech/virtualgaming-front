import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { Pair, copyText, downloadCsv, inputCls } from "./shared";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function RoundsPanel() {
  const [rounds, setRounds] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [bets, setBets] = useState([]);
  const [status, setStatus] = useState("");
  const [winner, setWinner] = useState("");
  const [offset, setOffset] = useState(0);
  const [verifyOk, setVerifyOk] = useState(null);
  const limit = 50;

  const load = useCallback(async (off) => {
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
      if (status) params.set("status", status);
      if (winner) params.set("winner", winner);
      const { data } = await api.get(`/admin/rounds?${params}`);
      setRounds(data.rounds || []);
      setTotal(data.total || 0);
      setOffset(off);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  }, [status, winner, limit]);

  useEffect(() => {
    load(0);
  }, [load]);

  const view = async (r) => {
    setSelected(r);
    setVerifyOk(null);
    try {
      const { data } = await api.get(`/admin/rounds/${r.id}/bets`);
      setBets(data.bets || []);
    } catch (e) {
      setBets([]);
    }
    if (r.server_seed && r.server_seed_hash) {
      const hash = await sha256Hex(r.server_seed);
      setVerifyOk(hash === r.server_seed_hash);
    }
  };

  const exportCsv = () => {
    downloadCsv("rounds.csv", rounds.map((r) => ({
      round_number: r.round_number,
      status: r.status,
      winner: r.winner || "",
      a_hand: r.a_hand_name || "",
      b_hand: r.b_hand_name || "",
      settled_at: r.settled_at || "",
    })));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls + " w-auto"}>
            <option value="">All statuses</option>
            <option value="betting">betting</option>
            <option value="settled">settled</option>
          </select>
          <select value={winner} onChange={(e) => setWinner(e.target.value)} className={inputCls + " w-auto"}>
            <option value="">All winners</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="TIE">TIE</option>
          </select>
          <button onClick={exportCsv} className="px-3 py-2 text-xs border border-white/10 rounded-sm">Export CSV</button>
          <span className="text-xs text-white/40 ml-auto">{total} rounds · page {Math.floor(offset / limit) + 1}</span>
        </div>
        <div className="rounded-md border border-white/10 overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-rounds-table">
            <thead className="bg-white/[0.04] text-[10px] tracking-[0.2em] uppercase text-white/50">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Winner</th>
                <th className="text-left px-3 py-2">A hand</th>
                <th className="text-left px-3 py-2">B hand</th>
                <th className="text-left px-3 py-2">Settled</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.id} onClick={() => view(r)} className={`border-t border-white/5 cursor-pointer hover:bg-white/[0.04] ${selected?.id === r.id ? "bg-white/[0.04]" : ""}`} data-testid={`admin-round-row-${r.round_number}`}>
                  <td className="px-3 py-2 font-mono-data">#{r.round_number}</td>
                  <td className="px-3 py-2 text-xs">{r.status}</td>
                  <td className="px-3 py-2 font-bold">{r.winner || "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.a_hand_name || "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.b_hand_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-white/40">{r.settled_at?.slice(0, 16) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 justify-end">
          <button disabled={offset <= 0} onClick={() => load(Math.max(0, offset - limit))} className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30">Previous</button>
          <button disabled={offset + limit >= total} onClick={() => load(offset + limit)} className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30">Next</button>
        </div>
      </div>

      <div className="rounded-md border border-white/10 p-4 bg-white/[0.02]">
        {!selected && <div className="text-white/40 text-sm">Select a round for provably-fair details.</div>}
        {selected && (
          <div className="space-y-3 text-xs" data-testid="admin-round-detail">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">Round</div>
              <div className="font-display text-2xl">#{selected.round_number}</div>
            </div>
            {verifyOk !== null && (
              <div className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${verifyOk ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                Provably fair hash {verifyOk ? "verified" : "mismatch"}
              </div>
            )}
            <Pair label="Server seed (revealed)" value={selected.server_seed} onCopy={copyText} />
            <Pair label="Server seed hash" value={selected.server_seed_hash} onCopy={copyText} />
            <Pair label="Client seed" value={selected.client_seed} onCopy={copyText} />
            <Pair label="Nonce" value={selected.nonce} />
            <Pair label="Cards A" value={(selected.player_a_cards || []).join(" ")} />
            <Pair label="Cards B" value={(selected.player_b_cards || []).join(" ")} />
            <Pair label="Winner" value={`${selected.winner || "—"} (${selected.a_hand_name || ""} vs ${selected.b_hand_name || ""})`} />
            <div className="border-t border-white/10 pt-3">
              <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1">Bets ({bets.length})</div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {bets.map((b) => (
                  <div key={b.id} className="flex justify-between items-center font-mono-data text-[11px] gap-2">
                    <span className="text-white/60 truncate">{b.user_name || b.user_email || b.user_id?.slice(0, 8)}</span>
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
