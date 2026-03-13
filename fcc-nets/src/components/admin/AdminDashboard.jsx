// src/components/admin/AdminDashboard.jsx
import React, { useState } from "react";
import { db } from "../../firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { G } from "../../utils/theme";

export default function AdminDashboard({ members }) {
  const [loadingMsg, setLoadingMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ==========================================
  // ✂️ PASTE YOUR ADMIN FUNCTIONS HERE ✂️
  // (Copy these from your old App.jsx)
  // 
  // - addMissingMembers()
  // - fixNames()
  // - seedEmails()
  // - generateInviteCodes()
  // - import2026Fixtures()
  // - removeMember()
  // ==========================================

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h2 style={{ color: G.green, marginBottom: 20 }}>Admin Dashboard</h2>
      
      {loadingMsg && (
        <div style={{ background: G.lightGreen, color: G.green, padding: 15, borderRadius: 10, marginBottom: 20, fontWeight: "bold" }}>
          {loadingMsg}
        </div>
      )}

      {/* ========================================== */}
      // ✂️ PASTE YOUR ADMIN UI BUTTONS HERE ✂️
      // (Copy the buttons/grid that trigger the functions above)
      // ========================================== */}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", padding: 30, borderRadius: 15, width: "90%", maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, color: "#dc2626" }}>Confirm Removal</h3>
            <p>You are about to permanently remove <strong>{confirmDelete.name}</strong>.</p>
            <p style={{ fontSize: 13, background: G.redBg, padding: 10, borderRadius: 8 }}>⚠️ Session history remains, but they will be removed from the member list.</p>
            
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${G.border}` }}>Cancel</button>
              <button onClick={() => removeMember(confirmDelete.id)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontWeight: "bold" }}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
