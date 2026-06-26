import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formatApiError } from "../lib/api";
import { Card, StatCard, downloadCsv, inputCls } from "./admin/shared";
import { PNL } from "../constants/testIds";

const MARKET_LABELS = {
  player_a: "Player A",
  player_b: "Player B",
  pair_plus_a: "Pair Plus A",
  pair_plus_b: "Pair Plus B",
};

function formatPnl(value) {
  const n = Number(value) || 0;
  const prefix = n > 0 ? "+" : "";
  return `${prefix}₹${n.toLocaleString()}`;
}

function pnlColor(value) {
  const n = Number(value) || 0;
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-red-400";
  return "text-white";
}

function PlayerStat({ label, value, testId, colorClass }) {
  return (
    <div className="border border-white/10 rounded-sm p-4 bg-white/[0.02]">
      <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">{label}</div>
      <div className={`font-mono-data text-2xl mt-2 ${colorClass || "text-white"}`} data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

export function PnlReportPanel({
  variant = "player",
  fetchReport,
  exportFilename = "pnl-report.csv",
  testIdPrefix = "pnl",
  showUserHeader = false,
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [report, setReport] = useState(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReport({
        fromDate: appliedFrom || undefined,
        toDate: appliedTo || undefined,
        limit,
        offset,
      });
      setReport(data);
      if (!fromDate && !toDate && data.from_date && data.to_date) {
        setFromDate(data.from_date);
        setToDate(data.to_date);
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load PNL report");
    } finally {
      setLoading(false);
    }
  }, [fetchReport, appliedFrom, appliedTo, limit, offset, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const applyDates = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    setOffset(0);
  };

  const summary = report?.summary || {};
  const isPlayer = variant === "player";
  const headCls = "bg-white/[0.04] text-[10px] tracking-[0.2em] uppercase text-white/50";

  const handleExport = () => {
    const bets = report?.bets || [];
    if (!bets.length) return;
    downloadCsv(
      exportFilename,
      bets.map((b) => ({
        created_at: b.created_at,
        round_number: b.round_number,
        market: b.market,
        amount: b.amount,
        payout: b.payout,
        net_pnl: b.net_pnl,
        won: b.won,
        tie: b.tie,
      }))
    );
  };

  const total = report?.total || 0;
  const pageStart = total ? offset + 1 : 0;
  const pageEnd = Math.min(offset + limit, total);

  return (
    <div className="space-y-6" data-testid={`${testIdPrefix}-panel`}>
      {showUserHeader && report?.user && (
        <div className="text-sm text-white/60">
          {report.user.name} · {report.user.email}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-white/50">
          <span className="block mb-1 uppercase tracking-wider text-[10px]">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={isPlayer ? "bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2 text-sm" : inputCls}
            data-testid={testIdPrefix === "pnl" ? PNL.fromDate : `${testIdPrefix}-from-date`}
          />
        </label>
        <label className="text-xs text-white/50">
          <span className="block mb-1 uppercase tracking-wider text-[10px]">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={isPlayer ? "bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2 text-sm" : inputCls}
            data-testid={testIdPrefix === "pnl" ? PNL.toDate : `${testIdPrefix}-to-date`}
          />
        </label>
        <button
          type="button"
          onClick={applyDates}
          className="px-3 py-2 text-xs border border-white/10 rounded-sm hover:bg-white/[0.04]"
          data-testid={testIdPrefix === "pnl" ? PNL.applyBtn : `${testIdPrefix}-apply-btn`}
        >
          Apply
        </button>
        {report?.from_date && (
          <span className="text-xs text-white/40 ml-auto">
            {loading ? "Loading…" : `${report.from_date} → ${report.to_date} (${report.timezone || ""})`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {isPlayer ? (
          <>
            <PlayerStat
              label="Net PNL"
              value={formatPnl(summary.net_pnl)}
              testId={PNL.netPnl}
              colorClass={pnlColor(summary.net_pnl)}
            />
            <PlayerStat
              label="Wagered"
              value={`₹${(summary.total_wagered || 0).toLocaleString()}`}
              testId={PNL.wagered}
            />
            <PlayerStat
              label="Returned"
              value={`₹${(summary.total_returned || 0).toLocaleString()}`}
              testId={PNL.returned}
            />
            <PlayerStat
              label="Settled Bets"
              value={String(summary.bet_count || 0)}
              testId={PNL.betCount}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Net PNL"
              value={formatPnl(summary.net_pnl)}
              testId={`${testIdPrefix}-net-pnl`}
            />
            <StatCard
              label="Wagered"
              value={`₹${(summary.total_wagered || 0).toLocaleString()}`}
              testId={`${testIdPrefix}-wagered`}
            />
            <StatCard
              label="Returned"
              value={`₹${(summary.total_returned || 0).toLocaleString()}`}
              testId={`${testIdPrefix}-returned`}
            />
            <StatCard
              label="Settled Bets"
              value={String(summary.bet_count || 0)}
              testId={`${testIdPrefix}-bet-count`}
              sub={`W ${summary.won_count || 0} · L ${summary.lost_count || 0} · T ${summary.tie_count || 0}`}
            />
          </>
        )}
      </div>

      {(report?.by_market?.length > 0 || report?.by_day?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {report?.by_market?.length > 0 && (
            <Card title="By market">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono-data">
                  <thead className={headCls}>
                    <tr>
                      <th className="text-left px-2 py-2">Market</th>
                      <th className="text-right px-2 py-2">Wagered</th>
                      <th className="text-right px-2 py-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_market.map((row) => (
                      <tr key={row.market} className="border-t border-white/5">
                        <td className="px-2 py-1.5">{MARKET_LABELS[row.market] || row.market}</td>
                        <td className="px-2 py-1.5 text-right">₹{row.wagered.toLocaleString()}</td>
                        <td className={`px-2 py-1.5 text-right ${pnlColor(row.net_pnl)}`}>
                          {formatPnl(row.net_pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {report?.by_day?.length > 0 && (
            <Card title="By session day">
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs font-mono-data">
                  <thead className={headCls}>
                    <tr>
                      <th className="text-left px-2 py-2">Date</th>
                      <th className="text-right px-2 py-2">Bets</th>
                      <th className="text-right px-2 py-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_day.map((row) => (
                      <tr key={row.session_date} className="border-t border-white/5">
                        <td className="px-2 py-1.5">{row.session_date}</td>
                        <td className="px-2 py-1.5 text-right">{row.bet_count}</td>
                        <td className={`px-2 py-1.5 text-right ${pnlColor(row.net_pnl)}`}>
                          {formatPnl(row.net_pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      <Card title="Settled bets">
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={!report?.bets?.length}
            className="px-3 py-2 text-xs border border-white/10 rounded-sm disabled:opacity-30"
            data-testid={testIdPrefix === "pnl" ? PNL.exportBtn : `${testIdPrefix}-export-btn`}
          >
            Export CSV
          </button>
          <span className="text-xs text-white/40 ml-auto">
            {total ? `${pageStart}–${pageEnd} of ${total}` : "0 bets"}
          </span>
        </div>
        <div className="rounded-md border border-white/10 overflow-x-auto" data-testid={testIdPrefix === "pnl" ? PNL.table : `${testIdPrefix}-bets-table`}>
          <table className="w-full text-sm">
            <thead className={headCls}>
              <tr>
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2">Round</th>
                <th className="text-left px-3 py-2">Market</th>
                <th className="text-right px-3 py-2">Wager</th>
                <th className="text-right px-3 py-2">Payout</th>
                <th className="text-right px-3 py-2">Net</th>
                <th className="text-left px-3 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {!report?.bets?.length && !loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-white/40 text-sm">
                    No settled bets in this period
                  </td>
                </tr>
              ) : (
                (report?.bets || []).map((b) => (
                  <tr key={b.id} className="border-t border-white/5 font-mono-data text-xs">
                    <td className="px-3 py-2 text-white/70">{b.created_at?.slice(0, 19).replace("T", " ")}</td>
                    <td className="px-3 py-2">#{b.round_number}</td>
                    <td className="px-3 py-2">{MARKET_LABELS[b.market] || b.market}</td>
                    <td className="px-3 py-2 text-right">₹{b.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">₹{(b.payout || 0).toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right ${pnlColor(b.net_pnl)}`}>{formatPnl(b.net_pnl)}</td>
                    <td className="px-3 py-2">
                      {b.tie ? "Tie" : b.won ? "Won" : "Lost"}
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
            disabled={offset <= 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30"
            data-testid={testIdPrefix === "pnl" ? PNL.prevBtn : `${testIdPrefix}-prev-btn`}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={offset + limit >= total || loading}
            onClick={() => setOffset((o) => o + limit)}
            className="px-3 py-1.5 text-xs border border-white/10 rounded-sm disabled:opacity-30"
            data-testid={testIdPrefix === "pnl" ? PNL.nextBtn : `${testIdPrefix}-next-btn`}
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  );
}
