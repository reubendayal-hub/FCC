import React, { useState, useEffect, useMemo } from "react";

// Shared design tokens, static club data, and small presentational pieces
// used by both /ministaevne/register (MinistaevneApp.jsx) and
// /ministaevne (MinistaevneLive.jsx) — keeps the two pages visually
// in lockstep without register's form/admin logic leaking into the
// read-only spectator bundle.

// ── Design tokens — floodlit stadium, metallic + club-color accents ──
export const C = {
  night: "#04070D",
  night2: "#0A1220",
  turf: "#0E2E1E",
  gold1: "#FFF3C4", gold2: "#F0B429", gold3: "#9A6B12",
  silver1: "#F4F6F8", silver2: "#9AA4B2", silver3: "#525A66",
  blue: "#3B82F6", red: "#EF4444",
  emerald: "#12B76A",
  ember: "#FF5A36",
  cream: "#F7F3E8",
  muted: "rgba(247,243,232,0.55)",
};
export const GOLD = `linear-gradient(135deg, ${C.gold1} 0%, ${C.gold2} 45%, ${C.gold3} 78%, ${C.gold2} 100%)`;

export const FCC_LOGO = "/fcc-logo.png";

// Golden-angle hue spacing guarantees no two clubs land on visually similar colors,
// however many clubs get added later (incl. late walk-ins registered on the day).
export const goldenHue = (i) => Math.round((i * 137.508) % 360);
export const sphereGradient = (hue) => `radial-gradient(circle at 32% 26%, hsl(${hue},85%,68%), hsl(${hue},70%,40%) 75%)`;
export const HOST_GRADIENT = `radial-gradient(circle at 32% 26%, ${C.gold1}, ${C.gold3} 75%)`;

export const CLUB_NAMES = [
  { name: "Fredensborg CC", short: "FCC", host: true },
  { name: "KB Cricket", short: "KB" },
  { name: "Svanholm CC", short: "SV" },
  { name: "Hvidovre CC", short: "HV" },
  { name: "Albertslund CC", short: "AL" },
  { name: "AB Cricket", short: "AB" },
  { name: "Bella CC", short: "BL" },
  { name: "Copenhagen CC", short: "CCC" },
  { name: "Glostrup CC", short: "GL" },
  { name: "Ishøj CC", short: "IS" },
  { name: "Køge CC", short: "KG" },
  { name: "Nørrebro CC", short: "NB" },
  { name: "Tåstrup CC", short: "TS" },
  { name: "Frem CC", short: "FR" },
  { name: "Roskilde CC", short: "RK" },
];
export const INVITED = CLUB_NAMES.map((c, i) => {
  const hue = goldenHue(i);
  return { ...c, hue, accent: c.host ? C.gold2 : `hsl(${hue}, 80%, 60%)`, bg: c.host ? HOST_GRADIENT : sphereGradient(hue) };
});

export const PUBLIC_POLL_MS = 20000;

export const pluralize = (n, word) => `${n} ${word}${n !== 1 ? "s" : ""}`;

// Clubs that registered via "+ not listed" — assigns each a stable hue
// continuing the golden-angle sequence past the invited list, so the same
// club gets the same color on both /register and /live (both derive this
// from the identical confirmed-list data).
export function deriveExtraClubs(confirmedList) {
  const invitedNames = new Set(INVITED.map((c) => c.name));
  const customNames = [...new Set(confirmedList.map((r) => r.clubName))]
    .filter((name) => !invitedNames.has(name))
    .sort((a, b) => a.localeCompare(b));
  return customNames.map((name, i) => {
    const hue = goldenHue(INVITED.length + i);
    const short = name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
    return { name, short, hue, accent: `hsl(${hue}, 80%, 60%)`, bg: sphereGradient(hue) };
  });
}

// Small posh gold-ring wrapper used on every club badge.
export function ClubBadge({ size = 66, ringWidth = 3, bg, img, children, onClick, title, style = {}, dim = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", padding: ringWidth,
      backgroundImage: GOLD, boxShadow: `0 8px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)`,
      flexShrink: 0, ...style,
    }}>
      <button onClick={onClick} title={title} disabled={!onClick} style={{
        width: "100%", height: "100%", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.35)",
        background: img ? "#0B121C" : bg, overflow: "hidden",
        color: "#04070D", fontWeight: 900, fontSize: size > 50 ? 13 : 12, cursor: onClick ? "pointer" : "default",
        boxShadow: "inset 0 2px 3px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.25)",
        opacity: dim ? 0.85 : 1, filter: dim ? "saturate(0.9)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
      }}>{img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : children}</button>
    </div>
  );
}

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
  };
}

export function ScoreTile({ value, label, flashKey, accent }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        position: "relative", width: 68, height: 78, borderRadius: 14,
        background: `linear-gradient(180deg, #1a2333 0%, #070B12 100%)`,
        border: `1px solid ${accent}55`,
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05), 0 0 16px ${accent}33, 0 8px 24px rgba(0,0,0,0.5)`,
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, boxShadow: `0 0 8px ${accent}` }} />
        <div key={flashKey} style={{
          fontSize: 30, fontWeight: 900, fontVariantNumeric: "tabular-nums", letterSpacing: -1,
          color: C.gold1, textShadow: `0 0 8px ${accent}aa, 0 0 18px ${accent}55`,
          animation: "digitPulse 0.4s ease-out", fontFamily: "'Courier New', monospace",
        }}>{String(value).padStart(2, "0")}</div>
      </div>
      <div style={{ fontSize: 9.5, letterSpacing: 2, color: C.muted, fontWeight: 800, marginTop: 7 }}>{label}</div>
    </div>
  );
}

export function Confetti({ burstKey }) {
  const palette = [C.gold2, C.blue, C.red, C.emerald, "#fff"];
  const pieces = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    id: i, left: 25 + Math.random() * 50, dx: (Math.random() - 0.5) * 340,
    dur: 1 + Math.random() * 0.9, delay: Math.random() * 0.25, size: 5 + Math.random() * 6,
    color: palette[i % palette.length], rot: Math.random() * 540,
  })), [burstKey]);
  if (burstKey === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 30 }}>
      {pieces.map((p) => (
        <div key={p.id + "-" + burstKey} style={{
          position: "absolute", left: `${p.left}%`, top: "8%", width: p.size, height: p.size,
          borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}`,
          animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards`, "--dx": `${p.dx}px`, "--rot": `${p.rot}deg`,
        }} />
      ))}
    </div>
  );
}

export function Tooltip({ text, show }) {
  if (!show) return null;
  return (
    <div style={{
      position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
      background: "#0B121C", border: "1px solid rgba(255,255,255,0.15)", color: C.cream,
      fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
      boxShadow: "0 6px 16px rgba(0,0,0,0.5)", zIndex: 20, pointerEvents: "none",
    }}>
      {text}
      <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #0B121C" }} />
    </div>
  );
}
