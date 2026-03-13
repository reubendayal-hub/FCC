// src/components/layout/Shell.jsx
import React from "react";
import { G, FCC_LOGO } from "../../utils/theme";

export default function Shell({ currentUser, setView, onLogout, children }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: G.cream, fontFamily: "'DM Sans', sans-serif", color: G.text }}>
      
      {/* Top Navigation Bar */}
      <nav style={{ backgroundColor: "#fff", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${G.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        
        {/* Logo and Title */}
        <div 
          onClick={() => setView("schedule")} 
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <img src={FCC_LOGO} alt="FCC" style={{ width: 40, height: 40 }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: G.green, letterSpacing: "-0.5px" }}>
            FCC Nets
          </span>
        </div>

        {/* User Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          {currentUser.role === "admin" && (
            <button 
              onClick={() => setView("admin")}
              style={{ background: G.lightGreen, color: G.green, border: "none", padding: "8px 12px", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}
            >
              Admin Panel
            </button>
          )}
          
          <span style={{ fontWeight: 500, display: "none", "@media (min-width: 600px)": { display: "inline" } }}>
            {currentUser.name.split(" ")[0]}
          </span>
          
          <button 
            onClick={onLogout}
            style={{ background: "none", border: `1px solid ${G.border}`, padding: "8px 12px", borderRadius: 8, color: G.muted, cursor: "pointer", fontWeight: 500 }}
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 15px" }}>
        {children}
      </main>

    </div>
  );
}
