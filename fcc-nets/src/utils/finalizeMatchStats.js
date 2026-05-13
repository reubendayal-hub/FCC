// src/utils/finalizeMatchStats.js
// ─────────────────────────────────────────────────────────────
// Pure async helper that turns a completed match document into
// per-player career roll-ups + a matchAppearance entry.
//
// Called from two places:
//   1. LiveScorerView.finalizeMatch — at the end of a live match
//      (auto on natural innings-end OR explicit Save & exit).
//   2. MatchesView "↻ Recompute stats" link on completed match
//      cards (admin / creator).
//
// No React, no component state. Caller passes:
//   { db, matchData, abandoned, force }
//
// Returns:
//   { playersUpdated, skipped, alreadyFinalised }
//
// ─────────────────────────────────────────────────────────────
// Known limitations (documented in commit):
//   - maidens = 0 always (per-over run aggregation deferred).
//   - opponent on matchAppearance: chosen via squad membership; if
//     the player isn't in either squad we fall back to team2.
//   - Career counters are incremental and not idempotent. Repeat
//     recompute on the same matchData inflates career totals.
//     matchAppearances stays deduped because arrayUnion compares
//     entries deeply.
// ─────────────────────────────────────────────────────────────

import {
  doc, getDoc, setDoc, runTransaction, serverTimestamp, arrayUnion,
} from "firebase/firestore";

// ── Label classifiers (mirror of LiveScorerView's logic) ─────
const isLegalBall = (lbl) => {
  if (!lbl) return false;
  if (/^Wd/.test(lbl)) return false;
  if (/^Nb/.test(lbl)) return false;
  return true;
};
const isExtraRunsOnly = (lbl) => {
  if (!lbl) return false;
  if (/^B\d*$/.test(lbl)) return true;       // bye
  if (/^LB\d*$/.test(lbl)) return true;      // leg-bye
  if (/^Wd/.test(lbl)) return true;          // wide variants
  if (lbl === "Nb+B" || lbl === "Nb+LB") return true;
  return false;
};

export async function finalizeMatchStats({ db, matchData, abandoned = false, force = false }) {
  if (!db) throw new Error("finalizeMatchStats: db is required");
  if (!matchData || typeof matchData !== "object") {
    throw new Error("finalizeMatchStats: matchData is required");
  }
  const matchId = matchData.matchId || matchData.id || null;
  if (!matchId) throw new Error("finalizeMatchStats: matchData.matchId missing");

  // Bail early if already finalised — caller can override with force:true.
  if (matchData.finalised === true && !force) {
    return { playersUpdated: 0, skipped: [], alreadyFinalised: true };
  }

  const events = Array.isArray(matchData.events) ? matchData.events : [];

  // ── Per-player aggregation ───────────────────────────────────
  const batters = new Map();   // name → { innings, runs, balls, fours, sixes, notOut, dismissalType }
  const dismissed = new Map(); // name → wicket type
  const bowlers = new Map();   // name → { legalBalls, runsConceded, wickets }
  const fielders = new Map();  // name → { catches, stumpings, runOuts }

  for (const ev of events) {
    const lbl = ev.label || "";
    const evInnings = ev.innings || 1;

    if (ev.striker) {
      if (!batters.has(ev.striker)) {
        batters.set(ev.striker, {
          innings: evInnings,
          runs: 0, balls: 0, fours: 0, sixes: 0,
          notOut: true, dismissalType: null,
        });
      }
      const b = batters.get(ev.striker);
      if (isLegalBall(lbl)) b.balls += 1;
      if (!isExtraRunsOnly(lbl)) {
        const runs = Number(ev.runs) || 0;
        b.runs += runs;
        if (runs === 4) b.fours += 1;
        if (runs === 6) b.sixes += 1;
      }
    }

    if (ev.bowler) {
      if (!bowlers.has(ev.bowler)) {
        bowlers.set(ev.bowler, { legalBalls: 0, runsConceded: 0, wickets: 0 });
      }
      const bo = bowlers.get(ev.bowler);
      // Wides don't count as legal balls; no-balls do (per convention).
      if (!/^Wd/.test(lbl)) bo.legalBalls += 1;
      bo.runsConceded += Number(ev.runs) || 0;
      if (ev.wicket && ev.wicket.type && ev.wicket.type !== "Run out") {
        bo.wickets += 1;
      }
    }

    if (ev.wicket) {
      const name = ev.wicket.fielder;
      if (ev.wicket.batter) dismissed.set(ev.wicket.batter, ev.wicket.type || "out");
      if (name) {
        if (!fielders.has(name)) {
          fielders.set(name, { catches: 0, stumpings: 0, runOuts: 0 });
        }
        const fa = fielders.get(name);
        if (ev.wicket.type === "Caught")  fa.catches += 1;
        if (ev.wicket.type === "Stumped") fa.stumpings += 1;
        if (ev.wicket.type === "Run out") fa.runOuts += 1;
      }
    }
  }

  // Finalize batter notOut/dismissalType + milestone flags.
  for (const [name, b] of batters.entries()) {
    if (dismissed.has(name)) {
      b.notOut = false;
      b.dismissalType = dismissed.get(name);
    }
    b.fifty   = b.runs >= 50 && b.runs < 100;
    b.hundred = b.runs >= 100;
  }
  // Bowler 5-fer flag + formatted overs ("X.Y").
  for (const bo of bowlers.values()) {
    bo.fiveFor = bo.wickets >= 5;
    const whole = Math.floor(bo.legalBalls / 6);
    const partial = bo.legalBalls % 6;
    bo.oversBowled = `${whole}.${partial}`;
  }

  // ── Resolve names → member doc IDs via the roster blob ──────
  const membersBlob = await getDoc(doc(db, "fccnets", "members"));
  let membersMap = {};
  if (membersBlob.exists()) {
    const raw = membersBlob.data()?.value;
    if (raw) {
      try { membersMap = JSON.parse(raw); }
      catch (e) { console.error("members blob parse error:", e); }
    }
  }
  const nameToId = {};
  Object.entries(membersMap).forEach(([id, m]) => {
    if (m?.name) nameToId[String(m.name).trim().toLowerCase()] = id;
  });
  const resolve = (name) => nameToId[String(name || "").trim().toLowerCase()] || null;

  // ── Squad / opponent / date helpers ─────────────────────────
  const squad1 = Array.isArray(matchData.squad1) ? matchData.squad1 : [];
  const squad2 = Array.isArray(matchData.squad2) ? matchData.squad2 : [];
  const team1 = matchData.team1 || "Team 1";
  const team2 = matchData.team2 || "Team 2";
  const opponentFor = (name) => {
    if (squad1.includes(name)) return team2;
    if (squad2.includes(name)) return team1;
    return team2;
  };
  const matchDate = matchData.date || new Date().toISOString().slice(0, 10);

  // ── Build union of players + run a transaction per player ───
  const allNames = new Set([...batters.keys(), ...bowlers.keys(), ...fielders.keys()]);
  const skipped = [];
  const txPromises = [];

  for (const name of allNames) {
    const playerId = resolve(name);
    if (!playerId) {
      skipped.push(name);
      continue;
    }
    const batAgg = batters.get(name) || null;
    const bowlAgg = bowlers.get(name) || null;
    const fieldAgg = fielders.get(name) || null;
    const ref = doc(db, "fccnets", "data", "members", playerId);

    txPromises.push(runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? snap.data() : {};
      const career = data.career || {};
      const batting = career.batting || {
        innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0,
        highest: 0, fifties: 0, hundreds: 0,
      };
      const bowling = career.bowling || {
        overs: 0, maidens: 0, runs: 0, wickets: 0, fiveFors: 0, bestFigures: "0/0",
      };
      const fielding = career.fielding || { catches: 0, stumpings: 0, runOuts: 0 };

      if (batAgg) {
        batting.innings += 1;
        if (batAgg.notOut) batting.notOuts += 1;
        batting.runs  += batAgg.runs;
        batting.balls += batAgg.balls;
        batting.fours += batAgg.fours;
        batting.sixes += batAgg.sixes;
        if (batAgg.runs > batting.highest) batting.highest = batAgg.runs;
        if (batAgg.fifty)   batting.fifties  += 1;
        if (batAgg.hundred) batting.hundreds += 1;
      }
      if (bowlAgg) {
        const newOvers = (bowling.overs || 0) + (bowlAgg.legalBalls / 6);
        bowling.overs = Math.round(newOvers * 10) / 10;
        // maidens stays 0 — per-over aggregation deferred.
        bowling.maidens += 0;
        bowling.runs    += bowlAgg.runsConceded;
        bowling.wickets += bowlAgg.wickets;
        if (bowlAgg.fiveFor) bowling.fiveFors += 1;
        const [curW, curR] = String(bowling.bestFigures || "0/0")
          .split("/").map(n => parseInt(n, 10) || 0);
        const isBetter = bowlAgg.wickets > curW
          || (bowlAgg.wickets === curW && bowlAgg.runsConceded < curR);
        if (isBetter) bowling.bestFigures = `${bowlAgg.wickets}/${bowlAgg.runsConceded}`;
      }
      if (fieldAgg) {
        fielding.catches   += fieldAgg.catches;
        fielding.stumpings += fieldAgg.stumpings;
        fielding.runOuts   += fieldAgg.runOuts;
      }

      // matchAppearance: plain values only — serverTimestamp() would
      // break arrayUnion deep-equality dedup on recompute.
      tx.set(ref, {
        career: { batting, bowling, fielding },
        matchAppearances: arrayUnion({
          matchId,
          date: matchDate,
          opponent: opponentFor(name),
          batting: batAgg || null,
          bowling: bowlAgg || null,
          fielding: fieldAgg || null,
          abandoned: abandoned === true,
        }),
      }, { merge: true });
    }));
  }

  await Promise.all(txPromises);

  // ── Mark match doc finalised (last so a mid-run crash leaves it
  // recoverable; on the next recompute we'd re-resolve the same
  // events and tx writes are themselves idempotent per-player only
  // if matchAppearances has not changed — see arrayUnion caveat). ─
  await setDoc(doc(db, "fccscorer", "data", "matches", matchId), {
    finalised: true,
    completedAt: serverTimestamp(),
    abandoned: abandoned === true,
  }, { merge: true });

  const playersUpdated = allNames.size - skipped.length;
  return { playersUpdated, skipped, alreadyFinalised: false };
}
