// Reviewer identity in the browser — PHASE 1 (test page).
// The reviewer holds a random reviewToken: from the personal link (?r=) or
// localStorage. Phase 2 (inside the app, behind login) replaces this module
// with the verified member session; nothing else in the page reads the token
// directly.

const KEY = "hbr:token";
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

// Token from the personal link (?r=), if well-formed. Not persisted until
// the server confirms it exists, so a bad link never replaces a good token.
export function urlToken() {
  const t = new URLSearchParams(window.location.search).get("r");
  return t && TOKEN_RE.test(t) ? t : null;
}

export function storedToken() {
  try {
    const t = localStorage.getItem(KEY);
    return t && TOKEN_RE.test(t) ? t : null;
  } catch {
    return null;
  }
}

export function readToken() {
  return urlToken() || storedToken();
}

export function saveToken(token) {
  try { localStorage.setItem(KEY, token); } catch { /* storage blocked: the personal link still works */ }
}

export function forgetToken() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function personalLink(token) {
  return `${window.location.origin}/handbook-review/?r=${token}`;
}

// ── Handoff from the FCC Training app (same origin, never via the URL) ──
const PREFILL_KEY = "hbr:prefill";
const PREFILL_TTL_MS = 30 * 60 * 1000;

export function readPrefill() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFILL_KEY) || "null");
    if (!p || typeof p.name !== "string" || Date.now() - (p.at || 0) > PREFILL_TTL_MS) return null;
    return { name: p.name, email: p.email || "", roleGroup: p.roleGroup || "", memberId: p.memberId || null };
  } catch {
    return null;
  }
}

export function clearPrefill() {
  try { localStorage.removeItem(PREFILL_KEY); } catch { /* ignore */ }
}

export function cameFromApp() {
  try { return sessionStorage.getItem("hbr:fromApp") === "1"; } catch { return false; }
}

// Same person? Compare by app member id when both have one, else by name.
export function samePerson(review, prefill) {
  if (!review || !prefill) return true;
  if (review.memberId && prefill.memberId) return review.memberId === prefill.memberId;
  return (review.name || "").trim().toLowerCase() === prefill.name.trim().toLowerCase();
}
