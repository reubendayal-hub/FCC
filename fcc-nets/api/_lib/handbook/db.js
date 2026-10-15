// Firebase Admin SDK for /handbook-review. Uses its own named app so it
// never shares state with other routes.
//
// Credentials (D2):
//   HANDBOOK_FIREBASE_SA   service-account JSON (stringified).
//                          Vercel Preview → cricops-staging, Production → fcc-nets.
//   FIREBASE_ADMIN_SA_PROD fallback, PRODUCTION ONLY. Preview/dev never fall back
//                          to prod: without HANDBOOK_FIREBASE_SA they fail cleanly.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APP_NAME = "handbook-review";

export const COLLECTIONS = {
  reviews: "handbookReview",
  config: "handbookReviewConfig",
  log: "handbookReviewLog",
};

export class NotConfiguredError extends Error {}

function serviceAccount() {
  const raw = process.env.HANDBOOK_FIREBASE_SA
    || (process.env.VERCEL_ENV === "production" ? process.env.FIREBASE_ADMIN_SA_PROD : "");
  if (!raw) throw new NotConfiguredError("HANDBOOK_FIREBASE_SA not configured for this environment");
  return JSON.parse(raw);
}

export function getDb() {
  // Local dev harness only (scripts/handbook-dev). Never honoured on Vercel.
  if (globalThis.__HANDBOOK_FAKE_DB__ && !process.env.VERCEL) return globalThis.__HANDBOOK_FAKE_DB__;
  const existing = getApps().find((a) => a.name === APP_NAME);
  const app = existing || initializeApp({ credential: cert(serviceAccount()) }, APP_NAME);
  return getFirestore(app);
}

// Which Firebase project this deployment writes to (shown on the admin dashboard).
export function projectId() {
  if (globalThis.__HANDBOOK_FAKE_DB__ && !process.env.VERCEL) return "local in-memory (dev)";
  try { return serviceAccount().project_id || "unknown"; } catch { return "not configured"; }
}
