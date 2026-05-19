import React from "react";
import { can } from "../constants/roles";
import { isCoachMember } from "../utils/members";

export default function SidebarNav({view, setView, userRole, currentUser, onLogout, teams=[], logo}) {
  const isAdmin = can(userRole,"accessMembers");
  const isCaptain = teams.some(t => t.senior && (t.captain === currentUser?.name || t.vicecaptain === currentUser?.name));
  const active = view==="session"?"schedule":view==="roleAdmin"?"admin":view;

  const navBtn = (v, icon, label) => (
    <button key={v} onClick={()=>setView(v)} style={{
      display:"flex",alignItems:"center",gap:12,width:"100%",
      padding:"11px 14px",borderRadius:10,border:"none",cursor:"pointer",
      fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,
      background: active===v ? "rgba(255,255,255,.18)" : "transparent",
      color: active===v ? "#fff" : "rgba(255,255,255,.6)",
      transition:"all .15s",textAlign:"left",
    }}>{icon} {label}</button>
  );

  return (
    <div className="fcc-sidebar">
      <img src={logo} alt="FCC" className="fcc-sidebar-logo"/>
      <div>
        <div className="fcc-sidebar-title">FCC Training</div>
        <div className="fcc-sidebar-sub" style={{marginTop:4}}>Fredensborg Cricket Club</div>
      </div>
      <div className="fcc-sidebar-links">
        {navBtn("schedule","📅","Schedule")}
        {navBtn("add","＋","Book / Join")}
        {navBtn("scorelive", "💯", "ScorePro")}
        {(isAdmin || isCoachMember(currentUser?.name,teams)) && navBtn("coachhq","🧢","Coach HQ")}
        {(isCaptain || isAdmin) && navBtn("captainxi","⚓","Captain's XI")}
        {isAdmin && navBtn("admin","👥","Admin Panel")}
        {(isAdmin || isCoachMember(currentUser?.name,[])) && navBtn("availability","📊","Team Availability")}
        {navBtn("profile","👤","My Profile")}
      </div>
      <div style={{marginTop:"auto",width:"100%",paddingTop:24,
        borderTop:"1px solid rgba(255,255,255,.15)"}}>
        <div style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:700,
          marginBottom:8,paddingLeft:4}}>{currentUser?.name}</div>
        <button onClick={onLogout} style={{
          width:"100%",padding:"9px 14px",borderRadius:10,border:"none",
          background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.7)",
          fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,
          cursor:"pointer",textAlign:"left",
        }}>Sign out</button>
      </div>
    </div>
  );
}
