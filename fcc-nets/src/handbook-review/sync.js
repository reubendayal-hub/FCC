// Autosave + resume engine for /handbook-review. No input is ever lost:
//
//  • Every change goes into `pending` and is mirrored to localStorage at once.
//  • Pending changes are sent to /api/handbook/draft — immediately for taps,
//    ~1.5s after typing stops for text.
//  • On pagehide / tab hidden, everything pending is flushed with
//    fetch(keepalive). If that fails, it stays in localStorage for next time.
//  • Failed saves stay queued and retry with backoff, and on `online`.
//  • Conflicts: each pending item remembers the server updatedAt it was based
//    on (`base`, server clock — no client/server clock comparison). If the
//    server has moved past that base with a different value, the server wins
//    and we show "Updated from another device". Otherwise local wins.

import { api, ApiError } from "./api.js";
import { countDone, TOTAL_PARTS } from "./shared/reviewRules.js";

const TEXT_DEBOUNCE_MS = 1500;
const RESUME_DEBOUNCE_MS = 2500;
const MAX_BACKOFF_MS = 60_000;

const storageKey = (token) => `hbr:state:${token}`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const emptyPending = () => ({ parts: {}, roleInterest: null, missed: null, resume: null });

function loadLocal(token) {
  try {
    const raw = localStorage.getItem(storageKey(token));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function createSync(token) {
  const local = loadLocal(token);
  let state = {
    server: local?.server || null,
    config: local?.config || null,
    pending: local?.pending || emptyPending(),
    status: "idle", // idle | saving | saved | offline | error | closed
    notes: [],
    lastError: "",
  };
  const listeners = new Set();
  let timer = null;
  let inFlight = false;
  let again = false;
  let backoff = 0;

  // ── store plumbing ──
  const emit = () => listeners.forEach((l) => l());
  function set(patch) {
    state = { ...state, ...patch };
    emit();
  }
  function persist() {
    try {
      localStorage.setItem(storageKey(token), JSON.stringify({ server: state.server, config: state.config, pending: state.pending }));
    } catch { /* storage full/blocked — the server copy is still the source of truth */ }
  }
  const hasPending = () => {
    const p = state.pending;
    return Object.keys(p.parts).length > 0 || p.roleInterest || p.missed || p.resume;
  };

  // ── merged view (server + local overlay) ──
  let cache = { state: null, view: null };
  function view() {
    if (cache.state === state) return cache.view;
    const s = state.server;
    const p = state.pending;
    let v = null;
    if (s) {
      const parts = {};
      for (let i = 1; i <= TOTAL_PARTS; i++) {
        const merged = { ...(s.parts?.[i] || {}), ...(p.parts[i]?.fields || {}) };
        if (Object.keys(merged).length) parts[i] = merged;
      }
      v = {
        ...s,
        parts,
        roleInterest: { ...(s.roleInterest || {}), ...(p.roleInterest?.patch || {}) },
        anythingMissed: p.missed ? p.missed.text : s.anythingMissed || "",
        resume: p.resume ? { ...p.resume } : s.resume,
        doneCount: countDone(parts),
      };
    }
    cache = { state, view: { review: v, config: state.config, status: state.status, notes: state.notes, lastError: state.lastError, hasPending: !!(Object.keys(p.parts).length || p.roleInterest || p.missed) } };
    return cache.view;
  }

  // ── reconcile a fresh server copy with what's pending locally ──
  function reconcile(server) {
    const p = state.pending;
    const next = emptyPending();
    const notes = [];
    // Per item: "keep" (local wins → resend), "drop" (server already has it),
    // or "server" (server has a newer, different value → it wins, with a note).
    const decide = (item, serverAt, sameValues) => {
      if (serverAt <= item.base) return "keep";
      if (sameValues) return "drop";
      return serverAt > item.at ? "server" : "keep";
    };
    const rebase = (item, serverAt) => ({ ...item, base: Math.max(item.base, serverAt) });

    for (const [n, item] of Object.entries(p.parts)) {
      const sp = server.parts?.[n] || {};
      const at = sp.updatedAt || 0;
      const sameValues = Object.entries(item.fields).every(([k, v]) => same(sp[k] ?? (k === "verdict" ? null : ""), v ?? (k === "verdict" ? null : "")));
      const d = decide(item, at, sameValues);
      if (d === "keep") next.parts[n] = rebase(item, at);
      else if (d === "server") notes.push(Number(n));
    }
    if (p.roleInterest) {
      const at = server.roleInterestUpdatedAt || 0;
      const sameValues = Object.entries(p.roleInterest.patch).every(([k, v]) => same(server.roleInterest?.[k], v));
      const d = decide(p.roleInterest, at, sameValues);
      if (d === "keep") next.roleInterest = rebase(p.roleInterest, at);
      else if (d === "server") notes.push("roles");
    }
    if (p.missed) {
      const at = server.anythingMissedUpdatedAt || 0;
      const d = decide(p.missed, at, (server.anythingMissed || "") === p.missed.text);
      if (d === "keep") next.missed = rebase(p.missed, at);
      else if (d === "server") notes.push("missed");
    }
    if (p.resume) {
      const at = server.resume?.updatedAt || 0;
      if (decide(p.resume, at, false) === "keep") next.resume = rebase(p.resume, at);
    }
    set({ server, pending: next, notes: notes.length ? notes : state.notes });
    persist();
  }

  // ── loading ──
  async function load() {
    try {
      const { review, config } = await api.review(token);
      set({ config });
      reconcile(review);
      if (config.closed) set({ status: "closed" });
      else if (hasPending()) flushSoon(0);
      return { ok: true };
    } catch (e) {
      if (e.status === 404 || e.status === 401) return { ok: false, notFound: true, error: e.message };
      if (e.status === 403) return { ok: false, notOpen: true, error: e.message };
      if (state.server) { set({ status: "offline", lastError: e.message }); return { ok: true, offline: true }; }
      return { ok: false, error: e.message };
    }
  }

  // ── mutations ──
  function setPart(n, fields, { immediate = false } = {}) {
    const prev = state.pending.parts[n];
    const base = prev ? prev.base : (state.server?.parts?.[n]?.updatedAt || 0);
    const item = { fields: { ...(prev?.fields || {}), ...fields }, at: Date.now(), base };
    set({ pending: { ...state.pending, parts: { ...state.pending.parts, [n]: item } } });
    persist();
    flushSoon(immediate ? 0 : TEXT_DEBOUNCE_MS);
  }

  function setRoleInterest(patch, { immediate = true } = {}) {
    const prev = state.pending.roleInterest;
    const base = prev ? prev.base : (state.server?.roleInterestUpdatedAt || 0);
    set({ pending: { ...state.pending, roleInterest: { patch: { ...(prev?.patch || {}), ...patch }, at: Date.now(), base } } });
    persist();
    flushSoon(immediate ? 300 : TEXT_DEBOUNCE_MS);
  }

  function setMissed(text) {
    const prev = state.pending.missed;
    const base = prev ? prev.base : (state.server?.anythingMissedUpdatedAt || 0);
    set({ pending: { ...state.pending, missed: { text, at: Date.now(), base } } });
    persist();
    flushSoon(TEXT_DEBOUNCE_MS);
  }

  function setResume(lastPart, scrollPct) {
    const cur = view().review?.resume;
    if (cur && cur.lastPart === lastPart && Math.abs((cur.scrollPct || 0) - scrollPct) < 0.02) return;
    const base = state.pending.resume ? state.pending.resume.base : (state.server?.resume?.updatedAt || 0);
    set({ pending: { ...state.pending, resume: { lastPart, scrollPct, at: Date.now(), base } } });
    persist();
    if (!timer) flushSoon(RESUME_DEBOUNCE_MS);
  }

  // ── sending ──
  function payloads() {
    const p = state.pending;
    const out = Object.entries(p.parts).map(([n, item]) => ({ r: token, part: Number(n), fields: item.fields, _part: n, _at: item.at }));
    const extra = {};
    if (p.roleInterest) { extra.roleInterest = p.roleInterest.patch; extra._ri = p.roleInterest.at; }
    if (p.missed) { extra.missed = p.missed.text; extra._missed = p.missed.at; }
    if (p.resume) { extra.resume = { lastPart: p.resume.lastPart, scrollPct: p.resume.scrollPct }; extra._resume = p.resume.at; }
    if (Object.keys(extra).length) {
      if (out.length) Object.assign(out[0], extra);
      else out.push({ r: token, ...extra });
    }
    return out;
  }

  const wire = (pl) => {
    const { _part, _at, _ri, _missed, _resume, ...body } = pl; // eslint-disable-line no-unused-vars
    return body;
  };

  // Remove what was just saved — unless it changed again meanwhile.
  function clearSent(pl, server) {
    const p = { ...state.pending, parts: { ...state.pending.parts } };
    if (pl._part && p.parts[pl._part]?.at === pl._at) delete p.parts[pl._part];
    else if (pl._part && p.parts[pl._part]) p.parts[pl._part] = { ...p.parts[pl._part], base: server.parts?.[pl._part]?.updatedAt || 0 };
    if (pl._ri) {
      if (p.roleInterest?.at === pl._ri) p.roleInterest = null;
      else if (p.roleInterest) p.roleInterest = { ...p.roleInterest, base: server.roleInterestUpdatedAt || 0 };
    }
    if (pl._missed) {
      if (p.missed?.at === pl._missed) p.missed = null;
      else if (p.missed) p.missed = { ...p.missed, base: server.anythingMissedUpdatedAt || 0 };
    }
    if (pl._resume) {
      if (p.resume?.at === pl._resume) p.resume = null;
      else if (p.resume) p.resume = { ...p.resume, base: server.resume?.updatedAt || 0 };
    }
    set({ pending: p, server });
    persist();
  }

  function flushSoon(ms) {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; flush(); }, ms);
  }

  async function flush() {
    if (state.status === "closed") return;
    if (inFlight) { again = true; return; }
    if (!hasPending()) return;
    inFlight = true;
    if (backoff) {
      // Coming back from a failed save: check the server first, so a stale
      // offline draft never overwrites a newer edit from another device.
      try {
        const { review, config } = await api.review(token);
        set({ config });
        reconcile(review);
      } catch (e) {
        inFlight = false;
        handleError(e);
        return;
      }
      if (!hasPending()) { inFlight = false; backoff = 0; set({ status: "saved", lastError: "" }); return; }
    }
    // Saving only the scroll position is silent — no "Saving…" flicker while reading.
    const p0 = state.pending;
    const resumeOnly = !Object.keys(p0.parts).length && !p0.roleInterest && !p0.missed;
    if (!resumeOnly) set({ status: "saving" });
    try {
      for (const pl of payloads()) {
        const { review } = await api.draft(wire(pl));
        clearSent(pl, review);
      }
      backoff = 0;
      if (!resumeOnly || state.status === "offline" || state.status === "error") set({ status: hasPending() ? "saving" : "saved", lastError: "" });
    } catch (e) {
      handleError(e);
    } finally {
      inFlight = false;
    }
    if (again || (hasPending() && state.status === "saving")) { again = false; flushSoon(0); }
  }

  function handleError(e) {
    if (e instanceof ApiError && (e.status === 423 || e.status === 403)) {
      set({ status: "closed", config: { ...(state.config || {}), closed: true } });
      return;
    }
    if (e instanceof ApiError && e.status === 400) {
      // Invalid payload (e.g. over-long text). Keep it locally; don't hammer the server.
      set({ status: "error", lastError: e.message });
      return;
    }
    // Offline, 5xx, 429, 503: keep everything queued and retry.
    backoff = Math.min(MAX_BACKOFF_MS, backoff ? backoff * 2 : 4000);
    set({ status: navigator.onLine === false || e.status === 0 ? "offline" : "error", lastError: e.message });
    flushSoon(backoff);
  }

  // Best-effort flush when the page is going away. Pending stays in
  // localStorage; if these requests land, the next load reconciles to equal
  // values and drops them silently.
  function flushOnExit() {
    if (!hasPending() || state.status === "closed") return;
    clearTimeout(timer);
    for (const pl of payloads()) {
      try {
        fetch("/api/handbook/draft", {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wire(pl)),
        }).catch(() => {});
      } catch { /* ignore */ }
    }
  }

  const onHide = () => { if (document.visibilityState === "hidden") flushOnExit(); else refresh(); };
  const onOnline = () => { backoff = 0; flushSoon(0); };
  async function refresh() {
    if (inFlight || hasPending()) return;
    try {
      const { review, config } = await api.review(token);
      set({ config });
      reconcile(review);
    } catch { /* stay on the local copy */ }
  }

  function start() {
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushOnExit);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", () => set({ status: "offline" }));
  }
  function stop() {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", flushOnExit);
    window.removeEventListener("online", onOnline);
  }

  return {
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    getSnapshot: view,
    load, start, stop, flush,
    setPart, setRoleInterest, setMissed, setResume,
    dismissNotes: () => set({ notes: [] }),
  };
}
