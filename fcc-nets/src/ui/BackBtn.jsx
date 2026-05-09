import React from "react";

const BackBtn = ({onClick}) => (
  <button onClick={onClick} style={{background:"rgba(255,255,255,0.15)",border:"none",
    borderRadius:8,color:"#fff",padding:"7px 14px",fontFamily:"inherit",
    fontSize:14,fontWeight:800,cursor:"pointer",flexShrink:0}}>←</button>
);

export default BackBtn;
