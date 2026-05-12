import React, { useState, useEffect, useRef } from "react";
// Pass 4: db / firestore primitives are no longer used directly in App.jsx —
// all Firestore I/O is encapsulated in src/hooks/useFirestore.js.
import ProgressTracker from "./ProgressTracker";
import CoachCoordination from "./CoachCoordination";
// ─── Pass 1 modularisation: constants + pure utils ────────────
import { ROLES, ROLE_META, CAN, can } from "./constants/roles";
import {
  DEFAULT_TEAMS, TEAM_META, TEAM_CARD_COLORS, getTeamCardColors,
  EXTRA_COLORS, getTeamMeta,
} from "./constants/teams";
import { THEMES, THEME_KEYS } from "./constants/themes";
import { WMO, wmo, calcRainPeriods } from "./constants/weather";
import {
  localDateStr, todayStr, tomorrowStr, fmtShort, fmtLong,
  isToday, isFuture, isSessionPast,
  isAfterCutoff,
  NET_DAY_START, NET_DAY_END, NET_SPAN, netPct, toMinsNet,
  PRIME_ZONES, isPrimeTime,
} from "./utils/time";
import { hashPin } from "./utils/crypto";
import { getLiftObj, getLiftPref } from "./utils/lifts";
import {
  getCoachTeams, isCoachMember, getTeamRole,
  isTeamCaptainFor, isTeamVCFor,
  canOrCoach, maskEmail, isAbsent, profileCompletion, getMemberRoleChips,
} from "./utils/members";
import { netAvailGauge } from "./utils/sessions";
import { makeICS, waMsg } from "./utils/ics";
// ─── Pass 2 modularisation: dumb UI components ────────────────
import Btn from "./ui/Btn";
import Toast from "./ui/Toast";
import SLbl from "./ui/SLbl";
import FFld from "./ui/FFld";
import BackBtn from "./ui/BackBtn";
import { GroupIcon, NetIcon, BothNetsIcon } from "./ui/icons";
import { RolePill, TeamPill, MemberRolePills } from "./ui/pills";
import ProfileDial from "./ui/ProfileDial";
import AvailGauge from "./ui/AvailGauge";
import PinPad from "./ui/PinPad";
import WeatherBar from "./ui/WeatherBar";
import WeatherPage from "./ui/WeatherPage";
import SessCard from "./ui/SessCard";
import NetsTimeline from "./ui/NetsTimeline";
import FamilyManager from "./ui/FamilyManager";
import PlayerGroup from "./ui/PlayerGroup";
import CarpoolSheet from "./ui/CarpoolSheet";
import Shell from "./ui/Shell";
import BotNav from "./ui/BotNav";
import SidebarNav from "./ui/SidebarNav";
// ─── Pass 4 modularisation: shared seeds + custom hooks ──────
import {
  PRESET_POLL, SEED_NOTE_TEMPLATES, SEED_MEMBERS, EMAIL_SEED,
  uid, normMember,
} from "./constants/seeds";
import { useFirestore } from "./hooks/useFirestore";
import { useAuth } from "./hooks/useAuth";
// ─── Pass 5 modularisation: shared React context for view blocks ─
import { AppContext } from "./context/AppContext";
// ─── Pass 6 modularisation: fixtures + admin-data constants ───
import { ALL_FIXTURES, MATCH_FIXTURES } from "./constants/fixtures";
import { NAME_MAP, AMBIGUOUS_FIRST_NAMES, DIVISION_TEAMS, T20_SQUADS } from "./constants/admin-data";
// ─── Pass 6 prerequisite: club logo + AppHeader extracted ─────
import { FCC_LOGO } from "./constants/logo";
import AppHeader from "./ui/AppHeader";
// ─── Pass 6: view components ──────────────────────────────────
import WeatherView from "./views/WeatherView";
import PrivacyView from "./views/PrivacyView";
import HelpView from "./views/HelpView";
import CoachCoordinationView from "./views/CoachCoordinationView";
import CoachHQView from "./views/CoachHQView";
import AvailabilityView from "./views/AvailabilityView";
import ScheduleView from "./views/ScheduleView";
import AddSessionView from "./views/AddSessionView";
import SessionDetailView from "./views/SessionDetailView";
import ProfileView from "./views/ProfileView";
import CaptainXIView from "./views/CaptainXIView";
import AdminView from "./views/AdminView";
import MatchesView from "./views/MatchesView";
import ScorecardView from "./views/ScorecardView";
import { doc as fsDoc, onSnapshot as fsOnSnapshot } from "firebase/firestore";
import { db as fsDb } from "./firebase";

function LiveScorecardLoader({ matchId, onBack }) {
  const [match, setMatch] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const unsub = fsOnSnapshot(
      fsDoc(fsDb, "fccscorer", "data", "matches", matchId),
      (snap) => { setMatch(snap.exists() ? { id: snap.id, ...snap.data() } : null); setLoaded(true); },
      (err) => { console.error("Live scorecard load error:", err); setLoaded(true); }
    );
    return unsub;
  }, [matchId]);
  if (!loaded) return <div style={{padding:40,textAlign:"center",color:"#64748b"}}>Loading scorecard…</div>;
  return <ScorecardView match={match} onBack={onBack} />;
}


// Storage keys moved to src/hooks/useFirestore.js (Pass 4) — were
// only used inside the Firestore-loader effect and save functions.

// ─── 2026 Home Match Fixtures (Fredensborg ground only) ───────
// ─── Privacy notice (GDPR) ────────────────────────────────────
const PRIVACY_TEXT = `Fredensborg Cricket Club stores your name, email address, and phone number to manage your club membership and communicate about training, matches, and club activities. Your data is only accessible to club admins and coaches. It is stored securely on Google Firebase servers located in the EU (Frankfurt) and will not be shared with third parties. You have the right to access, correct, or request deletion of your data at any time by contacting the club admin. Data is retained for the duration of your membership and up to one year after. For members under 16, a parent or guardian must provide consent on their behalf.`;

// PRIVACY_SECTIONS moved into src/views/PrivacyView.jsx (Pass 6)

// MATCH_FIXTURES moved to src/constants/fixtures.js (Pass 6)

// ALL_FIXTURES moved to src/constants/fixtures.js (Pass 6)

// Club venue addresses for Google Maps links (verified from cricket.dk)
const CLUB_VENUES = {
  // Home ground
  "Fredensborg": { name: "Fredensborg Cricket Club", address: "Karlebovej 23, 3480 Fredensborg" },
  "FCC": { name: "Fredensborg Cricket Club", address: "Karlebovej 23, 3480 Fredensborg" },
  // Hovedstaden clubs
  "KB": { name: "Kjøbenhavns Boldklub", address: "Peter Bangs Vej 147, 2000 Frederiksberg" },
  "AB": { name: "Akademisk Boldklub", address: "Skovdiget 1, 2880 Bagsværd" },
  "Copenhagen": { name: "Copenhagen Cricket Greens", address: "Terrasserne 30, 2700 Brønshøj" },
  "Bella": { name: "Copenhagen Cricket Greens", address: "Terrasserne 30, 2700 Brønshøj" },
  "APMM": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Maersk": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Nørrebro": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Himalaya": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Himalayan": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Glostrup": { name: "Solvangsparken", address: "Nørre Alle, 2600 Glostrup" },
  "Hvidovre": { name: "Enghøjskolens Sportsplads", address: "Bymuren 151, 2650 Hvidovre" },
  "Frem": { name: "Valby Idrætspark", address: "Julius Andersens Vej 5, 2450 København SV" },
  "Ishøj": { name: "Ishøj Idrætscenter", address: "Vejledalen 17, 2635 Ishøj" },
  "Tåstrup": { name: "Hedehusene Idrætscenter", address: "Stenbuen 34, 2640 Hedehusene" },
  "Albertslund": { name: "Albertslund Stadion", address: "Skallerne 14, 2620 Albertslund" },
  "Svanholm": { name: "Svanholm Park", address: "Svanholm Alle 2, 2660 Brøndby Strand" },
  "Soraner": { name: "Gentofte Sportspark", address: "Ved Stadion 6A, 2820 Gentofte" },
  "Soranerne": { name: "Gentofte Sportspark", address: "Ved Stadion 6A, 2820 Gentofte" },
  // Sjælland clubs
  "Køge": { name: "Køge Stadion", address: "Ved Stadion 10, 4600 Køge" },
  "Roskilde": { name: "Roskilde Cricket", address: "Poppelgårdsvej 4, 4000 Roskilde" },
  "Sorø": { name: "Sorø Akademi", address: "Søgade 18 C, 4180 Sorø" },
  // OB/Forty matches often at Valby or other grounds
  "Forty": { name: "Valby Idrætspark", address: "Julius Andersens Vej 5, 2450 København SV" },
};

// Get venue for a match (extracts club name from label)
const getMatchVenue = (label, isHome) => {
  if (isHome) return CLUB_VENUES["Fredensborg"];
  // Extract opponent from label like "Div 3 @ Hvidovre 2" or "OB vs Køge OB"
  const match = label.match(/[@vs]\s*([A-Za-zÆØÅæøå]+)/i);
  if (match) {
    const opponent = match[1];
    return CLUB_VENUES[opponent] || null;
  }
  return null;
};

// Division → app team name mapping for filtering
const DIVISION_TO_TEAM = {
  "Div 2":"Div 2","Div 3":"Div 3","Div 4":"Div 4",
  "Women's":"Women's","U13":"U13","U15":"U15","U16":"U18","U18":"U18",
};
let _themeKey = "navy";
try { _themeKey = localStorage.getItem("fcc-theme") || "navy"; } catch{}
if(!THEMES[_themeKey]) _themeKey = "navy";

// PRESET_POLL, SEED_NOTE_TEMPLATES and SEED_MEMBERS — moved to src/constants/seeds.js (Pass 4)

// ─── Name fix map ─────────────────────────────────────────────
// Maps first-name-only entries to their known full names.
// Entries with duplicate first names (e.g. "Adithya" → 2 people) are
// intentionally excluded — those must be fixed manually via the pencil icon.
// NAME_MAP, AMBIGUOUS_FIRST_NAMES, DIVISION_TEAMS moved to src/constants/admin-data.js (Pass 6)

// T20_SQUADS moved to src/constants/admin-data.js (Pass 6)

// EMAIL_SEED, uid, normMember — moved to src/constants/seeds.js (Pass 4)

// ─── Weather constants ────────────────────────────────────────
const FCC_LAT = 55.917762, FCC_LON = 12.415680;

// SVG arc dial
const dlICS = s => {
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([makeICS(s)],{type:"text/calendar"}));
  a.download=`fcc-nets-${s.date}.ics`; a.click();
};

// G is now set dynamically from theme — see App() below
let G = THEMES[_themeKey];

const iSt = (extra={}) => ({
  width:"100%", borderRadius:9, border:`1.5px solid ${G.border}`,
  padding:"11px 13px", fontSize:15, fontFamily:"'DM Sans',sans-serif",
  fontWeight:500, background:G.cream, color:G.text,
  outline:"none", boxSizing:"border-box", ...extra,
});

// ─── Atoms ────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // ── Pass 4: Firestore-backed state via custom hook ───────────
  // currentUserRef is synced below (after auth state is declared) so
  // logAction inside the hook can read the latest currentUser without
  // creating a circular hook dependency.
  const currentUserRef = useRef(null);
  const firestoreState = useFirestore({ currentUserRef });
  const {
    sessions, setSessions, sessionsRef,
    members, setMembers, membersRef,
    pins, setPins,
    teams, setTeams, teamsRef,
    recurring, setRecurring, recurringRef,
    blockCals, setBlockCals,
    inviteCodes, setInviteCodes,
    joinRequests, setJoinRequests,
    auditLog, setAuditLog,
    reminderLogs, setReminderLogs,
    cancelledSessions, setCancelledSessions,
    seasonPlans, setSeasonPlans,
    allAttendance, setAllAttendance,
    allSessionNotes, setAllSessionNotes,
    playerProgress, setPlayerProgress,
    coachOverrides, setCoachOverrides,
    matchSelections, setMatchSelections,
    noteTemplates, setNoteTemplates,
    loading,
    saveSessions, saveMembers, savePins, saveTeams, saveRecurring,
    saveBlockCals, saveCancelledSessions, saveInviteCodes, saveJoinRequests,
    saveSeasonPlans, saveAllAttendance, saveAllSessionNotes, savePlayerProgress,
    saveCoachOverrides, saveMatchSelections, saveNoteTemplates, saveAuditLog,
    logAction,
  } = firestoreState;

  // Theme
  const [themeKey, setThemeKey] = useState(_themeKey);
  G = THEMES[themeKey] || THEMES.forest; // keep global G in sync for atoms
  const applyTheme = (key) => {
    if(!THEMES[key]) return;
    setThemeKey(key);
    G = THEMES[key];
    try { localStorage.setItem("fcc-theme", key); } catch{}
  };

  // Auth state — moved to useAuth (Pass 4). Hook call below, after
  // setView is declared so handleLogout can use it. inviteCodes /
  // joinRequests / auditLog / reminderLogs live in useFirestore.

  // App view
  const [view,     setView]     = useState("schedule");
  const [selSess,  setSelSess]  = useState(null);
  const [toast,    setToast]    = useState(null);
  // showToast defined here (used by useAuth and elsewhere) — moved up from
  // its old location below the auth state during Pass 4.
  const showToast = m => { setToast(m); setTimeout(()=>setToast(null),2700); };

  // ── Pass 4: Auth state + handlers via custom hook ─────────────
  const authState = useAuth({
    members, pins, savePins, saveMembers,
    inviteCodes, setInviteCodes, saveInviteCodes,
    showToast, logAction, setView,
  });
  const {
    currentUser, setCurrentUser,
    authView, setAuthView,
    pickSearch, setPickSearch,
    pinError, setPinError,
    pendingMember, setPendingMember,
    emailInput, setEmailInput,
    emailError, setEmailError,
    loginCodeSent, setLoginCodeSent,
    loginSentCode, setLoginSentCode,
    loginCodeExpiry, setLoginCodeExpiry,
    loginCodeInput, setLoginCodeInput,
    loginCodeSending, setLoginCodeSending,
    loginCodeError, setLoginCodeError,
    handlePickMember, handleVerifyEmail, handleVerifyCode,
    handleNewPin, handleEnterPin, handleLogout,
  } = authState;
  // Keep currentUserRef in sync each render so logAction inside
  // useFirestore can read the latest user without a hook cycle.
  currentUserRef.current = currentUser;

  const [sessAttendance, setSessAttendance] = useState({}); // {playerId: true/false/null} for current session
  const [attendanceSessionContext, setAttendanceSessionContext] = useState(null); // For passing session to Progress Tracker
  const [sessCoachView, setSessCoachView] = useState(null); // "attendance" | "notes" | null for inline coach views
  const [sessNotes, setSessNotes] = useState([]); // [{playerId, playerName, text, date, pillar}]
  const [sessNotesDraft, setSessNotesDraft] = useState({}); // {playerId: "text"}

  // teams / seasonPlans / allAttendance / allSessionNotes / playerProgress /
  // coachOverrides / cancelledSessions / recurring — moved to useFirestore (Pass 4)
  const seniorTeamNames = teams.filter(t=>t.senior).map(t=>t.name);
  const ALL_TEAMS = [...teams.map(t=>t.name), "Unassigned"];

  // Cancellation modal
  const [cancelModal, setCancelModal] = useState(null); // {session, slot} when cancelling

  // Add session form
  const [bDate,    setBDate]    = useState("");
  const [bFrom,    setBFrom]    = useState("18:00");
  const [bTo,      setBTo]      = useState("19:00");
  const [bNote,    setBNote]    = useState("");
  const [bLabel,   setBLabel]   = useState("");
  const [bNet,     setBNet]     = useState("1");  // "1" | "2" | "both"
  const [bLift,    setBLift]    = useState("");   // "" | "offer" | "need" | "self"
  const [liftEditing, setLiftEditing] = useState(false);  // carpool form open in session detail
  const [liftDraft,   setLiftDraft]   = useState(null);   // draft lift object while editing
  const [carpoolFocus,setCarpoolFocus]= useState(false);  // auto-scroll to carpool on open
  const [notInExpanded,setNotInExpanded] = useState(false); // "not coming" section toggle
  const [notInSearch, setNotInSearch] = useState(""); // search filter for "not coming" list
  const [editingLocation, setEditingLocation] = useState(false); // location editor modal
  const [assignOpen, setAssignOpen] = useState(null); // session id whose U11 parent-duty roster panel is open
  const [cancelReason, setCancelReason] = useState(""); // reason for cancelling a session
  const [showCancelled, setShowCancelled] = useState(false); // collapsed by default
  const [carpoolSheetSess, setCarpoolSheetSess] = useState(null); // bottom sheet session
  const carpoolRef = useRef(null);
  // sessionsRef / membersRef / teamsRef / recurringRef — moved to useFirestore (Pass 4)
  const [bRestrictTeam, setBRestrictTeam] = useState("");
  const [selP,     setSelP]     = useState([]);
  const [pSearch,  setPSearch]  = useState("");
  const [pFilter,  setPFilter]  = useState("All");
  const [otherGroupsOpen, setOtherGroupsOpen] = useState(false);
  // Poll builder
  const [bPollOpts, setBPollOpts] = useState([...PRESET_POLL]);
  const [bCustomOpt,setBCustomOpt]= useState("");
  // Session comments
  const [commentText, setCommentText] = useState("");

  // Admin state
  const [newName,  setNewName]  = useState("");
  const [newTeam,  setNewTeam]  = useState("Unassigned");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newMemberType, setNewMemberType] = useState("player"); // player | parent | child
  const [newLinkParent, setNewLinkParent] = useState(""); // parent member id to link child to
  const [newGenCode,   setNewGenCode]   = useState(false); // generate invite code after adding
  const [aSearch,  setASearch]  = useState("");
  const [aFilter,  setAFilter]  = useState("All");
  const [adminListMode, setAdminListMode] = useState("flat"); // "teams" | "flat" — flat by default
  const [selMember, setSelMember] = useState(null); // member selected in flat view
  const [expandedSessions, setExpandedSessions] = useState({});
  const [editingRole, setEditingRole] = useState(null);

  // Team management state
  const [newTName,  setNewTName]  = useState("");
  const [newTSenior,setNewTSenior]= useState(false);
  const [editingTeam,setEditingTeam]= useState(null);
  const [coachSearch, setCoachSearch] = useState({}); // {teamId: searchString}
  // Captain's Playing XI state
  // matchSelections — moved to useFirestore (Pass 4)
  const [captainXIModal, setCaptainXIModal] = useState(null); // {match, division} or null
  const [xiSelection, setXiSelection] = useState([]); // array of player names
  const [xiRoles, setXiRoles] = useState({ captain: null, vc: null, wk: null }); // special roles
  const [xiNote, setXiNote] = useState("");
  const [xiReportTime, setXiReportTime] = useState("");
  const [xiMatchTime, setXiMatchTime] = useState("");
  const [xiReportTimeUserTouched, setXiReportTimeUserTouched] = useState(false);
  // Captain note templates (shared club-wide)
  // noteTemplates — moved to useFirestore (Pass 4)
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templateEditingId, setTemplateEditingId] = useState(null);
  const [templateEditingText, setTemplateEditingText] = useState("");
  const [templateNewText, setTemplateNewText] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  // Selective XI reset (super admin only)
  const [xiResetModalOpen, setXiResetModalOpen] = useState(false);
  const [xiResetSelected, setXiResetSelected] = useState(() => new Set());
  // Admin section collapse — true = open. Members+AddMember open by default, rest collapsed
  const [adminSec, setAdminSec] = useState({
    members:true, addmember:true, groups:false,
    coaches:false, blocknets:false, recurring:false, backup:false, auditlog:false, reminderlogs:false
  });
  const toggleAdminSec = k => setAdminSec(s=>({...s,[k]:!s[k]}));
  const [editingName, setEditingName] = useState(null); // {id, value}

  // Recurring slot form state
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const [rName,       setRName]      = useState("");
  const [rTeam,       setRTeam]      = useState([]);  // array for multi-select
  const [rRestrict,   setRRestrict]  = useState(false);
  const [rDay,        setRDay]       = useState(6); // Saturday
  const [rFrom,       setRFrom]      = useState("14:00");
  const [rTo,         setRTo]        = useState("15:30");
  const [rActiveFrom, setRActiveFrom]= useState(todayStr());
  const [rActiveTo,   setRActiveTo]  = useState("");
  const [rNet,        setRNet]       = useState("1"); // net for new recurring slot
  const [editingSlot, setEditingSlot]= useState(null);
  // Help / contact form
  const [helpMsg,  setHelpMsg]  = useState("");
  const [helpCat,  setHelpCat]  = useState("general");
  // Audit log UI state (superadmin only — safe to have at component level)
  const [logFilter, setLogFilter] = useState("all");
  const [logOpen,   setLogOpen]   = useState(false);
  // Request-to-join form state
  const [jrName,    setJrName]   = useState("");
  const [jrTeam,    setJrTeam]   = useState("");
  const [jrContact, setJrContact]= useState(""); // email
  const [jrPhone,   setJrPhone]  = useState(""); // phone (separate)
  const [jrForChild,setJrForChild]=useState(false);
  const [jrChildName,setJrChildName]=useState("");
  const [jrChildTeam,setJrChildTeam]=useState("");

  // ── Profile tabs for player-parent hybrid ────────────────────
  const [profileTab, setProfileTab] = useState("profile"); // profile|family
  const [showAllMatches, setShowAllMatches] = useState(false); // for My Matches in profile

  // ── Self-service verify/onboarding flow ────────────────────
  const [vfStep,      setVfStep]      = useState("search");   // search|found|notfound|code|parent|done
  const [vfSearch,    setVfSearch]    = useState("");
  const [vfMatch,     setVfMatch]     = useState(null);        // matched member object
  const [vfEmail,     setVfEmail]     = useState("");
  const [vfPhone,     setVfPhone]     = useState("");
  const [vfCode,      setVfCode]      = useState("");          // entered code
  const [vfSentCode,  setVfSentCode]  = useState("");          // generated code (client-side ephemeral)
  const [vfCodeExpiry,setVfCodeExpiry]= useState(null);
  const [vfSending,   setVfSending]   = useState(false);

  // Login email code flow — moved to useAuth (Pass 4)
  const [vfError,     setVfError]     = useState("");
  const [vfConsent,   setVfConsent]   = useState(false);
  const [vfIsParent,  setVfIsParent]  = useState(false);
  const [vfChildName, setVfChildName] = useState("");
  const [vfNewName,   setVfNewName]   = useState("");
  const [vfNewTeam,   setVfNewTeam]   = useState("");

  // ── Restore verification state from localStorage on mount ────
  useEffect(() => {
    const saved = localStorage.getItem("fcc-verify-state");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.expiry && Date.now() < state.expiry) {
          // Restore state if code hasn't expired
          setVfSentCode(state.code || "");
          setVfCodeExpiry(state.expiry || null);
          setVfEmail(state.email || "");
          setVfStep(state.step || "search");
          if (state.matchId && members.length > 0) {
            const match = members.find(m => m.id === state.matchId);
            if (match) setVfMatch(match);
          }
        } else {
          // Clear expired state
          localStorage.removeItem("fcc-verify-state");
        }
      } catch(e) { localStorage.removeItem("fcc-verify-state"); }
    }
  }, [members.length]);

  const userRole = currentUser?.role || "member";
  // showToast moved up to be available to useAuth (Pass 4).
  // cachedCurrentUser sync moved to useAuth (Pass 4).


  // ── Invite code helpers ───────────────────────────────────────
  // Generate a short human-readable code: FCC-XXXX (letters+digits, no ambiguous chars)
  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return "FCC-" + Array.from({length:4}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  }
  function hashCode(code) { return hashPin(code.toUpperCase()); }

  function generateInviteCode(memberId) {
    const m = members.find(x=>x.id===memberId);
    const plain = genCode();
    const updated = {...inviteCodes, [memberId]: hashCode(plain)};
    saveInviteCodes(updated);
    if(m) logAction("pin", `Generated invite code for: ${m.name}`);
    return plain; // caller is responsible for displaying the code
  }


  // ── Auto-scroll to carpool section when chip clicked ─────────
  useEffect(()=>{
    if(view==="session" && carpoolFocus && carpoolRef.current) {
      setTimeout(()=>{
        carpoolRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
      }, 120);
      setCarpoolFocus(false);
    }
  },[view, carpoolFocus]);

  // ── Auto-select current user when opening Add Session ────────
  useEffect(()=>{
    if(view==="add" && currentUser) {
      setSelP(ps => ps.includes(currentUser.name) ? ps : [currentUser.name, ...ps]);
      setPSearch(""); setPFilter("All"); setOtherGroupsOpen(false);
    }
  },[view]);

  // ── Weather fetch (Open-Meteo ECMWF — free, CORS-enabled) ────
  useEffect(()=>{
    function fetchWx() {
      const url=`https://api.open-meteo.com/v1/forecast?`+
        `latitude=${FCC_LAT}&longitude=${FCC_LON}`+
        `&current=temperature_2m,apparent_temperature,precipitation,`+
        `weathercode,windspeed_10m,is_day`+
        `&hourly=temperature_2m,apparent_temperature,precipitation,`+
        `precipitation_probability,weathercode,windspeed_10m,visibility,is_day`+
        `&daily=sunrise,sunset,precipitation_sum,weathercode,`+
        `temperature_2m_max,temperature_2m_min,windspeed_10m_max,`+
        `precipitation_probability_max`+
        `&timezone=Europe%2FCopenhagen&forecast_days=7&wind_speed_unit=ms`;
      fetch(url, {cache:"no-store"})
        .then(r=>r.json())
        .then(data=>{
          const todayD=localDateStr();
          const daily=(data.daily?.time||[]).map((date,i)=>({
            date,
            code:  data.daily.weathercode[i],
            max:   Math.round(data.daily.temperature_2m_max[i]),
            min:   Math.round(data.daily.temperature_2m_min[i]),
            windMax: Math.round(data.daily.windspeed_10m_max[i]*10)/10,
            rainSum: +(data.daily.precipitation_sum[i]||0).toFixed(1),
            rainProb: data.daily.precipitation_probability_max[i]||0,
            sunrise: data.daily.sunrise[i],
            sunset:  data.daily.sunset[i],
          }));
          setWxData({
            today: todayD,
            hourly: data.hourly,
            daily: daily,
            daily0: daily[0],
            // Current conditions from the /current endpoint
            current: data.current ? {
              temp:   Math.round(data.current.temperature_2m),
              feels:  Math.round(data.current.apparent_temperature),
              precip: +(data.current.precipitation||0).toFixed(1),
              code:   data.current.weathercode,
              wind:   Math.round(data.current.windspeed_10m*10)/10,
              isDay:  data.current.is_day,
            } : null,
            fetchedAt: Date.now(),
          });
        })
        .catch(()=>setWxData({error:true}));
    }
    fetchWx();
    // Re-fetch every 30 minutes so temperature stays current
    const timer = setInterval(fetchWx, 30*60*1000);
    return ()=>clearInterval(timer);
  },[]);


  function addTeam(e) {
    e.preventDefault();
    const n = newTName.trim();
    if(!n) return;
    if(teams.find(t=>t.name.toLowerCase()===n.toLowerCase())) {
      showToast("A team with that name already exists"); return;
    }
    saveTeams([...teams, {id:uid(), name:n, senior:newTSenior}]);
    logAction("group", `Created group: "${n}" (${newTSenior?"Senior":"Youth"})`);
    setNewTName(""); setNewTSenior(false);
    showToast(`Group "${n}" added ✓`);
  }

  function renameTeam(id, newName) {
    const n = newName.trim();
    if(!n) return;
    const old = teams.find(t=>t.id===id)?.name;
    if(!old) return;
    saveMembers(members.map(m=>m.team===old ? {...m,team:n} : m));
    saveTeams(teams.map(t=>t.id===id ? {...t,name:n} : t));
    logAction("group", `Renamed group: "${old}" → "${n}"`);
    setEditingTeam(null);
    showToast(`Renamed to "${n}" ✓`);
  }

  function deleteTeam(id) {
    const t = teams.find(t=>t.id===id);
    if(!t) return;
    if(!window.confirm(`Delete group "${t.name}"? Members in this group will be moved to Unassigned.`)) return;
    saveMembers(members.map(m=>m.team===t.name ? {...m,team:null,role:"member"} : m));
    saveTeams(teams.filter(t=>t.id!==id));
    logAction("group", `Deleted group: "${t.name}"`);
    showToast(`Group "${t.name}" deleted`);
  }

  function toggleTeamSenior(id) {
    const t = teams.find(t=>t.id===id);
    if(!t) return;
    if(t.senior) {
      saveMembers(members.map(m=>
        m.team===t.name && ["captain","vicecaptain"].includes(m.role)
          ? {...m,role:"member"} : m
      ));
    }
    saveTeams(teams.map(t=>t.id===id ? {...t,senior:!t.senior} : t));
    logAction("group", `Changed "${t.name}" type: ${t.senior?"Senior→Youth":"Youth→Senior"}`);
    showToast(`"${t.name}" set to ${t.senior?"Youth":"Senior"} ✓`);
  }

  // ── Recurring slots ───────────────────────────────────────────
  function addRecurringSlot(slot) {
    const next = [...recurring, {...slot, id:uid(), enabled:true}];
    saveRecurring(next);
    logAction("recurring", `Added recurring slot: "${slot.name}" (${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][slot.day]}, ${slot.from}–${slot.to}${slot.team?", "+slot.team:""})`);
    showToast(`Recurring slot "${slot.name}" added ✓`);
  }
  function toggleRecurringSlot(id) {
    const slot = recurring.find(r=>r.id===id);
    const next = recurring.map(r=>r.id===id ? {...r,enabled:!r.enabled} : r);
    saveRecurring(next);
    if(slot) logAction("recurring", `${slot.enabled?"Disabled":"Enabled"} recurring slot: "${slot.name}"`);
  }
  function deleteRecurringSlot(id) {
    const slot = recurring.find(r=>r.id===id);
    if(!slot) return;
    if(!window.confirm(`Delete recurring slot "${slot.name}"? Existing sessions from this slot are kept.`)) return;
    saveRecurring(recurring.filter(r=>r.id!==id));
    logAction("recurring", `Deleted recurring slot: "${slot.name}"`);
    showToast(`Slot "${slot.name}" deleted`);
  }
  function deleteRecurringSlotSilent(id) {
    // No confirm — used when checkbox is already the user's confirmation
    const slot = recurring.find(r=>r.id===id);
    if(!slot) return;
    saveRecurring(recurring.filter(r=>r.id!==id));
    logAction("recurring", `Deleted recurring slot: "${slot.name}"`);
  }
  function updateRecurringSlot(id, changes) {
    const slot = recurring.find(r=>r.id===id);
    saveRecurring(recurring.map(r=>r.id===id ? {...r,...changes} : r));
    if(slot) logAction("recurring", `Updated recurring slot: "${slot.name}" → "${changes.name||slot.name}"`);
    showToast("Slot updated ✓");
  }

  // ── Sessions ──────────────────────────────────────────────────
  // Returns true if two time ranges overlap (exclusive of touching endpoints)
  function timesOverlap(aFrom, aTo, bFrom, bTo) {
    const toMins = t => { const [h,m]=t.split(":").map(Number); return h*60+m; };
    return toMins(aFrom) < toMins(bTo) && toMins(bFrom) < toMins(aTo);
  }

  function handleAddSession(e) {
    e.preventDefault();
    if(!bDate||selP.length===0){showToast("Pick a date & at least one player");return;}
    const pollOptions = bPollOpts.map(o=>({...o, votes:[]}));
    const restrictedTo = bRestrictTeam || null;
    const isLeader = ["superadmin","admin","captain","vicecaptain","t20captain","t20vicecaptain"].includes(userRole)||!!getTeamRole(currentUser?.name,teams);

    // Absence check — warn if self is marked away on booking date
    if(bDate && currentUser && selP.includes(currentUser.name)) {
      const me = members.find(m=>m.id===currentUser.id);
      if(me && isAbsent(me, bDate)) {
        const abs = (me.absences||[]).find(a=>a.from<=bDate&&a.to>=bDate);
        const msg = `You've marked yourself away during this period (${abs?.category||"Away"}: ${fmtShort(abs?.from)} – ${fmtShort(abs?.to)}). Book anyway?`;
        if(!window.confirm(msg)) return;
      }
    }

    // Prime time enforcement for members
    if(!isLeader) {
      const prime = isPrimeTime(bFrom);
      const maxMins = toMinsNet(bFrom) + (prime ? 60 : 120);
      if(toMinsNet(bTo) > maxMins) {
        const allowed = prime ? "1 hour" : "2 hours";
        showToast(`⭐ Prime hours: max ${allowed} per booking at this time`);
        return;
      }
    }

    // Auto-enroll team members when session is restricted
    let autoPlayers = [...selP];
    if(isLeader && restrictedTo) {
      const teamMembers = members
        .filter(m => (m.teams||[]).includes(restrictedTo))
        .map(m => m.name);
      autoPlayers = [...new Set([...autoPlayers, ...teamMembers])];
    }

    // Exact match — merge players into existing session (including recurring)
    const ex=sessions.find(s=>s.date===bDate&&s.from===bFrom&&s.to===bTo);
    if(ex){
      const merged=[...new Set([...ex.players,...autoPlayers])];
      const mergedPoll = ex.poll || [];
      const existingIds = mergedPoll.map(o=>o.id);
      const newOpts = pollOptions.filter(o=>!existingIds.includes(o.id));
      saveSessions(sessions.map(s=>s.id===ex.id?{...s,players:merged,
        label:s.label||bLabel,restrictedTo:s.restrictedTo||restrictedTo,
        poll:[...mergedPoll,...newOpts]}:s));
      logAction("session", `Added players to session on ${bDate} (${bFrom}–${bTo}): ${autoPlayers.join(", ")}`);
      showToast(`Players added to session on ${fmtShort(bDate)} ✓`);
      // Confirmation email if current user added themselves
      if(autoPlayers.includes(currentUser?.name) && !ex.players.includes(currentUser?.name))
        sendBookingConfirm(members.find(m=>m.name===currentUser?.name),
          {...ex,label:ex.label||bLabel}, merged);
    } else {
      // Check 1: net conflict — same net at overlapping time
      const netConflict = sessions.find(s=>
        s.date===bDate &&
        timesOverlap(bFrom,bTo,s.from,s.to) &&
        (s.net==="both"||bNet==="both"||s.net===bNet)
      );
      if(netConflict) {
        showToast(`🚫 ${netConflict.net==="both"?"Both nets are":
          `Net ${netConflict.net} is`} already booked ${netConflict.from}–${netConflict.to}`);
        return;
      }
      // Check 2: player conflict — same player in an overlapping session
      const overlapping = sessions.filter(s=>
        s.date===bDate && timesOverlap(bFrom,bTo,s.from,s.to)
      );
      const alreadyBooked = overlapping.filter(s=>
        autoPlayers.some(p=>s.players.includes(p))
      );
      if(alreadyBooked.length>0) {
        const clash = alreadyBooked[0];
        showToast(`⚠️ ${autoPlayers.find(p=>clash.players.includes(p))} already has a session at this time (${clash.from}–${clash.to}${clash.label?" · "+clash.label:""})`);
        return;
      }
      const addedCount = autoPlayers.length - selP.length;
      const newSess = {id:uid(),date:bDate,from:bFrom,to:bTo,
        players:[...autoPlayers],note:bNote.trim(),label:bLabel.trim(),
        net:bNet,
        createdBy: currentUser?.name||null,
        lifts: bLift && currentUser?.name ? {[currentUser.name]: {pref:bLift,seats:1,stop:"",stopOther:"",note:"",saved:true}} : {},
        restrictedTo,poll:pollOptions,comments:[]};
      saveSessions([...sessions, newSess]
        .sort((a,b)=>new Date(a.date)-new Date(b.date)));
      logAction("session", `Created session: ${bDate} ${bFrom}–${bTo}${bLabel?" «"+bLabel+"»":""}${restrictedTo?" ("+restrictedTo+" only)":""} — ${autoPlayers.length} player${autoPlayers.length>1?"s":""}: ${autoPlayers.join(", ")}`);
      const autoMsg = addedCount > 0 ? ` · ${addedCount} team member${addedCount>1?"s":""} auto-enrolled` : "";
      showToast(`Session booked for ${fmtShort(bDate)} ✓${autoMsg}`);
      // Confirmation email to the person who booked
      if(autoPlayers.includes(currentUser?.name))
        sendBookingConfirm(members.find(m=>m.name===currentUser?.name), newSess, autoPlayers);
    }
    setBDate("");setBNote("");setBLabel("");setBRestrictTeam("");setBNet("1");setBLift("");
    setSelP([currentUser?.name].filter(Boolean));setBPollOpts([...PRESET_POLL]);setBCustomOpt("");
    setView("schedule");
  }

  function setLiftPref(sessId, name, liftObj) {
    // liftObj: {pref,seats,stop,stopOther,note,saved} or "" to clear
    const updated = sessions.map(s => {
      if(s.id !== sessId) return s;
      const lifts = {...(s.lifts||{})};
      if(liftObj && liftObj.pref) lifts[name] = liftObj;
      else delete lifts[name];
      return {...s, lifts};
    });
    saveSessions(updated);
    if(selSess?.id === sessId) {
      const newLifts = {...(selSess.lifts||{})};
      if(liftObj && liftObj.pref) newLifts[name] = liftObj;
      else delete newLifts[name];
      setSelSess({...selSess, lifts: newLifts});
    }
    setLiftEditing(false);
    setLiftDraft(null);
  }

  function handlePostComment(sessId, text) {
    if(!text.trim()) return;
    const comment = { id:uid(), name:currentUser.name, text:text.trim(),
      ts: new Date().toISOString() };
    saveSessions(sessions.map(s => s.id===sessId
      ? {...s, comments:[...(s.comments||[]), comment]}
      : s));
    setCommentText("");
  }

  function handleDeleteComment(sessId, commentId) {
    saveSessions(sessions.map(s => s.id===sessId
      ? {...s, comments:(s.comments||[]).filter(c=>c.id!==commentId)}
      : s));
  }

  function handleVote(sessId, optionId) {
    const userName = currentUser.name;
    const updated = sessions.map(s => {
      if(s.id !== sessId) return s;
      const poll = (s.poll||[]).map(o => {
        if(o.id !== optionId) return o;
        const hasVoted = (o.votes||[]).includes(userName);
        return {...o, votes: hasVoted
          ? o.votes.filter(v=>v!==userName)
          : [...(o.votes||[]), userName]};
      });
      return {...s, poll};
    });
    saveSessions(updated);
    // Keep selSess in sync
    const found = updated.find(s=>s.id===sessId);
    if(found) setSelSess(found);
  }

  function handleLeave(sessId, name) {
    const upd=sessions.map(s=>s.id===sessId
      ?{...s,players:s.players.filter(p=>p!==name)}:s).filter(s=>s.players.length>0);
    saveSessions(upd);
    const found=upd.find(s=>s.id===sessId);
    if(!found){setView("schedule");setSelSess(null);}
    else setSelSess(found);
    showToast("Removed from session");
  }

  // Send booking confirmation email if member has it enabled
  function sendBookingConfirm(member, sess, updatedPlayers) {
    if(!member?.email) return;
    if(!(member.emailBookingConfirm??true)) return;
    fetch("/api/send-booking-confirm",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        email: member.email,
        name:  member.name,
        date:  sess.date,
        from:  sess.from,
        to:    sess.to,
        label: sess.label||"",
        net:   sess.net||"",
        players: updatedPlayers||sess.players||[],
      })
    }).catch(()=>{});
  }

  function handleJoinDetail(name) {
    if(!selSess) return;
    if(selSess.players.includes(name)){showToast("Already in this session");return;}
    // Absence soft warn
    const mem = members.find(m=>m.name===name);
    if(mem && isAbsent(mem, selSess.date)) {
      const abs = (mem.absences||[]).find(a=>a.from<=selSess.date&&a.to>=selSess.date);
      const isSelf = name===currentUser?.name;
      const msg = isSelf
        ? `You've marked yourself away during this period (${abs?.category||"Away"}: ${fmtShort(abs?.from)} – ${fmtShort(abs?.to)}). Add yourself anyway?`
        : `${name.split(" ")[0]} is marked away on this date (${abs?.category||"Away"}: ${fmtShort(abs?.from)} – ${fmtShort(abs?.to)}). Add them anyway?`;
      if(!window.confirm(msg)) return;
    }
    const updatedPlayers = [...selSess.players, name];
    const upd=sessions.map(s=>s.id===selSess.id?{...s,players:updatedPlayers}:s);
    saveSessions(upd);
    setSelSess(upd.find(s=>s.id===selSess.id));
    showToast(`${name.split(" ")[0]} added ✓`);
    if(name===currentUser?.name)
      sendBookingConfirm(members.find(m=>m.name===name), selSess, updatedPlayers);
  }

  function handleDeleteSess(id) {
    const s = sessions.find(x=>x.id===id);
    saveSessions(sessions.filter(s=>s.id!==id));
    if(s) logAction("session", `Deleted session: ${s.date} ${s.from}–${s.to}${s.label?" «"+s.label+"»":""} (${s.players?.length||0} players)`);
    setView("schedule");setSelSess(null);
    showToast("Session deleted");
  }

  function openWA(date) {
    const msg=waMsg(sessions,date);
    if(!msg){showToast("No sessions for that date");return;}
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
  }

  // ── Members ───────────────────────────────────────────────────
  function addMember(e) {
    e.preventDefault();
    if(!newName.trim()) return;
    if(members.find(m=>m.name.toLowerCase()===newName.trim().toLowerCase())){
      showToast("Member already exists"); return;
    }
    const teamLabel = newTeam==="Unassigned" ? "no team" : newTeam;
    const newId = uid();
    const newMember = normMember({
      id: newId, 
      name: newName.trim(),
      // Parents get no team; children and players get the selected team
      teams: (newMemberType==="parent"||newTeam==="Unassigned") ? [] : [newTeam],
      role: "member",
      memberType: newMemberType==="child" ? "player" : newMemberType, // children are stored as players with a parentId
      email: newEmail.trim()||null,
      phone: newPhone.trim()||null,
      children: [],
      parentId: newMemberType==="child" ? (newLinkParent||null) : null,
      parentName: newMemberType==="child" && newLinkParent ? members.find(m=>m.id===newLinkParent)?.name : null,
    });
    
    // If linking child to a parent, also update the parent's children array
    let updatedMembers = [...members, newMember];
    if (newMemberType==="child" && newLinkParent) {
      updatedMembers = updatedMembers.map(m => 
        m.id === newLinkParent 
          ? { ...m, children: [...(m.children||[]), newId], memberType: "parent" }
          : m
      );
    }
    
    saveMembers(updatedMembers);
    const linkInfo = (newMemberType==="child"&&newLinkParent) ? ` · Linked to ${members.find(m=>m.id===newLinkParent)?.name}` : "";
    logAction("member", `Added member: ${newName.trim()} (${teamLabel})${newEmail?" · "+newEmail:""}${linkInfo}`);

    // Auto-generate invite code if requested (useful for members without email)
    if(newGenCode) {
      const code = generateInviteCode(newId);
      setCodeModal({name: newName.trim(), code});
    }

    setNewName(""); setNewEmail(""); setNewPhone(""); setNewMemberType("player"); setNewLinkParent(""); setNewGenCode(false);
    if(!newGenCode) showToast("Member added ✓");
  }

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [codeModal, setCodeModal] = useState(null); // {name, code} — invite code display modal
  const [schedFilter,   setSchedFilter]   = useState("all"); // "all" | "mine"
  const [blocksExpanded, setBlocksExpanded] = useState(false);
  const [showPastAll,       setShowPastAll]       = useState(false);
  const [showUpcomingAll,   setShowUpcomingAll]   = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(()=>{
    try{ return localStorage.getItem("fcc-welcome-v1")==="1"; }catch{ return false; }
  });
  const [showAllBlocks,  setShowAllBlocks]  = useState(false);
  const [xlsParsed,      setXlsParsed]      = useState(null);  // {fixtures, allMatches} from uploaded DCF xlsx
  const [xlsError,       setXlsError]       = useState(null);
  // Availability / absence state
  const [absFrom,        setAbsFrom]        = useState("");
  const [absTo,          setAbsTo]          = useState("");
  const [absCat,         setAbsCat]         = useState("Holiday");
  const [absNote,        setAbsNote]        = useState("");
  const [absConflicts,   setAbsConflicts]   = useState(null);
  const [avTeam,         setAvTeam]         = useState("");   // team availability view selection
  const [showMatches,    setShowMatches]    = useState(true); // match overlay toggle
  const [netsDate,       setNetsDate]       = useState(todayStr());
  const [wxData,         setWxData]         = useState(null); // weather data
  // blockCals — moved to useFirestore (Pass 4)
  const [bCalDate,      setBCalDate]      = useState("");
  const [bCalFrom,      setBCalFrom]      = useState("10:00");
  const [bCalTo,        setBCalTo]        = useState("14:00");
  const [bCalLabel,     setBCalLabel]     = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false); // member object to confirm delete
  const [profileEmail, setProfileEmail]   = useState("");
  const [profilePhone, setProfilePhone]   = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileAttrsEditing, setProfileAttrsEditing] = useState(false);
  const [profileAttrsDraft, setProfileAttrsDraft] = useState({ battingHand: "right", bowlingHand: "right", bowlingStyle: "" });
  const [changingPin,  setChangingPin]    = useState(false);
  const [oldPin,       setOldPin]         = useState("");
  const [newPin1,      setNewPin1]        = useState("");
  const [newPin2,      setNewPin2]        = useState("");
  const [pinMsg,       setPinMsg]         = useState("");

  function removeMember(id) {
    const m = members.find(x=>x.id===id);
    saveMembers(members.filter(m=>m.id!==id));
    if(m) logAction("member", `Deleted member: ${m.name} (was ${m.role||"member"}${m.teams?.length ? ", teams: "+m.teams.join(", ") : ""})`);
    setConfirmDelete(null);
    showToast("Member removed");
  }

  function renameMember(id, newName) {
    const trimmed = newName.trim();
    if(!trimmed) { setEditingName(null); return; }
    const old = members.find(m=>m.id===id)?.name;
    if(!old || trimmed===old) { setEditingName(null); return; }
    if(members.find(m=>m.id!==id && m.name.toLowerCase()===trimmed.toLowerCase())) {
      showToast("Another member already has that name"); return;
    }
    // Update member name
    saveMembers(members.map(m=>m.id===id ? {...m,name:trimmed} : m));
    logAction("member", `Renamed member: "${old}" → "${trimmed}"`);
    // Update all sessions that reference the old name
    const updSess = sessions.map(s=>({
      ...s,
      players: s.players.map(p=>p===old ? trimmed : p),
      poll: (s.poll||[]).map(o=>({
        ...o, votes:(o.votes||[]).map(v=>v===old ? trimmed : v)
      })),
    }));
    saveSessions(updSess);
    setEditingName(null);
    showToast(`Renamed to "${trimmed}" ✓`);
  }

  function fixAllNames() {
    // Only fix members whose entire name is a single word AND it exists in NAME_MAP
    let renames = []; // [{old, new}]
    const newMembers = members.map(m => {
      const isSingleWord = !m.name.includes(" ");
      const mapped = NAME_MAP[m.name];
      if (isSingleWord && mapped && mapped !== m.name) {
        renames.push({ old: m.name, new: mapped });
        return { ...m, name: mapped };
      }
      return m;
    });
    if (renames.length === 0) { showToast("All names already look complete ✓"); return; }
    // Apply renames to sessions (players + poll votes)
    const rMap = Object.fromEntries(renames.map(r => [r.old, r.new]));
    const newSessions = sessions.map(s => ({
      ...s,
      players: s.players.map(p => rMap[p] || p),
      poll: (s.poll || []).map(o => ({
        ...o, votes: (o.votes || []).map(v => rMap[v] || v),
      })),
    }));
    saveMembers(newMembers);
    saveSessions(newSessions);
    logAction("system", `Auto-fixed ${renames.length} name${renames.length>1?"s":""}: ${renames.map(r=>`"${r.old}"→"${r.new}"`).join(", ")}`);
    showToast(`Fixed ${renames.length} name${renames.length > 1 ? "s" : ""} ✓`);
  }

  function toggleMemberTeam(id, teamName) {
    const mem = members.find(m=>m.id===id);
    if(!mem) return;
    const current = mem.teams || [];
    const next = current.includes(teamName)
      ? current.filter(t=>t!==teamName)
      : [...current, teamName];
    // If no senior team remains and role is captain/VC, demote
    const hasSenior = next.some(t=>seniorTeamNames.includes(t));
    const newRole = (!hasSenior && ["captain","vicecaptain"].includes(mem.role))
      ? "member" : mem.role;
    const action = current.includes(teamName) ? "Removed" : "Added";
    logAction("team", `${action} ${mem.name} ${action==="Added"?"to":"from"} ${teamName}${newRole!==mem.role?` (demoted to member — no senior team)`:""}`);
    saveMembers(members.map(m=>m.id===id ? {...m,teams:next,role:newRole} : m));
  }

  function updateRole(id, role) {
    const mem = members.find(m=>m.id===id);
    const hasSenior = (mem?.teams||[]).some(t=>seniorTeamNames.includes(t));
    if(["captain","vicecaptain"].includes(role) && !hasSenior) {
      showToast("Captain/VC only available for Senior team members"); return;
    }
    logAction("role", `Changed role: ${mem?.name} → ${role} (was ${mem?.role||"member"})`);
    saveMembers(members.map(m=>m.id===id?{...m,role}:m));
    setEditingRole(null);
    showToast("Role updated ✓");
  }

  function saveProfile(confirmed=false) {
    const now = new Date().toISOString();
    const updated = members.map(m => m.id===currentUser.id
      ? {...m,
          email: profileEmail.trim(),
          phone: profilePhone.trim(),
          profileConfirmedAt: confirmed ? now : (m.profileConfirmedAt||null),
        } : m);
    saveMembers(updated);
    const fresh = updated.find(m=>m.id===currentUser.id);
    setCurrentUser(fresh);
    localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
    setProfileEditing(false);
    showToast(confirmed ? "Profile confirmed ✓" : "Profile saved ✓");
  }

  function confirmProfile() {
    // Save current details + stamp confirmed date
    setProfileEmail(members.find(m=>m.id===currentUser.id)?.email||"");
    setProfilePhone(members.find(m=>m.id===currentUser.id)?.phone||"");
    saveProfile(true);
  }

  function handleChangePin() {
    if(!oldPin||!newPin1||!newPin2){setPinMsg("Fill in all fields");return;}
    // EMERGENCY: Accept 0000 as valid current PIN for everyone during recovery
    const isValidCurrent = oldPin === "0000" || hashPin(oldPin) === pins[currentUser.id];
    if(!isValidCurrent){setPinMsg("Current PIN is incorrect");return;}
    if(newPin1.length!==4||!/^\d+$/.test(newPin1)){setPinMsg("New PIN must be 4 digits");return;}
    if(newPin1!==newPin2){setPinMsg("New PINs don't match");return;}
    savePins({...pins,[currentUser.id]:hashPin(newPin1)});
    setChangingPin(false);setOldPin("");setNewPin1("");setNewPin2("");setPinMsg("");
    showToast("PIN changed ✓");
  }

  function resetPin(id) {
    const m = members.find(x=>x.id===id);
    const updated={...pins}; delete updated[id];
    savePins(updated);
    if(m) logAction("pin", `Reset PIN for: ${m.name}`);
    showToast("PIN cleared — member sets new PIN on next login");
  }

  // ── Computed ──────────────────────────────────────────────────
  const upcoming = [...sessions].filter(s=>!isSessionPast(s))
    .sort((a,b)=>new Date(a.date)-new Date(b.date)||a.from.localeCompare(b.from));
  const past=[...sessions].filter(s=>isSessionPast(s))
    .sort((a,b)=>new Date(b.date)-new Date(a.date)||b.from.localeCompare(a.from));

  const tomorrowSess=sessions.filter(s=>s.date===tomorrowStr()&&!isSessionPast(s));
  const todaySess   =sessions.filter(s=>s.date===todayStr()   &&!isSessionPast(s));

  // Player picker — member appears under EACH of their teams
  const pickVisible = members.filter(m=>
    !pSearch || m.name.toLowerCase().includes(pSearch.toLowerCase())
  );
  const myTeamsList = currentUser ? (members.find(m=>m.id===currentUser.id)?.teams||[]) : [];
  // Build pickGrouped with user's teams first, then others
  // IMPORTANT: Each player appears under their FIRST matching team only (no duplicates)
  const pickGrouped = (()=>{
    // Sort teams: user's teams first, then alphabetical
    const sortedTeams = [...ALL_TEAMS].sort((a,b)=>{
      const aIsMine = myTeamsList.includes(a);
      const bIsMine = myTeamsList.includes(b);
      if(aIsMine && !bIsMine) return -1;
      if(!aIsMine && bIsMine) return 1;
      return a.localeCompare(b);
    });
    
    const seen = new Set(); // Track which player IDs we've already placed
    const obj = {};
    
    for(const t of sortedTeams) {
      if(pFilter!=="All" && pFilter!==t) continue;
      const list = pickVisible.filter(m => {
        if(seen.has(m.id)) return false; // Already placed in another group
        const belongsToTeam = t==="Unassigned" 
          ? (m.teams||[]).length===0
          : (m.teams||[]).includes(t);
        if(belongsToTeam) {
          seen.add(m.id); // Mark as placed
          return true;
        }
        return false;
      });
      if(list.length) obj[t] = list;
    }
    
    return obj;
  })();

  // Admin list — member shown under EACH team (or Unassigned if none)
  const adminVisible = members.filter(m=>{
    const q=!aSearch||m.name.toLowerCase().includes(aSearch.toLowerCase());
    const t=aFilter==="All"
      ||(aFilter==="Unassigned" && (m.teams||[]).length===0)
      ||(m.teams||[]).includes(aFilter);
    return q&&t;
  });
  const adminGrouped = ALL_TEAMS.reduce((acc,t)=>{
    if(aFilter!=="All"&&aFilter!==t) return acc;
    const list = adminVisible.filter(m=>
      t==="Unassigned"
        ? (m.teams||[]).length===0
        : (m.teams||[]).includes(t)
    );
    if(list.length) acc[t]=list;
    return acc;
  },{});

  // ════════════════════════════════════════════════════════════
  // Pass 5: assemble shared context value
  // ════════════════════════════════════════════════════════════
  // Pure plumbing — wired into <AppContext.Provider> below, around the
  // entire render. View blocks still read these values from App's
  // closure today; Pass 6 will rewrite them to call useAppContext().
  const contextValue = {
    // ── from useFirestore (Pass 4 hook) ────────────────────────
    ...firestoreState,
    // ── from useAuth (Pass 4 hook) ─────────────────────────────
    ...authState,
    // ── theme ──────────────────────────────────────────────────
    G, themeKey, setThemeKey, applyTheme,
    // ── core UI state ──────────────────────────────────────────
    view, setView,
    selSess, setSelSess,
    toast, setToast, showToast,
    sessAttendance, setSessAttendance,
    attendanceSessionContext, setAttendanceSessionContext,
    sessCoachView, setSessCoachView,
    sessNotes, setSessNotes,
    sessNotesDraft, setSessNotesDraft,
    cancelModal, setCancelModal,
    // ── add-session form ───────────────────────────────────────
    bDate, setBDate, bFrom, setBFrom, bTo, setBTo,
    bNote, setBNote, bLabel, setBLabel, bNet, setBNet, bLift, setBLift,
    liftEditing, setLiftEditing, liftDraft, setLiftDraft,
    carpoolFocus, setCarpoolFocus,
    notInExpanded, setNotInExpanded,
    notInSearch, setNotInSearch,
    editingLocation, setEditingLocation,
    assignOpen, setAssignOpen,
    cancelReason, setCancelReason,
    showCancelled, setShowCancelled,
    carpoolSheetSess, setCarpoolSheetSess,
    carpoolRef,
    bRestrictTeam, setBRestrictTeam,
    selP, setSelP, pSearch, setPSearch, pFilter, setPFilter,
    otherGroupsOpen, setOtherGroupsOpen,
    bPollOpts, setBPollOpts, bCustomOpt, setBCustomOpt,
    commentText, setCommentText,
    // ── admin form / member-list state ─────────────────────────
    newName, setNewName, newTeam, setNewTeam,
    newEmail, setNewEmail, newPhone, setNewPhone,
    newMemberType, setNewMemberType,
    newLinkParent, setNewLinkParent,
    newGenCode, setNewGenCode,
    aSearch, setASearch, aFilter, setAFilter,
    adminListMode, setAdminListMode,
    selMember, setSelMember,
    expandedSessions, setExpandedSessions,
    editingRole, setEditingRole,
    // ── team management state ──────────────────────────────────
    newTName, setNewTName,
    newTSenior, setNewTSenior,
    editingTeam, setEditingTeam,
    coachSearch, setCoachSearch,
    // ── Captain XI state ───────────────────────────────────────
    captainXIModal, setCaptainXIModal,
    xiSelection, setXiSelection,
    xiRoles, setXiRoles,
    xiNote, setXiNote,
    xiReportTime, setXiReportTime,
    xiMatchTime, setXiMatchTime,
    xiReportTimeUserTouched, setXiReportTimeUserTouched,
    templatesModalOpen, setTemplatesModalOpen,
    templateEditingId, setTemplateEditingId,
    templateEditingText, setTemplateEditingText,
    templateNewText, setTemplateNewText,
    templatePickerOpen, setTemplatePickerOpen,
    xiResetModalOpen, setXiResetModalOpen,
    xiResetSelected, setXiResetSelected,
    // ── admin section collapse ─────────────────────────────────
    adminSec, setAdminSec, toggleAdminSec,
    editingName, setEditingName,
    // ── recurring slot form ────────────────────────────────────
    DAYS,
    rName, setRName, rTeam, setRTeam, rRestrict, setRRestrict,
    rDay, setRDay, rFrom, setRFrom, rTo, setRTo,
    rActiveFrom, setRActiveFrom, rActiveTo, setRActiveTo,
    rNet, setRNet,
    editingSlot, setEditingSlot,
    // ── help / audit log UI ────────────────────────────────────
    helpMsg, setHelpMsg, helpCat, setHelpCat,
    logFilter, setLogFilter, logOpen, setLogOpen,
    // ── request-to-join form ───────────────────────────────────
    jrName, setJrName, jrTeam, setJrTeam,
    jrContact, setJrContact, jrPhone, setJrPhone,
    jrForChild, setJrForChild,
    jrChildName, setJrChildName, jrChildTeam, setJrChildTeam,
    // ── profile tabs ───────────────────────────────────────────
    profileTab, setProfileTab,
    showAllMatches, setShowAllMatches,
    // ── self-service verify flow ───────────────────────────────
    vfStep, setVfStep, vfSearch, setVfSearch, vfMatch, setVfMatch,
    vfEmail, setVfEmail, vfPhone, setVfPhone,
    vfCode, setVfCode, vfSentCode, setVfSentCode,
    vfCodeExpiry, setVfCodeExpiry, vfSending, setVfSending,
    vfError, setVfError, vfConsent, setVfConsent,
    vfIsParent, setVfIsParent,
    vfChildName, setVfChildName,
    vfNewName, setVfNewName, vfNewTeam, setVfNewTeam,
    // ── confirm/code/sched/availability state ──────────────────
    confirmDelete, setConfirmDelete,
    codeModal, setCodeModal,
    schedFilter, setSchedFilter,
    blocksExpanded, setBlocksExpanded,
    showPastAll, setShowPastAll,
    showUpcomingAll, setShowUpcomingAll,
    welcomeDismissed, setWelcomeDismissed,
    showAllBlocks, setShowAllBlocks,
    xlsParsed, setXlsParsed, xlsError, setXlsError,
    absFrom, setAbsFrom, absTo, setAbsTo,
    absCat, setAbsCat, absNote, setAbsNote,
    absConflicts, setAbsConflicts,
    avTeam, setAvTeam,
    showMatches, setShowMatches,
    netsDate, setNetsDate,
    wxData, setWxData,
    bCalDate, setBCalDate, bCalFrom, setBCalFrom,
    bCalTo, setBCalTo, bCalLabel, setBCalLabel,
    showBlockForm, setShowBlockForm,
    profileEmail, setProfileEmail,
    profilePhone, setProfilePhone,
    profileEditing, setProfileEditing,
    profileAttrsEditing, setProfileAttrsEditing,
    profileAttrsDraft, setProfileAttrsDraft,
    changingPin, setChangingPin,
    oldPin, setOldPin, newPin1, setNewPin1, newPin2, setNewPin2,
    pinMsg, setPinMsg,
    // ── derived values used inside view blocks ─────────────────
    userRole, seniorTeamNames, ALL_TEAMS,
    upcoming, past, tomorrowSess, todaySess,
    pickVisible, myTeamsList, pickGrouped,
    adminVisible, adminGrouped,
    // ── misc helpers defined inside App ────────────────────────
    generateInviteCode, genCode, hashCode,
    addTeam, renameTeam, deleteTeam, toggleTeamSenior,
    addRecurringSlot, toggleRecurringSlot, deleteRecurringSlot,
    deleteRecurringSlotSilent, updateRecurringSlot,
    timesOverlap, handleAddSession,
    setLiftPref, handlePostComment, handleDeleteComment,
    handleVote, handleLeave, sendBookingConfirm,
    handleJoinDetail, handleDeleteSess, openWA,
    addMember, removeMember, renameMember, fixAllNames,
    toggleMemberTeam, updateRole,
    saveProfile, confirmProfile, handleChangePin, resetPin,
    // ── module-scope constants commonly referenced ─────────────
    uid,
  };

  // ════════════════════════════════════════════════════════════
  // RENDER: Loading
  // ════════════════════════════════════════════════════════════
  const renderApp = () => {
  if(loading) return (
    <Shell G={G}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
        <div style={{textAlign:"center",color:G.mid}}>
          <div style={{fontSize:48,marginBottom:12}}>🏏</div>
          <div style={{fontWeight:800,fontSize:18}}>Loading FCC Training…</div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — pick member
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="pick") {
    const filtered = pickSearch.trim().length >= 1
      ? members.filter(m => m.name.toLowerCase().includes(pickSearch.toLowerCase()))
      : [];
    const hasQuery = pickSearch.trim().length >= 1;

    return (
      <Shell G={G}>
        {/* Header */}
        <div style={{background:G.green, padding:"36px 24px 32px", textAlign:"center"}}>
          <img src={FCC_LOGO} alt="FCC" style={{width:88,height:88,borderRadius:"50%",
            objectFit:"cover",margin:"0 auto 14px",display:"block",
            border:"3px solid rgba(255,255,255,0.25)",
            boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}/>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:28,fontWeight:900,letterSpacing:"-.5px",lineHeight:1}}>FCC Training</div>
          <div style={{color:"rgba(255,255,255,0.45)",fontSize:11,fontWeight:700,
            letterSpacing:2.5,textTransform:"uppercase",marginTop:5}}>Fredensborg CC</div>
        </div>

        <div style={{padding:"24px 20px 40px"}}>
          {/* Prompt text */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:15,fontWeight:800,color:G.text}}>Enter your name to find your profile and log in</div>
            <div style={{fontSize:12,color:G.muted,marginTop:4}}>
              Not listed? Ask an admin to add you.
            </div>
          </div>

          {/* Search input */}
          <div style={{position:"relative",marginBottom:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
              fontSize:18,pointerEvents:"none"}}>🔍</span>
            <input
              style={{...iSt({background:G.white,paddingLeft:44,fontSize:16,
                borderRadius:14,padding:"14px 14px 14px 44px",
                boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}),}}
              placeholder="Start typing your name…"
              value={pickSearch}
              onChange={e=>setPickSearch(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Results as chips */}
          {hasQuery && filtered.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:9,justifyContent:"center",
              marginTop:8}}>
              {filtered.map(m=>{
                const tm = m.team ? getTeamMeta(m.team) : null;
                return (
                  <button key={m.id} onClick={()=>handlePickMember(m)}
                    style={{
                      background: tm ? tm.bg : G.green,
                      color: tm ? tm.text : G.lime,
                      border:"none", borderRadius:30,
                      padding:"10px 18px",
                      fontFamily:"inherit", fontWeight:800, fontSize:14,
                      cursor:"pointer",
                      display:"flex", alignItems:"center", gap:7,
                      boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
                      transition:"transform .1s, box-shadow .1s",
                    }}
                    onMouseDown={e=>e.currentTarget.style.transform="scale(0.96)"}
                    onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
                  >
                    <span style={{width:24,height:24,borderRadius:"50%",
                      background:"rgba(255,255,255,0.2)",display:"inline-flex",
                      alignItems:"center",justifyContent:"center",
                      fontSize:10,fontWeight:900,flexShrink:0}}>
                      {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                    </span>
                    {m.name}
                    {(()=>{
                      const chips=getMemberRoleChips(m,teams);
                      return chips.length>0
                        ? <span style={{fontSize:12}}>{chips[0].icon}</span>
                        : null;
                    })()}
                  </button>
                );
              })}
            </div>
          )}

          {/* No results — offer Request to Join */}
          {hasQuery && filtered.length === 0 && (
            <div style={{textAlign:"center",padding:"24px 0 8px"}}>
              <div style={{fontSize:32,marginBottom:8}}>🤔</div>
              <div style={{fontWeight:800,color:G.text,fontSize:15}}>Not found</div>
              <div style={{fontSize:13,color:G.muted,marginTop:4,marginBottom:18,lineHeight:1.6}}>
                Not in the app yet? Submit a request<br/>and an admin will add you.
              </div>
              <button onClick={()=>{
                  setJrName(pickSearch.trim());
                  setJrTeam(""); setJrContact(""); setJrPhone(""); setJrForChild(false);
                  setJrChildName(""); setJrChildTeam("");
                  setAuthView("joinrequest");
                }}
                style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
                  padding:"12px 24px",fontFamily:"inherit",fontWeight:800,fontSize:14,
                  cursor:"pointer",boxShadow:"0 3px 12px rgba(20,83,45,.3)"}}>
                ✋ Request to Join
              </button>
            </div>
          )}

          {/* Idle hint */}
          {!hasQuery && (
            <div style={{textAlign:"center",padding:"20px 0 0"}}>
              <div style={{fontSize:40,marginBottom:10,opacity:.4}}>🏏</div>
              <div style={{fontSize:13,color:G.muted,lineHeight:1.7}}>
                {members.length} members registered<br/>
                <span style={{fontWeight:700,color:G.text}}>Start typing</span> to find your name
              </div>
              <div style={{marginTop:20,paddingTop:20,borderTop:`1px solid ${G.border}`}}>
                {/* Two-button row: existing members + new members */}
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{fontSize:12,color:G.muted,marginBottom:2}}>
                    Already a member?
                  </div>
                  <button onClick={()=>{setVfStep("search");setVfSearch("");setVfMatch(null);setVfEmail("");setVfPhone("");setVfCode("");setVfError("");setVfConsent(false);setVfIsParent(false);setAuthView("verify");}}
                    style={{background:G.white,color:G.green,border:`1.5px solid ${G.green}`,
                      borderRadius:20,padding:"9px 22px",fontSize:13,fontWeight:800,
                      cursor:"pointer",fontFamily:"inherit"}}>
                    ✅ Find My Account
                  </button>
                  <div style={{fontSize:10,color:G.muted,lineHeight:1.5}}>
                    Have an <b>FCC-XXXX</b> code from your admin?<br/>
                    Find your name first, then enter it.
                  </div>
                  <div style={{height:1,background:G.border,margin:"4px 0"}}/>
                  <div style={{fontSize:12,color:G.muted,marginBottom:2}}>
                    New to Fredensborg CC?
                  </div>
                  <button onClick={()=>{
                      setJrName(""); setJrTeam(""); setJrContact(""); setJrPhone("");
                      setJrForChild(false); setJrChildName(""); setJrChildTeam("");
                      setAuthView("joinrequest");
                    }}
                    style={{background:G.green,color:G.lime,border:"none",
                      borderRadius:20,padding:"9px 22px",fontSize:13,fontWeight:800,
                      cursor:"pointer",fontFamily:"inherit",
                      boxShadow:"0 3px 12px rgba(20,83,45,.25)"}}>
                    ✋ Join Fredensborg CC
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — Request to Join
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="joinrequest") {
    const nonPlayerOption = "I don't play / I'm a parent";
    const teamOptions = [...ALL_TEAMS.filter(t=>t!=="Unassigned"), nonPlayerOption];

    function submitJoinRequest() {
      const nameToCheck = jrForChild ? jrChildName.trim() : jrName.trim();
      if(!nameToCheck) { showToast("Please enter a name"); return; }
      const teamVal = jrForChild ? jrChildTeam : jrTeam;
      const req = {
        id: uid(),
        submittedAt: new Date().toISOString(),
        forChild: jrForChild,
        playerName: jrForChild ? jrChildName.trim() : jrName.trim(),
        playerTeam: teamVal==="unsure" ? null : (teamVal||null),
        parentName: jrForChild ? jrName.trim() : null,
        email: jrContact.trim()||null,      // stored as email not contact
        contact: jrPhone.trim()||null,       // phone in contact
        status: "pending",
      };
      saveJoinRequests([...joinRequests, req]);
      fetch("/api/notify", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          type:"joinrequest",
          data:{
            name: req.playerName,
            playerTeam: req.playerTeam||"Not sure yet",
            message: req.parentName
              ? `Parent: ${req.parentName}${req.email?" · "+req.email:""}${req.contact?" · "+req.contact:""}`
              : `${req.email||""}${req.contact?" · "+req.contact:""}`
          }
        })
      }).catch(()=>{});
      setAuthView("joinrequestdone");
    }

    return (
      <Shell G={G}>
        <div style={{background:G.green,padding:"20px 20px 16px",textAlign:"center"}}>
          <div style={{fontSize:26,marginBottom:4}}>✋</div>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Request to Join</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>
            An admin will review and add you shortly
          </div>
        </div>

        <div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Registering for yourself or a child? */}
          <div style={{background:"#fff",border:`1.5px solid ${G.border}`,borderRadius:12,
            padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:G.muted,
              textTransform:"uppercase",marginBottom:10}}>Who are you registering?</div>
            <div style={{display:"flex",gap:8}}>
              {[{v:false,label:"🙋 Myself"},{v:true,label:"👶 My child"}].map(opt=>(
                <button key={String(opt.v)} onClick={()=>{
                    if(opt.v && !jrForChild) {
                      // Switching TO child tab — move typed name to child field
                      if(jrName.trim()) { setJrChildName(jrName.trim()); setJrName(""); }
                    } else if(!opt.v && jrForChild) {
                      // Switching BACK to myself — move child name back if parent name empty
                      if(!jrName.trim() && jrChildName.trim()) { setJrName(jrChildName.trim()); setJrChildName(""); }
                    }
                    setJrForChild(opt.v);
                  }}
                  style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",
                    cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,
                    background:jrForChild===opt.v ? G.green : G.bg,
                    color:jrForChild===opt.v ? G.lime : G.muted,
                    transition:"all .12s"}}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Your name (always shown — either player or parent) */}
          <div style={{background:"#fff",border:`1.5px solid ${G.border}`,borderRadius:12,
            padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
            <FFld G={G} label={jrForChild ? "Your Name (Parent / Guardian)" : "Your Full Name"}>
              <input placeholder={jrForChild ? "e.g. Priya Sharma" : "e.g. Arjun Sharma"}
                style={iSt()} value={jrName}
                onChange={e=>setJrName(e.target.value)}/>
            </FFld>
            {!jrForChild&&(
              <FFld G={G} label="Your Team / Group">
                <select style={iSt()} value={jrTeam} onChange={e=>setJrTeam(e.target.value)}>
                  <option value="">— Select your team —</option>
                  {teamOptions.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </FFld>
            )}
            <FFld G={G} label="Your Email">
              <input type="email" placeholder="your@email.com"
                style={iSt()} value={jrContact}
                onChange={e=>setJrContact(e.target.value)}/>
            </FFld>
            <FFld G={G} label="Your Phone (optional)">
              <input type="tel" placeholder="+45 XX XX XX XX"
                style={iSt()} value={jrPhone||""}
                onChange={e=>setJrPhone?.(e.target.value)}/>
            </FFld>
          </div>

          {/* Child details — only if registering for child */}
          {jrForChild&&(
            <div style={{background:"#fdf2f8",border:"1.5px solid #f9a8d4",borderRadius:12,
              padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,
                color:"#be185d",textTransform:"uppercase",marginBottom:2}}>
                👶 Child's Details
              </div>
              <FFld G={G} label="Child's Full Name">
                <input placeholder="Child's full name"
                  style={iSt()} value={jrChildName}
                  onChange={e=>setJrChildName(e.target.value)}/>
              </FFld>
              <FFld G={G} label="Child's Team / Group">
                <select style={iSt()} value={jrChildTeam} onChange={e=>setJrChildTeam(e.target.value)}>
                  <option value="">— Select team —</option>
                  <option value="unsure">I'm not sure</option>
                  {teamOptions.filter(t=>t!==nonPlayerOption).map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FFld>
            </div>
          )}

          <button onClick={submitJoinRequest}
            style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
              padding:"15px",fontSize:15,fontWeight:800,cursor:"pointer",
              fontFamily:"inherit",boxShadow:"0 3px 14px rgba(20,83,45,.3)"}}>
            Submit Request →
          </button>
          <button onClick={()=>setAuthView("pick")}
            style={{background:"transparent",color:G.muted,border:"none",
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"6px"}}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — Request submitted confirmation
  // ════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════
  // RENDER: Self-service Verify / Onboarding
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="verify") {
    const ALL_TEAM_OPTS = teams.map(t=>t.name);
    const JUNIOR_TEAMS = teams.filter(t => 
      t.name.startsWith("U") || t.name === "Kvinder" || t.name.includes("Girls")
    ).map(t => t.name);
    const vfFiltered = vfSearch.trim().length>=2
      ? members.filter(m=>m.name.toLowerCase().includes(vfSearch.toLowerCase())).slice(0,8)
      : [];

    function generateCode() {
      return String(Math.floor(100000+Math.random()*900000));
    }

    async function sendCode(email, name) {
      setVfSending(true); setVfError("");
      const code = generateCode();
      try {
        const r = await fetch("/api/send-verify",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({email, name, code})
        });
        if(!r.ok) throw new Error("Send failed");
        const expiry = Date.now()+15*60*1000;
        setVfSentCode(code);
        setVfCodeExpiry(expiry);
        setVfStep("code");
        // Persist state so user doesn't lose it if they navigate away
        localStorage.setItem("fcc-verify-state", JSON.stringify({
          code,
          expiry,
          email,
          step: "code",
          matchId: vfMatch?.id || null,
        }));
      } catch(e) {
        setVfError("Could not send email. Please check the address and try again.");
      }
      setVfSending(false);
    }

    function verifyCode() {
      if(!vfSentCode) { setVfError("No code sent yet"); return; }
      if(Date.now()>vfCodeExpiry) { setVfError("Code expired — please request a new one"); return; }
      if(vfCode.trim()!==vfSentCode) { setVfError("Incorrect code — please try again"); return; }
      
      // Clear persisted state
      localStorage.removeItem("fcc-verify-state");
      
      // Code correct — activate account
      if(vfMatch) {
        // Update existing member with email/phone + consent
        const updated = members.map(m=>m.id===vfMatch.id ? {
          ...m,
          email: vfEmail.trim()||m.email,
          phone: vfPhone.trim()||m.phone,
          emailVerified: true,
          consentGiven: true,
          consentDate: new Date().toISOString().slice(0,10),
        } : m);
        saveMembers(updated);
        // Generate invite code so they can log in now
        generateInviteCode(vfMatch.id);
        logAction("member",`Self-verified email: ${vfMatch.name} — ${vfEmail}`);
        setVfStep("done");
      } else if(vfIsParent) {
        // Parent signing up — check if child already exists in the system
        const childName = vfChildName.trim().toLowerCase();
        const existingChild = members.find(m => 
          m.name.toLowerCase() === childName && 
          (m.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder"))
        );
        
        if(existingChild) {
          // Child exists — create parent account and link them
          const parentId = uid();
          const parentMember = {
            id: parentId,
            name: vfNewName.trim(),
            email: vfEmail.trim(),
            phone: vfPhone.trim()||"",
            teams: [],
            role: "member",
            memberType: "parent",
            children: [existingChild.id],
            emailVerified: true,
            consentGiven: vfConsent,
            consentDate: new Date().toISOString().slice(0,10),
            joinedAt: new Date().toISOString(),
          };
          
          // Update child to reference parent
          const updated = members.map(m => 
            m.id === existingChild.id 
              ? { ...m, parentId: parentId, parentName: vfNewName.trim() }
              : m
          );
          updated.push(parentMember);
          saveMembers(updated);
          generateInviteCode(parentId);
          logAction("member",`Parent verified and linked to existing child: ${vfNewName} → ${existingChild.name}`);
          setVfStep("done");
        } else {
          // Child doesn't exist — create join request for approval
          const req = {
            id: uid(),
            submittedAt: new Date().toISOString(),
            forChild: true,
            playerName: vfChildName.trim(),
            playerTeam: vfNewTeam||null,
            parentName: vfNewName.trim(),
            contact: vfPhone.trim()||null,
            email: vfEmail.trim(),
            emailVerified: true,
            consentGiven: vfConsent,
            consentDate: new Date().toISOString().slice(0,10),
            status:"pending",
          };
          saveJoinRequests([...joinRequests, req]);
          fetch("/api/notify",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({type:"joinrequest",data:{
              name:req.playerName, playerTeam:req.playerTeam,
              message:`Parent signup (child not found): ${vfNewName} registering ${vfChildName}`
            }})}).catch(()=>{});
          setVfStep("done");
        }
      } else {
        // New adult player — create join request with verified email
        const req = {
          id: uid(),
          submittedAt: new Date().toISOString(),
          forChild: false,
          playerName: vfNewName.trim(),
          playerTeam: vfNewTeam||null,
          parentName: null,
          contact: vfPhone.trim()||null,
          email: vfEmail.trim(),
          emailVerified: true,
          consentGiven: vfConsent,
          consentDate: new Date().toISOString().slice(0,10),
          status:"pending",
        };
        saveJoinRequests([...joinRequests, req]);
        fetch("/api/notify",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({type:"joinrequest",data:{
            name:req.playerName, playerTeam:req.playerTeam,
            message:`Email verified: ${vfEmail}`
          }})}).catch(()=>{});
        setVfStep("done");
      }
    }

    const hdr = (title,sub) => (
      <div style={{background:G.green,padding:"20px 20px 16px",textAlign:"center"}}>
        <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
          fontSize:18,fontWeight:900}}>{title}</div>
        {sub&&<div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>{sub}</div>}
      </div>
    );

    // ── Step: done ────────────────────────────────────────────
    if(vfStep==="done") return (
      <Shell G={G}>
        {hdr("All done! 🎉","FCC Training")}
        <div style={{padding:"32px 24px",textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:16}}>✅</div>
          {vfMatch ? (<>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,
              color:G.green,marginBottom:10}}>Account activated!</div>
            <div style={{fontSize:14,color:G.muted,lineHeight:1.6,marginBottom:24}}>
              Your email has been verified and your account is now set up.
              Go back to the login screen and tap your name to log in.
            </div>
          </>) : (<>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,
              color:G.green,marginBottom:10}}>Request submitted!</div>
            <div style={{fontSize:14,color:G.muted,lineHeight:1.6,marginBottom:24}}>
              Your email is verified. The admin will review your request and
              you'll be added to the app shortly.
            </div>
          </>)}
          <button onClick={()=>{setAuthView("pick");setVfStep("search");}}
            style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
              padding:"12px 28px",fontSize:14,fontWeight:800,cursor:"pointer",
              fontFamily:"inherit"}}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );

    // ── Step: code verification ───────────────────────────────
    if(vfStep==="code") return (
      <Shell G={G}>
        {hdr("Check your email","Enter the 6-digit code we sent you")}
        <div style={{padding:"24px 20px 40px"}}>
          <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:12,
            padding:"12px 16px",marginBottom:20,fontSize:13,color:"#166534"}}>
            📧 Code sent to <b>{vfEmail}</b>. Check your inbox (and spam folder).
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:6}}>
              ENTER 6-DIGIT CODE
            </label>
            <input value={vfCode} onChange={e=>setVfCode(e.target.value.replace(/\D/g,"").slice(0,6))}
              inputMode="numeric" maxLength={6} placeholder="123456"
              style={{...iSt({fontSize:24,textAlign:"center",letterSpacing:6,fontWeight:900,
                padding:"14px",borderRadius:12})}}/>
          </div>
          {vfError&&<div style={{background:G.redBg,color:G.red,borderRadius:8,
            padding:"8px 12px",fontSize:13,marginBottom:12}}>{vfError}</div>}
          <Btn bg={G.green} col={G.lime} full
            onClick={verifyCode} disabled={vfCode.length!==6}>
            ✓ Verify Code
          </Btn>
          <button onClick={()=>sendCode(vfEmail,vfMatch?.name||vfNewName)}
            style={{width:"100%",marginTop:10,background:"none",border:`1px solid ${G.border}`,
              borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:G.muted,
              cursor:"pointer",fontFamily:"inherit"}}>
            {vfSending?"Sending…":"Resend code"}
          </button>
          <button onClick={()=>setVfStep(vfMatch?"found":"notfound")}
            style={{width:"100%",marginTop:8,background:"none",border:"none",
              fontSize:12,color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
            ← Back
          </button>
        </div>
      </Shell>
    );

    // ── Step: found — existing member ─────────────────────────
    if(vfStep==="found" && vfMatch) {
      const hasEmail = !!(vfMatch.email||"").trim();
      return (
        <Shell G={G}>
          {hdr(`Hi, ${vfMatch.name.split(" ")[0]}!`,"FCC Training — account setup")}
          <div style={{padding:"20px 20px 40px"}}>
            {/* Privacy notice */}
            <div style={{background:G.cream,border:`1px solid ${G.border}`,borderRadius:10,
              padding:"12px 14px",marginBottom:16,fontSize:11,color:G.muted,lineHeight:1.6}}>
              <b style={{color:G.text}}>🔐 Privacy notice</b><br/>{PRIVACY_TEXT}
            </div>

            {hasEmail ? (<>
              <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:10,
                padding:"12px 14px",marginBottom:16}}>
                <div style={{fontWeight:800,fontSize:13,color:"#166534",marginBottom:4}}>
                  ✅ We have an email on file
                </div>
                <div style={{fontSize:13,color:G.muted}}>
                  {vfMatch.email.replace(/(.{2})(.*)(@.*)/, (m,a,b,c)=>a+"•".repeat(b.length)+c)}
                </div>
              </div>
              <div style={{fontSize:13,color:G.muted,marginBottom:16,lineHeight:1.6}}>
                Is this the correct email? We'll send a verification code to confirm.
              </div>
              <Btn bg={G.green} col={G.lime} full disabled={vfSending}
                onClick={()=>{ setVfEmail(vfMatch.email); sendCode(vfMatch.email, vfMatch.name); }}>
                {vfSending?"Sending…":"📧 Send verification code"}
              </Btn>
              <button onClick={()=>{setVfStep("search");}}
                style={{width:"100%",marginTop:10,background:"none",border:`1px solid ${G.border}`,
                  borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:G.muted,
                  cursor:"pointer",fontFamily:"inherit"}}>
                Not me / use a different email
              </button>
            </>) : (<>
              <div style={{fontSize:14,color:G.text,fontWeight:700,marginBottom:16}}>
                We found your profile but don't have your email yet.
                Add it below to activate your account.
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
                  YOUR EMAIL ADDRESS
                </label>
                <input type="email" value={vfEmail} onChange={e=>setVfEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
                  PHONE NUMBER <span style={{fontWeight:400}}>(optional)</span>
                </label>
                <input type="tel" value={vfPhone} onChange={e=>setVfPhone(e.target.value)}
                  placeholder="+45 XX XX XX XX"
                  style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
              </div>
              {vfError&&<div style={{background:G.redBg,color:G.red,borderRadius:8,
                padding:"8px 12px",fontSize:13,marginBottom:12}}>{vfError}</div>}
              <Btn bg={G.green} col={G.lime} full disabled={!vfEmail.includes("@")||vfSending}
                onClick={()=>sendCode(vfEmail,vfMatch.name)}>
                {vfSending?"Sending…":"📧 Send verification code"}
              </Btn>
            </>)}
            <button onClick={()=>setVfStep("search")}
              style={{width:"100%",marginTop:8,background:"none",border:"none",
                fontSize:12,color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
              ← Back to search
            </button>
          </div>
        </Shell>
      );
    }

    // ── Step: notfound — new member/parent ────────────────────
    if(vfStep==="notfound") return (
      <Shell G={G}>
        {hdr("Join Fredensborg CC","Set up your account")}
        <div style={{padding:"20px 20px 40px"}}>
          {/* Privacy notice */}
          <div style={{background:G.cream,border:`1px solid ${G.border}`,borderRadius:10,
            padding:"12px 14px",marginBottom:16,fontSize:11,color:G.muted,lineHeight:1.6}}>
            <b style={{color:G.text}}>🔐 Privacy notice</b><br/>{PRIVACY_TEXT}
          </div>

          {/* Parent toggle */}
          <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:16,
            cursor:"pointer",padding:"12px 14px",background:vfIsParent?"#dbeafe":"#f0fdf4",borderRadius:10,
            border:`1.5px solid ${vfIsParent?"#3b82f6":"#86efac"}`}}>
            <input type="checkbox" checked={vfIsParent}
              onChange={e=>setVfIsParent(e.target.checked)}
              style={{width:18,height:18,cursor:"pointer",flexShrink:0,marginTop:2}}/>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:vfIsParent?"#1e40af":"#166534"}}>
                I'm a parent registering on behalf of my child
              </span>
              {vfIsParent && (
                <div style={{fontSize:11,color:"#3b82f6",marginTop:4,lineHeight:1.4}}>
                  ✓ Your child will be added to the team roster. You'll receive booking confirmations at your email.
                </div>
              )}
              {!vfIsParent && (
                <div style={{fontSize:11,color:"#15803d",marginTop:4,lineHeight:1.4}}>
                  I am a player registering myself (adult or youth 16+)
                </div>
              )}
            </div>
          </label>

          {vfIsParent&&(
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
                CHILD'S NAME
              </label>
              <input value={vfChildName} onChange={e=>setVfChildName(e.target.value)}
                placeholder="Child's full name"
                style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
            </div>
          )}

          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
              {vfIsParent?"YOUR NAME (parent/guardian)":"YOUR FULL NAME"}
            </label>
            <input value={vfNewName} onChange={e=>setVfNewName(e.target.value)}
              placeholder={vfIsParent?"Parent/guardian name":"Your full name"}
              style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
              {vfIsParent?"CHILD'S TEAM / GROUP":"YOUR TEAM / GROUP"}
            </label>
            <select value={vfNewTeam} onChange={e=>setVfNewTeam(e.target.value)}
              style={iSt({fontSize:14,padding:"12px 14px",borderRadius:10})}>
              <option value="">{vfIsParent?"Select your child's team…":"Select your team…"}</option>
              <option value="unsure">Not sure</option>
              {vfIsParent 
                ? JUNIOR_TEAMS.map(t=><option key={t} value={t}>{t}</option>)
                : ALL_TEAM_OPTS.map(t=><option key={t} value={t}>{t}</option>)
              }
            </select>
            {vfIsParent && (
              <div style={{fontSize:10,color:G.muted,marginTop:4}}>
                This is the team your child will train with (U11, U13, U15, etc.)
              </div>
            )}
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
              EMAIL ADDRESS
            </label>
            <input type="email" value={vfEmail} onChange={e=>setVfEmail(e.target.value)}
              placeholder="your@email.com"
              style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
              PHONE <span style={{fontWeight:400}}>(optional)</span>
            </label>
            <input type="tel" value={vfPhone} onChange={e=>setVfPhone(e.target.value)}
              placeholder="+45 XX XX XX XX"
              style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
          </div>

          {/* Consent */}
          <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:16,
            cursor:"pointer",padding:"12px 14px",background:"#fffbeb",borderRadius:10,
            border:"1px solid #fde68a"}}>
            <input type="checkbox" checked={vfConsent}
              onChange={e=>setVfConsent(e.target.checked)}
              style={{width:16,height:16,cursor:"pointer",flexShrink:0,marginTop:2}}/>
            <span style={{fontSize:12,color:"#78350f",lineHeight:1.6}}>
              I consent to Fredensborg Cricket Club storing my {vfIsParent?"child's":""}  personal data
              (name, email, phone) for the purpose of managing club membership and communications,
              as described in the privacy notice above.
              {vfIsParent&&" I confirm I have parental authority to provide this consent."}
            </span>
          </label>

          {vfError&&<div style={{background:G.redBg,color:G.red,borderRadius:8,
            padding:"8px 12px",fontSize:13,marginBottom:12}}>{vfError}</div>}

          <Btn bg={G.green} col={G.lime} full
            disabled={!vfConsent||!vfEmail.includes("@")||(vfIsParent?!vfChildName.trim():!vfNewName.trim())||vfSending}
            onClick={()=>sendCode(vfEmail, vfNewName||"Member")}>
            {vfSending?"Sending code…":"📧 Verify email & submit"}
          </Btn>
          <button onClick={()=>setVfStep("search")}
            style={{width:"100%",marginTop:8,background:"none",border:"none",
              fontSize:12,color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
            ← Back to search
          </button>
        </div>
      </Shell>
    );

    // ── Step: search ──────────────────────────────────────────
    return (
      <Shell G={G}>
        {hdr("Set up your account","Fredensborg Cricket Club")}
        <div style={{padding:"20px 20px 40px"}}>
          <div style={{fontSize:14,color:G.muted,marginBottom:20,lineHeight:1.6}}>
            First, let's find your profile. Type your name (or your child's name if you're a parent).
          </div>
          <div style={{position:"relative",marginBottom:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
              fontSize:16,pointerEvents:"none"}}>🔍</span>
            <input value={vfSearch} onChange={e=>setVfSearch(e.target.value)}
              placeholder="Start typing a name…"
              autoFocus
              style={{...iSt({paddingLeft:44,fontSize:15,borderRadius:12,padding:"13px 14px 13px 44px"})}}/>
          </div>
          {vfFiltered.length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
              {vfFiltered.map(m=>(
                <button key={m.id} onClick={()=>{
                    setVfMatch(m);
                    setVfEmail(m.email||"");
                    setVfPhone(m.phone||"");
                    setVfStep("found");
                  }}
                  style={{display:"flex",alignItems:"center",gap:12,
                    background:G.white,border:`1.5px solid ${G.border}`,borderRadius:10,
                    padding:"11px 14px",cursor:"pointer",fontFamily:"inherit",
                    textAlign:"left",transition:"border-color .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=G.green}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=G.border}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:`${G.green}18`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:12,fontWeight:900,color:G.green,flexShrink:0}}>
                    {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:G.text}}>{m.name}</div>
                    <div style={{fontSize:11,color:G.muted}}>
                      {(m.teams||[]).join(", ")||"No team assigned"}
                      {m.email?" · ✉️ email on file":" · no email yet"}
                    </div>
                  </div>
                  <span style={{marginLeft:"auto",fontSize:16,color:G.green}}>›</span>
                </button>
              ))}
            </div>
          )}
          {vfSearch.trim().length>=2&&vfFiltered.length===0&&(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:13,color:G.muted,marginBottom:16}}>
                Not found — you may not be in the system yet.
              </div>
              <button onClick={()=>{setVfNewName(vfSearch.trim());setVfStep("notfound");}}
                style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
                  padding:"11px 24px",fontSize:13,fontWeight:800,cursor:"pointer",
                  fontFamily:"inherit"}}>
                ✋ Register as a new member
              </button>
            </div>
          )}
          <div style={{marginTop:24,paddingTop:16,borderTop:`1px solid ${G.border}`,
            textAlign:"center"}}>
            <button onClick={()=>{setVfStep("notfound");setVfNewName("");}}
              style={{fontSize:12,color:G.muted,background:"none",border:"none",
                cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>
              I'm a new member / parent — register here
            </button>
          </div>
          <button onClick={()=>setAuthView("pick")}
            style={{width:"100%",marginTop:10,background:"none",border:`1px solid ${G.border}`,
              borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:G.muted,
              cursor:"pointer",fontFamily:"inherit"}}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );
  }

  if(!currentUser && authView==="joinrequestdone") return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",minHeight:"100vh",padding:"40px 28px",textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:16}}>🎉</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
          fontSize:22,color:G.text,marginBottom:10}}>Request Sent!</div>
        <div style={{fontSize:14,color:G.muted,lineHeight:1.7,marginBottom:30}}>
          An admin will review your request and add you to the app.
          You'll be able to log in as soon as it's approved.<br/><br/>
          This usually happens within a day or two. 🏏
        </div>
        <button onClick={()=>setAuthView("pick")}
          style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
            padding:"14px 32px",fontFamily:"inherit",fontWeight:800,fontSize:15,
            cursor:"pointer"}}>
          Back to Login
        </button>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — verify email (first-time, adults only)
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="verifyemail") {
    const storedEmail = EMAIL_SEED[pendingMember?.name||""] || (pendingMember?.email||"");
    const masked = maskEmail(storedEmail);

    async function sendLoginCode() {
      setLoginCodeSending(true); setLoginCodeError("");
      const code = String(Math.floor(100000+Math.random()*900000));
      try {
        const r = await fetch("/api/send-verify",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({email:storedEmail, name:pendingMember?.name||"", code})
        });
        if(!r.ok) throw new Error("Send failed");
        setLoginSentCode(code);
        setLoginCodeExpiry(Date.now()+15*60*1000);
        setLoginCodeSent(true);
      } catch(e) {
        setLoginCodeError("Could not send email. Ask your admin to reset your access.");
      }
      setLoginCodeSending(false);
    }

    function verifyLoginCode() {
      if(!loginSentCode) { setLoginCodeError("No code sent yet"); return; }
      if(Date.now()>loginCodeExpiry) { setLoginCodeError("Code expired — request a new one"); return; }
      if(loginCodeInput.trim()!==loginSentCode) { setLoginCodeError("Incorrect code — please try again"); return; }
      // Correct — proceed to set PIN
      setLoginCodeError("");
      setLoginCodeSent(false);
      setLoginSentCode("");
      setLoginCodeInput("");
      setAuthView("newpin");
    }

    function resetLoginCode() {
      setLoginCodeSent(false);
      setLoginSentCode("");
      setLoginCodeInput("");
      setLoginCodeError("");
    }

    return (
      <Shell G={G}>
        <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
          <div style={{background:G.green,padding:"22px 20px 18px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:6}}>📧</div>
            <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
              fontSize:19,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:12,marginTop:4}}>
              Verify your identity to set your PIN
            </div>
          </div>
          <div style={{flex:1,padding:"28px 24px"}}>
            {!loginCodeSent ? (<>
              <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",
                borderRadius:14,padding:"16px 18px",marginBottom:20}}>
                <div style={{fontWeight:800,fontSize:13,color:"#166534",marginBottom:6}}>
                  ✉️ We'll send a verification code to:
                </div>
                <div style={{fontSize:16,fontWeight:900,color:G.text,letterSpacing:1}}>
                  {masked}
                </div>
                <div style={{fontSize:11,color:G.muted,marginTop:6,lineHeight:1.5}}>
                  This is the email address we have on record.
                  Check your inbox (and spam folder) after sending.
                </div>
              </div>
              {loginCodeError&&<div style={{background:G.redBg,color:G.red,borderRadius:8,
                padding:"8px 12px",fontSize:13,marginBottom:12,fontWeight:700}}>
                ⚠️ {loginCodeError}
              </div>}
              <button onClick={sendLoginCode} disabled={loginCodeSending}
                style={{width:"100%",background:loginCodeSending?"#e5e7eb":G.green,
                  color:loginCodeSending?G.muted:G.lime,border:"none",borderRadius:12,
                  padding:"15px",fontSize:15,fontWeight:800,cursor:loginCodeSending?"default":"pointer",
                  fontFamily:"inherit",marginBottom:10}}>
                {loginCodeSending?"Sending…":"📧 Send verification code"}
              </button>
            </>) : (<>
              <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",
                borderRadius:14,padding:"14px 16px",marginBottom:20}}>
                <div style={{fontWeight:800,fontSize:13,color:"#166534",marginBottom:4}}>
                  Code sent! ✅
                </div>
                <div style={{fontSize:12,color:G.muted,lineHeight:1.5}}>
                  Check the inbox for <b style={{color:G.text}}>{masked}</b> and enter the 6-digit code below.
                  It expires in 15 minutes.
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:800,
                  color:G.muted,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>
                  Verification Code
                </label>
                <input autoFocus type="text" inputMode="numeric" maxLength={6}
                  placeholder="000000"
                  value={loginCodeInput}
                  onChange={e=>{setLoginCodeInput(e.target.value.replace(/\D/g,""));setLoginCodeError("");}}
                  onKeyDown={e=>e.key==="Enter"&&verifyLoginCode()}
                  style={{width:"100%",borderRadius:10,
                    border:`1.5px solid ${loginCodeError?"#ef4444":G.border}`,
                    padding:"13px 14px",fontSize:24,fontFamily:"'DM Sans',sans-serif",
                    fontWeight:700,background:"#fff",color:G.text,outline:"none",
                    boxSizing:"border-box",letterSpacing:6,textAlign:"center"}}/>
                {loginCodeError&&<div style={{marginTop:6,fontSize:12,color:"#dc2626",fontWeight:700}}>
                  ⚠️ {loginCodeError}
                </div>}
              </div>
              <button onClick={verifyLoginCode}
                style={{width:"100%",background:G.green,color:G.lime,border:"none",
                  borderRadius:12,padding:"15px",fontSize:15,fontWeight:800,
                  cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
                Verify &amp; Continue →
              </button>
              <button onClick={resetLoginCode}
                style={{width:"100%",background:"transparent",color:G.muted,border:"none",
                  fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"8px"}}>
                ← Didn't receive it? Send again
              </button>
            </>)}
            <button onClick={()=>{
                setPendingMember(null);setAuthView("pick");
                resetLoginCode();
              }}
              style={{width:"100%",background:"transparent",color:G.muted,border:"none",
                fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"8px"}}>
              ← Back
            </button>
            <div style={{marginTop:16,padding:"12px 14px",background:"#fffbeb",
              border:"1px solid #fde68a",borderRadius:10,fontSize:12,color:"#78350f",lineHeight:1.6}}>
              <b>Wrong email?</b> Ask your admin to update your email address or reset your access.
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — verify invite code (no email, first-time)
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="verifycode") return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{background:G.green,padding:"22px 20px 18px",textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:6}}>🔑</div>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{color:"rgba(255,255,255,0.65)",fontSize:12,marginTop:4}}>
            Enter your invite code to set up your account
          </div>
        </div>
        <div style={{flex:1,padding:"28px 24px"}}>
          <div style={{background:"#f0fdf4",border:"1.5px solid rgba(20,83,45,.15)",
            borderRadius:14,padding:"16px 18px",marginBottom:20}}>
            <div style={{fontSize:13,color:G.muted,lineHeight:1.6}}>
              Your admin has shared a personal <b style={{color:G.text}}>invite code</b> with you.
              It looks like <b style={{color:G.text}}>FCC-XXXX</b>.
              Enter it below to verify your identity and set your PIN.
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,fontWeight:800,
              color:G.muted,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>
              Your Invite Code
            </label>
            <input
              type="text" autoFocus autoCapitalize="characters" spellCheck={false}
              placeholder="FCC-XXXX"
              value={emailInput}
              onChange={e=>{setEmailInput(e.target.value.toUpperCase());setEmailError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleVerifyCode()}
              style={{width:"100%",borderRadius:10,border:`1.5px solid ${emailError?"#ef4444":G.border}`,
                padding:"13px 14px",fontSize:18,fontFamily:"'DM Sans',sans-serif",
                fontWeight:700,background:"#fff",color:G.text,outline:"none",
                boxSizing:"border-box",letterSpacing:3,textAlign:"center"}}/>
            {emailError&&(
              <div style={{marginTop:6,fontSize:12,color:"#dc2626",fontWeight:700}}>
                ⚠️ {emailError}
              </div>
            )}
          </div>
          <button onClick={handleVerifyCode}
            style={{width:"100%",background:G.green,color:G.lime,border:"none",
              borderRadius:12,padding:"15px",fontSize:15,fontWeight:800,
              cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
            Verify &amp; Continue →
          </button>
          <button onClick={()=>{setPendingMember(null);setAuthView("pick");setEmailInput("");setEmailError("");}}
            style={{width:"100%",background:"transparent",color:G.muted,border:"none",
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"8px"}}>
            ← Back
          </button>
          <div style={{marginTop:20,padding:"12px 14px",background:"#fffbeb",
            border:"1px solid #fde68a",borderRadius:10,fontSize:12,color:"#78350f",lineHeight:1.6}}>
            <b>Don't have a code?</b> Ask your admin to generate one for you — they can do it in the Members panel.
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — blocked (no email, no invite code)
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="blocked") return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{background:G.green,padding:"18px 20px 16px",textAlign:"center"}}>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>FCC Training</div>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
          padding:"0 24px"}}>
          <div style={{textAlign:"center",maxWidth:320}}>
            <div style={{fontSize:52,marginBottom:16}}>🔒</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,
              fontWeight:900,color:G.green,marginBottom:10}}>
              Account not activated yet
            </div>
            <div style={{fontSize:14,color:G.muted,lineHeight:1.6,marginBottom:20}}>
              Your profile exists but your account hasn't been set up with an email or access code yet.
            </div>
            <button onClick={()=>{
                setVfStep("search");
                setVfSearch(pendingMember?.name||"");
                setVfMatch(pendingMember||null);
                setVfEmail(pendingMember?.email||"");
                setVfPhone(pendingMember?.phone||"");
                setVfCode(""); setVfError(""); setVfConsent(false);
                if(pendingMember) setVfStep("found");
                setAuthView("verify");
              }}
              style={{width:"100%",background:G.green,color:G.lime,border:"none",
                borderRadius:12,padding:"13px 20px",fontSize:14,fontWeight:800,
                cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>
              ✅ Set up my account now
            </button>
            <button onClick={()=>{setPendingMember(null);setAuthView("pick");}}
              style={{background:"none",color:G.muted,border:`1px solid ${G.border}`,
                borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — set new PIN
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="newpin") return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        {/* Compact header at top */}
        <div style={{background:G.green,padding:"18px 20px 16px",textAlign:"center"}}>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>
            First time? Set your 4-digit PIN
          </div>
        </div>
        {/* Keypad pushed to lower portion of screen */}
        <div style={{flex:1,display:"flex",alignItems:"flex-end",paddingBottom:60}}>
          <div style={{width:"100%"}}>
            <PinPad
              label="Choose a 4-digit PIN"
              onDone={handleNewPin}
              onCancel={()=>{ setPendingMember(null); setAuthView("pick"); }}
              error={pinError}
            />
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — enter PIN
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="enterpin") {
    const isYouthNoPinMember = ["U11","U13"].some(t=>(pendingMember?.teams||[]).includes(t))
      && !pins[pendingMember?.id];
    return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{background:G.green,padding:"18px 20px 16px",textAlign:"center"}}>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Welcome back, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>Enter your PIN</div>
        </div>
        {isYouthNoPinMember&&(
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",
            margin:"16px 20px 0",borderRadius:10,padding:"10px 14px",
            fontSize:12,color:"#92400e",lineHeight:1.6,textAlign:"center"}}>
            👋 First time? Try <b>0000</b> to log in, then set your own PIN.
          </div>
        )}
        <div style={{flex:1,display:"flex",alignItems:"flex-end",paddingBottom:60}}>
          <div style={{width:"100%"}}>
            <PinPad
              label="Enter your 4-digit PIN"
              onDone={handleEnterPin}
              onCancel={()=>{ setPendingMember(null); setAuthView("pick"); }}
              error={pinError}
            />
          </div>
        </div>
      </div>
    </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: App (authenticated)
  // ════════════════════════════════════════════════════════════

  // AppHeader extracted to src/ui/AppHeader.jsx (Pass 6)

  // ── SCHEDULE ────────────────────────────────────────────────
  if(view==="schedule") return <ScheduleView />;

  // ── ADD / JOIN ──────────────────────────────────────────────
  if(view==="add") return <AddSessionView />;

  // ── SESSION DETAIL ──────────────────────────────────────────
  if(view==="session"&&selSess) return <SessionDetailView />;

  // ════════════════════════════════════════════════════════════
  // RENDER: Coach HQ (Coaches & Admins only)
  // ════════════════════════════════════════════════════════════
  if(view==="coachhq" && (can(userRole,"accessMembers") || isCoachMember(currentUser?.name, teams))) return <CoachHQView />;

  // ════════════════════════════════════════════════════════════
  // RENDER: Progress Tracker (from Coach HQ)
  // ════════════════════════════════════════════════════════════
  if((view==="progress-tracker" || view==="season-plan") && (can(userRole,"accessMembers") || isCoachMember(currentUser?.name, teams))) {
    const coachTeams = (teams||[]).filter(t=>(t.coaches||[]).includes(currentUser?.name));
    const isAdmin = can(userRole,"accessMembers");
    
    // Get players from coach's teams
    const coachPlayers = members.filter(m => {
      if(isAdmin) {
        // Admins see all youth players
        return (m.teams||[]).some(t=>t.startsWith("U"));
      }
      const memberTeams = m.teams || [];
      return coachTeams.some(ct => memberTeams.includes(ct.name));
    }).map(m => {
      // Get progress data from playerProgress state
      const progress = playerProgress[m.id] || {};
      return {
        id: m.id,
        name: m.name,
        team: (m.teams||[]).find(t=>t.startsWith("U")) || m.teams?.[0] || "Unassigned",
        avatarColor: TEAM_META[(m.teams||[])[0]]?.bg || G.green,
        sessionsAttended: 0, // TODO: Calculate from attendance collection
        sessionsTotal: 0,
        // Progress data from Firestore
        snapshots: progress.snapshots || {},
        currentPhase: progress.currentPhase || "phase1",
        notes: allSessionNotes.filter(n => n.playerId === m.id),
        // Player attributes
        battingHand: m.battingHand,
        bowlingArm: m.bowlingArm,
        bowlingStyle: m.bowlingStyle,
      };
    });
    
    // Get upcoming session for this coach's teams
    const coachSessions = sessions.filter(s => {
      if(isAdmin) return true;
      return coachTeams.some(ct => s.restrictedTo === ct.name);
    });
    const nextSession = coachSessions.find(s => isFuture(s.date));
    
    // Get available teams for this coach (youth teams only)
    const availableTeams = isAdmin 
      ? (teams||[]).filter(t=>t.name.startsWith("U") || t.name === "Kvinder").map(t=>t.name)
      : coachTeams.map(t=>t.name);
    
    return (
      <ProgressTracker
        session={nextSession ? {
          id: nextSession.id,
          name: nextSession.label || "Training Session",
          phase: "Phase 2",
          focus: "Building fundamentals",
          date: nextSession.date,
        } : {
          name: "No upcoming session",
          phase: "Phase 2",
        }}
        players={coachPlayers}
        teams={availableTeams}
        seasonPlans={seasonPlans}
        userRole={userRole}
        currentUser={currentUser}
        initialScreen={view === "season-plan" ? "phases" : "players"}
        onBack={() => setView("coachhq")}
        onSaveAttendance={(att) => {
          // Save to Firestore attendance
          const sessionKey = `${att.date}_${att.sessionId}`;
          const updated = { ...allAttendance, [sessionKey]: att.records };
          saveAllAttendance(updated);
          showToast("Attendance saved ✓");
        }}
        onSaveNote={(note) => {
          // Save to Firestore session notes
          const updatedNotes = [...allSessionNotes, {
            ...note,
            timestamp: new Date().toISOString(),
            coach: currentUser?.name,
          }];
          saveAllSessionNotes(updatedNotes);
          showToast("Note saved ✓");
        }}
        onSaveSeasonPlan={(teamName, plan) => {
          const updated = { ...seasonPlans, [teamName]: plan };
          saveSeasonPlans(updated);
          showToast(`${teamName} plan saved ✓`);
        }}
        onSaveAttributes={(playerId, attrs) => {
          // Save player attributes to members
          const updated = members.map(m => 
            m.id === playerId ? { ...m, ...attrs } : m
          );
          saveMembers(updated);
          showToast("Attributes saved ✓");
        }}
        onSaveSkills={(data) => {
          // Save skills to player progress
          // data: {playerId, phase, skills, updatedBy, updatedAt}
          const existing = playerProgress[data.playerId] || { snapshots: {} };
          const updated = {
            ...playerProgress,
            [data.playerId]: {
              ...existing,
              currentPhase: data.phase,
              snapshots: {
                ...existing.snapshots,
                [data.phase]: data.skills,
              },
              lastUpdatedBy: currentUser?.name,
              lastUpdatedAt: data.updatedAt,
            },
          };
          setPlayerProgress(updated); // Update local state immediately
          savePlayerProgress(updated); // Save to Firestore
          showToast("Skills updated ✓");
        }}
      />
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Coach Coordination (from Coach HQ)
  // ════════════════════════════════════════════════════════════
  if(view==="coach-coordination" && (can(userRole,"accessMembers") || isCoachMember(currentUser?.name, teams))) return <CoachCoordinationView />;

  // ── ADMIN / MEMBERS ─────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // RENDER: Profile
  // ════════════════════════════════════════════════════════════
  if(view==="profile"||(view==="admin"&&!can(userRole,"accessMembers"))) return <ProfileView />;

  // ════════════════════════════════════════════════════════════
  // RENDER: Help & Contact
  // ════════════════════════════════════════════════════════════
  if(view==="help") return <HelpView />;

  // ── WEATHER ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // RENDER: Privacy & Data
  // ════════════════════════════════════════════════════════════
  if(view==="privacy") return <PrivacyView />;

  // ════════════════════════════════════════════════════════════
  // RENDER: Captain's Playing XI
  // ════════════════════════════════════════════════════════════
  if(view==="captainxi") return <CaptainXIView />;

  if (view.startsWith("live-")) {
    const matchId = view.replace("live-", "");
    return <LiveScorecardLoader matchId={matchId} onBack={() => setView("matches")} />;
  }

  if (view === "matches" || view.startsWith("scorer-")) {
    return (
      <MatchesView
        view={view}
        setView={setView}
        userRole={userRole}
        currentUser={currentUser}
        members={members}
        teams={teams}
        pendingCount={joinRequests.filter(r => r.status === "pending").length}
        toast={toast}
        showToast={showToast}
        SidebarNav={SidebarNav}
        handleLogout={handleLogout}
      />
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Team Availability
  // ════════════════════════════════════════════════════════════
  if(view==="availability") return <AvailabilityView />;
  if(view==="weather") return <WeatherView />;

  if(view==="admin"&&can(userRole,"accessMembers")) return <AdminView />;

  // Fallback
  return <Shell G={G}><div style={{padding:20,color:G.muted}}>Loading…</div></Shell>;
  }; // ── end renderApp (Pass 5) ─────────────────────────────────

  return (
    <AppContext.Provider value={contextValue}>
      {renderApp()}
    </AppContext.Provider>
  );
}
