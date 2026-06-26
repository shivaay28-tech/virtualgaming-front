import React, { useCallback, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { inputCls } from "./shared";
import { AccountStatementTable } from "../AccountStatementTable";

export function TransactionsPanel() {
  const [userQuery, setUserQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [userLabel, setUserLabel] = useState("");

  const resolveUser = async () => {
    const q = userQuery.trim();
    if (!q) {
      setUserId("");
      setUserLabel("");
      return;
    }
    try {
      const { data } = await api.get(`/admin/users?q=${encodeURIComponent(q)}&limit=5`);
      const users = data.users || [];
      if (!users.length) {
        toast.error("No user found");
        setUserId("");
        setUserLabel("");
        return;
      }
      const match = users.find((u) => u.email?.toLowerCase() === q.toLowerCase()) || users[0];
      setUserId(match.id);
      setUserLabel(match.email);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "User lookup failed");
    }
  };

  const fetchPage = useCallback(
    async ({ limit, offset, type }) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (type) params.set("type", type);
      if (userId) params.set("user_id", userId);
      const { data } = await api.get(`/admin/transactions?${params}`);
      return data;
    },
    [userId]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && resolveUser()}
            placeholder="Filter by email or name"
            className={inputCls + " w-56"}
            data-testid="transactions-user-filter"
          />
          <button
            type="button"
            onClick={resolveUser}
            className="p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
            title="Search user"
          >
            <Search size={14} />
          </button>
        </div>
        {userLabel && (
          <span className="text-xs text-white/50">
            Showing: {userLabel}
            <button
              type="button"
              className="ml-2 text-[color:var(--theme-primary)] underline"
              onClick={() => {
                setUserQuery("");
                setUserId("");
                setUserLabel("");
              }}
            >
              Clear
            </button>
          </span>
        )}
      </div>
      <AccountStatementTable
        variant="admin"
        showUserColumn={!userId}
        fetchPage={fetchPage}
        exportFilename={userLabel ? `transactions-${userLabel.replace(/[@.]/g, "_")}.csv` : "transactions.csv"}
        testIdPrefix="admin-transactions"
      />
    </div>
  );
}
