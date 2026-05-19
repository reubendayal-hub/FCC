// ═══════════════════════════════════════════════════════════════════════════
// src/views/SignupFlow.jsx
// Conversational signup with email verification.
//
// Replaces the single-screen "Request to Join" form. State machine driven —
// one signupState object, persisted to localStorage (key: "fcc-signup-state")
// with 24h TTL.
//
// The legacy self-verify flow at App.jsx:1747+ (authView==="verify") stays
// in place and uses its own state vars + "fcc-verify-state" localStorage key.
// We do not collide with those.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import Toast from "../ui/Toast";
import { uid } from "../constants/seeds";
import { maskEmail } from "../utils/members";

const STORAGE_KEY = "fcc-signup-state";
const STATE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CODE_TTL_MS = 15 * 60 * 1000;       // 15 min
const SEARCH_MIN_LEN = 3;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 5;

const INITIAL_STATE = {
  step: "who",
  who: null,         // "me" | "child" | "both"

  // Self
  selfName: "",
  selfMatch: null,   // { id, name, email } trimmed — full member object for matched
  selfPhone: "+45 ",
  selfEmail: "",
  selfEmailVerified: false,
  selfTeam: "",

  // Child
  childName: "",
  childMatch: null,
  childTeam: "",

  // Code state
  sentCode: null,           // 6 digits, client-side (matches existing /api/send-verify behaviour)
  sentCodeExpiry: null,     // epoch ms
  sentCodeEmail: null,      // for which email
  sentCodeAttempts: 0,      // track wrong tries
};

// ─── Privacy-filtered search ──────────────────────────────────────────────
// Returns at most SEARCH_LIMIT matches with ONLY name + teams + id.
// No email, no phone, no parentId, no surname beyond initial.
// kidsOnly: when true, restrict to junior team members.
function buildSearchResults(query, members, kidsOnly) {
  const q = (query || "").trim().toLowerCase();
  if (q.length < SEARCH_MIN_LEN) return { results: [], totalCount: 0 };
  const isJuniorTeam = t => t.startsWith("U") || t.includes("Girls");
  const all = members.filter(m => {
    if (!m?.name) return false;
    if (kidsOnly && !(m.teams || []).some(isJuniorTeam)) return false;
    if (!kidsOnly && (m.teams || []).some(isJuniorTeam) && (m.children || []).length === 0) {
      // exclude juniors from the adult lookup (a kid shouldn't appear when adult is registering)
      return false;
    }
    return m.name.toLowerCase().includes(q);
  });
  const slice = all.slice(0, SEARCH_LIMIT).map(m => {
    const parts = (m.name || "").split(/\s+/);
    return {
      id: m.id,
      firstName: parts[0] || m.name,
      lastInitial: (parts[parts.length - 1] || "").charAt(0).toUpperCase(),
      teams: (m.teams || []).slice(0, 3),
    };
  });
  return { results: slice, totalCount: all.length };
}

// ─── Validation helpers ───────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS = s => (s || "").replace(/\D/g, "");

export default function SignupFlow() {
  const ctx = useAppContext();
  const {
    G, members, teams, joinRequests, saveJoinRequests,
    setAuthView, showToast, toast,
  } = ctx;

  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return INITIAL_STATE;
      const parsed = JSON.parse(raw);
      if (!parsed?.savedAt || Date.now() - parsed.savedAt > STATE_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return INITIAL_STATE;
      }
      const { savedAt: _drop, ...rest } = parsed;
      return { ...INITIAL_STATE, ...rest };
    } catch {
      return INITIAL_STATE;
    }
  });

  // Persist every state change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
    } catch {
      // localStorage full / disabled — flow still works in-memory.
    }
  }, [state]);

  const update = (patch) => setState(s => ({ ...s, ...patch }));
  const resetAndExit = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
    setAuthView("pick");
  };

  // ─── Team option lists ──────────────────────────────────────────────
  const allTeamNames = useMemo(() => teams.map(t => t.name), [teams]);
  const seniorTeams = useMemo(
    () => teams.filter(t => t.senior).map(t => t.name).sort(),
    [teams]
  );
  const juniorTeams = useMemo(() => {
    const isJunior = n => n.startsWith("U") || n.includes("Girls");
    return allTeamNames.filter(isJunior).sort();
  }, [allTeamNames]);

  // ─── Send code via existing /api/send-verify ────────────────────────
  const [sendingCode, setSendingCode] = useState(false);
  const sendVerifyCode = async (email, name) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSendingCode(true);
    try {
      const res = await fetch("/api/send-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: (email || "").trim(), name: (name || "").trim(), code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[signup] send-verify failed:", err);
        showToast?.(`Couldn't send code: ${err?.error || "try again"}`);
        return false;
      }
      update({
        sentCode: code,
        sentCodeExpiry: Date.now() + CODE_TTL_MS,
        sentCodeEmail: (email || "").trim(),
        sentCodeAttempts: 0,
        step: "code_self",
      });
      return true;
    } catch (err) {
      console.error("[signup] send-verify network error:", err);
      showToast?.("Network error — try again");
      return false;
    } finally {
      setSendingCode(false);
    }
  };

  // ─── Submit join request(s) ─────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const submitRequests = async () => {
    setSubmitting(true);
    const now = new Date().toISOString();
    const consentDate = now.slice(0, 10);
    const submitted = [];

    // Convert "unsure" / empty → null playerTeam + pendingTeam:true flag.
    // Admin must pick a real team before approving.
    const isUnsureSelf = state.who === "child"
      || state.selfTeam === "unsure"
      || !state.selfTeam;
    const selfFinalTeam = isUnsureSelf ? null : state.selfTeam;

    // Parent / self request always created (steps require self path first).
    const parentReq = {
      id: uid(),
      submittedAt: now,
      forChild: state.who === "child", // if registering FOR a child only, mark parent as the registrar but their record is parent-only
      playerName: state.selfMatch?.name?.trim() || state.selfName.trim(),
      playerTeam: selfFinalTeam,
      pendingTeam: isUnsureSelf,
      parentName: state.who === "child" ? state.selfName.trim() : null,
      email: state.selfEmail.trim() || state.selfMatch?.email || null,
      contact: state.selfPhone.replace(/^\+45\s*$/, "").trim() || null,
      emailVerified: true,
      consentGiven: true,
      consentDate,
      status: "pending",
      matchedMemberId: state.selfMatch?.id || null,
    };
    submitted.push(parentReq);

    let childReq = null;
    if (state.who === "child" || state.who === "both") {
      const isUnsureChild = state.childTeam === "unsure" || !state.childTeam;
      const childFinalTeam = isUnsureChild ? null : state.childTeam;
      childReq = {
        id: uid(),
        submittedAt: now,
        forChild: true,
        playerName: state.childMatch?.name?.trim() || state.childName.trim(),
        playerTeam: childFinalTeam,
        pendingTeam: isUnsureChild,
        parentName: state.selfName.trim(),
        // Child inherits the parent's verified email — matches LinkChildModal convention.
        email: parentReq.email,
        contact: parentReq.contact,
        emailVerified: true,
        consentGiven: true,
        consentDate,
        status: "pending",
        parentLinkId: parentReq.id,
        matchedMemberId: state.childMatch?.id || null,
      };
      submitted.push(childReq);
    }

    try {
      await saveJoinRequests([...joinRequests, ...submitted]);
      // Notify admin (existing /api/notify joinrequest type)
      const summary = state.who === "child"
        ? `${parentReq.parentName} → child ${childReq.playerName}`
        : state.who === "both"
          ? `${parentReq.playerName} (+ child ${childReq.playerName})`
          : parentReq.playerName;
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "joinrequest",
          data: {
            name: summary,
            playerTeam: childReq?.playerTeam || parentReq.playerTeam || "Not sure yet",
            message: `✓ Email verified · ${parentReq.email || "no email"}${parentReq.contact ? " · " + parentReq.contact : ""}`,
          },
        }),
      }).catch(() => {});
      update({ step: "done" });
    } catch (err) {
      console.error("[signup] saveJoinRequests failed:", err);
      showToast?.("Couldn't submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Common UI bits ────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    borderRadius: 10, border: `1.5px solid ${G.border}`,
    padding: "13px 14px", fontSize: 16,
    fontFamily: "'DM Sans',sans-serif", fontWeight: 500,
    background: G.cream, color: G.text,
    outline: "none", minHeight: 48,
  };
  const primaryBtnStyle = (enabled = true) => ({
    width: "100%", padding: "14px",
    borderRadius: 12, border: "none",
    background: enabled ? G.green : "#cbd5e1",
    color: enabled ? G.lime : "#64748b",
    fontSize: 15, fontWeight: 800,
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "inherit",
    boxShadow: enabled ? "0 3px 14px rgba(20,83,45,.3)" : "none",
    minHeight: 48,
  });
  const secondaryBtnStyle = {
    background: "transparent", color: G.muted, border: "none",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", padding: "8px",
  };
  const stepHeading = (title, sub) => (
    <div style={{marginBottom: 18}}>
      <div style={{
        fontFamily: "'Playfair Display',serif",
        fontWeight: 900, fontSize: 22, color: G.text,
        lineHeight: 1.3, marginBottom: 6,
      }}>
        {title}
      </div>
      {sub && (
        <div style={{fontSize: 13, color: G.muted, lineHeight: 1.5}}>
          {sub}
        </div>
      )}
    </div>
  );
  const BackButton = ({ onBack }) => (
    <button type="button" onClick={onBack}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: G.muted, fontSize: 14, fontWeight: 700,
        fontFamily: "inherit", padding: "4px 6px",
        display: "inline-flex", alignItems: "center", gap: 4,
      }}>
      ← Back
    </button>
  );

  // ─── Step graph + back navigation ──────────────────────────────────
  const stepGraph = {
    me:    ["who", "lookup_self", "phone_self", "email_self", "code_self", "team_self", "review", "done"],
    child: ["who", "lookup_self", "phone_self", "email_self", "code_self", "lookup_child", "team_child", "review", "done"],
    both:  ["who", "lookup_self", "phone_self", "email_self", "code_self", "team_self", "lookup_child", "team_child", "review", "done"],
  };
  const currentGraph = stepGraph[state.who] || stepGraph.me;
  const goBack = () => {
    const idx = currentGraph.indexOf(state.step);
    if (idx <= 0) {
      // From step 1 → back to login.
      setAuthView("pick");
      return;
    }
    // If a matched user came in via lookup_self → code_self, back from code_self
    // should go to lookup_self, not phone/email.
    if (state.step === "code_self" && state.selfMatch) {
      update({ step: "lookup_self" });
      return;
    }
    update({ step: currentGraph[idx - 1] });
  };

  // ─── Step renderers ────────────────────────────────────────────────
  const renderStep = () => {
    switch (state.step) {
      case "who":             return <StepWho />;
      case "lookup_self":     return <StepLookupSelf />;
      case "phone_self":      return <StepPhoneSelf />;
      case "email_self":      return <StepEmailSelf />;
      case "code_self":       return <StepCodeSelf />;
      case "team_self":       return <StepTeamSelf />;
      case "lookup_child":    return <StepLookupChild />;
      case "team_child":      return <StepTeamChild />;
      case "review":          return <StepReview />;
      case "done":            return <StepDone />;
      default:                return <StepWho />;
    }
  };

  // ═══════════════════ STEP 1: WHO ═══════════════════
  function StepWho() {
    const choose = (who) => update({ who, step: "lookup_self" });
    return (
      <div>
        {stepHeading(
          "Hi! Let's get you signed up.",
          "Are you joining as…"
        )}
        <div style={{display: "flex", flexDirection: "column", gap: 10}}>
          <BigChoice icon="🙋" label="Just me" sub="Adult player" onClick={() => choose("me")}/>
          <BigChoice icon="👶" label="My child" sub="Parent registering a kid" onClick={() => choose("child")}/>
          <BigChoice icon="🙋👶" label="Me + my child" sub="Cricket parent who also plays" onClick={() => choose("both")}/>
        </div>
      </div>
    );
  }

  function BigChoice({ icon, label, sub, onClick }) {
    return (
      <button type="button" onClick={onClick}
        style={{
          background: G.white, border: `1.5px solid ${G.border}`,
          borderRadius: 14, padding: "16px 18px",
          textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 14,
          minHeight: 64,
        }}>
        <div style={{fontSize: 28, flexShrink: 0}}>{icon}</div>
        <div style={{flex: 1}}>
          <div style={{fontWeight: 800, fontSize: 16, color: G.text}}>{label}</div>
          <div style={{fontSize: 12, color: G.muted, marginTop: 2}}>{sub}</div>
        </div>
        <div style={{fontSize: 18, color: G.muted}}>→</div>
      </button>
    );
  }

  // ═══════════════════ STEP 2: LOOKUP SELF ═══════════════════
  function StepLookupSelf() {
    const [query, setQuery] = useState(state.selfName);
    const [debounced, setDebounced] = useState(state.selfName);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(t);
    }, [query]);
    const { results, totalCount } = useMemo(
      () => buildSearchResults(debounced, members, false),
      [debounced]
    );
    const noMatch = debounced.trim().length >= SEARCH_MIN_LEN && results.length === 0;

    const onPickMatch = async (r) => {
      const full = members.find(m => m.id === r.id);
      if (!full) { showToast?.("Member not found — refresh and try again"); return; }
      // Matched user → send code to email on file.
      if (!full.email) {
        // No email on file — fall through to phone/email collection to gather one.
        showToast?.("No email on file — please add one");
        update({
          selfMatch: null,
          selfName: full.name,
          step: "phone_self",
        });
        return;
      }
      update({
        selfMatch: { id: full.id, name: full.name, email: full.email },
        selfName: full.name,
        selfEmail: full.email,
        selfPhone: full.phone || "+45 ",
      });
      await sendVerifyCode(full.email, full.name);
    };

    const onContinue = () => {
      const name = query.trim();
      if (!name) { showToast?.("Enter your name"); return; }
      update({ selfName: name, step: "phone_self" });
    };

    const isAdultLookup = true;
    const title = state.who === "me"
      ? "Let's see if you're already in our system."
      : "Let's see if YOU are already in our system.";
    const sub = state.who === "me"
      ? "What's your full name?"
      : "First the adult, then we'll add your child.";

    return (
      <div>
        {stepHeading(title, sub)}
        <input
          autoFocus type="text"
          placeholder="Your full name"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{...inputStyle, marginBottom: 12}}
        />

        {results.length > 0 && (
          <>
            <div style={{
              fontSize: 11, fontWeight: 700, color: G.muted,
              letterSpacing: 1.3, textTransform: "uppercase",
              marginTop: 6, marginBottom: 8,
            }}>
              Is this you?
            </div>
            <div style={{display: "flex", flexDirection: "column", gap: 6, marginBottom: 12}}>
              {results.map(r => (
                <button key={r.id} type="button" onClick={() => onPickMatch(r)}
                  style={{
                    background: G.white, border: `1.5px solid ${G.border}`,
                    borderRadius: 10, padding: "12px 14px",
                    textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                    minHeight: 48,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}>
                  <div>
                    <div style={{fontWeight: 700, fontSize: 14, color: G.text}}>
                      {r.firstName} {r.lastInitial}.
                    </div>
                    <div style={{fontSize: 11, color: G.muted, marginTop: 2}}>
                      {r.teams.length ? r.teams.join(" · ") : "No team"}
                    </div>
                  </div>
                  <span style={{fontSize: 16, color: G.muted}}>→</span>
                </button>
              ))}
              {totalCount > results.length && (
                <div style={{fontSize: 11, color: G.muted, fontStyle: "italic", padding: "6px 4px"}}>
                  {totalCount - results.length} more match{totalCount - results.length === 1 ? "" : "es"} — try a longer search.
                </div>
              )}
            </div>
          </>
        )}

        {noMatch && (
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: "10px 12px", marginBottom: 12,
            fontSize: 12, color: "#92400e", lineHeight: 1.5,
          }}>
            Looks like you're new — let's set up your account.
          </div>
        )}

        <button type="button" onClick={onContinue}
          style={primaryBtnStyle(query.trim().length > 0)}>
          {results.length > 0 ? "Nope, none of these are me" : "Continue"}
        </button>
        <BackButton onBack={goBack}/>
      </div>
    );
  }

  // ═══════════════════ STEP 3: PHONE ═══════════════════
  function StepPhoneSelf() {
    const [val, setVal] = useState(state.selfPhone || "+45 ");
    const digits = PHONE_DIGITS(val);
    const canContinue = digits.length >= 8 || digits.length === 0; // optional but if entered, must be valid
    const skip = () => update({ selfPhone: "", step: "email_self" });
    const cont = () => {
      if (digits.length === 0) { skip(); return; }
      if (digits.length < 8) { showToast?.("Phone number looks too short"); return; }
      update({ selfPhone: val.trim(), step: "email_self" });
    };
    return (
      <div>
        {stepHeading("What's your phone number?", "We'll use WhatsApp for quick updates.")}
        <input
          autoFocus type="tel"
          placeholder="+45 XX XX XX XX"
          value={val}
          onChange={e => setVal(e.target.value)}
          style={{...inputStyle, marginBottom: 14}}
        />
        <button type="button" onClick={cont} style={primaryBtnStyle(canContinue)} disabled={!canContinue}>
          Continue →
        </button>
        <button type="button" onClick={skip} style={secondaryBtnStyle}>Add later</button>
        <BackButton onBack={goBack}/>
      </div>
    );
  }

  // ═══════════════════ STEP 4: EMAIL ═══════════════════
  function StepEmailSelf() {
    const [val, setVal] = useState(state.selfEmail || "");
    const valid = EMAIL_RE.test(val.trim());
    const cont = async () => {
      if (!valid) { showToast?.("Enter a valid email"); return; }
      update({ selfEmail: val.trim() });
      await sendVerifyCode(val.trim(), state.selfName || "");
    };
    return (
      <div>
        {stepHeading("What's your email address?", "We'll send a 6-digit code to confirm it.")}
        <input
          autoFocus type="email"
          placeholder="you@example.com"
          value={val}
          onChange={e => setVal(e.target.value)}
          style={{...inputStyle, marginBottom: 14}}
        />
        <button type="button" onClick={cont} style={primaryBtnStyle(valid && !sendingCode)}
          disabled={!valid || sendingCode}>
          {sendingCode ? "Sending…" : "Send me a code →"}
        </button>
        <BackButton onBack={goBack}/>
      </div>
    );
  }

  // ═══════════════════ STEP 5: CODE ═══════════════════
  function StepCodeSelf() {
    const [val, setVal] = useState("");
    const [err, setErr] = useState("");
    const targetEmail = state.sentCodeEmail || state.selfEmail || state.selfMatch?.email || "";
    const masked = targetEmail ? maskEmail(targetEmail) : "your email";
    const expired = !state.sentCodeExpiry || Date.now() > state.sentCodeExpiry;

    const checkCode = () => {
      const clean = val.replace(/\D/g, "").slice(0, 6);
      if (clean.length !== 6) { setErr("Enter all 6 digits"); return; }
      if (expired) { setErr("Code expired — tap Resend for a fresh code."); return; }
      if (state.sentCodeAttempts >= 3) {
        setErr("Too many tries. Tap Resend for a fresh code.");
        return;
      }
      if (clean !== state.sentCode) {
        update({ sentCodeAttempts: (state.sentCodeAttempts || 0) + 1 });
        setErr("Code didn't match. Try again.");
        setVal("");
        return;
      }
      // Verified
      const isMatched = !!state.selfMatch;
      update({
        selfEmailVerified: true,
        sentCode: null,
        sentCodeExpiry: null,
        sentCodeAttempts: 0,
        step: nextAfterCode(state.who, isMatched),
      });
    };

    const resend = async () => {
      setErr("");
      setVal("");
      const ok = await sendVerifyCode(targetEmail, state.selfMatch?.name || state.selfName);
      if (ok) showToast?.("New code sent");
    };

    const wrongEmail = () => {
      // Go back to email step
      update({ step: "email_self" });
    };

    const greeting = state.selfMatch
      ? `Welcome back, ${state.selfMatch.name.split(" ")[0]}! Let's confirm your email.`
      : "Check your inbox.";

    return (
      <div>
        {stepHeading(greeting, `We sent a 6-digit code to ${masked}.`)}
        <CodeInput value={val} onChange={setVal} onSubmit={checkCode}/>
        {err && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 8, padding: "8px 10px", marginTop: 10,
            fontSize: 12, color: "#991b1b",
          }}>
            {err}
          </div>
        )}
        <div style={{display: "flex", gap: 8, marginTop: 14, marginBottom: 14}}>
          <button type="button" onClick={checkCode}
            disabled={val.replace(/\D/g, "").length !== 6}
            style={{...primaryBtnStyle(val.replace(/\D/g, "").length === 6), flex: 1}}>
            Verify →
          </button>
        </div>
        <div style={{display: "flex", gap: 14, justifyContent: "center", fontSize: 13}}>
          <button type="button" onClick={resend} style={secondaryBtnStyle}>
            Resend code
          </button>
          {!state.selfMatch && (
            <button type="button" onClick={wrongEmail} style={secondaryBtnStyle}>
              Wrong email?
            </button>
          )}
        </div>
        <BackButton onBack={goBack}/>
      </div>
    );
  }

  // Where does a verified user go next?
  // Matched user → already has a team on file → skip team_self and head straight to review (or child sub-flow if applicable).
  function nextAfterCode(who, isMatched) {
    if (who === "me") return isMatched ? "review" : "team_self";
    if (who === "both") return isMatched ? "lookup_child" : "team_self";
    if (who === "child") return "lookup_child";
    return "review";
  }

  function CodeInput({ value, onChange, onSubmit }) {
    // Single underlying input; we render as 6 boxes. Paste works because we accept
    // any digits and slice to 6.
    const digits = (value || "").replace(/\D/g, "").slice(0, 6).padEnd(6, " ");
    return (
      <div style={{position: "relative", marginTop: 6}}>
        <input
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSubmit?.(); }}
          aria-label="6-digit verification code"
          style={{
            position: "absolute", inset: 0,
            opacity: 0, cursor: "text",
            width: "100%", height: "100%",
          }}
        />
        <div style={{display: "flex", gap: 8, justifyContent: "space-between"}}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{
              flex: 1, maxWidth: 52, height: 56,
              border: `1.5px solid ${digits[i] !== " " ? G.green : G.border}`,
              borderRadius: 10, background: G.white,
              fontSize: 22, fontWeight: 800, color: G.text,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {digits[i] !== " " ? digits[i] : ""}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════ STEP 6: TEAM SELF ═══════════════════
  function StepTeamSelf() {
    const [val, setVal] = useState(state.selfTeam);
    // For "me" and "both", show only adult/senior teams.
    const opts = seniorTeams.length ? seniorTeams : allTeamNames;
    const cont = () => {
      if (val === "") { showToast?.("Pick a team or 'I'm not sure yet'"); return; }
      const next = state.who === "both" ? "lookup_child" : "review";
      update({ selfTeam: val, step: next });
    };
    return (
      <div>
        {stepHeading("Which team are you joining?", "Adult / senior team for yourself. Pick \"I'm not sure yet\" if admin should decide.")}
        <select value={val} onChange={e => setVal(e.target.value)} style={{...inputStyle, marginBottom: 14, cursor: "pointer"}}>
          <option value="">— Select your team —</option>
          {opts.map(t => <option key={t} value={t}>{t}</option>)}
          <option value="unsure">I'm not sure yet</option>
        </select>
        <button type="button" onClick={cont} style={primaryBtnStyle(val !== "")} disabled={val === ""}>
          Continue →
        </button>
        <BackButton onBack={goBack}/>
      </div>
    );
  }

  // ═══════════════════ STEP 7: LOOKUP CHILD ═══════════════════
  function StepLookupChild() {
    const [query, setQuery] = useState(state.childName);
    const [debounced, setDebounced] = useState(state.childName);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(t);
    }, [query]);
    const { results, totalCount } = useMemo(
      () => buildSearchResults(debounced, members, true), // kidsOnly = true
      [debounced]
    );
    const noMatch = debounced.trim().length >= SEARCH_MIN_LEN && results.length === 0;

    const onPickMatch = (r) => {
      const full = members.find(m => m.id === r.id);
      if (!full) return;
      // Pre-fill team from match if available
      const firstJuniorTeam = (full.teams || []).find(t => t.startsWith("U") || t.includes("Girls")) || "";
      update({
        childMatch: { id: full.id, name: full.name },
        childName: full.name,
        childTeam: firstJuniorTeam,
        step: "team_child",
      });
    };

    const onContinue = () => {
      const name = query.trim();
      if (!name) { showToast?.("Enter your child's name"); return; }
      update({ childName: name, childMatch: null, step: "team_child" });
    };

    return (
      <div>
        {stepHeading("Now your child's name.", "We'll look them up too in case they're already here.")}
        <input
          autoFocus type="text"
          placeholder="Child's full name"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{...inputStyle, marginBottom: 12}}
        />

        {results.length > 0 && (
          <>
            <div style={{
              fontSize: 11, fontWeight: 700, color: G.muted,
              letterSpacing: 1.3, textTransform: "uppercase",
              marginTop: 6, marginBottom: 8,
            }}>
              Is this your child?
            </div>
            <div style={{display: "flex", flexDirection: "column", gap: 6, marginBottom: 12}}>
              {results.map(r => (
                <button key={r.id} type="button" onClick={() => onPickMatch(r)}
                  style={{
                    background: G.white, border: `1.5px solid ${G.border}`,
                    borderRadius: 10, padding: "12px 14px",
                    textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                    minHeight: 48,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}>
                  <div>
                    <div style={{fontWeight: 700, fontSize: 14, color: G.text}}>
                      {r.firstName} {r.lastInitial}.
                    </div>
                    <div style={{fontSize: 11, color: G.muted, marginTop: 2}}>
                      {r.teams.length ? r.teams.join(" · ") : "No team"}
                    </div>
                  </div>
                  <span style={{fontSize: 16, color: G.muted}}>→</span>
                </button>
              ))}
              {totalCount > results.length && (
                <div style={{fontSize: 11, color: G.muted, fontStyle: "italic", padding: "6px 4px"}}>
                  {totalCount - results.length} more match{totalCount - results.length === 1 ? "" : "es"} — try a longer search.
                </div>
              )}
            </div>
          </>
        )}

        {noMatch && (
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: "10px 12px", marginBottom: 12,
            fontSize: 12, color: "#92400e", lineHeight: 1.5,
          }}>
            New player — we'll create their profile.
          </div>
        )}

        <button type="button" onClick={onContinue}
          style={primaryBtnStyle(query.trim().length > 0)}>
          {results.length > 0 ? "None of these are my child" : "Continue"}
        </button>
        <BackButton onBack={goBack}/>
      </div>
    );
  }

  // ═══════════════════ STEP 8: TEAM CHILD ═══════════════════
  function StepTeamChild() {
    const [val, setVal] = useState(state.childTeam);
    const opts = juniorTeams.length ? juniorTeams : allTeamNames;
    const cont = () => {
      // Allow "unsure" — pass null to admin.
      update({ childTeam: val, step: "review" });
    };
    return (
      <div>
        {stepHeading(`Which team is ${(state.childName||"").split(/\s+/)[0] || "your child"} joining?`, "Or pick \"Not sure yet\" — admin can sort it out.")}
        <select value={val} onChange={e => setVal(e.target.value)} style={{...inputStyle, marginBottom: 14, cursor: "pointer"}}>
          <option value="">— Select team —</option>
          <option value="unsure">I'm not sure yet</option>
          {opts.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="button" onClick={cont} style={primaryBtnStyle(val !== "")} disabled={val === ""}>
          Continue →
        </button>
        <BackButton onBack={goBack}/>
      </div>
    );
  }

  // ═══════════════════ STEP 9: REVIEW ═══════════════════
  function StepReview() {
    const selfDisplayTeam = state.who === "child"
      ? "Parent only"
      : (state.selfTeam === "unsure" ? "Not sure yet — admin will pick" : (state.selfTeam || (state.selfMatch ? "(team on file)" : "—")));
    const childDisplayTeam = state.childTeam === "unsure" ? "Not sure yet — admin will pick" : (state.childTeam || "—");

    const jumpTo = (step) => update({ step });

    return (
      <div>
        {stepHeading("Almost done!", "Quick check before we send this to Reuben.")}
        <SummaryCard
          title="You"
          rows={[
            ["Name", state.selfMatch?.name || state.selfName],
            ["Email", state.selfEmail || state.selfMatch?.email || ""],
            ["Phone", state.selfPhone || "—"],
            ["Team", selfDisplayTeam],
          ]}
          badge="✓ email verified"
          onEdit={() => jumpTo(state.selfMatch ? "lookup_self" : "email_self")}
        />
        {(state.who === "child" || state.who === "both") && (
          <SummaryCard
            title="Your child"
            rows={[
              ["Name", state.childMatch?.name || state.childName],
              ["Team", childDisplayTeam],
            ]}
            onEdit={() => jumpTo("lookup_child")}
          />
        )}
        <button type="button" onClick={submitRequests}
          disabled={submitting}
          style={primaryBtnStyle(!submitting)}>
          {submitting ? "Submitting…" : "Submit signup"}
        </button>
        <BackButton onBack={goBack}/>
      </div>
    );
  }

  function SummaryCard({ title, rows, badge, onEdit }) {
    return (
      <div style={{
        background: G.white, border: `1.5px solid ${G.border}`,
        borderRadius: 12, padding: "14px 16px", marginBottom: 12,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 8,
        }}>
          <div style={{fontWeight: 800, fontSize: 14, color: G.text}}>
            {title}
            {badge && (
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 700,
                padding: "2px 7px", borderRadius: 20,
                background: "#dcfce7", color: "#166534",
                border: "0.5px solid #86efac",
              }}>{badge}</span>
            )}
          </div>
          <button type="button" onClick={onEdit}
            style={{
              background: "transparent", border: "none",
              color: G.green, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            Edit →
          </button>
        </div>
        <div style={{display: "flex", flexDirection: "column", gap: 4}}>
          {rows.map(([k, v]) => (
            <div key={k} style={{display: "flex", gap: 8, fontSize: 12, lineHeight: 1.6}}>
              <span style={{color: G.muted, minWidth: 60}}>{k}</span>
              <span style={{color: G.text, fontWeight: 600, wordBreak: "break-word"}}>{v || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════ STEP 10: DONE ═══════════════════
  function StepDone() {
    useEffect(() => {
      // Clear localStorage now that we're submitted.
      localStorage.removeItem(STORAGE_KEY);
    }, []);
    return (
      <div style={{textAlign: "center", padding: "20px 0"}}>
        <div style={{fontSize: 56, marginBottom: 14}}>🎉</div>
        <div style={{
          fontFamily: "'Playfair Display',serif", fontWeight: 900,
          fontSize: 22, color: G.text, marginBottom: 10,
        }}>
          You're submitted!
        </div>
        <div style={{fontSize: 14, color: G.muted, lineHeight: 1.7, marginBottom: 26}}>
          Reuben will review and approve your account shortly.
          You'll get an email when it's ready.
        </div>
        <button type="button" onClick={resetAndExit}
          style={{
            background: G.green, color: G.lime, border: "none",
            borderRadius: 12, padding: "13px 30px",
            fontFamily: "inherit", fontWeight: 800, fontSize: 14,
            cursor: "pointer",
          }}>
          Back to Login
        </button>
      </div>
    );
  }

  // ─── Outer chrome ─────────────────────────────────────────────────
  return (
    <Shell G={G}>
      <div style={{background: G.green, padding: "18px 20px 14px", textAlign: "center"}}>
        <div style={{fontSize: 22, marginBottom: 2}}>✋</div>
        <div style={{
          color: G.white, fontFamily: "'Playfair Display',serif",
          fontSize: 17, fontWeight: 900,
        }}>
          Sign up for FCC
        </div>
        <div style={{color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2}}>
          Verified · pre-screened for admin
        </div>
      </div>
      <div style={{padding: "22px 20px 100px", maxWidth: 460, margin: "0 auto"}}>
        {renderStep()}
      </div>
      {toast && <Toast msg={toast} G={G}/>}
    </Shell>
  );
}
