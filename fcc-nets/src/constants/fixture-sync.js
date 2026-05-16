// ═══════════════════════════════════════════════════════════════════════════
// src/constants/fixture-sync.js
//
// Converts DCF match fixtures (read from ALL_FIXTURES and MATCH_FIXTURES)
// into session records so they appear in the parent duty roster and
// captain XI selection.
//
// Scope: only coached teams (youth + Women's + Legends).
// Senior division teams (Div 2/3/4, T20 Serie 4/5, OB) are captain-led
// and don't need session records — captains coordinate match details
// themselves via WhatsApp.
//
// Idempotent: re-running creates only new sessions, via fixtureKey dedup.
// ═══════════════════════════════════════════════════════════════════════════

import { uid } from "./seeds";

// ─── Which fixture-list "division" prefixes get converted to sessions? ─────
// One-to-one mapping — the fixture prefix IS the team name.
// Add more as needed (e.g. "U15 Girls" once we verify the fixture format).
export const SYNCED_TEAMS = new Set([
  "U11",
  "U13",
  "U13 B",
  "U15",
  "U16",
  "U18",
  "Women's",
  "Legends",
]);

// Default match times when ALL_FIXTURES doesn't include from/to.
// Away matches usually don't have times in ALL_FIXTURES — admin can edit
// each session after sync to set the actual start time.
const DEFAULT_MATCH_FROM = "10:00";
const DEFAULT_MATCH_TO   = "19:00";


// ─── Parse a fixture row into structured parts ─────────────────────────────
// Input shape (ALL_FIXTURES): { date, label, division, home }
// Returns null if division isn't in SYNCED_TEAMS.
export function parseFixture(fixture) {
  if (!fixture || !fixture.label || !fixture.date) return null;

  // Only convert fixtures for teams in SYNCED_TEAMS
  if (!SYNCED_TEAMS.has(fixture.division)) return null;

  // Extract opponent from label: "{division} {vs|@} {opponent}"
  const label = fixture.label;
  let opponent = "TBC";
  let home = !!fixture.home;
  const vsMatch = label.match(/\bvs\s+(.+)$/i);
  const atMatch = label.match(/\s@\s+(.+)$/);
  if (vsMatch) {
    opponent = vsMatch[1].trim();
    home = true;
  } else if (atMatch) {
    opponent = atMatch[1].trim();
    home = false;
  } else if (label.toLowerCase().includes("ministævne") ||
             label.toLowerCase().includes("tournament")) {
    opponent = "Tournament";
  }

  return {
    date: fixture.date,
    team: fixture.division,
    opponent,
    home,
    rawLabel: label,
  };
}


// ─── Stable key for dedup ──────────────────────────────────────────────────
export function fixtureKey(parsed) {
  return `${parsed.team}|${parsed.date}|${parsed.opponent}`;
}


// ─── Find time hint from MATCH_FIXTURES (home matches only) ────────────────
// MATCH_FIXTURES has accurate from/to times for home matches.
// Returns { from, to } or null.
export function findTimeHint(parsed, matchFixtures) {
  if (!Array.isArray(matchFixtures) || !parsed.home) return null;
  for (const mf of matchFixtures) {
    if (mf.date !== parsed.date) continue;
    if (!mf.label) continue;
    // Match by team prefix + opponent's first significant word
    const oppFirstWord = parsed.opponent.split(/[\s.]+/)[0];
    if (mf.label.includes(parsed.team) &&
        oppFirstWord && mf.label.includes(oppFirstWord)) {
      return {
        from: mf.from || DEFAULT_MATCH_FROM,
        to:   mf.to   || DEFAULT_MATCH_TO,
      };
    }
  }
  return null;
}


// ─── Build a session record from a parsed fixture ──────────────────────────
export function buildSessionFromFixture(parsed, matchFixtures, teamsRec) {
  const timeHint = findTimeHint(parsed, matchFixtures);
  const from = timeHint?.from || DEFAULT_MATCH_FROM;
  const to   = timeHint?.to   || DEFAULT_MATCH_TO;

  const venue = parsed.home ? "Fredensborg" : parsed.opponent;
  const label = `${parsed.team} ${parsed.home ? "vs" : "@"} ${parsed.opponent}`;

  // Coaches from teams config if available
  const teamRec = Array.isArray(teamsRec)
    ? teamsRec.find(t => t.name === parsed.team)
    : null;
  const coaches = teamRec?.coaches || [];

  return {
    id: uid(),
    date: parsed.date,
    from,
    to,
    label,
    isMatch: true,
    matchOpponent: parsed.opponent,
    home: parsed.home,
    venue,
    restrictedTo: parsed.team,
    sessionTeams: [parsed.team],
    coaches,
    players: [],
    poll: [],
    net: parsed.home ? "1" : null,
    lifts: {},
    fixtureKey: fixtureKey(parsed),
    createdBy: "Fixture sync",
    createdAt: new Date().toISOString(),
  };
}


// ─── Find all unsynced fixtures ────────────────────────────────────────────
// Returns parsed fixtures whose teams are in SYNCED_TEAMS, are in the future,
// and don't have an existing session.
export function getUnsyncedFixtures(allFixtures, sessions, today) {
  if (!Array.isArray(allFixtures)) return [];
  const todayStr = today || new Date().toISOString().slice(0, 10);

  // Existing sessions by fixtureKey (preferred dedup)
  const existingKeys = new Set(
    (sessions || []).map(s => s.fixtureKey).filter(Boolean)
  );

  // Manual-match fallback for sessions created via Add Session before
  // fixtureKey existed: match by {date, opponent, team}
  const manualMatch = (parsed) =>
    (sessions || []).some(s =>
      s.date === parsed.date &&
      s.matchOpponent === parsed.opponent &&
      (s.restrictedTo === parsed.team ||
       (s.sessionTeams || []).includes(parsed.team))
    );

  const unsynced = [];
  for (const f of allFixtures) {
    if (f.date < todayStr) continue;
    const parsed = parseFixture(f);
    if (!parsed) continue;
    if (existingKeys.has(fixtureKey(parsed))) continue;
    if (manualMatch(parsed)) continue;
    unsynced.push(parsed);
  }
  return unsynced;
}


// ─── Convert a batch of unsynced fixtures into new session records ─────────
export function buildSessionsFromUnsynced(unsynced, matchFixtures, teamsRec) {
  return unsynced.map(parsed =>
    buildSessionFromFixture(parsed, matchFixtures, teamsRec)
  );
}
