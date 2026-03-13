// src/components/schedule/BookingGrid.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { G } from "../../utils/theme";

// ── Constants & Helpers ─────────────────────────────────────
const FCC_LAT = 55.917762;
const FCC_LON = 12.4167; // Double check this matches your old App.jsx exactly

const localDateStr  = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayStr      = () => localDateStr();
const tomorrowStr   = () => { const d=new Date(); d.setDate(d.getDate()+1); return localDateStr(d); };

export default function BookingGrid({ currentUser, members }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState({});
  const [weatherData, setWeatherData] = useState(null);

  // ── Global Sessions Listener ────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appData", "sessions"), (docSnap) => {
      if (docSnap.exists()) {
        setSessions(docSnap.data().data || {});
      }
    });
    return () => unsub();
  }, []);

  // ── Weather fetch (Open-Meteo ECMWF) ────────────────────────
  useEffect(()=>{
    function fetchWx() {
      const url=`https://api.open-meteo.com/v1/forecast?`+
        `latitude=${FCC_LAT}&longitude=${FCC_LON}`+
        `&current=temperature_2m,apparent_temperature,precipitation,`+
        `weathercode,windspeed_10m,is_day`+
        `&hourly=temperature_2m,apparent_temperature,precipitation,`+
        `precipitation_probability,weathercode,windspeed_10m,visibility,is_day`+
        `&daily=sunrise,sunset,precipitation_sum,weathercode,`+
        `temperature_2m_max,temperature_2m_min,windspeed_10m_max,`+
        `precipitation_probability_max`+
        `&timezone=Europe%2FCopenhagen&forecast_days=7&wind_speed_unit=ms`;
        
      fetch(url, {cache:"no-store"})
        .then(r=>r.json())
        .then(data=>{
          const todayD=localDateStr();
          const daily=(data.daily?.time||[]).map((date,i)=>({
            date,
            code:  data.daily.weathercode[i],
            max:   Math.round(data.daily.temperature_2m_max[i]),
            min:   Math.round(data.daily.temperature_2m_min[i]),
            windMax: Math.round(data.daily.windspeed_10m_max[i]*10)/10,
            rainSum: +(data.daily.precipitation_sum[i]||0).toFixed(1),
            rainProb: data.daily.precipitation_probability_max[i]||0,
            sunrise: data.daily.sunrise[i],
            sunset:  data.daily.sunset[i],
          }));
          
          setWeatherData({ 
            today: todayD,
            hourly: data.hourly,
            daily: daily,
            daily0: daily[0],
            current: data.current ? {
              temp:   Math.round(data.current.temperature_2m),
              feels:  Math.round(data.current.apparent_temperature),
              precip: +(data.current.precipitation||0).toFixed(1),
              code:   data.current.weathercode,
              wind:   Math.round(data.current.windspeed_10m*10)/10,
              isDay:  data.current.is_day,
            } : null,
            fetchedAt: Date.now(),
          });
        })
        .catch(()=>setWeatherData({error:true}));
    }
    fetchWx();
    const timer = setInterval(fetchWx, 30*60*1000);
    return ()=>clearInterval(timer);
  },[]);


  // ==========================================
  // ✂️ PASTE YOUR BOOKING HANDLERS HERE ✂️
  // (Did you find them using the search terms?)
  // ==========================================



  return (
    <div>
      {/* Week Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: "8px 15px", borderRadius: 8, border: `1px solid ${G.border}`, background: "#fff", cursor: "pointer", fontWeight: "bold" }}>
          ← Previous
        </button>
        <h3 style={{ margin: 0, color: G.green, fontSize: 20 }}>Nets Schedule</h3>
        <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: "8px 15px", borderRadius: 8, border: `1px solid ${G.border}`, background: "#fff", cursor: "pointer", fontWeight: "bold" }}>
          Next →
        </button>
      </div>

      {/* ========================================== */}
      {/* ✂️ PASTE YOUR MAIN NETS UI HERE ✂️        */}
      {/* ========================================== */}
      
    </div>
  );
}
