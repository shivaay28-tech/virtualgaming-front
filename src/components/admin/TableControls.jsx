import React, { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../../lib/api";
import { VirtualDealer } from "../VirtualDealer";
import { Card, Field, inputCls } from "./shared";

export function TableControls({ data, onChange }) {
  const cfg = data?.table_config;
  const dealers = data?.dealers || [];
  const languages = data?.languages || [];
  const [limits, setLimits] = useState({ min_bet: 10, max_bet: 50000 });
  const [session, setSession] = useState({ history_strip_limit: 20, session_timezone: "Asia/Kolkata" });
  const [startingBalance, setStartingBalance] = useState(10000);
  const [demoBalance, setDemoBalance] = useState(100000);
  const [pauseReason, setPauseReason] = useState("");

  useEffect(() => {
    if (cfg) {
      setLimits({ min_bet: cfg.min_bet, max_bet: cfg.max_bet });
      setSession({
        history_strip_limit: cfg.history_strip_limit ?? 20,
        session_timezone: cfg.session_timezone ?? "Asia/Kolkata",
      });
      setStartingBalance(cfg.starting_balance ?? 10000);
      setDemoBalance(cfg.demo_balance ?? 100000);
    }
  }, [cfg]);

  if (!cfg) return <div className="text-white/50">Loading…</div>;

  const togglePause = async () => {
    try {
      await api.post("/admin/table/pause", { paused: !cfg.paused, reason: cfg.paused ? "" : pauseReason });
      toast.success(cfg.paused ? "Table resumed" : "Table paused");
      onChange();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const saveLimits = async () => {
    try {
      await api.post("/admin/table/limits", limits);
      toast.success("Limits updated");
      onChange();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const setDealer = async (id) => {
    try {
      await api.post("/admin/table/dealer", { dealer_id: id });
      toast.success("Dealer updated");
      onChange();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const setLanguage = async (code) => {
    try {
      await api.post("/admin/table/language", { language: code });
      toast.success("Language updated");
      onChange();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const saveSession = async () => {
    try {
      await api.post("/admin/table/session", session);
      toast.success("Session settings updated");
      onChange();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const saveStartingBalance = async () => {
    try {
      await api.post("/admin/table/starting-balance", { starting_balance: Number(startingBalance) });
      toast.success("Starting balance updated");
      onChange();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  const saveDemoBalance = async () => {
    try {
      await api.post("/admin/table/demo-balance", { demo_balance: Number(demoBalance) });
      toast.success("Demo session balance updated");
      onChange();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card title="Table state">
        <div className="flex flex-wrap items-center gap-4">
          <div className={`px-3 py-1.5 rounded-sm text-xs font-mono-data ${cfg.paused ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`} data-testid="table-state-badge">
            {cfg.paused ? "PAUSED" : "RUNNING"}
          </div>
          {cfg.paused && cfg.pause_reason && <div className="text-xs text-white/60">— {cfg.pause_reason}</div>}
          {!cfg.paused && (
            <input
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Pause reason (optional)"
              className={`${inputCls} max-w-xs`}
            />
          )}
          <button
            onClick={togglePause}
            data-testid="admin-toggle-pause"
            className={`ml-auto px-4 py-2 rounded-sm text-sm flex items-center gap-2 ${cfg.paused ? "bg-emerald-500 text-black" : "bg-red-500 text-white"}`}
          >
            {cfg.paused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause table</>}
          </button>
        </div>
      </Card>

      <Card title="Bet limits">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Field label="Min bet (₹)">
            <input type="number" min={1} value={limits.min_bet} onChange={(e) => setLimits({ ...limits, min_bet: Number(e.target.value) })} data-testid="admin-min-bet" className={inputCls} />
          </Field>
          <Field label="Max bet (₹)">
            <input type="number" min={1} value={limits.max_bet} onChange={(e) => setLimits({ ...limits, max_bet: Number(e.target.value) })} data-testid="admin-max-bet" className={inputCls} />
          </Field>
        </div>
        <button onClick={saveLimits} data-testid="admin-save-limits" className="mt-4 px-4 py-2 rounded-sm bg-[color:var(--theme-primary)] text-black text-sm">Save limits</button>
      </Card>

      <Card title="Dealer">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {dealers.map((d) => (
            <button
              key={d.id}
              onClick={() => setDealer(d.id)}
              data-testid={`admin-dealer-${d.id}`}
              className={`rounded-sm border p-4 text-left transition-colors ${cfg.dealer_id === d.id ? "border-[color:var(--theme-primary)] bg-white/[0.04]" : "border-white/10 hover:border-white/30"}`}
            >
              <VirtualDealer dealer={d} phase="betting" size="table" />
              <div className="font-display text-xl mt-2">{d.name}</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">{d.title} · {d.voice}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Dealer language">
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              data-testid={`admin-lang-${l.code}`}
              className={`px-4 py-2 rounded-sm border text-sm ${cfg.language === l.code ? "border-[color:var(--theme-primary)] text-[color:var(--theme-primary)] bg-white/[0.04]" : "border-white/10 text-white/60 hover:text-white"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Session & history">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <Field label="History strip limit (results)">
            <input
              type="number"
              min={1}
              max={200}
              value={session.history_strip_limit}
              onChange={(e) => setSession({ ...session, history_strip_limit: Number(e.target.value) })}
              data-testid="admin-history-limit"
              className={inputCls}
            />
          </Field>
          <Field label="Session timezone">
            <input
              value={session.session_timezone}
              onChange={(e) => setSession({ ...session, session_timezone: e.target.value })}
              placeholder="Asia/Kolkata"
              data-testid="admin-session-timezone"
              className={inputCls}
            />
          </Field>
        </div>
        <p className="text-xs text-white/40 mt-2">Round numbers reset daily at midnight in this timezone.</p>
        <button onClick={saveSession} data-testid="admin-save-session" className="mt-4 px-4 py-2 rounded-sm bg-[color:var(--theme-primary)] text-black text-sm">Save session settings</button>
      </Card>

      <Card title="New user defaults">
        <div className="max-w-xs">
          <Field label="Starting balance (₹)">
            <input
              type="number"
              min={0}
              max={1000000}
              value={startingBalance}
              onChange={(e) => setStartingBalance(Number(e.target.value))}
              data-testid="admin-starting-balance"
              className={inputCls}
            />
          </Field>
        </div>
        <p className="text-xs text-white/40 mt-2">Applied to new self-registrations and admin-created users only.</p>
        <button onClick={saveStartingBalance} data-testid="admin-save-starting-balance" className="mt-4 px-4 py-2 rounded-sm bg-[color:var(--theme-primary)] text-black text-sm">Save starting balance</button>
      </Card>

      <Card title="Demo session">
        <div className="max-w-xs">
          <Field label="Demo session balance (₹)">
            <input
              type="number"
              min={0}
              max={1000000}
              value={demoBalance}
              onChange={(e) => setDemoBalance(Number(e.target.value))}
              data-testid="admin-demo-balance"
              className={inputCls}
            />
          </Field>
        </div>
        <p className="text-xs text-white/40 mt-2">
          Reset balance each time a visitor clicks Try demo. Set high enough to test max bets and multiple rounds.
        </p>
        <button onClick={saveDemoBalance} data-testid="admin-save-demo-balance" className="mt-4 px-4 py-2 rounded-sm bg-[color:var(--theme-primary)] text-black text-sm">Save demo balance</button>
      </Card>
    </div>
  );
}
