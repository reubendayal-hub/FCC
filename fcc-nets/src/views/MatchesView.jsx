// src/views/MatchesView.jsx
// ─────────────────────────────────────────────────────────────
// FCC Matches — list, create, and enter the scorer
// Follows exact patterns from other FCC views (Shell, AppHeader,
// BotNav, theme G from AppContext, Firestore onSnapshot)
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase";
import {
  collection, doc, onSnapshot, setDoc, serverTimestamp, deleteDoc, getDoc,
} from "firebase/firestore";
import Shell      from "../ui/Shell";
import AppHeader  from "../ui/AppHeader";
import BotNav     from "../ui/BotNav";
import Toast      from "../ui/Toast";
import { FCC_LOGO } from "../constants/logo";
import { can } from "../constants/roles";
import { finalizeMatchStats } from "../utils/finalizeMatchStats";

// Takeover constants — kept in sync with LiveScorerView.
const TAKEOVER_PIN = "4321";
const SCORER_LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const TAKEOVER_REQUEST_TIMEOUT_S = 30;

// Colours are hardcoded inline — no THEMES, no context, no import.
// Trade-off: MatchesView is locked to this palette regardless of the
// app theme. Chosen for reliability after repeated runtime failures
// reading G from useAppContext in production builds.
const G = {
  green:   "#1B2A5C",
  lime:    "#84cc16",
  white:   "#ffffff",
  bg:      "#f8fafc",
  card:    "#ffffff",
  border:  "#e2e8f0",
  text:    "#1e293b",
  muted:   "#64748b",
  red:     "#dc2626",
  redBg:   "#fef2f2",
  navy:    "#1B2A5C",
  gold:    "#C9A84C",
  goldDim: "rgba(201,168,76,0.12)",
};

// Match-type and status accents are brand-semantic, not theme-derived,
// so they stay as literals at module level (independent of theme G).
const NAVY = "#1B2A5C";

// Selected-state palette — used across toss buttons, elected-to,
// overs pills, match-type cards, squad chips. Distinct from the
// navy primary-action colour so users can tell "what I've chosen"
// apart from "what to tap next".
const SEL = {
  bg:     "#E0F2D6",
  border: "#27AE60",
  text:   "#1A5C28",
};
// Red squad palette — used for Team 2 chips in the SquadPicker step,
// so users can visually distinguish the two squads while picking.
// All other selected-state UI (toss, overs, match type) stays green-only.
const SEL_RED = {
  bg:     "#FCE4E4",
  border: "#C0392B",
  text:   "#8B1A1A",
};
const MATCH_TYPES = [
  { id:"internal", label:"FCC Internal",  desc:"Both teams from FCC squads",          icon:"🏏", savesStats:true,  color:"#1a6b38" },
  { id:"friendly", label:"FCC Friendly",  desc:"FCC vs external club — stats saved",  icon:"🤝", savesStats:true,  color:NAVY      },
  { id:"private",  label:"Private Game",  desc:"Custom teams — no profile saving",    icon:"🎮", savesStats:false, color:"#64748b" },
];
const OVERS_OPTIONS = [6, 10, 15, 20, 25, 40, 50];
const SQUAD_MAX = 15;
const STATUS_META = {
  setup:     { label:"Setup",     color:"#64748b", bg:"#f1f5f9" },
  live:      { label:"Live",      color:"#dc2626", bg:"#fef2f2" },
  completed: { label:"Complete",  color:"#1a6b38", bg:"#f0fdf4" },
  abandoned: { label:"Abandoned", color:"#64748b", bg:"#f1f5f9" },
};

function generateMatchId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// TASK 7 — format the date / time / range line for a match card.
// Three modes:
//   today  → "Today · 11:00 — 15:30"
//   past + setup status → "⏰ Scheduled to start 11:00"   (overdue)
//   future → "📅 Sat 18 May · 11:00 — 15:30"
function formatMatchSchedule(match) {
  const m = match.date ? new Date(match.date) : null;
  if (!m) return "—";
  const now = new Date();
  const isToday = m.toDateString() === now.toDateString();
  const isPast = m < new Date(now.toDateString());
  const timeRange = match.time
    ? `${match.time}${match.endTime ? ` — ${match.endTime}` : ""}`
    : "";
  if (isToday) return `Today${timeRange ? ` · ${timeRange}` : ""}`;
  if (isPast && match.status === "setup") {
    return `⏰ Scheduled to start ${match.time || "?"}`;
  }
  const dayName = m.toLocaleDateString("en-GB", { weekday: "short" });
  const dayNum  = m.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `📅 ${dayName} ${dayNum}${timeRange ? ` · ${timeRange}` : ""}`;
}

export default function MatchesView({
  view, setView, userRole, currentUser,
  members = [], teams = [], pendingCount = 0,
  toast, showToast, SidebarNav, handleLogout,
}) {
  const [matches,       setMatches]       = useState([]);
  const [loadingList,   setLoadingList]   = useState(true);
  const [screen,        setScreen]        = useState("list");
  const [activeMatchId, setActiveMatchId] = useState(null);

  // Takeover request flow state (Task 4c/4d)
  // takeoverMatch: the match being targeted; phase: "confirm"|"waiting"|"pin"
  const [takeoverMatch, setTakeoverMatch] = useState(null);
  const [takeoverPhase, setTakeoverPhase] = useState(null);
  const [takeoverError, setTakeoverError] = useState("");

  const meId = currentUser?.uid || currentUser?.id || null;

  function navigateToScorer(matchId) {
    setActiveMatchId(matchId);
    setView(`scorer-${matchId}`);
  }

  function requestScore(m) {
    const aId = m.activeScorerId || null;
    const aAt = m.activeScorerLastActiveAt;
    const aAtMs = aAt?.toMillis?.() ?? (aAt?.seconds ? aAt.seconds * 1000 : 0);
    const ageMs = aAtMs ? Date.now() - aAtMs : Infinity;
    // Free, mine, or stale lock — go straight in.
    if (!aId || aId === meId || ageMs > SCORER_LOCK_TIMEOUT_MS) {
      if (aId && aId !== meId && ageMs > SCORER_LOCK_TIMEOUT_MS) {
        const hrs = Math.floor(ageMs / (60 * 60 * 1000));
        const ok = window.confirm(`Score this match? Previous scorer was last active ${hrs} hour${hrs === 1 ? "" : "s"} ago.`);
        if (!ok) return;
      }
      navigateToScorer(m.id);
      return;
    }
    // Active lock by someone else — open takeover sheet.
    setTakeoverError("");
    setTakeoverMatch(m);
    setTakeoverPhase("confirm");
  }

  async function sendTakeoverRequest() {
    if (!takeoverMatch) return;
    try {
      await setDoc(doc(db, "fccscorer", "data", "matches", takeoverMatch.id), {
        takeoverRequest: {
          fromId: meId,
          fromName: currentUser?.name || null,
          requestedAt: serverTimestamp(),
        },
        takeoverDecision: null,
      }, { merge: true });
      setTakeoverPhase("waiting");
    } catch (e) {
      console.error("sendTakeoverRequest error:", e);
      setTakeoverError("Could not send request — try again.");
    }
  }

  async function claimScorer(matchId) {
    try {
      await setDoc(doc(db, "fccscorer", "data", "matches", matchId), {
        activeScorerId: meId,
        activeScorerName: currentUser?.name || null,
        activeScorerLastActiveAt: serverTimestamp(),
        takeoverRequest: null,
        takeoverDecision: null,
      }, { merge: true });
    } catch (e) {
      console.error("claimScorer error:", e);
    }
  }

  function closeTakeover() {
    setTakeoverMatch(null);
    setTakeoverPhase(null);
    setTakeoverError("");
  }

  async function approvedTakeover() {
    if (!takeoverMatch) return;
    const id = takeoverMatch.id;
    await claimScorer(id);
    closeTakeover();
    navigateToScorer(id);
  }

  async function pinTakeover(pin) {
    if (!takeoverMatch) return;
    if (pin !== TAKEOVER_PIN) {
      setTakeoverError("Incorrect PIN.");
      return;
    }
    const id = takeoverMatch.id;
    await claimScorer(id);
    closeTakeover();
    navigateToScorer(id);
  }

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "fccscorer", "data", "matches"),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMatches(docs);
        setLoadingList(false);
      },
      (err) => { console.error("Matches load error:", err); setLoadingList(false); }
    );
    return unsub;
  }, []);

  if (screen === "create") {
    return (
      <CreateMatchScreen
        teams={teams} members={members} currentUser={currentUser}
        onBack={() => setScreen("list")}
        onCreated={(matchId) => {
          showToast?.("Match created ✓");
          setActiveMatchId(matchId);
          setScreen("scorer");
        }}
        SidebarNav={SidebarNav} view={view} setView={setView}
        userRole={userRole} pendingCount={pendingCount}
        handleLogout={handleLogout} toast={toast}
      />
    );
  }

  if (screen === "scorer" && activeMatchId) {
    setView(`scorer-${activeMatchId}`);
    return null;
  }

  const liveMatches      = matches.filter(m => m.status === "live");
  const upcomingMatches  = matches.filter(m => m.status === "setup");
  const completedMatches = matches.filter(m => m.status === "completed" || m.status === "abandoned");
  const canCreate = ["superadmin","admin","captain","vicecaptain","coach","member"].includes(userRole);

  return (
    <Shell G={G} sidebar={
      <SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO} />
    }>
      <AppHeader title="ScorePro" sub="Score · Watch · Stats"
        currentUser={currentUser} handleLogout={handleLogout} />

      <div style={{ padding:"16px 14px", paddingBottom:100 }}>
        {canCreate && (
          <button onClick={() => setScreen("create")} style={{
            width:"100%", padding:"14px 16px", borderRadius:14,
            background:`linear-gradient(135deg,${G.green} 0%,#14532d 100%)`,
            border:"none", cursor:"pointer", display:"flex",
            alignItems:"center", gap:12, marginBottom:20,
            boxShadow:"0 4px 16px rgba(26,107,56,0.35)",
          }}>
            <div style={{ width:36, height:36, borderRadius:10,
              background:"rgba(255,255,255,0.15)", display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:20 }}>🏏</div>
            <div style={{ flex:1, textAlign:"left" }}>
              <div style={{ fontSize:15, fontWeight:800, color:G.white }}>New Match</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>Set up scoring for a new game</div>
            </div>
            <span style={{ fontSize:18, color:"rgba(255,255,255,0.5)" }}>›</span>
          </button>
        )}

        {liveMatches.length > 0 && (
          <Section G={G} label="🔴 Live now">
            {liveMatches.map(m => (
              <MatchCard key={m.id} G={G} match={m}
                onScore={() => requestScore(m)}
                onWatch={() => { setActiveMatchId(m.id); setView(`live-${m.id}`); }}
                currentUser={currentUser} userRole={userRole} showToast={showToast} />
            ))}
          </Section>
        )}
        {upcomingMatches.length > 0 && (
          <Section G={G} label="📅 Upcoming">
            {upcomingMatches.map(m => (
              <MatchCard key={m.id} G={G} match={m}
                onScore={() => requestScore(m)}
                onWatch={() => { setActiveMatchId(m.id); setView(`live-${m.id}`); }}
                currentUser={currentUser} userRole={userRole} showToast={showToast} />
            ))}
          </Section>
        )}
        {completedMatches.length > 0 && (
          <Section G={G} label="✅ Recent results">
            {completedMatches.slice(0,10).map(m => (
              <MatchCard key={m.id} G={G} match={m}
                onScore={() => requestScore(m)}
                onWatch={() => { setActiveMatchId(m.id); setView(`live-${m.id}`); }}
                currentUser={currentUser} userRole={userRole} showToast={showToast} />
            ))}
          </Section>
        )}
        {!loadingList && matches.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 24px", color:G.muted }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏏</div>
            <div style={{ fontSize:16, fontWeight:700, color:G.text, marginBottom:6 }}>No matches yet</div>
            <div style={{ fontSize:13, lineHeight:1.5 }}>Create a new match to start scoring</div>
          </div>
        )}
        {loadingList && (
          <div style={{ textAlign:"center", padding:40, color:G.muted, fontSize:13 }}>Loading matches…</div>
        )}
      </div>

      <BotNav G={G} view="scorelive" setView={setView} userRole={userRole}
        pendingCount={pendingCount} currentUser={currentUser} teams={teams} />
      {toast && <Toast msg={toast} G={G} />}

      {/* Takeover flow: confirm sheet → waiting → PIN entry */}
      {takeoverMatch && (
        <TakeoverSheet
          phase={takeoverPhase}
          match={takeoverMatch}
          error={takeoverError}
          onClose={closeTakeover}
          onRequest={sendTakeoverRequest}
          onApproved={approvedTakeover}
          onPinSubmit={pinTakeover}
          onTimeout={() => setTakeoverPhase("pin")}
        />
      )}
    </Shell>
  );
}

// ── Takeover sheet (confirm + waiting + PIN) ─────────────────
function TakeoverSheet({ phase, match, error, onClose, onRequest, onApproved, onPinSubmit, onTimeout }) {
  const [secondsLeft, setSecondsLeft] = useState(TAKEOVER_REQUEST_TIMEOUT_S);
  const [pinInput, setPinInput] = useState("");
  const [decision, setDecision] = useState(null); // "approved"|"denied"|null
  const [decisionFromName, setDecisionFromName] = useState("");

  // Compute minutes since active scorer last beat for the confirm copy.
  const aAt = match.activeScorerLastActiveAt;
  const aAtMs = aAt?.toMillis?.() ?? (aAt?.seconds ? aAt.seconds * 1000 : 0);
  const minsAgo = aAtMs ? Math.max(0, Math.floor((Date.now() - aAtMs) / 60000)) : null;

  // Waiting-phase: countdown ticker
  useEffect(() => {
    if (phase !== "waiting") return;
    setSecondsLeft(TAKEOVER_REQUEST_TIMEOUT_S);
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(t);
          onTimeout?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Subscribe to the match doc for takeoverDecision
  useEffect(() => {
    if (phase !== "waiting") return;
    const unsub = onSnapshot(doc(db, "fccscorer", "data", "matches", match.id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.takeoverDecision === "approved") {
        setDecision("approved");
        setTimeout(() => onApproved?.(), 600);
      } else if (data.takeoverDecision === "denied") {
        setDecision("denied");
        setDecisionFromName(data.activeScorerName || "The scorer");
      }
    });
    return unsub;
  }, [phase, match.id]);

  const wrap = {
    position: "fixed", inset: 0, zIndex: 800,
    background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  };
  const card = {
    width: "100%", maxWidth: 420, background: "#fff",
    borderRadius: "20px 20px 0 0", padding: "20px 18px 28px",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
  };

  // Confirm phase
  if (phase === "confirm") {
    return (
      <div style={wrap} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={card}>
          <div style={{ width: 36, height: 4, background: "#cbd5e1", borderRadius: 2, margin: "0 auto 14px" }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1B2A5C", marginBottom: 4, textAlign: "center" }}>
            Currently being scored by {match.activeScorerName || "another scorer"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18, textAlign: "center" }}>
            {minsAgo != null ? `Last active ${minsAgo} min ago` : "Last active recently"}
          </div>
          {error && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10, textAlign: "center" }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "12px 12px", borderRadius: 10,
              background: "#fff", border: "1.5px solid #e2e8f0", color: "#64748b",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={onRequest} style={{
              flex: 1, padding: "12px 12px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#1B2A5C,#152043)",
              color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
            }}>Request takeover</button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting phase
  if (phase === "waiting") {
    if (decision === "denied") {
      return (
        <div style={wrap} onClick={(e) => e.target === e.currentTarget && onClose()}>
          <div style={card}>
            <div style={{ width: 36, height: 4, background: "#cbd5e1", borderRadius: 2, margin: "0 auto 14px" }} />
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 6 }}>🚫</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#dc2626", textAlign: "center", marginBottom: 16 }}>
              {decisionFromName} denied your request
            </div>
            <button onClick={onClose} style={{
              width: "100%", padding: "12px 12px", borderRadius: 10, border: "none",
              background: "#1B2A5C", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>Close</button>
          </div>
        </div>
      );
    }
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ width: 36, height: 4, background: "#cbd5e1", borderRadius: 2, margin: "0 auto 14px" }} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2A5C", textAlign: "center", marginBottom: 6 }}>
            Waiting for {match.activeScorerName || "the scorer"} to approve…
          </div>
          <div style={{
            fontSize: 56, fontWeight: 900, color: "#C9A84C",
            textAlign: "center", margin: "8px 0", fontVariantNumeric: "tabular-nums",
          }}>{secondsLeft}s</div>
          <div onClick={onTimeout} style={{
            textAlign: "center", fontSize: 12, color: "#64748b",
            textDecoration: "underline", cursor: "pointer", marginTop: 8, marginBottom: 14,
          }}>Enter PIN to force takeover</div>
          <button onClick={onClose} style={{
            width: "100%", padding: "12px 12px", borderRadius: 10,
            background: "#fff", border: "1.5px solid #e2e8f0", color: "#64748b",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>Cancel</button>
        </div>
      </div>
    );
  }

  // PIN phase
  if (phase === "pin") {
    return (
      <div style={wrap} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={card}>
          <div style={{ width: 36, height: 4, background: "#cbd5e1", borderRadius: 2, margin: "0 auto 14px" }} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2A5C", textAlign: "center", marginBottom: 6 }}>
            No response — enter PIN to force takeover
          </div>
          <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 14 }}>
            4-digit PIN required
          </div>
          <input value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            type="tel" inputMode="numeric" autoFocus
            placeholder="••••"
            style={{
              width: "100%", padding: "14px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0",
              fontSize: 26, textAlign: "center", letterSpacing: 8, fontWeight: 800,
              boxSizing: "border-box", outline: "none", color: "#1B2A5C", marginBottom: 10,
            }} />
          {error && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 8, textAlign: "center" }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "12px 12px", borderRadius: 10,
              background: "#fff", border: "1.5px solid #e2e8f0", color: "#64748b",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={() => onPinSubmit?.(pinInput)} disabled={pinInput.length !== 4} style={{
              flex: 1, padding: "12px 12px", borderRadius: 10, border: "none",
              background: pinInput.length === 4 ? "linear-gradient(135deg,#dc2626,#991b1b)" : "#e2e8f0",
              color: pinInput.length === 4 ? "#fff" : "#94a3b8",
              fontWeight: 800, fontSize: 14, cursor: pinInput.length === 4 ? "pointer" : "not-allowed",
            }}>Take over</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function Section({ G, label, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:800, color:G.muted,
        textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>{label}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{children}</div>
    </div>
  );
}

// ── Delete-match confirm sheet ────────────────────────────────
// Reuses the same bottom-sheet pattern as TakeoverSheet so deletion
// feels consistent across destructive actions. Live matches get an
// extra warning since the active scorer will be locked out instantly.
function DeleteMatchSheet({ G, match, dateStr, deleting, onCancel, onConfirm }) {
  const isLive = match.status === "live";
  const title = match.title || "Untitled match";
  const wrap = {
    position:"fixed", inset:0, zIndex:900,
    background:"rgba(0,0,0,0.55)",
    display:"flex", alignItems:"flex-end", justifyContent:"center",
  };
  const card = {
    width:"100%", maxWidth:420, background:"#fff",
    borderRadius:"20px 20px 0 0", padding:"20px 18px 28px",
    boxShadow:"0 -8px 40px rgba(0,0,0,0.3)",
  };
  return (
    <div style={wrap} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={card}>
        <div style={{ width:36, height:4, background:"#cbd5e1", borderRadius:2, margin:"0 auto 14px" }} />
        <div style={{ fontSize:16, fontWeight:800, color:G.text, marginBottom:6, textAlign:"center" }}>
          Delete this match?
        </div>
        <div style={{ fontSize:13, color:G.muted, lineHeight:1.5, marginBottom:12, textAlign:"center" }}>
          {title} · {dateStr}. This permanently removes all scoring data and cannot be undone.
        </div>
        {isLive && (
          <div style={{
            fontSize:12, color:"#92400e", background:"#fffbeb",
            border:"1px solid #fde68a", borderRadius:8,
            padding:"8px 10px", lineHeight:1.4, marginBottom:14, textAlign:"left",
          }}>⚠️ This match is currently being scored. The scorer will be locked out immediately.</div>
        )}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} disabled={deleting} style={{
            flex:1, padding:"12px 12px", borderRadius:10,
            background:"#fff", border:`1.5px solid ${G.border}`, color:G.muted,
            fontWeight:700, fontSize:14, cursor:deleting?"default":"pointer",
            opacity:deleting?0.5:1,
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex:1, padding:"12px 12px", borderRadius:10, border:"none",
            background:deleting ? "#e2e8f0" : "linear-gradient(135deg,#dc2626,#991b1b)",
            color:deleting ? "#94a3b8" : "#fff",
            fontWeight:800, fontSize:14, cursor:deleting?"default":"pointer",
          }}>{deleting ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ G, match, onScore, onWatch, currentUser, userRole, showToast }) {
  const st = STATUS_META[match.status] || STATUS_META.setup;
  const mt = MATCH_TYPES.find(t => t.id === match.type) || MATCH_TYPES[1];
  const meId = currentUser?.uid || currentUser?.id || null;
  const isScorer = match.scorerIds?.includes(meId) || match.createdBy === meId;
  const isLive   = match.status === "live";
  const isSetup  = match.status === "setup";
  const isDone   = match.status === "completed" || match.status === "abandoned";
  const dateStr  = match.date
    ? new Date(match.date).toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" })
    : "—";
  // TASK 7 — friendly schedule line (today / future / past+setup variants).
  const scheduleStr = formatMatchSchedule(match);
  // Resume gating (Task 3b): only show pulsing-red RESUME for the last scorer.
  const isMyResume = isLive && match.lastScorerId && meId && match.lastScorerId === meId;
  const scoreLabel = isMyResume ? "Resume scoring →" : "Score →";

  // Deletion gating: admins always; otherwise the original creator.
  const isAdmin   = can(userRole, "accessMembers");
  const isCreator = match.createdBy === meId;
  const canDelete = isAdmin || isCreator;
  // Recompute gating: admins or creator, only on completed matches.
  // (Abandoned matches intentionally not eligible — their stats were
  // intentionally not finalised when abandoned, and recompute would
  // imply they should be — better to surface that as a separate flow.)
  const canRecompute = (isAdmin || isCreator) && match.status === "completed";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmRecompute, setConfirmRecompute] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  async function performDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "fccscorer", "data", "matches", match.id));
      showToast?.("Match deleted");
      setConfirmDelete(false);
    } catch (e) {
      console.error("Match delete error:", e);
      showToast?.(`Could not delete: ${e.message || e.code || "error"}`);
    } finally {
      setDeleting(false);
    }
  }

  async function performRecompute() {
    if (recomputing) return;
    setRecomputing(true);
    try {
      const snap = await getDoc(doc(db, "fccscorer", "data", "matches", match.id));
      if (!snap.exists()) {
        showToast?.("Match not found");
        return;
      }
      const matchData = { ...snap.data(), matchId: match.id };
      const result = await finalizeMatchStats({
        db,
        matchData,
        abandoned: matchData.abandoned === true,
        force: true,
      });
      const n = result?.playersUpdated || 0;
      showToast?.(`Stats recomputed for ${n} player${n === 1 ? "" : "s"}`);
      if (Array.isArray(result?.skipped) && result.skipped.length > 0) {
        console.log("Recompute skipped (not in roster):", result.skipped);
        // Stagger a follow-up so both toasts are visible.
        setTimeout(() => {
          showToast?.(`Skipped: ${result.skipped.join(", ")}`);
        }, 1200);
      }
      setConfirmRecompute(false);
    } catch (e) {
      console.error("Recompute error:", e);
      showToast?.(`Recompute failed: ${e.message || e.code || "error"}`);
    } finally {
      setRecomputing(false);
    }
  }

  return (
    <div style={{ background:G.white, borderRadius:14, position:"relative",
      border:`1.5px solid ${isLive ? "#fca5a5" : G.border}`, overflow:"hidden",
      boxShadow:isLive ? "0 2px 12px rgba(220,38,38,0.12)" : "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ padding:"10px 14px",
        background:isLive ? "linear-gradient(90deg,#fef2f2,#fff)" : G.white,
        borderBottom:`1px solid ${G.border}`,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>{mt.icon}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:G.text,
              maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {match.title || "Untitled match"}
            </div>
            <div style={{ fontSize:11, color:G.muted }}>{scheduleStr} · {match.overs||"?"} ov</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20,
            background:st.bg, color:st.color }}>{st.label}</span>
          {canDelete && (
            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              title="Delete match"
              style={{
                width:24, height:24, borderRadius:6,
                background:"transparent", border:`1px solid ${G.border}`,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                color:G.muted, fontSize:12, lineHeight:1, padding:0,
              }}>🗑️</button>
          )}
        </div>
      </div>
      {confirmDelete && (
        <DeleteMatchSheet
          G={G}
          match={match}
          dateStr={dateStr}
          deleting={deleting}
          onCancel={() => !deleting && setConfirmDelete(false)}
          onConfirm={performDelete}
        />
      )}

      {(isLive || isDone) && match.innings1 && (
        <div style={{ padding:"8px 14px", borderBottom:`1px solid ${G.border}`,
          fontSize:12, color:G.text, display:"flex", gap:16 }}>
          <span style={{ fontWeight:700 }}>
            {match.innings1?.team}: {match.innings1?.score}/{match.innings1?.wickets}
            <span style={{ fontWeight:400, color:G.muted }}> ({match.innings1?.overs} ov)</span>
          </span>
          {match.innings2 && (
            <span style={{ fontWeight:700 }}>
              {match.innings2?.team}: {match.innings2?.score}/{match.innings2?.wickets}
              <span style={{ fontWeight:400, color:G.muted }}> ({match.innings2?.overs} ov)</span>
            </span>
          )}
        </div>
      )}
      {isDone && match.result && (
        <div style={{ padding:"6px 14px", fontSize:12, fontWeight:700, color:G.green,
          borderBottom:`1px solid ${G.border}` }}>{match.result}</div>
      )}

      {isLive && (
        <>
          <style>{`@keyframes cardPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.85)} }`}</style>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 14px 0" }}>
            {isMyResume ? (
              <>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#dc2626",
                  animation:"cardPulse 1.4s ease-in-out infinite" }} />
                <div style={{ fontSize:10, fontWeight:800, color:"#dc2626", letterSpacing:1.2 }}>
                  RESUME SCORING
                </div>
              </>
            ) : (
              <>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#dc2626" }} />
                <div style={{ fontSize:10, fontWeight:700, color:"#dc2626", letterSpacing:1 }}>
                  Live
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ padding:"10px 14px", display:"flex", gap:8 }}>
        {(isScorer || isMyResume) && !isDone && (
          <button onClick={onScore} style={{ flex:1, padding:"9px 12px", borderRadius:9,
            background:isMyResume
              ? "linear-gradient(135deg,#dc2626,#991b1b)"
              : isSetup
                ? `linear-gradient(135deg,${G.navy},#152043)`
                : `linear-gradient(135deg,${G.green},#14532d)`,
            border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:G.white }}>
            {isSetup ? "Start scoring →" : scoreLabel}
          </button>
        )}
        <button onClick={onWatch} style={{
          flex:(isScorer || isMyResume) && !isDone ? "0 0 auto" : 1,
          padding:"9px 14px", borderRadius:9,
          background:G.bg, border:`1.5px solid ${G.border}`,
          cursor:"pointer", fontSize:13, fontWeight:600, color:G.muted }}>
          {isDone ? "Scorecard" : "👁 Watch"}
        </button>
      </div>
      {canRecompute && (
        <div style={{ padding:"0 14px 10px", marginTop:-4, display:"flex", justifyContent:"flex-end" }}>
          <button
            onClick={() => setConfirmRecompute(true)}
            title="Re-runs the stats calculation from this match's events"
            style={{
              background:"transparent", border:"none", padding:0, cursor:"pointer",
              fontSize:11, fontWeight:600, color:G.gold, textDecoration:"underline",
              opacity:0.85,
            }}>
            ↻ Recompute stats
          </button>
        </div>
      )}
      {confirmRecompute && (
        <RecomputeStatsSheet
          G={G}
          match={match}
          recomputing={recomputing}
          onCancel={() => !recomputing && setConfirmRecompute(false)}
          onConfirm={performRecompute}
        />
      )}
    </div>
  );
}

function RecomputeStatsSheet({ G, match, recomputing, onCancel, onConfirm }) {
  const title = match.title || "Untitled match";
  const wrap = {
    position:"fixed", inset:0, zIndex:900,
    background:"rgba(0,0,0,0.55)",
    display:"flex", alignItems:"flex-end", justifyContent:"center",
  };
  const card = {
    width:"100%", maxWidth:420, background:"#fff",
    borderRadius:"20px 20px 0 0", padding:"20px 18px 28px",
    boxShadow:"0 -8px 40px rgba(0,0,0,0.3)",
  };
  return (
    <div style={wrap} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={card}>
        <div style={{ width:36, height:4, background:"#cbd5e1", borderRadius:2, margin:"0 auto 14px" }} />
        <div style={{ fontSize:16, fontWeight:800, color:G.text, marginBottom:6, textAlign:"center" }}>
          Recompute career stats?
        </div>
        <div style={{ fontSize:13, color:G.muted, lineHeight:1.5, marginBottom:12, textAlign:"center" }}>
          {title}. Re-runs the stats calculation from this match&rsquo;s events. If career numbers have already been written for this match, they&rsquo;ll be added again.
        </div>
        <div style={{
          fontSize:12, color:"#92400e", background:"#fffbeb",
          border:"1px solid #fde68a", borderRadius:8,
          padding:"8px 10px", lineHeight:1.4, marginBottom:14, textAlign:"left",
        }}>
          ⚠️ Career counters are incremental — running this on an already-finalised match will inflate totals. Use only to backfill matches that were missed.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} disabled={recomputing} style={{
            flex:1, padding:"12px 12px", borderRadius:10,
            background:"#fff", border:`1.5px solid ${G.border}`, color:G.muted,
            fontWeight:700, fontSize:14, cursor:recomputing?"default":"pointer",
            opacity:recomputing?0.5:1,
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={recomputing} style={{
            flex:1, padding:"12px 12px", borderRadius:10, border:"none",
            background:recomputing ? "#e2e8f0" : `linear-gradient(135deg,${G.gold},#9e8638)`,
            color:recomputing ? "#94a3b8" : "#fff",
            fontWeight:800, fontSize:14, cursor:recomputing?"default":"pointer",
          }}>{recomputing ? "Recomputing…" : "Recompute"}</button>
        </div>
      </div>
    </div>
  );
}

function CreateMatchScreen({
  teams, members, currentUser, onBack, onCreated,
  SidebarNav, view, setView, userRole, pendingCount, handleLogout, toast,
}) {
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const [title,  setTitle]  = useState("");
  const [date,   setDate]   = useState(new Date().toISOString().slice(0,10));
  const [time,   setTime]   = useState("11:00");
  const [endTime,setEndTime]= useState("");
  const [venue,  setVenue]  = useState("");
  const [overs,  setOvers]  = useState(20);

  // TASK 4 — auto-suggest match end time from overs + start time.
  // T20 → +3.5h, 50-over → +8h etc. Kicks in only when user leaves
  // the end-time field blank; otherwise their entry wins.
  const autoEndTime = useMemo(() => {
    if (!time) return "";
    const addHours = overs <= 10 ? 2 : overs <= 20 ? 3.5 : overs <= 35 ? 5 : 8;
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return "";
    const start = new Date(2000, 0, 1, h, m);
    const end = new Date(start.getTime() + addHours * 60 * 60 * 1000);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }, [time, overs]);
  const [type,   setType]   = useState("friendly");
  const [team1Name, setTeam1Name] = useState("FCC");
  const [team2Name, setTeam2Name] = useState("");
  const [fccTeam,   setFccTeam]   = useState("");
  const [fccTeam2,  setFccTeam2]  = useState("");
  const [toss,      setToss]      = useState("");
  const [elected,   setElected]   = useState("bat");
  const [squad1, setSquad1] = useState([]);
  const [squad2, setSquad2] = useState([]);
  const allTeams = teams.map(t => t.name);

  useEffect(() => {
    if (!fccTeam) return;
    setSquad1(members.filter(m => (m.teams||[]).includes(fccTeam)).map(m => m.name));
  }, [fccTeam, members]);

  useEffect(() => {
    if (!fccTeam2) return;
    setSquad2(members.filter(m => (m.teams||[]).includes(fccTeam2)).map(m => m.name));
  }, [fccTeam2, members]);

  // Display names — prefer dropdown-picked FCC team, fall back to typed value.
  // Used for labels, summaries, and the saved title/team fields.
  const team1Display = fccTeam  || team1Name;
  const team2Display = fccTeam2 || team2Name;

  async function handleCreate() {
    setSaving(true); setErr("");
    try {
      const matchId = generateMatchId();
      await setDoc(doc(db, "fccscorer", "data", "matches", matchId), {
        matchId, title: title || `${team1Display} vs ${team2Display}`,
        date, time, endTime: endTime || autoEndTime || null,
        venue, overs, type,
        team1: team1Display, team2: team2Display,
        fccTeam: fccTeam || null, fccTeam2: fccTeam2 || null,
        squad1, squad2,
        toss: toss || null, elected: elected || null,
        status: "setup",
        scorerIds: [currentUser?.uid].filter(Boolean),
        createdBy: currentUser?.uid || null,
        createdByName: currentUser?.name || null,
        createdAt: serverTimestamp(),
        innings1: null, innings2: null, result: null,
      });
      onCreated(matchId);
    } catch (e) {
      setErr(`Failed to create match: ${e.code} — ${e.message}`);
      console.error("Match creation error:", e);
    } finally { setSaving(false); }
  }

  const STEPS = ["Basics","Teams","Squads","Confirm"];

  return (
    <Shell G={G} sidebar={
      <SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO} />
    }>
      <AppHeader title="New Match" sub="Step by step setup"
        currentUser={currentUser} handleLogout={handleLogout} onBack={onBack} />

      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${G.border}`, background:G.white }}>
        {STEPS.map((s,i) => {
          const active = step === i+1, done = step > i+1;
          return (
            <div key={s} onClick={() => done && setStep(i+1)} style={{
              flex:1, textAlign:"center", padding:"10px 4px",
              fontSize:11, fontWeight:active?800:600,
              color:active?G.green:done?G.green:G.muted,
              borderBottom:active?`3px solid ${G.green}`:"3px solid transparent",
              cursor:done?"pointer":"default", transition:"all .15s",
            }}>{done?"✓ ":""}{s}</div>
          );
        })}
      </div>

      <div style={{ padding:"20px 14px", paddingBottom:100 }}>
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <FieldGroup G={G} label="Match title (optional)">
              <input value={title} onChange={e=>setTitle(e.target.value)}
                placeholder={`${team1Display||"FCC"} vs ${team2Display||"Opponent"}`} style={inputStyle}/>
            </FieldGroup>
            <FieldGroup G={G} label="Date">
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/>
            </FieldGroup>
            <FieldGroup G={G} label="Start time">
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inputStyle}/>
            </FieldGroup>
            <FieldGroup G={G} label="Expected end time (optional)">
              <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}
                placeholder={autoEndTime} style={inputStyle}/>
              <div style={{ fontSize:11, color:G.muted, marginTop:6 }}>
                We'll suggest <strong>{autoEndTime || "—"}</strong> based on format if you skip
              </div>
            </FieldGroup>
            <FieldGroup G={G} label="Venue">
              <input value={venue} onChange={e=>setVenue(e.target.value)}
                placeholder="Ground name" style={inputStyle}/>
            </FieldGroup>
            <FieldGroup G={G} label="Overs per innings">
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {OVERS_OPTIONS.map(o => (
                  <button key={o} onClick={()=>setOvers(o)} style={{
                    padding:"8px 16px", borderRadius:20,
                    border:`${overs===o?2:1.5}px solid ${overs===o?SEL.border:G.border}`,
                    background:overs===o?SEL.bg:G.white,
                    color:overs===o?SEL.text:G.text,
                    fontWeight:700, fontSize:13, cursor:"pointer" }}>{o}</button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup G={G} label="Match type">
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {MATCH_TYPES.map(mt => (
                  <button key={mt.id} onClick={()=>setType(mt.id)} style={{
                    padding:"12px 14px", borderRadius:12, cursor:"pointer",
                    border:`${type===mt.id?2:1.5}px solid ${type===mt.id?SEL.border:G.border}`,
                    background:type===mt.id?SEL.bg:G.white,
                    display:"flex", alignItems:"center", gap:12, textAlign:"left" }}>
                    <span style={{ fontSize:22 }}>{mt.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:type===mt.id?SEL.text:G.text }}>{mt.label}</div>
                      <div style={{ fontSize:12, color:G.muted }}>{mt.desc}{mt.savesStats?" · Stats saved":" · Stats not saved"}</div>
                    </div>
                    {type===mt.id && <span style={{ color:SEL.text, fontSize:18, fontWeight:700 }}>✓</span>}
                  </button>
                ))}
              </div>
            </FieldGroup>
            <NavButtons G={G} onNext={()=>setStep(2)} nextLabel="Next: Teams →" nextDisabled={!date}/>
          </div>
        )}

        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <FieldGroup G={G} label="Team 1 (your side)">
              <input value={team1Name} onChange={e=>setTeam1Name(e.target.value)}
                placeholder="Team name" style={inputStyle}/>
              {type !== "private" && <>
                <div style={{ fontSize:11, color:G.muted, marginTop:6, marginBottom:4 }}>Pull squad from FCC team:</div>
                <select value={fccTeam} onChange={e=>setFccTeam(e.target.value)} style={inputStyle}>
                  <option value="">— enter squad manually —</option>
                  {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </>}
            </FieldGroup>
            <FieldGroup G={G} label="Team 2 (opposition)">
              <input value={team2Name} onChange={e=>setTeam2Name(e.target.value)}
                placeholder={type==="internal"?"FCC team name":"Opponent club name"} style={inputStyle}/>
              {type === "internal" && <>
                <div style={{ fontSize:11, color:G.muted, marginTop:6, marginBottom:4 }}>Pull squad from FCC team:</div>
                <select value={fccTeam2} onChange={e=>setFccTeam2(e.target.value)} style={inputStyle}>
                  <option value="">— enter squad manually —</option>
                  {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </>}
            </FieldGroup>
            <FieldGroup G={G} label="Toss (optional — can set later)">
              <div style={{ display:"flex", gap:8 }}>
                {[team1Display||"Team 1", team2Display||"Team 2"].map((t, i) => (
                  <button key={`${i}-${t}`} onClick={()=>setToss(t)} style={{
                    flex:1, padding:"10px 8px", borderRadius:10,
                    border:`${toss===t?2:1.5}px solid ${toss===t?SEL.border:G.border}`,
                    background:toss===t?SEL.bg:G.white,
                    color:toss===t?SEL.text:G.text,
                    fontWeight:toss===t?700:600, fontSize:13, cursor:"pointer" }}>{t} won toss</button>
                ))}
              </div>
              {toss && (
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  {["bat","field"].map(e => (
                    <button key={e} onClick={()=>setElected(e)} style={{
                      flex:1, padding:"10px 8px", borderRadius:10,
                      border:`${elected===e?2:1.5}px solid ${elected===e?SEL.border:G.border}`,
                      background:elected===e?SEL.bg:G.white,
                      color:elected===e?SEL.text:G.text,
                      fontWeight:elected===e?700:600, fontSize:13, cursor:"pointer" }}>Elected to {e}</button>
                  ))}
                </div>
              )}
            </FieldGroup>
            <NavButtons G={G} onBack={()=>setStep(1)} onNext={()=>setStep(3)}
              nextLabel="Next: Squads →" nextDisabled={
                type === "internal"
                  ? (!team1Name || (!team2Name && !fccTeam2))
                  : (!team1Name || !team2Name)
              }/>
          </div>
        )}

        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <SquadPicker G={G} label={`${team1Display||"Team 1"} squad`} hint="Tap members or type names below"
              allMembers={members} squad={squad1} setSquad={setSquad1} colorActive={G.green}
              selPalette={SEL}/>
            <SquadPicker G={G} label={`${team2Display||"Team 2"} squad`}
              hint={type==="internal"?"Select FCC members":"Enter player names"}
              allMembers={type==="internal"?members:[]}
              squad={squad2} setSquad={setSquad2} colorActive={NAVY}
              allowCustom={type!=="internal"}
              selPalette={SEL_RED}/>
            <NavButtons G={G} onBack={()=>setStep(2)} onNext={()=>setStep(4)} nextLabel="Review →"/>
          </div>
        )}

        {step === 4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <SummaryRow G={G} label="Match" value={title||`${team1Display} vs ${team2Display}`}/>
            <SummaryRow G={G} label="Date" value={`${new Date(date).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})} at ${time}`}/>
            {venue && <SummaryRow G={G} label="Venue" value={venue}/>}
            <SummaryRow G={G} label="Overs" value={`${overs} per innings`}/>
            <SummaryRow G={G} label="Type" value={MATCH_TYPES.find(t=>t.id===type)?.label}/>
            {toss && <SummaryRow G={G} label="Toss" value={`${toss} won, elected to ${elected}`}/>}
            <SummaryRow G={G} label={`${team1Display||"Team 1"} squad`} value={squad1.length>0?`${squad1.length} selected`:"Not set"}/>
            <SummaryRow G={G} label={`${team2Display||"Team 2"} squad`} value={squad2.length>0?`${squad2.length} selected`:"Not set"}/>
            {MATCH_TYPES.find(t=>t.id===type)?.savesStats
              ? <div style={{ background:G.green+"10", border:`1px solid ${G.green}30`, borderRadius:10, padding:"10px 12px", fontSize:12, color:G.green, fontWeight:600 }}>✓ Batting and bowling stats will be saved to player profiles</div>
              : <div style={{ background:"#f1f5f9", border:`1px solid ${G.border}`, borderRadius:10, padding:"10px 12px", fontSize:12, color:G.muted }}>Stats will not be saved to profiles for this match type</div>
            }
            {err && <div style={{ background:G.redBg, border:`1px solid ${G.red}30`, borderRadius:10, padding:"10px 12px", fontSize:12, color:G.red }}>{err}</div>}
            <NavButtons G={G} onBack={()=>setStep(3)} onNext={handleCreate}
              nextLabel={saving?"Creating…":"🏏 Create & start scoring"}
              nextDisabled={saving} nextColor={G.green}/>
          </div>
        )}
      </div>
      {toast && <Toast msg={toast} G={G}/>}
    </Shell>
  );
}

function SquadPicker({ G, label, hint, allMembers, squad, setSquad, colorActive, allowCustom=true, selPalette=SEL }) {
  const [customInput, setCustomInput] = useState("");
  function toggleMember(name) {
    setSquad(prev => {
      if (prev.includes(name)) return prev.filter(n=>n!==name);
      if (prev.length >= SQUAD_MAX) return prev;
      return [...prev, name];
    });
  }
  function addCustom() {
    const name = customInput.trim();
    if (name && !squad.includes(name) && squad.length < SQUAD_MAX) {
      setSquad(prev=>[...prev,name]);
    }
    setCustomInput("");
  }
  const atMax = squad.length >= SQUAD_MAX;
  return (
    <div>
      <div style={{ fontSize:13, fontWeight:700, color:G.text, marginBottom:4 }}>
        {label}
        <span style={{ marginLeft:8, fontSize:11, fontWeight:600, color:selPalette.border }}>
          {squad.length} selected
        </span>
      </div>
      <div style={{ fontSize:11, color:G.muted, marginBottom:10 }}>{hint} (max {SQUAD_MAX})</div>
      {squad.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
          {squad.map(name => (
            <button key={name} onClick={()=>toggleMember(name)} style={{
              padding:"5px 10px", borderRadius:20, background:selPalette.bg,
              border:`2px solid ${selPalette.border}`, color:selPalette.text, fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {name} ✕
            </button>
          ))}
        </div>
      )}
      {allMembers.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
          {allMembers.map(m => {
            const sel = squad.includes(m.name);
            const disabled = !sel && atMax;
            return (
              <button key={m.id} onClick={()=>toggleMember(m.name)} disabled={disabled} style={{
                padding:"8px 10px", borderRadius:9,
                cursor:disabled?"not-allowed":"pointer",
                opacity:disabled?0.4:1,
                border:`${sel?2:1.5}px solid ${sel?selPalette.border:G.border}`,
                background:sel?selPalette.bg:G.white, color:sel?selPalette.text:G.text,
                fontSize:12, fontWeight:sel?700:400, textAlign:"left",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {sel?"✓ ":""}{m.name}
              </button>
            );
          })}
        </div>
      )}
      {allowCustom && (
        <div style={{ display:"flex", gap:8 }}>
          <input value={customInput} onChange={e=>setCustomInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addCustom()}
            disabled={atMax}
            placeholder={atMax ? `Squad full (${SQUAD_MAX})` : "Add player by name…"}
            style={{...inputStyle,flex:1,marginBottom:0, opacity:atMax?0.5:1}}/>
          <button onClick={addCustom} disabled={atMax} style={{
            padding:"10px 14px", borderRadius:9, background:colorActive,
            border:"none", color:G.white, fontWeight:700, fontSize:13,
            cursor:atMax?"not-allowed":"pointer", opacity:atMax?0.5:1 }}>Add</button>
        </div>
      )}
    </div>
  );
}

function FieldGroup({ G, label, children }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:800, color:G.muted,
        textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}

function SummaryRow({ G, label, value }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      padding:"10px 12px", borderRadius:10, background:G.bg, border:`1px solid ${G.border}`, gap:12 }}>
      <span style={{ fontSize:12, color:G.muted, fontWeight:600, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, color:G.text, fontWeight:700, textAlign:"right" }}>{value||"—"}</span>
    </div>
  );
}

function NavButtons({ G, onBack, onNext, nextLabel="Next →", nextDisabled=false, nextColor }) {
  const color = nextColor || G.green;
  return (
    <div style={{ display:"flex", gap:10, marginTop:8 }}>
      {onBack && (
        <button onClick={onBack} style={{ padding:"12px 20px", borderRadius:10,
          background:G.white, border:`1.5px solid ${G.border}`,
          color:G.muted, fontWeight:700, fontSize:13, cursor:"pointer" }}>← Back</button>
      )}
      <button onClick={nextDisabled?undefined:onNext} style={{
        flex:1, padding:"12px 20px", borderRadius:10, border:"none",
        background:nextDisabled?G.border:`linear-gradient(135deg,${color},${color}cc)`,
        color:nextDisabled?G.muted:G.white, fontWeight:800, fontSize:14,
        cursor:nextDisabled?"default":"pointer",
        boxShadow:nextDisabled?"none":`0 4px 12px ${color}44` }}>{nextLabel}</button>
    </div>
  );
}

const inputStyle = {
  width:"100%", padding:"10px 12px", borderRadius:9,
  border:`1.5px solid #e2e8f0`, fontSize:14,
  color:"#1e293b", background:"#ffffff", fontFamily:"inherit",
  outline:"none", boxSizing:"border-box",
};
