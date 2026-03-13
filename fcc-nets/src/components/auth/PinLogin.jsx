import React, { useState } from "react";
import { G, FCC_LOGO } from "../../utils/theme";

export default function PinLogin({ members, onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const hashPIN = (p) => {
    let h = 5381;
    for (let i=0; i<p.length; i++) h = ((h << 5) + h) + p.charCodeAt(i);
    return String(h >>> 0);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (hashPIN(pin) === selectedUser.pinHash) {
      onLogin(selectedUser);
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  // FAIL-SAFE: This line is the most important.
  // It guarantees that 'list' is an array, preventing the "sort" error.
  const list = Array.isArray(members) ? [...members] : [];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: G.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", padding: 30, borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.05)", width: "100%", maxWidth: 400, textAlign: "center" }}>
        <img src={FCC_LOGO} alt="Logo" style={{ width: 80, marginBottom: 20 }} />
        
        {!selectedUser ? (
          <div style={{ maxHeight: 400, overflowY: "auto", border: `1.5px solid ${G.border}`, borderRadius: 12 }}>
            {list.length === 0 ? (
              <div style={{ padding: 20, color: G.muted }}>No members found.</div>
            ) : (
              list.sort((a,b) => (a.name || "").localeCompare(b.name || "")).map(m => (
                <div key={m.id || m.name} onClick={() => setSelectedUser(m)} style={{ padding: 15, borderBottom: `1px solid ${G.border}`, cursor: "pointer", fontWeight: 700, color: G.text }}>
                  {m.name}
                </div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <p style={{ fontWeight: 800, color: G.green, marginBottom: 20 }}>Welcome, {selectedUser.name}</p>
            <input 
              type="password" inputMode="numeric" value={pin} autoFocus
              onChange={(e) => setPin(e.target.value)}
              style={{ width: "100%", padding: 15, borderRadius: 12, border: `2px solid ${G.green}`, textAlign: "center", fontSize: 24, outline: "none" }}
              placeholder="Enter 4-digit PIN"
            />
            {error && <p style={{ color: "red", marginTop: 10, fontWeight: 700 }}>{error}</p>}
            <button type="submit" style={{ width: "100%", marginTop: 20, padding: 16, background: G.green, color: "#fff", borderRadius: 12, fontWeight: 900, border: "none", cursor: "pointer" }}>Login</button>
            <button type="button" onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", marginTop: 15, color: G.muted, fontWeight: 700, cursor: "pointer" }}>Back to List</button>
          </form>
        )}
      </div>
    </div>
  );
}
