// src/views/ScorecardView.jsx
// FCC Scorecard — navy, red, gold club colour theme
// Batting card, bowling figures, fall of wickets
// Matches layout of reference images but in FCC colours

import React, { useState } from "react";

const SC = {
  bg:        "#0A1628",
  surface:   "#111E35",
  row:       "#152240",
  rowAlt:    "#0E1A30",
  header:    "#C0392B",
  headerDk:  "#961C15",
  border:    "rgba(255,255,255,0.08)",
  gold:      "#C9A84C",
  goldLt:    "#F0D060",
  white:     "#FFFFFF",
  dim:       "rgba(255,255,255,0.6)",
  muted:     "rgba(255,255,255,0.35)",
  navy:      "#1B2A5C",
  navyLt:    "#2A3F7A",
  green:     "#27AE60",
};

function Avatar({ name, size = 36 }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const hue = name
    ? name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360
    : 200;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `hsl(${hue},35%,32%)`,
      border: `1.5px solid ${SC.gold}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color: SC.white,
    }}>
      {initials}
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{
      background: `linear-gradient(90deg, ${SC.header} 0%, ${SC.headerDk} 100%)`,
      padding: "10px 14px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      borderBottom: `2px solid ${SC.gold}60`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: SC.white }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{sub}</div>}
    </div>
  );
}

function BattingCard({ inningsLabel, batsmen = [], extras = {}, total = {}, dnb = [] }) {
  const sr = (runs, balls) => balls > 0 ? ((runs / balls) * 100).toFixed(2) : "—";
  return (
    <div style={{ background: SC.bg, borderRadius: 10, overflow: "hidden", marginBottom: 16,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
      <SectionHeader title={inningsLabel} />
      <div style={{ display: "flex", alignItems: "center", padding: "6px 14px",
        background: SC.navy, borderBottom: `1px solid ${SC.border}` }}>
        <div style={{ width: 36, flexShrink: 0 }} />
        <div style={{ flex: 1, marginLeft: 10 }} />
        {["R","B","4s","6s","SR"].map(col => (
          <div key={col} style={{ width: col === "SR" ? 52 : 30,
            textAlign: "right", fontSize: 11, fontWeight: 700,
            color: SC.gold, flexShrink: 0 }}>{col}</div>
        ))}
      </div>
      {batsmen.map((b, i) => {
        const strikeRate = sr(b.runs, b.balls);
        const isFifty   = b.runs >= 50 && b.runs < 100;
        const isCentury = b.runs >= 100;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center",
            padding: "10px 14px", gap: 10,
            background: i % 2 === 0 ? SC.row : SC.rowAlt,
            borderBottom: `1px solid ${SC.border}` }}>
            <Avatar name={b.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700,
                color: isCentury ? SC.goldLt : SC.white,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {b.name}{b.notOut ? "*" : ""}
                {isFifty   && <span style={{ marginLeft: 5, fontSize: 10, color: SC.gold,   fontWeight: 700 }}>50</span>}
                {isCentury && <span style={{ marginLeft: 5, fontSize: 10, color: SC.goldLt, fontWeight: 700 }}>100</span>}
              </div>
              <div style={{ fontSize: 11, color: b.notOut ? SC.green : SC.dim,
                marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {b.notOut ? "not out" : (b.dismissal || "—")}
              </div>
            </div>
            <div style={{ width: 30, textAlign: "right", fontSize: 15, fontWeight: 800, flexShrink: 0,
              color: isCentury ? SC.goldLt : isFifty ? SC.gold : SC.white }}>{b.runs ?? "—"}</div>
            <div style={{ width: 30, textAlign: "right", fontSize: 12, color: SC.dim, flexShrink: 0 }}>{b.balls ?? "—"}</div>
            <div style={{ width: 30, textAlign: "right", fontSize: 12, color: SC.dim, flexShrink: 0 }}>{b.fours ?? 0}</div>
            <div style={{ width: 30, textAlign: "right", fontSize: 12, flexShrink: 0,
              color: (b.sixes || 0) > 0 ? SC.gold : SC.dim }}>{b.sixes ?? 0}</div>
            <div style={{ width: 52, textAlign: "right", fontSize: 11, color: SC.dim, flexShrink: 0 }}>{strikeRate}</div>
          </div>
        );
      })}
      <div style={{ display: "flex", alignItems: "center", padding: "9px 14px",
        background: SC.surface, borderBottom: `1px solid ${SC.border}` }}>
        <div style={{ width: 36, flexShrink: 0 }} />
        <div style={{ flex: 1, marginLeft: 10 }}>
          <div style={{ fontSize: 13, color: SC.dim }}>Extras</div>
          <div style={{ fontSize: 11, color: SC.muted, marginTop: 1 }}>
            (b {extras.b||0} lb {extras.lb||0} w {extras.w||0} nb {extras.nb||0})
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: SC.white }}>
          {(extras.b||0)+(extras.lb||0)+(extras.w||0)+(extras.nb||0)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px",
        background: SC.navy, borderBottom: `1px solid ${SC.gold}40` }}>
        <div style={{ width: 36, flexShrink: 0 }} />
        <div style={{ flex: 1, marginLeft: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: SC.white }}>Total</div>
          <div style={{ fontSize: 11, color: SC.dim, marginTop: 1 }}>
            ({total.wickets} wicket{total.wickets !== 1 ? "s" : ""}, {total.overs} overs)
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: SC.goldLt }}>{total.runs}</div>
      </div>
      {dnb.length > 0 && (
        <div style={{ padding: "8px 14px 10px", background: SC.surface }}>
          <span style={{ fontSize: 11, color: SC.muted }}>Did not bat: </span>
          <span style={{ fontSize: 11, color: SC.dim }}>{dnb.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

function BowlingCard({ bowlers = [] }) {
  return (
    <div style={{ background: SC.bg, borderRadius: 10, overflow: "hidden", marginBottom: 16,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
      <div style={{ background: `linear-gradient(90deg, ${SC.header} 0%, ${SC.headerDk} 100%)`,
        borderBottom: `2px solid ${SC.gold}60`,
        display: "flex", alignItems: "center", padding: "10px 14px", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: SC.white, flex: 1 }}>Bowling</div>
        {["O","M","Dot","R","W","Econ"].map(col => (
          <div key={col} style={{ width: col === "Econ" ? 44 : col === "Dot" ? 36 : 30,
            textAlign: "right", fontSize: 11, fontWeight: 700, color: SC.white, flexShrink: 0 }}>{col}</div>
        ))}
      </div>
      {bowlers.map((b, i) => {
        const isPicet  = (b.wickets || 0) >= 3;
        const isMaiden = (b.maidens || 0) > 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center",
            padding: "10px 14px", gap: 10,
            background: i % 2 === 0 ? SC.row : SC.rowAlt,
            borderBottom: `1px solid ${SC.border}` }}>
            <Avatar name={b.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700,
                color: isPicet ? SC.goldLt : SC.white,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
              {((b.wides || 0) > 0 || (b.noballs || 0) > 0) && (
                <div style={{ fontSize: 10, color: SC.muted, marginTop: 1 }}>
                  ({b.wides > 0 ? `${b.wides}w` : ""}{b.noballs > 0 ? ` ${b.noballs}nb` : ""})
                </div>
              )}
            </div>
            <div style={{ width: 30, textAlign: "right", fontSize: 13, color: SC.dim, flexShrink: 0 }}>{b.overs || "0"}</div>
            <div style={{ width: 30, textAlign: "right", fontSize: 13, flexShrink: 0,
              color: isMaiden ? SC.gold : SC.dim }}>{b.maidens || 0}</div>
            <div style={{ width: 36, textAlign: "right", fontSize: 13, color: SC.dim, flexShrink: 0 }}>{b.dots || 0}</div>
            <div style={{ width: 30, textAlign: "right", fontSize: 13, color: SC.dim, flexShrink: 0 }}>{b.runs || 0}</div>
            <div style={{ width: 30, textAlign: "right", fontSize: 14, fontWeight: 800, flexShrink: 0,
              color: isPicet ? SC.goldLt : (b.wickets > 0 ? SC.gold : SC.white) }}>{b.wickets || 0}</div>
            <div style={{ width: 44, textAlign: "right", fontSize: 12, color: SC.dim, flexShrink: 0 }}>
              {b.overs > 0 ? (b.runs / parseFloat(b.overs)).toFixed(2) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FallOfWickets({ fow = [] }) {
  if (fow.length === 0) return null;
  return (
    <div style={{ background: SC.bg, borderRadius: 10, overflow: "hidden", marginBottom: 16,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
      <SectionHeader title="Fall of Wickets" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 8, padding: 10, background: SC.surface }}>
        {fow.map((f, i) => (
          <div key={i} style={{ background: SC.row, borderRadius: 8, padding: "10px 12px",
            border: `1px solid ${SC.border}`,
            display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={f.name} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: SC.white,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {f.name?.split(" ").map((w, i2) => i2 === 0 ? w : w[0]).join(" ")}
              </div>
              <div style={{ fontSize: 11, color: SC.gold, marginTop: 2 }}>
                {f.wicket} - {f.score} , Over {f.over}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScorecardView({ match, onBack }) {
  const [tab, setTab] = useState(match?.innings2 ? "innings2" : "innings1");
  if (!match) {
    return (
      <div style={{ background: SC.bg, minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center", color: SC.dim }}>
        No scorecard data
      </div>
    );
  }
  const inn1 = match.innings1 || {};
  const inn2 = match.innings2 || null;
  const hasBothInnings = !!inn2;
  return (
    <div style={{ background: SC.bg, minHeight: "100vh",
      fontFamily: "-apple-system,BlinkMacSystemFont,'DM Sans',sans-serif" }}>
      <div style={{ background: `linear-gradient(135deg, ${SC.navy} 0%, #0D1B3E 100%)`,
        padding: "14px 16px 0", borderBottom: `3px solid ${SC.gold}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)",
              border: "none", color: SC.white, fontSize: 18, cursor: "pointer",
              borderRadius: 8, width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0 }}>←</button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: SC.white,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {match.title || `${match.team1} vs ${match.team2}`}
            </div>
            <div style={{ fontSize: 11, color: SC.dim, marginTop: 2 }}>
              {match.date}{match.venue ? ` · ${match.venue}` : ""} · {match.overs} ov
            </div>
          </div>
        </div>
        <div style={{ display: "flex", background: "rgba(0,0,0,0.25)",
          borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
          <div style={{ flex: 1, padding: "8px 14px",
            borderRight: hasBothInnings ? `1px solid ${SC.border}` : "none" }}>
            <div style={{ fontSize: 11, color: SC.dim, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: 0.5 }}>{match.team1}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: SC.white, lineHeight: 1.2, marginTop: 2 }}>
              {inn1.score ?? "—"}<span style={{ fontSize: 14, color: SC.dim }}>/{inn1.wickets ?? "—"}</span>
              <span style={{ fontSize: 12, color: SC.dim, fontWeight: 400, marginLeft: 6 }}>({inn1.overs ?? "—"} ov)</span>
            </div>
          </div>
          {hasBothInnings && (
            <div style={{ flex: 1, padding: "8px 14px" }}>
              <div style={{ fontSize: 11, color: SC.dim, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: 0.5 }}>{match.team2}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: SC.white, lineHeight: 1.2, marginTop: 2 }}>
                {inn2.score ?? "—"}<span style={{ fontSize: 14, color: SC.dim }}>/{inn2.wickets ?? "—"}</span>
                <span style={{ fontSize: 12, color: SC.dim, fontWeight: 400, marginLeft: 6 }}>({inn2.overs ?? "—"} ov)</span>
              </div>
            </div>
          )}
        </div>
        {match.result && (
          <div style={{ background: SC.header, padding: "7px 14px",
            fontSize: 12, fontWeight: 700, color: SC.white,
            borderTop: `1px solid ${SC.gold}40` }}>{match.result}</div>
        )}
        {hasBothInnings && (
          <div style={{ display: "flex" }}>
            {[
              { id: "innings1", label: `${match.team1} batting` },
              { id: "innings2", label: `${match.team2} batting` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "9px 8px", border: "none", cursor: "pointer",
                background: tab === t.id ? SC.gold : "transparent",
                color: tab === t.id ? SC.navy : SC.dim,
                fontSize: 12, fontWeight: 700,
                borderBottom: tab === t.id ? "none" : `2px solid ${SC.border}`,
                transition: "all .15s" }}>{t.label}</button>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 12px 40px" }}>
        {(tab === "innings1" || !hasBothInnings) && (
          <>
            <BattingCard
              inningsLabel={`${match.team1} innings${inn1.target ? ` (target: ${inn1.target} runs from ${match.overs} overs)` : ""}`}
              batsmen={inn1.batsmen || []} extras={inn1.extras || {}}
              total={{ runs: inn1.score, wickets: inn1.wickets, overs: inn1.overs }}
              dnb={inn1.dnb || []} />
            <BowlingCard bowlers={inn1.bowling || []} />
            <FallOfWickets fow={inn1.fow || []} />
          </>
        )}
        {tab === "innings2" && inn2 && (
          <>
            <BattingCard
              inningsLabel={`${match.team2} innings${inn2.target ? ` (target: ${inn2.target} runs from ${match.overs} overs)` : ""}`}
              batsmen={inn2.batsmen || []} extras={inn2.extras || {}}
              total={{ runs: inn2.score, wickets: inn2.wickets, overs: inn2.overs }}
              dnb={inn2.dnb || []} />
            <BowlingCard bowlers={inn2.bowling || []} />
            <FallOfWickets fow={inn2.fow || []} />
          </>
        )}
      </div>
    </div>
  );
}
