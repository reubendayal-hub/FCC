// POST /api/ministaevne-admin-login — exchange the shared admin secret for
// a short-lived signed session token. The secret itself never reaches
// client JS beyond this one request; only the token is stored client-side.

import { signAdminToken } from "./_lib/ministaevneAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.MINISTAEVNE_ADMIN_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "MINISTAEVNE_ADMIN_SECRET not configured" });
  }

  const { password } = req.body || {};
  if (password !== secret) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  return res.status(200).json({ token: signAdminToken() });
}
