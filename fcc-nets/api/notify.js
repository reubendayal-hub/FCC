// Vercel Serverless Function — /api/notify.js
// Sends email notifications via Resend for:
//   - "help"          → member help message → emails Reuben
//   - "joinrequest"   → new join request    → emails Reuben
//   - "approved"      → request approved    → emails the new member
//   - "declined"      → request declined    → emails the new member
//   - "duty-assigned" → admin-assigned duty → emails the parent
//
// Environment variable required in Vercel dashboard:
//   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxx  (from resend.com)

const FROM = "FCC Training App <fcc_training_app@nordicanchor.dk>";
const ADMIN_EMAIL = "reuben.dayal@gmail.com";
const APP_URL = "https://fcc-training.vercel.app";

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
      <p style="font-size:11px;color:#d1d5db;margin:0;line-height:1.6;">
        Fredensborg Cricket Club · fredensborgcricket.dk<br/>
        This email was sent from an automated system. Please do not reply.
      </p>
    </div>
  </div>`;

export default async function handler(req, res) {
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

  let subject, html, to;

  // ── Help message from a member → email Reuben ────────────────
  if (type === "help") {
    const { name, category, message } = data;
    to = [ADMIN_EMAIL];
    subject = `FCC App — ${category} from ${name}`;
    html = wrapHtml("Help message received", `
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="color:#6b7280;padding:6px 0;width:100px;">From</td>
          <td style="color:#111827;font-weight:600;padding:6px 0;">${name}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;padding:6px 0;">Category</td>
          <td style="color:#111827;padding:6px 0;">${category}</td>
        </tr>
      </table>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
        padding:14px 16px;margin-top:16px;">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.65;
          white-space:pre-wrap;">${message}</p>
      </div>
      <a href="${APP_URL}"
        style="display:inline-block;margin-top:20px;background:#1e3a5f;
        color:#fbbf24;text-decoration:none;padding:10px 20px;
        border-radius:20px;font-size:13px;font-weight:700;">
        Open App →
      </a>`);

  // ── New join request → email Reuben ──────────────────────────
  } else if (type === "joinrequest") {
    const { name, playerTeam, message: note } = data;
    to = [ADMIN_EMAIL];
    subject = `FCC App — Join Request from ${name}`;
    html = wrapHtml("New join request", `
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="color:#6b7280;padding:6px 0;width:120px;">Name</td>
          <td style="color:#111827;font-weight:600;padding:6px 0;">${name}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;padding:6px 0;">Team</td>
          <td style="color:#111827;padding:6px 0;">${playerTeam || "Not specified"}</td>
        </tr>
        ${note ? `
        <tr>
          <td style="color:#6b7280;padding:6px 0;vertical-align:top;">Note</td>
          <td style="color:#111827;padding:6px 0;">${note}</td>
        </tr>` : ""}
      </table>
      <p style="margin:16px 0 8px;font-size:13px;color:#6b7280;">
        Review and approve or decline in the Admin Panel:
      </p>
      <a href="${APP_URL}"
        style="display:inline-block;background:#1e3a5f;
        color:#fbbf24;text-decoration:none;padding:10px 20px;
        border-radius:20px;font-size:13px;font-weight:700;">
        Go to Admin Panel →
      </a>`);

  // ── Request approved → email the new member ───────────────────
  } else if (type === "approved") {
    const { name, email, playerTeam } = data;
    if (!email) return res.status(400).json({ error: "Missing member email for approval notification" });
    const firstName = name.split(" ")[0];
    to = [email];
    subject = `You're in! Welcome to Fredensborg CC 🏏`;
    html = wrapHtml("Your account has been approved", `
      <p style="font-size:15px;color:#111827;margin:0 0 12px;">
        Hi ${firstName},
      </p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">
        Great news — your request to join <strong>Fredensborg Cricket Club</strong>
        has been approved${playerTeam ? ` for <strong>${playerTeam}</strong>` : ""}!
        You can now log in to the training app.
      </p>
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;
        padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#14532d;">
          Here's how to get started:
        </p>
        <ol style="margin:0;padding-left:18px;font-size:13px;color:#166534;line-height:2;">
          <li>Open the app: <a href="${APP_URL}" style="color:#15803d;">${APP_URL}</a></li>
          <li>Type your name in the search box and tap it</li>
          <li>Verify your identity and set your 4-digit PIN</li>
          <li>You're in! Mark your availability before each session</li>
        </ol>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px;line-height:1.6;">
        Remember to mark yourself <strong>Available / Unavailable / Maybe</strong>
        by <strong>9 pm the evening before</strong> each session so coaches can plan.
      </p>
      <a href="${APP_URL}"
        style="display:inline-block;background:#15803d;
        color:#fff;text-decoration:none;padding:12px 24px;
        border-radius:20px;font-size:14px;font-weight:700;">
        Open the App →
      </a>`);

  // ── Admin assigned a duty → email the parent ────────────────
  } else if (type === "duty-assigned") {
    const { to: recipient, subject: subj, body: messageBody, parentName } = data;
    if (!recipient) return res.status(400).json({ error: "Missing recipient email for duty assignment" });
    to = [recipient];
    subject = subj || `Duty assignment for ${parentName || "you"}`;
    const safeBody = String(messageBody || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");
    html = wrapHtml("Duty assignment", `
      <p style="font-size:14px;line-height:1.65;color:#1e3a5f;margin:0 0 16px;">
        ${safeBody}
      </p>
      <a href="${APP_URL}"
        style="display:inline-block;background:#1e3a5f;
        color:#fbbf24;text-decoration:none;padding:10px 20px;
        border-radius:20px;font-size:13px;font-weight:700;">
        Open the App →
      </a>`);

  // ── Request declined → email the member ──────────────────────
  } else if (type === "declined") {
    const { name, email } = data;
    if (!email) return res.status(400).json({ error: "Missing member email for decline notification" });
    const firstName = name.split(" ")[0];
    to = [email];
    subject = `Your FCC app request — update`;
    html = wrapHtml("Request update", `
      <p style="font-size:15px;color:#111827;margin:0 0 12px;">
        Hi ${firstName},
      </p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">
        Unfortunately we weren't able to approve your request to join the
        Fredensborg Cricket Club training app at this time.
      </p>
      <p style="font-size:14px;color:#374151;margin:0 0 20px;line-height:1.6;">
        This may be because we couldn't match your details to our membership records.
        If you think this is a mistake, please get in touch with your coach or
        contact us at
        <a href="https://fredensborgcricket.dk" style="color:#1e3a5f;">fredensborgcricket.dk</a>.
      </p>`);

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
      body: JSON.stringify({ from: FROM, to, subject, html }),
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
