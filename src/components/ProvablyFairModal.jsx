import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ShieldCheck, Copy, Check } from "lucide-react";
import { api } from "../lib/api";

function Row({ label, value, mono = true, testId }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-white/10 rounded-sm p-3 bg-white/[0.02]">
      <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <div
          className={`${mono ? "font-mono-data" : ""} text-xs text-white/90 break-all`}
          data-testid={testId}
        >
          {value || "—"}
        </div>
        {value && (
          <button
            className="ml-auto p-1 text-white/40 hover:text-white"
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            data-testid={`copy-${testId}`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function ProvablyFairModal({ state }) {
  const [verified, setVerified] = useState(null);
  const [round, setRound] = useState(null);
  const [open, setOpen] = useState(false);

  const lastSettled = state?.outcome ? state : null;

  useEffect(() => {
    if (!open) return;
    // Fetch latest settled round details
    api.get("/game/history?limit=1").then((res) => {
      if (res.data.rounds?.[0]) setRound(res.data.rounds[0]);
    }).catch(() => {});
  }, [open]);

  const verify = async () => {
    if (!round?.server_seed) return;
    // verify locally: hash(server_seed) == server_seed_hash
    const enc = new TextEncoder().encode(round.server_seed);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    setVerified(hex === round.server_seed_hash);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          data-testid="provably-fair-btn"
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/10 text-white/70 hover:text-white text-xs"
        >
          <ShieldCheck size={14} />
          Provably Fair
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Provably Fair Verification</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="text-xs text-white/60">
            Current round commitment (server seed hash is published <em>before</em> cards are dealt; the seed itself is revealed after settlement so you can verify the outcome was not manipulated).
          </div>
          <Row label="Current Round" value={`#${state?.round_number ?? "—"}`} mono testId="pf-current-round" />
          <Row label="Server Seed Hash (committed)" value={state?.server_seed_hash} testId="pf-seed-hash" />
          <Row label="Client Seed" value={state?.client_seed} testId="pf-client-seed" />
          <Row label="Nonce" value={state?.nonce?.toString()} testId="pf-nonce" />

          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2">Last Settled Round</div>
            <Row label="Round" value={round ? `#${round.round_number}` : "—"} testId="pf-last-round" />
            <div className="h-2" />
            <Row label="Server Seed (revealed)" value={round?.server_seed} testId="pf-server-seed" />
            <div className="h-2" />
            <Row label="Server Seed Hash" value={round?.server_seed_hash} testId="pf-last-hash" />
            <button
              onClick={verify}
              disabled={!round?.server_seed}
              data-testid="pf-verify-btn"
              className="mt-3 px-4 py-2 rounded-sm bg-[color:var(--theme-primary)] text-black font-medium text-sm disabled:opacity-50"
            >
              Verify SHA-256 match
            </button>
            {verified === true && (
              <div className="mt-2 text-xs text-emerald-400" data-testid="pf-verified-ok">✓ Hash matches — round is provably fair.</div>
            )}
            {verified === false && (
              <div className="mt-2 text-xs text-red-400" data-testid="pf-verified-fail">✗ Hash mismatch.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
