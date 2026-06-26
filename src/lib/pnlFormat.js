export const MARKET_LABELS = {
  player_a: "Player A",
  player_b: "Player B",
  pair_plus_a: "Pair Plus A",
  pair_plus_b: "Pair Plus B",
};

export function formatHousePnl(value) {
  const n = Number(value) || 0;
  const prefix = n > 0 ? "+" : "";
  return `${prefix}₹${n.toLocaleString()}`;
}

export function pnlColorClass(value) {
  const n = Number(value) || 0;
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-red-400";
  return "text-white";
}

export function marketLabel(market) {
  return MARKET_LABELS[market] || market?.replace(/_/g, " ") || market;
}
