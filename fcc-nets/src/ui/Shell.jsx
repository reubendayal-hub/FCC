import React from "react";

export default function Shell({children, sidebar, G}) {
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:G.bg,minHeight:"100vh",
      display:"flex",justifyContent:"center",alignItems:"flex-start"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;0,800;0,900;1,400&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}
        @media(min-width:900px){
          .fcc-sidebar{
            display:flex!important;flex-direction:column;align-items:flex-start;
            padding:40px 28px;width:240px;flex-shrink:0;
            min-height:100vh;position:sticky;top:0;align-self:flex-start;
            background:${G.green};gap:20px;
          }
          .fcc-sidebar-logo{width:72px;height:72px;border-radius:50%;object-fit:cover;
            border:3px solid rgba(255,255,255,.3);display:block;}
          .fcc-sidebar-title{font-family:'Playfair Display',serif;font-weight:900;
            font-size:20px;color:#fff;line-height:1.2;}
          .fcc-sidebar-sub{font-size:11px;color:rgba(255,255,255,.45);letter-spacing:2px;
            text-transform:uppercase;margin-top:2px;}
          .fcc-sidebar-links{display:flex;flex-direction:column;gap:4px;width:100%;margin-top:4px;}
          .fcc-mobile-only{display:none!important;}
          .fcc-app-pane{max-width:520px;width:100%;min-height:100vh;
            border-left:1px solid ${G.border};border-right:1px solid ${G.border};}
        }
        @media(max-width:899px){
          .fcc-sidebar{display:none!important;}
          .fcc-app-pane{max-width:500px;width:100%;margin:0 auto;}
          .fcc-header-logo{width:72px!important;height:72px!important;}
        }
      `}</style>
      {/* Sidebar slot — only visible on desktop via CSS */}
      {sidebar && <div className="fcc-sidebar">{sidebar}</div>}
      {/* Main content pane */}
      <div className="fcc-app-pane" style={{position:"relative",paddingBottom:90,background:G.bg}}>
        {children}
      </div>
    </div>
  );
}
