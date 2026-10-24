import React, { useState } from "react";
import { MAX_TEXT } from "../shared/reviewRules.js";
import { TOTAL_PARTS } from "../content/config.js";

const Bulb = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18h6" /><path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.74c.62.46 1 1.18 1 1.96V17h6v-.3c0-.78.38-1.5 1-1.96A7 7 0 0 0 12 2Z" />
  </svg>
);

// "Did we miss anything?" With a name, it autosaves like everything else.
// Anonymously, the draft autosaves too, but nothing reaches Reuben and Parag
// until "Send anonymously", which moves the text off the reviewer's review.
export default function MissedCard({ snap, sync, closed }) {
  const text = snap.review.anythingMissed || "";
  const anon = snap.review.anythingMissedAnon === true;
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setSending(true);
    setError("");
    const res = await sync.sendMissedAnon(text);
    setSending(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  }

  return (
    <section className="card stack missed" aria-labelledby="hb-missed-h">
      <div className="missed-head">
        <span className="bulb"><Bulb /></span>
        <div>
          <h2 id="hb-missed-h">Did we miss anything?</h2>
          <p>These {TOTAL_PARTS} parts cover the topics members raise most often, but you know the club too. Is something missing, overlooked, or worth adding? We'd really like to hear it.</p>
        </div>
      </div>
      <div className="field">
        <label className="sr" htmlFor="hb-missed">Did we miss anything?</label>
        <textarea id="hb-missed" className="input" value={text} maxLength={MAX_TEXT} disabled={closed || sending}
          placeholder="A topic we didn't cover, a role we forgot, an idea for the club…"
          onChange={(e) => { setSent(false); setError(""); sync.setMissed(e.target.value); }} />
        <div className="hint">
          <span>{!anon ? "Saves automatically" : text ? "Draft saved. Not sent until you tap Send." : ""}</span>
          <span>{text.length} / {MAX_TEXT}</span>
        </div>
      </div>

      <div className="who" role="radiogroup" aria-label="Who sees your name">
        {[[false, "Share with my name"], [true, "Send anonymously"]].map(([value, label]) => (
          <label key={label} className={anon === value ? "on" : ""}>
            <input type="radio" name="hb-missed-who" checked={anon === value} disabled={closed || sending}
              onChange={() => { setSent(false); sync.setMissedAnon(value); }} />
            {label}
          </label>
        ))}
      </div>

      {anon && (
        <>
          <p className="anon-help">Your name won't be stored with this comment. Reuben and Parag will only see the text.</p>
          <button className="btn btn-primary btn-block" onClick={send} disabled={closed || sending || text.trim().length < 3}>
            {sending ? "Sending…" : "Send anonymously"}
          </button>
        </>
      )}
      {sent && !text && <p className="sent" role="status">✓ Sent anonymously. Thank you. You can send another any time.</p>}
      {error && <p className="err" role="alert">{error}</p>}
    </section>
  );
}
