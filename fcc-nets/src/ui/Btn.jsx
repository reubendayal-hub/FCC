import React from "react";

const Btn = ({onClick,bg,col,children,full,sm,disabled,type="button"}) => (
  <button type={type} onClick={onClick} disabled={disabled}
    style={{background:disabled?"#ccc":bg,color:disabled?"#888":col,border:"none",
      borderRadius:9,padding:sm?"6px 13px":"10px 18px",
      fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:sm?12:14,
      cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",
      opacity:disabled ? 0.7 : 1,transition:"opacity .15s"}}>
    {children}
  </button>
);

export default Btn;
