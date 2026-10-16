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

  return (
    <button onClick={open} aria-label={`Club Handbook. Have your say. ${done} of 13 parts reviewed. ${daysLeft} days left. ${status}.`}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
        padding: "16px 18px", borderRadius: 16, border: "none", cursor: "pointer",
        background: "linear-gradient(135deg,#1B2A5C 0%,#2A3D7A 100%)", color: "#fff",
        boxShadow: "0 6px 18px rgba(27,42,92,.28)", borderBottom: "3px solid #CC1B33",
      }}>
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke="#D4A217" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - done / 13)} transform="rotate(-90 26 26)" />
        <text x="26" y="30" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">{done}/13</text>
      </svg>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#D4A217" }}>
          One FCC · Test drive
        </span>
        <span style={{ display: "block", fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.25 }}>
          Club Handbook · Have your say
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, fontSize: 12.5, color: "#AEBAE0", flexWrap: "wrap" }}>
          <span>{daysLeft} days left</span>
          <span style={{
            fontWeight: 800, padding: "2px 9px", borderRadius: 999,
            background: progress?.completed ? "#1F7A4D" : "rgba(255,255,255,.12)", color: "#fff",
          }}>{status}</span>
        </span>
      </span>
      <span aria-hidden="true" style={{ fontSize: 22, color: "#D4A217" }}>→</span>
      {urgent && <span aria-hidden="true" style={{ position: "absolute", top: 10, right: 10, width: 10, height: 10, borderRadius: "50%", background: "#CC1B33", boxShadow: "0 0 0 3px rgba(204,27,51,.3)" }} />}
    </button>
  );
}
