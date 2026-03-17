// /api/send-verify.js
// Sends a 6-digit verification code to an email address
// Called during self-service onboarding/verification flow
// Stores code temporarily in Firebase with 15-min expiry

export default async function handler(req, res) {
  if(req.method !== "POST") return res.status(405).json({error:"Method not allowed"});

  const apiKey = process.env.RESEND_API_KEY;
  if(!apiKey) return res.status(500).json({error:"RESEND_API_KEY not configured"});

  const { email, name, code } = req.body;
  if(!email || !name || !code) return res.status(400).json({error:"Missing fields"});

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:#1e3a5f;padding:24px;border-radius:10px 10px 0 0;">
        <h2 style="color:#fbbf24;margin:0;font-size:18px;">🏏 FCC Training App</h2>
        <p style="color:rgba(255,255,255,.55);margin:4px 0 0;font-size:13px;">
          Email verification
        </p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;
        padding:28px 24px;border-radius:0 0 10px 10px;">
        <p style="font-size:15px;color:#111827;margin:0 0 8px;">
          Hi ${name.split(" ")[0]},
        </p>
        <p style="font-size:14px;color:#374151;margin:0 0 24px;line-height:1.6;">
          Use the code below to verify your email address for the
          Fredensborg Cricket Club training app.
          This code expires in <strong>15 minutes</strong>.
        </p>
        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;
          padding:20px;text-align:center;margin-bottom:24px;">
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#14532d;
            font-family:monospace;">
            ${code}
          </div>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
          If you didn't request this, you can ignore this email.
          Your account will not be changed unless you enter this code.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
        <p style="font-size:11px;color:#d1d5db;margin:0;">
          Fredensborg Cricket Club · fredensborgcricket.dk<br/>
          This email was sent from an automated system. Please do not reply.
        </p>
      </div>
    </div>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body: JSON.stringify({
        from: "FCC Training <onboarding@resend.dev>",
        to: [email],
        subject: `Your FCC verification code: ${code}`,
        html,
      }),
    });
    if(!r.ok) {
      const err = await r.json();
      return res.status(502).json({error:"Send failed", detail: err});
    }
    return res.status(200).json({ok:true});
  } catch(err) {
    return res.status(500).json({error:"Internal error", detail: err.message});
  }
}
