import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import SidebarNav from "../ui/SidebarNav";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import Btn from "../ui/Btn";
import WeatherBar from "../ui/WeatherBar";
import NetsTimeline from "../ui/NetsTimeline";
import SessCard from "../ui/SessCard";
import CarpoolSheet from "../ui/CarpoolSheet";
import { FCC_LOGO } from "../constants/logo";
import { can } from "../constants/roles";
import { getTeamCardColors } from "../constants/teams";
import { isFuture, todayStr, fmtShort } from "../utils/time";
import { profileCompletion, isCoachMember, getTeamRole } from "../utils/members";

export default function ScheduleView() {
  const {
    G, view, setView, userRole, currentUser, handleLogout, teams, members,
    upcoming, past, schedFilter, setSchedFilter, setShowPastAll, setShowUpcomingAll,
    blockCals, todaySess, openWA, saveMembers, showToast,
    sessions, wxData, netsDate, setNetsDate,
    setBDate, setBFrom, setBTo, setBNet,
    cancelledSessions, showCancelled, setShowCancelled,
    showPastAll, showUpcomingAll, welcomeDismissed, setWelcomeDismissed,
    blocksExpanded, setBlocksExpanded,
    setLiftDraft, setCarpoolSheetSess, setSelSess, setLiftEditing,
    setNotInExpanded, setCarpoolFocus, setSessCoachView,
    setSessAttendance, allAttendance, setSessNotes, allSessionNotes, setSessNotesDraft,
    joinRequests, toast, carpoolSheetSess, saveSessions, selSess,
    liftDraft, liftEditing,
  } = useAppContext();

  const myName = currentUser.name;
  const filteredUpcoming = upcoming.filter(s=>
    schedFilter==="all" || s.players.includes(myName));
  const filteredPast = past.filter(s=>
    schedFilter==="all" || s.players.includes(myName));
  // Block cals for schedule display — future + today only
  const upcomingBlocks = blockCals
    .filter(b=>isFuture(b.date)||b.date===todayStr())
    .sort((a,b)=>a.date.localeCompare(b.date)||a.from.localeCompare(b.from));

  return (
    <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
      {/* ── Schedule header — B+D hybrid ── */}
      <div style={{background:G.green,position:"sticky",top:0,zIndex:100}}>
        {/* Compact single bar: logo · date+title · avatar */}
        <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
          <img src={FCC_LOGO} alt="FCC" className="fcc-header-logo"
            style={{width:30,height:30,borderRadius:"50%",objectFit:"cover",flexShrink:0,
              border:"1.5px solid rgba(255,255,255,0.3)"}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.45)",
              letterSpacing:"0.8px",textTransform:"uppercase",lineHeight:1}}>
              {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
            </div>
            <div style={{fontSize:15,fontWeight:900,color:G.white,lineHeight:1.2,
              fontFamily:"'Playfair Display',serif",marginTop:1}}>Schedule</div>
          </div>
          <button onClick={()=>setView("profile")}
            style={{display:"flex",alignItems:"center",gap:6,
              background:"rgba(255,255,255,.1)",border:"0.5px solid rgba(255,255,255,.2)",
              borderRadius:20,padding:"4px 10px 4px 5px",cursor:"pointer",flexShrink:0}}>
            <div style={{width:22,height:22,borderRadius:"50%",
              background:"rgba(255,255,255,.2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:800,color:"rgba(255,255,255,.9)"}}>
              {currentUser.name.split(" ")[0][0]}
            </div>
            <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.8)"}}>
              {currentUser.name.split(" ")[0]}
            </span>
            <svg onClick={e=>{e.stopPropagation();handleLogout();}} width="13" height="13"
              viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              title="Sign out" style={{cursor:"pointer",marginLeft:2}}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Gold pill filter tabs — 3D pressed effect */}
        <div style={{padding:"0 14px 10px",display:"flex",gap:8}}>
          {[
            {key:"all",  label:"🏏 All Sessions"},
            {key:"mine", label:"✋ My Sessions"},
          ].map(({key,label})=>{
            const active = schedFilter===key;
            return (
              <button key={key}
                onClick={()=>{setSchedFilter(key);setShowPastAll(false);setShowUpcomingAll(false);}}
                style={{flex:1,padding:"7px 0",borderRadius:20,cursor:"pointer",
                  fontFamily:"inherit",fontWeight:800,fontSize:11,
                  transition:"all .12s",whiteSpace:"nowrap",textAlign:"center",
                  background: active
                    ? "linear-gradient(180deg,#fcd34d 0%,#f59e0b 100%)"
                    : "rgba(251,191,36,.12)",
                  color: active ? "#1e3a5f" : "rgba(251,191,36,.65)",
                  border: active
                    ? "1px solid #b45309"
                    : "0.5px solid rgba(251,191,36,.3)",
                  boxShadow: active
                    ? "inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.15)"
                    : "none",
                  textShadow: active ? "0 1px 0 rgba(255,255,255,.3)" : "none"}}>
                {label}
              </button>
            );
          })}
          {(can(userRole,"sendReminder")||isCoachMember(currentUser?.name,teams)||!!getTeamRole(currentUser?.name,teams))&&(
            <button onClick={()=>setView("availability")}
              style={{padding:"7px 12px",borderRadius:20,cursor:"pointer",
                fontFamily:"inherit",fontWeight:800,fontSize:13,
                background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.8)",
                border:"0.5px solid rgba(255,255,255,.2)",flexShrink:0}}
              title="Team Availability">
              📊
            </button>
          )}
        </div>

        {/* Today's training strip */}
        {can(userRole,"sendReminder")&&todaySess.length>0&&(
          <div style={{margin:"0 14px 10px",background:"rgba(255,255,255,.08)",
            borderRadius:10,padding:"8px 12px",
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{color:"rgba(255,255,255,.8)",fontSize:11,fontWeight:700}}>🟢 Training TODAY</div>
            <Btn onClick={()=>openWA(todayStr())} bg="rgba(255,255,255,.18)" col={G.white} sm>📲 Share on WhatsApp</Btn>
          </div>
        )}
      </div>

      <div style={{padding:"14px 16px 20px"}}>

        {/* Profile nudge banner */}
        {(()=>{
          const me = members.find(m=>m.id===currentUser.id)||currentUser;
          const {pct, needsReconfirm, isComplete, confirmedAt} = profileCompletion(me);
          if(isComplete) return null;
          const isReconfirm = pct===100 && needsReconfirm;
          return (
            <div style={{
              background: isReconfirm ? "#fffbeb" : "#fef2f2",
              border: `1.5px solid ${isReconfirm ? "#fcd34d" : "#fca5a5"}`,
              borderRadius:12, padding:"12px 14px", marginBottom:14,
              display:"flex", alignItems:"center", gap:12,
            }}>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13,
                  color: isReconfirm ? "#92400e" : "#991b1b"}}>
                  {isReconfirm ? "⏰ Time to reconfirm your details" : "👋 Complete your profile"}
                </div>
                <div style={{fontSize:12,color: isReconfirm ? "#b45309" : "#b91c1c",marginTop:2}}>
                  {isReconfirm
                    ? `Last confirmed ${confirmedAt ? confirmedAt.toLocaleDateString("en-GB",{month:"short",year:"numeric"}) : "never"} — please check your details are still current`
                    : `${100-pct}% missing — add your ${!me?.email?"email":""}${!me?.email&&!me?.phone?" & ":""}${!me?.phone?"phone":""} so the club can reach you`}
                </div>
              </div>
              <button type="button" onClick={()=>setView("profile")}
                style={{background: isReconfirm ? "#fcd34d" : "#fca5a5",
                  border:"none",borderRadius:8,padding:"7px 12px",fontSize:12,
                  fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                  color: isReconfirm ? "#78350f" : "#7f1d1d",flexShrink:0}}>
                {isReconfirm ? "Review" : "Update"}
              </button>
            </div>
          );
        })()}

        {/* ── Welcome card (dismissible, first login only) ── */}
        {!welcomeDismissed&&(
          <div style={{background:`linear-gradient(135deg,${G.green} 0%,${G.mid} 100%)`,
            borderRadius:14,padding:"16px 16px 14px",marginBottom:14,position:"relative"}}>
            <button onClick={()=>{
              setWelcomeDismissed(true);
              try{localStorage.setItem("fcc-welcome-v1","1");}catch{}
            }} style={{position:"absolute",top:10,right:12,background:"rgba(255,255,255,.15)",
              border:"none",borderRadius:20,width:24,height:24,cursor:"pointer",
              color:"rgba(255,255,255,.8)",fontSize:16,fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
              ×
            </button>
            <div style={{fontWeight:900,fontSize:14,color:G.lime,marginBottom:12}}>
              👋 Welcome to FCC Training
            </div>
            {[
              ["📅","Your weekly training is already here — your squad is auto-added each week"],
              ["🚪","Can't make a session? Sign yourself out before 9pm the night before"],
              ["🏏","Tap any session to see who's coming, vote in the poll, or set car pool"],
              ["➕","Need extra nets time? Tap Book at the bottom"],
              ["👤","Fill in your profile — add your number and email so the club can reach you"],
            ].map(([icon,text],i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,
                marginBottom:8}}>
                <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{icon}</span>
                <span style={{fontSize:12,color:"rgba(255,255,255,.85)",lineHeight:1.5}}>
                  {text}
                </span>
              </div>
            ))}
            {/* Guide links */}
            <div style={{borderTop:"1px solid rgba(255,255,255,.15)",marginTop:10,paddingTop:10,
              display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>window.open("https://training-app-guide.netlify.app","_blank")}
                style={{background:G.lime,color:G.green,border:"none",borderRadius:20,
                  padding:"6px 14px",fontWeight:900,fontSize:11,cursor:"pointer",
                  fontFamily:"inherit"}}>
                📖 Open full guide →
              </button>
              <span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>
                or find it in My Profile → Help
              </span>
            </div>
          </div>
        )}

        {/* ── GDPR consent banner — existing members without consent ── */}
        {currentUser&&!members.find(m=>m.id===currentUser.id)?.consentGiven&&(()=>{
          const dismissKey="fcc-gdpr-dismiss-v1";
          const dismissed = (() => { try{ return sessionStorage.getItem(dismissKey)==="1"; }catch{ return false; } })();
          if(dismissed) return null;
          return (
            <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",
              borderRadius:12,padding:"14px 16px",marginBottom:12,position:"relative"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#92400e",marginBottom:6}}>
                🔐 A quick note about your data
              </div>
              <div style={{fontSize:12,color:"#78350f",lineHeight:1.6,marginBottom:12}}>
                Fredensborg Cricket Club stores your name, email and phone to manage your membership
                and communicate about training. Your data stays within the club and is never
                shared externally.
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>{
                    const updated=members.map(m=>m.id===currentUser.id?{...m,
                      consentGiven:true,consentDate:new Date().toISOString().slice(0,10)}:m);
                    saveMembers(updated);
                    showToast("Thanks — privacy policy acknowledged ✓");
                  }}
                  style={{background:"#92400e",color:"#fff",border:"none",borderRadius:20,
                    padding:"7px 16px",fontSize:12,fontWeight:800,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  I understand ✓
                </button>
                <button onClick={()=>setView("privacy")}
                  style={{background:"none",border:"1px solid #fde68a",borderRadius:20,
                    padding:"7px 14px",fontSize:12,fontWeight:700,color:"#92400e",
                    cursor:"pointer",fontFamily:"inherit"}}>
                  Read full policy
                </button>
                <button onClick={()=>{ try{ sessionStorage.setItem(dismissKey,"1"); }catch{} }}
                  style={{background:"none",border:"none",fontSize:12,color:"#b45309",
                    cursor:"pointer",fontFamily:"inherit",textDecoration:"underline",
                    marginLeft:"auto",padding:"7px 0"}}>
                  Dismiss for now
                </button>
              </div>
            </div>
          );
        })()}

        {/* Weather bar */}
        <WeatherBar wx={wxData} setView={setView} G={G}/>

        {/* Nets timeline strip */}
        <NetsTimeline
          sessions={sessions}
          netsDate={netsDate}
          setNetsDate={setNetsDate}
          setView={setView}
          setBDate={setBDate}
          setBFrom={setBFrom}
          setBTo={setBTo}
          setBNet={setBNet}
          blockCals={blockCals}
          G={G}
        />

        {filteredUpcoming.length===0&&filteredPast.length===0?(
          <div style={{textAlign:"center",padding:"60px 16px",color:G.muted}}>
            <div style={{fontSize:54,marginBottom:12}}>
              {schedFilter==="mine"?"🙋":"🏟️"}
            </div>
            <div style={{fontWeight:900,fontSize:17,color:G.text}}>
              {schedFilter==="mine"?"You haven't joined any sessions yet":"No sessions yet"}
            </div>
            <div style={{fontSize:13,marginTop:6}}>
              {schedFilter==="mine"
                ? <span>Tap <b>All Sessions</b> to browse and join one.</span>
                : 'Tap "+ Add / Join" to create the first one.'}
            </div>
          </div>
        ):(
          <>
            {filteredUpcoming.length>0&&(()=>{
              const UPCOMING_LIMIT = 5;
              const visibleUpcoming = showUpcomingAll
                ? filteredUpcoming
                : filteredUpcoming.slice(0, UPCOMING_LIMIT);
              const hiddenCount = filteredUpcoming.length - UPCOMING_LIMIT;
              return <>
                {/* Upcoming Section Banner */}
                <div style={{
                  background: "#166534", color: "white",
                  padding: "10px 14px", borderRadius: 10, marginBottom: 12, marginTop: 8,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{display: "flex", alignItems: "center", gap: 8}}>
                    <span style={{fontSize: 14}}>📅</span>
                    <span style={{fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5}}>Upcoming</span>
                  </div>
                  <span style={{fontSize: 12, opacity: 0.85}}>{filteredUpcoming.length} session{filteredUpcoming.length !== 1 ? "s" : ""}</span>
                </div>
                {visibleUpcoming.map(s=><SessCard key={s.id} s={s} members={members} teams={teams} G={G}
                  onCarpoolClick={()=>{setLiftDraft(null);setCarpoolSheetSess(s);}}
                  onClick={()=>{
                    setSelSess(s);
                    setView("session");
                    setLiftEditing(false);
                    setLiftDraft(null);
                    setNotInExpanded(false);
                    setCarpoolFocus(false);
                    setSessCoachView(null);
                    // Load attendance from Firestore or session
                    const sessionKey = `${s.date}_${s.id}`;
                    setSessAttendance(allAttendance[sessionKey] || s.attendance || {});
                    // Load notes for this session
                    setSessNotes(allSessionNotes.filter(n => n.sessionId === s.id));
                    setSessNotesDraft({});
                  }}/>)}
                {filteredUpcoming.length>UPCOMING_LIMIT&&(
                  <button onClick={()=>setShowUpcomingAll(v=>!v)}
                    style={{width:"100%",padding:"8px 0",background:"none",
                      border:`1.5px dashed ${G.border}`,borderRadius:10,
                      fontSize:12,fontWeight:700,color:G.muted,cursor:"pointer",
                      fontFamily:"inherit",marginBottom:4}}>
                    {showUpcomingAll
                      ? "▲ Show fewer"
                      : `▼ Show ${hiddenCount} more upcoming session${hiddenCount>1?"s":""}`}
                  </button>
                )}
              </>;
            })()}

            {/* Cancelled sessions — show 1, collapse rest */}
            {(()=>{
              const today = new Date().toISOString().slice(0,10);
              // Filter: only future/today dates, deduplicate by date+label
              const seen = new Set();
              const upcomingCancelled = cancelledSessions
                .filter(c => {
                  if(c.date < today) return false; // Past dates go away
                  const key = `${c.date}_${c.label}`;
                  if(seen.has(key)) return false; // Deduplicate
                  seen.add(key);
                  return true;
                })
                .sort((a,b) => a.date.localeCompare(b.date))
                .slice(0, 10);
              if(upcomingCancelled.length === 0) return null;

              const tc = getTeamCardColors(upcomingCancelled[0]?.team);

              return (
                <div style={{marginTop:16,marginBottom:12}}>
                  {/* Cancelled Section Banner */}
                  <div style={{
                    background: "#dc2626", color: "white",
                    padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                      <span style={{fontSize: 14}}>🚫</span>
                      <span style={{fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5}}>Cancelled</span>
                    </div>
                    <span style={{fontSize: 12, opacity: 0.85}}>{upcomingCancelled.length} upcoming</span>
                  </div>

                  {/* First cancelled - always visible */}
                  {upcomingCancelled.slice(0, 1).map(c => {
                    const ctc = getTeamCardColors(c.team);
                    return (
                      <div key={c.id} style={{
                        background: "#fef2f2",
                        borderRadius: 10,
                        borderLeft: `4px solid #dc2626`,
                        marginBottom: 8,
                        padding: "12px 14px",
                      }}>
                        <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 4}}>
                          <span style={{fontSize: 14, fontWeight: 800, color: G.text}}>
                            {fmtShort(c.date)}
                          </span>
                          {c.team && (
                            <span style={{
                              background: ctc.badgeBg, color: ctc.badgeText,
                              padding: "2px 10px", borderRadius: 20,
                              fontSize: 10, fontWeight: 700,
                            }}>{c.team}</span>
                          )}
                        </div>
                        <div style={{fontSize: 14, fontWeight: 700, color: G.text, marginBottom: 4}}>
                          {c.label}
                        </div>
                        <div style={{fontSize: 12, color: "#991b1b"}}>
                          {c.reason} · by {c.cancelledBy?.split(" ")[0]}
                        </div>
                      </div>
                    );
                  })}

                  {/* Collapsed indicator for rest */}
                  {upcomingCancelled.length > 1 && !showCancelled && (
                    <button
                      onClick={()=>setShowCancelled(true)}
                      style={{
                        width: "100%", padding: "8px",
                        background: "none", border: "1px dashed #fecaca",
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        color: "#dc2626", cursor: "pointer", fontFamily: "inherit",
                      }}>
                      + {upcomingCancelled.length - 1} more cancelled session{upcomingCancelled.length > 2 ? "s" : ""}
                    </button>
                  )}

                  {/* Rest of cancelled when expanded */}
                  {showCancelled && upcomingCancelled.slice(1).map(c => {
                    const ctc = getTeamCardColors(c.team);
                    return (
                      <div key={c.id} style={{
                        background: "#fef2f2",
                        borderRadius: 10,
                        borderLeft: `4px solid #dc2626`,
                        marginBottom: 8,
                        padding: "12px 14px",
                      }}>
                        <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 4}}>
                          <span style={{fontSize: 14, fontWeight: 800, color: G.text}}>
                            {fmtShort(c.date)}
                          </span>
                          {c.team && (
                            <span style={{
                              background: ctc.badgeBg, color: ctc.badgeText,
                              padding: "2px 10px", borderRadius: 20,
                              fontSize: 10, fontWeight: 700,
                            }}>{c.team}</span>
                          )}
                        </div>
                        <div style={{fontSize: 14, fontWeight: 700, color: G.text, marginBottom: 4}}>
                          {c.label}
                        </div>
                        <div style={{fontSize: 12, color: "#991b1b"}}>
                          {c.reason} · by {c.cancelledBy?.split(" ")[0]}
                        </div>
                      </div>
                    );
                  })}

                  {showCancelled && upcomingCancelled.length > 1 && (
                    <button
                      onClick={()=>setShowCancelled(false)}
                      style={{
                        width: "100%", padding: "8px",
                        background: "none", border: "1px dashed #fecaca",
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        color: "#dc2626", cursor: "pointer", fontFamily: "inherit",
                      }}>
                      ▲ Show less
                    </button>
                  )}
                </div>
              );
            })()}

            {filteredPast.length>0&&(()=>{
              const MAX_VISIBLE = 10;
              const visiblePast = showPastAll
                ? filteredPast.slice(0, MAX_VISIBLE)
                : filteredPast.slice(0, 1);
              const archived = filteredPast.slice(MAX_VISIBLE);
              return <>
                {/* Past Section Banner */}
                <div style={{
                  background: "#6b7280", color: "white",
                  padding: "10px 14px", borderRadius: 10, marginBottom: 12, marginTop: 16,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{display: "flex", alignItems: "center", gap: 8}}>
                    <span style={{fontSize: 14}}>📋</span>
                    <span style={{fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5}}>Past</span>
                  </div>
                  <span style={{fontSize: 12, opacity: 0.85}}>{filteredPast.length} session{filteredPast.length !== 1 ? "s" : ""}</span>
                </div>
                {visiblePast.map(s=><SessCard key={s.id} s={s} members={members} teams={teams} faded G={G}
                  onCarpoolClick={()=>{setLiftDraft(null);setCarpoolSheetSess(s);}}
                  onClick={()=>{
                    setSelSess(s);
                    setView("session");
                    setLiftEditing(false);
                    setLiftDraft(null);
                    setNotInExpanded(false);
                    setCarpoolFocus(false);
                    setSessCoachView(null);
                    // Load attendance from Firestore or session
                    const sessionKey = `${s.date}_${s.id}`;
                    setSessAttendance(allAttendance[sessionKey] || s.attendance || {});
                    // Load notes for this session
                    setSessNotes(allSessionNotes.filter(n => n.sessionId === s.id));
                    setSessNotesDraft({});
                  }}/>)}
                {/* Toggle button */}
                {filteredPast.length>1&&(
                  <button onClick={()=>setShowPastAll(v=>!v)}
                    style={{width:"100%",padding:"8px 0",background:"none",
                      border:`1.5px dashed ${G.border}`,borderRadius:10,
                      fontSize:12,fontWeight:700,color:G.muted,cursor:"pointer",
                      fontFamily:"inherit",marginBottom:4}}>
                    {showPastAll
                      ? `▲ Show less`
                      : `▼ Show ${Math.min(filteredPast.length-1, MAX_VISIBLE-1)} more past session${filteredPast.length>2?"s":""}`}
                  </button>
                )}
                {/* Archived notice */}
                {showPastAll&&archived.length>0&&(
                  <div style={{fontSize:11,color:G.muted,textAlign:"center",
                    padding:"6px 0 10px",fontWeight:500}}>
                    {archived.length} older session{archived.length>1?"s":""} archived
                  </div>
                )}
              </>;
            })()}
          </>
        )}

        {/* Nets Blocked — with section banner and reason chips */}
        {upcomingBlocks.length>0&&(
          <div style={{marginTop:24,marginBottom:6}}>
            {/* Nets Blocked Section Banner */}
            <div style={{
              background: "#ea580c", color: "white",
              padding: "10px 14px", borderRadius: 10, marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{display: "flex", alignItems: "center", gap: 8}}>
                <span style={{fontSize: 14}}>⛔</span>
                <span style={{fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5}}>Nets Blocked</span>
              </div>
              <span style={{fontSize: 12, opacity: 0.85}}>{upcomingBlocks.length} date{upcomingBlocks.length !== 1 ? "s" : ""}</span>
            </div>

            {(blocksExpanded ? upcomingBlocks : upcomingBlocks.slice(0,3)).map(b=>{
              // Determine reason chip based on label
              const lbl = (b.label || "").toLowerCase();
              let reasonIcon = "⛔";
              let reasonText = "Blocked";
              if(lbl.includes("match") || lbl.includes("vs") || lbl.includes("kamp")) {
                reasonIcon = "🏏"; reasonText = "Match";
              } else if(lbl.includes("maintenance") || lbl.includes("vedligehold")) {
                reasonIcon = "🔧"; reasonText = "Maintenance";
              } else if(lbl.includes("event") || lbl.includes("open day") || lbl.includes("åben")) {
                reasonIcon = "🎉"; reasonText = "Event";
              } else if(lbl.includes("tournament") || lbl.includes("turnering")) {
                reasonIcon = "🏆"; reasonText = "Tournament";
              }

              return (
                <div key={b.id} style={{
                  background: "#fff7ed",
                  borderRadius: 10,
                  borderLeft: "4px solid #ea580c",
                  marginBottom: 8,
                  padding: "12px 14px",
                }}>
                  <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 4}}>
                    <span style={{fontSize: 14, fontWeight: 800, color: G.text}}>
                      {fmtShort(b.date)}
                    </span>
                    <span style={{
                      background: "#fed7aa", color: "#c2410c",
                      padding: "2px 10px", borderRadius: 20,
                      fontSize: 10, fontWeight: 700,
                    }}>{reasonIcon} {reasonText}</span>
                  </div>
                  <div style={{fontSize: 14, fontWeight: 700, color: G.text, marginBottom: 4}}>
                    {b.label || "Nets Unavailable"}
                  </div>
                  <div style={{fontSize: 12, color: "#9a3412"}}>
                    {b.from} – {b.to}
                  </div>
                </div>
              );
            })}

            {upcomingBlocks.length>3&&(
              <button onClick={()=>setBlocksExpanded(e=>!e)}
                style={{
                  width: "100%", padding: "8px",
                  background: "none", border: "1px dashed #fed7aa",
                  borderRadius: 8, fontSize: 12, fontWeight: 600,
                  color: "#ea580c", cursor: "pointer", fontFamily: "inherit",
                }}>
                {blocksExpanded
                  ? "▲ Show less"
                  : `+ ${upcomingBlocks.length - 3} more blocked date${upcomingBlocks.length > 4 ? "s" : ""}`}
              </button>
            )}
          </div>
        )}

      </div>
      <BotNav view="schedule" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
      {toast&&<Toast msg={toast} G={G}/>}

      {carpoolSheetSess&&<CarpoolSheet
        sess={carpoolSheetSess}
        sessions={sessions}
        myName={currentUser?.name}
        liftDraft={liftDraft}
        setLiftDraft={setLiftDraft}
        liftEditing={liftEditing}
        setLiftEditing={setLiftEditing}
        saveSessions={saveSessions}
        selSess={selSess}
        setSelSess={setSelSess}
        onClose={()=>{setCarpoolSheetSess(null);setLiftDraft(null);setLiftEditing(false);}}
        G={G}
      />}
    </Shell>
  );
}
