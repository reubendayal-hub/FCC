// Shared admin-session helpers for the Ministaevne 2026 admin API routes.
// Gate is a single shared secret (mirrors the existing CRON_SECRET pattern
// in this codebase) — not per-user Firebase Auth, since main has no
// server-verified superadmin auth to reuse yet. The secret itself never
// reaches client JS: the client exchanges it once for a short-lived signed
// session token via /api/ministaevne-admin-login.

import crypto from "node:crypto";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function hmac(payload) {
  const secret = process.env.MINISTAEVNE_ADMIN_SECRET || "";
  return crypto.createHmac("sha256", secret).update(payload).digest();
}

export function signAdminToken() {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = b64url(payload);
  const sig = b64url(hmac(payloadB64));
  return `${payloadB64}.${sig}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;
  const expectedSig = b64url(hmac(payloadB64));
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}

export function requireAdmin(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}
