// /api/send-duty-reminders.js
// Cron-driven duty reminders for the U11 support-parent roster.
//
// Runs daily (08:00 CEST = 06:00 UTC).
// Every day: 24-hour reminder to the assigned parent for tomorrow's
//            U11 sessions.
// Mondays only: weekly digest to admins + U11 coaches with upcoming
//               coverage, AND a zero-duty nudge to parents who have
//               zero support sessions logged so far this season.
//
// Pattern mirrors api/send-reminders.js — JWT-signed Firestore REST
// reads, Resend for email, logs each run to fccnets/dutyreminderlogs
// (native Firestore array, same shape as reminderlogs).

import { createSign } from "node:crypto";

function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const b64url = s => Buffer.from(s).toString("base64url");
  const header  = b64url(JSON.stringify({ alg:"RS256", typ:"JWT" }));
  const payload = b64url(JSON.stringify({
    iss: clientEmail, sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
  }));
  const sigInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(sigInput);
  const sig = sign.sign(privateKey, "base64url");
  const jwt = `${sigInput}.${sig}`;
  return fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  .then(r => r.json())
  .then(d => {
    if (!d.access_token) throw new Error(`No token: ${JSON.stringify(d)}`);
    return d.access_token;
  });
}

function parseVal(v) {
  if (!v) return null;
  if ("stringValue"  in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue);
  if ("doubleValue"  in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue"    in v) return null;
  if ("arrayValue"   in v) return (v.arrayValue.values || []).map(parseVal);
  if ("mapValue"     in v) {
    const o = {};
    for (const [k, vv] of Object.entries(v.mapValue.fields || {})) o[k] = parseVal(vv);
    return o;
  }
  return null;
}
function parseDoc(doc) {
  const o = {};
  for (const [k, v] of Object.entries(doc.fields || {})) o[k] = parseVal(v);
  return o;
}
function toFv(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFv) } };
  if (typeof v === "object") {
    const fields = {};
    for (const [k, vv] of Object.entries(v)) fields[k] = toFv(vv);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function getDatePlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtDateLong(s) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-GB",
    { weekday:"long", day:"numeric", month:"long" });
}
function fmtDateShort(s) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-GB",
    { weekday:"short", day:"numeric", month:"short" });
}

// True for sessions that should count as U11 in the support-parent roster.
// Mirrors the in-app logic.
function isU11Session(s) {
  if (s.restrictedTo === "U11") return true;
  if (s.net === "ground" && /u11/i.test(s.label || "")) return true;
  return false;
}

// ── Email templates ──────────────────────────────────────────────

function build24hrHtml(parentName, sess) {
  const first = parentName.split(" ")[0];
  const title = sess.label || "U11 training session";
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    max-width:480px;margin:0 auto;background:#f1f5f9;padding:24px;">
    <div style="background:#b91c1c;padding:22px;border-radius:14px 14px 0 0;text-align:center;">
      <div style="font-size:28px;margin-bottom:6px;">🙋</div>
      <div style="font-size:20px;font-weight:900;color:#fff;">SUPPORT DUTY TOMORROW</div>
      <div style="font-size:13px;color:#fecaca;">Fredensborg CC · U11s</div>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 14px 14px;">
      <p style="font-size:15px;color:#334155;margin:0 0 16px;">
        Hi <b>${first}</b>, just a heads up — you're the support parent for
        <b>tomorrow's</b> U11 session:
      </p>
      <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;
        padding:14px 16px;margin-bottom:18px;">
        <div style="font-size:16px;font-weight:900;color:#92400e;margin-bottom:8px;">${title}</div>
        <table style="font-size:13px;color:#374151;width:100%;border-collapse:collapse;">
          <tr><td style="padding:3px 0;color:#6b7280;width:80px;">📅 Date</td>
              <td style="font-weight:600;">${fmtDateLong(sess.date)}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;">⏰ Time</td>
              <td style="font-weight:600;">${sess.from} – ${sess.to}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280;">📍 Ground</td>
              <td style="font-weight:600;">Karlebo Cricket Ground</td></tr>
        </table>
      </div>
      <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;
        padding:12px 14px;margin-bottom:18px;">
        <div style="font-size:12px;color:#1e3a5f;line-height:1.7;">
          <b>Reminder:</b> equipment set-up/pack-down, an extra adult eye on the kids,
          water/snacks/encouragement. Not a coaching role.
        </div>
      </div>
      <div style="text-align:center;">
        <a href="https://fcc-training.vercel.app"
          style="display:inline-block;background:#1e3a5f;color:#fbbf24;text-decoration:none;
            padding:11px 26px;border-radius:99px;font-weight:700;font-size:14px;">
          Open FCC Training App
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8;">
      Fredensborg Cricket Club · Karlebovej 23 · 3480 Fredensborg
    </div>
  </div>`;
}

function buildDigestHtml(weekStart, upcoming) {
  const rows = upcoming.map(s => {
    const status = s.supportParent
      ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;
          font-size:11px;font-weight:700;">✓ ${s.supportParent.memberName}${s.supportParent.unlinked?' (unlinked)':''}</span>`
      : `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:10px;
          font-size:11px;font-weight:700;">⚠ uncovered</span>`;
    return `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;font-size:13px;
          color:#0f172a;font-weight:600;">${fmtDateShort(s.date)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;font-size:12px;
          color:#475569;">${s.from}–${s.to}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;font-size:12px;
          color:#475569;">${s.label || "Training"}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right;">${status}</td>
      </tr>`;
  }).join("");

  const uncoveredCount = upcoming.filter(s => !s.supportParent).length;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    max-width:600px;margin:0 auto;background:#f1f5f9;padding:24px;">
    <div style="background:#0f172a;padding:22px;border-radius:14px 14px 0 0;text-align:center;">
      <div style="font-size:24px;margin-bottom:4px;">📋</div>
      <div style="font-size:18px;font-weight:900;color:#fff;">U11 Support Parent Roster</div>
      <div style="font-size:12px;color:#94a3b8;">Week of ${fmtDateLong(weekStart)}</div>
    </div>
    <div style="background:#fff;padding:20px;border-radius:0 0 14px 14px;">
      <p style="font-size:13px;color:#475569;margin:0 0 12px;">
        Upcoming U11 sessions for the next 14 days
        ${uncoveredCount > 0
          ? `· <b style="color:#991b1b;">${uncoveredCount} uncovered</b>`
          : `· <b style="color:#166534;">all covered ✓</b>`}
      </p>
      ${upcoming.length === 0
        ? `<p style="font-size:13px;color:#94a3b8;font-style:italic;">No U11 sessions scheduled.</p>`
        : `<table style="width:100%;border-collapse:collapse;">${rows}</table>`}
      <div style="margin-top:18px;text-align:center;">
        <a href="https://fcc-training.vercel.app"
          style="display:inline-block;background:#1e3a5f;color:#fbbf24;text-decoration:none;
            padding:9px 22px;border-radius:99px;font-weight:700;font-size:13px;">
          Open FCC Training App
        </a>
      </div>
    </div>
  </div>`;
}

function buildNudgeHtml(parentName) {
  const first = parentName.split(" ")[0];
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    max-width:480px;margin:0 auto;background:#f1f5f9;padding:24px;">
    <div style="background:#1e3a5f;padding:22px;border-radius:14px 14px 0 0;text-align:center;">
      <div style="font-size:28px;margin-bottom:6px;">🙏</div>
      <div style="font-size:20px;font-weight:900;color:#fff;">We Need Your Help</div>
      <div style="font-size:13px;color:#cbd5e1;">Fredensborg CC · U11 Parent Duty</div>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 14px 14px;">
      <p style="font-size:15px;color:#334155;margin:0 0 14px;">
        Hi <b>${first}</b> — running U11 sessions needs every parent to chip in.
      </p>
      <p style="font-size:13px;color:#475569;line-height:1.6;margin:0 0 18px;">
        Each U11 parent is asked to cover at least <b>4 sessions per season</b> as
        support parent. So far you've covered <b style="color:#991b1b;">0 sessions</b>.
        It's not coaching — just being there for equipment, safety, and energy.
      </p>
      <div style="background:#fef3c7;border:1.5px solid #fcd34d;border-radius:10px;
        padding:12px 14px;margin-bottom:18px;">
        <div style="font-size:12px;color:#78350f;line-height:1.6;">
          Open the app, pick any upcoming U11 session, and tap
          <b>"I'll support this session"</b>. Plenty of weekends left this season.
        </div>
      </div>
      <div style="text-align:center;">
        <a href="https://fcc-training.vercel.app"
          style="display:inline-block;background:#d4a217;color:#fff;text-decoration:none;
            padding:11px 26px;border-radius:99px;font-weight:700;font-size:14px;">
          Volunteer Now →
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8;">
      Fredensborg Cricket Club · Karlebovej 23 · 3480 Fredensborg
    </div>
  </div>`;
}

// ── Email send helpers ──────────────────────────────────────────

async function sendEmail(apiKey, to, subject, html) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "FCC Training App <fcc_training_app@nordicanchor.dk>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(`Resend ${r.status}: ${JSON.stringify(e)}`);
  }
}
const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Handler ─────────────────────────────────────────────────────

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers["x-cron-secret"];
  if (secret !== process.env.CRON_SECRET)
    return res.status(401).json({ error: "Unauthorized" });

  const apiKey      = process.env.RESEND_API_KEY;
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!apiKey)      return res.status(500).json({ error: "RESEND_API_KEY not set" });
  if (!projectId)   return res.status(500).json({ error: "FIREBASE_PROJECT_ID not set" });
  if (!clientEmail) return res.status(500).json({ error: "FIREBASE_CLIENT_EMAIL not set" });
  if (!privateKey)  return res.status(500).json({ error: "FIREBASE_PRIVATE_KEY not set" });

  try {
    const token = await getAccessToken(clientEmail, privateKey);
    const base  = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const headers = { Authorization: `Bearer ${token}` };

    const [mRes, sRes, tRes] = await Promise.all([
      fetch(`${base}/fccnets/members`, { headers }),
      fetch(`${base}/fccnets/sessions`, { headers }),
      fetch(`${base}/fccnets/teams`, { headers }),
    ]);
    if (!mRes.ok) throw new Error(`Members ${mRes.status}: ${await mRes.text()}`);
    if (!sRes.ok) throw new Error(`Sessions ${sRes.status}: ${await sRes.text()}`);
    if (!tRes.ok) throw new Error(`Teams ${tRes.status}: ${await tRes.text()}`);

    const mDoc = parseDoc(await mRes.json());
    const sDoc = parseDoc(await sRes.json());
    const tDoc = parseDoc(await tRes.json());
    const members  = mDoc.value ? JSON.parse(mDoc.value) : [];
    const sessions = sDoc.value ? JSON.parse(sDoc.value) : [];
    const teams    = tDoc.value ? JSON.parse(tDoc.value) : [];

    const u11Sessions = sessions.filter(isU11Session);

    // Allow ?force=monday for testing the digest path.
    const forceMonday = req.query.force === "monday";
    const today = new Date();
    const isMonday = forceMonday || today.getDay() === 1;
    const tomorrow = req.query.date || getDatePlusDays(1);

    const summary = { date: today.toISOString().slice(0,10), is24hr: 0, digest: 0, nudge: 0, errors: [] };

    // ── 4b. 24-hour reminder for tomorrow's U11 sessions ──
    const tomorrowSess = u11Sessions.filter(s => s.date === tomorrow && s.supportParent);
    for (const s of tomorrowSess) {
      const sp = s.supportParent;
      if (!sp || !sp.memberId) continue; // unlinked parents have no email on file
      const member = members.find(m => m.id === sp.memberId);
      if (!member?.email) continue;
      try {
        await sendEmail(apiKey, member.email,
          `🙋 Support duty tomorrow — ${fmtDateShort(s.date)}`,
          build24hrHtml(member.name, s));
        summary.is24hr++;
      } catch (e) {
        summary.errors.push({ stage: "24hr", parent: member.name, err: e.message });
      }
      await delay(350);
    }

    // ── Monday-only: digest + zero-duty nudge ──
    if (isMonday) {
      // 4c. Digest to admins + U11 coaches
      const u11Team = teams.find(t => t.name === "U11");
      const u11Coaches = u11Team?.coaches || [];
      const digestRecipients = [];
      const seen = new Set();
      members.forEach(m => {
        if (!m?.email) return;
        const role = m.role || "member";
        const isAdmin = role === "superadmin" || role === "admin";
        const isU11Coach = u11Coaches.includes(m.name);
        if ((isAdmin || isU11Coach) && !seen.has(m.email.toLowerCase())) {
          seen.add(m.email.toLowerCase());
          digestRecipients.push(m);
        }
      });

      const weekStart = today.toISOString().slice(0,10);
      const cutoff = getDatePlusDays(14);
      const upcoming = u11Sessions
        .filter(s => s.date >= weekStart && s.date <= cutoff)
        .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));

      for (const rec of digestRecipients) {
        try {
          await sendEmail(apiKey, rec.email,
            `U11 support parent roster — week of ${fmtDateShort(weekStart)}`,
            buildDigestHtml(weekStart, upcoming));
          summary.digest++;
        } catch (e) {
          summary.errors.push({ stage: "digest", to: rec.name, err: e.message });
        }
        await delay(350);
      }

      // 4d. Zero-duty nudge — U11 parents with 0 duties this season.
      // Counts only linked parents (we have no email for unlinked ones).
      const seasonYear = today.getFullYear();
      const seasonU11 = u11Sessions.filter(s =>
        new Date(s.date).getFullYear() === seasonYear);
      const dutyCount = {};
      seasonU11.forEach(s => {
        const sp = s.supportParent;
        if (sp && sp.memberId) {
          dutyCount[sp.memberId] = (dutyCount[sp.memberId] || 0) + 1;
        }
      });
      const u11ChildIds = new Set(
        members.filter(m => (m.teams || []).includes("U11")).map(m => m.id)
      );
      const u11Parents = members.filter(m =>
        (m.children || []).some(cid => u11ChildIds.has(cid))
      );
      for (const p of u11Parents) {
        if (!p.email) continue;
        if ((dutyCount[p.id] || 0) > 0) continue;
        try {
          await sendEmail(apiKey, p.email,
            "U11 parent duties — we need your help!",
            buildNudgeHtml(p.name));
          summary.nudge++;
        } catch (e) {
          summary.errors.push({ stage: "nudge", parent: p.name, err: e.message });
        }
        await delay(350);
      }
    }

    // ── Persist run log to fccnets/dutyreminderlogs.list ──
    try {
      const newEntry = {
        runAt: new Date().toISOString(),
        ...summary,
        isMonday,
      };
      const lr = await fetch(`${base}/fccnets/dutyreminderlogs`, { headers });
      let existingList = [];
      if (lr.ok) {
        const lDoc = parseDoc(await lr.json());
        if (Array.isArray(lDoc.list)) existingList = lDoc.list;
      }
      const updatedList = [newEntry, ...existingList].slice(0, 30);
      await fetch(`${base}/fccnets/dutyreminderlogs?updateMask.fieldPaths=list`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { list: toFv(updatedList) } }),
      });
    } catch (logErr) {
      console.error("dutyreminderlogs save failed:", logErr.message);
    }

    return res.status(200).json({ ok: true, ...summary, isMonday });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
