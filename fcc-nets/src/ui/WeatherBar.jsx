import React from "react";
import { wmo, calcRainPeriods } from "../constants/weather";

export default function WeatherBar({wx,setView,G}) {
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
