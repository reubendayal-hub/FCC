// Weekly digest + final report emails to the One FCC Leads (never to reviewers).
//
// Env:
//   RESEND_API_KEY        existing
//   HANDBOOK_DIGEST_TO    comma-separated recipients (Reuben + Parag). Defaults to Reuben only.
//   CRON_SECRET           existing; Vercel cron sends it as "Authorization: Bearer <secret>".
//
// Dedup: each send claims a handbookReviewLog/{key} doc with create(), which
// fails if it already exists — a duplicate cron fire can never double-send.

import { COLLECTIONS } from "./db.js";
import { PART_TITLES } from "./summary.js";

const FROM = "FCC Training App <fcc_training_app@nordicanchor.dk>";
const DEFAULT_TO = ["reuben.dayal@gmail.com"];
const SITE = "https://fcc-training.vercel.app";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function digestRecipients() {
  const raw = process.env.HANDBOOK_DIGEST_TO || "";
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_TO;
}

// Copenhagen calendar date, e.g. "2026-11-16".
export function cphDate(ms = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" }).format(new Date(ms));
}

export async function lastDigest(db) {
  // Tiny collection (one doc per send) — filter in memory, no composite index needed.
  const snap = await db.collection(COLLECTIONS.log).get();
  const weekly = snap.docs.map((d) => d.data()).filter((d) => d.kind === "weekly" && d.sentAt);
  weekly.sort((a, b) => b.sentAt - a.sentAt);
  return weekly[0] || null;
}

export function buildDigest(summary, prev, { kind = "weekly" } = {}) {
  const since = prev?.sentAt || 0;
  const { kpis } = summary;
  const newResponses = summary.respondents.filter((r) => r.createdAt > since).length;
  const newComments = summary.comments.filter((c) => c.updatedAt > since);
  const prevVol = new Set(prev?.volunteerKeys || []);
  const volunteerKeys = [];
  const newVolunteers = [];
  for (const v of summary.volunteers) for (const p of v.people) {
    const key = `${v.label}::${p.email}`;
    volunteerKeys.push(key);
    if (!prevVol.has(key)) newVolunteers.push(`${p.name} → ${v.label}`);
  }
  const mostDisagreed = [...summary.perPart]
    .filter((p) => p.disagree + p.changes > 0)
    .sort((a, b) => (b.disagree * 2 + b.changes) - (a.disagree * 2 + a.changes))
    .slice(0, 3);

  const final = kind === "final";
  const volunteerList = final ? summary.volunteers.flatMap((v) => v.people.map((p) => `${p.name} → ${v.label}`)) : newVolunteers;
  const subject = final
    ? `Handbook review — final results: ${kpis.completed} completed of ${kpis.started} started`
    : `Handbook review — week update: ${kpis.started} started, ${kpis.completionPct}% complete`;

  const stat = (n, label) => `<td style="padding:10px;text-align:center;background:#F5F7FC;border-radius:8px">
      <div style="font:700 22px Georgia,serif;color:#1B2A5C">${n}</div>
      <div style="font-size:11px;color:#5D6E99;text-transform:uppercase;letter-spacing:.06em">${label}</div></td>`;

  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#26344F">
    <div style="background:linear-gradient(135deg,#1B2A5C,#2A3D7A);padding:20px 24px;border-radius:12px 12px 0 0;border-bottom:4px solid #CC1B33">
      <div style="color:#D4A217;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">One FCC · Handbook review</div>
      <div style="color:#fff;font:600 20px Georgia,serif;margin-top:4px">${final ? "Final results" : "Your weekly update"}</div>
    </div>
    <div style="background:#fff;border:1px solid #DCE2EF;border-top:none;padding:22px 24px;border-radius:0 0 12px 12px">
      <table style="width:100%;border-spacing:6px"><tr>
        ${stat(kpis.started, "Started")}${stat(kpis.completed, "Completed")}${stat(kpis.completionPct + "%", "Completion")}${stat(kpis.daysLeft, "Days left")}
      </tr></table>
      ${final ? "" : `<p style="margin:16px 0 4px"><b>Since last update:</b> ${newResponses} new reviewer${newResponses === 1 ? "" : "s"}, ${newComments.length} new comment${newComments.length === 1 ? "" : "s"}.</p>`}
      <h3 style="font:600 16px Georgia,serif;color:#1B2A5C;margin:18px 0 6px">Most-questioned parts</h3>
      ${mostDisagreed.length ? `<ol style="margin:0;padding-left:20px">${mostDisagreed.map((p) =>
        `<li>Part ${p.part} · ${esc(PART_TITLES[p.part])} — ${p.disagree} disagree, ${p.changes} want changes</li>`).join("")}</ol>`
        : `<p style="margin:0;color:#5D6E99">No disagreements or change requests yet.</p>`}
      <h3 style="font:600 16px Georgia,serif;color:#1B2A5C;margin:18px 0 6px">${final ? "Volunteers" : "New volunteers"}</h3>
      ${volunteerList.length
        ? `<ul style="margin:0;padding-left:20px">${volunteerList.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`
        : `<p style="margin:0;color:#5D6E99">None${final ? "" : " this week"}.</p>`}
      <a href="${SITE}/handbook-review/admin/" style="display:inline-block;margin-top:20px;background:#1B2A5C;color:#D4A217;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:700">Open the dashboard${final ? " & export" : ""} →</a>
      <p style="font-size:11px;color:#97A5CF;margin:18px 0 0">Sent to the One FCC Leads only. Reviewers never receive email from this page.</p>
    </div></div>`;

  return { subject, html, volunteerKeys, stats: { newResponses, newComments: newComments.length, newVolunteers: newVolunteers.length } };
}

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

// Claims the dedup key; returns false if this send already happened.
export async function claimSend(db, key, data) {
  try {
    await db.collection(COLLECTIONS.log).doc(key).create({ ...data, claimedAt: Date.now() });
    return true;
  } catch (e) {
    if (e.code === 6 || /already exists/i.test(e.message)) return false;
    throw e;
  }
}
