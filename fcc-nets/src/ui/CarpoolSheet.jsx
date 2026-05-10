import React from "react";
import { getLiftObj, getLiftPref } from "../utils/lifts";
import { fmtShort } from "../utils/time";

const CARPOOL_STOPS = ["Nørrebro", "Nørreport", "Lyngby St", "Kokkedal School (Egedalshallen)", "Other"];

export default function CarpoolSheet({sess,sessions,myName,liftDraft,setLiftDraft,liftEditing,setLiftEditing,saveSessions,selSess,setSelSess,onClose,G}) {
  const lifts = sess.lifts||{};
  const myRaw = lifts[myName];
  const myData = getLiftObj(myRaw);
  const draft  = liftDraft || myData;
  const isO=draft.pref==="offer", isN=draft.pref==="need", isSelf=draft.pref==="self";

  const dispStop = d => {
    const o=getLiftObj(d);
    if(!o.stop) return "";
    return o.stop==="Other"?(o.stopOther||"Other"):o.stop;
  };

  const offering = sess.players.filter(p=>getLiftPref(lifts[p])==="offer");
  const needing  = sess.players.filter(p=>getLiftPref(lifts[p])==="need");
  const ownT     = sess.players.filter(p=>getLiftPref(lifts[p])==="self");

  function saveLift(obj) {
    const newLifts = {...(sess.lifts||{})};
    if(obj && obj.pref) newLifts[myName] = obj; else delete newLifts[myName];
    const updatedSess = {...sess, lifts:newLifts};
    const updated = sessions.map(s=>s.id===sess.id?updatedSess:s);
    saveSessions(updated);
    if(selSess?.id===sess.id) setSelSess(updatedSess);
    // Update sheet's own sess so it re-renders showing saved state
    // We do this by closing and the parent sees updated selSess/sessions
    setLiftDraft(null);
    setLiftEditing(false);
    onClose(); // close sheet — saved state now visible in session detail carpool section
  }

  const PILL = (label,active,col,bg,bord,onClick) => (
    <button onClick={onClick} style={{fontSize:12,fontWeight:700,padding:"7px 0",flex:1,
      borderRadius:20,border:`1.5px solid ${active?bord:"rgba(0,0,0,.1)"}`,
      background:active?bg:G.white,color:active?col:G.muted,
      cursor:"pointer",fontFamily:"inherit",transition:"all .13s"}}>
      {label}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",
        zIndex:300,animation:"fadeIn .2s ease"}}/>
      {/* Sheet */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:500,zIndex:301,background:G.white,
        borderRadius:"20px 20px 0 0",boxShadow:"0 -8px 40px rgba(0,0,0,.18)",
        animation:"slideUp .25s ease",maxHeight:"85vh",overflowY:"auto",
        boxSizing:"border-box",paddingBottom:"max(20px,env(safe-area-inset-bottom))"}}>

        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",paddingTop:10,paddingBottom:4}}>
          <div style={{width:36,height:4,borderRadius:20,background:G.border}}/>
        </div>

        {/* Header */}
        <div style={{padding:"4px 16px 10px",borderBottom:`1px solid ${G.border}`,
          display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:900,fontSize:15,color:G.green}}>🚘 Car Pool Info</div>
            <div style={{fontSize:12,color:G.muted,marginTop:1}}>
              {fmtShort(sess.date)} · {sess.from}–{sess.to}{sess.label?" · "+sess.label:""}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,
            color:G.muted,cursor:"pointer",padding:"0 0 0 8px",lineHeight:1}}>×</button>
        </div>

        <div style={{padding:"12px 16px"}}>

          {/* Other players */}
          {(offering.length>0||needing.length>0||ownT.length>0) ? (
            <div style={{marginBottom:14}}>
              {offering.map(name=>{
                const obj=getLiftObj(lifts[name]);const loc=dispStop(lifts[name]);
                return (
                  <div key={name} style={{display:"flex",alignItems:"flex-start",gap:10,
                    padding:"9px 12px",background:"#f0fdf4",borderRadius:10,marginBottom:7,
                    border:"0.5px solid #86efac"}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:"#14532d22",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,fontWeight:900,color:G.green,flexShrink:0}}>
                      {name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
                        <span style={{fontWeight:800,fontSize:13,color:G.text}}>{name}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                          background:"#dcfce7",color:"#166534",border:"0.5px solid #86efac"}}>
                          🚘 Offering
                        </span>
                      </div>
                      <div style={{fontSize:11,color:G.muted,display:"flex",gap:6,flexWrap:"wrap"}}>
                        {obj.seats>0&&<span>💺 {obj.seats} seat{obj.seats>1?"s":""}</span>}
                        {loc&&<span>📍 {loc}</span>}
                        {obj.note&&<span style={{fontStyle:"italic"}}>"{obj.note}"</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {needing.map(name=>{
                const obj=getLiftObj(lifts[name]);const loc=dispStop(lifts[name]);
                return (
                  <div key={name} style={{display:"flex",alignItems:"flex-start",gap:10,
                    padding:"9px 12px",background:"#eff6ff",borderRadius:10,marginBottom:7,
                    border:"0.5px solid #93c5fd"}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:"#1e3a5f22",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,fontWeight:900,color:"#1e3a5f",flexShrink:0}}>
                      {name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
                        <span style={{fontWeight:800,fontSize:13,color:G.text}}>{name}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                          background:"#dbeafe",color:"#1e3a5f",border:"0.5px solid #93c5fd"}}>
                          🙋 Needs lift
                        </span>
                      </div>
                      <div style={{fontSize:11,color:G.muted,display:"flex",gap:6,flexWrap:"wrap"}}>
                        {loc&&<span>📍 {loc}</span>}
                        {obj.note&&<span style={{fontStyle:"italic"}}>"{obj.note}"</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {ownT.filter(n=>n!==myName).map(name=>(
                <div key={name} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"8px 12px",background:G.cream,borderRadius:10,marginBottom:7,
                  border:`0.5px solid ${G.border}`}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`${G.green}18`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,fontWeight:900,color:G.green,flexShrink:0}}>
                    {name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                  <span style={{fontWeight:800,fontSize:13,color:G.text,flex:1}}>{name}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                    background:"rgba(0,0,0,.05)",color:G.muted,border:`0.5px solid ${G.border}`}}>
                    🚀 Own transport
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{fontSize:12,color:G.muted,fontStyle:"italic",textAlign:"center",
              padding:"10px 0 14px"}}>
              No one has set a preference yet — be the first!
            </div>
          )}

          {/* My preference */}
          <div style={{borderTop:`1px solid ${G.border}`,paddingTop:12}}>
            <div style={{fontSize:11,fontWeight:800,color:G.muted,textTransform:"uppercase",
              letterSpacing:1.1,marginBottom:8}}>Your preference</div>

            {myData.pref && !liftEditing ? (
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
                padding:"9px 12px",background:isO?"#f0fdf4":isN?"#eff6ff":"rgba(0,0,0,.03)",
                borderRadius:10,border:`0.5px solid ${isO?"#86efac":isN?"#93c5fd":G.border}`}}>
                <span style={{fontSize:12,fontWeight:700,color:isO?"#166534":isN?"#1e3a5f":G.muted}}>
                  {isO?"🚘 Offering lift":isN?"🙋 Needs lift":"🚀 Own transport"}
                </span>
                {isO&&myData.seats>0&&<span style={{fontSize:11,color:G.muted}}>💺 {myData.seats} seat{myData.seats>1?"s":""}</span>}
                {dispStop(myData)&&<span style={{fontSize:11,color:G.muted}}>📍 {dispStop(myData)}</span>}
                {myData.note&&<span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>"{myData.note}"</span>}
                <button onClick={()=>setLiftEditing(true)}
                  style={{marginLeft:"auto",fontSize:11,background:"none",border:"none",
                    color:G.muted,textDecoration:"underline",cursor:"pointer",
                    fontFamily:"inherit",padding:0}}>Edit</button>
              </div>
            ) : (
              <div>
                <div style={{display:"flex",gap:7,marginBottom:draft.pref?10:0}}>
                  {PILL("🚘 Offer lift",isO,"#166534","#f0fdf4","#86efac",
                    ()=>setLiftDraft(d=>({...(d||{seats:1,stop:"",stopOther:"",note:""}),pref:isO?"":"offer"})))}
                  {PILL("🙋 Need lift",isN,"#1e3a5f","#eff6ff","#93c5fd",
                    ()=>setLiftDraft(d=>({...(d||{seats:1,stop:"",stopOther:"",note:""}),pref:isN?"":"need"})))}
                  {PILL("🚀 Own",isSelf,G.muted,"rgba(0,0,0,.05)","rgba(0,0,0,.15)",
                    ()=>setLiftDraft(d=>({...(d||{seats:0,stop:"",stopOther:"",note:""}),pref:isSelf?"":"self"})))}
                </div>
                {isSelf&&(
                  <button onClick={()=>saveLift({...draft,saved:true})}
                    style={{width:"100%",marginTop:8,padding:"10px 0",borderRadius:10,border:"none",
                      fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
                      background:G.muted,color:"#fff"}}>
                    Done ✓
                  </button>
                )}
                {(isO||isN)&&(
                  <div style={{background:"#f8fdf9",border:`0.5px solid ${isO?"#c6f0d0":"#93c5fd"}`,
                    borderRadius:10,padding:"11px 12px",marginTop:4}}>
                    {isO&&(
                      <div style={{marginBottom:10}}>
                        <div style={{fontSize:10,fontWeight:700,color:G.muted,
                          textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Seats available</div>
                        <div style={{display:"flex",gap:6}}>
                          {[1,2,3,4].map(n=>{
                            const on=(draft.seats||1)===n;
                            return <button key={n} onClick={()=>setLiftDraft(d=>({...d,seats:n}))}
                              style={{width:34,height:34,borderRadius:"50%",
                                border:`1.5px solid ${on?G.green:"rgba(0,0,0,.12)"}`,
                                background:on?G.green:G.white,color:on?G.lime:G.text,
                                fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
                                display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {n}
                            </button>;
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:G.muted,
                        textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
                        {isO?"Pickup stops":"Your stop"}
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {CARPOOL_STOPS.map(st=>{
                          const on=(draft.stop||"")===st;
                          const ac=isO?"#166534":"#1e3a5f";
                          const ab=isO?"#f0fdf4":"#eff6ff";
                          const abord=isO?"#86efac":"#93c5fd";
                          return <button key={st} onClick={()=>setLiftDraft(d=>({...d,stop:st}))}
                            style={{fontSize:11,fontWeight:600,padding:"5px 11px",borderRadius:20,
                              cursor:"pointer",fontFamily:"inherit",
                              border:`1px solid ${on?abord:"rgba(0,0,0,.1)"}`,
                              background:on?ab:G.white,color:on?ac:G.muted}}>
                            {st}
                          </button>;
                        })}
                      </div>
                      {draft.stop==="Other"&&(
                        <input value={draft.stopOther||""}
                          onChange={e=>setLiftDraft(d=>({...d,stopOther:e.target.value}))}
                          placeholder="Your location…"
                          style={{marginTop:7,width:"100%",boxSizing:"border-box",
                            padding:"7px 10px",borderRadius:8,fontSize:12,
                            border:"0.5px solid rgba(0,0,0,.15)",fontFamily:"inherit",
                            background:G.white,color:G.text}}/>
                      )}
                    </div>
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:G.muted,
                        textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>
                        Note <span style={{fontWeight:400,textTransform:"none"}}>(optional)</span>
                      </div>
                      <textarea rows={2} value={draft.note||""}
                        onChange={e=>setLiftDraft(d=>({...d,note:e.target.value}))}
                        placeholder={isO?"e.g. Leaving 16:00, WhatsApp me":"e.g. At stop from 16:15"}
                        style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                          borderRadius:8,fontSize:12,border:"0.5px solid rgba(0,0,0,.15)",
                          fontFamily:"inherit",resize:"none",background:G.white,color:G.text}}/>
                    </div>
                    <button onClick={()=>saveLift({...draft,saved:true})}
                      style={{width:"100%",padding:"10px 0",borderRadius:10,border:"none",
                        fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
                        background:isO?G.green:"#1e3a5f",color:isO?G.lime:"#bfdbfe"}}>
                      Done ✓
                    </button>
                    {myData.pref&&(
                      <button onClick={()=>saveLift(null)}
                        style={{width:"100%",marginTop:8,padding:"8px 0",borderRadius:10,
                          border:`1px solid ${G.border}`,background:"transparent",
                          fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",
                          color:G.muted}}>
                        🗑 Remove my preference
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
