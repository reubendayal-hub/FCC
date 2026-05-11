import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import SidebarNav from "../ui/SidebarNav";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import Btn from "../ui/Btn";
import AppHeader from "../ui/AppHeader";
import { FCC_LOGO } from "../constants/logo";

export default function HelpView() {
  const {
    G, view, setView, userRole, currentUser, handleLogout, teams,
    members, helpMsg, setHelpMsg, helpCat, setHelpCat,
    showToast, joinRequests, toast,
  } = useAppContext();

  const CATS = [
    {id:"general",   label:"💬 General question"},
    {id:"booking",   label:"📅 Booking / session issue"},
    {id:"account",   label:"🔑 Account / login problem"},
    {id:"technical", label:"🛠️ Technical / app bug"},
    {id:"other",     label:"📝 Other"},
  ];
  const me = members.find(m=>m.id===currentUser.id)||currentUser;
  function sendHelp() {
    if(!helpMsg.trim()) { showToast("Please write a message first"); return; }
    const cat = CATS.find(c=>c.id===helpCat)?.label || helpCat;
    // Fire email notification silently (no await — don't block the user)
    fetch("/api/notify", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        type:"help",
        data:{ name:me.name, category:cat, message:helpMsg.trim() }
      })
    }).catch(()=>{}); // silent — member shouldn't see API errors
    const subject = encodeURIComponent(`FCC Training App — ${cat} — from ${me.name}`);
    const body = encodeURIComponent(
      `Hi Reuben,\n\nA message from the FCC Training app:\n\n`+
      `Member: ${me.name}\nCategory: ${cat}\n\n`+
      `Message:\n${helpMsg.trim()}\n\n`+
      `---\nSent via FCC Training App`
    );
    window.open(`mailto:reuben.dayal@gmail.com?subject=${subject}&body=${body}`,"_self");
    setHelpMsg("");
    showToast("Message sent ✓");
    setTimeout(()=>setView("profile"),1200);
  }
  const QUICK_LINKS = [
    {icon:"📅", title:"Getting started", desc:"How to log in and set your PIN for the first time"},
    {icon:"🔁", title:"Weekly training", desc:"Your squad is auto-added — sign out if you can't make it"},
    {icon:"➕", title:"Booking nets", desc:"Prime time (17–20h) is 1 hour max. All other times 2 hours"},
    {icon:"🚘", title:"Car pool", desc:"Set a lift preference on any session — offer, need, or own transport"},
    {icon:"🧢", title:"Coaches", desc:"Coach names appear on team sessions automatically"},
    {icon:"🔒", title:"Sign-out deadline", desc:"You can leave a session until 9pm the night before"},
  ];
  return (
    <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
      <AppHeader title="Help & Guide" sub="Everything you need to know"
        onBack={()=>setView("profile")}/>
      <div style={{padding:"16px 16px 100px",display:"flex",flexDirection:"column",gap:12}}>

        {/* Full guide CTA */}
        <div style={{background:`linear-gradient(135deg,${G.green},${G.mid})`,
          borderRadius:14,padding:"20px 18px",
          display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:36,flexShrink:0}}>📖</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:900,fontSize:15,color:G.lime,marginBottom:4}}>
              Full App Guide
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.5,marginBottom:12}}>
              Screenshots, step-by-step walkthroughs, and everything explained clearly.
            </div>
            <button
              onClick={()=>window.open("https://training-app-guide.netlify.app","_blank")}
              style={{background:G.lime,color:G.green,border:"none",borderRadius:20,
                padding:"9px 20px",fontWeight:900,fontSize:13,cursor:"pointer",
                fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
              Open Guide →
            </button>
          </div>
        </div>

        {/* Quick reference cards */}
        <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:G.muted,
          textTransform:"uppercase",marginTop:4}}>Quick reference</div>
        {QUICK_LINKS.map((q,i)=>(
          <div key={i} style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:12,padding:"12px 14px",
            display:"flex",alignItems:"flex-start",gap:12}}>
            <span style={{fontSize:22,flexShrink:0,marginTop:1}}>{q.icon}</span>
            <div>
              <div style={{fontWeight:800,fontSize:13,color:G.text,marginBottom:2}}>{q.title}</div>
              <div style={{fontSize:12,color:G.muted,lineHeight:1.5}}>{q.desc}</div>
            </div>
          </div>
        ))}

        {/* Divider */}
        <div style={{borderTop:`1px solid ${G.border}`,marginTop:4}}/>
        <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:G.muted,
          textTransform:"uppercase"}}>Still need help? Message Reuben</div>

        {/* Category picker */}
        <div style={{background:G.white,border:`1.5px solid ${G.border}`,
          borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:10}}>
            What's this about?
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {CATS.map(c=>(
              <button key={c.id} onClick={()=>setHelpCat(c.id)}
                style={{display:"flex",alignItems:"center",gap:10,
                  background:helpCat===c.id ? G.green : "transparent",
                  border:`1.5px solid ${helpCat===c.id ? G.green : G.border}`,
                  borderRadius:9,padding:"9px 12px",cursor:"pointer",
                  fontFamily:"inherit",transition:"all .12s"}}>
                <span style={{fontSize:13,fontWeight:700,
                  color:helpCat===c.id?"#fff":G.text,flex:1,textAlign:"left"}}>
                  {c.label}
                </span>
                {helpCat===c.id&&<span style={{color:G.lime,fontSize:14,fontWeight:800}}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {helpCat==="technical"&&(
          <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",
            borderRadius:12,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:18,flexShrink:0}}>📸</span>
            <div style={{fontSize:12,color:"#78350f",lineHeight:1.6}}>
              <b>Tip:</b> A screenshot really helps. After hitting send, attach it to the email.
              iPhone: <b>Side + Volume Up</b>. Android: <b>Power + Volume Down</b>.
            </div>
          </div>
        )}

        {/* Message box */}
        <div style={{background:G.white,border:`1.5px solid ${G.border}`,
          borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:G.muted,
            textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Your message</div>
          <textarea rows={4}
            placeholder="Describe your question or issue…"
            value={helpMsg}
            onChange={e=>setHelpMsg(e.target.value)}
            style={{width:"100%",borderRadius:9,border:`1.5px solid ${G.border}`,
              padding:"11px 13px",fontSize:14,fontFamily:"'DM Sans',sans-serif",
              fontWeight:500,background:G.cream,color:G.text,
              outline:"none",boxSizing:"border-box",resize:"vertical",lineHeight:1.6}}/>
          <div style={{marginTop:6,fontSize:11,color:G.muted}}>
            Sending as: <b style={{color:G.text}}>{me.name}</b>
          </div>
        </div>

        <Btn bg={G.green} col={G.lime} full onClick={sendHelp}>
          📧 Send Message to Reuben
        </Btn>

      </div>
      <BotNav view="profile" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
      {toast&&<Toast msg={toast} G={G}/>}
    </Shell>
  );
}
