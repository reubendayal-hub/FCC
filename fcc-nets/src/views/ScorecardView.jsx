// src/views/ScorecardView.jsx
// FCC Scorecard — navy / red / gold brand redesign
// Hero summary tile, collapsible per-innings cards with batting,
// bowling (econ bar), fall-of-wickets timeline, extras line.

import { useState, useEffect, useMemo } from "react";

const SC = {
  bg: "#F8F6F0",
  surface: "#FFFFFF",
  surfaceDk: "#111E35",
  navy: "#1B2A5C",
  navyDk: "#152043",
  red: "#C0392B",
  redDk: "#961C15",
  gold: "#C9A84C",
  goldLt: "#F0D060",
  text: "#1B2A5C",
  textDim: "#5C6B8F",
  textMuted: "#8A95B0",
  green: "#27AE60",
  border: "rgba(27,42,92,0.08)",
  borderMid: "rgba(27,42,92,0.15)",
};

// ── Avatar (hue from name) ────────────────────────────────────
function Avatar({ name, size = 36, nightMode }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const hue = name
    ? name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360
    : 200;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `hsl(${hue},45%,${nightMode ? 34 : 44}%)`,
      border: `1.5px solid rgba(201,168,76,0.45)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color: "#FFFFFF",
      letterSpacing: 0.4,
    }}>{initials}</div>
  );
}

// ── Batting row ───────────────────────────────────────────────
function BattingRow({ b, isTopScorer, nightMode }) {
  const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "—";
  const text = nightMode ? "#FFFFFF" : SC.text;
  const dim = nightMode ? "rgba(255,255,255,0.55)" : SC.textDim;
  const muted = nightMode ? "rgba(255,255,255,0.4)" : SC.textMuted;
  const isOut = !!b.dismissal && !b.notOut;
  const caption = b.notOut
    ? "not out"
    : (b.dismissal || (isOut ? "out" : ""));
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 14px",
      borderBottom: isTopScorer ? `2px solid ${SC.gold}` : `1px solid ${SC.border}`,
    }}>
      <Avatar name={b.name} size={36} nightMode={nightMode} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {b.name}
          {b.captain && <span style={{ marginLeft: 4, color: SC.gold, fontSize: 11, fontWeight: 800 }}>(c)</span>}
          {b.keeper && <span style={{ marginLeft: 4, color: SC.gold, fontSize: 12 }}>†</span>}
        </div>
        <div style={{
          fontSize: 11, marginTop: 1,
          color: b.notOut ? SC.green : muted,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          fontStyle: b.notOut ? "normal" : "italic",
          fontWeight: b.notOut ? 600 : 400,
        }}>{caption}</div>
      </div>
      <div style={{ width: 32, textAlign: "right", fontSize: 14, fontWeight: 800,
        fontVariantNumeric: "tabular-nums", color: text }}>{b.runs ?? 0}</div>
      <div style={{ width: 32, textAlign: "right", fontSize: 12,
        fontVariantNumeric: "tabular-nums", color: dim }}>{b.balls ?? 0}</div>
      <div style={{ width: 28, textAlign: "right", fontSize: 12,
        fontVariantNumeric: "tabular-nums", color: dim }}>{b.fours ?? 0}</div>
      <div style={{ width: 28, textAlign: "right", fontSize: 12,
        fontVariantNumeric: "tabular-nums",
        color: (b.sixes || 0) > 0 ? SC.gold : dim }}>{b.sixes ?? 0}</div>
      <div style={{ width: 44, textAlign: "right", fontSize: 11,
        fontVariantNumeric: "tabular-nums", color: dim }}>{sr}</div>
    </div>
  );
}

function BattingHeader({ nightMode }) {
  const head = nightMode ? "rgba(255,255,255,0.55)" : SC.textMuted;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "6px 14px",
      background: nightMode ? "rgba(255,255,255,0.04)" : "#FAF7EE",
      borderBottom: `1px solid ${SC.border}`,
    }}>
      <div style={{ width: 36, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 10, fontWeight: 700,
        letterSpacing: 0.6, textTransform: "uppercase", color: head }}>Batter</div>
      <div style={{ width: 32, textAlign: "right", fontSize: 10,
        fontWeight: 700, color: head }}>R</div>
      <div style={{ width: 32, textAlign: "right", fontSize: 10,
        fontWeight: 700, color: head }}>B</div>
      <div style={{ width: 28, textAlign: "right", fontSize: 10,
        fontWeight: 700, color: head }}>4s</div>
      <div style={{ width: 28, textAlign: "right", fontSize: 10,
        fontWeight: 700, color: head }}>6s</div>
      <div style={{ width: 44, textAlign: "right", fontSize: 10,
        fontWeight: 700, color: head }}>SR</div>
    </div>
  );
}

// ── Bowling row (econ bar background) ─────────────────────────
function BowlingRow({ b, nightMode }) {
  const text = nightMode ? "#FFFFFF" : SC.text;
  const dim = nightMode ? "rgba(255,255,255,0.55)" : SC.textDim;
  const oversNum = typeof b.overs === "number"
    ? b.overs
    : (() => {
        const m = /^(\d+)(?:\.(\d+))?$/.exec(String(b.overs ?? "0"));
        return m ? parseInt(m[1], 10) + (parseInt(m[2] || "0", 10) / 6) : 0;
      })();
  const econ = oversNum > 0 ? (b.runs || 0) / oversNum : 0;
  const econText = oversNum > 0 ? econ.toFixed(2) : "—";
  const econColor = econ < 6 ? SC.gold : econ <= 9 ? "#888888" : SC.red;
  const econPct = Math.min(econ / 15, 1) * 100;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 14px",
      borderBottom: `1px solid ${SC.border}`,
    }}>
      <Avatar name={b.name} size={36} nightMode={nightMode} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{b.name}</div>
        {((b.wides || 0) > 0 || (b.noballs || 0) > 0) && (
          <div style={{ fontSize: 10, color: nightMode ? "rgba(255,255,255,0.4)" : SC.textMuted, marginTop: 1 }}>
            {b.wides > 0 ? `${b.wides}w` : ""}{b.wides > 0 && b.noballs > 0 ? " · " : ""}{b.noballs > 0 ? `${b.noballs}nb` : ""}
          </div>
        )}
      </div>
      <div style={{ width: 38, textAlign: "right", fontSize: 13,
        fontVariantNumeric: "tabular-nums", color: dim }}>{b.overs ?? "0"}</div>
      <div style={{ width: 24, textAlign: "right", fontSize: 13,
        fontVariantNumeric: "tabular-nums",
        color: (b.maidens || 0) > 0 ? SC.gold : dim }}>{b.maidens || 0}</div>
      <div style={{ width: 30, textAlign: "right", fontSize: 13,
        fontVariantNumeric: "tabular-nums", color: dim }}>{b.runs || 0}</div>
      <div style={{ width: 24, textAlign: "right", fontSize: 13, fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        color: (b.wickets || 0) > 0 ? SC.gold : text }}>{b.wickets || 0}</div>
      <div style={{ width: 56, position: "relative", height: 22, flexShrink: 0,
        borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          width: `${econPct}%`, background: econColor, opacity: 0.18,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          paddingRight: 4,
          fontSize: 11, fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: text,
        }}>{econText}</div>
      </div>
    </div>
  );
}

function BowlingHeader({ nightMode }) {
  const head = nightMode ? "rgba(255,255,255,0.55)" : SC.textMuted;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "6px 14px",
      background: nightMode ? "rgba(255,255,255,0.04)" : "#FAF7EE",
      borderBottom: `1px solid ${SC.border}`,
    }}>
      <div style={{ width: 36, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 10, fontWeight: 700,
        letterSpacing: 0.6, textTransform: "uppercase", color: head }}>Bowler</div>
      <div style={{ width: 38, textAlign: "right", fontSize: 10, fontWeight: 700, color: head }}>O</div>
      <div style={{ width: 24, textAlign: "right", fontSize: 10, fontWeight: 700, color: head }}>M</div>
      <div style={{ width: 30, textAlign: "right", fontSize: 10, fontWeight: 700, color: head }}>R</div>
      <div style={{ width: 24, textAlign: "right", fontSize: 10, fontWeight: 700, color: head }}>W</div>
      <div style={{ width: 56, textAlign: "right", fontSize: 10, fontWeight: 700, color: head }}>Econ</div>
    </div>
  );
}

// ── Fall of wickets — horizontal navy timeline ────────────────
function FallOfWicketsTimeline({ fow = [], nightMode }) {
  const [openIdx, setOpenIdx] = useState(null);
  if (!fow.length) return null;
  // Layout: dot positions evenly spaced; wrap to a 2nd row after 6.
  const rows = [];
  for (let i = 0; i < fow.length; i += 6) rows.push(fow.slice(i, i + 6));
  const muted = nightMode ? "rgba(255,255,255,0.45)" : SC.textMuted;
  const dim = nightMode ? "rgba(255,255,255,0.65)" : SC.textDim;
  return (
    <div style={{ padding: "12px 14px 8px" }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: muted,
        letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10,
      }}>Fall of Wickets</div>
      {rows.map((rowItems, rowIdx) => {
        const w = 100;
        return (
          <svg key={rowIdx} viewBox="0 0 100 36"
            style={{ width: "100%", height: 44, display: "block", marginBottom: 6, overflow: "visible" }}
            preserveAspectRatio="none">
            <line x1="2" y1="12" x2={w - 2} y2="12" stroke={SC.navy} strokeWidth="2" strokeLinecap="round" />
            {rowItems.map((f, i) => {
              const idx = rowIdx * 6 + i;
              const x = rowItems.length === 1 ? w / 2 : 4 + (i / (rowItems.length - 1)) * (w - 8);
              return (
                <g key={i} onClick={() => setOpenIdx(openIdx === idx ? null : idx)} style={{ cursor: "pointer" }}>
                  <circle cx={x} cy="12" r="3.2" fill={SC.gold} stroke={SC.navy} strokeWidth="0.5" />
                  <text x={x} y="28" textAnchor="middle" fontSize="4.2" fill={muted}
                    fontWeight="700" letterSpacing="0.3">
                    W{f.wicket ?? idx + 1} {f.score ?? ""}
                  </text>
                </g>
              );
            })}
          </svg>
        );
      })}
      {openIdx != null && fow[openIdx] && (
        <div style={{
          marginTop: 4, fontSize: 12, color: dim,
          padding: "4px 2px", lineHeight: 1.4,
        }}>
          <strong style={{ color: nightMode ? "#FFFFFF" : SC.text, fontWeight: 700 }}>
            {fow[openIdx].name || "—"}
          </strong>
          {fow[openIdx].dismissal ? ` ${fow[openIdx].dismissal}` : ""}
          {fow[openIdx].score != null && fow[openIdx].wicket != null
            ? `, ${fow[openIdx].score}/${fow[openIdx].wicket}` : ""}
          {fow[openIdx].over ? ` (${fow[openIdx].over} ov)` : ""}
        </div>
      )}
    </div>
  );
}

// ── Innings card (collapsible) ────────────────────────────────
function InningsCard({ innings, label, isOpen, onToggle, nightMode, fallback }) {
  const surface = nightMode ? SC.surfaceDk : SC.surface;
  const extras = innings?.extras || { b: 0, lb: 0, w: 0, nb: 0 };
  const extrasTotal = (extras.b || 0) + (extras.lb || 0) + (extras.w || 0) + (extras.nb || 0);
  const batsmen = innings?.batsmen || [];
  const topScorerRuns = batsmen.reduce((m, b) => Math.max(m, b.runs || 0), 0);
  const overs = innings?.overs ?? "—";
  const score = innings?.score ?? 0;
  const wkts = innings?.wickets ?? 0;
  return (
    <div style={{
      background: surface,
      border: `1px solid ${nightMode ? "rgba(201,168,76,0.25)" : SC.border}`,
      borderRadius: 12, overflow: "hidden", marginBottom: 12,
      boxShadow: nightMode ? "0 4px 18px rgba(0,0,0,0.35)" : "0 4px 18px rgba(27,42,92,0.08)",
    }}>
      <div onClick={onToggle} style={{
        background: `linear-gradient(90deg, ${SC.navy}, ${SC.redDk})`,
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10,
        cursor: "pointer", userSelect: "none",
        color: "#FFFFFF",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#FFFFFF",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
          {!fallback && (
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              {score}/{wkts} ({overs} overs)
            </div>
          )}
        </div>
        <div style={{ fontSize: 18, color: "#FFFFFF", lineHeight: 1, padding: "0 4px" }}>
          {isOpen ? "▾" : "▸"}
        </div>
      </div>
      {isOpen && (
        <div>
          {fallback ? (
            <div style={{
              padding: "30px 18px", textAlign: "center",
              color: nightMode ? "rgba(255,255,255,0.55)" : SC.textMuted,
              fontSize: 13, fontStyle: "italic",
            }}>{fallback}</div>
          ) : (
            <>
              {batsmen.length > 0 ? (
                <>
                  <BattingHeader nightMode={nightMode} />
                  {batsmen.map((b, i) => (
                    <BattingRow
                      key={i} b={b}
                      isTopScorer={topScorerRuns > 0 && (b.runs || 0) === topScorerRuns}
                      nightMode={nightMode}
                    />
                  ))}
                </>
              ) : (
                <div style={{
                  padding: "26px 18px", textAlign: "center",
                  color: nightMode ? "rgba(255,255,255,0.55)" : SC.textMuted,
                  fontSize: 13, fontStyle: "italic",
                }}>No balls bowled yet</div>
              )}
              {(innings?.bowling || []).length > 0 && (
                <>
                  <BowlingHeader nightMode={nightMode} />
                  {(innings.bowling || []).map((b, i) => (
                    <BowlingRow key={i} b={b} nightMode={nightMode} />
                  ))}
                </>
              )}
              <FallOfWicketsTimeline fow={innings?.fow || []} nightMode={nightMode} />
              <div style={{
                fontSize: 12, padding: "8px 16px 14px",
                color: nightMode ? "rgba(255,255,255,0.5)" : SC.textMuted,
                borderTop: `1px solid ${SC.border}`,
                fontVariantNumeric: "tabular-nums",
              }}>
                Extras (b {extras.b || 0}, lb {extras.lb || 0}, w {extras.w || 0}, nb {extras.nb || 0}) {extrasTotal}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Hero summary tile ─────────────────────────────────────────
function HeroSummary({ match }) {
  const inn1 = match.innings1 || null;
  const inn2 = match.innings2 || null;
  const team1 = match.team1 || "Team 1";
  const team2 = match.team2 || "Team 2";
  const isLive = match.status === "live";
  const isComplete = match.status === "completed";

  // Result line
  let resultLine = "";
  if (isComplete) {
    if (match.result) {
      resultLine = match.result;
    } else if (inn1 && inn2) {
      const s1 = inn1.score || 0;
      const s2 = inn2.score || 0;
      if (s2 > s1) {
        const wktsLeft = 10 - (inn2.wickets || 0);
        resultLine = `${inn2.team || team2} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
      } else if (s1 > s2) {
        resultLine = `${inn1.team || team1} won by ${s1 - s2} run${s1 - s2 === 1 ? "" : "s"}`;
      } else {
        resultLine = "Match tied";
      }
    } else {
      resultLine = "Match concluded";
    }
  } else if (isLive) {
    resultLine = inn2 ? "2nd innings in progress" : "1st innings in progress";
  } else if (inn1 && !inn2) {
    resultLine = "1st innings in progress";
  } else {
    resultLine = match.status ? match.status.toUpperCase() : "Match scheduled";
  }

  function TeamTotal({ teamName, innings }) {
    const score = innings?.score ?? "—";
    const wkts = innings?.wickets ?? "—";
    const overs = innings?.overs ?? "—";
    return (
      <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: "rgba(255,255,255,0.55)",
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 4,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{teamName}</div>
        <div style={{
          fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: -1,
          fontVariantNumeric: "tabular-nums",
          background: "linear-gradient(135deg, #FFFFFF 0%, #F0D060 100%)",
          backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>{score}{innings ? <span style={{ fontSize: 22, opacity: 0.7 }}>/{wkts}</span> : null}</div>
        {innings && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4,
            fontVariantNumeric: "tabular-nums" }}>
            ({overs} ov)
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
      border: `1.5px solid rgba(201,168,76,0.4)`,
      borderRadius: 14, padding: 20,
      boxShadow: "0 6px 22px rgba(27,42,92,0.35)",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
        <TeamTotal teamName={team1} innings={inn1} />
        <div style={{
          width: 1, alignSelf: "stretch",
          background: "rgba(201,168,76,0.3)",
        }} />
        <TeamTotal teamName={team2} innings={inn2} />
      </div>
      <div style={{
        marginTop: 14, textAlign: "center",
        display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
      }}>
        {isLive && (
          <>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: SC.red,
              display: "inline-block",
              animation: "scPulse 1.4s ease-in-out infinite",
            }} />
            <span style={{
              fontSize: 11, fontWeight: 800, color: SC.gold,
              textTransform: "uppercase", letterSpacing: 1.5,
            }}>LIVE</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          </>
        )}
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: SC.gold, textTransform: "uppercase", letterSpacing: 1.5,
        }}>{resultLine}</div>
      </div>
      <div style={{
        marginTop: 12, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6,
      }}>
        {match.date && <Chip>{match.date}</Chip>}
        {match.overs && <Chip>{match.overs} overs</Chip>}
        {match.venue && <Chip>{match.venue}</Chip>}
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)",
      background: "rgba(255,255,255,0.08)",
      padding: "3px 8px", borderRadius: 999,
      textTransform: "uppercase", letterSpacing: 0.6,
    }}>{children}</div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function ScorecardView({ match, onBack }) {
  const [nightMode, setNightMode] = useState(() => {
    try { return localStorage.getItem("fcc-scorer-night") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("fcc-scorer-night", nightMode ? "1" : "0"); } catch {}
  }, [nightMode]);

  const [openMap, setOpenMap] = useState({ 1: true, 2: true });

  const safe = match || {};
  const inn1 = safe.innings1 || null;
  const inn2 = safe.innings2 || null;
  const team1 = safe.team1 || "Team 1";
  const team2 = safe.team2 || "Team 2";

  // 2nd-innings fallback content
  const inn2Fallback = useMemo(() => {
    if (inn2) return null;
    if (inn1 && typeof inn1.score === "number") {
      return `Yet to bat — target ${(inn1.score || 0) + 1}`;
    }
    return null;
  }, [inn1, inn2]);

  // Theme tokens
  const pageBg = nightMode ? "#0A1428" : SC.bg;
  const text = nightMode ? "#FFFFFF" : SC.text;

  if (!match) {
    return (
      <div style={{
        background: pageBg, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: nightMode ? "rgba(255,255,255,0.55)" : SC.textMuted,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}>No scorecard data</div>
    );
  }

  return (
    <div style={{
      background: pageBg, minHeight: "100vh",
      color: text,
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      transition: "background 0.25s",
    }}>
      <style>{`
        @keyframes scPulse { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.45; transform:scale(0.85)} }
      `}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 12px 40px" }}>
        {/* Header row with back arrow + day/night */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 12, padding: "4px 2px",
        }}>
          <div onClick={onBack} style={{
            fontSize: 24, color: nightMode ? SC.goldLt : SC.navy,
            cursor: "pointer", lineHeight: 1, padding: "0 6px",
            userSelect: "none",
          }}>‹</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontSize: 11, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: 1.5,
              color: nightMode ? SC.goldLt : SC.navy,
            }}>Scorecard</div>
          </div>
          <div onClick={() => setNightMode(n => !n)} style={{
            position: "relative", width: 60, height: 24, borderRadius: 14,
            background: nightMode ? "rgba(255,255,255,0.1)" : "rgba(27,42,92,0.08)",
            border: `1px solid ${nightMode ? "rgba(255,255,255,0.15)" : SC.borderMid}`,
            cursor: "pointer", userSelect: "none", flexShrink: 0,
          }}>
            <div style={{
              position: "absolute", top: 1, left: nightMode ? 34 : 1,
              width: 24, height: 20, borderRadius: 11,
              background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, transition: "left 0.22s ease",
            }}>{nightMode ? "🌙" : "☀️"}</div>
          </div>
        </div>

        {/* Hero summary tile */}
        <HeroSummary match={safe} />

        {/* Innings 1 */}
        <InningsCard
          innings={inn1}
          label={`${(inn1?.team) || team1} innings`}
          isOpen={!!openMap[1]}
          onToggle={() => setOpenMap(m => ({ ...m, 1: !m[1] }))}
          nightMode={nightMode}
          fallback={!inn1 || (!inn1.batsmen || inn1.batsmen.length === 0) && (!inn1.score || inn1.score === 0)
            ? "No balls bowled yet" : null}
        />

        {/* Innings 2 */}
        <InningsCard
          innings={inn2}
          label={`${(inn2?.team) || team2} innings`}
          isOpen={!!openMap[2]}
          onToggle={() => setOpenMap(m => ({ ...m, 2: !m[2] }))}
          nightMode={nightMode}
          fallback={inn2Fallback}
        />
      </div>
    </div>
  );
}
