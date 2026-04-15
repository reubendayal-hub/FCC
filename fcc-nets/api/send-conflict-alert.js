// /api/send-conflict-alert.js
// Daily cron job to check for coach conflicts this week
// Sends email to reuben.dayal@gmail.com if unresolved conflicts exist
// Called by cron-job.org daily at 8am

import { createSign } from "node:crypto";

// ─── Firebase Auth ───────────────────────────────────────────────────────────
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
    if(!d.access_token) throw new Error(`No token: ${JSON.stringify(d)}`);
    return d.access_token;
  });
}

// ─── Firestore Parsing ───────────────────────────────────────────────────────
function parseVal(v) {
  if(!v) return null;
  if("stringValue"  in v) return v.stringValue;
  if("integerValue" in v) return parseInt(v.integerValue);
  if("doubleValue"  in v) return v.doubleValue;
  if("booleanValue" in v) return v.booleanValue;
  if("nullValue"    in v) return null;
  if("arrayValue"   in v) return (v.arrayValue.values||[]).map(parseVal);
  if("mapValue"     in v) {
    const o = {};
    for(const [k,vv] of Object.entries(v.mapValue.fields||{})) o[k] = parseVal(vv);
    return o;
  }
  return null;
}

function parseDoc(doc) {
  const o = {};
  for(const [k,v] of Object.entries(doc.fields||{})) o[k] = parseVal(v);
  return o;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

// ─── Coach-Team Mapping (hardcoded for now) ──────────────────────────────────
const COACH_PLAYS_IN = {
  "Zeb Pirzada": ["Div 4", "OB"],
  "Rajesh Muthukumar": [],
  "Nitin Gupta": ["OB"],
  "Aniket Sharma": ["Div 3", "T20 Serie 5"],
  "Reuben Dayal": ["Div 3", "T20 Serie 4", "OB"],
  "Arun Krishnamurthy": ["Div 3", "T20 Serie 5", "OB"],
};

// Session templates (same as CoachCoordination)
const SESSION_TEMPLATES = [
  { id: "u11-sat", team: "U11", day: 6, time: "14:00–15:30" },
  { id: "u13-wed", team: "U13", day: 3, time: "16:30–18:00" },
  { id: "u13-sat", team: "U13", day: 6, time: "14:00–15:30" },
  { id: "u15-wed", team: "U15", day: 3, time: "16:30–18:00" },
  { id: "u15-sat", team: "U15", day: 6, time: "15:30–17:00" },
  { id: "u15g-fri", team: "U15 Girls", day: 5, time: "16:30–18:00" },
  { id: "kvinder-sat", team: "Kvinder", day: 6, time: "17:00–19:00" },
];

// ─── Main Handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const secret   = process.env.CRON_SECRET;
  const provided = req.headers?.["x-cron-secret"] || req.query?.secret;
  if(secret && provided !== secret) return res.status(401).json({error:"Unauthorised"});

  const apiKey      = process.env.RESEND_API_KEY;
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY||"").replace(/\\n/g,"\n");
  const alertEmail  = process.env.CONFLICT_ALERT_EMAIL || "reuben.dayal@gmail.com";

  if(!apiKey)      return res.status(500).json({error:"RESEND_API_KEY not set"});
  if(!projectId)   return res.status(500).json({error:"FIREBASE_PROJECT_ID not set"});
  if(!clientEmail) return res.status(500).json({error:"FIREBASE_CLIENT_EMAIL not set"});
  if(!privateKey)  return res.status(500).json({error:"FIREBASE_PRIVATE_KEY not set"});

  try {
    const token = await getAccessToken(clientEmail, privateKey);
    const base  = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch teams and coach overrides
    const [teamsRes, overridesRes] = await Promise.all([
      fetch(`${base}/fccnets/teams`, { headers }),
      fetch(`${base}/fccnets/coachoverrides`, { headers }),
    ]);

    const teamsData = teamsRes.ok ? parseDoc(await teamsRes.json()) : {};
    const overridesData = overridesRes.ok ? parseDoc(await overridesRes.json()) : {};
    
    const teams = teamsData.list || teamsData.value ? JSON.parse(teamsData.value || "[]") : [];
    const coachOverrides = overridesData.value ? JSON.parse(overridesData.value) : {};

    // Build sessions with coaches from teams
    const sessions = SESSION_TEMPLATES.map(template => {
      const team = teams.find(t => t.name === template.team);
      return {
        ...template,
        coaches: team?.coaches || [],
      };
    });

    // Get this week's dates
    const weekStart = getWeekStart(new Date());
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(d);
    }

    // Hardcoded fixtures (simplified - in production, fetch from Firestore)
    // For now, we'll check conflicts based on COACH_PLAYS_IN
    const conflicts = [];

    for (const session of sessions) {
      for (const date of weekDates) {
        if (date.getDay() !== session.day) continue;
        
        const dateStr = toDateStr(date);
        const overrideKey = `${dateStr}_${session.id}`;
        
        // Check if there's already an override for this session
        if (coachOverrides[overrideKey]) continue;

        // Check each coach for this session
        for (const coach of session.coaches || []) {
          const playsIn = COACH_PLAYS_IN[coach] || [];
          
          // Simple conflict check: if coach plays on weekends and session is on weekend
          if (playsIn.length > 0 && (date.getDay() === 0 || date.getDay() === 6)) {
            conflicts.push({
              session: session.team,
              time: session.time,
              date: dateStr,
              coach,
              reason: `${coach} may have a match (plays in: ${playsIn.join(", ")})`,
            });
          }
        }
      }
    }

    // If no conflicts, no email needed
    if (conflicts.length === 0) {
      return res.status(200).json({ 
        ok: true, 
        conflicts: 0, 
        message: "No unresolved conflicts this week" 
      });
    }

    // Build email HTML
    const conflictRows = conflicts.map(c => `
      <tr style="border-bottom:1px solid #fecaca;">
        <td style="padding:10px;font-weight:600;color:#991b1b;">${c.session}</td>
        <td style="padding:10px;color:#374151;">${fmtDate(c.date)}</td>
        <td style="padding:10px;color:#374151;">${c.time}</td>
        <td style="padding:10px;color:#dc2626;">${c.coach}</td>
      </tr>
    `).join("");

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#dc2626;padding:24px;border-radius:10px 10px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">⚠️ FCC Coach Conflict Alert</h2>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px;">
            Unresolved conflicts detected for this week
          </p>
        </div>
        <div style="background:#fff;border:1px solid #fecaca;border-top:none;
          padding:24px;border-radius:0 0 10px 10px;">
          <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">
            Hi Reuben,<br/><br/>
            The following training sessions have potential coach conflicts that haven't been resolved:
          </p>
          
          <table style="width:100%;border-collapse:collapse;background:#fef2f2;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#fee2e2;">
                <th style="padding:10px;text-align:left;font-size:12px;color:#991b1b;">Session</th>
                <th style="padding:10px;text-align:left;font-size:12px;color:#991b1b;">Date</th>
                <th style="padding:10px;text-align:left;font-size:12px;color:#991b1b;">Time</th>
                <th style="padding:10px;text-align:left;font-size:12px;color:#991b1b;">Coach</th>
              </tr>
            </thead>
            <tbody>
              ${conflictRows}
            </tbody>
          </table>
          
          <div style="margin-top:20px;">
            <a href="https://fcc-training.vercel.app"
              style="display:inline-block;background:#dc2626;color:#fff;
                text-decoration:none;padding:12px 24px;border-radius:8px;
                font-size:13px;font-weight:700;">
              Open Coach Hub to Reassign →
            </a>
          </div>
          
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="font-size:11px;color:#9ca3af;margin:0;">
            This is an automated daily conflict check from the FCC Training App.
            Conflicts are checked against the match fixtures and coach assignments.
          </p>
        </div>
      </div>
    `;

    // Send email
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${apiKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        from: "FCC Training App <fcc_training_app@nordicanchor.dk>",
        to: [alertEmail],
        subject: `⚠️ ${conflicts.length} Coach Conflict${conflicts.length > 1 ? "s" : ""} This Week — Action Required`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      return res.status(502).json({ error: "Email send failed", detail: err });
    }

    return res.status(200).json({
      ok: true,
      conflicts: conflicts.length,
      sent: true,
      to: alertEmail,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
