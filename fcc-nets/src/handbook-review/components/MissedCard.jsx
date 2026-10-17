import React from "react";
import { MAX_TEXT } from "../shared/reviewRules.js";

// "Anything we missed?" — autosaves like everything else; no Save button needed.
export default function MissedCard({ snap, sync, closed, title = "Anything we missed?" }) {
  const text = snap.review.anythingMissed || "";
  return (
    <section className="card stack missed" aria-labelledby="hb-missed-h">
      <div>
        <h2 id="hb-missed-h">{title}</h2>
        <p>Is there anything about how the club runs that this handbook doesn't cover?</p>
      </div>
      <div className="field">
        <label className="sr" htmlFor="hb-missed">Anything we missed</label>
        <textarea id="hb-missed" className="input" value={text} maxLength={MAX_TEXT} disabled={closed}
          placeholder="Optional. Anything at all: a role, a rule, a situation…"
          onChange={(e) => sync.setMissed(e.target.value)} />
        <div className="hint"><span>Saves automatically</span><span>{text.length} / {MAX_TEXT}</span></div>
      </div>
    </section>
  );
}
