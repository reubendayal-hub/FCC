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
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:#1e3a5f;padding:24px;border-radius:10px 10px 0 0;">
        <h2 style="color:#fbbf24;margin:0;font-size:18px;">🏏 FCC Training App</h2>
        <p style="color:rgba(255,255,255,.55);margin:4px 0 0;font-size:13px;">Session reminder — tomorrow</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 10px 10px;">
        <p style="font-size:15px;color:#111827;margin:0 0 6px;">Hi ${name.split(" ")[0]} 👋</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 18px;">
          Just a reminder — you're booked in for
          <strong>${sessions.length>1?"these sessions":"this session"}</strong>
          tomorrow at Karlebo Cricket Ground.
        </p>
        ${rows}
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin:16px 0;">
          <p style="font-size:12px;color:#92400e;margin:0;line-height:1.6;">
            🔒 Can't make it? Sign out before <strong>9pm tonight</strong> so others know.
          </p>
        </div>
        <a href="https://fcc-training.vercel.app"
          style="display:inline-block;background:#1e3a5f;color:#fbbf24;text-decoration:none;
            padding:10px 22px;border-radius:20px;font-size:13px;font-weight:700;">
          Open App →
        </a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
        <p style="font-size:11px;color:#d1d5db;margin:0;">
          To turn off reminders go to Profile → Notifications in the FCC Training app.
        </p>
      </div>
    </div>`;
}

export default async function handler(req, res) {
  const secret   = process.env.CRON_SECRET;
  const provided = req.headers?.["x-cron-secret"] || req.query?.secret;
  if(secret && provided !== secret) return res.status(401).json({error:"Unauthorised"});

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

    const members  = parseDoc(await mRes.json()).list  || [];
    const sessions = (parseDoc(await sRes.json()).list || []).filter(s=>s.date===tomorrow);

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
