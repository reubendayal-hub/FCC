import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import Btn from "../ui/Btn";
import SLbl from "../ui/SLbl";
import PlayerGroup from "../ui/PlayerGroup";
import CarpoolSheet from "../ui/CarpoolSheet";
import AppHeader from "../ui/AppHeader";
import { can } from "../constants/roles";
import { isAfterCutoff, fmtShort, isToday } from "../utils/time";
import { canOrCoach, isCoachMember, isAbsent } from "../utils/members";
import { getLiftObj, getLiftPref } from "../utils/lifts";
import { makeICS } from "../utils/ics";
import { uid } from "../constants/seeds";

const dlICS = s => {
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([makeICS(s)],{type:"text/calendar"}));
  a.download=`fcc-nets-${s.date}.ics`; a.click();
};

export default function SessionDetailView() {
  const {
    G, view, setView, userRole, currentUser, teams, members,
    sessions, saveSessions, recurring, saveRecurring,
    cancelledSessions, saveCancelledSessions,
    allAttendance, saveAllAttendance,
    allSessionNotes, saveAllSessionNotes,
    selSess, setSelSess,
    sessAttendance, setSessAttendance,
    sessCoachView, setSessCoachView,
    sessNotes, setSessNotes,
    sessNotesDraft, setSessNotesDraft,
    cancelModal, setCancelModal, cancelReason, setCancelReason,
    editingLocation, setEditingLocation,
    assignOpen, setAssignOpen,
    liftEditing, setLiftEditing, liftDraft, setLiftDraft,
    notInExpanded, setNotInExpanded, notInSearch, setNotInSearch,
    carpoolSheetSess, setCarpoolSheetSess, carpoolRef,
    commentText, setCommentText,
    showCancelled, setShowCancelled,
    openWA, logAction, setLiftPref,
    handlePostComment, handleDeleteComment, handleVote, handleLeave,
    handleJoinDetail, handleDeleteSess,
    joinRequests, toast,
  } = useAppContext();

  const iSt = (extra={}) => ({
    width:"100%", borderRadius:9, border:`1.5px solid ${G.border}`,
    padding:"11px 13px", fontSize:15, fontFamily:"'DM Sans',sans-serif",
    fontWeight:500, background:G.cream, color:G.text,
    outline:"none", boxSizing:"border-box", ...extra,
  });

  // Local UI state for the support-parent leaderboard / unlinked-name input.
  // Kept local because they're only used inside this view.
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [unlinkedDraft, setUnlinkedDraft] = useState("");

    const userMem = members.find(m=>m.name===currentUser?.name);
    const isRestricted = !!selSess.restrictedTo;
    const userInTeam = !isRestricted
      || (userMem?.teams||[]).includes(selSess.restrictedTo)
      || canOrCoach(userRole,"deleteSession",userMem,teams);
    const canAddOthers = canOrCoach(userRole,"addOtherPlayer",userMem,teams);
    const cutoff = isAfterCutoff(selSess.date);
    // Members not in session — admins/captains/coaches see all relevant, members only see own team
    const notIn = members.filter(m=>!selSess.players.includes(m.name))
      .filter(m=>{
        if(isRestricted) return (m.teams||[]).includes(selSess.restrictedTo) || canOrCoach(userRole,"deleteSession",userMem,teams);
        if(!canAddOthers) return (m.teams||[]).some(t=>(userMem?.teams||[]).includes(t));
        return true;
      });
    // Who's NOT coming from user's own team (or restricted team) — for the "absent" list
    const myTeams = userMem?.teams||[];
    const relevantTeam = isRestricted ? selSess.restrictedTo : (myTeams[0]||null);
    const absentFromTeam = relevantTeam
      ? members.filter(m=>(m.teams||[]).includes(relevantTeam) && !selSess.players.includes(m.name))
      : [];
    return (
      <Shell G={G}>
        <AppHeader
          onBack={()=>{setView("schedule");setSelSess(null);}}
          title={<>{fmtShort(selSess.date)}{isToday(selSess.date)&&
            <span style={{background:G.lime,color:G.green,borderRadius:20,
              padding:"1px 8px",fontSize:11,fontWeight:900,marginLeft:8}}>TODAY</span>}</>}
          sub={`${selSess.from} – ${selSess.to}${selSess.label?" · "+selSess.label:""}${selSess.net==="ground"?" · 🌿 Ground / Full Pitch":""}`}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn onClick={()=>dlICS(selSess)} bg="rgba(255,255,255,.15)" col={G.white} sm>
              📅 Save to Calendar
            </Btn>
            {can(userRole,"sendReminder")&&(
              <Btn onClick={()=>openWA(selSess.date)} bg={G.lime} col={G.green} sm>
                📲 Share on WhatsApp
              </Btn>
            )}
          </div>
        </AppHeader>

        <div style={{padding:"14px 16px 20px"}}>
          {/* Location change banner — highlighted when not at default venue */}
          {(()=>{
            const defaultLocation = "Karlebo Cricket Ground";
            const sessionLocation = selSess.location || defaultLocation;
            const isRelocated = sessionLocation !== defaultLocation;
            const canEditLocation = canOrCoach(userRole,"deleteSession",userMem,teams);
            
            return (
              <>
                {isRelocated && (
                  <div style={{
                    background:"linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                    border:"2px solid #c4b5fd",
                    borderRadius:12, padding:"12px 16px", marginBottom:14,
                    display:"flex", alignItems:"center", gap:10,
                    boxShadow:"0 4px 12px rgba(124,58,237,0.25)"
                  }}>
                    <span style={{fontSize:22}}>📍</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",
                        textTransform:"uppercase",letterSpacing:0.5}}>Location Change</div>
                      <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>{sessionLocation}</div>
                    </div>
                    {canEditLocation && (
                      <button onClick={()=>setEditingLocation(true)}
                        style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,
                          padding:"6px 10px",color:"#fff",fontSize:11,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit"}}>
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                )}
                
                {/* Location edit button for admins when at default location */}
                {!isRelocated && canEditLocation && (
                  <button onClick={()=>setEditingLocation(true)}
                    style={{background:"#f8fafc",border:"1px dashed #cbd5e1",borderRadius:8,
                      padding:"8px 12px",marginBottom:14,width:"100%",
                      display:"flex",alignItems:"center",gap:8,
                      cursor:"pointer",fontFamily:"inherit"}}>
                    <span style={{fontSize:14}}>📍</span>
                    <span style={{fontSize:12,color:G.muted}}>
                      {defaultLocation} <span style={{color:"#94a3b8",fontWeight:600}}>· tap to change location</span>
                    </span>
                  </button>
                )}
              </>
            );
          })()}
          
          {/* Location editor modal */}
          {editingLocation && (
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
              display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}
              onClick={()=>setEditingLocation(false)}>
              <div onClick={e=>e.stopPropagation()}
                style={{background:"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:340}}>
                <div style={{fontWeight:900,fontSize:16,marginBottom:16,color:G.text}}>
                  📍 Change Location
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[
                    {val:"Karlebo Cricket Ground", icon:"🏏", desc:"Default outdoor venue"},
                    {val:"Egedalshallen (Indoor)", icon:"🏠", desc:"Indoor training hall"},
                    {val:"Other", icon:"📍", desc:"Custom location"},
                  ].map(loc=>{
                    const sessionLocation = selSess.location || "Karlebo Cricket Ground";
                    return (
                      <button key={loc.val}
                        onClick={()=>{
                          const newLoc = loc.val === "Other" 
                            ? prompt("Enter location:", sessionLocation)
                            : loc.val;
                          if(newLoc) {
                            const updated = sessions.map(s=>
                              s.id===selSess.id ? {...s, location: newLoc} : s);
                            saveSessions(updated);
                            setSelSess({...selSess, location: newLoc});
                            showToast(`Location changed to ${newLoc}`);
                          }
                          setEditingLocation(false);
                        }}
                        style={{
                          display:"flex",alignItems:"center",gap:12,
                          background: sessionLocation===loc.val ? "#f0fdf4" : "#f8fafc",
                          border: sessionLocation===loc.val ? "2px solid #86efac" : "1.5px solid #e2e8f0",
                          borderRadius:12,padding:"14px 16px",
                          cursor:"pointer",fontFamily:"inherit",textAlign:"left"
                        }}>
                        <span style={{fontSize:24}}>{loc.icon}</span>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:G.text}}>{loc.val}</div>
                          <div style={{fontSize:11,color:G.muted}}>{loc.desc}</div>
                        </div>
                        {sessionLocation===loc.val && (
                          <span style={{marginLeft:"auto",color:G.green,fontWeight:800}}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <button onClick={()=>setEditingLocation(false)}
                  style={{marginTop:16,width:"100%",padding:12,background:"#f1f5f9",
                    border:"none",borderRadius:10,fontSize:14,fontWeight:700,
                    color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {selSess.note&&(
            <div style={{background:"#fff8e1",border:"1.5px solid #ffe082",borderRadius:10,
              padding:"10px 14px",marginBottom:14,fontSize:13,color:"#7a5c00",fontWeight:500}}>
              📋 {selSess.note}
            </div>
          )}

          {/* Show who created this booking (for non-recurring) */}
          {selSess.createdBy && selSess.createdBy !== "Recurring" && (
            <div style={{fontSize:11,color:G.muted,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span>📝 Booked by</span>
              <span style={{fontWeight:700,color:G.text}}>{selSess.createdBy}</span>
              {selSess.recurringId && <span style={{background:"#f0f9ff",color:"#0369a1",
                padding:"1px 6px",borderRadius:10,fontSize:9,fontWeight:700}}>from recurring</span>}
            </div>
          )}
          {selSess.createdBy === "Recurring" && (
            <div style={{fontSize:11,color:G.muted,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span>🔄 Auto-generated from recurring slot</span>
            </div>
          )}

          {isRestricted&&(
            <div style={{
              background: userInTeam ? "#f0fdf4" : "#fef9c3",
              border: `1.5px solid ${userInTeam ? G.lime : "#fde047"}`,
              borderRadius:10, padding:"10px 14px", marginBottom:14,
              fontSize:13, fontWeight:700,
              color: userInTeam ? G.green : "#92400e",
              display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{fontSize:18}}>🔒</span>
              <span>
                {userInTeam
                  ? `${selSess.restrictedTo} session — you're in`
                  : `This session is restricted to ${selSess.restrictedTo} members. You can view but not join.`}
              </span>
            </div>
          )}

          {/* ── Coaches for this session — team sessions only ── */}
          {(selSess.restrictedTo||selSess.sessionTeams?.length)&&(()=>{
            const derivedCoaches = selSess.coaches !== undefined
              ? selSess.coaches
              : [...new Set((selSess.sessionTeams||[selSess.restrictedTo].filter(Boolean)).flatMap(tn=>
                  teams.find(t=>t.name===tn)?.coaches||[]
                ))];
            const sessCoaches = derivedCoaches;
            const canEditCoaches = canOrCoach(userRole,"addOtherPlayer",userMem,teams);
            return (
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:700,color:G.muted,
                    textTransform:"uppercase",letterSpacing:1}}>🧢 Coaches</span>
                  {sessCoaches.length>0 ? sessCoaches.map(name=>(
                    <span key={name} style={{fontSize:11,fontWeight:700,padding:"2px 10px",
                      borderRadius:20,background:"#fef9c3",color:"#92400e",
                      border:"0.5px solid #fde68a"}}>
                      🧢 {name}
                    </span>
                  )) : (
                    <span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>None assigned</span>
                  )}
                </div>
                {/* Coach editor — captains/admins/coaches only */}
                {canEditCoaches&&(
                  <div style={{marginTop:4}}>
                    <div style={{fontSize:10,color:G.muted,marginBottom:5}}>
                      Tap to add/remove coaches for this session:
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {members.filter(m=>isCoachMember(m.name,teams)).sort((a,b)=>a.name.localeCompare(b.name)).map(m=>{
                        const on=sessCoaches.includes(m.name);
                        return (
                          <button key={m.id} type="button"
                            onClick={()=>{
                              const newList=on
                                ? sessCoaches.filter(n=>n!==m.name)
                                : [...sessCoaches,m.name];
                              const updSess={...selSess,coaches:newList};
                              setSelSess(updSess);
                              saveSessions(sessions.map(s=>s.id===selSess.id?updSess:s));
                            }}
                            style={{fontSize:11,fontWeight:700,padding:"3px 10px",
                              borderRadius:20,cursor:"pointer",fontFamily:"inherit",
                              background:on?"#fef9c3":"var(--color-bg,#f8fafc)",
                              color:on?"#92400e":G.muted,
                              border:`1px solid ${on?"#fde68a":"rgba(0,0,0,.1)"}`,
                              transition:"all .13s"}}>
                            {on?"🧢 ":"+ "}{m.name.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Parent Duty (U11 sessions + ad-hoc U11 ground sessions) ── */}
          {(()=>{
            const isU11 = selSess.restrictedTo === "U11";
            const isU11Ground = selSess.net === "ground" &&
              (selSess.restrictedTo === "U11" || /u11/i.test(selSess.label||""));
            return isU11 || isU11Ground;
          })() && (()=>{
            // Minimum compulsory duties per parent for the season.
            const MIN_DUTIES = 4;
            const ord = n => {
              const v = n % 100;
              if(v>=11 && v<=13) return `${n}th`;
              const s = ["th","st","nd","rd"][n%10>3?0:n%10];
              return `${n}${s}`;
            };

            // Who are the U11 parents? Any member whose children include a U11 player.
            const u11ChildIds = new Set(
              members.filter(m => (m.teams||[]).includes("U11")).map(m => m.id)
            );
            const u11Parents = members.filter(m =>
              (m.children||[]).some(cid => u11ChildIds.has(cid))
            );
            // Season = all U11 sessions this year (including this one), past + future.
            // Includes both restrictedTo==="U11" and ad-hoc ground sessions whose
            // label/team identifies them as U11.
            const seasonYear = new Date(selSess.date).getFullYear();
            const isU11Session = s =>
              new Date(s.date).getFullYear() === seasonYear &&
              (s.restrictedTo === "U11" ||
               (s.net === "ground" &&
                (s.restrictedTo === "U11" || /u11/i.test(s.label||""))));
            const u11Sessions = sessions.filter(isU11Session);
            // Count support-duty sessions per parent across the season.
            // Linked parents are keyed by memberId, unlinked by lowercase name.
            // Known future improvement: when an unlinked parent eventually links
            // their profile, their historical name-based counts won't migrate.
            const dutyCount = {};                  // by memberId
            const dutyCountByName = {};            // by name.toLowerCase()
            u11Parents.forEach(p => { dutyCount[p.id] = 0; });
            // Track unlinked names with at least one duty so the leaderboard /
            // fairness list can include them.
            const unlinkedNames = {};              // lcName -> displayName
            u11Sessions.forEach(s => {
              const sp = s.supportParent;
              if (!sp) return;
              if (sp.memberId && dutyCount[sp.memberId] !== undefined) {
                dutyCount[sp.memberId] += 1;
              }
              if (sp.memberName) {
                const key = sp.memberName.trim().toLowerCase();
                dutyCountByName[key] = (dutyCountByName[key]||0) + 1;
                if (sp.unlinked && !unlinkedNames[key]) {
                  unlinkedNames[key] = sp.memberName.trim();
                }
              }
            });
            // For each linked parent, dedupe count with any name-based hits.
            // We trust memberId-based counts as authoritative; name counts are
            // only used for unlinked parents (where memberId is null).
            const getDutyCount = p =>
              p.unlinked
                ? (dutyCountByName[p.name.toLowerCase()] || 0)
                : (dutyCount[p.id] || 0);

            const support = selSess.supportParent || null;
            const meId = currentUser?.id;
            const myRow = members.find(m=>m.id===meId);
            const iAmU11Parent = !!myRow && (myRow.children||[]).some(cid => u11ChildIds.has(cid));
            const iAmTheSupport = support && support.memberId === meId;
            const isCoachOrAdmin = canOrCoach(userRole,"addOtherPlayer",userMem,teams);

            // ── Mutations ──
            const sendDutyConfirm = (member, sess, parentName) => {
              if (!member?.email) return;
              fetch("/api/send-duty-confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: member.email,
                  name: parentName || member.name,
                  date: sess.date,
                  from: sess.from,
                  to: sess.to,
                  label: sess.label || "",
                }),
              }).catch(()=>{});
            };
            const assignSupport = (memberId, memberName, opts={}) => {
              const unlinked = !!opts.unlinked;
              const updSess = {
                ...selSess,
                supportParent: {
                  memberId: unlinked ? null : memberId,
                  memberName,
                  assignedBy: currentUser?.name || "unknown",
                  assignedAt: new Date().toISOString(),
                  ...(unlinked ? { unlinked: true } : {}),
                },
              };
              setSelSess(updSess);
              saveSessions(sessions.map(s => s.id===selSess.id ? updSess : s));
              logAction("session", `Support parent set: ${memberName}${unlinked?" (unlinked)":""} for U11 ${selSess.date} (by ${currentUser?.name})`);
              showToast(`${memberName.split(" ")[0]} signed up as support parent ✓`);
              // Confirmation email for linked parents only — we have no
              // address for unlinked entries.
              if (!unlinked) {
                const target = members.find(m => m.id === memberId);
                if (target) sendDutyConfirm(target, updSess, memberName);
              }
            };
            const assignUnlinked = (typedName) => {
              const name = (typedName||"").trim();
              if (!name) { showToast("Type a parent name first"); return; }
              assignSupport(null, name, { unlinked: true });
              setUnlinkedDraft("");
            };
            const clearSupport = () => {
              const prev = support?.memberName || "";
              const updSess = { ...selSess, supportParent: null };
              setSelSess(updSess);
              saveSessions(sessions.map(s => s.id===selSess.id ? updSess : s));
              logAction("session", `Support parent cleared: ${prev} for U11 ${selSess.date} (by ${currentUser?.name})`);
              showToast("Support parent slot cleared");
            };

            // ── Combined fairness list: linked parents + unlinked names ──
            const linkedRows = u11Parents.map(p => ({
              id: p.id, name: p.name, unlinked: false,
              count: dutyCount[p.id] || 0,
            }));
            const linkedNameSet = new Set(linkedRows.map(r => r.name.toLowerCase()));
            const unlinkedRows = Object.entries(unlinkedNames)
              .filter(([lc]) => !linkedNameSet.has(lc))
              .map(([lc, display]) => ({
                id: `unlinked:${lc}`, name: display, unlinked: true,
                count: dutyCountByName[lc] || 0,
              }));
            const allRows = [...linkedRows, ...unlinkedRows];

            // Fairness (ascending — show who's behind first)
            const fairness = [...allRows]
              .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));
            // Leaderboard (descending — top performers first)
            const leaderboard = [...allRows]
              .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
            // Rank map: leaderboard position 1..N
            const rankByKey = {};
            leaderboard.forEach((r, i) => { rankByKey[r.id] = i + 1; });
            const totalParents = allRows.length;

            // Per-row progress bar colour against the 4-minimum target.
            const progressColour = c =>
              c >= MIN_DUTIES ? { bar:"#16a34a", bg:"#dcfce7", text:"#166534" } :
              c >= 2          ? { bar:"#f59e0b", bg:"#fef3c7", text:"#92400e" } :
                                { bar:"#dc2626", bg:"#fee2e2", text:"#991b1b" };

            const showAssignUI = assignOpen === selSess.id;

            return (
              <div style={{
                background: support ? "#fffbeb" : "#fef9c3",
                border: `1.5px solid ${support ? "#fcd34d" : "#fde047"}`,
                borderLeft: `4px solid ${support ? "#d4a217" : "#eab308"}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 14,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:support?6:8}}>
                  <span style={{fontSize:16}}>🙋</span>
                  <span style={{fontSize:11,fontWeight:800,letterSpacing:1,
                    textTransform:"uppercase",color:"#92400e"}}>
                    Support Parent
                  </span>
                </div>

                {support ? (
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{
                      width:34,height:34,borderRadius:"50%",
                      background:"#d4a217",color:"#fff",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:900,fontSize:13,flexShrink:0,
                    }}>
                      {support.memberName.split(" ").map(w=>w[0]).slice(0,2).join("")}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:800,color:"#0f1a3a"}}>
                        {support.memberName}
                      </div>
                      <div style={{fontSize:11,color:"#92400e"}}>
                        Signed up · thanks for helping the U11s
                      </div>
                    </div>
                    {(iAmTheSupport || isCoachOrAdmin) && (
                      <button onClick={clearSupport}
                        style={{background:"transparent",border:"1px solid #fcd34d",
                          color:"#92400e",borderRadius:8,padding:"5px 10px",
                          fontSize:11,fontWeight:700,cursor:"pointer",
                          fontFamily:"inherit",flexShrink:0}}>
                        {iAmTheSupport ? "Remove me" : "Clear"}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{fontSize:12,color:"#78350f",marginBottom:10,lineHeight:1.5}}>
                      One parent per session — equipment, safety, energy. <b>Not a coaching role.</b>
                    </div>
                    {iAmU11Parent && (
                      <button onClick={()=>assignSupport(meId, currentUser.name)}
                        style={{width:"100%",background:"#d4a217",border:"none",
                          color:"#fff",borderRadius:10,padding:"11px 14px",
                          fontSize:14,fontWeight:800,cursor:"pointer",
                          fontFamily:"inherit",marginBottom:8}}>
                        🙋 I'll support this session
                      </button>
                    )}
                    {!iAmU11Parent && !isCoachOrAdmin && (
                      <div style={{fontSize:12,color:"#92400e",fontStyle:"italic",padding:"4px 0"}}>
                        U11 parents can sign up here.
                      </div>
                    )}
                  </>
                )}

                {/* Fairness line: shown to the current parent (their own count) */}
                {iAmU11Parent && !isCoachOrAdmin && (()=>{
                  const myCount = dutyCount[meId] || 0;
                  return (
                    <div style={{fontSize:11,color:"#78350f",marginTop:6,
                      display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span>Your support sessions this season:</span>
                      <span style={{background:"#fef3c7",border:"0.5px solid #fde68a",
                        color:"#92400e",padding:"1px 8px",borderRadius:10,
                        fontWeight:800}}>{myCount}</span>
                    </div>
                  );
                })()}

                {/* Public leaderboard — visible to everyone */}
                {totalParents > 0 && (
                  <div style={{marginTop:10,paddingTop:10,
                    borderTop:"1px dashed #fcd34d"}}>
                    <button onClick={()=>setLeaderboardOpen(o=>!o)}
                      style={{width:"100%",background:"transparent",
                        border:"1px dashed #d4a217",color:"#92400e",
                        borderRadius:8,padding:"8px 10px",
                        fontSize:12,fontWeight:700,cursor:"pointer",
                        fontFamily:"inherit"}}>
                      {leaderboardOpen ? "▲ Hide season leaderboard" : "🏆 Season leaderboard"}
                    </button>
                    {leaderboardOpen && (
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:10,color:"#92400e",lineHeight:1.5,marginBottom:8,
                          display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                          <span><b>Minimum target:</b> {MIN_DUTIES} sessions each</span>
                          <span style={{fontStyle:"italic"}}>
                            {leaderboard.filter(p=>p.count>=MIN_DUTIES).length}/{totalParents} on target
                          </span>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {leaderboard.map((p, i) => {
                            const isMe = !p.unlinked && p.id === meId;
                            const pc = progressColour(p.count);
                            const pctOfMin = Math.min(100, Math.round((p.count / MIN_DUTIES) * 100));
                            const statusIcon = p.count >= MIN_DUTIES ? "✅"
                              : p.count === 0 ? "🔴"
                              : null;
                            return (
                              <div key={p.id} style={{
                                display:"flex",alignItems:"center",gap:8,
                                background:isMe ? "#fef3c7" : "transparent",
                                border:isMe ? "1.5px solid #fbbf24" : "0.5px solid transparent",
                                borderRadius:8,padding:"5px 9px",
                              }}>
                                <span style={{fontSize:11,fontWeight:800,color:"#92400e",
                                  width:22,textAlign:"center"}}>
                                  {i+1}.
                                </span>
                                <span style={{flex:1,minWidth:0,display:"flex",
                                  alignItems:"center",gap:5,fontSize:12,
                                  fontWeight:isMe?800:600,color:"#0f1a3a"}}>
                                  {statusIcon && <span>{statusIcon}</span>}
                                  <span style={{overflow:"hidden",textOverflow:"ellipsis",
                                    whiteSpace:"nowrap"}}>
                                    {isMe ? "You" : p.name}
                                  </span>
                                  {p.unlinked && (
                                    <span style={{fontSize:9,fontWeight:700,
                                      background:"#f1f5f9",color:"#475569",
                                      border:"0.5px solid #cbd5e1",
                                      padding:"0 5px",borderRadius:10}}>
                                      ⚠ not in app
                                    </span>
                                  )}
                                </span>
                                <div style={{width:80,height:5,borderRadius:10,
                                  background:pc.bg,overflow:"hidden",flexShrink:0}}>
                                  <div style={{width:`${pctOfMin}%`,height:"100%",
                                    background:pc.bar,borderRadius:10}}/>
                                </div>
                                <span style={{fontSize:10,fontWeight:800,color:pc.text,
                                  minWidth:18,textAlign:"right"}}>
                                  {p.count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Coach/admin fairness overview & assign UI */}
                {isCoachOrAdmin && (
                  <div style={{marginTop:10,paddingTop:10,
                    borderTop:"1px dashed #fcd34d"}}>
                    <button onClick={()=>setAssignOpen(assignOpen===selSess.id?null:selSess.id)}
                      style={{width:"100%",background:"transparent",
                        border:"1px dashed #d4a217",color:"#92400e",
                        borderRadius:8,padding:"8px 10px",
                        fontSize:12,fontWeight:700,cursor:"pointer",
                        fontFamily:"inherit",marginBottom:8}}>
                      {showAssignUI ? "▲ Hide season roster" : "▼ Season roster & assign"}
                    </button>

                    {showAssignUI && (
                      <>
                        {/* Fairness list */}
                        <div style={{fontSize:10,fontWeight:800,letterSpacing:0.8,
                          textTransform:"uppercase",color:"#92400e",marginBottom:6}}>
                          Season so far ({u11Sessions.filter(s=>s.supportParent).length}
                          /{u11Sessions.length} sessions covered)
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
                          {fairness.length === 0 && (
                            <div style={{fontSize:11,color:"#92400e",fontStyle:"italic"}}>
                              No U11 parents linked yet. Parents need to link their child in "My Family".
                            </div>
                          )}
                          {fairness.map(p => {
                            const pc = progressColour(p.count);
                            const pctOfMin = Math.min(100, Math.round((p.count / MIN_DUTIES) * 100));
                            const rank = rankByKey[p.id];
                            const dutyLabel = p.count >= MIN_DUTIES
                              ? `${p.count} ✓`
                              : `${p.count} of ${MIN_DUTIES} minimum`;
                            const disableAssign = p.unlinked && support; // can't swap to unlinked once someone is set
                            return (
                              <div key={p.id} style={{
                                background:p.count===0?"#fef3c7":"transparent",
                                border:p.count===0?"0.5px solid #fde68a":"0.5px solid transparent",
                                borderRadius:8,padding:"6px 8px",
                              }}>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                                  <span style={{fontSize:12,color:"#0f1a3a",flex:1,
                                    fontWeight:p.count===0?700:500,
                                    display:"flex",alignItems:"center",gap:6}}>
                                    {p.name}
                                    {p.unlinked && (
                                      <span style={{fontSize:9,fontWeight:700,
                                        background:"#f1f5f9",color:"#475569",
                                        border:"0.5px solid #cbd5e1",
                                        padding:"0 6px",borderRadius:10}}
                                        title="Parent not yet linked to an app profile">
                                        ⚠ not in app
                                      </span>
                                    )}
                                  </span>
                                  <span style={{fontSize:9,color:"#92400e",fontWeight:600,
                                    whiteSpace:"nowrap"}}>
                                    {ord(rank)} of {totalParents}
                                  </span>
                                  {!support && !p.unlinked && (
                                    <button onClick={()=>assignSupport(p.id, p.name)}
                                      style={{background:"#d4a217",color:"#fff",border:"none",
                                        borderRadius:6,padding:"3px 8px",fontSize:10,
                                        fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
                                      Assign
                                    </button>
                                  )}
                                  {!support && p.unlinked && (
                                    <button onClick={()=>assignSupport(null, p.name, {unlinked:true})}
                                      style={{background:"#64748b",color:"#fff",border:"none",
                                        borderRadius:6,padding:"3px 8px",fontSize:10,
                                        fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
                                      Assign
                                    </button>
                                  )}
                                  {support && !disableAssign && support.memberId !== p.id && !p.unlinked && (
                                    <button onClick={()=>assignSupport(p.id, p.name)}
                                      style={{background:"transparent",
                                        color:"#92400e",border:"1px solid #d4a217",
                                        borderRadius:6,padding:"3px 8px",fontSize:10,
                                        fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                                      Swap
                                    </button>
                                  )}
                                </div>
                                {/* Progress bar */}
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <div style={{flex:1,height:6,borderRadius:10,
                                    background:pc.bg,overflow:"hidden"}}>
                                    <div style={{width:`${pctOfMin}%`,height:"100%",
                                      background:pc.bar,borderRadius:10,
                                      transition:"width .2s"}}/>
                                  </div>
                                  <span style={{fontSize:10,fontWeight:800,color:pc.text,
                                    whiteSpace:"nowrap",minWidth:80,textAlign:"right"}}>
                                    {dutyLabel}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{fontSize:10,color:"#92400e",fontStyle:"italic",lineHeight:1.5,marginBottom:10}}>
                          💡 Parents in yellow haven't covered a session this season. Assign them if they've not stepped up themselves.
                        </div>

                        {/* Add unlisted parent (for parents not yet linked in the app) */}
                        <div style={{paddingTop:10,borderTop:"1px dashed #fcd34d"}}>
                          <div style={{fontSize:10,fontWeight:800,letterSpacing:0.8,
                            textTransform:"uppercase",color:"#92400e",marginBottom:6}}>
                            Add unlisted parent
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <input
                              value={unlinkedDraft}
                              onChange={e=>setUnlinkedDraft(e.target.value)}
                              placeholder="Parent's full name…"
                              style={{flex:1,border:"1px solid #d4a217",borderRadius:7,
                                padding:"6px 9px",fontSize:12,fontFamily:"inherit",
                                background:"#fff"}}
                              onKeyDown={e=>{
                                if(e.key==="Enter"){e.preventDefault();assignUnlinked(unlinkedDraft);}
                              }}/>
                            <button onClick={()=>assignUnlinked(unlinkedDraft)}
                              disabled={!unlinkedDraft.trim() || !!support}
                              style={{background:unlinkedDraft.trim()&&!support?"#64748b":"#cbd5e1",
                                color:"#fff",border:"none",borderRadius:7,
                                padding:"6px 12px",fontSize:11,fontWeight:800,
                                cursor:unlinkedDraft.trim()&&!support?"pointer":"not-allowed",
                                fontFamily:"inherit"}}>
                              Assign
                            </button>
                          </div>
                          <div style={{fontSize:10,color:"#78350f",marginTop:5,lineHeight:1.4}}>
                            Use this if a parent helps but hasn't linked their profile yet.
                            Their duties will be tracked by name.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Attendance & Notes pills for coaches ── */}
          {canOrCoach(userRole,"addOtherPlayer",userMem,teams) && selSess.restrictedTo && (
            <>
              <div style={{
                display:"flex",
                gap:8,
                marginBottom:12,
              }}>
                <button
                  onClick={()=>setSessCoachView(sessCoachView === "attendance" ? null : "attendance")}
                  style={{
                    flex:1,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:8,
                    padding:"12px 14px",
                    background: sessCoachView === "attendance" ? "#166534" : "#f0fdf4",
                    border: `1.5px solid ${sessCoachView === "attendance" ? "#166534" : "#86efac"}`,
                    borderRadius:10,
                    cursor:"pointer",
                    fontFamily:"inherit",
                  }}
                >
                  <span style={{fontSize:16}}>✓</span>
                  <span style={{fontSize:13,fontWeight:700,color: sessCoachView === "attendance" ? "#fff" : "#166534"}}>
                    Attendance
                  </span>
                </button>
                <button
                  onClick={()=>setSessCoachView(sessCoachView === "notes" ? null : "notes")}
                  style={{
                    flex:1,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:8,
                    padding:"12px 14px",
                    background: sessCoachView === "notes" ? "#92400e" : "#fef3c7",
                    border: `1.5px solid ${sessCoachView === "notes" ? "#92400e" : "#fde68a"}`,
                    borderRadius:10,
                    cursor:"pointer",
                    fontFamily:"inherit",
                  }}
                >
                  <span style={{fontSize:16}}>📝</span>
                  <span style={{fontSize:13,fontWeight:700,color: sessCoachView === "notes" ? "#fff" : "#92400e"}}>
                    Session Notes
                  </span>
                </button>
              </div>
              
              {/* Inline Attendance View */}
              {sessCoachView === "attendance" && (
                <div style={{
                  background:"#f0fdf4",
                  border:"1.5px solid #86efac",
                  borderRadius:12,
                  padding:"14px 16px",
                  marginBottom:14,
                }}>
                  <div style={{
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"center",
                    marginBottom:12,
                  }}>
                    <div style={{fontSize:12,fontWeight:800,color:"#166534"}}>
                      ✓ Mark Attendance
                    </div>
                    <button
                      onClick={()=>{
                        // Save attendance to Firestore
                        const sessionKey = `${selSess.date}_${selSess.id}`;
                        const updatedAttendance = {
                          ...allAttendance,
                          [sessionKey]: sessAttendance,
                        };
                        saveAllAttendance(updatedAttendance);
                        // Also update session object for immediate display
                        const updSess = {...selSess, attendance: sessAttendance};
                        setSelSess(updSess);
                        saveSessions(sessions.map(s=>s.id===selSess.id?updSess:s));
                        showToast("Attendance saved ✓");
                        setSessCoachView(null);
                      }}
                      style={{
                        padding:"6px 14px",
                        fontSize:11,
                        fontWeight:700,
                        background:"#166534",
                        color:"#fff",
                        border:"none",
                        borderRadius:6,
                        cursor:"pointer",
                        fontFamily:"inherit",
                      }}
                    >
                      💾 Save
                    </button>
                  </div>
                  
                  {/* Attendance summary */}
                  {(()=>{
                    const present = Object.values(sessAttendance).filter(v=>v===true).length;
                    const absent = Object.values(sessAttendance).filter(v=>v===false).length;
                    const total = selSess.players.length;
                    return (
                      <div style={{display:"flex",gap:8,marginBottom:12}}>
                        <div style={{flex:1,textAlign:"center",background:"#dcfce7",borderRadius:8,padding:"8px"}}>
                          <div style={{fontSize:18,fontWeight:800,color:"#166534"}}>{present}</div>
                          <div style={{fontSize:10,color:"#15803d",fontWeight:600}}>Present</div>
                        </div>
                        <div style={{flex:1,textAlign:"center",background:"#fef2f2",borderRadius:8,padding:"8px"}}>
                          <div style={{fontSize:18,fontWeight:800,color:"#dc2626"}}>{absent}</div>
                          <div style={{fontSize:10,color:"#b91c1c",fontWeight:600}}>Absent</div>
                        </div>
                        <div style={{flex:1,textAlign:"center",background:"#f1f5f9",borderRadius:8,padding:"8px"}}>
                          <div style={{fontSize:18,fontWeight:800,color:"#64748b"}}>{total - present - absent}</div>
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600}}>Unmarked</div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Player attendance list */}
                  <div style={{maxHeight:300,overflowY:"auto"}}>
                    {selSess.players.map((name, idx) => {
                      const mem = members.find(m=>m.name===name);
                      const status = sessAttendance[mem?.id||name];
                      return (
                        <div key={name} style={{
                          display:"flex",
                          alignItems:"center",
                          gap:10,
                          padding:"10px 0",
                          borderBottom: idx < selSess.players.length - 1 ? "1px solid #c6f0d0" : "none",
                        }}>
                          {/* Toggle buttons */}
                          <div style={{display:"flex",gap:4}}>
                            <button
                              onClick={()=>setSessAttendance(prev=>({...prev,[mem?.id||name]: status===true ? null : true}))}
                              style={{
                                width:32,height:32,borderRadius:"50%",
                                background: status===true ? "#166534" : "#fff",
                                border: `2px solid ${status===true ? "#166534" : "#d1d5db"}`,
                                color: status===true ? "#fff" : "#9ca3af",
                                fontSize:14,fontWeight:700,cursor:"pointer",
                                display:"flex",alignItems:"center",justifyContent:"center",
                              }}
                            >✓</button>
                            <button
                              onClick={()=>setSessAttendance(prev=>({...prev,[mem?.id||name]: status===false ? null : false}))}
                              style={{
                                width:32,height:32,borderRadius:"50%",
                                background: status===false ? "#dc2626" : "#fff",
                                border: `2px solid ${status===false ? "#dc2626" : "#d1d5db"}`,
                                color: status===false ? "#fff" : "#9ca3af",
                                fontSize:14,fontWeight:700,cursor:"pointer",
                                display:"flex",alignItems:"center",justifyContent:"center",
                              }}
                            >✗</button>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{name}</div>
                          </div>
                          {status !== null && status !== undefined && (
                            <span style={{
                              fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10,
                              background: status===true ? "#dcfce7" : "#fef2f2",
                              color: status===true ? "#166534" : "#dc2626",
                            }}>
                              {status===true ? "Present" : "Absent"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Inline Notes View */}
              {sessCoachView === "notes" && (
                <div style={{
                  background:"#fef3c7",
                  border:"1.5px solid #fde68a",
                  borderRadius:12,
                  padding:"14px 16px",
                  marginBottom:14,
                }}>
                  <div style={{
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"center",
                    marginBottom:12,
                  }}>
                    <div style={{fontSize:12,fontWeight:800,color:"#92400e"}}>
                      📝 Session Notes
                    </div>
                    <div style={{fontSize:10,color:"#a16207"}}>
                      {fmtShort(selSess.date)} · {selSess.restrictedTo}
                    </div>
                  </div>
                  
                  {/* Quick add note for each player */}
                  <div style={{maxHeight:400,overflowY:"auto"}}>
                    {selSess.players.map((name, idx) => {
                      const mem = members.find(m=>m.name===name);
                      const noteKey = mem?.id||name;
                      const draftNote = sessNotesDraft[noteKey] || "";
                      const existingNotes = sessNotes.filter(n=>n.playerId===noteKey && n.sessionId===selSess.id);
                      
                      return (
                        <div key={name} style={{
                          padding:"12px 0",
                          borderBottom: idx < selSess.players.length - 1 ? "1px solid #fde68a" : "none",
                        }}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <div style={{
                              width:32,height:32,borderRadius:"50%",
                              background:"#fef9c3",border:"1.5px solid #fde68a",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:11,fontWeight:700,color:"#92400e",
                            }}>
                              {name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                            <div style={{fontSize:13,fontWeight:600,color:"#78350f"}}>{name}</div>
                          </div>
                          
                          {/* Existing notes */}
                          {existingNotes.map((note, i) => (
                            <div key={i} style={{
                              background:"#fff",
                              borderRadius:6,
                              padding:"8px 10px",
                              marginBottom:6,
                              fontSize:12,
                              color:"#78350f",
                              borderLeft:"3px solid #f59e0b",
                            }}>
                              {note.text}
                              {note.pillar && (
                                <span style={{
                                  marginLeft:8,fontSize:9,padding:"1px 6px",
                                  background:"#fef3c7",borderRadius:4,color:"#92400e",
                                }}>{note.pillar}</span>
                              )}
                            </div>
                          ))}
                          
                          {/* Add note input */}
                          <div style={{display:"flex",gap:6}}>
                            <input
                              type="text"
                              placeholder="Add a note..."
                              value={draftNote}
                              onChange={e=>setSessNotesDraft(prev=>({...prev,[noteKey]:e.target.value}))}
                              style={{
                                flex:1,
                                padding:"8px 10px",
                                fontSize:12,
                                border:"1px solid #fde68a",
                                borderRadius:6,
                                background:"#fff",
                                fontFamily:"inherit",
                              }}
                            />
                            <button
                              disabled={!draftNote.trim()}
                              onClick={()=>{
                                if(!draftNote.trim()) return;
                                const newNote = {
                                  playerId: noteKey,
                                  playerName: name,
                                  sessionId: selSess.id,
                                  date: selSess.date,
                                  text: draftNote.trim(),
                                  coach: currentUser?.name,
                                  timestamp: new Date().toISOString(),
                                };
                                setSessNotes(prev=>[...prev, newNote]);
                                setSessNotesDraft(prev=>({...prev,[noteKey]:""}));
                                // Auto-save to Firestore immediately
                                const updatedNotes = [...allSessionNotes, newNote];
                                saveAllSessionNotes(updatedNotes);
                              }}
                              style={{
                                padding:"8px 12px",
                                fontSize:11,
                                fontWeight:700,
                                background: draftNote.trim() ? "#f59e0b" : "#e5e7eb",
                                color: draftNote.trim() ? "#fff" : "#9ca3af",
                                border:"none",
                                borderRadius:6,
                                cursor: draftNote.trim() ? "pointer" : "not-allowed",
                                fontFamily:"inherit",
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {sessNotes.filter(n=>n.sessionId===selSess.id).length > 0 && (
                    <button
                      onClick={()=>{
                        // Merge session notes with all notes and save
                        const sessionNoteIds = new Set(sessNotes.filter(n=>n.sessionId===selSess.id).map(n=>n.timestamp));
                        const otherNotes = allSessionNotes.filter(n=>!sessionNoteIds.has(n.timestamp));
                        const mergedNotes = [...otherNotes, ...sessNotes.filter(n=>n.sessionId===selSess.id)];
                        saveAllSessionNotes(mergedNotes);
                        showToast(`${sessNotes.filter(n=>n.sessionId===selSess.id).length} note(s) saved ✓`);
                        setSessCoachView(null);
                      }}
                      style={{
                        width:"100%",
                        marginTop:12,
                        padding:"10px",
                        fontSize:12,
                        fontWeight:700,
                        background:"#92400e",
                        color:"#fff",
                        border:"none",
                        borderRadius:8,
                        cursor:"pointer",
                        fontFamily:"inherit",
                      }}
                    >
                      💾 Save All Notes
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <SLbl mt={4} G={G}>Players ({selSess.players.length})</SLbl>
          {/* ── Persistent carpool section ─────────────────── */}
          {(userInTeam || selSess.players.includes(currentUser?.name))&&(()=>{
            const lifts=selSess.lifts||{};
            const myName=currentUser?.name;
            const myLiftObj=getLiftObj(lifts[myName]);
            const myPref=myLiftObj.pref;
            const isO=myPref==="offer",isN=myPref==="need",isSelf=myPref==="self";
            const dispS=d=>{const o=getLiftObj(d);if(!o.stop)return"";return o.stop==="Other"?(o.stopOther||"Other"):o.stop;};
            // Others who have set a pref (not current user)
            const otherOffers=selSess.players.filter(p=>p!==myName&&getLiftPref(lifts[p])==="offer");
            const otherNeeds =selSess.players.filter(p=>p!==myName&&getLiftPref(lifts[p])==="need");
            const anyOthers=otherOffers.length||otherNeeds.length;
            if(!myPref&&!anyOthers) {
              // No prefs at all — show compact prompt
              return (
                <button onClick={()=>{setLiftDraft(null);setCarpoolSheetSess(selSess);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,
                    padding:"11px 14px",marginBottom:10,borderRadius:10,cursor:"pointer",
                    fontFamily:"inherit",textAlign:"left",
                    background:"#f8fdf9",border:"1px solid #c6f0d0",boxSizing:"border-box"}}>
                  <span style={{fontSize:20}}>🚘</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:G.green}}>Car pool</div>
                    <div style={{fontSize:11,color:G.muted,marginTop:1}}>Tap to set your travel preference</div>
                  </div>
                  <span style={{fontSize:16,color:G.green}}>›</span>
                </button>
              );
            }
            // At least one pref set — show full section
            return (
              <div style={{background:"#f8fdf9",border:"1px solid #c6f0d0",borderRadius:12,
                padding:"10px 13px",marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:800,color:G.muted,textTransform:"uppercase",
                  letterSpacing:1.1,marginBottom:8}}>🚘 Car pool</div>
                {/* Others */}
                {otherOffers.map(name=>{
                  const obj=getLiftObj(lifts[name]);const loc=dispS(lifts[name]);
                  return <div key={name} style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                      background:"#dcfce7",color:"#166534",border:"0.5px solid #86efac"}}>🚘 Offering</span>
                    <span style={{fontWeight:700,fontSize:12,color:G.text}}>{name}</span>
                    {obj.seats>0&&<span style={{fontSize:11,color:G.muted}}>💺{obj.seats}</span>}
                    {loc&&<span style={{fontSize:11,color:G.muted}}>📍{loc}</span>}
                    {obj.note&&<span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>"{obj.note}"</span>}
                  </div>;
                })}
                {otherNeeds.map(name=>{
                  const obj=getLiftObj(lifts[name]);const loc=dispS(lifts[name]);
                  return <div key={name} style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                      background:"#dbeafe",color:"#1e3a5f",border:"0.5px solid #93c5fd"}}>🙋 Needs lift</span>
                    <span style={{fontWeight:700,fontSize:12,color:G.text}}>{name}</span>
                    {loc&&<span style={{fontSize:11,color:G.muted}}>📍{loc}</span>}
                    {obj.note&&<span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>"{obj.note}"</span>}
                  </div>;
                })}
                {/* Divider before my row */}
                {anyOthers>0&&<div style={{borderTop:`0.5px solid #c6f0d0`,margin:"6px 0"}}/>}
                {/* My preference */}
                {myPref ? (
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                      background:isO?"#dcfce7":isN?"#dbeafe":"rgba(0,0,0,.05)",
                      color:isO?"#166534":isN?"#1e3a5f":G.muted,
                      border:`0.5px solid ${isO?"#86efac":isN?"#93c5fd":"rgba(0,0,0,.1)"}`}}>
                      {isO?"🚘 You: Offering":isN?"🙋 You: Need lift":"🚀 You: Own transport"}
                    </span>
                    {isO&&myLiftObj.seats>0&&<span style={{fontSize:11,color:G.muted}}>💺{myLiftObj.seats}</span>}
                    {dispS(myLiftObj)&&<span style={{fontSize:11,color:G.muted}}>📍{dispS(myLiftObj)}</span>}
                    {myLiftObj.note&&<span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>"{myLiftObj.note}"</span>}
                    <button onClick={()=>{setLiftDraft({...myLiftObj});setCarpoolSheetSess(selSess);}}
                      style={{fontSize:11,background:"none",border:"none",color:G.muted,
                        textDecoration:"underline",cursor:"pointer",fontFamily:"inherit",padding:0}}>Edit</button>
                  </div>
                ) : (
                  <button onClick={()=>{setLiftDraft(null);setCarpoolSheetSess(selSess);}}
                    style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                      border:`1px solid #c6f0d0`,background:G.white,color:G.green,
                      cursor:"pointer",fontFamily:"inherit"}}>
                    🚘 Set your preference
                  </button>
                )}
              </div>
            );
          })()}
          {/* ── Players grouped by team, collapsible, alphabetical ── */}
          {(()=>{
            const lifts=selSess.lifts||{};
            // Group players by their primary team relevant to this session
            const ALL_SESS_TEAMS = [...new Set(selSess.players.flatMap(p=>{
              const m=members.find(x=>x.name===p);
              return (m?.teams||["Unassigned"]);
            }))];
            // Sort teams: restricted team first, then alpha
            const sortedTeams=[...ALL_SESS_TEAMS].sort((a,b)=>{
              if(a===selSess.restrictedTo) return -1;
              if(b===selSess.restrictedTo) return 1;
              return a.localeCompare(b);
            });
            // Build groups
            const groups=sortedTeams.map(team=>({
              team,
              players:[...selSess.players]
                .filter(p=>{
                  const m=members.find(x=>x.name===p);
                  const ts=m?.teams||[];
                  if(team==="Unassigned") return ts.length===0;
                  return ts.includes(team);
                })
                .sort((a,b)=>a.localeCompare(b)),
            })).filter(g=>g.players.length>0);

            // Deduplicate — each player appears in their first matching group only
            const seen=new Set();
            const dedupedGroups=groups.map(g=>({
              ...g,
              players:g.players.filter(p=>{ if(seen.has(p)) return false; seen.add(p); return true; })
            })).filter(g=>g.players.length>0);

            return dedupedGroups.map(({team,players})=>(
              <PlayerGroup key={team} team={team} players={players} members={members}
                teams={teams} G={G}
                lifts={lifts} selSess={selSess} isSelf={p=>currentUser?.name===p}
                cutoff={cutoff} canRemove={canOrCoach(userRole,"removePlayer",userMem,teams)}
                onRemove={p=>handleLeave(selSess.id,p)}
                onCarpoolEdit={p=>{
                  const lo=getLiftObj((selSess.lifts||{})[p]);
                  setLiftDraft({...lo});setCarpoolSheetSess(selSess);
                }}
                onCarpoolSet={()=>{setLiftDraft(null);setCarpoolSheetSess(selSess);}}
                single={dedupedGroups.length===1}
              />
            ));
          })()}


          {/* Poll voting */}
          {selSess.poll&&selSess.poll.length>0&&(()=>{
            const poll = selSess.poll;
            const totalVoters = [...new Set(poll.flatMap(o=>o.votes||[]))].length;
            const maxVotes = Math.max(...poll.map(o=>(o.votes||[]).length), 1);
            return (
              <div style={{marginBottom:20}}>
                <SLbl mt={4} G={G}>Session Poll</SLbl>
                <div style={{background:G.white,borderRadius:12,
                  border:`1.5px solid ${G.border}`,padding:14}}>
                  <div style={{fontSize:11,color:G.muted,fontWeight:700,marginBottom:12,
                    textTransform:"uppercase",letterSpacing:1.2}}>
                    {totalVoters} vote{totalVoters!==1?"s":""}
                    {selSess.players.includes(currentUser.name)
                      ? " · tap to vote" : " · join session to vote"}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {poll.map(o=>{
                      const votes = o.votes||[];
                      const hasVoted = votes.includes(currentUser.name);
                      const pct = Math.round((votes.length/maxVotes)*100);
                      const canVote = selSess.players.includes(currentUser.name);
                      return (
                        <button key={o.id} type="button"
                          onClick={()=>canVote&&handleVote(selSess.id,o.id)}
                          style={{width:"100%",textAlign:"left",border:"none",
                            background:"transparent",padding:0,
                            cursor:canVote?"pointer":"default",fontFamily:"inherit"}}>
                          <div style={{display:"flex",justifyContent:"space-between",
                            alignItems:"center",marginBottom:4}}>
                            <span style={{fontWeight:800,fontSize:14,color:G.text,
                              display:"flex",alignItems:"center",gap:6}}>
                              {hasVoted&&<span style={{color:G.green,fontSize:13}}>✓</span>}
                              {o.label}
                            </span>
                            <span style={{fontSize:12,fontWeight:800,
                              color:hasVoted?G.green:G.muted}}>
                              {votes.length} {votes.length===1?"vote":"votes"}
                            </span>
                          </div>
                          {/* Vote bar */}
                          <div style={{height:8,borderRadius:20,
                            background:G.border,overflow:"hidden"}}>
                            <div style={{height:"100%",borderRadius:20,
                              width:`${pct}%`,
                              background:hasVoted?G.green:"#a3e63580",
                              transition:"width .3s ease"}}/>
                          </div>
                          {/* Voter names */}
                          {votes.length>0&&(
                            <div style={{fontSize:11,color:G.muted,marginTop:3}}>
                              {votes.map(v=>v).join(", ")}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Who's not coming (admins/captains see add button; members see read-only) ── */}
          {notIn.length>0&&userInTeam&&(()=>{
            const isSelf = name => name === currentUser?.name;
            const label = canAddOthers ? "Add Players / Not Yet Signed Up" : "Not Yet Signed Up";
            
            // Flat alphabetical list - no duplicates since notIn is already unique by member
            const filteredNotIn = notInSearch.trim()
              ? notIn.filter(m => m.name.toLowerCase().includes(notInSearch.toLowerCase()))
              : notIn;
            const sortedNotIn = [...filteredNotIn].sort((a,b) => a.name.localeCompare(b.name));
            
            return (<>
              {/* Toggle header */}
              <button onClick={()=>{setNotInExpanded(v=>!v); if(!notInExpanded) setNotInSearch("");}}
                style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                  background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
                  padding:"4px 0 8px",marginTop:4}}>
                <span style={{fontSize:12,fontWeight:900,letterSpacing:1.1,
                  textTransform:"uppercase",color:G.muted}}>
                  {label} ({notIn.length})
                </span>
                <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
                  {notInExpanded?"▲ hide":"▼ show"}
                </span>
              </button>
              {notInExpanded&&(
                <div style={{background:G.white,border:`1.5px solid ${G.border}`,
                  borderRadius:12,padding:12,marginBottom:14}}>
                  
                  {/* Search input */}
                  <input
                    type="text"
                    placeholder="🔍 Search players..."
                    value={notInSearch}
                    onChange={e=>setNotInSearch(e.target.value)}
                    style={{
                      width:"100%",padding:"10px 12px",fontSize:13,
                      border:`1.5px solid ${G.border}`,borderRadius:10,
                      fontFamily:"inherit",marginBottom:10,
                      background:G.bg
                    }}
                  />
                  
                  {/* Count indicator */}
                  <div style={{fontSize:11,color:G.muted,marginBottom:8}}>
                    Showing {sortedNotIn.length} of {notIn.length} player{notIn.length!==1?"s":""}
                  </div>
                  
                  {/* Scrollable alphabetical list */}
                  <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                    {sortedNotIn.map(m=>{
                      const self = isSelf(m.name);
                      const canAdd = canAddOthers || self;
                      const away = selSess?.date && isAbsent(m, selSess.date);
                      const abs = away ? (m.absences||[]).find(a=>a.from<=selSess.date&&a.to>=selSess.date) : null;
                      const teamStr = (m.teams||[]).join(", ") || "Unassigned";
                      
                      return (
                        <button key={m.id}
                          onClick={canAdd ? ()=>handleJoinDetail(m.name) : undefined}
                          style={{
                            display:"flex",alignItems:"center",justifyContent:"space-between",
                            background: canAdd 
                              ? (away ? "#fffbeb" : G.bg) 
                              : "#f1f5f9",
                            border: canAdd 
                              ? (away ? "1.5px solid #fde68a" : `1px solid ${G.border}`)
                              : "1px solid #e2e8f0",
                            borderRadius:10,padding:"10px 14px",
                            cursor:canAdd?"pointer":"default",fontFamily:"inherit",
                            textAlign:"left",opacity:canAdd?1:0.65
                          }}
                          title={away?`Away: ${abs?.category||""} ${fmtShort(abs?.from)}–${fmtShort(abs?.to)}`:""}
                        >
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {canAdd && <span style={{color:G.green,fontWeight:900}}>+</span>}
                            <span style={{fontWeight:700,fontSize:13,
                              color: canAdd ? (away ? "#92400e" : G.text) : G.muted}}>
                              {m.name}{away&&" ✈️"}
                            </span>
                          </div>
                          <span style={{fontSize:10,color:G.muted}}>{teamStr}</span>
                        </button>
                      );
                    })}
                    {sortedNotIn.length === 0 && (
                      <div style={{padding:16,textAlign:"center",color:G.muted,fontSize:12}}>
                        No players match "{notInSearch}"
                      </div>
                    )}
                  </div>
                  
                  {!canAddOthers&&(
                    <div style={{fontSize:11,color:G.muted,marginTop:10,fontStyle:"italic"}}>
                      Only captains and admins can add other players.
                      {cutoff && " Sign-ups are locked — contact your captain."}
                    </div>
                  )}
                </div>
              )}
            </>);
          })()}

          {/* ── Comments ─────────────────────────────────────── */}
          {(()=>{
            const comments = selSess.comments || [];
            const isInSession = selSess.players.includes(currentUser?.name)
              || can(userRole,"deleteSession");
            const fmtTs = ts => {
              const d = new Date(ts);
              return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})
                + " · " + d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
            };
            return (
              <div style={{marginTop:24}}>
                <div style={{fontWeight:900,fontSize:12,letterSpacing:1.2,
                  textTransform:"uppercase",color:G.muted,marginBottom:10}}>
                  💬 Comments {comments.length>0&&`(${comments.length})`}
                </div>

                {comments.length===0&&(
                  <div style={{fontSize:12,color:G.muted,fontStyle:"italic",marginBottom:10}}>
                    No comments yet.{isInSession?" Be the first!":""}
                  </div>
                )}

                {comments.map(c=>(
                  <div key={c.id} style={{background:G.cream,borderRadius:10,
                    padding:"10px 13px",marginBottom:7,position:"relative"}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"flex-start",gap:8}}>
                      <div>
                        <span style={{fontWeight:800,fontSize:12,color:G.green}}>
                          {c.name}
                        </span>
                        <span style={{fontSize:11,color:G.muted,marginLeft:8}}>
                          {fmtTs(c.ts)}
                        </span>
                      </div>
                      {(c.name===currentUser?.name||can(userRole,"deleteSession"))&&(
                        <button onClick={()=>handleDeleteComment(selSess.id,c.id)}
                          style={{background:"none",border:"none",color:G.muted,
                            fontSize:14,cursor:"pointer",padding:"0 2px",lineHeight:1,
                            flexShrink:0}}>×</button>
                      )}
                    </div>
                    <div style={{fontSize:13,color:G.text,marginTop:4,lineHeight:1.5}}>
                      {c.text}
                    </div>
                  </div>
                ))}

                {isInSession ? (
                  <div style={{display:"flex",gap:8,marginTop:6}}>
                    <input
                      value={commentText}
                      onChange={e=>setCommentText(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){
                        e.preventDefault();
                        handlePostComment(selSess.id,commentText);
                      }}}
                      placeholder="Add a comment…"
                      style={{...iSt({flex:1}),fontSize:13,padding:"9px 12px"}}/>
                    <button onClick={()=>handlePostComment(selSess.id,commentText)}
                      disabled={!commentText.trim()}
                      style={{background:commentText.trim()?G.green:"#e2e8f0",
                        color:commentText.trim()?G.lime:G.muted,
                        border:"none",borderRadius:10,padding:"9px 16px",
                        fontSize:13,fontWeight:800,cursor:commentText.trim()?"pointer":"default",
                        fontFamily:"inherit",flexShrink:0,transition:"all .15s"}}>
                      Post
                    </button>
                  </div>
                ) : (
                  <div style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>
                    Join this session to leave a comment.
                  </div>
                )}
              </div>
            );
          })()}

          {(()=>{
            const isRecurring = !!selSess.recurringId;
            const isMySession = selSess.createdBy===currentUser?.name;
            const isCaptainLevel = canOrCoach(userRole,"deleteSession",userMem,teams);
            // Members can only delete their own non-recurring sessions
            // Captains/admins/coaches can delete any session (recurring too)
            const canDelete = isCaptainLevel || (!isRecurring && isMySession);
            if(!canDelete) return null;
            const slot = isRecurring ? recurring.find(r=>r.id===selSess.recurringId) : null;
            
            // Handler to refresh/regenerate a recurring session (delete without cancelling)
            const handleRefreshSession = () => {
              if(!confirm("Refresh this session? It will be deleted and regenerated with current settings from the recurring slot.")) return;
              // Just delete the session - it will be regenerated by the recurring useEffect
              // Don't add to cancelledDates
              handleDeleteSess(selSess.id);
              showToast("Session refreshed — reload to see updated version");
            };
            
            return (
              <div style={{marginTop:22}}>
                {isRecurring&&slot&&(
                  <>
                    {/* Refresh session — for admins to regenerate with latest settings */}
                    <button onClick={handleRefreshSession}
                      style={{display:"block",width:"100%",marginBottom:10,
                        background:"#f0f9ff",border:"1.5px solid #0ea5e9",color:"#0369a1",
                        borderRadius:10,padding:"11px",fontSize:14,fontWeight:800,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      🔄 Refresh Session (Regenerate from Slot)
                    </button>
                    <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",
                      borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,
                      color:"#0369a1",lineHeight:1.5}}>
                      <b>💡 Use Refresh</b> after changing the recurring slot settings (time, coaches, etc.) 
                      to update this session with the new values.
                    </div>
                    
                    {/* Cancel just this date - opens confirmation modal */}
                    <button onClick={()=>setCancelModal({session: selSess, slot})}
                      style={{display:"block",width:"100%",marginBottom:10,
                        background:"#fef3c7",border:"1.5px solid #f59e0b",color:"#92400e",
                        borderRadius:10,padding:"11px",fontSize:14,fontWeight:800,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      🚫 Cancel This Training Only ({fmtShort(selSess.date)})
                    </button>
                    <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",
                      borderRadius:10,padding:"11px 14px",marginBottom:10,fontSize:12,
                      color:"#64748b",lineHeight:1.6}}>
                      <b>💡 Tip:</b> "Cancel This Training Only" stops the session on {fmtShort(selSess.date)} 
                      without affecting future weeks. The recurring slot "<b>{slot.name}</b>" continues.
                    </div>
                    <div style={{borderTop:"1px dashed #e2e8f0",paddingTop:12,marginTop:4}}>
                      <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:8,
                        textTransform:"uppercase",letterSpacing:0.5}}>
                        Or permanently delete the recurring slot:
                      </div>
                      <button onClick={()=>{
                          if(!confirm(`Delete the entire "${slot.name}" recurring slot? This will stop ALL future sessions.`)) return;
                          deleteRecurringSlotSilent(slot.id);
                          handleDeleteSess(selSess.id);
                        }}
                        style={{display:"block",width:"100%",
                          background:"transparent",border:`1.5px solid ${G.red}`,color:G.red,
                          borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit"}}>
                        🗑 Delete "{slot.name}" Recurring Slot (All Future Sessions)
                      </button>
                    </div>
                  </>
                )}
                {!isRecurring&&(
                  <>
                    {isMySession&&!isCaptainLevel&&(
                      <div style={{background:"#f0fdf4",border:"1px solid #86efac",
                        borderRadius:10,padding:"9px 13px",marginBottom:10,fontSize:12,
                        color:"#166534",lineHeight:1.5}}>
                        ℹ️ You created this session. You can delete it to cancel your booking.
                      </div>
                    )}
                    <button onClick={()=>handleDeleteSess(selSess.id)}
                      style={{display:"block",width:"100%",
                        background:"transparent",border:`1.5px solid ${G.red}`,color:G.red,
                        borderRadius:10,padding:"11px",fontSize:14,fontWeight:800,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      🗑 Cancel & Delete Booking
                    </button>
                  </>
                )}
              </div>
            );
          })()}
          
          {/* Cancellation confirmation modal */}
          {cancelModal && (()=>{
            const {session, slot} = cancelModal;
            const presetReasons = [
              "Weather conditions",
              "Ground unavailable",
              "Coach unavailable", 
              "Relocated to indoor venue",
              "Public holiday",
              "Not enough players",
              "Other",
            ];
            
            const handleConfirmCancel = () => {
              if(!cancelReason.trim()) {
                showToast("Please provide a reason for cancellation");
                return;
              }
              
              // Check if already cancelled (prevent duplicates)
              const alreadyCancelled = cancelledSessions.some(
                c => c.date === session.date && c.recurringId === session.recurringId
              );
              
              if(!alreadyCancelled) {
                // 1. Add to cancelledSessions archive
                const cancelRecord = {
                  id: uid(),
                  date: session.date,
                  label: session.label || slot?.name || "Training",
                  team: session.restrictedTo || session.sessionTeams?.[0] || "",
                  reason: cancelReason.trim(),
                  cancelledBy: currentUser?.name,
                  cancelledAt: new Date().toISOString(),
                  recurringId: session.recurringId,
                  originalPlayers: session.players || [],
                };
                saveCancelledSessions([cancelRecord, ...cancelledSessions].slice(0, 200)); // Keep last 200
              }
              
              // 2. Add date to recurring slot's cancelledDates (ALWAYS do this to prevent regeneration)
              if(slot) {
                const existingCancelled = slot.cancelledDates || [];
                if(!existingCancelled.includes(session.date)) {
                  const updated = recurring.map(r => 
                    r.id === slot.id 
                      ? { ...r, cancelledDates: [...existingCancelled, session.date] }
                      : r
                  );
                  saveRecurring(updated);
                }
              }
              
              // 3. Delete the session
              handleDeleteSess(session.id);
              
              // 4. Close modal and show confirmation
              setCancelModal(null);
              setCancelReason("");
              setSelSess(null);
              setView("schedule");
              showToast(`Cancelled: ${cancelReason.trim()}`);
            };
            
            return (
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
                display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
                onClick={()=>{setCancelModal(null);setCancelReason("");}}>
                <div onClick={e=>e.stopPropagation()}
                  style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:400,
                    maxHeight:"85vh",overflowY:"auto"}}>
                  
                  {/* Header */}
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    <div style={{width:44,height:44,borderRadius:12,background:"#fef3c7",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                      🚫
                    </div>
                    <div>
                      <div style={{fontWeight:900,fontSize:16,color:G.text}}>Cancel Training</div>
                      <div style={{fontSize:12,color:G.muted}}>
                        {session.label || "Session"} · {fmtShort(session.date)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Warning */}
                  <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:10,
                    padding:"12px 14px",marginBottom:16,fontSize:12,color:"#991b1b",lineHeight:1.5}}>
                    <b>⚠️ This will notify booked players</b> that the session is cancelled. 
                    Please provide a reason so everyone understands why.
                  </div>
                  
                  {/* Affected players */}
                  {session.players?.length > 0 && (
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,
                        textTransform:"uppercase",letterSpacing:0.5}}>
                        {session.players.length} player{session.players.length!==1?"s":""} booked
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {session.players.slice(0,10).map(p=>(
                          <span key={p} style={{background:"#f1f5f9",borderRadius:20,
                            padding:"2px 8px",fontSize:11,fontWeight:600,color:G.text}}>
                            {p.split(" ")[0]}
                          </span>
                        ))}
                        {session.players.length > 10 && (
                          <span style={{fontSize:11,color:G.muted,padding:"2px 4px"}}>
                            +{session.players.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Reason selection */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:8,
                      textTransform:"uppercase",letterSpacing:0.5}}>
                      Reason for cancellation *
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                      {presetReasons.map(r=>(
                        <button key={r}
                          onClick={()=>setCancelReason(r === "Other" ? "" : r)}
                          style={{
                            background: cancelReason===r ? "#fef3c7" : "#f8fafc",
                            border: cancelReason===r ? "1.5px solid #f59e0b" : "1px solid #e2e8f0",
                            borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:600,
                            color: cancelReason===r ? "#92400e" : G.text,
                            cursor:"pointer",fontFamily:"inherit"
                          }}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={cancelReason}
                      onChange={e=>setCancelReason(e.target.value)}
                      placeholder="Enter reason or add details..."
                      style={{width:"100%",padding:"10px 12px",fontSize:13,
                        border:`1.5px solid ${G.border}`,borderRadius:10,
                        fontFamily:"inherit",resize:"vertical",minHeight:60}}
                    />
                  </div>
                  
                  {/* Actions */}
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>{setCancelModal(null);setCancelReason("");}}
                      style={{flex:1,padding:"12px",background:"#f1f5f9",border:"none",
                        borderRadius:10,fontSize:14,fontWeight:700,color:G.muted,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      Go Back
                    </button>
                    <button onClick={handleConfirmCancel}
                      disabled={!cancelReason.trim()}
                      style={{flex:1,padding:"12px",
                        background: cancelReason.trim() ? "#f59e0b" : "#e2e8f0",
                        border:"none",borderRadius:10,fontSize:14,fontWeight:800,
                        color: cancelReason.trim() ? "#fff" : "#9ca3af",
                        cursor: cancelReason.trim() ? "pointer" : "not-allowed",
                        fontFamily:"inherit"}}>
                      Confirm Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        <BotNav view="session" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
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

