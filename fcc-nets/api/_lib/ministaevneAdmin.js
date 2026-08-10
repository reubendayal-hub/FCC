// Shared Firebase Admin SDK helpers for the Ministaevne 2026 API routes.
// Isolated top-level Firestore doc structure — does NOT reuse fccnets/* or
// clubs/{id}/data/* since this is a one-off event.
//
// Requires FIREBASE_ADMIN_SA_PROD in Vercel env (prod fcc-nets service
// account JSON, stringified).

import admin from "firebase-admin";

const REGISTRATIONS_PATH = "ministaevne2026/registrations";

function initAdmin() {
  if (admin.apps.length > 0) return admin.app();
  const raw = process.env.FIREBASE_ADMIN_SA_PROD;
  if (!raw) throw new Error("FIREBASE_ADMIN_SA_PROD not configured");
  const sa = JSON.parse(raw);
  return admin.initializeApp({ credential: admin.credential.cert(sa) });
}

export function getDb() {
  initAdmin();
  return admin.firestore();
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
