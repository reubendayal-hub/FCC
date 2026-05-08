// ─── Member-related pure utilities ────────────────────────────
import { ROLE_META, can } from "../constants/roles";
import { getTeamMeta } from "../constants/teams";

// getCoachTeams(name, teams) — returns team names where this person is listed as coach
export function getCoachTeams(name, teams) {
  return (teams || []).filter(t => (t.coaches || []).includes(name)).map(t => t.name);
}

// isCoachMember(name, teams) — true if they coach any team
export function isCoachMember(name, teams) {
  return (teams || []).some(t => (t.coaches || []).includes(name));
}

// getTeamRole(name, teams) — returns "captain"|"vicecaptain"|null based on team records
export function getTeamRole(name, teams) {
  if (!name || !teams) return null;
  for (const t of teams) {
    if (t.captain === name) return "captain";
    if (t.vicecaptain === name) return "vicecaptain";
  }
  return null;
}

// canOrCoach: coaches AND team captains/VCs get captain-level abilities
export function canOrCoach(role, action, member, teams) {
  if (can(role, action)) return true;
  if (member && teams && ["removePlayer","addOtherPlayer","deleteSession","sendReminder"].includes(action)) {
    if (isCoachMember(member.name, teams)) return true;
    if (getTeamRole(member.name, teams)) return true; // team captain or VC
  }
  return false;
}

// isTeamCaptain / isTeamVC helpers
export function isTeamCaptainFor(name, teamName, teams) {
  return (teams || []).find(t => t.name === teamName)?.captain === name;
}

export function isTeamVCFor(name, teamName, teams) {
  return (teams || []).find(t => t.name === teamName)?.vicecaptain === name;
}

// maskEmail: show first 2 + last 2 chars of local part for recognition
export function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 4) return email; // too short to mask meaningfully
  return local.slice(0,2) + '•'.repeat(Math.max(local.length - 4, 2)) + local.slice(-2) + '@' + domain;
}

// isAbsent(member, dateStr) — true if member has an absence covering this date
export function isAbsent(member, dateStr) {
  return (member?.absences || []).some(a => a.from <= dateStr && a.to >= dateStr);
}

// ─── Profile completion ───────────────────────────────────────
export function profileCompletion(m) {
  const fields = [!!m?.email?.trim(), !!m?.phone?.trim()];
  const filled = fields.filter(Boolean).length;
  const pct = Math.round((filled / fields.length) * 100);
  // Needs reconfirm if confirmed > 6 months ago or never
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
  const confirmedAt = m?.profileConfirmedAt ? new Date(m.profileConfirmedAt) : null;
  const needsReconfirm = !confirmedAt || (Date.now() - confirmedAt.getTime() > sixMonthsMs);
  const isComplete = pct === 100 && !needsReconfirm;
  return { pct, filled, total: fields.length, needsReconfirm, isComplete, confirmedAt };
}

// Returns array of {label, bg, text, icon} chips for a member's full role display
// Includes global role (if not plain member) + all team captain/VC assignments
export function getMemberRoleChips(member, teams) {
  const chips = [];
  const role = member?.role || "member";
  // Global role — only show if not plain member
  if (role !== "member" && ROLE_META[role]) {
    chips.push({ ...ROLE_META[role], key:"global" });
  }
  // Team-based captain/VC roles
  (teams || []).forEach(t => {
    if (t.captain === member?.name) {
      const tm = getTeamMeta(t.name);
      chips.push({
        label: `${t.name} Captain`, icon: "👨‍✈️",
        bg: tm.bg, text: tm.text, key: `cap-${t.id}`
      });
    }
    if (t.vicecaptain === member?.name) {
      const tm = getTeamMeta(t.name);
      chips.push({
        label: `${t.name} VC`, icon: "👷🏻‍♂️",
        bg: tm.bg, text: tm.text, key: `vc-${t.id}`
      });
    }
  });
  return chips;
}
