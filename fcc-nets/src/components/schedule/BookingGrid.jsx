// src/components/schedule/BookingGrid.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { G } from "../../utils/theme";

// ─── Constants & Date Helpers ─────────────────────────────────
const FCC_LAT = 55.917762, FCC_LON = 12.415680;

const localDateStr  = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayStr      = () => localDateStr();
const tomorrowStr   = () => { const d=new Date(); d.setDate(d.getDate()+1); return localDateStr(d); };

// ─── Nets Timeline Helpers ────────────────────────────────────
const NET_COLORS = {
  "1": { bar:"#14532d", label:"#a3e635", barBg:"#f0fdf4", borderFree:"#bbf7d0", freeText:"#86efac" },
  "2": { bar:"#1e3a8a", label:"#bfdbfe", barBg:"#eff6ff", borderFree:"#bfdbfe", freeText:"#93c5fd" },
};
const PRIME_ZONES   = [{from:"17:00",to:"20:00"},{from:"09:00",to:"13:00"}];
const NET_DAY_START = 8*60, NET_DAY_END = 21*60, NET_SPAN = NET_DAY_END - NET_DAY_START;
const netPct = m => Math.max(0,Math.min(100,(m-NET_DAY_START)/NET_SPAN*100));
const toMinsNet = t => { const [h,mn]=t.split(":").map(Number); return h*60+mn; };
function isPrimeTime(fromStr) {
  const m=toMinsNet(fromStr);
  return PRIME_ZONES.some(z=>m>=toMinsNet(z.from)&&m<toMinsNet(z.to));
}

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
// ==========================================
// ─── Availability gauge (arc dial) ───────────────────────────
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

// ─── Nets Timeline Strip ──────────────────────────────────────
function NetsTimeline({sessions,netsDate,setNetsDate,setView,setBDate,setBFrom,setBTo,setBNet}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dates = Array.from({length:14},(_,i)=>{
    const d=new Date(today); d.setDate(today.getDate()+i);
    return localDateStr(d);
  });
  const fmtD = ds => {
    const d=new Date(ds+"T12:00:00");
    return {day:d.toLocaleDateString("en-GB",{weekday:"short"}),date:d.getDate()};
  };

  const daySessions = sessions.filter(s=>s.date===netsDate);

  function handleBarClick(e,net,barEl) {
    if(!barEl) return;
    const rect=barEl.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    const raw=NET_DAY_START+ratio*(NET_DAY_END-NET_DAY_START);
    const snapped=Math.round(raw/15)*15;
    const isBooked=daySessions.some(s=>{
      if(s.net!==net&&s.net!=="both") return false;
      return snapped>=toMinsNet(s.from)&&snapped<toMinsNet(s.to);
    });
    if(isBooked) return;
    const fromMins=Math.min(snapped,NET_DAY_END-60);
    const durMins=60;
    const toMins2=Math.min(fromMins+durMins,NET_DAY_END);
    const fmt=m=>`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
    setBDate(netsDate);
    setBFrom(fmt(fromMins));
    setBTo(fmt(toMins2));
    setBNet(net);
    setView("add");
  }

  const barRefs={};
  const netPct = m => ((m-NET_DAY_START)/(NET_DAY_END-NET_DAY_START))*100;

  return (
    <div style={{background:"#fff",borderRadius:14,padding:"12px 13px",
      border:`1.5px solid ${G.border}`,marginBottom:12}}>

      <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
        {dates.map(d=>{
          const f=fmtD(d), active=d===netsDate;
          const gauge=netAvailGauge(sessions,d);
          const dow=new Date(d+"T12:00:00").getDay();
          const isWeekend=dow===0||dow===6;
          return (
            <button key={d} onClick={()=>setNetsDate(d)}
              style={{flexShrink:0,
                background:active?G.green:isWeekend?"#e8f5e9":"#f9fafb",
                border:active?`2px solid ${G.green}`:isWeekend?`1.5px solid #c8e6c9`:`1.5px solid ${G.border}`,
                borderRadius:10,padding:"6px 8px 5px",cursor:"pointer",fontFamily:"inherit",
                minWidth:44,textAlign:"center",transition:"all .15s",
                boxShadow:active?"0 2px 6px rgba(20,83,45,.2)":"none"}}>
              <div style={{fontSize:8,fontWeight:700,
                color:active?G.lime:isWeekend?G.green:G.muted,
                textTransform:"uppercase"}}>{f.day}</div>
              <div style={{fontSize:14,fontWeight:900,color:active?G.lime:G.text,
                margin:"1px 0"}}>{f.date}</div>
              <div style={{display:"flex",justifyContent:"center",marginTop:1}}>
                <AvailGauge gauge={gauge} active={active}/>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{display:"flex",marginBottom:3}}>
        <div style={{width:54,flexShrink:0}}/>
        <div style={{flex:1,position:"relative",height:13}}>
          {[8,10,12,14,16,18,20].map(h=>(
            <span key={h} style={{position:"absolute",
              left:`${netPct(h*60)}%`,transform:"translateX(-50%)",
              fontSize:9,color:G.muted,fontWeight:600}}>{h}:00</span>
          ))}
        </div>
      </div>

      {["1","2"].map(net=>{
        const nc=NET_COLORS[net];
        const netSess=daySessions.filter(s=>s.net===net||s.net==="both")
          .sort((a,b)=>toMinsNet(a.from)-toMinsNet(b.from));
        const isFree=netSess.length===0;
        
        return (
          <div key={net} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
            <div style={{width:54,flexShrink:0,textAlign:"right"}}>
              <span style={{background:nc.bar,color:nc.label,borderRadius:6,
                padding:"3px 7px",fontSize:10,fontWeight:900}}>Net {net}</span>
            </div>
            <div ref={el=>{barRefs[net]=el;}}
              onClick={e=>handleBarClick(e,net,barRefs[net])}
              style={{flex:1,height:38,background:nc.barBg,borderRadius:8,
                position:"relative",border:`1.5px solid ${isFree?nc.borderFree:G.border}`,
                overflow:"hidden",cursor:"crosshair"}}>
              {[10,12,14,16,18,20].map(h=>(
                <div key={h} style={{position:"absolute",left:`${netPct(h*60)}%`,
                  top:0,bottom:0,width:1,background:"rgba(0,0,0,.05)",pointerEvents:"none"}}/>
              ))}
              {netSess.map(s=>{
                const w=netPct(toMinsNet(s.to))-netPct(toMinsNet(s.from));
                return (
                  <div key={s.id} style={{position:"absolute",
                    left:`${netPct(toMinsNet(s.from))}%`,width:`${w}%`,
                    top:3,bottom:3,background:"#22c55e",borderRadius:5,
                    padding:"0 5px",overflow:"hidden",cursor:"default",
                    display:"flex",alignItems:"center",
                    boxShadow:"0 1px 3px rgba(0,0,0,.15)"}}>
                    <span style={{color:"#fff",fontSize:9,fontWeight:800,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {s.label||"Booked"}
                    </span>
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



