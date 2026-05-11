// /api/send-duty-confirm.js
// Sends a confirmation email when a parent is assigned (or self-volunteers)
// as the support parent for an FCC U11 session.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

  const { email, name, date, from, to, label } = req.body || {};
  if (!email || !name || !date) return res.status(400).json({ error: "Missing fields" });

  const d = new Date(date + "T00:00:00");
  const fmtDate = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const sessionTitle = label || "U11 training session";
  const firstName = name.split(" ")[0];

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      max-width:480px;margin:0 auto;background:#f1f5f9;padding:24px;">
      <div style="background:#d4a217;padding:22px;border-radius:14px 14px 0 0;text-align:center;">
        <div style="font-size:28px;margin-bottom:6px;">🙋</div>
        <div style="font-size:20px;font-weight:900;color:#fff;">You're on Support Duty</div>
        <div style="font-size:13px;color:#fef9c3;">Fredensborg CC — U11s thank you!</div>
      </div>
      <div style="background:#fff;padding:24px;border-radius:0 0 14px 14px;">
        <p style="font-size:15px;color:#334155;margin:0 0 18px;">
          Hi <b>${firstName}</b>, you're signed up as <b>support parent</b> for:
        </p>
        <div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;
          padding:14px 16px;margin-bottom:18px;">
          <div style="font-size:16px;font-weight:900;color:#92400e;margin-bottom:8px;">
            ${sessionTitle}
          </div>
          <table style="font-size:13px;color:#374151;width:100%;border-collapse:collapse;">
            <tr><td style="padding:3px 0;color:#6b7280;width:80px;">📅 Date</td>
                <td style="font-weight:600;">${fmtDate}</td></tr>
            <tr><td style="padding:3px 0;color:#6b7280;">⏰ Time</td>
                <td style="font-weight:600;">${from} – ${to}</td></tr>
            <tr><td style="padding:3px 0;color:#6b7280;">📍 Ground</td>
                <td style="font-weight:600;">Karlebo Cricket Ground</td></tr>
          </table>
        </div>

        <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;
          padding:12px 14px;margin-bottom:18px;">
          <div style="font-size:13px;font-weight:800;color:#1e3a5f;margin-bottom:6px;">
            What the role involves
          </div>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:#1e3a5f;line-height:1.7;">
            <li><b>Equipment</b> — help set up / pack down nets, balls, cones.</li>
            <li><b>Safety</b> — an extra adult eye on the kids; first-aid if needed.</li>
            <li><b>Energy</b> — water, snacks, encouragement.</li>
          </ul>
          <div style="font-size:11px;color:#1e3a5f;margin-top:8px;font-style:italic;">
            Not a coaching role — coaches handle the cricket.
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

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "FCC Training App <fcc_training_app@nordicanchor.dk>",
        to: [email],
        subject: `🙋 You're on support duty — ${fmtDate}`,
        html,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return res.status(500).json({ error: "Resend failed", detail: err });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
