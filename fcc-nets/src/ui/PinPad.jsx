import React, { useState, useEffect } from "react";
import { G } from "../utils/theme";

export default function PinPad({ label, onDone, onCancel, error }) {
  const [val, setVal] = useState("");
  const inputRef = React.useRef(null);
  const add = d => { if(val.length<4) setVal(v=>v+d); };
  const del = () => setVal(v=>v.slice(0,-1));
  useEffect(() => { if(val.length===4) onDone(val); }, [val]);

  // Focus hidden input on mount so keyboard works immediately
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKey = e => {
    if(e.key>="0"&&e.key<="9") add(e.key);
    else if(e.key==="Backspace") del();
  };

  return (
    <div style={{textAlign:"center",padding:"60px 20px 24px"}}
      onClick={()=>inputRef.current?.focus()}>
      {/* Hidden input captures physical keyboard on mobile & desktop */}
      <input ref={inputRef} type="tel" inputMode="numeric" pattern="[0-9]*"
        value={val} readOnly
        onKeyDown={handleKey}
        style={{position:"absolute",opacity:0,width:1,height:1,pointerEvents:"none"}}/>
      <div style={{fontSize:15,fontWeight:800,color:G.text,marginBottom:24}}>{label}</div>
      {/* dots */}
      <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:32}}>
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
          <button key={i} type="button"
            onClick={()=>{ k==="⌫"?del():k!==""?add(String(k)):null; inputRef.current?.focus(); }}
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
        <button type="button" onClick={onCancel} style={{marginTop:20,background:"transparent",
          border:"none",color:G.muted,fontSize:14,fontWeight:700,cursor:"pointer",
          fontFamily:"inherit"}}>Cancel</button>
      )}
    </div>
  );
}
