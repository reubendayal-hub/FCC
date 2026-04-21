// /api/send-reminders.js — uses Node crypto (not crypto.subtle) for JWT signing
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

function getTomorrow() {
  const d = new Date(); d.setDate(d.getDate()+1);
  return d.toISOString().slice(0,10);
}
function fmtDate(s) {
  return new Date(s+"T00:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
}

function buildHtml(name, sessions) {
  const rows = sessions.map(s => {
    const label  = s.label || "Training Session";
    const net    = s.net==="both"?"Both Nets":s.net?`Net ${s.net}`:"";
    const others = (s.players||[]).filter(p=>p!==name);
    return `
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:900;color:#14532d;margin-bottom:8px;">${label}</div>
        <table style="font-size:13px;color:#374151;border-collapse:collapse;width:100%;">
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
        Hi <b>${name.split(" ")[0]}</b>, you're booked in for tomorrow:
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
          ⚠️ <b>Can't make it?</b> It is your responsibility to sign out before 9pm tonight so coaches can plan accordingly and others know.
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
    const token    = await getAccessToken(clientEmail, privateKey);
    const tomorrow = getTomorrow();
    const base     = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const headers  = { Authorization:`Bearer ${token}` };

    const [mRes, sRes] = await Promise.all([
      fetch(`${base}/fccnets/members`,  {headers}),
      fetch(`${base}/fccnets/sessions`, {headers}),
    ]);
    if(!mRes.ok) throw new Error(`Members fetch ${mRes.status}: ${await mRes.text()}`);
    if(!sRes.ok) throw new Error(`Sessions fetch ${sRes.status}: ${await sRes.text()}`);

    // Parse Firestore documents - data is stored as JSON string in .value field
    const mDoc = parseDoc(await mRes.json());
    const sDoc = parseDoc(await sRes.json());
    
    // Parse the JSON strings
    const members  = mDoc.value ? JSON.parse(mDoc.value) : [];
    const allSessions = sDoc.value ? JSON.parse(sDoc.value) : [];
    const sessions = allSessions.filter(s => s.date === tomorrow);

    if(sessions.length===0)
      return res.status(200).json({ok:true, sent:0, message:`No sessions on ${tomorrow}`});

    // Group sessions by player
    const byPlayer = {};
    sessions.forEach(s=>(s.players||[]).forEach(name=>{
      if(!byPlayer[name]) byPlayer[name]=[];
      byPlayer[name].push(s);
    }));

    let sent=0, skipped=0;
    const results=[];

    for(const [name, playerSess] of Object.entries(byPlayer)) {
      const member = members.find(m=>m.name===name);
      if(!member?.email)                         { skipped++; continue; }
      if(!(member.emailDayBeforeReminder??true)) { skipped++; continue; }

      try {
        const r = await fetch("https://api.resend.com/emails",{
          method:"POST",
          headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
          body: JSON.stringify({
            from:    "FCC Training App <fcc_training_app@nordicanchor.dk>",
            to:      [member.email],
            subject: `🏏 Reminder: You're booked in tomorrow — ${fmtDate(tomorrow)}`,
            html:    buildHtml(name, playerSess),
          }),
        });
        if(r.ok){ sent++; results.push({name,status:"sent"}); }
        else { const e=await r.json(); results.push({name,status:"failed",error:e}); }
      } catch(e){ results.push({name,status:"error",error:e.message}); }
    }

    return res.status(200).json({ok:true, date:tomorrow,
      sessions:sessions.length, players:Object.keys(byPlayer).length,
      sent, skipped, results});

  } catch(err) {
    return res.status(500).json({error:err.message});
  }
}
