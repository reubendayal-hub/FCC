import React, { useState } from "react";
import { PARTS, TOTAL_PARTS, readMins } from "../content/config.js";
import { isPartDone } from "../shared/reviewRules.js";
import { personalLink } from "../identity.js";
import { CREST, Countdown, ProgressRing, SaveStatus, VerdictChip, VERDICT_ACCENT, Privacy, BackToApp } from "./bits.jsx";
import MissedCard from "./MissedCard.jsx";

const NOTE_TEXT = (notes) => {
  const parts = notes.filter((n) => typeof n === "number");
  const bits = [];
  if (parts.length) bits.push(`Part${parts.length > 1 ? "s" : ""} ${parts.join(", ")}`);
  if (notes.includes("roles")) bits.push("your role interests");
  if (notes.includes("missed")) bits.push("\"Anything we missed?\"");
  return `${bits.join(" and ")} ${bits.length > 1 || parts.length > 1 ? "were" : "was"} updated from another device.`;
};

export function TopBar({ snap, children }) {
  return (
    <div className="topbar">
      <div className="col topbar-in">
        {children}
        <SaveStatus status={snap.status} hasPending={snap.hasPending} />
      </div>
    </div>
  );
}

export default function Hub({ snap, sync, token, deadline, closed, go, showToast }) {
  const review = snap.review;
  const done = review.doneCount;
  const left = TOTAL_PARTS - done;
  const minsLeft = readMins(PARTS.filter((p) => !isPartDone(review.parts[p.id])).reduce((n, p) => n + p.words, 0));
  const resumePart = review.resume?.lastPart || 0;
  const inProgress = resumePart && !isPartDone(review.parts[resumePart]) ? resumePart : 0;
  // Resume exactly where they were if that part is unfinished; otherwise the next unreviewed part.
  const continuePart = inProgress || nextUnreviewed(review, resumePart);
  const firstName = (review.name || "").split(" ")[0];
  const hasStarted = Object.keys(review.parts).length > 0 || resumePart > 0;
  const [linkOpen, setLinkOpen] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(personalLink(token));
      showToast("Link copied ✓");
    } catch {
      setLinkOpen(true);
    }
  }

  const nudge = left === 0
    ? "All parts reviewed. Thank you! You can still change answers until 30 Nov."
    : `${left} to go, about ${minsLeft} minute${minsLeft === 1 ? "" : "s"}.`;

  return (
    <div className="screen">
      <TopBar snap={snap}>
        <BackToApp />
        <div className="brand"><img src={CREST} alt="" width="30" height="34" /><b>Club Handbook</b></div>
      </TopBar>

      <header className="hub-head">
        <div className="col hub-head-in">
          <div>
            <h1>How We Run <span>Our Club</span></h1>
            <p>Read it. Shape it. It's your club.</p>
          </div>
          <div className="count-mini">
            <Countdown deadline={deadline} size="sm" />
            <span className="count-label">Review closes 30 Nov</span>
          </div>
        </div>
      </header>
      <div className="bars" aria-hidden="true" />

      <main className="col hub-body">
        {closed && <div className="closed-bar" role="status">Review closed. Thank you.</div>}

        {snap.notes.length > 0 && (
          <div className="note-bar" role="status">
            <span>{NOTE_TEXT(snap.notes)}</span>
            <button className="linkbtn" onClick={sync.dismissNotes}>OK</button>
          </div>
        )}

        {!closed && hasStarted && left > 0 && (
          <div className="card welcome-back">
            <p>Welcome back, {firstName}.</p>
            <button className="btn btn-gold btn-sm" onClick={() => go({ part: continuePart, restore: !!inProgress })}>
              Continue Part {continuePart} →
            </button>
          </div>
        )}

        <section className="card progress-card" aria-label="Your progress">
          <ProgressRing done={done} total={TOTAL_PARTS} />
          <div>
            <h2>{done} of {TOTAL_PARTS} parts reviewed</h2>
            <p>{nudge}</p>
            {!hasStarted && !closed && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => go({ part: 1 })}>Start with Part 1 →</button>
            )}
            {left === 0 && <button className="linkbtn" onClick={() => go({ done: true })}>See your summary</button>}
          </div>
        </section>

        <nav className="tiles" aria-label="Handbook parts">
          {PARTS.map((p) => {
            const ans = review.parts[p.id];
            const isDone = isPartDone(ans);
            const current = p.id === inProgress;
            return (
              <button key={p.id} className={`tile${current ? " current" : ""}`}
                style={{ "--tile-accent": isDone ? VERDICT_ACCENT[ans.verdict] : ans?.verdict ? "var(--grey)" : "var(--line)" }}
                onClick={() => go({ part: p.id, restore: current })}
                aria-label={`Part ${p.id}: ${p.title}. ${isDone ? "Reviewed" : ans?.verdict ? "Draft" : "Not started"}.`}>
                <span className="num" aria-hidden="true">{String(p.id).padStart(2, "0")}</span>
                <span className="eb">{p.eyebrow}</span>
                <span className="tt">{p.title}</span>
                <span style={{ gridRow: "2", gridColumn: "2" }}><VerdictChip part={ans} done={isDone} /></span>
                <span className="sm">{p.summary}</span>
                <span className="meta">
                  <span>{p.readMins} min read</span>
                  {current && <span className="here">In progress</span>}
                </span>
              </button>
            );
          })}
        </nav>

        <MissedCard snap={snap} sync={sync} closed={closed} />

        <section className="card stack" aria-label="Your personal link">
          <div>
            <h2 style={{ fontSize: 18 }}>Your personal link</h2>
            <p style={{ color: "var(--muted)", fontSize: 14.5, marginTop: 2 }}>
              Open it on any device to carry on where you left off. Keep it to yourself: anyone with it can see and edit your answers.
            </p>
          </div>
          <div className="linkbox">
            <code aria-label="Personal link">{linkOpen ? personalLink(token) : personalLink(token).replace(/r=.*/, "r=••••••••")}</code>
            <button className="btn btn-ghost btn-sm" onClick={copyLink}>Copy</button>
          </div>
          {!linkOpen && <button className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => setLinkOpen(true)}>Show full link</button>}
        </section>

        <Privacy />
      </main>
      <p className="foot">Fredensborg Cricket Club · Club Handbook review · {review.handbookVersion}</p>
    </div>
  );
}

export function nextUnreviewed(review, after = 0) {
  for (let i = 1; i <= TOTAL_PARTS; i++) {
    const n = ((after + i - 1) % TOTAL_PARTS) + 1;
    if (!isPartDone(review.parts[n])) return n;
  }
  return 0;
}
