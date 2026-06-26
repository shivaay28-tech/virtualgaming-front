import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const PLAYER_URL = process.env.REACT_APP_PLAYER_URL || "http://localhost:3000";

export default function AdminLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await login(identifier, password);
    setLoading(false);
    if (r.ok) nav("/", { replace: true });
    else setErr(r.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950">
      <div className="w-full max-w-md border border-white/10 rounded-md p-8 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <Shield size={14} />
          <span className="text-[10px] tracking-[0.3em] uppercase">Operator Console</span>
        </div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--theme-primary)] mb-2">
          AI Teen Patti 20·20
        </div>
        <h1 className="font-display text-4xl text-white">Admin sign in</h1>
        <p className="text-white/50 text-sm mt-2">Operator access to the control room.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-white/50">Email or username</label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              data-testid="admin-login-identifier"
              placeholder="admin or admin@teenpatti.com"
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
              data-testid="admin-login-password"
              className="mt-1 w-full bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2.5 text-white outline-none focus:border-[color:var(--theme-primary)]"
              autoComplete="current-password"
            />
          </div>
          {err && (
            <div className="text-sm text-red-400" data-testid="admin-login-error">
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            data-testid="admin-login-submit"
            className="w-full py-3 rounded-sm bg-[color:var(--theme-primary)] text-black font-medium tracking-wide hover:bg-[color:var(--theme-primary-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/40 border-t border-white/10 pt-4">
          <a href={PLAYER_URL} className="text-[color:var(--theme-primary)] hover:underline">
            Player site
          </a>
        </div>
      </div>
    </div>
  );
}
