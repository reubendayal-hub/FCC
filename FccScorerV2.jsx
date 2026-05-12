import { useState, useEffect } from "react";

const C = {
  bg:"#F1EFE8",border:"#D3D1C7",white:"#fff",
  text:"#2C2C2A",sub:"#5F5E5A",muted:"#888780",
  blue:"#185FA5",blueLt:"#D0E6F8",blueDk:"#0C447C",
  green:"#2A7A18",greenLt:"#D4EDBC",greenDk:"#1E5C08",
  red:"#C04040",redLt:"#FCEBEB",
  amber:"#B07010",amberLt:"#FFF0E0",
  pink:"#C060A0",pinkLt:"#F5D4E4",
  off:"#1B5FA8",offLt:"#DCEDFB",
  leg:"#2A7A18",legLt:"#D8EEC8",
  dark:"#1A1A18",grass:"#3A7A22",
};

const SQUAD1 = ["Zachary","Arjun","Nitin","Reuben","Arun","Dev","Sam","Priya","Raj","Vikram","Amit"];
const SQUAD2 = ["Oliver","Lucas","Henrik","Mikkel","Jonas","Søren","Lars","Thomas","Mads","Anders","Kasper"];

const ZONES = {
  behind:     {pt:[110,10], label:"Behind",      side:"neu", shots:[{n:"Ramp/scoop",d:"Over keeper's head"},{n:"Dilscoop",d:"On knee, over keeper"},{n:"Upper cut",d:"Sliced over slips"},{n:"Reverse sweep",d:"Behind square off"}]},
  "third-man":{pt:[28,28],  label:"Third man",   side:"off", shots:[{n:"Late cut",d:"Deflected to third man"},{n:"Upper cut",d:"Sliced over gully"},{n:"Reverse sweep",d:"Swept behind square"},{n:"Outside edge",d:"Edge behind slip cordon"}]},
  point:      {pt:[8,96],   label:"Point/gully", side:"off", shots:[{n:"Square cut",d:"Short wide to point"},{n:"Square drive",d:"Wide ball to cover"},{n:"Cover drive",d:"Full ball through cover"},{n:"Upper cut",d:"Bouncer over point"}]},
  cover:      {pt:[14,150], label:"Cover",       side:"off", shots:[{n:"Cover drive",d:"Classic cover drive"},{n:"Off drive",d:"Right of straight"},{n:"Square drive",d:"Between point & cover"}]},
  "mid-off":  {pt:[38,196], label:"Mid-off",     side:"off", shots:[{n:"Off drive",d:"Toward mid-off/long-off"},{n:"Straight drive",d:"Past bowler off side"},{n:"Lofted drive",d:"Over mid-off"}]},
  straight:   {pt:[110,218],label:"Straight",    side:"neu", shots:[{n:"Straight drive",d:"Back past the bowler"},{n:"Off drive",d:"Slightly off side"},{n:"On drive",d:"Slightly leg side"},{n:"Lofted drive",d:"Over the bowler"}]},
  "on-drive": {pt:[182,196],label:"Mid-on",      side:"leg", shots:[{n:"On drive",d:"Toward mid-on/long-on"},{n:"Flick",d:"Wristy flick mid-on"},{n:"Lofted drive",d:"Over mid-on"}]},
  midwicket:  {pt:[206,150],label:"Midwicket",   side:"leg", shots:[{n:"Flick",d:"Wristy flick midwicket"},{n:"Slog sweep",d:"Lofted sweep midwicket"},{n:"Cow corner",d:"Heave deep midwicket"},{n:"Pull",d:"Short ball to midwicket"}]},
  "sq-leg":   {pt:[212,96], label:"Square leg",  side:"leg", shots:[{n:"Pull",d:"Short ball pulled square"},{n:"Hook",d:"Head-high bouncer"},{n:"Sweep",d:"Spinner to sq leg"},{n:"Flick",d:"Full ball flicked square"}]},
  "fine-leg": {pt:[192,28], label:"Fine leg",    side:"leg", shots:[{n:"Leg glance",d:"Off pads, deflected fine"},{n:"Paddle sweep",d:"Soft deflection fine"},{n:"Hook",d:"Bouncer hooked fine"},{n:"Glance",d:"Angled bat down leg"}]},
};
const ZONE_PATHS = [
  {id:"behind",    d:"M110,96 L88,4 A104,108 0 0,1 132,4 Z"},
  {id:"third-man", d:"M110,96 L30,30 A104,108 0 0,0 88,4 Z"},
  {id:"point",     d:"M110,96 L6,112 A104,108 0 0,1 30,30 Z"},
  {id:"cover",     d:"M110,96 L22,176 A104,108 0 0,1 6,112 Z"},
  {id:"mid-off",   d:"M110,96 L88,220 A104,108 0 0,1 22,176 Z"},
  {id:"straight",  d:"M110,96 L88,220 A104,108 0 0,0 132,220 Z"},
  {id:"on-drive",  d:"M110,96 L132,220 A104,108 0 0,0 198,176 Z"},
  {id:"midwicket", d:"M110,96 L198,176 A104,108 0 0,0 214,112 Z"},
  {id:"sq-leg",    d:"M110,96 L214,112 A104,108 0 0,0 190,30 Z"},
  {id:"fine-leg",  d:"M110,96 L190,30 A104,108 0 0,0 132,4 Z"},
];

const COMMENTARY = {
  hype:{name:"Hype Man 🔥",label:"🔥",
    dot:["DEFENDED! Fortress!","Dot ball — pressure building!","Tight as a drum!"],
    one:["Quick single! Sharp running!","One and rotate — smart cricket!","Easy single, ticking along!"],
    four:["CRACKED! Racing to the rope!","FOUR! Nothing the fielder can do!","BOUNDARY! Absolutely nailed it!"],
    six:["SIX!! INTO ORBIT!! MASSIVE!!","SIX!! The crowd goes WILD!!","MAXIMUM!! Still travelling!!"],
    wide:["Gift from the bowler — WIDE!","Down the leg side, wide called!"],
    noball:["Front foot no-ball! FREE HIT!!","No-ball! FREE HIT next ball!"],
    wicket:["OUT!! STUMPS SHATTERED!!","OUT!! CAUGHT!! What a grab!!","WICKET!! Celebration time!!"],
    duck:["DUCK! 🦆 Quack quack! Zero from {name}!"],
    maiden:["MAIDEN!! The bowler is pumped!!"],
  },
  grumpy:{name:"Grumpy Legend 😤",label:"😤",
    dot:["Good ball. About time.","Dot. Back in my day every ball was.","That's how you do it."],
    one:["Single. Could've been more.","One run. Not inspiring.","Running between wickets. At least."],
    four:["Four. Should've been stopped.","Boundary. Fielding's gone soft.","Four. Lucky more than anything."],
    six:["Six. Reckless. Got away with it.","SIX. No technique whatsoever.","Six. Next time it'll go in the air."],
    wide:["Wide. Disgraceful.","Wide ball. Line and length. That's all."],
    noball:["No-ball. Can't land the front foot.","No-ball. Embarrassing."],
    wicket:["OUT. Finally.","Wicket. Good. Saw that coming.","OUT. Now maybe someone sensible bats."],
    duck:["Duck. 🦆 {name} won't be pleased."],
    maiden:["Maiden. NOW that's bowling."],
  },
  poet:{name:"Dramatic Poet ✍️",label:"✍️",
    dot:["The ball meets the bat in quiet negotiation.","A moment of stillness — the bowler's art honoured.","The leather whispers past the willow, unscathed."],
    one:["A gentle rotation of the scoreboard.","One run finds its way home, a quiet traveller.","Unhurried, purposeful — a single of patience."],
    four:["The ball races like an idea that cannot be caught.","A boundary! The rope receives it as an old friend.","Four! Willow sings, and the outfield answers."],
    six:["It soars — magnificent, defiant, into the pale sky.","Beyond the rope, beyond reason, beyond beautiful.","The ball finds the heavens. Pure. Sublime."],
    wide:["The ball strays from its path, as all things do.","A wide — intentions lost in translation."],
    noball:["The front foot oversteps. Even discipline lapses.","No-ball. A small rebellion against the laws."],
    wicket:["The curtain falls. The walk back begins.","Out! The stumps speak in the only language that matters.","Caught. Even the greatest arcs must end."],
    duck:["Zero. 🦆 {name} departs into the long silence."],
    maiden:["Six deliveries, six stories — none of them scoring. A maiden."],
  },
};

function getComm(persona,event,extras={}){
  const p=COMMENTARY[persona];
  if(!p) return "";
  const pool=p[event]||p.dot;
  return (pool[Math.floor(Math.random()*pool.length)]||"").replace("{name}",extras.name||"The batter");
}

function overStr(b){return `${Math.floor(b/6)}.${b%6}`;}
function ballStyle(b){
  if(!b||b==="-")return{bg:"#F1EFE8",tc:C.muted,bc:C.border};
  if(b==="W") return{bg:"#FCEBEB",tc:"#8B0000",bc:"#E8A0A0"};
  if(b==="4") return{bg:C.blueLt,tc:C.blueDk,bc:"#5E9FD4"};
  if(b==="6") return{bg:C.amberLt,tc:"#7A4000",bc:"#D4A040"};
  if(b==="Wd"||b==="Nb")return{bg:C.pinkLt,tc:"#7A1A50",bc:"#D478A0"};
  if(b==="•")return{bg:"#E8E6DF",tc:C.muted,bc:C.border};
  return{bg:C.greenLt,tc:C.greenDk,bc:"#72B84A"};
}

// ── Sheet modal ───────────────────────────────────────────────────
function Sheet({title,onClose,children,noPad=false}){
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:420,background:C.white,borderRadius:"20px 20px 0 0",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px rgba(0,0,0,0.3)"}}>
        <div style={{padding:"12px 16px 10px",borderBottom:`0.5px solid ${C.border}`,flexShrink:0}}>
          <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 10px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:C.dark}}>{title}</div>
            <div onClick={onClose} style={{fontSize:22,color:C.muted,cursor:"pointer",padding:"0 6px",lineHeight:1}}>✕</div>
          </div>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:noPad?0:"16px 16px 32px"}}>{children}</div>
      </div>
    </div>
  );
}

// ── Celebration ───────────────────────────────────────────────────
function Celebrate({data,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[]);
  const isDuck=data.type==="duck";
  const bg=data.type==="win"?"#1A5C28":data.type==="wicket"||isDuck?C.red:data.type==="six"?"#7A4000":C.blueDk;
  const conf=data.type==="six"?["#FFD700","#FFA500","#FF6600","#FFE066"]:data.type==="win"?["#FFD700","#00FF88","#FF69B4","#00BFFF"]:data.type==="wicket"||isDuck?["#FF4444","#FF8888","#CC0000","#FFAAAA"]:["#00BFFF","#1E90FF","#87CEEB","#B0E0FF"];
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.55)"}} onClick={onDone}>
      {Array.from({length:36}).map((_,i)=>(
        <div key={i} style={{position:"absolute",left:`${5+Math.random()*90}%`,top:"-5%",width:Math.random()>0.5?12:7,height:Math.random()>0.5?12:7,borderRadius:Math.random()>0.5?"50%":2,background:conf[i%conf.length],animation:`cfFall ${1.2+Math.random()*1.8}s ${Math.random()*0.5}s ease-in forwards`}}/>
      ))}
      <div style={{background:bg,borderRadius:28,padding:"32px 44px",textAlign:"center",boxShadow:"0 12px 60px rgba(0,0,0,0.5)",animation:"cfPop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both",maxWidth:280,position:"relative",zIndex:1}}>
        <div style={{fontSize:isDuck?64:60,lineHeight:1,animation:isDuck?"cfWaddle 0.5s infinite alternate":data.type==="six"?"cfShake 0.3s infinite":"none"}}>{isDuck?"🦆":data.type==="six"?"🚀":data.type==="wicket"?"💥":data.type==="win"?"🏆":"🎉"}</div>
        <div style={{fontSize:30,fontWeight:900,color:"#fff",marginTop:10,letterSpacing:0.5,textShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>{data.text}</div>
        {data.sub&&<div style={{fontSize:13,color:"rgba(255,255,255,0.75)",marginTop:6,lineHeight:1.4}}>{data.sub}</div>}
        <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:14}}>tap to dismiss</div>
      </div>
      <style>{`
        @keyframes cfFall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
        @keyframes cfPop{from{transform:scale(0.2) rotate(-10deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
        @keyframes cfShake{0%{transform:translateX(-4px) rotate(-5deg)}100%{transform:translateX(4px) rotate(5deg)}}
        @keyframes cfWaddle{0%{transform:rotate(-18deg)}100%{transform:rotate(18deg)}}
      `}</style>
    </div>
  );
}

// ── Break screen ─────────────────────────────────────────────────
function BreakScreen({reason,elapsed,onResume}){
  const icons={drinks:"☕",rain:"🌧️",injury:"🏥",other:"⏸️"};
  const titles={drinks:"Drinks Break",rain:"Rain Delay",injury:"Injury Stoppage",other:"Match Paused"};
  const m=Math.floor(elapsed/60),s=elapsed%60;
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:"linear-gradient(160deg,#1A3A5C,#2A5A8C,#1A3A5C)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:24}}>
      <div style={{fontSize:88,animation:"brkSway 3s ease-in-out infinite",lineHeight:1}}>{icons[reason]||"⏸️"}</div>
      <div style={{textAlign:"center",color:"#fff"}}>
        <div style={{fontSize:26,fontWeight:800,marginBottom:6}}>{titles[reason]||"Paused"}</div>
        {reason==="rain"&&<div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:12}}>{["💧","💧","💧","💧","💧"].map((d,i)=><span key={i} style={{fontSize:20,animation:`brkRain 1.5s ${i*0.3}s infinite`}}>{d}</span>)}</div>}
        <div style={{fontSize:48,fontWeight:900,fontVariantNumeric:"tabular-nums",letterSpacing:3,color:"#FFD700",marginTop:8}}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div>
        <div style={{fontSize:12,opacity:0.45,marginTop:4}}>elapsed</div>
      </div>
      <button onClick={onResume} style={{marginTop:16,padding:"15px 44px",borderRadius:16,background:"#FFD700",color:C.dark,fontSize:17,fontWeight:800,border:"none",cursor:"pointer",boxShadow:"0 4px 20px rgba(255,215,0,0.45)"}}>▶ Resume Match</button>
      <style>{`
        @keyframes brkSway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
        @keyframes brkRain{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(10px);opacity:0.4}}
      `}</style>
    </div>
  );
}

// ── Innings end ───────────────────────────────────────────────────
function InningsEnd({score,wickets,balls,maxOvers,batting,innings,target,onStart2nd}){
  const reason=wickets>=10?"All out":`${maxOvers} overs completed`;
  const won=innings===2&&score>=(target||999);
  const lost=innings===2&&balls>=maxOvers*6&&score<(target||999);
  return(
    <div style={{position:"fixed",inset:0,zIndex:450,background:"linear-gradient(160deg,#1A3A20,#2A6030,#1A3A20)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:28}}>
      <div style={{fontSize:56,animation:"cfPop 0.4s ease both"}}>🏏</div>
      <div style={{fontSize:22,fontWeight:800,color:"#FFD700",textAlign:"center"}}>{innings===2?"Match Complete!":"Innings Complete!"}</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.55)"}}>{reason}</div>
      <div style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"20px 36px",textAlign:"center",backdropFilter:"blur(8px)"}}>
        <div style={{fontSize:52,fontWeight:900,color:"#fff",lineHeight:1}}>{score}<span style={{fontSize:24,opacity:0.6}}>/{wickets}</span></div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginTop:4}}>{batting[0]} · {overStr(balls)} overs</div>
      </div>
      {innings===1&&<div style={{fontSize:14,color:"rgba(255,255,255,0.65)",textAlign:"center"}}>Target for 2nd innings: <strong style={{color:"#FFD700"}}>{score+1}</strong></div>}
      {innings===2&&<div style={{textAlign:"center"}}>
        <div style={{fontSize:26,fontWeight:800,color:"#FFD700",marginBottom:4}}>{won?"🏆 Match Won!":lost?"😔 Match Lost":"Match tied!"}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>{won?`Won by ${10-wickets} wickets`:lost?`Lost by ${(target||0)-score-1} runs`:"Remarkable tie!"}</div>
      </div>}
      {innings===1&&<button onClick={onStart2nd} style={{marginTop:12,padding:"16px 52px",borderRadius:16,background:"#FFD700",color:C.dark,fontSize:17,fontWeight:800,border:"none",cursor:"pointer",boxShadow:"0 4px 20px rgba(255,215,0,0.5)"}}>Start 2nd Innings →</button>}
      <style>{`@keyframes cfPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── Wagon Wheel ───────────────────────────────────────────────────
function WagonWheel({activeZone,onZoneTap}){
  const z=activeZone?ZONES[activeZone]:null;
  return(
    <svg width="220" height="226" viewBox="0 0 220 226" style={{display:"block",cursor:"pointer"}}>
      <ellipse cx="110" cy="112" rx="104" ry="108" fill={C.grass} stroke="#2A6010" strokeWidth="1.2"/>
      <path d="M110,112 L110,4 A104,108 0 0,0 6,112 Z" fill="#1B5FA8" opacity="0.20"/>
      <path d="M110,112 L6,112 A104,108 0 0,0 110,220 Z" fill="#1B5FA8" opacity="0.12"/>
      <path d="M110,112 L110,4 A104,108 0 0,1 214,112 Z" fill="#2A7A18" opacity="0.20"/>
      <path d="M110,112 L214,112 A104,108 0 0,1 110,220 Z" fill="#2A7A18" opacity="0.12"/>
      <ellipse cx="110" cy="112" rx="104" ry="108" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7"/>
      <ellipse cx="110" cy="112" rx="54" ry="56" fill="none" stroke="white" strokeWidth="1" strokeDasharray="5,4" opacity="0.65"/>
      <line x1="110" y1="4" x2="110" y2="220" stroke="white" strokeWidth="0.7" strokeDasharray="4,5" opacity="0.45"/>
      <line x1="6" y1="96" x2="214" y2="96" stroke="white" strokeWidth="0.6" strokeDasharray="3,5" opacity="0.38"/>
      <line x1="110" y1="96" x2="30" y2="30" stroke="white" strokeWidth="0.5" opacity="0.28"/>
      <line x1="110" y1="96" x2="190" y2="30" stroke="white" strokeWidth="0.5" opacity="0.28"/>
      <line x1="110" y1="96" x2="22" y2="176" stroke="white" strokeWidth="0.5" opacity="0.28"/>
      <line x1="110" y1="96" x2="198" y2="176" stroke="white" strokeWidth="0.5" opacity="0.28"/>
      <rect x="102" y="88" width="16" height="72" rx="2" fill="#C8B040" stroke="#8A7020" strokeWidth="0.8"/>
      <line x1="102" y1="106" x2="118" y2="106" stroke="white" strokeWidth="0.9"/>
      <line x1="102" y1="140" x2="118" y2="140" stroke="white" strokeWidth="0.9"/>
      <line x1="106" y1="84" x2="106" y2="90" stroke="#7A6010" strokeWidth="1.8"/>
      <line x1="110" y1="82" x2="110" y2="90" stroke="#7A6010" strokeWidth="1.8"/>
      <line x1="114" y1="84" x2="114" y2="90" stroke="#7A6010" strokeWidth="1.8"/>
      <line x1="104" y1="84" x2="116" y2="84" stroke="#7A6010" strokeWidth="1"/>
      <line x1="106" y1="158" x2="106" y2="164" stroke="#7A6010" strokeWidth="1.8"/>
      <line x1="110" y1="158" x2="110" y2="166" stroke="#7A6010" strokeWidth="1.8"/>
      <line x1="114" y1="158" x2="114" y2="164" stroke="#7A6010" strokeWidth="1.8"/>
      <line x1="104" y1="164" x2="116" y2="164" stroke="#7A6010" strokeWidth="1"/>
      <circle cx="110" cy="96" r="6" fill="#185FA5" stroke="white" strokeWidth="1.8"/>
      {z&&<>
        <line x1="110" y1="96" x2={z.pt[0]} y2={z.pt[1]} stroke="#FF2020" strokeWidth="3" strokeLinecap="round"/>
        <circle cx={z.pt[0]} cy={z.pt[1]} r="7" fill="#FF2020" stroke="white" strokeWidth="2"/>
        <circle cx="110" cy="96" r="6" fill="#185FA5" stroke="white" strokeWidth="1.8"/>
      </>}
      {ZONE_PATHS.map(({id,d})=><path key={id} d={d} fill="transparent" onClick={()=>onZoneTap(id)} style={{cursor:"pointer"}}/>)}
      {[{x:110,y:6,w:52,t:"behind"},{x:110,y:213,w:52,t:"straight"},{x:22,y:89,w:38,t:"point"},{x:172,y:89,w:40,t:"sq leg"},{x:8,y:130,w:44,t:"cover"},{x:168,y:130,w:44,t:"midwkt"},{x:12,y:170,w:46,t:"mid-off"},{x:162,y:170,w:46,t:"mid-on"}].map(l=>(
        <g key={l.t}><rect x={l.x-l.w/2} y={l.y} width={l.w} height={14} rx="3" fill="rgba(0,0,0,0.65)"/><text x={l.x} y={l.y+10} textAnchor="middle" fontSize="8.5" fill="white" fontFamily="-apple-system,sans-serif" fontWeight="600">{l.t}</text></g>
      ))}
      <rect x="6" y="28" width="50" height="14" rx="3" fill="rgba(0,0,0,0.65)"/><text x="31" y="38" textAnchor="middle" fontSize="8.5" fill="white" fontFamily="-apple-system,sans-serif" fontWeight="600">3rd man</text>
      <rect x="164" y="28" width="50" height="14" rx="3" fill="rgba(0,0,0,0.65)"/><text x="189" y="38" textAnchor="middle" fontSize="8.5" fill="white" fontFamily="-apple-system,sans-serif" fontWeight="600">fine leg</text>
      <rect x="6" y="50" width="36" height="18" rx="3" fill="#1B5FA8"/><text x="24" y="63" textAnchor="middle" fontSize="11" fill="white" fontFamily="-apple-system,sans-serif" fontWeight="700">OFF</text>
      <rect x="178" y="50" width="36" height="18" rx="3" fill="#2A7A18"/><text x="196" y="63" textAnchor="middle" fontSize="11" fill="white" fontFamily="-apple-system,sans-serif" fontWeight="700">LEG</text>
    </svg>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function FccScorer(){
  // Match
  const [innings,setInnings]=useState(1);
  const [score,setScore]=useState(74);
  const [wickets,setWickets]=useState(2);
  const [balls,setBalls]=useState(50);
  const [maxOvers]=useState(20);
  const [batting,setBatting]=useState(SQUAD1);
  const [bowling,setBowling]=useState(SQUAD2);
  const [batters,setBatters]=useState([{name:"Zachary",runs:34,balls:28},{name:"Arjun",runs:12,balls:14}]);
  const [striker,setStriker]=useState(0);
  const [bowler,setBowler]=useState("Oliver");
  const [overBalls,setOverBalls]=useState(["•","4","1","•","Wd",null]);
  const [target,setTarget]=useState(null);
  // UI
  const [modal,setModal]=useState(null);
  const [celebration,setCelebration]=useState(null);
  const [breakActive,setBreakActive]=useState(false);
  const [breakReason,setBreakReason]=useState("drinks");
  const [breakElapsed,setBreakElapsed]=useState(0);
  const [inningsEnd,setInningsEnd]=useState(false);
  const [persona,setPersona]=useState("hype");
  const [commentary,setCommentary]=useState(`${COMMENTARY.hype.label} Good ball. Building pressure.`);
  // Ball builder
  const [delivery,setDelivery]=useState(null);
  const [extrasType,setExtrasType]=useState(null);
  const [extrasRuns,setExtrasRuns]=useState(null);
  const [outcome,setOutcome]=useState(null);
  const [overthrowRuns,setOverthrowRuns]=useState(null);
  const [activeZone,setActiveZone]=useState(null);
  const [selectedShot,setSelectedShot]=useState(null);
  const [wicketType,setWicketType]=useState(null);
  const [fielder,setFielder]=useState("");
  const [dayMode,setDayMode]=useState(false); // false=night, true=day

  useEffect(()=>{
    if(!breakActive) return;
    const t=setInterval(()=>setBreakElapsed(e=>e+1),1000);
    return()=>clearInterval(t);
  },[breakActive]);

  useEffect(()=>{
    if((wickets>=10||balls>=maxOvers*6)&&!inningsEnd) setTimeout(()=>setInningsEnd(true),600);
  },[wickets,balls]);

  const close=()=>setModal(null);

  function recordBall(){
    const isExtra=!!extrasType;
    const runs=outcome==="overthrow"?(overthrowRuns||1):outcome==="4"?4:outcome==="6"?6:outcome&&!isNaN(parseInt(outcome))?parseInt(outcome):0;
    const extraBonus=extrasRuns&&extrasRuns!=="Wide"&&extrasRuns!=="No-ball"?parseInt(extrasRuns.replace("+","")):0;
    const totalRuns=isExtra?1+extraBonus:runs;
    const countsBall=!extrasType||(extrasType==="noball");
    const ballLabel=wicketType?"W":isExtra?(extrasType==="wide"?"Wd":"Nb"):outcome==="4"?"4":outcome==="6"?"6":runs===0?"•":String(runs);

    setScore(s=>s+totalRuns);
    if(countsBall){
      const nextBalls=balls+1;
      setBalls(nextBalls);
      if(nextBalls%6===0){setOverBalls(Array(6).fill(null));}
      else{const nb=[...overBalls];nb[nextBalls%6-1]=ballLabel;setOverBalls(nb);}
    } else {
      const nb=[...overBalls];nb[balls%6]=ballLabel;setOverBalls(nb);
    }

    const newBatters=[...batters];
    newBatters[striker]={...newBatters[striker],runs:newBatters[striker].runs+runs,balls:newBatters[striker].balls+(countsBall?1:0)};
    setBatters(newBatters);

    const batName=newBatters[striker].name;
    const evt=wicketType?"wicket":outcome==="6"?"six":outcome==="4"?"four":totalRuns===0?"dot":isExtra?(extrasType==="wide"?"wide":"noball"):"one";
    const isDuck=wicketType&&newBatters[striker].runs===0;
    const comm=(COMMENTARY[persona]?.label||"")+" "+getComm(persona,isDuck?"duck":evt,{name:batName});
    setCommentary(comm);

    if(wicketType){
      setCelebration({type:isDuck?"duck":"wicket",text:isDuck?"Duck! 🦆":"WICKET!",sub:`${batName} — ${wicketType}`});
      setWickets(w=>w+1);
    } else if(outcome==="6"){
      setCelebration({type:"six",text:"SIX!! 🚀",sub:getComm(persona,"six")});
    } else if(outcome==="4"){
      setCelebration({type:"four",text:"FOUR! 🏏",sub:`${batName} finds the boundary`});
    }

    setDelivery(null);setExtrasType(null);setExtrasRuns(null);setOutcome(null);
    setOverthrowRuns(null);setActiveZone(null);setSelectedShot(null);setWicketType(null);setFielder("");
    close();
  }

  function start2nd(){
    const t=score+1;
    setTarget(t);setInnings(2);setScore(0);setWickets(0);setBalls(0);
    setBatting(SQUAD2);setBowling(SQUAD1);
    setBatters([{name:SQUAD2[0],runs:0,balls:0},{name:SQUAD2[1],runs:0,balls:0}]);
    setStriker(0);setBowler(SQUAD1[0]);setOverBalls(Array(6).fill(null));setInningsEnd(false);
  }

  const canRecord=!!(delivery||extrasType)&&!!(outcome||extrasType);
  const zoneData=activeZone?ZONES[activeZone]:null;
  const sideColor=zoneData?(zoneData.side==="off"?C.off:zoneData.side==="leg"?C.leg:"#555"):C.blue;

  const Tag=({children,color=C.blue})=>(
    <span style={{background:color+"22",color,padding:"2px 8px",borderRadius:5,fontSize:11,fontWeight:600,display:"inline-block"}}>{children}</span>
  );

  return(
    <div style={{background:"#E0DDD6",minHeight:"100vh",display:"flex",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <div style={{width:"100%",maxWidth:420,background:dayMode?"#E8E4D8":C.bg,display:"flex",flexDirection:"column",minHeight:"100vh"}}>

        {/* ── SCOREBOARD ── */}
        <div style={{
          background:dayMode
            ?"linear-gradient(160deg,#1A2A4A 0%,#243560 60%,#1A2A4A 100%)"
            :"linear-gradient(160deg,#0D1117 0%,#161C26 60%,#0D1117 100%)",
          padding:"14px 16px 12px",flexShrink:0,position:"relative",overflow:"hidden"
        }}>
          {/* Gold accent bar top */}
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,
            background:"linear-gradient(90deg,transparent,#C9A84C,#F5D060,#C9A84C,transparent)"}}/>
          {/* Dot texture */}
          <div style={{position:"absolute",inset:0,
            backgroundImage:"radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)",
            backgroundSize:"18px 18px",pointerEvents:"none"}}/>
          <div style={{position:"relative"}}>
            {/* Top row: innings label + day/night toggle */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:600,color:"#C9A84C",textTransform:"uppercase",letterSpacing:1.2}}>
                {innings===1?"1st":"2nd"} Innings · {batting[0]}
              </div>
              {/* Day / Night toggle */}
              <div onClick={()=>setDayMode(d=>!d)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,
                  background:dayMode?"rgba(255,220,80,0.18)":"rgba(255,255,255,0.06)",
                  border:dayMode?"1px solid rgba(255,220,80,0.5)":"1px solid rgba(255,255,255,0.12)",
                  cursor:"pointer",userSelect:"none"}}>
                <span style={{fontSize:13}}>{dayMode?"☀️":"🌙"}</span>
                <span style={{fontSize:10,fontWeight:700,
                  color:dayMode?"#FFD060":"rgba(255,255,255,0.45)",
                  textTransform:"uppercase",letterSpacing:0.8}}>
                  {dayMode?"Day":"Night"}
                </span>
              </div>
            </div>
            {/* Score */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{display:"flex",alignItems:"baseline",gap:2}}>
                  <span style={{fontSize:52,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:-2}}>{score}</span>
                  <span style={{fontSize:28,fontWeight:400,color:"rgba(255,255,255,0.35)",lineHeight:1}}>/{wickets}</span>
                </div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:4,letterSpacing:0.2}}>
                  {overStr(balls)} ov &nbsp;·&nbsp; CRR <span style={{color:"rgba(255,255,255,0.8)",fontWeight:600}}>{balls>0?(score/(balls/6)).toFixed(1):"0.0"}</span>
                </div>
              </div>
              <div style={{textAlign:"right",paddingTop:4}}>
                {target&&<div style={{fontSize:14,fontWeight:800,color:"#F5D060",marginBottom:4}}>Need {target-score}</div>}
                {target&&<div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{(maxOvers-Math.floor(balls/6))*6-(balls%6)} balls left</div>}
                {!target&&<div style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>{maxOvers-Math.floor(balls/6)} ov left</div>}
              </div>
            </div>
            {/* Batters */}
            <div style={{display:"flex",gap:6,marginBottom:8,position:"relative"}}>
              {batters.map((b,i)=>(
                <div key={i} onClick={()=>{setStriker(i);setModal("batter");}}
                  style={{flex:1,padding:"8px 10px",borderRadius:10,cursor:"pointer",
                    background:striker===i?"rgba(201,168,76,0.15)":"rgba(255,255,255,0.05)",
                    border:striker===i?"1px solid rgba(201,168,76,0.5)":"1px solid rgba(255,255,255,0.08)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                    {/* Bat icon — only shown for striker */}
                    {striker===i&&(
                      <svg width="14" height="14" viewBox="0 0 24 24" style={{flexShrink:0}}>
                        {/* Bat blade */}
                        <rect x="3" y="2" width="7" height="16" rx="2" fill="#F5D060"/>
                        {/* Bat handle */}
                        <rect x="5.5" y="17" width="2" height="6" rx="1" fill="#C8A84C"/>
                        {/* Handle grip wrap lines */}
                        <line x1="5.5" y1="19" x2="7.5" y2="19" stroke="#8B6010" strokeWidth="0.8"/>
                        <line x1="5.5" y1="21" x2="7.5" y2="21" stroke="#8B6010" strokeWidth="0.8"/>
                      </svg>
                    )}
                    <div style={{fontSize:13,color:striker===i?"#F5D060":"rgba(255,255,255,0.6)",fontWeight:striker===i?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name}</div>
                  </div>
                  <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{b.runs} <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:400}}>({b.balls})</span></div>
                </div>
              ))}
              {/* Swap strike button — between the two batter cards */}
              <div onClick={()=>setStriker(s=>s===0?1:0)}
                title="Swap strike"
                style={{
                  position:"absolute",left:"50%",top:"50%",
                  transform:"translate(-50%,-50%)",
                  width:26,height:26,borderRadius:"50%",
                  background:"rgba(201,168,76,0.25)",
                  border:"1.5px solid rgba(201,168,76,0.5)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:"pointer",zIndex:2,flexShrink:0,
                }}>
                <svg width="14" height="14" viewBox="0 0 20 20">
                  <path d="M4 7 L4 4 L16 4 L16 7" fill="none" stroke="#F5D060" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="13,2 16,4 13,6" fill="none" stroke="#F5D060" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13 L16 16 L4 16 L4 13" fill="none" stroke="#F5D060" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="7,18 4,16 7,14" fill="none" stroke="#F5D060" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {/* Bowler + over strip */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div onClick={()=>setModal("bowler")} style={{fontSize:12,color:"rgba(255,255,255,0.5)",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:5}}>
                <svg width="14" height="14" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#CC2222"/><path d="M20 4 Q28 16 20 28" fill="none" stroke="white" strokeWidth="1.8" strokeDasharray="3,2.5" strokeLinecap="round"/><path d="M24 5 Q32 16 24 27" fill="none" stroke="white" strokeWidth="1.8" strokeDasharray="3,2.5" strokeLinecap="round"/></svg>
                <span style={{color:"rgba(255,255,255,0.7)",fontWeight:500}}>{bowler}</span>
                <span style={{opacity:0.35,fontSize:9}}>▼</span>
              </div>
              <div style={{flex:1,display:"flex",gap:4,justifyContent:"flex-end"}}>
                {overBalls.map((b,i)=>{
                  const {bg,tc}=ballStyle(b);
                  return <div key={i} style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:b?bg:"rgba(255,255,255,0.06)",color:b?tc:"rgba(255,255,255,0.18)",border:`1px solid ${b?tc+"50":"rgba(255,255,255,0.08)"}`}}>{b||"·"}</div>;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── COMMENTARY TICKER ── */}
        <div onClick={()=>setModal("commentary")} style={{background:"#252523",padding:"7px 14px",display:"flex",alignItems:"center",gap:8,cursor:"pointer",flexShrink:0}}>
          <div style={{flex:1,fontSize:12,color:"rgba(255,255,255,0.65)",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",fontStyle:"italic"}}>{commentary}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",flexShrink:0}}>persona ▼</div>
        </div>



        {/* ── 3 MAIN ACTION CARDS ── */}
        <div style={{flex:1,padding:"10px 12px 0",display:"flex",flexDirection:"column",gap:8,minHeight:0}}>

          {/* Current ball summary */}
          {(delivery||extrasType||outcome||activeZone||wicketType)&&(
            <div style={{background:dayMode?"#fff":"#fff",borderRadius:12,padding:"8px 12px",border:`0.5px solid ${C.border}`,flexShrink:0}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
                {(delivery||extrasType)&&<Tag color={C.blue}>{extrasType||delivery}</Tag>}
                {extrasRuns&&<Tag color={C.pink}>{extrasRuns}</Tag>}
                {outcome&&<Tag color={C.green}>{outcome==="overthrow"?`OT+${overthrowRuns}`:outcome}</Tag>}
                {activeZone&&<Tag color={C.off}>→ {ZONES[activeZone]?.label}</Tag>}
                {selectedShot&&<Tag color={C.leg}>{selectedShot}</Tag>}
                {wicketType&&<Tag color={C.red}>W: {wicketType}</Tag>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <div onClick={()=>{setDelivery(null);setExtrasType(null);setExtrasRuns(null);setOutcome(null);setOverthrowRuns(null);setActiveZone(null);setSelectedShot(null);setWicketType(null);}}
                  style={{padding:"6px 14px",borderRadius:8,border:`0.5px solid ${C.border}`,fontSize:12,color:C.muted,cursor:"pointer"}}>✕ Clear</div>
                {canRecord&&<div onClick={recordBall}
                  style={{flex:1,padding:"7px 14px",borderRadius:8,background:C.blue,fontSize:13,color:"#fff",fontWeight:700,cursor:"pointer",textAlign:"center"}}>✓ Record Ball</div>}
              </div>
            </div>
          )}

          {[
            {
              step:1, label:"Delivery",
              hint:"Select type of ball",
              done:!!(delivery||extrasType),
              preview:extrasType||delivery,
              // Night: deep warm dark. Day: crisp navy.
              nightBg:"linear-gradient(135deg,#1C0C0A 0%,#2E1412 100%)",
              nightBgDone:"linear-gradient(135deg,#2E0E0C 0%,#501C1A 100%)",
              dayBg:"linear-gradient(135deg,#1A0800 0%,#3A1008 100%)",
              dayBgDone:"linear-gradient(135deg,#3A0A08 0%,#661A14 100%)",
              deco:(
                <svg style={{position:"absolute",right:-10,top:-10,opacity:dayMode?0.18:0.1,pointerEvents:"none"}} width="90" height="90" viewBox="0 0 90 90">
                  <circle cx="78" cy="12" r="28" fill="none" stroke="white" strokeWidth="7"/>
                  <circle cx="78" cy="12" r="50" fill="none" stroke="white" strokeWidth="4"/>
                  <circle cx="78" cy="12" r="70" fill="none" stroke="white" strokeWidth="2"/>
                </svg>
              ),
              onClick:()=>setModal("delivery"),
            },
            {
              step:2, label:"Runs",
              hint:"How many runs scored?",
              done:!!outcome,
              preview:outcome==="overthrow"?`Overthrow +${overthrowRuns}`:outcome==="·"?"Dot ball":outcome,
              nightBg:"linear-gradient(135deg,#091408 0%,#102010 100%)",
              nightBgDone:"linear-gradient(135deg,#0C1E0C 0%,#183018 100%)",
              dayBg:"linear-gradient(135deg,#041208 0%,#0A2010 100%)",
              dayBgDone:"linear-gradient(135deg,#082010 0%,#103A18 100%)",
              deco:(
                <svg style={{position:"absolute",right:0,top:0,bottom:0,opacity:dayMode?0.15:0.08,pointerEvents:"none",height:"100%"}} width="60" viewBox="0 0 60 72">
                  <rect x="22" y="0" width="16" height="72" fill="white"/>
                  <line x1="22" y1="18" x2="38" y2="18" stroke="white" strokeWidth="3"/>
                  <line x1="22" y1="54" x2="38" y2="54" stroke="white" strokeWidth="3"/>
                </svg>
              ),
              onClick:()=>setModal("outcome"),
            },
            {
              step:3, label:"Shot Direction",
              hint:"Optional — tap wagon wheel",
              done:!!activeZone,
              preview:activeZone?`${ZONES[activeZone]?.label}${selectedShot?" · "+selectedShot:""}`:null,
              nightBg:"linear-gradient(135deg,#080E1C 0%,#101828 100%)",
              nightBgDone:"linear-gradient(135deg,#0A1428 0%,#162040 100%)",
              dayBg:"linear-gradient(135deg,#060C20 0%,#0E1838 100%)",
              dayBgDone:"linear-gradient(135deg,#0A1632 0%,#182A58 100%)",
              deco:(
                <svg style={{position:"absolute",right:-6,top:"50%",transform:"translateY(-50%)",opacity:dayMode?0.16:0.1,pointerEvents:"none"}} width="80" height="80" viewBox="0 0 80 80">
                  <ellipse cx="40" cy="40" rx="36" ry="38" fill="none" stroke="white" strokeWidth="1.5"/>
                  <ellipse cx="40" cy="40" rx="18" ry="19" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,3"/>
                  <line x1="40" y1="2" x2="40" y2="78" stroke="white" strokeWidth="0.8"/>
                  <line x1="2" y1="40" x2="78" y2="40" stroke="white" strokeWidth="0.8"/>
                  <line x1="10" y1="10" x2="70" y2="70" stroke="white" strokeWidth="0.7"/>
                  <line x1="70" y1="10" x2="10" y2="70" stroke="white" strokeWidth="0.7"/>
                  <circle cx="40" cy="40" r="4" fill="white"/>
                </svg>
              ),
              onClick:()=>setModal("direction"),
            },
          ].map(({step,label,hint,done,preview,nightBg,nightBgDone,dayBg,dayBgDone,deco,onClick})=>{
            const bg = dayMode?(done?dayBgDone:dayBg):(done?nightBgDone:nightBg);
            // Gold values — MUCH stronger in day mode for visibility
            const goldBorder = dayMode
              ?(done?"rgba(255,185,0,0.9)":"rgba(220,160,0,0.45)")
              :(done?"rgba(201,168,76,0.7)":"rgba(201,168,76,0.2)");
            const goldLabel = dayMode?(done?"#FFB800":"#D4940A"):(done?"#FFD060":"rgba(201,168,76,0.7)");
            const goldBadge = dayMode?(done?"rgba(255,185,0,0.22)":"rgba(220,160,0,0.08)"):(done?"rgba(255,210,60,0.15)":"rgba(255,200,60,0.06)");
            const goldBadgeBorder = dayMode?(done?"rgba(255,185,0,0.8)":"rgba(220,160,0,0.3)"):(done?"rgba(255,210,60,0.6)":"rgba(201,168,76,0.25)");
            const topLineColor = dayMode
              ?(done?"linear-gradient(90deg,transparent,#FFB800,#FFE060,#FFB800,transparent)":"linear-gradient(90deg,transparent,rgba(220,160,0,0.7),rgba(255,200,50,0.9),rgba(220,160,0,0.7),transparent)")
              :(done?"linear-gradient(90deg,transparent,rgba(255,220,80,0.9),rgba(255,255,200,1),rgba(255,220,80,0.9),transparent)":"linear-gradient(90deg,transparent,rgba(201,168,76,0.5),rgba(255,220,120,0.7),rgba(201,168,76,0.5),transparent)");
            const glowShadow = dayMode
              ?(done?"0 0 0 1.5px rgba(255,185,0,0.25), 0 4px 20px rgba(0,0,0,0.5)":"0 2px 10px rgba(0,0,0,0.4)")
              :(done?"0 0 0 1px rgba(255,210,60,0.15), 0 4px 20px rgba(0,0,0,0.4)":"0 2px 8px rgba(0,0,0,0.35)");
            return(
              <div key={step} onClick={onClick}
                style={{
                  flex:1, borderRadius:14, cursor:"pointer", overflow:"hidden",
                  position:"relative", display:"flex", alignItems:"center",
                  background:bg,
                  border:`1.5px solid ${goldBorder}`,
                  boxShadow:glowShadow,
                  minHeight:0, maxHeight:76,
                }}>
                {/* Top shimmer line */}
                <div style={{position:"absolute",top:0,left:0,right:0,height:"1.5px",background:topLineColor,pointerEvents:"none"}}/>
                {/* Diagonal light sweep */}
                <div style={{position:"absolute",top:0,left:0,width:"50%",height:"100%",
                  background:"linear-gradient(115deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.02) 50%,transparent 70%)",
                  pointerEvents:"none"}}/>
                {deco}
                <div style={{position:"relative",padding:"13px 16px",display:"flex",alignItems:"center",gap:13,width:"100%"}}>
                  {/* Step badge */}
                  <div style={{width:34,height:34,borderRadius:10,flexShrink:0,
                    background:goldBadge,border:`1.5px solid ${goldBadgeBorder}`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:15,fontWeight:900,color:goldLabel}}>{step}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:3,color:goldLabel}}>{label}</div>
                    <div style={{fontSize:16,fontWeight:done?700:500,letterSpacing:0.1,
                      // DAY MODE: pure white for max contrast in sunlight
                      color:done?"#FFFFFF":dayMode?"rgba(255,255,255,0.75)":"rgba(255,255,255,0.5)",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                    }}>{preview||hint}</div>
                  </div>
                  <div style={{fontSize:17,flexShrink:0,fontWeight:700,color:done?goldLabel:"rgba(255,255,255,0.2)"}}>{done?"✓":"›"}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── SECONDARY ROW ── */}
        <div style={{padding:"8px 12px 12px",display:"flex",gap:8,flexShrink:0}}>
          {/* BOWLER */}
          <div onClick={()=>setModal("bowler")}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 4px",borderRadius:12,background:C.white,border:`0.5px solid ${C.border}`,cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <svg width="24" height="24" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#CC2222"/><path d="M20 4 Q28 16 20 28" fill="none" stroke="white" strokeWidth="1.8" strokeDasharray="3,2.5" strokeLinecap="round"/><path d="M24 5 Q32 16 24 27" fill="none" stroke="white" strokeWidth="1.8" strokeDasharray="3,2.5" strokeLinecap="round"/></svg>
            <div style={{fontSize:10,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:0.4}}>Bowler</div>
          </div>

          {/* WICKET — 3 stumps + 2 bails, clean */}
          <div onClick={()=>setModal("wicket")}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 4px",borderRadius:12,background:C.white,border:`0.5px solid ${wicketType?"#E8A0A0":C.border}`,cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <svg width="26" height="24" viewBox="0 0 32 28">
              {/* 3 stumps */}
              <rect x="6"  y="7" width="4" height="19" rx="2" fill={wicketType?"#E24B4A":"#888"}/>
              <rect x="14" y="7" width="4" height="19" rx="2" fill={wicketType?"#E24B4A":"#888"}/>
              <rect x="22" y="7" width="4" height="19" rx="2" fill={wicketType?"#E24B4A":"#888"}/>
              {/* 2 bails */}
              <rect x="5"  y="5" width="8"  height="3.5" rx="1.8" fill={wicketType?"#E24B4A":"#666"}/>
              <rect x="19" y="5" width="8"  height="3.5" rx="1.8" fill={wicketType?"#E24B4A":"#666"}/>
            </svg>
            <div style={{fontSize:10,fontWeight:700,color:wicketType?C.red:"#888",textTransform:"uppercase",letterSpacing:0.4}}>Wicket</div>
          </div>

          {/* BREAK */}
          <div onClick={()=>setModal("break")}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 4px",borderRadius:12,background:C.white,border:`0.5px solid ${C.border}`,cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <svg width="24" height="24" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke={C.amber} strokeWidth="2.5"/>
              <rect x="11" y="9" width="4" height="14" rx="2" fill={C.amber}/>
              <rect x="17" y="9" width="4" height="14" rx="2" fill={C.amber}/>
            </svg>
            <div style={{fontSize:10,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:0.4}}>Break</div>
          </div>

          {/* MORE */}
          <div onClick={()=>setModal("more")}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 4px",borderRadius:12,background:C.white,border:`0.5px solid ${C.border}`,cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <svg width="24" height="24" viewBox="0 0 32 32">
              <circle cx="7"  cy="16" r="3" fill={C.muted}/>
              <circle cx="16" cy="16" r="3" fill={C.muted}/>
              <circle cx="25" cy="16" r="3" fill={C.muted}/>
            </svg>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>More</div>
          </div>
        </div>

        {/* ─── MODALS ─────────────────────────────────── */}

        {modal==="delivery"&&(
          <Sheet title="1 — Delivery" onClose={close} noPad>
            <div style={{padding:"14px 16px 0"}}>
              <div style={{fontSize:12,color:"#5F5E5A",marginBottom:10,textAlign:"center"}}>
                Tap where ball pitched
              </div>

              {/* Wide badges flanking stumps */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginBottom:6}}>
                <div onClick={()=>{setExtrasType("wide");setDelivery("wide-off");close();setModal("extras");}}
                  style={{
                    padding:"6px 10px",borderRadius:8,cursor:"pointer",textAlign:"center",
                    background:extrasType==="wide"&&delivery==="wide-off"?"#FF9800":"#3A2200",
                    border:extrasType==="wide"&&delivery==="wide-off"?"2px solid #FFB800":"2px solid #6A4800",
                    minWidth:54,
                  }}>
                  <div style={{fontSize:9,fontWeight:800,color:"#fff",textTransform:"uppercase",letterSpacing:0.8}}>Wide</div>
                  <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>Off ←</div>
                </div>
                <div style={{display:"flex",gap:3,alignItems:"flex-end",padding:"0 6px"}}>
                  <div style={{width:3,height:20,background:"#888",borderRadius:1}}/>
                  <div style={{width:3,height:24,background:"#888",borderRadius:1}}/>
                  <div style={{width:3,height:20,background:"#888",borderRadius:1}}/>
                </div>
                <div onClick={()=>{setExtrasType("wide");setDelivery("wide-leg");close();setModal("extras");}}
                  style={{
                    padding:"6px 10px",borderRadius:8,cursor:"pointer",textAlign:"center",
                    background:extrasType==="wide"&&delivery==="wide-leg"?"#FF9800":"#3A2200",
                    border:extrasType==="wide"&&delivery==="wide-leg"?"2px solid #FFB800":"2px solid #6A4800",
                    minWidth:54,
                  }}>
                  <div style={{fontSize:9,fontWeight:800,color:"#fff",textTransform:"uppercase",letterSpacing:0.8}}>Wide</div>
                  <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>→ Leg</div>
                </div>
              </div>

              <div style={{display:"flex",justifyContent:"center"}}>
                <svg width="240" height="310" viewBox="0 0 240 310" style={{display:"block"}}>
                  <defs>
                    <clipPath id="pc">
                      <path d="M72,10 L168,10 L220,300 L20,300 Z"/>
                    </clipPath>
                  </defs>

                  {/* Grass background — greenish yellow like real outfield */}
                  <rect x="0" y="0" width="240" height="310" fill="#7DB832" rx="10"/>
                  {/* Subtle mown stripe texture */}
                  {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>(
                    <rect key={i} x="0" y={i*26} width="240" height="13" fill="rgba(0,0,0,0.04)" rx="0"/>
                  ))}

                  {/* Pitch surface */}
                  <path d="M72,10 L168,10 L220,300 L20,300 Z" fill="#C4A24A"/>

                  {/* Clipped zones */}
                  <g clipPath="url(#pc)">
                    <rect x="0" y="10"  width="240" height="48" fill={delivery==="Yorker"?"#FFD700":"#C89800"}           opacity={delivery==="Yorker"?1:0.9}/>
                    <rect x="0" y="58"  width="240" height="58" fill={delivery==="Full"?"#3DC43D":"#208A20"}              opacity={delivery==="Full"?1:0.9}/>
                    <rect x="0" y="116" width="240" height="62" fill={delivery==="Good length"?"#2A88F0":"#1A5CB8"}       opacity={delivery==="Good length"?1:0.9}/>
                    <rect x="0" y="178" width="240" height="56" fill={delivery==="Back of length"?"#B050D0":"#7A2A9A"}    opacity={delivery==="Back of length"?1:0.9}/>
                    <rect x="0" y="234" width="240" height="66" fill={delivery==="Short"?"#FF3A18":"#B82A10"}             opacity={delivery==="Short"?1:0.9}/>
                  </g>

                  {/* Pitch outline */}
                  <path d="M72,10 L168,10 L220,300 L20,300 Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>

                  {/* Zone dividers */}
                  <line x1="20" y1="58"  x2="220" y2="58"  stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeDasharray="5,3"/>
                  <line x1="20" y1="116" x2="220" y2="116" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeDasharray="5,3"/>
                  <line x1="20" y1="178" x2="220" y2="178" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeDasharray="5,3"/>
                  <line x1="20" y1="234" x2="220" y2="234" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeDasharray="5,3"/>

                  {/* Batting crease */}
                  <line x1="74" y1="56" x2="166" y2="56" stroke="white" strokeWidth="2.5"/>
                  {/* Popping crease */}
                  <line x1="74" y1="46" x2="166" y2="46" stroke="white" strokeWidth="1.2" strokeDasharray="5,4"/>

                  {/* Centre stumps line */}
                  <line x1="120" y1="10" x2="120" y2="300" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeDasharray="7,5"/>

                  {/* BATTER STUMPS at top only — no bowler stumps */}
                  <rect x="112" y="10" width="3" height="48" rx="1.2" fill="white" opacity="0.95"/>
                  <rect x="118" y="8"  width="3" height="50" rx="1.2" fill="white" opacity="0.95"/>
                  <rect x="124" y="10" width="3" height="48" rx="1.2" fill="white" opacity="0.95"/>
                  <rect x="110" y="10" width="8" height="2.5" rx="1.2" fill="white" opacity="0.95"/>
                  <rect x="122" y="10" width="7" height="2.5" rx="1.2" fill="white" opacity="0.95"/>

                  {/* Zone labels */}
                  <text x="120" y="40"  textAnchor="middle" fontSize="11" fontWeight="800" fill="rgba(0,0,0,0.7)"  fontFamily="-apple-system,sans-serif">YORKER</text>
                  <text x="120" y="92"  textAnchor="middle" fontSize="12" fontWeight="800" fill="white" fontFamily="-apple-system,sans-serif">FULL</text>
                  <text x="120" y="152" textAnchor="middle" fontSize="12" fontWeight="800" fill="white" fontFamily="-apple-system,sans-serif">GOOD LENGTH</text>
                  <text x="120" y="210" textAnchor="middle" fontSize="11" fontWeight="800" fill="white" fontFamily="-apple-system,sans-serif">BACK OF LENGTH</text>
                  <text x="120" y="273" textAnchor="middle" fontSize="13" fontWeight="800" fill="white" fontFamily="-apple-system,sans-serif">SHORT</text>

                  {/* Selected dot */}
                  {delivery&&!["wide-off","wide-leg"].includes(delivery)&&(()=>{
                    const dy={Yorker:36,Full:87,"Good length":147,"Back of length":206,Short:265}[delivery]||147;
                    return <circle cx="120" cy={dy} r="10" fill="white" opacity="0.95" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>;
                  })()}

                  {/* Tap zones */}
                  <rect x="20" y="10"  width="200" height="48" fill="transparent" style={{cursor:"pointer"}} onClick={()=>{setDelivery("Yorker");       setExtrasType(null);close();}}/>
                  <rect x="20" y="58"  width="200" height="58" fill="transparent" style={{cursor:"pointer"}} onClick={()=>{setDelivery("Full");          setExtrasType(null);close();}}/>
                  <rect x="20" y="116" width="200" height="62" fill="transparent" style={{cursor:"pointer"}} onClick={()=>{setDelivery("Good length");   setExtrasType(null);close();}}/>
                  <rect x="20" y="178" width="200" height="56" fill="transparent" style={{cursor:"pointer"}} onClick={()=>{setDelivery("Back of length");setExtrasType(null);close();}}/>
                  <rect x="20" y="234" width="200" height="66" fill="transparent" style={{cursor:"pointer"}} onClick={()=>{setDelivery("Short");         setExtrasType(null);close();}}/>
                </svg>
              </div>

              {/* No-ball */}
              <div style={{display:"flex",justifyContent:"center",padding:"10px 0 20px"}}>
                <div onClick={()=>{setExtrasType("noball");setDelivery(null);close();setModal("extras");}}
                  style={{padding:"9px 32px",borderRadius:24,fontSize:13,fontWeight:700,cursor:"pointer",
                    border:`1.5px solid ${extrasType==="noball"?"#B07010":"#D3D1C7"}`,
                    background:extrasType==="noball"?"#FFF0E0":"#fff",
                    color:extrasType==="noball"?"#7A4000":"#5F5E5A"}}>
                  ⚠️ No-ball
                </div>
              </div>
            </div>
          </Sheet>
        )}

{modal==="extras"&&(
          <Sheet title={`${extrasType==="wide"?"Wide":"No-ball"} — bonus runs?`} onClose={close}>
            <div style={{fontSize:13,color:C.sub,marginBottom:12}}>{extrasType==="wide"?"Extra run auto-added. Any bonus runs scored?":"No-ball — 1 run added. Any runs off the bat?"}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[extrasType==="wide"?"Wide":"No-ball","+1","+2","+3","+4","+6","+LB","+B"].map(r=>(
                <div key={r} onClick={()=>{setExtrasRuns(r);close();}}
                  style={{padding:"14px 4px",borderRadius:10,border:`1.5px solid ${extrasRuns===r?C.blue:C.border}`,background:extrasRuns===r?C.blueLt:C.white,fontSize:13,fontWeight:extrasRuns===r?700:400,color:extrasRuns===r?C.blueDk:C.text,cursor:"pointer",textAlign:"center"}}>
                  {r}
                </div>
              ))}
            </div>
          </Sheet>
        )}

        {modal==="outcome"&&(
          <Sheet title="2 — Outcome" onClose={close}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
              {["·","1","2","3","4","6","LB","B"].map(o=>{
                const isSel=outcome===o;
                const special=o==="4"?{bg:C.blueLt,bc:"#5E9FD4",tc:C.blueDk}:o==="6"?{bg:C.amberLt,bc:"#D4A040",tc:"#7A4000"}:null;
                return(
                  <div key={o} onClick={()=>{setOutcome(o);setOverthrowRuns(null);close();}}
                    style={{padding:"16px 4px",borderRadius:10,border:`1.5px solid ${isSel||special?(special?.bc||"#4A9A20"):C.border}`,background:special?special.bg:isSel?C.greenLt:C.white,fontSize:o==="4"||o==="6"?20:16,fontWeight:700,color:special?special.tc:isSel?C.greenDk:C.text,cursor:"pointer",textAlign:"center"}}>
                    {o}
                  </div>
                );
              })}
            </div>
            <div onClick={()=>setModal("overthrow")}
              style={{padding:16,borderRadius:12,border:`1.5px solid ${outcome==="overthrow"?C.amber:C.border}`,background:outcome==="overthrow"?C.amberLt:C.white,fontSize:14,fontWeight:700,color:outcome==="overthrow"?"#7A4000":C.text,cursor:"pointer",textAlign:"center"}}>
              {outcome==="overthrow"?`Overthrow +${overthrowRuns} ✓`:"Overthrow →"}
            </div>
          </Sheet>
        )}

        {modal==="overthrow"&&(
          <Sheet title="Overthrow — how many runs?" onClose={close}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[1,2,3,4].map(r=>(
                <div key={r} onClick={()=>setOverthrowRuns(r)}
                  style={{padding:"22px 4px",borderRadius:12,border:`2px solid ${overthrowRuns===r?C.amber:C.border}`,background:overthrowRuns===r?C.amberLt:C.white,fontSize:26,fontWeight:800,color:overthrowRuns===r?"#7A4000":C.text,cursor:"pointer",textAlign:"center"}}>
                  {r}
                </div>
              ))}
            </div>
            <div onClick={()=>{if(overthrowRuns){setOutcome("overthrow");close();}}}
              style={{padding:15,borderRadius:12,background:overthrowRuns?C.amber:"#ccc",color:"#fff",fontSize:15,fontWeight:700,cursor:overthrowRuns?"pointer":"default",textAlign:"center"}}>
              Confirm Overthrow +{overthrowRuns||"?"}
            </div>
          </Sheet>
        )}

        {modal==="direction"&&(
          <Sheet title="3 — Direction & shot (optional)" onClose={close} noPad>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0 4px"}}>
              <div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8}}>Tap zone on wheel</div>
              <WagonWheel activeZone={activeZone} onZoneTap={z=>{setActiveZone(z);setSelectedShot(null);}}/>
              <div style={{display:"flex",gap:12,marginTop:4,marginBottom:6}}>
                {[{l:"OFF",bg:"#A0C4E8",bc:"#1B5FA8",tc:"#1B5FA8"},{l:"LEG",bg:"#A0D890",bc:"#2A7A18",tc:"#2A7A18"}].map(l=>(
                  <div key={l.l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:l.tc}}>
                    <div style={{width:10,height:10,borderRadius:2,background:l.bg,border:`1px solid ${l.bc}`}}/>{l.l}
                  </div>
                ))}
              </div>
            </div>
            {zoneData&&(
              <div style={{borderTop:`0.5px solid ${C.border}`}}>
                <div style={{padding:"8px 16px",background:sideColor,color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:0.3}}>{zoneData.label}</span>
                  <span onClick={()=>setActiveZone(null)} style={{cursor:"pointer",fontSize:16,opacity:0.7}}>✕</span>
                </div>
                <div style={{padding:"8px 16px 24px",display:"flex",flexDirection:"column",gap:6}}>
                  {zoneData.shots.map(sh=>{
                    const isSel=selectedShot===sh.n;
                    return(
                      <div key={sh.n} onClick={()=>{setSelectedShot(sh.n);setTimeout(close,280);}}
                        style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${isSel?sideColor:C.border}`,background:isSel?(zoneData.side==="off"?C.offLt:zoneData.side==="leg"?C.legLt:"#E8E6DF"):C.white,cursor:"pointer"}}>
                        <div style={{fontSize:14,fontWeight:isSel?700:500,color:isSel?sideColor:C.text}}>{sh.n}</div>
                        <div style={{fontSize:11,color:C.sub,marginTop:2}}>{sh.d}</div>
                      </div>
                    );
                  })}
                  <div onClick={close} style={{fontSize:12,color:C.muted,textAlign:"center",padding:"6px 0",cursor:"pointer",fontStyle:"italic"}}>Skip — keep direction only</div>
                </div>
              </div>
            )}
            {!zoneData&&<div style={{padding:"12px 16px 32px",textAlign:"center",color:C.muted,fontSize:13,fontStyle:"italic"}}>Tap a zone on the wheel above</div>}
          </Sheet>
        )}

        {modal==="wicket"&&(
          <Sheet title="Wicket / Retirement" onClose={close} accent={C.red}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Dismissal type</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14}}>
              {["Bowled","Caught","LBW","Run out","Stumped","Hit wicket"].map(d=>(
                <div key={d} onClick={()=>setWicketType(d)}
                  style={{padding:14,borderRadius:10,border:`1.5px solid ${wicketType===d?C.red:C.border}`,background:wicketType===d?C.redLt:C.white,fontSize:13,fontWeight:wicketType===d?700:400,color:wicketType===d?C.red:C.text,cursor:"pointer",textAlign:"center"}}>
                  {d}
                </div>
              ))}
            </div>
            {wicketType&&<>
              <input value={fielder} onChange={e=>setFielder(e.target.value)} placeholder="Fielder / keeper (optional)"
                style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`0.5px solid ${C.border}`,fontSize:13,marginBottom:10,fontFamily:"inherit",outline:"none"}}/>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8}}>Batsman out</div>
              {batters.map((b,i)=>(
                <div key={i} onClick={()=>setStriker(i)}
                  style={{padding:"13px 14px",borderRadius:10,border:`1.5px solid ${striker===i?C.red:C.border}`,background:striker===i?C.redLt:C.white,marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:14,fontWeight:striker===i?700:400,color:striker===i?C.red:C.text}}>{b.name}</span>
                  <span style={{fontSize:13,color:C.sub}}>{b.runs} ({b.balls})</span>
                </div>
              ))}
              <div onClick={()=>{if(wicketType) recordBall();}}
                style={{marginTop:12,padding:14,borderRadius:12,background:C.red,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",textAlign:"center"}}>
                Confirm Wicket
              </div>
            </>}
            <div style={{display:"flex",alignItems:"center",gap:8,margin:"20px 0 12px"}}>
              <div style={{flex:1,height:"0.5px",background:C.border}}/>
              <span style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,whiteSpace:"nowrap"}}>Retirement (not a wicket)</span>
              <div style={{flex:1,height:"0.5px",background:C.border}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {[{id:"limit",label:"Retired (limit)",sub:"Runs limit — can return",bg:C.amberLt,bc:C.amber,tc:"#7A4000"},
                {id:"hurt", label:"Retired hurt",  sub:"Injury — can return",  bg:C.pinkLt,bc:C.pink,tc:"#7A1A50"}].map(r=>(
                <div key={r.id} onClick={close}
                  style={{padding:"13px 8px",borderRadius:10,border:`0.5px solid ${r.bc}`,background:r.bg,cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:600,color:r.tc}}>{r.label}</div>
                  <div style={{fontSize:11,color:r.tc,opacity:0.7,marginTop:3}}>{r.sub}</div>
                </div>
              ))}
            </div>
          </Sheet>
        )}

        {modal==="bowler"&&(
          <Sheet title="Select bowler" onClose={close}>
            <div style={{fontSize:13,color:C.sub,marginBottom:4}}>Current: <strong>{bowler}</strong> · Over {Math.floor(balls/6)+1}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Tap to change bowler mid-over or for the next over</div>
            {bowling.slice(0,9).map(p=>(
              <div key={p} onClick={()=>{setBowler(p);close();}}
                style={{padding:"13px 14px",borderBottom:`0.5px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:bowler===p?C.blueLt:C.white}}>
                <span style={{fontSize:14,fontWeight:bowler===p?700:400,color:bowler===p?C.blue:C.text}}>{p}</span>
                {bowler===p&&<span style={{color:C.blue,fontSize:16}}>✓</span>}
              </div>
            ))}
          </Sheet>
        )}

        {modal==="batter"&&(
          <Sheet title={`${batters[striker]?.name}`} onClose={close}>
            <div style={{fontSize:13,color:C.sub,marginBottom:16}}>{batters[striker]?.runs} runs · {batters[striker]?.balls} balls</div>
            {[{icon:"🔄",label:"Switch strike",sub:"Move strike to other end",onClick:()=>{setStriker(s=>s===0?1:0);close();}},
              {icon:"🏃",label:"Retire (runs limit)",sub:"Batsman steps aside, can return",onClick:close},
              {icon:"🏥",label:"Retire hurt",sub:"Injury/illness — can return",onClick:close},
              {icon:"➕",label:"New batter in",sub:"This batter is out/retired",onClick:()=>setModal("newbatter")},
            ].map(a=>(
              <div key={a.label} onClick={a.onClick}
                style={{padding:"14px 12px",borderBottom:`0.5px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                <div style={{fontSize:22,width:30,textAlign:"center",flexShrink:0}}>{a.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.label}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:1}}>{a.sub}</div>
                </div>
                <div style={{color:C.border,fontSize:18}}>›</div>
              </div>
            ))}
          </Sheet>
        )}

        {modal==="newbatter"&&(
          <Sheet title="New batter" onClose={close}>
            <div style={{fontSize:13,color:C.sub,marginBottom:14}}>Select incoming batter from squad</div>
            {batting.filter(p=>!batters.find(b=>b.name===p)).map(p=>(
              <div key={p} onClick={()=>{const nb=[...batters];nb[striker]={name:p,runs:0,balls:0};setBatters(nb);close();}}
                style={{padding:"13px 14px",borderBottom:`0.5px solid ${C.border}`,fontSize:14,color:C.text,cursor:"pointer"}}>
                {p}
              </div>
            ))}
          </Sheet>
        )}

        {modal==="sub"&&(
          <Sheet title="Player substitution" onClose={close}>
            <div style={{fontSize:13,color:C.sub,marginBottom:16}}>Replace or add a substitute player to either team.</div>
            {[batting[0],bowling[0]].map((team,ti)=>(
              <div key={ti} style={{marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8}}>{ti===0?"Batting":"Fielding"} team — {team}</div>
                <div style={{padding:"12px 14px",borderRadius:10,border:`0.5px solid ${C.border}`,background:"#F8F6F0",cursor:"pointer",display:"flex",alignItems:"center",gap:10}} onClick={()=>{}}>
                  <span style={{fontSize:22}}>➕</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.blue}}>Add substitute / replacement</div>
                    <div style={{fontSize:11,color:C.muted}}>Tap to enter player name</div>
                  </div>
                </div>
              </div>
            ))}
          </Sheet>
        )}

        {modal==="break"&&(
          <Sheet title="Pause match" onClose={close}>
            <div style={{fontSize:13,color:C.sub,marginBottom:16}}>Select reason for the break</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
              {[{id:"drinks",icon:"☕",label:"Drinks break"},{id:"rain",icon:"🌧️",label:"Rain delay"},{id:"injury",icon:"🏥",label:"Injury"},{id:"other",icon:"⏸️",label:"Other delay"}].map(b=>(
                <div key={b.id} onClick={()=>{setBreakReason(b.id);setBreakElapsed(0);setBreakActive(true);close();}}
                  style={{padding:"20px 12px",borderRadius:12,border:`0.5px solid ${C.border}`,background:C.white,cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:8}}>{b.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{b.label}</div>
                </div>
              ))}
            </div>
          </Sheet>
        )}

        {modal==="commentary"&&(
          <Sheet title="Commentary persona" onClose={close}>
            <div style={{fontSize:13,color:C.sub,marginBottom:14}}>Choose the voice of ball-by-ball commentary</div>
            {Object.entries(COMMENTARY).map(([id,p])=>(
              <div key={id} onClick={()=>{setPersona(id);close();}}
                style={{padding:"14px 14px",borderRadius:12,border:`1.5px solid ${persona===id?C.blue:C.border}`,background:persona===id?C.blueLt:C.white,marginBottom:10,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:15,fontWeight:700,color:persona===id?C.blueDk:C.text}}>{p.name}</div>
                  {persona===id&&<div style={{color:C.blue,fontSize:18}}>✓</div>}
                </div>
                <div style={{fontSize:12,color:C.sub,marginTop:5,fontStyle:"italic"}}>"{p.four[0]}"</div>
              </div>
            ))}
          </Sheet>
        )}

        {modal==="more"&&(
          <Sheet title="More options" onClose={close}>
            {[{icon:"📋",label:"Scorecard",sub:"Quick batting & bowling summary",onClick:()=>setModal("scorecard")},
              {icon:"👥",label:"Player substitution",sub:"Replace or add a player",onClick:()=>setModal("sub")},
              {icon:"🎤",label:"Commentary voice",sub:`Now: ${COMMENTARY[persona]?.name}`,onClick:()=>setModal("commentary")},
              {icon:"📤",label:"Share score",sub:"Copy WhatsApp text card",onClick:close},
              {icon:"⚙️",label:"Match settings",sub:"Edit overs, teams, toss",onClick:close},
            ].map(a=>(
              <div key={a.label} onClick={a.onClick}
                style={{padding:"14px 12px",borderBottom:`0.5px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                <div style={{fontSize:24,width:32,textAlign:"center",flexShrink:0}}>{a.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.text}}>{a.label}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:1}}>{a.sub}</div>
                </div>
                <div style={{color:C.border,fontSize:18}}>›</div>
              </div>
            ))}
          </Sheet>
        )}

        {modal==="scorecard"&&(
          <Sheet title="Scorecard" onClose={close}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8}}>Batting — {batting[0]}</div>
              {batters.map((b,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`0.5px solid ${C.border}`}}>
                  <div>
                    <span style={{fontSize:14,fontWeight:600,color:C.text}}>{b.name}</span>
                    {striker===i&&<span style={{fontSize:11,color:C.blue,marginLeft:6}}>batting *</span>}
                  </div>
                  <div style={{fontSize:14,color:C.text}}>{b.runs} <span style={{fontSize:12,color:C.muted}}>({b.balls})</span></div>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`0.5px solid ${C.border}`}}>
                <span style={{fontSize:13,color:C.muted,fontStyle:"italic"}}>Extras</span>
                <span style={{fontSize:13,color:C.muted}}>{score - batters.reduce((s,b)=>s+b.runs,0)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
                <span style={{fontSize:14,fontWeight:700,color:C.text}}>Total</span>
                <span style={{fontSize:14,fontWeight:700,color:C.text}}>{score}/{wickets} ({overStr(balls)} ov)</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8}}>Current bowler</div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`0.5px solid ${C.border}`}}>
                <span style={{fontSize:14,fontWeight:600,color:C.text}}>{bowler}</span>
                <span style={{fontSize:13,color:C.muted}}>Over {Math.floor(balls/6)+1}</span>
              </div>
            </div>
          </Sheet>
        )}

        {/* ── CELEBRATIONS ── */}
        {celebration&&<Celebrate data={celebration} onDone={()=>setCelebration(null)}/>}

        {/* ── BREAK ── */}
        {breakActive&&<BreakScreen reason={breakReason} elapsed={breakElapsed} onResume={()=>{setBreakActive(false);setBreakElapsed(0);}}/>}

        {/* ── INNINGS END ── */}
        {inningsEnd&&<InningsEnd score={score} wickets={wickets} balls={balls} maxOvers={maxOvers} batting={batting} innings={innings} target={target} onStart2nd={start2nd}/>}

      </div>
    </div>
  );
}
