// src/components/auth/PinLogin.jsx
import React, { useState } from "react";
import { G, FCC_LOGO } from "../../utils/theme";

export default function PinLogin({ members, onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // YOUR ACTUAL DJB2 HASHING ALGORITHM
  const hashPIN = (pinStr) => {
    let h = 5381;
    for (let i = 0; i < pinStr.length; i++) {
      h = ((h << 5) + h) + pinStr.charCodeAt(i);
    }
    return String(h >>> 0);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    if (!pin) return;

    if (hashPIN(pin) === selectedUser.pinHash) {
      onLogin(selectedUser);
    } else {
      setError("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: G.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", padding: "40px 30px", borderRadius: 20, boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: 400, textAlign: "center" }}>
        <img src={FCC_LOGO} alt="FCC" style={{ width: 100, marginBottom: 20 }} />
        
        {!selectedUser ? (
          <div style={{ maxHeight: 300, overflowY: "auto", border: `1px solid ${G.border}`, borderRadius: 10 }}>
            {members.sort((a,b) => a.name.localeCompare(b.name)).map(m => (
              <div key={m.id} onClick={() => setSelectedUser(m)} style={{ padding: 15, borderBottom: `1px solid ${G.border}`, cursor: "pointer" }}>
                {m.name}
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <p>Logging in as <strong>{selectedUser.name}</strong></p>
            <input 
              type="password" 
              inputMode="numeric"
              value={pin}
              autoFocus
              onChange={(e) => setPin(e.target.value)}
              style={{ width: "100%", padding: 15, borderRadius: 10, border: `1px solid ${G.border}`, textAlign: "center", fontSize: 24 }}
            />
            {error && <p style={{ color: "red" }}>{error}</p>}
            <button type="submit" style={{ width: "100%", marginTop: 15, padding: 15, background: G.green, color: "#fff", borderRadius: 10, fontWeight: "bold" }}>
              Enter PIN
            </button>
            <button type="button" onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", marginTop: 10, color: G.muted }}>
              Back to list
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
