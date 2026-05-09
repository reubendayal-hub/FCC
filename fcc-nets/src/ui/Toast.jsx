import React from "react";

const Toast = ({msg, G}) => (
  <div style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",
    background:G.green,color:G.lime,borderRadius:30,padding:"9px 22px",
    fontSize:14,fontWeight:800,zIndex:9999,whiteSpace:"nowrap",
    boxShadow:"0 6px 24px rgba(0,0,0,.22)"}}>
    {msg}
  </div>
);

export default Toast;
