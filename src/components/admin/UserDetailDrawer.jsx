import React, { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { StatCard, Card } from "./shared";
import { AmountDialog } from "./AmountDialog";
import { AccountStatementTable } from "../AccountStatementTable";

export function UserDetailDrawer({ userId, open, onOpenChange, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [statementBalance, setStatementBalance] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await api.get(`/admin/users/${userId}`);
      setDetail(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load user");
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) load();
  }, [open, userId, load]);

  const fetchPage = useCallback(
    async ({ limit, offset, type }) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (type) params.set("type", type);
      const { data } = await api.get(`/admin/users/${userId}/statement?${params}`);
      setStatementBalance(data.balance);
      return data;
    },
    [userId]
  );

  const u = detail?.user;
  const exportName = u?.email
    ? `statement-${u.email.replace(/[@.]/g, "_")}.csv`
    : `statement-${userId?.slice(0, 8) || "user"}.csv`;

  const deposit = async (amount, note) => {
    setLoading(true);
    try {
      const { data } = await api.post(`/admin/users/${userId}/credit`, { amount, note });
      toast.success(`Deposited ₹${amount} — new balance ₹${(data.user?.balance ?? 0).toLocaleString()}`);
      setDialog(null);
      load();
      onUpdated?.();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (amount, note) => {
    setLoading(true);
    try {
      const { data } = await api.post(`/admin/users/${userId}/debit`, { amount, note });
      toast.success(`Withdrew ₹${amount} — new balance ₹${(data.user?.balance ?? 0).toLocaleString()}`);
      setDialog(null);
      load();
      onUpdated?.();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const suspend = async () => {
    setLoading(true);
    try {
      await api.post(`/admin/users/${userId}/suspend`, { suspended: !u?.suspended });
      toast.success(u?.suspended ? "User unsuspended" : "User suspended");
      load();
      onUpdated?.();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const mute = async (minutes) => {
    setLoading(true);
    try {
      await api.post(`/admin/users/${userId}/mute`, { minutes });
      toast.success(minutes ? `Muted ${minutes}m` : "Unmuted");
      load();
      onUpdated?.();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="bg-zinc-950 border-white/10 text-white w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">{u?.name || "User"}</SheetTitle>
          </SheetHeader>
          {!detail ? (
            <div className="text-white/50 py-8">Loading…</div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="text-sm text-white/60">
                <span className="text-white/80">@{u.username}</span>
                <span className="mx-2 text-white/30">·</span>
                {u.email}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Balance" value={`₹${(u.balance || 0).toLocaleString()}`} />
                <StatCard
                  label="Net PNL"
                  value={`${(detail.totals.net || 0) >= 0 ? "+" : ""}₹${(detail.totals.net || 0).toLocaleString()}`}
                  testId="admin-user-net-pnl"
                />
                <StatCard label="Wagered" value={`₹${detail.totals.wagered.toLocaleString()}`} />
                <StatCard label="Returned" value={`₹${detail.totals.won.toLocaleString()}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setDialog("deposit")} className="px-3 py-1.5 rounded-sm bg-emerald-600 text-white text-xs">Deposit</button>
                <button onClick={() => setDialog("withdraw")} className="px-3 py-1.5 rounded-sm bg-red-600 text-white text-xs">Withdraw</button>
                <button onClick={suspend} disabled={loading} className="px-3 py-1.5 rounded-sm border border-white/20 text-xs">
                  {u.suspended ? "Unsuspend" : "Suspend"}
                </button>
                <button onClick={() => mute(u.muted_until ? 0 : 60)} disabled={loading} className="px-3 py-1.5 rounded-sm border border-white/20 text-xs">
                  {u.muted_until ? "Unmute" : "Mute 1h"}
                </button>
              </div>
              <Card title="Account statement">
                <AccountStatementTable
                  key={u.balance}
                  variant="admin"
                  showUserColumn={false}
                  fetchPage={fetchPage}
                  balance={statementBalance ?? u.balance}
                  exportFilename={exportName}
                  testIdPrefix="admin-user-statement"
                />
              </Card>
              <Card title="Recent bets">
                <div className="space-y-1 max-h-40 overflow-y-auto text-xs font-mono-data">
                  {detail.bets.map((b) => (
                    <div key={b.id} className="flex justify-between border-b border-white/5 py-1">
                      <span>#{b.round_number} {b.market}</span>
                      <span>₹{b.amount} {b.won ? `+${b.payout}` : ""}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <AmountDialog open={dialog === "deposit"} onOpenChange={(v) => !v && setDialog(null)} mode="deposit" currentBalance={u?.balance ?? 0} onSubmit={deposit} loading={loading} />
      <AmountDialog open={dialog === "withdraw"} onOpenChange={(v) => !v && setDialog(null)} mode="withdraw" currentBalance={u?.balance ?? 0} onSubmit={withdraw} loading={loading} />
    </>
  );
}
