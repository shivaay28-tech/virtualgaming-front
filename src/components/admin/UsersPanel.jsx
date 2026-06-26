import React, { useCallback, useEffect, useState } from "react";
import { Search, Plus, ArrowDownToLine, ArrowUpFromLine, Ban, ShieldCheck, MicOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { IconBtn, inputCls } from "./shared";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { AmountDialog, MuteDialog } from "./AmountDialog";
import { AddUserDialog } from "./AddUserDialog";

export function UsersPanel({ startingBalance = 10000, onUserCreated }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionUser, setActionUser] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [muteOpen, setMuteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  }, [q, offset]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (u) => {
    setSelectedId(u.id);
    setDrawerOpen(true);
  };

  const depositWithdraw = async (amount, note) => {
    if (!actionUser) return;
    const path = dialog === "deposit" ? "credit" : "debit";
    setActionLoading(true);
    try {
      const { data } = await api.post(`/admin/users/${actionUser.id}/${path}`, { amount, note });
      const label = dialog === "deposit" ? "Deposited" : "Withdrew";
      toast.success(`${label} ₹${amount} — new balance ₹${(data.user?.balance ?? 0).toLocaleString()}`);
      setDialog(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const createUser = async (payload) => {
    setActionLoading(true);
    try {
      const { data } = await api.post("/admin/users", payload);
      toast.success(`User created — balance ₹${(data.user?.balance ?? 0).toLocaleString()}`);
      setAddOpen(false);
      load();
      onUserCreated?.();
      if (data.user?.id) {
        setSelectedId(data.user.id);
        setDrawerOpen(true);
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const suspend = async (u) => {
    try {
      await api.post(`/admin/users/${u.id}/suspend`, { suspended: !u.suspended });
      toast.success(u.suspended ? "Unsuspended" : "Suspended");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const mute = async (minutes) => {
    if (!actionUser) return;
    try {
      await api.post(`/admin/users/${actionUser.id}/mute`, { minutes });
      toast.success(minutes > 0 ? `Muted ${minutes}m` : "Unmuted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute top-1/2 -translate-y-1/2 left-2.5 text-white/35" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} placeholder="Search by email, username, or name…" data-testid="admin-users-search" className={`bg-white/[0.04] border border-white/10 rounded-sm pl-8 pr-2 py-1.5 text-xs w-full outline-none focus:border-[color:var(--theme-primary)]/50 placeholder:text-white/25`} />
        </div>
        <button onClick={load} className="px-2.5 py-1.5 rounded-sm border border-white/10 text-xs hover:bg-white/[0.04]">Search</button>
        <button
          onClick={() => setAddOpen(true)}
          data-testid="admin-add-user-btn"
          className="px-3 py-2 rounded-sm bg-[color:var(--theme-primary)] text-black text-xs flex items-center gap-1.5 whitespace-nowrap"
        >
          <UserPlus size={14} /> Add user
        </button>
      </div>

      <div className="rounded-md border border-white/10 overflow-x-auto">
        <table className="w-full text-sm" data-testid="admin-users-table">
          <thead className="bg-white/[0.04] text-[10px] tracking-[0.2em] uppercase text-white/50">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Username</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-right px-3 py-2">Balance</th>
              <th className="text-left px-3 py-2">Joined</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const muted = u.muted_until && new Date(u.muted_until) > new Date();
              return (
                <tr key={u.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] cursor-pointer" onClick={() => openDetail(u)} data-testid={`admin-user-row-${u.id}`}>
                  <td className="px-2 py-1 text-xs">{u.name}</td>
                  <td className="px-2 py-1 text-[10px] text-white/55">{u.username || "—"}</td>
                  <td className="px-2 py-1 text-[10px] text-white/55">{u.email}</td>
                  <td className="px-2 py-1 text-[9px] tracking-[0.15em] uppercase text-white/40">{u.role}</td>
                  <td className="px-2 py-1 text-right font-mono-data text-xs">₹{(u.balance || 0).toLocaleString()}</td>
                  <td className="px-2 py-1 text-[10px] text-white/35">{u.created_at?.slice(0, 10) || "—"}</td>
                  <td className="px-2 py-1 text-[10px]">
                    {u.suspended && <span className="text-red-400">suspended </span>}
                    {muted && <span className="text-amber-400">muted</span>}
                    {!u.suspended && !muted && <span className="text-emerald-400">active</span>}
                  </td>
                  <td className="px-2 py-1 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <IconBtn onClick={() => { setActionUser(u); setDialog("deposit"); }} testId={`deposit-${u.id}`} title="Deposit"><ArrowDownToLine size={12} /></IconBtn>
                      <IconBtn onClick={() => { setActionUser(u); setDialog("withdraw"); }} testId={`withdraw-${u.id}`} title="Withdraw"><ArrowUpFromLine size={12} /></IconBtn>
                      <IconBtn onClick={() => { setActionUser(u); setMuteOpen(true); }} testId={`mute-${u.id}`} title="Mute"><MicOff size={12} /></IconBtn>
                      <IconBtn onClick={() => suspend(u)} testId={`suspend-${u.id}`} title={u.suspended ? "Unsuspend" : "Suspend"}>
                        {u.suspended ? <ShieldCheck size={12} /> : <Ban size={12} />}
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && users.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-white/40 text-xs">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-white/40">
        <span>{total} users total</span>
        <div className="flex gap-2">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-2 py-1 border border-white/10 rounded-sm disabled:opacity-30">Prev</button>
          <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="px-2 py-1 border border-white/10 rounded-sm disabled:opacity-30">Next</button>
        </div>
      </div>

      <UserDetailDrawer userId={selectedId} open={drawerOpen} onOpenChange={setDrawerOpen} onUpdated={load} />
      <AmountDialog
        open={dialog === "deposit"}
        onOpenChange={(v) => !v && setDialog(null)}
        mode="deposit"
        currentBalance={actionUser?.balance ?? 0}
        onSubmit={depositWithdraw}
        loading={actionLoading}
      />
      <AmountDialog
        open={dialog === "withdraw"}
        onOpenChange={(v) => !v && setDialog(null)}
        mode="withdraw"
        currentBalance={actionUser?.balance ?? 0}
        onSubmit={depositWithdraw}
        loading={actionLoading}
      />
      <MuteDialog open={muteOpen} onOpenChange={setMuteOpen} onSubmit={mute} />
      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        startingBalance={startingBalance}
        onSubmit={createUser}
        loading={actionLoading}
      />
    </div>
  );
}
