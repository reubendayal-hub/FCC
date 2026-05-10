import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import SidebarNav from "../ui/SidebarNav";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import AppHeader from "../ui/AppHeader";
import { FCC_LOGO } from "../constants/logo";
import { ALL_FIXTURES } from "../constants/fixtures";
import { can } from "../constants/roles";
import { getTeamMeta } from "../constants/teams";
import { todayStr, fmtShort } from "../utils/time";
import { isAbsent, isCoachMember } from "../utils/members";

export default function AvailabilityView() {
  const {
    G, view, setView, userRole, currentUser, handleLogout, teams,
    members, sessions, avTeam, setAvTeam,
    showMatches, setShowMatches,
    expandedSessions, setExpandedSessions,
    joinRequests, toast,
  } = useAppContext();

  const userMem  = members.find(m=>m.id===currentUser.id)||currentUser;
  const isAdmin  = can(userRole,"accessMembers");
  const isCoach  = isCoachMember(currentUser.name, teams);

  const myCoachTeams = teams.filter(t=>(t.coaches||[]).includes(currentUser.name)).map(t=>t.name);
  const myPlayTeams  = userMem.teams||[];
  const allVisible   = [...new Set([...myCoachTeams,...myPlayTeams])];
  const canSeeAll    = isAdmin || myCoachTeams.length>1;
  const teamOptions  = isAdmin ? teams.map(t=>t.name) : allVisible;
  const effectiveTeam = avTeam || myCoachTeams[0]||myPlayTeams[0]||(teams[0]?.name||"");

  const today     = todayStr();
  const seasonEnd = "2026-09-30";

  const squadMembers = effectiveTeam==="All"
    ? members
    : members.filter(m=>(m.teams||[]).includes(effectiveTeam));

  const catColour={Holiday:"#1e40af",Work:"#92400e",Injury:"#dc2626",Other:"#374151"};
  const catBg    ={Holiday:"#eff6ff",Work:"#fffbeb",Injury:"#fef2f2",Other:"#f3f4f6"};

  function awayOn(date){ return squadMembers.filter(m=>isAbsent(m,date)); }

  const relevantSessions = sessions
    .filter(s=>s.date>=today&&s.date<=seasonEnd)
    .filter(s=>effectiveTeam==="All"?true:
      (s.restrictedTo===effectiveTeam||(s.sessionTeams||[]).includes(effectiveTeam)||
       (!s.restrictedTo&&s.players.some(p=>{
         const mx=members.find(x=>x.name===p);
         return (mx?.teams||[]).includes(effectiveTeam);
       }))))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.from.localeCompare(b.from));

  const relevantMatches = ALL_FIXTURES
    .filter(f=>f.date>=today&&f.date<=seasonEnd)
    .filter(f=>{
      if(effectiveTeam==="All") return true;
      const divMap = {
        "Div 2":["Div 2"],"Div 3":["Div 3"],"Div 4":["Div 4"],
        "T20 Serie 4":["T20 Serie 4"],"T20 Serie 5":["T20 Serie 5"],
        "Women's":["Women's"],"OB":["OB"],
        "U11":["U11"],"U13":["U13"],"U15":["U15"],"U16":["U16"],"U18":["U18"],
      };
      const validDivs = divMap[effectiveTeam]||[];
      return validDivs.some(d=>f.division===d);
    })
    .sort((a,b)=>a.date.localeCompare(b.date));

  // All unique dates in season window
  const allDates = [...new Set([
    ...relevantSessions.map(s=>s.date),
    ...(showMatches?relevantMatches.map(f=>f.date):[]),
  ])].sort();

  return (
    <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
      <AppHeader title="Team Availability" sub="Full 2026 Season"
        onBack={()=>setView("schedule")}/>
      <div style={{padding:"14px 16px 100px"}}>

        {/* Team selector */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {canSeeAll&&(
            <button onClick={()=>setAvTeam("All")}
              style={{padding:"5px 12px",borderRadius:20,
                border:`1px solid ${effectiveTeam==="All"?G.green:G.border}`,
                background:effectiveTeam==="All"?G.green:G.white,
                color:effectiveTeam==="All"?G.lime:G.muted,
                fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              All teams
            </button>
          )}
          {teamOptions.map(tn=>{
            const tm=getTeamMeta(tn); const on=effectiveTeam===tn;
            return (
              <button key={tn} onClick={()=>setAvTeam(tn)}
                style={{padding:"5px 12px",borderRadius:20,border:"none",
                  background:on?tm.bg:"rgba(0,0,0,.06)",
                  color:on?tm.text:G.muted,
                  fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {tn}
              </button>
            );
          })}
        </div>

        {/* Match overlay toggle */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,
          padding:"8px 12px",background:G.cream,borderRadius:10,
          border:`1px solid ${G.border}`}}>
          <span style={{fontSize:12,fontWeight:700,color:G.text,flex:1}}>
            🏏 Show match fixtures alongside sessions
          </span>
          <button onClick={()=>setShowMatches(v=>!v)}
            style={{width:44,height:24,borderRadius:20,border:"none",cursor:"pointer",
              background:showMatches?G.green:"#d1d5db",transition:"background .2s",
              position:"relative",flexShrink:0}}>
            <span style={{position:"absolute",top:2,left:showMatches?22:2,
              width:20,height:20,borderRadius:"50%",background:"#fff",
              transition:"left .2s",display:"block"}}/>
          </button>
        </div>

        {/* Currently away */}
        {(()=>{
          const awayNow=squadMembers.filter(m=>isAbsent(m,today));
          if(!awayNow.length) return null;
          return (
            <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",
              borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:12,color:"#92400e",marginBottom:8}}>
                ✈️ Currently away ({awayNow.length})
              </div>
              {awayNow.map(m=>{
                const abs=(m.absences||[]).find(a=>a.from<=today&&a.to>=today);
                return (
                  <div key={m.id} style={{display:"flex",alignItems:"center",
                    gap:8,marginBottom:4,fontSize:12}}>
                    <span style={{fontWeight:700,color:G.text}}>{m.name}</span>
                    <span style={{fontSize:10,padding:"1px 7px",borderRadius:20,fontWeight:700,
                      background:catBg[abs?.category]||"#f3f4f6",
                      color:catColour[abs?.category]||G.muted}}>
                      {abs?.category||"Away"}
                    </span>
                    {abs?.to!==today&&<span style={{fontSize:11,color:G.muted}}>
                      until {fmtShort(abs.to)}
                    </span>}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Combined timeline */}
        {allDates.length===0?(
          <div style={{textAlign:"center",padding:"40px 0",color:G.muted,fontSize:14}}>
            No upcoming sessions or fixtures found
          </div>
        ):allDates.map(date=>{
          const daySessions = relevantSessions.filter(s=>s.date===date);
          const dayMatches  = showMatches ? relevantMatches.filter(f=>f.date===date) : [];
          const awayList    = awayOn(date);

          return (
            <div key={date} style={{marginBottom:18}}>

              {/* Date header */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontWeight:900,fontSize:13,color:G.text,whiteSpace:"nowrap"}}>
                  {fmtShort(date)}
                </span>
                {awayList.length>0&&(
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,
                    background:"#fffbeb",color:"#92400e",border:"1px solid #fde68a",
                    whiteSpace:"nowrap"}}>
                    ✈️ {awayList.length} away
                  </span>
                )}
                <div style={{flex:1,height:1,background:G.border}}/>
              </div>

              {/* Two column layout: sessions left, matches right */}
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>

                {/* Sessions column */}
                <div style={{flex:daySessions.length>0?3:0,minWidth:0,
                  display:daySessions.length>0?"flex":"none",
                  flexDirection:"column",gap:6}}>
                  {daySessions.map(s=>{
                    const squad   = effectiveTeam==="All"?squadMembers:squadMembers;
                    const total   = squad.length;
                    const inNames = s.players.filter(p=>squad.some(m=>m.name===p));
                    const inCount = inNames.length;
                    const awayFromSess = awayList.filter(m=>!s.players.includes(m.name));
                    const unaccounted  = Math.max(0,total-inCount-awayFromSess.length);
                    const pctIn = total>0?Math.round((inCount/total)*100):0;
                    const sessKey = s.id;
                    const expanded = !!expandedSessions[sessKey];

                    return (
                      <div key={s.id} style={{background:G.white,
                        border:`1.5px solid ${G.border}`,borderRadius:10,
                        overflow:"hidden"}}>

                        {/* Session header — tappable */}
                        <div onClick={()=>setExpandedSessions(prev=>({...prev,[sessKey]:!expanded}))}
                          style={{padding:"10px 12px",cursor:"pointer",
                            display:"flex",alignItems:"center",gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:800,fontSize:12,color:G.text,
                              display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                              {s.label||"Training"}
                              {s.restrictedTo&&<span style={{fontSize:9,fontWeight:700,
                                padding:"1px 5px",borderRadius:20,
                                background:"#fef9c3",color:"#92400e"}}>
                                🔒{s.restrictedTo}
                              </span>}
                            </div>
                            <div style={{fontSize:10,color:G.muted,marginTop:1}}>
                              {s.from}–{s.to}
                            </div>
                            {/* Availability bar */}
                            {total>0&&(
                              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5}}>
                                <div style={{flex:1,height:5,borderRadius:10,
                                  background:"#f1f5f9",overflow:"hidden",display:"flex"}}>
                                  <div style={{width:`${pctIn}%`,background:G.green,
                                    borderRadius:"10px 0 0 10px"}}/>
                                  {awayFromSess.length>0&&<div style={{
                                    width:`${Math.round((awayFromSess.length/total)*100)}%`,
                                    background:"#fbbf24"}}/>}
                                </div>
                                <span style={{fontSize:10,color:G.muted,flexShrink:0}}>
                                  <b style={{color:G.green}}>{inCount}</b>/{total}
                                </span>
                              </div>
                            )}
                          </div>
                          <span style={{fontSize:11,color:G.muted,flexShrink:0}}>
                            {expanded?"▲":"▼"}
                          </span>
                        </div>

                        {/* Expanded detail */}
                        {expanded&&(
                          <div style={{borderTop:`1px solid ${G.border}`,
                            padding:"10px 12px",background:G.cream}}>

                            {/* Confirmed players */}
                            {inCount>0&&(
                              <div style={{marginBottom:8}}>
                                <div style={{fontSize:10,fontWeight:900,color:G.green,
                                  letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>
                                  🟢 Confirmed ({inCount})
                                </div>
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {inNames.map(name=>(
                                    <span key={name} style={{fontSize:10,padding:"2px 7px",
                                      borderRadius:20,background:`${G.green}18`,
                                      color:G.green,fontWeight:700}}>
                                      {name.split(" ")[0]}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Away members */}
                            {awayFromSess.length>0&&(
                              <div style={{marginBottom:8}}>
                                <div style={{fontSize:10,fontWeight:900,color:"#92400e",
                                  letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>
                                  🟡 Away ({awayFromSess.length})
                                </div>
                                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                  {awayFromSess.map(m=>{
                                    const abs=(m.absences||[]).find(a=>a.from<=date&&a.to>=date);
                                    return (
                                      <div key={m.id} style={{display:"flex",
                                        alignItems:"center",gap:6,fontSize:11}}>
                                        <span style={{fontWeight:700,color:G.text}}>
                                          {m.name}
                                        </span>
                                        <span style={{fontSize:9,padding:"1px 6px",
                                          borderRadius:20,fontWeight:700,
                                          background:catBg[abs?.category]||"#f3f4f6",
                                          color:catColour[abs?.category]||G.muted}}>
                                          {abs?.category||"Away"}
                                        </span>
                                        {(isAdmin||isCoach)&&abs?.note&&(
                                          <span style={{fontSize:10,color:G.muted,
                                            fontStyle:"italic"}}>
                                            "{abs.note}"
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Unaccounted */}
                            {unaccounted>0&&(
                              <div>
                                <div style={{fontSize:10,fontWeight:900,color:G.muted,
                                  letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>
                                  ⚪ Not yet signed up ({unaccounted})
                                </div>
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {squad
                                    .filter(m=>!s.players.includes(m.name)&&!isAbsent(m,date))
                                    .map(m=>(
                                      <span key={m.id} style={{fontSize:10,padding:"2px 7px",
                                        borderRadius:20,background:"#f1f5f9",
                                        color:G.muted,fontWeight:600}}>
                                        {m.name.split(" ")[0]}
                                      </span>
                                    ))
                                  }
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Matches column — parallel alongside sessions */}
                {dayMatches.length>0&&(
                  <div style={{flex:2,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                    {dayMatches.map((f,i)=>(
                      <div key={i} style={{
                        padding:"10px 12px",borderRadius:10,
                        background:f.home?"#f0fdf4":"#f8fafc",
                        border:`1.5px solid ${f.home?"#86efac":"#e2e8f0"}`,
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{fontSize:16}}>{f.home?"🏠":"✈️"}</span>
                          <span style={{fontSize:9,fontWeight:800,padding:"2px 6px",
                            borderRadius:20,
                            background:f.home?"#dcfce7":"#e2e8f0",
                            color:f.home?"#166534":"#475569"}}>
                            {f.home?"HOME":"AWAY"}
                          </span>
                        </div>
                        <div style={{fontWeight:800,fontSize:11,color:G.text,
                          lineHeight:1.3}}>
                          {f.label}
                        </div>
                        {effectiveTeam==="All"&&(
                          <div style={{fontSize:9,color:G.muted,marginTop:2,fontWeight:600}}>
                            {f.division}
                          </div>
                        )}
                        {/* Away members on match day */}
                        {awayList.length>0&&(
                          <div style={{marginTop:6,paddingTop:6,
                            borderTop:`1px dashed ${G.border}`}}>
                            <div style={{fontSize:9,color:"#92400e",fontWeight:700,
                              marginBottom:3}}>
                              ✈️ Away on match day:
                            </div>
                            {awayList.map(m=>{
                              const abs=(m.absences||[]).find(a=>a.from<=date&&a.to>=date);
                              return (
                                <div key={m.id} style={{fontSize:10,color:G.muted,
                                  display:"flex",alignItems:"center",gap:4}}>
                                  <span style={{fontWeight:600}}>{m.name.split(" ")[0]}</span>
                                  <span style={{fontSize:9,padding:"0 5px",borderRadius:20,
                                    background:catBg[abs?.category]||"#f3f4f6",
                                    color:catColour[abs?.category]||G.muted}}>
                                    {abs?.category||"Away"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Match-only day (no training session) */}
                {daySessions.length===0&&dayMatches.length>0&&(
                  <div style={{flex:1}}/>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <BotNav view="schedule" setView={setView} userRole={userRole}
        pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
      {toast&&<Toast msg={toast} G={G}/>}
    </Shell>
  );
}
