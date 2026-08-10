// GET /api/ministaevne-public — public, unauthenticated.
// Returns ONLY confirmed clubs' public fields. Contact/email/phone/notes
// are stripped server-side here and never sent to the client — never rely
// on the frontend to hide them.

import { getDb, getRegistrations } from "./_lib/ministaevneAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = getDb();
    const registrations = await getRegistrations(db);
    const publicList = registrations
      .filter((r) => r.status === "confirmed")
      .map((r) => ({
        clubName: r.clubName,
        teamName: r.teamName,
        teams: r.teams,
        players: r.players,
        status: "confirmed",
      }));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ registrations: publicList });
  } catch (err) {
    console.error("ministaevne-public error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
