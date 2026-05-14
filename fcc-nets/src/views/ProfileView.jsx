import { useEffect, useState, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import WagonWheelDisplay from "../ui/WagonWheelDisplay";
import Shell from "../ui/Shell";
import SidebarNav from "../ui/SidebarNav";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import Btn from "../ui/Btn";
import FFld from "../ui/FFld";
import ProfileDial from "../ui/ProfileDial";
import FamilyManager from "../ui/FamilyManager";
import { RolePill, TeamPill, MemberRolePills } from "../ui/pills";
import AppHeader from "../ui/AppHeader";
import { FCC_LOGO } from "../constants/logo";
import { ALL_FIXTURES } from "../constants/fixtures";
import { ROLE_META, can } from "../constants/roles";
import { TEAM_META, getTeamCardColors } from "../constants/teams";
import { THEMES, THEME_KEYS } from "../constants/themes";
import { fmtShort, todayStr } from "../utils/time";
import { isCoachMember, profileCompletion, maskEmail, getMemberRoleChips } from "../utils/members";
import { uid } from "../constants/seeds";
import {
  getEffectiveConfig, isDutyEnabled, getSupportParents, getSlotCount,
  isMatchSession, countDuties, getSeasonYear,
  resolveRoleShort,
} from "../constants/parent-duty";

// Local navy/gold palette so the career-stats section reads as the
// scorecard family instead of the green/cream profile chrome.
const STATS_PALETTE = {
  navy:   "#1B2A5C",
  navyDk: "#152043",
  gold:   "#C9A84C",
  goldLt: "#F0D060",
  bgCard: "#FFFFFF",
  dim:    "#5C6B8F",
  muted:  "#8A95B0",
};

export default function ProfileView() {
  const {
    G, view, setView, userRole, currentUser, handleLogout, teams, members,
    saveMembers, sessions, saveSessions,
    profileEmail, setProfileEmail, profilePhone, setProfilePhone,
    profileEditing, setProfileEditing,
    profileAttrsEditing, setProfileAttrsEditing,
    profileAttrsDraft, setProfileAttrsDraft,
    profileTab, setProfileTab,
    changingPin, setChangingPin,
    oldPin, setOldPin, newPin1, setNewPin1, newPin2, setNewPin2,
    pinMsg, setPinMsg, handleChangePin,
    showAllMatches, setShowAllMatches,
    themeKey, applyTheme,
    absFrom, setAbsFrom, absTo, setAbsTo,
    absCat, setAbsCat, absNote, setAbsNote,
    absConflicts, setAbsConflicts,
    showToast, joinRequests, toast,
    parentDutyConfig, setSelSess,
  } = useAppContext();

  const iSt = (extra={}) => ({
    width:"100%", borderRadius:9, border:`1.5px solid ${G.border}`,
    padding:"11px 13px", fontSize:15, fontFamily:"'DM Sans',sans-serif",
    fontWeight:500, background:G.cream, color:G.text,
    outline:"none", boxSizing:"border-box", ...extra,
  });

    const me = members.find(m=>m.id===currentUser.id)||currentUser;
    const myTeams = (me.teams||[]);

    // ── Career stats (TASK 8) ──────────────────────────────────
    // Data-model split:
    //   fccnets/members           = roster blob (already in context as
    //                               `members`). Source of truth for the
    //                               member id used by the scorer.
    //   fccnets/data/members/{id} = per-player career stats subcollection.
    //
    // Use the resolved member's `.id` from context first (guaranteed to
    // match the scorer's writes), with `currentUser.id` / `.uid` as
    // fallbacks for users without a roster entry (parents etc.).
    const [careerDoc, setCareerDoc] = useState(null);
    const [careerLoading, setCareerLoading] = useState(false);
    const myMemberFromBlob = members.find(m =>
      m.id === currentUser?.id ||
      m.id === currentUser?.uid ||
      (currentUser?.name && m.name?.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
    const playerId = myMemberFromBlob?.id || currentUser?.id || currentUser?.uid || null;
    useEffect(() => {
      if (!playerId) { setCareerDoc({}); return; }
      let cancelled = false;
      setCareerLoading(true);
      console.log("ProfileView career fetch — playerId:", playerId, "path: fccnets/data/members/" + playerId);
      (async () => {
        try {
          const snap = await getDoc(doc(db, "fccnets", "data", "members", playerId));
          if (cancelled) return;
          setCareerDoc(snap.exists() ? snap.data() : {});
        } catch (e) {
          console.error("Career stats fetch error:", e);
          if (!cancelled) setCareerDoc({});
        } finally {
          if (!cancelled) setCareerLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [playerId]);

    // ── Wagon-wheel shot aggregation (TASK 8) ──────────────────
    // Walk careerDoc.matchAppearances, fetch each unique match doc
    // once (Promise.all + Map dedupe), then filter events where the
    // striker is this player and runs > 0. Cheaper than re-aggregating
    // on every render and avoids inflating Firestore reads — we only
    // hit each match once per profile session.
    const [careerShots, setCareerShots] = useState([]);
    const [shotsLoading, setShotsLoading] = useState(false);
    const playerName = me?.name || currentUser?.name || null;
    // Wagon-wheel viewing perspective ("RH" | "LH"). Defaults to the
    // player's own batting hand (legacy "right"/"left" → canonical
    // "RH"/"LH"), with a manual toggle below the wheel.
    // Wagon-wheel orientation is driven entirely by the player's saved
    // batting hand (no user-facing toggle). Accepts legacy "left"/"right"
    // and canonical "LH"/"RH" — normalised here.
    const ownIsLH = (() => {
      const v = String(me?.battingHand || "").toLowerCase();
      return v === "lh" || v === "left";
    })();
    useEffect(() => {
      const appearances = Array.isArray(careerDoc?.matchAppearances) ? careerDoc.matchAppearances : [];
      if (appearances.length === 0 || !playerName) { setCareerShots([]); return; }
      let cancelled = false;
      setShotsLoading(true);
      (async () => {
        try {
          const uniqueIds = [...new Set(appearances.map(a => a?.matchId).filter(Boolean))];
          const matchSnaps = await Promise.all(
            uniqueIds.map(id => getDoc(doc(db, "fccscorer", "data", "matches", id)).catch(() => null))
          );
          if (cancelled) return;
          const collected = [];
          const targetName = playerName.trim().toLowerCase();
          matchSnaps.forEach(snap => {
            if (!snap || !snap.exists()) return;
            const data = snap.data();
            const events = Array.isArray(data.events) ? data.events : [];
            const matchTitle = data.title || `${data.team1 || "?"} vs ${data.team2 || "?"}`;
            events.forEach(ev => {
              if (!ev) return;
              if (!ev.striker || ev.striker.trim().toLowerCase() !== targetName) return;
              const runs = Number(ev.runs) || 0;
              if (runs <= 0) return;
              if (!ev.zone && !ev.tapPoint) return;
              collected.push({
                runs,
                zone: ev.zone || null,
                tapPoint: ev.tapPoint || null,
                bowler: ev.bowler || null,
                matchTitle,
                // Per-shot batting hand from the original ball event.
                // Used by the wagon-wheel renderer to per-dot mirror
                // when the scorer-side and viewer-side perspectives
                // disagree (e.g. recorded as LH, viewed as RH).
                battingHand: ev.battingHand || null,
              });
            });
          });
          setCareerShots(collected);
        } catch (e) {
          console.error("Wagon-wheel fetch error:", e);
          if (!cancelled) setCareerShots([]);
        } finally {
          if (!cancelled) setShotsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [careerDoc, playerName]);

    // ── Dismissal-map aggregation (TASK 9) ─────────────────────
    // Counts career dismissal types from matchAppearances. Codes
    // match the scorer (b / c / lbw / ro / st / hw).
    const dismissalStats = useMemo(() => {
      const apps = Array.isArray(careerDoc?.matchAppearances) ? careerDoc.matchAppearances : [];
      const counts = {};
      apps.forEach(ap => {
        const t = ap?.batting?.dismissalType;
        if (!t) return; // not-out or DNB
        counts[t] = (counts[t] || 0) + 1;
      });
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      return { counts, total };
    }, [careerDoc]);

    const myChildren = (me.children||[]).map(cid => members.find(m=>m.id===cid)).filter(Boolean);
    const isPlayer = myTeams.length > 0;
    const isParent = myChildren.length > 0 || me.memberType === "parent";
    const showFamilyTab = isParent || isPlayer; // Everyone can potentially link kids
    const {pct, needsReconfirm, isComplete, confirmedAt} = profileCompletion(me);
    const isReconfirm = pct===100 && needsReconfirm;
    
    // Helper functions for family management
    const linkChildToParent = (childId) => {
      const currentChildren = me.children || [];
      if (currentChildren.includes(childId)) return; // Already linked
      const updated = members.map(m => {
        if (m.id === currentUser.id) {
          return { ...m, children: [...currentChildren, childId] };
        }
        if (m.id === childId) {
          return { ...m, parentId: currentUser.id, parentName: me.name };
        }
        return m;
      });
      saveMembers(updated);
      setCurrentUser({...me, children: [...currentChildren, childId]});
      showToast("Child linked ✓");
      logAction("member", `Linked child: ${members.find(m=>m.id===childId)?.name} → ${me.name}`);
    };
    
    const unlinkChild = (childId) => {
      const childName = members.find(m=>m.id===childId)?.name || "Unknown";
      const updated = members.map(m => {
        if (m.id === currentUser.id) {
          return { ...m, children: (m.children||[]).filter(c=>c!==childId) };
        }
        if (m.id === childId) {
          return { ...m, parentId: null, parentName: null };
        }
        return m;
      });
      saveMembers(updated);
      setCurrentUser({...me, children: (me.children||[]).filter(c=>c!==childId)});
      showToast("Child unlinked");
      logAction("member", `Unlinked child: ${childName} from ${me.name}`);
    };
    
    // Find junior players (U-teams, Girls, Kvinder) that aren't already linked to someone
    const availableChildren = members.filter(m => 
      m.id !== currentUser.id &&
      (m.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder")) &&
      !m.parentId // Not already linked to a parent
    );
    
    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
          currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
        <AppHeader onBack={()=>setView("schedule")}
          title={profileTab === "family" ? "My Family" : "My Profile"} 
          sub={profileTab === "family" ? "Manage linked children" : (ROLE_META[me.role||"member"]?.label||"Member")}/>
        <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>

          {/* Profile / Family Tab Switcher */}
          <div style={{display:"flex",gap:8,background:"#f1f5f9",borderRadius:12,padding:4}}>
            <button onClick={()=>setProfileTab("profile")} style={{
              flex:1, padding:"10px 12px", borderRadius:10, border:"none",
              background: profileTab==="profile" ? "#fff" : "transparent",
              boxShadow: profileTab==="profile" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              fontWeight:700, fontSize:13, cursor:"pointer",
              color: profileTab==="profile" ? G.green : "#64748b",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              🏏 {isPlayer ? "My Profile" : "Profile"}
            </button>
            <button onClick={()=>setProfileTab("family")} style={{
              flex:1, padding:"10px 12px", borderRadius:10, border:"none",
              background: profileTab==="family" ? "#fff" : "transparent",
              boxShadow: profileTab==="family" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              fontWeight:700, fontSize:13, cursor:"pointer",
              color: profileTab==="family" ? "#2563eb" : "#64748b",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              👨‍👧 My Family {myChildren.length > 0 && <span style={{
                background:"#2563eb", color:"#fff", borderRadius:10,
                padding:"1px 6px", fontSize:11,
              }}>{myChildren.length}</span>}
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* FAMILY TAB */}
          {/* ══════════════════════════════════════════════════════════ */}
          {profileTab === "family" && (
            <FamilyManager
              me={me}
              myChildren={myChildren}
              availableChildren={availableChildren}
              members={members}
              onLink={linkChildToParent}
              onUnlink={unlinkChild}
              onCreateChild={(name, team) => {
                const childId = uid();
                const child = {
                  id: childId,
                  name: name.trim(),
                  teams: team ? [team] : [],
                  role: "member",
                  memberType: "player",
                  parentId: currentUser.id,
                  parentName: me.name,
                  joinedAt: new Date().toISOString(),
                };
                const updatedMe = { ...me, children: [...(me.children||[]), childId] };
                const updated = members.map(m => m.id === currentUser.id ? updatedMe : m);
                updated.push(child);
                saveMembers(updated);
                setCurrentUser(updatedMe);
                showToast(`${name} added and linked ✓`);
                logAction("member", `Created and linked child: ${name} → ${me.name}`);
              }}
              teams={teams}
              juniorTeams={Object.keys(teams).filter(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder"))}
            />
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* PROFILE TAB */}
          {/* ══════════════════════════════════════════════════════════ */}
          {profileTab === "profile" && (<>
          {/* Avatar + name card */}
          {(()=>{
            const isFemTeam = myTeams.some(t=>TEAM_META[t]?.feminine);
            const headerBg = isFemTeam
              ? "linear-gradient(135deg,#9d174d,#be185d)"
              : G.green;
            const avatarBg = isFemTeam ? "#fbcfe8" : G.lime;
            const avatarFg = isFemTeam ? "#9d174d" : G.green;
            return (
              <div style={{background:headerBg,borderRadius:16,padding:"20px",
                display:"flex",alignItems:"center",gap:16}}>
                {isFemTeam&&<span style={{position:"absolute",fontSize:16,
                  top:0,right:8,opacity:.3,pointerEvents:"none"}}>✨</span>}
                <div style={{width:60,height:60,borderRadius:"50%",
                  background:avatarBg,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:22,fontWeight:900,color:avatarFg,flexShrink:0}}>
                  {me.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
                    fontSize:20,color:"#fff"}}>{me.name}</div>
                  <div style={{marginTop:4,display:"flex",gap:6,flexWrap:"wrap"}}>
                    <MemberRolePills member={me} teams={teams}/>
                    {getMemberRoleChips(me,teams).length===0&&<RolePill role={me.role||"member"}/>}
                    {myTeams.map(t=><TeamPill key={t} team={t} sm/>)}
                    {myTeams.length===0&&<TeamPill team="Unassigned" sm/>}
                    {myChildren.length > 0 && (
                      <span style={{background:"#dbeafe",color:"#1e40af",padding:"2px 8px",
                        borderRadius:12,fontSize:11,fontWeight:700}}>
                        👨‍👧 Parent of {myChildren.length}
                      </span>
                    )}
                  </div>
                </div>
                {/* Completion dial */}
                {!isComplete&&<ProfileDial pct={pct}/>}
                {isComplete&&(
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:28}}>✅</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:700,
                      letterSpacing:1,textTransform:"uppercase",marginTop:2}}>Complete</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Profile status card — only shown if incomplete or needs reconfirm */}
          {!isComplete&&(
            <div style={{
              background: isReconfirm ? "#fffbeb" : "#fef2f2",
              border: `1.5px solid ${isReconfirm ? "#fcd34d" : "#fca5a5"}`,
              borderRadius:12, padding:"14px 16px",
            }}>
              <div style={{fontWeight:800,fontSize:14,
                color: isReconfirm ? "#92400e" : "#991b1b", marginBottom:6}}>
                {isReconfirm ? "⏰ Please reconfirm your details" : "📋 Profile incomplete"}
              </div>
              <div style={{fontSize:13,color: isReconfirm ? "#b45309":"#b91c1c",
                lineHeight:1.5,marginBottom:12}}>
                {isReconfirm
                  ? `It's been over 6 months since you last confirmed your details (${confirmedAt?.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})||"never"}). Please check they're still correct and confirm below.`
                  : "Your profile is missing contact details. The club needs these to reach you about training, matches and important updates."}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {icon:"📧", label:"Email", val:me.email, field:"email"},
                  {icon:"📱", label:"Phone", val:me.phone, field:"phone"},
                ].map(f=>(
                  <div key={f.field} style={{display:"flex",alignItems:"center",gap:8,
                    background:"rgba(255,255,255,.6)",borderRadius:8,padding:"8px 10px"}}>
                    <span style={{fontSize:16}}>{f.icon}</span>
                    <span style={{fontSize:13,color:G.text,flex:1}}>{f.label}</span>
                    <span style={{fontSize:12,fontWeight:800,
                      color: f.val ? "#16a34a" : "#dc2626"}}>
                      {f.val ? "✓ Set" : "✗ Missing"}
                    </span>
                  </div>
                ))}
              </div>
              {isReconfirm&&(
                <button type="button"
                  onClick={()=>{
                    const now = new Date().toISOString();
                    const updated = members.map(m=>m.id===currentUser.id
                      ? {...m, profileConfirmedAt:now} : m);
                    saveMembers(updated);
                    const fresh = updated.find(m=>m.id===currentUser.id);
                    setCurrentUser(fresh);
                    localStorage.setItem("fcc-current-user",JSON.stringify(fresh));
                    showToast("Details confirmed ✓");
                  }}
                  style={{marginTop:12,width:"100%",padding:"11px 0",borderRadius:10,
                    border:"none",background:"#f59e0b",color:"#fff",fontWeight:800,
                    fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                  ✓ Yes, my details are still correct
                </button>
              )}
            </div>
          )}

          {/* Contact details */}
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:14,padding:"18px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:14,color:G.text}}>Contact Details</div>
              {!profileEditing&&(
                <button type="button" onClick={()=>{
                  setProfileEmail(me.email||"");
                  setProfilePhone(me.phone||"");
                  setProfileEditing(true);
                }} style={{background:G.cream,border:`1px solid ${G.border}`,
                  borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",color:G.text}}>
                  ✏️ Edit
                </button>
              )}
            </div>
            {profileEditing ? (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <FFld G={G} label="Email address">
                  <input type="email" placeholder="your@email.com"
                    style={iSt({padding:"9px 12px",fontSize:14})}
                    value={profileEmail}
                    onChange={e=>setProfileEmail(e.target.value)}/>
                </FFld>
                <FFld G={G} label="Phone / Mobile">
                  <input type="tel" placeholder="+45 12 34 56 78"
                    style={iSt({padding:"9px 12px",fontSize:14})}
                    value={profilePhone}
                    onChange={e=>setProfilePhone(e.target.value)}/>
                </FFld>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <Btn bg={G.green} col={G.lime} full onClick={()=>{
                    // Save + auto-confirm if both fields now filled
                    const emailOk = profileEmail.trim().length > 0;
                    const phoneOk = profilePhone.trim().length > 0;
                    const now = new Date().toISOString();
                    const updated = members.map(m => m.id===currentUser.id
                      ? {...m,
                          email: profileEmail.trim(),
                          phone: profilePhone.trim(),
                          profileConfirmedAt: (emailOk&&phoneOk) ? now : (m.profileConfirmedAt||null),
                        } : m);
                    saveMembers(updated);
                    const fresh = updated.find(m=>m.id===currentUser.id);
                    setCurrentUser(fresh);
                    localStorage.setItem("fcc-current-user",JSON.stringify(fresh));
                    setProfileEditing(false);
                    showToast(emailOk&&phoneOk ? "Profile complete ✓" : "Saved ✓");
                  }}>Save</Btn>
                  <Btn bg={G.cream} col={G.muted} onClick={()=>setProfileEditing(false)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>📧</span>
                  <div>
                    <div style={{fontSize:11,color:G.muted,fontWeight:700,
                      textTransform:"uppercase",letterSpacing:1}}>Email</div>
                    <div style={{fontSize:14,color:me.email?G.text:G.muted,fontWeight:600}}>
                      {me.email||"Not set yet"}
                    </div>
                  </div>
                </div>
                <div style={{height:1,background:G.border}}/>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>📱</span>
                  <div>
                    <div style={{fontSize:11,color:G.muted,fontWeight:700,
                      textTransform:"uppercase",letterSpacing:1}}>Phone</div>
                    <div style={{fontSize:14,color:me.phone?G.text:G.muted,fontWeight:600}}>
                      {me.phone||"Not set yet"}
                    </div>
                  </div>
                </div>
                {/* Last confirmed date */}
                {me.profileConfirmedAt&&(
                  <div style={{fontSize:11,color:G.muted,marginTop:4,fontStyle:"italic"}}>
                    Last confirmed: {new Date(me.profileConfirmedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                    {" · "}Next check-in: {new Date(new Date(me.profileConfirmedAt).getTime()+6*30*24*60*60*1000).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Player attributes (batting/bowling hand) */}
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:14,padding:"18px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:14,color:G.text}}>🏏 Player Attributes</div>
              {!profileAttrsEditing&&(
                <button type="button" onClick={()=>{
                  setProfileAttrsDraft({
                    battingHand: me.battingHand||"right",
                    bowlingHand: me.bowlingHand||"right",
                    bowlingStyle: me.bowlingStyle||"",
                  });
                  setProfileAttrsEditing(true);
                }} style={{background:G.cream,border:`1px solid ${G.border}`,
                  borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",color:G.text}}>
                  ✏️ Edit
                </button>
              )}
            </div>
            {profileAttrsEditing ? (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,
                    textTransform:"uppercase",letterSpacing:1}}>Batting Hand</div>
                  <div style={{display:"flex",gap:8}}>
                    {["right","left"].map(h=>(
                      <button key={h}
                        onClick={()=>setProfileAttrsDraft(d=>({...d,battingHand:h}))}
                        style={{
                          flex:1,padding:"10px",fontSize:13,fontWeight:600,
                          background:profileAttrsDraft.battingHand===h?G.green:G.cream,
                          color:profileAttrsDraft.battingHand===h?G.lime:G.text,
                          border:`1.5px solid ${profileAttrsDraft.battingHand===h?G.green:G.border}`,
                          borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                        }}>
                        {h==="right"?"Right-handed":"Left-handed"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,
                    textTransform:"uppercase",letterSpacing:1}}>Bowling Arm</div>
                  <div style={{display:"flex",gap:8}}>
                    {["right","left"].map(h=>(
                      <button key={h}
                        onClick={()=>setProfileAttrsDraft(d=>({...d,bowlingHand:h}))}
                        style={{
                          flex:1,padding:"10px",fontSize:13,fontWeight:600,
                          background:profileAttrsDraft.bowlingHand===h?G.green:G.cream,
                          color:profileAttrsDraft.bowlingHand===h?G.lime:G.text,
                          border:`1.5px solid ${profileAttrsDraft.bowlingHand===h?G.green:G.border}`,
                          borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                        }}>
                        {h==="right"?"Right-arm":"Left-arm"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,
                    textTransform:"uppercase",letterSpacing:1}}>Bowling Style (optional)</div>
                  <select
                    value={profileAttrsDraft.bowlingStyle}
                    onChange={e=>setProfileAttrsDraft(d=>({...d,bowlingStyle:e.target.value}))}
                    style={iSt({padding:"10px 12px",fontSize:13})}>
                    <option value="">Not specified</option>
                    <option value="Fast">Fast</option>
                    <option value="Medium">Medium</option>
                    <option value="Spin">Spin</option>
                    <option value="Off-spin">Off-spin</option>
                    <option value="Leg-spin">Leg-spin</option>
                  </select>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <Btn bg={G.green} col={G.lime} full onClick={()=>{
                    const updated = members.map(m => m.id===currentUser.id
                      ? {...m,
                          battingHand: profileAttrsDraft.battingHand,
                          bowlingHand: profileAttrsDraft.bowlingHand,
                          bowlingStyle: profileAttrsDraft.bowlingStyle,
                        } : m);
                    saveMembers(updated);
                    const fresh = updated.find(m=>m.id===currentUser.id);
                    setCurrentUser(fresh);
                    localStorage.setItem("fcc-current-user",JSON.stringify(fresh));
                    setProfileAttrsEditing(false);
                    showToast("Attributes saved ✓");
                  }}>Save</Btn>
                  <Btn bg={G.cream} col={G.muted} onClick={()=>setProfileAttrsEditing(false)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,
                  background:G.cream,border:`1px solid ${G.border}`,
                  borderRadius:8,padding:"10px 14px",flex:1,minWidth:120}}>
                  <span style={{fontSize:18}}>🏏</span>
                  <div>
                    <div style={{fontSize:9,color:G.muted,fontWeight:700,textTransform:"uppercase"}}>Batting</div>
                    <div style={{fontSize:13,fontWeight:700,color:G.text}}>
                      {me.battingHand==="left"?"Left-handed":"Right-handed"}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,
                  background:G.cream,border:`1px solid ${G.border}`,
                  borderRadius:8,padding:"10px 14px",flex:1,minWidth:120}}>
                  <span style={{fontSize:18}}>⚾</span>
                  <div>
                    <div style={{fontSize:9,color:G.muted,fontWeight:700,textTransform:"uppercase"}}>Bowling</div>
                    <div style={{fontSize:13,fontWeight:700,color:G.text}}>
                      {me.bowlingHand==="left"?"Left-arm":"Right-arm"}
                      {me.bowlingStyle&&` ${me.bowlingStyle}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Change PIN */}
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:14,padding:"18px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:changingPin?14:0}}>
              <div style={{fontWeight:800,fontSize:14,color:G.text}}>🔐 Change PIN</div>
              {!changingPin&&(
                <button type="button"
                  onClick={()=>{setChangingPin(true);setPinMsg("");}}
                  style={{background:G.cream,border:`1px solid ${G.border}`,
                    borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",color:G.text}}>
                  Change
                </button>
              )}
            </div>
            {changingPin&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <FFld G={G} label="Current PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({padding:"9px 12px",fontSize:18,
                    letterSpacing:6,textAlign:"center"})}
                    value={oldPin} onChange={e=>setOldPin(e.target.value.replace(/\D/g,""))}/>
                </FFld>
                <FFld G={G} label="New PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({padding:"9px 12px",fontSize:18,
                    letterSpacing:6,textAlign:"center"})}
                    value={newPin1} onChange={e=>setNewPin1(e.target.value.replace(/\D/g,""))}/>
                </FFld>
                <FFld G={G} label="Confirm new PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({padding:"9px 12px",fontSize:18,
                    letterSpacing:6,textAlign:"center"})}
                    value={newPin2} onChange={e=>setNewPin2(e.target.value.replace(/\D/g,""))}/>
                </FFld>
                {pinMsg&&<div style={{color:"#dc2626",fontSize:13,fontWeight:700}}>{pinMsg}</div>}
                <div style={{display:"flex",gap:8}}>
                  <Btn bg={G.green} col={G.lime} full onClick={handleChangePin}>Update PIN</Btn>
                  <Btn bg={G.cream} col={G.muted} onClick={()=>{
                    setChangingPin(false);setOldPin("");setNewPin1("");setNewPin2("");setPinMsg("");
                  }}>Cancel</Btn>
                </div>
              </div>
            )}
          </div>

          {/* ── My Availability ───────────────────────────────── */}
          {(()=>{
            const myAbsences = (me.absences||[]).sort((a,b)=>a.from.localeCompare(b.from));
            const ABS_CATS = ["Holiday","Work","Injury","Other"];
            const catColour = {Holiday:"#1e40af",Work:"#92400e",Injury:"#dc2626",Other:"#374151"};
            const catBg     = {Holiday:"#eff6ff",Work:"#fffbeb",Injury:"#fef2f2",Other:"#f3f4f6"};
            const catBord   = {Holiday:"#bfdbfe",Work:"#fde68a",Injury:"#fca5a5",Other:"#e5e7eb"};

            function saveAbsences(newList) {
              const updated = members.map(m=>m.id===me.id?{...m,absences:newList}:m);
              saveMembers(updated);
            }

            function addAbsence() {
              if(!absFrom||!absTo) { showToast("Please pick start and end dates"); return; }
              if(absTo<absFrom) { showToast("End date must be on or after start date"); return; }
              // Find conflicting sessions
              const conflicts = sessions.filter(s=>
                s.players.includes(me.name) &&
                s.date>=absFrom && s.date<=absTo
              );
              if(conflicts.length>0) {
                setAbsConflicts({from:absFrom,to:absTo,cat:absCat,note:absNote,sessions:conflicts});
                return; // show nudge
              }
              commitAbsence(absFrom,absTo,absCat,absNote,[]);
            }

            function commitAbsence(from,to,cat,note,sessionsToRemove) {
              const newAbs = {id:uid(),from,to,category:cat,note:note.trim()};
              saveAbsences([...myAbsences,newAbs]);
              if(sessionsToRemove.length>0) {
                const updated=sessions.map(s=>sessionsToRemove.find(c=>c.id===s.id)
                  ? {...s,players:s.players.filter(p=>p!==me.name)} : s);
                saveSessions(updated);
              }
              setAbsFrom(""); setAbsTo(""); setAbsCat("Holiday"); setAbsNote("");
              setAbsConflicts(null);
              showToast(`Away period saved ✓${sessionsToRemove.length>0?" · removed from "+sessionsToRemove.length+" session"+( sessionsToRemove.length>1?"s":""):""}`);
            }

            return (
              <div style={{background:G.white,border:`1.5px solid ${G.border}`,
                borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontWeight:900,fontSize:14,color:G.text,marginBottom:12,
                  display:"flex",alignItems:"center",gap:8}}>
                  ✈️ My Availability
                </div>

                {/* Conflict nudge */}
                {absConflicts&&(
                  <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",
                    borderRadius:10,padding:"12px 14px",marginBottom:14}}>
                    <div style={{fontWeight:800,fontSize:13,color:"#92400e",marginBottom:6}}>
                      ⚠️ You're signed up for {absConflicts.sessions.length} session{absConflicts.sessions.length>1?"s":""} during this period
                    </div>
                    <div style={{fontSize:12,color:"#78350f",marginBottom:10,lineHeight:1.6}}>
                      {absConflicts.sessions.map(s=>`${fmtShort(s.date)} ${s.from}–${s.to}${s.label?" · "+s.label:""}`).join("\n")}
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <button onClick={()=>commitAbsence(absConflicts.from,absConflicts.to,absConflicts.cat,absConflicts.note,absConflicts.sessions)}
                        style={{flex:1,background:"#92400e",color:"#fff",border:"none",
                          borderRadius:9,padding:"9px 0",fontFamily:"inherit",fontWeight:800,
                          fontSize:12,cursor:"pointer"}}>
                        Save &amp; remove me from those sessions
                      </button>
                      <button onClick={()=>commitAbsence(absConflicts.from,absConflicts.to,absConflicts.cat,absConflicts.note,[])}
                        style={{flex:1,background:G.cream,color:G.muted,border:`1px solid ${G.border}`,
                          borderRadius:9,padding:"9px 0",fontFamily:"inherit",fontWeight:700,
                          fontSize:12,cursor:"pointer"}}>
                        Save &amp; keep me in sessions
                      </button>
                    </div>
                    <button onClick={()=>setAbsConflicts(null)}
                      style={{width:"100%",marginTop:8,background:"none",border:"none",
                        fontSize:12,color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Existing absences */}
                {myAbsences.length>0&&(
                  <div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:6}}>
                    {myAbsences.map(a=>(
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,
                        padding:"9px 12px",borderRadius:9,
                        background:catBg[a.category]||"#f3f4f6",
                        border:`1px solid ${catBord[a.category]||"#e5e7eb"}`}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,
                            color:catColour[a.category]||G.text}}>
                            {a.category}
                            {a.from===a.to
                              ? ` · ${fmtShort(a.from)}`
                              : ` · ${fmtShort(a.from)} – ${fmtShort(a.to)}`}
                          </div>
                          {a.note&&<div style={{fontSize:11,color:G.muted,marginTop:2}}>
                            {a.note}
                            <span style={{fontStyle:"italic",opacity:.7}}> (note visible to admins only)</span>
                          </div>}
                        </div>
                        <button onClick={()=>saveAbsences(myAbsences.filter(x=>x.id!==a.id))}
                          style={{background:"none",border:"none",color:G.red,
                            fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new absence */}
                {!absConflicts&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{display:"flex",gap:8}}>
                      <div style={{flex:1}}>
                        <label style={{fontSize:10,fontWeight:700,color:G.muted,
                          display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>
                          From
                        </label>
                        <input type="date" value={absFrom}
                          onChange={e=>{ setAbsFrom(e.target.value); if(!absTo||absTo<e.target.value) setAbsTo(e.target.value); }}
                          min={todayStr()}
                          style={iSt({fontSize:13,padding:"8px 10px",borderRadius:8})}/>
                      </div>
                      <div style={{flex:1}}>
                        <label style={{fontSize:10,fontWeight:700,color:G.muted,
                          display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>
                          To
                        </label>
                        <input type="date" value={absTo}
                          onChange={e=>setAbsTo(e.target.value)}
                          min={absFrom||todayStr()}
                          style={iSt({fontSize:13,padding:"8px 10px",borderRadius:8})}/>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {ABS_CATS.map(c=>(
                        <button key={c} onClick={()=>setAbsCat(c)}
                          style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${absCat===c?catBord[c]||G.green:"rgba(0,0,0,.1)"}`,
                            background:absCat===c?(catBg[c]||G.cream):"transparent",
                            color:absCat===c?(catColour[c]||G.green):G.muted,
                            fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          {c}
                        </button>
                      ))}
                    </div>
                    {absCat==="Other"&&(
                      <input value={absNote} onChange={e=>setAbsNote(e.target.value)}
                        placeholder="Brief reason (visible to admins only)…"
                        style={iSt({fontSize:13,padding:"8px 10px",borderRadius:8})}/>
                    )}
                    <button onClick={addAbsence}
                      disabled={!absFrom||!absTo}
                      style={{background:absFrom&&absTo?G.green:"rgba(0,0,0,.1)",
                        color:absFrom&&absTo?G.lime:G.muted,border:"none",borderRadius:9,
                        padding:"10px 0",fontFamily:"inherit",fontWeight:800,fontSize:13,
                        cursor:absFrom&&absTo?"pointer":"default",width:"100%"}}>
                      + Mark as away
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Notifications ─────────────────────────────────── */}
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontWeight:900,fontSize:14,color:G.text,marginBottom:12}}>
              🔔 Notifications
            </div>
            {!me.email&&(
              <div style={{fontSize:12,color:G.muted,marginBottom:10,lineHeight:1.5,
                background:G.cream,borderRadius:8,padding:"8px 10px",
                border:`1px solid ${G.border}`}}>
                ℹ️ Add your email address to receive booking confirmations.
              </div>
            )}
            <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
              <div style={{paddingTop:1}}>
                <button onClick={()=>{
                    const updated=members.map(m=>m.id===me.id
                      ?{...m,emailBookingConfirm:!(me.emailBookingConfirm??true)}:m);
                    saveMembers(updated);
                    showToast((me.emailBookingConfirm??true)
                      ?"Booking confirmations off":"Booking confirmations on ✓");
                  }}
                  style={{width:44,height:24,borderRadius:20,border:"none",cursor:"pointer",
                    background:(me.emailBookingConfirm??true)&&me.email?G.green:"#d1d5db",
                    transition:"background .2s",position:"relative",flexShrink:0,
                    display:"block"}}>
                  <span style={{position:"absolute",top:2,
                    left:(me.emailBookingConfirm??true)&&me.email?22:2,
                    width:20,height:20,borderRadius:"50%",background:"#fff",
                    transition:"left .2s",display:"block"}}/>
                </button>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:G.text}}>
                  Booking confirmation emails
                </div>
                <div style={{fontSize:11,color:G.muted,marginTop:2,lineHeight:1.5}}>
                  Receive an email each time you join or book a session.
                  {me.email
                    ? ` Sent to ${maskEmail(me.email)}.`
                    : " No email on file — add one in your profile."}
                </div>
              </div>
            </label>

            <div style={{height:1,background:G.border,margin:"10px 0"}}/>

            <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
              <div style={{paddingTop:1}}>
                <button onClick={()=>{
                    const updated=members.map(m=>m.id===me.id
                      ?{...m,emailDayBeforeReminder:!(me.emailDayBeforeReminder??true)}:m);
                    saveMembers(updated);
                    showToast((me.emailDayBeforeReminder??true)
                      ?"Day-before reminders off":"Day-before reminders on ✓");
                  }}
                  style={{width:44,height:24,borderRadius:20,border:"none",cursor:"pointer",
                    background:(me.emailDayBeforeReminder??true)&&me.email?G.green:"#d1d5db",
                    transition:"background .2s",position:"relative",flexShrink:0,
                    display:"block"}}>
                  <span style={{position:"absolute",top:2,
                    left:(me.emailDayBeforeReminder??true)&&me.email?22:2,
                    width:20,height:20,borderRadius:"50%",background:"#fff",
                    transition:"left .2s",display:"block"}}/>
                </button>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:G.text}}>
                  Day-before reminders
                </div>
                <div style={{fontSize:11,color:G.muted,marginTop:2,lineHeight:1.5}}>
                  Get an email at 5pm the evening before any session you're booked into.
                  Helps you not forget and plan transport in time.
                </div>
              </div>
            </label>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* MY UPCOMING MATCHES — only for players with teams */}
          {/* ══════════════════════════════════════════════════════════ */}
          {myTeams.length > 0 && (()=>{
            const today = new Date().toISOString().slice(0, 10);
            // Map team names to fixture divisions - flexible matching
            const getMyDivisions = (teams) => {
              const divs = [];
              teams.forEach(t => {
                const tl = t.toLowerCase();
                if(tl.includes("div 2") || tl === "div 2") divs.push("Div 2");
                if(tl.includes("div 3") || tl === "div 3") divs.push("Div 3");
                if(tl.includes("div 4") || tl === "div 4") divs.push("Div 4");
                if(tl.includes("t20") && tl.includes("4")) divs.push("T20 Serie 4");
                if(tl.includes("t20") && tl.includes("5")) divs.push("T20 Serie 5");
                if(tl.includes("women") || tl.includes("kvinde")) divs.push("Women's");
                // Legends team plays in OB division
                if(tl === "ob" || tl.includes("oldboy") || tl.includes("legend")) divs.push("OB");
                // Junior teams
                if(tl.includes("u11")) divs.push("U11");
                if(tl.includes("u13")) divs.push("U13");
                if(tl.includes("u15")) divs.push("U15");
                if(tl.includes("u16")) divs.push("U16");
                if(tl.includes("u18") || tl.includes("u19")) divs.push("U18");
              });
              return [...new Set(divs)];
            };
            const myDivisions = getMyDivisions(myTeams);
            
            // Check if user can access full availability view
            const canAccessAvailability = can(userRole, "accessMembers") || 
              isCoachMember(currentUser?.name, teams) ||
              teams.some(t => (t.captain === me.name || t.viceCaptain === me.name));
            
            const allMyMatches = ALL_FIXTURES
              .filter(f => f.date >= today && myDivisions.includes(f.division))
              .sort((a, b) => a.date.localeCompare(b.date));
            
            const myMatches = showAllMatches ? allMyMatches : allMyMatches.slice(0, 6);
            
            if(allMyMatches.length === 0) return null;
            
            return (
              <div style={{background: G.white, border: `1.5px solid ${G.border}`,
                borderRadius: 14, padding: "18px 16px", overflow: "hidden"}}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 14}}>
                  <div style={{display: "flex", alignItems: "center", gap: 8}}>
                    <span style={{fontSize: 16}}>🏏</span>
                    <span style={{fontWeight: 800, fontSize: 14, color: G.text}}>My Upcoming Matches</span>
                  </div>
                  <span style={{fontSize: 12, color: G.muted}}>{allMyMatches.length} match{allMyMatches.length !== 1 ? "es" : ""}</span>
                </div>
                
                <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                  {myMatches.map((f, i) => {
                    const tc = getTeamCardColors(f.division);
                    return (
                      <div key={i} style={{
                        background: G.white,
                        borderRadius: 10,
                        borderLeft: `4px solid ${tc.border}`,
                        border: `0.5px solid ${G.border}`,
                        borderLeftWidth: 4,
                        borderLeftColor: tc.border,
                        overflow: "hidden",
                      }}>
                        <div style={{height: 3, background: tc.border}}/>
                        <div style={{padding: "10px 12px"}}>
                          <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap"}}>
                            <span style={{fontSize: 13, fontWeight: 500, color: G.text}}>
                              {fmtShort(f.date)}
                            </span>
                            <span style={{
                              background: tc.badgeBg, color: tc.badgeText,
                              padding: "1px 8px", borderRadius: 12,
                              fontSize: 9, fontWeight: 700,
                            }}>{f.division === "OB" ? "OB - Legends" : f.division}</span>
                          </div>
                          <div style={{fontSize: 14, fontWeight: 500, color: G.text, marginBottom: 2}}>
                            {f.label.replace(/^(Div \d|Women's|OB|T20 Serie \d) (vs |@ )/i, "")}
                          </div>
                          <div style={{fontSize: 11, color: G.muted}}>
                            {f.home ? "Home" : "Away"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Stats row */}
                <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14}}>
                  <div style={{background: G.cream, borderRadius: 8, padding: "10px", textAlign: "center"}}>
                    <div style={{fontSize: 18, fontWeight: 500, color: G.text}}>
                      {allMyMatches.length}
                    </div>
                    <div style={{fontSize: 9, color: G.muted, textTransform: "uppercase"}}>Total remaining</div>
                  </div>
                  <div style={{background: G.cream, borderRadius: 8, padding: "10px", textAlign: "center"}}>
                    <div style={{fontSize: 18, fontWeight: 500, color: G.text}}>
                      {allMyMatches.filter(f => f.home).length}
                    </div>
                    <div style={{fontSize: 9, color: G.muted, textTransform: "uppercase"}}>Home</div>
                  </div>
                  <div style={{background: G.cream, borderRadius: 8, padding: "10px", textAlign: "center"}}>
                    <div style={{fontSize: 18, fontWeight: 500, color: G.text}}>
                      {allMyMatches.filter(f => !f.home).length}
                    </div>
                    <div style={{fontSize: 9, color: G.muted, textTransform: "uppercase"}}>Away</div>
                  </div>
                </div>
                
                {/* Show more/less or link to availability */}
                {allMyMatches.length > 6 && (
                  <button onClick={() => canAccessAvailability ? setView("availability") : setShowAllMatches(v => !v)}
                    style={{width: "100%", marginTop: 12, padding: "10px",
                      background: G.cream, border: `1.5px solid ${G.border}`,
                      borderRadius: 8, fontSize: 12, fontWeight: 600,
                      color: G.text, cursor: "pointer", fontFamily: "inherit"}}>
                    {canAccessAvailability 
                      ? "View full season fixtures →"
                      : showAllMatches 
                        ? "▲ Show less" 
                        : `▼ Show all ${allMyMatches.length} matches`}
                  </button>
                )}
              </div>
            );
          })()}

          {/* ── My parent duties ── */}
          {(() => {
            const me = members.find(m => m.id === currentUser?.id);
            if (!me) return null;
            const myChildren = (me.children || [])
              .map(cid => members.find(m => m.id === cid))
              .filter(Boolean);
            if (myChildren.length === 0) return null;

            const myDutyTeams = [...new Set(
              myChildren.flatMap(c => (c.teams || []).filter(t => isDutyEnabled(t, parentDutyConfig)))
            )];
            if (myDutyTeams.length === 0) return null;

            const today = new Date().toISOString().slice(0, 10);
            const seasonYear = getSeasonYear(today);

            const teamStats = myDutyTeams.map(team => {
              const cfg = getEffectiveConfig(team, parentDutyConfig);
              const myCount = countDuties(me, sessions, team, seasonYear);
              const teamChildIds = new Set(
                members.filter(m => (m.teams || []).includes(team)).map(m => m.id)
              );
              const teamParents = members.filter(m =>
                (m.children || []).some(cid => teamChildIds.has(cid))
              );
              const leaderboard = teamParents
                .map(p => ({ id: p.id, name: p.name, count: countDuties(p, sessions, team, seasonYear) }))
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
              const myRank = leaderboard.findIndex(p => p.id === me.id) + 1;
              return { team, cfg, myCount, leaderboard, myRank, totalParents: teamParents.length };
            });

            return (
              <div style={{
                background: G.white, borderRadius: 14, border: `1.5px solid ${G.border}`,
                padding: "14px 16px", marginTop: 12
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: G.muted,
                  textTransform: "uppercase", marginBottom: 12
                }}>
                  My parent duties
                </div>

                {teamStats.map(({ team, cfg, myCount, leaderboard, myRank, totalParents }) => {
                  const pct = Math.min(100, Math.round((myCount / cfg.minDuties) * 100));
                  const remaining = Math.max(0, cfg.minDuties - myCount);
                  const minReached = myCount >= cfg.minDuties;
                  const barColor = minReached ? "#1D9E75" : "#378ADD";

                  const upcoming = sessions
                    .filter(s => s.restrictedTo === team && s.date >= today)
                    .filter(s => getSlotCount(s, parentDutyConfig) > 0)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 8);

                  return (
                    <div key={team} style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800,
                          background: "#E6F1FB", color: "#0C447C",
                          padding: "3px 10px", borderRadius: 12
                        }}>
                          {team}
                        </span>
                        {minReached && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: "#085041",
                            background: "#E1F5EE", padding: "2px 8px", borderRadius: 10
                          }}>
                            ✓ minimum reached
                          </span>
                        )}
                      </div>

                      <div style={{
                        display: "flex", alignItems: "baseline",
                        justifyContent: "space-between", marginBottom: 6
                      }}>
                        <span style={{ fontSize: 12, color: G.muted }}>Done this season</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: barColor }}>
                          {myCount} <span style={{ color: G.muted, fontWeight: 600 }}>/ {cfg.minDuties} min</span>
                        </span>
                      </div>
                      <div style={{
                        height: 6, background: "#F1EFE8", borderRadius: 3,
                        overflow: "hidden", marginBottom: 6
                      }}>
                        <div style={{
                          height: "100%", width: `${pct}%`, background: barColor,
                          borderRadius: 3, transition: "width .3s"
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: G.muted, marginBottom: 12 }}>
                        {remaining > 0 ? `${remaining} more to hit your minimum` : "You're sorted for the season"}
                        {totalParents > 1 && ` · You're ${myRank} of ${totalParents}`}
                      </div>

                      {upcoming.length > 0 && (
                        <>
                          <div style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: 1,
                            textTransform: "uppercase", color: G.muted, marginBottom: 6
                          }}>
                            Upcoming · tap to claim
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                            {upcoming.map(s => {
                              const isMatch = isMatchSession(s);
                              const slots = getSlotCount(s, parentDutyConfig);
                              const filled = getSupportParents(s);
                              const myEntry = filled.find(sp => sp.memberId === me.id);
                              const isFull = filled.length >= slots;
                              const otherNames = filled
                                .filter(sp => sp.memberId !== me.id)
                                .map(sp => sp.memberName.split(" ")[0])
                                .join(", ");

                              const bg = myEntry ? "#378ADD"
                                       : isFull   ? "#E1F5EE"
                                       : "#FFFFFF";
                              const border = myEntry ? "#378ADD"
                                           : isFull   ? "#9FE1CB"
                                           : G.border;
                              const textColor = myEntry ? "#FFFFFF"
                                              : isFull   ? "#085041"
                                              : G.text;
                              const sublineColor = myEntry ? "rgba(255,255,255,.85)"
                                                 : isFull   ? "#0F6E56"
                                                 : G.muted;

                              const dateLabel = new Date(s.date).toLocaleDateString("en-GB", {
                                weekday: "short", day: "numeric", month: "short"
                              });

                              return (
                                <button key={s.id}
                                  onClick={() => { setSelSess(s); setView("sessionDetail"); }}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    background: bg, border: `1px solid ${border}`,
                                    borderRadius: 8, padding: "8px 10px",
                                    cursor: "pointer", fontFamily: "inherit",
                                    textAlign: "left", width: "100%"
                                  }}>
                                  <div style={{
                                    fontSize: 16,
                                    opacity: myEntry || isFull ? 1 : 0.5
                                  }}>
                                    {isMatch ? "🏏" : "🎯"}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>
                                      {dateLabel}
                                      {isMatch && s.matchOpponent ? ` · v ${s.matchOpponent}` : ""}
                                    </div>
                                    <div style={{ fontSize: 10, color: sublineColor }}>
                                      {myEntry
                                        ? `You · ${myEntry.roleLabel || resolveRoleShort(myEntry.role, team, parentDutyConfig)}`
                                        : isFull
                                          ? `Covered by ${otherNames}`
                                          : `${filled.length}/${slots} ${isMatch ? "volunteers" : "filled"}${otherNames ? ` · ${otherNames}` : ""}`
                                      }
                                    </div>
                                  </div>
                                  {!myEntry && !isFull && (
                                    <span style={{
                                      fontSize: 10, fontWeight: 700,
                                      color: "#0C447C", background: "#E6F1FB",
                                      padding: "3px 8px", borderRadius: 10
                                    }}>
                                      Claim →
                                    </span>
                                  )}
                                  {myEntry && (
                                    <span style={{
                                      fontSize: 10, fontWeight: 700,
                                      color: "#fff", background: "rgba(255,255,255,.25)",
                                      padding: "3px 8px", borderRadius: 10
                                    }}>
                                      Yours
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {totalParents > 1 && (
                        <div>
                          <div style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: 1,
                            textTransform: "uppercase", color: G.muted, marginBottom: 6
                          }}>
                            All parents · this season
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {leaderboard.map(p => {
                              const isMe = p.id === me.id;
                              const isZero = p.count === 0;
                              const minHit = p.count >= cfg.minDuties;
                              return (
                                <div key={p.id} style={{
                                  display: "flex", alignItems: "center", gap: 8,
                                  padding: "6px 8px", borderRadius: 6,
                                  background: isMe ? "#E6F1FB" : isZero ? "#FCEBEB" : "transparent",
                                  fontSize: 12
                                }}>
                                  <span style={{
                                    flex: 1,
                                    color: isMe ? "#0C447C" : isZero ? "#791F1F" : G.text,
                                    fontWeight: isMe ? 800 : 500
                                  }}>
                                    {isMe ? "You" : p.name}
                                  </span>
                                  <span style={{
                                    fontSize: 11, fontWeight: 700,
                                    color: isMe ? "#0C447C" : isZero ? "#791F1F" : minHit ? "#0F6E56" : G.muted
                                  }}>
                                    {p.count}{minHit ? " ✓" : isZero ? " ⚠" : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Theme switcher */}
          <div style={{background:G.white,borderRadius:14,border:`1.5px solid ${G.border}`,
            padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:G.muted,
              textTransform:"uppercase",marginBottom:12}}>App Theme</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {THEME_KEYS.map(key=>{
                const t=THEMES[key];
                const active=themeKey===key;
                return (
                  <button key={key} onClick={()=>applyTheme(key)}
                    style={{display:"flex",alignItems:"center",gap:12,
                      background:active?t.headerBg:"transparent",
                      border:`2px solid ${active?t.headerBg:G.border}`,
                      borderRadius:10,padding:"10px 14px",cursor:"pointer",
                      fontFamily:"inherit",transition:"all .15s"}}>
                    <span style={{fontSize:20}}>{t.emoji}</span>
                    <span style={{fontSize:14,fontWeight:700,
                      color:active?"#fff":G.text,flex:1,textAlign:"left"}}>
                      {t.label}
                    </span>
                    {active&&<span style={{fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:700}}>
                      Active ✓
                    </span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Career stats (TASK 8) ─────────────────────────── */}
          {(() => {
            const c = careerDoc?.career || {};
            const bat = c.batting || {};
            const bowl = c.bowling || {};
            const fld = c.fielding || {};
            const appearances = Array.isArray(careerDoc?.matchAppearances)
              ? careerDoc.matchAppearances
              : [];

            const batInns = bat.innings || 0;
            const batNo   = bat.notOuts || 0;
            const batRuns = bat.runs    || 0;
            const batBalls= bat.balls   || 0;
            const dismissals = Math.max(0, batInns - batNo);
            // Cricket convention:
            // - innings 0 → "—"
            // - always not-out (innings - notOuts = 0) → "{runs}*"
            // - else runs / dismissals to 2dp
            const batAvg = batInns === 0
              ? "—"
              : dismissals === 0
                ? `${batRuns}*`
                : (batRuns / dismissals).toFixed(2);
            const batSR  = batBalls > 0   ? ((batRuns * 100) / batBalls).toFixed(1) : "—";
            const hs     = bat.highest ?? 0;
            const fifties= bat.fifties ?? 0;
            const hundreds = bat.hundreds ?? 0;

            const bWkts  = bowl.wickets || 0;
            const bRuns  = bowl.runs    || 0;
            const bOvers = bowl.overs   || 0;
            const bowlAvg = bWkts > 0 ? (bRuns / bWkts).toFixed(2) : "—";
            const bowlEcon = bOvers > 0 ? (bRuns / bOvers).toFixed(2) : "—";
            const fiveFors = bowl.fiveFors ?? 0;
            const best     = bowl.bestFigures || "0/0";

            const catches   = fld.catches   ?? 0;
            const stumpings = fld.stumpings ?? 0;
            const runOuts   = fld.runOuts   ?? 0;

            const last5 = appearances.slice(-5).reverse();

            const Section = ({ title, children }) => (
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: 10, fontWeight: 800,
                  color: STATS_PALETTE.gold,
                  textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6,
                }}>{title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
                  {children}
                </div>
              </div>
            );

            return (
              <div style={{
                background: `linear-gradient(135deg, ${STATS_PALETTE.navy} 0%, ${STATS_PALETTE.navyDk} 100%)`,
                border: `1.5px solid rgba(201,168,76,0.4)`,
                borderRadius: 14, padding: "18px 16px",
                boxShadow: "0 6px 22px rgba(27,42,92,0.25)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
                }}>
                  <span style={{ fontSize: 18 }}>📊</span>
                  <span style={{
                    fontSize: 14, fontWeight: 800, color: "#fff",
                    letterSpacing: 0.4,
                  }}>Career stats</span>
                  {careerLoading && (
                    <span style={{
                      marginLeft: "auto", fontSize: 10, fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                    }}>loading…</span>
                  )}
                </div>

                <Section title="Batting">
                  Innings: <strong style={{ color: STATS_PALETTE.goldLt }}>{batInns}</strong>
                  {" · "}Runs: <strong style={{ color: STATS_PALETTE.goldLt }}>{batRuns}</strong>
                  {" · "}Avg: <strong style={{ color: STATS_PALETTE.goldLt }}>{batAvg}</strong>
                  {" · "}SR: <strong style={{ color: STATS_PALETTE.goldLt }}>{batSR}</strong>
                  {" · "}HS: <strong style={{ color: STATS_PALETTE.goldLt }}>{hs}</strong>
                  {" · "}50s: <strong style={{ color: STATS_PALETTE.goldLt }}>{fifties}</strong>
                  {" · "}100s: <strong style={{ color: STATS_PALETTE.goldLt }}>{hundreds}</strong>
                </Section>

                <Section title="Bowling">
                  Wkts: <strong style={{ color: STATS_PALETTE.goldLt }}>{bWkts}</strong>
                  {" · "}Avg: <strong style={{ color: STATS_PALETTE.goldLt }}>{bowlAvg}</strong>
                  {" · "}Econ: <strong style={{ color: STATS_PALETTE.goldLt }}>{bowlEcon}</strong>
                  {" · "}5-fers: <strong style={{ color: STATS_PALETTE.goldLt }}>{fiveFors}</strong>
                  {" · "}Best: <strong style={{ color: STATS_PALETTE.goldLt }}>{best}</strong>
                </Section>

                <Section title="Fielding">
                  Catches: <strong style={{ color: STATS_PALETTE.goldLt }}>{catches}</strong>
                  {" · "}Stumpings: <strong style={{ color: STATS_PALETTE.goldLt }}>{stumpings}</strong>
                  {" · "}Run-outs: <strong style={{ color: STATS_PALETTE.goldLt }}>{runOuts}</strong>
                </Section>

                <div style={{
                  borderTop: "1px solid rgba(201,168,76,0.25)",
                  margin: "12px 0 10px",
                }} />

                <div style={{
                  fontSize: 10, fontWeight: 800, color: STATS_PALETTE.gold,
                  textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
                }}>Last 5 innings</div>

                {last5.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "16px 8px",
                    color: "rgba(255,255,255,0.55)", fontSize: 12, fontStyle: "italic",
                  }}>No matches played yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {last5.map((ap, i) => {
                      const dateLbl = ap?.date
                        ? new Date(ap.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "—";
                      const opp = ap?.opponent || "—";
                      const batting = ap?.batting;
                      const bowling = ap?.bowling;
                      const batStr = batting && batting.balls > 0
                        ? `${batting.runs} (${batting.balls})`
                        : "DNB";
                      const bowlStr = bowling && bowling.legalBalls > 0
                        ? `${bowling.wickets || 0} for ${bowling.runsConceded || 0}`
                        : "";
                      return (
                        <button key={i} type="button"
                          onClick={() => ap?.matchId && setView(`scorecard-${ap.matchId}`)}
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(201,168,76,0.18)",
                            borderRadius: 10, padding: "9px 11px",
                            color: "#fff", fontFamily: "inherit",
                            cursor: ap?.matchId ? "pointer" : "default",
                            textAlign: "left",
                          }}>
                          <div style={{
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", gap: 8,
                          }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{
                                fontSize: 12, fontWeight: 700, color: "#fff",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>{dateLbl} · vs {opp}</div>
                              <div style={{
                                fontSize: 11, color: "rgba(255,255,255,0.7)",
                                marginTop: 2, fontVariantNumeric: "tabular-nums",
                              }}>
                                {batStr}{bowlStr ? ` · ${bowlStr}` : ""}
                                {ap?.abandoned ? " · abandoned" : ""}
                              </div>
                            </div>
                            <span style={{ color: STATS_PALETTE.goldLt, fontSize: 14 }}>›</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Wagon wheel (TASK 8) ─────────────────────────── */}
          {(() => {
            return (
              <div style={{
                background: `linear-gradient(135deg, ${STATS_PALETTE.navy} 0%, ${STATS_PALETTE.navyDk} 100%)`,
                border: `1.5px solid rgba(201,168,76,0.4)`,
                borderRadius: 14, padding: "18px 16px",
                boxShadow: "0 6px 22px rgba(27,42,92,0.25)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: 0.4 }}>Wagon wheel</span>
                  {shotsLoading && (
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
                      loading…
                    </span>
                  )}
                </div>
                <div style={{ borderBottom: `2px solid ${STATS_PALETTE.gold}`, width: 40, marginBottom: 12 }} />

                {careerShots.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "20px 8px",
                    color: "rgba(255,255,255,0.55)", fontSize: 12, fontStyle: "italic",
                  }}>
                    {shotsLoading ? "Loading shots…" : "No scoring shots recorded yet"}
                  </div>
                ) : (
                  <>
                    {/* Per-shot mirror: flip a shot's x if it was
                        recorded as LH (event.battingHand) and the
                        player's own hand is RH — or vice versa. The
                        SVG itself mirrors via scaleX(-1) only when
                        the player is LH; labels stay outside that
                        transform inside WagonWheelDisplay. */}
                    <WagonWheelDisplay
                      mirror={ownIsLH}
                      shots={careerShots.map(s => {
                        const shotHand = s.battingHand
                          ? String(s.battingHand).toLowerCase()
                          : (ownIsLH ? "left" : "right");
                        const shotIsLH = shotHand === "lh" || shotHand === "left";
                        if (shotIsLH === ownIsLH) return s;
                        const flipped = { ...s };
                        if (s.tapPoint) {
                          flipped.tapPoint = { x: 220 - s.tapPoint.x, y: s.tapPoint.y };
                        }
                        if (s.zone) {
                          const ZONE_MIRROR = {
                            behind: "behind", straight: "straight",
                            "third-man": "fine-leg", "fine-leg": "third-man",
                            point: "sq-leg", "sq-leg": "point",
                            cover: "midwicket", midwicket: "cover",
                            "mid-off": "on-drive", "on-drive": "mid-off",
                          };
                          flipped.zone = ZONE_MIRROR[s.zone] || s.zone;
                        }
                        return flipped;
                      })}
                    />
                    <div style={{
                      textAlign: "center", marginTop: 10,
                      fontSize: 11, color: "rgba(255,255,255,0.6)",
                    }}>Total shots played: <strong style={{ color: STATS_PALETTE.goldLt }}>{careerShots.length}</strong></div>
                    {/* Legend */}
                    <div style={{
                      display: "flex", justifyContent: "center", gap: 14, marginTop: 8,
                      fontSize: 10, color: "rgba(255,255,255,0.6)",
                    }}>
                      <span><span style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: 4,
                        background: "#27AE60", marginRight: 4, verticalAlign: "middle",
                      }} />1–3</span>
                      <span><span style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: 4,
                        background: "#185FA5", marginRight: 4, verticalAlign: "middle",
                      }} />4</span>
                      <span><span style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: 4,
                        background: "#C9A84C", marginRight: 4, verticalAlign: "middle",
                      }} />6</span>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ── Dismissal map (TASK 9) ───────────────────────── */}
          {(() => {
            const LABELS = {
              b: "Bowled", c: "Caught", lbw: "LBW",
              ro: "Run out", st: "Stumped", hw: "Hit wicket",
            };
            const COLOURS = {
              b: "#C0392B", c: "#E67E22", lbw: "#F1C40F",
              ro: "#185FA5", st: "#8E44AD", hw: "#E84393",
            };
            const { counts, total } = dismissalStats;
            const rows = Object.entries(counts)
              .map(([code, n]) => ({ code, n, pct: total > 0 ? (n * 100) / total : 0 }))
              .sort((a, b) => b.n - a.n);
            const maxN = rows.reduce((m, r) => Math.max(m, r.n), 0);

            return (
              <div style={{
                background: `linear-gradient(135deg, ${STATS_PALETTE.navy} 0%, ${STATS_PALETTE.navyDk} 100%)`,
                border: `1.5px solid rgba(201,168,76,0.4)`,
                borderRadius: 14, padding: "18px 16px",
                boxShadow: "0 6px 22px rgba(27,42,92,0.25)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>📉</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: 0.4 }}>Dismissal map</span>
                </div>
                <div style={{ borderBottom: `2px solid ${STATS_PALETTE.gold}`, width: 40, marginBottom: 12 }} />

                {total < 3 ? (
                  <div style={{
                    textAlign: "center", padding: "20px 8px",
                    color: "rgba(255,255,255,0.55)", fontSize: 12, fontStyle: "italic",
                  }}>Not enough innings yet for dismissal analysis.</div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {rows.map(r => {
                        const widthPct = maxN > 0 ? (r.n / maxN) * 100 : 0;
                        const colour = COLOURS[r.code] || STATS_PALETTE.gold;
                        const label  = LABELS[r.code] || r.code;
                        const pctStr = r.pct.toFixed(0);
                        return (
                          <div key={r.code}>
                            <div style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              fontSize: 11, color: "rgba(255,255,255,0.8)", marginBottom: 3,
                            }}>
                              <span style={{ fontWeight: 700 }}>{label}</span>
                              <span style={{ color: STATS_PALETTE.goldLt, fontWeight: 700 }}>
                                {r.n} · {pctStr}%
                              </span>
                            </div>
                            <div style={{
                              height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4,
                              overflow: "hidden",
                            }}>
                              <div style={{
                                width: `${widthPct}%`, height: "100%", background: colour,
                                borderRadius: 4, transition: "width 0.25s",
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {rows[0] && (
                      <div style={{
                        marginTop: 12, paddingTop: 10,
                        borderTop: "1px solid rgba(201,168,76,0.25)",
                        fontSize: 11, color: "rgba(255,255,255,0.7)", textAlign: "center",
                      }}>
                        Most common: <strong style={{ color: STATS_PALETTE.goldLt }}>
                          {LABELS[rows[0].code] || rows[0].code}
                        </strong> ({rows[0].pct.toFixed(0)}%)
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* Help & Contact */}
          <button type="button" onClick={()=>setView("help")}
            style={{background:G.white,border:`1.5px solid ${G.border}`,
              borderRadius:12,padding:"13px 16px",fontFamily:"inherit",
              fontWeight:700,fontSize:14,color:G.text,cursor:"pointer",
              width:"100%",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
            <span style={{fontSize:20}}>💬</span>
            <span style={{flex:1}}>Help &amp; Contact Admin</span>
            <span style={{color:G.muted,fontSize:16}}>›</span>
          </button>

          {/* Privacy & Data */}
          <button type="button" onClick={()=>setView("privacy")}
            style={{background:G.white,border:`1.5px solid ${G.border}`,
              borderRadius:12,padding:"13px 16px",fontFamily:"inherit",
              fontWeight:700,fontSize:14,color:G.text,cursor:"pointer",
              width:"100%",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
            <span style={{fontSize:20}}>🔐</span>
            <span style={{flex:1}}>Privacy &amp; Your Data</span>
            <span style={{color:G.muted,fontSize:16}}>›</span>
          </button>
          </>)}

          {/* Sign out - always visible regardless of tab */}
          <button type="button" onClick={handleLogout}
            style={{background:"none",border:`1.5px solid ${G.border}`,
              borderRadius:12,padding:"13px",fontFamily:"inherit",
              fontWeight:800,fontSize:14,color:G.muted,cursor:"pointer",
              width:"100%"}}>
            Sign out
          </button>

        </div>
        <BotNav view="profile" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
        {toast&&<Toast msg={toast} G={G}/>}
      </Shell>
    );
}
