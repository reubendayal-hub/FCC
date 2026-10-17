// Shared admin-session helpers for the Ministaevne 2026 admin API routes.
// Gate is a single shared secret (mirrors the existing CRON_SECRET pattern
// in this codebase) — not per-user Firebase Auth, since main has no
// server-verified superadmin auth to reuse yet. The secret itself never
// reaches client JS: the client exchanges it once for a short-lived signed
// session token via /api/ministaevne-admin-login.
//
// The mechanism lives in adminSession.js (shared with /handbook-review);
// this module binds it to MINISTAEVNE_ADMIN_SECRET.

import { createAdminSession } from "./adminSession.js";

const session = createAdminSession({ secretEnv: "MINISTAEVNE_ADMIN_SECRET" });

export const signAdminToken = session.signAdminToken;
export const verifyAdminToken = session.verifyAdminToken;
export const requireAdmin = session.requireAdmin;
