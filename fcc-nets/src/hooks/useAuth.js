// ─── useAuth hook ────────────────────────────────────────────
// Owns auth state (currentUser, authView, login code flow, PIN
// flow inputs) and the handler functions used by the auth UI.
// Extracted from App.jsx during Pass 4 modularisation. Pure
// reorganisation — no behaviour changes.

import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { hashPin } from "../utils/crypto";
import { EMAIL_SEED } from "../constants/seeds";

export function useAuth({
  members,
  pins,
  savePins,
  saveMembers,
  inviteCodes,
  setInviteCodes,
  saveInviteCodes,
  showToast,
  // eslint-disable-next-line no-unused-vars
  logAction,
  setView,
}) {
  // ── Auth state ──────────────────────────────────────────────
  // Restore from localStorage if previously logged in.
  const [currentUser, setCurrentUser] = useState(()=>{
    try { const s=localStorage.getItem("fcc-current-user"); return s?JSON.parse(s):null; } catch{ return null; }
  });
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

  // ── Keep cached currentUser in sync if their role/team changes in Firebase
  useEffect(()=>{
    if(!currentUser || members.length===0) return;
    const fresh = members.find(m=>m.id===currentUser.id);
    if(fresh && (fresh.role!==currentUser.role
      || JSON.stringify(fresh.teams)!==JSON.stringify(currentUser.teams)
      || fresh.name!==currentUser.name)) {
      setCurrentUser(fresh);
      localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[members]);

  // hashCode — small helper used by handleVerifyCode (mirrors the
  // copy still in App.jsx for generateInviteCode).
  function hashCode(code) { return hashPin(code.toUpperCase()); }

  // ── Auth flow handlers ──────────────────────────────────────
  async function handlePickMember(member) {
    setPendingMember(member);
    setPinError("");
    setEmailInput("");
    setEmailError("");
    if(pins[member.id]) {
      // Returning user — straight to PIN
      setAuthView("enterpin");
      return;
    }
    // First-time login — do a fresh fetch of invitecodes from Firebase
    // (the in-memory state may be stale if a code was generated after page load)
    let freshCodes = inviteCodes;
    try {
      const snap = await getDoc(doc(db,"fccnets","invitecodes"));
      if(snap.exists()) {
        freshCodes = JSON.parse(snap.data().value);
        setInviteCodes(freshCodes); // sync state too
      }
    } catch(e) { /* use cached value on error */ }

    // EMERGENCY BYPASS: Skip all verification during recovery
    // Everyone without a PIN goes straight to setting one
    setAuthView("newpin");
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
    localStorage.setItem("fcc-current-user", JSON.stringify(pendingMember));
    setPendingMember(null);
    setAuthView("pick");
    showToast(`Welcome, ${pendingMember.name.split(" ")[0]}! PIN set ✓`);
  }

  function handleEnterPin(pin) {
    // EMERGENCY: Allow 0000 as universal PIN for ALL members during recovery
    // This lets everyone back in after the data incident
    if(pin === "0000") {
      setCurrentUser(pendingMember);
      localStorage.setItem("fcc-current-user", JSON.stringify(pendingMember));
      setPendingMember(null);
      setPinError("");
      setAuthView("pick");
      showToast(`Welcome, ${pendingMember.name.split(" ")[0]}! 👋`);
      return;
    }
    // Normal PIN check
    if(hashPin(pin) === pins[pendingMember.id]) {
      setCurrentUser(pendingMember);
      localStorage.setItem("fcc-current-user", JSON.stringify(pendingMember));
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
    localStorage.removeItem("fcc-current-user");
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
