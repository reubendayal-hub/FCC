// Basic in-memory, per-IP fixed-window rate limiter.
// Not bulletproof (resets on cold start, not shared across instances) —
// deliberately, per spec: just enough to stop flood spam on a low-traffic
// one-off registration form, not a hardened defense.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

const hits = new Map(); // ip -> timestamp[]

function getIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function checkRateLimit(req) {
  const ip = getIp(req);
  const now = Date.now();
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(ip, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(ip, timestamps);
  return true;
}
