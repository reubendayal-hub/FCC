// /api/handbook/<action> — every endpoint for the /handbook-review test page,
// in ONE serverless function (keeps the project under Vercel's function cap).
//
// Reviewer (identity = random reviewToken, see _lib/handbook/identity.js):
//   GET  config                 open / deadline / version / openToAll
//   GET  access?m=              { allowed } for an app member id (testers/admins while not open to all)
//   POST start                  { name, email, roleGroup } → { reviewToken }
//   GET  review?r=              the reviewer's own review + config
//   POST draft                  { r, part?, fields?, roleInterest?, missed?, missedAnon?, resume? }  autosave, accepts drafts
//   POST part                   { r, part, verdict, change?, notOk?, fix?, roleInterest? }  strict
//   POST missed                 { r, text }
//   POST missed-anon            { r, text }  send "Did we miss anything?" anonymously (text + date only)
// Admin (Bearer token from admin-login, secret = HANDBOOK_ADMIN_SECRET):
//   POST admin-login            { password } → { token }
//   GET  admin-summary
//   GET  admin-export           .xlsx
//   POST admin-settings         { open?, deadlineISO?, testers?, admins? }  (open_to_all not settable)
//   POST admin-delete-review    { id }  delete one TEST review (allowlisted testers' reviews only)
//   POST admin-digest           { mode: "preview" | "test" }  preview HTML, or test-send to Reuben only
// Cron (CRON_SECRET; also requires HANDBOOK_DIGEST_ENABLED=true):
//   GET  cron-weekly            weekly digest to HANDBOOK_DIGEST_TO — vercel.json: Mondays 07:00 UTC
//                               (08:00 Copenhagen in winter time; 09:00 in summer time)
//   GET  cron-final             final report — vercel.json: 7 Nov 07:00 UTC (08:00 Copenhagen, day after the deadline)
//   GET  cron-daily             legacy: Mondays → weekly, day after deadline → final (no longer scheduled)

import { getDb, projectId, NotConfiguredError, COLLECTIONS } from "../_lib/handbook/db.js";
import { newReviewToken, resolveReviewId, identityFields } from "../_lib/handbook/identity.js";
import {
  HttpError, cleanIdentity, getConfig, isClosed, saveConfig, createReview, getReview,
  applyChange, publicReview, listReviews, memberAllowed, deleteReview, sendAnonMissed, listAnonMissed,
} from "../_lib/handbook/store.js";
import { buildSummary } from "../_lib/handbook/summary.js";
import { buildWorkbook } from "../_lib/handbook/export.js";
import { buildDigest, lastDigest, sendEmail, claimSend, digestRecipients, cphDate } from "../_lib/handbook/digest.js";
import { createAdminSession } from "../_lib/adminSession.js";

const admin = createAdminSession({ secretEnv: "HANDBOOK_ADMIN_SECRET" });
const REUBEN = "reuben.dayal@gmail.com";

// ── Rate limiting (in-memory, per instance — best effort) ───
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return hits.length > max;
}
const ip = (req) => String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();

function body(req) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { throw new HttpError(400, "Invalid JSON"); }
  }
  return req.body || {};
}

function method(req, ...allowed) {
  if (!allowed.includes(req.method)) throw new HttpError(405, "Method not allowed");
}

function publicConfig(c) {
  return { open: c.open, deadlineISO: c.deadlineISO, version: c.version, closed: isClosed(c), openToAll: c.open_to_all === true };
}

const NOT_OPEN = "The handbook review isn't open yet";

// Everything the dashboard, export and digest are built from.
const loadAll = (db) => Promise.all([listReviews(db), getConfig(db), listAnonMissed(db)]);

async function requireOpenReview(req, db) {
  const id = resolveReviewId(req);
  if (!id) throw new HttpError(401, "Missing or invalid review link");
  if (limited(`w:${id}`, 120, 60_000)) throw new HttpError(429, "Slow down a little");
  const [config, doc] = await Promise.all([getConfig(db), getReview(id, db)]);
  if (!doc) throw new HttpError(404, "Review not found");
  if (!memberAllowed(config, doc.memberId)) throw new HttpError(403, NOT_OPEN);
  if (isClosed(config)) throw new HttpError(423, "The review is closed");
  return id;
}

function isCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${secret}` || req.headers["x-cron-secret"] === secret;
}

const handlers = {
  async config(req) {
    method(req, "GET");
    return publicConfig(await getConfig());
  },

  // Is this app member allowed in? Answers only yes/no.
  async access(req) {
    method(req, "GET");
    if (limited(`a:${ip(req)}`, 60, 60_000)) throw new HttpError(429, "Slow down a little");
    const m = String(req.query?.m || "");
    const config = await getConfig();
    return { allowed: memberAllowed(config, /^[A-Za-z0-9_-]{1,40}$/.test(m) ? m : null) };
  },

  async start(req) {
    method(req, "POST");
    if (limited(`s:${ip(req)}`, 10, 10 * 60_000)) throw new HttpError(429, "Too many attempts, try again in a few minutes");
    const db = getDb();
    const config = await getConfig(db);
    if (isClosed(config)) throw new HttpError(423, "The review is closed");
    const identity = cleanIdentity(body(req));
    if (!memberAllowed(config, identity.memberId)) throw new HttpError(403, NOT_OPEN);
    const ua = String(req.headers["user-agent"] || "");
    const hint = /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";
    const reviewToken = newReviewToken();
    const doc = await createReview(reviewToken, identityFields(identity), hint, db);
    return { reviewToken, review: publicReview(doc), config: publicConfig(config) };
  },

  async review(req) {
    method(req, "GET");
    const id = resolveReviewId(req);
    if (!id) throw new HttpError(401, "Missing or invalid review link");
    if (limited(`r:${ip(req)}`, 60, 60_000)) throw new HttpError(429, "Slow down a little");
    const db = getDb();
    const [doc, config] = await Promise.all([getReview(id, db), getConfig(db)]);
    if (!doc) throw new HttpError(404, "We couldn't find that review link");
    if (!memberAllowed(config, doc.memberId)) throw new HttpError(403, NOT_OPEN);
    return { review: publicReview(doc), config: publicConfig(config) };
  },

  async draft(req) {
    method(req, "POST");
    const db = getDb();
    const id = await requireOpenReview(req, db);
    const b = body(req);
    return { review: await applyChange(id, b, db) };
  },

  async part(req) {
    method(req, "POST");
    const db = getDb();
    const id = await requireOpenReview(req, db);
    const b = body(req);
    const fields = { verdict: b.verdict };
    for (const k of ["change", "notOk", "fix"]) if (k in b) fields[k] = b[k];
    return { review: await applyChange(id, { part: b.part, fields, roleInterest: b.roleInterest, strict: true }, db) };
  },

  async missed(req) {
    method(req, "POST");
    const db = getDb();
    const id = await requireOpenReview(req, db);
    return { review: await applyChange(id, { missed: body(req).text ?? "" }, db) };
  },

  async "missed-anon"(req) {
    method(req, "POST");
    const db = getDb();
    const id = await requireOpenReview(req, db);
    if (limited(`ma:${id}`, 10, 60 * 60_000)) throw new HttpError(429, "That's a lot of comments, try again later");
    return { review: await sendAnonMissed(id, body(req).text, db) };
  },

  // ── Admin ──
  async "admin-login"(req) {
    method(req, "POST");
    if (!process.env.HANDBOOK_ADMIN_SECRET) throw new HttpError(500, "HANDBOOK_ADMIN_SECRET not configured");
    if (limited(`al:${ip(req)}`, 8, 10 * 60_000)) throw new HttpError(429, "Too many attempts, try again later");
    if (!admin.checkPassword(body(req).password)) throw new HttpError(401, "Incorrect password");
    return { token: admin.signAdminToken() };
  },

  async "admin-summary"(req, res) {
    method(req, "GET");
    if (!admin.requireAdmin(req, res)) return undefined;
    const db = getDb();
    const [reviews, config, anon] = await loadAll(db);
    return { ...buildSummary(reviews, { ...config, closed: isClosed(config) }, { anon }), project: projectId(), env: process.env.VERCEL_ENV || "development" };
  },

  async "admin-export"(req, res) {
    method(req, "GET");
    if (!admin.requireAdmin(req, res)) return undefined;
    const db = getDb();
    const [reviews, config, anon] = await loadAll(db);
    const buf = await buildWorkbook(buildSummary(reviews, config, { anon }));
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="handbook-review-${cphDate()}.xlsx"`);
    res.status(200).send(Buffer.from(buf));
    return undefined;
  },

  async "admin-settings"(req, res) {
    method(req, "POST");
    if (!admin.requireAdmin(req, res)) return undefined;
    const saved = await saveConfig(body(req));
    return { config: publicConfig(saved), testers: saved.testers, admins: saved.admins, open_to_all: saved.open_to_all === true, project: projectId() };
  },

  async "admin-digest"(req, res) {
    method(req, "POST");
    if (!admin.requireAdmin(req, res)) return undefined;
    const db = getDb();
    const [[reviews, config, anon], prev] = await Promise.all([loadAll(db), lastDigest(db)]);
    const digest = buildDigest(buildSummary(reviews, config, { anon }), prev, { kind: body(req).kind === "final" ? "final" : "weekly" });
    if (body(req).mode !== "test") return { subject: digest.subject, html: digest.html, recipients: digestRecipients() };
    // Test send: Reuben only, never logged as a weekly send.
    await sendEmail({ to: [REUBEN], subject: `[TEST] ${digest.subject}`, html: digest.html });
    return { sent: true, to: [REUBEN] };
  },

  // Delete one test review (admin only). Restricted to reviews by allowlisted
  // testers/admins, so this can never remove a real member's answers.
  async "admin-delete-review"(req, res) {
    method(req, "POST");
    if (!admin.requireAdmin(req, res)) return undefined;
    const id = String(body(req).id || "");
    if (!/^[A-Za-z0-9_-]{32}$/.test(id)) throw new HttpError(400, "Missing review id");
    const db = getDb();
    const [config, doc] = await Promise.all([getConfig(db), getReview(id, db)]);
    if (!doc) throw new HttpError(404, "Review not found");
    const testerIds = [...(config.testers || []), ...(config.admins || [])];
    if (!doc.memberId || !testerIds.includes(doc.memberId)) {
      throw new HttpError(403, "Only test reviews (by allowlisted testers) can be deleted here");
    }
    await deleteReview(id, db);
    await db.collection(COLLECTIONS.log).doc(`delete-${Date.now()}-${id.slice(0, 6)}`).set({
      kind: "delete", memberId: doc.memberId, name: doc.name, doneCount: doc.doneCount || 0, at: Date.now(),
    });
    return { deleted: true, name: doc.name };
  },

  // ── Cron ──
  async "cron-weekly"(req, res) { return runCron(req, res, "weekly"); },
  async "cron-final"(req, res) { return runCron(req, res, "final"); },
  // The one route Vercel cron calls (daily, 07:00 UTC = 08:00 Copenhagen in
  // winter): Mondays → weekly digest while open; day after the deadline → final report.
  async "cron-daily"(req, res) {
    if (!isCron(req)) { res.status(401).json({ error: "Unauthorized" }); return undefined; }
    const config = await getConfig(getDb());
    const today = cphDate();
    const dayAfterDeadline = cphDate(new Date(config.deadlineISO).getTime() + 86400000);
    if (today === dayAfterDeadline) return runCron(req, res, "final");
    const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", weekday: "short" }).format(new Date());
    if (weekday === "Mon") return runCron(req, res, "weekly");
    return { skipped: `nothing due today (${today})` };
  },
};

async function runCron(req, res, kind) {
  if (!isCron(req)) { res.status(401).json({ error: "Unauthorized" }); return undefined; }
  if (process.env.HANDBOOK_DIGEST_ENABLED !== "true") return { skipped: "HANDBOOK_DIGEST_ENABLED is not true" };
  const db = getDb();
  const config = await getConfig(db);
  if (kind === "weekly" && isClosed(config)) return { skipped: "review not open" };
  const key = kind === "final" ? "final-report" : `weekly-${cphDate()}`;
  if (!(await claimSend(db, key, { kind }))) return { skipped: `already sent (${key})` };
  const [reviews, prev, anon] = await Promise.all([listReviews(db), lastDigest(db), listAnonMissed(db)]);
  const digest = buildDigest(buildSummary(reviews, config, { anon }), prev, { kind });
  const to = digestRecipients();
  await sendEmail({ to, subject: digest.subject, html: digest.html });
  await db.collection(COLLECTIONS.log).doc(key).set(
    { kind, sentAt: Date.now(), to, volunteerKeys: digest.volunteerKeys, missedKeys: digest.missedKeys, stats: digest.stats }, { merge: true });
  return { sent: true, key, to };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const fn = handlers[req.query.action];
  if (!fn) return res.status(404).json({ error: "Not found" });
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.headersSent) res.status(200).json(out);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof NotConfiguredError) return res.status(503).json({ error: "Review storage is not configured for this deployment" });
    console.error(`handbook/${req.query.action} error:`, err);
    return res.status(500).json({ error: "Something went wrong — your answers are kept on this device and will retry" });
  }
}
