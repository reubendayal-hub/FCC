// src/ui/WagonWheelDisplay.jsx
// ─────────────────────────────────────────────────────────────
// Read-only wagon-wheel renderer.
//
// Shows aggregated scoring shots (1+ runs) for a single player,
// dotted onto a stylised cricket field. Used in ProfileView for the
// "career wagon wheel" section.
//
// SVG geometry is copy-faithful to the scorer-side WagonWheel
// (LiveScorerView.jsx) — pitch, stumps, boundary circle all match
// so colour coding lines up visually between scorer + viewer.
//
// Props:
//   shots: Array<{
//     runs:        number,       // 1–6
//     zone?:       string,       // ZONES key (see below); used if tapPoint absent
//     tapPoint?:   { x, y },     // SVG-coord exact dot location (preferred)
//     bowler?:     string,
//     matchTitle?: string,       // for hover/tap tooltips
//   }>
//   mirror?: boolean — if true, the inner SVG group is reflected
//                      horizontally (LH viewing perspective). Labels
//                      live outside the group so they wouldn't flip,
//                      but no text labels exist on this read-only wheel
//                      so the prop is effectively about pitch/zone
//                      orientation only.
// ─────────────────────────────────────────────────────────────

// Centre-points per zone — mirror of ZONES in LiveScorerView.
const ZONE_CENTERS = {
  behind:     [110, 10],
  "third-man":[28, 28],
  point:      [8, 96],
  cover:      [14, 150],
  "mid-off":  [38, 196],
  straight:   [110, 218],
  "on-drive": [182, 196],
  midwicket:  [206, 150],
  "sq-leg":   [212, 96],
  "fine-leg": [192, 28],
};

// Same navy / gold palette as scorer.
const SC = {
  navy:   "#1B2A5C",
  navyDk: "#152043",
  gold:   "#C9A84C",
};

function dotColour(runs) {
  if (runs >= 6) return "#C9A84C"; // gold
  if (runs === 4) return "#185FA5"; // blue
  return "#27AE60";                 // muted green for 1–3
}

export default function WagonWheelDisplay({ shots = [], mirror = false }) {
  const innerTransform = mirror ? "translate(220,0) scale(-1,1)" : "";
  return (
    <svg width="220" height="226" viewBox="0 0 220 226"
      style={{ display: "block", margin: "0 auto" }}>
      <g transform={innerTransform}>
        {/* Outfield */}
        <ellipse cx="110" cy="112" rx="104" ry="108" fill="#1A4A2B" stroke={SC.navyDk} strokeWidth="1.4" />
        <ellipse cx="110" cy="112" rx="104" ry="108" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
        <ellipse cx="110" cy="112" rx="54"  ry="56"  fill="none" stroke="white" strokeWidth="1"  strokeDasharray="5,4" opacity="0.6" />
        {/* Cross-hair guides */}
        <line x1="110" y1="4"  x2="110" y2="220" stroke="white" strokeWidth="0.7" strokeDasharray="4,5" opacity="0.4" />
        <line x1="6"   y1="96" x2="214" y2="96"  stroke="white" strokeWidth="0.6" strokeDasharray="3,5" opacity="0.36" />
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
        {/* Centre marker (batter) */}
        <circle cx="110" cy="96" r="6" fill={SC.navy} stroke="white" strokeWidth="1.8" />

        {/* Shots — coords are pre-normalised by the caller so they're
            already in the chosen baseline (RH or LH) frame. The g
            transform handles the visual flip when mirror=true. */}
        {shots.map((s, i) => {
          const pt = s.tapPoint
            ? [s.tapPoint.x, s.tapPoint.y]
            : (s.zone && ZONE_CENTERS[s.zone]) || null;
          if (!pt) return null;
          const tip = `${s.runs} off ${s.bowler || "—"}${s.matchTitle ? ` · ${s.matchTitle}` : ""}`;
          return (
            <circle key={i} cx={pt[0]} cy={pt[1]} r={5}
              fill={dotColour(s.runs)} stroke="#fff" strokeWidth="1.2"
              opacity="0.85">
              <title>{tip}</title>
            </circle>
          );
        })}
      </g>
    </svg>
  );
}
