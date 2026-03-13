import React, { useState } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { G } from "../../utils/theme";

export default function AdminDashboard({ members, sessions, teams, recurring, blocked }) {
  const [tab, setTab] = useState("sessions");
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [newSess, setNewSess] = useState({ date: "", from: "17:00", to: "19:00", net: "1", label: "" });
  const [newMember, setNewMember] = useState({ name: "", team: "Unassigned", role: "player" });

  const saveData = async (type, data) => {
    setLoading(true);
    try {
      // Your DB requires stringified JSON in a "value" field
      await updateDoc(doc(db, "fcc-nets", type), { value: JSON.stringify(data) });
    } catch (err) {
      alert("Save failed: " + err.message);
    }
    setLoading(false);
  };

  // ─── SESSION LOGIC ──────────────────────────────────────────
  const addSession = async () => {
    if (!newSess.date || !newSess.label) return alert("Date and Label required");
    const session = { ...newSess, id: "sess-" + Date.now(), players: [] };
    await saveData("sessions", [...sessions, session]);
    setNewSess({ ...newSess, label: "" });
  };

  const deleteSession = async (id) => {
    if (!window.confirm("Delete this session?")) return;
    await saveData("sessions", sessions.filter(s => s.id !== id));
  };

  // ─── MEMBER LOGIC ───────────────────────────────────────────
  const updateMemberRole = async (id, newRole) => {
    const updated = members.map(m => m.id === id ? { ...m, role: newRole } : m);
    await saveData("members", updated);
  };

  // ─── MAINTENANCE TOOLS ──────────────────────────────────────
  const seedEmails = async () => {
    // Logic from your app2.txt
    const EMAIL_SEED = { "Abhinav Singh": "vcefu1@gmail.com", "Adam Pirzada": "pirzada.adam2@gmail.com" }; // ... (shortened for space)
    const updated = members.map(m => ({ ...m, email: m.email || EMAIL_SEED[m.name] || "" }));
    await saveData("members", updated);
    alert("Emails seeded from master list.");
  };

  const fixNames = async () => {
    const updated = members.map(m => {
      if (m.name === "Jay") return { ...m, name: "Jayashwanth J S" };
      if (m.name === "Anshu") return { ...m, name: "Ansh Gupta" };
      return m;
    });
    await saveData("members", updated);
    alert("Names synchronized.");
  };

  return (
    <div style={{ padding: "20px 10px", maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ color: G.green, marginBottom: 20 }}>Club Administration</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto" }}>
        {["sessions", "members", "teams", "maintenance"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", borderRadius: 20, border: "none",
            background: tab === t ? G.green : G.border,
            color: tab === t ? "#fff" : G.text,
            fontWeight: 800, cursor: "pointer", textTransform: "capitalize"
          }}>{t}</button>
        ))}
      </div>

      {/* 1. SESSIONS TAB */}
      {tab === "sessions" && (
        <div>
          <div style={cardSt}>
            <h3 style={hSt}>Create Practice</h3>
            <input type="date" value={newSess.date} onChange={e => setNewSess({...newSess, date: e.target.value})} style={inputSt} />
            <input type="text" placeholder="Label (e.g. Div 2 Training)" value={newSess.label} onChange={e => setNewSess({...newSess, label: e.target.value})} style={inputSt} />
            <div style={{ display: "flex", gap: 10 }}>
              <select value={newSess.net} onChange={e => setNewSess({...newSess, net: e.target.value})} style={{...inputSt, flex: 1}}>
                <option value="1">Net 1</option>
                <option value="2">Net 2</option>
                <option value="both">Both Nets</option>
              </select>
              <button onClick={addSession} disabled={loading} style={btnSt}>Add</button>
            </div>
          </div>
          
          <h3 style={hSt}>Upcoming Sessions</h3>
          {sessions.slice(0, 10).map(s => (
            <div key={s.id} style={{ ...cardSt, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 15px" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{s.date} · {s.label}</div>
                <div style={{ fontSize: 11, color: G.muted }}>Net {s.net} · {s.players.length} Players</div>
              </div>
              <button onClick={() => deleteSession(s.id)} style={{ background: "none", border: "none", color: "red", cursor: "pointer" }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* 2. MEMBERS TAB */}
      {tab === "members" && (
        <div style={cardSt}>
          <h3 style={hSt}>Member Management</h3>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {members.sort((a,b) => a.name.localeCompare(b.name)).map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${G.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                <select 
                  value={m.role} 
                  onChange={(e) => updateMemberRole(m.id, e.target.value)}
                  style={{ padding: 4, borderRadius: 6, fontSize: 12 }}
                >
                  <option value="player">Player</option>
                  <option value="captain">Captain</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MAINTENANCE TAB */}
      {tab === "maintenance" && (
        <div style={{ display: "grid", gap: 12 }}>
          <button onClick={seedEmails} style={toolBtnSt}>📧 Seed Emails from Master List</button>
          <button onClick={fixNames} style={toolBtnSt}>🔄 Sync & Fix Member Names</button>
          <div style={{ padding: 15, background: "#fff3cd", borderRadius: 12, fontSize: 12, color: "#856404" }}>
            ⚠️ These tools will overwrite data in your "members" document. Use only after manual database changes.
          </div>
        </div>
      )}
    </div>
  );
}

// STYLES
const cardSt = { background: "#fff", padding: 20, borderRadius: 16, border: `1.5px solid ${G.border}`, marginBottom: 20 };
const hSt = { marginTop: 0, marginBottom: 15, fontSize: 16, fontWeight: 900, color: G.green, textTransform: "uppercase" };
const inputSt = { width: "100%", padding: 12, marginBottom: 10, borderRadius: 8, border: `1px solid ${G.border}`, boxSizing: "border-box", fontFamily: "inherit" };
const btnSt = { background: G.green, color: "#fff", border: "none", borderRadius: 10, padding: "0 25px", fontWeight: 800, cursor: "pointer" };
const toolBtnSt = { padding: 16, borderRadius: 12, border: `1px solid ${G.border}`, background: "#fff", fontWeight: 700, cursor: "pointer", textAlign: "left", fontSize: 14 };
