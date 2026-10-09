// ─── useAuth hook ────────────────────────────────────────────
// Owns auth state (currentUser, authView, login code flow, PIN
// flow inputs) and the handler functions used by the auth UI.
// Extracted from App.jsx during Pass 4 modularisation. Pure
// reorganisation — no behaviour changes.

import { useState, useEffect, useMemo, useCallback } from "react";
import { hashPin } from "../utils/crypto";
import { EMAIL_SEED } from "../constants/seeds";

// ── Session storage ─────────────────────────────────────────
// localStorage "fcc-current-user" holds ONLY the member id (as a JSON
// string). Everything else — name, role, teams — is always read from
// the freshly loaded members list, never from cache.
// Legacy sessions stored the full member object; for those we keep the
// cached name once so it can be cross-checked against fresh data, then
// the session is rewritten in the id-only format.
const SESSION_KEY = "fcc-current-user";

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v === "string" && v) return { id: v, legacyName: null };
    if (v && typeof v === "object" && v.id) {
      return { id: String(v.id), legacyName: typeof v.name === "string" ? v.name : null };
    }
  } catch { /* fall through */ }
  clearSession();
  return null;
}
function writeSession(id) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(id)); } catch { /* storage disabled */ }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* storage disabled */ }
}

export function useAuth({
  members,
  pins,
  savePins,
  saveMembers,
  inviteCodes,
  // eslint-disable-next-line no-unused-vars
  setInviteCodes,
  saveInviteCodes,
  showToast,
  // eslint-disable-next-line no-unused-vars
  logAction,
  setView,
}) {
  // ── Auth state ──────────────────────────────────────────────
  // Restore the cached session id. currentUser is DERIVED from fresh
  // members data by id — it is null until members have loaded.
  const [session, setSession] = useState(readSession);
  const currentUser = useMemo(()=>{
    if(!session) return null;
    const fresh = members.find(m=>m.id===session.id);
    if(!fresh) return null;
    if(session.legacyName!==null && fresh.name!==session.legacyName) return null;
    return fresh;
  },[session, members]);

  // setCurrentUser(member) starts/refreshes a session for that member's id;
  // setCurrentUser(null) ends it. Only the id is kept.
  const setCurrentUser = useCallback(u=>{
    if(!u?.id) { clearSession(); setSession(null); return; }
    writeSession(u.id);
    setSession({ id: u.id, legacyName: null });
  },[]);
  const [authView, setAuthView]       = useState("pick");
  const [pickSearch, setPickSearch]   = useState("");
  const [pinError,   setPinError]     = useState("");
  const [pendingMember, setPendingMember] = useState(null);
  const [emailInput,   setEmailInput]   = useState("");
  const [emailError,   setEmailError]   = useState("");

  // Login email code flow — send code to stored email instead of asking them to type it
  const [loginCodeSent,    setLoginCodeSent]    = useState(false);
  const [loginSentCode,    setLoginSentCode]    = useState("");
  const [loginCodeExpiry,  setLoginCodeExpiry]  = useState(null);
  const [loginCodeInput,   setLoginCodeInput]   = useState("");
  const [loginCodeSending, setLoginCodeSending] = useState(false);
  const [loginCodeError,   setLoginCodeError]   = useState("");

  // ── Validate the cached session against fresh members data ──
  // Runs once members have loaded (members stays empty while loading or
  // after a failed load, so a load failure never logs anyone out).
  //  - id not found            → log out (never keep a stale identity)
  //  - legacy name mismatch    → log out (never adopt another identity)
  //  - legacy full-object cache → rewrite as id-only
  useEffect(()=>{
    if(!session || members.length===0) return;
    const fresh = members.find(m=>m.id===session.id);
    const nameMismatch = fresh && session.legacyName!==null && fresh.name!==session.legacyName;
    if(!fresh || nameMismatch) {
      console.warn("Session invalidated:", !fresh ? "member id not found" : "cached name does not match member record");
      clearSession();
      setSession(null);
      setPendingMember(null);
      setAuthView("pick");
      setView("schedule");
      showToast("Please log in again");
      return;
    }
    if(session.legacyName!==null) {
      writeSession(fresh.id);
      setSession({ id: fresh.id, legacyName: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[members, session]);

  // hashCode — small helper used by handleVerifyCode (mirrors the
  // copy still in App.jsx for generateInviteCode).
  function hashCode(code) { return hashPin(code.toUpperCase()); }

  // ── Auth flow handlers ──────────────────────────────────────
  function handlePickMember(member) {
    setPendingMember(member);
    setPinError("");
    setEmailInput("");
    setEmailError("");
    if(pins[member.id]) {
      // Returning user — straight to PIN
      setAuthView("enterpin");
      return;
    }
    // No PIN set — no unverified way in. They need an admin-issued
    // invite code (entered on the pick screen) or admin help.
    setAuthView("nopin");
  }

  function handleVerifyEmail() {
    const seed = EMAIL_SEED[pendingMember.name] || "";
    const stored = (pendingMember.email || "").trim().toLowerCase();
    const typed = emailInput.trim().toLowerCase();
    const expected = stored || seed;
    if(!typed) { setEmailError("Please enter your email address"); return; }
    if(typed !== expected) {
      setEmailError("Email doesn't match our records. Try again or contact your admin.");
      return;
    }
    // Passed — also write email to member record if not already stored
    if(!stored && seed) {
      const updated = members.map(m => m.id===pendingMember.id ? {...m, email:seed} : m);
      saveMembers(updated);
    }
    setEmailError("");
    setAuthView("newpin");
  }

  function handleVerifyCode() {
    const typed = emailInput.trim().toUpperCase();
    if(!typed) { setEmailError("Please enter your invite code"); return; }
    if(hashCode(typed) !== inviteCodes[pendingMember.id]) {
      setEmailError("Invalid code. Check with your admin and try again.");
      return;
    }
    // Passed — clear the used code so it can't be reused
    const updated = {...inviteCodes};
    delete updated[pendingMember.id];
    saveInviteCodes(updated);
    setEmailError("");
    setAuthView("newpin");
  }

  function handleNewPin(pin) {
    const updated = {...pins, [pendingMember.id]: hashPin(pin)};
    savePins(updated);
    setCurrentUser(pendingMember);
    setPendingMember(null);
    setAuthView("pick");
    showToast(`Welcome, ${pendingMember.name.split(" ")[0]}! PIN set ✓`);
  }

  function handleEnterPin(pin) {
    const stored = pins[pendingMember?.id];
    if(stored && hashPin(pin) === stored) {
      setCurrentUser(pendingMember);
      setPendingMember(null);
      setPinError("");
      setAuthView("pick");
      showToast(`Welcome back, ${pendingMember.name.split(" ")[0]}! 👋`);
    } else {
      setPinError("Wrong PIN, try again");
      setTimeout(()=>setPinError(""),2000);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setAuthView("pick");
    setPickSearch("");
    setView("schedule");
  }

  return {
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
  };
}
