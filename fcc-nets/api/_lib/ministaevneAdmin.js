// Shared Firebase Admin SDK helpers for the Ministaevne 2026 API routes.
// Isolated top-level Firestore doc structure — does NOT reuse fccnets/* or
// clubs/{id}/data/* since this is a one-off event.
//
// Requires FIREBASE_ADMIN_SA_PROD in Vercel env (prod fcc-nets service
// account JSON, stringified).

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const REGISTRATIONS_PATH = "ministaevne2026/registrations";

// Native ESM (this project runs "type": "module") does not expose the
// classic admin.apps/admin.app()/admin.firestore() namespace that only
// works under CommonJS require() — use the modular API instead.
function initAdmin() {
  if (getApps().length > 0) return getApps()[0];
  const raw = process.env.FIREBASE_ADMIN_SA_PROD;
  if (!raw) throw new Error("FIREBASE_ADMIN_SA_PROD not configured");
  const sa = JSON.parse(raw);
  return initializeApp({ credential: cert(sa) });
}

export function getDb() {
  const app = initAdmin();
  return getFirestore(app);
}

export async function getRegistrations(db) {
  const snap = await db.doc(REGISTRATIONS_PATH).get();
  if (!snap.exists) return [];
  try {
    return JSON.parse(snap.data().value || "[]");
  } catch {
    return [];
  }
}

export async function saveRegistrations(db, list) {
  await db.doc(REGISTRATIONS_PATH).set({ value: JSON.stringify(list) });
}
