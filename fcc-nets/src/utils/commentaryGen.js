// ── Commentary generator ──────────────────────────────────────────────
//
// Single source of truth for runtime selection of a commentary line.
// Keeps a module-level 5-deep ring buffer of recent line ids so a run of
// fours / sixes / wickets / etc. doesn't repeat the same string.
//
// Usage:
//   import { pickCommentary } from "../utils/commentaryGen";
//   const line = pickCommentary("six_straight", { batter, bowler });
//

import { COMMENTARY_LIB } from "../constants/commentary";

const recentLineIds = [];
const MAX_RECENT = 5;

export function pickCommentary(eventKey, vars = {}) {
  const pool = COMMENTARY_LIB[eventKey] || COMMENTARY_LIB.run_1 || [];
  if (pool.length === 0) return "";

  // Approach-aware filtering: lines containing {approach} are only
  // eligible when vars.approach is non-empty. Keeps the over/round-the-
  // wicket flavour surfacing only when the scorer has actually told us
  // which angle the bowler is using.
  const filtered = vars.approach
    ? pool
    : pool.filter(line => !line.includes("{approach}"));
  if (filtered.length === 0) return "";

  const all = filtered.map((line) => ({ line, id: `${eventKey}::${line}` }));
  const available = all.filter(x => !recentLineIds.includes(x.id));
  const candidates = available.length > 0 ? available : all;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  recentLineIds.push(pick.id);
  if (recentLineIds.length > MAX_RECENT) recentLineIds.shift();

  return pick.line
    .replace(/\{batter\}/g,   vars.batter   || "the batter")
    .replace(/\{bowler\}/g,   vars.bowler   || "the bowler")
    .replace(/\{fielder\}/g,  vars.fielder  || "the fielder")
    .replace(/\{approach\}/g, vars.approach || "");
}

// pickEventKey — translate a ball outcome into a commentary library key.
// Centralised here so the scorer's record-handlers stay terse and the
// mapping logic is easy to tweak in one place.
//
// opts shape (all optional):
//   { runs, kind, shotType, zone, wicket, extras }
//
// `zone` may use either the kebab-case ids the wagon wheel currently uses
// (cover, mid-off, on-drive, midwicket, sq-leg, fine-leg, third-man, point,
// straight, behind) or snake_case equivalents — both are accepted.
export function pickEventKey(opts = {}) {
  const { runs, shotType, zone, wicket, extras } = opts;

  if (wicket) {
    const t = String(wicket.type || "").toLowerCase();
    if (t.includes("bowl"))    return "wicket_bowled";
    if (t.includes("catch") || t.includes("caught")) return "wicket_caught";
    if (t.includes("lbw"))     return "wicket_lbw";
    if (t.includes("run"))     return "wicket_runout";
    if (t.includes("stump"))   return "wicket_stumped";
    if (t.includes("hit"))     return "wicket_hitwicket";
    return "wicket_caught";
  }

  if (extras === "wide")    return "wide";
  if (extras === "noball")  return "noball";
  if (extras === "bye")     return "bye";
  if (extras === "legbye")  return "legbye";

  if (runs === 0) {
    if (shotType === "miss")  return "dot_missed";
    if (shotType === "leave") return "dot_leave";
    return "dot_defended";
  }
  if (runs === 1) return "run_1";
  if (runs === 2) return "run_2";
  if (runs === 3) return "run_3";

  if (runs === 4) {
    if (shotType === "edged") return "four_edged";
    if (["cover","mid_off","mid-off","mid_on","mid-on","on-drive","straight"].includes(zone)) {
      return "four_driven";
    }
    if (["square_leg","sq-leg","midwicket","fine_leg","fine-leg","third_man","third-man","point","behind"].includes(zone)) {
      return "four_pulled";
    }
    return "four_generic";
  }

  if (runs === 6) {
    if (["straight","mid_on","mid-on","on-drive"].includes(zone))           return "six_straight";
    if (["midwicket","square_leg","sq-leg","fine_leg","fine-leg"].includes(zone)) return "six_legside";
    if (["cover","mid_off","mid-off","point","third_man","third-man"].includes(zone)) return "six_offside";
    return "six_generic";
  }

  return "run_1";
}
