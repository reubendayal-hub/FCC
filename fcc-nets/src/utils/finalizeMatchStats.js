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
  collection, getDocs, deleteDoc,
} from "firebase/firestore";

// One-time cleanup: an earlier bug wrote career docs to
// fccnets/data/members/{numericIndex} instead of /{memberId}. This
// helper deletes any such junk docs (those whose id is all digits).
// Admin-only — not currently wired into a UI; can be called from the
// browser console via:
//   import("/src/utils/finalizeMatchStats.js").then(m => m.cleanupBrokenCareerDocs({ db }))
// Returns the number of docs deleted.
export async function cleanupBrokenCareerDocs({ db }) {
  const snap = await getDocs(collection(db, "fccnets", "data", "members"));
  const dels = [];
  snap.forEach(d => {
    if (/^\d+$/.test(d.id)) dels.push(deleteDoc(d.ref));
  });
  await Promise.all(dels);
  return dels.length;
}

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
  // The roster blob's `value` is a JSON ARRAY of member objects, each
  // with its own `.id` field (short string like "x3kkunl"). Older
  // versions of this file used Object.entries() which treated the
  // array as a keyed object — producing numeric-index "ids" like "7"
  // and writing career docs to fccnets/data/members/7 etc. The
  // Array.isArray check below tolerates both shapes (if anyone ever
  // changes the blob to keyed-object form later, it still works).
  const nameToId = {};
  const membersArray = Array.isArray(membersMap) ? membersMap : Object.values(membersMap);
  for (const m of membersArray) {
    if (m?.name && m?.id) {
      nameToId[String(m.name).trim().toLowerCase()] = m.id;
    }
  }
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

// ─────────────────────────────────────────────────────────────
// Career recompute from matchAppearances (source-of-truth replay).
//
// Used when a match is deleted: each affected player's career needs
// to be rebuilt from their *remaining* matchAppearances after the
// deleted match's entry is filtered out. Also exported as a standalone
// helper so callers can rebuild a single player's career on demand.
// ─────────────────────────────────────────────────────────────

// Pure aggregator. Takes a (possibly trimmed) appearances array and
// returns the full career object. Used by both the standalone helper
// and the in-transaction recompute inside deleteMatchAndRecompute.
function aggregateCareerFromAppearances(appearances) {
  const batting = {
    innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0,
    highest: 0, fifties: 0, hundreds: 0,
  };
  const bowling = {
    overs: 0, maidens: 0, runs: 0, wickets: 0, fiveFors: 0, bestFigures: "0/0",
  };
  const fielding = { catches: 0, stumpings: 0, runOuts: 0 };

  let totalLegalBalls = 0;
  let bestW = 0, bestR = 0, bestSet = false;

  for (const a of (appearances || [])) {
    const b = a?.batting;
    if (b) {
      batting.innings += 1;
      if (b.notOut) batting.notOuts += 1;
      const r = Number(b.runs) || 0;
      batting.runs  += r;
      batting.balls += Number(b.balls) || 0;
      batting.fours += Number(b.fours) || 0;
      batting.sixes += Number(b.sixes) || 0;
      if (r > batting.highest) batting.highest = r;
      // Mutually exclusive — matches finalizeMatchStats's increment.
      if (r >= 100) batting.hundreds += 1;
      else if (r >= 50) batting.fifties += 1;
    }
    const bo = a?.bowling;
    if (bo) {
      totalLegalBalls += Number(bo.legalBalls) || 0;
      bowling.runs    += Number(bo.runsConceded) || 0;
      const w = Number(bo.wickets) || 0;
      const conceded = Number(bo.runsConceded) || 0;
      bowling.wickets += w;
      if (bo.fiveFor) bowling.fiveFors += 1;
      if (!bestSet || w > bestW || (w === bestW && conceded < bestR)) {
        bestW = w; bestR = conceded; bestSet = true;
      }
    }
    const f = a?.fielding;
    if (f) {
      fielding.catches   += Number(f.catches) || 0;
      fielding.stumpings += Number(f.stumpings) || 0;
      fielding.runOuts   += Number(f.runOuts) || 0;
    }
  }

  bowling.overs = Math.round((totalLegalBalls / 6) * 10) / 10;
  bowling.bestFigures = bestSet ? `${bestW}/${bestR}` : "0/0";
  return { batting, bowling, fielding };
}

// Standalone helper: read a single member's appearances and rewrite
// the career object from scratch. Full overwrite — not incremental.
// Returns the recomputed career object.
export async function recomputePlayerCareer({ db, playerId }) {
  if (!db) throw new Error("recomputePlayerCareer: db is required");
  if (!playerId) throw new Error("recomputePlayerCareer: playerId is required");
  const ref = doc(db, "fccnets", "data", "members", playerId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const appearances = Array.isArray(data.matchAppearances) ? data.matchAppearances : [];
  const career = aggregateCareerFromAppearances(appearances);
  await setDoc(ref, { career, matchAppearances: appearances }, { merge: true });
  return career;
}

// Delete a match and rebuild affected players' careers from their
// remaining matchAppearances. The match doc itself is deleted LAST,
// so a mid-flight failure leaves the match recoverable.
export async function deleteMatchAndRecompute({ db, matchId, matchData }) {
  if (!db) throw new Error("deleteMatchAndRecompute: db is required");
  if (!matchId) throw new Error("deleteMatchAndRecompute: matchId is required");

  const events = Array.isArray(matchData?.events) ? matchData.events : [];

  // No events → never scored, no player stats touched. Just delete.
  if (events.length === 0) {
    await deleteDoc(doc(db, "fccscorer", "data", "matches", matchId));
    return { affectedPlayers: 0, matchId };
  }

  // Collect participating names from events (striker, non-striker,
  // bowler, fielder on wickets). Same shape as the modal's count.
  const names = new Set();
  for (const ev of events) {
    if (ev.striker)        names.add(ev.striker);
    if (ev.nonStriker)     names.add(ev.nonStriker);
    if (ev.bowler)         names.add(ev.bowler);
    if (ev.wicket?.fielder) names.add(ev.wicket.fielder);
  }

  // Resolve names → member ids via the roster blob (same pattern as
  // finalizeMatchStats). Names not in roster are silently skipped.
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
  const membersArray = Array.isArray(membersMap) ? membersMap : Object.values(membersMap);
  for (const m of membersArray) {
    if (m?.name && m?.id) {
      nameToId[String(m.name).trim().toLowerCase()] = m.id;
    }
  }
  const resolve = (n) => nameToId[String(n || "").trim().toLowerCase()] || null;

  const playerIds = new Set();
  for (const name of names) {
    const id = resolve(name);
    if (id) playerIds.add(id);
  }

  // Per-player transaction: filter out this matchId's appearance, then
  // rebuild career from the remaining appearances. Atomic per-player.
  const txs = [];
  for (const playerId of playerIds) {
    const ref = doc(db, "fccnets", "data", "members", playerId);
    txs.push(runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() || {};
      const prev = Array.isArray(data.matchAppearances) ? data.matchAppearances : [];
      const next = prev.filter(a => a?.matchId !== matchId);
      // No-op if this player had no appearance for this match.
      if (next.length === prev.length) return;
      const career = aggregateCareerFromAppearances(next);
      tx.set(ref, { career, matchAppearances: next }, { merge: true });
    }));
  }
  await Promise.all(txs);

  // Last step — destructive. Anything above can fail and we'll still
  // see the match in the list (admin can retry).
  await deleteDoc(doc(db, "fccscorer", "data", "matches", matchId));

  return { affectedPlayers: playerIds.size, matchId };
}
