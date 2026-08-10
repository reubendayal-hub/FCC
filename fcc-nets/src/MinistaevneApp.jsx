import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Trophy, Calendar, Clock, MapPin, Sparkles, CheckCircle2, Medal, Users2, ShieldCheck, Zap, Lock, Pencil, HelpCircle, Send, ClipboardList, Copy, Trash2, Award, CheckCheck } from "lucide-react";

// ── Design tokens — floodlit stadium, metallic + club-color accents ──
const C = {
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
const GOLD = `linear-gradient(135deg, ${C.gold1} 0%, ${C.gold2} 45%, ${C.gold3} 78%, ${C.gold2} 100%)`;

const FCC_LOGO = "/fcc-logo.png";

// Golden-angle hue spacing guarantees no two clubs land on visually similar colors,
// however many clubs get added later (incl. late walk-ins registered on the day).
const goldenHue = (i) => Math.round((i * 137.508) % 360);
const sphereGradient = (hue) => `radial-gradient(circle at 32% 26%, hsl(${hue},85%,68%), hsl(${hue},70%,40%) 75%)`;
const HOST_GRADIENT = `radial-gradient(circle at 32% 26%, ${C.gold1}, ${C.gold3} 75%)`;

const CLUB_NAMES = [
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
const INVITED = CLUB_NAMES.map((c, i) => {
  const hue = goldenHue(i);
  return { ...c, hue, accent: c.host ? C.gold2 : `hsl(${hue}, 80%, 60%)`, bg: c.host ? HOST_GRADIENT : sphereGradient(hue) };
});

const ADMIN_TOKEN_KEY = "ministaevne-admin-token";
const PUBLIC_POLL_MS = 20000;

// Small posh gold-ring wrapper used on every club badge — waiting or confirmed.
function ClubBadge({ size = 66, ringWidth = 3, bg, img, children, onClick, title, style = {}, dim = false }) {
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

function useCountdown(target) {
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

function ScoreTile({ value, label, flashKey, accent }) {
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

function Confetti({ burstKey }) {
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

function Tooltip({ text, show }) {
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

const emptyForm = { teamName: "", contact: "", email: "", phone: "", teams: 1, players: 8, notes: "" };

export default function MinistaevneApp() {
  const target = useMemo(() => new Date("2026-08-16T11:00:00+02:00").getTime(), []);
  const { d, h, m, s } = useCountdown(target);

  // ── Public data (confirmed clubs only — polled) ──────────────
  const [publicRegistrations, setPublicRegistrations] = useState([]);

  // ── Admin data (full records, incl. pending — authenticated) ─
  const [adminToken, setAdminToken] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_TOKEN_KEY) || ""; } catch { return ""; }
  });
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminRegistrations, setAdminRegistrations] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedClub, setSelectedClub] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState("");
  const [hovered, setHovered] = useState("");
  const [isCustomClub, setIsCustomClub] = useState(false);
  const [customName, setCustomName] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const [adminPrompt, setAdminPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [showHelp, setShowHelp] = useState(false);
  const [helpClub, setHelpClub] = useState("");
  const [helpMsg, setHelpMsg] = useState("");
  const [helpSending, setHelpSending] = useState(false);

  const [removeArmed, setRemoveArmed] = useState(false);
  const [armedRow, setArmedRow] = useState("");
  const [approvingId, setApprovingId] = useState("");

  const showToast = useCallback((msg, ms = 2800) => {
    setToast(msg);
    setTimeout(() => setToast(""), ms);
  }, []);

  // ── Authenticated admin fetch — clears session on 401 ────────
  const adminFetch = useCallback(async (url, opts = {}) => {
    const token = (() => { try { return sessionStorage.getItem(ADMIN_TOKEN_KEY) || ""; } catch { return ""; } })();
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      try { sessionStorage.removeItem(ADMIN_TOKEN_KEY); } catch {}
      setAdminToken("");
      setAdminUnlocked(false);
      setAdminRegistrations(null);
      showToast("Admin session expired — please log in again");
      return null;
    }
    return res;
  }, [showToast]);

  const fetchAdminList = useCallback(async () => {
    const res = await adminFetch("/api/ministaevne-admin", { method: "GET" });
    if (!res) return;
    if (!res.ok) return;
    const json = await res.json();
    setAdminRegistrations(json.registrations || []);
  }, [adminFetch]);

  const fetchPublicList = useCallback(async () => {
    try {
      const res = await fetch("/api/ministaevne-public");
      if (!res.ok) return;
      const json = await res.json();
      setPublicRegistrations(json.registrations || []);
    } catch { /* keep last known list on transient network errors */ }
  }, []);

  // Public list — fetch on mount + poll. Firestore rules deny all client
  // reads on ministaevne2026/*, so this goes through the API, not onSnapshot.
  useEffect(() => {
    fetchPublicList();
    const t = setInterval(fetchPublicList, PUBLIC_POLL_MS);
    return () => clearInterval(t);
  }, [fetchPublicList]);

  // Restore admin session on load (server re-validates the token on first call).
  useEffect(() => {
    if (!adminToken) return;
    setAdminUnlocked(true);
    fetchAdminList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmedList = adminUnlocked && adminRegistrations
    ? adminRegistrations.filter((r) => r.status === "confirmed")
    : publicRegistrations;
  const pendingList = adminUnlocked && adminRegistrations
    ? adminRegistrations.filter((r) => r.status === "pending")
    : [];

  const registrationsByClub = useMemo(() => {
    const map = {};
    confirmedList.forEach((r) => { map[r.clubName] = r; });
    return map;
  }, [confirmedList]);

  const extraClubs = useMemo(() => {
    const invitedNames = new Set(INVITED.map((c) => c.name));
    const customNames = [...new Set(confirmedList.map((r) => r.clubName))]
      .filter((name) => !invitedNames.has(name))
      .sort((a, b) => a.localeCompare(b));
    return customNames.map((name, i) => {
      const hue = goldenHue(INVITED.length + i);
      const short = name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
      return { name, short, hue, accent: `hsl(${hue}, 80%, 60%)`, bg: sphereGradient(hue) };
    });
  }, [confirmedList]);

  const ALL_CLUBS = [...INVITED, ...extraClubs];
  const confirmedNames = new Set(confirmedList.map((r) => r.clubName));
  // Host clubs are hidden from the public "tap to register" pool (they're
  // not meant to self-serve join their own event) but admin still needs a
  // way to add/fix their registration through the same form — so surface
  // them here only once admin mode is unlocked.
  const waiting = ALL_CLUBS.filter((c) => !confirmedNames.has(c.name) && (!c.host || adminUnlocked));
  const confirmedClubs = ALL_CLUBS.filter((c) => confirmedNames.has(c.name));
  const teamsTotal = confirmedList.reduce((n, r) => n + (Number(r.teams) || 1), 0);
  const clubCount = confirmedClubs.length;

  function openForm(clubName, isEdit = false, isCustom = false) {
    setSelectedClub(clubName);
    setIsCustomClub(isCustom);
    setRegisterError("");
    const existing = registrationsByClub[clubName];
    setForm(existing
      ? { teamName: existing.teamName, contact: existing.contact || "", email: existing.email || "", phone: existing.phone || "", teams: existing.teams, players: existing.players, notes: existing.notes || "" }
      : { ...emptyForm, teamName: clubName ? `${clubName.replace(/ CC$| Cricket$/, "")} U11` : "" });
    setEditMode(isEdit);
    setRemoveArmed(false);
    setShowForm(true);
  }

  async function removeRegistration(id, clubName) {
    const res = await adminFetch("/api/ministaevne-admin", { method: "DELETE", body: JSON.stringify({ id }) });
    if (!res) return;
    if (!res.ok) { showToast("Couldn't remove registration"); return; }
    await fetchAdminList();
    showToast(`${clubName} removed`);
  }

  async function approveRegistration(id, clubName) {
    setApprovingId(id);
    const res = await adminFetch("/api/ministaevne-admin/approve", { method: "POST", body: JSON.stringify({ id }) });
    setApprovingId("");
    if (!res) return;
    if (!res.ok) { showToast("Couldn't approve registration"); return; }
    await fetchAdminList();
    fetchPublicList();
    showToast(`${clubName} confirmed ✓`);
  }

  async function submit() {
    const clubName = isCustomClub ? customName.trim() : selectedClub;
    if (!clubName || !form.contact || !form.email) return;
    setRegistering(true);
    setRegisterError("");
    try {
      const res = await fetch("/api/register-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubName, teamName: form.teamName, contact: form.contact, email: form.email,
          phone: form.phone, teams: form.teams, players: form.players, notes: form.notes,
          isCustom: isCustomClub,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRegisterError(json.error || "Something went wrong — please try again");
        setRegistering(false);
        return;
      }
      setShowForm(false);
      setRegistering(false);
      fetchPublicList();
      if (adminUnlocked) fetchAdminList();

      if (json.registration.status === "confirmed") {
        setBurst((b) => b + 1);
        setCelebrate(true);
        showToast(`${clubName} is in! 🏆`);
        setTimeout(() => setCelebrate(false), 2000);
      } else {
        showToast(`Thanks! ${clubName} is pending review — we'll confirm shortly`, 3600);
      }
    } catch {
      setRegisterError("Network error — please try again");
      setRegistering(false);
    }
  }

  async function tryUnlockAdmin() {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/ministaevne-admin-login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoginError(json.error || "Incorrect password");
        setLoginLoading(false);
        return;
      }
      try { sessionStorage.setItem(ADMIN_TOKEN_KEY, json.token); } catch {}
      setAdminToken(json.token);
      setAdminUnlocked(true);
      setAdminPrompt(false);
      setPassword("");
      setLoginLoading(false);
      fetchAdminList();
    } catch {
      setLoginError("Network error — please try again");
      setLoginLoading(false);
    }
  }

  function sendHelp() {
    if (!helpMsg.trim()) return;
    setHelpSending(true);
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "help", data: { name: helpClub || "Ministaevne rep", category: "Ministaevne registration", message: helpMsg.trim() } }),
    }).catch(() => {}).finally(() => {
      setHelpSending(false);
      setShowHelp(false);
      setHelpClub(""); setHelpMsg("");
      showToast("Message sent to organisers ✓");
    });
  }

  function copyCSV() {
    const rows = [["Club", "Team name", "Contact", "Email", "Phone", "Teams", "Players", "Status", "Notes"]];
    (adminRegistrations || []).forEach((r) => {
      rows.push([r.clubName, r.teamName || "", r.contact || "", r.email || "", r.phone || "", r.teams || 1, r.players || "", r.status, (r.notes || "").replace(/\n/g, " ")]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    navigator.clipboard?.writeText(csv).then(
      () => showToast("Table copied — paste into Sheets/Excel ✓"),
      () => showToast("Copy blocked by browser — select the table manually")
    );
  }

  const pluralize = (n, word) => `${n} ${word}${n !== 1 ? "s" : ""}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: `
        radial-gradient(900px 500px at 15% 0%, rgba(240,180,41,0.10), transparent 60%),
        radial-gradient(900px 500px at 85% 0%, rgba(59,130,246,0.10), transparent 60%),
        radial-gradient(1000px 600px at 20% 60%, rgba(239,68,68,0.06), transparent 60%),
        radial-gradient(1000px 600px at 80% 75%, rgba(18,183,106,0.09), transparent 60%),
        linear-gradient(180deg, ${C.night2}, ${C.night})
      `,
      color: C.cream, fontFamily: "'Helvetica Neue', Arial, sans-serif", position: "relative", paddingBottom: 70, overflow: "hidden",
    }}>
      <style>{`
        @keyframes bob { 0%,100%{ transform: translateY(0) rotate(var(--r,0deg)); } 50%{ transform: translateY(-9px) rotate(var(--r,0deg)); } }
        @keyframes shine { 0%{ transform: translateX(-120%) rotate(20deg);} 100%{ transform: translateX(220%) rotate(20deg);} }
        @keyframes confettiFall { 0% { transform: translate(0,0) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--dx), 360px) rotate(var(--rot)); opacity: 0; } }
        @keyframes popIn { 0%{ transform: scale(.4); opacity:0; } 65%{ transform: scale(1.1);} 100%{ transform: scale(1); opacity:1; } }
        @keyframes digitPulse { 0%{ transform: scale(1.25); opacity:.3; } 100%{ transform: scale(1); opacity:1; } }
        @keyframes floodSweep { 0%{ opacity:.35;} 50%{ opacity:.6;} 100%{ opacity:.35;} }
        @keyframes ctaGlow { 0%,100%{ box-shadow: 0 0 22px ${C.gold2}77, 0 10px 30px rgba(0,0,0,.5);} 50%{ box-shadow: 0 0 38px ${C.gold2}bb, 0 10px 30px rgba(0,0,0,.5);} }
        @keyframes ticker { from{ transform: translateX(0);} to{ transform: translateX(-50%);} }
        @keyframes flashPulse { 0%{ opacity:0;} 15%{ opacity:.5;} 100%{ opacity:0;} }
        @keyframes trophyBurst { 0%{ transform: scale(0.15); opacity:0;} 45%{ transform: scale(1.5); opacity:1;} 70%{ transform: scale(1.05);} 85%{ transform: scale(1.18);} 100%{ transform: scale(1.05); opacity:1;} }
        @keyframes ringExpand { 0%{ transform: scale(0.2); opacity:.9; } 100%{ transform: scale(3.2); opacity:0; } }
        @keyframes ribbonPop { 0%{ transform: scale(0) rotate(var(--rot0)); opacity:0;} 55%{ transform: scale(1.25) rotate(var(--rot1)); opacity:1;} 100%{ transform: scale(1) rotate(var(--rot1)); opacity:1;} }
        @keyframes glowPulseBig { 0%{ transform: scale(0.3); opacity:0;} 40%{ opacity:.9;} 100%{ transform: scale(2.6); opacity:0;} }
        .badge-shine::after { content: ""; position: absolute; top: -50%; left: -20%; width: 40%; height: 200%; background: linear-gradient(120deg, transparent, rgba(255,255,255,0.55), transparent); animation: shine 3.2s ease-in-out infinite; }
      `}</style>

      <div style={{ position: "absolute", top: -80, left: "10%", width: 300, height: 500, background: `conic-gradient(from 200deg, ${C.gold2}22, transparent 40%)`, filter: "blur(30px)", animation: "floodSweep 6s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -80, right: "10%", width: 300, height: 500, background: `conic-gradient(from 340deg, ${C.blue}22, transparent 40%)`, filter: "blur(30px)", animation: "floodSweep 7s ease-in-out infinite 1s", pointerEvents: "none" }} />

      {/* Admin access */}
      <button onClick={() => adminUnlocked ? null : setAdminPrompt(true)} style={{
        position: "absolute", top: 16, right: 16, zIndex: 15,
        background: adminUnlocked ? `${C.emerald}22` : "rgba(255,255,255,0.06)",
        border: `1px solid ${adminUnlocked ? C.emerald : "rgba(255,255,255,0.15)"}`,
        color: adminUnlocked ? C.emerald : C.muted, borderRadius: 99, padding: "6px 12px",
        fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 5, cursor: adminUnlocked ? "default" : "pointer",
      }}>
        <Lock size={12} /> {adminUnlocked ? "Admin mode ON" : "Admin"}
      </button>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div style={{ textAlign: "center", padding: "40px 20px 18px", position: "relative" }}>
        <Trophy size={36} color={C.gold2} style={{
          position: "absolute", top: 20, left: 20,
          filter: `drop-shadow(0 4px 10px ${C.gold3}aa)`,
        }} />

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img src={FCC_LOGO} alt="Fredensborg Cricket Club" style={{
            width: 64, height: 64, borderRadius: "50%", objectFit: "cover",
            border: `3px solid ${C.gold2}`, boxShadow: `0 6px 20px rgba(0,0,0,0.5), 0 0 16px ${C.gold2}55`,
          }} />
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: `linear-gradient(90deg, ${C.ember}, #ff7a52)`, color: "#fff", fontSize: 11, fontWeight: 800,
          letterSpacing: 1.4, padding: "6px 16px", borderRadius: 99, marginBottom: 18, textTransform: "uppercase",
          boxShadow: `0 4px 14px ${C.ember}55`,
        }}><Sparkles size={13} /> Our First Ever</div>

        <h1 style={{ fontSize: 46, fontWeight: 900, letterSpacing: -1.5, margin: 0, lineHeight: 1, textTransform: "uppercase" }}>
          <span style={{ color: C.cream }}>U11 </span>
          <span style={{ backgroundImage: GOLD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: `drop-shadow(0 2px 6px ${C.gold3}66)` }}>Ministævne</span>
        </h1>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: C.muted, fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} color={C.gold2} /> Sun 16 Aug 2026</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} color={C.blue} /> 11:00–13:00</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} color={C.red} /> Fredensborg CC</span>
        </div>

        <div style={{
          display: "inline-flex", gap: 10, marginTop: 28, padding: "16px 20px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          <ScoreTile value={d} label="DAYS" flashKey={d} accent={C.gold2} />
          <ScoreTile value={h} label="HRS" flashKey={h} accent={C.blue} />
          <ScoreTile value={m} label="MIN" flashKey={m} accent={C.red} />
          <ScoreTile value={s} label="SEC" flashKey={s} accent={C.silver2} />
        </div>
      </div>

      {/* ── Live ticker — grammar-correct singular/plural ──── */}
      <div style={{
        background: `linear-gradient(90deg, ${C.turf}, #1a4a30, ${C.blue}33, ${C.turf})`,
        padding: "10px 0", overflow: "hidden", whiteSpace: "nowrap", margin: "26px 0",
        borderTop: `1px solid ${C.emerald}44`, borderBottom: `1px solid ${C.emerald}44`,
      }}>
        <div style={{ display: "inline-block", animation: "ticker 16s linear infinite", fontWeight: 800, fontSize: 12.5 }}>
          {`🏆  ${pluralize(clubCount, "club")} confirmed  ·  ${pluralize(teamsTotal, "team")} registered so far — join them!  ·  `.repeat(6)}
        </div>
      </div>

      {/* ── Invited pool ─────────────────────────────────── */}
      <div style={{ padding: "6px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: 1.4, color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>
          <Users2 size={14} color={C.blue} /> Tap your club icon to add
        </div>
        <div style={{
          position: "relative",
          background: `linear-gradient(135deg, rgba(59,130,246,0.16), rgba(239,68,68,0.14), rgba(240,180,41,0.10))`,
          border: `1.5px dashed ${C.blue}66`, borderRadius: 22,
          boxShadow: `inset 0 0 40px rgba(59,130,246,0.08), 0 0 0 1px rgba(255,255,255,0.04)`,
          padding: "26px 16px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", minHeight: 100,
        }}>
          {waiting.map((c, i) => (
            <div key={c.name} style={{ position: "relative" }}
              onMouseEnter={() => setHovered(c.name)} onMouseLeave={() => setHovered("")}>
              <Tooltip text={c.name} show={hovered === c.name} />
              <div style={{ animation: `bob ${2.6 + (i % 4) * 0.4}s ease-in-out ${i * 0.15}s infinite`, "--r": `${(i % 2 ? -1 : 1) * 4}deg` }}>
                <ClubBadge size={66} bg={c.bg} onClick={() => openForm(c.name, false, false)} title={c.name} dim>
                  <span className="badge-shine" style={{ position: "relative", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>{c.short}</span>
                </ClubBadge>
              </div>
            </div>
          ))}

          {/* Not listed? tap to register */}
          <div style={{ position: "relative" }}
            onMouseEnter={() => setHovered("__new")} onMouseLeave={() => setHovered("")}>
            <Tooltip text="Don't see your club? Tap to register" show={hovered === "__new"} />
            <button onClick={() => { setCustomName(""); openForm("", false, true); }} title="Register a club not listed here" style={{
              width: 66, height: 66, borderRadius: "50%",
              border: `2px dashed ${C.gold2}88`, background: "rgba(255,255,255,0.03)",
              color: C.gold2, fontWeight: 900, fontSize: 26, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: `bob 2.8s ease-in-out infinite`, "--r": "-3deg",
            }}>+</button>
          </div>
        </div>
      </div>

      {/* ── Confirmed / medal pool ───────────────────────── */}
      <div style={{ padding: "28px 20px 6px", position: "relative" }}>
        <Confetti burstKey={burst} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12 }}>
          <Medal size={14} color={C.gold2} />
          <span style={{ backgroundImage: GOLD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Confirmed — {pluralize(clubCount, "club")}
          </span>
        </div>
        <div style={{
          background: `linear-gradient(160deg, rgba(239,68,68,0.10), rgba(59,130,246,0.14), rgba(18,183,106,0.10))`,
          border: `1.5px solid ${C.gold2}55`, borderRadius: 22, padding: "20px 16px", display: "flex", flexWrap: "wrap", gap: 12,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 12px 32px rgba(0,0,0,0.3)`,
        }}>
          {confirmedClubs.map((c) => (
            <div key={c.name} style={{ position: "relative" }}
              onMouseEnter={() => setHovered("c-" + c.name)} onMouseLeave={() => setHovered("")}>
              <Tooltip text={`${c.name} — tap to view`} show={hovered === "c-" + c.name} />
              <div
                onClick={() => adminUnlocked && openForm(c.name, true)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: adminUnlocked ? "pointer" : "default",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
                  border: `1.5px solid ${c.accent}55`, borderLeft: `4px solid ${c.accent}`, borderRadius: 14, padding: "8px 14px 8px 8px",
                  animation: "popIn 0.5s cubic-bezier(.2,1.4,.4,1)", boxShadow: `0 6px 16px rgba(0,0,0,0.35), 0 0 14px ${c.accent}22`,
                }}>
                <ClubBadge size={38} ringWidth={2} bg={c.bg} img={c.host ? FCC_LOGO : undefined}>
                  {c.short}
                </ClubBadge>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800 }}>{c.name}</span>
                    {c.host
                      ? <span style={{ fontSize: 8.5, backgroundImage: GOLD, color: "#3a2a04", fontWeight: 900, padding: "2px 7px", borderRadius: 99 }}>HOST</span>
                      : <CheckCircle2 size={13} color={C.emerald} />}
                    {adminUnlocked && <Pencil size={12} color={C.blue} />}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>
                    {registrationsByClub[c.name]?.teamName || `${c.name} U11`}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 1 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 800,
                      background: `${C.blue}22`, color: "#9dc4ff", border: `1px solid ${C.blue}44`,
                      padding: "2px 7px", borderRadius: 99,
                    }}>
                      <Users2 size={10} /> {registrationsByClub[c.name]?.players || "—"} players
                    </span>
                    {Number(registrationsByClub[c.name]?.teams) > 1 && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 800,
                        background: `${C.gold2}22`, color: C.gold1, border: `1px solid ${C.gold2}44`,
                        padding: "2px 7px", borderRadius: 99,
                      }}>
                        <Trophy size={10} /> {registrationsByClub[c.name].teams} teams
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {adminUnlocked && (
          <div style={{ fontSize: 11, color: C.blue, marginTop: 10, display: "flex", alignItems: "center", gap: 5 }}>
            <Pencil size={12} /> Admin mode: tap any confirmed club to edit their details
          </div>
        )}
      </div>

      {/* ── Admin table — full registration details ──────── */}
      {adminUnlocked && (
        <div style={{ padding: "10px 20px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: C.blue, textTransform: "uppercase" }}>
              <ClipboardList size={14} /> Admin — full details ({(adminRegistrations || []).length})
            </div>
            <button onClick={copyCSV} style={{
              display: "flex", alignItems: "center", gap: 5, background: "rgba(59,130,246,0.12)",
              border: `1px solid ${C.blue}55`, color: "#9dc4ff", borderRadius: 8, padding: "5px 10px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
              <Copy size={11} /> Copy as CSV
            </button>
          </div>
          <div style={{
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "auto",
            background: "rgba(255,255,255,0.03)", maxWidth: "100%",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.05)", textAlign: "left" }}>
                  {["Club", "Team", "Contact", "Email", "Phone", "Teams", "Players", "Status", "Notes", ""].map((hCol) => (
                    <th key={hCol} style={{ padding: "8px 12px", fontWeight: 800, color: C.muted, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{hCol}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(adminRegistrations || []).map((r) => {
                  const isHost = INVITED.some((c) => c.name === r.clubName && c.host);
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.clubName}{isHost && " 👑"}</td>
                      <td style={{ padding: "8px 12px", color: C.muted }}>{r.teamName || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.contact || "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#9dc4ff" }}>{r.email || "—"}</td>
                      <td style={{ padding: "8px 12px", color: C.muted }}>{r.phone || "—"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>{r.teams || 1}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: C.gold2 }}>{r.players || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {r.status === "pending"
                          ? <span style={{ fontSize: 9.5, fontWeight: 800, background: `${C.ember}22`, color: "#ffb08a", border: `1px solid ${C.ember}55`, padding: "2px 7px", borderRadius: 99 }}>Pending review</span>
                          : <span style={{ fontSize: 9.5, fontWeight: 800, background: `${C.emerald}22`, color: "#7de3ae", border: `1px solid ${C.emerald}55`, padding: "2px 7px", borderRadius: 99 }}>Confirmed</span>}
                      </td>
                      <td style={{ padding: "8px 12px", color: C.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{r.notes || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {r.status === "pending" && (
                            <button onClick={() => approveRegistration(r.id, r.clubName)} disabled={approvingId === r.id} title="Approve" style={{
                              display: "flex", alignItems: "center", gap: 4, background: "transparent",
                              color: C.emerald, border: `1px solid ${C.emerald}44`,
                              borderRadius: 7, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                            }}><CheckCheck size={11} /> {approvingId === r.id ? "…" : "Approve"}</button>
                          )}
                          <button onClick={() => openForm(r.clubName, true)} title="Edit" style={{
                            display: "flex", alignItems: "center", gap: 4, background: "transparent",
                            color: "#9dc4ff", border: `1px solid ${C.blue}44`,
                            borderRadius: 7, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                          }}><Pencil size={11} /></button>
                          <button onClick={() => {
                            if (armedRow !== r.id) { setArmedRow(r.id); return; }
                            removeRegistration(r.id, r.clubName); setArmedRow("");
                          }} title={armedRow === r.id ? "Tap again to confirm" : "Remove registration"} style={{
                            display: "flex", alignItems: "center", gap: 4, background: armedRow === r.id ? C.ember : "transparent",
                            color: armedRow === r.id ? "#fff" : "#f87171", border: `1px solid ${armedRow === r.id ? C.ember : "#f8717144"}`,
                            borderRadius: 7, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                          }}>
                            <Trash2 size={11} /> {armedRow === r.id ? "Confirm?" : ""}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ padding: "8px 12px", fontWeight: 800, textAlign: "right", color: C.muted }}>Total (confirmed)</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 800 }}>{teamsTotal}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 800, color: C.gold2 }}>
                    {confirmedList.reduce((n, r) => n + (Number(r.players) || 0), 0)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>
            Visible in admin mode only — never shown on the public page.
          </div>
        </div>
      )}

      {/* ── CTA ──────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginTop: 34 }}>
        <button onClick={() => openForm(waiting[0]?.name || "", false)} disabled={waiting.length === 0} style={{
          position: "relative", overflow: "hidden", backgroundImage: GOLD, color: "#3a2a04", border: "none",
          borderRadius: 99, padding: "16px 38px", fontWeight: 900, fontSize: 15.5, letterSpacing: 0.3,
          cursor: waiting.length ? "pointer" : "default", animation: waiting.length ? "ctaGlow 2.2s ease-in-out infinite" : "none",
          opacity: waiting.length ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 8,
        }}><Zap size={17} /> Register Your Club</button>
        <div style={{ marginTop: 12, fontSize: 11, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <ShieldCheck size={13} /> Contact details stay private — only club name is shown publicly
        </div>
      </div>

      {/* ── Big celebration burst — trophy + ribbons + confetti ──── */}
      {celebrate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "#fff", animation: "flashPulse 0.6s ease-out" }} />

          <div style={{
            position: "absolute", width: 220, height: 220, borderRadius: "50%",
            background: `radial-gradient(circle, ${C.gold2}55, transparent 70%)`,
            animation: "glowPulseBig 1.1s ease-out 0.1s forwards",
          }} />
          <div style={{
            position: "absolute", width: 150, height: 150, borderRadius: "50%",
            border: `3px solid ${C.gold2}`, animation: "ringExpand 1s ease-out 0.4s",
          }} />
          <div style={{
            position: "absolute", width: 150, height: 150, borderRadius: "50%",
            border: `3px solid ${C.blue}`, animation: "ringExpand 1s ease-out 0.55s",
          }} />

          <div style={{
            position: "absolute", transform: "translate(-78px, 14px)",
            "--rot0": "-40deg", "--rot1": "-18deg",
            animation: "ribbonPop 0.7s cubic-bezier(.3,1.6,.4,1) 0.7s backwards",
          }}>
            <Award size={38} color={C.blue} style={{ filter: `drop-shadow(0 0 10px ${C.blue}aa)` }} />
          </div>
          <div style={{
            position: "absolute", transform: "translate(78px, 14px)",
            "--rot0": "40deg", "--rot1": "18deg",
            animation: "ribbonPop 0.7s cubic-bezier(.3,1.6,.4,1) 0.8s backwards",
          }}>
            <Award size={38} color={C.red} style={{ filter: `drop-shadow(0 0 10px ${C.red}aa)` }} />
          </div>

          <Trophy size={130} color={C.gold2} style={{
            filter: `drop-shadow(0 0 40px ${C.gold2}) drop-shadow(0 10px 26px rgba(0,0,0,0.55))`,
            opacity: 0, animation: "trophyBurst 1.1s cubic-bezier(.2,1.3,.3,1) 0.15s forwards",
          }} />
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", backgroundImage: GOLD,
          color: "#3a2a04", fontWeight: 900, fontSize: 13, padding: "11px 20px", borderRadius: 99,
          boxShadow: "0 10px 26px rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", gap: 6,
        }}><Trophy size={15} /> {toast}</div>
      )}

      {/* ── Admin login prompt ───────────────────────────── */}
      {adminPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 45 }}
          onClick={() => setAdminPrompt(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#0B121C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 22, width: 280,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={14} color={C.gold2} /> Organiser access
            </div>
            <input autoFocus type="password" placeholder="Password" value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
              onKeyDown={(e) => e.key === "Enter" && tryUnlockAdmin()}
              style={{ width: "100%", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.05)", color: C.cream, boxSizing: "border-box", marginBottom: 10 }} />
            {loginError && <div style={{ color: "#f87171", fontSize: 11, marginBottom: 10 }}>{loginError}</div>}
            <button onClick={tryUnlockAdmin} disabled={loginLoading || !password} style={{ width: "100%", background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: 10, fontWeight: 800, cursor: "pointer", opacity: loginLoading || !password ? 0.6 : 1 }}>
              {loginLoading ? "Checking…" : "Unlock"}
            </button>
          </div>
        </div>
      )}

      {/* ── Registration / Edit modal ────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40 }}
          onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "linear-gradient(180deg, #16202F, #0B121C)", color: C.cream, width: "100%", maxWidth: 440,
            borderRadius: "24px 24px 0 0", padding: "22px 22px 30px", animation: "popIn 0.25s ease-out",
            border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
          }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 99, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: editMode ? C.blue : C.gold2, textTransform: "uppercase", letterSpacing: 1.4 }}>
                {editMode ? "Editing registration" : "Registering"}
              </div>
              {editMode && <Pencil size={14} color={C.blue} />}
            </div>

            {editMode ? (
              <div style={{ fontSize: 20, fontWeight: 900, padding: "4px 0 14px" }}>{selectedClub}</div>
            ) : isCustomClub ? (
              <input type="text" autoFocus placeholder="Your club's name" value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setForm((f) => ({ ...f, teamName: f.teamName || (e.target.value ? `${e.target.value} U11` : "") }));
                }}
                style={{ width: "100%", fontSize: 20, fontWeight: 900, border: "none", borderBottom: `2px solid ${C.gold2}66`, background: "transparent", color: C.cream, padding: "4px 0 14px", outline: "none" }} />
            ) : (
              <select value={selectedClub} onChange={(e) => {
                const club = e.target.value;
                setSelectedClub(club);
                setForm((f) => ({ ...f, teamName: f.teamName || `${club.replace(/ CC$| Cricket$/, "")} U11` }));
              }}
                style={{ width: "100%", fontSize: 20, fontWeight: 900, border: "none", background: "transparent", color: C.cream, padding: "4px 0 14px", outline: "none" }}>
                {waiting.map((c) => <option key={c.name} value={c.name} style={{ color: "#000" }}>{c.name}</option>)}
              </select>
            )}

            <input type="text" placeholder="Team name" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })}
              style={{ width: "100%", border: `1.5px solid ${C.gold2}55`, borderRadius: 10, padding: "11px 12px", fontSize: 14, marginBottom: 10, fontFamily: "inherit", boxSizing: "border-box", background: "rgba(240,180,41,0.06)", color: C.cream, fontWeight: 700 }} />

            {[["contact", "Contact person", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"]].map(([key, label, type]) => (
              <input key={key} type={type} placeholder={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                style={{ width: "100%", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 12px", fontSize: 14, marginBottom: 10, fontFamily: "inherit", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: C.cream }} />
            ))}

            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}># Teams</label>
                <input type="number" min={1} max={30} value={form.teams} onChange={(e) => setForm({ ...form, teams: e.target.value })}
                  style={{ width: "100%", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "9px 10px", fontFamily: "inherit", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: C.cream }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}># Players</label>
                <input type="number" min={1} max={30} value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })}
                  style={{ width: "100%", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "9px 10px", fontFamily: "inherit", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: C.cream }} />
              </div>
            </div>

            <textarea placeholder="Notes (optional)" value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ width: "100%", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "none", background: "rgba(255,255,255,0.04)", color: C.cream }} />

            {registerError && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{registerError}</div>}

            {editMode ? (
              <button onClick={async () => {
                const id = registrationsByClub[selectedClub]?.id;
                if (!id) return;
                const res = await adminFetch("/api/ministaevne-admin", {
                  method: "PATCH",
                  body: JSON.stringify({ id, clubName: selectedClub, ...form, teams: Number(form.teams), players: Number(form.players) }),
                });
                if (!res) return;
                if (!res.ok) { showToast("Couldn't save changes"); return; }
                setShowForm(false);
                await fetchAdminList();
                fetchPublicList();
                showToast(`${selectedClub} updated ✓`);
              }} disabled={!form.contact || !form.email} style={{
                width: "100%", backgroundImage: `linear-gradient(135deg, ${C.blue}, #1d4ed8)`,
                color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 900, fontSize: 15, cursor: "pointer",
                opacity: (!form.contact || !form.email) ? 0.5 : 1, boxShadow: `0 10px 24px ${C.blue}55`,
              }}>Save Changes ✓</button>
            ) : (
              <button onClick={submit} disabled={registering || !form.contact || !form.email || (isCustomClub && !customName.trim())} style={{
                width: "100%", backgroundImage: `linear-gradient(135deg, ${C.emerald}, #0d8a52)`,
                color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 900, fontSize: 15, cursor: "pointer",
                opacity: (registering || !form.contact || !form.email || (isCustomClub && !customName.trim())) ? 0.5 : 1, boxShadow: `0 10px 24px ${C.emerald}55`,
              }}>{registering ? "Submitting…" : "Confirm Registration 🏏"}</button>
            )}

            {editMode && (
              <button onClick={() => {
                const id = registrationsByClub[selectedClub]?.id;
                if (!id) return;
                if (!removeArmed) { setRemoveArmed(true); return; }
                removeRegistration(id, selectedClub);
                setShowForm(false);
              }} style={{
                width: "100%", marginTop: 10, background: removeArmed ? C.ember : "transparent",
                color: removeArmed ? "#fff" : "#f87171", border: `1.5px solid ${removeArmed ? C.ember : "#f8717155"}`,
                borderRadius: 12, padding: "11px", fontWeight: 800, fontSize: 13, cursor: "pointer",
              }}>
                {removeArmed ? "Tap again to confirm removal" : "🗑 Remove this registration"}
              </button>
            )}
            <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 8 }}>
              Public page shows club name & team count only. Contact details stay private to organisers.
            </div>
          </div>
        </div>
      )}

      {/* ── Floating help button ─────────────────────────── */}
      <button onClick={() => setShowHelp(true)} title="Spotted a mistake? Send a quick note" style={{
        position: "fixed", right: 18, bottom: 18, zIndex: 35,
        width: 52, height: 52, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.18)",
        background: "linear-gradient(160deg, #16202F, #0B121C)", color: C.gold2,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        boxShadow: "0 10px 26px rgba(0,0,0,0.5)",
      }}>
        <HelpCircle size={22} />
      </button>

      {/* ── Help / correction modal ──────────────────────── */}
      {showHelp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 46 }}
          onClick={() => setShowHelp(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "linear-gradient(180deg, #16202F, #0B121C)", color: C.cream, width: "100%", maxWidth: 440,
            borderRadius: "24px 24px 0 0", padding: "22px 22px 30px", animation: "popIn 0.25s ease-out",
            border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
          }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 99, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 800, color: C.gold2, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 12 }}>
              <HelpCircle size={14} /> Need something fixed?
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
              Wrong player count, typo in your team name, need your registration removed — whatever it is, drop a note and we'll sort it directly.
            </div>

            <input type="text" placeholder="Your club (optional)" value={helpClub} onChange={(e) => setHelpClub(e.target.value)}
              style={{ width: "100%", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 12px", fontSize: 14, marginBottom: 10, fontFamily: "inherit", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: C.cream }} />

            <textarea placeholder="What needs fixing?" value={helpMsg} rows={4} onChange={(e) => setHelpMsg(e.target.value)}
              style={{ width: "100%", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "none", background: "rgba(255,255,255,0.04)", color: C.cream }} />

            <button onClick={sendHelp} disabled={!helpMsg.trim() || helpSending} style={{
              width: "100%", background: C.gold2, color: "#3a2a04", border: "none", borderRadius: 12,
              padding: "14px", fontWeight: 900, fontSize: 15, cursor: "pointer",
              opacity: !helpMsg.trim() || helpSending ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}>
              <Send size={15} /> {helpSending ? "Sending…" : "Send to Organisers"}
            </button>
            <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 8 }}>
              Goes straight to the organiser's inbox — usually a reply within a day.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
