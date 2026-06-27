import React, { useEffect, useState } from "react";
import {
  ArrowLeft, RefreshCw, LayoutDashboard, Users, Wallet, TrendingUp,
  Dices, ShieldCheck, MessageSquare, ClipboardList, Server,
  BarChart2, ChevronDown, ChevronRight, Menu, X, Circle,
} from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "../context/AuthContext";
import { AdminLiveProvider, useAdminLive } from "../context/AdminLiveContext";
import { LiveDashboard } from "../components/admin/LiveDashboard";
import { TableControls } from "../components/admin/TableControls";
import { UsersPanel } from "../components/admin/UsersPanel";
import { RoundsPanel } from "../components/admin/RoundsPanel";
import { TransactionsPanel } from "../components/admin/TransactionsPanel";
import { ChatModeration } from "../components/admin/ChatModeration";
import { AnalyticsCharts } from "../components/admin/AnalyticsCharts";
import { AuditLog, SystemHealth } from "../components/admin/AuditLog";
import { BetsPanel } from "../components/admin/BetsPanel";
import { PnlPanel } from "../components/admin/PnlPanel";

const PLAYER_URL = process.env.REACT_APP_PLAYER_URL || "http://localhost:3000";

/* ─── Sidebar navigation config ─────────────────────────────────────── */
const NAV_GROUPS = [
  {
    group: "Live",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Players & Money",
    items: [
      { key: "users",        label: "Users",         icon: Users },
      { key: "transactions", label: "Transactions",  icon: Wallet },
      { key: "pnl",          label: "PNL Report",    icon: TrendingUp },
    ],
  },
  {
    group: "Game",
    items: [
      { key: "bets",   label: "Bets",            icon: Dices },
      { key: "rounds", label: "Rounds & Fair",   icon: ShieldCheck },
      { key: "table",  label: "Table Controls",  icon: BarChart2 },
    ],
  },
  {
    group: "Reports",
    items: [
      { key: "analytics", label: "Analytics", icon: TrendingUp },
    ],
  },
  {
    group: "Moderation",
    items: [
      { key: "chat", label: "Chat", icon: MessageSquare },
    ],
  },
  {
    group: "System",
    items: [
      { key: "audit",  label: "Audit Log", icon: ClipboardList },
      { key: "system", label: "System",    icon: Server },
    ],
  },
];

/* ─── Sidebar ────────────────────────────────────────────────────────── */
function Sidebar({ tab, setTab, onClose }) {
  return (
    <nav className="admin-sidebar h-full overflow-y-auto py-2">
      {NAV_GROUPS.map((grp) => (
        <div key={grp.group} className="mb-1">
          <div className="px-3 py-1 text-[8px] tracking-[0.25em] uppercase text-white/25 font-medium">
            {grp.group}
          </div>
          {grp.items.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setTab(key); onClose?.(); }}
                data-testid={`admin-tab-${key}`}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors text-left",
                  "border-l-2",
                  active
                    ? "border-[color:var(--theme-primary)] bg-white/[0.04] text-white"
                    : "border-transparent text-white/50 hover:text-white hover:bg-white/[0.02]",
                ].join(" ")}
              >
                <Icon size={13} className="shrink-0" />
                <span className="truncate">{label}</span>
                {active && <ChevronRight size={10} className="ml-auto text-[color:var(--theme-primary)] shrink-0" />}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/* ─── AdminShell ─────────────────────────────────────────────────────── */
function AdminShell() {
  const { user, logout } = useAuth();
  const { data, connected, loading, refresh, refreshOverview } = useAdminLive();
  const [tab, setTab] = useState("dashboard");
  const [pnlDrillUser, setPnlDrillUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (tab === "dashboard") {
      refreshOverview();
    }
  }, [tab, refreshOverview]);

  const handleViewUserPnl = (row) => {
    setPnlDrillUser({ id: row.user_id, email: row.email, name: row.name });
    setTab("pnl");
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Admin access required.
      </div>
    );
  }

  /* Current tab label for breadcrumb */
  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  const currentLabel = allItems.find((i) => i.key === tab)?.label ?? tab;

  return (
    <div className="admin-shell">
      <Toaster theme="dark" position="top-center" richColors />

      {/* ── SLIM HEADER ───────────────────────────────────────────── */}
      <header className="admin-header">
        {/* Left: hamburger (mobile) + brand */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-1.5 rounded-sm border border-white/10 text-white/60 hover:text-white shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu size={14} />
          </button>

          {/* Back to player */}
          <button
            onClick={() => { window.location.href = PLAYER_URL; }}
            data-testid="admin-back"
            className="p-1.5 rounded-sm border border-white/10 text-white/50 hover:text-white hidden sm:block"
            title="Back to player site"
          >
            <ArrowLeft size={13} />
          </button>

          <div className="min-w-0">
            <div className="text-[8px] tracking-[0.3em] uppercase text-red-400/80">
              Admin Console
            </div>
            <div className="font-display text-sm leading-none text-white truncate">
              AI Teen Patti 20·20
            </div>
          </div>
        </div>

        {/* Center: status chips */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          <span
            data-testid="admin-ws-status"
            className={`admin-status-pill ${connected ? "admin-status-pill--ok" : "admin-status-pill--warn"}`}
          >
            <Circle size={6} className="fill-current" />
            {connected ? "Live" : "Offline"}
          </span>
          {data?.is_leader != null && (
            <span className={`admin-status-pill ${data.is_leader ? "admin-status-pill--ok" : "admin-status-pill--neutral"}`}>
              {data.is_leader ? "Leader" : "Follower"}
            </span>
          )}
          {data?.redis_enabled && (
            <span className={`admin-status-pill ${data.redis_ok ? "admin-status-pill--ok" : "admin-status-pill--err"}`}>
              Redis {data.redis_ok ? "OK" : "↓"}
            </span>
          )}
          {data?.table_config?.paused && (
            <span className="admin-status-pill admin-status-pill--warn">⏸ Paused</span>
          )}
          {data?.table?.session_date && (
            <span className="text-[9px] text-white/30 font-mono-data">
              {data.table.session_date}
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {data?.dealer?.name && (
            <span className="hidden lg:block text-[9px] text-white/30">
              Dealer: {data.dealer.name}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            data-testid="admin-refresh"
            className="px-2 py-1 rounded-sm border border-white/10 text-[10px] flex items-center gap-1.5 hover:bg-white/[0.04] transition-colors"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={logout}
            data-testid="admin-logout"
            className="px-2 py-1 rounded-sm border border-white/10 text-[10px] hover:bg-white/[0.04] transition-colors text-white/60"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── BODY: sidebar + content ────────────────────────────── */}
      <div className="admin-body">

        {/* Desktop sidebar */}
        <aside className="admin-sidebar-wrapper hidden lg:block">
          <Sidebar tab={tab} setTab={setTab} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/70"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-52 bg-zinc-900 border-r border-white/10 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <span className="text-[9px] tracking-[0.25em] uppercase text-white/35">Menu</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-white/50 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <Sidebar tab={tab} setTab={setTab} onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="admin-main">
          {/* Context breadcrumb */}
          <div className="admin-breadcrumb">
            <span className="text-white/30">Control Room</span>
            <ChevronDown size={10} className="rotate-[-90deg] text-white/20" />
            <span className="text-white/60">{currentLabel}</span>
            {tab === "pnl" && pnlDrillUser && (
              <>
                <ChevronDown size={10} className="rotate-[-90deg] text-white/20" />
                <span className="text-[color:var(--theme-primary)]/80 truncate max-w-[200px]">
                  {pnlDrillUser.email}
                </span>
              </>
            )}
          </div>

          {/* Panel content */}
          <div className="admin-panel">
            {tab === "dashboard"    && <LiveDashboard data={data} onRefresh={refresh} connected={connected} />}
            {tab === "table"        && <TableControls data={data} onChange={refresh} />}
            {tab === "users"        && <UsersPanel startingBalance={data?.table_config?.starting_balance ?? 10000} onUserCreated={refresh} />}
            {tab === "bets"         && <BetsPanel />}
            {tab === "rounds"       && <RoundsPanel />}
            {tab === "transactions" && <TransactionsPanel />}
            {tab === "pnl"          && <PnlPanel key={pnlDrillUser?.id || "default"} initialUser={pnlDrillUser} />}
            {tab === "chat"         && <ChatModeration />}
            {tab === "analytics"    && <AnalyticsCharts onViewUserPnl={handleViewUserPnl} />}
            {tab === "audit"        && <AuditLog />}
            {tab === "system"       && <SystemHealth />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <AdminLiveProvider>
      <AdminShell />
    </AdminLiveProvider>
  );
}
