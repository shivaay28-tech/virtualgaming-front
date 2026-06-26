import React from "react";
import { motion } from "framer-motion";

const SUIT_GLYPH = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLOR = { S: "#0a0a0a", H: "#c0182d", D: "#c0182d", C: "#0a0a0a" };
const RANK_LABEL = { T: "10" };

function rankLabel(r) {
  return RANK_LABEL[r] || r;
}

export function PlayingCard({ card, size = "md", highlight = false, testId }) {
  const w = size === "lg" ? 92 : size === "sm" ? 56 : 74;
  const h = size === "lg" ? 132 : size === "sm" ? 80 : 106;
  const facedown = !card;

  return (
    <motion.div
      initial={{ y: -40, opacity: 0, rotateY: 180 }}
      animate={{ y: 0, opacity: 1, rotateY: facedown ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      style={{ width: w, height: h, perspective: 800 }}
      className={`relative rounded-lg ${highlight ? "glow-win" : ""}`}
      data-testid={testId}
    >
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{ transformStyle: "preserve-3d", transform: facedown ? "rotateY(180deg)" : "rotateY(0deg)", transition: "transform 0.5s" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 tp-card rounded-lg flex flex-col justify-between p-1.5"
          style={{ backfaceVisibility: "hidden" }}
        >
          {!facedown && (
            <>
              <div
                className="font-display leading-none text-left"
                style={{ color: SUIT_COLOR[card[1]], fontSize: size === "lg" ? 22 : size === "sm" ? 14 : 18 }}
              >
                <div>{rankLabel(card[0])}</div>
                <div style={{ fontSize: size === "lg" ? 22 : size === "sm" ? 14 : 18, lineHeight: 1 }}>
                  {SUIT_GLYPH[card[1]]}
                </div>
              </div>
              <div
                className="self-center font-display"
                style={{ color: SUIT_COLOR[card[1]], fontSize: size === "lg" ? 50 : size === "sm" ? 32 : 40 }}
              >
                {SUIT_GLYPH[card[1]]}
              </div>
              <div
                className="font-display leading-none text-right rotate-180"
                style={{ color: SUIT_COLOR[card[1]], fontSize: size === "lg" ? 22 : size === "sm" ? 14 : 18 }}
              >
                <div>{rankLabel(card[0])}</div>
                <div style={{ fontSize: size === "lg" ? 22 : size === "sm" ? 14 : 18, lineHeight: 1 }}>
                  {SUIT_GLYPH[card[1]]}
                </div>
              </div>
            </>
          )}
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 tp-card-back rounded-lg"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        />
      </div>
    </motion.div>
  );
}
