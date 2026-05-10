import React from "react";
import { wmo, calcRainPeriods } from "../constants/weather";

export default function WeatherPage({wx,setView,G}) {
  const [tab, setTab] = React.useState("today");

  if(!wx || wx.error) return (
    <div style={{padding:"40px 20px",textAlign:"center",color:G.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>🌡️</div>
      <div style={{fontWeight:800,color:G.text,marginBottom:6}}>
        {!wx ? "Loading forecast…" : "Forecast unavailable"}
      </div>
      <div style={{fontSize:13}}>Please check your connection and try again.</div>
      <button onClick={()=>setView("schedule")} style={{marginTop:20,background:G.green,
        color:G.lime,border:"none",borderRadius:10,padding:"10px 22px",
        fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
        ← Back
      </button>
    </div>
  );

  const {hourly, daily: dailyArr, today} = wx;
  const todayDaily = dailyArr?.[0];

  // Filter hourly for today
  // Filter hourly for today (7:00–21:00)
  const todayHrs = (hourly?.time||[]).reduce((acc,t,i)=>{
    if(t.startsWith(wx.today)) acc.push({
      time:t.slice(11,16),
      temp:Math.round(hourly.temperature_2m[i]),
      feels:Math.round(hourly.apparent_temperature[i]),
      precip:+(hourly.precipitation[i]||0).toFixed(1),
      prob:hourly.precipitation_probability[i]||0,
      code:hourly.weathercode[i],
      wind:+(hourly.windspeed_10m[i]||0).toFixed(1),
      vis:hourly.visibility?.[i],
      isDay:hourly.is_day?.[i],
    });
    return acc;
  },[]).filter(h=>parseInt(h.time)>=7&&parseInt(h.time)<=21);

  const rainPeriods = calcRainPeriods(hourly, wx.today);
  const sunrise = todayDaily?.sunrise?.slice(11,16);
  const sunset  = todayDaily?.sunset?.slice(11,16);

  return (
    <div style={{padding:"0 0 100px"}}>
      {/* Hero card */}
      <div style={{background:`linear-gradient(135deg, ${G.green} 0%, #1a4731 100%)`,
        padding:"20px 18px 18px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{color:"rgba(255,255,255,.55)",fontSize:11,fontWeight:700,
              textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>
              📍 Karlebo Cricket Ground
            </div>
            <div style={{color:G.lime,fontWeight:900,fontSize:13,marginBottom:2}}>
              {new Date(wx.today+"T12:00:00").toLocaleDateString("en-GB",
                {weekday:"long",day:"numeric",month:"long"})}
            </div>
            <div style={{fontSize:46,fontWeight:900,color:"#fff",lineHeight:1,
              marginBottom:4}}>
              {wx.current?.temp!=null ? `${wx.current.temp}°` : todayDaily?.max!=null ? `${todayDaily.max}°` : "--°"}
              <span style={{fontSize:18,fontWeight:400,color:"rgba(255,255,255,.6)",
                marginLeft:4}}>C now</span>
            </div>
            <div style={{color:"rgba(255,255,255,.75)",fontSize:14,fontWeight:600,
              marginBottom:2}}>
              {wmo(wx.current?.code ?? todayDaily?.code ?? 0).label}
            </div>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:12}}>
              Feels like {wx.current?.feels??todayHrs[0]?.feels??todayDaily?.min}°C
              · Low {todayDaily?.min}° High {todayDaily?.max}°
            </div>
          </div>
          <div style={{fontSize:64,lineHeight:1}}>{wmo(todayDaily?.code||0).emoji}</div>
        </div>

        {/* Sunrise / sunset row */}
        {sunrise&&sunset&&(
          <div style={{display:"flex",gap:16,marginTop:14,
            background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 14px"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700,
                textTransform:"uppercase",letterSpacing:.8}}>Sunrise</div>
              <div style={{fontSize:16,fontWeight:900,color:G.lime}}>🌅 {sunrise}</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,.15)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700,
                textTransform:"uppercase",letterSpacing:.8}}>Sunset</div>
              <div style={{fontSize:16,fontWeight:900,color:G.lime}}>🌇 {sunset}</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,.15)"}}/>
            <div style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:700,
                textTransform:"uppercase",letterSpacing:.8}}>Daylight</div>
              <div style={{fontSize:16,fontWeight:900,color:G.lime}}>
                {(()=>{
                  if(!sunrise||!sunset) return "--";
                  const [sh,sm]=sunrise.split(":").map(Number);
                  const [eh,em]=sunset.split(":").map(Number);
                  const mins=(eh*60+em)-(sh*60+sm);
                  return `${Math.floor(mins/60)}h ${mins%60}m`;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Wind / humidity row */}
        <div style={{display:"flex",gap:10,marginTop:10}}>
          {[
            ["💨","Wind",todayDaily?.windMax!=null?`${todayDaily.windMax} m/s`:"--"],
            ["🌧️","Rain",todayDaily?.rainSum!=null?`${todayDaily.rainSum}mm`:"0mm"],
            ["🎲","Rain%",todayDaily?.rainProb!=null?`${todayDaily.rainProb}%`:"--"],
          ].map(([ico,lbl,val])=>(
            <div key={lbl} style={{flex:1,background:"rgba(255,255,255,.08)",
              borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
              <div style={{fontSize:14}}>{ico}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.45)",fontWeight:700,
                textTransform:"uppercase",letterSpacing:.7,marginBottom:1}}>{lbl}</div>
              <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 14px 0"}}>
        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:14,
          background:G.cream,borderRadius:10,padding:4}}>
          {[["today","Today"],["week","7-Day"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{flex:1,background:tab===k?G.green:"transparent",
                color:tab===k?G.lime:G.muted,border:"none",
                borderRadius:7,padding:"7px",fontSize:12,fontWeight:800,
                cursor:"pointer",fontFamily:"inherit",transition:"all .12s"}}>
              {l}
            </button>
          ))}
        </div>

        {tab==="today"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>

            {/* Rain periods highlight */}
            {rainPeriods.length>0 ? (
              <div style={{background:"#eff6ff",border:"1.5px solid #bfdbfe",
                borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontWeight:800,fontSize:12,color:"#1e3a8a",marginBottom:6}}>
                  🌧️ Rain expected today
                </div>
                {rainPeriods.map((p,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",padding:"5px 0",
                    borderTop:i>0?"1px solid #dbeafe":"none"}}>
                    <span style={{fontSize:12,color:"#1e40af",fontWeight:700}}>
                      {p.from} – {p.to}
                    </span>
                    <span style={{background:"#1e3a8a",color:"#bfdbfe",borderRadius:20,
                      padding:"2px 10px",fontSize:11,fontWeight:800}}>
                      {p.mm} mm
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",
                borderRadius:12,padding:"12px 14px",display:"flex",gap:10,
                alignItems:"center"}}>
                <span style={{fontSize:20}}>✅</span>
                <span style={{fontSize:12,fontWeight:700,color:"#166534"}}>
                  No rain expected today — great day for cricket!
                </span>
              </div>
            )}

            {/* Hourly strip */}
            <div style={{background:G.white,border:`1.5px solid ${G.border}`,
              borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:900,color:G.muted,
                textTransform:"uppercase",letterSpacing:1.2,marginBottom:10}}>
                Hourly — Today
              </div>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                {todayHrs.map(h=>{
                  const w2=wmo(h.code);
                  const isRainy=h.precip>0.05;
                  return (
                    <div key={h.time} style={{flexShrink:0,textAlign:"center",
                      background:isRainy?"#eff6ff":h.isDay?"#f9fafb":"#1a2e1a",
                      borderRadius:9,padding:"8px 6px",minWidth:46,
                      border:isRainy?"1.5px solid #bfdbfe":`1px solid ${G.border}`}}>
                      <div style={{fontSize:9,fontWeight:700,
                        color:h.isDay?G.muted:"rgba(255,255,255,.5)",
                        marginBottom:2}}>{h.time}</div>
                      <div style={{fontSize:16,marginBottom:2}}>{w2.emoji}</div>
                      <div style={{fontSize:12,fontWeight:900,
                        color:h.isDay?G.text:"#fff"}}>{h.temp}°</div>
                      {isRainy&&<div style={{fontSize:9,color:"#1e40af",
                        fontWeight:700,marginTop:1}}>{h.precip}mm</div>}
                      <div style={{fontSize:9,color:h.isDay?G.muted:"rgba(255,255,255,.4)",
                        marginTop:2}}>{h.wind}m/s</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visibility / wind detail */}
            {todayHrs.length>0&&(
              <div style={{background:G.white,border:`1.5px solid ${G.border}`,
                borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:11,fontWeight:900,color:G.muted,
                  textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>
                  Conditions at training time (17:00–20:00)
                </div>
                {todayHrs.filter(h=>parseInt(h.time)>=17&&parseInt(h.time)<=20).map(h=>(
                  <div key={h.time} style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",padding:"5px 0",
                    borderBottom:`1px solid ${G.border}`}}>
                    <span style={{fontWeight:700,fontSize:12,color:G.text}}>{h.time}</span>
                    <span style={{fontSize:12}}>{wmo(h.code).emoji} {wmo(h.code).label}</span>
                    <span style={{fontSize:12,color:G.muted}}>{h.temp}° · {h.wind}m/s</span>
                    {h.vis&&<span style={{fontSize:11,color:G.muted}}>
                      {h.vis>=10000?"Excellent":h.vis>=5000?"Good":h.vis>=2000?"Moderate":"Poor"} vis.
                    </span>}
                  </div>
                ))}
                {todayHrs.filter(h=>parseInt(h.time)>=17&&parseInt(h.time)<=20).length===0&&(
                  <div style={{fontSize:12,color:G.muted}}>Outside forecast window</div>
                )}
              </div>
            )}

            {/* Source note */}
            <div style={{textAlign:"center",padding:"4px 0"}}>
              <span style={{fontSize:10,color:G.muted}}>
                📡 Data: Open-Meteo (ECMWF model) · Same source as YR.no &amp; DMI
              </span>
            </div>
          </div>
        )}

        {tab==="week"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {(dailyArr||[]).map((d,i)=>{
              const dw=wmo(d.code||0);
              const dayStr=new Date(d.date+"T12:00:00").toLocaleDateString("en-GB",
                {weekday:"short",day:"numeric",month:"short"});
              return (
                <div key={d.date} style={{background:G.white,
                  border:`1.5px solid ${G.border}`,borderRadius:12,
                  padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,flexShrink:0}}>
                    <div style={{fontSize:10,fontWeight:800,color:G.muted}}>{dayStr.split(" ")[0]}</div>
                    <div style={{fontSize:13,fontWeight:900,color:G.text}}>
                      {dayStr.split(" ").slice(1).join(" ")}
                    </div>
                  </div>
                  <div style={{fontSize:26,flexShrink:0}}>{dw.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:G.text,
                      marginBottom:2}}>{dw.label}</div>
                    <div style={{fontSize:11,color:G.muted}}>
                      {d.rainSum>0?`🌧️ ${d.rainSum}mm`:"No rain"}
                      {d.rainProb>0?` · ${d.rainProb}% chance`:""}
                      · 💨 {d.windMax}m/s
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:900,color:G.text}}>{d.max}°</div>
                    <div style={{fontSize:11,color:G.muted}}>{d.min}°</div>
                  </div>
                </div>
              );
            })}
            <div style={{textAlign:"center",padding:"4px 0"}}>
              <span style={{fontSize:10,color:G.muted}}>
                📡 Data: Open-Meteo (ECMWF model) · Same source as YR.no &amp; DMI
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
