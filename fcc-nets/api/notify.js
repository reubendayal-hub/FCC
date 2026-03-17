// Vercel Serverless Function — /api/notify.js
// Sends email notifications to Reuben via Resend when:
//   - A member submits a help message
//   - A join request is submitted
//
// Environment variable required in Vercel dashboard:
//   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxx  (from resend.com)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY not configured" });
  }

  const { type, data } = req.body;

  if (!type || !data) {
    return res.status(400).json({ error: "Missing type or data" });
  }

  let subject, html;

  if (type === "help") {
    // Help message from a member
    const { name, category, message } = data;
    subject = `FCC App — ${category} from ${name}`;
    html = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <div style="background: #1e3a5f; padding: 20px 24px; border-radius: 10px 10px 0 0;">
          <h2 style="color: #fbbf24; margin: 0; font-size: 18px;">🏏 FCC Training App</h2>
          <p style="color: rgba(255,255,255,.6); margin: 4px 0 0; font-size: 13px;">Help message received</p>
        </div>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none;
          padding: 24px; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #6b7280; padding: 6px 0; width: 100px;">From</td>
              <td style="color: #111827; font-weight: 600; padding: 6px 0;">${name}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Category</td>
              <td style="color: #111827; padding: 6px 0;">${category}</td>
            </tr>
          </table>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
            padding: 14px 16px; margin-top: 16px;">
            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.65;
              white-space: pre-wrap;">${message}</p>
          </div>
          <a href="https://fcc-training.vercel.app"
            style="display: inline-block; margin-top: 20px; background: #1e3a5f;
            color: #fbbf24; text-decoration: none; padding: 10px 20px;
            border-radius: 20px; font-size: 13px; font-weight: 700;">
            Open App →
          </a>
        </div>
      </div>
    `;
  } else if (type === "joinrequest") {
    // New join request from a prospective member
    const { name, playerTeam, message: note } = data;
    subject = `FCC App — Join Request from ${name}`;
    html = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <div style="background: #1e3a5f; padding: 20px 24px; border-radius: 10px 10px 0 0;">
          <h2 style="color: #fbbf24; margin: 0; font-size: 18px;">🏏 FCC Training App</h2>
          <p style="color: rgba(255,255,255,.6); margin: 4px 0 0; font-size: 13px;">New join request</p>
        </div>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none;
          padding: 24px; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #6b7280; padding: 6px 0; width: 120px;">Name</td>
              <td style="color: #111827; font-weight: 600; padding: 6px 0;">${name}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Team</td>
              <td style="color: #111827; padding: 6px 0;">${playerTeam || "Not specified"}</td>
            </tr>
            ${note ? `
            <tr>
              <td style="color: #6b7280; padding: 6px 0; vertical-align: top;">Note</td>
              <td style="color: #111827; padding: 6px 0;">${note}</td>
            </tr>` : ""}
          </table>
          <p style="margin: 16px 0 8px; font-size: 13px; color: #6b7280;">
            Review and approve or decline in the Admin Panel:
          </p>
          <a href="https://fcc-training.vercel.app"
            style="display: inline-block; background: #1e3a5f;
            color: #fbbf24; text-decoration: none; padding: 10px 20px;
            border-radius: 20px; font-size: 13px; font-weight: 700;">
            Go to Admin Panel →
          </a>
        </div>
      </div>
    `;
  } else {
    return res.status(400).json({ error: `Unknown notification type: ${type}` });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FCC Training <notifications@fredensborgcricket.dk>",
        to: ["reuben.dayal@gmail.com"],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Resend error:", err);
      return res.status(502).json({ error: "Email send failed", detail: err });
    }

    const result = await response.json();
    return res.status(200).json({ ok: true, id: result.id });

  } catch (err) {
    console.error("Notify function error:", err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
