import React from "react";
import { can } from "../constants/roles";
import { isCoachMember } from "../utils/members";

export default function BotNav({view,setView,userRole,pendingCount=0,currentUser=null,teams=[],G}) {
  const isAdmin = can(userRole,"accessMembers");
  const isCoach = isAdmin || isCoachMember(currentUser?.name, teams);
  // Captain/VC of any senior team
  const isCaptain = teams.some(t => t.senior && (t.captain === currentUser?.name || t.vicecaptain === currentUser?.name));
  const active = view==="session"?"schedule":view==="roleAdmin"?"admin":view==="coachhq"?"coachhq":view==="captainxi"?"captainxi":
    (view === "scorelive" || view.startsWith("scorer-") || view.startsWith("live-")) ? "scorelive" : view;

  const IconSchedule = ({on}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={on?"currentColor":"none"} stroke="currentColor"
      strokeWidth={on?0:1.8} strokeLinecap="round" strokeLinejoin="round">
      {on ? <>
        <rect x="3" y="4" width="18" height="18" rx="2" fill={G.green} stroke="none"/>
        <line x1="16" y1="2" x2="16" y2="6" stroke={G.green} strokeWidth="2.5"/>
        <line x1="8" y1="2" x2="8" y2="6" stroke={G.green} strokeWidth="2.5"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="1.8"/>
        <rect x="7" y="13" width="3" height="3" rx="0.5" fill="white"/>
        <rect x="11" y="13" width="3" height="3" rx="0.5" fill="white"/>
      </> : <>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </>}
    </svg>
  );
  const IconMembers = ({on}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on?2.5:1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  const IconProfile = ({on}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on?2.5:1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
  const IconCoach = ({on}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on?2.5:1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  );
  const IconCaptain = ({on}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on?2.5:1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5"/>
      <path d="M12 3v2"/>
      <path d="M12 13v8"/>
      <path d="M9 18h6"/>
      <path d="M7 8h1"/>
      <path d="M16 8h1"/>
    </svg>
  );

  const Tab = ({id, icon, label, badge}) => {
    const on = active===id;
    return (
      <button onClick={()=>setView(id)} style={{
        background:"none", border:"none", cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:0, width:"100%", padding:"6px 4px 2px",
        position:"relative",
      }}>
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          padding:"6px 14px 5px",
          borderRadius:14,
          background: on
            ? `linear-gradient(175deg, #1a6b38 0%, #14532d 55%, #0f3d21 100%)`
            : "transparent",
          border: on
            ? `1.5px solid rgba(255,255,255,0.12)`
            : "1.5px solid transparent",
          boxShadow: on
            ? `0 2px 8px rgba(20,83,45,.45), inset 0 1px 0 rgba(255,255,255,.15), inset 0 -1px 0 rgba(0,0,0,.2)`
            : "none",
          transition:"all .18s",
          position:"relative",
        }}>
          <div style={{
            color: on ? G.lime : "#94a3b8",
            transition:"color .15s",
            position:"relative",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {icon}
            {badge>0&&(
              <span style={{position:"absolute",top:-5,right:-8,
                background:"#ef4444",color:"#fff",borderRadius:99,
                fontSize:9,fontWeight:900,minWidth:15,height:15,
                display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>
                {badge}
              </span>
            )}
          </div>
          <span style={{
            fontSize:10, fontWeight: on?800:600, letterSpacing:.3,
            color: on ? G.lime : "#94a3b8",
            transition:"color .15s",
          }}>{label}</span>
        </div>
      </button>
    );
  };

  const IconBook = ({on}) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on?2.5:1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="7" x2="12" y2="17"/>
      <line x1="7" y1="12" x2="17" y2="12"/>
    </svg>
  );

  const IconMatches = ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 Q12 9 21 12" />
      <path d="M3 12 Q12 15 21 12" />
      <path d="M18 4 Q22 12 18 20" strokeDasharray="2 2" />
    </svg>
  );

  // Calculate number of tabs: Schedule + Book + Matches + Profile = 4 base, + Coach HQ (only if not admin), + Captain XI, + Admin
  // Admins reach Coach HQ via the desktop sidebar / Admin panel — hiding it on mobile keeps the bar at <=5 tabs so Profile stays visible.
  const tabCount = 4 + (isCoach && !isAdmin ? 1 : 0) + ((isCaptain || isAdmin) ? 1 : 0) + (isAdmin ? 1 : 0);

  return (
    <div className="fcc-mobile-only" style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:500, zIndex:200,
      background:"rgba(255,255,255,0.98)",
      backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
      borderTop:"1px solid rgba(0,0,0,0.06)",
      boxShadow:"0 -6px 32px rgba(0,0,0,0.10), 0 -1px 0 rgba(0,0,0,0.04)",
      display:"grid",
      gridTemplateColumns: `repeat(${tabCount}, 1fr)`,
      alignItems:"center",
      padding:"6px 8px",
      paddingBottom:"max(10px, env(safe-area-inset-bottom))",
      gap:4,
    }}>
      <Tab id="schedule" icon={<IconSchedule on={active==="schedule"}/>} label="Schedule"/>

      {/* Book */}
      <button onClick={()=>setView("add")} style={{
        background:"none", border:"none", cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif",
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", width:"100%", padding:"6px 4px 2px",
      }}>
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          padding:"6px 14px 5px",
          borderRadius:14,
          background: active==="add"
            ? `linear-gradient(175deg, #1a6b38 0%, #14532d 55%, #0f3d21 100%)`
            : "transparent",
          border: active==="add"
            ? `1.5px solid rgba(255,255,255,0.12)`
            : "1.5px solid transparent",
          boxShadow: active==="add"
            ? `0 2px 8px rgba(20,83,45,.45), inset 0 1px 0 rgba(255,255,255,.15), inset 0 -1px 0 rgba(0,0,0,.2)`
            : "none",
          transition:"all .18s",
        }}>
          <div style={{
            color: active==="add" ? G.lime : "#94a3b8",
            transition:"color .15s",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <IconBook on={active==="add"}/>
          </div>
          <span style={{
            fontSize:10, fontWeight: active==="add"?800:600, letterSpacing:.3,
            color: active==="add" ? G.lime : "#94a3b8",
            transition:"color .15s",
          }}>Book</span>
        </div>
      </button>

      <Tab id="scorelive" icon={<IconMatches on={active === "scorelive"} />} label="ScorePro" />

      {isCoach && !isAdmin && (
        <Tab id="coachhq" icon={<IconCoach on={active==="coachhq"}/>} label="Coach HQ"/>
      )}
      {(isCaptain || isAdmin) && (
        <Tab id="captainxi" icon={<IconCaptain on={active==="captainxi"}/>} label="Captain"/>
      )}
      {isAdmin && (
        <Tab id="admin" icon={<IconMembers on={active==="admin"}/>} label="Admin" badge={pendingCount}/>
      )}
      <Tab id="profile" icon={<IconProfile on={active==="profile"}/>} label="Profile"/>
    </div>
  );
}
