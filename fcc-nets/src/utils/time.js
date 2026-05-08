// ─── Time & date utilities (pure) ─────────────────────────────

// Local (not UTC) YYYY-MM-DD formatter
export const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

export const todayStr = () => localDateStr();

export const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateStr(d);
};

export const fmtShort = ds =>
  new Date(ds).toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" });

export const fmtLong = ds =>
  new Date(ds).toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

export const isToday = ds => ds === todayStr();

export const isFuture = ds => {
  const d = new Date(ds);
  d.setHours(23, 59, 59);
  return d >= new Date();
};

export const isSessionPast = (s) => {
  const now = new Date();
  const sessionDate = new Date(s.date);
  const today = new Date(); today.setHours(0,0,0,0);
  sessionDate.setHours(0,0,0,0);
  // If session date is before today, it's past
  if (sessionDate < today) return true;
  // If session date is after today, it's not past
  if (sessionDate > today) return false;
  // Same day — check end time
  const [endH, endM] = (s.to || "23:59").split(":").map(Number);
  const endTime = new Date(); endTime.setHours(endH, endM, 0, 0);
  return now > endTime;
};

// 9pm cutoff: after 9pm the night before a session, members can't self-remove
export function isAfterCutoff(sessionDateStr) {
  const now = new Date();
  const sessDay = new Date(sessionDateStr + "T00:00:00");
  const cutoff = new Date(sessDay);
  cutoff.setDate(cutoff.getDate() - 1);
  cutoff.setHours(21, 0, 0, 0); // 9pm the day before
  return now >= cutoff;
}

// ─── Nets-day timeline minute helpers ─────────────────────────
export const NET_DAY_START = 8 * 60;
export const NET_DAY_END   = 21 * 60;
export const NET_SPAN      = NET_DAY_END - NET_DAY_START;

export const netPct = m =>
  Math.max(0, Math.min(100, (m - NET_DAY_START) / NET_SPAN * 100));

export const toMinsNet = t => {
  const [h, mn] = t.split(":").map(Number);
  return h * 60 + mn;
};

export const PRIME_ZONES = [
  { from:"17:00", to:"20:00" },
  { from:"09:00", to:"13:00" },
];

export function isPrimeTime(fromStr) {
  const m = toMinsNet(fromStr);
  return PRIME_ZONES.some(z => m >= toMinsNet(z.from) && m < toMinsNet(z.to));
}
