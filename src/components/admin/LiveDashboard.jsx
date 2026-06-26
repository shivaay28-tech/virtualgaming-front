import React, { useState } from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { formatHousePnl } from "../../lib/pnlFormat";
import { ANALYTICS } from "../../constants/testIds";
import { Card, inputCls, StatusBadge, ResultBadge } from "./shared";
import { KpiStrip } from "./primitives/KpiStrip";
import { AdminCard } from "./primitives/AdminCard";
import { AdminTable } from "./primitives/AdminTable";
import { CardFace } from "../CardFace";

const MARKET_LABELS = {
  player_a: "Player A",
  player_b: "Player B",
  pair_plus_a: "Pair+ A",
  pair_plus_b: "Pair+ B",
};

export function LiveDashboard({ data, onRefresh, connected }) {
  const [pauseReason, setPauseReason] = useState("");
  if (!data) return <div className="text-white/50 text-xs">Loading…</div>;

  const total    = data.total_round_volume || 0;
  const a        = data.analytics || {};
  const pnl24    = data.platform_pnl_24h || {};
  const phase    = data.round?.phase;
  const timeLeft = data.round?.time_left ?? 0;
  const duration = data.round?.phase_duration ?? 1;
  const tableMeta   = data.table || {};
  const roundLive   = data.round_live || {};
  const cards       = data.cards || { a: [null, null, null], b: [null, null, null] };
  const outcome     = data.outcome;
  const volA        = data.volumes?.player_a?.amount || 0;
  const volB        = data.volumes?.player_b?.amount || 0;
  const mainTotal   = volA + volB;
  const bets        = roundLive.recent_bets || [];

  const togglePause = async () => {
    const cfg = data.table_config;
    try {
      await api.post("/admin/table/pause", { paused: !cfg.paused, reason: cfg.paused ? "" : pauseReason });
      toast.success(cfg.paused ? "Table resumed" : "Table paused");
      onRefresh();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const betColumns = [
    { key: "created_at", label: "Time",   render: (v) => <span className="text-white/40">{v?.slice(11, 19) || "—"}</span> },
    { key: "user_name",  label: "User",   render: (v, r) => r.user_name || r.user_email || "—" },
    { key: "market",     label: "Market", render: (v) => MARKET_LABELS[v] || v },
    { key: "amount",     label: "Amount", align: "right", render: (v) => `₹${v?.toLocaleString()}` },
    { key: "settled",    label: "Result", align: "right", render: (_, r) => <ResultBadge {...r} /> },
  ];

  return (
    <div className="space-y-3">
      {/* ── KPI strip ───────────────────────────────────────────────── */}
      <KpiStrip
        items={[
          {
            label: "Online",
            value: data.online_global ?? data.online,
            sub: `${data.online_authed || 0} authed`,
            testId: "admin-online",
          },
          {
            label: "Round",
            value: `#${data.round?.number ?? "—"}`,
            sub: tableMeta.session_date,
            testId: "admin-round-number",
          },
          {
            label: "Phase",
            value: phase,
            sub: `${timeLeft}s left`,
            testId: "admin-phase",
          },
          {
            label: "Round bets",
            value: roundLive.bet_count ?? 0,
            sub: `${roundLive.unique_bettors ?? 0} players`,
            testId: "admin-round-bet-count",
          },
          {
            label: "24h House Profit",
            value: formatHousePnl(pnl24.house_profit),
            tone: (pnl24.house_profit || 0) >= 0 ? "positive" : "negative",
            testId: ANALYTICS.dashboardHouseProfit,
          },
          {
            label: "24h Settled Bets",
            value: pnl24.bet_count || 0,
            sub: `${pnl24.unique_bettors || 0} bettors`,
            testId: ANALYTICS.dashboardSettledBets,
          },
        ]}
      />

      {/* ── Live table card ─────────────────────────────────────────── */}
      <AdminCard
        title="Live table"
        actions={
          <div className="flex items-center gap-1.5">
            {!data.table_config?.paused && (
              <input
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Pause reason"
                className={`${inputCls} w-36`}
              />
            )}
            <button
              onClick={togglePause}
              data-testid="admin-quick-pause"
              className={`px-2.5 py-1 rounded-sm text-xs flex items-center gap-1 ${
                data.table_config?.paused
                  ? "bg-emerald-500 text-black font-semibold"
                  : "bg-red-500/80 text-white"
              }`}
            >
              {data.table_config?.paused
                ? <><Play size={11} /> Resume</>
                : <><Pause size={11} /> Pause</>}
            </button>
          </div>
        }
      >
        {/* Cards + outcome */}
        <div className="grid md:grid-cols-2 gap-4 mb-3" data-testid="admin-live-cards">
          {["a", "b"].map((side) => (
            <div key={side}>
              <div className="text-[9px] tracking-[0.2em] uppercase text-white/35 mb-1.5">
                Player {side.toUpperCase()}
              </div>
              <div className="flex gap-2 mb-1">
                {(cards[side] || []).map((c, i) => (
                  <CardFace key={`${side}-${i}`} card={c} />
                ))}
              </div>
              {outcome?.[`${side}_hand_name`] && (
                <div className="text-[10px] text-white/45 font-mono-data">
                  {outcome[`${side}_hand_name`]}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Outcome banner */}
        {outcome && (
          <div className="mb-3 px-3 py-1.5 rounded-sm border border-[color:var(--theme-primary)]/25 bg-[color:var(--theme-primary)]/8 text-xs">
            Winner:{" "}
            <span className="font-mono-data text-[color:var(--theme-primary)]">
              {outcome.winner === "TIE" ? "Tie" : `Player ${outcome.winner}`}
            </span>
            {outcome.pair_plus_a && <span className="ml-2 text-white/40">· Pair+ A hit</span>}
            {outcome.pair_plus_b && <span className="ml-2 text-white/40">· Pair+ B hit</span>}
          </div>
        )}

        {/* Round volume + timer */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <div className="font-mono-data text-xl" data-testid="admin-round-volume">
              ₹{total.toLocaleString()}
            </div>
            <div className="text-[9px] text-white/35">round volume</div>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="h-1.5 bg-white/8 rounded overflow-hidden">
              <div
                className="h-full bg-[color:var(--theme-primary)] transition-all"
                style={{ width: `${Math.min(100, ((duration - timeLeft) / duration) * 100)}%` }}
              />
            </div>
            <div className="text-[9px] text-white/35 mt-1 font-mono-data">
              {timeLeft}s / {duration}s · reveal {data.reveal?.revealed_count ?? 0}/6
            </div>
          </div>
        </div>

        {/* A vs B bar */}
        <div className="mb-3">
          <div className="text-[9px] tracking-[0.2em] uppercase text-white/35 mb-1">Player A vs B</div>
          <div className="flex h-2 rounded overflow-hidden bg-white/5">
            <div className="bg-blue-500/70 transition-all" style={{ width: mainTotal ? `${(volA / mainTotal) * 100}%` : "50%" }} title={`A ₹${volA}`} />
            <div className="bg-rose-500/70 transition-all" style={{ width: mainTotal ? `${(volB / mainTotal) * 100}%` : "50%" }} title={`B ₹${volB}`} />
          </div>
          <div className="flex justify-between text-[9px] text-white/35 mt-0.5 font-mono-data">
            <span>A ₹{volA.toLocaleString()} ({data.volumes?.player_a?.count ?? 0})</span>
            <span>B ₹{volB.toLocaleString()} ({data.volumes?.player_b?.count ?? 0})</span>
          </div>
        </div>

        {/* Market volume bars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {["player_a", "player_b", "pair_plus_a", "pair_plus_b"].map((m) => {
            const v   = data.volumes?.[m] || { amount: 0, count: 0 };
            const pct = total > 0 ? Math.round((v.amount / total) * 100) : 0;
            return (
              <div key={m} className="border border-white/8 rounded-sm p-2" data-testid={`admin-vol-${m}`}>
                <div className="text-[8px] tracking-[0.15em] uppercase text-white/40 truncate">
                  {MARKET_LABELS[m]}
                </div>
                <div className="font-mono-data text-sm mt-0.5">₹{v.amount.toLocaleString()}</div>
                <div className="text-[9px] text-white/30">{v.count} bets · {pct}%</div>
                <div className="mt-1.5 h-1 bg-white/5 rounded">
                  <div className="h-1 rounded bg-[color:var(--theme-primary)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>

      {/* ── Live bet feed ────────────────────────────────────────────── */}
      <AdminCard title="Live bet feed">
        <div data-testid="admin-live-bet-feed" className="max-h-56 overflow-y-auto -mx-3 -mb-3">
          <AdminTable
            columns={betColumns}
            rows={bets}
            rowKey="id"
            emptyText="No bets this round yet"
          />
        </div>
      </AdminCard>

      {/* ── 24h secondary KPIs (settled bets) ───────────────────────── */}
      <p className="text-[10px] text-white/35 -mt-1">
        Settled bets only. Open exposure shown separately.
      </p>
      <KpiStrip
        items={[
          {
            label: "Wagered (24h)",
            value: `₹${(pnl24.total_wagered || 0).toLocaleString()}`,
            testId: ANALYTICS.dashboardWagered,
          },
          {
            label: "Returned (24h)",
            value: `₹${(pnl24.total_returned || 0).toLocaleString()}`,
            testId: ANALYTICS.dashboardReturned,
          },
          {
            label: "Open exposure (24h)",
            value: `₹${(pnl24.unsettled_wagered || 0).toLocaleString()}`,
            sub: `${pnl24.unsettled_bet_count || 0} open bets`,
            testId: ANALYTICS.dashboardOpenExposure,
          },
          { label: "New signups (24h)", value: a.new_signups || 0 },
        ]}
      />
    </div>
  );
}
