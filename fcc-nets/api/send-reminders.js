// /api/send-reminders.js — Sends reminders 48hrs AND 24hrs before sessions
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
    if(!d.access_token) throw new Error(`No token: ${JSON.stringify(d)}`);
    return d.access_token;
  });
}

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

function getDatePlusDays(days) {
  const d = new Date(); 
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

function fmtDate(s) {
  return new Date(s+"T00:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
}

function fmtDateShort(s) {
  return new Date(s+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
}

// 48-hour reminder email (sent 2 days before)
function buildHtml48hr(name, sessions, targetDate) {
  const sessionDateStr = fmtDate(targetDate);
  
  // Deadline is day before session at 9pm
  const sessionDate = new Date(targetDate + "T00:00:00");
  const deadlineDate = new Date(sessionDate);
  deadlineDate.setDate(deadlineDate.getDate() - 1);
  const deadlineStr = deadlineDate.toLocaleDateString("en-GB", {weekday:"long", day:"numeric", month:"long"});
  
  const rows = sessions.map(s => {
    const label  = s.label || "Training Session";
    const net    = s.net==="both"?"Both Nets":s.net?`Net ${s.net}`:"";
    const others = (s.players||[]).filter(p=>p!==name);
    return `
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:900;color:#14532d;margin-bottom:8px;">${label}</div>
        <table style="font-size:13px;color:#374151;border-collapse:collapse;width:100%;">
          <tr><td style="padding:2px 0;color:#6b7280;width:80px;">📅 Date</td>
              <td style="font-weight:600;">${sessionDateStr}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;width:80px;">⏰ Time</td>
              <td style="font-weight:600;">${s.from} – ${s.to}</td></tr>
          ${net?`<tr><td style="padding:2px 0;color:#6b7280;">🎯 Net</td>
              <td style="font-weight:600;">${net}</td></tr>`:""}
          <tr><td style="padding:2px 0;color:#6b7280;">👥 Players</td>
              <td style="font-weight:600;">${(s.players||[]).length} booked</td></tr>
        </table>
        ${others.length>0?`<div style="margin-top:8px;font-size:12px;color:#6b7280;">
          Also coming: ${others.slice(0,6).map(p=>p.split(" ")[0]).join(", ")}${others.length>6?` +${others.length-6} more`:""}
        </div>`:""}
      </div>`;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#f1f5f9;padding:24px;">
  <div style="max-width:480px;margin:0 auto;">
    <div style="background:#0f172a;color:#fff;padding:20px;border-radius:14px 14px 0 0;text-align:center;">
      <div style="font-size:28px;margin-bottom:6px;">🏏</div>
      <div style="font-size:20px;font-weight:900;">Training Reminder</div>
      <div style="font-size:13px;color:#94a3b8;">Fredensborg Cricket Club</div>
    </div>
    <div style="background:#fff;padding:20px;border-radius:0 0 14px 14px;">
      <div style="font-size:15px;color:#334155;margin-bottom:16px;">
        Hi <b>${name.split(" ")[0]}</b>, you're booked in for <b>${sessionDateStr}</b>:
      </div>
      ${rows}
      
      <!-- Blue info box: signed in by default -->
      <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:10px;padding:12px 14px;margin-bottom:12px;">
        <div style="font-size:13px;color:#1e40af;line-height:1.5;">
          ✅ <b>You are signed in by default</b> — The coaches, captain, and team members expect you to attend.
        </div>
      </div>
      
      <!-- Amber warning box -->
      <div style="background:#fef3c7;border:1.5px solid #fbbf24;border-radius:10px;padding:12px 14px;">
        <div style="font-size:13px;color:#92400e;line-height:1.5;">
          ⚠️ <b>Can't make it?</b> Please sign out by <b>${deadlineStr} at 9pm</b> so coaches can plan accordingly.
        </div>
      </div>
      
      <div style="margin-top:20px;text-align:center;">
        <a href="https://fcc-training.vercel.app"
          style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;
            padding:12px 28px;border-radius:99px;font-weight:700;font-size:14px;">
          Open FCC Training App
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8;">
      Fredensborg Cricket Club · Benediktevej 15 · 3480 Fredensborg
    </div>
  </div>
</body>
</html>`;
}

// 24-hour reminder email (sent day before) - more urgent tone
function buildHtml24hr(name, sessions, targetDate) {
  const sessionDateStr = fmtDate(targetDate);
  
  const rows = sessions.map(s => {
    const label  = s.label || "Training Session";
    const net    = s.net==="both"?"Both Nets":s.net?`Net ${s.net}`:"";
    const others = (s.players||[]).filter(p=>p!==name);
    return `
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:900;color:#14532d;margin-bottom:8px;">${label}</div>
        <table style="font-size:13px;color:#374151;border-collapse:collapse;width:100%;">
          <tr><td style="padding:2px 0;color:#6b7280;width:80px;">📅 Date</td>
              <td style="font-weight:600;">${sessionDateStr}</td></tr>
          <tr><td style="padding:2px 0;color:#6b7280;width:80px;">⏰ Time</td>
              <td style="font-weight:600;">${s.from} – ${s.to}</td></tr>
          ${net?`<tr><td style="padding:2px 0;color:#6b7280;">🎯 Net</td>
              <td style="font-weight:600;">${net}</td></tr>`:""}
          <tr><td style="padding:2px 0;color:#6b7280;">👥 Players</td>
              <td style="font-weight:600;">${(s.players||[]).length} booked</td></tr>
        </table>
        ${others.length>0?`<div style="margin-top:8px;font-size:12px;color:#6b7280;">
          Also coming: ${others.slice(0,6).map(p=>p.split(" ")[0]).join(", ")}${others.length>6?` +${others.length-6} more`:""}
        </div>`:""}
      </div>`;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#f1f5f9;padding:24px;">
  <div style="max-width:480px;margin:0 auto;">
    <div style="background:#b91c1c;color:#fff;padding:20px;border-radius:14px 14px 0 0;text-align:center;">
      <div style="font-size:28px;margin-bottom:6px;">🏏</div>
      <div style="font-size:20px;font-weight:900;">TOMORROW!</div>
      <div style="font-size:13px;color:#fecaca;">Final Reminder · Fredensborg CC</div>
    </div>
    <div style="background:#fff;padding:20px;border-radius:0 0 14px 14px;">
      <div style="font-size:15px;color:#334155;margin-bottom:16px;">
        Hi <b>${name.split(" ")[0]}</b>, just a reminder — you're booked in for <b>tomorrow</b>:
      </div>
      ${rows}
      
      <!-- Blue info box: signed in by default -->
      <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:10px;padding:12px 14px;margin-bottom:12px;">
        <div style="font-size:13px;color:#1e40af;line-height:1.5;">
          ✅ <b>You are signed in by default</b> — We're expecting you!
        </div>
      </div>
      
      <!-- Red urgent warning box -->
      <div style="background:#fef2f2;border:1.5px solid #f87171;border-radius:10px;padding:12px 14px;">
        <div style="font-size:13px;color:#991b1b;line-height:1.5;">
          🚨 <b>Can't make it? Sign out NOW!</b> Deadline is <b>9pm tonight</b>. Don't leave your teammates hanging!
        </div>
      </div>
      
      <div style="margin-top:20px;text-align:center;">
        <a href="https://fcc-training.vercel.app"
          style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;
            padding:12px 28px;border-radius:99px;font-weight:700;font-size:14px;">
          Open App — Sign Out Now
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8;">
      Fredensborg Cricket Club · Benediktevej 15 · 3480 Fredensborg
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  // Check cron secret
  const secret = req.query.secret || req.headers["x-cron-secret"];
  if(secret !== process.env.CRON_SECRET)
    return res.status(401).json({error:"Unauthorized"});

  const apiKey      = process.env.RESEND_API_KEY;
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY||"").replace(/\\n/g,"\n");

  if(!apiKey)      return res.status(500).json({error:"RESEND_API_KEY not set"});
  if(!projectId)   return res.status(500).json({error:"FIREBASE_PROJECT_ID not set"});
  if(!clientEmail) return res.status(500).json({error:"FIREBASE_CLIENT_EMAIL not set"});
  if(!privateKey)  return res.status(500).json({error:"FIREBASE_PRIVATE_KEY not set"});

  try {
    const token = await getAccessToken(clientEmail, privateKey);
    const base  = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const headers = { Authorization:`Bearer ${token}` };

    const [mRes, sRes] = await Promise.all([
      fetch(`${base}/fccnets/members`,  {headers}),
      fetch(`${base}/fccnets/sessions`, {headers}),
    ]);
    if(!mRes.ok) throw new Error(`Members fetch ${mRes.status}: ${await mRes.text()}`);
    if(!sRes.ok) throw new Error(`Sessions fetch ${sRes.status}: ${await sRes.text()}`);

    // Parse Firestore documents
    const mDoc = parseDoc(await mRes.json());
    const sDoc = parseDoc(await sRes.json());
    const members = mDoc.value ? JSON.parse(mDoc.value) : [];
    const allSessions = sDoc.value ? JSON.parse(sDoc.value) : [];

    // Allow ?date=YYYY-MM-DD for testing a specific date, otherwise send for both +1 and +2 days
    const testDate = req.query.date;
    
    // Determine which dates to send reminders for
    let remindersToSend = [];
    if (testDate) {
      // Testing mode: just send for the specified date (as 24hr reminder)
      remindersToSend = [{ date: testDate, type: "24hr" }];
    } else {
      // Normal mode: send 48hr reminder for day+2, 24hr reminder for day+1
      remindersToSend = [
        { date: getDatePlusDays(2), type: "48hr" },
        { date: getDatePlusDays(1), type: "24hr" },
      ];
    }

    let totalSent = 0, totalSkipped = 0;
    const allResults = [];
    
    // Helper to add delay between emails (Resend allows 5/sec, we do 3/sec to be safe)
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const reminder of remindersToSend) {
      const sessions = allSessions.filter(s => s.date === reminder.date);
      
      if (sessions.length === 0) {
        allResults.push({ date: reminder.date, type: reminder.type, sent: 0, message: "No sessions" });
        continue;
      }

      // Group sessions by player
      const byPlayer = {};
      sessions.forEach(s => (s.players || []).forEach(name => {
        if (!byPlayer[name]) byPlayer[name] = [];
        byPlayer[name].push(s);
      }));

      let sent = 0, skipped = 0;
      const results = [];

      for (const [name, playerSess] of Object.entries(byPlayer)) {
        const member = members.find(m => m.name === name);
        if (!member?.email)                          { skipped++; continue; }
        if (!(member.emailDayBeforeReminder ?? true)) { skipped++; continue; }

        // Choose template and subject based on reminder type
        const is24hr = reminder.type === "24hr";
        const subject = is24hr
          ? `🚨 TOMORROW: You're booked in — ${fmtDateShort(reminder.date)}`
          : `🏏 Reminder: You're booked in ${fmtDateShort(reminder.date)}`;
        const html = is24hr
          ? buildHtml24hr(name, playerSess, reminder.date)
          : buildHtml48hr(name, playerSess, reminder.date);

        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "FCC Training App <fcc_training_app@nordicanchor.dk>",
              to: [member.email],
              subject,
              html,
            }),
          });
          if (r.ok) { sent++; results.push({ name, status: "sent", type: reminder.type }); }
          else { const e = await r.json(); results.push({ name, status: "failed", error: e }); }
        } catch (e) { results.push({ name, status: "error", error: e.message }); }

        // Delay 350ms between emails to stay under Resend's 5/sec rate limit
        await delay(350);
      }

      totalSent += sent;
      totalSkipped += skipped;
      allResults.push({
        date: reminder.date,
        type: reminder.type,
        sessions: sessions.length,
        players: Object.keys(byPlayer).length,
        sent,
        skipped,
        results,
      });
    }

    return res.status(200).json({
      ok: true,
      totalSent,
      totalSkipped,
      reminders: allResults,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
