import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { PnlReportPanel } from "../components/PnlReportPanel";
import { PNL } from "../constants/testIds";

export default function PnlReport() {
  const fetchReport = useCallback(async ({ fromDate, toDate, limit, offset }) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    const { data } = await api.get(`/wallet/pnl?${params}`);
    return data;
  }, []);

  return (
    <div className="min-h-screen felt-bg noise text-white" data-testid={PNL.page}>
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
            data-testid={PNL.backBtn}
            aria-label="Back to game"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--theme-primary)]">
              Account
            </div>
            <div className="font-display text-lg leading-none mt-0.5">PNL Report</div>
          </div>
        </div>
        <Link
          to="/statement"
          className="text-xs text-white/50 hover:text-white uppercase tracking-wider"
          data-testid="pnl-statement-link"
        >
          Statement
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
        <p className="text-sm text-white/50 mb-4">
          Gaming profit and loss from settled bets only. Admin credits and open bets are excluded.
        </p>
        <PnlReportPanel
          variant="player"
          fetchReport={fetchReport}
          exportFilename="my-pnl.csv"
          testIdPrefix="pnl"
        />
      </main>
    </div>
  );
}
