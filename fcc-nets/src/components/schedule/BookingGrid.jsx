import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { G } from "../../utils/theme";

// CONSTANTS FROM YOUR ORIGINAL CODE
const FCC_LAT = 55.917762, FCC_LON = 12.415680;
const NET_DAY_START = 8 * 60, NET_DAY_END = 21 * 60;
const NET_COLORS = {
  "1": { bar: "#14532d", label: "#a3e635", barBg: "#f0fdf4" },
  "2": { bar: "#1e3a8a", label: "#bfdbfe", barBg: "#eff6ff" }
};

// HELPERS
const localDateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toMins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const netPct = m => ((m - NET_DAY_START) / (NET_DAY_END - NET_DAY_START)) * 100;

export default function BookingGrid({ currentUser, sessions, members }) {
  const [weather, setWeather] = useState(null);
  const [netsDate, setNetsDate] = useState(localDateStr());

  // 1. Weather Fetch
  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${FCC_LAT}&longitude=${FCC_LON}&current=temperature_2m,weathercode&timezone=Europe%2FCopenhagen`)
      .then(r => r.json()).then(data => setWeather(data.current));
  }, []);

  const saveSessions = async (newList) => {
    await updateDoc(doc(db, "fcc-nets", "sessions"), { value: JSON.stringify(newList) });
  };

  const handleBooking = async (id) => {
    const updated = sessions.map(s => s.id === id ? { ...s, players: [...s.players, currentUser.name] } : s);
    await saveSessions(updated);
  };

  const daySessions = sessions.filter(s => s.date === netsDate);

  return (
    <div style={{ padding: "10px 0" }}>
      {/* Simple Weather Info */}
      {weather && (
        <div style={{ background: G.green, color: "#fff", padding: 15, borderRadius: 12, marginBottom: 15 }}>
          Karlebo Ground: {Math.round(weather.temperature_2m)}°C
        </div>
      )}

      {/* Date Selection */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 15 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const d = new Date(); d.setDate(d.getDate() + i);
          const ds = localDateStr(d);
          return (
            <button key={ds} onClick={() => setNetsDate(ds)} style={{
              padding: 10, borderRadius: 10, border: netsDate === ds ? `2px solid ${G.green}` : `1px solid ${G.border}`,
              background: netsDate === ds ? G.green : "#fff", color: netsDate === ds ? "#fff" : G.text
            }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Nets Grid */}
      {["1", "2"].map(net => {
        const nc = NET_COLORS[net];
        return (
          <div key={net} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, fontWeight: 800 }}>Net {net}</div>
            <div style={{ flex: 1, height: 40, background: nc.barBg, borderRadius: 8, position: "relative", overflow: "hidden", border: `1px solid ${G.border}` }}>
              {daySessions.filter(s => s.net === net || s.net === "both").map(s => (
                <div key={s.id} style={{
                  position: "absolute", left: `${netPct(toMins(s.from))}%`, width: `${netPct(toMins(s.to)) - netPct(toMins(s.from))}%`,
                  top: 2, bottom: 2, background: nc.bar, borderRadius: 4, color: "#fff", fontSize: 10, padding: 4
                }}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
// ... (keep all constants and weather logic at the top)

import SessionCard from "./SessionCard";

export default function BookingGrid({ currentUser, sessions, members }) {
  const [weather, setWeather] = useState(null);
  const [netsDate, setNetsDate] = useState(localDateStr());

  // ... (keep useEffect for weather and sessions)

  const saveSessions = async (newList) => {
    await updateDoc(doc(db, "fcc-nets", "sessions"), { value: JSON.stringify(newList) });
  };

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
      {/* ... Weather and Timeline components ... */}

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: G.muted, textTransform: "uppercase", marginBottom: 12 }}>
          Sessions for {netsDate}
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
          <div style={{ padding: 40, textAlign: "center", background: "#fff", borderRadius: 16, border: `1px solid ${G.border}`, color: G.muted }}>
            No sessions scheduled for this day.
          </div>
        )}
      </div>
    </div>
  );
}

// ... (keep all constants and weather logic at the top)

import SessionCard from "./SessionCard";

export default function BookingGrid({ currentUser, sessions, members }) {
  const [weather, setWeather] = useState(null);
  const [netsDate, setNetsDate] = useState(localDateStr());

  // ... (keep useEffect for weather and sessions)

  const saveSessions = async (newList) => {
    await updateDoc(doc(db, "fcc-nets", "sessions"), { value: JSON.stringify(newList) });
  };

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
      {/* ... Weather and Timeline components ... */}

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: G.muted, textTransform: "uppercase", marginBottom: 12 }}>
          Sessions for {netsDate}
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
          <div style={{ padding: 40, textAlign: "center", background: "#fff", borderRadius: 16, border: `1px solid ${G.border}`, color: G.muted }}>
            No sessions scheduled for this day.
          </div>
        )}
      </div>
    </div>
  );
}
