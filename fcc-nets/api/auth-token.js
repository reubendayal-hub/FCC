// Vercel Serverless Function — /api/auth-token
// Verifies a member's PIN server-side and returns a Firebase custom token.
// STAGING ONLY — uses FIREBASE_ADMIN_SA_STAGING credentials.
//
// Required env vars (Vercel Preview environment):
//   FIREBASE_ADMIN_SA_STAGING  — full JSON of the staging service-account key
//   ALLOW_EMERGENCY_PIN        — "true" to allow PIN "0000" as universal bypass
//   STAGING_ORIGIN             — (optional) allowed CORS origin

import admin from "firebase-admin";

// Path constants — change PINS_PATH here when Stage 2 migrates to club-scoped paths.
const PINS_PATH    = "fccnets/pins";
const MEMBERS_PATH = "fccnets/members";
const CLUB_ID      = "fredensborg";

// djb2 — must stay identical to src/utils/crypto.js hashPin.
function hashPin(pin) {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) + h) + pin.charCodeAt(i);
  }
  return String(h >>> 0);
}

function initAdmin() {
  if (admin.apps.length > 0) return;
  const saJson = process.env.FIREBASE_ADMIN_SA_STAGING;
  if (!saJson) throw new Error("FIREBASE_ADMIN_SA_STAGING not configured");
  const sa = JSON.parse(saJson);
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

export default async function handler(req, res) {
  const origin = process.env.STAGING_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { memberId, pin } = req.body || {};
  if (!memberId || typeof pin !== "string") {
    return res.status(400).json({ error: "Missing memberId or pin" });
  }

  try {
    initAdmin();
    const db = admin.firestore();

    const [pinsSnap, membersSnap] = await Promise.all([
      db.doc(PINS_PATH).get(),
      db.doc(MEMBERS_PATH).get(),
    ]);

    if (!pinsSnap.exists) {
      console.error("auth-token: pins document not found");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const pinsData   = JSON.parse(pinsSnap.data().value || "{}");
    const storedHash = pinsData[memberId];

    const allowEmergency = process.env.ALLOW_EMERGENCY_PIN === "true";
    const isEmergency    = allowEmergency && pin === "0000";

    if (!isEmergency) {
      if (!storedHash || hashPin(pin) !== storedHash) {
        return res.status(401).json({ error: "invalid credentials" });
      }
    }

    let role = "member";
    if (membersSnap.exists) {
      const members = JSON.parse(membersSnap.data().value || "[]");
      const member  = members.find(m => m.id === memberId);
      if (member?.role) role = member.role;
    }

    const token = await admin.auth().createCustomToken(memberId, { clubId: CLUB_ID, role });
    return res.status(200).json({ token });

  } catch (err) {
    console.error("auth-token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
