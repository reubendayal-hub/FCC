import React, { useState } from "react";
import { api } from "../api.js";
import { ROLE_GROUPS, TOTAL_PARTS, TOTAL_READ_MINS } from "../content/config.js";
import { CREST, Countdown, Privacy, BackToApp } from "./bits.jsx";

export function Hero({ deadline, children, countdown = true }) {
  return (
    <header className="hero">
      <BackToApp variant="hero" />
      <div className="col hero-in">
        <img className="crest" src={CREST} alt="Fredensborg Cricket Club crest" width="84" height="94" />
        <span className="badge">One FCC · One Community</span>
        <h1>How We Run <span>Our Club</span></h1>
        <p className="tag">Read it. Shape it. It's your club.</p>
        {countdown && (
          <div className="count-card">
            <Countdown deadline={deadline} />
            <span className="count-label">Review closes 30 Nov</span>
          </div>
        )}
        {children}
      </div>
    </header>
  );
}

export default function Welcome({ deadline, closed, onStarted, linkError, prefill, onNotMe, allowFullForm }) {
  const [name, setName] = useState(prefill?.name || "");
  const [email, setEmail] = useState(prefill?.email || "");
  const [roleGroup, setRoleGroup] = useState(prefill?.roleGroup || "");
  // From the app with a name + email on file: one-tap start, no typing.
  const quick = !!(prefill && prefill.name && prefill.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email.trim()) && roleGroup;

  async function submit(e) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const out = await api.start({ name: name.trim(), email: email.trim(), roleGroup, memberId: prefill?.memberId || undefined });
      onStarted(out);
    } catch (err) {
      setError(err.status === 0 ? "You seem to be offline. Check your connection and try again." : err.message);
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <Hero deadline={deadline} />
      <div className="bars" aria-hidden="true" />
      <main className="col" style={{ paddingBlock: "22px 40px" }}>
        <div className="stack">
          {linkError && <div className="note-bar" role="alert">{linkError}</div>}
          {closed ? (
            <div className="card stack">
              <h2>Review closed. Thank you.</h2>
              <p>The review isn't taking answers right now. Results will be shared as totals.</p>
            </div>
          ) : quick ? (
            <form className="card stack" onSubmit={submit} noValidate>
              <div>
                <h2 style={{ fontSize: 22 }}>Have your say</h2>
                <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 15 }}>
                  {TOTAL_PARTS} short parts, about {TOTAL_READ_MINS} minutes in total. Your answers save as you go.
                </p>
              </div>
              <div className="as-who">
                <span className="lbl">Reviewing as</span>
                <b>{prefill.name}</b>
                <span>{prefill.email}</span>
              </div>
              <div className="field">
                <label htmlFor="hb-role">Your team / role</label>
                <select id="hb-role" className="input" value={roleGroup} onChange={(e) => setRoleGroup(e.target.value)} required>
                  <option value="" disabled>Choose one…</option>
                  {ROLE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              {error && <p className="err" role="alert">{error}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={!ready || busy}>
                {busy ? "Starting…" : "Start reviewing →"}
              </button>
              {allowFullForm && <button type="button" className="linkbtn" style={{ alignSelf: "center" }} onClick={onNotMe}>Not you? Use the full form</button>}
            </form>
          ) : (
            <form className="card stack" onSubmit={submit} noValidate>
              <div>
                <h2 style={{ fontSize: 22 }}>Have your say</h2>
                <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 15 }}>
                  {TOTAL_PARTS} short parts, about {TOTAL_READ_MINS} minutes in total. Your answers save as you go, so you can stop and pick up any time.
                </p>
              </div>
              <div className="field">
                <label htmlFor="hb-name">Your name</label>
                <input id="hb-name" className="input" autoComplete="name" value={name} maxLength={80}
                  onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="hb-email">Email</label>
                <input id="hb-email" className="input" type="email" inputMode="email" autoComplete="email" value={email} maxLength={160}
                  onChange={(e) => setEmail(e.target.value)} required />
                <small>So we can follow up on your comments. We won't email you from this page.</small>
              </div>
              <div className="field">
                <label htmlFor="hb-role">Your team / role</label>
                <select id="hb-role" className="input" value={roleGroup} onChange={(e) => setRoleGroup(e.target.value)} required>
                  <option value="" disabled>Choose one…</option>
                  {ROLE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              {error && <p className="err" role="alert">{error}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={!ready || busy}>
                {busy ? "Starting…" : "Start reviewing →"}
              </button>
            </form>
          )}
          <Privacy />
        </div>
      </main>
    </div>
  );
}
