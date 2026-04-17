import React, { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// COACH COORDINATION HUB
// Converted from fredensborg_coach_hub.html to React component
// Uses real data from App.jsx (teams, fixtures, coaches)
// ═══════════════════════════════════════════════════════════════════════════════

// Design tokens - DARK theme
const DARK_THEME = {
  bg: "#0f1117",
  surface: "#181c27",
  surface2: "#1e2436",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.13)",
  text: "#e8eaf0",
  muted: "rgba(232,234,240,0.45)",
  dim: "rgba(232,234,240,0.2)",
  gold: "#c9a84c",
  goldDim: "rgba(201,168,76,0.18)",
  goldBorder: "rgba(201,168,76,0.45)",
  conflict: "#ef4444",
  conflictBg: "rgba(239,68,68,0.12)",
  warn: "#f59e0b",
  warnBg: "rgba(245,158,11,0.1)",
  ok: "#10b981",
  okBg: "rgba(16,185,129,0.1)",
  groundBlocked: "#8b5cf6",
  groundBlockedBg: "rgba(139,92,246,0.12)",
};

// Design tokens - LIGHT theme
const LIGHT_THEME = {
  bg: "#f8f9fb",
  surface: "#ffffff",
  surface2: "#f1f3f5",
  border: "rgba(0,0,0,0.08)",
  border2: "rgba(0,0,0,0.12)",
  text: "#1a1d24",
  muted: "rgba(26,29,36,0.55)",
  dim: "rgba(26,29,36,0.15)",
  gold: "#b8942e",
  goldDim: "rgba(184,148,46,0.12)",
  goldBorder: "rgba(184,148,46,0.35)",
  conflict: "#dc2626",
  conflictBg: "rgba(220,38,38,0.08)",
  warn: "#d97706",
  warnBg: "rgba(217,119,6,0.08)",
  ok: "#059669",
  okBg: "rgba(5,150,105,0.08)",
  groundBlocked: "#7c3aed",
  groundBlockedBg: "rgba(124,58,237,0.08)",
};

// Ground blocked dates (when Karlebo or other venues are unavailable)
// TODO: Move to Firestore for dynamic management
const GROUND_BLOCKED_DATES = [
  { date: "2026-04-25", venue: "Karlebo", reason: "Ground maintenance" },
  { date: "2026-05-01", venue: "Karlebo", reason: "Public holiday - ground closed" },
  { date: "2026-05-09", venue: "Karlebo", reason: "School event" },
  { date: "2026-06-20", venue: "Karlebo", reason: "Midsummer - ground closed" },
  { date: "2026-06-21", venue: "Karlebo", reason: "Midsummer - ground closed" },
];

// Generate a consistent color from a name (for coaches not in predefined list)
const stringToColor = (str) => {
  if (!str) return "#8b8fa8";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#3ecf8e", "#f59e0b", "#818cf8", "#38bdf8", "#f43f5e", "#a3e635", "#e879f9", "#fb923c", "#34d399"];
  return colors[Math.abs(hash) % colors.length];
};

// Predefined coach colors (for known coaches)
const PREDEFINED_COACH_COLORS = {
  "Zeb Pirzada": "#3ecf8e",
  "Rajesh Muthukumar": "#f59e0b",
  "Nitin Gupta": "#818cf8",
  "Aniket Sharma": "#38bdf8",
  "Reuben Dayal": "#f43f5e",
  "Arun Krishnamurthy": "#a3e635",
};

// Get coach color (predefined or generated)
const getCoachColor = (name) => PREDEFINED_COACH_COLORS[name] || stringToColor(name);

// Get short name (first name)
const getShortName = (fullName) => {
  if (!fullName) return "?";
  return fullName.split(" ")[0];
};

// Get initials
const getInitials = (fullName) => {
  if (!fullName) return "??";
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

// Team colors
const TEAM_COLORS = {
  U11: "#818cf8",
  U13: "#34d399",
  U15: "#38bdf8",
  "U15 Girls": "#f472b6",
  U16: "#a78bfa",
  U18: "#f87171",
  Kvinder: "#e879f9",
  "Women's": "#e879f9",
  Mens: "#94a3b8",
  "Div 2": "#f87171",
  "Div 3": "#fb923c",
  "Div 4": "#fbbf24",
  OB: "#a3e635",
};

// Division colors for matches
const DIVISION_COLORS = {
  "Div 2": "#f87171",
  "Div 3": "#fb923c",
  "Div 4": "#fbbf24",
  "Women's": "#e879f9",
  OB: "#a3e635",
  "T20 Serie 4": "#38bdf8",
  "T20 Serie 5": "#818cf8",
  U11: "#818cf8",
  U13: "#34d399",
  U15: "#38bdf8",
  U16: "#a78bfa",
  U18: "#f87171",
};

// Divisions each coach PLAYS IN (for conflict detection)
// TODO: This could be stored on member records in Firestore
const COACH_PLAYS_IN = {
  "Zeb Pirzada": ["Div 4", "OB"],
  "Rajesh Muthukumar": [], // plays at another club
  "Nitin Gupta": ["OB"],
  "Aniket Sharma": ["Div 3", "T20 Serie 5"],
  "Reuben Dayal": ["Div 3", "T20 Serie 4", "OB"],
  "Arun Krishnamurthy": ["Div 3", "T20 Serie 5", "OB"],
};

// Training sessions templates (outdoor season)
// These define the recurring schedule - coaches are pulled from teams data
const SESSION_TEMPLATES_OUTDOOR = [
  { id: "u11-sat", team: "U11", day: 5, time: "14:00–15:30", venue: "Karlebo" },
  { id: "u13-wed", team: "U13", day: 2, time: "16:30–18:00", venue: "Karlebo" },
  { id: "u13-sat", team: "U13", day: 5, time: "14:00–15:30", venue: "Karlebo" },
  { id: "u15-wed", team: "U15", day: 2, time: "16:30–18:00", venue: "Karlebo" },
  { id: "u15-sat", team: "U15", day: 5, time: "15:30–17:00", venue: "Karlebo" },
  { id: "u15g-fri", team: "U15 Girls", day: 4, time: "16:30–18:00", venue: "Karlebo" },
  { id: "kvinder-sat", team: "Kvinder", day: 5, time: "17:00–19:00", venue: "Karlebo" },
  { id: "div3-tue", team: "Div 3", day: 1, time: "17:00–19:00", venue: "Karlebo", label: "Div 3 Training" },
  { id: "div3-thu", team: "Div 3", day: 3, time: "17:00–19:00", venue: "Karlebo", label: "Div 3 Training" },
];

const SESSION_TEMPLATES_INDOOR = [
  { id: "u11-sat", team: "U11", day: 5, time: "14:00–15:30", venue: "Nivåhallen" },
  { id: "u13-tue", team: "U13", day: 1, time: "16:30–18:00", venue: "Egedalshallen" },
  { id: "u13-sat", team: "U13", day: 5, time: "14:00–15:30", venue: "Nivåhallen" },
  { id: "u15-tue", team: "U15", day: 1, time: "16:30–18:00", venue: "Egedalshallen" },
  { id: "u15-sat", team: "U15", day: 5, time: "15:30–17:00", venue: "Nivåhallen" },
  { id: "u15g-fri", team: "U15 Girls", day: 4, time: "16:30–18:00", venue: "Nivåhallen" },
  { id: "kvinder-sat", team: "Kvinder", day: 5, time: "17:00–19:00", venue: "Nivåhallen" },
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ───────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ───────────────────────────────────────────────────────────────────────────────
function getWeekStart(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

function fmtDate(d) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function fmtDateFull(d) {
  return `${DAY_NAMES_FULL[d.getDay()]}, ${fmtDate(d)}`;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ───────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────────────────────────────────────
export default function CoachCoordination({
  teams = [],
  allFixtures = [],
  blockedDates = [], // Ground blocked dates from Admin Panel
  currentUser = null, // Current logged in user
  coachOverrides = {}, // {date_sessionId: {newCoach, oldCoach, assignedBy}}
  recurring = [], // Recurring training slots from App.jsx
  members = [], // Members for COACH_PLAYS_IN derivation
  onBack,
  onReassign, // Callback to save reassignment: (sessionId, date, newCoach, oldCoach) => void
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [currentMode, setCurrentMode] = useState("outdoor");
  const [currentView, setCurrentView] = useState("schedule"); // schedule | matches | conflicts | overview
  const [focusCoach, setFocusCoach] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [reassignModal, setReassignModal] = useState(null); // {session, date, conflicts}
  const [darkMode, setDarkMode] = useState(true); // Light/dark mode toggle
  const [notifyModal, setNotifyModal] = useState(null); // {newCoach, session, date} for WhatsApp notification
  const [selectedReassignCoach, setSelectedReassignCoach] = useState(null); // Track selected coach in modal
  
  // Theme based on dark mode
  const theme = darkMode ? {
    bg: "#0f1117",
    surface: "#181c27",
    surface2: "#1e2436",
    border: "rgba(255,255,255,0.07)",
    border2: "rgba(255,255,255,0.13)",
    text: "#e8eaf0",
    muted: "rgba(232,234,240,0.45)",
    dim: "rgba(232,234,240,0.2)",
    gold: "#c9a84c",
    goldDim: "rgba(201,168,76,0.18)",
    goldBorder: "rgba(201,168,76,0.45)",
    conflict: "#ef4444",
    conflictBg: "rgba(239,68,68,0.12)",
    warn: "#f59e0b",
    warnBg: "rgba(245,158,11,0.1)",
    ok: "#10b981",
    blocked: "#6366f1",
    blockedBg: "rgba(99,102,241,0.12)",
  } : {
    bg: "#f8fafc",
    surface: "#ffffff",
    surface2: "#f1f5f9",
    border: "rgba(0,0,0,0.08)",
    border2: "rgba(0,0,0,0.12)",
    text: "#1e293b",
    muted: "rgba(30,41,59,0.5)",
    dim: "rgba(30,41,59,0.25)",
    gold: "#b8860b",
    goldDim: "rgba(184,134,11,0.12)",
    goldBorder: "rgba(184,134,11,0.35)",
    conflict: "#dc2626",
    conflictBg: "rgba(220,38,38,0.08)",
    warn: "#d97706",
    warnBg: "rgba(217,119,6,0.08)",
    ok: "#059669",
    blocked: "#4f46e5",
    blockedBg: "rgba(79,70,229,0.08)",
  };
  
  // Get blocked dates for a specific day
  const getBlockedOnDay = (date) => {
    const ds = toDateStr(date);
    return blockedDates.filter(b => b.date === ds);
  };
  
  // Build coaches list from teams data - filter out empty/null names
  const coachesWithTeams = useMemo(() => {
    const coachMap = new Map(); // name -> {name, teams: [], color}
    teams.forEach(t => {
      (t.coaches || []).forEach(c => {
        if (!c || c.trim() === "" || c === "NA") return; // Skip empty names
        if (!coachMap.has(c)) {
          coachMap.set(c, { name: c, teams: [], color: getCoachColor(c) });
        }
        coachMap.get(c).teams.push(t.name);
      });
    });
    return Array.from(coachMap.values());
  }, [teams]);
  
  const coaches = coachesWithTeams.map(c => c.name);
  
  // Build COACH_PLAYS_IN dynamically from members data
  // Maps coach name -> array of divisions they play in
  const coachPlaysIn = useMemo(() => {
    const mapping = {};
    // Find coaches from teams
    const allCoaches = new Set();
    teams.forEach(t => (t.coaches || []).forEach(c => c && allCoaches.add(c)));
    
    // For each coach, find which teams/divisions they play in (as a player)
    allCoaches.forEach(coachName => {
      const member = members.find(m => m.name === coachName);
      if (member?.teams) {
        // Map team names to divisions
        const divs = member.teams.map(t => {
          if (t.includes("Div") || t.includes("Division")) return t;
          if (t === "Fredensborg 2") return "3. Div";
          if (t === "Fredensborg 3") return "4. Div";
          if (t.includes("T20")) return t;
          if (t === "Legends" || t === "OB") return t;
          return null;
        }).filter(Boolean);
        if (divs.length > 0) mapping[coachName] = divs;
      }
    });
    
    // Fallback to hardcoded if no members data
    if (Object.keys(mapping).length === 0) {
      return COACH_PLAYS_IN;
    }
    return mapping;
  }, [teams, members]);
  
  // Build sessions from recurring slots (if available) or fallback to templates
  const sessions = useMemo(() => {
    // If we have real recurring data, use it
    if (recurring.length > 0) {
      return recurring
        .filter(slot => slot.enabled)
        .map(slot => {
          // Find the team to get its coaches
          const teamName = slot.team || (slot.teams && slot.teams[0]);
          const team = teams.find(t => t.name === teamName);
          const teamCoaches = team?.coaches?.filter(c => c && c.trim() !== "") || [];
          
          return {
            id: slot.id,
            team: teamName,
            day: slot.day, // 0=Sun, 1=Mon, etc - need to adjust if different
            time: `${slot.from}–${slot.to}`,
            venue: "Karlebo", // Default venue
            coach: teamCoaches[0] || null,
            coCoach: teamCoaches[1] || null,
            coCoach2: teamCoaches[2] || null,
            label: slot.name || `${teamName} Training`,
          };
        });
    }
    
    // Fallback to hardcoded templates
    const templates = currentMode === "outdoor" ? SESSION_TEMPLATES_OUTDOOR : SESSION_TEMPLATES_INDOOR;
    
    return templates.map(template => {
      // Find the team to get its coaches
      const team = teams.find(t => t.name === template.team);
      const teamCoaches = team?.coaches?.filter(c => c && c.trim() !== "") || [];
      
      return {
        ...template,
        coach: teamCoaches[0] || null,
        coCoach: teamCoaches[1] || null,
        coCoach2: teamCoaches[2] || null,
        label: template.label || `${template.team} Training`,
      };
    });
  }, [currentMode, teams, recurring]);
  
  // Get effective coach for a session on a specific date (checking overrides)
  const getEffectiveCoach = (session, date) => {
    const dateStr = toDateStr(date);
    const overrideKey = `${dateStr}_${session.id}`;
    const override = coachOverrides[overrideKey];
    if (override?.newCoach) {
      return override.newCoach;
    }
    return session.coach;
  };
  
  // Check if a session has been reassigned on a specific date
  const hasOverride = (session, date) => {
    const dateStr = toDateStr(date);
    const overrideKey = `${dateStr}_${session.id}`;
    return !!coachOverrides[overrideKey];
  };
  
  // Week days
  const weekDays = useMemo(() => {
    const days = [];
    for (let d = 0; d < 7; d++) {
      days.push(addDays(currentWeekStart, d));
    }
    return days;
  }, [currentWeekStart]);
  
  // Get matches on a specific day
  const getMatchesOnDay = (date) => {
    const ds = toDateStr(date);
    return allFixtures.filter(m => m.date === ds);
  };
  
  // Get conflicts for a session on a given day
  const getConflictsForSession = (session, date) => {
    const dayMatches = getMatchesOnDay(date);
    const coach = session.coach;
    const coCoach = session.coCoach;
    const coCoach2 = session.coCoach2;
    
    const playerDivs = coachPlaysIn[coach] || [];
    const coPlayerDivs = coCoach ? (coachPlaysIn[coCoach] || []) : [];
    const co2PlayerDivs = coCoach2 ? (coachPlaysIn[coCoach2] || []) : [];
    
    return dayMatches.filter(m => {
      // Playing conflict: coach/co-coach plays in this division
      const playingConflict = m.division && playerDivs.includes(m.division);
      const coPlayingConflict = coCoach && m.division && coPlayerDivs.includes(m.division);
      const co2PlayingConflict = coCoach2 && m.division && co2PlayerDivs.includes(m.division);
      return playingConflict || coPlayingConflict || co2PlayingConflict;
    }).map(m => ({
      ...m,
      conflictCoach: playerDivs.includes(m.division) ? coach :
                     coPlayerDivs.includes(m.division) ? coCoach :
                     co2PlayerDivs.includes(m.division) ? coCoach2 : null,
    }));
  };
  
  // Get all conflicts in current week
  const weekConflicts = useMemo(() => {
    const conflicts = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(currentWeekStart, d);
      const dateStr = toDateStr(date);
      sessions.forEach(s => {
        if (s.day === d && s.coach) { // Only check sessions with assigned coaches
          // Check if there's an override for this session (conflict already resolved)
          const overrideKey = `${dateStr}_${s.id}`;
          if (coachOverrides[overrideKey]) {
            // Conflict was resolved via reassignment, skip it
            return;
          }
          
          const cs = getConflictsForSession(s, date);
          if (cs.length > 0) {
            conflicts.push({ session: s, date, matches: cs });
          }
        }
      });
    }
    return conflicts;
  }, [currentWeekStart, sessions, allFixtures, coachOverrides]);
  
  // Navigate weeks
  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()));
  
  // Toggle coach focus
  const toggleCoachFocus = (coach) => {
    setFocusCoach(focusCoach === coach ? null : coach);
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: theme.bg,
      minHeight: "100vh",
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      color: theme.text,
      fontSize: 13,
    }}>
      {/* Header */}
      <header style={{
        background: theme.surface,
        borderBottom: `1px solid ${theme.goldBorder}`,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 52,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: theme.muted,
            fontSize: 20,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          ←
        </button>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: theme.text,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          FCC
          <span style={{
            background: theme.gold,
            color: "#0f1117",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.1em",
            padding: "2px 6px",
            borderRadius: 2,
          }}>
            COACH HUB
          </span>
        </div>
        
        {/* Mode toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button
            onClick={() => setCurrentMode("outdoor")}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600,
              background: currentMode === "outdoor" ? theme.goldDim : "transparent",
              border: `1px solid ${currentMode === "outdoor" ? theme.goldBorder : theme.border}`,
              color: currentMode === "outdoor" ? theme.gold : theme.muted,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            🌳 Outdoor
          </button>
          <button
            onClick={() => setCurrentMode("indoor")}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600,
              background: currentMode === "indoor" ? theme.goldDim : "transparent",
              border: `1px solid ${currentMode === "indoor" ? theme.goldBorder : theme.border}`,
              color: currentMode === "indoor" ? theme.gold : theme.muted,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            🏠 Indoor
          </button>
          
          {/* Dark/Light mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: "6px 10px",
              fontSize: 14,
              background: "transparent",
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              cursor: "pointer",
              marginLeft: 8,
            }}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>
      
      {/* Nav tabs */}
      <div style={{
        display: "flex",
        gap: 0,
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        padding: "0 16px",
        overflowX: "auto",
      }}>
        {[
          { id: "schedule", label: "Schedule", icon: "📅" },
          { id: "overview", label: "Overview", icon: "👥" },
          { id: "matches", label: "Matches", icon: "🏏" },
          { id: "conflicts", label: "Conflicts", icon: "⚠️", count: weekConflicts.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            style={{
              padding: "12px 16px",
              fontSize: 12,
              fontWeight: 600,
              background: "transparent",
              border: "none",
              borderBottom: currentView === tab.id ? `2px solid ${theme.gold}` : "2px solid transparent",
              color: currentView === tab.id ? theme.gold : theme.muted,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: theme.conflict,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 8,
                marginLeft: 4,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Conflict banner */}
      {weekConflicts.length > 0 && currentView === "schedule" && (
        <div style={{
          background: theme.conflictBg,
          borderBottom: `1px solid ${theme.conflict}40`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 12, color: theme.conflict, fontWeight: 600 }}>
            {weekConflicts.length} conflict{weekConflicts.length > 1 ? "s" : ""} this week — coach on match duty
          </span>
          <button
            onClick={() => setCurrentView("conflicts")}
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              background: "transparent",
              border: `1px solid ${theme.conflict}60`,
              color: theme.conflict,
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            View →
          </button>
        </div>
      )}
      
      {/* Week navigation + coach filter (Schedule view) */}
      {currentView === "schedule" && (
        <>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: theme.surface,
            borderBottom: `1px solid ${theme.border}`,
          }}>
            <button onClick={prevWeek} style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "transparent",
              border: `1px solid ${theme.border}`,
              color: theme.text,
              borderRadius: 6,
              cursor: "pointer",
            }}>
              ← Prev
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
                {fmtDate(weekDays[0])} – {fmtDate(weekDays[6])}
              </div>
              <button onClick={goToToday} style={{
                background: "none",
                border: "none",
                color: theme.gold,
                fontSize: 11,
                cursor: "pointer",
                textDecoration: "underline",
              }}>
                Jump to today
              </button>
            </div>
            <button onClick={nextWeek} style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "transparent",
              border: `1px solid ${theme.border}`,
              color: theme.text,
              borderRadius: 6,
              cursor: "pointer",
            }}>
              Next →
            </button>
          </div>
          
          {/* Coach filter pills */}
          <div style={{
            display: "flex",
            gap: 8,
            padding: "12px 16px",
            overflowX: "auto",
            background: theme.surface2,
            borderBottom: `1px solid ${theme.border}`,
          }}>
            <span style={{ fontSize: 11, color: theme.muted, alignSelf: "center", marginRight: 4 }}>
              Filter:
            </span>
            {coaches.map(coach => {
              const isActive = focusCoach === null || focusCoach === coach;
              const color = getCoachColor(coach) || theme.muted;
              return (
                <button
                  key={coach}
                  onClick={() => toggleCoachFocus(coach)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    background: isActive ? `${color}20` : "transparent",
                    border: `1.5px solid ${isActive ? color : theme.border}`,
                    color: isActive ? color : theme.dim,
                    borderRadius: 20,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {getShortName(coach)}
                </button>
              );
            })}
          </div>
        </>
      )}
      
      {/* Main content */}
      <div style={{ padding: "16px" }}>
        {/* SCHEDULE VIEW */}
        {currentView === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {weekDays.map((date, dayIdx) => {
              const daySessions = sessions.filter(s => s.day === dayIdx);
              const dayMatches = getMatchesOnDay(date);
              const dayBlocked = getBlockedOnDay(date);
              const isToday = toDateStr(date) === toDateStr(new Date());
              const isBlocked = dayBlocked.length > 0;
              
              // Filter sessions by focused coach
              const visibleSessions = focusCoach
                ? daySessions.filter(s => 
                    s.coach === focusCoach || 
                    s.coCoach === focusCoach || 
                    s.coCoach2 === focusCoach
                  )
                : daySessions;
              
              if (visibleSessions.length === 0 && dayMatches.length === 0 && !isBlocked) return null;
              
              return (
                <div key={dayIdx} style={{
                  background: theme.surface,
                  border: `1px solid ${isBlocked ? theme.blocked : isToday ? theme.gold : theme.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}>
                  {/* Day header */}
                  <div style={{
                    padding: "10px 14px",
                    background: isBlocked ? theme.blockedBg : isToday ? theme.goldDim : theme.surface2,
                    borderBottom: `1px solid ${theme.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isBlocked ? theme.blocked : isToday ? theme.gold : theme.text,
                      }}>
                        {DAY_NAMES[dayIdx]}
                      </span>
                      <span style={{
                        fontSize: 12,
                        color: theme.muted,
                        marginLeft: 8,
                      }}>
                        {fmtDate(date)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {isBlocked && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: theme.blocked,
                          background: theme.blockedBg,
                          padding: "2px 8px",
                          borderRadius: 10,
                          border: `1px solid ${theme.blocked}40`,
                        }}>
                          🚫 GROUND BLOCKED
                        </span>
                      )}
                      {isToday && !isBlocked && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: theme.gold,
                          background: theme.goldDim,
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}>
                          TODAY
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Blocked date details */}
                  {isBlocked && (
                    <div style={{
                      padding: "10px 14px",
                      background: theme.blockedBg,
                      borderBottom: `1px solid ${theme.border}`,
                    }}>
                      {dayBlocked.map((b, i) => (
                        <div key={i} style={{
                          fontSize: 11,
                          color: theme.blocked,
                          marginBottom: i < dayBlocked.length - 1 ? 4 : 0,
                        }}>
                          {b.reason || "Ground unavailable"}{b.time ? ` (${b.time})` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Sessions */}
                  <div style={{ padding: "10px 14px" }}>
                    {visibleSessions.map(session => {
                      const conflicts = getConflictsForSession(session, date);
                      const hasConflict = conflicts.length > 0;
                      const teamColor = TEAM_COLORS[session.team] || theme.muted;
                      const effectiveCoach = getEffectiveCoach(session, date);
                      const coachColor = getCoachColor(effectiveCoach) || theme.muted;
                      const isReassigned = hasOverride(session, date);
                      
                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSession(selectedSession === session.id ? null : session.id)}
                          style={{
                            padding: "10px 12px",
                            marginBottom: 8,
                            background: hasConflict ? theme.conflictBg : theme.surface2,
                            border: `1px solid ${hasConflict ? theme.conflict + "40" : isReassigned ? theme.ok + "40" : theme.border}`,
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {/* Team badge */}
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              background: `${teamColor}20`,
                              border: `2px solid ${teamColor}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 800,
                              color: teamColor,
                            }}>
                              {session.team}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
                                {session.team} Training
                              </div>
                              <div style={{ fontSize: 11, color: theme.muted }}>
                                {session.time} · {session.venue}
                              </div>
                            </div>
                            
                            {/* Coach avatars */}
                            <div style={{ display: "flex", gap: -6 }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: coachColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#fff",
                                border: `2px solid ${theme.surface}`,
                              }}>
                                {getShortName(effectiveCoach).slice(0, 2).toUpperCase()}
                              </div>
                              {session.coCoach && !isReassigned && (
                                <div style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: getCoachColor(session.coCoach) || theme.muted,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#fff",
                                  border: `2px solid ${theme.surface}`,
                                  marginLeft: -8,
                                }}>
                                  {getShortName(session.coCoach).slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            {/* Reassigned indicator */}
                            {isReassigned && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: theme.ok,
                                background: `${theme.ok}20`,
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}>
                                ✓ Reassigned
                              </span>
                            )}
                            
                            {/* Conflict indicator */}
                            {hasConflict && (
                              <span style={{
                                fontSize: 16,
                                marginLeft: 4,
                              }}>
                                ⚠️
                              </span>
                            )}
                          </div>
                          
                          {/* Conflict details with Reassign button */}
                          {hasConflict && selectedSession === session.id && (
                            <div style={{
                              marginTop: 10,
                              padding: "10px",
                              background: theme.conflictBg,
                              borderRadius: 6,
                              border: `1px solid ${theme.conflict}30`,
                            }}>
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 6,
                              }}>
                                <div style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: theme.conflict,
                                }}>
                                  ⚠️ Match Conflict
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReassignModal({ session, date, conflicts });
                                  }}
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: theme.gold + "20",
                                    border: `1px solid ${theme.goldBorder}`,
                                    color: theme.gold,
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  Reassign →
                                </button>
                              </div>
                              {conflicts.map((match, i) => (
                                <div key={i} style={{
                                  fontSize: 11,
                                  color: theme.text,
                                  marginBottom: 4,
                                }}>
                                  • <strong style={{ color: getCoachColor(match.conflictCoach) }}>
                                    {getShortName(match.conflictCoach)}
                                  </strong> playing: {match.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Day matches */}
                    {dayMatches.length > 0 && (
                      <div style={{
                        marginTop: visibleSessions.length > 0 ? 8 : 0,
                        padding: "8px 10px",
                        background: `${theme.gold}10`,
                        borderRadius: 6,
                        border: `1px dashed ${theme.goldBorder}`,
                      }}>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: theme.gold,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}>
                          🏏 {dayMatches.length} Match{dayMatches.length > 1 ? "es" : ""}
                        </div>
                        {dayMatches.slice(0, 3).map((match, i) => (
                          <div key={i} style={{
                            fontSize: 11,
                            color: theme.muted,
                            marginBottom: 2,
                          }}>
                            <span style={{
                              color: DIVISION_COLORS[match.division] || theme.muted,
                              fontWeight: 600,
                            }}>
                              {match.division}
                            </span>
                            {" — "}{match.label.replace(match.division + " ", "")}
                          </div>
                        ))}
                        {dayMatches.length > 3 && (
                          <div style={{ fontSize: 10, color: theme.muted, marginTop: 4 }}>
                            +{dayMatches.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* MATCHES VIEW */}
        {currentView === "matches" && (
          <div>
            <div style={{
              fontSize: 12,
              color: theme.muted,
              marginBottom: 16,
            }}>
              All {allFixtures.length} Fredensborg matches for 2026 season
            </div>
            
            {/* Group by month */}
            {(() => {
              const byMonth = {};
              allFixtures.forEach(m => {
                const month = m.date.slice(0, 7);
                if (!byMonth[month]) byMonth[month] = [];
                byMonth[month].push(m);
              });
              
              return Object.entries(byMonth).map(([month, matches]) => (
                <div key={month} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.gold,
                    marginBottom: 10,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                  
                  {matches.map((match, i) => {
                    const divColor = DIVISION_COLORS[match.division] || theme.muted;
                    return (
                      <div key={i} style={{
                        padding: "10px 12px",
                        background: match.home ? theme.surface : theme.surface2,
                        border: `1px solid ${match.home ? theme.goldBorder : theme.border}`,
                        borderRadius: 8,
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}>
                        <div style={{
                          width: 50,
                          fontSize: 11,
                          fontWeight: 600,
                          color: theme.muted,
                        }}>
                          {new Date(match.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                        </div>
                        
                        <div style={{
                          padding: "3px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          background: `${divColor}20`,
                          color: divColor,
                          borderRadius: 4,
                          minWidth: 60,
                          textAlign: "center",
                        }}>
                          {match.division}
                        </div>
                        
                        <div style={{ flex: 1, fontSize: 12, color: theme.text }}>
                          {match.label.replace(match.division + " ", "")}
                        </div>
                        
                        {match.home && (
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: theme.gold,
                            background: theme.goldDim,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}>
                            HOME
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        )}
        
        {/* CONFLICTS VIEW */}
        {currentView === "conflicts" && (
          <div>
            {weekConflicts.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "40px 20px",
                color: theme.muted,
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.ok }}>
                  No conflicts this week
                </div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  All coaches are available for their scheduled sessions
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: 12,
                  color: theme.muted,
                  marginBottom: 16,
                }}>
                  {weekConflicts.length} training session{weekConflicts.length > 1 ? "s" : ""} affected this week
                </div>
                
                {weekConflicts.map((conflict, i) => (
                  <div key={i} style={{
                    padding: "14px",
                    background: theme.conflictBg,
                    border: `1px solid ${theme.conflict}40`,
                    borderRadius: 10,
                    marginBottom: 12,
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: `${TEAM_COLORS[conflict.session.team]}20`,
                        border: `2px solid ${TEAM_COLORS[conflict.session.team]}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        color: TEAM_COLORS[conflict.session.team],
                      }}>
                        {conflict.session.team}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
                          {conflict.session.team} Training
                        </div>
                        <div style={{ fontSize: 11, color: theme.muted }}>
                          {fmtDateFull(conflict.date)} · {conflict.session.time}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      background: theme.surface,
                      borderRadius: 6,
                      padding: "10px",
                    }}>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: theme.conflict,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}>
                        ⚠️ Conflict Details
                      </div>
                      {conflict.matches.map((match, j) => (
                        <div key={j} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                        }}>
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: getCoachColor(match.conflictCoach) || theme.muted,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#fff",
                          }}>
                            {getShortName(match.conflictCoach)?.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ fontSize: 11, color: theme.text }}>
                            <strong style={{ color: getCoachColor(match.conflictCoach) }}>
                              {getShortName(match.conflictCoach)}
                            </strong>
                            {" playing "}
                            <span style={{ color: DIVISION_COLORS[match.division] }}>
                              {match.division}
                            </span>
                            {" — "}{match.label.replace(match.division + " ", "")}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Reassign button */}
                    <button
                      onClick={() => setReassignModal({ 
                        session: conflict.session, 
                        date: conflict.date, 
                        conflicts: conflict.matches 
                      })}
                      style={{
                        width: "100%",
                        marginTop: 12,
                        padding: "10px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        background: theme.gold,
                        color: "#1a1a1a",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontFamily: "'IBM Plex Mono', monospace",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      🔄 Reassign Coach
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        
        {/* OVERVIEW VIEW - Coach heatmap */}
        {currentView === "overview" && (
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: theme.muted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 16,
            }}>
              Coach Overview — This Week
            </div>
            
            {coachesWithTeams.map(coachData => {
              const coachName = coachData.name;
              const coachColor = coachData.color;
              
              // Get sessions this coach is involved in
              const coachSessions = sessions.filter(s => 
                s.coach === coachName || s.coCoach === coachName || s.coCoach2 === coachName
              );
              
              // Get conflicts for this coach this week
              const coachConflicts = weekConflicts.filter(c => 
                c.matches.some(m => m.conflictCoach === coachName)
              );
              
              // Build day schedule
              const daySchedule = [];
              for (let d = 0; d < 7; d++) {
                const daySessions = coachSessions.filter(s => s.day === d);
                const hasConflict = coachConflicts.some(c => {
                  const conflictDay = c.date.getDay();
                  const adjustedDay = conflictDay === 0 ? 6 : conflictDay - 1;
                  return adjustedDay === d;
                });
                daySchedule.push({ day: d, sessions: daySessions, hasConflict });
              }
              
              return (
                <div key={coachName} style={{
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: coachColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                    }}>
                      {getInitials(coachName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                        {getShortName(coachName)}
                      </div>
                      <div style={{ fontSize: 11, color: theme.muted }}>
                        {coachData.teams.join(" · ")}
                      </div>
                    </div>
                    {coachConflicts.length > 0 && (
                      <button
                        onClick={() => setCurrentView("conflicts")}
                        style={{
                          padding: "6px 12px",
                          fontSize: 11,
                          fontWeight: 600,
                          background: theme.conflictBg,
                          border: `1px solid ${theme.conflict}40`,
                          color: theme.conflict,
                          borderRadius: 6,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {coachConflicts.length} conflict{coachConflicts.length > 1 ? "s" : ""} ▾
                      </button>
                    )}
                  </div>
                  
                  {/* Day heatmap */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {daySchedule.map(({ day, sessions: daySessions, hasConflict }) => (
                      <div key={day} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: theme.muted,
                          marginBottom: 4,
                        }}>
                          {DAY_NAMES[day]}
                        </div>
                        <div style={{
                          height: 6,
                          borderRadius: 3,
                          background: hasConflict ? theme.conflict :
                                     daySessions.length > 0 ? coachColor :
                                     theme.surface2,
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Conflicts summary for this week */}
            {weekConflicts.length > 0 && (
              <div style={{
                marginTop: 20,
                padding: "14px 16px",
                background: theme.conflictBg,
                border: `1px solid ${theme.conflict}40`,
                borderRadius: 12,
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: theme.conflict,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 10,
                }}>
                  Conflicts This Week
                </div>
                {weekConflicts.map((conflict, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: i < weekConflicts.length - 1 ? `1px solid ${theme.border}` : "none",
                  }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `${TEAM_COLORS[conflict.session.team]}20`,
                      border: `1.5px solid ${TEAM_COLORS[conflict.session.team]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 800,
                      color: TEAM_COLORS[conflict.session.team],
                    }}>
                      {conflict.session.team}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>
                        {conflict.session.label}
                      </div>
                      <div style={{ fontSize: 10, color: theme.muted }}>
                        {fmtDate(conflict.date)} · {conflict.matches.map(m => getShortName(m.conflictCoach)).join(", ")} on match duty
                      </div>
                    </div>
                    <button
                      onClick={() => setReassignModal({ 
                        session: conflict.session, 
                        date: conflict.date, 
                        conflicts: conflict.matches 
                      })}
                      style={{
                        padding: "4px 10px",
                        fontSize: 10,
                        fontWeight: 600,
                        background: "transparent",
                        border: `1px solid ${theme.gold}60`,
                        color: theme.gold,
                        borderRadius: 4,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Reassign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Reassign Modal */}
      {reassignModal && (
        <div 
          onClick={() => setReassignModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: theme.surface,
              borderRadius: 16,
              padding: "24px",
              maxWidth: 400,
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              border: `1px solid ${theme.goldBorder}`,
            }}
          >
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: theme.text,
              marginBottom: 4,
            }}>
              Reassign — {reassignModal.session.label}
            </div>
            <div style={{
              fontSize: 12,
              color: theme.muted,
              marginBottom: 16,
            }}>
              {fmtDateFull(reassignModal.date)} · {reassignModal.session.time} · {reassignModal.session.venue}
              <span style={{ color: theme.conflict, marginLeft: 8 }}>⚠ Match conflict!</span>
            </div>
            
            {/* Current coach */}
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: theme.muted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}>
              Current Coach
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: theme.surface2,
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: getCoachColor(reassignModal.session.coach),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
              }}>
                {getInitials(reassignModal.session.coach)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
                  {getShortName(reassignModal.session.coach)}
                </div>
                <div style={{ fontSize: 11, color: theme.muted }}>
                  {reassignModal.session.team}
                </div>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: theme.conflict,
                background: theme.conflictBg,
                padding: "4px 8px",
                borderRadius: 4,
              }}>
                on match duty
              </span>
            </div>
            
            {/* Reassign to */}
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: theme.muted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}>
              Reassign To
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 16,
            }}>
              {coachesWithTeams.map(c => {
                const isOnMatchDuty = reassignModal.conflicts.some(m => 
                  (COACH_PLAYS_IN[c.name] || []).includes(m.division)
                );
                const isCurrentCoach = c.name === reassignModal.session.coach;
                const isSelected = selectedReassignCoach === c.name;
                
                return (
                  <button
                    key={c.name}
                    disabled={isCurrentCoach}
                    onClick={() => !isCurrentCoach && setSelectedReassignCoach(c.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      background: isSelected ? `${theme.ok}15` : theme.surface2,
                      border: `1.5px solid ${isSelected ? theme.ok : isCurrentCoach ? theme.border : theme.border}`,
                      borderRadius: 8,
                      cursor: isCurrentCoach ? "not-allowed" : "pointer",
                      opacity: isCurrentCoach ? 0.5 : 1,
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                    }}>
                      {getInitials(c.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>
                        {getShortName(c.name)}
                      </div>
                      <div style={{ fontSize: 10, color: theme.muted }}>
                        {c.teams.slice(0, 2).join(", ")}
                      </div>
                    </div>
                    {isOnMatchDuty && (
                      <span style={{
                        fontSize: 8,
                        fontWeight: 600,
                        color: theme.warn,
                        background: theme.warnBg,
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}>
                        match day
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Match conflicts on this day */}
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: theme.muted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}>
              Match Conflicts On This Day
            </div>
            <div style={{
              background: theme.surface2,
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
            }}>
              {reassignModal.conflicts.map((match, i) => (
                <div key={i} style={{
                  fontSize: 11,
                  color: theme.text,
                  marginBottom: i < reassignModal.conflicts.length - 1 ? 6 : 0,
                }}>
                  <span style={{ color: DIVISION_COLORS[match.division] }}>
                    {match.division}
                  </span>: {match.label.replace(match.division + " ", "")}
                </div>
              ))}
            </div>
            
            <div style={{
              fontSize: 11,
              color: theme.muted,
              fontStyle: "italic",
              marginBottom: 16,
            }}>
              💡 Reassignments will update the training session for this date only.
            </div>
            
            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setReassignModal(null);
                  setSelectedReassignCoach(null);
                }}
                style={{
                  padding: "10px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                  color: theme.muted,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                disabled={!selectedReassignCoach}
                onClick={() => {
                  if (!selectedReassignCoach) return;
                  // Save reassignment
                  if (onReassign) {
                    onReassign(reassignModal.session.id, toDateStr(reassignModal.date), selectedReassignCoach);
                  }
                  // Show WhatsApp notification prompt
                  setNotifyModal({
                    newCoach: selectedReassignCoach,
                    oldCoach: reassignModal.session.coach,
                    session: reassignModal.session,
                    date: reassignModal.date,
                  });
                  setReassignModal(null);
                  setSelectedReassignCoach(null);
                }}
                style={{
                  padding: "10px 20px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: selectedReassignCoach ? `${theme.ok}20` : theme.surface2,
                  border: `1.5px solid ${selectedReassignCoach ? theme.ok : theme.border}`,
                  color: selectedReassignCoach ? theme.ok : theme.muted,
                  borderRadius: 8,
                  cursor: selectedReassignCoach ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  opacity: selectedReassignCoach ? 1 : 0.5,
                }}
              >
                Confirm reassign
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* WhatsApp Notification Modal */}
      {notifyModal && (
        <div 
          onClick={() => setNotifyModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
            padding: 20,
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: theme.surface,
              borderRadius: 16,
              padding: "24px",
              maxWidth: 380,
              width: "100%",
              border: `1px solid ${theme.ok}40`,
            }}
          >
            <div style={{
              fontSize: 40,
              textAlign: "center",
              marginBottom: 16,
            }}>
              ✅
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: theme.text,
              textAlign: "center",
              marginBottom: 8,
            }}>
              Reassignment Saved
            </div>
            <div style={{
              fontSize: 12,
              color: theme.muted,
              textAlign: "center",
              marginBottom: 20,
            }}>
              <strong style={{ color: theme.text }}>{getShortName(notifyModal.newCoach)}</strong> will now cover{" "}
              <strong style={{ color: theme.text }}>{notifyModal.session.team}</strong> training on{" "}
              {fmtDate(notifyModal.date)}.
            </div>
            
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              textAlign: "center",
              marginBottom: 12,
            }}>
              Notify {getShortName(notifyModal.newCoach)} via WhatsApp?
            </div>
            
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setNotifyModal(null)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                  color: theme.muted,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Skip
              </button>
              <button
                onClick={() => {
                  // Check if current user is the one with the conflict (self-reassignment)
                  const isSelfReassign = currentUser?.name === notifyModal.oldCoach;
                  
                  // Generate WhatsApp message
                  const message = isSelfReassign
                    ? `Hi ${getShortName(notifyModal.newCoach)}! 👋\n\nCould you please cover ${notifyModal.session.team} training on ${fmtDateFull(notifyModal.date)} (${notifyModal.session.time}) at ${notifyModal.session.venue}?\n\nI have a match conflict that day. Therefore, I have assigned you as the Coach for this session.\n\nThank you! 🙏`
                    : `Hi ${getShortName(notifyModal.newCoach)}! 👋\n\nCould you please cover ${notifyModal.session.team} training on ${fmtDateFull(notifyModal.date)} (${notifyModal.session.time}) at ${notifyModal.session.venue}?\n\n${getShortName(notifyModal.oldCoach)} has a match conflict that day.\n\nThanks! 🙏`;
                  
                  // Open WhatsApp with pre-filled message
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                  
                  setNotifyModal(null);
                }}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#25D366",
                  border: "none",
                  color: "#fff",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>📱</span> Send WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
