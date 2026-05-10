import React from "react";
import { getTeamMeta } from "../constants/teams";
import { getLiftObj } from "../utils/lifts";
import { isCoachMember, isAbsent } from "../utils/members";
import { TeamPill, MemberRolePills } from "./pills";
import Btn from "./Btn";

export default function PlayerGroup({team,players,members,teams,lifts,selSess,isSelf,cutoff,canRemove,onRemove,onCarpoolEdit,onCarpoolSet,single,G}) {
  const [open,setOpen]=React.useState(true); // default open
  const tm=getTeamMeta(team);
  const dispStop=d=>{const o=getLiftObj(d);if(!o.stop)return"";return o.stop==="Other"?(o.stopOther||"Other"):o.stop;};
  return (
    <div style={{marginBottom:10}}>
      {/* Group header — hide toggle when only one group */}
      {!single&&(
        <button onClick={()=>setOpen(v=>!v)}
          style={{width:"100%",display:"flex",alignItems:"center",gap:8,
            padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",
            fontFamily:"inherit",marginBottom:4,
            background:`${tm.bg}22`,}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:tm.bg,flexShrink:0}}/>
          <span style={{fontWeight:800,fontSize:12,color:tm.bg,flex:1,textAlign:"left"}}>
            {team}
          </span>
          <span style={{fontSize:11,color:G.muted,fontWeight:600}}>
            {players.length} player{players.length!==1?"s":""}
          </span>
          <span style={{fontSize:12,color:G.muted}}>{open?"▲":"▼"}</span>
        </button>
      )}
      {(open||single)&&players.map((p,i)=>{
        const mem=members.find(m=>m.name===p);
        const self=isSelf(p);
        const liftObj=getLiftObj((lifts||{})[p]);
        const liftPref=liftObj.pref;
        const isO=liftPref==="offer",isN=liftPref==="need";
        return (
          <div key={p} style={{background:G.white,
            border:`1.5px solid ${isO?"#86efac":isN?"#93c5fd":G.border}`,
            borderRadius:10,padding:"10px 14px",marginBottom:6,
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,flex:1,minWidth:0}}>
              <div style={{width:36,height:36,background:`${G.green}18`,borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:900,fontSize:13,color:G.green,flexShrink:0,marginTop:1}}>
                {p.split(" ").map(w=>w[0]).join("").slice(0,2)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,color:G.text,fontSize:15,
                  display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  {p}{self&&<span style={{color:G.muted,fontSize:12,fontWeight:500}}>(you)</span>}
                  {isCoachMember(p, teams)&&<span style={{fontSize:12}} title="Coach">🧢</span>}
                  {(()=>{
                    if(!mem||!selSess?.date) return null;
                    if(!isAbsent(mem, selSess.date)) return null;
                    const abs=(mem.absences||[]).find(a=>a.from<=selSess.date&&a.to>=selSess.date);
                    return (
                      <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",
                        borderRadius:20,background:"#fffbeb",color:"#92400e",
                        border:"1px solid #fde68a"}}>
                        ✈️ Away{abs?.category&&` · ${abs.category}`}
                      </span>
                    );
                  })()}
                </div>
                <div style={{display:"flex",gap:4,marginTop:2,flexWrap:"wrap"}}>
                  {(mem?.teams||[]).map(t=><TeamPill key={t} team={t} sm/>)}
                  <MemberRolePills member={mem} teams={teams} sm/>
                </div>
                {/* Lift inline badge */}
                {liftPref&&(
                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                      background:isO?"#dcfce7":isN?"#dbeafe":"rgba(0,0,0,.05)",
                      color:isO?"#166534":isN?"#1e3a5f":G.muted,
                      border:`0.5px solid ${isO?"#86efac":isN?"#93c5fd":"rgba(0,0,0,.1)"}`}}>
                      {isO?"🚘 Offering lift":isN?"🙋 Needs lift":"🚀 Own transport"}
                    </span>
                    {isO&&liftObj.seats>0&&<span style={{fontSize:11,color:G.muted}}>💺 {liftObj.seats} seat{liftObj.seats>1?"s":""}</span>}
                    {dispStop(liftObj)&&<span style={{fontSize:11,color:G.muted}}>📍 {dispStop(liftObj)}</span>}
                    {liftObj.note&&<span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>"{liftObj.note}"</span>}
                    {self&&(
                      <button onClick={()=>onCarpoolEdit(p)}
                        style={{fontSize:11,background:"none",border:"none",color:G.muted,
                          textDecoration:"underline",cursor:"pointer",fontFamily:"inherit",padding:0}}>
                        Edit
                      </button>
                    )}
                  </div>
                )}
                {!liftPref&&self&&(
                  <button onClick={onCarpoolSet}
                    style={{marginTop:5,fontSize:11,fontWeight:700,padding:"3px 10px",
                      borderRadius:20,border:`1px solid ${G.border}`,background:G.cream,
                      color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
                    🚘 Set car pool preference
                  </button>
                )}
              </div>
            </div>
            {canRemove ? (
              <Btn onClick={()=>onRemove(p)} bg={G.redBg} col={G.red} sm>Remove</Btn>
            ) : self ? (
              cutoff
                ? <span style={{fontSize:11,color:G.muted,fontWeight:700}}>🔒 Locked</span>
                : <Btn onClick={()=>onRemove(p)} bg={G.redBg} col={G.red} sm>Leave</Btn>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
