import React from "react";

export function HistoryStrip({ history }) {
  // history: list of rounds [{winner: 'A'|'B'|'TIE', round_number}]
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="history-strip">
      {history.length === 0 && (
        <div className="text-xs text-white/40 font-mono-data">No rounds yet</div>
      )}
      {history.map((r) => {
        const w = r.winner;
        const bg = w === "A" ? "bg-blue-500" : w === "B" ? "bg-red-500" : "bg-white/30";
        const ch = w === "TIE" ? "T" : w;
        return (
          <div
            key={r.id || r.round_number}
            className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${bg}`}
            title={`Round #${r.round_number} • Winner ${ch}`}
            data-testid={`history-cell-${r.round_number}`}
          >
            {ch}
          </div>
        );
      })}
    </div>
  );
}
