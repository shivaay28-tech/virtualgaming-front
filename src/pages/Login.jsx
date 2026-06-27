import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { fetchPlatformPublic } from "../lib/platform";

export default function Login({ redirectTo = "/", title = "Welcome back", subtitle = "Sign in to claim your seat at the table." }) {
  const { login, loginDemo } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoBalance, setDemoBalance] = useState(null);
  const [tablePaused, setTablePaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchPlatformPublic({ fresh: true })
        .then((p) => {
          if (!alive) return;
          setDemoEnabled(!!p.demo_enabled);
          if (typeof p.demo_balance === "number") setDemoBalance(p.demo_balance);
          setTablePaused(!!p.table_paused);
          setPauseReason(p.pause_reason || "");
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await login(identifier, password);
    setLoading(false);
    if (r.ok) {
      const dest = r.user?.must_change_password ? "/change-password" : redirectTo;
      nav(dest, { replace: true });
    } else setErr(r.error);
  };

  const tryDemo = async () => {
    setErr("");
    setDemoLoading(true);
    const r = await loginDemo();
    setDemoLoading(false);
    if (r.ok) nav(redirectTo, { replace: true });
    else setErr(r.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 felt-bg relative noise">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <div className="w-full max-w-md bg-zinc-950/90 border border-white/10 rounded-md p-8 backdrop-blur-xl">
        <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--theme-primary)] mb-2">
          AI Teen Patti 20·20
        </div>
        <h1 className="font-display text-4xl text-white">{title}</h1>
        <p className="text-white/50 text-sm mt-2">{subtitle}</p>

        {tablePaused && (
          <div
            className="mt-4 text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-sm px-3 py-2"
            data-testid="login-maintenance-banner"
          >
            Table is paused for maintenance
            {pauseReason ? ` — ${pauseReason}` : ""}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-white/50">Email or username</label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              data-testid="login-identifier"
              className="mt-1 w-full bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2.5 text-white outline-none focus:border-[color:var(--theme-primary)]"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-white/50">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
              className="mt-1 w-full bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2.5 text-white outline-none focus:border-[color:var(--theme-primary)]"
              autoComplete="current-password"
            />
          </div>
          {err && (
            <div className="text-sm text-red-400" data-testid="login-error">
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || demoLoading}
            data-testid="login-submit"
            className="w-full py-3 rounded-sm bg-[color:var(--theme-primary)] text-black font-medium tracking-wide hover:bg-[color:var(--theme-primary-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {demoEnabled && (
          <>
            <button
              type="button"
              onClick={tryDemo}
              disabled={loading || demoLoading}
              data-testid="login-demo"
              className="w-full mt-3 py-3 rounded-sm border border-[color:var(--theme-primary)]/40 text-[color:var(--theme-primary)] text-sm tracking-wide hover:bg-[color:var(--theme-primary)]/10 transition-colors disabled:opacity-50"
            >
              {demoLoading ? "Starting demo…" : "Try demo"}
            </button>
            {demoBalance != null && (
              <p className="mt-2 text-center text-[11px] text-white/40" data-testid="login-demo-balance-hint">
                Demo chips: ₹{demoBalance.toLocaleString("en-IN")}
              </p>
            )}
          </>
        )}

        <div className="mt-6 text-[11px] text-white/30 leading-relaxed border-t border-white/10 pt-4 text-center">
          Accounts are created by your operator. Contact support if you need access.
        </div>
      </div>
    </div>
  );
}
