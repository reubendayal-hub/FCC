import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PARTS, TOTAL_PARTS, COMMITTEES } from "../content/config.js";
import { isPartDone, partProblem, MAX_TEXT, MIN_REASON } from "../shared/reviewRules.js";
import { VERDICT_META, formatDate } from "./bits.jsx";
import { TopBar } from "./Hub.jsx";

const ANCHOR_TO_PART = Object.fromEntries(PARTS.map((p) => [p.anchor, p.id]));

function scrollPct() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

function TextArea({ id, label, value, onChange, required, disabled, autoFocus }) {
  const len = (value || "").trim().length;
  const short = required && len > 0 && len < MIN_REASON;
  return (
    <div className="field reveal">
      <label htmlFor={id}>{label}{!required && <span style={{ color: "var(--muted)", fontWeight: 600 }}> (optional)</span>}</label>
      <textarea id={id} className="input" value={value || ""} maxLength={MAX_TEXT} disabled={disabled} autoFocus={autoFocus}
        aria-invalid={short} aria-describedby={`${id}-hint`} onChange={(e) => onChange(e.target.value)} />
      <div className="hint" id={`${id}-hint`}>
        {short ? <span className="warn">A few more words, please ({MIN_REASON - len} to go)</span> : <span>{required ? "Required" : "Saves automatically"}</span>}
        <span>{(value || "").length} / {MAX_TEXT}</span>
      </div>
    </div>
  );
}

function RoleInterest({ config, roleInterest, onChange, disabled }) {
  if (!config) return null;
  if (config.kind === "committees") {
    const picked = roleInterest.committees || [];
    const toggle = (c) => onChange({ committees: picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c] });
    return (
      <div className="roles">
        <span className="lbl" id="hb-committees">{config.label} <span style={{ color: "var(--muted)", fontWeight: 600 }}>(optional, pick any)</span></span>
        <div className="rchips" role="group" aria-labelledby="hb-committees">
          {COMMITTEES.map((c) => (
            <button key={c} type="button" className="rchip" aria-pressed={picked.includes(c)} disabled={disabled} onClick={() => toggle(c)}>{c}</button>
          ))}
        </div>
      </div>
    );
  }
  const on = !!roleInterest[config.key];
  return (
    <div className="roles">
      <span className="lbl">Want to help? <span style={{ color: "var(--muted)", fontWeight: 600 }}>(optional)</span></span>
      <button type="button" className="toggle" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange({ [config.key]: !on })}>
        <span>{config.label}</span><span className="sw" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function PartReader({ partId, restore, snap, sync, closed, go, showToast }) {
  const part = PARTS[partId - 1];
  const review = snap.review;
  const ans = review.parts[partId] || {};
  const done = isPartDone(ans);
  const verdict = ans.verdict || null;
  const [focusText, setFocusText] = useState(false);
  const [pulse, setPulse] = useState(false);
  const wasDone = useRef(done);
  const docRef = useRef(null);
  const cardNextRef = useRef(null); // in-card button (desktop)
  const barNextRef = useRef(null);  // sticky bottom bar button (mobile)
  const agreeTimer = useRef(null);
  const pulseTimer = useRef(null);
  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Next is enabled once the part counts as reviewed (Agree, or a reason given).
  // When the review is closed it just navigates.
  const canNext = closed || done;

  // Land at the top, or restore the saved scroll position when resuming.
  useLayoutEffect(() => {
    if (restore && review.resume?.lastPart === partId && review.resume.scrollPct > 0) {
      const target = review.resume.scrollPct;
      const apply = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.round(target * max), behavior: "instant" });
      };
      // Twice: once now, once after web fonts settle the layout.
      setTimeout(apply, 0);
      document.fonts?.ready.then(() => setTimeout(apply, 50));
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
      if (!closed) sync.setResume(partId, 0);
    }
    wasDone.current = isPartDone(review.parts[partId]);
    setFocusText(false);
  }, [partId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remember where they are while reading.
  useEffect(() => {
    if (closed) return undefined;
    let t = null;
    const onScroll = () => {
      if (t) return;
      t = setTimeout(() => { t = null; sync.setResume(partId, scrollPct()); }, 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, [partId, closed, sync]);

  // "Saved ✓ · 8 of 13" when this part becomes complete. For a reasoned
  // verdict, the Next button also lights up (no scrolling while they type).
  useEffect(() => {
    if (done && !wasDone.current) {
      showToast(`Saved ✓ · ${review.doneCount} of ${TOTAL_PARTS}`);
      if (verdict && verdict !== "agree") flashNext();
    }
    wasDone.current = done;
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { clearTimeout(agreeTimer.current); clearTimeout(pulseTimer.current); }, []);

  // The Next button the reader can actually see: the sticky bar on phones,
  // the in-card button on wider screens.
  function visibleNext() {
    const bar = barNextRef.current;
    if (bar && bar.offsetParent !== null) return { el: bar, sticky: true };
    return cardNextRef.current ? { el: cardNextRef.current, sticky: false } : null;
  }

  // Short gold glow (two cycles). Skipped entirely with reduced motion.
  function flashNext() {
    clearTimeout(pulseTimer.current);
    if (reducedMotion()) return;
    setPulse(false);
    requestAnimationFrame(() => {
      setPulse(true);
      pulseTimer.current = setTimeout(() => setPulse(false), 1700);
    });
  }

  function pickVerdict(v) {
    if (closed) return;
    const prev = verdict;
    // 1) Autosave first — immediate server write, before any scroll or navigation.
    sync.setPart(partId, { verdict: v }, { immediate: true });
    // A newer tap always cancels a pending Agree jump: no double-scroll.
    clearTimeout(agreeTimer.current);
    if (v === "agree") {
      setFocusText(false);
      if (prev === "agree") return;
      // 2) After the card re-renders (reason fields collapse), bring Next to the reader.
      agreeTimer.current = setTimeout(() => {
        const target = visibleNext();
        if (!target) return;
        if (!target.sticky) {
          target.el.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
        }
        target.el.focus({ preventScroll: true });
        flashNext();
      }, 60);
    } else {
      // Changes / Disagree: stay put; focus goes to the reason field.
      setFocusText(true);
    }
  }

  // Links inside the handbook text (e.g. "#conduct") open that part here.
  function onDocClick(e) {
    const a = e.target.closest?.("a[href^='#']");
    if (!a) return;
    const target = ANCHOR_TO_PART[a.getAttribute("href").slice(1)];
    if (target) { e.preventDefault(); go({ part: target }); }
  }

  const allDone = review.doneCount === TOTAL_PARTS;
  const isLast = partId === TOTAL_PARTS;
  const nextLabel = isLast ? "Review & finish →" : "Next part →";
  function next() {
    if (!canNext) return;
    clearTimeout(agreeTimer.current);
    if (isLast) return go(allDone ? { done: true } : {});
    go({ part: partId + 1 });
  }
  const nextHint = canNext ? undefined
    : verdict ? partProblem(ans) : "Pick a verdict first";

  return (
    <div className="screen">
      <TopBar snap={snap}>
        <button className="back" onClick={() => go({})} aria-label="Back to all parts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          Hub
        </button>
        <div className="mid">
          <b>Part {partId} of {TOTAL_PARTS}</b>
          <div className="minibar" aria-hidden="true"><i style={{ width: `${(review.doneCount / TOTAL_PARTS) * 100}%` }} /></div>
        </div>
      </TopBar>

      <main className="col reader">
        <div className="hb-doc" ref={docRef} onClick={onDocClick} style={{ counterReset: `part ${partId - 1}` }}>
          <section aria-label={`Part ${partId}: ${part.heading}`} dangerouslySetInnerHTML={{ __html: part.html }} />
        </div>

        <section className="card stack verdict-card" id="verdict" aria-labelledby="hb-v-h">
          <div>
            <h2 id="hb-v-h">What do you think of Part {partId}?</h2>
            <p style={{ color: "var(--muted)", fontSize: 14.5, marginTop: 2 }}>{part.title}. Tap one. It saves straight away.</p>
          </div>
          {(snap.notes.includes(partId) || (part.roleInterest && snap.notes.includes("roles"))) && (
            <div className="note-bar" role="status">
              <span>Updated from another device.</span>
              <button className="linkbtn" onClick={sync.dismissNotes}>OK</button>
            </div>
          )}
          <div className="verdicts" role="group" aria-label="Your verdict">
            {Object.entries(VERDICT_META).map(([key, m]) => (
              <button key={key} type="button" className={`vbtn ${key}`} aria-pressed={verdict === key} disabled={closed} onClick={() => pickVerdict(key)}>
                <span className="e" aria-hidden="true">{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>

          {verdict === "changes" && (
            <TextArea key={`c${partId}`} id="hb-change" label="What would you change?" required value={ans.change} disabled={closed}
              autoFocus={focusText} onChange={(v) => sync.setPart(partId, { change: v })} />
          )}
          {verdict === "disagree" && (
            <>
              <TextArea key={`n${partId}`} id="hb-notok" label="What's not OK for you?" required value={ans.notOk} disabled={closed}
                autoFocus={focusText} onChange={(v) => sync.setPart(partId, { notOk: v })} />
              <TextArea key={`f${partId}`} id="hb-fix" label="What would make it work?" value={ans.fix} disabled={closed}
                onChange={(v) => sync.setPart(partId, { fix: v })} />
            </>
          )}

          <RoleInterest config={part.roleInterest} roleInterest={review.roleInterest || {}} disabled={closed}
            onChange={(patch) => sync.setRoleInterest(patch)} />

          {ans.updatedAt ? <p className="updated">Last updated {formatDate(ans.updatedAt)}{done ? "" : " · draft"}</p> : null}

          <div className="next-row">
            <button ref={cardNextRef} className={`btn next-btn next-main${canNext ? " ready" : ""}${pulse ? " pulse" : ""}`}
              onClick={next} disabled={!canNext} title={nextHint}>
              {nextLabel}
            </button>
            <button className="btn btn-ghost" onClick={() => go({})}>Back to all parts</button>
          </div>
          {!canNext && <p className="updated next-hint" aria-live="polite">{nextHint}</p>}
        </section>

        {/* Phones: Next is always reachable in a sticky bottom bar. */}
        <div className="next-bar" role="region" aria-label="Part navigation">
          <span className="next-bar-pos">Part {partId} of {TOTAL_PARTS}</span>
          <button ref={barNextRef} className={`btn next-btn${canNext ? " ready" : ""}${pulse ? " pulse" : ""}`}
            onClick={next} disabled={!canNext} aria-describedby={!canNext ? "hb-next-hint" : undefined}>
            {nextLabel}
          </button>
          {!canNext && <span id="hb-next-hint" className="sr">{nextHint}</span>}
        </div>

        <div className="pager">
          {partId > 1 ? <button className="linkbtn" onClick={() => go({ part: partId - 1 })}>← Part {partId - 1}</button> : <span />}
          {partId < TOTAL_PARTS ? <button className="linkbtn" onClick={() => go({ part: partId + 1 })}>Part {partId + 1} →</button> : <span />}
        </div>
      </main>
    </div>
  );
}
