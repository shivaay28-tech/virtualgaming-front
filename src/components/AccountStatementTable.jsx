import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formatApiError } from "../lib/api";
import { downloadCsv } from "./admin/shared";

export const TX_TYPES = ["", "bet", "win", "refund", "admin_credit", "admin_debit", "seed"];

const inputCls = "bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2 text-sm";

export function AccountStatementTable({
  variant = "admin",
  showUserColumn = false,
  fetchPage,
  balance,
  exportFilename = "statement.csv",
  testIdPrefix = "statement",
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPage({ limit, offset, type: type || undefined });
      setRows(data.transactions || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load statement");
    } finally {
      setLoading(false);
    }
  }, [fetchPage, limit, offset, type]);

  useEffect(() => {
    load();
  }, [load]);

  const tableHeadCls =
    variant === "player"
      ? "bg-white/[0.04] text-[10px] tracking-[0.2em] uppercase text-white/50"
      : "bg-white/[0.04] text-[10px] tracking-[0.2em] uppercase text-white/50";

  const handleExport = () => {
    if (!rows.length) return;
    downloadCsv(
      exportFilename,
      rows.map((r) => ({
        created_at: r.created_at,
        ...(showUserColumn ? { user: r.user_email || r.user_id } : {}),
        type: r.type,
        amount: r.amount,
        balance_after: r.balance_after,
        note: r.note,
      }))
    );
  };

  return (
    <div className="space-y-4" data-testid={`${testIdPrefix}-table`}>
      {balance != null && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-sm border border-white/10 bg-white/[0.03] w-fit"
          data-testid={`${testIdPrefix}-balance`}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Balance</span>
          <span className="font-mono-data text-lg">₹{balance.toLocaleString()}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setOffset(0);
          }}
          className={inputCls + " w-auto"}
          data-testid={`${testIdPrefix}-type-filter`}
        >
          {TX_TYPES.map((t) => (
            <option key={t || "all"} value={t}>
              {t || "All types"}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleExport}
          disabled={!rows.length}
          className="px-3 py-2 text-xs border border-white/10 rounded-sm disabled:opacity-30"
          data-testid={`${testIdPrefix}-export`}
        >
          Export CSV
        </button>
        <span className="text-xs text-white/40 ml-auto">
          {loading ? "Loading…" : `${total} transactions`}
        </span>
      </div>
      <div className="rounded-md border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={tableHeadCls}>
            <tr>
              <th className="text-left px-3 py-2">Time</th>
              {showUserColumn && <th className="text-left px-3 py-2">User</th>}
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-right px-3 py-2">Amount</th>
              <th className="text-right px-3 py-2">Balance</th>
              <th className="text-left px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={showUserColumn ? 6 : 5} className="px-3 py-8 text-center text-white/40 text-sm">
                  No transactions found
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-xs text-white/50">{r.created_at?.slice(0, 19)}</td>
                  {showUserColumn && (
                    <td className="px-3 py-2 text-xs">{r.user_email || r.user_id?.slice(0, 8)}</td>
                  )}
                  <td className="px-3 py-2 text-[10px] uppercase tracking-wider">{r.type}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono-data ${
                      r.amount >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {r.amount >= 0 ? "+" : ""}
                    {r.amount}
                  </td>
                  <td className="px-3 py-2 text-right font-mono-data">₹{r.balance_after?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-white/50 truncate max-w-[200px]">{r.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - limit))}
          className="px-2 py-1 text-xs border border-white/10 rounded-sm disabled:opacity-30"
          data-testid={`${testIdPrefix}-prev`}
        >
          Prev
        </button>
        <button
          type="button"
          disabled={offset + limit >= total || loading}
          onClick={() => setOffset(offset + limit)}
          className="px-2 py-1 text-xs border border-white/10 rounded-sm disabled:opacity-30"
          data-testid={`${testIdPrefix}-next`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
