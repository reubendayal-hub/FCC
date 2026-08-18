// src/utils/resetCricketStats.js
// One-time admin utility: wipe all ScorePro stats from every member's
// career doc at fccnets/data/members/{memberId} — the same subcollection
// finalizeMatchStats.js writes career + matchAppearances to (NOT the
// fccnets/members roster blob, which is a separate flat doc).
//
// Sets career=null and matchAppearances=[] (merge write) so any other
// fields on that doc are preserved. Returns the number of docs touched.
//
// Called explicitly from the Admin Panel — never invoked on app load.

import { collection, doc, getDocs, setDoc } from "firebase/firestore";

export async function resetAllCricketStats({ db }) {
  if (!db) throw new Error("resetAllCricketStats: db is required");

  const snap = await getDocs(collection(db, "fccnets", "data", "members"));
  const writes = [];
  snap.forEach(d => {
    writes.push(setDoc(
      doc(db, "fccnets", "data", "members", d.id),
      { career: null, matchAppearances: [] },
      { merge: true },
    ));
  });
  await Promise.all(writes);
  return { membersReset: writes.length };
}
