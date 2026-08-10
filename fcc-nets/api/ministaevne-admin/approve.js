// POST /api/ministaevne-admin/approve — pending -> confirmed. Organiser-only.

import { getDb, getRegistrations, saveRegistrations } from "../_lib/ministaevneAdmin.js";
import { requireAdmin } from "../_lib/ministaevneAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireAdmin(req, res)) return;

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const db = getDb();
    const registrations = await getRegistrations(db);
    const idx = registrations.findIndex((r) => r.id === id);
    if (idx === -1) return res.status(404).json({ error: "Registration not found" });
    registrations[idx] = { ...registrations[idx], status: "confirmed" };
    await saveRegistrations(db, registrations);
    return res.status(200).json({ ok: true, registration: registrations[idx] });
  } catch (err) {
    console.error("ministaevne-admin/approve error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
