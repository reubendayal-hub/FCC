// ─── Session-related pure utilities ───────────────────────────
import { NET_DAY_START, NET_DAY_END, toMinsNet } from "./time";

export function netAvailGauge(sessions, date) {
  const span = NET_DAY_END - NET_DAY_START;
  const booked = (net) => sessions
    .filter(s => s.date === date && (s.net === net || s.net === "both"))
    .reduce((a, s) => {
      const sf = Math.max(toMinsNet(s.from), NET_DAY_START);
      const st = Math.min(toMinsNet(s.to),   NET_DAY_END);
      return a + Math.max(0, st - sf);
    }, 0);
  const bp = ((booked("1") + booked("2")) / (span * 2)) * 100;
  if (bp === 0) return { pct:0,  color:"#22c55e" };
  if (bp < 30)  return { pct:bp, color:"#84cc16" };
  if (bp < 60)  return { pct:bp, color:"#f59e0b" };
  return          { pct:bp, color:"#ef4444" };
}
