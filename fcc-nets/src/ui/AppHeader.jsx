// ─── Pass 6 prerequisite: AppHeader extracted from App.jsx ─────
// Pulls G, currentUser, handleLogout from AppContext so call sites
// can keep their existing prop shape ({title, sub, onBack, children}).

import { useAppContext } from "../context/AppContext";
import { FCC_LOGO } from "../constants/logo";
import BackBtn from "./BackBtn";

export default function AppHeader({ onBack, title, sub, children }) {
  const ctx = useAppContext();
  const G = ctx.G || { green:"#1a6b38", white:"#fff", lime:"#84cc16" };
  const { currentUser, handleLogout } = ctx;
  return (
    <div style={{background:G.green,padding:"12px 16px",
      position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:children?10:0}}>
        {onBack
          ? <BackBtn onClick={onBack}/>
          : <img src={FCC_LOGO} alt="FCC" className="fcc-header-logo"
              style={{width:72,height:72,borderRadius:"50%",
                objectFit:"cover",flexShrink:0,
                border:"2.5px solid rgba(255,255,255,0.4)",
                boxShadow:"0 3px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)"}}/>
        }
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:20,fontWeight:900,lineHeight:1.2}}>{title}</div>
          {sub&&<div style={{color:"rgba(255,255,255,0.6)",fontSize:11,marginTop:3,
            lineHeight:1.4}}>{sub}</div>}
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
}
