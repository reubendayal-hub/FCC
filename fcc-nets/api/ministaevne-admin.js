// GET/PATCH/DELETE /api/ministaevne-admin — organiser-only, gated by
// requireAdmin (server-side check, not client-hidden buttons).

import { getDb, getRegistrations, saveRegistrations } from "./_lib/ministaevneAdmin.js";
import { requireAdmin } from "./_lib/ministaevneAuth.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const db = getDb();

    if (req.method === "GET") {
      const registrations = await getRegistrations(db);
      return res.status(200).json({ registrations });
    }

    if (req.method === "PATCH") {
      const { id, ...fields } = req.body || {};
      if (!id) return res.status(400).json({ error: "Missing id" });
      const registrations = await getRegistrations(db);
      const idx = registrations.findIndex((r) => r.id === id);
      if (idx === -1) return res.status(404).json({ error: "Registration not found" });
      delete fields.id;
      registrations[idx] = { ...registrations[idx], ...fields };
      await saveRegistrations(db, registrations);
      return res.status(200).json({ ok: true, registration: registrations[idx] });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "Missing id" });
      const registrations = await getRegistrations(db);
      const next = registrations.filter((r) => r.id !== id);
      if (next.length === registrations.length) return res.status(404).json({ error: "Registration not found" });
      await saveRegistrations(db, next);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("ministaevne-admin error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
