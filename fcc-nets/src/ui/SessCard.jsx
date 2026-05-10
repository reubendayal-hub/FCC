import React from "react";
import { getTeamCardColors } from "../constants/teams";
import { getLiftPref } from "../utils/lifts";
import { fmtShort, isToday } from "../utils/time";

export default function SessCard({s,members,teams,faded,onClick,onCarpoolClick,G}) {
  // Coaches: use stored s.coaches, or derive from sessionTeams/restrictedTo
  const sessionCoaches = (s.restrictedTo||s.sessionTeams?.length) ? (
    s.coaches ||
    [...new Set((s.sessionTeams||[s.restrictedTo].filter(Boolean)).flatMap(tn=>
      teams?.find(t=>t.name===tn)?.coaches||[]
    ))]
  ) : [];

  const isLocationChanged = s.location && s.location !== "Karlebo Cricket Ground";
  const isIndoor = s.location?.toLowerCase().includes("indoor") || s.location?.toLowerCase().includes("egedal");

  // Carpool summary
  const lifts = s.lifts || {};
  const liftPeople = Object.keys(lifts);
  const offering = liftPeople.filter(p => getLiftPref(lifts[p]) === "offer").length;
  const needing = liftPeople.filter(p => getLiftPref(lifts[p]) === "need").length;
  const hasCarpool = offering > 0 || needing > 0;

  // Net label text
  const netLabel = s.net === "both" ? "Both Nets" : s.net ? `Net ${s.net}` : null;

  // Get team colors for card styling
  const teamName = s.restrictedTo || s.sessionTeams?.[0] || null;
  const tc = getTeamCardColors(teamName);

  return (
    <div onClick={onClick} style={{
      background: G.white,
      borderRadius: 10,
      marginBottom: 8,
      borderLeft: `4px solid ${tc.border}`,
      opacity: faded ? 0.5 : 1,
      cursor: "pointer",
      overflow: "hidden",
    }}>
      {/* Top accent bar */}
      <div style={{height: 3, background: tc.border}}/>

      {/* Location banner — only shows when different from Karlebo */}
      {isLocationChanged && (
        <div style={{
          background: "#f3e8ff",
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: "1px solid #e9d5ff",
        }}>
          <span style={{fontSize: 12}}>{isIndoor ? "🏠" : "📍"}</span>
          <span style={{fontSize: 11, fontWeight: 700, color: "#7c3aed"}}>{s.location}</span>
        </div>
      )}

      {/* Main content */}
      <div style={{
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{flex: 1, minWidth: 0}}>
          {/* Row 1: Date + Team + Nets + Carpool + Today */}
          <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap"}}>
            <span style={{fontSize: 14, fontWeight: 800, color: G.text}}>
              {fmtShort(s.date)}
            </span>
            {teamName && (
              <span style={{
                background: tc.badgeBg, color: tc.badgeText,
                padding: "2px 10px", borderRadius: 20,
                fontSize: 10, fontWeight: 700,
              }}>
                {teamName}
              </span>
            )}
            {netLabel && (
              <span style={{fontSize: 11, color: G.muted}}>{netLabel}</span>
            )}
            {hasCarpool && (
              <span
                onClick={onCarpoolClick ? e => {e.stopPropagation(); onCarpoolClick();} : undefined}
                style={{
                  background: "#ecfdf5", color: "#047857",
                  padding: "1px 8px", borderRadius: 20,
                  fontSize: 10, fontWeight: 600,
                  cursor: onCarpoolClick ? "pointer" : "default",
                }}>
                🚗 {offering > 0 ? `${offering} offer${offering > 1 ? "s" : ""}` : ""}{offering > 0 && needing > 0 ? " · " : ""}{needing > 0 ? `${needing} need${needing > 1 ? "s" : ""}` : ""}
              </span>
            )}
            {isToday(s.date) && (
              <span style={{
                background: G.lime, color: G.green,
                borderRadius: 20, padding: "1px 8px",
                fontSize: 9, fontWeight: 800,
              }}>TODAY</span>
            )}
          </div>

          {/* Row 2: Title */}
          {s.label && (
            <div style={{
              fontWeight: 700, fontSize: 14, color: G.text,
              marginBottom: 5, lineHeight: 1.2,
            }}>
              {s.label}
            </div>
          )}

          {/* Row 3: Time + Coaches */}
          <div style={{fontSize: 12, color: G.muted}}>
            {s.from} – {s.to}
            {sessionCoaches.length > 0 && (
              <>
                <span style={{margin: "0 4px"}}>·</span>
                <span style={{color: G.text}}>Coach:</span>{" "}
                <span style={{color: "#059669", fontWeight: 600}}>
                  {sessionCoaches.slice(0, 3).map(c => c.split(" ")[0]).join(", ")}
                  {sessionCoaches.length > 3 && ` +${sessionCoaches.length - 3}`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Player count circle — team colored */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: tc.bg, border: `2px solid ${tc.border}`,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginLeft: 12,
        }}>
          <div style={{fontSize: 18, fontWeight: 800, color: tc.text, lineHeight: 1}}>
            {s.players.length}
          </div>
          <div style={{fontSize: 7, color: tc.text, textTransform: "uppercase", fontWeight: 600, opacity: 0.8}}>
            {faded ? "went" : "going"}
          </div>
        </div>
      </div>
    </div>
  );
}
