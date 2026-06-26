const SUIT_GLYPH = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLOR = { S: "#e8e8e8", H: "#c41e3a", D: "#c41e3a", C: "#e8e8e8" };
const RANK_LABEL = { T: "10", J: "J", Q: "Q", K: "K", A: "A" };

export function CardFace({ card, className = "" }) {
  if (!card) {
    return (
      <div
        className={`w-10 h-14 rounded border border-white/20 bg-white/5 flex items-center justify-center text-white/20 text-xs ${className}`}
      >
        —
      </div>
    );
  }
  const r = RANK_LABEL[card[0]] || card[0];
  const s = card[1];
  const color = SUIT_COLOR[s];
  return (
    <div
      className={`w-10 h-14 rounded border border-white/30 bg-white flex flex-col justify-between p-1 shadow ${className}`}
    >
      <div className="leading-none text-left" style={{ color }}>
        <div className="font-serif font-bold text-sm">{r}</div>
        <div className="text-xs">{SUIT_GLYPH[s]}</div>
      </div>
    </div>
  );
}
