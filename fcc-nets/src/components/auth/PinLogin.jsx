import React, { useState } from "react";
import { G, FCC_LOGO } from "../../utils/theme";

export default function PinLogin({ members = [], onLogin }) {
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

  // Safe Member List: Ensures we don't crash if data is still loading
  const safeMembers = Array.isArray(members) ? [...members] : [];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: G.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", padding: 30, borderRadius: 20, width: "100%", maxWidth: 400, textAlign: "center" }}>
        <img src={FCC_LOGO} alt="Logo" style={{ width: 80, marginBottom: 20 }} />
        
        {!selectedUser ? (
          <div style={{ maxHeight: 400, overflowY: "auto", border: `1px solid ${G.border}`, borderRadius: 12 }}>
            {safeMembers.length === 0 ? (
              <div style={{ padding: 20, color: G.muted }}>Loading club members...</div>
            ) : (
              safeMembers.sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                <div key={m.id} onClick={() => setSelectedUser(m)} style={{ padding: 15, borderBottom: `1px solid ${G.border}`, cursor: "pointer", fontWeight: 600 }}>
                  {m.name}
                </div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <p style={{ fontWeight: 700, marginBottom: 20 }}>Login as {selectedUser.name}</p>
            <input 
              type="password" inputMode="numeric" value={pin} autoFocus
              onChange={(e) => setPin(e.target.value)}
              style={{ width: "100%", padding: 15, borderRadius: 12, border: `2px solid ${G.green}`, textAlign: "center", fontSize: 24 }}
            />
            {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
            <button type="submit" style={{ width: "100%", marginTop: 20, padding: 15, background: G.green, color: "#fff", borderRadius: 12, fontWeight: 800 }}>Login</button>
            <button type="button" onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", marginTop: 15, color: G.muted }}>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
