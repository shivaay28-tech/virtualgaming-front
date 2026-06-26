import React from "react";

const SIZES = {
  default: {
    box: "w-28 h-28",
    number: "text-4xl",
    label: "text-[10px] tracking-[0.2em] mt-0.5",
    stroke: 6,
  },
  compact: {
    box: "w-20 h-20",
    number: "text-2xl",
    label: "text-[8px] tracking-[0.15em] mt-0",
    stroke: 5,
  },
};

export function Timer({ timeLeft, duration, phase, size = "default", dynamicSize }) {
  const safeDuration = duration > 0 ? duration : 1;
  const progress = Math.max(0, Math.min(1, timeLeft / safeDuration));
  const R = 46;
  const C = 2 * Math.PI * R;
  const dash = C * progress;
  const warn = phase === "betting" && timeLeft <= 5;
  const stroke = phase === "betting" ? "var(--theme-primary)" : warn ? "#ef4444" : "rgba(255,255,255,0.4)";
  const s = SIZES[size] || SIZES.default;

  let boxStyle = {};
  let numberStyle = {};
  let labelStyle = {};
  let strokeW = s.stroke;

  if (dynamicSize) {
    boxStyle = { width: dynamicSize, height: dynamicSize };
    numberStyle = { fontSize: Math.max(dynamicSize * 0.3, 14) }; 
    labelStyle = { fontSize: Math.max(dynamicSize * 0.1, 7), marginTop: dynamicSize * 0.02 };
    strokeW = Math.max(dynamicSize * 0.0625, 3);
  }

  return (
    <div
      className={`relative ${dynamicSize ? '' : s.box} rounded-full bg-black/35 backdrop-blur-sm ${warn ? "pulse-warn" : ""}`}
      style={boxStyle}
      data-testid="round-timer"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW} fill="none" />
        <circle
          cx="50"
          cy="50"
          r={R}
          stroke={stroke}
          strokeWidth={strokeW}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          style={{ transition: "stroke-dasharray 0.25s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div 
          className={`font-mono-data font-bold text-white leading-none ${dynamicSize ? '' : s.number}`}
          style={numberStyle}
        >
          {Math.ceil(timeLeft)}
        </div>
        <div 
          className={`uppercase text-white/50 tracking-[0.15em] ${dynamicSize ? '' : s.label}`}
          style={labelStyle}
        >
          {phase}
        </div>
      </div>
    </div>
  );
}
