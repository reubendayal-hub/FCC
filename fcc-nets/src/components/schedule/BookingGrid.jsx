import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { G } from "../../utils/theme";
import SessionCard from "./SessionCard";

const FCC_LAT = 55.917762, FCC_LON = 12.415680;

export default function BookingGrid({ currentUser, sessions = [] }) {
  const [weather, setWeather] = useState(null);
  const [netsDate, setNetsDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${FCC_LAT}&longitude=${FCC_LON}&current=temperature_2m&timezone=Europe%2FCopenhagen`)
      .then(r => r.json()).then(data => setWeather(data.current)).catch(() => {});
  }, []);

  const saveSessions = async (newList) => {
    await updateDoc(doc(db, "fcc-nets", "sessions"), { value: JSON.stringify(newList) });
  };

  const currentSessions = Array.isArray(sessions) ? sessions : [];
  const daySessions = currentSessions.filter(s => s.date === netsDate);

  return (
    <div style={{ padding: 10, maxWidth: 600, margin: "0 auto" }}>
      {weather && (
        <div style={{ background: G.green, color: "#fff", padding: 15, borderRadius: 12, marginBottom: 15 }}>
          Karlebo Ground: {Math.round(weather.temperature_2m)}°C
        </div>
      )}
      
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 15 }}>
        {[0,1,2,3,4,5,6].map(i => {
          const d = new Date(); d.setDate(d.getDate() + i);
          const ds = d.toISOString().split('T')[0];
          return (
            <button key={ds} onClick={() => setNetsDate(ds)} style={{ 
              padding: 10, borderRadius: 10, 
              background: netsDate === ds ? G.green : "#fff", 
              color: netsDate === ds ? "#fff" : G.text,
              border: `1px solid ${G.border}`
            }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {daySessions.length > 0 ? daySessions.map(s => (
        <SessionCard 
          key={s.id} 
          session={s} 
          currentUser={currentUser} 
          onJoin={(id) => {
            const next = currentSessions.map(item => item.id === id ? { ...item, players: [...item.players, currentUser.name] } : item);
            saveSessions(next);
          }} 
          onCancel={(id) => {
            const next = currentSessions.map(item => item.id === id ? { ...item, players: item.players.filter(p => p !== currentUser.name) } : item);
            saveSessions(next);
          }} 
        />
      )) : (
        <div style={{ textAlign: "center", padding: 40, color: G.muted }}>No sessions scheduled.</div>
      )}
    </div>
  );
}
