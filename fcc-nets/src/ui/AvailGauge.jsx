import React from "react";

export default function AvailGauge({gauge,active}) {
  const r=7,cx=10,cy=10,circ=2*Math.PI*r;
  const arcLen=circ*0.75, filled=arcLen*(gauge.pct/100);
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={active?"rgba(255,255,255,.15)":"#e5e7eb"} strokeWidth="3"
        strokeDasharray={`${arcLen} ${circ-arcLen}`}
        strokeDashoffset={circ*0.125} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}/>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={active?(gauge.pct===0?"rgba(163,230,53,.8)":gauge.color):gauge.color}
        strokeWidth="3"
        strokeDasharray={`${filled} ${circ-filled}`}
        strokeDashoffset={circ*0.125} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}/>
    </svg>
  );
}
