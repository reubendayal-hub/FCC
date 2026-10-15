import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { PARTS, ROLE_GROUPS } from "../content/config.js";
import { CREST, Countdown, VERDICT_META, formatDate } from "../components/bits.jsx";

const TOKEN_KEY = "hbr:admin";
const THEME = (() => { const t = new URLSearchParams(window.location.search).get("theme"); return t === "light" || t === "dark" ? t : undefined; })();
const ROLE_LABEL = Object.fromEntries(ROLE_GROUPS.map((g) => [g.value, g.label]));
const readAdminToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } };
const writeAdminToken = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };
const fmtTime = (ms) => (ms ? new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }) : "–");

function Login({ onToken }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const { token } = await api.adminLogin(pw);
      writeAdminToken(token);
      onToken(token);
    } catch (e2) { setErr(e2.message); setBusy(false); }
  }
  return (
    <div className="col" style={{ paddingTop: "18vh", maxWidth: 420 }}>
      <form className="card stack" onSubmit={submit}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={CREST} alt="" width="40" height="45" />
          <div><h2 style={{ fontSize: 20 }}>Handbook review results</h2><p style={{ color: "var(--muted)", fontSize: 14 }}>One FCC Leads only</p></div>
        </div>
        <div className="field">
          <label htmlFor="adm-pw">Admin password</label>
          <input id="adm-pw" className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-primary btn-block" disabled={!pw || busy}>{busy ? "Checking…" : "Open dashboard"}</button>
      </form>
    </div>
  );
}

function Kpi({ value, label }) {
  return <div className="kpi"><b>{value}</b><span>{label}</span></div>;
}

function PartBars({ perPart, active, onPick }) {
  return (
    <div className="bars-chart" role="list">
      {perPart.map((p) => {
        const total = p.agree + p.changes + p.disagree + p.notYet || 1;
        const seg = (n, cls) => n > 0 && <i className={cls} style={{ width: `${(n / total) * 100}%` }} title={`${n}`} />;
        return (
          <button key={p.part} role="listitem" className={`bar-row${active === p.part ? " on" : ""}`} onClick={() => onPick(active === p.part ? 0 : p.part)}
            aria-label={`Part ${p.part} ${p.title}: ${p.agree} agree, ${p.changes} changes, ${p.disagree} disagree, ${p.notYet} not yet. Filter comments.`}>
            <span className="bar-lbl"><b>{p.part}</b> {p.title}</span>
            <span className="bar-track">{seg(p.agree, "a")}{seg(p.changes, "c")}{seg(p.disagree, "d")}{seg(p.notYet, "n")}</span>
            <span className="bar-n">{p.agree}·{p.changes}·{p.disagree}</span>
          </button>
        );
      })}
      <div className="legend-row">
        <span><i className="a" />Agree</span><span><i className="c" />Changes</span><span><i className="d" />Disagree</span><span><i className="n" />Not yet</span>
      </div>
    </div>
  );
}

function copy(text, done) {
  navigator.clipboard?.writeText(text).then(() => done("Copied ✓"), () => done("Couldn't copy"));
}

export default function AdminApp() {
  const [token, setToken] = useState(readAdminToken);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [partFilter, setPartFilter] = useState(0);
  const [verdictFilter, setVerdictFilter] = useState("");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");
  const [digest, setDigest] = useState(null);
  const [deadlineInput, setDeadlineInput] = useState("");

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2400); }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.adminSummary(token);
      setData(d); setErr("");
      setDeadlineInput((cur) => cur || d.config.deadlineISO);
    } catch (e) {
      if (e.status === 401) { writeAdminToken(""); setToken(""); return; }
      setErr(e.message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const comments = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.comments.filter((c) =>
      (!partFilter || c.part === partFilter) &&
      (!verdictFilter || c.verdict === verdictFilter) &&
      (!needle || `${c.name} ${c.change} ${c.notOk} ${c.fix}`.toLowerCase().includes(needle)));
  }, [data, partFilter, verdictFilter, q]);

  if (!token) return <div className="hbr" data-theme={THEME}><Login onToken={setToken} /></div>;
  if (!data) {
    return <div className="hbr">{err ? <div className="col" style={{ paddingTop: "20vh" }}><p className="err">{err}</p><button className="btn btn-ghost" onClick={load}>Retry</button></div> : <div className="spinner" />}</div>;
  }

  const { kpis, config } = data;
  const deadline = new Date(config.deadlineISO).getTime();

  async function setOpen(open) {
    const msg = open
      ? "Open the review? Anyone with the link can start and submit answers."
      : "Close the review? Reviewers become read-only straight away.";
    if (!window.confirm(msg)) return;
    try { await api.adminSettings(token, { open }); flash(open ? "Review opened" : "Review closed"); load(); } catch (e) { flash(e.message); }
  }
  async function saveDeadline() {
    if (!window.confirm(`Set the deadline to ${deadlineInput}?`)) return;
    try { await api.adminSettings(token, { deadlineISO: deadlineInput }); flash("Deadline saved"); load(); } catch (e) { flash(e.message); }
  }
  async function exportXlsx() {
    try {
      const blob = await api.adminExport(token);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `handbook-review-${new Date().toISOString().slice(0, 10)}.xlsx` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { flash(e.message); }
  }
  async function previewDigest() {
    try { setDigest(await api.adminDigest(token, "preview")); } catch (e) { flash(e.message); }
  }
  async function testDigest() {
    if (!window.confirm("Send a TEST digest to reuben.dayal@gmail.com only?")) return;
    try { await api.adminDigest(token, "test"); flash("Test digest sent to Reuben"); } catch (e) { flash(e.message); }
  }

  const volunteerText = data.volunteers.filter((v) => v.people.length)
    .map((v) => `${v.label}: ${v.people.map((p) => `${p.name} <${p.email}>`).join(", ")}`).join("\n");

  return (
    <div className="hbr adm" data-theme={THEME}>
      <div className="topbar">
        <div className="col topbar-in" style={{ maxWidth: 1100 }}>
          <div className="brand"><img src={CREST} alt="" width="30" height="34" /><b>Handbook review · Results</b></div>
          <span className={`env ${data.env === "production" ? "prod" : ""}`} title="Firebase project this deployment reads">{data.project}</span>
          <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
        </div>
      </div>

      <main className="col adm-body" style={{ maxWidth: 1100 }}>
        <section className="adm-head card">
          <div className="kpis">
            <Kpi value={kpis.started} label="Started" />
            <Kpi value={kpis.completed} label="Completed 13/13" />
            <Kpi value={`${kpis.completionPct}%`} label="Completion" />
            <Kpi value={kpis.daysLeft} label="Days left" />
          </div>
          <div className="adm-count">
            <Countdown deadline={deadline} size="sm" />
            <span className={`pill ${config.closed ? "closed" : "open"}`}>{config.closed ? (config.open ? "Deadline passed" : "Closed") : "Open"}</span>
          </div>
        </section>

        <div className="adm-grid">
          <section className="card stack">
            <h2 className="adm-h">Per part</h2>
            <PartBars perPart={data.perPart} active={partFilter} onPick={setPartFilter} />
          </section>

          <section className="card stack">
            <div className="adm-h-row">
              <h2 className="adm-h">Comments <small>{comments.length}</small></h2>
              {partFilter ? <button className="linkbtn" onClick={() => setPartFilter(0)}>Part {partFilter} ✕</button> : null}
            </div>
            <div className="filters">
              <select className="input" value={partFilter} onChange={(e) => setPartFilter(Number(e.target.value))} aria-label="Filter by part">
                <option value={0}>All parts</option>
                {PARTS.map((p) => <option key={p.id} value={p.id}>Part {p.id} · {p.title}</option>)}
              </select>
              <select className="input" value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)} aria-label="Filter by verdict">
                <option value="">All verdicts</option>
                {Object.entries(VERDICT_META).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
              </select>
              <input className="input" type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search comments" />
            </div>
            <div className="feed">
              {comments.length === 0 && <p className="muted">No comments match.</p>}
              {comments.map((c, i) => (
                <article key={i} className={`cmt ${c.verdict}`}>
                  <header><span className={`chip-v ${c.verdict}`}>{VERDICT_META[c.verdict].emoji} {VERDICT_META[c.verdict].short}</span>
                    <b>Part {c.part}</b><span className="muted">{c.name} · {ROLE_LABEL[c.roleGroup] || c.roleGroup} · {formatDate(c.updatedAt)}</span></header>
                  {c.change && <p><em>Change:</em> {c.change}</p>}
                  {c.notOk && <p><em>Not OK:</em> {c.notOk}</p>}
                  {c.fix && <p><em>Would work if:</em> {c.fix}</p>}
                </article>
              ))}
            </div>
          </section>

          <section className="card stack">
            <div className="adm-h-row">
              <h2 className="adm-h">Volunteers</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => copy(volunteerText, flash)} disabled={!volunteerText}>Copy list</button>
            </div>
            {data.volunteers.map((v, i) => (
              <React.Fragment key={`${v.group}${v.label}`}>
              {(i === 0 || data.volunteers[i - 1].group !== v.group) && <h3 className="vol-group">{v.group === "Roles" ? "Roles (Parts 7, 8, 9, 12)" : "Committees (Part 6)"}</h3>}
              <div className="vol">
                <b>{v.label} <small>{v.people.length}</small></b>
                <span className="muted">{v.people.length ? v.people.map((p) => `${p.name} (${p.email})`).join(", ") : "—"}</span>
              </div>
              </React.Fragment>
            ))}
          </section>

          <section className="card stack">
            <h2 className="adm-h">Anything we missed <small>{data.missed.length}</small></h2>
            {data.missed.length === 0 && <p className="muted">Nothing yet.</p>}
            {data.missed.map((m, i) => (
              <article key={i} className="cmt"><header><b>{m.name}</b><span className="muted">{ROLE_LABEL[m.roleGroup] || m.roleGroup} · {formatDate(m.updatedAt)}</span></header><p>{m.text}</p></article>
            ))}
          </section>

          <section className="card stack wide">
            <h2 className="adm-h">Respondents <small>{data.respondents.length}</small></h2>
            <div className="tbl-scroll">
              <table className="adm-tbl">
                <thead><tr><th>Name</th><th>Role</th><th>Progress</th><th>Last activity</th><th>Email</th></tr></thead>
                <tbody>
                  {data.respondents.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.name}</b></td>
                      <td>{ROLE_LABEL[r.roleGroup] || r.roleGroup}</td>
                      <td><span className="prog"><i style={{ width: `${(r.doneCount / 13) * 100}%` }} /></span> {r.doneCount}/13{r.draftCount ? ` · ${r.draftCount} draft` : ""}</td>
                      <td>{fmtTime(r.lastActivity)}</td>
                      <td className="muted">{r.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card stack wide">
            <h2 className="adm-h">Controls</h2>
            <div className="controls">
              <div className="ctl">
                <span className="lbl">Review is {config.open ? "open" : "closed"}</span>
                <button className={`btn btn-sm ${config.open ? "btn-ghost" : "btn-primary"}`} onClick={() => setOpen(!config.open)}>{config.open ? "Close review" : "Open review"}</button>
              </div>
              <div className="ctl">
                <label className="lbl" htmlFor="adm-dl">Deadline (ISO, Copenhagen offset)</label>
                <div className="linkbox"><input id="adm-dl" className="input" value={deadlineInput} onChange={(e) => setDeadlineInput(e.target.value)} /><button className="btn btn-ghost btn-sm" onClick={saveDeadline}>Save</button></div>
              </div>
              <div className="ctl">
                <span className="lbl">Export</span>
                <button className="btn btn-gold btn-sm" onClick={exportXlsx}>Export Excel</button>
              </div>
              <div className="ctl">
                <span className="lbl">Weekly digest</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost btn-sm" onClick={previewDigest}>Preview</button>
                  <button className="btn btn-ghost btn-sm" onClick={testDigest}>Send test to Reuben</button>
                </div>
              </div>
            </div>
            {digest && (
              <div className="stack">
                <p className="muted"><b>Subject:</b> {digest.subject} · <b>Would go to:</b> {digest.recipients.join(", ")}</p>
                <iframe title="Digest preview" className="digest" srcDoc={digest.html} sandbox="" />
              </div>
            )}
          </section>
        </div>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
