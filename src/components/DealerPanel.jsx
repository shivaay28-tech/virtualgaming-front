import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { VirtualDealer } from "./VirtualDealer";

function dealerPhotoUrl(dealer) {
  const photo = dealer?.avatar?.photo || dealer?.avatar?.photo_url
    || (dealer?.id === "ava" ? "/images/dealer/ava.png" : null);
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  return `${process.env.PUBLIC_URL || ""}${photo.startsWith("/") ? photo : `/${photo}`}`;
}

const PHASE_LINES = {
  betting: "Place your bets, please.",
  locked: "No more bets.",
  dealing: "Dealing the cards.",
  reveal: "Revealing.",
  settled: "Round settled.",
};

const HINDI = {
  betting: "कृपया अपना दांव लगाइए।",
  locked: "और दांव नहीं।",
  dealing: "ताश बांटी जा रही हैं।",
  reveal: "खुलाई जा रही हैं।",
  settled: "राउंड समाप्त।",
};
const GUJ = {
  betting: "કૃપા કરી તમારી શરત મૂકો.",
  locked: "હવે વધુ શરત નહીં.",
  dealing: "પત્તાં વહેંચાય છે.",
  reveal: "ખુલે છે.",
  settled: "રાઉન્ડ સમાપ્ત.",
};
const MAR = {
  betting: "कृपया तुमची पैज लावा.",
  locked: "आता आणखी पैज नाही.",
  dealing: "पत्ते वाटले जात आहेत.",
  reveal: "उघडले जात आहे.",
  settled: "राउंड समाप्त.",
};

const LANG_LINES = { en: PHASE_LINES, hi: HINDI, gu: GUJ, mr: MAR };

/**
 * DealerPanel
 *
 * @param {boolean} compact – when true renders a slim one-line summary row
 *                            (used inside mobile collapsible sections)
 */
export function DealerPanel({
  phase,
  dealer,
  lang = "en",
  muted,
  onToggleMute,
  lastWinnerLine,
  speaking = false,
  compact = false,
}) {
  const table = LANG_LINES[lang] || PHASE_LINES;
  const line = lastWinnerLine || table[phase] || "";
  const name = dealer?.name || "Ava";
  const title = dealer?.title || "Live Host";
  const photoUrl = dealerPhotoUrl(dealer);

  // ── Compact (mobile inline summary) ────────────────────────────────
  if (compact) {
    return (
      <div
        className="flex items-center justify-between gap-3 py-1"
        data-testid="dealer-panel"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Tiny avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1520] to-black border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-full h-full object-cover object-[center_20%]" />
            ) : (
              <span className="text-[10px] font-mono-data text-white/60">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.15em] uppercase text-white/50">
              {title} · {name}
            </div>
            <div
              className="text-xs text-white/80 truncate font-display italic"
              data-testid="dealer-line"
            >
              "{line}"
            </div>
          </div>
        </div>
        <button
          onClick={onToggleMute}
          data-testid="dealer-mute-toggle"
          className="shrink-0 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white"
          aria-label="Toggle dealer voice"
        >
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      </div>
    );
  }

  // ── Full panel (desktop left rail) ─────────────────────────────────
  return (
    <div
      className="relative rounded-md overflow-hidden border border-white/10 bg-black/40"
      data-testid="dealer-panel"
    >
      <div className="relative aspect-[4/3] sm:aspect-[5/4] bg-black overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${name}, live dealer`}
            className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-2 bg-gradient-to-b from-[#1a1520] to-black">
            <VirtualDealer
              dealer={dealer}
              phase={phase}
              speaking={speaking}
              size="panel"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none z-[1]" />
        <div
          className="absolute top-3 left-3 px-2 py-1 rounded-sm bg-black/60 backdrop-blur text-[10px] tracking-[0.2em] uppercase text-white/80 z-[2]"
          data-testid="dealer-name"
        >
          {title} • {name}
        </div>
        <button
          onClick={onToggleMute}
          data-testid="dealer-mute-toggle"
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 text-white z-[2]"
          aria-label="Toggle dealer voice"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <div className="absolute bottom-3 left-3 right-3 z-[2]">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
            Dealer says
          </div>
          <div
            className="font-display text-xl sm:text-2xl text-white mt-1 leading-snug"
            data-testid="dealer-line"
          >
            &ldquo;{line}&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}
