// Review rules shared by the browser and the API (api/handbook/[action].js),
// so "what counts as reviewed" can never drift between the two.

export const TOTAL_PARTS = 13;
export const VERDICTS = ["agree", "changes", "disagree"];
export const MAX_TEXT = 2000;
export const MIN_REASON = 10;
export const ROLE_TOGGLE_KEYS = ["selector", "coaching", "captaincy", "oneFcc"];
export const COMMITTEE_KEYS = [
  "Youth", "Matches", "Coaching", "Finance & Sponsorship", "Comms & Growth",
  "Equipment & Grounds", "Events & Social", "Culture & Togetherness",
];
export const ROLE_GROUP_KEYS = ["senior", "youth-parent", "coach", "board", "other"];

const len = (s) => (typeof s === "string" ? s.trim().length : 0);

// Returns null when the part answer is complete, otherwise a short
// human-readable reason. Drafts may be incomplete; "done" parts may not.
export function partProblem(p) {
  if (!p || !VERDICTS.includes(p.verdict)) return "Pick a verdict";
  if (p.verdict === "changes" && len(p.change) < MIN_REASON) return `Tell us what you'd change (at least ${MIN_REASON} characters)`;
  if (p.verdict === "disagree" && len(p.notOk) < MIN_REASON) return `Tell us what's not OK for you (at least ${MIN_REASON} characters)`;
  return null;
}

export const isPartDone = (p) => partProblem(p) === null;

export function countDone(parts) {
  let n = 0;
  for (let i = 1; i <= TOTAL_PARTS; i++) if (isPartDone(parts?.[i])) n++;
  return n;
}
