import React from "react";
import { localDateStr, NET_DAY_START, NET_DAY_END, NET_SPAN, netPct, toMinsNet, PRIME_ZONES, isPrimeTime } from "../utils/time";
import { netAvailGauge } from "../utils/sessions";
import { getTeamMeta } from "../constants/teams";
import AvailGauge from "./AvailGauge";

const NET_COLORS = {
  "1": { bar:"#14532d", label:"#a3e635", barBg:"#f0fdf4", borderFree:"#bbf7d0", freeText:"#86efac" },
  "2": { bar:"#1e3a8a", label:"#bfdbfe", barBg:"#eff6ff", borderFree:"#bfdbfe", freeText:"#93c5fd" },
};

export default function NetsTimeline({sessions,netsDate,setNetsDate,setView,setBDate,setBFrom,setBTo,setBNet,blockCals=[],G}) {
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

  const daySessions = sessions.filter(s=>s.date===netsDate);

  function handleBarClick(e,net,barEl) {
    if(!barEl) return;
    const rect=barEl.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    const raw=NET_DAY_START+ratio*NET_SPAN;
    const snapped=Math.round(raw/15)*15;
    // Is click on a booked block?
    const isBooked=daySessions.some(s=>{
      if(s.net!==net&&s.net!=="both") return false;
      return snapped>=toMinsNet(s.from)&&snapped<toMinsNet(s.to);
    });
    if(isBooked) return;
    const fromMins=Math.min(snapped,NET_DAY_END-60);
    const prime=isPrimeTime(`${String(Math.floor(fromMins/60)).padStart(2,"0")}:${String(fromMins%60).padStart(2,"0")}`);
    const durMins=prime?60:90;
    const toMins2=Math.min(fromMins+durMins,NET_DAY_END);
    const fmt=m=>`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
    setBDate(netsDate);
    setBFrom(fmt(fromMins));
    setBTo(fmt(toMins2));
    setBNet(net);
    setView("add");
  }

  const barRefs={};

  return (
    <div style={{
      background:G.white,
      borderRadius:14,
      padding:"12px 13px",
      border:`1.5px solid ${G.green}`,
      marginBottom:12,
      boxShadow:`0 4px 0 0 ${G.green}44, 0 6px 16px rgba(20,83,45,.12)`,
      position:"relative",
    }}>
      {/* "Nets" label accent */}
      <div style={{position:"absolute",top:-1,left:13,
        background:G.green,borderRadius:"0 0 7px 7px",
        padding:"1px 10px",fontSize:9,fontWeight:900,
        color:G.lime,letterSpacing:1.2,textTransform:"uppercase"}}>
        Nets Availability
      </div>

      {/* Date strip */}
      <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",paddingBottom:2,marginTop:12}}>
        {dates.map(d=>{
          const f=fmtD(d), active=d===netsDate;
          const gauge=netAvailGauge(sessions,d);
          const dow=new Date(d+"T12:00:00").getDay(); // 0=Sun,6=Sat
          const isWeekend=dow===0||dow===6;
          const hasBlock=blockCals.some(b=>b.date===d);
          return (
            <button key={d} onClick={()=>setNetsDate(d)}
              style={{flexShrink:0,position:"relative",
                background:active?G.green:isWeekend?"#e8f5e9":"#f9fafb",
                border:active?`2px solid ${G.green}`:isWeekend?`1.5px solid #c8e6c9`:`1.5px solid ${G.border}`,
                borderRadius:10,padding:"6px 8px 5px",cursor:"pointer",fontFamily:"inherit",
                minWidth:44,textAlign:"center",transition:"all .15s",
                boxShadow:active
                  ?"0 3px 0 rgba(20,83,45,.4), inset 0 1px 0 rgba(255,255,255,.2)"
                  :"none",
                transform:active?"translateY(-1px)":"none"}}>
              {hasBlock&&<span style={{position:"absolute",top:2,right:2,fontSize:8,
                opacity:active?0.9:0.6}}>🔒</span>}
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

      {/* Gauge legend */}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        {[["#22c55e","Free"],["#84cc16","Some Slots Booked"],["#f59e0b","Busy"],["#ef4444","Fully Booked"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:3}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0}}/>
            <span style={{fontSize:9,color:G.muted,fontWeight:600,whiteSpace:"nowrap"}}>{l}</span>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <span style={{fontSize:8}}>🔒</span>
          <span style={{fontSize:9,color:G.muted,fontWeight:600,whiteSpace:"nowrap"}}>Blocked</span>
        </div>
      </div>

      {/* Hour labels */}
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

      {/* Net bars */}
      {["1","2"].map(net=>{
        const nc=NET_COLORS[net];
        const netSess=daySessions.filter(s=>s.net===net||s.net==="both")
          .sort((a,b)=>toMinsNet(a.from)-toMinsNet(b.from));
        const isFree=netSess.length===0;
        const freeSlots=[]; let cur=NET_DAY_START;
        netSess.forEach(s=>{
          const sf=toMinsNet(s.from),st=toMinsNet(s.to);
          if(sf>cur) freeSlots.push({from:cur,to:sf});
          cur=Math.max(cur,st);
        });
        if(cur<NET_DAY_END) freeSlots.push({from:cur,to:NET_DAY_END});
        return (
          <div key={net} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
            <div style={{width:54,flexShrink:0,textAlign:"right"}}>
              <span style={{background:nc.bar,color:nc.label,borderRadius:6,
                padding:"3px 7px",fontSize:10,fontWeight:900,
                boxShadow:"0 2px 0 rgba(0,0,0,.12)"}}>Net {net}</span>
            </div>
            <div ref={el=>{barRefs[net]=el;}}
              onClick={e=>handleBarClick(e,net,barRefs[net])}
              style={{flex:1,height:38,background:nc.barBg,borderRadius:8,
                position:"relative",
                border:`1.5px solid ${isFree?nc.borderFree:G.border}`,
                boxShadow:"inset 0 2px 4px rgba(0,0,0,.06)",
                overflow:"hidden",cursor:"crosshair"}}>
              {/* Prime shading */}
              {PRIME_ZONES.map((z,i)=>(
                <div key={i} style={{position:"absolute",
                  left:`${netPct(toMinsNet(z.from))}%`,
                  width:`${netPct(toMinsNet(z.to))-netPct(toMinsNet(z.from))}%`,
                  top:0,bottom:0,background:"rgba(250,204,21,.08)",
                  borderLeft:"1px dashed rgba(250,204,21,.4)",
                  borderRight:"1px dashed rgba(250,204,21,.4)",
                  pointerEvents:"none"}}/>
              ))}
              {/* Grid lines */}
              {[10,12,14,16,18,20].map(h=>(
                <div key={h} style={{position:"absolute",left:`${netPct(h*60)}%`,
                  top:0,bottom:0,width:1,background:"rgba(0,0,0,.05)",pointerEvents:"none"}}/>
              ))}
              {/* Free labels */}
              {freeSlots.filter(f=>f.to-f.from>=90).map((f,i)=>(
                <div key={i} style={{position:"absolute",left:`${netPct(f.from)}%`,
                  width:`${netPct(f.to)-netPct(f.from)}%`,top:0,bottom:0,
                  display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                  <span style={{fontSize:8,color:nc.freeText,fontWeight:700}}>FREE · tap to book</span>
                </div>
              ))}
              {/* Booked blocks */}
              {netSess.map(s=>{
                const tm=getTeamMeta(s.restrictedTo||"Unassigned");
                const w=netPct(toMinsNet(s.to))-netPct(toMinsNet(s.from));
                return (
                  <div key={s.id} style={{position:"absolute",
                    left:`${netPct(toMinsNet(s.from))}%`,width:`${w}%`,
                    top:3,bottom:3,background:tm.bg,borderRadius:5,
                    padding:"0 5px",overflow:"hidden",cursor:"default",
                    display:"flex",alignItems:"center",
                    boxShadow:"0 1px 3px rgba(0,0,0,.15)"}}>
                    <span style={{color:tm.accent||tm.text,fontSize:9,fontWeight:800,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {s.label||"Session"}{s.net==="both"?" ×2":""}
                    </span>
                  </div>
                );
              })}
              {/* Blocked date overlay — lock icon + striped pattern */}
              {blockCals.filter(b=>b.date===netsDate).map(b=>{
                const bFrom=toMinsNet(b.from), bTo=toMinsNet(b.to);
                const left=netPct(Math.max(bFrom,NET_DAY_START));
                const right=netPct(Math.min(bTo,NET_DAY_END));
                const w=right-left;
                if(w<=0) return null;
                return (
                  <div key={b.id} style={{position:"absolute",
                    left:`${left}%`,width:`${w}%`,
                    top:0,bottom:0,
                    background:"repeating-linear-gradient(135deg,rgba(100,116,139,.12),rgba(100,116,139,.12) 4px,transparent 4px,transparent 8px)",
                    borderLeft:"2px solid rgba(100,116,139,.4)",
                    borderRight:"2px solid rgba(100,116,139,.4)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    pointerEvents:"none",zIndex:5}}>
                    <div style={{background:"rgba(100,116,139,.85)",borderRadius:4,
                      padding:"2px 6px",display:"flex",alignItems:"center",gap:3}}>
                      <span style={{fontSize:10}}>🔒</span>
                      <span style={{fontSize:8,color:"#fff",fontWeight:700,
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        maxWidth:w>15?80:40}}>
                        {b.label||"Blocked"}
                      </span>
                    </div>
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
