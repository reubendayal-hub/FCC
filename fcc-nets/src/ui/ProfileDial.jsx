import React from "react";

export default function ProfileDial({ pct }) {
  const r = 36, cx = 44, cy = 44, stroke = 7;
  const circumference = Math.PI * r; // half circle
  const arc = circumference * (pct / 100);
  const color = pct === 100 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="88" height="54" viewBox="0 0 88 54">
      {/* Track */}
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke="#e5e7eb" strokeWidth={stroke} strokeLinecap="round"/>
      {/* Fill */}
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${arc} ${circumference}`}/>
      {/* % text */}
      <text x={cx} y={cy-4} textAnchor="middle"
        style={{fontSize:15,fontWeight:900,fontFamily:"'DM Sans',sans-serif",fill:color}}>
        {pct}%
      </text>
      <text x={cx} y={cy+10} textAnchor="middle"
        style={{fontSize:9,fontWeight:700,fontFamily:"'DM Sans',sans-serif",fill:"#94a3b8",
          letterSpacing:1,textTransform:"uppercase"}}>
        complete
      </text>
    </svg>
  );
}
