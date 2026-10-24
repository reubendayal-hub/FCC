// Firebase Admin SDK for /handbook-review. Uses its own named app so it
// never shares state with other routes.
//
// Credentials (existing Vercel env vars, service-account JSON stringified):
//   Production          → FIREBASE_ADMIN_SA_PROD     (fcc-nets)
//   Preview / local dev → FIREBASE_ADMIN_SA_STAGING  (cricops-staging)
// Preview and dev NEVER read the prod service account. As a second guard, a
// non-production deployment refuses any credential for the prod project.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APP_NAME = "handbook-review";

export const COLLECTIONS = {
  reviews: "handbookReview",
  config: "handbookReviewConfig",
  log: "handbookReviewLog",
  // "Did we miss anything?" comments sent anonymously: text + date only,
  // never a review id, member id, name or exact time.
  anon: "handbookReviewAnon",
};

export class NotConfiguredError extends Error {}

const PROD_PROJECT = "fcc-nets";

function serviceAccount() {
  const isProd = process.env.VERCEL_ENV === "production";
  const envName = isProd ? "FIREBASE_ADMIN_SA_PROD" : "FIREBASE_ADMIN_SA_STAGING";
  const raw = process.env[envName];
  if (!raw) throw new NotConfiguredError(`${envName} not configured for this environment`);
  const sa = JSON.parse(raw);
  if (!isProd && sa.project_id === PROD_PROJECT) {
    throw new NotConfiguredError(`${envName} points at the prod project; refusing outside production`);
  }
  return sa;
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
