import React, { useMemo } from "react";
import { CountdownTiles } from "../../shared/Countdown.jsx";
import { cameFromApp } from "../identity.js";

export const CREST = "/handbook-review/crest.webp";
const ACCENTS = ["#D4A217", "#5B7BD6", "#CC1B33", "#AEBAE0"];

export function Countdown({ deadline, size = "md" }) {
  return <CountdownTiles target={deadline} accents={ACCENTS} size={size} labelColor="rgba(174,186,224,.9)" />;
}

export function daysLeft(deadline, now = Date.now()) {
  return Math.max(0, Math.floor((deadline - now) / 86400000));
}

export function ProgressRing({ done, total, size = 76, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${done} of ${total} parts reviewed`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="hbrRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--red)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#hbrRing)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-txt"><b>{done}</b><small>of {total}</small></div>
    </div>
  );
}

const STATUS_TEXT = {
  idle: "",
  saving: "Saving…",
  saved: "Saved ✓",
  offline: "Offline, will sync",
  error: "Retrying…",
  closed: "Review closed",
};

export function SaveStatus({ status, hasPending }) {
  const s = status === "idle" && hasPending ? "saving" : status;
  if (!STATUS_TEXT[s]) return <span className="status" aria-live="polite" style={{ visibility: "hidden" }}>Saved ✓</span>;
  return (
    <span className={`status ${s}`} role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />{STATUS_TEXT[s]}
    </span>
  );
}

export const VERDICT_META = {
  agree: { emoji: "👍", label: "Agree", short: "Agree" },
  changes: { emoji: "🤔", label: "Agree with changes", short: "Changes" },
  disagree: { emoji: "👎", label: "Disagree", short: "Disagree" },
};
export const VERDICT_ACCENT = { agree: "var(--agree)", changes: "var(--gold)", disagree: "var(--red)" };

export function VerdictChip({ part, done }) {
  if (!part?.verdict) return <span className="chip-v none">Not started</span>;
  if (!done) return <span className="chip-v draft">Draft</span>;
  const m = VERDICT_META[part.verdict];
  return <span className={`chip-v ${part.verdict}`}><span aria-hidden="true">{m.emoji}</span>{m.short}</span>;
}

export function Privacy() {
  return (
    <p className="privacy">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>Only the One FCC Leads (Reuben &amp; Parag) see individual answers. Results are shared as totals.</span>
    </p>
  );
}

export function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["#D4A217", "#CC1B33", "#2A3D7A", "#FFFFFF", "#E2B33B"];
    return Array.from({ length: 46 }, (_, i) => ({
      left: 5 + Math.random() * 90,
      dx: `${(Math.random() - 0.5) * 220}px`,
      rot: `${Math.random() * 720 - 360}deg`,
      d: `${1.6 + Math.random() * 1.4}s`,
      delay: `${Math.random() * 0.6}s`,
      color: colors[i % colors.length],
    }));
  }, []);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, "--dx": p.dx, "--rot": p.rot, "--d": p.d, "--delay": p.delay }} />
      ))}
    </div>
  );
}

export function formatDate(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" });
}

// "← FCC app" — only when the reviewer arrived from the FCC Training app.
export function BackToApp({ variant }) {
  if (!cameFromApp()) return null;
  return (
    <a href="/" className={`back-app ${variant || ""}`} aria-label="Back to the FCC Training app">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      FCC app
    </a>
  );
}
