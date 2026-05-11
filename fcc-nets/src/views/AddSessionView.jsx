import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import Btn from "../ui/Btn";
import SLbl from "../ui/SLbl";
import FFld from "../ui/FFld";
import { NetIcon, BothNetsIcon } from "../ui/icons";
import { TeamPill } from "../ui/pills";
import AppHeader from "../ui/AppHeader";
import { PRESET_POLL, uid } from "../constants/seeds";
import { todayStr, isPrimeTime, toMinsNet, fmtShort } from "../utils/time";
import { isAbsent } from "../utils/members";

export default function AddSessionView() {
  const {
    G, view, setView, userRole, currentUser, teams, members,
    sessions, bDate, setBDate, bFrom, setBFrom, bTo, setBTo,
    bNote, setBNote, bNet, setBNet, bLift, setBLift,
    bRestrictTeam, selP, setSelP, pSearch, setPSearch, pFilter,
    otherGroupsOpen, setOtherGroupsOpen,
    bPollOpts, setBPollOpts, bCustomOpt, setBCustomOpt,
    handleAddSession, timesOverlap, myTeamsList,
    joinRequests, toast, setSelSess,
  } = useAppContext();

  const iSt = (extra={}) => ({
    width:"100%", borderRadius:9, border:`1.5px solid ${G.border}`,
    padding:"11px 13px", fontSize:15, fontFamily:"'DM Sans',sans-serif",
    fontWeight:500, background:G.cream, color:G.text,
    outline:"none", boxSizing:"border-box", ...extra,
  });

  const exactMatch = sessions.find(s=>s.date===bDate&&s.from===bFrom&&s.to===bTo);

  // Helper: do two net values conflict?
  function netsConflict(a, b) {
    if(!a||!b) return false;
    if(a==="both"||b==="both") return true; // "both" always conflicts
    return a===b; // same net conflicts
  }

  // All sessions on same date/time (excluding exact match)
  const overlappingSessions = bDate ? sessions.filter(s=>
    s.date===bDate && !exactMatch && timesOverlap(bFrom,bTo,s.from,s.to)
  ) : [];

  // Net clash: same net (or either is "both") at overlapping time
  const netClash = overlappingSessions.find(s=>netsConflict(s.net, bNet));

  // Player clash: any selected player already in ANY overlapping session
  const clashSess = overlappingSessions.find(s=>selP.some(p=>s.players.includes(p)));
  const clashPlayers = clashSess ? selP.filter(p=>clashSess.players.includes(p)) : [];
  const alreadyIn = clashSess ? clashPlayers.filter(p=>clashSess.players.includes(p) && selP.includes(p)) : [];
  const bookingUser = currentUser?.name;
  const userAlreadyIn = alreadyIn.includes(bookingUser);
  const othersAlreadyIn = alreadyIn.filter(p=>p!==bookingUser);

  // Either type of clash blocks submission
  const hasAnyClash = !exactMatch && (!!netClash || !!clashSess);

  return (
    <Shell G={G}>
      <AppHeader onBack={()=>{setView("schedule");setSelP([]);}}
        title="Book a Session"
        sub={exactMatch?"Session exists at this time":"Create or join a training session"}/>
      {/* Exact match warning — prominent, not just a subtitle */}
      {exactMatch&&(
        <div style={{background:"#fef9c3",border:"1.5px solid #fde047",
          borderRadius:12,padding:"12px 16px",margin:"0 16px 4px",
          display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:18,flexShrink:0}}>📋</span>
          <div>
            <div style={{fontWeight:900,fontSize:13,color:"#92400e",marginBottom:3}}>
              A session already exists at this time
            </div>
            <div style={{fontSize:12,color:"#78350f",lineHeight:1.5}}>
              <b>{exactMatch.label||"Session"}</b> · {exactMatch.from}–{exactMatch.to} · {exactMatch.players.length} player{exactMatch.players.length!==1?"s":""} booked.
              {" "}Submitting will <b>add the selected players</b> to that existing session.
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleAddSession} style={{padding:"14px 16px 20px"}}>
        <SLbl mt={4} G={G}>When?</SLbl>
        <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
          padding:14,marginBottom:12}}>
          <FFld G={G} label="Date">
            <input type="date" style={iSt({fontSize:14,padding:"9px 10px"})} value={bDate}
              min={todayStr()} onChange={e=>setBDate(e.target.value)} required/>
          </FFld>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <FFld G={G} label="From" style={{flex:1}}>
              <div style={{display:"flex",gap:4}}>
                <select style={iSt({flex:1,fontSize:13,padding:"9px 4px",textAlign:"center"})}
                  value={bFrom.split(":")[0]}
                  onChange={e=>{
                    const h=e.target.value;
                    const m=bFrom.split(":")[1]||"00";
                    setBFrom(`${h}:${m}`);
                    // Auto-advance end time by 1 hour
                    const nextH=String(Math.min(23,parseInt(h)+1)).padStart(2,"0");
                    setBTo(`${nextH}:${m}`);
                  }}>
                  {Array.from({length:24},(_,i)=>{
                    const h=String(i).padStart(2,"0");
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <select style={iSt({width:58,fontSize:13,padding:"9px 2px",textAlign:"center",flexShrink:0})}
                  value={bFrom.split(":")[1]||"00"}
                  onChange={e=>{
                    const h=bFrom.split(":")[0]||"18";
                    setBFrom(`${h}:${e.target.value}`);
                  }}>
                  {["00","15","30","45"].map(m=>(
                    <option key={m} value={m}>:{m}</option>
                  ))}
                </select>
              </div>
            </FFld>
            <FFld G={G} label="Until" style={{flex:1}}>
              <div style={{display:"flex",gap:4}}>
                <select style={iSt({flex:1,fontSize:13,padding:"9px 4px",textAlign:"center"})}
                  value={bTo.split(":")[0]}
                  onChange={e=>{
                    const h=e.target.value;
                    const m=bTo.split(":")[1]||"00";
                    setBTo(`${h}:${m}`);
                  }}>
                  {Array.from({length:24},(_,i)=>{
                    const h=String(i).padStart(2,"0");
                    const isLeader=["superadmin","admin","captain","vicecaptain"].includes(userRole);
                    const prime=(!isLeader)&&bFrom?isPrimeTime(bFrom):false;
                    const maxMins=toMinsNet(bFrom)+(prime?60:120);
                    const disabled=(!isLeader)&&(i*60>maxMins||i*60<=toMinsNet(bFrom));
                    return <option key={h} value={h} disabled={disabled}>{h}</option>;
                  })}
                </select>
                <select style={iSt({width:58,fontSize:13,padding:"9px 2px",textAlign:"center",flexShrink:0})}
                  value={bTo.split(":")[1]||"00"}
                  onChange={e=>{
                    const h=bTo.split(":")[0]||"20";
                    setBTo(`${h}:${e.target.value}`);
                  }}>
                  {["00","15","30","45"].map(m=>(
                    <option key={m} value={m}>:{m}</option>
                  ))}
                </select>
              </div>
            </FFld>
          </div>
          <FFld G={G} label="Net" style={{marginTop:10}}>
            <div style={{display:"flex",gap:8}}>
              {[
                ["1",  <><NetIcon color={bNet==="1"?G.lime:G.text} size={16}/> Net 1</>],
                ["2",  <><NetIcon color={bNet==="2"?G.lime:G.text} size={16}/> Net 2</>],
                ["both",<><BothNetsIcon color={bNet==="both"?G.lime:G.text} size={16}/> Both</>],
              ].map(([val,lbl])=>(
                <button key={val} type="button" onClick={()=>setBNet(val)}
                  style={{flex:1,background:bNet===val?G.green:G.white,
                    color:bNet===val?G.lime:G.text,
                    border:bNet===val?`2px solid ${G.green}`:`1.5px solid ${G.border}`,
                    borderRadius:10,padding:"10px 6px",fontSize:13,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",transition:"all .12s",
                    textAlign:"center",display:"flex",alignItems:"center",
                    justifyContent:"center",gap:6}}>
                  {lbl}
                </button>
              ))}
            </div>
            {bNet==="both"&&selP.length<8&&(
              <div style={{marginTop:8,background:"#fff7ed",border:"1.5px solid #fed7aa",
                borderRadius:8,padding:"8px 11px",fontSize:12,color:"#92400e",lineHeight:1.5}}>
                ⚠️ <b>Heads up:</b> You have fewer than 8 players. Consider booking just one net
                so the other stays free for others.
              </div>
            )}
          </FFld>
          {/* Prime hours note — members only */}
          {bDate&&bFrom&&!["superadmin","admin","captain","vicecaptain"].includes(userRole)&&(()=>{
            const prime=isPrimeTime(bFrom);
            return (
              <div style={{marginTop:10,padding:"7px 10px",background:"#fffbeb",
                borderRadius:8,border:"1px solid #fde68a",
                display:"flex",alignItems:"flex-start",gap:5}}>
                <span style={{fontSize:11,flexShrink:0}}>⭐</span>
                <p style={{margin:0,fontSize:10,color:"#b45309",lineHeight:1.6}}>
                  <b style={{color:"#92400e",whiteSpace:"nowrap"}}>Prime Hours</b>
                  {" "}— Bookings are for max.{" "}
                  {prime
                    ? <b>1 hour</b>
                    : <b>2 hours</b>}
                  {" "}slots during{" "}
                  <span style={{whiteSpace:"nowrap"}}>(<b>17–20</b> daily</span>
                  {" "}&amp;{" "}
                  <span style={{whiteSpace:"nowrap"}}><b>9–13</b> weekends)</span>
                  {" "}and 2 hours at all other times to allow fair access to the nets for everyone.
                  {prime&&<b style={{color:"#92400e"}}> Your selected start time is in a peak slot.</b>}
                </p>
              </div>
            );
          })()}
          <FFld G={G} label="Note (optional)" style={{marginTop:10}}>
            <input style={iSt()} placeholder="e.g. Bring extra balls"
              value={bNote} onChange={e=>setBNote(e.target.value)}/>
          </FFld>
        </div>

        {/* ── Overlap warning ───────────────────────────────── */}
        {(netClash||clashSess)&&!exactMatch&&(
          <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",
            borderRadius:12,padding:"13px 15px",marginBottom:12}}>
            <div style={{fontWeight:900,fontSize:13,color:"#991b1b",marginBottom:6}}>
              🚫 Time conflict detected
            </div>
            <div style={{fontSize:12,color:"#7f1d1d",lineHeight:1.7,marginBottom:10}}>
              {netClash&&(
                <div style={{marginBottom:clashSess?6:0}}>
                  <b>{netClash.net==="both"?"Both nets are":
                      `Net ${netClash.net} is`} already booked</b>{" "}
                  {netClash.from}–{netClash.to}
                  {netClash.label?` · ${netClash.label}`:""}.
                  {" "}Pick a different time{bNet!==netClash.net?" or switch nets":""}.
                </div>
              )}
              {clashSess&&!netClash&&(
                <>
                  {userAlreadyIn && othersAlreadyIn.length===0 && (
                    <>You're already in <b>{clashSess.label||"a session"}</b> ({clashSess.from}–{clashSess.to}).</>
                  )}
                  {userAlreadyIn && othersAlreadyIn.length>0 && (
                    <>You and <b>{othersAlreadyIn.join(", ")}</b> are already in <b>{clashSess.label||"a session"}</b> ({clashSess.from}–{clashSess.to}).</>
                  )}
                  {!userAlreadyIn && othersAlreadyIn.length>0 && (
                    <><b>{othersAlreadyIn.join(", ")}</b> {othersAlreadyIn.length>1?"are":"is"} already in <b>{clashSess.label||"a session"}</b> ({clashSess.from}–{clashSess.to}).</>
                  )}
                </>
              )}
            </div>
            {/* Action buttons */}
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {clashSess&&!netClash&&(
                <button type="button"
                  onClick={()=>{setSelSess(clashSess);setView("session");setSelP([]);}}
                  style={{width:"100%",padding:"9px 12px",borderRadius:9,
                    border:"1.5px solid #fca5a5",background:"#fff",
                    color:"#991b1b",fontWeight:700,fontSize:12,
                    cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                    display:"flex",alignItems:"center",gap:8}}>
                  <span>👉</span>
                  <span>View <b>{clashSess.label||"that session"}</b> and join instead</span>
                </button>
              )}
              {netClash&&(
                <div style={{fontSize:11,color:"#991b1b",fontWeight:700}}>
                  Suggested times nearby:
                  <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                    {(()=>{
                      // Suggest slots before and after the clash
                      const clashEnd = netClash.to;
                      const clashStart = netClash.from;
                      const dur = toMinsNet(bTo)-toMinsNet(bFrom);
                      const beforeFrom = `${String(Math.floor((toMinsNet(clashStart)-dur)/60)).padStart(2,"0")}:${String((toMinsNet(clashStart)-dur)%60).padStart(2,"0")}`;
                      const afterTo   = `${String(Math.floor((toMinsNet(clashEnd)+dur)/60)).padStart(2,"0")}:${String((toMinsNet(clashEnd)+dur)%60).padStart(2,"0")}`;
                      return [
                        {label:`Before: ${beforeFrom}–${clashStart}`, from:beforeFrom, to:clashStart},
                        {label:`After: ${clashEnd}–${afterTo}`, from:clashEnd, to:afterTo},
                      ].filter(s=>toMinsNet(s.from)>=0&&toMinsNet(s.to)<=toMinsNet("22:00")).map(s=>(
                        <button key={s.from} type="button"
                          onClick={()=>{setBFrom(s.from);setBTo(s.to);}}
                          style={{padding:"5px 10px",borderRadius:20,border:"1.5px solid #fca5a5",
                            background:"#fff",color:"#991b1b",fontWeight:700,fontSize:11,
                            cursor:"pointer",fontFamily:"inherit"}}>
                          {s.label}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
              <button type="button"
                onClick={()=>{setBDate("");setBFrom("18:00");setBTo("20:00");}}
                style={{width:"100%",padding:"9px 12px",borderRadius:9,
                  border:"1.5px solid #fca5a5",background:"#fff",
                  color:"#7f1d1d",fontWeight:600,fontSize:12,
                  cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                  display:"flex",alignItems:"center",gap:8}}>
                <span>🗓️</span>
                <span>Pick a different date / time</span>
              </button>
            </div>
          </div>
        )}

        <SLbl G={G}>Who's coming? {selP.length>0&&`(${selP.length} selected)`}</SLbl>
        {(["superadmin","admin","captain","vicecaptain"].includes(userRole))&&bRestrictTeam&&(
          <div style={{background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:8,
            padding:"8px 12px",marginBottom:10,fontSize:12,color:"#1e40af",lineHeight:1.5}}>
            <b>👥 Auto-enroll on:</b> All members of <b>{bRestrictTeam}</b> will be
            automatically added when you create this session.
          </div>
        )}
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input style={iSt({flex:1,background:G.white})}
            placeholder="🔍  Search players…" value={pSearch}
            onChange={e=>setPSearch(e.target.value)}/>
        </div>

        {selP.length>0&&(
          <div style={{background:G.sand,borderRadius:10,padding:"9px 13px",
            marginBottom:10,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:900,color:G.text,
              letterSpacing:1.5,textTransform:"uppercase",marginRight:4}}>Selected:</span>
            {selP.map(p=>(
              <button key={p} type="button"
                onClick={()=>setSelP(ps=>ps.filter(x=>x!==p))}
                style={{background:G.green,color:G.lime,border:"none",borderRadius:20,
                  padding:"3px 10px",fontSize:12,fontWeight:800,
                  cursor:"pointer",fontFamily:"inherit"}}>
                {p} ×
              </button>
            ))}
          </div>
        )}

        {(()=>{
          // Build unique player list (no duplicates)
          const allPlayers = members.filter(m => {
            if(pFilter !== "All" && !(m.teams||[]).includes(pFilter)) return false;
            const q = !pSearch || m.name.toLowerCase().includes(pSearch.toLowerCase());
            return q;
          });

          // Separate into "my teams" and "others" for display
          const myTeamsSet = new Set(myTeamsList);
          const myTeamPlayers = allPlayers.filter(m =>
            (m.teams||[]).some(t => myTeamsSet.has(t))
          );
          const otherPlayers = allPlayers.filter(m =>
            !(m.teams||[]).some(t => myTeamsSet.has(t))
          );

          const hasTeam = myTeamsList.length > 0;
          const showMyTeamPlayers = hasTeam ? myTeamPlayers : allPlayers;
          const showOtherPlayers = hasTeam ? otherPlayers : [];

          // Count selected from others
          const otherSelected = showOtherPlayers.filter(m => selP.includes(m.name)).length;

          return (<>
            {/* My Teams - show as pills grouped by team */}
            {hasTeam && myTeamsList.map(team => {
              const teamPlayers = showMyTeamPlayers.filter(m => (m.teams||[]).includes(team));
              if(teamPlayers.length === 0) return null;
              return (
                <div key={team} style={{marginBottom:14}}>
                  <div style={{marginBottom:7,display:"flex",alignItems:"center",gap:7}}>
                    <TeamPill team={team}/>
                    <span style={{fontSize:10,fontWeight:800,color:G.green,
                      background:"#dcfce7",borderRadius:99,padding:"1px 7px"}}>
                      Your group
                    </span>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {teamPlayers.map(m => {
                      const sel = selP.includes(m.name);
                      const away = bDate && isAbsent(m, bDate);
                      const abs = away ? (m.absences||[]).find(a=>a.from<=bDate&&a.to>=bDate) : null;
                      return (
                        <button key={m.id} type="button"
                          onClick={()=>setSelP(ps=>sel?ps.filter(x=>x!==m.name):[...ps,m.name])}
                          style={{background:sel?G.green:away?"#fffbeb":G.white,
                            color:sel?G.lime:away?"#92400e":G.text,
                            border:sel?`2px solid ${G.green}`:away?"1.5px solid #fde68a":`1.5px solid ${G.border}`,
                            borderRadius:24,padding:"7px 14px",fontSize:13,fontWeight:700,
                            cursor:"pointer",fontFamily:"inherit",transition:"all .1s"}}
                          title={away?`Away: ${abs?.category||""} ${fmtShort(abs?.from)}–${fmtShort(abs?.to)}`:""}
                        >
                          {sel&&"✓ "}{m.name}{away&&" ✈️"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* If no team, show all as a flat list */}
            {!hasTeam && showMyTeamPlayers.length > 0 && (
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {showMyTeamPlayers.map(m => {
                    const sel = selP.includes(m.name);
                    const away = bDate && isAbsent(m, bDate);
                    return (
                      <button key={m.id} type="button"
                        onClick={()=>setSelP(ps=>sel?ps.filter(x=>x!==m.name):[...ps,m.name])}
                        style={{background:sel?G.green:away?"#fffbeb":G.white,
                          color:sel?G.lime:away?"#92400e":G.text,
                          border:sel?`2px solid ${G.green}`:away?"1.5px solid #fde68a":`1.5px solid ${G.border}`,
                          borderRadius:24,padding:"7px 14px",fontSize:13,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit",transition:"all .1s"}}>
                        {sel&&"✓ "}{m.name}{away&&" ✈️"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other Players - collapsible searchable list (NO DUPLICATES) */}
            {hasTeam && showOtherPlayers.length > 0 && (
              <div style={{marginBottom:14}}>
                <button type="button"
                  onClick={()=>setOtherGroupsOpen(o=>!o)}
                  style={{width:"100%",background:"none",border:`1.5px dashed ${G.border}`,
                    borderRadius:10,padding:"9px 14px",cursor:"pointer",fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,fontWeight:700,color:G.muted}}>
                    {otherGroupsOpen?"▲":"▼"} Add Players from Other Groups
                  </span>
                  {otherSelected>0&&(
                    <span style={{background:G.green,color:G.lime,borderRadius:99,
                      padding:"1px 8px",fontSize:11,fontWeight:800}}>
                      {otherSelected} selected
                    </span>
                  )}
                </button>

                {otherGroupsOpen&&(
                  <div style={{marginTop:10,background:G.white,border:`1.5px solid ${G.border}`,
                    borderRadius:10,padding:12,maxHeight:300,overflowY:"auto"}}>
                    {/* Search hint */}
                    <div style={{fontSize:11,color:G.muted,marginBottom:10}}>
                      Use the search bar above to filter. Showing {showOtherPlayers.length} player{showOtherPlayers.length!==1?"s":""}.
                    </div>
                    {/* Simple alphabetical list - no team grouping, no duplicates */}
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {showOtherPlayers
                        .sort((a,b) => a.name.localeCompare(b.name))
                        .map(m => {
                          const sel = selP.includes(m.name);
                          const teamStr = (m.teams||[]).join(", ") || "Unassigned";
                          return (
                            <button key={m.id} type="button"
                              onClick={()=>setSelP(ps=>sel?ps.filter(x=>x!==m.name):[...ps,m.name])}
                              style={{
                                display:"flex",alignItems:"center",justifyContent:"space-between",
                                background:sel?"#dcfce7":G.bg,
                                border:sel?`1.5px solid ${G.green}`:`1px solid ${G.border}`,
                                borderRadius:8,padding:"8px 12px",
                                cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                              }}>
                              <span style={{fontWeight:700,fontSize:13,color:sel?G.green:G.text}}>
                                {sel&&"✓ "}{m.name}
                              </span>
                              <span style={{fontSize:10,color:G.muted}}>{teamStr}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>);
        })()}

        {/* Lift preference — only shown when current user is in the session */}
        {selP.includes(currentUser?.name) && (
          <div style={{marginBottom:14}}>
            <SLbl G={G}>Your lift preference <span style={{fontWeight:500,color:G.muted}}>(optional)</span></SLbl>
            <div style={{display:"flex",gap:8}}>
              {[
                {val:"offer", label:"🚘 I can offer a lift", activeCol:"#14532d", activeTxt:"#a3e635"},
                {val:"need",  label:"🙋 I need a lift",      activeCol:"#1e3a5f", activeTxt:"#93c5fd"},
                {val:"self",  label:"🚀 Own transport",       activeCol:G.cream,   activeTxt:G.muted},
              ].map(opt=>(
                <button key={opt.val} type="button"
                  onClick={()=>setBLift(bLift===opt.val && opt.val!=="" ? "" : opt.val)}
                  style={{
                    flex:1, padding:"9px 6px", borderRadius:10, fontFamily:"inherit",
                    fontSize:11, fontWeight:700, cursor:"pointer", border:"1.5px solid",
                    borderColor: bLift===opt.val ? opt.activeCol : G.border,
                    background:  bLift===opt.val ? opt.activeCol : G.white,
                    color:       bLift===opt.val ? opt.activeTxt : G.muted,
                    transition:"all .14s", lineHeight:1.3,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <SLbl G={G}>Session Poll <span style={{fontWeight:500,color:G.muted}}>(optional)</span></SLbl>          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
          padding:14,marginBottom:14}}>
          {/* Preset options */}
          <div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",
            letterSpacing:1.2,marginBottom:8}}>Tap to add preset options</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
            {PRESET_POLL.map(p=>{
              const active = bPollOpts.find(o=>o.id===p.id);
              return (
                <button key={p.id} type="button"
                  onClick={()=>setBPollOpts(ps=>active
                    ? ps.filter(o=>o.id!==p.id)
                    : [...ps,{id:p.id,label:p.label}])}
                  style={{background:active?G.green:G.cream,
                    color:active?G.lime:G.text,
                    border:active?`2px solid ${G.green}`:`1.5px solid ${G.border}`,
                    borderRadius:24,padding:"8px 14px",fontSize:13,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",transition:"all .12s"}}>
                  {active&&"✓ "}{p.label}
                </button>
              );
            })}
          </div>
          {/* Custom option input */}
          <div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",
            letterSpacing:1.2,marginBottom:7}}>Add a custom option</div>
          <div style={{display:"flex",gap:8}}>
            <input style={iSt({flex:1,padding:"9px 12px",fontSize:13})}
              placeholder="e.g. Match prep, Throw-downs…"
              value={bCustomOpt}
              onChange={e=>setBCustomOpt(e.target.value)}
              onKeyDown={e=>{
                if(e.key==="Enter"){e.preventDefault();
                  const t=bCustomOpt.trim();
                  if(t&&!bPollOpts.find(o=>o.label.toLowerCase()===t.toLowerCase())){
                    setBPollOpts(ps=>[...ps,{id:uid(),label:t}]);
                    setBCustomOpt("");
                  }
                }
              }}/>
            <Btn type="button" bg={G.green} col={G.lime}
              onClick={()=>{
                const t=bCustomOpt.trim();
                if(t&&!bPollOpts.find(o=>o.label.toLowerCase()===t.toLowerCase())){
                  setBPollOpts(ps=>[...ps,{id:uid(),label:t}]);
                  setBCustomOpt("");
                }
              }}>+ Add</Btn>
          </div>
          {/* Selected poll options preview */}
          {bPollOpts.length>0&&(
            <div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:6}}>
              {bPollOpts.map(o=>(
                <span key={o.id} style={{background:"#ede9fe",color:"#5b21b6",
                  borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:800,
                  display:"flex",alignItems:"center",gap:6}}>
                  {o.label}
                  <button type="button" onClick={()=>setBPollOpts(ps=>ps.filter(p=>p.id!==o.id))}
                    style={{background:"none",border:"none",color:"#5b21b6",cursor:"pointer",
                      fontWeight:900,padding:0,fontSize:13,lineHeight:1}}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Btn type="submit" bg={hasAnyClash?G.muted:G.green} col={G.lime} full
          disabled={hasAnyClash}
          style={{opacity:hasAnyClash?0.5:1,cursor:hasAnyClash?"not-allowed":"pointer"}}>
          {hasAnyClash?"🚫 Fix conflict above to continue":"🏏 Confirm Session"}
        </Btn>
        <p style={{fontSize:11,color:G.muted,textAlign:"center",marginTop:8}}>
          Existing session at same date & time? Players are auto-added.
        </p>
      </form>
      <BotNav view="add" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
      {toast&&<Toast msg={toast} G={G}/>}
    </Shell>
  );
}
