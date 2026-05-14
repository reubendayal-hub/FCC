// ═══════════════════════════════════════════════════════════════════════════
// src/constants/parent-duty.js
// Parent duty roster — config, roles, helpers
// Per-team customisation lives in Firestore (fccnets/parentdutyconfig).
// This file ships the SHAPE and the DEFAULTS only — admin can override
// anything in-app.
// ═══════════════════════════════════════════════════════════════════════════

// Standard match-day roles available to every team.
// Custom roles (added per-team by admin) use the "tools" icon and a free-text label.
export const STANDARD_ROLES = {
  transport_driver: { label: "Transport (driver)", icon: "car", short: "Drive" },
  transport_seats:  { label: "Transport (seats only)", icon: "users", short: "Seats" },
  kit:              { label: "Kit & equipment", icon: "package", short: "Kit" },
  scorer:           { label: "Scorer", icon: "clipboard", short: "Scorer" },
};

// Training has a single generic "support" role.
export const TRAINING_ROLE = {
  id: "support",
  label: "Support parent",
  icon: "hand-stop",
  short: "Support",
};

// Per-team defaults. Admin can override any field in-app.
// Brand new youth teams not in this list get DEFAULT_TEAM_CONFIG.
export const DEFAULT_DUTY_CONFIG = {
  "U11": {
    enabled: true,
    trainingSlots: 1,
    matchSlots: 2,
    minDuties: 4,
    standardRoles: ["transport_driver", "transport_seats", "kit", "scorer"],
    customRoles: [],
  },
  "U13": {
    enabled: true,
    trainingSlots: 1,
    matchSlots: 2,
    minDuties: 4,
    standardRoles: ["transport_driver", "transport_seats", "kit", "scorer"],
    customRoles: [],
  },
  "U13 B": {
    enabled: true,
    trainingSlots: 1,
    matchSlots: 2,
    minDuties: 4,
    standardRoles: ["transport_driver", "transport_seats", "kit", "scorer"],
    customRoles: [],
  },
  "U15": {
    enabled: true,
    trainingSlots: 0,
    matchSlots: 2,
    minDuties: 3,
    standardRoles: ["transport_driver", "transport_seats", "scorer"],
    customRoles: [],
  },
  "U15 Girls": {
    enabled: true,
    trainingSlots: 1,
    matchSlots: 2,
    minDuties: 4,
    standardRoles: ["transport_driver", "transport_seats", "kit", "scorer"],
    customRoles: [],
  },
  "U16": {
    enabled: false,
    trainingSlots: 0,
    matchSlots: 1,
    minDuties: 2,
    standardRoles: ["transport_driver", "scorer"],
    customRoles: [],
  },
  "U18": {
    enabled: false,
    trainingSlots: 0,
    matchSlots: 1,
    minDuties: 2,
    standardRoles: ["transport_driver", "scorer"],
    customRoles: [],
  },
};

// Fallback for teams not in DEFAULT_DUTY_CONFIG.
export const DEFAULT_TEAM_CONFIG = {
  enabled: false,
  trainingSlots: 1,
  matchSlots: 2,
  minDuties: 4,
  standardRoles: ["transport_driver", "transport_seats", "kit", "scorer"],
  customRoles: [],
};

// ─── Helpers ───────────────────────────────────────────────────────────────

// Merge Firestore config over defaults. Returns config for one team.
// Safe to call before Firestore loads — returns DEFAULT_TEAM_CONFIG if missing.
export function getEffectiveConfig(team, savedConfig) {
  if (!team) return DEFAULT_TEAM_CONFIG;
  const fromSaved = savedConfig?.[team];
  const fromDefault = DEFAULT_DUTY_CONFIG[team];
  if (fromSaved) return { ...DEFAULT_TEAM_CONFIG, ...fromDefault, ...fromSaved };
  if (fromDefault) return fromDefault;
  return DEFAULT_TEAM_CONFIG;
}

// Is duty enabled for this team?
export function isDutyEnabled(team, savedConfig) {
  return !!getEffectiveConfig(team, savedConfig).enabled;
}

// Get the active role list for match days, with labels resolved.
// Returns [{id, label, icon, short, isCustom}]
export function getMatchRoles(team, savedConfig) {
  const cfg = getEffectiveConfig(team, savedConfig);
  const standard = (cfg.standardRoles || [])
    .filter(id => STANDARD_ROLES[id])
    .map(id => ({ id, ...STANDARD_ROLES[id], isCustom: false }));
  const custom = (cfg.customRoles || []).map(r => ({
    id: r.id,
    label: r.label,
    icon: r.icon || "tools",
    short: r.label,
    isCustom: true,
  }));
  return [...standard, ...custom];
}

// Resolve a stored role id back to a label (handles deleted custom roles).
// If the role was deleted, the denormalised label on the session record is used.
export function resolveRoleLabel(roleId, team, savedConfig, fallbackLabel) {
  if (!roleId) return TRAINING_ROLE.label;
  if (STANDARD_ROLES[roleId]) return STANDARD_ROLES[roleId].label;
  const cfg = getEffectiveConfig(team, savedConfig);
  const custom = (cfg.customRoles || []).find(r => r.id === roleId);
  if (custom) return custom.label;
  return fallbackLabel || roleId;
}

// Get short label for use in pills.
export function resolveRoleShort(roleId, team, savedConfig, fallbackLabel) {
  if (!roleId || roleId === "support") return TRAINING_ROLE.short;
  if (STANDARD_ROLES[roleId]) return STANDARD_ROLES[roleId].short;
  const cfg = getEffectiveConfig(team, savedConfig);
  const custom = (cfg.customRoles || []).find(r => r.id === roleId);
  if (custom) return custom.label;
  return fallbackLabel || roleId;
}

// Get icon emoji/identifier for a role.
export function resolveRoleIcon(roleId) {
  if (!roleId || roleId === "support") return "🙋";
  const iconMap = {
    car: "🚗",
    users: "🧍",
    package: "📦",
    clipboard: "📋",
    tools: "🔧",
  };
  const std = STANDARD_ROLES[roleId];
  if (std) return iconMap[std.icon] || "👤";
  return iconMap.tools;
}

// ─── Migration shim ─────────────────────────────────────────────────────────
// Old shape (U11 only): session.supportParent = {memberId, memberName, ...}
// New shape: session.supportParents = [{memberId, memberName, role, ...}]
// Read-time migration — never mutates Firestore, just normalises in-memory.
export function getSupportParents(session) {
  if (!session) return [];
  if (Array.isArray(session.supportParents)) return session.supportParents;
  if (session.supportParent && session.supportParent.memberId !== undefined) {
    // Wrap old singular into array, default role to "support"
    return [{
      ...session.supportParent,
      role: session.supportParent.role || "support",
      unlinked: false,
    }];
  }
  return [];
}

// Inverse: take an array of support parents and write back to session.
// Writes new array shape AND clears old singular field to avoid drift.
export function setSupportParents(session, list) {
  return {
    ...session,
    supportParents: list,
    supportParent: null, // explicit null to clear old field on save
  };
}

// ─── Duty counting ──────────────────────────────────────────────────────────
// Count duties for a parent across the season for one or more teams.
// Matches by memberId first, falls back to case-insensitive memberName for unlinked.
export function countDuties(parent, sessions, teams, seasonYear) {
  const teamSet = new Set(Array.isArray(teams) ? teams : [teams]);
  const nameLower = (parent.name || "").toLowerCase().trim();
  const meId = parent.id;
  let count = 0;
  for (const s of sessions) {
    if (!teamSet.has(s.restrictedTo)) continue;
    if (seasonYear && new Date(s.date).getFullYear() !== seasonYear) continue;
    const sps = getSupportParents(s);
    for (const sp of sps) {
      if (sp.memberId && sp.memberId === meId) { count++; break; }
      if (!sp.memberId && sp.memberName && sp.memberName.toLowerCase().trim() === nameLower) {
        count++; break;
      }
    }
  }
  return count;
}

// Get the season year for a date (handles UK-style season spanning year? not yet — calendar year).
export function getSeasonYear(date) {
  return new Date(date || Date.now()).getFullYear();
}

// Is this session a match? (Convention from existing code: ground sessions can be matches)
export function isMatchSession(session) {
  if (!session) return false;
  return !!(session.isMatch || session.matchOpponent || session.type === "match");
}

// How many slots does this session have (training vs match)?
export function getSlotCount(session, savedConfig) {
  if (!session) return 0;
  const cfg = getEffectiveConfig(session.restrictedTo, savedConfig);
  if (!cfg.enabled) return 0;
  return isMatchSession(session) ? cfg.matchSlots : cfg.trainingSlots;
}

// Slug-ify a custom role label into a stable id (lowercase, hyphen-separated).
// Used when admin adds a new custom role.
export function slugifyRoleId(label) {
  return (label || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `role-${Date.now()}`;
}

// ─── Coach exemption ───────────────────────────────────────────────────────
export function getTeamCoachNames(teamName, teams) {
  if (!teamName || !Array.isArray(teams)) return [];
  const team = teams.find(t => t.name === teamName);
  if (!team) return [];
  const raw = team.coaches || team.coachList || (team.coach ? [team.coach] : []);
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
}

export function isTeamCoach(member, teamName, teams) {
  if (!member || !teamName) return false;
  const coachNames = getTeamCoachNames(teamName, teams);
  if (coachNames.length === 0) return false;
  const myName = (member.name || "").toLowerCase().trim();
  return coachNames.some(n => (n || "").toLowerCase().trim() === myName);
}

// ─── Orphan kid handling ───────────────────────────────────────────────────
export function getOrphanKids(team, members) {
  if (!team || !Array.isArray(members)) return [];
  const onTeam = members.filter(m => (m.teams || []).includes(team));
  const linkedChildIds = new Set();
  members.forEach(m => {
    (m.children || []).forEach(cid => linkedChildIds.add(cid));
  });
  return onTeam.filter(kid => !linkedChildIds.has(kid.id));
}

export function buildOrphanParentRow(kid, sessions, team, seasonYear) {
  const hasNamed = !!(kid.parentName && kid.parentName.trim());
  const displayName = hasNamed
    ? kid.parentName.trim()
    : `${kid.name?.split(" ")[0] || "this kid"}'s parent`;
  let count = 0;
  if (hasNamed) {
    const nameLower = kid.parentName.toLowerCase().trim();
    for (const s of sessions) {
      if (s.restrictedTo !== team) continue;
      if (seasonYear && new Date(s.date).getFullYear() !== seasonYear) continue;
      for (const sp of getSupportParents(s)) {
        if (!sp.memberId && sp.memberName &&
            sp.memberName.toLowerCase().trim() === nameLower) {
          count++;
          break;
        }
      }
    }
  }
  return {
    id: `orphan:${kid.id}`,
    kidId: kid.id,
    kidName: kid.name,
    name: displayName,
    hasNamedParent: hasNamed,
    isOrphan: true,
    unlinked: true,
    count,
  };
}

// ─── Canonical roster builder ──────────────────────────────────────────────
// Linked parents (coaches of THIS team excluded) + orphan kid placeholders.
export function buildTeamParentList(team, members, sessions, teamsRec, seasonYear) {
  if (!team) return [];
  const teamChildIds = new Set(
    members.filter(m => (m.teams || []).includes(team)).map(m => m.id)
  );

  const linkedParents = members
    .filter(m =>
      (m.children || []).some(cid => teamChildIds.has(cid)) &&
      !isTeamCoach(m, team, teamsRec)
    )
    .map(p => ({
      id: p.id,
      name: p.name,
      count: countDuties(p, sessions, team, seasonYear),
      isOrphan: false,
    }));

  const orphans = getOrphanKids(team, members)
    .map(kid => buildOrphanParentRow(kid, sessions, team, seasonYear));

  return [...linkedParents, ...orphans];
}
