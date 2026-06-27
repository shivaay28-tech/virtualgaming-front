import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "./Timer";
import {
  REVEAL_ORDER,
  revealedCount,
  revealedCountFromVideoTime,
  videoTimeForPhase,
  cardRevealSchedule,
} from "../lib/revealTiming";
import { mediaUrl } from "../lib/media";

const TABLE_VIDEO = mediaUrl("/videos/TEENPATTI.mp4");

const SUIT_GLYPH = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLOR = { S: "#111", H: "#c41e3a", D: "#c41e3a", C: "#111" };
const RANK_LABEL = { T: "10", J: "J", Q: "Q", K: "K", A: "A" };

/** Returns container width via ResizeObserver for truly dynamic scaling */
function useTableDimensions() {
  const [width, setWidth] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function CasinoTable({ state, online, walletsPending = false }) {
  const phase = state.phase;
  const announcedWinner = phase === "settled" ? state.outcome?.winner : null;
  const isReveal = phase === "reveal" || phase === "settled";
  const phaseDuration = state.phase_duration || 6;
  const videoRef = useRef(null);
  const { ref: containerRef, width: containerWidth } = useTableDimensions();
  const [videoRevealCount, setVideoRevealCount] = useState(0);

  // Dynamically calculate card size relative to the container width.
  // This ensures perfect alignment and no overlapping across all devices.
  const cardSize = useMemo(() => {
    const baseWidth = containerWidth || (typeof window !== "undefined" ? Math.min(window.innerWidth, 1000) : 1000);
    const cardW = baseWidth * 0.065; // Cards are exactly 6.5% of the table width
    const cardH = cardW * 1.414;
    return { w: cardW, h: cardH, mL: -cardW / 2, mT: -cardH / 2 };
  }, [containerWidth]);

  const SLOT_A = useMemo(
    () => [
      { x: 38, y: 80 }, // index 0 — first card (right, toward table center)
      { x: 30, y: 80 }, // index 1 — middle
      { x: 22, y: 80 }, // index 2 — third card (left, toward outer edge)
    ],
    []
  );
  const SLOT_B = useMemo(
    () => [
      { x: 64, y: 80 },
      { x: 72, y: 80 },
      { x: 80, y: 80 },
    ],
    []
  );

  const dealOrder = useMemo(
    () =>
      REVEAL_ORDER.map((slot) => ({
        side: slot.side,
        index: slot.index,
        target: slot.side === "a" ? SLOT_A[slot.index] : SLOT_B[slot.index],
      })),
    [SLOT_A, SLOT_B]
  );

  const serverRevealed =
    state.reveal?.revealed_count ?? revealedCount(phase, state.time_left, phaseDuration);
  const revealed =
    phase === "reveal"
      ? Math.max(serverRevealed, videoRevealCount)
      : serverRevealed;
  const cards = state.cards;

  const syncVideoToPhase = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const activePhases = ["betting", "locked", "dealing", "reveal", "settled"];
    if (!activePhases.includes(phase)) return;

    const targetTime = videoTimeForPhase(phase, state.time_left, phaseDuration);
    if (phase === "betting" && state.time_left >= phaseDuration - 0.5) {
      video.currentTime = 0;
    } else if (Math.abs(video.currentTime - targetTime) > 0.35) {
      video.currentTime = targetTime;
    }

    video.play().catch(() => {});
  }, [phase, state.time_left, phaseDuration]);

  useEffect(() => {
    syncVideoToPhase();
  }, [state.round_id, phase, syncVideoToPhase]);

  useEffect(() => {
    if (phase === "betting") {
      setVideoRevealCount(0);
    }
  }, [phase, state.round_id]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || phase !== "reveal") return;
    setVideoRevealCount(revealedCountFromVideoTime(video.currentTime));
  };

  return (
    <div className="relative" data-testid="casino-table">
      <div className="relative w-full">
        <div
          ref={containerRef}
          className="relative w-full aspect-video rounded-xl overflow-hidden"
          style={{
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(212,175,55,0.25)",
          }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            src={TABLE_VIDEO}
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            data-testid="table-video"
          />

          <PlayerLabel
            x={28}
            y={66}
            label="Player A"
            hand={announcedWinner ? state.outcome?.a_hand_name : undefined}
            winner={announcedWinner === "A"}
            testId="label-a"
          />
          <PlayerLabel
            x={72}
            y={66}
            label="Player B"
            hand={announcedWinner ? state.outcome?.b_hand_name : undefined}
            winner={announcedWinner === "B"}
            testId="label-b"
          />

          {dealOrder.map((s, i) => {
            const faceCode = s.side === "a" ? cards.a[s.index] : cards.b[s.index];
            const visible =
              phase === "settled" || (phase === "reveal" && revealed > i);
            if (!visible) return null;

            const schedule = cardRevealSchedule(i);
            return (
              <SlotCard
                key={`${state.round_id}-${i}`}
                order={i}
                side={s.side}
                target={s.target}
                face={isReveal && faceCode ? faceCode : null}
                flipDuration={(schedule.flipEnd - schedule.flipStart) * 1000}
                winningSide={
                  announcedWinner === "A" && s.side === "a"
                    ? true
                    : announcedWinner === "B" && s.side === "b"
                    ? true
                    : false
                }
                cardSize={cardSize}
                testId={`card-${s.side}-${s.index}`}
              />
            );
          })}

          <div className="absolute top-[77%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <Timer
              timeLeft={state.time_left}
              duration={state.phase_duration}
              phase={phase}
              size="compact"
              dynamicSize={Math.min((cardSize.w / 0.065) * 0.115, 68)}
            />
          </div>

          <AnimatePresence>
            {phase === "locked" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-[34%] left-1/2 -translate-x-1/2 z-20 px-3 sm:px-5 py-1.5 sm:py-2 rounded-sm bg-red-600 text-white text-[10px] sm:text-xs tracking-[0.3em] uppercase font-bold pulse-warn"
                data-testid="no-more-bets-banner"
              >
                No More Bets
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === "settled" && walletsPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-[28%] left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-sm bg-black/70 border border-white/20 text-[10px] text-white/80 tracking-wide"
                data-testid="wallets-pending-banner"
              >
                Updating balances…
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === "settled" && state.outcome && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`absolute bottom-[2%] z-20 px-3 sm:px-4 py-1 sm:py-1.5 rounded-sm bg-black/75 border border-[color:var(--theme-primary)] backdrop-blur-xl ${
                  state.outcome.winner === "A"
                    ? "left-[6%]"
                    : state.outcome.winner === "B"
                    ? "right-[6%]"
                    : "left-1/2 -translate-x-1/2"
                }`}
                data-testid="winner-banner"
              >
                <div className="text-[7px] sm:text-[8px] tracking-[0.25em] uppercase text-[color:var(--theme-primary)] text-center leading-none">
                  Winner
                </div>
                <div className="font-display text-sm sm:text-lg text-white leading-tight mt-0.5">
                  {state.outcome.winner === "TIE"
                    ? "Tie"
                    : `Player ${state.outcome.winner} · ${
                        state.outcome.winner === "A"
                          ? state.outcome.a_hand_name
                          : state.outcome.b_hand_name
                      }`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-sm bg-black/60 backdrop-blur text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-white/80 z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
        <span className="ml-1 font-mono-data text-white/60" data-testid="table-online">
          {online} watching
        </span>
      </div>
    </div>
  );
}

function PlayerLabel({ x, y, label, hand, winner, testId }) {
  return (
    <div
      className="absolute -translate-x-1/2 text-center z-10 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      data-testid={testId}
    >
      <div
        className={`text-[8px] sm:text-[9px] tracking-[0.3em] uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
          winner ? "text-[color:var(--theme-primary)]" : "text-white/80"
        }`}
      >
        {label}
      </div>
      {hand && (
        <div
          className={`text-[9px] sm:text-[10px] mt-0.5 font-mono-data drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
            winner ? "text-[color:var(--theme-primary)]" : "text-white/70"
          }`}
        >
          {hand}
        </div>
      )}
    </div>
  );
}

function SlotCard({ order, side, target, face, flipDuration, winningSide, cardSize, testId }) {
  const { w, h, mL, mT } = cardSize;

  return (
    <motion.div
      className="absolute z-[15]"
      style={{
        left: `${target.x}%`,
        top: `${target.y}%`,
        width: w,
        height: h,
        marginLeft: mL,
        marginTop: mT,
        transformStyle: "preserve-3d",
        perspective: 900,
      }}
      initial={{ opacity: 0, scale: 0.72, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      data-testid={testId}
    >
      <motion.div
        className={`relative w-full h-full ${winningSide && face ? "glow-win" : ""}`}
        animate={{ rotateY: face ? 0 : 180 }}
        transition={{ duration: flipDuration / 1000 || 0.35, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <CardFront card={face} cardSize={cardSize} />
        <CardBack />
      </motion.div>
    </motion.div>
  );
}

function CardBack() {
  return (
    <div
      className="absolute inset-0 tp-card-back overflow-hidden"
      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
    />
  );
}

function CardFront({ card, cardSize }) {
  if (!card) {
    return (
      <div
        className="absolute inset-0 tp-card"
        style={{ backfaceVisibility: "hidden" }}
      />
    );
  }

  const r = RANK_LABEL[card[0]] || card[0];
  const s = card[1];
  const color = SUIT_COLOR[s];

  const scale = cardSize.w / 70;
  const fTop = Math.round(15 * scale);
  const fSuit = Math.round(14 * scale);
  const fCenter = Math.round(30 * scale);

  return (
    <div
      className="absolute inset-0 tp-card flex flex-col justify-between p-1"
      style={{ backfaceVisibility: "hidden" }}
    >
      <div className="leading-none text-left" style={{ color }}>
        <div className="font-serif font-bold" style={{ fontSize: fTop, lineHeight: 1 }}>
          {r}
        </div>
        <div style={{ fontSize: fSuit, lineHeight: 1.1 }}>{SUIT_GLYPH[s]}</div>
      </div>
      <div className="self-center font-serif" style={{ color, fontSize: fCenter, lineHeight: 1 }}>
        {SUIT_GLYPH[s]}
      </div>
      <div className="leading-none text-right rotate-180" style={{ color }}>
        <div className="font-serif font-bold" style={{ fontSize: fTop, lineHeight: 1 }}>
          {r}
        </div>
        <div style={{ fontSize: fSuit, lineHeight: 1.1 }}>{SUIT_GLYPH[s]}</div>
      </div>
    </div>
  );
}
