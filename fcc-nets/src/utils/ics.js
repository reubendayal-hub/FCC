// ─── Calendar (.ics) + WhatsApp message generation ────────────
import { fmtShort, fmtLong, isFuture } from "./time";

export function makeICS(s) {
  const [y, mo, da] = s.date.split("-").map(Number);
  const [fh, fm]    = s.from.split(":").map(Number);
  const [th, tm]    = s.to.split(":").map(Number);
  const p = n => String(n).padStart(2, "0");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FCC//EN", "BEGIN:VEVENT",
    `DTSTART:${y}${p(mo)}${p(da)}T${p(fh)}${p(fm)}00`,
    `DTEND:${y}${p(mo)}${p(da)}T${p(th)}${p(tm)}00`,
    `SUMMARY:FCC Training – ${fmtShort(s.date)}`,
    `DESCRIPTION:Players: ${s.players.join(", ")}${s.note ? "\\nNote: " + s.note : ""}`,
    "LOCATION:Karlebo Cricket Ground",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export function waMsg(sessions, date) {
  const day = sessions.filter(s => s.date === date && isFuture(s.date));
  if (!day.length) return null;
  let m = `🏏 *FCC Training – ${fmtLong(date)}*\n\n`;
  day.forEach(s => {
    m += `⏰ *${s.from} – ${s.to}*${s.label ? " · _" + s.label + "_" : ""}\n`;
    s.players.forEach(p => m += `• ${p}\n`);
    if (s.note) m += `📋 _${s.note}_\n`;
    m += "\n";
  });
  return m + "See you at Karlebo! 🙌";
}
