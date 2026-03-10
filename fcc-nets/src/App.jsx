import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
// ─── Club Logo ───────────────────────────────────────────────
const FCC_LOGO = "data:image/png;base64,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";


// ─── Keys ─────────────────────────────────────────────────────
const SESSIONS_KEY = "fcc-nets-sessions-v4";
const MEMBERS_KEY  = "fcc-nets-members-v4";
const PINS_KEY     = "fcc-nets-pins-v4";
const RECURRING_KEY = "recurring";
const TEAMS_KEY    = "fcc-nets-teams-v4";

// ─── Roles ────────────────────────────────────────────────────
const ROLES = ["superadmin","admin","captain","vicecaptain","member"];
const ROLE_META = {
  superadmin: { label:"Super Admin",  bg:"#431407", text:"#fdba74", icon:"👑" },
  admin:      { label:"Admin",        bg:"#1e3a5f", text:"#93c5fd", icon:"🔧" },
  captain:    { label:"Captain",      bg:"#14532d", text:"#a3e635", icon:"🏆" },
  vicecaptain:{ label:"Vice Captain", bg:"#1a3d2b", text:"#6ee7b7", icon:"🥈" },
  member:     { label:"Member",       bg:"#374151", text:"#e5e7eb", icon:"🏏" },
};

// Senior teams can have captains/vice captains; youth cannot
// ─── Default teams (loaded from storage, editable by admins) ──
const DEFAULT_TEAMS = [
  {id:"div2",  name:"Div 2",      senior:true},
  {id:"div3",  name:"Div 3",      senior:true},
  {id:"div4",  name:"Div 4",      senior:true},
  {id:"womens",name:"Women's",    senior:true},
  {id:"u18",   name:"U18",        senior:false},
  {id:"u15",   name:"U15",        senior:false},
  {id:"u15g",  name:"U15 Girls",  senior:false},
  {id:"u13",   name:"U13",        senior:false},
  {id:"u11",   name:"U11",        senior:false},
];

const TEAM_META = {
  "Div 2":     { bg:"#14532d", text:"#a3e635" },
  "Div 3":     { bg:"#1e3a5f", text:"#93c5fd" },
  "Div 4":     { bg:"#3b1f6e", text:"#c4b5fd" },
  "Women's":   { bg:"#831843", text:"#fbcfe8" },
  "U18":       { bg:"#7c2d12", text:"#fed7aa" },
  "U15":       { bg:"#713f12", text:"#fde68a" },
  "U15 Girls": { bg:"#4a044e", text:"#f5d0fe" },
  "U13":       { bg:"#0c4a6e", text:"#bae6fd" },
  "U11":       { bg:"#064e3b", text:"#6ee7b7" },
  "Unassigned":{ bg:"#374151", text:"#d1d5db" },
};
// Fallback colour pool for dynamically added teams
const EXTRA_COLORS = [
  {bg:"#1a3a2a",text:"#86efac"},{bg:"#7c3a00",text:"#fdba74"},
  {bg:"#312e81",text:"#a5b4fc"},{bg:"#065f46",text:"#6ee7b7"},
  {bg:"#1e1b4b",text:"#c7d2fe"},{bg:"#4c0519",text:"#fda4af"},
];
const getTeamMeta = name => TEAM_META[name] || EXTRA_COLORS[Math.abs([...name].reduce((h,c)=>h*31+c.charCodeAt(0),0)) % EXTRA_COLORS.length];

const PRESET_POLL = [
  {id:"batting",  label:"🏏 Batting Focus"},
  {id:"bowling",  label:"🎳 Bowling Focus"},
  {id:"fielding", label:"🧤 Fielding Focus"},
  {id:"mixed",    label:"⚡ Mixed"},
];

// Permissions
const CAN = {
  deleteSession:  ["superadmin","admin","captain","vicecaptain"],
  removePlayer:   ["superadmin","admin","captain","vicecaptain"],
  createSession:  ["superadmin","admin","captain","vicecaptain","member"],
  sendReminder:   ["superadmin","admin","captain","vicecaptain"],
  accessMembers:  ["superadmin","admin"],
  assignRoles:    ["superadmin","admin"],
  addMember:      ["superadmin","admin"],
  removeMember:   ["superadmin","admin"],
  resetOtherPin:  ["superadmin"],
};
const can = (role, action) => (CAN[action]||[]).includes(role);

// Roles available to assign based on team type — now uses dynamic seniorTeamNames inside component

// ─── Seed members ─────────────────────────────────────────────
const SEED_MEMBERS = [
  "Aadya Kaul","Aarin Venkatesh","Abhinav Singh","Adam Pirzada",
  "Adithya Manimaran","Adithya Vennickle","Advik Akar","Ahaan Sinha",
  "Ahmed Nawaz","Akshay Bhardwaj","Amer Ramzan","Amit Yadav",
  "Anagha Mahajan","Anant Mahajan","Anirudh Ram Sriram","Anshu Gupta",
  "Anveshak Vujjini","Abhijit Guhagarkar",
  "Arun Krishnamurthy","Arun Shankar","Ashwin Shankar","Ashwin Singh Tensingh",
  "Balaji","Charlie","Deepak Akar","Dhruv Shah",
  "Durgesh","Gagan Sachdeva","Garghi Seenevas","Hasnain Ahmed",
  "Ilayaraja Karuppasamy","Ishan Bordoloi","Jay","Jaya Nair",
  "Kamal Jayalaksminarasimhan","Kian Kakoti","Mishka Gupta","Monesh Shantharam",
  "Nimesh Rajamohanan","Nirmal Mohanan","Nitin Gupta","Nitin Jain",
  "Pranavan Aananth","Prithvi Sagar","Pronit Lahiri","Pulin Dhar",
  "Raghavendar Murali","Rajesh Ayyappan","Rajesh Muthukumar",
  "Rajkumar Jeyaraman","Raju Dantuluri","Ramakrishnan Ravi",
  "Reuben Dayal","Rewanth Punna","Rohind Muthuselvaraj",
  "Rohith Arunkumar","Saatvik Dantuluri","Sahasra Dantuluri","Sagar Gupta",
  "Sahil Gagneja","Samyak Jaggi Ram","Savir Gagneja","Senthil Gnanasambandan",
  "Shardul Joshi","Sharmila C","Shashank Rastogi","Shreyas Gujjar",
  "Stalin Natesan","Sumithra","Syed Hamza Kazmi",
  "Taarush Jain","Talat Munshi","Trineth Arjun","Vihaan Rastogi",
  "Vihaan Sundeep","Vijay Deepak","Vinay Arunkumar",
  "Vinay Kumar","Virendra Pawar","Vishali Jain","Vivek Bhatnagar",
  "Vivek Satyarthi","Xavier Ramzan","Yogismaan Kamal","Zachary Dayal","Zeb Pirzada",
].map((name, i) => ({
  id: `m${i+1}`,
  name,
  team: name === "Zachary Dayal" ? "U11" : null,
  role: name === "Reuben Dayal" ? "superadmin" : "member",
}));

// ─── Utility ──────────────────────────────────────────────────
const uid          = () => Math.random().toString(36).slice(2,9);
const todayStr     = () => new Date().toISOString().split("T")[0];
const tomorrowStr  = () => { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; };
const fmtShort     = ds => new Date(ds).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
const fmtLong      = ds => new Date(ds).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const isToday      = ds => ds === todayStr();
const isFuture     = ds => { const d=new Date(ds); d.setHours(23,59,59); return d>=new Date(); };

// Normalise member — migrate old single `team` field to `teams` array
const normMember = m => ({
  ...m,
  teams: m.teams || (m.team ? [m.team] : []),
});

// ─── Profile completion ────────────────────────────────────────
function profileCompletion(m) {
  const fields = [!!m?.email?.trim(), !!m?.phone?.trim()];
  const filled = fields.filter(Boolean).length;
  const pct = Math.round((filled / fields.length) * 100);
  // Needs reconfirm if confirmed > 6 months ago or never
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
  const confirmedAt = m?.profileConfirmedAt ? new Date(m.profileConfirmedAt) : null;
  const needsReconfirm = !confirmedAt || (Date.now() - confirmedAt.getTime() > sixMonthsMs);
  const isComplete = pct === 100 && !needsReconfirm;
  return { pct, filled, total: fields.length, needsReconfirm, isComplete, confirmedAt };
}

// SVG arc dial
function ProfileDial({ pct }) {
  const r = 36, cx = 44, cy = 44, stroke = 7;
  const circumference = Math.PI * r; // half circle
  const arc = circumference * (pct / 100);
  const color = pct === 100 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="88" height="54" viewBox="0 0 88 54">
      {/* Track */}
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke="#e5e7eb" strokeWidth={stroke} strokeLinecap="round"/>
      {/* Fill */}
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${arc} ${circumference}`}/>
      {/* % text */}
      <text x={cx} y={cy-4} textAnchor="middle"
        style={{fontSize:15,fontWeight:900,fontFamily:"'DM Sans',sans-serif",fill:color}}>
        {pct}%
      </text>
      <text x={cx} y={cy+10} textAnchor="middle"
        style={{fontSize:9,fontWeight:700,fontFamily:"'DM Sans',sans-serif",fill:"#94a3b8",
          letterSpacing:1,textTransform:"uppercase"}}>
        complete
      </text>
    </svg>
  );
}
function hashPin(pin) {
  let h = 5381;
  for (let i=0;i<pin.length;i++) h=((h<<5)+h)+pin.charCodeAt(i);
  return String(h>>>0);
}

function makeICS(s) {
  const [y,mo,da]=s.date.split("-").map(Number);
  const [fh,fm]=s.from.split(":").map(Number);
  const [th,tm]=s.to.split(":").map(Number);
  const p=n=>String(n).padStart(2,"0");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//FCC//EN","BEGIN:VEVENT",
    `DTSTART:${y}${p(mo)}${p(da)}T${p(fh)}${p(fm)}00`,
    `DTEND:${y}${p(mo)}${p(da)}T${p(th)}${p(tm)}00`,
    `SUMMARY:FCC Training – ${fmtShort(s.date)}`,
    `DESCRIPTION:Players: ${s.players.join(", ")}${s.note?"\\nNote: "+s.note:""}`,
    "LOCATION:Karlebo Cricket Ground",
    "END:VEVENT","END:VCALENDAR"].join("\r\n");
}
const dlICS = s => {
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([makeICS(s)],{type:"text/calendar"}));
  a.download=`fcc-nets-${s.date}.ics`; a.click();
};

function waMsg(sessions, date) {
  const day=sessions.filter(s=>s.date===date&&isFuture(s.date));
  if(!day.length) return null;
  let m=`🏏 *FCC Training – ${fmtLong(date)}*\n\n`;
  day.forEach(s=>{
    m+=`⏰ *${s.from} – ${s.to}*${s.label?" · _"+s.label+"_":""}\n`;
    s.players.forEach(p=>m+=`• ${p}\n`);
    if(s.note) m+=`📋 _${s.note}_\n`;
    m+="\n";
  });
  return m+"See you at Karlebo! 🙌";
}

// ─── Colours ──────────────────────────────────────────────────
const G = {
  bg:"#f0fdf4", white:"#fff", green:"#14532d", mid:"#166534",
  lime:"#a3e635", cream:"#fefce8", sand:"#f7fee7",
  text:"#14532d", muted:"#6b7280", border:"rgba(0,0,0,0.09)",
  red:"#dc2626", redBg:"#fee2e2", amber:"#92400e", amberBg:"#fef3c7",
};

const iSt = (extra={}) => ({
  width:"100%", borderRadius:9, border:`1.5px solid ${G.border}`,
  padding:"11px 13px", fontSize:15, fontFamily:"'DM Sans',sans-serif",
  fontWeight:500, background:G.cream, color:G.text,
  outline:"none", boxSizing:"border-box", ...extra,
});

// ─── Atoms ────────────────────────────────────────────────────
const RolePill = ({role}) => {
  const m=ROLE_META[role]||ROLE_META.member;
  return <span style={{background:m.bg,color:m.text,borderRadius:20,padding:"2px 9px",
    fontSize:11,fontWeight:800}}>{m.icon} {m.label}</span>;
};

const TeamPill = ({team,sm}) => {
  const m=getTeamMeta(team||"Unassigned");
  return <span style={{background:m.bg,color:m.text,borderRadius:20,
    padding:sm?"1px 7px":"2px 9px",fontSize:sm?10:11,fontWeight:800}}>{team||"Unassigned"}</span>;
};

const Toast = ({msg}) => (
  <div style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",
    background:G.green,color:G.lime,borderRadius:30,padding:"9px 22px",
    fontSize:14,fontWeight:800,zIndex:9999,whiteSpace:"nowrap",
    boxShadow:"0 6px 24px rgba(0,0,0,.22)"}}>
    {msg}
  </div>
);

const SLbl = ({children,mt=16}) => (
  <div style={{fontSize:10,fontWeight:900,letterSpacing:2,textTransform:"uppercase",
    color:G.mid,marginBottom:7,marginTop:mt}}>{children}</div>
);

const FFld = ({label,children,style}) => (
  <div style={style}>
    <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",
      color:G.mid,marginBottom:4}}>{label}</div>
    {children}
  </div>
);

const BackBtn = ({onClick}) => (
  <button onClick={onClick} style={{background:"rgba(255,255,255,0.15)",border:"none",
    borderRadius:8,color:"#fff",padding:"7px 14px",fontFamily:"inherit",
    fontSize:14,fontWeight:800,cursor:"pointer",flexShrink:0}}>←</button>
);

const Btn = ({onClick,bg,col,children,full,sm,disabled,type="button"}) => (
  <button type={type} onClick={onClick} disabled={disabled}
    style={{background:disabled?"#ccc":bg,color:disabled?"#888":col,border:"none",
      borderRadius:9,padding:sm?"6px 13px":"10px 18px",
      fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:sm?12:14,
      cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",
      opacity:disabled?.7:1,transition:"opacity .15s"}}>
    {children}
  </button>
);

// ─── PIN pad ──────────────────────────────────────────────────
function PinPad({ label, onDone, onCancel, error }) {
  const [val, setVal] = useState("");
  const add = d => { if(val.length<4) setVal(v=>v+d); };
  const del = () => setVal(v=>v.slice(0,-1));
  useEffect(() => { if(val.length===4) onDone(val); }, [val]);

  return (
    <div style={{textAlign:"center",padding:"24px 20px"}}>
      <div style={{fontSize:15,fontWeight:800,color:G.text,marginBottom:20}}>{label}</div>
      {/* dots */}
      <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:28}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{width:18,height:18,borderRadius:"50%",
            background: val.length>i ? G.green : G.border,
            border:`2px solid ${val.length>i?G.green:G.muted}`,
            transition:"background .15s"}}/>
        ))}
      </div>
      {error && <div style={{color:G.red,fontSize:13,fontWeight:700,marginBottom:12}}>{error}</div>}
      {/* keypad */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:220,margin:"0 auto"}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
          <button key={i} onClick={()=>k==="⌫"?del():k!==""?add(String(k)):null}
            style={{background: k===""?"transparent":G.white,
              border: k===""?"none":`1.5px solid ${G.border}`,
              borderRadius:12,padding:"16px 8px",fontSize:20,fontWeight:700,
              cursor:k===""?"default":"pointer",color:G.text,fontFamily:"inherit",
              boxShadow: k===""?"none":"0 1px 4px rgba(0,0,0,.07)"}}>
            {k}
          </button>
        ))}
      </div>
      {onCancel && (
        <button onClick={onCancel} style={{marginTop:20,background:"transparent",
          border:"none",color:G.muted,fontSize:14,fontWeight:700,cursor:"pointer",
          fontFamily:"inherit"}}>Cancel</button>
      )}
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────
function SessCard({s,members,faded,onClick}) {
  return (
    <div onClick={onClick} style={{background:isToday(s.date)?"#f7ffe8":G.white,
      borderRadius:14,padding:"13px 15px",marginBottom:9,
      border:isToday(s.date)?`2px solid ${G.lime}`:`1.5px solid ${G.border}`,
      opacity:faded?.48:1,cursor:"pointer",
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:16,fontWeight:900,color:G.green,letterSpacing:"-.3px"}}>
            {fmtShort(s.date)}
          </span>
          {isToday(s.date)&&<span style={{background:G.lime,color:G.green,borderRadius:20,
            padding:"1px 8px",fontSize:10,fontWeight:900}}>TODAY</span>}
          {s.restrictedTo&&<span style={{background:"#fef9c3",color:"#92400e",borderRadius:20,
            padding:"1px 8px",fontSize:10,fontWeight:800}}>🔒 {s.restrictedTo}</span>}
          {s.recurringId&&!s.restrictedTo&&<span style={{background:"#f0f9ff",color:"#0369a1",
            borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:800}}>↻</span>}
          {s.label&&<span style={{background:"#ede9fe",color:"#5b21b6",borderRadius:20,
            padding:"1px 8px",fontSize:10,fontWeight:800}}>{s.label}</span>}
        </div>
        <div style={{fontSize:12,color:G.muted,marginTop:2}}>{s.from} – {s.to}</div>
        <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
          {s.players.slice(0,5).map((p,i)=>{
            const mem=members.find(m=>m.name===p);
            const firstTeam=(mem?.teams||[])[0]||null;
            const tm=getTeamMeta(firstTeam||"Unassigned");
            return <span key={i} style={{background:tm.bg,color:tm.text,borderRadius:20,
              padding:"2px 8px",fontSize:11,fontWeight:700}}>{p}</span>;
          })}
          {s.players.length>5&&<span style={{fontSize:11,color:G.muted,padding:"2px 4px"}}>
            +{s.players.length-5}</span>}
        </div>
      </div>
      <div style={{background:G.green,color:G.lime,borderRadius:"50%",width:36,height:36,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontWeight:900,fontSize:16,flexShrink:0,marginLeft:10}}>
        {s.players.length}
      </div>
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────
function BotNav({view,setView,userRole}) {
  const isAdmin = can(userRole,"accessMembers");
  const active = view==="session"?"schedule":view==="roleAdmin"?"admin":view;

  const IconSchedule = ({on}) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on?2.5:1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
  const IconMembers = ({on}) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on?2.5:1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  const IconProfile = ({on}) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={on?2.5:1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );

  const tabStyle = (on) => ({
    flex:1, background:"none", border:"none", cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif", padding:"6px 4px",
    display:"flex", flexDirection:"column", alignItems:"center", gap:3,
    color: on ? G.green : "#94a3b8", transition:"color .15s",
  });
  const labelStyle = (on) => ({
    fontSize:10, fontWeight: on?800:600, letterSpacing:.3,
  });

  return (
    <div className="fcc-mobile-only" style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:500, zIndex:200,
      background:"rgba(255,255,255,0.97)",
      backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
      borderTop:"1px solid rgba(0,0,0,0.08)",
      boxShadow:"0 -4px 24px rgba(0,0,0,0.07)",
      display:"flex", alignItems:"flex-end", justifyContent:"space-around",
      padding:"8px 12px 12px",
      paddingBottom:"max(12px, env(safe-area-inset-bottom))",
    }}>
      {/* Schedule */}
      <button onClick={()=>setView("schedule")} style={tabStyle(active==="schedule")}>
        <IconSchedule on={active==="schedule"}/>
        <span style={labelStyle(active==="schedule")}>Schedule</span>
      </button>

      {/* Add / Join — floating circle, always centred */}
      <div style={{flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"flex-end"}}>
        <button onClick={()=>setView("add")} style={{
          width:54, height:54, borderRadius:"50%", border:"none", cursor:"pointer",
          background: active==="add"
            ? `linear-gradient(135deg,${G.green},#166534)`
            : `linear-gradient(135deg,#16a34a,${G.green})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow: active==="add"
            ? `0 0 0 4px ${G.lime}70, 0 4px 20px rgba(20,83,45,.45)`
            : "0 4px 18px rgba(20,83,45,.32)",
          transform: active==="add" ? "scale(1.07) translateY(-4px)" : "translateY(-4px)",
          transition:"all .18s", marginBottom:2,
        }}>
          <span style={{fontSize:24,color:"#fff",fontWeight:900,lineHeight:1,
            transform:active==="add"?"rotate(45deg)":"rotate(0)",
            transition:"transform .18s", display:"block"}}>+</span>
        </button>
        <span style={{...labelStyle(active==="add"),
          color:active==="add"?G.green:"#94a3b8", marginTop:2}}>Book</span>
      </div>

      {/* Members (admin) OR Profile (all users) */}
      {isAdmin ? (
        <button onClick={()=>setView("admin")} style={tabStyle(active==="admin")}>
          <IconMembers on={active==="admin"}/>
          <span style={labelStyle(active==="admin")}>Members</span>
        </button>
      ) : (
        <button onClick={()=>setView("profile")} style={tabStyle(active==="profile")}>
          <IconProfile on={active==="profile"}/>
          <span style={labelStyle(active==="profile")}>Profile</span>
        </button>
      )}
    </div>
  );
}

// ─── Desktop Sidebar Nav ──────────────────────────────────────
function SidebarNav({view, setView, userRole, currentUser, onLogout}) {
  const isAdmin = can(userRole,"accessMembers");
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
      <img src={FCC_LOGO} alt="FCC" className="fcc-sidebar-logo"/>
      <div>
        <div className="fcc-sidebar-title">FCC Training</div>
        <div className="fcc-sidebar-sub" style={{marginTop:4}}>Karlebo</div>
      </div>
      <div className="fcc-sidebar-links">
        {navBtn("schedule","📅","Schedule")}
        {navBtn("add","＋","Book / Join")}
        {isAdmin && navBtn("admin","👥","Members")}
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

// ─── Shell ────────────────────────────────────────────────────
function Shell({children, sidebar}) {
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:G.bg,minHeight:"100vh",
      display:"flex",justifyContent:"center",alignItems:"flex-start"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;0,800;0,900;1,400&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet"/>
      <style>{`
        @media(min-width:900px){
          .fcc-sidebar{
            display:flex!important;flex-direction:column;align-items:flex-start;
            padding:40px 28px;width:240px;flex-shrink:0;
            min-height:100vh;position:sticky;top:0;align-self:flex-start;
            background:${G.green};gap:20px;
          }
          .fcc-sidebar-logo{width:72px;height:72px;border-radius:50%;object-fit:cover;
            border:3px solid rgba(255,255,255,.3);display:block;}
          .fcc-sidebar-title{font-family:'Playfair Display',serif;font-weight:900;
            font-size:20px;color:#fff;line-height:1.2;}
          .fcc-sidebar-sub{font-size:11px;color:rgba(255,255,255,.45);letter-spacing:2px;
            text-transform:uppercase;margin-top:2px;}
          .fcc-sidebar-links{display:flex;flex-direction:column;gap:4px;width:100%;margin-top:4px;}
          .fcc-mobile-only{display:none!important;}
          .fcc-app-pane{max-width:520px;width:100%;min-height:100vh;
            border-left:1px solid ${G.border};border-right:1px solid ${G.border};}
        }
        @media(max-width:899px){
          .fcc-sidebar{display:none!important;}
          .fcc-app-pane{max-width:500px;width:100%;margin:0 auto;}
        }
      `}</style>
      {/* Sidebar slot — only visible on desktop via CSS */}
      {sidebar && <div className="fcc-sidebar">{sidebar}</div>}
      {/* Main content pane */}
      <div className="fcc-app-pane" style={{position:"relative",paddingBottom:90,background:G.bg}}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [sessions, setSessions] = useState([]);
  const [members,  setMembers]  = useState([]);
  const [pins,     setPins]     = useState({});   // { memberId: hashedPin }
  const [loading,  setLoading]  = useState(true);

  // Auth state — restore from localStorage if previously logged in
  const [currentUser, setCurrentUser] = useState(()=>{
    try { const s=localStorage.getItem("fcc-current-user"); return s?JSON.parse(s):null; } catch{ return null; }
  });
  const [authView, setAuthView]       = useState("pick");
  const [pickSearch, setPickSearch]   = useState("");
  const [pinError,   setPinError]     = useState("");
  const [pendingMember, setPendingMember] = useState(null);

  // App view
  const [view,     setView]     = useState("schedule");
  const [selSess,  setSelSess]  = useState(null);
  const [toast,    setToast]    = useState(null);

  // Dynamic teams
  const [teams, setTeams] = useState(DEFAULT_TEAMS);
  const seniorTeamNames = teams.filter(t=>t.senior).map(t=>t.name);
  const ALL_TEAMS = [...teams.map(t=>t.name), "Unassigned"];

  // Recurring slots
  const [recurring, setRecurring] = useState([]);

  // Add session form
  const [bDate,    setBDate]    = useState("");
  const [bFrom,    setBFrom]    = useState("18:00");
  const [bTo,      setBTo]      = useState("20:00");
  const [bNote,    setBNote]    = useState("");
  const [bLabel,   setBLabel]   = useState("");
  const [bRestrictTeam, setBRestrictTeam] = useState("");
  const [selP,     setSelP]     = useState([]);
  const [pSearch,  setPSearch]  = useState("");
  const [pFilter,  setPFilter]  = useState("All");
  // Poll builder
  const [bPollOpts, setBPollOpts] = useState([]);
  const [bCustomOpt,setBCustomOpt]= useState("");

  // Admin state
  const [newName,  setNewName]  = useState("");
  const [newTeam,  setNewTeam]  = useState("Unassigned");
  const [aSearch,  setASearch]  = useState("");
  const [aFilter,  setAFilter]  = useState("All");
  const [editingRole, setEditingRole] = useState(null);

  // Team management state
  const [newTName,  setNewTName]  = useState("");
  const [newTSenior,setNewTSenior]= useState(false);
  const [editingTeam,setEditingTeam]= useState(null);
  const [editingName, setEditingName] = useState(null); // {id, value}

  // Recurring slot form state
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const [rName,       setRName]      = useState("");
  const [rTeam,       setRTeam]      = useState("");
  const [rRestrict,   setRRestrict]  = useState(false);
  const [rDay,        setRDay]       = useState(6); // Saturday
  const [rFrom,       setRFrom]      = useState("14:00");
  const [rTo,         setRTo]        = useState("15:30");
  const [rActiveFrom, setRActiveFrom]= useState(todayStr());
  const [rActiveTo,   setRActiveTo]  = useState("");
  const [editingSlot, setEditingSlot]= useState(null);

  const userRole = currentUser?.role || "member";
  const showToast = m => { setToast(m); setTimeout(()=>setToast(null),2700); };

  // Keep cached currentUser in sync if their role/team changes in Firebase
  useEffect(()=>{
    if(!currentUser || members.length===0) return;
    const fresh = members.find(m=>m.id===currentUser.id);
    if(fresh && (fresh.role!==currentUser.role
      || JSON.stringify(fresh.teams)!==JSON.stringify(currentUser.teams)
      || fresh.name!==currentUser.name)) {
      setCurrentUser(fresh);
      localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
    }
  },[members]);

  // ── Load + real-time sync via Firestore ──────────────────────
  useEffect(()=>{
    const refs = {
      sessions:  doc(db,"fccnets","sessions"),
      members:   doc(db,"fccnets","members"),
      pins:      doc(db,"fccnets","pins"),
      teams:     doc(db,"fccnets","teams"),
      recurring: doc(db,"fccnets",RECURRING_KEY),
      blockcals: doc(db,"fccnets","blockcals"),
    };
    (async()=>{
      try {
        const [mr,pr,tr,rr,br] = await Promise.all([
          getDoc(refs.members),
          getDoc(refs.pins),
          getDoc(refs.teams),
          getDoc(refs.recurring),
          getDoc(refs.blockcals),
        ]);
        setMembers(  mr.exists() ? JSON.parse(mr.data().value).map(normMember) : SEED_MEMBERS.map(normMember));
        setPins(     pr.exists() ? JSON.parse(pr.data().value) : {});
        setTeams(    tr.exists() ? JSON.parse(tr.data().value) : DEFAULT_TEAMS);
        setRecurring(rr.exists() ? JSON.parse(rr.data().value) : []);
        setBlockCals(br.exists() ? JSON.parse(br.data().value) : []);
      } catch(e) {
        setMembers(SEED_MEMBERS.map(normMember)); setPins({}); setTeams(DEFAULT_TEAMS); setRecurring([]); setBlockCals([]);
      }
      setLoading(false);
    })();
    const unsub = onSnapshot(refs.sessions, snap => {
      setSessions(snap.exists() ? JSON.parse(snap.data().value) : []);
    }, () => setSessions([]));
    return () => unsub();
  },[]);

  const saveSessions  = async u => { setSessions(u);  await setDoc(doc(db,"fccnets","sessions"), {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveMembers   = async u => { setMembers(u);   await setDoc(doc(db,"fccnets","members"),  {value:JSON.stringify(u)}).catch(()=>{}); };
  const savePins      = async u => { setPins(u);      await setDoc(doc(db,"fccnets","pins"),     {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveTeams     = async u => { setTeams(u);     await setDoc(doc(db,"fccnets","teams"),    {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveRecurring = async u => { setRecurring(u); await setDoc(doc(db,"fccnets",RECURRING_KEY),{value:JSON.stringify(u)}).catch(()=>{}); };
  const saveBlockCals = async u => { setBlockCals(u); await setDoc(doc(db,"fccnets","blockcals"),{value:JSON.stringify(u)}).catch(()=>{}); };

  // ── Auto-generate recurring sessions ─────────────────────────
  useEffect(()=>{
    if(loading || recurring.length===0) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const toAdd = [];
    recurring.forEach(slot=>{
      if(!slot.enabled) return;
      for(let i=0; i<=21; i++){
        const d = new Date(today); d.setDate(today.getDate()+i);
        if(d.getDay() !== slot.day) continue;
        const dateStr = d.toISOString().split("T")[0];
        if(slot.activeFrom && dateStr < slot.activeFrom) continue;
        if(slot.activeTo   && dateStr > slot.activeTo)   continue;
        const exists = sessions.find(s=>
          s.recurringId===slot.id && s.date===dateStr);
        if(!exists) toAdd.push({
          id:uid(), date:dateStr, from:slot.from, to:slot.to,
          label:slot.name, note:"", players:[], poll:[],
          restrictedTo: slot.restrictTeam ? slot.team : null,
          recurringId: slot.id,
        });
      }
    });
    if(toAdd.length>0){
      const merged = [...sessions,...toAdd].sort((a,b)=>
        new Date(a.date)-new Date(b.date)||a.from.localeCompare(b.from));
      saveSessions(merged);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loading, recurring]);

  // ── Auth flow ─────────────────────────────────────────────────
  function handlePickMember(member) {
    setPendingMember(member);
    setPinError("");
    if(pins[member.id]) setAuthView("enterpin");
    else setAuthView("newpin");
  }

  function handleNewPin(pin) {
    const updated = {...pins, [pendingMember.id]: hashPin(pin)};
    savePins(updated);
    setCurrentUser(pendingMember);
    localStorage.setItem("fcc-current-user", JSON.stringify(pendingMember));
    setPendingMember(null);
    setAuthView("pick");
    showToast(`Welcome, ${pendingMember.name.split(" ")[0]}! PIN set ✓`);
  }

  function handleEnterPin(pin) {
    if(hashPin(pin) === pins[pendingMember.id]) {
      setCurrentUser(pendingMember);
      localStorage.setItem("fcc-current-user", JSON.stringify(pendingMember));
      setPendingMember(null);
      setPinError("");
      setAuthView("pick");
      showToast(`Welcome back, ${pendingMember.name.split(" ")[0]}! 👋`);
    } else {
      setPinError("Wrong PIN, try again");
      setTimeout(()=>setPinError(""),2000);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem("fcc-current-user");
    setAuthView("pick");
    setPickSearch("");
    setView("schedule");
  }

  // ── Auto-select current user when opening Add Session ────────
  useEffect(()=>{
    if(view==="add" && currentUser) {
      setSelP(ps => ps.includes(currentUser.name) ? ps : [currentUser.name, ...ps]);
      setPSearch(""); setPFilter("All");
    }
  },[view]);

  // ── Team CRUD ─────────────────────────────────────────────────
  function addTeam(e) {
    e.preventDefault();
    const n = newTName.trim();
    if(!n) return;
    if(teams.find(t=>t.name.toLowerCase()===n.toLowerCase())) {
      showToast("A team with that name already exists"); return;
    }
    saveTeams([...teams, {id:uid(), name:n, senior:newTSenior}]);
    setNewTName(""); setNewTSenior(false);
    showToast(`Group "${n}" added ✓`);
  }

  function renameTeam(id, newName) {
    const n = newName.trim();
    if(!n) return;
    const old = teams.find(t=>t.id===id)?.name;
    if(!old) return;
    // Update all members on the old team name
    saveMembers(members.map(m=>m.team===old ? {...m,team:n} : m));
    saveTeams(teams.map(t=>t.id===id ? {...t,name:n} : t));
    setEditingTeam(null);
    showToast(`Renamed to "${n}" ✓`);
  }

  function deleteTeam(id) {
    const t = teams.find(t=>t.id===id);
    if(!t) return;
    if(!window.confirm(`Delete group "${t.name}"? Members in this group will be moved to Unassigned.`)) return;
    saveMembers(members.map(m=>m.team===t.name ? {...m,team:null,role:"member"} : m));
    saveTeams(teams.filter(t=>t.id!==id));
    showToast(`Group "${t.name}" deleted`);
  }

  function toggleTeamSenior(id) {
    const t = teams.find(t=>t.id===id);
    if(!t) return;
    if(t.senior) {
      saveMembers(members.map(m=>
        m.team===t.name && ["captain","vicecaptain"].includes(m.role)
          ? {...m,role:"member"} : m
      ));
    }
    saveTeams(teams.map(t=>t.id===id ? {...t,senior:!t.senior} : t));
    showToast(`"${t.name}" set to ${t.senior?"Youth":"Senior"} ✓`);
  }

  // ── Recurring slots ───────────────────────────────────────────
  function addRecurringSlot(slot) {
    const next = [...recurring, {...slot, id:uid(), enabled:true}];
    saveRecurring(next);
    showToast(`Recurring slot "${slot.name}" added ✓`);
  }
  function toggleRecurringSlot(id) {
    const next = recurring.map(r=>r.id===id ? {...r,enabled:!r.enabled} : r);
    saveRecurring(next);
  }
  function deleteRecurringSlot(id) {
    const slot = recurring.find(r=>r.id===id);
    if(!slot) return;
    if(!window.confirm(`Delete recurring slot "${slot.name}"? Existing sessions from this slot are kept.`)) return;
    saveRecurring(recurring.filter(r=>r.id!==id));
    showToast(`Slot "${slot.name}" deleted`);
  }
  function updateRecurringSlot(id, changes) {
    saveRecurring(recurring.map(r=>r.id===id ? {...r,...changes} : r));
    showToast("Slot updated ✓");
  }

  // ── Sessions ──────────────────────────────────────────────────
  function handleAddSession(e) {
    e.preventDefault();
    if(!bDate||selP.length===0){showToast("Pick a date & at least one player");return;}
    const pollOptions = bPollOpts.map(o=>({...o, votes:[]}));
    const restrictedTo = bRestrictTeam || null;
    const ex=sessions.find(s=>s.date===bDate&&s.from===bFrom&&s.to===bTo&&!s.recurringId);
    if(ex){
      const merged=[...new Set([...ex.players,...selP])];
      const mergedPoll = ex.poll || [];
      const existingIds = mergedPoll.map(o=>o.id);
      const newOpts = pollOptions.filter(o=>!existingIds.includes(o.id));
      saveSessions(sessions.map(s=>s.id===ex.id?{...s,players:merged,
        label:s.label||bLabel,restrictedTo:s.restrictedTo||restrictedTo,
        poll:[...mergedPoll,...newOpts]}:s));
      showToast(`Players added to session on ${fmtShort(bDate)} ✓`);
    } else {
      saveSessions([...sessions,{id:uid(),date:bDate,from:bFrom,to:bTo,
        players:[...selP],note:bNote.trim(),label:bLabel.trim(),
        restrictedTo,poll:pollOptions}]
        .sort((a,b)=>new Date(a.date)-new Date(b.date)));
      showToast(`Session booked for ${fmtShort(bDate)} ✓`);
    }
    setBDate("");setBNote("");setBLabel("");setBRestrictTeam("");
    setSelP([]);setBPollOpts([]);setBCustomOpt("");
    setView("schedule");
  }

  function handleVote(sessId, optionId) {
    const userName = currentUser.name;
    const updated = sessions.map(s => {
      if(s.id !== sessId) return s;
      const poll = (s.poll||[]).map(o => {
        if(o.id !== optionId) return o;
        const hasVoted = (o.votes||[]).includes(userName);
        return {...o, votes: hasVoted
          ? o.votes.filter(v=>v!==userName)
          : [...(o.votes||[]), userName]};
      });
      return {...s, poll};
    });
    saveSessions(updated);
    // Keep selSess in sync
    const found = updated.find(s=>s.id===sessId);
    if(found) setSelSess(found);
  }

  function handleLeave(sessId, name) {
    const upd=sessions.map(s=>s.id===sessId
      ?{...s,players:s.players.filter(p=>p!==name)}:s).filter(s=>s.players.length>0);
    saveSessions(upd);
    const found=upd.find(s=>s.id===sessId);
    if(!found){setView("schedule");setSelSess(null);}
    else setSelSess(found);
    showToast("Removed from session");
  }

  function handleJoinDetail(name) {
    if(!selSess) return;
    if(selSess.players.includes(name)){showToast("Already in this session");return;}
    const upd=sessions.map(s=>s.id===selSess.id?{...s,players:[...s.players,name]}:s);
    saveSessions(upd);
    setSelSess(upd.find(s=>s.id===selSess.id));
    showToast(`${name.split(" ")[0]} added ✓`);
  }

  function handleDeleteSess(id) {
    saveSessions(sessions.filter(s=>s.id!==id));
    setView("schedule");setSelSess(null);
    showToast("Session deleted");
  }

  function openWA(date) {
    const msg=waMsg(sessions,date);
    if(!msg){showToast("No sessions for that date");return;}
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
  }

  // ── Members ───────────────────────────────────────────────────
  function addMember(e) {
    e.preventDefault();
    if(!newName.trim()) return;
    if(members.find(m=>m.name.toLowerCase()===newName.trim().toLowerCase())){
      showToast("Member already exists"); return;
    }
    saveMembers([...members,{id:uid(),name:newName.trim(),
      teams:newTeam==="Unassigned"?[]:[newTeam],role:"member"}]);
    setNewName(""); showToast("Member added ✓");
  }

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [schedFilter,   setSchedFilter]   = useState("all"); // "all" | "mine"
  const [blockCals,     setBlockCals]     = useState([]);    // [{id,date,from,to,label}]
  const [bCalDate,      setBCalDate]      = useState("");
  const [bCalFrom,      setBCalFrom]      = useState("10:00");
  const [bCalTo,        setBCalTo]        = useState("14:00");
  const [bCalLabel,     setBCalLabel]     = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false); // member object to confirm delete
  const [profileEmail, setProfileEmail]   = useState("");
  const [profilePhone, setProfilePhone]   = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [changingPin,  setChangingPin]    = useState(false);
  const [oldPin,       setOldPin]         = useState("");
  const [newPin1,      setNewPin1]        = useState("");
  const [newPin2,      setNewPin2]        = useState("");
  const [pinMsg,       setPinMsg]         = useState("");

  function removeMember(id) {
    saveMembers(members.filter(m=>m.id!==id));
    setConfirmDelete(null);
    showToast("Member removed");
  }

  function renameMember(id, newName) {
    const trimmed = newName.trim();
    if(!trimmed) { setEditingName(null); return; }
    const old = members.find(m=>m.id===id)?.name;
    if(!old || trimmed===old) { setEditingName(null); return; }
    if(members.find(m=>m.id!==id && m.name.toLowerCase()===trimmed.toLowerCase())) {
      showToast("Another member already has that name"); return;
    }
    // Update member name
    saveMembers(members.map(m=>m.id===id ? {...m,name:trimmed} : m));
    // Update all sessions that reference the old name
    const updSess = sessions.map(s=>({
      ...s,
      players: s.players.map(p=>p===old ? trimmed : p),
      poll: (s.poll||[]).map(o=>({
        ...o, votes:(o.votes||[]).map(v=>v===old ? trimmed : v)
      })),
    }));
    saveSessions(updSess);
    setEditingName(null);
    showToast(`Renamed to "${trimmed}" ✓`);
  }

  function toggleMemberTeam(id, teamName) {
    const mem = members.find(m=>m.id===id);
    if(!mem) return;
    const current = mem.teams || [];
    const next = current.includes(teamName)
      ? current.filter(t=>t!==teamName)
      : [...current, teamName];
    // If no senior team remains and role is captain/VC, demote
    const hasSenior = next.some(t=>seniorTeamNames.includes(t));
    const newRole = (!hasSenior && ["captain","vicecaptain"].includes(mem.role))
      ? "member" : mem.role;
    saveMembers(members.map(m=>m.id===id ? {...m,teams:next,role:newRole} : m));
  }

  function updateRole(id, role) {
    const mem = members.find(m=>m.id===id);
    const hasSenior = (mem?.teams||[]).some(t=>seniorTeamNames.includes(t));
    if(["captain","vicecaptain"].includes(role) && !hasSenior) {
      showToast("Captain/VC only available for Senior team members"); return;
    }
    saveMembers(members.map(m=>m.id===id?{...m,role}:m));
    setEditingRole(null);
    showToast("Role updated ✓");
  }

  function saveProfile(confirmed=false) {
    const now = new Date().toISOString();
    const updated = members.map(m => m.id===currentUser.id
      ? {...m,
          email: profileEmail.trim(),
          phone: profilePhone.trim(),
          profileConfirmedAt: confirmed ? now : (m.profileConfirmedAt||null),
        } : m);
    saveMembers(updated);
    const fresh = updated.find(m=>m.id===currentUser.id);
    setCurrentUser(fresh);
    localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
    setProfileEditing(false);
    showToast(confirmed ? "Profile confirmed ✓" : "Profile saved ✓");
  }

  function confirmProfile() {
    // Save current details + stamp confirmed date
    setProfileEmail(members.find(m=>m.id===currentUser.id)?.email||"");
    setProfilePhone(members.find(m=>m.id===currentUser.id)?.phone||"");
    saveProfile(true);
  }

  function handleChangePin() {
    if(!oldPin||!newPin1||!newPin2){setPinMsg("Fill in all fields");return;}
    if(hashPin(oldPin)!==pins[currentUser.id]){setPinMsg("Current PIN is incorrect");return;}
    if(newPin1.length!==4||!/^\d+$/.test(newPin1)){setPinMsg("New PIN must be 4 digits");return;}
    if(newPin1!==newPin2){setPinMsg("New PINs don't match");return;}
    savePins({...pins,[currentUser.id]:hashPin(newPin1)});
    setChangingPin(false);setOldPin("");setNewPin1("");setNewPin2("");setPinMsg("");
    showToast("PIN changed ✓");
  }

  function resetPin(id) {
    const updated={...pins}; delete updated[id];
    savePins(updated);
    showToast("PIN cleared — member sets new PIN on next login");
  }

  // ── Computed ──────────────────────────────────────────────────
  const upcoming = [...sessions].filter(s=>isFuture(s.date))
    .sort((a,b)=>new Date(a.date)-new Date(b.date)||a.from.localeCompare(b.from));
  const past=[...sessions].filter(s=>!isFuture(s.date))
    .sort((a,b)=>new Date(b.date)-new Date(a.date));

  const tomorrowSess=sessions.filter(s=>s.date===tomorrowStr()&&isFuture(s.date));
  const todaySess   =sessions.filter(s=>s.date===todayStr()   &&isFuture(s.date));

  // Player picker — member appears under EACH of their teams
  const pickVisible = members.filter(m=>
    !pSearch || m.name.toLowerCase().includes(pSearch.toLowerCase())
  );
  const pickGrouped = ALL_TEAMS.reduce((acc,t)=>{
    if(pFilter!=="All" && pFilter!==t) return acc;
    const list = pickVisible.filter(m=>
      t==="Unassigned"
        ? (m.teams||[]).length===0
        : (m.teams||[]).includes(t)
    );
    if(list.length) acc[t]=list;
    return acc;
  },{});

  // Admin list — member shown under EACH team (or Unassigned if none)
  const adminVisible = members.filter(m=>{
    const q=!aSearch||m.name.toLowerCase().includes(aSearch.toLowerCase());
    const t=aFilter==="All"
      ||(aFilter==="Unassigned" && (m.teams||[]).length===0)
      ||(m.teams||[]).includes(aFilter);
    return q&&t;
  });
  const adminGrouped = ALL_TEAMS.reduce((acc,t)=>{
    if(aFilter!=="All"&&aFilter!==t) return acc;
    const list = adminVisible.filter(m=>
      t==="Unassigned"
        ? (m.teams||[]).length===0
        : (m.teams||[]).includes(t)
    );
    if(list.length) acc[t]=list;
    return acc;
  },{});

  // ════════════════════════════════════════════════════════════
  // RENDER: Loading
  // ════════════════════════════════════════════════════════════
  if(loading) return (
    <Shell>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
        <div style={{textAlign:"center",color:G.mid}}>
          <div style={{fontSize:48,marginBottom:12}}>🏏</div>
          <div style={{fontWeight:800,fontSize:18}}>Loading FCC Training…</div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — pick member
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="pick") {
    const filtered = pickSearch.trim().length >= 1
      ? members.filter(m => m.name.toLowerCase().includes(pickSearch.toLowerCase()))
      : [];
    const hasQuery = pickSearch.trim().length >= 1;

    return (
      <Shell>
        {/* Header */}
        <div style={{background:G.green, padding:"36px 24px 32px", textAlign:"center"}}>
          <img src={FCC_LOGO} alt="FCC" style={{width:88,height:88,borderRadius:"50%",
            objectFit:"cover",margin:"0 auto 14px",display:"block",
            border:"3px solid rgba(255,255,255,0.25)",
            boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}/>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:28,fontWeight:900,letterSpacing:"-.5px",lineHeight:1}}>FCC Training</div>
          <div style={{color:"rgba(255,255,255,0.45)",fontSize:11,fontWeight:700,
            letterSpacing:2.5,textTransform:"uppercase",marginTop:5}}>Karlebo · Fredensborg CC</div>
        </div>

        <div style={{padding:"24px 20px 40px"}}>
          {/* Prompt text */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:16,fontWeight:800,color:G.text}}>Who are you?</div>
            <div style={{fontSize:13,color:G.muted,marginTop:4}}>
              Type your name to find yourself
            </div>
          </div>

          {/* Search input */}
          <div style={{position:"relative",marginBottom:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
              fontSize:18,pointerEvents:"none"}}>🔍</span>
            <input
              style={{...iSt({background:G.white,paddingLeft:44,fontSize:16,
                borderRadius:14,padding:"14px 14px 14px 44px",
                boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}),}}
              placeholder="Start typing your name…"
              value={pickSearch}
              onChange={e=>setPickSearch(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Results as chips */}
          {hasQuery && filtered.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:9,justifyContent:"center",
              marginTop:8}}>
              {filtered.map(m=>{
                const tm = m.team ? getTeamMeta(m.team) : null;
                return (
                  <button key={m.id} onClick={()=>handlePickMember(m)}
                    style={{
                      background: tm ? tm.bg : G.green,
                      color: tm ? tm.text : G.lime,
                      border:"none", borderRadius:30,
                      padding:"10px 18px",
                      fontFamily:"inherit", fontWeight:800, fontSize:14,
                      cursor:"pointer",
                      display:"flex", alignItems:"center", gap:7,
                      boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
                      transition:"transform .1s, box-shadow .1s",
                    }}
                    onMouseDown={e=>e.currentTarget.style.transform="scale(0.96)"}
                    onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
                  >
                    <span style={{width:24,height:24,borderRadius:"50%",
                      background:"rgba(255,255,255,0.2)",display:"inline-flex",
                      alignItems:"center",justifyContent:"center",
                      fontSize:10,fontWeight:900,flexShrink:0}}>
                      {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                    </span>
                    {m.name}
                    {m.role && m.role !== "member" && (
                      <span style={{fontSize:12}}>{ROLE_META[m.role]?.icon}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {hasQuery && filtered.length === 0 && (
            <div style={{textAlign:"center",padding:"30px 0"}}>
              <div style={{fontSize:32,marginBottom:8}}>🤔</div>
              <div style={{fontWeight:800,color:G.text,fontSize:15}}>Not found</div>
              <div style={{fontSize:13,color:G.muted,marginTop:4}}>
                Ask an admin to add you to the app.
              </div>
            </div>
          )}

          {/* Idle hint */}
          {!hasQuery && (
            <div style={{textAlign:"center",padding:"20px 0 0"}}>
              <div style={{fontSize:40,marginBottom:10,opacity:.4}}>🏏</div>
              <div style={{fontSize:13,color:G.muted,lineHeight:1.7}}>
                {members.length} members registered<br/>
                <span style={{fontWeight:700,color:G.text}}>Type at least 1 letter</span> to find your name
              </div>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — set new PIN
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="newpin") return (
    <Shell>
      <div style={{background:G.green,padding:"24px 20px",textAlign:"center"}}>
        <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
          fontSize:20,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
        <div style={{color:"rgba(255,255,255,0.6)",fontSize:13,marginTop:4}}>
          First time? Set your 4-digit PIN
        </div>
      </div>
      <PinPad
        label="Choose a 4-digit PIN"
        onDone={handleNewPin}
        onCancel={()=>{ setPendingMember(null); setAuthView("pick"); }}
        error={pinError}
      />
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — enter PIN
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="enterpin") return (
    <Shell>
      <div style={{background:G.green,padding:"24px 20px",textAlign:"center"}}>
        <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
          fontSize:20,fontWeight:900}}>Welcome back, {pendingMember?.name.split(" ")[0]}!</div>
        <div style={{color:"rgba(255,255,255,0.6)",fontSize:13,marginTop:4}}>Enter your PIN</div>
      </div>
      <PinPad
        label="Enter your 4-digit PIN"
        onDone={handleEnterPin}
        onCancel={()=>{ setPendingMember(null); setAuthView("pick"); }}
        error={pinError}
      />
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: App (authenticated)
  // ════════════════════════════════════════════════════════════

  // ── Header bar ─────────────────────────────────────────────
  const AppHeader = ({onBack,title,sub,children}) => (
    <div style={{background:G.green,padding:"15px 18px",
      position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:children?10:0}}>
        {onBack&&<BackBtn onClick={onBack}/>}
        <div style={{flex:1}}>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900,lineHeight:1.2}}>{title}</div>
          {sub&&<div style={{color:"rgba(255,255,255,0.55)",fontSize:12,marginTop:2}}>{sub}</div>}
        </div>
        {/* User pill */}
        <button onClick={handleLogout}
          style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:20,
            padding:"5px 10px",color:"rgba(255,255,255,0.8)",fontSize:11,fontWeight:800,
            cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
          <span>{currentUser.name.split(" ")[0]}</span>
          <span style={{opacity:.6}}>· sign out</span>
        </button>
      </div>
      {children}
    </div>
  );

  // ── SCHEDULE ────────────────────────────────────────────────
  if(view==="schedule") {
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
        currentUser={currentUser} onLogout={handleLogout}/>}>
      <AppHeader title="FCC Training" sub="Karlebo · Fredensborg Cricket Club">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src={FCC_LOGO} alt="FCC" style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"2px solid rgba(255,255,255,0.3)"}}/>
            <div>
              <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
                fontSize:22,fontWeight:900,lineHeight:1,letterSpacing:"-.5px"}}>FCC Training</div>
              <div style={{color:"rgba(255,255,255,.45)",fontSize:10,fontWeight:700,
                letterSpacing:2,textTransform:"uppercase"}}>Karlebo</div>
            </div>
          </div>
          <Btn onClick={()=>setView("add")} bg={G.lime} col={G.green}>+ Add / Join</Btn>
        </div>

        {/* Filter toggle */}
        <div style={{display:"flex",gap:6,marginTop:10}}>
          {["all","mine"].map(f=>(
            <button key={f} onClick={()=>setSchedFilter(f)}
              style={{flex:1,padding:"7px 0",borderRadius:20,border:"none",
                cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:12,
                background: schedFilter===f ? G.lime : "rgba(255,255,255,.15)",
                color: schedFilter===f ? G.green : "rgba(255,255,255,.75)",
                transition:"all .15s"}}>
              {f==="all" ? "🏏 All Sessions" : "✋ My Sessions"}
            </button>
          ))}
        </div>

        {can(userRole,"sendReminder")&&tomorrowSess.length>0&&(
          <div style={{marginTop:10,background:"rgba(163,230,53,.13)",borderRadius:10,
            padding:"9px 13px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{color:"rgba(255,255,255,.85)",fontSize:12,fontWeight:700}}>
              📅 {tomorrowSess.reduce((n,s)=>n+s.players.length,0)} players booked tomorrow
            </div>
            <Btn onClick={()=>openWA(tomorrowStr())} bg={G.lime} col={G.green} sm>📲 Send Reminder</Btn>
          </div>
        )}
        {can(userRole,"sendReminder")&&todaySess.length>0&&(
          <div style={{marginTop:8,background:"rgba(255,255,255,.08)",borderRadius:10,
            padding:"9px 13px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{color:"rgba(255,255,255,.85)",fontSize:12,fontWeight:700}}>🟢 Training TODAY</div>
            <Btn onClick={()=>openWA(todayStr())} bg="rgba(255,255,255,.18)" col={G.white} sm>📲 Share Today</Btn>
          </div>
        )}
      </AppHeader>

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

        {/* Block calendar notices */}
        {upcomingBlocks.length>0&&(
          <div style={{marginBottom:14}}>
            <SLbl mt={0}>🚫 Ground Blocked</SLbl>
            {upcomingBlocks.map(b=>(
              <div key={b.id} style={{background:"#fff7ed",border:"1.5px solid #fed7aa",
                borderRadius:10,padding:"10px 14px",marginBottom:6,
                display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:800,fontSize:13,color:"#c2410c"}}>
                    🏏 {b.label||"Ground Blocked"} — {fmtShort(b.date)}
                  </div>
                  <div style={{fontSize:12,color:"#9a3412",marginTop:2}}>
                    {b.from} – {b.to} · Nets unavailable (match day)
                  </div>
                </div>
                {can(userRole,"deleteSession")&&(
                  <button type="button" onClick={()=>saveBlockCals(blockCals.filter(x=>x.id!==b.id))}
                    style={{background:"#fee2e2",color:"#dc2626",border:"none",
                      borderRadius:6,padding:"4px 8px",fontSize:12,cursor:"pointer",
                      fontFamily:"inherit",fontWeight:800,flexShrink:0}}>×</button>
                )}
              </div>
            ))}
          </div>
        )}

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
            {filteredUpcoming.length>0&&<>
              <SLbl mt={4}>Upcoming</SLbl>
              {filteredUpcoming.map(s=><SessCard key={s.id} s={s} members={members}
                onClick={()=>{setSelSess(s);setView("session");}}/>)}
            </>}
            {filteredPast.length>0&&<>
              <SLbl>Past</SLbl>
              {filteredPast.map(s=><SessCard key={s.id} s={s} members={members} faded
                onClick={()=>{setSelSess(s);setView("session");}}/>)}
            </>}
          </>
        )}

        {/* Add block cal — admin only */}
        {can(userRole,"deleteSession")&&(
          <div style={{marginTop:20,background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:12,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              marginBottom:showBlockForm?14:0}}>
              <div style={{fontWeight:800,fontSize:13,color:G.text}}>🚫 Block Ground (Match Day)</div>
              <button type="button" onClick={()=>setShowBlockForm(v=>!v)}
                style={{background:G.cream,border:`1px solid ${G.border}`,borderRadius:8,
                  padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",
                  fontFamily:"inherit",color:G.text}}>
                {showBlockForm?"Cancel":"+ Block Date"}
              </button>
            </div>
            {showBlockForm&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <FFld label="Match / Event label">
                  <input placeholder="e.g. Div 3 Home Match vs Svanholm"
                    style={iSt({padding:"9px 12px",fontSize:13})}
                    value={bCalLabel} onChange={e=>setBCalLabel(e.target.value)}/>
                </FFld>
                <FFld label="Date">
                  <input type="date" style={iSt({padding:"9px 12px",fontSize:13})}
                    value={bCalDate} onChange={e=>setBCalDate(e.target.value)}/>
                </FFld>
                <div style={{display:"flex",gap:8}}>
                  <FFld label="From" style={{flex:1}}>
                    <input type="time" style={iSt({padding:"9px 12px",fontSize:13})}
                      value={bCalFrom} onChange={e=>setBCalFrom(e.target.value)}/>
                  </FFld>
                  <FFld label="To" style={{flex:1}}>
                    <input type="time" style={iSt({padding:"9px 12px",fontSize:13})}
                      value={bCalTo} onChange={e=>setBCalTo(e.target.value)}/>
                  </FFld>
                </div>
                <Btn bg={G.green} col={G.lime} full onClick={()=>{
                  if(!bCalDate){showToast("Please pick a date");return;}
                  saveBlockCals([...blockCals,{
                    id:uid(),date:bCalDate,from:bCalFrom,to:bCalTo,
                    label:bCalLabel.trim()||"Ground Blocked"}]);
                  setBCalDate("");setBCalFrom("10:00");setBCalTo("14:00");
                  setBCalLabel("");setShowBlockForm(false);
                  showToast("Ground blocked ✓");
                }}>🚫 Block This Date</Btn>
              </div>
            )}
          </div>
        )}
      </div>
      <BotNav view="schedule" setView={setView} userRole={userRole}/>
      {toast&&<Toast msg={toast}/>}
    </Shell>
    );
  }

  // ── ADD / JOIN ──────────────────────────────────────────────
  if(view==="add") {
    const conflict=sessions.find(s=>s.date===bDate&&s.from===bFrom&&s.to===bTo);
    return (
      <Shell>
        <AppHeader onBack={()=>{setView("schedule");setSelP([]);}}
          title="Add / Join a Session"
          sub={conflict?"Session exists — players will be added":"Create or join a training session"}/>
        <form onSubmit={handleAddSession} style={{padding:"14px 16px 20px"}}>
          <SLbl mt={4}>When?</SLbl>
          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
            padding:14,marginBottom:12}}>
            <FFld label="Date">
              <input type="date" style={iSt()} value={bDate}
                min={todayStr()} onChange={e=>setBDate(e.target.value)} required/>
            </FFld>
            <div style={{display:"flex",gap:10,marginTop:10}}>
              <FFld label="From" style={{flex:1}}>
                <input type="time" style={iSt()} value={bFrom} onChange={e=>setBFrom(e.target.value)}/>
              </FFld>
              <FFld label="Until" style={{flex:1}}>
                <input type="time" style={iSt()} value={bTo} onChange={e=>setBTo(e.target.value)}/>
              </FFld>
            </div>
            <FFld label="Label (optional)" style={{marginTop:10}}>
              <input style={iSt()} placeholder="e.g. Div 3 Training, U11 Batting"
                value={bLabel} onChange={e=>setBLabel(e.target.value)}/>
            </FFld>
            <FFld label="Note (optional)" style={{marginTop:10}}>
              <input style={iSt()} placeholder="e.g. Bring extra balls"
                value={bNote} onChange={e=>setBNote(e.target.value)}/>
            </FFld>
          </div>

          <SLbl>Who's coming? {selP.length>0&&`(${selP.length} selected)`}</SLbl>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input style={iSt({flex:1,background:G.white})}
              placeholder="🔍  Search…" value={pSearch}
              onChange={e=>setPSearch(e.target.value)}/>
            <select style={iSt({width:"auto",minWidth:105,background:G.white,flexShrink:0})}
              value={pFilter} onChange={e=>setPFilter(e.target.value)}>
              <option value="All">All groups</option>
              {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
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

          {Object.entries(pickGrouped).map(([team,list])=>(
            <div key={team} style={{marginBottom:14}}>
              <div style={{marginBottom:7}}><TeamPill team={team}/></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {list.map(m=>{
                  const sel=selP.includes(m.name);
                  return (
                    <button key={m.id} type="button"
                      onClick={()=>setSelP(ps=>sel?ps.filter(x=>x!==m.name):[...ps,m.name])}
                      style={{background:sel?G.green:G.white,color:sel?G.lime:G.text,
                        border:sel?`2px solid ${G.green}`:`1.5px solid ${G.border}`,
                        borderRadius:24,padding:"7px 14px",fontSize:13,fontWeight:700,
                        cursor:"pointer",fontFamily:"inherit",transition:"all .1s"}}>
                      {sel&&"✓ "}{m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {can(userRole,"deleteSession")&&<>
            <SLbl>Restrict to Team <span style={{fontWeight:500,color:G.muted}}>(optional)</span></SLbl>
            <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
              padding:14,marginBottom:14}}>
              <div style={{fontSize:12,color:G.muted,marginBottom:10}}>
                Leave as <strong>Open to all</strong> for combined/general sessions.
                Restricted sessions show a 🔒 badge and non-members cannot join.
              </div>
              <select style={iSt()} value={bRestrictTeam}
                onChange={e=>setBRestrictTeam(e.target.value)}>
                <option value="">🌍 Open to all</option>
                {teams.map(t=><option key={t.id} value={t.name}>{t.name} only</option>)}
              </select>
            </div>
          </>}

          <SLbl>Session Poll <span style={{fontWeight:500,color:G.muted}}>(optional)</span></SLbl>          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
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

          <Btn type="submit" bg={G.green} col={G.lime} full>🏏 Confirm Session</Btn>
          <p style={{fontSize:11,color:G.muted,textAlign:"center",marginTop:8}}>
            Existing session at same date & time? Players are auto-added.
          </p>
        </form>
        <BotNav view="add" setView={setView} userRole={userRole}/>
        {toast&&<Toast msg={toast}/>}
      </Shell>
    );
  }

  // ── SESSION DETAIL ──────────────────────────────────────────
  if(view==="session"&&selSess) {
    const userMem = members.find(m=>m.name===currentUser?.name);
    const isRestricted = !!selSess.restrictedTo;
    const userInTeam = !isRestricted
      || (userMem?.teams||[]).includes(selSess.restrictedTo)
      || can(userRole,"deleteSession");
    const notIn=members.filter(m=>!selSess.players.includes(m.name))
      .filter(m=>!isRestricted
        || (m.teams||[]).includes(selSess.restrictedTo)
        || can(userRole,"deleteSession"));
    return (
      <Shell>
        <AppHeader
          onBack={()=>{setView("schedule");setSelSess(null);}}
          title={<>{fmtShort(selSess.date)}{isToday(selSess.date)&&
            <span style={{background:G.lime,color:G.green,borderRadius:20,
              padding:"1px 8px",fontSize:11,fontWeight:900,marginLeft:8}}>TODAY</span>}</>}
          sub={`${selSess.from} – ${selSess.to}${selSess.label?" · "+selSess.label:""}`}>
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
          {selSess.note&&(
            <div style={{background:"#fff8e1",border:"1.5px solid #ffe082",borderRadius:10,
              padding:"10px 14px",marginBottom:14,fontSize:13,color:"#7a5c00",fontWeight:500}}>
              📋 {selSess.note}
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

          <SLbl mt={4}>Players ({selSess.players.length})</SLbl>
          {selSess.players.map((p,i)=>{
            const mem=members.find(m=>m.name===p);
            const isSelf=currentUser?.name===p;
            return (
              <div key={i} style={{background:G.white,border:`1.5px solid ${G.border}`,
                borderRadius:10,padding:"10px 14px",marginBottom:7,
                display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,background:`${G.green}18`,borderRadius:"50%",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:900,fontSize:13,color:G.green}}>
                    {p.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <div style={{fontWeight:800,color:G.text,fontSize:15}}>
                      {p}{isSelf&&<span style={{color:G.muted,fontSize:12,fontWeight:500,marginLeft:6}}>(you)</span>}
                    </div>
                    <div style={{display:"flex",gap:4,marginTop:2,flexWrap:"wrap"}}>
                      {(mem?.teams||[]).map(t=><TeamPill key={t} team={t} sm/>)}
                      {mem?.role&&mem.role!=="member"&&<RolePill role={mem.role}/>}
                    </div>
                  </div>
                </div>
                {/* Remove: admins/captains can remove anyone; members can only remove themselves */}
                {(can(userRole,"removePlayer")||isSelf)&&(
                  <Btn onClick={()=>handleLeave(selSess.id,p)}
                    bg={G.redBg} col={G.red} sm>
                    {isSelf&&!can(userRole,"removePlayer")?"Leave":"Remove"}
                  </Btn>
                )}
              </div>
            );
          })}

          {/* Poll voting */}
          {selSess.poll&&selSess.poll.length>0&&(()=>{
            const poll = selSess.poll;
            const totalVoters = [...new Set(poll.flatMap(o=>o.votes||[]))].length;
            const maxVotes = Math.max(...poll.map(o=>(o.votes||[]).length), 1);
            return (
              <div style={{marginBottom:20}}>
                <SLbl mt={4}>Session Poll</SLbl>
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

          {notIn.length>0&&userInTeam&&<>
            <SLbl>Add More Players</SLbl>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {notIn.map(m=>(
                <button key={m.id} onClick={()=>handleJoinDetail(m.name)}
                  style={{background:G.white,color:G.text,border:`1.5px solid ${G.border}`,
                    borderRadius:24,padding:"7px 14px",fontSize:13,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  + {m.name}
                </button>
              ))}
            </div>
          </>}

          {can(userRole,"deleteSession")&&(
            <button onClick={()=>handleDeleteSess(selSess.id)}
              style={{display:"block",width:"100%",marginTop:22,
                background:"transparent",border:`1.5px solid ${G.red}`,color:G.red,
                borderRadius:10,padding:"11px",fontSize:14,fontWeight:800,
                cursor:"pointer",fontFamily:"inherit"}}>
              🗑 Delete Session
            </button>
          )}
        </div>
        <BotNav view="session" setView={setView} userRole={userRole}/>
        {toast&&<Toast msg={toast}/>}
      </Shell>
    );
  }

  // ── ADMIN / MEMBERS ─────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // RENDER: Profile
  // ════════════════════════════════════════════════════════════
  if(view==="profile"||(view==="admin"&&!can(userRole,"accessMembers"))) {
    const me = members.find(m=>m.id===currentUser.id)||currentUser;
    const myTeams = (me.teams||[]);
    const {pct, needsReconfirm, isComplete, confirmedAt} = profileCompletion(me);
    const isReconfirm = pct===100 && needsReconfirm;
    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
          currentUser={currentUser} onLogout={handleLogout}/>}>
        <AppHeader onBack={()=>setView("schedule")}
          title="My Profile" sub={ROLE_META[me.role||"member"]?.label||"Member"}/>
        <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>

          {/* Avatar + name card */}
          <div style={{background:G.green,borderRadius:16,padding:"20px",
            display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:60,height:60,borderRadius:"50%",
              background:G.lime,display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:22,fontWeight:900,color:G.green,flexShrink:0}}>
              {me.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
                fontSize:20,color:"#fff"}}>{me.name}</div>
              <div style={{marginTop:4,display:"flex",gap:6,flexWrap:"wrap"}}>
                <RolePill role={me.role||"member"}/>
                {myTeams.map(t=><TeamPill key={t} team={t} sm/>)}
                {myTeams.length===0&&<TeamPill team="Unassigned" sm/>}
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
                <FFld label="Email address">
                  <input type="email" placeholder="your@email.com"
                    style={iSt({padding:"9px 12px",fontSize:14})}
                    value={profileEmail}
                    onChange={e=>setProfileEmail(e.target.value)}/>
                </FFld>
                <FFld label="Phone / Mobile">
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
                <FFld label="Current PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({padding:"9px 12px",fontSize:18,
                    letterSpacing:6,textAlign:"center"})}
                    value={oldPin} onChange={e=>setOldPin(e.target.value.replace(/\D/g,""))}/>
                </FFld>
                <FFld label="New PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({padding:"9px 12px",fontSize:18,
                    letterSpacing:6,textAlign:"center"})}
                    value={newPin1} onChange={e=>setNewPin1(e.target.value.replace(/\D/g,""))}/>
                </FFld>
                <FFld label="Confirm new PIN">
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

          {/* Sign out */}
          <button type="button" onClick={handleLogout}
            style={{background:"none",border:`1.5px solid ${G.border}`,
              borderRadius:12,padding:"13px",fontFamily:"inherit",
              fontWeight:800,fontSize:14,color:G.muted,cursor:"pointer",
              width:"100%"}}>
            Sign out
          </button>

        </div>
        <BotNav view="profile" setView={setView} userRole={userRole}/>
        {toast&&<Toast msg={toast}/>}
      </Shell>
    );
  }

  if(view==="admin"&&can(userRole,"accessMembers")) return (
    <Shell>
      <AppHeader title="Manage Members"
        sub={`${members.length} members · ${teams.length} groups`}
        onBack={()=>setView("schedule")}/>

      <div style={{padding:"14px 16px 20px"}}>
        {/* Add member */}
        {can(userRole,"addMember")&&<>
          <SLbl mt={4}>Add New Member</SLbl>
          <form onSubmit={addMember} style={{background:G.white,borderRadius:12,
            border:`1.5px solid ${G.border}`,padding:14,marginBottom:20}}>
            <FFld label="Full Name">
              <input style={iSt()} placeholder="e.g. Arjun Sharma"
                value={newName} onChange={e=>setNewName(e.target.value)} required/>
            </FFld>
            <FFld label="Group / Team" style={{marginTop:10}}>
              <select style={iSt()} value={newTeam} onChange={e=>setNewTeam(e.target.value)}>
                {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </FFld>
            <Btn type="submit" bg={G.green} col={G.lime} full>+ Add Member</Btn>
          </form>
        </>}

        {/* Search + filter */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <input style={iSt({flex:1,background:G.white})}
            placeholder="🔍  Search…" value={aSearch}
            onChange={e=>setASearch(e.target.value)}/>
          <select style={iSt({width:"auto",minWidth:110,background:G.white,flexShrink:0})}
            value={aFilter} onChange={e=>setAFilter(e.target.value)}>
            <option value="All">All groups</option>
            {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Role legend */}
        <div style={{background:G.white,borderRadius:10,border:`1.5px solid ${G.border}`,
          padding:"10px 14px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:900,letterSpacing:1.5,color:G.mid,
            textTransform:"uppercase",marginBottom:8}}>Role Guide</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {ROLES.map(r=><RolePill key={r} role={r}/>)}
          </div>
          <div style={{fontSize:11,color:G.muted,marginTop:8,lineHeight:1.6}}>
            Captain & Vice Captain only available for Senior groups.<br/>
            Youth groups are member-only. Toggle Senior/Youth in Manage Groups below.
          </div>
        </div>

        {/* ── Manage Groups ─────────────────────────────────── */}
        {can(userRole,"addMember")&&<>
          <SLbl mt={4}>Manage Groups</SLbl>
          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
            padding:14,marginBottom:20}}>

            {/* Existing teams */}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              {teams.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:7,
                  background:G.cream,borderRadius:9,padding:"7px 10px"}}>
                  {editingTeam?.id===t.id ? (
                    <input autoFocus style={{...iSt({padding:"5px 9px",fontSize:13}),flex:1}}
                      value={editingTeam.name}
                      onChange={e=>setEditingTeam({...editingTeam,name:e.target.value})}
                      onKeyDown={e=>{
                        if(e.key==="Enter"){e.preventDefault();renameTeam(t.id,editingTeam.name);}
                        if(e.key==="Escape") setEditingTeam(null);
                      }}/>
                  ) : (
                    <span style={{flex:1,fontWeight:800,fontSize:13,color:G.text}}>{t.name}</span>
                  )}
                  {/* Senior / Youth toggle */}
                  <button type="button" onClick={()=>toggleTeamSenior(t.id)}
                    title={t.senior?"Senior (click to set Youth)":"Youth (click to set Senior)"}
                    style={{background:t.senior?"#dcfce7":"#f1f5f9",color:t.senior?"#15803d":"#64748b",
                      border:"none",borderRadius:20,padding:"3px 9px",fontSize:10,fontWeight:800,
                      cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>
                    {t.senior?"Senior":"Youth"}
                  </button>
                  {/* Rename / confirm */}
                  {editingTeam?.id===t.id ? (
                    <button type="button" onClick={()=>renameTeam(t.id,editingTeam.name)}
                      style={{background:G.green,color:G.lime,border:"none",borderRadius:7,
                        padding:"4px 9px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>
                      ✓
                    </button>
                  ) : (
                    <button type="button" onClick={()=>setEditingTeam({id:t.id,name:t.name})}
                      style={{background:"transparent",color:G.muted,border:`1px solid ${G.border}`,
                        borderRadius:7,padding:"4px 8px",fontSize:12,cursor:"pointer",
                        fontFamily:"inherit"}}>
                      ✏️
                    </button>
                  )}
                  {/* Delete */}
                  <button type="button" onClick={()=>deleteTeam(t.id)}
                    style={{background:G.redBg,color:G.red,border:"none",borderRadius:7,
                      padding:"4px 8px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add new team */}
            <form onSubmit={addTeam} style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
              <input style={{...iSt({padding:"8px 11px",fontSize:13}),flex:1,minWidth:120}}
                placeholder="New group name…"
                value={newTName} onChange={e=>setNewTName(e.target.value)}/>
              <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,
                fontWeight:700,color:G.text,cursor:"pointer",flexShrink:0}}>
                <input type="checkbox" checked={newTSenior}
                  onChange={e=>setNewTSenior(e.target.checked)}
                  style={{width:14,height:14}}/>
                Senior
              </label>
              <Btn type="submit" bg={G.green} col={G.lime}>+ Add</Btn>
            </form>
          </div>
        </>}

        {/* ── Recurring Slots ───────────────────────────────── */}
        {can(userRole,"addMember")&&<>
          <SLbl mt={4}>Recurring Slots</SLbl>
          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
            padding:14,marginBottom:20}}>
            <div style={{fontSize:12,color:G.muted,marginBottom:12,lineHeight:1.5}}>
              Recurring sessions auto-appear in the schedule up to 3 weeks ahead.
              Toggle off to pause without deleting existing sessions.
            </div>

            {/* Existing slots */}
            {recurring.length===0&&(
              <div style={{textAlign:"center",padding:"16px 0",color:G.muted,fontSize:13}}>
                No recurring slots yet. Add one below.
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {recurring.map(slot=>(
                <div key={slot.id} style={{background:slot.enabled?G.cream:"#f1f5f9",
                  borderRadius:10,padding:"10px 12px",
                  border:`1.5px solid ${slot.enabled?G.border:"#cbd5e1"}`}}>
                  {editingSlot?.id===slot.id ? (
                    // ─── Inline edit form ───────────────────────
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <input style={iSt({padding:"7px 10px",fontSize:13})}
                        value={editingSlot.name}
                        onChange={e=>setEditingSlot({...editingSlot,name:e.target.value})}
                        placeholder="Slot name"/>
                      <div style={{display:"flex",gap:8}}>
                        <select style={iSt({padding:"7px 10px",fontSize:13,flex:1})}
                          value={editingSlot.day}
                          onChange={e=>setEditingSlot({...editingSlot,day:Number(e.target.value)})}>
                          {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                        </select>
                        <input type="time" style={iSt({padding:"7px 10px",fontSize:13,flex:1})}
                          value={editingSlot.from}
                          onChange={e=>setEditingSlot({...editingSlot,from:e.target.value})}/>
                        <input type="time" style={iSt({padding:"7px 10px",fontSize:13,flex:1})}
                          value={editingSlot.to}
                          onChange={e=>setEditingSlot({...editingSlot,to:e.target.value})}/>
                      </div>
                      <select style={iSt({padding:"7px 10px",fontSize:13})}
                        value={editingSlot.team}
                        onChange={e=>setEditingSlot({...editingSlot,team:e.target.value})}>
                        <option value="">No team</option>
                        {teams.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                      <label style={{display:"flex",alignItems:"center",gap:7,fontSize:13,
                        fontWeight:700,color:G.text,cursor:"pointer"}}>
                        <input type="checkbox" checked={editingSlot.restrictTeam}
                          onChange={e=>setEditingSlot({...editingSlot,restrictTeam:e.target.checked})}/>
                        Restrict to this team only
                      </label>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <FFld label="Active from">
                          <input type="date" style={iSt({padding:"7px 10px",fontSize:13})}
                            value={editingSlot.activeFrom||""}
                            onChange={e=>setEditingSlot({...editingSlot,activeFrom:e.target.value})}/>
                        </FFld>
                        <FFld label="Active until (blank = forever)">
                          <input type="date" style={iSt({padding:"7px 10px",fontSize:13})}
                            value={editingSlot.activeTo||""}
                            onChange={e=>setEditingSlot({...editingSlot,activeTo:e.target.value})}/>
                        </FFld>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn bg={G.green} col={G.lime}
                          onClick={()=>{updateRecurringSlot(slot.id,editingSlot);setEditingSlot(null);}}>
                          ✓ Save
                        </Btn>
                        <Btn bg={G.cream} col={G.muted} onClick={()=>setEditingSlot(null)}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    // ─── Display row ────────────────────────────
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:800,fontSize:13,color:slot.enabled?G.text:G.muted,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {slot.name}
                        </div>
                        <div style={{fontSize:11,color:G.muted,marginTop:2}}>
                          {DAYS[slot.day]} · {slot.from}–{slot.to}
                          {slot.team&&` · ${slot.team}${slot.restrictTeam?" only":""}`}
                          {slot.activeTo&&` · ends ${fmtShort(slot.activeTo)}`}
                        </div>
                      </div>
                      {/* Toggle on/off */}
                      <button type="button" onClick={()=>toggleRecurringSlot(slot.id)}
                        style={{background:slot.enabled?"#dcfce7":"#f1f5f9",
                          color:slot.enabled?"#15803d":"#94a3b8",
                          border:"none",borderRadius:20,padding:"3px 10px",fontSize:11,
                          fontWeight:800,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>
                        {slot.enabled?"On":"Off"}
                      </button>
                      {/* Edit */}
                      <button type="button"
                        onClick={()=>setEditingSlot({...slot})}
                        style={{background:"transparent",color:G.muted,
                          border:`1px solid ${G.border}`,borderRadius:7,
                          padding:"4px 8px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                        ✏️
                      </button>
                      {/* Delete */}
                      <button type="button" onClick={()=>deleteRecurringSlot(slot.id)}
                        style={{background:G.redBg,color:G.red,border:"none",borderRadius:7,
                          padding:"4px 8px",fontSize:12,cursor:"pointer",fontFamily:"inherit",
                          fontWeight:800}}>×</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new slot form */}
            <div style={{borderTop:`1px solid ${G.border}`,paddingTop:12}}>
              <div style={{fontSize:11,fontWeight:800,color:G.mid,letterSpacing:1.3,
                textTransform:"uppercase",marginBottom:10}}>Add new slot</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <input style={iSt({padding:"9px 12px",fontSize:13})}
                  placeholder="Slot name e.g. U11 Saturday Training"
                  value={rName} onChange={e=>setRName(e.target.value)}/>
                <div style={{display:"flex",gap:8}}>
                  <select style={iSt({padding:"9px 10px",fontSize:13,flex:1})}
                    value={rDay} onChange={e=>setRDay(Number(e.target.value))}>
                    {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                  <input type="time" style={iSt({padding:"9px 10px",fontSize:13,flex:1})}
                    value={rFrom} onChange={e=>setRFrom(e.target.value)}/>
                  <input type="time" style={iSt({padding:"9px 10px",fontSize:13,flex:1})}
                    value={rTo} onChange={e=>setRTo(e.target.value)}/>
                </div>
                <select style={iSt({padding:"9px 12px",fontSize:13})}
                  value={rTeam} onChange={e=>setRTeam(e.target.value)}>
                  <option value="">No specific team</option>
                  {teams.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <label style={{display:"flex",alignItems:"center",gap:7,fontSize:13,
                  fontWeight:700,color:G.text,cursor:"pointer"}}>
                  <input type="checkbox" checked={rRestrict}
                    onChange={e=>setRRestrict(e.target.checked)}/>
                  Restrict to this team only (others can view but not join)
                </label>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <FFld label="Active from">
                    <input type="date" style={iSt({padding:"9px 10px",fontSize:13})}
                      value={rActiveFrom} onChange={e=>setRActiveFrom(e.target.value)}/>
                  </FFld>
                  <FFld label="Active until (blank = forever)">
                    <input type="date" style={iSt({padding:"9px 10px",fontSize:13})}
                      value={rActiveTo} onChange={e=>setRActiveTo(e.target.value)}/>
                  </FFld>
                </div>
                <Btn bg={G.green} col={G.lime} full
                  onClick={()=>{
                    if(!rName.trim()){showToast("Give the slot a name");return;}
                    addRecurringSlot({
                      name:rName.trim(), team:rTeam, restrictTeam:rRestrict,
                      day:rDay, from:rFrom, to:rTo,
                      activeFrom:rActiveFrom, activeTo:rActiveTo||null,
                    });
                    setRName("");setRTeam("");setRRestrict(false);
                    setRDay(6);setRFrom("14:00");setRTo("15:30");
                    setRActiveFrom(todayStr());setRActiveTo("");
                  }}>
                  ↻ Add Recurring Slot
                </Btn>
              </div>
            </div>
          </div>
        </>}

        {/* Member list */}
        {Object.entries(adminGrouped).map(([team,list])=>(
          <div key={team} style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <TeamPill team={team}/>
              <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
                {list.length} player{list.length!==1?"s":""}
              </span>
              {seniorTeamNames.includes(team)&&(
                <span style={{fontSize:10,color:G.muted,fontWeight:600,fontStyle:"italic"}}>
                  · Captain / VC eligible
                </span>
              )}
            </div>
            {list.map(m=>(
              <div key={m.id} style={{background:G.white,border:`1.5px solid ${G.border}`,
                borderRadius:10,padding:"10px 14px",marginBottom:6}}>

                {/* Top row: name + pencil + delete */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  {editingName?.id===m.id ? (
                    <div style={{display:"flex",gap:6,alignItems:"center",flex:1}}>
                      <input autoFocus
                        style={{...iSt({padding:"5px 9px",fontSize:13}),flex:1}}
                        value={editingName.value}
                        onChange={e=>setEditingName({...editingName,value:e.target.value})}
                        onKeyDown={e=>{
                          if(e.key==="Enter"){e.preventDefault();renameMember(m.id,editingName.value);}
                          if(e.key==="Escape") setEditingName(null);
                        }}/>
                      <button type="button"
                        onClick={()=>renameMember(m.id,editingName.value)}
                        style={{background:G.green,color:G.lime,border:"none",borderRadius:7,
                          padding:"5px 10px",fontSize:13,cursor:"pointer",
                          fontFamily:"inherit",fontWeight:800,flexShrink:0}}>✓</button>
                      <button type="button" onClick={()=>setEditingName(null)}
                        style={{background:G.cream,color:G.muted,border:`1px solid ${G.border}`,
                          borderRadius:7,padding:"5px 9px",fontSize:13,cursor:"pointer",
                          fontFamily:"inherit",flexShrink:0}}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div style={{fontWeight:800,color:G.text,fontSize:15,flex:1}}>
                        {m.name}
                      </div>
                      {can(userRole,"addMember")&&(
                        <button type="button"
                          onClick={()=>setEditingName({id:m.id,value:m.name})}
                          style={{background:"none",border:"none",cursor:"pointer",
                            color:G.muted,fontSize:14,padding:"2px 4px",flexShrink:0}}
                          title="Edit name">✏️</button>
                      )}
                      {can(userRole,"removeMember")&&m.id!==currentUser.id&&(
                        <button type="button" onClick={()=>setConfirmDelete(m)}
                          style={{background:G.redBg,color:G.red,border:"none",borderRadius:7,
                            padding:"4px 9px",fontSize:13,cursor:"pointer",
                            fontFamily:"inherit",fontWeight:800,flexShrink:0}}>×</button>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom row: role pill + team chips + role dropdown + reset PIN */}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {/* Team chips */}
                  <div>
                    <div style={{fontSize:10,fontWeight:800,color:G.muted,
                      letterSpacing:1.3,textTransform:"uppercase",marginBottom:5}}>Teams</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {teams.map(t=>{
                        const active=(m.teams||[]).includes(t.name);
                        return (
                          <button key={t.id} type="button"
                            onClick={()=>toggleMemberTeam(m.id,t.name)}
                            style={{
                              background:active?G.green:G.cream,
                              color:active?G.lime:G.muted,
                              border:active?`1.5px solid ${G.green}`:`1.5px solid ${G.border}`,
                              borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800,
                              cursor:"pointer",fontFamily:"inherit",transition:"all .12s",
                            }}>
                            {active?"✓ ":""}{t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Role + actions row */}
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <RolePill role={m.role||"member"}/>
                    {can(userRole,"assignRoles")&&(m.id!==currentUser.id||userRole==="superadmin")&&(
                      <select value={m.role||"member"}
                        onChange={e=>updateRole(m.id,e.target.value)}
                        style={{border:`1px solid ${G.border}`,borderRadius:6,
                          padding:"4px 6px",fontSize:11,fontFamily:"inherit",
                          color:G.text,background:G.cream,cursor:"pointer"}}>
                        {userRole==="superadmin"&&<option value="superadmin">👑 Super Admin</option>}
                        <option value="admin">🔧 Admin</option>
                        {(m.teams||[]).some(t=>seniorTeamNames.includes(t))&&<>
                          <option value="captain">🏆 Captain</option>
                          <option value="vicecaptain">🥈 Vice Captain</option>
                        </>}
                        <option value="member">🏏 Member</option>
                      </select>
                    )}
                    {can(userRole,"resetOtherPin")&&m.id!==currentUser.id&&pins[m.id]&&(
                      <Btn onClick={()=>resetPin(m.id)} bg={G.amberBg} col={G.amber} sm>🔑 Reset PIN</Btn>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        ))}
      </div>
      <BotNav view="admin" setView={setView} userRole={userRole}/>
      {toast&&<Toast msg={toast}/>}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",
          zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:G.white,borderRadius:16,padding:28,maxWidth:340,width:"100%",
            boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
            <div style={{fontSize:22,marginBottom:8}}>🗑️</div>
            <div style={{fontWeight:900,fontSize:17,color:G.text,marginBottom:8}}>
              Remove member?
            </div>
            <div style={{color:G.muted,fontSize:14,marginBottom:6}}>
              You're about to permanently remove:
            </div>
            <div style={{fontWeight:800,fontSize:16,color:G.green,marginBottom:6}}>
              {confirmDelete.name}
            </div>
            <div style={{color:"#b91c1c",fontSize:13,marginBottom:22,
              background:G.redBg,borderRadius:8,padding:"10px 12px"}}>
              ⚠️ This cannot be undone. All their session history will remain but they will no longer appear in the member list.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button type="button"
                onClick={()=>setConfirmDelete(null)}
                style={{flex:1,padding:"11px 0",borderRadius:10,border:`1.5px solid ${G.border}`,
                  background:G.cream,color:G.text,fontWeight:800,fontSize:14,
                  cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
              <button type="button"
                onClick={()=>removeMember(confirmDelete.id)}
                style={{flex:1,padding:"11px 0",borderRadius:10,border:"none",
                  background:"#dc2626",color:"#fff",fontWeight:800,fontSize:14,
                  cursor:"pointer",fontFamily:"inherit"}}>
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );

  // Fallback
  return <Shell><div style={{padding:20,color:G.muted}}>Loading…</div></Shell>;
}
