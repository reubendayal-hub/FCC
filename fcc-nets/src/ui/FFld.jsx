import React from "react";

const FFld = ({label, children, style, G}) => (
  <div style={style}>
    <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",
      color:G.mid,marginBottom:4}}>{label}</div>
    {children}
  </div>
);

export default FFld;
