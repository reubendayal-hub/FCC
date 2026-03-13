import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { G } from "../../utils/theme";
import SessionCard from "./SessionCard"; // This links the two files

// ─── Constants from your original code ────────────────────────
const FCC_LAT = 55.917762, FCC_LON = 12.415680;
const NET_DAY_START = 8 * 60, NET_DAY_END = 21 * 60, NET_SPAN = NET_DAY_END - NET_DAY_START;
const PRIME_ZONES = [{from:"17:00",to:"20:00"},{from:"09:00",to:"13:00"}];
const NET_COLORS = {
  "1": { bar: "#14532d", label: "#a3e635", barBg: "#f0fdf4" },
  "2": { bar: "#1e3a8a", label: "#bfdbfe", barBg: "#eff6ff" }
};

// ─── Helpers ──────────────────────────────────────────────────
const localDateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toMins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const netPct = m => Math.max(0, Math.min(100, ((m - NET_DAY_START) / NET_SPAN) * 100));

export default function BookingGrid({ currentUser, sessions }) {
  const [weather, setWeather] = useState(null);
  const [netsDate, setNetsDate] = useState(localDateStr());

  // 1. Weather Fetch
  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${FCC_LAT}&longitude=${FCC_LON}&current=temperature_2m,weathercode&timezone=Europe%2FCopenhagen`)
      .then(r => r.json()).then(data => setWeather(data.current)).catch(() => {});
  }, []);

  // 2. Database Save Helper (Uses your JSON "value" structure)
  const saveSessions = async (newList) => {
    try {
      await updateDoc(doc(db, "fcc-nets", "sessions"), { value: JSON.stringify(newList) });
    } catch (err) {
      console.error("Firebase save error:", err);
    }
  };

  // 3. Join / Cancel Handlers
  const handleBooking = async (id) => {
    const updated = sessions.map(s => s.id === id ? { ...s, players: [...s.players, currentUser.name] } : s);
    await saveSessions(updated);
  };

  const handleCancel = async (id) => {
    const updated = sessions.map(s => s.id === id ? { ...s, players: s.players.filter(p => p !== currentUser.name) } : s);
    await saveSessions(updated);
  };

  const daySessions = sessions.filter(s => s.date === netsDate);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 100 }}>
      {/* Weather Header */}
      {weather && (
        <div style={{ background: `linear-gradient(135deg, ${G.green}, #1e3a8a)`, color: "#fff", padding: 15, borderRadius: 16, marginBottom: 15, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🌡️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{Math.round(weather.temperature_2m)}°C · Karlebo Ground</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Practice Forecast Active</div>
          </div>
        </div>
      )}

      {/* 14-Day Date Selector */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 15, marginBottom: 15 }}>
        {Array.from({ length: 14 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() + i);
          const ds = localDateStr(d);
          const active = netsDate === ds;
          return (
            <button key={ds} onClick={() => setNetsDate(ds)} style={{
              flexShrink: 0, minWidth: 55, padding: "10px 5px", borderRadius: 14, border: active ? `2px solid ${G.green}` : `1px solid ${G.border}`,
              background: active ? G.green : "#fff", color: active ? "#fff" : G.text, cursor: "pointer", fontFamily: "inherit"
            }}>
              <div style={{ fontSize: 10, fontWeight: 700 }}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{d.getDate()}</div>
            </button>
          );
        })}
      </div>

      {/* Visual Timeline Grid */}
      <div style={{ background: "#fff", padding: 15, borderRadius: 16, border: `1.5px solid ${G.border}`, marginBottom: 20 }}>
        {["1", "2"].map(net => {
          const nc = NET_COLORS[net];
          return (
            <div key={net} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 45, fontSize: 10, fontWeight: 900, color: nc.bar }}>NET {net}</div>
              <div style={{ flex: 1, height: 42, background: nc.barBg, borderRadius: 10, position: "relative", overflow: "hidden", border: `1px solid ${G.border}` }}>
                {/* Prime Time Shading */}
                {PRIME_ZONES.map((z, i) => (
                  <div key={i} style={{ position: "absolute", left: `${netPct(toMins(z.from))}%`, width: `${netPct(toMins(z.to)) - netPct(toMins(z.from))}%`, top: 0, bottom: 0, background: "rgba(250,204,21,.1)", borderLeft: "1px dashed rgba(250,204,21,0.4)" }} />
                ))}
                {/* Booked Sessions Visual Blocks */}
                {daySessions.filter(s => s.net === net || s.net === "both").map(s => (
                  <div key={s.id} style={{
                    position: "absolute", left: `${netPct(toMins(s.from))}%`, width: `${netPct(toMins(s.to)) - netPct(toMins(s.from))}%`,
                    top: 4, bottom: 4, background: nc.bar, borderRadius: 6, color: "#fff", fontSize: 10, padding: "0 6px", display: "flex", alignItems: "center", fontWeight: 800, boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}>
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* List of Session Cards for Interaction */}
      <div style={{ marginTop: 25 }}>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: G.muted, textTransform: "uppercase", marginBottom: 15 }}>
          Available Sessions
        </h3>
        {daySessions.length > 0 ? (
          daySessions.map(s => (
            <SessionCard 
              key={s.id} 
              session={s} 
              currentUser={currentUser} 
              onJoin={handleBooking} 
              onCancel={handleCancel} 
            />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, border: `1.5px solid ${G.border}`, color: G.muted }}>
            No nets scheduled for today.
          </div>
        )}
      </div>
    </div>
  );
}
