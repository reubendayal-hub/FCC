// /api/send-reminders.js
// Runs daily at 5pm (via cron-job.org or Vercel cron).
// Finds all sessions tomorrow, emails members who have day-before reminders enabled.
//
// Cron schedule: 0 17 * * *  (every day at 17:00 UTC = 18:00 Danish summer time / 17:00 winter)
// External cron: set up at cron-job.org → URL: https://fcc-training.vercel.app/api/send-reminders
// Secure with CRON_SECRET env var to prevent unauthorised triggers.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initFirebase() {
  if(getApps().length) return getFirestore();
  initializeApp({ credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  (process.env.FIREBASE_PRIVATE_KEY||"").replace(/\\n/g,"\n"),
  })});
  return getFirestore();
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate()+1);
  return d.toISOString().slice(0,10);
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
}

function buildEmailHtml(name, sessions) {
  const sessRows = sessions.map(s=>{
    const label = s.label || "Training Session";
    const net   = s.net==="both" ? "Both Nets" : s.net ? `Net ${s.net}` : "";
    const others = (s.players||[]).filter(p=>p!==name);
    return `
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;
        padding:14px 16px;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:900;color:#14532d;margin-bottom:8px;">
          ${label}
        </div>
        <table style="font-size:13px;color:#374151;border-collapse:collapse;width:100%;">
          <tr><td style="padding:2px 0;color:#6b7280;width:80px;">⏰ Time</td>
              <td style="font-weight:600;">${s.from} – ${s.to}</td></tr>
          ${net?`<tr><td style="padding:2px 0;color:#6b7280;">🎯 Net</td>
              <td style="font-weight:600;">${net}</td></tr>`:""}
          <tr><td style="padding:2px 0;color:#6b7280;">👥 Players</td>
              <td style="font-weight:600;">${s.players.length} booked</td></tr>
        </table>
        ${others.length>0?`
        <div style="margin-top:8px;font-size:12px;color:#6b7280;">
          Also coming: ${others.slice(0,6).map(p=>p.split(" ")[0]).join(", ")}${others.length>6?` +${others.length-6} more`:""}
        </div>`:""}
      </div>`;
  }).join("");

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:#1e3a5f;padding:24px;border-radius:10px 10px 0 0;">
        <h2 style="color:#fbbf24;margin:0;font-size:18px;">🏏 FCC Training App</h2>
        <p style="color:rgba(255,255,255,.55);margin:4px 0 0;font-size:13px;">
          Session reminder — tomorrow
        </p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;
        padding:28px 24px;border-radius:0 0 10px 10px;">
        <p style="font-size:15px;color:#111827;margin:0 0 6px;">
          Hi ${name.split(" ")[0]} 👋
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 18px;">
          Just a reminder — you're booked in for
          <strong>${sessions.length>1?"these sessions":"this session"}</strong>
          tomorrow at Karlebo Cricket Ground.
        </p>
        ${sessRows}
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;
          padding:10px 14px;margin:16px 0;">
          <p style="font-size:12px;color:#92400e;margin:0;line-height:1.6;">
            🔒 Can't make it? Sign out before <strong>9pm tonight</strong> so
            others know and your spot opens up.
          </p>
        </div>
        <a href="https://fcc-training.vercel.app"
          style="display:inline-block;background:#1e3a5f;color:#fbbf24;
            text-decoration:none;padding:10px 22px;border-radius:20px;
            font-size:13px;font-weight:700;">
          Open App →
        </a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
        <p style="font-size:11px;color:#d1d5db;margin:0;">
          To turn off reminders, go to Profile → Notifications in the FCC Training app.
        </p>
      </div>
    </div>`;
}

export default async function handler(req, res) {
  // Security: only allow GET/POST with correct secret
  const secret = process.env.CRON_SECRET;
  const provided = req.headers["x-cron-secret"] || req.query.secret;
  if(secret && provided !== secret) {
    return res.status(401).json({error:"Unauthorised"});
  }

  const apiKey = process.env.RESEND_API_KEY;
  if(!apiKey) return res.status(500).json({error:"RESEND_API_KEY not configured"});

  const db = initFirebase();
  const tomorrow = getTomorrow();

  try {
    // Load members and sessions
    const [membersSnap, sessionsSnap] = await Promise.all([
      db.doc("fccnets/members").get(),
      db.doc("fccnets/sessions").get(),
    ]);

    const members  = membersSnap.data()?.list || [];
    const sessions = (sessionsSnap.data()?.list || []).filter(s=>s.date===tomorrow);

    if(sessions.length===0) {
      return res.status(200).json({ok:true, sent:0, message:"No sessions tomorrow"});
    }

    // Group sessions by player name
    const playerSessions = {};
    sessions.forEach(s=>{
      (s.players||[]).forEach(name=>{
        if(!playerSessions[name]) playerSessions[name]=[];
        playerSessions[name].push(s);
      });
    });

    let sent=0, skipped=0;
    const results = [];

    for(const [name, playerSess] of Object.entries(playerSessions)) {
      const member = members.find(m=>m.name===name);
      if(!member?.email) { skipped++; continue; }
      if(!(member.emailDayBeforeReminder??true)) { skipped++; continue; }

      const html = buildEmailHtml(name, playerSess);
      const sessionNames = playerSess.map(s=>s.label||"Training").join(", ");

      try {
        const r = await fetch("https://api.resend.com/emails", {
          method:"POST",
          headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
          body: JSON.stringify({
            from: "FCC Training <notifications@fredensborgcricket.dk>",
            to: [member.email],
            subject: `🏏 Reminder: You're booked in tomorrow — ${fmtDate(tomorrow)}`,
            html,
          }),
        });
        if(r.ok) { sent++; results.push({name, status:"sent"}); }
        else {
          const err = await r.json();
          results.push({name, status:"failed", error:err});
        }
      } catch(e) {
        results.push({name, status:"error", error:e.message});
      }
    }

    return res.status(200).json({
      ok:true, date:tomorrow, sent, skipped,
      sessions: sessions.length,
      results,
    });

  } catch(err) {
    return res.status(500).json({error:"Firebase error", detail:err.message});
  }
}
