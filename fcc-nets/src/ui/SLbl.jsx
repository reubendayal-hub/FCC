import React from "react";

const SLbl = ({children, mt = 16, G}) => (
  <div style={{fontSize:13,fontWeight:900,letterSpacing:.5,textTransform:"uppercase",
    color:G.mid,marginBottom:8,marginTop:mt,display:"flex",alignItems:"center",gap:8}}>
    <span style={{flex:1}}>{children}</span>
    <span style={{display:"block",height:1,flex:1,background:G.border}}/>
  </div>
);

export default SLbl;
