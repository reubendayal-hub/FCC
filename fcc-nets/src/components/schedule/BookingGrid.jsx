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

// ==========================================
// 1. PASTE YOUR UI BUILDING BLOCKS HERE
  function netAvailGauge(sessions, date) {
  const span=NET_DAY_END-NET_DAY_START;
  const booked=(net)=>sessions
    .filter(s=>s.date===date&&(s.net===net||s.net==="both"))
    .reduce((a,s)=>{
      const sf=Math.max(toMinsNet(s.from),NET_DAY_START);
      const st=Math.min(toMinsNet(s.to),NET_DAY_END);
      return a+Math.max(0,st-sf);
    },0);
  const bp=((booked("1")+booked("2"))/(span*2))*100;
  if(bp===0)  return {pct:0,  color:"#22c55e"};
  if(bp<30)   return {pct:bp, color:"#84cc16"};
  if(bp<60)   return {pct:bp, color:"#f59e0b"};
  return           {pct:bp, color:"#ef4444"};
}
  // ─── Group-of-people icon (3 silhouettes) ─────────────────────
function GroupIcon({color,size=18}) {
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
  // ─── Nets Timeline Strip ──────────────────────────────────────
function NetsTimeline({sessions,netsDate,setNetsDate,setView,setBDate,setBFrom,setBTo,setBNet}) {
  // Build 14-day window starting today
  const today = new Date(); today.setHours(0,0,0,0);
  const dates = Array.from({length:14},(_,i)=>{
    const d=new Date(today); d.setDate(today.getDate()+i);
    return localDateStr(d);
  });
  const fmtD = ds => {
    const d=new Date(ds+"T12:00:00");
    return {day:d.toLocaleDateString("en-GB",{weekday:"short"}),date:d.getDate()};
  };
  // ─── Weather bar (schedule mini strip) ───────────────────────
function WeatherBar({wx,setView}) {
  if(!wx) return (
    <div style={{background:`linear-gradient(135deg,#14532d,#1a6338)`,
      border:"none",borderRadius:14,padding:"11px 14px",marginBottom:12,
      display:"flex",alignItems:"center",gap:10,opacity:0.7}}>
      <div style={{width:16,height:16,borderRadius:"50%",
        border:"2px solid rgba(163,230,53,.4)",borderTopColor:G.lime,
        animation:"spin 1s linear infinite",flexShrink:0}}/>
      <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Fetching Karlebo ground forecast…</span>
    </div>
  );
  if(wx.error) return (
    <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:14,
      padding:"11px 14px",marginBottom:12}}>
      <span style={{fontSize:11,color:"#991b1b"}}>⚠️ Weather unavailable — check connection</span>
    </div>
  );
  const today=wx.daily?.[0];
  // Prefer live /current data; fall back to nearest hourly hour
  const cur = wx.current || (()=>{
    const nowHour = `${String(new Date().getHours()).padStart(2,"0")}:00`;
    const idx = (wx.hourly?.time||[]).findIndex(t=>t.startsWith(wx.today)&&t.slice(11,16)===nowHour);
    if(idx<0) return null;
    return {
      temp:  Math.round(wx.hourly.temperature_2m[idx]),
      feels: Math.round(wx.hourly.apparent_temperature[idx]),
      code:  wx.hourly.weathercode[idx],
      wind:  Math.round(wx.hourly.windspeed_10m[idx]*10)/10,
    };
  })();
  const w=wmo(cur?.code ?? today?.code);
  const rainPeriods=calcRainPeriods(wx.hourly, wx.today);
  const rainStr=rainPeriods.length>0
    ? `Rain ${rainPeriods[0].from}–${rainPeriods[0].to}`
    : "No rain";
  const windStr=cur?.wind!=null ? `${cur.wind} m/s` : (today?.windMax!=null ? `${today.windMax} m/s` : "");
  const isRainy = rainPeriods.length>0;
  return (
    <button onClick={()=>setView("weather")}
      style={{width:"100%",
        background:`linear-gradient(135deg, #14532d 0%, #1a5c35 60%, #1e3a8a 100%)`,
        border:"none",borderRadius:14,padding:"0",marginBottom:12,
        cursor:"pointer",fontFamily:"inherit",textAlign:"left",
        boxSizing:"border-box",overflow:"hidden",
        boxShadow:"0 3px 12px rgba(20,83,45,.25)"}}>
      <div style={{display:"flex",alignItems:"stretch"}}>
        {/* Left: weather info */}
        <div style={{flex:1,padding:"9px 12px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:24,flexShrink:0,lineHeight:1}}>{w.emoji}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:1}}>
              <span style={{fontSize:13,fontWeight:900,color:"#fff"}}>
                {cur?.temp!=null?`${cur.temp}°C`:today?.max!=null?`${today.max}°C`:"--°C"}
              </span>
              <span style={{fontSize:12,color:"rgba(255,255,255,.75)",fontWeight:600}}>
                · {w.label}
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:isRainy?"#93c5fd":G.lime,fontWeight:700}}>
                {isRainy?"🌧️ ":""}{rainStr}
              </span>
              {windStr&&<span style={{fontSize:10,color:"rgba(255,255,255,.55)"}}>· 💨 {windStr}</span>}
              <span style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>· Karlebo</span>
            </div>
          </div>
        </div>
        {/* Right: CTA panel */}
        <div style={{background:"rgba(255,255,255,.1)",borderLeft:"1px solid rgba(255,255,255,.12)",
          padding:"9px 13px",display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",gap:3,flexShrink:0,minWidth:90}}>
          <span style={{fontSize:9,fontWeight:800,color:G.lime,
            textTransform:"uppercase",letterSpacing:.8,textAlign:"center",
            lineHeight:1.3}}>
            Detailed<br/>Forecast
          </span>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:13}}>📡</span>
            <span style={{fontSize:15,color:G.lime,fontWeight:900,lineHeight:1}}>›</span>
          </div>
        </div>
      </div>
    </button>
  );
}
// Paste AvailGauge, GroupIcon, NetsTimeline, and the Weather Bar here
// ==========================================

  
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
// ==========================================
  // ✂️ BOOKING HANDLERS
  // ==========================================

  const handleBooking = async (sessionId) => {
    if (!currentUser) return;
    
    try {
      // Create a new array with the current user added to the specific session's players array
      const updatedSessions = sessions.map(session => {
        if (session.id === sessionId && !session.players.includes(currentUser.name)) {
          return { ...session, players: [...session.players, currentUser.name] };
        }
        return session;
      });

      // Push the updated array back to Firebase
      await updateDoc(doc(db, "appData", "sessions"), { data: updatedSessions });
    } catch (error) {
      console.error("Error booking session:", error);
      alert("Failed to book session. Please try again.");
    }
  };

  const handleCancel = async (sessionId) => {
    if (!currentUser) return;
    
    try {
      // Create a new array with the current user removed from the specific session's players array
      const updatedSessions = sessions.map(session => {
        if (session.id === sessionId) {
          return { ...session, players: session.players.filter(p => p !== currentUser.name) };
        }
        return session;
      });

      // Push the updated array back to Firebase
      await updateDoc(doc(db, "appData", "sessions"), { data: updatedSessions });
    } catch (error) {
      console.error("Error cancelling session:", error);
      alert("Failed to cancel session. Please try again.");
    }
  };
  // ==========================================



  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 100 }}>
      
      {/* 1. The Weather Widget */}
      {weatherData && (
        <WeatherBar weatherData={weatherData} /> 
      )}

      {/* 2. The Nets Timeline Strip */}
      <NetsTimeline 
        sessions={sessions} 
        netsDate={todayStr()} // Or whatever state you use for the selected date
        setNetsDate={() => {}} 
        setView={() => {}} 
        setBDate={() => {}} 
        setBFrom={() => {}} 
        setBTo={() => {}} 
        setBNet={() => {}} 
      />

    </div>
  );


