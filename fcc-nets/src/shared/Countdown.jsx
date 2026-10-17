import React, { useState, useEffect } from "react";

// Shared countdown — originally built for /ministaevne, now also used by
// /handbook-review. ministaevneShared.jsx re-exports useCountdown and
// ScoreTile from here so the ministaevne pages are unchanged.

const DIGIT = "#FFF3C4";
const LABEL = "rgba(247,243,232,0.55)";

export function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
    done: diff === 0,
  };
}

export function ScoreTile({ value, label, flashKey, accent, size = "md", labelColor = LABEL }) {
  const sm = size === "sm";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        position: "relative", width: sm ? 46 : 68, height: sm ? 52 : 78, borderRadius: sm ? 10 : 14,
        background: `linear-gradient(180deg, #1a2333 0%, #070B12 100%)`,
        border: `1px solid ${accent}55`,
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05), 0 0 16px ${accent}33, 0 8px 24px rgba(0,0,0,0.5)`,
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: sm ? 2 : 3, background: accent, boxShadow: `0 0 8px ${accent}` }} />
        <div key={flashKey} style={{
          fontSize: sm ? 20 : 30, fontWeight: 900, fontVariantNumeric: "tabular-nums", letterSpacing: -1,
          color: DIGIT, textShadow: `0 0 8px ${accent}aa, 0 0 18px ${accent}55`,
          animation: "digitPulse 0.4s ease-out", fontFamily: "'Courier New', monospace",
        }}>{String(value).padStart(2, "0")}</div>
      </div>
      <div style={{ fontSize: sm ? 8.5 : 9.5, letterSpacing: 2, color: labelColor, fontWeight: 800, marginTop: sm ? 5 : 7 }}>{label}</div>
    </div>
  );
}

// The full DD : HH : MM : SS row in the ministaevne look.
// accents: [days, hours, minutes, seconds]
export function CountdownTiles({ target, accents, size = "md", labelColor }) {
  const { d, h, m, s } = useCountdown(target);
  const gap = size === "sm" ? 6 : 10;
  return (
    <div role="timer" aria-label={`${d} days, ${h} hours, ${m} minutes left`} style={{ display: "inline-flex", gap }}>
      <style>{`@keyframes digitPulse { 0%{ transform: scale(1.25); opacity:.3; } 100%{ transform: scale(1); opacity:1; } }
        @media (prefers-reduced-motion: reduce){ [role="timer"] *{ animation: none !important; } }`}</style>
      <ScoreTile value={d} label="DAYS" flashKey={d} accent={accents[0]} size={size} labelColor={labelColor} />
      <ScoreTile value={h} label="HRS" flashKey={h} accent={accents[1]} size={size} labelColor={labelColor} />
      <ScoreTile value={m} label="MIN" flashKey={m} accent={accents[2]} size={size} labelColor={labelColor} />
      <ScoreTile value={s} label="SEC" flashKey={s} accent={accents[3]} size={size} labelColor={labelColor} />
    </div>
  );
}
