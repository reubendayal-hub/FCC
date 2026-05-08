import React from "react";

export function GroupIcon({color, size = 18}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 20" fill={color}>
      <circle cx="7"  cy="5" r="3.2"/>
      <path d="M7 10c-3.5 0-5.5 1.6-5.5 3v2h11v-2c0-1.4-2-3-5.5-3z"/>
      <circle cx="25" cy="5" r="3.2"/>
      <path d="M25 10c-3.5 0-5.5 1.6-5.5 3v2h11v-2c0-1.4-2-3-5.5-3z"/>
      <circle cx="16" cy="4" r="3.8"/>
      <path d="M16 9.5c-4 0-6.5 1.8-6.5 3.2v2.3h13v-2.3c0-1.4-2.5-3.2-6.5-3.2z"/>
    </svg>
  );
}

export function NetIcon({color = "currentColor", size = 18}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      {/* Post */}
      <line x1="4" y1="3" x2="4" y2="20"/>
      {/* Top rail */}
      <line x1="4" y1="4" x2="20" y2="4"/>
      {/* Net frame */}
      <rect x="4" y="4" width="16" height="12" rx="0.5" strokeWidth="1.8"/>
      {/* Net grid — vertical */}
      <line x1="9"  y1="4" x2="9"  y2="16" strokeWidth="0.9" strokeDasharray="0"/>
      <line x1="14" y1="4" x2="14" y2="16" strokeWidth="0.9"/>
      <line x1="19" y1="4" x2="19" y2="16" strokeWidth="0.9"/>
      {/* Net grid — horizontal */}
      <line x1="4" y1="8"  x2="20" y2="8"  strokeWidth="0.9"/>
      <line x1="4" y1="12" x2="20" y2="12" strokeWidth="0.9"/>
      {/* Ground line */}
      <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1.4"/>
    </svg>
  );
}

export function BothNetsIcon({color = "currentColor", size = 18}) {
  return (
    <svg width={size*1.5} height={size} viewBox="0 0 36 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      {/* Net 1 */}
      <line x1="2"  y1="3" x2="2"  y2="20"/>
      <rect x="2"  y="4" width="13" height="11" rx="0.5" strokeWidth="1.6"/>
      <line x1="6"  y1="4" x2="6"  y2="15" strokeWidth="0.8"/>
      <line x1="10" y1="4" x2="10" y2="15" strokeWidth="0.8"/>
      <line x1="14" y1="4" x2="14" y2="15" strokeWidth="0.8"/>
      <line x1="2"  y1="8"  x2="15" y2="8"  strokeWidth="0.8"/>
      <line x1="2"  y1="12" x2="15" y2="12" strokeWidth="0.8"/>
      {/* Net 2 */}
      <line x1="21" y1="3" x2="21" y2="20"/>
      <rect x="21" y="4" width="13" height="11" rx="0.5" strokeWidth="1.6"/>
      <line x1="25" y1="4" x2="25" y2="15" strokeWidth="0.8"/>
      <line x1="29" y1="4" x2="29" y2="15" strokeWidth="0.8"/>
      <line x1="33" y1="4" x2="33" y2="15" strokeWidth="0.8"/>
      <line x1="21" y1="8"  x2="34" y2="8"  strokeWidth="0.8"/>
      <line x1="21" y1="12" x2="34" y2="12" strokeWidth="0.8"/>
      {/* Ground */}
      <line x1="1" y1="20" x2="35" y2="20" strokeWidth="1.4"/>
    </svg>
  );
}
