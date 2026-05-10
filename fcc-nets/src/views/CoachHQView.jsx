import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import SidebarNav from "../ui/SidebarNav";
import BotNav from "../ui/BotNav";
import AppHeader from "../ui/AppHeader";
import { FCC_LOGO } from "../constants/logo";
import { can } from "../constants/roles";
import { TEAM_META } from "../constants/teams";

export default function CoachHQView() {
  const {
    G, view, setView, userRole, currentUser, handleLogout, teams,
    members, joinRequests, showToast,
  } = useAppContext();

  const coachTeams = (teams||[]).filter(t=>(t.coaches||[]).includes(currentUser?.name));
  const isAdmin = can(userRole,"accessMembers");

  // Get players from coach's teams (for Progress Tracker)
  const coachPlayers = members.filter(m => {
    const memberTeams = m.teams || [];
    return coachTeams.some(ct => memberTeams.includes(ct.name));
  });

  return (
    <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
      <AppHeader onBack={()=>setView("schedule")}
        title="Coach HQ" sub="Tools for coaches"/>
      <div style={{padding:"16px"}}>

        {/* Header banner */}
        <div style={{
          background:`linear-gradient(135deg, #1B2A5C 0%, #2d3a6e 100%)`,
          borderRadius:16,padding:"20px",marginBottom:16,
          position:"relative",overflow:"hidden"
        }}>
          <div style={{position:"absolute",top:-20,right:-20,fontSize:80,opacity:0.1}}>🧢</div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",marginBottom:4}}>
            Coach HQ
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.7)"}}>
            {isAdmin ? "All teams" : coachTeams.map(t=>t.name).join(", ") || "Coach tools"}
          </div>
        </div>

        {/* Tools grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>

          {/* Progress Tracker */}
          <button onClick={()=>setView("progress-tracker")}
            style={{background:G.white,border:`1.5px solid ${G.border}`,borderRadius:14,
              padding:"20px 16px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",
              display:"flex",flexDirection:"column",gap:8,
              transition:"all .15s",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:28}}>📊</div>
            <div style={{fontWeight:800,fontSize:14,color:G.text}}>Progress Tracker</div>
            <div style={{fontSize:11,color:G.muted,lineHeight:1.4}}>
              Track player skills, attendance & development
            </div>
          </button>

          {/* Season Plan */}
          <button onClick={()=>setView("season-plan")}
            style={{background:G.white,border:`1.5px solid ${G.border}`,borderRadius:14,
              padding:"20px 16px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",
              display:"flex",flexDirection:"column",gap:8,
              transition:"all .15s",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:28}}>📅</div>
            <div style={{fontWeight:800,fontSize:14,color:G.text}}>Season Plan</div>
            <div style={{fontSize:11,color:G.muted,lineHeight:1.4}}>
              Training curriculum & phase planning
            </div>
          </button>

          {/* Session Notes */}
          <button onClick={()=>showToast("Session Notes coming soon!")}
            style={{background:G.white,border:`1.5px solid ${G.border}`,borderRadius:14,
              padding:"20px 16px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",
              display:"flex",flexDirection:"column",gap:8,opacity:0.6,
              transition:"all .15s",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:28}}>📝</div>
            <div style={{fontWeight:800,fontSize:14,color:G.text}}>Session Notes</div>
            <div style={{fontSize:11,color:G.muted,lineHeight:1.4}}>
              Quick observations & player feedback
            </div>
            <span style={{fontSize:9,background:"#fef3c7",color:"#92400e",
              padding:"2px 8px",borderRadius:10,fontWeight:700,alignSelf:"flex-start"}}>
              Coming soon
            </span>
          </button>

          {/* Coach Coordination */}
          <button onClick={()=>setView("coach-coordination")}
            style={{background:"linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)",
              border:"1.5px solid rgba(201,168,76,0.4)",borderRadius:14,
              padding:"20px 16px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",
              display:"flex",flexDirection:"column",gap:8,
              transition:"all .15s",boxShadow:"0 4px 12px rgba(0,0,0,.15)"}}>
            <div style={{fontSize:28}}>🧩</div>
            <div style={{fontWeight:800,fontSize:14,color:"#c9a84c"}}>Coach Coordination</div>
            <div style={{fontSize:11,color:"rgba(232,234,240,0.7)",lineHeight:1.4}}>
              Schedule, conflicts & availability
            </div>
          </button>
        </div>

        {/* Quick stats */}
        <div style={{background:G.cream,borderRadius:14,padding:"16px",
          border:`1px solid ${G.border}`}}>
          <div style={{fontWeight:800,fontSize:12,color:G.text,marginBottom:12,
            textTransform:"uppercase",letterSpacing:"0.5px"}}>
            Your Players
          </div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {(isAdmin ?
              // Admins see all youth team counts
              (teams||[]).filter(t=>t.name.startsWith("U")).map(t=>({
                name: t.name,
                count: members.filter(m=>(m.teams||[]).includes(t.name)).length
              }))
              :
              // Coaches see their assigned teams
              coachTeams.map(t=>({
                name: t.name,
                count: members.filter(m=>(m.teams||[]).includes(t.name)).length
              }))
            ).map(({name,count})=>(
              <div key={name} style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:36,height:36,borderRadius:10,
                  background:TEAM_META[name]?.bg||G.green,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:900,color:TEAM_META[name]?.text||G.lime}}>
                  {count}
                </div>
                <div style={{fontSize:12,fontWeight:700,color:G.text}}>{name}</div>
              </div>
            ))}
            {(!isAdmin && coachTeams.length===0)&&(
              <div style={{fontSize:12,color:G.muted,fontStyle:"italic"}}>
                No teams assigned yet
              </div>
            )}
          </div>
        </div>

      </div>
      <BotNav view="coachhq" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length}
        currentUser={currentUser} teams={teams} G={G}/>
    </Shell>
  );
}
