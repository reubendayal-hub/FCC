// /api/send-duty-reminders.js
// Sends parent duty reminders for ALL teams with parent duty enabled.
//
// Runs daily at 08:00 UTC (configured in vercel.json).
//
// Three email types per run:
//   1. 24hr reminder — to parents on duty tomorrow (combined per parent if
//      multiple kids/teams)
//   2. Monday digest — to admins + youth team coaches, listing next 14 days
//      coverage status per team
//   3. Zero-duty nudge — Mondays only, to parents with 0 duties so far
//
// Query params for testing:
//   ?dryRun=true     → log what would send, but don't send
//   ?testOnly=Name   → only send to one parent by name match
//   ?date=YYYY-MM-DD → override "tomorrow" for the 24hr reminder
//   ?digest=true     → force Monday digest even if today isn't Monday
//
// Env vars required (Vercel):
//   RESEND_API_KEY
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY

import { createSign } from "node:crypto";

const FROM = "FCC Training App <fcc_training_app@nordicanchor.dk>";
const ADMIN_EMAIL = "reuben.dayal@gmail.com";
const APP_URL = "https://fcc-training.vercel.app";

// ─── Firestore REST helpers (same pattern as send-reminders.js) ──────────────

function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const b64url = s => Buffer.from(s).toString("base64url");
  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
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

// ─── Date helpers ────────────────────────────────────────────────────────────

function getDatePlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(s) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long"
  });
}

function fmtDateShort(s) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short"
  });
}

function isMonday() {
  return new Date().getUTCDay() === 1;
}

function getSeasonYear() {
  return new Date().getFullYear();
}

// ─── Duty config (inline copies to avoid src/ import issues in Vercel API) ───
// MUST stay in sync with src/constants/parent-duty.js DEFAULT_DUTY_CONFIG
const DEFAULT_DUTY_CONFIG = {
  "U11":       { enabled: true,  trainingSlots: 1, matchSlots: 2, minDuties: 4 },
  "U13":       { enabled: true,  trainingSlots: 1, matchSlots: 2, minDuties: 4 },
  "U13 B":     { enabled: true,  trainingSlots: 1, matchSlots: 2, minDuties: 4 },
  "U15":       { enabled: true,  trainingSlots: 0, matchSlots: 2, minDuties: 3 },
  "U15 Girls": { enabled: true,  trainingSlots: 1, matchSlots: 2, minDuties: 4 },
  "U16":       { enabled: false, trainingSlots: 0, matchSlots: 1, minDuties: 2 },
  "U18":       { enabled: false, trainingSlots: 0, matchSlots: 1, minDuties: 2 },
};

function getEffectiveConfig(team, savedConfig) {
  const fromSaved = savedConfig?.[team];
  const fromDefault = DEFAULT_DUTY_CONFIG[team];
  if (fromSaved) return { ...fromDefault, ...fromSaved };
  return fromDefault || { enabled: false, trainingSlots: 0, matchSlots: 0, minDuties: 0 };
}

function isDutyEnabled(team, savedConfig) {
  return !!getEffectiveConfig(team, savedConfig).enabled;
}

function isMatchSession(s) {
  return !!(s.isMatch || s.matchOpponent || s.type === "match");
}

function getSlotCount(s, savedConfig) {
  const cfg = getEffectiveConfig(s.restrictedTo, savedConfig);
  if (!cfg.enabled) return 0;
  return isMatchSession(s) ? cfg.matchSlots : cfg.trainingSlots;
}

// Normalise: returns array, handles old singular supportParent shape
function getSupportParents(s) {
  if (Array.isArray(s.supportParents)) return s.supportParents;
  if (s.supportParent && s.supportParent.memberId !== undefined) {
    return [{ ...s.supportParent, role: s.supportParent.role || "support" }];
  }
  return [];
}

function countDuties(parent, sessions, team, seasonYear) {
  const meId = parent.id;
  const nameLower = (parent.name || "").toLowerCase().trim();
  let count = 0;
  for (const s of sessions) {
    if (s.restrictedTo !== team) continue;
    if (seasonYear && new Date(s.date).getFullYear() !== seasonYear) continue;
    for (const sp of getSupportParents(s)) {
      if (sp.memberId && sp.memberId === meId) { count++; break; }
      if (!sp.memberId && sp.memberName && sp.memberName.toLowerCase().trim() === nameLower) {
        count++; break;
      }
    }
  }
  return count;
}

// ─── Email templates ─────────────────────────────────────────────────────────

const headerHtml = (subtitle) => `
  <div style="background:#1e3a5f;padding:20px 24px;border-radius:10px 10px 0 0;">
    <h2 style="color:#fbbf24;margin:0;font-size:18px;">🏏 FCC Training App</h2>
    <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:13px;">${subtitle}</p>
  </div>`;

const wrapHtml = (subtitle, body) => `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
    ${headerHtml(subtitle)}
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;
      padding:24px;border-radius:0 0 10px 10px;">
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
      <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.6;">
        Fredensborg Cricket Club · fredensborgcricket.dk<br/>
        Automated message — please do not reply. Open the app to manage your duties.
      </p>
    </div>
  </div>`;

function build24hrEmail(parentName, dutiesByTeam, targetDate) {
  // dutiesByTeam = { U11: [{session, role}], U13: [{session, role}] }
  const teamList = Object.keys(dutiesByTeam);
  const totalSlots = teamList.reduce((sum, t) => sum + dutiesByTeam[t].length, 0);

  const intro = totalSlots === 1
    ? `You're signed up to support tomorrow.`
    : `You're signed up for ${totalSlots} duties tomorrow.`;

  const teamBlocks = teamList.map(team => {
    const entries = dutiesByTeam[team];
    const rows = entries.map(({ session, role, roleLabel }) => {
      const label = session.label || (isMatchSession(session) ? "Match day" : "Training");
      const time = session.from && session.to
        ? `${session.from} – ${session.to}`
        : (session.matchTime || "Time TBC");
      const venue = session.venue || session.location || "FCC ground";
      const opp = session.matchOpponent ? ` vs ${session.matchOpponent}` : "";
      const roleNote = role && role !== "support"
        ? `<div style="font-size:12px;color:#0F6E56;margin-top:4px;">
             Your role: <strong>${roleLabel || role}</strong>
           </div>`
        : "";
      return `
        <div style="background:#E1F5EE;border:1px solid #5DCAA5;border-radius:10px;
          padding:14px;margin-bottom:10px;">
          <div style="font-size:14px;font-weight:700;color:#085041;margin-bottom:4px;">
            ${label}${opp}
          </div>
          <div style="font-size:13px;color:#374151;">
            ⏰ ${time} · 📍 ${venue}
          </div>
          ${roleNote}
        </div>`;
    }).join("");

    return `
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;
          text-transform:uppercase;color:#6b7280;margin-bottom:8px;">
          ${team} · ${fmtDateShort(targetDate)}
        </div>
        ${rows}
      </div>`;
  }).join("");

  return wrapHtml(`Reminder · ${fmtDate(targetDate)}`, `
    <p style="font-size:15px;color:#111827;margin:0 0 16px;">
      Hi ${parentName.split(" ")[0]},
    </p>
    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 18px;">
      ${intro} Thanks for stepping up — the kids and coaches really do appreciate it.
    </p>
    ${teamBlocks}
    <a href="${APP_URL}" style="display:inline-block;margin-top:8px;
      background:#1e3a5f;color:#fbbf24;text-decoration:none;
      padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;">
      Open the app →
    </a>
    <p style="font-size:12px;color:#9ca3af;margin:18px 0 0;">
      If you can't make it, please find a swap and update the app so we know.
    </p>`);
}

function buildMondayDigestEmail(team, sessions, savedConfig) {
  // sessions = next 14 days of duty-bearing sessions for this team
  const rows = sessions.map(s => {
    const slots = getSlotCount(s, savedConfig);
    const filled = getSupportParents(s);
    const isMatch = isMatchSession(s);
    const covered = filled.length >= slots;
    const bg = covered ? "#E1F5EE" : "#FCEBEB";
    const border = covered ? "#5DCAA5" : "#F7C1C1";
    const textColor = covered ? "#085041" : "#791F1F";
    const status = covered
      ? `✓ ${filled.length}/${slots} covered`
      : `⚠ ${filled.length}/${slots} — need ${slots - filled.length} more`;
    const names = filled.length > 0
      ? filled.map(sp => `${sp.memberName}${sp.role && sp.role !== "support" ? ` (${sp.roleLabel || sp.role})` : ""}`).join(", ")
      : "(nobody yet)";
    const label = s.label || (isMatch ? `Match${s.matchOpponent ? ` vs ${s.matchOpponent}` : ""}` : "Training");
    return `
      <div style="background:${bg};border:1px solid ${border};
        border-radius:10px;padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
          <div style="font-size:13px;font-weight:700;color:#111827;">
            ${fmtDateShort(s.date)} · ${label}
          </div>
          <div style="font-size:11px;font-weight:700;color:${textColor};">
            ${status}
          </div>
        </div>
        <div style="font-size:12px;color:#374151;">
          ${names}
        </div>
      </div>`;
  }).join("");

  const uncoveredCount = sessions.filter(s =>
    getSupportParents(s).length < getSlotCount(s, savedConfig)
  ).length;

  return wrapHtml(`${team} duty roster · week of ${fmtDateShort(getDatePlusDays(0))}`, `
    <p style="font-size:15px;color:#111827;margin:0 0 12px;">
      <strong>${team} parent duty — next 14 days</strong>
    </p>
    <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 18px;">
      ${sessions.length} session${sessions.length === 1 ? "" : "s"} ahead ·
      ${uncoveredCount === 0
        ? "<strong style='color:#085041'>All covered ✓</strong>"
        : `<strong style='color:#791F1F'>${uncoveredCount} need volunteers</strong>`
      }
    </p>
    ${rows || "<p style='color:#9ca3af;font-size:13px;'>No duty-bearing sessions in the next 14 days.</p>"}
    <a href="${APP_URL}" style="display:inline-block;margin-top:12px;
      background:#1e3a5f;color:#fbbf24;text-decoration:none;
      padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;">
      Open the app →
    </a>`);
}

function buildZeroNudgeEmail(parentName, teamsWithZero, configs) {
  const lines = teamsWithZero.map(team => {
    const cfg = configs[team];
    return `<li style="margin-bottom:6px;">
      <strong>${team}</strong> — minimum is ${cfg.minDuties} per season, you're at <strong style="color:#791F1F;">0</strong>
    </li>`;
  }).join("");

  return wrapHtml("Parent duties — we need your help", `
    <p style="font-size:15px;color:#111827;margin:0 0 14px;">
      Hi ${parentName.split(" ")[0]},
    </p>
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 14px;">
      The season's underway and you haven't covered a parent duty yet.
      Could you sign up for an upcoming session?
    </p>
    <ul style="font-size:13px;color:#374151;line-height:1.6;padding-left:20px;margin:0 0 18px;">
      ${lines}
    </ul>
    <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 18px;">
      Parent duty isn't coaching — it's helping with kit, transport on match days,
      scoring, and being a friendly grown-up around. Most parents say it's a fun
      way to be part of the club. Open the app and grab a session that suits.
    </p>
    <a href="${APP_URL}" style="display:inline-block;
      background:#1e3a5f;color:#fbbf24;text-decoration:none;
      padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;">
      Find a session →
    </a>`);
}

// ─── Resend send wrapper ─────────────────────────────────────────────────────

async function sendEmail(apiKey, to, subject, html, dryRun = false) {
  if (dryRun) {
    return { dryRun: true, to, subject };
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { error: j.message || `HTTP ${r.status}`, to, subject };
  }
  return { id: j.id, to, subject };
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const apiKey      = process.env.RESEND_API_KEY;
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!apiKey)      return res.status(500).json({ error: "RESEND_API_KEY not set" });
  if (!projectId)   return res.status(500).json({ error: "FIREBASE_PROJECT_ID not set" });
  if (!clientEmail) return res.status(500).json({ error: "FIREBASE_CLIENT_EMAIL not set" });
  if (!privateKey)  return res.status(500).json({ error: "FIREBASE_PRIVATE_KEY not set" });

  const dryRun     = req.query.dryRun === "true";
  const testOnly   = req.query.testOnly || null;
  const forceDigest = req.query.digest === "true";
  const overrideDate = req.query.date || null;

  try {
    const token = await getAccessToken(clientEmail, privateKey);
    const base    = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch members, sessions, config, teams (for coach emails)
    const [mRes, sRes, cRes, tRes] = await Promise.all([
      fetch(`${base}/fccnets/members`,            { headers }),
      fetch(`${base}/fccnets/sessions`,           { headers }),
      fetch(`${base}/fccnets/parentdutyconfig`,   { headers }),
      fetch(`${base}/fccnets/teams`,              { headers }),
    ]);
    if (!mRes.ok) throw new Error(`Members fetch ${mRes.status}: ${await mRes.text()}`);
    if (!sRes.ok) throw new Error(`Sessions fetch ${sRes.status}: ${await sRes.text()}`);
    // Config and teams may not exist yet — that's fine, fall back to defaults
    const mDoc = parseDoc(await mRes.json());
    const sDoc = parseDoc(await sRes.json());
    const cDoc = cRes.ok ? parseDoc(await cRes.json()) : {};
    const tDoc = tRes.ok ? parseDoc(await tRes.json()) : {};

    const members      = mDoc.value ? JSON.parse(mDoc.value) : [];
    const allSessions  = sDoc.value ? JSON.parse(sDoc.value) : [];
    const savedConfig  = cDoc.value ? JSON.parse(cDoc.value) : {};
    const teamsList    = tDoc.value ? JSON.parse(tDoc.value) : [];

    // Determine enabled teams
    const allTeamNames = [
      ...Object.keys(DEFAULT_DUTY_CONFIG),
      ...Object.keys(savedConfig),
    ];
    const enabledTeams = [...new Set(allTeamNames)].filter(t => isDutyEnabled(t, savedConfig));

    if (enabledTeams.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "No teams with parent duty enabled",
      });
    }

    const results = {
      enabledTeams,
      reminders24hr: [],
      mondayDigest: [],
      zeroDutyNudge: [],
      totalSent: 0,
      totalSkipped: 0,
      totalErrors: 0,
      dryRun,
    };

    // ─── 1. 24hr reminders ───────────────────────────────────────────────────
    const targetDate = overrideDate || getDatePlusDays(1);
    const tomorrowSessions = allSessions.filter(s =>
      s.date === targetDate &&
      enabledTeams.includes(s.restrictedTo) &&
      getSlotCount(s, savedConfig) > 0 &&
      getSupportParents(s).length > 0
    );

    // Group duties by parent (combine across teams/sessions for one email)
    const dutiesByParent = {}; // { parentKey: { name, email, dutiesByTeam: {team: [{session,role}]} } }

    for (const s of tomorrowSessions) {
      const sps = getSupportParents(s);
      for (const sp of sps) {
        // Find email — linked members only (unlinked parents skipped, no email)
        if (!sp.memberId) continue;
        const member = members.find(m => m.id === sp.memberId);
        if (!member || !member.email) continue;
        if (testOnly && !member.name.toLowerCase().includes(testOnly.toLowerCase())) continue;

        const key = sp.memberId;
        if (!dutiesByParent[key]) {
          dutiesByParent[key] = {
            name: member.name,
            email: member.email,
            dutiesByTeam: {}
          };
        }
        const team = s.restrictedTo;
        if (!dutiesByParent[key].dutiesByTeam[team]) {
          dutiesByParent[key].dutiesByTeam[team] = [];
        }
        dutiesByParent[key].dutiesByTeam[team].push({
          session: s,
          role: sp.role,
          roleLabel: sp.roleLabel,
        });
      }
    }

    for (const [key, info] of Object.entries(dutiesByParent)) {
      const subject = `Reminder: parent duty tomorrow (${fmtDateShort(targetDate)})`;
      const html = build24hrEmail(info.name, info.dutiesByTeam, targetDate);
      const result = await sendEmail(apiKey, info.email, subject, html, dryRun);
      results.reminders24hr.push({ ...result, name: info.name });
      if (result.error) results.totalErrors++;
      else results.totalSent++;
      await delay(350); // ~3/sec rate-limit cushion
    }

    // ─── 2. Monday digest (admins + youth coaches per team) ──────────────────
    if (isMonday() || forceDigest) {
      // Build recipient list: admin + coaches assigned to each duty-enabled team
      const adminEmails = members
        .filter(m => m.email && (m.role === "admin" || m.role === "superadmin"))
        .map(m => m.email);

      for (const team of enabledTeams) {
        // Find team coaches from teams config
        const teamRec = teamsList.find(t => t.name === team);
        const coachNames = teamRec?.coaches || [];
        const coachEmails = coachNames
          .map(name => members.find(m => m.name === name))
          .filter(m => m && m.email)
          .map(m => m.email);

        // Sessions in next 14 days for this team
        const today = getDatePlusDays(0);
        const fortnight = getDatePlusDays(14);
        const teamSessions = allSessions
          .filter(s =>
            s.restrictedTo === team &&
            s.date >= today && s.date <= fortnight &&
            getSlotCount(s, savedConfig) > 0
          )
          .sort((a, b) => a.date.localeCompare(b.date));

        if (teamSessions.length === 0) continue;

        const recipients = [...new Set([...adminEmails, ...coachEmails])];
        if (recipients.length === 0) continue;
        if (testOnly) continue; // skip digest in test-only mode

        const subject = `${team} parent duty roster — week of ${fmtDateShort(today)}`;
        const html = buildMondayDigestEmail(team, teamSessions, savedConfig);
        const result = await sendEmail(apiKey, recipients, subject, html, dryRun);
        results.mondayDigest.push({ team, recipients: recipients.length, ...result });
        if (result.error) results.totalErrors++;
        else results.totalSent++;
        await delay(350);
      }
    }

    // ─── 3. Zero-duty nudges (Mondays only) ──────────────────────────────────
    if (isMonday() || forceDigest) {
      const seasonYear = getSeasonYear();

      // For each parent, find teams where they have 0 duties this season
      const zeroByParent = {}; // { parentId: { name, email, teams: [...] } }

      for (const team of enabledTeams) {
        const cfg = getEffectiveConfig(team, savedConfig);
        const teamChildIds = new Set(
          members.filter(m => (m.teams || []).includes(team)).map(m => m.id)
        );
        const teamParents = members.filter(m =>
          (m.children || []).some(cid => teamChildIds.has(cid))
        );
        for (const p of teamParents) {
          if (!p.email) continue;
          if (testOnly && !p.name.toLowerCase().includes(testOnly.toLowerCase())) continue;
          const count = countDuties(p, allSessions, team, seasonYear);
          if (count > 0) continue;
          if (!zeroByParent[p.id]) {
            zeroByParent[p.id] = { name: p.name, email: p.email, teams: [], configs: {} };
          }
          zeroByParent[p.id].teams.push(team);
          zeroByParent[p.id].configs[team] = cfg;
        }
      }

      for (const [pid, info] of Object.entries(zeroByParent)) {
        const subject = `${info.teams.join(" / ")} parent duties — we need your help`;
        const html = buildZeroNudgeEmail(info.name, info.teams, info.configs);
        const result = await sendEmail(apiKey, info.email, subject, html, dryRun);
        results.zeroDutyNudge.push({ ...result, name: info.name, teams: info.teams });
        if (result.error) results.totalErrors++;
        else results.totalSent++;
        await delay(350);
      }
    }

    // ─── Write log to Firestore ──────────────────────────────────────────────
    if (!dryRun) {
      try {
        // Read existing log
        const logRes = await fetch(`${base}/fccnets/dutyreminderlogs`, { headers });
        let existingLog = [];
        if (logRes.ok) {
          const logDoc = parseDoc(await logRes.json());
          existingLog = logDoc.list ? JSON.parse(logDoc.list) : [];
        }
        const newEntry = {
          ts: new Date().toISOString(),
          sent: results.totalSent,
          errors: results.totalErrors,
          enabledTeams,
          remindersCount: results.reminders24hr.length,
          digestCount: results.mondayDigest.length,
          nudgeCount: results.zeroDutyNudge.length,
        };
        const newLog = [newEntry, ...existingLog].slice(0, 60); // keep last 60 runs

        // Write back — use {list: JSON.stringify(...)} convention as per memory notes
        await fetch(`${base}/fccnets/dutyreminderlogs?updateMask.fieldPaths=list`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              list: { stringValue: JSON.stringify(newLog) }
            }
          }),
        });
      } catch (e) {
        results.logError = e.message;
      }
    }

    return res.status(200).json({ ok: true, ...results });

  } catch (e) {
    console.error("send-duty-reminders error:", e);
    return res.status(500).json({ error: e.message });
  }
}
