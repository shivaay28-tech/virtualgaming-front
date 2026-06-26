import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { formatHousePnl, marketLabel, pnlColorClass } from "../../lib/pnlFormat";
import { ANALYTICS } from "../../constants/testIds";
import { StatCard, downloadCsv, inputCls } from "./shared";
import { AdminCard } from "./primitives/AdminCard";


const COLORS = ["#D4AF37", "#3b82f6", "#ef4444", "#22c55e"];
const MARKETS = ["", "player_a", "player_b", "pair_plus_a", "pair_plus_b"];
const PRESETS = [
  { key: "today", label: "Today", hours: null },
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 168 },
  { key: "30d", label: "30d", hours: 720 },
];

function hourLabel(v) {
  return v?.slice(11, 13) || v || "";
}

export function PlatformAnalytics({ onViewUserPnl }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [hours, setHours] = useState(24);
  const [market, setMarket] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [appliedUserQ, setAppliedUserQ] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playersOffset, setPlayersOffset] = useState(0);
  const playersLimit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(playersLimit),
        offset: String(playersOffset),
      });
      if (hours) {
        params.set("hours", String(hours));
      } else {
        if (appliedFrom) params.set("from_date", appliedFrom);
        if (appliedTo) params.set("to_date", appliedTo);
      }
      if (market) params.set("market", market);
      if (appliedUserQ) params.set("q", appliedUserQ);
      const { data: d } = await api.get(`/admin/analytics/platform?${params}`);
      setData(d);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [hours, appliedFrom, appliedTo, market, appliedUserQ, playersOffset]);

  useEffect(() => {
    if (data?.from_date && data?.to_date && !appliedFrom && !appliedTo && !hours) {
      setFromDate(data.from_date);
      setToDate(data.to_date);
    }
  }, [data, appliedFrom, appliedTo, hours]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    setHours(null);
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    setAppliedUserQ(userQuery.trim());
    setPlayersOffset(0);
  };

  const applyPreset = (preset) => {
    setHours(preset.hours);
    setAppliedFrom("");
    setAppliedTo("");
    setPlayersOffset(0);
    if (!preset.hours) {
      setFromDate("");
      setToDate("");
    }
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setAppliedFrom("");
    setAppliedTo("");
    setHours(24);
    setMarket("");
    setUserQuery("");
    setAppliedUserQ("");
    setPlayersOffset(0);
  };

  if (!data && loading) {
    return <div className="text-white/50">Loading analytics…</div>;
  }

  const pnl = data?.platform_pnl || {};
  const growth = data?.growth || {};
  const outcomes = data?.round_outcomes || {};
  const outcomePie = [
    { name: "Player A", value: outcomes.A || 0 },
    { name: "Player B", value: outcomes.B || 0 },
    { name: "Tie", value: outcomes.TIE || 0 },
  ].filter((x) => x.value > 0);

  const marketPie = (data?.by_market || []).map((row) => ({
    name: marketLabel(row.market),
    value: row.wagered,
  }));

  const dailyChart = (data?.by_day || []).map((row) => ({
    ...row,
    label: row.session_date,
  }));

  return (
    <div className="space-y-3" data-testid={ANALYTICS.panel}>
      <div className="sticky top-0 z-10 -mx-3 px-3 py-2 bg-zinc-950/95 backdrop-blur border-b border-white/10 space-y-2">
        <div className="text-[10px] tracking-[0.25em] uppercase text-white/40">Platform analytics</div>
        <div className="flex flex-wrap gap-2 items-end">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 text-xs rounded-sm border ${
                (p.hours === hours) || (p.key === "today" && !hours && !appliedFrom)
                  ? "border-[color:var(--theme-primary)] text-[color:var(--theme-primary)]"
                  : "border-white/10 text-white/50"
              }`}
            >
              {p.label}
            </button>
          ))}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setHours(null); }}
            className={inputCls + " w-auto"}
            data-testid={ANALYTICS.fromDate}
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setHours(null); }}
            className={inputCls + " w-auto"}
            data-testid={ANALYTICS.toDate}
          />
          <select
            value={market}
            onChange={(e) => { setMarket(e.target.value); setPlayersOffset(0); }}
            className={inputCls + " w-auto"}
            data-testid={ANALYTICS.marketFilter}
          >
            <option value="">All markets</option>
            {MARKETS.filter(Boolean).map((m) => (
              <option key={m} value={m}>{marketLabel(m)}</option>
            ))}
          </select>
          <div className="flex gap-1 items-center">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="User email or name"
              className={inputCls + " w-48"}
              data-testid={ANALYTICS.userFilter}
            />
            <button
              type="button"
              onClick={applyFilters}
              className="p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
              data-testid={ANALYTICS.userSearch}
            >
              <Search size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="px-3 py-2 text-xs border border-white/10 rounded-sm"
            data-testid={ANALYTICS.applyBtn}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 text-xs border border-white/10 rounded-sm text-white/50"
            data-testid={ANALYTICS.clearBtn}
          >
            Clear
          </button>
          <span className="text-xs text-white/40 ml-auto">
            {loading ? "Loading…" : `${data?.from_date || ""} → ${data?.to_date || ""}`}
            {data?.filtered_user?.email ? ` · ${data.filtered_user.email}` : ""}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-white/35">
        House profit from settled bets only. Open exposure and wallet adjustments shown separately.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="border border-white/10 rounded-sm p-3 bg-white/[0.03] sm:col-span-2">
          <div className="text-[9px] tracking-[0.2em] uppercase text-white/40">Platform PNL (House Profit)</div>
          <div
            className={`font-mono-data text-2xl mt-1 ${pnlColorClass(pnl.house_profit)}`}
            data-testid={ANALYTICS.houseProfit}
          >
            {formatHousePnl(pnl.house_profit)}
          </div>
          <div className="text-[10px] text-white/35 mt-1">Hold {pnl.hold_percent ?? 0}%</div>
        </div>
        <StatCard
          label="Total wagered"
          value={`₹${(pnl.total_wagered || 0).toLocaleString()}`}
          testId={ANALYTICS.totalWagered}
        />
        <StatCard
          label="Total returned"
          value={`₹${(pnl.total_returned || 0).toLocaleString()}`}
          testId={ANALYTICS.totalReturned}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <StatCard label="Unique bettors" value={pnl.unique_bettors || 0} />
        <StatCard label="Settled bets" value={pnl.bet_count || 0} sub={`W ${pnl.won_count || 0} · L ${pnl.lost_count || 0} · T ${pnl.tie_count || 0}`} />
        <StatCard label="Avg bet" value={`₹${(pnl.avg_bet_size || 0).toLocaleString()}`} />
        <StatCard label="Rounds settled" value={pnl.rounds_settled || 0} />
        <StatCard label="Open exposure" value={`₹${(pnl.unsettled_wagered || 0).toLocaleString()}`} sub={`${pnl.unsettled_bet_count || 0} open bets`} />
        <StatCard label="New signups" value={growth.new_signups || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard title="Daily house profit">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart}>
                <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                <Bar dataKey="house_profit" fill="#22c55e" radius={[2, 2, 0, 0]} name="House profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Hourly volume & house profit">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.hourly || []}>
                <XAxis dataKey="hour" tick={{ fill: "#888", fontSize: 10 }} tickFormatter={hourLabel} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                <Legend />
                <Line type="monotone" dataKey="wagered" stroke="#D4AF37" strokeWidth={2} dot={false} name="Wagered" />
                <Line type="monotone" dataKey="house_profit" stroke="#22c55e" strokeWidth={2} dot={false} name="House profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Wagered by market">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={marketPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {marketPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Round outcomes">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomePie}>
                <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Signups over time">
          <div className="h-72 lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.hourly_signups || []}>
                <XAxis dataKey="hour" tick={{ fill: "#888", fontSize: 10 }} tickFormatter={hourLabel} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard
          title="By market"
          actions={
            <button
              type="button"
              className="text-[10px] text-white/40 hover:text-white"
              onClick={() => downloadCsv("platform-by-market.csv", data?.by_market || [])}
              data-testid={ANALYTICS.exportDailyBtn}
            >
              Export
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono-data">
              <thead className="text-white/40 uppercase text-[10px]">
                <tr>
                  <th className="text-left py-2">Market</th>
                  <th className="text-right py-2">Wagered</th>
                  <th className="text-right py-2">Returned</th>
                  <th className="text-right py-2">House</th>
                </tr>
              </thead>
              <tbody>
                {(data?.by_market || []).map((row) => (
                  <tr key={row.market} className="border-t border-white/5">
                    <td className="py-1.5">{marketLabel(row.market)}</td>
                    <td className="text-right">₹{row.wagered.toLocaleString()}</td>
                    <td className="text-right">₹{row.returned.toLocaleString()}</td>
                    <td className={`text-right ${pnlColorClass(row.house_profit)}`}>{formatHousePnl(row.house_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard title="By session day">
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs font-mono-data">
              <thead className="text-white/40 uppercase text-[10px]">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Bets</th>
                  <th className="text-right py-2">House</th>
                </tr>
              </thead>
              <tbody>
                {(data?.by_day || []).map((row) => (
                  <tr key={row.session_date} className="border-t border-white/5">
                    <td className="py-1.5">{row.session_date}</td>
                    <td className="text-right">{row.bet_count}</td>
                    <td className={`text-right ${pnlColorClass(row.house_profit)}`}>{formatHousePnl(row.house_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      <AdminCard
        title="Top players (house profit contributors)"
        actions={
          <button
            type="button"
            className="text-[10px] text-white/40 hover:text-white"
            onClick={() => downloadCsv("platform-top-players.csv", data?.top_players || [])}
            data-testid={ANALYTICS.exportPlayersBtn}
          >
            Export
          </button>
        }
      >
        <div className="overflow-x-auto" data-testid={ANALYTICS.topPlayersTable}>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="text-left py-2">Player</th>
                <th className="text-right py-2">Wagered</th>
                <th className="text-right py-2">Returned</th>
                <th className="text-right py-2">Player net</th>
                <th className="text-right py-2">House profit</th>
                <th className="text-right py-2">Bets</th>
                <th className="text-right py-2" />
              </tr>
            </thead>
            <tbody>
              {(data?.top_players || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/40 text-sm">No settled bets in this period</td>
                </tr>
              ) : (
                (data?.top_players || []).map((row) => (
                  <tr key={row.user_id} className="border-t border-white/5 font-mono-data text-xs">
                    <td className="py-2">
                      <div>{row.name || "—"}</div>
                      <div className="text-white/40">{row.email}</div>
                    </td>
                    <td className="text-right">₹{row.wagered.toLocaleString()}</td>
                    <td className="text-right">₹{row.returned.toLocaleString()}</td>
                    <td className={`text-right ${pnlColorClass(row.player_net)}`}>{formatHousePnl(row.player_net)}</td>
                    <td className={`text-right ${pnlColorClass(row.house_profit)}`}>{formatHousePnl(row.house_profit)}</td>
                    <td className="text-right">{row.bet_count}</td>
                    <td className="text-right">
                      {onViewUserPnl && (
                        <button
                          type="button"
                          className="text-[color:var(--theme-primary)] text-[10px] uppercase tracking-wider hover:underline"
                          onClick={() => onViewUserPnl(row)}
                          data-testid={ANALYTICS.viewUserPnlBtn}
                        >
                          PNL
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            disabled={playersOffset <= 0 || loading}
            onClick={() => setPlayersOffset((o) => Math.max(0, o - playersLimit))}
            className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={playersOffset + playersLimit >= (data?.top_players_total || 0) || loading}
            onClick={() => setPlayersOffset((o) => o + playersLimit)}
            className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </AdminCard>
    </div>
  );
}
