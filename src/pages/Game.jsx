import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Wallet, KeyRound, ChevronDown, Menu, X } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { sayEvent, isDealerMuted, setDealerMuted, unlockAudio } from "../lib/tts";
import { BetControls } from "../components/BetControls";
import { BettingMarket } from "../components/BettingMarket";
import { HistoryStrip } from "../components/HistoryStrip";
import { DealerPanel } from "../components/DealerPanel";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { ProvablyFairModal } from "../components/ProvablyFairModal";
import { StatsPanel } from "../components/StatsPanel";
import { RecentBetsPanel } from "../components/RecentBetsPanel";
import { ChatPanel } from "../components/ChatPanel";
import { CasinoTable } from "../components/CasinoTable";
import { BackendStatusScreen } from "../components/BackendStatusScreen";
import { toast, Toaster } from "sonner";

const MARKETS = [
  { id: "player_a", label: "Player A", subLabel: "Main Bet" },
  { id: "player_b", label: "Player B", subLabel: "Main Bet" },
  { id: "pair_plus_a", label: "Pair Plus A", subLabel: "Pair or Better" },
  { id: "pair_plus_b", label: "Pair Plus B", subLabel: "Pair or Better" },
];

/* ─── MobileSection ──────────────────────────────────────────────────── */
/** Collapsible support panel shown only on mobile/tablet (hidden on lg+) */
function MobileSection({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mobile-section lg:hidden">
      <button
        type="button"
        className="mobile-section__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="mobile-section__title">
          {icon && <span>{icon}</span>}
          {title}
        </span>
        <ChevronDown
          size={14}
          className={`mobile-section__chevron ${open ? "mobile-section__chevron--open" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="mobile-section__body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Game ───────────────────────────────────────────────────────────── */
export default function Game() {
  const { user, logout, setBalance, refresh } = useAuth();
  const { state, volumes, online, mergeMyBet, gameStatus, maintenanceReason, retryGame } = useGame();
  const nav = useNavigate();
  const [betAmount, setBetAmount] = useState(100);
  const [muted, setMuted] = useState(isDealerMuted());
  const [speaking, setSpeaking] = useState(false);
  const prevPhase = useRef(null);
  const prevRoundId = useRef(null);
  const [winnerLine, setWinnerLine] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refresh wallet on settle
  useEffect(() => {
    if (!state) return;
    const phase = state.phase;
    const roundChanged = prevRoundId.current && prevRoundId.current !== state.round_id;
    const lang = state.table?.language || "en";
    const dealerId = state.table?.dealer?.id || "ava";
    if (phase !== prevPhase.current || roundChanged) {
      setSpeaking(true);
      const done = () => setTimeout(() => setSpeaking(false), 2200);
      if (phase === "betting") {
        sayEvent("betting", lang, null, dealerId);
        setWinnerLine("");
        done();
      } else if (phase === "locked") {
        sayEvent("locked", lang, null, dealerId);
        done();
      } else if (phase === "dealing") {
        sayEvent("dealing", lang, null, dealerId);
        done();
      } else if (phase === "settled" && state.outcome) {
        const o = state.outcome;
        if (o.winner === "TIE") {
          sayEvent("tie", lang, null, dealerId);
          setWinnerLine("It's a tie. Main bets refunded.");
        } else if (o.winner === "A") {
          sayEvent("winner_a", lang, o.a_hand_name, dealerId);
          setWinnerLine(`Player A wins with ${o.a_hand_name}.`);
        } else {
          sayEvent("winner_b", lang, o.b_hand_name, dealerId);
          setWinnerLine(`Player B wins with ${o.b_hand_name}.`);
        }
        done();
        refresh().catch(() => {});
      } else {
        setSpeaking(false);
      }
      prevPhase.current = phase;
      prevRoundId.current = state.round_id;
    }
  }, [state, refresh]);

  const placeBet = useCallback(
    async (marketId) => {
      if (!user) {
        nav("/login");
        return;
      }
      if (!state || state.phase !== "betting") {
        toast.error("Betting is closed");
        return;
      }
      if (state.table?.paused) {
        toast.error("Table is paused");
        return;
      }
      // Validate amount before API call
      const minBet = state.table?.min_bet ?? 10;
      const maxBet = state.table?.max_bet ?? 50000;
      const amount = parseInt(betAmount, 10);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Enter a valid bet amount");
        return;
      }
      if (amount < minBet) {
        toast.error(`Minimum bet is ₹${minBet.toLocaleString()}`);
        return;
      }
      if (amount > maxBet) {
        toast.error(`Maximum bet is ₹${maxBet.toLocaleString()}`);
        return;
      }
      if ((user.balance || 0) < amount) {
        toast.error("Insufficient balance");
        return;
      }
      try {
        const { data } = await api.post("/game/bet", { market: marketId, amount });
        setBalance(data.balance);
        mergeMyBet(data.bet);
        toast.success(`Bet ₹${amount.toLocaleString()} on ${marketLabel(marketId)}`);
      } catch (e) {
        toast.error(formatApiError(e.response?.data?.detail) || "Bet failed");
      }
    },
    [user, state, betAmount, nav, setBalance, mergeMyBet]
  );

  const myBetTotals = useMemo(() => {
    const totals = { player_a: 0, player_b: 0, pair_plus_a: 0, pair_plus_b: 0 };
    (state?.my_bets || []).forEach((b) => {
      totals[b.market] = (totals[b.market] || 0) + b.amount;
    });
    return totals;
  }, [state]);

  const myBetCounts = useMemo(() => {
    const counts = { player_a: 0, player_b: 0, pair_plus_a: 0, pair_plus_b: 0 };
    (state?.my_bets || []).forEach((b) => {
      counts[b.market] = (counts[b.market] || 0) + 1;
    });
    return counts;
  }, [state]);

  const winnerMarkets = useMemo(() => {
    if (state?.phase !== "settled" || !state.outcome) return null;
    const o = state.outcome;
    return {
      player_a: o.winner === "A",
      player_b: o.winner === "B",
      pair_plus_a: o.pair_plus_a,
      pair_plus_b: o.pair_plus_b,
    };
  }, [state]);

  const handleMute = () => {
    const next = !muted;
    setMuted(next);
    setDealerMuted(next);
    if (!next) unlockAudio();
  };

  const onLogout = async () => {
    await logout();
    nav("/login");
  };

  if (!state) {
    if (gameStatus === "unavailable") {
      return (
        <BackendStatusScreen
          title="Reconnecting to table…"
          message="Could not load the live table. The server may be restarting."
          hint="Your session is still valid — try again in a few seconds."
          maintenanceReason={maintenanceReason || undefined}
          onRetry={retryGame}
        />
      );
    }
    return (
      <BackendStatusScreen
        title="Loading the table…"
        message="Setting up your seat at the live table."
        loading
      />
    );
  }

  const phase = state.phase;
  const lang = state.table?.language || "en";
  const paused = state.table?.paused;

  const isBettingOpen = phase === "betting" && !paused;
  const minBet = state.table?.min_bet ?? 10;
  const maxBet = state.table?.max_bet ?? 50000;
  const balance = user?.balance ?? 0;

  // Derived amount validation (mirrors BetControls internals, used for canBet)
  const amountError = (() => {
    const n = parseInt(betAmount, 10);
    if (!Number.isFinite(n) || n <= 0) return "invalid";
    if (n < minBet) return "below_min";
    if (n > maxBet) return "above_max";
    if (n > balance) return "insufficient";
    return null;
  })();
  const canBet = isBettingOpen && !amountError;

  const disabledReason = paused ? "Paused" : phase !== "betting" ? "Closed" : null;

  return (
    <div
      className="min-h-screen relative felt-bg noise text-white"
      onClick={() => unlockAudio()}
    >
      <Toaster theme="dark" position="top-center" richColors />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 flex items-center justify-between gap-3 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            {/* Mobile: short brand + phase pill */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="text-[10px] tracking-[0.25em] uppercase text-[color:var(--theme-primary)] font-mono-data whitespace-nowrap">
                Teen Patti
              </div>
              <span className="phase-pill">{phase}</span>
            </div>
            {/* Desktop: full brand */}
            <div className="hidden lg:block">
              <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--theme-primary)]">
                AI Teen Patti 20·20
              </div>
              <div className="font-display text-lg leading-none mt-0.5">Live Casino Studio</div>
            </div>
          </div>
        </div>

        {/* Center: ThemeSwitcher — desktop only */}
        <div className="hidden lg:flex">
          <ThemeSwitcher />
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Online count — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-white/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono-data text-white/70" data-testid="online-count">
              {online} live
            </span>
          </div>

          {/* Provably Fair — desktop only */}
          <div className="hidden sm:block">
            <ProvablyFairModal state={state} />
          </div>

          {/* Wallet — always visible */}
          <button
            type="button"
            onClick={() => nav("/statement")}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-sm border border-white/10 bg-white/[0.03] hover:border-[color:var(--theme-primary)]/40 hover:bg-white/[0.06] transition-colors cursor-pointer"
            data-testid="wallet-display"
            title="View account statement"
          >
            <Wallet size={13} className="text-[color:var(--theme-primary)]" />
            {/* "Chips" label hidden on mobile */}
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-white/50">
              Chips
            </span>
            <span className="font-mono-data text-sm sm:text-base" data-testid="wallet-balance">
              ₹{(user?.balance ?? 0).toLocaleString()}
            </span>
          </button>

          {/* Username — hidden on small screens */}
          <div className="hidden md:block text-xs text-white/70" data-testid="user-name">
            {user?.name}
          </div>

          {/* Desktop action icons */}
          <button
            type="button"
            onClick={() => nav("/change-password")}
            className="hidden sm:block p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
            data-testid="change-password-link"
            title="Change password"
            aria-label="Change password"
          >
            <KeyRound size={14} />
          </button>
          <button
            onClick={onLogout}
            data-testid="logout-btn"
            className="hidden sm:block p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
            aria-label="Logout"
          >
            <LogOut size={14} />
          </button>

          {/* Mobile hamburger — reveals theme/actions */}
          <button
            type="button"
            className="sm:hidden p-2 rounded-sm border border-white/10 text-white/60 hover:text-white"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </header>

      {/* ── MOBILE OVERFLOW MENU ────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden overflow-hidden z-20 bg-black/80 backdrop-blur-xl border-b border-white/10"
          >
            <div className="px-4 py-3 flex flex-wrap items-center gap-3">
              <ThemeSwitcher />
              <ProvablyFairModal state={state} />
              <button
                type="button"
                onClick={() => { nav("/change-password"); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/10 text-white/60 hover:text-white text-xs"
              >
                <KeyRound size={13} /> Password
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/10 text-white/60 hover:text-white text-xs"
              >
                <LogOut size={13} /> Logout
              </button>
              {user?.name && (
                <span className="text-xs text-white/50 ml-auto">{user.name}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAUSE BANNER ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-900/60 border-y border-red-500/40 px-4 py-2 text-center text-sm pulse-warn z-20 relative"
            data-testid="paused-banner"
          >
            Table paused by admin
            {state.table?.pause_reason ? ` — ${state.table.pause_reason}` : ""}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN LAYOUT
          Mobile:  single column, game-first order
          Desktop: 12-col grid with left/center/right rails
      ══════════════════════════════════════════════════════════════════ */}
      <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6
                       flex flex-col gap-4
                       lg:grid lg:grid-cols-12 lg:gap-6
                       pb-28 lg:pb-6">

        {/* ── LEFT RAIL (desktop only — Dealer, Round, Chat) ─────────────── */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <DealerPanel
            phase={phase}
            dealer={state.table?.dealer}
            lang={lang}
            muted={muted}
            onToggleMute={handleMute}
            lastWinnerLine={winnerLine}
            speaking={speaking}
          />
          <RoundCard state={state} phase={phase} />
          <ChatPanel />
        </aside>

        {/* ── CENTER (always first on mobile) ────────────────────────────── */}
        <section className="lg:col-span-6 flex flex-col gap-4">
          {/* Casino Table */}
          <CasinoTable state={state} online={online} speaking={speaking} />

          {/* ── DESKTOP BET CONTROLS ─── shown above markets on lg+ */}
          <div className="hidden lg:block">
            <BetControls
              amount={betAmount}
              onAmountChange={setBetAmount}
              minBet={minBet}
              maxBet={maxBet}
              balance={balance}
              disabled={!isBettingOpen}
            />
          </div>

          {/* Betting Markets */}
          <div
            className="grid grid-cols-2 gap-2 sm:gap-3"
            data-testid="betting-markets"
          >
            {MARKETS.map((m) => {
              const vol = volumes[m.id] || { amount: 0, count: 0 };
              return (
                <BettingMarketWithVolume
                  key={m.id}
                  id={m.id}
                  label={m.label}
                  subLabel={m.subLabel}
                  odds={state.odds[m.id]}
                  total={myBetTotals[m.id] || 0}
                  betCount={myBetCounts[m.id] || 0}
                  liveVolume={vol}
                  disabled={!isBettingOpen}
                  disabledReason={disabledReason}
                  onBet={() => placeBet(m.id)}
                  winner={winnerMarkets ? winnerMarkets[m.id] : undefined}
                  selectedAmount={betAmount}
                  canBet={canBet}
                />
              );
            })}
          </div>
        </section>

        {/* ── RIGHT RAIL (desktop only — Stats, Recent Bets, How-to) ──────── */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-3">
              Session statistics
            </div>
            <StatsPanel sessionSummary={state.session_summary} />
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-3">
              Recent bets
            </div>
            <RecentBetsPanel
              refreshKey={`${state.round_id}-${state.phase}-${state.my_bets?.length ?? 0}`}
            />
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 text-xs text-white/50 leading-relaxed">
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2">
              How to play
            </div>
            Place chips on Player A, Player B, or either Pair Plus during the betting window.
            Cards are dealt automatically. Live multiplayer volume shows what others are betting.
            All rounds use cryptographic provably-fair RNG.
          </div>
        </aside>

        {/* ── MOBILE SUPPORT PANELS (hidden on desktop) ──────────────────── */}
        {/* Recent Bets — default open */}
        <MobileSection title="Recent Bets" defaultOpen={true}>
          <RecentBetsPanel
            refreshKey={`${state.round_id}-${state.phase}-${state.my_bets?.length ?? 0}`}
          />
        </MobileSection>

        {/* Round History — default open */}
        <MobileSection title="Round History" defaultOpen={true}>
          <RoundCard state={state} phase={phase} mobile />
        </MobileSection>

        {/* Dealer — default collapsed */}
        <MobileSection title="Dealer" defaultOpen={false}>
          <DealerPanel
            phase={phase}
            dealer={state.table?.dealer}
            lang={lang}
            muted={muted}
            onToggleMute={handleMute}
            lastWinnerLine={winnerLine}
            speaking={speaking}
            compact
          />
        </MobileSection>

        {/* Stats — default collapsed */}
        <MobileSection title="Session Statistics" defaultOpen={false}>
          <StatsPanel sessionSummary={state.session_summary} />
        </MobileSection>

        {/* Chat — default collapsed */}
        <MobileSection title="Table Chat" defaultOpen={false}>
          {/* ChatPanel manages its own open/close state; wrap in div to remove double border */}
          <div className="-mx-3.5 -mb-3">
            <ChatPanel />
          </div>
        </MobileSection>

        {/* How to play — default collapsed */}
        <MobileSection title="How to Play" defaultOpen={false}>
          <p className="text-xs text-white/50 leading-relaxed">
            Place chips on Player A, Player B, or either Pair Plus during the betting
            window. Cards are dealt automatically. Live multiplayer volume shows what
            others are betting. All rounds use cryptographic provably-fair RNG.
          </p>
        </MobileSection>
      </main>

      {/* ── STICKY MOBILE BET CONTROLS ───────────────────────────────────── */}
      <div className="chip-tray-mobile lg:hidden" aria-label="Bet controls">
        <BetControls
          amount={betAmount}
          onAmountChange={setBetAmount}
          minBet={minBet}
          maxBet={maxBet}
          balance={balance}
          disabled={!isBettingOpen}
          compact
        />
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function RoundCard({ state, phase, mobile = false }) {
  return (
    <div
      className={
        mobile
          ? ""
          : "rounded-md border border-white/10 bg-white/[0.02] p-4"
      }
    >
      {!mobile && (
        <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2">Round</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono-data text-2xl" data-testid="round-number">
            #{state.round_number}
          </div>
          {state.session_date && (
            <div
              className="text-[10px] text-white/40 mt-1 font-mono-data"
              data-testid="session-date"
            >
              {new Date(`${state.session_date}T12:00:00`).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </div>
        <div className="text-xs text-white/40">{phase}</div>
      </div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 mt-4 mb-1">
        Last {state.table?.history_strip_limit ?? state.history?.length ?? 20} results
      </div>
      <HistoryStrip history={state.history} />
    </div>
  );
}

function BettingMarketWithVolume({ id, liveVolume, ...props }) {
  return (
    <div>
      <BettingMarket id={id} {...props} />
      {(liveVolume?.count > 0 || liveVolume?.amount > 0) && (
        <div
          className="mt-1 px-1 text-[10px] text-white/35 font-mono-data pointer-events-none"
          data-testid={`bet-volume-${id}`}
        >
          Table · {liveVolume.count} bets · ₹{liveVolume.amount.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function marketLabel(id) {
  return (
    {
      player_a: "Player A",
      player_b: "Player B",
      pair_plus_a: "Pair Plus A",
      pair_plus_b: "Pair Plus B",
    }[id] || id
  );
}
