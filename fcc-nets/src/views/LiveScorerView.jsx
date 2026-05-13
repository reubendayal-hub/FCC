import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../firebase";
import {
  doc, setDoc, serverTimestamp, onSnapshot, arrayUnion, getDoc,
} from "firebase/firestore";
import ScorecardView from "./ScorecardView";
import { pickCommentary, pickEventKey } from "../utils/commentaryGen";
import { finalizeMatchStats } from "../utils/finalizeMatchStats";

// ── Takeover constants ───────────────────────────────────────
const TAKEOVER_PIN = "4321";
const SCORER_LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const TAKEOVER_REQUEST_TIMEOUT_S = 30;
const HEARTBEAT_MS = 30 * 1000;

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

// ── Zones / Wagon Wheel (cricket-accurate shot lists) ────────
// Each zone's `shots` array has been hand-tuned for cricket realism:
//   - "Cow corner" removed (it's a fielding position, not a shot —
//     replaced with Slog / Slog sweep on the midwicket zone).
//   - "Reverse sweep" removed from behind/third-man (a reverse sweep
//     goes to point / cover, not behind the keeper).
//   - "Defended" added to inner zones (point/cover/mid-off/straight/
//     on-drive/midwicket/sq-leg) so dot balls in those areas can be
//     scored without bouncing through the dot-ball-only shot picker.
const ZONES = {
  behind: { pt:[110,10], label:"Behind keeper", side:"neu", shots:[
    {n:"Ramp/scoop",d:"Over keeper's head"},
    {n:"Reverse paddle",d:"Soft deflection behind"},
    {n:"Inside edge",d:"Past leg stump"},
  ]},
  "third-man": { pt:[28,28], label:"Third man", side:"off", shots:[
    {n:"Late cut",d:"Deflected to third man"},
    {n:"Upper cut",d:"Sliced over slips/gully"},
    {n:"Outside edge",d:"Edge behind slip cordon"},
    {n:"Steered to third",d:"Soft hands behind point"},
  ]},
  point: { pt:[8,96], label:"Point", side:"off", shots:[
    {n:"Square cut",d:"Short wide ball, hard cut"},
    {n:"Late cut",d:"Soft deflection backward of point"},
    {n:"Defended",d:"Pushed to point"},
    {n:"Dabbed to point",d:"Steered with soft hands"},
  ]},
  cover: { pt:[14,150], label:"Cover", side:"off", shots:[
    {n:"Cover drive",d:"Classic full ball through cover"},
    {n:"Square drive",d:"Wider, hit squarer of cover"},
    {n:"Inside-out drive",d:"Stepped out, hit over cover"},
    {n:"Defended",d:"Pushed to cover"},
  ]},
  "mid-off": { pt:[38,196], label:"Mid-off", side:"off", shots:[
    {n:"Off drive",d:"Driven toward mid-off"},
    {n:"Lofted drive",d:"Over mid-off"},
    {n:"Punched",d:"Back-foot push past the bowler"},
    {n:"Defended",d:"Pushed to mid-off"},
  ]},
  straight: { pt:[110,218], label:"Straight", side:"neu", shots:[
    {n:"Straight drive",d:"Back past the bowler"},
    {n:"Lofted straight drive",d:"Over the bowler's head"},
    {n:"Defended",d:"Pushed straight back"},
  ]},
  "on-drive": { pt:[182,196], label:"Mid-on", side:"leg", shots:[
    {n:"On drive",d:"Driven toward mid-on"},
    {n:"Flick",d:"Wristy flick off the pads"},
    {n:"Lofted on drive",d:"Over mid-on"},
    {n:"Defended",d:"Pushed to mid-on"},
  ]},
  midwicket: { pt:[206,150], label:"Midwicket", side:"leg", shots:[
    {n:"Flick",d:"Wristy off the pads"},
    {n:"Pull",d:"Short ball pulled square"},
    {n:"Slog",d:"Heave over midwicket"},
    {n:"Slog sweep",d:"Lofted sweep over midwicket"},
    {n:"Defended",d:"Pushed to midwicket"},
  ]},
  "sq-leg": { pt:[212,96], label:"Square leg", side:"leg", shots:[
    {n:"Pull",d:"Short ball pulled square"},
    {n:"Hook",d:"Head-high bouncer"},
    {n:"Sweep",d:"Spinner swept square"},
    {n:"Defended",d:"Pushed square"},
  ]},
  "fine-leg": { pt:[192,28], label:"Fine leg", side:"leg", shots:[
    {n:"Leg glance",d:"Off pads, deflected fine"},
    {n:"Paddle sweep",d:"Soft deflection fine"},
    {n:"Hook (fine)",d:"Bouncer hooked fine"},
    {n:"Tickled fine",d:"Deflected behind square leg"},
  ]},
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

// ── Cricket ball SVG (red, white dashed seams) ────────────────
function CricketBallSvg({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block", flexShrink: 0 }}>
      <circle cx="16" cy="16" r="14" fill="#CC2222" />
      <path d="M20 4 Q28 16 20 28" fill="none" stroke="white" strokeWidth="1.8" strokeDasharray="3,2.5" strokeLinecap="round" />
      <path d="M24 5 Q32 16 24 27" fill="none" stroke="white" strokeWidth="1.8" strokeDasharray="3,2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Stumps SVG (3 stumps + 2 bails, white) ────────────────────
function StumpsSvg({ width = 16, height = 14, fill = "#fff" }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 28" style={{ display: "block", flexShrink: 0 }}>
      <rect x="6"  y="7" width="4" height="19" rx="2" fill={fill} />
      <rect x="14" y="7" width="4" height="19" rx="2" fill={fill} />
      <rect x="22" y="7" width="4" height="19" rx="2" fill={fill} />
      <rect x="5"  y="5" width="8" height="3.5" rx="1.8" fill={fill} />
      <rect x="19" y="5" width="8" height="3.5" rx="1.8" fill={fill} />
    </svg>
  );
}

// ── Pitch length zones ────────────────────────────────────────
const PITCH_ZONES = [
  { id: "Yorker",         base: "#A07A00", sel: "#D4B040" },
  { id: "Full",           base: "#1E6018", sel: "#3DA838" },
  { id: "Good length",    base: "#13407C", sel: "#2A6FBC" },
  { id: "Back of length", base: "#5A1E78", sel: "#A040C8" },
  { id: "Short",          base: "#8C1810", sel: "#E0331E" },
];

// ── Commentary (legacy persona-based) ─────────────────────────
// Legacy persona-based commentary — superseded by pickCommentary from
// utils/commentaryGen, kept for fallback / persona-button UI / replay.
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
    defensive:["DEFENDED! Fortress mode activated!","Solid bat — text-book defence!","Watched the ball onto the bat — clean play!"],
    miss:["BEATEN! Bowler tempted that one in!","Played and missed — close one!","Through the gate — but ball misses everything!"],
    leave:["Shouldered arms — left it alone!","Lets it go — sound judgement!","Eye in — knows his off stump!"],
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
    defensive:["Defended. Standard.","Bat in the way. Bare minimum.","Block. Could try harder."],
    miss:["Missed. Predictable.","Played and missed. Embarrassing.","Couldn't lay bat on it. Typical."],
    leave:["Left it. Wise for once.","Shouldered arms. About time.","No shot. Acceptable."],
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
    defensive:["The bat meets ball in quiet conversation.","A moment of stillness — defence honoured.","Willow stands firm, asking no questions."],
    miss:["The ball passes by, a thought half-formed.","Played and missed — almost a memory.","Bat swings through nothing but air."],
    leave:["Lets it go — patience as virtue.","Arms drawn back — judgement made.","The ball travels alone to the keeper."],
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
// `onResume` may be null (viewer mode) — when null, hide the button.
function BreakScreen({ reason, elapsed, onResume, startedAtMs }) {
  const icons = { drinks: "☕", rain: "🌧️", injury: "🏥", other: "⏸️" };
  const titles = { drinks: "Drinks Break", rain: "Rain Delay", injury: "Injury Stoppage", other: "Match Paused" };
  // If startedAtMs supplied, tick locally every 1s using wall-clock delta
  // so viewers see a live-updating timer regardless of snapshot cadence.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!startedAtMs) return;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [startedAtMs]);
  const liveElapsed = startedAtMs ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : (elapsed || 0);
  // tick is referenced so the eslint deps lint is satisfied + the re-render is triggered
  void tick;
  const m = Math.floor(liveElapsed / 60), s = liveElapsed % 60;
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
      {onResume && (
        <button onClick={onResume} style={{ marginTop: 16, padding: "15px 44px", borderRadius: 16, background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`, color: SC.navy, fontSize: 17, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(201,168,76,0.45)" }}>▶ Resume Match</button>
      )}
    </div>
  );
}

// ── Innings end ───────────────────────────────────────────────
// TASK 6: at the 2nd-innings end we offer a gold "Save match & exit"
// button that calls finalizeMatch(); this is the natural saving path.
function InningsEnd({ score, wickets, balls, maxOvers, battingTeam, innings, target, onStart2nd, onClose, onSaveExit, saving }) {
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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {innings === 1 && (
          <button onClick={onStart2nd} style={{ marginTop: 12, padding: "16px 44px", borderRadius: 16, background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`, color: SC.navy, fontSize: 17, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(201,168,76,0.5)" }}>Start 2nd Innings →</button>
        )}
        {innings === 2 && onSaveExit && (
          <button onClick={onSaveExit} disabled={saving} style={{ marginTop: 12, padding: "16px 28px", borderRadius: 16, background: saving ? "rgba(255,255,255,0.15)" : `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`, color: saving ? "rgba(255,255,255,0.6)" : SC.navy, fontSize: 15, fontWeight: 800, border: "none", cursor: saving ? "default" : "pointer", boxShadow: saving ? "none" : "0 4px 20px rgba(201,168,76,0.5)" }}>{saving ? "Saving stats…" : "Save match & exit"}</button>
        )}
        <button onClick={onClose} style={{ marginTop: 12, padding: "16px 28px", borderRadius: 16, background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 15, fontWeight: 700, border: `1px solid ${SC.gold}`, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ── Wagon Wheel (restyled) ────────────────────────────────────
// `mirror` (boolean) — when true, the inner SVG group is mirrored
// horizontally so LH batters see leg/off correctly reversed. Labels
// (none yet — labels lived in ZONES.label) stay outside the mirrored
// group so any future label text would render unflipped.
// Zone-id semantics are preserved: "cover" still means cover relative
// to the BATTER's orientation regardless of mirror state — leg-side /
// off-side mirror visually, not in the IDs.
// Tap coords are normalized BEFORE bubbling up: in mirrored mode the
// raw SVG coord is reflected back across x=110 so persisted coords are
// always in the canonical RH-perspective frame. ProfileView re-mirrors
// based on the stored event.battingHand.
function WagonWheel({ activeZone, onZoneTap, tapPoint, mirror = false }) {
  const z = activeZone ? ZONES[activeZone] : null;
  const indicator = tapPoint ? [tapPoint.x, tapPoint.y] : (z ? z.pt : null);
  const innerTransform = mirror ? "translate(220,0) scale(-1,1)" : "";
  return (
    <svg width="220" height="226" viewBox="0 0 220 226" style={{ display: "block", cursor: "pointer" }}>
      <g transform={innerTransform}>
        <ellipse cx="110" cy="112" rx="104" ry="108" fill="#1A4A2B" stroke={SC.navyDk} strokeWidth="1.4" />
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
        {indicator && (() => {
          // Indicator is stored in canonical (RH-perspective) coords.
          // When mirroring, reflect it visually so the dot lands on the
          // matching mirrored zone — without that, an LH batter who taps
          // their LEG side would see the dot draw on the OFF side.
          const vx = mirror ? (220 - indicator[0]) : indicator[0];
          const vy = indicator[1];
          return (
            <>
              <line x1="110" y1="96" x2={vx} y2={vy} stroke={SC.red} strokeWidth="3" strokeLinecap="round" />
              <circle cx={vx} cy={vy} r="7" fill={SC.red} stroke="white" strokeWidth="2" />
              <circle cx="110" cy="96" r="6" fill={SC.navy} stroke="white" strokeWidth="1.8" />
            </>
          );
        })()}
        {ZONE_PATHS.map(({ id, d }) => (
          <path
            key={id}
            d={d}
            fill="transparent"
            onClick={(e) => {
              const svg = e.currentTarget.ownerSVGElement;
              const pt = svg.createSVGPoint();
              pt.x = e.clientX; pt.y = e.clientY;
              const ctm = svg.getScreenCTM().inverse();
              let loc = pt.matrixTransform(ctm);
              // When the parent g is mirrored, getScreenCTM().inverse()
              // already accounts for the SVG→viewBox transform but NOT
              // the inner group's scale(-1,1). Reflect manually so the
              // coord we hand up is the canonical RH-perspective coord.
              if (mirror) loc = { x: 220 - loc.x, y: loc.y };
              onZoneTap(id, { x: loc.x, y: loc.y });
            }}
            style={{ cursor: "pointer" }}
          />
        ))}
      </g>
    </svg>
  );
}

// ── Pitch picker (5 length zones + wide flanks) ───────────────
function PitchPickerSvg({ selected, onPick, onWideOff, onWideLeg }) {
  // Trapezoid pitch from y=22 (top, batter end) to y=240 (bottom, bowler end)
  // 5 horizontal zones inside the clipped pitch. Each is a horizontal band.
  const W = 240, H = 280;
  // Trapezoid: top narrow (90→150), bottom wide (40→200)
  const clipId = "pitchClip";
  const bands = [
    // top → bottom: Yorker (near batter), Full, Good length, Back of length, Short (near bowler)
    { id: "Yorker",         y1: 22,  y2: 66 },
    { id: "Full",           y1: 66,  y2: 110 },
    { id: "Good length",    y1: 110, y2: 154 },
    { id: "Back of length", y1: 154, y2: 200 },
    { id: "Short",          y1: 200, y2: 240 },
  ];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 320, display: "block" }}>
      <defs>
        <clipPath id={clipId}>
          {/* trapezoid pitch */}
          <polygon points="90,22 150,22 200,240 40,240" />
        </clipPath>
      </defs>
      {/* Outfield bg */}
      <rect x="0" y="0" width={W} height={H} fill="#1A4A2B" rx="14" />
      {/* Wide-off badge (left of stumps) */}
      <g onClick={onWideOff} style={{ cursor: "pointer" }}>
        <rect x="6" y="6" width="58" height="28" rx="6" fill="rgba(0,0,0,0.35)" stroke="#fff" strokeOpacity="0.6" />
        <text x="35" y="24" fontSize="10" fontWeight="800" fill="#fff" textAnchor="middle" letterSpacing="0.6">WIDE-OFF</text>
      </g>
      {/* Wide-leg badge (right of stumps) */}
      <g onClick={onWideLeg} style={{ cursor: "pointer" }}>
        <rect x={W - 64} y="6" width="58" height="28" rx="6" fill="rgba(0,0,0,0.35)" stroke="#fff" strokeOpacity="0.6" />
        <text x={W - 35} y="24" fontSize="10" fontWeight="800" fill="#fff" textAnchor="middle" letterSpacing="0.6">WIDE-LEG</text>
      </g>
      {/* Pitch bands (clipped to trapezoid) */}
      <g clipPath={`url(#${clipId})`}>
        {bands.map(b => {
          const zone = PITCH_ZONES.find(z => z.id === b.id);
          const isSel = selected === b.id;
          return (
            <g key={b.id} onClick={() => onPick(b.id)} style={{ cursor: "pointer" }}>
              <rect x="0" y={b.y1} width={W} height={b.y2 - b.y1} fill={isSel ? zone.sel : zone.base} />
              <text x={W / 2} y={(b.y1 + b.y2) / 2 + 4} fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle" letterSpacing="0.4">{b.id}</text>
              {isSel && <circle cx={W / 2} cy={b.y2 - 6} r="3.5" fill="#fff" />}
            </g>
          );
        })}
      </g>
      {/* Dashed dividers between bands */}
      <g clipPath={`url(#${clipId})`}>
        {bands.slice(0, -1).map(b => (
          <line key={b.id} x1="0" y1={b.y2} x2={W} y2={b.y2} stroke="white" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.45" />
        ))}
      </g>
      {/* Trapezoid outline */}
      <polygon points="90,22 150,22 200,240 40,240" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.8" />
      {/* Batter stumps at top */}
      <g>
        <rect x="108" y="6"  width="3" height="14" rx="1.5" fill="#fff" />
        <rect x="118" y="6"  width="3" height="14" rx="1.5" fill="#fff" />
        <rect x="128" y="6"  width="3" height="14" rx="1.5" fill="#fff" />
        <rect x="106" y="4"  width="11" height="2.5" rx="1.2" fill="#fff" />
        <rect x="123" y="4"  width="11" height="2.5" rx="1.2" fill="#fff" />
      </g>
    </svg>
  );
}

// ── Main view ─────────────────────────────────────────────────
export default function LiveScorerView({ match, onBack, currentUser, readOnly = false }) {
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

  // ── Batting order (TASK 3) ──────────────────────────────────
  // 5-slot top order picked at the start of each innings. Used to:
  //   1. Pre-select the right player when a wicket falls.
  //   2. Reset openers on start of innings 2.
  //   3. Restore on reload from the persisted match doc.
  // `battingOrderOpen` controls the picker modal. Auto-opens once per
  // innings (when there's no saved order and no balls bowled). The
  // matching "battingOrderInnings" ref prevents re-opening on every
  // batters-change re-render.
  const [battingOrder, setBattingOrder] = useState(() => {
    const fromI2 = safe.innings2?.battingOrder;
    const fromI1 = safe.innings1?.battingOrder;
    if (safe.innings2 && Array.isArray(fromI2)) return fromI2;
    if (Array.isArray(fromI1)) return fromI1;
    return [];
  });
  const [battingOrderOpen, setBattingOrderOpen] = useState(false);
  const battingOrderAutoOpenedRef = useRef({ 1: false, 2: false });
  // Opening bowler picker — auto-opens at innings start (once per innings)
  // and runs BEFORE the batting-order picker. Cancelling leaves the
  // alphabetical default (squad[0]) in place.
  const [openingBowlerOpen, setOpeningBowlerOpen] = useState(false);
  const [openingBowlerShown, setOpeningBowlerShown] = useState({ 1: false, 2: false });
  // BUG 2: Change-opening-batsmen sheet, accessible from More menu when
  // ballsBowled === 0 (i.e. innings has not started). Lets the scorer
  // swap the openers without going through a wicket flow.
  const [changeBatsmenOpen, setChangeBatsmenOpen] = useState(false);

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
  // Viewer-side break state derived from Firestore breakState field.
  // { reason, startedAtMs } or null.
  const [viewerBreak, setViewerBreak] = useState(null);
  // TASK 5 — viewer-side mirrors of doc fields needed for the
  // "match hasn't started" waiting screen.
  const [viewerStatus, setViewerStatus] = useState(safe.status || "setup");
  const [viewerEventsLen, setViewerEventsLen] = useState(
    Array.isArray(safe.events) ? safe.events.length : 0
  );
  const [viewerLastScorerName, setViewerLastScorerName] = useState(
    safe.lastScorerName || null
  );
  const [inningsEnd, setInningsEnd] = useState(false);
  const [persona, setPersona] = useState("hype");
  const [commentary, setCommentary] = useState(`${COMMENTARY.hype.label} Good ball. Building pressure.`);
  // Second commentary line — surfaces 50/100/5-for milestones and the
  // occasional end-of-over flavour. Auto-clears after 3 s via setTimeout.
  const [milestoneLine, setMilestoneLine] = useState(null);
  const milestoneTimerRef = useRef(null);
  // Per-bowler wicket tally — used for 5-fer detection without depending
  // on the event log round-trip. Map<bowlerName, wicketCount>.
  const bowlerWktsRef = useRef({});
  const [history, setHistory] = useState([]);
  const [savedInnings1, setSavedInnings1] = useState(null);

  // Wicket modal sub-state
  const [wicketType, setWicketType] = useState(null);
  const [fielder, setFielder] = useState("");
  const [wicketStriker, setWicketStriker] = useState(0);

  // Bye sub-state
  const [byeRuns, setByeRuns] = useState(null);

  // Score mode + pending ball (full-mode flow)
  const [scoreMode, setScoreMode] = useState(() => {
    try { return localStorage.getItem("fcc-scorer-mode") || "full"; } catch { return "full"; }
  });
  useEffect(() => {
    try { localStorage.setItem("fcc-scorer-mode", scoreMode); } catch {}
  }, [scoreMode]);
  const [pendingBall, setPendingBall] = useState(null); // { runs, kind, pitch, zone }

  // Extras bonus-runs sheet state
  const [pendingExtras, setPendingExtras] = useState(null); // { type:"wide"|"noball", bonusRuns, kind?, batRuns? }

  // Wagon-wheel tap point + shot picker state
  const [activeZone, setActiveZone] = useState(null);
  const [tapPoint, setTapPoint] = useState(null); // { x, y } in SVG coords
  const [activeShot, setActiveShot] = useState(null);
  // Defensive-shot type for dot balls in Full mode: "defensive" | "miss" | "leave" | null
  const [dotShotType, setDotShotType] = useState(null);

  // ── Batter handedness (LH/RH wagon-wheel mirroring) ─────────
  // rosterRef: Map<lowercased name, member doc> built once on mount.
  // battingHandByName: per-innings cache of resolved RH/LH; the same
  // batter might be in multiple innings so we keep the map flat.
  // pendingHandPrompt: { name, resume } — when set, intercepts the
  // recording flow on a batter's first ball and shows the LH/RH sheet.
  const rosterRef = useRef(new Map());
  const [battingHandByName, setBattingHandByName] = useState({});
  const [pendingHandPrompt, setPendingHandPrompt] = useState(null);

  // Per-bowler approach map ("over" | "around") — hydrated from match doc.
  const [bowlerApproach, setBowlerApproach] = useState(() => {
    return (safe.bowlerApproach && typeof safe.bowlerApproach === "object")
      ? { ...safe.bowlerApproach }
      : {};
  });
  // Sheet for picking the new bowler's approach after a bowler-change.
  const [approachPromptFor, setApproachPromptFor] = useState(null);

  // Ball-edit state — { eventIndex, originalEvent } while editing,
  // null otherwise. When non-null, recordPendingBall's commit path
  // splices the event in place instead of pushing.
  const [editingBall, setEditingBall] = useState(null);
  const [ballEditSheetOpen, setBallEditSheetOpen] = useState(false);

  // Resolve a name's batting hand — local state first, roster blob next,
  // null if unknown (external opponent or unset). Accepts string or
  // member shape; normalises stored values to "RH"/"LH".
  function resolveBattingHand(name) {
    if (!name) return null;
    const local = battingHandByName[name];
    if (local) return local;
    const member = rosterRef.current.get(name.trim().toLowerCase());
    const raw = member?.battingHand;
    if (!raw) return null;
    // Accept both "RH"/"LH" (canonical) and "right"/"left" (legacy
    // ProfileView format) — normalise both to the canonical form.
    const v = String(raw).toLowerCase();
    if (v === "lh" || v === "left") return "LH";
    if (v === "rh" || v === "right") return "RH";
    return null;
  }

  // Viewer / replay / scorecard-peek state (Stage 3)
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [missedBallsCount, setMissedBallsCount] = useState(0);
  const [replay, setReplay] = useState(null); // { balls: [...], index: 0 } or null
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const lastBallSnapshotRef = useRef(null);

  // ── Event log buffering (Task 1) ────────────────────────────
  // Buffered events to write on the next debounced save. Cleared on success.
  const pendingEventsRef = useRef([]);

  // Client-built fall-of-wickets array (Option A: keep whole-innings overwrite).
  // Hydrated from saved innings on mount so the running list survives reloads.
  const [fowList, setFowList] = useState(() => {
    const fromI2 = safe.innings2?.fow;
    const fromI1 = safe.innings1?.fow;
    return Array.isArray(safe.innings2) ? [] : Array.isArray(fromI2) ? fromI2 : Array.isArray(fromI1) ? fromI1 : [];
  });

  // Viewer celebration tracking — fire on event-array growth, skip first-hydration.
  const prevEventsLengthRef = useRef(null);

  // ── Takeover state (Task 4) ─────────────────────────────────
  const [incomingTakeover, setIncomingTakeover] = useState(null); // {fromId, fromName, requestedAt}
  const takeoverClearTimerRef = useRef(null);

  // ── Active-scorer auto-eject (lockout) ──────────────────────
  // When another scorer takes over, the current scorer's view flips to
  // read-only-equivalent — record handlers, debounced save, and heartbeat
  // are all gated by (readOnly || isLockedOut).
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutToast, setLockoutToast] = useState(null);
  const lockoutToastTimerRef = useRef(null);

  // Theme
  const T = nightMode
    ? { bg: SC.bgDark, surface: SC.surfaceDk, text: "#FFFFFF", textDim: "rgba(255,255,255,0.6)" }
    : { bg: SC.bg, surface: SC.surface, text: SC.text, textDim: SC.textDim };

  // Track most recent 6 for the glow animation
  const lastSixRef = useRef(null);

  // ── Roster blob → in-memory Map (mount-once) ────────────────
  // The members roster lives at fccnets/members as a single doc with
  // `value` = JSON-encoded array (or object). We parse once on mount
  // and keep a Map<lowercased name, member> in a ref for O(1) lookup
  // when a new batter takes guard. The ref intentionally outlives
  // re-renders since it's a static lookup table.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "fccnets", "members"));
        if (cancelled || !snap.exists()) return;
        const raw = snap.data()?.value;
        if (!raw) return;
        const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
        const list = Array.isArray(arr) ? arr : Object.values(arr || {});
        const map = new Map();
        for (const m of list) {
          if (m && typeof m === "object" && m.name) {
            map.set(String(m.name).trim().toLowerCase(), m);
          }
        }
        if (!cancelled) rosterRef.current = map;
      } catch (e) {
        console.error("roster fetch/parse error:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Hydrate bowlerApproach from snapshot updates (e.g. on resume).
  useEffect(() => {
    if (safe.bowlerApproach && typeof safe.bowlerApproach === "object") {
      setBowlerApproach(prev => ({ ...prev, ...safe.bowlerApproach }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safe.matchId]);

  // Persist battingHand writebacks to the roster blob.
  // Resolves the matching member by name (case-insensitive), sets
  // battingHand, re-stringifies the array, and merges to Firestore.
  // Stored format is lowercase "right" | "left" to match the
  // ProfileView edit form. The resolver above normalises both forms.
  async function persistRosterBattingHand(name, hand) {
    // Normalise to lowercase legacy form for storage.
    const stored = String(hand).toLowerCase() === "lh" || String(hand).toLowerCase() === "left"
      ? "left" : "right";
    try {
      const ref = doc(db, "fccnets", "members");
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const raw = snap.data()?.value;
      if (!raw) return;
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      const list = Array.isArray(arr) ? arr : Object.values(arr || {});
      const targetLc = String(name).trim().toLowerCase();
      let mutated = false;
      const next = list.map(m => {
        if (!m || typeof m !== "object" || !m.name) return m;
        if (String(m.name).trim().toLowerCase() === targetLc) {
          mutated = true;
          return { ...m, battingHand: stored };
        }
        return m;
      });
      if (!mutated) {
        console.log(`battingHand writeback skipped (no roster match): ${name}`);
        return;
      }
      // Update in-memory map so subsequent batters resolve without a re-fetch.
      const member = next.find(m => m && m.name && String(m.name).trim().toLowerCase() === targetLc);
      if (member) rosterRef.current.set(targetLc, member);
      const nextRaw = typeof raw === "string" ? JSON.stringify(next) : next;
      await setDoc(ref, { value: nextRaw }, { merge: true });
      console.log(`battingHand writeback ok: ${name} → ${stored}`);
    } catch (e) {
      console.error("battingHand writeback error:", e);
      // Surface as a flash toast so the scorer notices.
      try {
        setLockoutToast("Couldn't save batting hand to profile");
        setTimeout(() => setLockoutToast(null), 4000);
      } catch {}
    }
  }

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

  // Opening bowler picker — fires once per innings at start. Runs BEFORE
  // the batting-order picker so the scorer picks who's bowling the first
  // over for the fielding side. Cancelling falls back to the alphabetical
  // default that was seeded during innings setup.
  useEffect(() => {
    if (readOnly || isLockedOut) return;
    if (balls !== 0) return;
    if (openingBowlerShown[innings]) return;
    setOpeningBowlerShown(prev => ({ ...prev, [innings]: true }));
    setOpeningBowlerOpen(true);
  }, [innings, balls, readOnly, isLockedOut, openingBowlerShown]);

  // TASK 3 — auto-open the batting-order picker once per innings if
  // nothing's been saved and the innings hasn't started. Only the
  // scorer sees the prompt (viewers / locked-out scorers skip).
  // Waits for the opening-bowler picker to resolve first.
  useEffect(() => {
    if (readOnly || isLockedOut) return;
    if (balls !== 0) return;
    if (battingOrder.length > 0) return;
    if (battingOrderAutoOpenedRef.current[innings]) return;
    if (openingBowlerOpen) return;
    if (!openingBowlerShown[innings]) return;
    battingOrderAutoOpenedRef.current[innings] = true;
    // Slight delay so it doesn't race with toss / wicket modals.
    const t = setTimeout(() => setBattingOrderOpen(true), 250);
    return () => clearTimeout(t);
  }, [innings, balls, battingOrder.length, readOnly, isLockedOut, openingBowlerOpen, openingBowlerShown]);

  // ── Firestore persistence (debounced 1200ms) ────────────────
  const saveTimer = useRef(null);
  useEffect(() => {
    if (readOnly || isLockedOut) return; // viewers + locked-out scorers never write
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
          fow: fowList,
          extras: { ...extras },
          target: innings === 1 ? null : target,
          dnb: [],
          // TASK 3: persist user-picked top order. Empty = "skipped".
          battingOrder: battingOrder.length > 0 ? battingOrder : null,
        };
        const i1Payload = innings === 1 ? currentInnings : (savedInnings1 || null);
        const i2Payload = innings === 2 ? currentInnings : null;
        const status = inningsEnd && innings === 2 ? "completed" : (balls > 0 || score > 0 || wickets > 0) ? "live" : "setup";

        // Snapshot+clear events to avoid double-write across debounce ticks.
        const eventsToWrite = pendingEventsRef.current.slice();
        pendingEventsRef.current = [];

        const payload = {
          status,
          innings1: i1Payload,
          innings2: i2Payload,
          bowling: { team: bowlingName },
          // TASK 3 — per-bowler approach map (over/around the wicket).
          bowlerApproach: bowlerApproach && Object.keys(bowlerApproach).length > 0
            ? bowlerApproach
            : null,
          updatedAt: serverTimestamp(),
          lastScorerId:   currentUser?.uid || currentUser?.id || null,
          lastScorerName: currentUser?.name || null,
          lastScorerAt:   serverTimestamp(),
        };
        if (eventsToWrite.length > 0) {
          payload.events = arrayUnion(...eventsToWrite);
        }
        await setDoc(doc(db, "fccscorer", "data", "matches", safe.matchId), payload, { merge: true });
      } catch (e) {
        console.error("LiveScorer save error:", e);
        // On error, re-queue events so we don't lose them.
        // (No-op: we already cleared, but next ball will trigger another save.
        // In practice we'd push them back, but the simpler shape is to log.)
      }
    }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [score, wickets, balls, batters, bowler, extras, innings, target, inningsEnd, safe.matchId, readOnly, fowList, currentUser, isLockedOut, battingOrder, bowlerApproach]);

  // ── Latest event data for viewer replay/catch-up ────────────
  const latestEventsRef = useRef([]);

  // ── Viewer-mode live subscription (Stage 3) ─────────────────
  useEffect(() => {
    if (!readOnly || !safe.matchId) return;
    const ref = doc(db, "fccscorer", "data", "matches", safe.matchId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      // TASK 5 + TASK 6 — track status / scorer name / events length so
      // we can show the waiting screen and the "Scored by …" caption.
      setViewerStatus(data.status || "setup");
      setViewerEventsLen(Array.isArray(data.events) ? data.events.length : 0);
      if (data.lastScorerName) setViewerLastScorerName(data.lastScorerName);
      // Pick the live innings (2nd if exists else 1st)
      const isI2 = !!data.innings2;
      const innData = isI2 ? data.innings2 : data.innings1;
      if (!innData) return;
      const newBalls = innData.ballsBowled ?? 0;
      const currentInnings = isI2 ? 2 : 1;
      // Apply state
      setInnings(currentInnings);
      setScore(innData.score ?? 0);
      setWickets(innData.wickets ?? 0);
      setBalls(newBalls);

      // Derive `thisOver` strip from match.events so viewer pill row stays
      // in sync. Strip reflects the CURRENT over of the CURRENT innings.
      const currentOverNum = Math.floor(newBalls / 6);
      const allEvents = Array.isArray(data.events) ? data.events : [];
      const overEvents = allEvents
        .filter(e => e.innings === currentInnings && e.over === currentOverNum)
        .sort((a, b) => (a.ball ?? 0) - (b.ball ?? 0));
      const slots = [null, null, null, null, null, null];
      overEvents.forEach(e => {
        const slot = (e.ball ?? 0) % 6;
        if (slot >= 0 && slot < 6) slots[slot] = e.label || null;
      });
      setOverBalls(slots);

      // Break state sync.
      if (data.breakState && data.breakState.reason) {
        const bs = data.breakState;
        let startedAtMs = null;
        if (bs.startedAt) {
          if (typeof bs.startedAt.toMillis === "function") startedAtMs = bs.startedAt.toMillis();
          else if (bs.startedAt.seconds) startedAtMs = bs.startedAt.seconds * 1000;
        }
        setViewerBreak({ reason: bs.reason, startedAtMs: startedAtMs || Date.now() });
      } else {
        setViewerBreak(null);
      }
      if (Array.isArray(innData.batsmen)) {
        const arr = innData.batsmen.slice(0, 2).map(b => ({
          name: b.name || "—",
          runs: b.runs ?? 0,
          balls: b.balls ?? 0,
          fours: b.fours ?? 0,
          sixes: b.sixes ?? 0,
          dismissal: b.dismissal || null,
          notOut: b.dismissal ? false : true,
        }));
        while (arr.length < 2) arr.push({ name: "—", runs: 0, balls: 0, fours: 0, sixes: 0 });
        setBatters(arr);
      }
      if (innData.bowling?.[0]?.name) setBowler(innData.bowling[0].name);
      if (innData.extras) setExtras({
        b: innData.extras.b || 0,
        lb: innData.extras.lb || 0,
        w: innData.extras.w || 0,
        nb: innData.extras.nb || 0,
      });
      if (data.status === "completed") setInningsEnd(true);
      if (isI2 && typeof data.innings1?.score === "number") {
        setTarget(data.innings1.score + 1);
      }

      // ── Event-log driven celebrations (Task 2c) ──
      const events = Array.isArray(data.events) ? data.events : [];
      latestEventsRef.current = events;
      // ── Viewer commentary sync (Task 1) ──
      // Pull the most-recent event's composed commentary into local state
      // every snapshot, so the viewer's line tracks the scorer's screen.
      if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        if (lastEvent && lastEvent.commentary) {
          setCommentary(lastEvent.commentary);
        }
      }
      const prevLen = prevEventsLengthRef.current;
      if (prevLen == null) {
        // First hydration — don't fire celebrations for the whole backlog.
        prevEventsLengthRef.current = events.length;
      } else if (events.length > prevLen) {
        const newEvents = events.slice(prevLen);
        newEvents.forEach(ev => {
          if (ev.wicket) {
            const isDuck = (ev.wicket.runs || 0) === 0;
            setCelebration({
              type: isDuck ? "duck" : "wicket",
              text: isDuck ? "Duck! 🦆" : "WICKET!",
              sub: `${ev.wicket.batter} — ${ev.wicket.type}`,
            });
          } else if (ev.runs === 6) {
            setCelebration({ type: "six", text: "SIX!! 🚀", sub: ev.commentary || ev.striker });
          } else if (ev.runs === 4) {
            setCelebration({ type: "four", text: "FOUR! 🏏", sub: `${ev.striker} finds the boundary` });
          }
          // ── Milestone surfacing on viewer ──
          if (ev.milestone) {
            const tag = ev.milestone;
            const vars = { batter: ev.striker || "the batter", bowler: ev.bowler || "the bowler" };
            const ms = tag === "fifty"   ? pickCommentary("milestone_fifty",   vars)
                    : tag === "hundred"  ? pickCommentary("milestone_hundred", vars)
                    : tag === "fiveFor"  ? pickCommentary("milestone_fiveFor", vars)
                    : null;
            if (ms) flashMilestone(ms);
          }
        });
        prevEventsLengthRef.current = events.length;
      }

      lastBallSnapshotRef.current = newBalls;
    }, (err) => {
      console.error("Viewer onSnapshot error:", err);
    });
    return unsub;
  }, [readOnly, safe.matchId]);

  // ── Catch-up trigger (viewer only, event-log driven) ────────
  useEffect(() => {
    if (!readOnly || !safe.matchId) return;
    let lastSeen = 0;
    try {
      const raw = localStorage.getItem("fcc-watched-" + safe.matchId);
      lastSeen = raw ? parseInt(raw, 10) || 0 : 0;
    } catch {}
    const t = setTimeout(() => {
      const evCount = latestEventsRef.current.length;
      const missed = Math.max(0, evCount - lastSeen);
      if (missed > 5) {
        setMissedBallsCount(missed);
        setCatchUpOpen(true);
      }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, safe.matchId]);

  // ── Active-scorer heartbeat (Task 4b) ───────────────────────
  useEffect(() => {
    if (readOnly || isLockedOut) return;
    if (!safe.matchId) return;
    const meId = currentUser?.uid || currentUser?.id || null;
    if (!meId) return;
    const ref = doc(db, "fccscorer", "data", "matches", safe.matchId);

    // Initial claim/refresh.
    setDoc(ref, {
      activeScorerId: meId,
      activeScorerName: currentUser?.name || null,
      activeScorerLastActiveAt: serverTimestamp(),
    }, { merge: true }).catch(e => console.error("heartbeat init error:", e));

    const t = setInterval(() => {
      setDoc(ref, {
        activeScorerLastActiveAt: serverTimestamp(),
      }, { merge: true }).catch(e => console.error("heartbeat tick error:", e));
    }, HEARTBEAT_MS);

    return () => clearInterval(t);
  }, [readOnly, safe.matchId, currentUser, isLockedOut]);

  // ── Takeover-request subscription (Task 4e) ─────────────────
  // Only active scorers subscribe — viewers already onSnapshot above and
  // don't need approval modals.
  useEffect(() => {
    if (readOnly) return;
    if (!safe.matchId) return;
    const meId = currentUser?.uid || currentUser?.id || null;
    const ref = doc(db, "fccscorer", "data", "matches", safe.matchId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // ── Auto-eject detection ──
      // If the active scorer is now someone else, flip to locked-out mode.
      if (
        !isLockedOut &&
        meId &&
        data.activeScorerId &&
        data.activeScorerId !== meId
      ) {
        setIsLockedOut(true);
        const takerName = data.activeScorerName || "another scorer";
        setLockoutToast(`Scoring taken over by ${takerName}`);
        if (lockoutToastTimerRef.current) clearTimeout(lockoutToastTimerRef.current);
        lockoutToastTimerRef.current = setTimeout(() => setLockoutToast(null), 4000);
      }

      const req = data.takeoverRequest;
      if (!req || !req.fromId) {
        setIncomingTakeover(null);
        return;
      }
      if (req.fromId === meId) {
        // Self-request edge case — no modal.
        setIncomingTakeover(null);
        return;
      }
      if (data.takeoverDecision) {
        // Already decided — ignore.
        return;
      }
      setIncomingTakeover({
        fromId: req.fromId,
        fromName: req.fromName || "Another scorer",
        requestedAt: req.requestedAt || null,
      });
    });
    return unsub;
  }, [safe.matchId, currentUser, readOnly, isLockedOut]);

  // Cleanup lockout toast timer on unmount.
  useEffect(() => {
    return () => {
      if (lockoutToastTimerRef.current) clearTimeout(lockoutToastTimerRef.current);
    };
  }, []);

  // ── Approve/Deny actions ─────────────────────────────────────
  async function respondTakeover(decision) {
    if (!safe.matchId) return;
    const ref = doc(db, "fccscorer", "data", "matches", safe.matchId);
    try {
      await setDoc(ref, {
        takeoverDecision: decision,
        takeoverDecidedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error("respondTakeover error:", e);
    }
    setIncomingTakeover(null);
    // Schedule cleanup of takeover fields after a brief delay so the requester
    // has time to read the decision via their own onSnapshot.
    if (takeoverClearTimerRef.current) clearTimeout(takeoverClearTimerRef.current);
    takeoverClearTimerRef.current = setTimeout(() => {
      setDoc(ref, {
        takeoverRequest: null,
        takeoverDecision: null,
      }, { merge: true }).catch(e => console.error("takeover cleanup error:", e));
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (takeoverClearTimerRef.current) clearTimeout(takeoverClearTimerRef.current);
    };
  }, []);

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

  // Show a milestone / end-of-over flavour line for ~3 s, then clear it.
  function flashMilestone(line) {
    if (!line) return;
    setMilestoneLine(line);
    if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
    milestoneTimerRef.current = setTimeout(() => setMilestoneLine(null), 3000);
  }
  // Clean up the timer on unmount.
  useEffect(() => () => {
    if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
  }, []);

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

  // ── Event log helper (Task 1) ───────────────────────────────
  // delta MAY include a `commentary` override — use that in preference to
  // the stale local-state `commentary`, since record-handlers compose the
  // new line synchronously alongside the event push.
  function pushEvent(delta) {
    if (readOnly || isLockedOut) return;
    const strikerName = batters[striker]?.name || null;
    // Persist the resolved hand at-record-time so the profile-side
    // wagon wheel can re-mirror correctly per-ball even if the same
    // batter later switches stance (rare, but defensive).
    const hand = strikerName ? (battingHandByName[strikerName] || null) : null;
    pendingEventsRef.current.push({
      ts: Date.now(),
      innings,
      over: Math.floor(balls / 6),
      ball: balls % 6,
      striker: strikerName,
      nonStriker: batters[1 - striker]?.name || null,
      bowler: bowler || null,
      commentary: commentary || "",
      pitch: pendingBall?.pitch || null,
      zone: activeZone || null,
      tapPoint: tapPoint ? { x: tapPoint.x, y: tapPoint.y } : null,
      shot: typeof activeShot === "string" ? activeShot : (activeShot?.n || null),
      shotType: pendingBall?.shotType || dotShotType || null,
      battingHand: hand,
      approach: bowler && bowlerApproach[bowler]
        ? (bowlerApproach[bowler] === "around" ? "around" : "over")
        : null,
      label: null,
      runs: 0,
      wicket: null,
      milestone: null,
      ...delta, // overrides
    });
  }

  // Approach-aware commentary helper: returns a human-readable phrase
  // ~30% of the time when the current bowler has an approach set, else
  // "" (which causes commentaryGen to filter out approach-templated
  // lines). Capped at one call per ball so probability is per-delivery,
  // not per-pickCommentary invocation.
  function approachVarForCurrentBall() {
    const a = bowler && bowlerApproach[bowler];
    if (!a) return "";
    if (Math.random() >= 0.3) return "";
    return a === "around" ? "Round the wicket" : "Over the wicket";
  }

  // ── Ball recording ──────────────────────────────────────────
  function recordRuns(runs, opts = {}) {
    if (readOnly || isLockedOut) return;
    pushHistory();
    const newBalls = balls + 1;
    const label = runs === 0 ? "•" : String(runs);
    setOverSlot(balls, label);
    setScore(s => s + runs);
    setBalls(newBalls);
    // Update striker batter stats
    const prevStrikerRuns = batters[striker]?.runs || 0;
    const newStrikerRuns = prevStrikerRuns + runs;
    const batName = batters[striker]?.name || "the batter";
    const nb = [...batters];
    nb[striker] = {
      ...nb[striker],
      runs: newStrikerRuns,
      balls: (nb[striker]?.balls || 0) + 1,
      fours: (nb[striker]?.fours || 0) + (runs === 4 ? 1 : 0),
      sixes: (nb[striker]?.sixes || 0) + (runs === 6 ? 1 : 0),
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

    // ── New commentary generator ──
    // opts.shotType / opts.zone may have been threaded from recordPendingBall.
    const evKey = pickEventKey({
      runs,
      shotType: opts.shotType || null,
      zone: opts.zone || activeZone || null,
    });
    const approach = approachVarForCurrentBall();
    const line = pickCommentary(evKey, { batter: batName, bowler, approach });
    setCommentary(line);

    // Celebrations still fire for 4/6.
    if (runs === 6) {
      lastSixRef.current = newBalls;
      setCelebration({ type: "six", text: "SIX!! 🚀", sub: line });
    } else if (runs === 4) {
      setCelebration({ type: "four", text: "FOUR! 🏏", sub: `${batName} finds the boundary` });
    }

    // ── Milestone detection (striker 50 / 100) ──
    let milestoneTag = null;
    if (prevStrikerRuns < 50 && newStrikerRuns >= 50 && newStrikerRuns < 100) {
      const ms = pickCommentary("milestone_fifty", { batter: batName });
      flashMilestone(ms);
      milestoneTag = "fifty";
    }
    if (prevStrikerRuns < 100 && newStrikerRuns >= 100) {
      const ms = pickCommentary("milestone_hundred", { batter: batName });
      flashMilestone(ms);
      milestoneTag = "hundred";
    }

    // ── End-of-over flavour (~30% chance) ──
    if (newBalls % 6 === 0 && Math.random() < 0.3 && !milestoneTag) {
      const eo = pickCommentary("end_of_over", { bowler, batter: batName });
      flashMilestone(eo);
    }

    pushEvent({
      label: runs === 0 ? "•" : String(runs),
      runs,
      commentary: line,
      milestone: milestoneTag,
      over: Math.floor((newBalls - 1) / 6),
      ball: (newBalls - 1) % 6,
    });
    rotateOnOver(newBalls);
  }

  // recordWide — kind: null | "lb" | "b"
  // bonus: extra runs scored off the wide (excluding the auto-1 for the wide itself)
  // When kind === "lb" or "b", we still add 1 extra on top of the wide and tag the
  // ball with a combined label. No legal ball is consumed; strikers do not rotate.
  function recordWide(bonus = 0, kind = null, labelOverride = null) {
    if (readOnly || isLockedOut) return;
    pushHistory();
    const extraOnTop = (kind === "lb" || kind === "b") ? 1 : bonus;
    const totalAdd = 1 + extraOnTop;
    setScore(s => s + totalAdd);
    setExtras(e => {
      const next = { ...e, w: e.w + 1 + (kind ? 0 : bonus) };
      if (kind === "lb") next.lb = next.lb + 1;
      if (kind === "b")  next.b  = next.b  + 1;
      return next;
    });
    const label = labelOverride || (kind === "lb" ? "Wd+LB" : kind === "b" ? "Wd+B" : `Wd${totalAdd}`);
    setOverSlot(balls, label);
    const batName = batters[striker]?.name || "the batter";
    const line = pickCommentary(pickEventKey({ extras: "wide" }), { batter: batName, bowler });
    setCommentary(line);
    pushEvent({ label, runs: totalAdd, commentary: line });
    // Wide doesn't count as a ball, no striker rotation, no free hit.
  }

  // recordNoBall — bat-runs credit the striker's individual runs (no balls faced).
  // kind: null | "lb" | "b" — leg-bye / bye on top of the no-ball.
  function recordNoBall(batRuns = 0, kind = null, labelOverride = null) {
    if (readOnly || isLockedOut) return;
    pushHistory();
    const extraOnTop = (kind === "lb" || kind === "b") ? 1 : 0;
    const totalAdd = 1 + batRuns + extraOnTop;
    setScore(s => s + totalAdd);
    setExtras(e => {
      const next = { ...e, nb: e.nb + 1 };
      if (kind === "lb") next.lb = next.lb + 1;
      if (kind === "b")  next.b  = next.b  + 1;
      return next;
    });
    // Bat runs credited to striker (runs only, no faced ball on a no-ball).
    if (batRuns > 0) {
      const nb = [...batters];
      nb[striker] = {
        ...nb[striker],
        runs: nb[striker].runs + batRuns,
        fours: nb[striker].fours + (batRuns === 4 ? 1 : 0),
        sixes: nb[striker].sixes + (batRuns === 6 ? 1 : 0),
      };
      setBatters(nb);
    }
    const label = labelOverride || (kind === "lb" ? "Nb+LB" : kind === "b" ? "Nb+B" : `Nb${1 + batRuns}`);
    setOverSlot(balls, label);
    setFreeHit(true);
    // Odd bat-runs rotate strikers (kind extras don't credit the bat → no rotation).
    if (!kind && batRuns % 2 === 1) {
      setStriker(s => (s === 0 ? 1 : 0));
    }
    const batName = batters[striker]?.name || "the batter";
    const line = pickCommentary(pickEventKey({ extras: "noball" }), { batter: batName, bowler });
    setCommentary(line);
    pushEvent({ label, runs: totalAdd, commentary: line });
  }

  function recordBye(runs) {
    if (readOnly || isLockedOut) return;
    pushHistory();
    const newBalls = balls + 1;
    setScore(s => s + runs);
    setExtras(e => ({ ...e, b: e.b + runs }));
    // Encode run count in label so over-total + parser can credit byes.
    setOverSlot(balls, `B${runs}`);
    setBalls(newBalls);
    // Striker still faced a ball (byes are credited as extras, not bat runs).
    const nb = [...batters];
    nb[striker] = { ...nb[striker], balls: nb[striker].balls + 1 };
    setBatters(nb);
    if (runs % 2 === 1) setStriker(s => (s === 0 ? 1 : 0));
    if (freeHit) setFreeHit(false);
    const batName = batters[striker]?.name || "the batter";
    const line = pickCommentary(pickEventKey({ extras: "bye" }), { batter: batName, bowler });
    setCommentary(line);
    pushEvent({
      label: `B${runs}`,
      runs,
      commentary: line,
      over: Math.floor((newBalls - 1) / 6),
      ball: (newBalls - 1) % 6,
    });
    rotateOnOver(newBalls);
  }

  function recordWicket() {
    if (readOnly || isLockedOut) return;
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
    // ── New commentary generator ──
    const wicketShape = { type: wicketType, fielder: fielder || null };
    const evKey = pickEventKey({ wicket: wicketShape });
    const approach = approachVarForCurrentBall();
    const line = pickCommentary(evKey, {
      batter: batName,
      bowler,
      fielder: fielder || null,
      approach,
    });
    setCommentary(line);
    // Append fall-of-wickets entry (Option A: client-built array).
    // FIX 3: enrich with dismissalType + fielder so the ScorecardView reader
    // can render rich strings (e.g. "Smith c Jones b Patel · 8.2 ov"). Codes
    // chosen to be compact in Firestore and forward-compatible:
    //   b   bowled    c   caught    lbw  leg-before
    //   ro  run out   st  stumped   hw   hit wicket
    const DISMISSAL_CODE = {
      "Bowled": "b", "Caught": "c", "LBW": "lbw",
      "Run out": "ro", "Stumped": "st", "Hit wicket": "hw",
    };
    const fowEntry = {
      wicketNum: wickets + 1,
      teamScore: score,
      batter: batName,
      bowler,
      over: `${Math.floor(newBalls / 6)}.${newBalls % 6}`,
      dismissalType: DISMISSAL_CODE[wicketType] || null,
      fielder: fielder || null,
    };
    setFowList(f => [...f, fowEntry]);

    // ── 5-wicket-haul detection ──
    // Track per-bowler wickets in a local ref so we don't depend on a
    // round-trip through Firestore. Ref persists across renders.
    const prevWktsForBowler = bowlerWktsRef.current[bowler] || 0;
    const newWktsForBowler = prevWktsForBowler + 1;
    bowlerWktsRef.current[bowler] = newWktsForBowler;
    let milestoneTag = null;
    if (prevWktsForBowler < 5 && newWktsForBowler >= 5) {
      const ms = pickCommentary("milestone_fiveFor", { bowler });
      flashMilestone(ms);
      milestoneTag = "fiveFor";
    }

    // Event-log row for the wicket ball.
    pushEvent({
      label: "W",
      runs: 0,
      commentary: line,
      milestone: milestoneTag,
      over: Math.floor((newBalls - 1) / 6),
      ball: (newBalls - 1) % 6,
      wicket: {
        type: wicketType,
        batter: batName,
        runs: batters[wicketStriker]?.runs || 0,
        bowler,
        fielder: fielder || null,
      },
    });
    setWicketType(null);
    setFielder("");
    setPendingBall(null);
    setActiveZone(null);
    setTapPoint(null);
    setActiveShot(null);
    setDotShotType(null);
    setModal(null);
    // Prompt new batter
    setTimeout(() => setModal("newbatter"), 600);
    rotateOnOver(newBalls);
  }

  // ── Full-mode dispatch ──────────────────────────────────────
  // ensureBattingHand: gate any record-flow on knowing the striker's
  // batting hand. If the batter has no resolved hand AND is in the
  // roster, we open the hand-prompt sheet and stash `resume` for
  // continuation. External opponents (not in roster) default to "RH"
  // silently — they'll never be re-prompted in subsequent matches.
  function ensureBattingHand(resume) {
    const name = batters[striker]?.name;
    if (!name) { resume(); return; }
    if (battingHandByName[name]) { resume(); return; }
    const rosterHand = resolveBattingHand(name);
    if (rosterHand) {
      setBattingHandByName(prev => ({ ...prev, [name]: rosterHand }));
      resume();
      return;
    }
    // External opponent (not in roster) — default to RH, no prompt.
    const inRoster = rosterRef.current.has(name.trim().toLowerCase());
    if (!inRoster) {
      setBattingHandByName(prev => ({ ...prev, [name]: "RH" }));
      resume();
      return;
    }
    // In roster but no battingHand recorded — prompt user.
    setPendingHandPrompt({ name, resume });
  }

  function handleRunTap(runs) {
    if (readOnly || isLockedOut) return;
    ensureBattingHand(() => {
      if (scoreMode === "fast") {
        recordRuns(runs);
        return;
      }
      const kind = runs === 6 ? "six" : runs === 4 ? "four" : "run";
      setPendingBall({ runs, kind });
      setModal("pitch");
    });
  }
  function handleWicketTap() {
    if (readOnly || isLockedOut) return;
    ensureBattingHand(() => {
      if (scoreMode === "fast") {
        setWicketStriker(striker);
        setModal("wicket");
        return;
      }
      setPendingBall({ runs: 0, kind: "wicket" });
      setModal("pitch");
    });
  }

  // WIDE / NO-BALL → open the bonus-runs sheet (both fast + full modes).
  function handleWideTap() {
    if (readOnly || isLockedOut) return;
    ensureBattingHand(() => {
      setPendingExtras({ type: "wide", bonusRuns: 0, kind: null });
      setModal("extrasBonus");
    });
  }
  function handleNoBallTap() {
    if (readOnly || isLockedOut) return;
    ensureBattingHand(() => {
      setPendingExtras({ type: "noball", bonusRuns: 0, batRuns: 0 });
      setModal("extrasBonus");
    });
  }

  // Apply the user's bonus-sheet choice and record.
  // opt: { bonus?: number, kind?: "lb"|"b" }
  function applyExtrasBonus(opt) {
    if (readOnly || isLockedOut) return;
    const pe = pendingExtras;
    if (!pe) return;
    if (pe.type === "wide") {
      if (opt.kind) {
        recordWide(0, opt.kind);
      } else {
        recordWide(opt.bonus || 0, null);
      }
    } else if (pe.type === "noball") {
      if (opt.kind) {
        recordNoBall(0, opt.kind);
      } else {
        recordNoBall(opt.bonus || 0, null);
      }
    }
    setPendingExtras(null);
    setPendingBall(null);
    setActiveZone(null);
    setTapPoint(null);
    setActiveShot(null);
    setDotShotType(null);
    setModal(null);
  }

  function recordPendingBall(opts = {}) {
    if (readOnly || isLockedOut) return;
    const pb = { ...(pendingBall || {}), ...opts };
    if (!pb) return;

    // ── Edit mode: commit the new shape into the events array
    //    instead of appending. We deliberately don't route through
    //    recordRuns/recordWide/etc. for edits — commitBallEdit walks
    //    the recomputed forward-pass, so all derived totals fall out.
    if (editingBall) {
      // Limited edit semantics: we only re-thread pitch / zone / shot
      // / shotType / runs. Extras (wide/no-ball/bye) and wicket
      // dismissal type are NOT re-editable through this path — they
      // require their own dedicated flows. If the original event was
      // a wicket we preserve the wicket sub-shape; the edited values
      // refine the metadata (pitch/zone/shot) only.
      const orig = editingBall.originalEvent || {};
      const wasWicket = !!orig.wicket;
      const newRuns = wasWicket ? 0 : (pb.runs ?? 0);
      const label = wasWicket ? "W" : (newRuns === 0 ? "•" : String(newRuns));
      const newEvent = {
        runs: newRuns,
        label,
        pitch: pb.pitch || null,
        zone: activeZone || pb.zone || null,
        tapPoint: tapPoint ? { x: tapPoint.x, y: tapPoint.y } : null,
        shot: typeof activeShot === "string" ? activeShot : (activeShot?.n || null),
        shotType: pb.shotType || dotShotType || null,
        // Preserve immutables / sub-shapes.
        wicket: orig.wicket || null,
      };
      commitBallEdit(newEvent);
      return;
    }

    // Wide / no-ball from pitch picker → route into bonus sheet instead of
    // recording immediately. Wagon wheel is skipped for extras.
    if (pb.kind === "wide") {
      setPendingExtras({ type: "wide", bonusRuns: 0, kind: null });
      setModal("extrasBonus");
      return;
    }
    if (pb.kind === "noball") {
      setPendingExtras({ type: "noball", bonusRuns: 0, batRuns: 0 });
      setModal("extrasBonus");
      return;
    }

    if (pb.kind === "wicket") {
      // Send user into the existing wicket flow (need dismissal type / batter)
      setWicketStriker(striker);
      setPendingBall(pb); // keep pitch/zone metadata for future use
      setModal("wicket");
      return;
    } else {
      // Thread shotType + zone through to recordRuns so the new commentary
      // generator picks the correct sub-category (driven vs pulled vs
      // edged for 4s, straight/legside/offside for 6s, defended/missed/
      // leave for dots).
      recordRuns(pb.runs, {
        shotType: pb.shotType || dotShotType || null,
        zone: activeZone || pb.zone || null,
      });
    }
    setPendingBall(null);
    setActiveZone(null);
    setTapPoint(null);
    setActiveShot(null);
    setDotShotType(null);
    setModal(null);
  }

  // ── Per-innings opener resolution (for forward-pass) ──────────
  // recomputeForInnings needs to know who walked out first. Prefer the
  // saved batting order; fall back to the first two squad entries.
  function openersForInnings(inningsNum) {
    const order = inningsNum === 1 ? safe.innings1?.battingOrder : safe.innings2?.battingOrder;
    if (Array.isArray(order) && order[0] && order[1]) return [order[0], order[1]];
    if (inningsNum === 1) return [squad1[0], squad1[1]];
    return [squad2[0], squad2[1]];
  }

  // Apply a recomputed snapshot to local React state.
  function applyRecomputedSnapshot(snap) {
    setScore(snap.score);
    setWickets(snap.wickets);
    setBalls(snap.balls);
    setBatters(snap.batters);
    setStriker(snap.striker);
    setOverBalls(snap.overBalls);
    setFreeHit(snap.freeHit);
    setExtras(snap.extras);
    setFowList(snap.fowList);
  }

  // Load this-over events on demand for the edit sheet. We fetch once
  // from Firestore (committed) and merge any locally-pending events so
  // the most recent ball is visible even if the debounced save hasn't
  // run yet. Returns {events, currentOverEvents, currentOverNum}.
  async function loadOverEventsForEdit() {
    const out = { events: [], currentOverEvents: [] };
    try {
      if (!safe.matchId) return out;
      const snap = await getDoc(doc(db, "fccscorer", "data", "matches", safe.matchId));
      const committed = Array.isArray(snap.data()?.events) ? snap.data().events : [];
      const merged = [...committed, ...pendingEventsRef.current];
      const currentOverNum = Math.floor(balls / 6);
      const isCurrentBall = balls % 6 === 0 && balls > 0; // over boundary edge case
      // Filter to current innings + current over.
      const currentOverEvents = merged
        .map((ev, idx) => ({ ev, idx }))
        .filter(({ ev }) =>
          (ev?.innings ?? 1) === innings &&
          (ev?.over ?? Math.floor((ev?.ball ?? 0) / 6)) === (isCurrentBall ? currentOverNum - 1 : currentOverNum)
        );
      out.events = merged;
      out.currentOverEvents = currentOverEvents;
      return out;
    } catch (e) {
      console.error("loadOverEventsForEdit error:", e);
      return out;
    }
  }

  // Ball edit save — splice the event in `events`, persist the full
  // array (not arrayUnion), and recompute scoreboard state.
  async function commitBallEdit(newEvent) {
    if (readOnly || isLockedOut) return;
    if (!editingBall) return;
    if (!safe.matchId) return;
    try {
      // Flush anything in pendingEventsRef first so the on-disk events
      // array isn't behind us.
      const pending = pendingEventsRef.current.slice();
      pendingEventsRef.current = [];
      const ref = doc(db, "fccscorer", "data", "matches", safe.matchId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const events = Array.isArray(data.events) ? data.events.slice() : [];
      // If we still have un-flushed pending, append them first.
      pending.forEach(ev => events.push(ev));
      const idx = editingBall.eventIndex;
      if (idx < 0 || idx >= events.length) {
        console.warn("commitBallEdit: index out of range", idx, events.length);
        setEditingBall(null);
        return;
      }
      // Preserve immutable fields (ts/innings/over/ball/striker etc.)
      events[idx] = { ...events[idx], ...newEvent };
      // Recompute the snapshot for the current innings — innings 1 if
      // we haven't switched yet, innings 2 otherwise.
      const recomputed = recomputeForInnings(events, innings, openersForInnings(innings), bowler);
      applyRecomputedSnapshot(recomputed);
      await setDoc(ref, {
        events,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log(`ball edit committed: event #${idx}`);
    } catch (e) {
      console.error("commitBallEdit error:", e);
    } finally {
      setEditingBall(null);
      setBallEditSheetOpen(false);
      setPendingBall(null);
      setActiveZone(null);
      setTapPoint(null);
      setActiveShot(null);
      setDotShotType(null);
      setModal(null);
    }
  }

  // ── Forward-pass recomputation (TASK 4 — Ball edit) ─────────
  // Walks the events array for the CURRENT innings in order and rebuilds
  // every scoreboard slot from scratch. Returns the recomputed snapshot
  // ({score, wickets, balls, batters, striker, freeHit, overBalls,
  // fowList, extras}); the caller applies it via setState.
  //
  // Trade-off: this duplicates the per-event mutation logic from
  // recordRuns/recordWide/recordNoBall/recordBye/recordWicket — a single
  // source of truth would be better, but the in-place mutation helpers
  // are tightly coupled to React state setters and pushHistory. Cleanest
  // to fork the math into a pure function here.
  function recomputeForInnings(events, inningsNum, openers, openingBowler) {
    let score = 0, wickets = 0, ballsCount = 0;
    let strikerIdx = 0;
    let freeHit = false;
    const ex = { b: 0, lb: 0, w: 0, nb: 0 };
    // Snapshot of the two crease batters — name + cumulative figures.
    const batsRecord = openers.map(name => ({
      name, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: null, notOut: true,
    }));
    let nextIncomingIdx = 2;       // points into the squad/order for the next batter
    const fow = [];
    const overSlots = [null, null, null, null, null, null];

    // Track all "ever batted" entries so dismissed batters' figures are
    // preserved beyond their dismissal — keyed by name (collision-free
    // assuming squad names are unique within a match).
    const allBatsByName = {};
    openers.forEach(n => { allBatsByName[n] = batsRecord[0].name === n ? batsRecord[0] : batsRecord[1]; });

    // Innings-2 batting order, if persisted.
    const order = (inningsNum === 1 ? safe.innings1?.battingOrder : safe.innings2?.battingOrder) || battingOrder || [];
    const fillNextBatter = () => {
      // Look up the next unbatted name from the saved order; fall back
      // to squad order. Skips anyone already in the all-bats map.
      const squad = inningsNum === 1 ? squad1 : squad2;
      const tried = new Set(Object.keys(allBatsByName));
      const pickFromList = (list) => list.find(n => n && !tried.has(n));
      const next = pickFromList(order) || pickFromList(squad);
      if (!next) return null;
      const rec = { name: next, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: null, notOut: true };
      allBatsByName[next] = rec;
      nextIncomingIdx++;
      return rec;
    };

    const setOver = (slotIdx, label) => {
      if (slotIdx >= 0 && slotIdx < 6) overSlots[slotIdx] = label;
    };

    const filtered = events.filter(e => (e?.innings ?? 1) === inningsNum);
    filtered.forEach(ev => {
      const r = Number(ev.runs) || 0;
      const wkt = ev.wicket || null;
      const label = ev.label || "•";
      const slot = ballsCount % 6;
      const isWide = /^Wd/.test(label);
      const isNb = /^Nb/.test(label);
      const isBye = /^B\d*$/.test(label);
      // ── Wicket ──
      if (wkt) {
        score += r; // (usually 0 for a wicket ball, but defensive)
        const dismissedName = wkt.batter || batsRecord[strikerIdx]?.name;
        const rec = allBatsByName[dismissedName] || batsRecord[strikerIdx];
        if (rec) {
          rec.balls = (rec.balls || 0) + 1;
          rec.dismissal = wkt.type + (wkt.fielder ? ` (${wkt.fielder})` : "");
          rec.notOut = false;
        }
        // Replace dismissed batter at the crease.
        const replaceIdx = batsRecord[0]?.name === dismissedName ? 0
          : batsRecord[1]?.name === dismissedName ? 1
          : strikerIdx;
        const incoming = fillNextBatter();
        if (incoming) batsRecord[replaceIdx] = incoming;
        wickets += 1;
        ballsCount += 1;
        setOver(slot, "W");
        fow.push({
          wicketNum: wickets,
          teamScore: score,
          batter: dismissedName,
          bowler: wkt.bowler || ev.bowler || null,
          over: `${Math.floor(ballsCount / 6)}.${ballsCount % 6}`,
          dismissalType: ({
            "Bowled": "b", "Caught": "c", "LBW": "lbw",
            "Run out": "ro", "Stumped": "st", "Hit wicket": "hw",
          })[wkt.type] || null,
          fielder: wkt.fielder || null,
        });
        if (freeHit) freeHit = false;
        if (ballsCount % 6 === 0) {
          overSlots.fill(null);
          strikerIdx = strikerIdx === 0 ? 1 : 0;
        }
        return;
      }
      // ── Extras: wide ──
      if (isWide) {
        score += r;
        ex.w += 1 + (label === "Wd+LB" || label === "Wd+B" ? 0 : Math.max(0, r - 1));
        if (label === "Wd+LB") ex.lb += 1;
        if (label === "Wd+B")  ex.b  += 1;
        setOver(slot, label);
        // No ball faced, no rotation, no freeHit consumption.
        return;
      }
      // ── Extras: no-ball ──
      if (isNb) {
        score += r;
        ex.nb += 1;
        const extraLbOrB = label === "Nb+LB" ? "lb" : label === "Nb+B" ? "b" : null;
        if (extraLbOrB) ex[extraLbOrB] += 1;
        // Bat-runs credited to striker but no faced ball.
        const m = /^Nb(\d+)$/.exec(label);
        const batRuns = m ? Math.max(0, parseInt(m[1], 10) - 1) : 0;
        if (batRuns > 0 && batsRecord[strikerIdx]) {
          batsRecord[strikerIdx].runs += batRuns;
          if (batRuns === 4) batsRecord[strikerIdx].fours += 1;
          if (batRuns === 6) batsRecord[strikerIdx].sixes += 1;
        }
        setOver(slot, label);
        freeHit = true;
        if (!extraLbOrB && batRuns % 2 === 1) strikerIdx = strikerIdx === 0 ? 1 : 0;
        return;
      }
      // ── Bye ──
      if (isBye) {
        const m = /^B(\d+)$/.exec(label);
        const byeRuns = m ? parseInt(m[1], 10) : (r || 1);
        score += byeRuns;
        ex.b += byeRuns;
        ballsCount += 1;
        setOver(slot, label);
        if (batsRecord[strikerIdx]) batsRecord[strikerIdx].balls += 1;
        if (byeRuns % 2 === 1) strikerIdx = strikerIdx === 0 ? 1 : 0;
        if (freeHit) freeHit = false;
        if (ballsCount % 6 === 0) {
          overSlots.fill(null);
          strikerIdx = strikerIdx === 0 ? 1 : 0;
        }
        return;
      }
      // ── Regular run (incl. 0 dot) ──
      score += r;
      const rec = batsRecord[strikerIdx];
      if (rec) {
        rec.runs += r;
        rec.balls += 1;
        if (r === 4) rec.fours += 1;
        if (r === 6) rec.sixes += 1;
      }
      ballsCount += 1;
      setOver(slot, r === 0 ? "•" : String(r));
      // Rotate on odd, NOT on 4 or 6.
      if (r !== 4 && r !== 6 && r % 2 === 1) {
        strikerIdx = strikerIdx === 0 ? 1 : 0;
      }
      if (freeHit) freeHit = false;
      if (ballsCount % 6 === 0) {
        overSlots.fill(null);
        strikerIdx = strikerIdx === 0 ? 1 : 0;
      }
    });

    return {
      score, wickets,
      balls: ballsCount,
      batters: batsRecord,
      striker: strikerIdx,
      freeHit,
      overBalls: overSlots,
      fowList: fow,
      extras: ex,
    };
  }

  function undo() {
    if (readOnly || isLockedOut) return;
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    restore(last);
  }

  // ── Replay helpers (event-log driven where possible) ────────
  function enrichFromEvents(evs) {
    return evs.map((ev, idx) => ({
      label: ev.label || "•",
      name: ev.striker || "—",
      line: ev.commentary || "",
      runs: ev.runs || 0,
      idx,
    }));
  }

  function triggerReplayLastOver() {
    // Prefer event-log slice for viewers; fall back to local overBalls.
    if (readOnly) {
      const evs = latestEventsRef.current || [];
      const slice = evs.slice(-6);
      if (slice.length) {
        setReplay({
          balls: enrichFromEvents(slice),
          index: 0,
          onDone: () => {
            try { if (safe.matchId) localStorage.setItem("fcc-watched-" + safe.matchId, String(evs.length)); } catch {}
          },
        });
        return;
      }
    }
    // Scorer / fallback: use the local overBalls strip.
    const present = overBalls.filter(Boolean);
    if (!present.length) return;
    const enriched = present.map((label, idx) => {
      const name = batters[striker]?.name || "—";
      const personaLabel = COMMENTARY[persona]?.label || "";
      let evt = "dot";
      if (label === "6") evt = "six";
      else if (label === "4") evt = "four";
      else if (label === "W") evt = "wicket";
      else if (/^Wd/.test(label)) evt = "wide";
      else if (/^Nb/.test(label)) evt = "noball";
      else if (label === "•") evt = "dot";
      else if (/^\d+$/.test(label)) evt = "one";
      const line = `${personaLabel} ${getComm(persona, evt, { name })}`;
      return { label, name, line, idx };
    });
    setReplay({ balls: enriched, index: 0 });
  }

  function triggerReplayCatchUp() {
    const evs = latestEventsRef.current || [];
    let lastSeen = 0;
    try {
      const raw = localStorage.getItem("fcc-watched-" + safe.matchId);
      lastSeen = raw ? parseInt(raw, 10) || 0 : 0;
    } catch {}
    const slice = evs.slice(lastSeen);
    if (!slice.length) {
      // Nothing to replay — just mark caught up.
      try { if (safe.matchId) localStorage.setItem("fcc-watched-" + safe.matchId, String(evs.length)); } catch {}
      return;
    }
    setReplay({
      balls: enrichFromEvents(slice),
      index: 0,
      onDone: () => {
        try { if (safe.matchId) localStorage.setItem("fcc-watched-" + safe.matchId, String(evs.length)); } catch {}
      },
    });
  }

  // ── Match finalization & stats persistence (TASK 6) ────────
  // Wraps up the match: flushes any pending events, marks the doc completed,
  // then walks the events log to build per-player batting / bowling / fielding
  // aggregates and folds them into fccnets/data/members/{id} career rollups
  // (each player resolved by case-insensitive name match against the members
  // collection). Players not in the lookup are skipped silently — handles
  // friendlies / external opponents without exploding.
  //
  // Known limitations (documented in commit):
  //   - maidens = 0 always (per-over run aggregation deferred).
  //   - opponent on matchAppearance: chosen via squad membership; if the
  //     player isn't in either squad it falls back to safe.team2.
  const [finalizingMatch, setFinalizingMatch] = useState(false);
  // Local guard — `safe` is the (constant) prop, so this state tracks
  // whether THIS session has already fired finalise, preventing the
  // auto-effect from re-firing during further state changes.
  const [finalisedLocal, setFinalisedLocal] = useState(safe.finalised === true);
  async function finalizeMatch({ abandoned } = { abandoned: false }) {
    if (readOnly || isLockedOut) return;
    if (!safe.matchId) return;
    if (finalizingMatch) return;
    if (finalisedLocal) return;
    setFinalizingMatch(true);
    try {
      // 1. Flush any pending events to Firestore first so nothing is lost.
      const pending = pendingEventsRef.current.slice();
      pendingEventsRef.current = [];
      if (pending.length > 0) {
        await setDoc(doc(db, "fccscorer", "data", "matches", safe.matchId),
          { events: arrayUnion(...pending) }, { merge: true });
      }

      // 2. Mark match completed/abandoned (status flip kept here so the
      //    Matches list updates even if the stats util fails later on).
      await setDoc(doc(db, "fccscorer", "data", "matches", safe.matchId), {
        status: "completed",
        completedAt: serverTimestamp(),
        abandoned: abandoned === true,
      }, { merge: true });

      // 3. Re-read the canonical doc (post-flush) and hand off to the
      //    shared util — it writes career rollups + matchAppearances
      //    + flips finalised:true on the match doc.
      const matchSnap = await getDoc(doc(db, "fccscorer", "data", "matches", safe.matchId));
      const matchData = matchSnap.exists() ? matchSnap.data() : {};
      // Pass the matchId explicitly — Firestore doc data doesn't include it.
      await finalizeMatchStats({
        db,
        matchData: { ...matchData, matchId: safe.matchId },
        abandoned: abandoned === true,
        force: false,
      });
      setFinalisedLocal(true);
    } catch (e) {
      console.error("finalizeMatch error:", e);
    } finally {
      setFinalizingMatch(false);
      // Return the user to the matches list either way.
      if (typeof onBack === "function") onBack();
    }
  }

  // ── Auto-finalise when 2nd innings ends naturally ────────────
  // Triggered after every ball-record path (state-keyed effect avoids
  // race conditions with async state updates inside the handlers).
  // Tied at full overs is intentionally NOT auto-finalised — let the
  // scorer disambiguate via "End match" so result text stays correct.
  useEffect(() => {
    if (readOnly || isLockedOut) return;
    if (finalisedLocal || finalizingMatch) return;
    if (innings !== 2) return;
    const fullOvers = maxOvers * 6;
    const allOut = wickets >= 10;
    const oversDone = balls >= fullOvers;
    const chased = target != null && score > target;
    const tiedAtFullOvers = target != null && score === target && balls >= fullOvers;
    const matchOver = allOut || oversDone || chased;
    if (!matchOver) return;
    if (tiedAtFullOvers && !allOut && !oversDone) return; // never hit but explicit
    // Small grace window so any in-flight debounced write completes
    // before we re-read the doc inside finalizeMatch.
    const t = setTimeout(() => {
      finalizeMatch({ abandoned: false });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, wickets, balls, innings, target, finalisedLocal, readOnly, isLockedOut]);

  // End-match-early confirm sheet state (TASK 7).
  const [endMatchConfirm, setEndMatchConfirm] = useState(false);

  function start2nd() {
    if (readOnly || isLockedOut) return;
    setSavedInnings1({
      team: team1Name,
      score, wickets,
      overs: overStr(balls),
      ballsBowled: balls,
      batsmen: batters.map(b => ({ ...b, notOut: b.dismissal ? false : true })),
      bowling: [{ name: bowler, overs: overStr(balls), maidens: 0, runs: 0, wickets: 0, dots: 0, wides: 0, noballs: 0 }],
      fow: fowList,
      extras: { ...extras },
      target: null,
      dnb: [],
      battingOrder: battingOrder.length > 0 ? battingOrder : null,
    });
    setFowList([]);
    const t = score + 1;
    setTarget(t);
    setInnings(2);
    setScore(0); setWickets(0); setBalls(0);
    // TASK 3 — reset openers from saved innings-2 batting order if any,
    // otherwise fall back to the first two players in the squad.
    const i2Order = safe.innings2?.battingOrder;
    const opener0 = (Array.isArray(i2Order) && i2Order[0]) || squad2[0];
    const opener1 = (Array.isArray(i2Order) && i2Order[1]) || squad2[1];
    setBatters([
      { name: opener0, runs: 0, balls: 0, fours: 0, sixes: 0 },
      { name: opener1, runs: 0, balls: 0, fours: 0, sixes: 0 },
    ]);
    setStriker(0);
    setBowler(squad1[0]);
    setOverBalls([null, null, null, null, null, null]);
    setExtras({ b: 0, lb: 0, w: 0, nb: 0 });
    setInningsEnd(false);
    setFreeHit(false);
    setHistory([]);
    // Reset per-bowler wicket tally for the new innings (different bowling side).
    bowlerWktsRef.current = {};
    // Clear innings-1 batting order from local state; fresh prompt
    // will auto-open for innings 2 if no order persisted yet.
    setBattingOrder(Array.isArray(i2Order) ? i2Order : []);
  }

  // Computed
  const close = () => setModal(null);
  const overRuns = useMemo(() => {
    return overBalls.reduce((s, b) => {
      if (!b || b === "•" || b === "W") return s;
      if (b === "Wd" || b === "Nb") return s + 1;
      // Wd1/Wd2/.../Wd7 → trailing number is the total runs added
      const mw = /^Wd(\d+)$/.exec(b);
      if (mw) return s + parseInt(mw[1], 10);
      // Nb1/Nb2/.../Nb7 — total = bat-runs + 1 penalty (label already encodes total)
      const mn = /^Nb(\d+)$/.exec(b);
      if (mn) return s + parseInt(mn[1], 10);
      // Wd+LB / Wd+B / Nb+LB / Nb+B → 2 runs (1 extra penalty + 1 leg-bye/bye)
      if (b === "Wd+LB" || b === "Wd+B" || b === "Nb+LB" || b === "Nb+B") return s + 2;
      // Bye-only delivery: "B1".."B4" — runs credited toward over total + team extras
      // ("B" alone = legacy label, treat as 1).
      const mb = /^B(\d+)$/.exec(b);
      if (mb) return s + parseInt(mb[1], 10);
      if (b === "B") return s + 1;
      const n = parseInt(b);
      return Number.isFinite(n) ? s + n : s;
    }, 0);
  }, [overBalls]);
  const strikeRate = (b) => (b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0");
  const rpo = balls > 0 ? (score / (balls / 6)).toFixed(1) : "0.0";

  // ── Render ──────────────────────────────────────────────────
  const headerBg = `linear-gradient(180deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`;

  // TASK 5 — viewer + setup + no events → friendly waiting screen.
  // Once status flips to "live" via onSnapshot, this branch falls
  // through and the normal scorer chrome renders.
  const showWaitingScreen = readOnly && viewerStatus === "setup" && viewerEventsLen === 0;
  if (showWaitingScreen) {
    return (
      <div style={{
        background: T.bg, minHeight: "100vh",
        display: "flex", justifyContent: "center",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        color: T.text,
      }}>
        <div style={{
          width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", minHeight: "100vh",
          border: nightMode ? `1.5px solid rgba(201,168,76,0.45)` : `1px solid rgba(27,42,92,0.08)`,
          boxShadow: nightMode
            ? "0 0 0 1px rgba(201,168,76,0.15), 0 8px 32px rgba(0,0,0,0.4)"
            : "0 8px 32px rgba(27,42,92,0.15)",
        }}>
          {/* Mini header with back + day/night toggle */}
          <div style={{ background: headerBg, padding: "12px 16px 18px", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div onClick={onBack} style={{ fontSize: 22, lineHeight: 1, cursor: "pointer", color: SC.goldLt, paddingRight: 6 }}>‹</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: SC.gold, textTransform: "uppercase", letterSpacing: 1.2 }}>
                📺 Watching · Pre-match
              </div>
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
            <div style={{
              textAlign: "center", marginTop: 14,
              fontSize: 28, fontWeight: 900, letterSpacing: -0.5,
              background: "linear-gradient(135deg, #FFFFFF 0%, #F0D060 100%)",
              backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>{team1Name} vs {team2Name}</div>
            <div style={{ textAlign: "center", marginTop: 6, fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
              {safe.date || "—"}{safe.time ? ` · ${safe.time}` : ""}
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: SC.gold, marginBottom: 8 }}>
              Match has not started yet
            </div>
            <div style={{ fontSize: 13, color: T.textDim }}>
              {safe.time ? `Check back at ${safe.time}` : "Check back soon"}
            </div>
            {safe.venue && (
              <div style={{ fontSize: 12, color: T.textDim, marginTop: 14, fontStyle: "italic" }}>
                Venue: {safe.venue}
              </div>
            )}

            {/* Scorecard peek button — still useful even when empty */}
            <button onClick={() => setScorecardOpen(true)}
              style={{
                marginTop: 28, padding: "10px 18px", borderRadius: 12,
                background: "transparent", border: `1.5px solid ${SC.borderMid}`,
                color: T.textDim, fontSize: 12, fontWeight: 700, cursor: "pointer",
                letterSpacing: 0.4, textTransform: "uppercase",
              }}>📊 View scorecard</button>
          </div>

          {/* Scorecard peek overlay (shared with normal view) */}
          {scorecardOpen && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 600,
              background: nightMode ? SC.surfaceDk : SC.bg, overflowY: "auto",
            }}>
              <ScorecardView
                match={{ ...safe, team1: team1Name, team2: team2Name, status: "setup" }}
                onBack={() => setScorecardOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

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
        @keyframes msFade { from{opacity:0; transform:translateY(-2px)} to{opacity:1; transform:translateY(0)} }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", minHeight: "100vh",
        border: nightMode ? `1.5px solid rgba(201,168,76,0.45)` : `1px solid rgba(27,42,92,0.08)`,
        boxShadow: nightMode
          ? "0 0 0 1px rgba(201,168,76,0.15), 0 8px 32px rgba(0,0,0,0.4)"
          : "0 8px 32px rgba(27,42,92,0.15)",
      }}>

        {/* ── HEADER ── */}
        <div style={{ background: headerBg, padding: "12px 16px 18px", flexShrink: 0, position: "relative", overflow: "hidden", color: "#fff" }}>
          {/* Top row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div onClick={onBack} style={{ fontSize: 22, lineHeight: 1, cursor: "pointer", color: SC.goldLt, paddingRight: 6 }}>‹</div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: SC.red, animation: "pulse 1.4s ease-in-out infinite" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: SC.gold, textTransform: "uppercase", letterSpacing: 1.2 }}>
                {readOnly
                  ? `📺 WATCHING LIVE · ${innings === 1 ? "1ST" : "2ND"} INNINGS`
                  : isLockedOut
                    ? `📺 WATCHING LIVE · ${innings === 1 ? "1ST" : "2ND"} INNINGS`
                    : `LIVE · ${innings === 1 ? "1ST" : "2ND"} INNINGS`}
              </div>
              {freeHit && <div style={{ fontSize: 9, fontWeight: 800, color: SC.navy, background: SC.goldLt, padding: "2px 7px", borderRadius: 10, letterSpacing: 0.6 }}>FREE HIT</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Fast / Full mode toggle — scorer only (hidden once locked out) */}
              {!readOnly && !isLockedOut && (
                <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 2, border: "1px solid rgba(255,255,255,0.12)" }}>
                  {["fast", "full"].map(m => (
                    <div key={m} onClick={() => setScoreMode(m)} style={{
                      padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                      textTransform: "uppercase", cursor: "pointer",
                      background: scoreMode === m ? "linear-gradient(135deg,#C9A84C,#F0D060)" : "transparent",
                      color: scoreMode === m ? SC.navy : "rgba(255,255,255,0.55)",
                    }}>{m}</div>
                  ))}
                </div>
              )}
              {/* Scorecard peek — available to viewers too (FIX 2).
                  Locked-out scorers still get the peek since they behave like
                  viewers; only the active-scorer-only controls are gated. */}
              {!isLockedOut && (
                <div onClick={() => setScorecardOpen(true)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "4px 8px", borderRadius: 10,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    cursor: "pointer", flexShrink: 0,
                  }}
                  title="Scorecard">
                  <div style={{ fontSize: 14, lineHeight: 1 }}>📊</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 1 }}>Scorecard</div>
                </div>
              )}
              {/* Persona quick-pick (kept for viewers too) */}
              <div onClick={() => setModal("commentary")}
                style={{ width: 26, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer", flexShrink: 0 }}
                title="Commentary voice">🎤</div>
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
          </div>

          {/* Team names */}
          <div style={{ textAlign: "center", fontSize: 12, color: SC.gold, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 }}>
            {team1Name} vs {team2Name}
          </div>
          {/* TASK 6 — viewer-only scorer attribution */}
          {readOnly && (viewerLastScorerName || safe.lastScorerName) && (
            <div style={{
              fontSize: 10, color: SC.gold, fontStyle: "italic",
              textAlign: "center", marginTop: 1, opacity: 0.7,
            }}>
              Scored by {viewerLastScorerName || safe.lastScorerName}
            </div>
          )}

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
              THIS OVER
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
          {milestoneLine && (
            <div style={{
              fontSize: 11, color: SC.gold, fontStyle: "italic", fontWeight: 700,
              marginTop: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              animation: "msFade 0.25s ease-out",
            }}>{milestoneLine}</div>
          )}
        </div>

        {/* ── Run buttons panel (hidden for viewers + locked-out scorers) ── */}
        {!readOnly && !isLockedOut && (
          <div style={{ padding: 12, background: T.bg, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Row 1: 0,1,2,3,··· */}
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2, 3].map(n => (
                <RunSmall key={n} onClick={() => handleRunTap(n)} label={n === 0 ? "0" : String(n)} nightMode={nightMode} />
              ))}
              <RunSmall onClick={() => ensureBattingHand(() => setModal("overRuns"))} label={"···"} nightMode={nightMode} small />
            </div>

            {/* Row 2: 4, 6, W */}
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => handleRunTap(4)}
                style={{ flex: 1, height: 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
                  color: "#fff", fontWeight: 900, fontSize: 24, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(27,42,92,0.35)" }}>4</div>
              <div onClick={() => handleRunTap(6)}
                style={{ flex: 1, height: 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`,
                  color: SC.navy, fontWeight: 900, fontSize: 24, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(201,168,76,0.45)" }}>6</div>
              <div onClick={handleWicketTap}
                style={{ flex: 1, height: 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `linear-gradient(135deg, ${SC.red} 0%, ${SC.redDk} 100%)`,
                  color: "#fff", fontWeight: 900, fontSize: 24, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(192,57,43,0.4)" }}>
                <StumpsSvg width={24} height={20} fill="#fff" />
              </div>
            </div>

            {/* Row 3: WIDE, NO BALL, BYE, UNDO */}
            <div style={{ display: "flex", gap: 6 }}>
              <PillBtn onClick={handleWideTap} label="WIDE" nightMode={nightMode} />
              <PillBtn onClick={handleNoBallTap} label="NO BALL" nightMode={nightMode} />
              <PillBtn onClick={() => ensureBattingHand(() => setModal("bye"))} label="BYE" nightMode={nightMode} />
              <PillBtn onClick={undo} label="↩" nightMode={nightMode} noCaps />
            </div>

            {/* Row 4: break / more (SWAP moved into More menu) */}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <PillBtn onClick={() => setModal("break")} label="BREAK" nightMode={nightMode} />
              <PillBtn onClick={() => setModal("more")} label="···" nightMode={nightMode} noCaps />
            </div>
          </div>
        )}

        {/* Spacer for viewer / locked-out — keep score area at top */}
        {(readOnly || isLockedOut) && <div style={{ flex: 1 }} />}

        {/* ── BOWLER CARD ── */}
        <div style={{ padding: "0 12px", marginTop: 8, marginBottom: 12 }}>
          <div style={{
            background: nightMode ? SC.surfaceDk : SC.surface,
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 10,
            padding: "10px 12px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <CricketBallSvg size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: nightMode ? SC.gold : SC.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bowler}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: T.textDim, marginTop: 2 }}>0.0-0-0-0</div>
              {bowlerApproach[bowler] && (
                <div style={{
                  fontSize: 10, color: SC.gold, fontStyle: "italic",
                  marginTop: 2, letterSpacing: 0.4,
                }}>
                  {bowlerApproach[bowler] === "around" ? "Round the wicket" : "Over the wicket"}
                </div>
              )}
            </div>
            {!readOnly && !isLockedOut && (
              <div onClick={() => setModal("bowler")} style={{
                padding: "4px 10px", borderRadius: 999,
                background: "transparent", border: `1px solid ${SC.borderMid}`,
                fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
                color: nightMode ? SC.goldLt : SC.navy, cursor: "pointer", userSelect: "none",
              }}>Change</div>
            )}
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

        {modal === "newbatter" && (() => {
          // TASK 3 — suggested next batter from saved batting order.
          // nextIdx = number of out batters in the current pair (0-indexed
          // position of the incoming batter in the picked top order).
          const outCount = batters.filter(b => b.dismissal).length;
          const suggested = battingOrder[outCount];
          const stillAvailable = (name) => name &&
            !batters.find(b => b.name === name && !b.dismissal);
          const suggestion = stillAvailable(suggested) ? suggested : null;
          const available = (innings === 1 ? squad1 : squad2)
            .filter(p => !batters.find(b => b.name === p && !b.dismissal));
          // Hoist the suggested player to the top of the list visually.
          const ordered = suggestion
            ? [suggestion, ...available.filter(p => p !== suggestion)]
            : available;
          return (
            <Sheet title="New batter in" onClose={close}>
              <div style={{ fontSize: 13, color: SC.textDim, marginBottom: 12 }}>Select the incoming batter from the batting squad.</div>
              {suggestion && (
                <div style={{
                  fontSize: 11, fontWeight: 700, color: SC.gold,
                  textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6,
                }}>Suggested · From batting order</div>
              )}
              {ordered.map(p => {
                const isSuggested = p === suggestion;
                return (
                  <div key={p} onClick={() => {
                    const nb = [...batters];
                    nb[wicketStriker] = { name: p, runs: 0, balls: 0, fours: 0, sixes: 0 };
                    setBatters(nb);
                    setStriker(wicketStriker);
                    close();
                  }}
                    style={{
                      padding: "13px 14px",
                      borderBottom: `1px solid ${SC.border}`,
                      fontSize: 14, color: SC.navy, cursor: "pointer",
                      background: isSuggested ? "rgba(201,168,76,0.12)" : "transparent",
                      fontWeight: isSuggested ? 700 : 500,
                    }}>
                    {isSuggested ? "★ " : ""}{p}
                  </div>
                );
              })}
            </Sheet>
          );
        })()}

        {modal === "bowler" && (
          <Sheet title="Select bowler" onClose={close}>
            <div style={{ fontSize: 13, color: SC.textDim, marginBottom: 14 }}>
              Current: <strong style={{ color: SC.navy }}>{bowler}</strong> · Over {Math.floor(balls / 6) + 1}
            </div>
            {(innings === 1 ? squad2 : squad1).map(p => (
              <div key={p} onClick={() => {
                setBowler(p);
                close();
                // Open approach picker if we don't yet know this bowler's
                // angle — defer one tick so the bowler sheet can finish
                // closing before the approach sheet pops up.
                if (!bowlerApproach[p]) {
                  setTimeout(() => setApproachPromptFor(p), 200);
                }
              }}
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
                <div key={b.id} onClick={() => {
                  setBreakReason(b.id); setBreakElapsed(0); setBreakActive(true); close();
                  // Sync break state to Firestore immediately so viewers see it.
                  if (!readOnly && safe.matchId) {
                    setDoc(doc(db, "fccscorer", "data", "matches", safe.matchId), {
                      breakState: {
                        reason: b.id,
                        startedAt: serverTimestamp(),
                        startedBy: currentUser?.name || null,
                      },
                    }, { merge: true }).catch(e => console.error("break sync error:", e));
                  }
                }}
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

        {modal === "more" && (() => {
          const battersOut = batters.filter(b => b.dismissal).length;
          const canEditOrder = battingOrder.length > 0 && battersOut < battingOrder.length;
          const items = [
            { icon: "🔄", label: "Swap batsmen", onClick: () => { setStriker(s => s === 0 ? 1 : 0); close(); } },
            // BUG 2 — swap openers before the first ball.
            ...(balls === 0
              ? [{ icon: "🔁", label: "Change batsmen", sub: "Swap openers before the first ball",
                  onClick: () => { close(); setChangeBatsmenOpen(true); } }]
              : []),
            // TASK 3 — edit remaining batting order entries mid-innings.
            ...(canEditOrder
              ? [{ icon: "🧾", label: "Edit batting order",
                  sub: `${battingOrder.length - battersOut} unbatted in order`,
                  onClick: () => { close(); setBattingOrderOpen(true); } }]
              : []),
            // TASK 4 — edit a ball in the current over (only when ≥1 ball
            // has been recorded). The sheet itself reads the doc on open
            // and merges locally-pending events so the most recent ball
            // is always editable.
            ...(overBalls.some(Boolean)
              ? [{ icon: "📝", label: "Edit ball in this over",
                  sub: "Tap a pill to correct a recorded ball",
                  onClick: () => { close(); setBallEditSheetOpen(true); } }]
              : []),
            { icon: "↻", label: "Replay last over", onClick: () => { triggerReplayLastOver(); close(); } },
            { icon: "📊", label: "Open scorecard", onClick: () => { setScorecardOpen(true); close(); } },
            { icon: "🎤", label: "Commentary voice", sub: `Now: ${COMMENTARY[persona].name}`, onClick: () => setModal("commentary") },
            { icon: "🏏", label: "End innings now", onClick: () => { setInningsEnd(true); close(); } },
            { icon: "🌗", label: `Switch to ${nightMode ? "day" : "night"} mode`, onClick: () => { setNightMode(n => !n); close(); } },
            // TASK 7 — abandon match early, but persist stats anyway.
            { icon: "🏁", label: "End match", sub: "Abandon match early — stats still saved",
              onClick: () => { close(); setEndMatchConfirm(true); } },
          ];
          return (
          <Sheet title="More" onClose={close}>
            {items.map(a => (
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
          );
        })()}

        {/* ── PITCH PICKER ── */}
        {modal === "pitch" && pendingBall && (
          <Sheet title={editingBall ? "Edit ball — where did it pitch?" : "Where did it pitch?"}
            onClose={() => { setPendingBall(null); setEditingBall(null); close(); }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <PitchPickerSvg
                selected={pendingBall.pitch}
                onPick={(zoneId) => setPendingBall(pb => ({ ...(pb || {}), pitch: zoneId }))}
                onWideOff={() => recordPendingBall({ kind: "wide", pitch: "wide-off" })}
                onWideLeg={() => recordPendingBall({ kind: "wide", pitch: "wide-leg" })}
              />
              <div onClick={() => recordPendingBall({ kind: "noball" })}
                style={{ padding: "8px 18px", borderRadius: 20, background: `linear-gradient(135deg,${SC.red},${SC.redDk})`, color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", cursor: "pointer", marginTop: 4 }}>
                No-ball
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, width: "100%" }}>
                <div onClick={() => recordPendingBall()}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 12, background: SC.surface, border: `1px solid ${SC.border}`, color: SC.textDim, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, cursor: "pointer", textAlign: "center" }}>
                  Skip — score plain
                </div>
                <div onClick={() => {
                  if (!pendingBall?.pitch) return;
                  if (pendingBall.kind === "wicket") {
                    recordPendingBall();
                  } else if (pendingBall.kind === "run" && pendingBall.runs === 0) {
                    // Dot ball — open defensive shot picker instead of wagon wheel.
                    setModal("dotShot");
                  } else {
                    setModal("wagon");
                  }
                }}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 12, background: pendingBall.pitch ? `linear-gradient(135deg,${SC.navy},${SC.navyDk})` : "rgba(27,42,92,0.25)", color: "#fff", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, cursor: pendingBall.pitch ? "pointer" : "not-allowed", textAlign: "center" }}>
                  Next →
                </div>
              </div>
            </div>
          </Sheet>
        )}

        {/* ── WAGON WHEEL ── */}
        {modal === "wagon" && pendingBall && (
          <Sheet title="Where did it go?" onClose={() => { setPendingBall(null); setActiveZone(null); setTapPoint(null); close(); }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <WagonWheel
                activeZone={activeZone}
                tapPoint={tapPoint}
                mirror={battingHandByName[batters[striker]?.name] === "LH"}
                onZoneTap={(zid, point) => {
                  setActiveZone(zid);
                  setTapPoint(point || null);
                  setPendingBall(pb => ({ ...(pb || {}), zone: zid }));
                  // Open shot picker after a short pause so the indicator flashes
                  setTimeout(() => setModal("shot"), 220);
                }}
              />
              <div style={{ fontSize: 11, color: SC.textDim, fontStyle: "italic", textAlign: "center" }}>Tap where it went — then pick a shot</div>
              <div onClick={() => recordPendingBall()}
                style={{ width: "100%", padding: "12px 8px", borderRadius: 12, background: SC.surface, border: `1px solid ${SC.border}`, color: SC.textDim, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, cursor: "pointer", textAlign: "center", marginTop: 4 }}>
                Skip — score plain
              </div>
            </div>
          </Sheet>
        )}

        {/* ── BALL EDIT SHEET (TASK 4) ────────────────────────── */}
        {ballEditSheetOpen && !readOnly && !isLockedOut && (
          <BallEditSheet
            balls={balls}
            innings={innings}
            overBalls={overBalls}
            loadEvents={loadOverEventsForEdit}
            onClose={() => setBallEditSheetOpen(false)}
            onPick={(eventIndex, originalEvent) => {
              // Pre-populate the standard flow with the original event's
              // values, then route it through the pitch picker. The new
              // values flow through the regular sheets; the FINAL commit
              // gets intercepted in recordPendingBall via editingBall.
              setEditingBall({ eventIndex, originalEvent });
              setActiveZone(originalEvent.zone || null);
              setTapPoint(originalEvent.tapPoint || null);
              setActiveShot(originalEvent.shot || null);
              setDotShotType(originalEvent.shotType || null);
              const runs = Number(originalEvent.runs) || 0;
              const isWicket = !!originalEvent.wicket;
              const kind = isWicket ? "wicket"
                : runs === 6 ? "six"
                : runs === 4 ? "four" : "run";
              setPendingBall({
                runs,
                kind,
                pitch: originalEvent.pitch || null,
                zone: originalEvent.zone || null,
                shotType: originalEvent.shotType || null,
              });
              setBallEditSheetOpen(false);
              setModal("pitch");
            }}
          />
        )}

        {/* ── BATTER HANDEDNESS PROMPT (LH / RH wagon mirror) ── */}
        {pendingHandPrompt && !readOnly && !isLockedOut && (
          <Sheet
            title={`${pendingHandPrompt.name} bats right or left handed?`}
            onClose={() => setPendingHandPrompt(null)}
          >
            <div style={{ fontSize: 12, color: SC.textDim, marginBottom: 14, lineHeight: 1.45 }}>
              We'll mirror the wagon wheel for left-handers — and remember this
              for future matches.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { id: "RH", label: "Right" },
                { id: "LH", label: "Left" },
              ].map(opt => (
                <div key={opt.id}
                  onClick={() => {
                    const name = pendingHandPrompt.name;
                    const resume = pendingHandPrompt.resume;
                    setBattingHandByName(prev => ({ ...prev, [name]: opt.id }));
                    persistRosterBattingHand(name, opt.id);
                    setPendingHandPrompt(null);
                    // Resume the original record flow.
                    if (typeof resume === "function") setTimeout(resume, 0);
                  }}
                  style={{
                    padding: "22px 10px", borderRadius: 14,
                    background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
                    color: "#fff", textAlign: "center",
                    fontSize: 18, fontWeight: 800, letterSpacing: 0.5,
                    cursor: "pointer", boxShadow: "0 4px 14px rgba(27,42,92,0.35)",
                  }}>
                  {opt.label}
                </div>
              ))}
            </div>
          </Sheet>
        )}

        {/* ── BOWLER APPROACH (over / round the wicket) ─────────── */}
        {approachPromptFor && !readOnly && !isLockedOut && (
          <Sheet
            title={`${approachPromptFor}'s approach`}
            onClose={() => {
              // Default to "over" if dismissed without a pick.
              setBowlerApproach(prev => prev[approachPromptFor]
                ? prev
                : { ...prev, [approachPromptFor]: "over" });
              setApproachPromptFor(null);
            }}
          >
            <div style={{ fontSize: 12, color: SC.textDim, marginBottom: 14, lineHeight: 1.45 }}>
              How is {approachPromptFor} coming in?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { id: "over",   label: "Over the wicket" },
                { id: "around", label: "Round the wicket" },
              ].map(opt => (
                <div key={opt.id}
                  onClick={() => {
                    setBowlerApproach(prev => ({ ...prev, [approachPromptFor]: opt.id }));
                    setApproachPromptFor(null);
                  }}
                  style={{
                    padding: "20px 10px", borderRadius: 14,
                    background: bowlerApproach[approachPromptFor] === opt.id
                      ? `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`
                      : SC.surface,
                    color: bowlerApproach[approachPromptFor] === opt.id ? SC.navy : SC.navy,
                    border: `1.5px solid ${bowlerApproach[approachPromptFor] === opt.id ? SC.gold : SC.borderMid}`,
                    textAlign: "center",
                    fontSize: 14, fontWeight: 800, letterSpacing: 0.4,
                    cursor: "pointer",
                  }}>
                  {opt.label}
                </div>
              ))}
            </div>
          </Sheet>
        )}

        {/* ── DOT-BALL DEFENSIVE SHOT PICKER ── */}
        {modal === "dotShot" && pendingBall && (
          <Sheet
            title="Shot played"
            onClose={() => {
              // Skip → record dot with no shotType.
              setDotShotType(null);
              recordPendingBall({ shotType: null });
            }}
          >
            <div style={{ fontSize: 12, color: SC.textDim, marginBottom: 14, fontWeight: 600, letterSpacing: 0.3 }}>
              {(() => {
                const pitchDescMap = { "Yorker":"Yorker", "Full":"Full ball", "Good length":"Good length", "Back of length":"Back of length", "Short":"Short" };
                const desc = pendingBall.pitch ? (pitchDescMap[pendingBall.pitch] || pendingBall.pitch) : "";
                return desc ? `${desc}, no run scored` : "No run scored";
              })()}
            </div>
            {[
              { id: "defensive", icon: "🛡️", label: "Defended",   sub: "Bat met ball, no run" },
              { id: "miss",      icon: "❌", label: "Missed",     sub: "Played and missed, no contact" },
              { id: "leave",     icon: "🚫", label: "Left",       sub: "Shouldered arms, didn't play" },
            ].map(opt => (
              <div key={opt.id} onClick={() => {
                setDotShotType(opt.id);
                recordPendingBall({ shotType: opt.id });
              }}
                style={{ padding: "14px 12px", borderBottom: `1px solid ${SC.border}`, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ fontSize: 24, width: 32, textAlign: "center", flexShrink: 0 }}>{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: nightMode ? SC.gold : SC.navy }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: SC.textDim, marginTop: 2 }}>{opt.sub}</div>
                </div>
              </div>
            ))}
            <div onClick={() => { setDotShotType(null); recordPendingBall({ shotType: null }); }}
              style={{ padding: "14px 14px", marginTop: 8, textAlign: "center", color: SC.textMuted, fontStyle: "italic", fontSize: 13, cursor: "pointer" }}>
              Skip
            </div>
          </Sheet>
        )}

        {/* ── SHOT PICKER ── */}
        {modal === "shot" && pendingBall && activeZone && (
          <Sheet
            title="Shot played"
            onClose={() => { setActiveShot(null); recordPendingBall(); }}
          >
            <div style={{ fontSize: 12, color: SC.textDim, marginBottom: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
              {ZONES[activeZone]?.label || ""}
            </div>
            {(ZONES[activeZone]?.shots || []).map((shot) => (
              <div key={shot.n} onClick={() => {
                setActiveShot(shot.n);
                recordPendingBall();
              }}
                style={{ padding: "13px 14px", borderBottom: `1px solid ${SC.border}`, cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: nightMode ? SC.gold : SC.navy }}>{shot.n}</div>
                <div style={{ fontSize: 11, color: SC.textDim, marginTop: 2 }}>{shot.d}</div>
              </div>
            ))}
            <div onClick={() => { setActiveShot(null); recordPendingBall(); }}
              style={{ padding: "14px 14px", marginTop: 8, textAlign: "center", color: SC.textMuted, fontStyle: "italic", fontSize: 13, cursor: "pointer" }}>
              Skip
            </div>
          </Sheet>
        )}

        {/* ── EXTRAS BONUS RUNS ── */}
        {modal === "extrasBonus" && pendingExtras && (
          <Sheet
            title={pendingExtras.type === "wide" ? "Wide — bonus runs?" : "No-ball — bonus runs?"}
            onClose={() => { setPendingExtras(null); setPendingBall(null); close(); }}
          >
            <div style={{ fontSize: 12, color: SC.textDim, marginBottom: 14, lineHeight: 1.4 }}>
              {pendingExtras.type === "wide"
                ? "Extra run auto-added. Any bonus runs scored?"
                : "No-ball — 1 run added. Any runs off the bat?"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {(pendingExtras.type === "wide"
                ? [
                    { lbl: "Wide only", opt: { bonus: 0 } },
                    { lbl: "+1",        opt: { bonus: 1 } },
                    { lbl: "+2",        opt: { bonus: 2 } },
                    { lbl: "+3",        opt: { bonus: 3 } },
                    { lbl: "+4",        opt: { bonus: 4 } },
                    { lbl: "+6",        opt: { bonus: 6 } },
                    { lbl: "+LB",       opt: { kind: "lb" } },
                    { lbl: "+B",        opt: { kind: "b"  } },
                  ]
                : [
                    { lbl: "No-ball only", opt: { bonus: 0 } },
                    { lbl: "+1",           opt: { bonus: 1 } },
                    { lbl: "+2",           opt: { bonus: 2 } },
                    { lbl: "+3",           opt: { bonus: 3 } },
                    { lbl: "+4",           opt: { bonus: 4 } },
                    { lbl: "+6",           opt: { bonus: 6 } },
                    { lbl: "+LB",          opt: { kind: "lb" } },
                    { lbl: "+B",           opt: { kind: "b"  } },
                  ]
              ).map((b) => (
                <div key={b.lbl} onClick={() => applyExtrasBonus(b.opt)}
                  style={{
                    padding: "14px 4px", borderRadius: 12,
                    border: `1.5px solid ${SC.border}`,
                    background: SC.surface,
                    fontSize: 13, fontWeight: 700, color: SC.navy,
                    cursor: "pointer", textAlign: "center",
                  }}>{b.lbl}</div>
              ))}
            </div>
          </Sheet>
        )}

        {/* BUG 2 — Change opening batsmen before the first ball */}
        {changeBatsmenOpen && !readOnly && !isLockedOut && (
          <ChangeBatsmenSheet
            squad={innings === 1 ? squad1 : squad2}
            current={[batters[0]?.name, batters[1]?.name]}
            onClose={() => setChangeBatsmenOpen(false)}
            onSave={(strikerName, nonStrikerName) => {
              setBatters(prev => {
                const out = [...prev];
                out[0] = { ...(out[0] || {}), name: strikerName, runs: 0, balls: 0, fours: 0, sixes: 0 };
                out[1] = { ...(out[1] || {}), name: nonStrikerName, runs: 0, balls: 0, fours: 0, sixes: 0 };
                return out;
              });
              setStriker(0);
              setChangeBatsmenOpen(false);
            }}
          />
        )}

        {/* Opening bowler picker (auto-opens before batting-order at innings start) */}
        {openingBowlerOpen && !readOnly && !isLockedOut && (
          <Sheet title="Opening bowler" onClose={() => setOpeningBowlerOpen(false)}>
            <div style={{ fontSize: 13, color: SC.textDim, marginBottom: 14 }}>
              Who's bowling the first over for{" "}
              <strong style={{ color: SC.navy }}>{innings === 1 ? team2Name : team1Name}</strong>?
            </div>
            {(innings === 1 ? squad2 : squad1).map(p => {
              const member = rosterRef.current.get(String(p).trim().toLowerCase());
              const handRaw = member?.bowlingHand;
              const hand = handRaw
                ? (String(handRaw).toLowerCase().startsWith("l") ? "LH" : "RH")
                : null;
              const initials = String(p).split(/\s+/).filter(Boolean)
                .map(s => s[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={p} onClick={() => {
                  setBowler(p);
                  setOpeningBowlerOpen(false);
                  if (!bowlerApproach[p]) {
                    setTimeout(() => setApproachPromptFor(p), 200);
                  }
                }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderBottom: `1px solid ${SC.border}`,
                    cursor: "pointer", background: bowler === p ? "rgba(24,95,165,0.06)" : "transparent",
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: SC.navy, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                    flexShrink: 0,
                  }}>{initials}</div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: bowler === p ? 700 : 600,
                    color: bowler === p ? SC.blue : SC.navy }}>{p}</div>
                  {hand && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                      color: SC.gold, background: "rgba(201,168,76,0.14)",
                      padding: "3px 8px", borderRadius: 99,
                    }}>{hand}</div>
                  )}
                </div>
              );
            })}
            <div onClick={() => setOpeningBowlerOpen(false)}
              style={{
                textAlign: "center", marginTop: 14, padding: "10px",
                fontSize: 13, fontWeight: 600, color: SC.textMuted, cursor: "pointer",
              }}>
              Cancel (use alphabetical default)
            </div>
          </Sheet>
        )}

        {/* TASK 3 — Batting-order picker (auto-opens on innings start) */}
        {battingOrderOpen && !readOnly && !isLockedOut && (
          <BattingOrderSheet
            squad={innings === 1 ? squad1 : squad2}
            battingTeam={innings === 1 ? team1Name : team2Name}
            currentOrder={battingOrder}
            ballsBowled={balls}
            onClose={() => setBattingOrderOpen(false)}
            onSave={(order) => {
              setBattingOrder(order);
              // If openers can still be repositioned (no ball bowled),
              // sync batters[0]/batters[1] to the top of the order.
              if (balls === 0) {
                setBatters(prev => {
                  const out = [...prev];
                  if (order[0]) out[0] = { ...(out[0] || {}), name: order[0], runs: 0, balls: 0, fours: 0, sixes: 0 };
                  if (order[1]) out[1] = { ...(out[1] || {}), name: order[1], runs: 0, balls: 0, fours: 0, sixes: 0 };
                  return out;
                });
                setStriker(0);
              }
              setBattingOrderOpen(false);
            }}
            onSkip={() => {
              const sq = innings === 1 ? squad1 : squad2;
              setBattingOrder(sq.slice(0, 5));
              setBattingOrderOpen(false);
            }}
          />
        )}

        {/* Takeover approval modal (active-scorer side) — hidden once locked out */}
        {incomingTakeover && !readOnly && !isLockedOut && (
          <TakeoverApprovalModal
            fromName={incomingTakeover.fromName}
            onApprove={() => respondTakeover("approved")}
            onDeny={() => respondTakeover("denied")}
          />
        )}

        {/* Lockout toast — bottom-center, navy gradient, 4s auto-dismiss */}
        {lockoutToast && (
          <div style={{
            position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)",
            zIndex: 1600, maxWidth: 360, width: "calc(100% - 32px)",
            background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
            border: `1.5px solid ${SC.gold}`, borderRadius: 14,
            padding: "13px 18px", textAlign: "center",
            color: "#fff", fontSize: 13, fontWeight: 700,
            boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
            letterSpacing: 0.2,
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>👋</div>
            {lockoutToast}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: 500 }}>
              You can keep watching live
            </div>
          </div>
        )}

        {/* Overlays */}
        {celebration && <Celebrate data={celebration} onDone={() => setCelebration(null)} />}
        {/* Scorer side: local break controls. Viewer side: from Firestore breakState. */}
        {!readOnly && breakActive && (
          <BreakScreen
            reason={breakReason}
            elapsed={breakElapsed}
            onResume={() => {
              setBreakActive(false); setBreakElapsed(0);
              // Clear break state in Firestore so viewers leave the overlay.
              if (safe.matchId) {
                setDoc(doc(db, "fccscorer", "data", "matches", safe.matchId), {
                  breakState: null,
                }, { merge: true }).catch(e => console.error("break clear error:", e));
              }
            }}
          />
        )}
        {readOnly && viewerBreak && (
          <BreakScreen
            reason={viewerBreak.reason}
            startedAtMs={viewerBreak.startedAtMs}
            onResume={null}
          />
        )}
        {inningsEnd && (
          <InningsEnd
            score={score} wickets={wickets} balls={balls}
            maxOvers={maxOvers}
            battingTeam={innings === 1 ? team1Name : team2Name}
            innings={innings} target={target}
            onStart2nd={() => { start2nd(); setInningsEnd(false); }}
            onClose={() => setInningsEnd(false)}
            saving={finalizingMatch}
            onSaveExit={readOnly || isLockedOut
              ? null
              : () => finalizeMatch({ abandoned: false })}
          />
        )}

        {/* End-match-early confirm sheet (TASK 7) */}
        {endMatchConfirm && (
          <Sheet title="End match early?" onClose={() => !finalizingMatch && setEndMatchConfirm(false)}>
            <div style={{ fontSize: 13, color: SC.textDim, lineHeight: 1.5, marginBottom: 16 }}>
              Stats will be saved to player profiles, but the match will be flagged as abandoned.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => !finalizingMatch && setEndMatchConfirm(false)}
                disabled={finalizingMatch}
                style={{
                  flex: 1, padding: "12px 12px", borderRadius: 10,
                  background: "#fff", border: `1.5px solid ${SC.border}`, color: SC.textMuted,
                  fontWeight: 700, fontSize: 14, cursor: finalizingMatch ? "default" : "pointer",
                  opacity: finalizingMatch ? 0.5 : 1,
                }}>Cancel</button>
              <button onClick={async () => { await finalizeMatch({ abandoned: true }); setEndMatchConfirm(false); }}
                disabled={finalizingMatch}
                style={{
                  flex: 1, padding: "12px 12px", borderRadius: 10, border: "none",
                  background: finalizingMatch ? "#e2e8f0" : `linear-gradient(135deg, ${SC.red}, ${SC.redDk})`,
                  color: finalizingMatch ? "#94a3b8" : "#fff",
                  fontWeight: 800, fontSize: 14, cursor: finalizingMatch ? "default" : "pointer",
                }}>{finalizingMatch ? "Saving…" : "End match"}</button>
            </div>
          </Sheet>
        )}

        {/* Catch-up modal (viewer only) */}
        {readOnly && catchUpOpen && (
          <CatchUpModal
            count={missedBallsCount}
            onSkip={() => {
              try {
                const evCount = latestEventsRef.current.length;
                if (safe.matchId) localStorage.setItem("fcc-watched-" + safe.matchId, String(evCount));
              } catch {}
              setCatchUpOpen(false);
            }}
            onReplay={() => {
              setCatchUpOpen(false);
              triggerReplayCatchUp();
            }}
          />
        )}

        {/* Replay overlay (full-screen) */}
        {replay && (
          <ReplayOverlay
            replay={replay}
            persona={persona}
            onAdvance={(nextIdx) => setReplay(r => r ? { ...r, index: nextIdx } : null)}
            onSkip={() => {
              try {
                const evCount = latestEventsRef.current.length;
                if (safe.matchId) localStorage.setItem("fcc-watched-" + safe.matchId, String(evCount));
              } catch {}
              if (replay?.onDone) replay.onDone();
              setReplay(null);
            }}
            onDone={() => {
              try {
                const evCount = latestEventsRef.current.length;
                if (safe.matchId) localStorage.setItem("fcc-watched-" + safe.matchId, String(evCount));
              } catch {}
              if (replay?.onDone) replay.onDone();
              setReplay(null);
            }}
          />
        )}

        {/* Floating "Last over" replay button (viewer only) */}
        {readOnly && !replay && !catchUpOpen && (
          <div onClick={triggerReplayLastOver}
            style={{
              position: "fixed", bottom: 20, right: 20, zIndex: 50,
              width: 56, height: 56, borderRadius: 28,
              background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
              border: `1.5px solid ${SC.gold}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              color: SC.gold, cursor: "pointer",
              boxShadow: "0 6px 22px rgba(0,0,0,0.4)",
              userSelect: "none",
            }}
            title="Replay last over">
            <div style={{ fontSize: 22, lineHeight: 1, fontWeight: 800 }}>↻</div>
            <div style={{ fontSize: 7, color: SC.goldLt, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 1, fontWeight: 700 }}>Last over</div>
          </div>
        )}

        {/* Scorer Scorecard peek (full-screen overlay) */}
        {scorecardOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 600,
            background: nightMode ? SC.surfaceDk : SC.bg,
            overflowY: "auto",
          }}>
            <ScorecardView
              match={{
                ...safe,
                team1: team1Name,
                team2: team2Name,
                innings1: innings === 1
                  ? {
                      team: team1Name,
                      score, wickets,
                      overs: overStr(balls),
                      ballsBowled: balls,
                      batsmen: batters.map(b => ({
                        ...b,
                        notOut: b.dismissal ? false : true,
                      })),
                      bowling: [{ name: bowler, overs: overStr(balls) }],
                      extras: { ...extras },
                      fow: fowList,
                    }
                  : (savedInnings1 || safe.innings1 || null),
                innings2: innings === 2
                  ? {
                      team: team2Name,
                      score, wickets,
                      overs: overStr(balls),
                      ballsBowled: balls,
                      batsmen: batters.map(b => ({
                        ...b,
                        notOut: b.dismissal ? false : true,
                      })),
                      bowling: [{ name: bowler, overs: overStr(balls) }],
                      extras: { ...extras },
                      fow: fowList,
                      target,
                    }
                  : null,
                status: inningsEnd && innings === 2 ? "completed" : (balls > 0 ? "live" : "setup"),
              }}
              onBack={() => setScorecardOpen(false)}
            />
          </div>
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
  let useStumps = false;
  if (!val) {
    char = "·";
  } else if (val === "•") {
    char = "·";
  } else if (val === "W") {
    gradient = `linear-gradient(135deg, ${SC.red} 0%, ${SC.redDk} 100%)`;
    fg = "#fff"; weight = 800;
    useStumps = true;
  } else if (val === "4") {
    bg = SC.blueLt; fg = SC.blue; weight = 700;
  } else if (val === "6") {
    gradient = `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`;
    fg = "#fff"; weight = 800; size = 38; fontSize = 15;
    shadow = "0 0 12px rgba(201,168,76,0.5)";
    if (isLatestSix) anim = "glow 1.4s ease-in-out infinite";
  } else if (val === "Wd" || val === "Nb" || /^Wd/.test(val) || /^Nb/.test(val)) {
    bg = "#FFF3C4"; fg = "#7A4000"; weight = 600; fontSize = 9;
    char = val.toLowerCase();
  } else if (val === "B" || /^B\d+$/.test(val)) {
    bg = "#FFF3C4"; fg = "#7A4000"; weight = 600; fontSize = 10;
    char = val === "B" ? "b" : val.toLowerCase();
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
    }}>{useStumps ? <StumpsSvg width={16} height={14} fill="#fff" /> : char}</div>
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

// ── Takeover approval modal (active-scorer side) ──────────────
function TakeoverApprovalModal({ fromName, onApprove, onDeny }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1500,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        maxWidth: 340, width: "100%",
        background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
        border: `1.5px solid ${SC.gold}`,
        borderRadius: 16, padding: 22, textAlign: "center",
        boxShadow: "0 12px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🤝</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: SC.goldLt, marginBottom: 6 }}>
          {fromName} wants to take over scoring
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 18, lineHeight: 1.45 }}>
          If you approve, they will become the active scorer for this match.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div onClick={onDeny} style={{
            flex: 1, padding: "12px 12px", borderRadius: 12,
            background: `linear-gradient(135deg, ${SC.red} 0%, ${SC.redDk} 100%)`,
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
            letterSpacing: 0.4, textTransform: "uppercase",
          }}>Deny</div>
          <div onClick={onApprove} style={{
            flex: 1, padding: "12px 12px", borderRadius: 12,
            background: `linear-gradient(135deg, ${SC.green} 0%, #1E8049 100%)`,
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
            letterSpacing: 0.4, textTransform: "uppercase",
          }}>Approve</div>
        </div>
      </div>
    </div>
  );
}

// ── Catch-up modal (viewer-only) ──────────────────────────────
function CatchUpModal({ count, onSkip, onReplay }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 700,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        maxWidth: 320, width: "100%",
        background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
        border: `1.5px solid ${SC.gold}`,
        borderRadius: 16, padding: 24, textAlign: "center",
        boxShadow: "0 12px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>📺</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: SC.goldLt, marginBottom: 6 }}>Catch up on the action?</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 18, lineHeight: 1.4 }}>
          {count} ball{count === 1 ? "" : "s"} have happened since you last watched
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div onClick={onReplay} style={{
            padding: "13px 16px", borderRadius: 12,
            background: `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`,
            color: SC.navy, fontSize: 14, fontWeight: 800,
            cursor: "pointer", letterSpacing: 0.4,
            boxShadow: "0 4px 16px rgba(201,168,76,0.4)",
          }}>Quick replay</div>
          <div onClick={onSkip} style={{
            padding: "12px 16px", borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid rgba(255,255,255,0.2)`,
            color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 700,
            cursor: "pointer",
          }}>Skip to live</div>
        </div>
      </div>
    </div>
  );
}

// ── Replay overlay (shared catch-up / last over) ──────────────
function ReplayOverlay({ replay, persona, onAdvance, onSkip, onDone }) {
  const { balls, index } = replay;
  const current = balls[index];
  useEffect(() => {
    const t = setTimeout(() => {
      if (index >= balls.length - 1) {
        onDone();
      } else {
        onAdvance(index + 1);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [index, balls.length]);
  if (!current) return null;
  const label = current.label;
  let pillBg = "#E8E4D8", pillFg = SC.textMuted, pillContent = label;
  let useStumps = false;
  if (label === "6") {
    pillBg = `linear-gradient(135deg, ${SC.gold} 0%, ${SC.goldLt} 100%)`;
    pillFg = SC.navy;
  } else if (label === "4") {
    pillBg = `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`;
    pillFg = "#fff";
  } else if (label === "W") {
    pillBg = `linear-gradient(135deg, ${SC.red} 0%, ${SC.redDk} 100%)`;
    pillFg = "#fff";
    useStumps = true;
  } else if (label === "•") {
    pillContent = "·";
  } else if (/^Wd/.test(label)) {
    pillBg = "#FFF3C4"; pillFg = "#7A4000"; pillContent = "wd";
  } else if (/^Nb/.test(label)) {
    pillBg = "#FFF3C4"; pillFg = "#7A4000"; pillContent = "nb";
  } else if (/^B/.test(label)) {
    pillBg = "#FFF3C4"; pillFg = "#7A4000"; pillContent = "b";
  } else {
    pillBg = "#E8E4D8"; pillFg = SC.navy;
  }
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        maxWidth: 320, width: "100%",
        background: `linear-gradient(135deg, ${SC.navy} 0%, ${SC.navyDk} 100%)`,
        border: `1.5px solid ${SC.gold}`,
        borderRadius: 16, padding: 24, textAlign: "center", position: "relative",
        boxShadow: "0 12px 60px rgba(0,0,0,0.6)",
      }}>
        <div onClick={onSkip} style={{
          position: "absolute", top: 10, right: 12,
          fontSize: 11, fontWeight: 700, color: SC.goldLt,
          padding: "5px 10px", borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5,
        }}>Skip → Live</div>

        <div style={{ height: 30 }} />
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          margin: "0 auto 14px",
          background: pillBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: pillFg, fontWeight: 900, fontSize: 26,
          boxShadow: label === "6" ? "0 0 20px rgba(201,168,76,0.6)" : "none",
        }}>{useStumps ? <StumpsSvg width={26} height={22} fill="#fff" /> : pillContent}</div>

        <div style={{
          fontSize: 16, fontWeight: 800, color: "#FFFFFF", marginBottom: 6,
        }}>{current.name || "—"}</div>

        <div style={{
          fontSize: 12, color: "rgba(255,255,255,0.7)",
          fontStyle: "italic", lineHeight: 1.4, minHeight: 32,
        }}>{current.line || ""}</div>

        <div style={{
          marginTop: 18, fontSize: 11, fontWeight: 700,
          color: SC.gold, textTransform: "uppercase", letterSpacing: 1,
        }}>Ball {index + 1} of {balls.length}</div>
      </div>
    </div>
  );
}

// ── Ball edit picker sheet (TASK 4) ───────────────────────────
// Bottom sheet listing the current over's recorded events as pills.
// Tap a pill → onPick(index, originalEvent) is invoked; the parent
// then routes the user back through the pitch / wagon / shot flow.
function BallEditSheet({ balls, innings, overBalls, loadEvents, onClose, onPick }) {
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { currentOverEvents } = await loadEvents();
      if (cancelled) return;
      setPicks(currentOverEvents);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 700,
        display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, background: SC.surface, borderRadius: "20px 20px 0 0",
        padding: "20px 18px 28px", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ width: 36, height: 4, background: SC.borderMid, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ fontSize: 16, fontWeight: 800, color: SC.navy, marginBottom: 4, textAlign: "center" }}>
          Edit a ball from this over
        </div>
        <div style={{ fontSize: 12, color: SC.textDim, marginBottom: 16, textAlign: "center" }}>
          Tap a ball to change it
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: SC.textDim, fontSize: 13 }}>
            Loading…
          </div>
        ) : picks.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: SC.textDim, fontSize: 13 }}>
            No balls recorded yet in this over.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {picks.map(({ ev, idx }) => {
              const label = ev?.label || "•";
              return (
                <div key={idx} onClick={() => onPick(idx, ev)}
                  style={{ cursor: "pointer" }}>
                  <BallPill val={label} />
                  <div style={{ fontSize: 9, color: SC.textDim, marginTop: 4, textAlign: "center" }}>
                    Ball {(ev?.ball ?? 0) + 1}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} style={{
          width: "100%", marginTop: 18, padding: "12px", borderRadius: 10,
          background: "#fff", border: `1.5px solid ${SC.border}`, color: SC.textMuted,
          fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Change opening batsmen sheet (BUG 2) ──────────────────────
// Pre-first-ball-only safety net: lets the scorer swap the openers
// before they've faced anything. Validates the two picks are
// different players; Save commits to batters[0]/[1].
function ChangeBatsmenSheet({ squad, current, onClose, onSave }) {
  const [strikerName, setStrikerName]       = useState(current?.[0] || squad?.[0] || "");
  const [nonStrikerName, setNonStrikerName] = useState(current?.[1] || squad?.[1] || "");
  const dup = strikerName && strikerName === nonStrikerName;
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 700,
        display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, background: SC.surface, borderRadius: "20px 20px 0 0",
        padding: "20px 18px 28px", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ width: 36, height: 4, background: SC.borderMid, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ fontSize: 16, fontWeight: 800, color: SC.navy, marginBottom: 4, textAlign: "center" }}>
          Change batsmen
        </div>
        <div style={{ fontSize: 12, color: SC.textDim, marginBottom: 16, textAlign: "center" }}>
          Swap openers before the first ball
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SC.textMuted,
              textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>On strike</div>
            <select value={strikerName} onChange={e => setStrikerName(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10,
                border: `1.5px solid ${SC.borderMid}`, fontSize: 14, background: "#fff",
                fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: SC.navy }}>
              {(squad || []).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SC.textMuted,
              textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Non-striker</div>
            <select value={nonStrikerName} onChange={e => setNonStrikerName(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10,
                border: `1.5px solid ${SC.borderMid}`, fontSize: 14, background: "#fff",
                fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: SC.navy }}>
              {(squad || []).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>

        {dup && (
          <div style={{ fontSize: 11, color: SC.red, fontWeight: 700, marginTop: 10, textAlign: "center" }}>
            Both batsmen must be different
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 10,
            background: "#fff", border: `1.5px solid ${SC.border}`, color: SC.textMuted,
            fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={() => !dup && onSave(strikerName, nonStrikerName)}
            disabled={dup} style={{
            flex: 1, padding: "12px", borderRadius: 10, border: "none",
            background: dup ? "#e2e8f0" : `linear-gradient(135deg, ${SC.navy}, ${SC.navyDk})`,
            color: dup ? "#94a3b8" : "#fff", fontWeight: 800, fontSize: 14,
            cursor: dup ? "not-allowed" : "pointer",
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Batting-order picker (TASK 3) ─────────────────────────────
// 5 dropdowns, slot labels "#1 (Opener)" / "#2 (Opener)" / "#3"..."#5".
// Defaults to first five from squad. Duplicate prevention: if user
// picks a player already in another slot, the other slot reverts to
// the next available squad member that isn't already in the order.
function BattingOrderSheet({ squad, battingTeam, currentOrder, ballsBowled, onClose, onSave, onSkip }) {
  const [slots, setSlots] = useState(() => {
    const initial = Array.from({ length: 5 }, (_, i) =>
      (currentOrder && currentOrder[i]) || (squad && squad[i]) || ""
    );
    return initial;
  });
  const LABELS = ["#1 (Opener)", "#2 (Opener)", "#3", "#4", "#5"];

  function setSlot(i, value) {
    setSlots(prev => {
      const next = [...prev];
      // If the chosen value already exists elsewhere in the slots, swap
      // the conflicting slot to the next-available squad name not yet in
      // the order so we never end up with duplicates.
      const dupIdx = next.findIndex((v, idx) => idx !== i && v === value);
      next[i] = value;
      if (dupIdx >= 0) {
        const used = new Set(next);
        const replacement = (squad || []).find(p => !used.has(p)) || "";
        next[dupIdx] = replacement;
      }
      return next;
    });
  }

  const allFilled = slots.every(Boolean);

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 700,
        display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, background: SC.surface, borderRadius: "20px 20px 0 0",
        padding: "20px 18px 28px", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
        maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: SC.borderMid, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ fontSize: 16, fontWeight: 800, color: SC.navy, marginBottom: 4, textAlign: "center" }}>
          Set batting order for {battingTeam}
        </div>
        <div style={{ fontSize: 12, color: SC.textDim, marginBottom: 16, textAlign: "center", lineHeight: 1.4 }}>
          Pick your top 5. The rest will auto-fill from squad order.
          {ballsBowled > 0 && (
            <div style={{ fontSize: 11, color: SC.gold, fontWeight: 700, marginTop: 4 }}>
              Innings already started — only unbatted slots can change.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LABELS.map((lbl, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SC.textMuted,
                textTransform: "uppercase", letterSpacing: 0.6, width: 84, flexShrink: 0 }}>{lbl}</div>
              <select value={slots[i]} onChange={e => setSlot(i, e.target.value)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10,
                  border: `1.5px solid ${SC.borderMid}`, fontSize: 14, background: "#fff",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: SC.navy }}>
                {(squad || []).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          ))}
        </div>

        <div onClick={onSkip} style={{
          textAlign: "center", fontSize: 12, color: SC.textDim, marginTop: 14,
          textDecoration: "underline", cursor: "pointer",
        }}>Skip — use squad order as is</div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 10,
            background: "#fff", border: `1.5px solid ${SC.border}`, color: SC.textMuted,
            fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={() => allFilled && onSave(slots.slice(0, 5))} disabled={!allFilled}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "none",
              background: allFilled ? `linear-gradient(135deg, ${SC.gold}, ${SC.goldLt})` : "#e2e8f0",
              color: allFilled ? SC.navy : "#94a3b8", fontWeight: 800, fontSize: 14,
              cursor: allFilled ? "pointer" : "not-allowed",
            }}>Save</button>
        </div>
      </div>
    </div>
  );
}
