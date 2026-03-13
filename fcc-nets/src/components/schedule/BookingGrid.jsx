// src/components/schedule/BookingGrid.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { G } from "../../utils/theme";

// ─── Constants & Date Helpers ─────────────────────────────────
const FCC_LAT = 55.917762, FCC_LON = 12.415680;

const localDateStr  = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayStr      = () => localDateStr();

// ─── Nets Timeline Helpers ────────────────────────────────────
const NET_COLORS = {
  "1": { bar:"#14532d", label:"#a3e635", barBg:"#f0fdf4", borderFree:"#bbf7d0", freeText:"#86efac" },
  "2": { bar:"#1e3a8a", label:"#bfdbfe", barBg:"#eff6ff", borderFree:"#bfdbfe", freeText:"#93c5fd" },
};
const NET_DAY_START = 8*60, NET_DAY_END = 21*60, NET_SPAN = NET_DAY_END - NET_DAY_START;
const toMinsNet = t => { const [h,mn]=t.split(":").map(Number); return h*60+mn; };

// ─── Weather Helpers ──────────────────────────────────────────
const WMO = {
  0:  {label:"Clear sky",         emoji:"☀️",  rain:false},
  1:  {label:"Mainly clear",      emoji:"🌤️",  rain:false},
  2:  {label:"Partly cloudy",     emoji:"⛅",  rain:false},
  3:  {label:"Overcast",          emoji:"☁️",  rain:false},
  45: {label:"Fog",               emoji:"🌫️",  rain:false},
  48: {label:"Rime fog",          emoji:"🌫️",  rain:false},
  51: {label:"Light drizzle",     emoji:"🌦️",  rain:true},
  53: {label:"Drizzle",           emoji:"🌦️",  rain:true},
  55: {label:"Heavy drizzle",     emoji:"🌧️",  rain:true},
  61: {label:"Light rain",        emoji:"🌧️",  rain:true},
  63: {label:"Rain",              emoji:"🌧️",  rain:true},
  65: {label:"Heavy rain",        emoji:"🌧️",  rain:true},
  71: {label:"Light snow",        emoji:"🌨️",  rain:false},
  73: {label:"Snow",              emoji:"❄️",  rain:false},
  75: {label:"Heavy snow",        emoji:"❄️",  rain:false},
  77: {label:"Snow grains",       emoji:"🌨️",  rain:false},
  80: {label:"Rain showers",      emoji:"🌦️",  rain:true},
  81: {label:"Rain showers",      emoji:"🌧️",  rain:true},
  82: {label:"Violent showers",   emoji:"⛈️",  rain:true},
  85: {label:"Snow showers",      emoji:"🌨️",  rain:false},
  86: {label:"Heavy snow showers",emoji:"❄️",  rain:false},
  95: {label:"Thunderstorm",      emoji:"⛈️",  rain:true},
  96: {label:"Thunderstorm+hail", emoji:"⛈️",  rain:true},
  99: {label:"Thunderstorm+hail", emoji:"⛈️",  rain:true},
};
function wmo(code) { return WMO[code] || {label:"Unknown",emoji:"🌡️",rain:false}; }

function calcRainPeriods(hourly, date) {
  if(!hourly?.time) return [];
  const periods=[]; let start=null, mmAcc=0;
  hourly.time.forEach((t,i)=>{
    if(!t.startsWith(date)) return;
    const mm=hourly.precipitation[i]||0;
    const isRain=mm>0.05;
    if(isRain && start===null) { start=t.slice(11,16); mmAcc=mm; }
    else if(isRain) { mmAcc+=mm; }
    else if(!isRain && start!==null) {
      periods.push({from:start, to:t.slice(11,16), mm:+mmAcc.toFixed(1)});
      start=null; mmAcc=0;
    }
  });
  if(start!==null) periods.push({from:start, to:"21:00", mm:+mmAcc.toFixed(1)});
  return periods;
}

// ─── UI Atomic Components ─────────────────────────────────────
function AvailGauge({gauge,active}) {
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

function netAvailGauge(sessions, date) {
  const span=NET_DAY_END-NET_DAY_START;
  const booked=(net)=>sessions
    .filter(s=>s.date===date&&(s.net===net||s.net==="both"))
    .reduce((a,s)=>{
      const sf=Math.max(toMinsNet(s.from),NET_DAY_START);
      const st=Math.min(toMinsNet(s.to),NET_DAY_END);
      return a+Math.max(0,st-sf);
    },0);
  const totalBooked = booked("1") + booked("2");
  const bp=(totalBooked/(span*2))*100;
  if(bp===0)  return {pct:0,  color:"#22c55e"};
  if(bp<30)   return {pct:bp, color:"#84cc16"};
  if(bp<60)   return {pct:bp, color:"#f59e0b"};
  return           {pct:bp, color:"#ef4444"};
}

function WeatherBar({wx, setView}) {
  if(!wx) return <div style={{padding:20, textAlign:'center', color:G.muted}}>Loading weather...</div>;
  if(wx.error) return <div style={{padding:20, color:'red'}}>Weather unavailable</div>;
  
  const today=wx.daily?.[0];
  const cur = wx.current || today;
  const w=wmo(cur?.code);
  const rainPeriods=calcRainPeriods(wx.hourly, wx.today);
  const rainStr=rainPeriods.length>0 ? `Rain ${rainPeriods[0].from}–${rainPeriods[0].to}` : "No rain";
  
  return (
    <div style={{
      background:`linear-gradient(135deg, #14532d 0%, #1e3a8a 100%)`,
      borderRadius:14, padding:"12px 16px", marginBottom:12, color:"#fff",
      display:"flex", alignItems:"center", gap:12, boxShadow:"0 4px 12px rgba(0,0,0,0.1)"
    }}>
      <span style={{fontSize:28}}>{w.emoji}</span>
      <div>
        <div style={{fontWeight:800, fontSize:16}}>{cur.temp}°C · {w.label}</div>
        <div style={{fontSize:12, opacity:0.8}}>{rainStr} · Karlebo Ground</div>
      </div>
    </div>
  );
}

function NetsTimeline({sessions, netsDate, setNetsDate}) {
  const dates = Array.from({length:14},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()+i);
    return localDateStr(d);
  });

  const netPct = m => ((m-NET_DAY_START)/(NET_DAY_END-NET_DAY_START))*100;
  const daySessions = sessions.filter(s=>s.date===netsDate);

  return (
    <div style={{background:"#fff", borderRadius:14, padding:12, border:`1px solid ${G.border}`}}>
      {/* Date Strip */}
      <div style={{display:"flex", gap:8, overflowX:"auto", paddingBottom:12, marginBottom:12}}>
        {dates.map(d=>{
          const dateObj = new Date(d);
          const active = d === netsDate;
          const gauge = netAvailGauge(sessions, d);
          return (
            <button key={d} onClick={()=>setNetsDate(d)} style={{
              flexShrink:0, minWidth:50, padding:8, borderRadius:10, cursor:"pointer",
              border: active ? `2px solid ${G.green}` : `1px solid ${G.border}`,
              background: active ? G.green : "#f9fafb", color: active ? "#fff" : G.text
            }}>
              <div style={{fontSize:10, fontWeight:700}}>{dateObj.toLocaleDateString('en-GB',{weekday:'short'})}</div>
              <div style={{fontSize:16, fontWeight:900}}>{dateObj.getDate()}</div>
              <AvailGauge gauge={gauge} active={active} />
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {["1","2"].map(net=>{
        const nc = NET_COLORS[net];
        const netSess = daySessions.filter(s=>s.net===net || s.net==="both");
        return (
          <div key={net} style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
            <div style={{width:50, fontSize:11, fontWeight:800, color:nc.bar}}>Net {net}</div>
            <div style={{flex:1, height:36, background:nc.barBg, borderRadius:8, position:"relative", overflow:"hidden", border:`1px solid ${G.border}`}}>
              {netSess.map(s=>{
                const start = netPct(toMinsNet(s.from));
                const end = netPct(toMinsNet(s.to));
                return (
                  <div key={s.id} style={{
                    position:"absolute", left:`${start}%`, width:`${end-start}%`,
                    top:2, bottom:2, background:nc.bar, borderRadius:4, color:"#fff",
                    fontSize:9, fontWeight:800, display:"flex", alignItems:"center", padding:"0 4px"
                  }}>
                    {s.label || "Booked"}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function BookingGrid({ currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [netsDate, setNetsDate] = useState(todayStr());

  useEffect(() => {
    // Exact path for Fredensborg database
    const unsub = onSnapshot(doc(db, "fcc-nets", "sessions"), (snap) => {
      if (snap.exists()) {
        const data = JSON.parse(snap.data().value || "[]");
        setSessions(data);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchWeather() {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${FCC_LAT}&longitude=${FCC_LON}&current=temperature_2m,weathercode&hourly=precipitation,precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FCopenhagen`;
      try {
        const r = await fetch(url);
        const data = await r.json();
        setWeatherData({
          today: todayStr(),
          current: {
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weathercode
          },
          hourly: data.hourly,
          daily: data.daily.time.map((t, i) => ({
            date: t,
            code: data.daily.weathercode[i],
            max: Math.round(data.daily.temperature_2m_max[i])
          }))
        });
      } catch (e) {
        setWeatherData({ error: true });
      }
    }
    fetchWeather();
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 8px" }}>
      <WeatherBar wx={weatherData} />
      <NetsTimeline 
        sessions={sessions} 
        netsDate={netsDate} 
        setNetsDate={setNetsDate} 
      />
    </div>
  );
}
