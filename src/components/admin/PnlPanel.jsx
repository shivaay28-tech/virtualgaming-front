import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { inputCls } from "./shared";
import { PnlReportPanel } from "../PnlReportPanel";

export function PnlPanel({ initialUser = null }) {
  const [userQuery, setUserQuery] = useState(initialUser?.email || "");
  const [userId, setUserId] = useState(initialUser?.id || "");
  const [userLabel, setUserLabel] = useState(initialUser?.email || "");

  useEffect(() => {
    if (initialUser?.id) {
      setUserId(initialUser.id);
      setUserLabel(initialUser.email || initialUser.name || "");
      setUserQuery(initialUser.email || initialUser.name || "");
    }
  }, [initialUser]);

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

  const fetchReport = useCallback(
    async ({ fromDate, toDate, limit, offset }) => {
      if (!userId) {
        return {
          summary: {},
          by_market: [],
          by_day: [],
          bets: [],
          total: 0,
        };
      }
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      const { data } = await api.get(`/admin/users/${userId}/pnl?${params}`);
      return data;
    },
    [userId]
  );

  const exportName = userLabel
    ? `pnl-${userLabel.replace(/[@.]/g, "_")}.csv`
    : "pnl-report.csv";

  return (
    <div className="space-y-4" data-testid="admin-pnl-panel">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && resolveUser()}
            placeholder="Search user by email or name"
            className={inputCls + " w-64"}
            data-testid="admin-pnl-user-filter"
          />
          <button
            type="button"
            onClick={resolveUser}
            className="p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
            title="Search user"
            data-testid="admin-pnl-user-search"
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

      {!userId ? (
        <div className="text-white/40 text-sm py-12 text-center border border-white/10 rounded-md">
          Search for a user to view their gaming PNL report.
        </div>
      ) : (
        <PnlReportPanel
          key={userId}
          variant="admin"
          fetchReport={fetchReport}
          exportFilename={exportName}
          testIdPrefix="admin-pnl"
          showUserHeader
        />
      )}
    </div>
  );
}
