import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { KpiStrip } from "./primitives/KpiStrip";
import { AdminCard } from "./primitives/AdminCard";
import { AdminTable } from "./primitives/AdminTable";

/* ─── Helpers ────────────────────────────────────────────────────────── */
function statusPill(ok, label) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium border ${
        ok
          ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/18"
          : "bg-red-500/12 text-red-400 border-red-500/18"
      }`}
    >
      {label}
    </span>
  );
}

/* ─── AuditLog ───────────────────────────────────────────────────────── */
export function AuditLog() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/audit?limit=100");
      setRows(data.audit || []);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns = [
    {
      key: "created_at",
      label: "Time",
      render: (v) => <span className="text-white/40 font-mono-data">{v?.slice(0, 16).replace("T", " ")}</span>,
    },
    { key: "admin_email", label: "Admin" },
    {
      key: "action",
      label: "Action",
      render: (v) => (
        <span className="text-[9px] tracking-[0.15em] uppercase text-[color:var(--theme-primary)]/80">
          {v}
        </span>
      ),
    },
    {
      key: "detail",
      label: "Detail",
      render: (v) => (
        <span className="text-white/50 font-mono-data text-[9px]">
          {typeof v === "object" ? JSON.stringify(v) : v}
        </span>
      ),
    },
  ];

  return (
    <AdminCard
      title="Audit Log"
      actions={
        <button
          onClick={load}
          disabled={loading}
          className="px-2 py-1 text-[10px] border border-white/10 rounded-sm hover:bg-white/[0.04]"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      <AdminTable
        columns={columns}
        rows={rows}
        rowKey="id"
        loading={loading}
        emptyText="No audit entries"
      />
    </AdminCard>
  );
}

/* ─── SystemHealth ───────────────────────────────────────────────────── */
export function SystemHealth() {
  const [sys, setSys] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/admin/system");
        setSys(data);
      } catch (e) {
        toast.error(formatApiError(e.response?.data?.detail) || "Failed");
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  if (!sys) return <div className="text-white/40 text-xs">Loading…</div>;

  const redisLabel = !sys.redis_enabled ? "Disabled" : sys.redis_ok ? "OK" : "DOWN";

  return (
    <div className="space-y-3">
      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5">
        {statusPill(sys.mongo_ok, "Mongo")}
        {sys.redis_enabled && statusPill(sys.redis_ok, `Redis ${redisLabel}`)}
        {statusPill(sys.is_leader, sys.is_leader ? "Leader" : "Follower")}
        {statusPill(!sys.game?.paused, sys.game?.paused ? "Paused" : "Running")}
      </div>

      {/* Primary KPIs */}
      <KpiStrip
        items={[
          { label: "MongoDB",        value: sys.mongo_ok ? "OK" : "DOWN",   tone: sys.mongo_ok ? "positive" : "negative" },
          { label: "Redis",          value: redisLabel,                       tone: sys.redis_ok || !sys.redis_enabled ? "positive" : "negative" },
          { label: "Leader",         value: sys.is_leader ? "Yes" : "Follower" },
          { label: "Game phase",     value: sys.game?.phase,                  sub: `${sys.game?.time_left}s · #${sys.game?.round_number}` },
          { label: "Online (global)", value: sys.online },
          { label: "Online (local)", value: sys.online_local },
        ]}
      />

      {/* Counts table */}
      <AdminCard title="Process counts">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.entries(sys.counts || {}).map(([k, v]) => (
            <div key={k} className="border border-white/8 rounded-sm px-2 py-1.5">
              <div className="text-[8px] tracking-[0.15em] uppercase text-white/30 truncate">{k}</div>
              <div className="font-mono-data text-sm mt-0.5">{v?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
