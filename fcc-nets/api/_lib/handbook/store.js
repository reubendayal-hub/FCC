// Review storage + validation for /handbook-review. All writes happen here,
// via the Admin SDK, inside transactions (autosave can fire rapidly).

import { getDb, COLLECTIONS } from "./db.js";
import {
  TOTAL_PARTS, VERDICTS, MAX_TEXT, ROLE_TOGGLE_KEYS, COMMITTEE_KEYS, ROLE_GROUP_KEYS,
  partProblem, countDone,
} from "../../../src/handbook-review/shared/reviewRules.js";

export const HANDBOOK_VERSION = "v0.4";
export const DEFAULT_CONFIG = {
  open: false,
  deadlineISO: "2026-11-30T23:59:00+01:00",
  version: HANDBOOK_VERSION,
  // Access while open_to_all is false: only these app member ids may take part.
  // Defaults are empty, so without a saved config nobody can use the review.
  testers: [],
  admins: [],
  open_to_all: false,
};

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ── Sanitising ──────────────────────────────────────────────
// Strip tags and control characters, normalise, cap length.
export function cleanText(v, max = MAX_TEXT) {
  if (v == null) return "";
  if (typeof v !== "string") throw new HttpError(400, "Text fields must be strings");
  const s = v
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .normalize("NFC");
  if (s.length > max) throw new HttpError(400, `Text is too long (max ${max} characters)`);
  return s;
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

export function cleanIdentity(body) {
  const name = cleanText(body?.name, 80).trim();
  const email = cleanText(body?.email, 160).trim().toLowerCase();
  const roleGroup = String(body?.roleGroup || "");
  if (name.length < 2) throw new HttpError(400, "Please tell us your name");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Please enter a valid email");
  if (!ROLE_GROUP_KEYS.includes(roleGroup)) throw new HttpError(400, "Please pick your team / role");
  // Optional app member id when started from inside the app (not verified — phase 2 will be).
  const memberId = typeof body?.memberId === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(body.memberId) ? body.memberId : null;
  return { name, email, roleGroup, memberId };
}

function cleanPartFields(f) {
  const out = {};
  if (f == null || typeof f !== "object") return out;
  if ("verdict" in f) {
    if (f.verdict !== null && !VERDICTS.includes(f.verdict)) throw new HttpError(400, "Unknown verdict");
    out.verdict = f.verdict;
  }
  for (const k of ["change", "notOk", "fix"]) if (k in f) out[k] = cleanText(f[k]);
  return out;
}

function cleanRoleInterest(ri) {
  const out = {};
  if (ri == null || typeof ri !== "object") return out;
  if ("committees" in ri) {
    if (!Array.isArray(ri.committees)) throw new HttpError(400, "committees must be a list");
    out.committees = [...new Set(ri.committees.filter((c) => COMMITTEE_KEYS.includes(c)))];
  }
  for (const k of ROLE_TOGGLE_KEYS) if (k in ri) out[k] = !!ri[k];
  return out;
}

function cleanResume(r) {
  if (r == null || typeof r !== "object") return null;
  const lastPart = Number(r.lastPart);
  const scrollPct = Number(r.scrollPct);
  return {
    lastPart: Number.isInteger(lastPart) && lastPart >= 0 && lastPart <= TOTAL_PARTS ? lastPart : 0,
    scrollPct: Number.isFinite(scrollPct) ? Math.min(1, Math.max(0, scrollPct)) : 0,
  };
}

function cleanPartNumber(p) {
  const n = Number(p);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_PARTS) throw new HttpError(400, "part must be 1–13");
  return n;
}

// ── Config ──────────────────────────────────────────────────
export async function getConfig(db = getDb()) {
  const snap = await db.collection(COLLECTIONS.config).doc("settings").get();
  return { ...DEFAULT_CONFIG, ...(snap.exists ? snap.data() : {}) };
}

// Allowlist check. NOTE: memberId comes from the app's client-side login
// (not server-verified yet) — fine for a 3-person test, not for rollout.
export function memberAllowed(config, memberId) {
  if (config.open_to_all === true) return true;
  if (!memberId) return false;
  const ids = [...(config.testers || []), ...(config.admins || [])];
  return ids.includes(memberId);
}

export function isClosed(config, now = Date.now()) {
  return !config.open || now > new Date(config.deadlineISO).getTime();
}

export async function saveConfig(patch, db = getDb()) {
  const out = {};
  if ("open" in patch) out.open = !!patch.open;
  if ("deadlineISO" in patch) {
    const t = new Date(patch.deadlineISO);
    if (Number.isNaN(t.getTime())) throw new HttpError(400, "Invalid deadline");
    out.deadlineISO = String(patch.deadlineISO);
  }
  // Allowlist: app member ids only. open_to_all is deliberately NOT settable
  // here (rollout isn't built); it stays false unless changed in the console.
  for (const key of ["testers", "admins"]) {
    if (!(key in patch)) continue;
    const list = patch[key];
    if (!Array.isArray(list) || list.length > 50 || !list.every((id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(id))) {
      throw new HttpError(400, `${key} must be a list of member ids`);
    }
    out[key] = [...new Set(list)];
  }
  if ("open_to_all" in patch) {
    if (patch.open_to_all !== false) throw new HttpError(400, "open_to_all can only be set to false here");
    out.open_to_all = false;
  }
  out.updatedAt = Date.now();
  await db.collection(COLLECTIONS.config).doc("settings").set(out, { merge: true });
  return getConfig(db);
}

// ── Reviews ─────────────────────────────────────────────────
// What the reviewer gets back about their own review.
export function publicReview(doc) {
  return {
    name: doc.name,
    memberId: doc.memberId || null,
    roleGroup: doc.roleGroup,
    handbookVersion: doc.handbookVersion,
    parts: doc.parts || {},
    resume: doc.resume || { lastPart: 0, scrollPct: 0, updatedAt: 0 },
    roleInterest: doc.roleInterest || {},
    roleInterestUpdatedAt: doc.roleInterestUpdatedAt || 0,
    anythingMissed: doc.anythingMissed || "",
    anythingMissedUpdatedAt: doc.anythingMissedUpdatedAt || 0,
    doneCount: countDone(doc.parts),
    completedAt: doc.completedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createReview(id, identity, userAgentHint, db = getDb()) {
  const now = Date.now();
  const doc = {
    mode: "test",
    ...identity,
    handbookVersion: HANDBOOK_VERSION,
    parts: {},
    resume: { lastPart: 0, scrollPct: 0, updatedAt: now },
    roleInterest: { committees: [], selector: false, coaching: false, captaincy: false, oneFcc: false },
    roleInterestUpdatedAt: 0,
    anythingMissed: "",
    anythingMissedUpdatedAt: 0,
    doneCount: 0,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    userAgentHint,
  };
  await db.collection(COLLECTIONS.reviews).doc(id).create(doc);
  return doc;
}

export async function getReview(id, db = getDb()) {
  const snap = await db.collection(COLLECTIONS.reviews).doc(id).get();
  return snap.exists ? snap.data() : null;
}

// One write path for autosave and explicit saves.
//   change = { part?, fields?, roleInterest?, missed?, resume?, strict? }
// strict=true (POST /part) rejects an incomplete answer; otherwise the part
// is stored as a draft and only counts once partProblem() returns null.
export async function applyChange(id, change, db = getDb()) {
  const ref = db.collection(COLLECTIONS.reviews).doc(id);
  const part = change.part != null ? cleanPartNumber(change.part) : null;
  const fields = cleanPartFields(change.fields);
  const roleInterest = cleanRoleInterest(change.roleInterest);
  const missed = "missed" in change ? cleanText(change.missed) : undefined;
  const resume = cleanResume(change.resume);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "Review not found");
    const doc = snap.data();
    const now = Date.now();
    const update = { updatedAt: now };
    const parts = { ...(doc.parts || {}) };

    if (part != null && Object.keys(fields).length) {
      const merged = { ...(parts[part] || {}), ...fields };
      const problem = partProblem(merged);
      if (change.strict && problem) throw new HttpError(400, problem);
      merged.status = problem ? "draft" : "done";
      merged.updatedAt = now;
      parts[part] = merged;
      update[`parts.${part}`] = merged;
    }
    if (Object.keys(roleInterest).length) {
      update.roleInterest = { ...(doc.roleInterest || {}), ...roleInterest };
      update.roleInterestUpdatedAt = now;
    }
    if (missed !== undefined) {
      update.anythingMissed = missed;
      update.anythingMissedUpdatedAt = now;
    }
    if (resume) update.resume = { ...resume, updatedAt: now };

    const doneCount = countDone(parts);
    update.doneCount = doneCount;
    if (doneCount === TOTAL_PARTS && !doc.completedAt) update.completedAt = now;
    if (doneCount < TOTAL_PARTS && doc.completedAt) update.completedAt = null;

    tx.update(ref, update);
    return publicReview({ ...doc, ...update, parts });
  });
}

export async function listReviews(db = getDb()) {
  const snap = await db.collection(COLLECTIONS.reviews).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
