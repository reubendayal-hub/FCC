import React, { useState } from "react";
import { PARTS, COMMITTEES, ROLE_INTEREST_LABELS } from "../content/config.js";
import { isPartDone } from "../shared/reviewRules.js";
import { Confetti, VerdictChip, Privacy } from "./bits.jsx";
import { TopBar } from "./Hub.jsx";
import MissedCard from "./MissedCard.jsx";

export default function Complete({ snap, sync, closed, go }) {
  const review = snap.review;
  const ri = review.roleInterest || {};
  // Decide once, so the box doesn't vanish on the first keystroke.
  const [askMissed] = useState(() => !(review.anythingMissed || "").trim());
  const offers = [
    ...(ri.committees || []).filter((c) => COMMITTEES.includes(c)),
    ...Object.keys(ROLE_INTEREST_LABELS).filter((k) => ri[k]).map((k) => ROLE_INTEREST_LABELS[k]),
  ];

  return (
    <div className="screen">
      <TopBar snap={snap}>
        <button className="back" onClick={() => go({})}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          Hub
        </button>
        <div className="mid" />
      </TopBar>
      <main className="col hub-body">
        <section className="card done-hero stack">
          <Confetti />
          <h1>Your voice is counted 🏏</h1>
          <p>Thank you, {(review.name || "").split(" ")[0]}. You reviewed all {PARTS.length} parts.</p>
        </section>

        <section className="card stack" aria-labelledby="hb-sum-h">
          <h2 id="hb-sum-h" style={{ fontSize: 19 }}>Your verdicts</h2>
          <div className="vgrid">
            {PARTS.map((p) => (
              <button key={p.id} className="row" onClick={() => go({ part: p.id })} aria-label={`Part ${p.id}: ${p.title}. Edit.`}>
                <span>Part {p.id}</span>
                <VerdictChip part={review.parts[p.id]} done={isPartDone(review.parts[p.id])} />
              </button>
            ))}
          </div>
          {offers.length > 0 && (
            <p><strong>You offered to help with:</strong> {offers.join(", ")}</p>
          )}
          <p className="updated">You can still edit until 30 Nov. Tap a part to change it.</p>
        </section>

        {askMissed && <MissedCard snap={snap} sync={sync} closed={closed} title="One last thing: anything we missed?" />}
        <Privacy />
      </main>
    </div>
  );
}
