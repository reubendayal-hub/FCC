// src/components/auth/PinLogin.jsx
import React, { useState } from "react";
import { G, FCC_LOGO } from "../../utils/theme";

export default function PinLogin({ members, onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // Standard SHA-256 Hashing used in your original app
  const hashPIN = async (pinStr) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pinStr);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!pin) return setError("Please enter your PIN.");
    
    const hashedEntry = await hashPIN(pin);
    if (hashedEntry === selectedUser.pinHash) {
      onLogin(selectedUser);
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: G.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", padding: "40px 30px", borderRadius: 20, boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: 400, textAlign: "center" }}>
        
        <img src={FCC_LOGO} alt="FCC Logo" style={{ width: 100, height: 100, marginBottom: 20 }} />
        <h1 style={{ color: G.green, margin: "0 0 20px 0", fontSize: 24 }}>FCC Training</h1>

        {!selectedUser ? (
          <>
            <p style={{ color: G.muted, marginBottom: 20 }}>Select your name to log in</p>
            <div style={{ maxHeight: 300, overflowY: "auto", border: `1px solid ${G.border}`, borderRadius: 10 }}>
              {members.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => setSelectedUser(m)}
                  style={{ padding: 15, borderBottom: `1px solid ${G.border}`, cursor: "pointer", fontWeight: 500 }}
                >
                  {m.name}
                </div>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={handleLogin}>
            <p style={{ color: G.muted, marginBottom: 20 }}>Welcome back, <strong>{selectedUser.name}</strong></p>
            
            <input 
              type="password" 
              inputMode="numeric"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: 15, borderRadius: 10, border: `1px solid ${G.border}`, fontSize: 18, textAlign: "center", marginBottom: 15 }}
            />
            
            {error && <p style={{ color: "#dc2626", fontSize: 14, margin: "0 0 15px 0" }}>{error}</p>}
            
            <button 
              type="submit" 
              style={{ width: "100%", padding: 15, borderRadius: 10, border: "none", backgroundColor: G.green, color: "#fff", fontWeight: "bold", fontSize: 16, cursor: "pointer", marginBottom: 15 }}
            >
              Log In
            </button>
            
            <button 
              type="button" 
              onClick={() => setSelectedUser(null)}
              style={{ background: "none", border: "none", color: G.muted, cursor: "pointer", textDecoration: "underline" }}
            >
              Not {selectedUser.name}?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
