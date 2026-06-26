import React, { useMemo } from "react";
import { motion } from "framer-motion";

const EXPRESSIONS = {
  idle: { brow: 0, eyeOpen: 1, mouth: "neutral", headTilt: 0 },
  welcome: { brow: -2, eyeOpen: 0.92, mouth: "smile", headTilt: -3 },
  focus: { brow: 3, eyeOpen: 0.85, mouth: "neutral", headTilt: 0 },
  deal: { brow: 1, eyeOpen: 0.9, mouth: "open", headTilt: 2 },
  reveal: { brow: -1, eyeOpen: 1, mouth: "slight", headTilt: -1 },
  celebrate: { brow: -4, eyeOpen: 0.75, mouth: "smile", headTilt: -5 },
  announce: { brow: -2, eyeOpen: 0.95, mouth: "open", headTilt: 0 },
};

function phaseExpression(phase) {
  switch (phase) {
    case "betting": return "welcome";
    case "locked": return "focus";
    case "dealing": return "deal";
    case "reveal": return "reveal";
    case "settled": return "celebrate";
    default: return "idle";
  }
}

function resolvePhotoUrl(avatar = {}, dealerId) {
  const photo = avatar.photo || avatar.photo_url
    || (dealerId === "ava" ? "/images/dealer/ava.png" : null);
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  return `${process.env.PUBLIC_URL || ""}${photo.startsWith("/") ? photo : `/${photo}`}`;
}

/**
 * Live casino dealer — photo when configured, otherwise procedural SVG avatar.
 * Expression-driven by game phase + optional speaking state.
 */
export function VirtualDealer({
  dealer,
  phase = "betting",
  speaking = false,
  size = "table",
  className = "",
}) {
  const avatar = dealer?.avatar || {};
  const photoUrl = resolvePhotoUrl(avatar, dealer?.id);
  const skin = avatar.skin || "#e8c4a8";
  const hair = avatar.hair || "#1a1208";
  const uniform = avatar.uniform || "#1a1520";
  const accent = avatar.accent || "#d4af37";
  const lip = avatar.lip || "#c47a6a";
  const hairStyle = avatar.hair_style || "bun";
  const name = dealer?.name || "Dealer";

  const expr = useMemo(() => {
    const base = EXPRESSIONS[phaseExpression(phase)] || EXPRESSIONS.idle;
    if (speaking) return { ...base, mouth: "open" };
    return base;
  }, [phase, speaking]);

  const dims = size === "panel"
    ? { w: 280, h: 220, scale: 1 }
    : { w: 140, h: 110, scale: 1 };

  if (photoUrl) {
    const rootClass = size === "panel"
      ? `absolute inset-0 overflow-hidden ${className}`.trim()
      : `relative ${className}`.trim();
    const imgClass = size === "panel"
      ? "block h-full w-full object-cover object-[center_18%]"
      : "w-[140px] h-[110px] object-cover object-[center_18%] rounded-md border border-white/10";

    return (
      <div className={rootClass} data-testid="virtual-dealer">
        <motion.img
          src={photoUrl}
          alt={`${name}, live dealer`}
          className={imgClass}
          animate={{
            scale: speaking ? [1, 1.015, 1] : size === "panel" ? [1, 1.004, 1] : [1, 1.008, 1],
          }}
          transition={{
            duration: speaking ? 0.35 : 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {size === "table" && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] tracking-[0.25em] uppercase text-white/40">
            Live Dealer
          </div>
        )}
      </div>
    );
  }

  const mouthPath = {
    neutral: "M 52 78 Q 60 80 68 78",
    smile: "M 50 76 Q 60 84 70 76",
    slight: "M 52 78 Q 60 81 68 78",
    open: "M 54 76 Q 60 84 66 76",
  }[expr.mouth] || "M 52 78 Q 60 80 68 78";

  return (
    <div className={`relative ${className}`} data-testid="virtual-dealer">
      <motion.svg
        viewBox="0 0 120 100"
        width={dims.w}
        height={dims.h}
        className="mx-auto drop-shadow-2xl"
        animate={{ y: [0, -1.5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Chair / booth back */}
        <ellipse cx="60" cy="92" rx="42" ry="8" fill="rgba(0,0,0,0.45)" />
        <path d="M 22 42 Q 20 95 35 98 L 85 98 Q 100 95 98 42 Z" fill="#0a0a0c" stroke={accent} strokeWidth="0.6" opacity="0.9" />

        {/* Torso / uniform */}
        <path d="M 38 58 L 32 98 L 88 98 L 82 58 Z" fill={uniform} />
        <path d="M 44 58 L 40 72 L 80 72 L 76 58 Z" fill={accent} opacity="0.35" />
        <path d="M 54 72 L 60 82 L 66 72" fill="none" stroke={accent} strokeWidth="1.2" />

        {/* Neck */}
        <rect x="52" y="48" width="16" height="12" rx="4" fill={skin} />

        {/* Head */}
        <motion.g animate={{ rotate: expr.headTilt }} style={{ transformOrigin: "60px 42px" }}>
          <ellipse cx="60" cy="42" rx="22" ry="26" fill={skin} />

          {/* Hair */}
          {hairStyle === "bun" && (
            <>
              <ellipse cx="60" cy="24" rx="24" ry="16" fill={hair} />
              <circle cx="60" cy="14" r="8" fill={hair} />
            </>
          )}
          {hairStyle === "short" && (
            <ellipse cx="60" cy="26" rx="24" ry="14" fill={hair} />
          )}
          {hairStyle === "braid" && (
            <>
              <ellipse cx="60" cy="24" rx="24" ry="16" fill={hair} />
              <path d="M 72 30 Q 82 50 78 62" fill="none" stroke={hair} strokeWidth="5" strokeLinecap="round" />
            </>
          )}

          {/* Brows */}
          <motion.line x1="46" y1="36" x2="54" y2="35" stroke="#2a1810" strokeWidth="1.5" strokeLinecap="round"
            animate={{ y: expr.brow * 0.3 }} />
          <motion.line x1="66" y1="35" x2="74" y2="36" stroke="#2a1810" strokeWidth="1.5" strokeLinecap="round"
            animate={{ y: expr.brow * 0.3 }} />

          {/* Eyes */}
          <motion.ellipse cx="50" cy="42" rx="3.5" ry={3.5 * expr.eyeOpen} fill="#1a1008" />
          <motion.ellipse cx="70" cy="42" rx="3.5" ry={3.5 * expr.eyeOpen} fill="#1a1008" />
          <circle cx="51" cy="41" r="1" fill="white" opacity="0.7" />
          <circle cx="71" cy="41" r="1" fill="white" opacity="0.7" />

          {/* Nose */}
          <path d="M 60 44 L 58 50 L 62 50" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />

          {/* Mouth */}
          <motion.path
            d={mouthPath}
            fill="none"
            stroke={lip}
            strokeWidth="2"
            strokeLinecap="round"
            animate={speaking ? { scaleY: [1, 1.15, 0.9, 1] } : {}}
            transition={{ duration: 0.25, repeat: speaking ? Infinity : 0 }}
            style={{ transformOrigin: "60px 78px" }}
          />
        </motion.g>

        {/* Arms on table rail */}
        <motion.g
          animate={phase === "dealing" || phase === "reveal"
            ? { rotate: [0, -8, 0, 8, 0] }
            : { rotate: 0 }}
          transition={{ duration: 1.2, repeat: phase === "dealing" || phase === "reveal" ? Infinity : 0 }}
          style={{ transformOrigin: "60px 70px" }}
        >
          <ellipse cx="28" cy="72" rx="10" ry="6" fill={skin} opacity="0.9" />
          <ellipse cx="92" cy="72" rx="10" ry="6" fill={skin} opacity="0.9" />
        </motion.g>

        {/* Name plate */}
        <rect x="38" y="88" width="44" height="10" rx="2" fill="rgba(0,0,0,0.55)" stroke={accent} strokeWidth="0.4" />
        <text x="60" y="95" textAnchor="middle" fill={accent} fontSize="5" fontFamily="serif" letterSpacing="1">
          {name.toUpperCase()}
        </text>
      </motion.svg>

      {size === "table" && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] tracking-[0.25em] uppercase text-white/40">
          Live Virtual Dealer
        </div>
      )}
    </div>
  );
}

export function dealerExpressionForPhase(phase) {
  return phaseExpression(phase);
}
