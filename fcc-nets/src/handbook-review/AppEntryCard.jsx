// "Club Handbook · Have your say" card for the FCC Training app's Profile tab.
// Test-drive phase: shown ONLY when the server says this member id is on the
// allowlist (handbookReviewConfig/settings.testers / admins). Everyone else
// gets nothing rendered. Kept tiny on purpose — it does NOT import the
// handbook content, so the app bundle stays lean.
//
// Handoff to /handbook-review is same-origin via localStorage (never the URL):
// the card writes { name, email, roleGroup, memberId } to "hbr:prefill" and
// navigates; the review page offers a one-tap "Reviewing as …" start.

import React, { useEffect, useState } from "react";
import { isCoachMember } from "../utils/members";

const DEADLINE = new Date("2026-11-30T23:59:00+01:00").getTime();

function guessRoleGroup(me, teams) {
  if (me.role === "superadmin" || me.role === "admin") return "board";
  if (isCoachMember(me.name, teams)) return "coach";
  if (me.memberType === "parent" || (me.children || []).length) return "youth-parent";
  if ((me.teams || []).length) return "senior";
  return "other";
}

export default function HandbookEntryCard({ me, teams }) {
  const [allowed, setAllowed] = useState(false);
  const [progress, setProgress] = useState(null); // { done, completed } for THIS member's review on this device

  useEffect(() => {
    let alive = true;
    setAllowed(false);
    if (!me?.id) return undefined;
    fetch(`/api/handbook/access?m=${encodeURIComponent(me.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAllowed(d?.allowed === true); })
      .catch(() => {});
    return () => { alive = false; };
  }, [me?.id]);

  useEffect(() => {
    if (!allowed) return undefined;
    let alive = true;
    let token = null;
    try { token = localStorage.getItem("hbr:token"); } catch { /* storage blocked */ }
    if (!token) return undefined;
    fetch(`/api/handbook/review?r=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // Only show progress if the review on this device is this member's.
        if (alive && d?.review && (d.review.memberId === me.id || d.review.name === me.name)) {
          setProgress({ done: d.review.doneCount, completed: !!d.review.completedAt });
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [allowed, me.id, me.name]);

  if (!allowed) return null;

  const done = progress?.done || 0;
  const daysLeft = Math.max(0, Math.floor((DEADLINE - Date.now()) / 86400000));
  const status = progress?.completed ? "Submitted ✓" : done > 0 ? "In progress" : "Not started";
  const urgent = daysLeft <= 7 && !progress?.completed;
  const r = 20, c = 2 * Math.PI * r;

  function open() {
    try {
      localStorage.setItem("hbr:prefill", JSON.stringify({
        name: me.name, email: me.email || "", roleGroup: guessRoleGroup(me, teams),
        memberId: me.id, at: Date.now(),
      }));
      sessionStorage.setItem("hbr:fromApp", "1");
    } catch { /* storage blocked: the review page falls back to its form */ }
    window.location.href = "/handbook-review/";
  }

  const done13 = !!progress?.completed;

  // Gold card (stands out on every app theme — navy, green or light) with a
  // red days-left tile. The tile pulses gently; faster in the last 7 days.
  return (
    <button onClick={open} className="hbr-card" aria-label={`Club Handbook. Have your say. ${done} of 13 parts reviewed. ${daysLeft} days left. ${status}.`}
      style={{
        position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
        padding: "16px 16px 16px 18px", borderRadius: 18, border: "2px solid #F7D774", cursor: "pointer",
        background: "linear-gradient(135deg,#FFE9A3 0%,#F2C94C 45%,#D4A217 100%)", color: "#1B2A5C",
        boxShadow: "0 10px 28px rgba(212,162,23,.45), 0 0 0 4px rgba(212,162,23,.18)",
      }}>
      <style>{`
        .hbr-card::after{content:"";position:absolute;top:-60%;left:-30%;width:28%;height:220%;transform:rotate(20deg);
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:hbrCardShine 5s ease-in-out infinite;pointer-events:none}
        @keyframes hbrCardShine{0%,70%{left:-30%}100%{left:130%}}
        .hbr-days{animation:hbrDaysPulse 2.4s ease-in-out infinite}
        .hbr-days.urgent{animation-duration:1.1s}
        @keyframes hbrDaysPulse{0%,100%{box-shadow:0 4px 12px rgba(204,27,51,.45),0 0 0 0 rgba(204,27,51,.45)}50%{box-shadow:0 4px 12px rgba(204,27,51,.45),0 0 0 7px rgba(204,27,51,0)}}
        .hbr-card:focus-visible{outline:3px solid #1B2A5C;outline-offset:3px}
        @media (prefers-reduced-motion: reduce){.hbr-card::after,.hbr-days{animation:none}}
      `}</style>
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="26" cy="26" r={r} fill="rgba(255,255,255,.55)" stroke="rgba(27,42,92,.18)" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke="#1B2A5C" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - done / 13)} transform="rotate(-90 26 26)" />
        <text x="26" y="30" textAnchor="middle" fill="#1B2A5C" fontSize="12" fontWeight="800">{done}/13</text>
      </svg>
      <span style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#7A1020" }}>
          <span style={{ background: "#CC1B33", color: "#fff", padding: "2px 7px", borderRadius: 6, letterSpacing: ".06em" }}>New</span>
          One FCC
        </span>
        <span style={{ display: "block", fontFamily: "Lora, Georgia, serif", fontSize: 19, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>
          Club Handbook · Have your say
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7, fontSize: 12.5, flexWrap: "wrap" }}>
          <span style={{
            fontWeight: 800, padding: "3px 10px", borderRadius: 999,
            background: done13 ? "#1F7A4D" : "#1B2A5C", color: "#fff",
          }}>{status}</span>
          <span style={{ fontWeight: 700, color: "#3B2E00" }}>Tap to {done > 0 && !done13 ? "continue" : done13 ? "review" : "start"} →</span>
        </span>
      </span>
      <span className={`hbr-days${urgent ? " urgent" : ""}`} aria-hidden="true" style={{
        position: "relative", zIndex: 1, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minWidth: 64, padding: "8px 10px", borderRadius: 14,
        background: done13 ? "#1F7A4D" : "linear-gradient(180deg,#E3394F 0%,#CC1B33 100%)", color: "#fff",
      }}>
        <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{done13 ? "✓" : daysLeft}</span>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4, whiteSpace: "nowrap" }}>
          {done13 ? "Done" : daysLeft === 1 ? "Day left" : "Days left"}
        </span>
      </span>
    </button>
  );
}
