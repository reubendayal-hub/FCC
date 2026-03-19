// /api/send-booking-confirm.js
// Sends a booking confirmation email to a member after they join/book a session

export default async function handler(req, res) {
  if(req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  const apiKey = process.env.RESEND_API_KEY;
  if(!apiKey) return res.status(500).json({error:"RESEND_API_KEY not configured"});

  const { email, name, date, from, to, label, net, players } = req.body;
  if(!email || !name || !date) return res.status(400).json({error:"Missing fields"});

  // Format date nicely
  const d = new Date(date);
  const fmtDate = d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const sessionTitle = label || "Training Session";
  const netLabel = net==="both" ? "Both Nets" : net ? `Net ${net}` : "";
  const otherPlayers = (players||[]).filter(p=>p!==name);

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:#1e3a5f;padding:24px;border-radius:10px 10px 0 0;">
        <h2 style="color:#fbbf24;margin:0;font-size:18px;">🏏 FCC Training App</h2>
        <p style="color:rgba(255,255,255,.55);margin:4px 0 0;font-size:13px;">
          Booking confirmation
        </p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;
        padding:28px 24px;border-radius:0 0 10px 10px;">
        <p style="font-size:15px;color:#111827;margin:0 0 6px;">
          Hi ${name.split(" ")[0]}, you're booked in! ✅
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 20px;">
          Here are the details for your upcoming session.
        </p>

        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;
          padding:16px 18px;margin-bottom:20px;">
          <div style="font-size:17px;font-weight:900;color:#14532d;margin-bottom:10px;">
            ${sessionTitle}
          </div>
          <table style="font-size:13px;color:#374151;width:100%;border-collapse:collapse;">
            <tr><td style="padding:3px 0;color:#6b7280;width:80px;">📅 Date</td>
                <td style="font-weight:600;">${fmtDate}</td></tr>
            <tr><td style="padding:3px 0;color:#6b7280;">⏰ Time</td>
                <td style="font-weight:600;">${from} – ${to}</td></tr>
            ${netLabel?`<tr><td style="padding:3px 0;color:#6b7280;">🎯 Net</td>
                <td style="font-weight:600;">${netLabel}</td></tr>`:""}
            <tr><td style="padding:3px 0;color:#6b7280;">📍 Ground</td>
                <td style="font-weight:600;">Karlebo Cricket Ground</td></tr>
          </table>
        </div>

        ${otherPlayers.length>0?`
        <div style="margin-bottom:20px;">
          <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 8px;">
            Also attending (${otherPlayers.length}):
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${otherPlayers.slice(0,10).map(p=>`
              <span style="background:#f3f4f6;color:#374151;font-size:12px;
                padding:3px 10px;border-radius:20px;font-weight:600;">
                ${p.split(" ")[0]}
              </span>`).join("")}
            ${otherPlayers.length>10?`<span style="font-size:12px;color:#9ca3af;">
              +${otherPlayers.length-10} more</span>`:""}
          </div>
        </div>`:""}

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;
          padding:12px 14px;margin-bottom:20px;">
          <p style="font-size:12px;color:#92400e;margin:0;line-height:1.6;">
            🔒 <strong>Sign-out deadline:</strong> You can remove yourself from this session
            until 9pm the night before. Open the app to manage your booking.
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
          Fredensborg Cricket Club · You're receiving this because you have booking
          confirmations enabled in your profile. To turn off, go to Profile → Notifications.
        </p>
      </div>
    </div>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body: JSON.stringify({
        from: "FCC Training <notifications@fredensborgcricket.dk>",
        to: [email],
        subject: `✅ Booked: ${sessionTitle} on ${fmtDate}`,
        html,
      }),
    });
    if(!r.ok) {
      const err = await r.json();
      return res.status(502).json({error:"Send failed", detail:err});
    }
    return res.status(200).json({ok:true});
  } catch(err) {
    return res.status(500).json({error:"Internal error", detail:err.message});
  }
}
