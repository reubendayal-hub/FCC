import React, { useLayoutEffect } from "react";
import { FABRIC, TOTAL_PARTS } from "../content/config.js";
import { TopBar, nextUnreviewed } from "./Hub.jsx";

// "The fabric of FCC": the intro's read-this-first block. Read-only: no
// verdict, and it never touches progress, resume or the 13 parts.
export default function FabricReader({ snap, go }) {
  const review = snap.review;
  const nextPart = nextUnreviewed(review);
  const started = Object.keys(review.parts).length > 0;
  const nextLabel = !nextPart ? "Back to all parts" : started ? `Continue Part ${nextPart} →` : "Start with Part 1 →";
  const next = () => go(nextPart ? { part: nextPart } : {});

  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  return (
    <div className="screen">
      <TopBar snap={snap}>
        <button className="back" onClick={() => go({})} aria-label="Back to all parts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          Hub
        </button>
        <div className="mid"><b>Read this first</b></div>
      </TopBar>

      <main className="col reader">
        <div className="hb-doc">
          <section aria-label={FABRIC.title} dangerouslySetInnerHTML={{ __html: FABRIC.html }} />
        </div>

        <section className="card stack fabric-end">
          <p>No verdict needed here. The {TOTAL_PARTS} parts that follow are what you review.</p>
          <div className="next-row">
            <button className="btn next-btn next-main ready" onClick={next}>{nextLabel}</button>
            <button className="btn btn-ghost" onClick={() => go({})}>Back to all parts</button>
          </div>
        </section>

        {/* Phones: same sticky bar as the parts. */}
        <div className="next-bar" role="region" aria-label="Navigation">
          <span className="next-bar-pos">Read this first</span>
          <button className="btn next-btn ready" onClick={next}>{nextLabel}</button>
        </div>
      </main>
    </div>
  );
}
