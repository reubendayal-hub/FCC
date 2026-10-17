// Admin aggregates for /handbook-review/admin, the Excel export and the digest.

import { TOTAL_PARTS, COMMITTEE_KEYS, ROLE_TOGGLE_KEYS, countDone, isPartDone } from "../../../src/handbook-review/shared/reviewRules.js";

export const ROLE_LABELS = {
  selector: "Would consider being a selector",
  coaching: "Would help with coaching",
  captaincy: "Captain / vice-captain",
  oneFcc: "Would help build One FCC",
};

export const PART_TITLES = {
  1: "How the club is run", 2: "Who decides what", 3: "Code of conduct", 4: "The board",
  5: "Club officers", 6: "Committees", 7: "Selection committee", 8: "Coaching committee",
  9: "Captains & vice-captains", 10: "Money rules", 11: "Complaints & discipline",
  12: "One FCC development", 13: "Adopting this handbook",
};

export function buildSummary(reviews, config, now = Date.now()) {
  const perPart = [];
  for (let i = 1; i <= TOTAL_PARTS; i++) {
    perPart.push({ part: i, title: PART_TITLES[i], agree: 0, changes: 0, disagree: 0, notYet: 0 });
  }
  const comments = [];
  const volunteers = {};
  for (const c of COMMITTEE_KEYS) volunteers[`committee:${c}`] = { label: c, group: "Committees", people: [] };
  for (const k of ROLE_TOGGLE_KEYS) volunteers[`role:${k}`] = { label: ROLE_LABELS[k], group: "Roles", people: [] };
  const missed = [];
  const respondents = [];

  const testerIds = [...(config.testers || []), ...(config.admins || [])];
  for (const r of reviews) {
    const parts = r.parts || {};
    const doneCount = countDone(parts);
    for (let i = 1; i <= TOTAL_PARTS; i++) {
      const p = parts[i];
      const row = perPart[i - 1];
      if (isPartDone(p)) {
        row[p.verdict] += 1;
        if (p.verdict !== "agree" || (p.change || p.notOk || p.fix)) {
          comments.push({
            part: i, verdict: p.verdict, name: r.name, roleGroup: r.roleGroup,
            change: p.change || "", notOk: p.notOk || "", fix: p.fix || "", updatedAt: p.updatedAt || 0,
          });
        }
      } else {
        row.notYet += 1;
      }
    }
    const ri = r.roleInterest || {};
    const person = { name: r.name, email: r.email, roleGroup: r.roleGroup };
    for (const c of ri.committees || []) volunteers[`committee:${c}`]?.people.push(person);
    for (const k of ROLE_TOGGLE_KEYS) if (ri[k]) volunteers[`role:${k}`].people.push(person);
    if ((r.anythingMissed || "").trim()) {
      missed.push({ name: r.name, roleGroup: r.roleGroup, text: r.anythingMissed, updatedAt: r.anythingMissedUpdatedAt || 0 });
    }
    const isTester = !!r.memberId && testerIds.includes(r.memberId);
    respondents.push({
      // The review id is the reviewer's private link token: only exposed for
      // test reviews (needed for the admin "delete test review" button).
      id: isTester ? r.id : undefined, isTester,
      name: r.name, email: r.email, roleGroup: r.roleGroup, doneCount,
      draftCount: Object.values(parts).filter((p) => p && !isPartDone(p)).length,
      completedAt: r.completedAt || null, createdAt: r.createdAt || 0, lastActivity: r.updatedAt || 0,
      userAgentHint: r.userAgentHint || "",
    });
  }

  const started = reviews.length;
  const completed = respondents.filter((r) => r.doneCount === TOTAL_PARTS).length;
  const deadline = new Date(config.deadlineISO).getTime();
  comments.sort((a, b) => b.updatedAt - a.updatedAt);
  missed.sort((a, b) => b.updatedAt - a.updatedAt);
  respondents.sort((a, b) => b.lastActivity - a.lastActivity);

  return {
    generatedAt: now,
    config,
    kpis: {
      started,
      completed,
      completionPct: started ? Math.round((completed / started) * 100) : 0,
      daysLeft: Math.max(0, Math.floor((deadline - now) / 86400000)), // whole days, matches the countdown
    },
    perPart,
    comments,
    volunteers: Object.values(volunteers),
    missed,
    respondents,
  };
}
