// Shared-secret admin sessions (interim admin auth used by /ministaevne and
// /handbook-review). The secret lives only in a Vercel env var; the client
// exchanges it once for a short-lived HMAC-signed token and sends that as
// `Authorization: Bearer <token>`. Each page uses its own secret env var.

import crypto from "node:crypto";

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

export function createAdminSession({ secretEnv, ttlMs = DEFAULT_TTL_MS }) {
  const hmac = (payload) =>
    crypto.createHmac("sha256", process.env[secretEnv] || "").update(payload).digest();

  function signAdminToken() {
    const payloadB64 = b64url(JSON.stringify({ exp: Date.now() + ttlMs }));
    return `${payloadB64}.${b64url(hmac(payloadB64))}`;
  }

  function verifyAdminToken(token) {
    if (!process.env[secretEnv]) return false;
    if (!token || typeof token !== "string" || !token.includes(".")) return false;
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(b64url(hmac(payloadB64)));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    try {
      const { exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
      return typeof exp === "number" && Date.now() < exp;
    } catch {
      return false;
    }
  }

  function requireAdmin(req, res) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!verifyAdminToken(token)) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
    return true;
  }

  // Constant-time password check against the secret.
  function checkPassword(password) {
    const secret = process.env[secretEnv];
    if (!secret || typeof password !== "string") return false;
    const a = crypto.createHash("sha256").update(password).digest();
    const b = crypto.createHash("sha256").update(secret).digest();
    return crypto.timingSafeEqual(a, b);
  }

  return { signAdminToken, verifyAdminToken, requireAdmin, checkPassword };
}
