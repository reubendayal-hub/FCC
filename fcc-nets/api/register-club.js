// POST /api/register-club — public, unauthenticated, rate-limited.
// The public page never holds Firestore write access — this is the only
// write path for new registrations, via the Admin SDK.

import crypto from "node:crypto";
import { getDb, getRegistrations, saveRegistrations } from "./_lib/ministaevneAdmin.js";
import { checkRateLimit } from "./_lib/rateLimit.js";

const APP_URL = "https://fcc-training.vercel.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidCount(n) {
  const num = Number(n);
  return Number.isInteger(num) && num >= 1 && num <= 30;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: "Too many requests — please try again later" });
  }

  const { clubName, teamName, contact, email, phone, teams, players, notes, isCustom } = req.body || {};

  if (!clubName || !String(clubName).trim()) return res.status(400).json({ error: "Club name is required" });
  if (!teamName || !String(teamName).trim()) return res.status(400).json({ error: "Team name is required" });
  if (!contact || !String(contact).trim()) return res.status(400).json({ error: "Contact person is required" });
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: "A valid email is required" });
  if (!isValidCount(teams)) return res.status(400).json({ error: "Teams must be between 1 and 30" });
  if (!isValidCount(players)) return res.status(400).json({ error: "Players must be between 1 and 30" });

  const trimmedClubName = String(clubName).trim();

  try {
    const db = getDb();
    const registrations = await getRegistrations(db);

    // Resubmitting the same club (e.g. tapping their own badge again) updates
    // their existing registration instead of creating a duplicate row.
    const existingIdx = registrations.findIndex(
      (r) => r.clubName.trim().toLowerCase() === trimmedClubName.toLowerCase()
    );

    const record = {
      id: existingIdx !== -1 ? registrations[existingIdx].id : crypto.randomUUID(),
      clubName: trimmedClubName,
      teamName: String(teamName).trim(),
      contact: String(contact).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : "",
      teams: Number(teams),
      players: Number(players),
      notes: notes ? String(notes).trim() : "",
      status: existingIdx !== -1 ? registrations[existingIdx].status : (isCustom ? "pending" : "confirmed"),
      isCustom: !!isCustom,
      registeredAt: existingIdx !== -1 ? registrations[existingIdx].registeredAt : new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      registrations[existingIdx] = record;
    } else {
      registrations.push(record);
    }
    await saveRegistrations(db, registrations);

    if (record.status === "pending") {
      fetch(`${APP_URL}/api/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pending-club",
          data: {
            clubName: record.clubName,
            contact: record.contact,
            email: record.email,
            phone: record.phone,
          },
        }),
      }).catch((err) => console.error("pending-club notify failed:", err));
    }

    return res.status(200).json({
      ok: true,
      registration: {
        clubName: record.clubName,
        teamName: record.teamName,
        teams: record.teams,
        players: record.players,
        status: record.status,
      },
    });
  } catch (err) {
    console.error("register-club error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
