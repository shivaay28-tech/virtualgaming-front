import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const inputCls =
  "mt-1 w-full bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2.5 text-white outline-none focus:border-[color:var(--theme-primary)]";

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const nav = useNavigate();
  const forced = !!user?.must_change_password;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (newPassword.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    if (!/\d/.test(newPassword)) {
      setErr("New password must contain at least one digit.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setErr("New password must differ from your current password.");
      return;
    }
    setLoading(true);
    const r = await changePassword(currentPassword, newPassword);
    setLoading(false);
    if (r.ok) nav("/", { replace: true });
    else setErr(r.error);
  };

  return (
    <div className="min-h-screen felt-bg noise text-white" data-testid="change-password-page">
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {!forced && (
            <Link
              to="/"
              className="p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
              data-testid="change-password-back"
              aria-label="Back to game"
            >
              <ArrowLeft size={16} />
            </Link>
          )}
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--theme-primary)]">
              Account
            </div>
            <div className="font-display text-lg leading-none mt-0.5 flex items-center gap-2">
              <KeyRound size={18} className="text-[color:var(--theme-primary)]" />
              Change password
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 sm:px-8 py-8">
        {forced && (
          <p className="text-sm text-white/60 mb-6 leading-relaxed" data-testid="change-password-forced-notice">
            Your account was created by an operator. Set a new password before continuing to the game.
          </p>
        )}

        <form onSubmit={submit} className="space-y-4 bg-zinc-950/90 border border-white/10 rounded-md p-6">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-white/50">Current password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="change-password-current"
              className={inputCls}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-white/50">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="change-password-new"
              className={inputCls}
              autoComplete="new-password"
            />
            <p className="text-[11px] text-white/40 mt-1">Min 8 characters, at least one digit.</p>
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-white/50">Confirm new password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="change-password-confirm"
              className={inputCls}
              autoComplete="new-password"
            />
          </div>
          {err && (
            <div className="text-sm text-red-400" data-testid="change-password-error">
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            data-testid="change-password-submit"
            className="w-full py-3 rounded-sm bg-[color:var(--theme-primary)] text-black font-medium tracking-wide hover:bg-[color:var(--theme-primary-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? "Saving…" : forced ? "Set password & continue" : "Update password"}
          </button>
        </form>
      </main>
    </div>
  );
}
