import React from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";

/**
 * Full-screen player status when auth/game cannot reach the backend or is loading.
 */
export function BackendStatusScreen({
  title = "Connecting…",
  message = "Please wait while we reach the server.",
  hint,
  maintenanceReason,
  loading = false,
  onRetry,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center felt-bg noise relative px-4">
      <div className="relative z-10 w-full max-w-md text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full border-2 border-[color:var(--theme-primary)]/40 bg-black/50 flex items-center justify-center">
          {loading ? (
            <Loader2 size={28} className="text-[color:var(--theme-primary)] animate-spin" />
          ) : (
            <WifiOff size={26} className="text-[color:var(--theme-primary)]" />
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-white">{title}</h1>
          <p className="mt-2 text-sm sm:text-base text-white/85 leading-relaxed">{message}</p>
          {maintenanceReason && (
            <p className="mt-3 text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-sm px-3 py-2">
              {maintenanceReason}
            </p>
          )}
          {hint && !maintenanceReason && (
            <p className="mt-3 text-xs text-white/55 font-mono-data">{hint}</p>
          )}
        </div>

        {onRetry && !loading && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[color:var(--theme-primary)] text-black font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
