import React from "react";
import { G } from "../../utils/theme";

export default function SessionCard({ session, currentUser, onJoin, onCancel }) {
  const isJoined = session.players.includes(currentUser.name);
  const isFull = session.players.length >= (session.maxPlayers || 5);

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: `1.5px solid ${G.border}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: G.muted, textTransform: "uppercase" }}>
            Net {session.net} · {session.from} - {session.to}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: G.green }}>{session.label || "Practice Session"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: G.green }}>{session.players.length}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: G.muted }}>PLAYERS</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {session.players.map((p, i) => (
          <span key={i} style={{
            background: G.lightGreen,
            color: G.green,
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700
          }}>
            {p}
          </span>
        ))}
        {session.players.length === 0 && <span style={{ color: G.muted, fontSize: 13 }}>No players yet</span>}
      </div>

      {!isJoined ? (
        <button
          onClick={() => onJoin(session.id)}
          disabled={isFull}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "none",
            background: isFull ? G.border : G.green,
            color: "#fff",
            fontWeight: 800,
            cursor: isFull ? "not-allowed" : "pointer"
          }}
        >
          {isFull ? "Session Full" : "Join Session"}
        </button>
      ) : (
        <button
          onClick={() => onCancel(session.id)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: `1.5px solid #fee2e2`,
            background: "#fef2f2",
            color: "#dc2626",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          Cancel My Spot
        </button>
      )}
    </div>
  );
}
