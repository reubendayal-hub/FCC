import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// ── Palette ───────────────────────────────────────────────────
const SC = {
  bg:"#F8F6F0", bgDark:"#0A1428",
  surface:"#FFFFFF", surfaceDk:"#111E35",
  navy:"#1B2A5C", navyDk:"#152043",
  red:"#C0392B", redDk:"#961C15",
  gold:"#C9A84C", goldLt:"#F0D060",
  text:"#1B2A5C", textDim:"#5C6B8F", textMuted:"#8A95B0",
  green:"#27AE60", greenLt:"#E0F2D6",
  blue:"#185FA5", blueLt:"#D6E8FA",
  border:"rgba(27,42,92,0.08)", borderMid:"rgba(27,42,92,0.15)",
};

// ── Zones / Wagon Wheel (verbatim from reference) ─────────────
const ZONES = {
  behind:     {pt:[110,10], label:"Behind",      side:"neu", shots:[{n:"Ramp/scoop",d:"Over keeper's head"},{n:"Dilscoop",d:"On knee, over keeper"},{n:"Upper cut",d:"Sliced over slips"},{n:"Reverse sweep",d:"Behind square off"}]},
  "third-man":{pt:[28,28],  label:"Third man",   side:"off", shots:[{n:"Late cut",d:"Deflected to third man"},{n:"Upper cut",d:"Sliced over gully"},{n:"Reverse sweep",d:"Swept behind square"},{n:"Outside edge",d:"Edge behind slip cordon"}]},
  point:      {pt:[8,96],   label:"Point/gully", side:"off", shots:[{n:"Square cut",d:"Short wide to point"},{n:"Square drive",d:"Wide ball to cover"},{n:"Cover drive",d:"Full ball through cover"},{n:"Upper cut",d:"Bouncer over point"}]},
  cover:      {pt:[14,150], label:"Cover",       side:"off", shots:[{n:"Cover drive",d:"Classic cover drive"},{n:"Off drive",d:"Right of straight"},{n:"Square drive",d:"Between point & cover"}]},
  "mid-off":  {pt:[38,196], label:"Mid-off",     side:"off", shots:[{n:"Off drive",d:"Toward mid-off/long-off"},{n:"Straight drive",d:"Past bowler off side"},{n:"Lofted drive",d:"Over mid-off"}]},
  straight:   {pt:[110,218],label:"Straight",    side:"neu", shots:[{n:"Straight drive",d:"Back past the bowler"},{n:"Off drive",d:"Slightly off side"},{n:"On drive",d:"Slightly leg side"},{n:"Lofted drive",d:"Over the bowler"}]},
  "on-drive": {pt:[182,196],label:"Mid-on",      side:"leg", shots:[{n:"On drive",d:"Toward mid-on/long-on"},{n:"Flick",d:"Wristy flick mid-on"},{n:"Lofted drive",d:"Over mid-on"}]},
  midwicket:  {pt:[206,150],label:"Midwicket",   side:"leg", shots:[{n:"Flick",d:"Wristy flick midwicket"},{n:"Slog sweep",d:"Lofted sweep midwicket"},{n:"Cow corner",d:"Heave deep midwicket"},{n:"Pull",d:"Short ball to midwicket"}]},
  "sq-leg":   {pt:[212,96], label:"Square leg",  side:"leg", shots:[{n:"Pull",d:"Short ball pulled square"},{n:"Hook",d:"Head-high bouncer"},{n:"Sweep",d:"Spinner to sq leg"},{n:"Flick",d:"Full ball flicked square"}]},
  "fine-leg": {pt:[192,28], label:"Fine leg",    side:"leg", shots:[{n:"Leg glance",d:"Off pads, deflected fine"},{n:"Paddle sweep",d:"Soft deflection fine"},{n:"Hook",d:"Bouncer hooked fine"},{n:"Glance",d:"Angled bat down leg"}]},
};
const ZONE_PATHS = [
  {id:"behind",    d:"M110,96 L88,4 A104,108 0 0,1 132,4 Z"},
  {id:"third-man", d:"M110,96 L30,30 A104,108 0 0,0 88,4 Z"},
  {id:"point",     d:"M110,96 L6,112 A104,108 0 0,1 30,30 Z"},
  {id:"cover",     d:"M110,96 L22,176 A104,108 0 0,1 6,112 Z"},
  {id:"mid-off",   d:"M110,96 L88,220 A104,108 0 0,1 22,176 Z"},
  {id:"straight",  d:"M110,96 L88,220 A104,108 0 0,0 132,220 Z"},
  {id:"on-drive",  d:"M110,96 L132,220 A104,108 0 0,0 198,176 Z"},
  {id:"midwicket", d:"M110,96 L198,176 A104,108 0 0,0 214,112 Z"},
  {id:"sq-leg",    d:"M110,96 L214,112 A104,108 0 0,0 190,30 Z"},
  {id:"fine-leg",  d:"M110,96 L190,30 A104,108 0 0,0 132,4 Z"},
];

// ── Commentary (verbatim) ─────────────────────────────────────
const COMMENTARY = {
  hype:{name:"Hype Man 🔥",label:"🔥",
    dot:["DEFENDED! Fortress!","Dot ball — pressure building!","Tight as a drum!"],
    one:["Quick single! Sharp running!","One and rotate — smart cricket!","Easy single, ticking along!"],
    four:["CRACKED! Racing to the rope!","FOUR! Nothing the fielder can do!","BOUNDARY! Absolutely nailed it!"],
    six:["SIX!! INTO ORBIT!! MASSIVE!!","SIX!! The crowd goes WILD!!","MAXIMUM!! Still travelling!!"],
    wide:["Gift from the bowler — WIDE!","Down the leg side, wide called!"],
    noball:["Front foot no-ball! FREE HIT!!","No-ball! FREE HIT next ball!"],
    wicket:["OUT!! STUMPS SHATTERED!!","OUT!! CAUGHT!! What a grab!!","WICKET!! Celebration time!!"],
    duck:["DUCK! 🦆 Quack quack! Zero from {name}!"],
    maiden:["MAIDEN!! The bowler is pumped!!"],
  },
  grumpy:{name:"Grumpy Legend 😤",label:"😤",
    dot:["Good ball. About time.","Dot. Back in my day every ball was.","That's how you do it."],
    one:["Single. Could've been more.","One run. Not inspiring.","Running between wickets. At least."],
    four:["Four. Should've been stopped.","Boundary. Fielding's gone soft.","Four. Lucky more than anything."],
    six:["Six. Reckless. Got away with it.","SIX. No technique whatsoever.","Six. Next time it'll go in the air."],
    wide:["Wide. Disgraceful.","Wide ball. Line and length. That's all."],
    noball:["No-ball. Can't land the front foot.","No-ball. Embarrassing."],
    wicket:["OUT. Finally.","Wicket. Good. Saw that coming.","OUT. Now maybe someone sensible bats."],
    duck:["Duck. 🦆 {name} won't be pleased."],
    maiden:["Maiden. NOW that's bowling."],
  },
  poet:{name:"Dramatic Poet ✍️",label:"✍️",
    dot:["The ball meets the bat in quiet negotiation.","A moment of stillness — the bowler's art honoured.","The leather whispers past the willow, unscathed."],
    one:["A gentle rotation of the scoreboard.","One run finds its way home, a quiet traveller.","Unhurried, purposeful — a single of patience."],
    four:["The ball races like an idea that cannot be caught.","A boundary! The rope receives it as an old friend.","Four! Willow sings, and the outfield answers."],
    six:["It soars — magnificent, defiant, into the pale sky.","Beyond the rope, beyond reason, beyond beautiful.","The ball finds the heavens. Pure. Sublime."],
    wide:["The ball strays from its path, as all things do.","A wide — intentions lost in translation."],
    noball:["The front foot oversteps. Even discipline lapses.","No-ball. A small rebellion against the laws."],
    wicket:["The curtain falls. The walk back begins.","Out! The stumps speak in the only language that matters.","Caught. Even the greatest arcs must end."],
    duck:["Zero. 🦆 {name} departs into the long silence."],
    maiden:["Six deliveries, six stories — none of them scoring. A maiden."],
  },
};

function getComm(persona, event, extras = {}) {
  const p = COMMENTARY[persona];
  if (!p) return "";
  const pool = p[event] || p.dot;
  return (pool[Math.floor(Math.random() * pool.length)] || "").replace("{name}", extras.name || "The batter");
}

function overStr(b) { return `${Math.floor(b / 6)}.${b % 6}`; }

// ── Sheet (modal wrapper) ─────────────────────────────────────
function Sheet({ title, onClose, children, noPad = false }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, background: SC.surface, borderRadius: "20px 20px 0 0", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${SC.border}`, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: SC.borderMid, borderRadius: 2, margin: "0 auto 10px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: SC.navy }}>{title}</div>
            <div onClick={onClose} style={{ fontSize: 22, color: SC.textMuted, cursor: "pointer", padding: "0 6px", lineHeight: 1 }}>✕</div>
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: noPad ? 0 : "16px 16px 32px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Celebration ───────────────────────────────────────────────
function Celebrate({ data, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  const isDuck = data.type === "duck";
  const bg =
    data.type === "win" ? `linear-gradient(135deg, ${SC.green} 0%, #1E8049 100%)` :
    data.type === "wicket" || isDuck ? `linear-gradient(135deg, ${SC.red} 0%, ${SC.redDk} 100%)` :
    data.type === "six" ? `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)` :
    `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`;
  const textColor = data.type === "six" ? SC.navy : "#FFFFFF";
  const conf =
    data.type === "six" ? [SC.gold, SC.goldLt, "#FFE066", "#FFB300"] :
    data.type === "win" ? [SC.gold, SC.green, SC.goldLt, "#FFFFFF"] :
    data.type === "wicket" || isDuck ? [SC.red, SC.redDk, "#FF7A5C", "#FFD0C0"] :
    [SC.gold, SC.goldLt, "#FFFFFF", SC.blueLt];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,20,40,0.55)" }} onClick={onDone}>
      {Array.from({ length: 36 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: `${5 + Math.random() * 90}%`, top: "-5%", width: Math.random() > 0.5 ? 12 : 7, height: Math.random() > 0.5 ? 12 : 7, borderRadius: Math.random() > 0.5 ? "50%" : 2, background: conf[i % conf.length], animation: `cfFall ${1.2 + Math.random() * 1.8}s ${Math.random() * 0.5}s ease-in forwards` }} />
      ))}
      <div style={{ background: bg, borderRadius: 28, padding: "32px 44px", textAlign: "center", boxShadow: "0 12px 60px rgba(0,0,0,0.5)", animation: "cfPop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both", maxWidth: 290, position: "relative", zIndex: 1, border: `1.5px solid ${SC.gold}` }}>
        <div style={{ fontSize: isDuck ? 64 : 60, lineHeight: 1, animation: isDuck ? "cfWaddle 0.5s infinite alternate" : data.type === "six" ? "cfShake 0.3s infinite" : "none" }}>
          {isDuck ? "🦆" : data.type === "six" ? "🚀" : data.type === "wicket" ? "💥" : data.type === "win" ? "🏆" : data.type === "four" ? "🏏" : "🎉"}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: textColor, marginTop: 10, letterSpacing: 0.5, textShadow: data.type === "six" ? "none" : "0 2px 8px rgba(0,0,0,0.3)" }}>{data.text}</div>
        {data.sub && <div style={{ fontSize: 13, color: data.type === "six" ? "rgba(27,42,92,0.7)" : "rgba(255,255,255,0.78)", marginTop: 6, lineHeight: 1.4 }}>{data.sub}</div>}
        <div style={{ fontSize: 11, color: data.type === "six" ? "rgba(27,42,92,0.45)" : "rgba(255,255,255,0.45)", marginTop: 14 }}>tap to dismiss</div>
      </div>
    </div>
  );
}

// ── Break screen ──────────────────────────────────────────────
function BreakScreen({ reason, elapsed, onResume }) {
  const icons = { drinks: "☕", rain: "🌧️", injury: "🏥", other: "⏸️" };
  const titles = { drinks: "Drinks Break", rain: "Rain Delay", injury: "Injury Stoppage", other: "Match Paused" };
  const m = Math.floor(elapsed / 60), s = elapsed % 60;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: `linear-gradient(160deg, ${SC.navy} 0%, ${SC.navyDk} 60%, ${SC.navy} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
      <div style={{ fontSize: 88, animation: "brkSway 3s ease-in-out infinite", lineHeight: 1 }}>{icons[reason] || "⏸️"}</div>
      <div style={{ textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, color: SC.goldLt }}>{titles[reason] || "Paused"}</div>
        {reason === "rain" && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            {[0,1,2,3,4].map(i => <span key={i} style={{ fontSize: 20, animation: `brkRain 1.5s ${i * 0.3}s infinite` }}>💧</span>)}
          </div>
        )}
        <div style={{ fontSize: 48, fontWeight: 900, fontVariantNumeric: "tabular-nums", letterSpacing: 3, color: SC.gold, marginTop: 8 }}>
          {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </div>
        <div style={{ fontSize: 12, opacity: 0.45, marginTop: 4 }}>elapsed</div>
      </div>
      <button onClick={onResume} style={{ marginTop: 16, padding: "15px 44px", borderRadius: 16, background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`, color: SC.navy, fontSize: 17, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(201,168,76,0.45)" }}>▶ Resume Match</button>
    </div>
  );
}

// ── Innings end ───────────────────────────────────────────────
function InningsEnd({ score, wickets, balls, maxOvers, battingTeam, innings, target, onStart2nd, onClose }) {
  const reason = wickets >= 10 ? "All out" : `${maxOvers} overs completed`;
  const won = innings === 2 && score >= (target || 999);
  const tied = innings === 2 && score === (target || 999) - 1 && balls >= maxOvers * 6;
  const lost = innings === 2 && balls >= maxOvers * 6 && score < (target || 999) - 1;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 450, background: `linear-gradient(160deg, ${SC.navy} 0%, ${SC.navyDk} 60%, ${SC.navy} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 28 }}>
      <div style={{ fontSize: 56, animation: "cfPop 0.4s ease both" }}>🏏</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: SC.goldLt, textAlign: "center" }}>{innings === 2 ? "Match Complete!" : "Innings Complete!"}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{reason}</div>
      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 36px", textAlign: "center", border: `1px solid ${SC.gold}` }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{score}<span style={{ fontSize: 24, opacity: 0.6 }}>/{wickets}</span></div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{battingTeam} · {overStr(balls)} overs</div>
      </div>
      {innings === 1 && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", textAlign: "center" }}>Target for 2nd innings: <strong style={{ color: SC.goldLt }}>{score + 1}</strong></div>}
      {innings === 2 && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: SC.goldLt, marginBottom: 4 }}>
            {won ? "🏆 Match Won!" : lost ? "😔 Match Lost" : tied ? "🤝 Match Tied" : "Match concluded"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            {won ? `Won by ${10 - wickets} wickets` : lost ? `Lost by ${(target || 0) - score - 1} runs` : tied ? "Remarkable tie!" : ""}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        {innings === 1 && (
          <button onClick={onStart2nd} style={{ marginTop: 12, padding: "16px 44px", borderRadius: 16, background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`, color: SC.navy, fontSize: 17, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(201,168,76,0.5)" }}>Start 2nd Innings →</button>
        )}
        <button onClick={onClose} style={{ marginTop: 12, padding: "16px 28px", borderRadius: 16, background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 15, fontWeight: 700, border: `1px solid ${SC.gold}`, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ── Wagon Wheel (restyled) ────────────────────────────────────
function WagonWheel({ activeZone, onZoneTap }) {
  const z = activeZone ? ZONES[activeZone] : null;
  return (
    <svg width="220" height="226" viewBox="0 0 220 226" style={{ display: "block", cursor: "pointer" }}>
      <ellipse cx="110" cy="112" rx="104" ry="108" fill="#3A7A22" stroke={SC.navyDk} strokeWidth="1.4" />
      <ellipse cx="110" cy="112" rx="104" ry="108" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      <ellipse cx="110" cy="112" rx="54" ry="56" fill="none" stroke="white" strokeWidth="1" strokeDasharray="5,4" opacity="0.6" />
      <line x1="110" y1="4" x2="110" y2="220" stroke="white" strokeWidth="0.7" strokeDasharray="4,5" opacity="0.4" />
      <line x1="6" y1="96" x2="214" y2="96" stroke="white" strokeWidth="0.6" strokeDasharray="3,5" opacity="0.36" />
      {/* Gold pitch */}
      <rect x="102" y="88" width="16" height="72" rx="2" fill={SC.gold} fillOpacity="0.4" stroke={SC.gold} strokeWidth="0.8" />
      <line x1="102" y1="106" x2="118" y2="106" stroke="white" strokeWidth="0.9" />
      <line x1="102" y1="140" x2="118" y2="140" stroke="white" strokeWidth="0.9" />
      {/* Top stumps */}
      <line x1="106" y1="84" x2="106" y2="90" stroke={SC.navy} strokeWidth="1.8" />
      <line x1="110" y1="82" x2="110" y2="90" stroke={SC.navy} strokeWidth="1.8" />
      <line x1="114" y1="84" x2="114" y2="90" stroke={SC.navy} strokeWidth="1.8" />
      <line x1="104" y1="84" x2="116" y2="84" stroke={SC.navy} strokeWidth="1" />
      {/* Bottom stumps */}
      <line x1="106" y1="158" x2="106" y2="164" stroke={SC.navy} strokeWidth="1.8" />
      <line x1="110" y1="158" x2="110" y2="166" stroke={SC.navy} strokeWidth="1.8" />
      <line x1="114" y1="158" x2="114" y2="164" stroke={SC.navy} strokeWidth="1.8" />
      <line x1="104" y1="164" x2="116" y2="164" stroke={SC.navy} strokeWidth="1" />
      <circle cx="110" cy="96" r="6" fill={SC.navy} stroke="white" strokeWidth="1.8" />
      {z && (
        <>
          <line x1="110" y1="96" x2={z.pt[0]} y2={z.pt[1]} stroke={SC.red} strokeWidth="3" strokeLinecap="round" />
          <circle cx={z.pt[0]} cy={z.pt[1]} r="7" fill={SC.red} stroke="white" strokeWidth="2" />
          <circle cx="110" cy="96" r="6" fill={SC.navy} stroke="white" strokeWidth="1.8" />
        </>
      )}
      {ZONE_PATHS.map(({ id, d }) => <path key={id} d={d} fill="transparent" onClick={() => onZoneTap(id)} style={{ cursor: "pointer" }} />)}
    </svg>
  );
}

// ── Main view ─────────────────────────────────────────────────
export default function LiveScorerView({ match, onBack, currentUser }) {
  const safe = match || {};
  const squad1 = Array.isArray(safe.squad1) && safe.squad1.length ? safe.squad1 : ["Batter 1", "Batter 2", "Batter 3", "Batter 4", "Batter 5", "Batter 6", "Batter 7", "Batter 8", "Batter 9", "Batter 10", "Batter 11"];
  const squad2 = Array.isArray(safe.squad2) && safe.squad2.length ? safe.squad2 : ["Bowler 1", "Bowler 2", "Bowler 3", "Bowler 4", "Bowler 5", "Bowler 6", "Bowler 7", "Bowler 8", "Bowler 9", "Bowler 10", "Bowler 11"];
  const team1Name = safe.team1 || "Team 1";
  const team2Name = safe.team2 || "Team 2";
  const maxOvers = Number(safe.overs) || 20;

  // Hydrate from existing innings1 if present
  const hydrated = useMemo(() => {
    const i1 = safe.innings1;
    if (i1 && typeof i1.score === "number") {
      return {
        innings: safe.innings2 ? 2 : 1,
        score: safe.innings2?.score ?? i1.score,
        wickets: safe.innings2?.wickets ?? i1.wickets ?? 0,
        balls: safe.innings2?.ballsBowled ?? i1.ballsBowled ?? 0,
        batters: (safe.innings2 ? safe.innings2.batsmen : i1.batsmen)?.slice(0, 2) || [
          { name: squad1[0], runs: 0, balls: 0, fours: 0, sixes: 0 },
          { name: squad1[1], runs: 0, balls: 0, fours: 0, sixes: 0 },
        ],
        bowlerName: (safe.innings2 ? safe.innings2.bowling?.[0]?.name : i1.bowling?.[0]?.name) || squad2[0],
        target: safe.innings2 ? (i1.score + 1) : null,
      };
    }
    return {
      innings: 1,
      score: 0,
      wickets: 0,
      balls: 0,
      batters: [
        { name: squad1[0], runs: 0, balls: 0, fours: 0, sixes: 0 },
        { name: squad1[1], runs: 0, balls: 0, fours: 0, sixes: 0 },
      ],
      bowlerName: squad2[0],
      target: null,
    };
  }, [safe.matchId]);

  // ── State ───────────────────────────────────────────────────
  const [innings, setInnings] = useState(hydrated.innings);
  const [score, setScore] = useState(hydrated.score);
  const [wickets, setWickets] = useState(hydrated.wickets);
  const [balls, setBalls] = useState(hydrated.balls);
  const [batters, setBatters] = useState(hydrated.batters);
  const [striker, setStriker] = useState(0);
  const [bowler, setBowler] = useState(hydrated.bowlerName);
  const [overBalls, setOverBalls] = useState([null, null, null, null, null, null]);
  const [target, setTarget] = useState(hydrated.target);
  const [freeHit, setFreeHit] = useState(false);
  const [extras, setExtras] = useState({ b: 0, lb: 0, w: 0, nb: 0 });

  const [nightMode, setNightMode] = useState(() => {
    try { return localStorage.getItem("fcc-scorer-night") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("fcc-scorer-night", nightMode ? "1" : "0"); } catch {}
  }, [nightMode]);

  const [modal, setModal] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [breakActive, setBreakActive] = useState(false);
  const [breakReason, setBreakReason] = useState("drinks");
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [inningsEnd, setInningsEnd] = useState(false);
  const [persona, setPersona] = useState("hype");
  const [commentary, setCommentary] = useState(`${COMMENTARY.hype.label} Good ball. Building pressure.`);
  const [history, setHistory] = useState([]);
  const [savedInnings1, setSavedInnings1] = useState(null);

  // Wicket modal sub-state
  const [wicketType, setWicketType] = useState(null);
  const [fielder, setFielder] = useState("");
  const [wicketStriker, setWicketStriker] = useState(0);

  // Bye sub-state
  const [byeRuns, setByeRuns] = useState(null);

  // Theme
  const T = nightMode
    ? { bg: SC.bgDark, surface: SC.surfaceDk, text: "#FFFFFF", textDim: "rgba(255,255,255,0.6)" }
    : { bg: SC.bg, surface: SC.surface, text: SC.text, textDim: SC.textDim };

  // Track most recent 6 for the glow animation
  const lastSixRef = useRef(null);

  // Break timer
  useEffect(() => {
    if (!breakActive) return;
    const t = setInterval(() => setBreakElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [breakActive]);

  // Auto innings end
  useEffect(() => {
    if ((wickets >= 10 || balls >= maxOvers * 6) && !inningsEnd) {
      const t = setTimeout(() => setInningsEnd(true), 600);
      return () => clearTimeout(t);
    }
  }, [wickets, balls, maxOvers, inningsEnd]);

  // ── Firestore persistence (debounced 1200ms) ────────────────
  const saveTimer = useRef(null);
  useEffect(() => {
    if (!safe.matchId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const battingName = innings === 1 ? team1Name : team2Name;
        const bowlingName = innings === 1 ? team2Name : team1Name;
        const currentInnings = {
          team: battingName,
          score, wickets,
          overs: overStr(balls),
          ballsBowled: balls,
          batsmen: batters.map(b => ({ ...b, dismissal: b.dismissal || null, notOut: b.dismissal ? false : true })),
          bowling: [{ name: bowler, overs: overStr(balls), maidens: 0, runs: 0, wickets: 0, dots: 0, wides: 0, noballs: 0 }],
          fow: [],
          extras: { ...extras },
          target: innings === 1 ? null : target,
          dnb: [],
        };
        const i1Payload = innings === 1 ? currentInnings : (savedInnings1 || null);
        const i2Payload = innings === 2 ? currentInnings : null;
        const status = inningsEnd && innings === 2 ? "completed" : (balls > 0 || score > 0 || wickets > 0) ? "live" : "setup";
        await setDoc(doc(db, "fccscorer", "data", "matches", safe.matchId), {
          status,
          innings1: i1Payload,
          innings2: i2Payload,
          bowling: { team: bowlingName },
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.error("LiveScorer save error:", e);
      }
    }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [score, wickets, balls, batters, bowler, extras, innings, target, inningsEnd, safe.matchId]);

  // ── Helpers ─────────────────────────────────────────────────
  function snapshot() {
    return {
      score, wickets, balls, batters: JSON.parse(JSON.stringify(batters)),
      striker, bowler, overBalls: [...overBalls], extras: { ...extras },
      freeHit, commentary,
    };
  }
  function pushHistory() {
    setHistory(h => [...h.slice(-49), snapshot()]);
  }
  function restore(s) {
    setScore(s.score); setWickets(s.wickets); setBalls(s.balls);
    setBatters(s.batters); setStriker(s.striker); setBowler(s.bowler);
    setOverBalls(s.overBalls); setExtras(s.extras); setFreeHit(s.freeHit);
    setCommentary(s.commentary);
  }

  function setOverSlot(ballIndexBefore, label) {
    // ballIndexBefore = `balls` value before this delivery (count is 0..maxOvers*6)
    const slot = ballIndexBefore % 6;
    const next = [...overBalls];
    next[slot] = label;
    setOverBalls(next);
  }

  function rotateOnOver(newBalls) {
    if (newBalls % 6 === 0 && newBalls !== balls) {
      // Over complete — reset overBalls, rotate striker
      setOverBalls([null, null, null, null, null, null]);
      setStriker(s => (s === 0 ? 1 : 0));
      // Prompt bowler change
      setTimeout(() => setModal("bowler"), 400);
    }
  }

  // ── Ball recording ──────────────────────────────────────────
  function recordRuns(runs) {
    pushHistory();
    const newScore = score + runs;
    const newBalls = balls + 1;
    const label = runs === 0 ? "•" : String(runs);
    setOverSlot(balls, label);
    setScore(newScore);
    setBalls(newBalls);
    // Update striker batter stats
    const nb = [...batters];
    nb[striker] = {
      ...nb[striker],
      runs: nb[striker].runs + runs,
      balls: nb[striker].balls + 1,
      fours: nb[striker].fours + (runs === 4 ? 1 : 0),
      sixes: nb[striker].sixes + (runs === 6 ? 1 : 0),
    };
    setBatters(nb);
    // Rotate on odd runs (except boundaries which the spec says "don't rotate striker")
    if (runs === 4 || runs === 6) {
      // No rotation on boundary
    } else if (runs % 2 === 1) {
      setStriker(s => (s === 0 ? 1 : 0));
    }
    // Free hit consumed
    if (freeHit) setFreeHit(false);
    // Celebrate
    const batName = nb[striker].name;
    if (runs === 6) {
      lastSixRef.current = newBalls;
      setCelebration({ type: "six", text: "SIX!! 🚀", sub: getComm(persona, "six", { name: batName }) });
      setCommentary(`${COMMENTARY[persona].label} ${getComm(persona, "six", { name: batName })}`);
    } else if (runs === 4) {
      setCelebration({ type: "four", text: "FOUR! 🏏", sub: `${batName} finds the boundary` });
      setCommentary(`${COMMENTARY[persona].label} ${getComm(persona, "four", { name: batName })}`);
    } else if (runs === 0) {
      setCommentary(`${COMMENTARY[persona].label} ${getComm(persona, "dot", { name: batName })}`);
    } else {
      setCommentary(`${COMMENTARY[persona].label} ${getComm(persona, "one", { name: batName })}`);
    }
    rotateOnOver(newBalls);
  }

  function recordWide(bonus = 0) {
    pushHistory();
    const addRuns = 1 + bonus;
    setScore(s => s + addRuns);
    setExtras(e => ({ ...e, w: e.w + addRuns }));
    setOverSlot(balls, "Wd");
    setCommentary(`${COMMENTARY[persona].label} ${getComm(persona, "wide")}`);
    // Wide doesn't count as a ball — slot label kept, but it'll be overwritten on next legal ball at same slot. Acceptable for prototype.
  }

  function recordNoBall(batRuns = 0) {
    pushHistory();
    const addRuns = 1 + batRuns;
    setScore(s => s + addRuns);
    setExtras(e => ({ ...e, nb: e.nb + 1 }));
    // Bat runs credited to striker
    if (batRuns > 0) {
      const nb = [...batters];
      nb[striker] = { ...nb[striker], runs: nb[striker].runs + batRuns };
      setBatters(nb);
    }
    setOverSlot(balls, "Nb");
    setFreeHit(true);
    setCommentary(`${COMMENTARY[persona].label} ${getComm(persona, "noball")}`);
  }

  function recordBye(runs) {
    pushHistory();
    const newBalls = balls + 1;
    setScore(s => s + runs);
    setExtras(e => ({ ...e, b: e.b + runs }));
    setOverSlot(balls, "B");
    setBalls(newBalls);
    // Striker still faced a ball
    const nb = [...batters];
    nb[striker] = { ...nb[striker], balls: nb[striker].balls + 1 };
    setBatters(nb);
    if (runs % 2 === 1) setStriker(s => (s === 0 ? 1 : 0));
    if (freeHit) setFreeHit(false);
    setCommentary(`${COMMENTARY[persona].label} Bye — ${runs} run${runs === 1 ? "" : "s"}.`);
    rotateOnOver(newBalls);
  }

  function recordWicket() {
    if (!wicketType) return;
    pushHistory();
    const newBalls = balls + 1;
    const batName = batters[wicketStriker]?.name || "";
    const isDuck = (batters[wicketStriker]?.runs || 0) === 0;
    setBalls(newBalls);
    setWickets(w => w + 1);
    setOverSlot(balls, "W");
    // Mark dismissal
    const nb = [...batters];
    nb[wicketStriker] = {
      ...nb[wicketStriker],
      balls: nb[wicketStriker].balls + 1,
      dismissal: wicketType + (fielder ? ` (${fielder})` : ""),
      notOut: false,
    };
    setBatters(nb);
    setCelebration({
      type: isDuck ? "duck" : "wicket",
      text: isDuck ? "Duck! 🦆" : "WICKET!",
      sub: `${batName} — ${wicketType}`,
    });
    setCommentary(`${COMMENTARY[persona].label} ${getComm(persona, isDuck ? "duck" : "wicket", { name: batName })}`);
    setWicketType(null);
    setFielder("");
    setModal(null);
    // Prompt new batter
    setTimeout(() => setModal("newbatter"), 600);
    rotateOnOver(newBalls);
  }

  function undo() {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    restore(last);
  }

  function start2nd() {
    setSavedInnings1({
      team: team1Name,
      score, wickets,
      overs: overStr(balls),
      ballsBowled: balls,
      batsmen: batters.map(b => ({ ...b, notOut: b.dismissal ? false : true })),
      bowling: [{ name: bowler, overs: overStr(balls), maidens: 0, runs: 0, wickets: 0, dots: 0, wides: 0, noballs: 0 }],
      fow: [],
      extras: { ...extras },
      target: null,
      dnb: [],
    });
    const t = score + 1;
    setTarget(t);
    setInnings(2);
    setScore(0); setWickets(0); setBalls(0);
    setBatters([
      { name: squad2[0], runs: 0, balls: 0, fours: 0, sixes: 0 },
      { name: squad2[1], runs: 0, balls: 0, fours: 0, sixes: 0 },
    ]);
    setStriker(0);
    setBowler(squad1[0]);
    setOverBalls([null, null, null, null, null, null]);
    setExtras({ b: 0, lb: 0, w: 0, nb: 0 });
    setInningsEnd(false);
    setFreeHit(false);
    setHistory([]);
  }

  // Computed
  const close = () => setModal(null);
  const overRuns = useMemo(() => {
    return overBalls.reduce((s, b) => {
      if (!b || b === "•" || b === "W") return s;
      if (b === "Wd" || b === "Nb") return s + 1;
      if (b === "B") return s + 0; // approximate
      const n = parseInt(b);
      return Number.isFinite(n) ? s + n : s;
    }, 0);
  }, [overBalls]);
  const strikeRate = (b) => (b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0");
  const rpo = balls > 0 ? (score / (balls / 6)).toFixed(1) : "0.0";

  // ── Render ──────────────────────────────────────────────────
  const headerBg = `linear-gradient(180deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", justifyContent: "center", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: T.text, transition: "background 0.25s" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.45; transform:scale(0.9)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(201,168,76,0.3)} 50%{box-shadow:0 0 18px rgba(201,168,76,0.8)} }
        @keyframes cfFall { 0%{transform:translateY(0) rotate(0); opacity:1} 100%{transform:translateY(110vh) rotate(720deg); opacity:0} }
        @keyframes cfPop { from{transform:scale(0.2) rotate(-10deg); opacity:0} to{transform:scale(1) rotate(0); opacity:1} }
        @keyframes cfShake { 0%{transform:translateX(-4px) rotate(-5deg)} 100%{transform:translateX(4px) rotate(5deg)} }
        @keyframes cfWaddle { 0%{transform:rotate(-18deg)} 100%{transform:rotate(18deg)} }
        @keyframes brkSway { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
        @keyframes brkRain { 0%,100%{transform:translateY(0); opacity:1} 50%{transform:translateY(10px); opacity:0.4} }
      `}</style>

      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* ── HEADER ── */}
        <div style={{ background: headerBg, padding: "12px 16px 18px", flexShrink: 0, position: "relative", overflow: "hidden", color: "#fff" }}>
          {/* Top row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div onClick={onBack} style={{ fontSize: 22, lineHeight: 1, cursor: "pointer", color: SC.goldLt, paddingRight: 6 }}>‹</div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: SC.red, animation: "pulse 1.4s ease-in-out infinite" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: SC.gold, textTransform: "uppercase", letterSpacing: 1.2 }}>
                LIVE · {innings === 1 ? "1ST" : "2ND"} INNINGS
              </div>
              {freeHit && <div style={{ fontSize: 9, fontWeight: 800, color: SC.navy, background: SC.goldLt, padding: "2px 7px", borderRadius: 10, letterSpacing: 0.6 }}>FREE HIT</div>}
            </div>
            {/* Day / Night toggle */}
            <div onClick={() => setNightMode(n => !n)}
              style={{ position: "relative", width: 60, height: 24, borderRadius: 14, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", userSelect: "none", flexShrink: 0 }}>
              <div style={{
                position: "absolute", top: 1, left: nightMode ? 34 : 1,
                width: 24, height: 20, borderRadius: 11,
                background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, transition: "left 0.22s ease",
              }}>{nightMode ? "🌙" : "☀️"}</div>
            </div>
          </div>

          {/* Team names */}
          <div style={{ textAlign: "center", fontSize: 12, color: SC.gold, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 }}>
            {team1Name} · {team2Name}
          </div>

          {/* Score */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2, marginTop: 4 }}>
            <span style={{
              fontSize: 72, fontWeight: 900, lineHeight: 1, letterSpacing: -2,
              fontVariantNumeric: "tabular-nums",
              background: "linear-gradient(135deg, #FFFFFF 0%, #F0D060 100%)",
              backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>{score}</span>
            <span style={{ fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,0.55)", lineHeight: 1 }}>/{wickets}</span>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 8 }}>
            <Stat label="OVERS" value={overStr(balls)} />
            <Stat label="RPO" value={rpo} />
            {innings === 2 && target != null && <Stat label="NEED" value={Math.max(0, target - score)} />}
            {innings === 1 && <Stat label="OF" value={`${maxOvers}.0`} />}
          </div>
        </div>

        {/* ── Batsmen row ── */}
        <div style={{ display: "flex", gap: 8, padding: "10px 12px 0", marginTop: -4 }}>
          {batters.map((b, i) => {
            const isStriker = striker === i;
            return (
              <div key={i} onClick={() => setStriker(i)}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, cursor: "pointer", position: "relative",
                  background: isStriker
                    ? "linear-gradient(135deg, #FFF8DC 0%, #FFF3C4 100%)"
                    : nightMode ? "rgba(255,255,255,0.06)" : "#FAF7EE",
                  border: isStriker ? `1.5px solid ${SC.gold}` : `1px solid ${SC.borderMid}`,
                  color: SC.navy,
                }}>
                {isStriker && (
                  <div style={{ position: "absolute", top: -7, right: 8, background: SC.red, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>ON STRIKE</div>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, color: SC.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: SC.navy, marginTop: 3 }}>
                  {b.runs}<span style={{ color: SC.textDim, fontWeight: 500 }}>({b.balls})</span>
                  <span style={{ fontSize: 11, color: SC.textDim, marginLeft: 6, fontWeight: 500 }}>· SR {strikeRate(b)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── This Over strip ── */}
        <div style={{ background: nightMode ? "rgba(255,255,255,0.04)" : "#FAF7EE", padding: "10px 16px", margin: "12px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
              THIS OVER · {bowler}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: SC.red }}>{overRuns} run{overRuns === 1 ? "" : "s"}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {overBalls.map((b, i) => <BallPill key={i} val={b} isLatestSix={b === "6" && lastSixRef.current === balls - (5 - i)} />)}
          </div>
        </div>

        {/* ── Commentary line ── */}
        <div onClick={() => setModal("commentary")}
          style={{ background: T.surface, padding: "10px 16px", borderTop: `1px solid ${SC.border}`, borderBottom: `1px solid ${SC.border}`, cursor: "pointer" }}>
          <div style={{ fontSize: 12, color: T.textDim, fontStyle: "italic", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{commentary}</div>
        </div>

        {/* ── Run buttons panel ── */}
        <div style={{ padding: 12, background: T.bg, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Row 1: 0,1,2,3,··· */}
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 1, 2, 3].map(n => (
              <RunSmall key={n} onClick={() => recordRuns(n)} label={n === 0 ? "0" : String(n)} nightMode={nightMode} />
            ))}
            <RunSmall onClick={() => setModal("overRuns")} label={"···"} nightMode={nightMode} small />
          </div>

          {/* Row 2: 4, 6, W */}
          <div style={{ display: "flex", gap: 8 }}>
            <div onClick={() => recordRuns(4)}
              style={{ flex: 1, height: 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
                color: "#fff", fontWeight: 900, fontSize: 24, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(27,42,92,0.35)" }}>4</div>
            <div onClick={() => recordRuns(6)}
              style={{ flex: 1, height: 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`,
                color: SC.navy, fontWeight: 900, fontSize: 24, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(201,168,76,0.45)" }}>6</div>
            <div onClick={() => { setWicketStriker(striker); setModal("wicket"); }}
              style={{ flex: 1, height: 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(135deg, ${SC.red} 0%, ${SC.redDk} 100%)`,
                color: "#fff", fontWeight: 900, fontSize: 24, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(192,57,43,0.4)" }}>W</div>
          </div>

          {/* Row 3: WIDE, NO BALL, BYE, UNDO */}
          <div style={{ display: "flex", gap: 6 }}>
            <PillBtn onClick={() => recordWide(0)} label="WIDE" nightMode={nightMode} />
            <PillBtn onClick={() => recordNoBall(0)} label="NO BALL" nightMode={nightMode} />
            <PillBtn onClick={() => setModal("bye")} label="BYE" nightMode={nightMode} />
            <PillBtn onClick={undo} label="↩" nightMode={nightMode} noCaps />
          </div>

          {/* Row 4: bowler / break / more */}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <PillBtn onClick={() => setModal("bowler")} label={`Bowler: ${bowler}`} nightMode={nightMode} noCaps />
            <PillBtn onClick={() => setModal("break")} label="BREAK" nightMode={nightMode} />
            <PillBtn onClick={() => setModal("more")} label="···" nightMode={nightMode} noCaps />
          </div>
        </div>

        {/* ── MODALS ── */}
        {modal === "overRuns" && (
          <Sheet title="Other runs (overthrows, etc.)" onClose={close}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
              {[4, 5, 6, 7, 8].map(n => (
                <div key={n} onClick={() => { recordRuns(n); close(); }}
                  style={{ padding: "18px 4px", borderRadius: 12, border: `1.5px solid ${SC.border}`, background: SC.surface, fontSize: 20, fontWeight: 800, color: SC.navy, cursor: "pointer", textAlign: "center" }}>{n}</div>
              ))}
            </div>
          </Sheet>
        )}

        {modal === "bye" && (
          <Sheet title="Bye — how many runs?" onClose={() => { setByeRuns(null); close(); }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {[1, 2, 3, 4].map(n => (
                <div key={n} onClick={() => { recordBye(n); setByeRuns(null); close(); }}
                  style={{ padding: "20px 4px", borderRadius: 12, border: `1.5px solid ${SC.border}`, background: SC.surface, fontSize: 22, fontWeight: 800, color: SC.navy, cursor: "pointer", textAlign: "center" }}>{n}</div>
              ))}
            </div>
          </Sheet>
        )}

        {modal === "wicket" && (
          <Sheet title="Wicket" onClose={close}>
            <div style={{ fontSize: 11, color: SC.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Dismissal type</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 14 }}>
              {["Bowled", "Caught", "LBW", "Run out", "Stumped", "Hit wicket"].map(d => (
                <div key={d} onClick={() => setWicketType(d)}
                  style={{
                    padding: 14, borderRadius: 10,
                    border: `1.5px solid ${wicketType === d ? SC.red : SC.border}`,
                    background: wicketType === d ? "rgba(192,57,43,0.08)" : SC.surface,
                    fontSize: 13, fontWeight: wicketType === d ? 700 : 500,
                    color: wicketType === d ? SC.red : SC.navy, cursor: "pointer", textAlign: "center"
                  }}>{d}</div>
              ))}
            </div>
            {wicketType && (
              <>
                <input value={fielder} onChange={e => setFielder(e.target.value)} placeholder="Fielder / keeper (optional)"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${SC.borderMid}`, fontSize: 13, marginBottom: 10, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                <div style={{ fontSize: 11, color: SC.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Batsman out</div>
                {batters.map((b, i) => (
                  <div key={i} onClick={() => setWicketStriker(i)}
                    style={{ padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${wicketStriker === i ? SC.red : SC.border}`, background: wicketStriker === i ? "rgba(192,57,43,0.08)" : SC.surface, marginBottom: 6, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, fontWeight: wicketStriker === i ? 700 : 500, color: wicketStriker === i ? SC.red : SC.navy }}>{b.name}</span>
                    <span style={{ fontSize: 13, color: SC.textDim }}>{b.runs} ({b.balls})</span>
                  </div>
                ))}
                <div onClick={recordWicket}
                  style={{ marginTop: 12, padding: 14, borderRadius: 12, background: `linear-gradient(135deg, ${SC.red} 0%, ${SC.redDk} 100%)`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", textAlign: "center" }}>
                  Confirm Wicket
                </div>
              </>
            )}
          </Sheet>
        )}

        {modal === "newbatter" && (
          <Sheet title="New batter in" onClose={close}>
            <div style={{ fontSize: 13, color: SC.textDim, marginBottom: 12 }}>Select the incoming batter from the batting squad.</div>
            {(innings === 1 ? squad1 : squad2)
              .filter(p => !batters.find(b => b.name === p && !b.dismissal))
              .map(p => (
                <div key={p} onClick={() => {
                  const nb = [...batters];
                  nb[wicketStriker] = { name: p, runs: 0, balls: 0, fours: 0, sixes: 0 };
                  setBatters(nb);
                  setStriker(wicketStriker);
                  close();
                }}
                  style={{ padding: "13px 14px", borderBottom: `1px solid ${SC.border}`, fontSize: 14, color: SC.navy, cursor: "pointer" }}>{p}</div>
              ))}
          </Sheet>
        )}

        {modal === "bowler" && (
          <Sheet title="Select bowler" onClose={close}>
            <div style={{ fontSize: 13, color: SC.textDim, marginBottom: 14 }}>
              Current: <strong style={{ color: SC.navy }}>{bowler}</strong> · Over {Math.floor(balls / 6) + 1}
            </div>
            {(innings === 1 ? squad2 : squad1).map(p => (
              <div key={p} onClick={() => { setBowler(p); close(); }}
                style={{ padding: "13px 14px", borderBottom: `1px solid ${SC.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: bowler === p ? "rgba(24,95,165,0.06)" : "transparent" }}>
                <span style={{ fontSize: 14, fontWeight: bowler === p ? 700 : 500, color: bowler === p ? SC.blue : SC.navy }}>{p}</span>
                {bowler === p && <span style={{ color: SC.blue, fontSize: 16 }}>✓</span>}
              </div>
            ))}
          </Sheet>
        )}

        {modal === "break" && (
          <Sheet title="Pause match" onClose={close}>
            <div style={{ fontSize: 13, color: SC.textDim, marginBottom: 14 }}>Select reason for the break</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {[{ id: "drinks", icon: "☕", label: "Drinks break" }, { id: "rain", icon: "🌧️", label: "Rain delay" }, { id: "injury", icon: "🏥", label: "Injury" }, { id: "other", icon: "⏸️", label: "Other delay" }].map(b => (
                <div key={b.id} onClick={() => { setBreakReason(b.id); setBreakElapsed(0); setBreakActive(true); close(); }}
                  style={{ padding: "20px 12px", borderRadius: 12, border: `1px solid ${SC.border}`, background: SC.surface, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>{b.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: SC.navy }}>{b.label}</div>
                </div>
              ))}
            </div>
          </Sheet>
        )}

        {modal === "commentary" && (
          <Sheet title="Commentary persona" onClose={close}>
            <div style={{ fontSize: 13, color: SC.textDim, marginBottom: 14 }}>Choose the voice of ball-by-ball commentary</div>
            {Object.entries(COMMENTARY).map(([id, p]) => (
              <div key={id} onClick={() => { setPersona(id); close(); }}
                style={{ padding: 14, borderRadius: 12, border: `1.5px solid ${persona === id ? SC.gold : SC.border}`, background: persona === id ? "rgba(201,168,76,0.08)" : SC.surface, marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: SC.navy }}>{p.name}</div>
                  {persona === id && <div style={{ color: SC.gold, fontSize: 18 }}>✓</div>}
                </div>
                <div style={{ fontSize: 12, color: SC.textDim, marginTop: 5, fontStyle: "italic" }}>"{p.four[0]}"</div>
              </div>
            ))}
          </Sheet>
        )}

        {modal === "more" && (
          <Sheet title="More" onClose={close}>
            {[
              { icon: "🔄", label: "Swap strike", onClick: () => { setStriker(s => s === 0 ? 1 : 0); close(); } },
              { icon: "🎤", label: "Commentary voice", sub: `Now: ${COMMENTARY[persona].name}`, onClick: () => setModal("commentary") },
              { icon: "🏏", label: "End innings now", onClick: () => { setInningsEnd(true); close(); } },
              { icon: "🌗", label: `Switch to ${nightMode ? "day" : "night"} mode`, onClick: () => { setNightMode(n => !n); close(); } },
            ].map(a => (
              <div key={a.label} onClick={a.onClick}
                style={{ padding: "14px 12px", borderBottom: `1px solid ${SC.border}`, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ fontSize: 22, width: 30, textAlign: "center", flexShrink: 0 }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: SC.navy }}>{a.label}</div>
                  {a.sub && <div style={{ fontSize: 12, color: SC.textDim, marginTop: 1 }}>{a.sub}</div>}
                </div>
                <div style={{ color: SC.textMuted, fontSize: 18 }}>›</div>
              </div>
            ))}
          </Sheet>
        )}

        {/* Overlays */}
        {celebration && <Celebrate data={celebration} onDone={() => setCelebration(null)} />}
        {breakActive && <BreakScreen reason={breakReason} elapsed={breakElapsed} onResume={() => { setBreakActive(false); setBreakElapsed(0); }} />}
        {inningsEnd && (
          <InningsEnd
            score={score} wickets={wickets} balls={balls}
            maxOvers={maxOvers}
            battingTeam={innings === 1 ? team1Name : team2Name}
            innings={innings} target={target}
            onStart2nd={() => { start2nd(); setInningsEnd(false); }}
            onClose={() => setInningsEnd(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Stat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, color: SC.gold, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function BallPill({ val, isLatestSix }) {
  let bg = "#E8E4D8", fg = SC.textMuted, weight = 500, char = val || "·", size = 32, gradient = null, shadow = null, anim = null, fontSize = 13;
  if (!val) {
    char = "·";
  } else if (val === "•") {
    char = "·";
  } else if (val === "W") {
    gradient = `linear-gradient(135deg, ${SC.red} 0%, ${SC.redDk} 100%)`;
    fg = "#fff"; weight = 800;
  } else if (val === "4") {
    bg = SC.blueLt; fg = SC.blue; weight = 700;
  } else if (val === "6") {
    gradient = `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`;
    fg = "#fff"; weight = 800; size = 38; fontSize = 15;
    shadow = "0 0 12px rgba(201,168,76,0.5)";
    if (isLatestSix) anim = "glow 1.4s ease-in-out infinite";
  } else if (val === "Wd" || val === "Nb") {
    bg = "#FFF3C4"; fg = "#7A4000"; weight = 600; fontSize = 10;
    char = val.toLowerCase();
  } else if (val === "B") {
    bg = "#FFF3C4"; fg = "#7A4000"; weight = 600; fontSize = 10;
    char = "b";
  } else {
    bg = SC.greenLt; fg = SC.green; weight = 700;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: gradient || bg, color: fg, fontWeight: weight, fontSize,
      boxShadow: shadow || undefined, animation: anim || undefined,
      flexShrink: 0,
    }}>{char}</div>
  );
}

function RunSmall({ onClick, label, nightMode, small }) {
  return (
    <div onClick={onClick}
      style={{
        flex: 1, height: 56, borderRadius: 12,
        background: nightMode ? "rgba(255,255,255,0.08)" : SC.surface,
        border: `1px solid ${SC.border}`,
        boxShadow: nightMode ? "none" : "0 2px 6px rgba(27,42,92,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: nightMode ? "#fff" : SC.navy, fontWeight: 800,
        fontSize: small ? 22 : (label === "0" ? 22 : 18),
        cursor: "pointer", userSelect: "none",
      }}>{label}</div>
  );
}

function PillBtn({ onClick, label, nightMode, noCaps }) {
  return (
    <div onClick={onClick}
      style={{
        flex: 1, height: 36, borderRadius: 10,
        background: nightMode ? "rgba(255,255,255,0.08)" : SC.surface,
        border: `1px solid ${SC.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: nightMode ? "#fff" : SC.navy, fontWeight: 700, fontSize: 11,
        textTransform: noCaps ? "none" : "uppercase", letterSpacing: noCaps ? 0 : 0.6,
        cursor: "pointer", userSelect: "none",
        padding: "0 8px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
      }}>{label}</div>
  );
}
