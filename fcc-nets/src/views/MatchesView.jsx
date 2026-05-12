// src/views/MatchesView.jsx
// ─────────────────────────────────────────────────────────────
// FCC Matches — list, create, and enter the scorer
// Follows exact patterns from other FCC views (Shell, AppHeader,
// BotNav, theme G from AppContext, Firestore onSnapshot)
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, doc, onSnapshot, setDoc, serverTimestamp,
} from "firebase/firestore";
import Shell      from "../ui/Shell";
import AppHeader  from "../ui/AppHeader";
import BotNav     from "../ui/BotNav";
import Toast      from "../ui/Toast";
import { useAppContext } from "../context/AppContext";
import { FCC_LOGO } from "../constants/logo";

// Match-type and status accents are brand-semantic, not theme-derived,
// so they stay as literals at module level (independent of theme G).
const NAVY = "#1B2A5C";
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

export default function MatchesView({
  view, setView, userRole, currentUser,
  members = [], teams = [], pendingCount = 0,
  toast, showToast, SidebarNav, handleLogout,
}) {
  const { G } = useAppContext();
  const [matches,       setMatches]       = useState([]);
  const [loadingList,   setLoadingList]   = useState(true);
  const [screen,        setScreen]        = useState("list");
  const [activeMatchId, setActiveMatchId] = useState(null);

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
      <AppHeader title="Score & Live" sub="Score · Watch · Stats"
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
                onScore={() => { setActiveMatchId(m.id); setView(`scorer-${m.id}`); }}
                onWatch={() => { setActiveMatchId(m.id); setView(`live-${m.id}`); }}
                currentUser={currentUser} />
            ))}
          </Section>
        )}
        {upcomingMatches.length > 0 && (
          <Section G={G} label="📅 Upcoming">
            {upcomingMatches.map(m => (
              <MatchCard key={m.id} G={G} match={m}
                onScore={() => { setActiveMatchId(m.id); setView(`scorer-${m.id}`); }}
                onWatch={() => { setActiveMatchId(m.id); setView(`live-${m.id}`); }}
                currentUser={currentUser} />
            ))}
          </Section>
        )}
        {completedMatches.length > 0 && (
          <Section G={G} label="✅ Recent results">
            {completedMatches.slice(0,10).map(m => (
              <MatchCard key={m.id} G={G} match={m}
                onScore={() => { setActiveMatchId(m.id); setView(`scorer-${m.id}`); }}
                onWatch={() => { setActiveMatchId(m.id); setView(`live-${m.id}`); }}
                currentUser={currentUser} />
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
      {toast && <Toast msg={toast} />}
    </Shell>
  );
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

function MatchCard({ G, match, onScore, onWatch, currentUser }) {
  const st = STATUS_META[match.status] || STATUS_META.setup;
  const mt = MATCH_TYPES.find(t => t.id === match.type) || MATCH_TYPES[1];
  const isScorer = match.scorerIds?.includes(currentUser?.uid) || match.createdBy === currentUser?.uid;
  const isLive   = match.status === "live";
  const isDone   = match.status === "completed" || match.status === "abandoned";
  const dateStr  = match.date
    ? new Date(match.date).toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" })
    : "—";

  return (
    <div style={{ background:G.white, borderRadius:14,
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
            <div style={{ fontSize:11, color:G.muted }}>{dateStr} · {match.overs||"?"} ov</div>
          </div>
        </div>
        <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20,
          background:st.bg, color:st.color }}>{st.label}</span>
      </div>

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

      <div style={{ padding:"10px 14px", display:"flex", gap:8 }}>
        {isScorer && !isDone && (
          <button onClick={onScore} style={{ flex:1, padding:"9px 12px", borderRadius:9,
            background:isLive
              ? "linear-gradient(135deg,#dc2626,#991b1b)"
              : `linear-gradient(135deg,${G.green},#14532d)`,
            border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:G.white }}>
            {isLive ? "▶ Continue scoring" : "▶ Start scoring"}
          </button>
        )}
        <button onClick={onWatch} style={{
          flex:isScorer && !isDone ? "0 0 auto" : 1,
          padding:"9px 14px", borderRadius:9,
          background:G.bg, border:`1.5px solid ${G.border}`,
          cursor:"pointer", fontSize:13, fontWeight:600, color:G.muted }}>
          {isDone ? "Scorecard" : "👁 Watch"}
        </button>
      </div>
    </div>
  );
}

function CreateMatchScreen({
  teams, members, currentUser, onBack, onCreated,
  SidebarNav, view, setView, userRole, pendingCount, handleLogout, toast,
}) {
  const { G } = useAppContext();
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const [title,  setTitle]  = useState("");
  const [date,   setDate]   = useState(new Date().toISOString().slice(0,10));
  const [time,   setTime]   = useState("11:00");
  const [venue,  setVenue]  = useState("");
  const [overs,  setOvers]  = useState(20);
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

  async function handleCreate() {
    setSaving(true); setErr("");
    try {
      const matchId = generateMatchId();
      await setDoc(doc(db, "fccscorer", "data", "matches", matchId), {
        matchId, title: title || `${team1Name} vs ${team2Name}`,
        date, time, venue, overs, type,
        team1: team1Name, team2: team2Name,
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
      setErr("Failed to create match. Please try again.");
      console.error(e);
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
                placeholder={`FCC vs ${team2Name||"Opponent"}`} style={inputStyle}/>
            </FieldGroup>
            <FieldGroup G={G} label="Date">
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/>
            </FieldGroup>
            <FieldGroup G={G} label="Start time">
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inputStyle}/>
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
                    border:`1.5px solid ${overs===o?G.green:G.border}`,
                    background:overs===o?G.green:G.white,
                    color:overs===o?G.white:G.text,
                    fontWeight:700, fontSize:13, cursor:"pointer" }}>{o}</button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup G={G} label="Match type">
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {MATCH_TYPES.map(mt => (
                  <button key={mt.id} onClick={()=>setType(mt.id)} style={{
                    padding:"12px 14px", borderRadius:12, cursor:"pointer",
                    border:`1.5px solid ${type===mt.id?mt.color:G.border}`,
                    background:type===mt.id?mt.color+"12":G.white,
                    display:"flex", alignItems:"center", gap:12, textAlign:"left" }}>
                    <span style={{ fontSize:22 }}>{mt.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:type===mt.id?mt.color:G.text }}>{mt.label}</div>
                      <div style={{ fontSize:12, color:G.muted }}>{mt.desc}{mt.savesStats?" · Stats saved":" · Stats not saved"}</div>
                    </div>
                    {type===mt.id && <span style={{ color:mt.color, fontSize:18, fontWeight:700 }}>✓</span>}
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
                {[team1Name||"Team 1", team2Name||"Team 2"].map(t => (
                  <button key={t} onClick={()=>setToss(t)} style={{
                    flex:1, padding:"10px 8px", borderRadius:10,
                    border:`1.5px solid ${toss===t?NAVY:G.border}`,
                    background:toss===t?NAVY+"12":G.white,
                    color:toss===t?NAVY:G.text,
                    fontWeight:600, fontSize:13, cursor:"pointer" }}>{t} won toss</button>
                ))}
              </div>
              {toss && (
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  {["bat","field"].map(e => (
                    <button key={e} onClick={()=>setElected(e)} style={{
                      flex:1, padding:"10px 8px", borderRadius:10,
                      border:`1.5px solid ${elected===e?G.green:G.border}`,
                      background:elected===e?G.green+"12":G.white,
                      color:elected===e?G.green:G.text,
                      fontWeight:600, fontSize:13, cursor:"pointer" }}>Elected to {e}</button>
                  ))}
                </div>
              )}
            </FieldGroup>
            <NavButtons G={G} onBack={()=>setStep(1)} onNext={()=>setStep(3)}
              nextLabel="Next: Squads →" nextDisabled={!team1Name||!team2Name}/>
          </div>
        )}

        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <SquadPicker G={G} label={`${team1Name} squad`} hint="Tap members or type names below"
              allMembers={members} squad={squad1} setSquad={setSquad1} colorActive={G.green}/>
            <SquadPicker G={G} label={`${team2Name} squad`}
              hint={type==="internal"?"Select FCC members":"Enter player names"}
              allMembers={type==="internal"?members:[]}
              squad={squad2} setSquad={setSquad2} colorActive={NAVY}
              allowCustom={type!=="internal"}/>
            <NavButtons G={G} onBack={()=>setStep(2)} onNext={()=>setStep(4)} nextLabel="Review →"/>
          </div>
        )}

        {step === 4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <SummaryRow G={G} label="Match" value={title||`${team1Name} vs ${team2Name}`}/>
            <SummaryRow G={G} label="Date" value={`${new Date(date).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})} at ${time}`}/>
            {venue && <SummaryRow G={G} label="Venue" value={venue}/>}
            <SummaryRow G={G} label="Overs" value={`${overs} per innings`}/>
            <SummaryRow G={G} label="Type" value={MATCH_TYPES.find(t=>t.id===type)?.label}/>
            {toss && <SummaryRow G={G} label="Toss" value={`${toss} won, elected to ${elected}`}/>}
            <SummaryRow G={G} label={`${team1Name} squad`} value={squad1.length>0?`${squad1.length} selected`:"Not set"}/>
            <SummaryRow G={G} label={`${team2Name} squad`} value={squad2.length>0?`${squad2.length} selected`:"Not set"}/>
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
      {toast && <Toast msg={toast}/>}
    </Shell>
  );
}

function SquadPicker({ G, label, hint, allMembers, squad, setSquad, colorActive, allowCustom=true }) {
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
        <span style={{ marginLeft:8, fontSize:11, fontWeight:600, color:colorActive }}>
          {squad.length} selected
        </span>
      </div>
      <div style={{ fontSize:11, color:G.muted, marginBottom:10 }}>{hint} (max {SQUAD_MAX})</div>
      {squad.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
          {squad.map(name => (
            <button key={name} onClick={()=>toggleMember(name)} style={{
              padding:"5px 10px", borderRadius:20, background:colorActive+"18",
              border:`1.5px solid ${colorActive}`, color:colorActive, fontSize:12, fontWeight:600, cursor:"pointer" }}>
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
                border:`1.5px solid ${sel?colorActive:G.border}`,
                background:sel?colorActive+"12":G.white, color:sel?colorActive:G.text,
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
