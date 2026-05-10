import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import SidebarNav from "../ui/SidebarNav";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import AppHeader from "../ui/AppHeader";
import { FCC_LOGO } from "../constants/logo";

const PRIVACY_SECTIONS = [
  {
    title: "What data we collect",
    body: "We store your full name, email address, and phone number. For youth members (under 16), we also store a link to the parent or guardian who registered on their behalf.",
  },
  {
    title: "Why we collect it",
    body: "To manage your club membership, communicate about training sessions and matches, coordinate car pooling to Karlebo Cricket Ground, and ensure we can reach you or your child's guardian in case of an emergency.",
  },
  {
    title: "Who can see your data",
    body: "Only club admins and coaches can view member contact details. Your data is never shared with third parties, advertisers, or other clubs.",
  },
  {
    title: "Where it is stored",
    body: "All data is stored on Google Firebase (Firestore), hosted in the EU on servers located in Frankfurt, Germany. Google is fully GDPR-compliant as an EU data processor.",
  },
  {
    title: "How long we keep it",
    body: "Your data is kept for the duration of your active club membership and up to one year after you leave. After that it is deleted on request.",
  },
  {
    title: "Your rights",
    body: "You have the right to: access a copy of your data, correct any inaccuracies, request deletion, and withdraw consent at any time. To exercise any of these rights, contact the club admin directly in the app (Profile → Help) or email fredensborgcricket.dk.",
  },
  {
    title: "Children's data",
    body: "For members under 16, we require a parent or guardian to provide consent before we process the child's data. This consent is recorded with a timestamp when the parent completes the account setup flow.",
  },
  {
    title: "Lawful basis",
    body: "We process adult member data under the lawful basis of Legitimate Interests (GDPR Article 6(1)(f)) — running a sports club requires contact information for operational and safety reasons. For children's data we rely on explicit parental consent (Article 6(1)(a) and Article 8).",
  },
  {
    title: "Contact",
    body: "For any data-related queries, contact Reuben Dayal (club admin) via the Help section of this app, or through fredensborgcricket.dk.",
  },
];

export default function PrivacyView() {
  const {
    G, view, setView, userRole, currentUser, handleLogout, teams,
    members, saveMembers, showToast, joinRequests, toast,
  } = useAppContext();

  const me = members.find(m=>m.id===currentUser.id)||currentUser;
  const isYouth = (me.teams||[]).some(t=>["U11","U13","U15","U15 Girls","U18","U16"].includes(t));

  return (
    <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
      <AppHeader title="Privacy & Your Data" sub="How Fredensborg CC uses your information"
        onBack={()=>setView("profile")}/>
      <div style={{padding:"16px 16px 100px"}}>

        {/* Consent status */}
        <div style={{
          background: me.consentGiven ? "#f0fdf4" : "#fffbeb",
          border: `1.5px solid ${me.consentGiven ? "#86efac" : "#fde68a"}`,
          borderRadius:12,padding:"14px 16px",marginBottom:16,
          display:"flex",alignItems:"flex-start",gap:12}}>
          <span style={{fontSize:24,flexShrink:0}}>{me.consentGiven?"✅":"⚠️"}</span>
          <div>
            <div style={{fontWeight:800,fontSize:13,
              color:me.consentGiven?"#166534":"#92400e",marginBottom:3}}>
              {me.consentGiven
                ? `Privacy acknowledged${me.consentDate?" on "+me.consentDate:""}`
                : "You haven't acknowledged our privacy policy yet"}
            </div>
            <div style={{fontSize:12,color:me.consentGiven?"#166534":"#78350f",lineHeight:1.5}}>
              {me.consentGiven
                ? "Your consent is on record. You can request changes or deletion at any time."
                : "Tap below to acknowledge how we use your data."}
            </div>
            {!me.consentGiven&&(
              <button onClick={()=>{
                  const updated=members.map(m=>m.id===me.id?{...m,
                    consentGiven:true,consentDate:new Date().toISOString().slice(0,10)}:m);
                  saveMembers(updated);
                  showToast("Privacy policy acknowledged ✓");
                }}
                style={{marginTop:10,background:"#92400e",color:"#fff",border:"none",
                  borderRadius:20,padding:"7px 16px",fontSize:12,fontWeight:800,
                  cursor:"pointer",fontFamily:"inherit"}}>
                I acknowledge the privacy policy
              </button>
            )}
          </div>
        </div>

        {isYouth&&!me.consentGiven&&(
          <div style={{background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:10,
            padding:"12px 14px",marginBottom:16,fontSize:12,color:"#1e40af",lineHeight:1.6}}>
            👶 <b>Youth member note:</b> A parent or guardian should also complete the
            account setup to formally record parental consent.
            Share this link with them: <b>fcc-training.vercel.app</b> → "Verify / Set up my account"
          </div>
        )}

        {/* Full policy sections */}
        {PRIVACY_SECTIONS.map((s,i)=>(
          <div key={i} style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:12,padding:"14px 16px",marginBottom:10}}>
            <div style={{fontWeight:800,fontSize:13,color:G.text,marginBottom:6}}>
              {s.title}
            </div>
            <div style={{fontSize:13,color:G.muted,lineHeight:1.65}}>
              {s.body}
            </div>
          </div>
        ))}

        {/* Request deletion */}
        <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",
          borderRadius:12,padding:"14px 16px",marginTop:4}}>
          <div style={{fontWeight:800,fontSize:13,color:"#991b1b",marginBottom:6}}>
            Request data deletion or access
          </div>
          <div style={{fontSize:12,color:"#7f1d1d",lineHeight:1.6,marginBottom:12}}>
            To request a copy of your data or ask for your account to be deleted,
            contact the club admin. Your request will be handled within 30 days.
          </div>
          <button onClick={()=>setView("help")}
            style={{background:"#991b1b",color:"#fff",border:"none",borderRadius:20,
              padding:"8px 18px",fontSize:12,fontWeight:800,cursor:"pointer",
              fontFamily:"inherit"}}>
            Contact admin →
          </button>
        </div>

      </div>
      <BotNav view="profile" setView={setView} userRole={userRole}
        pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
      {toast&&<Toast msg={toast} G={G}/>}
    </Shell>
  );
}
