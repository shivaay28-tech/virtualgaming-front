import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { AccountStatementTable } from "../components/AccountStatementTable";
import { RoundStatementPanel } from "../components/RoundStatementPanel";
import { STATEMENT } from "../constants/testIds";

export default function AccountStatement() {
  const [balance, setBalance] = useState(null);
  const [tab, setTab] = useState("transactions");

  useEffect(() => {
    api.get("/wallet/me")
      .then(({ data }) => setBalance(data.balance))
      .catch(() => {});
  }, []);

  const fetchPage = useCallback(async ({ limit, offset, type }) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (type) params.set("type", type);
    const { data } = await api.get(`/wallet/statement?${params}`);
    setBalance(data.balance);
    return data;
  }, []);

  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm border transition-colors ${
        tab === id
          ? "border-[color:var(--theme-primary)] text-[color:var(--theme-primary)] bg-[color:var(--theme-primary)]/10"
          : "border-white/10 text-white/50 hover:text-white"
      }`}
      data-testid={`statement-tab-${id}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen felt-bg noise text-white" data-testid={STATEMENT.page}>
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
            data-testid={STATEMENT.backBtn}
            aria-label="Back to game"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--theme-primary)]">
              Account
            </div>
            <div className="font-display text-lg leading-none mt-0.5">Statement</div>
          </div>
        </div>
        <Link
          to="/pnl"
          className="text-xs text-white/50 hover:text-white uppercase tracking-wider"
          data-testid="statement-pnl-link"
        >
          PNL Report
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-4">
        {balance != null && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-sm border border-white/10 bg-white/[0.03] w-fit"
            data-testid="statement-balance"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Balance</span>
            <span className="font-mono-data text-lg">₹{balance.toLocaleString()}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tabBtn("transactions", "Transactions")}
          {tabBtn("rounds", "By round")}
        </div>

        {tab === "transactions" ? (
          <AccountStatementTable
            variant="player"
            showUserColumn={false}
            fetchPage={fetchPage}
            balance={balance}
            exportFilename="my-statement.csv"
            testIdPrefix="statement"
          />
        ) : (
          <RoundStatementPanel />
        )}
      </main>
    </div>
  );
}
