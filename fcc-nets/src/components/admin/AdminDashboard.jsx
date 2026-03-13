// src/components/admin/AdminDashboard.jsx
import React, { useState } from "react";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { G } from "../../utils/theme";

export default function AdminDashboard({ members }) {
  const [loadingMsg, setLoadingMsg] = useState("");

  // 1. Add Missing Members
  const addMissingMembers = async () => {
    setLoadingMsg("Adding missing members...");
    const missingNames = [
      "Akshay Bhardwaj", "Ashwin Singh Tensingh", "Balaji R", 
      "Durgesh", "Pulin Dhar", "Raghavendar Murali", 
      "Rajesh Muthukumar", "Senthil Gnanasambandan", "Yogismaan Kamal"
    ];
    
    try {
      const updatedList = [...members];
      let addedCount = 0;

      missingNames.forEach(name => {
        if (!updatedList.find(m => m.name.toLowerCase() === name.toLowerCase())) {
          updatedList.push({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            role: "player",
            active: true
          });
          addedCount++;
        }
      });

      await setDoc(doc(db, "appData", "members"), { list: updatedList }, { merge: true });
      setLoadingMsg(`Successfully added ${addedCount} missing members!`);
    } catch (err) {
      setLoadingMsg("Error adding members: " + err.message);
    }
    setTimeout(() => setLoadingMsg(""), 3000);
  };

  // 2. Fix Incorrect Names
  const fixNames = async () => {
    setLoadingMsg("Fixing names...");
    try {
      const updatedList = members.map(m => {
        if (m.name === "Jay") return { ...m, name: "Jayashwanth J S" };
        if (m.name === "Anshu") return { ...m, name: "Ansh Gupta" };
        if (m.name === "Balaji") return { ...m, name: "Balaji R" };
        return m;
      });

      await setDoc(doc(db, "appData", "members"), { list: updatedList }, { merge: true });
      setLoadingMsg("Names fixed successfully!");
    } catch (err) {
      setLoadingMsg("Error fixing names: " + err.message);
    }
    setTimeout(() => setLoadingMsg(""), 3000);
  };

  // 3. Bulk Generate Invite Codes
  const generateInviteCodes = async () => {
    setLoadingMsg("Generating invite codes...");
    try {
      const genCode = () => Math.floor(1000 + Math.random() * 9000).toString();
      const hashPIN = async (pinStr) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(pinStr);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      };

      const updatedList = await Promise.all(members.map(async (m) => {
        if (!m.pinHash) {
          const plainCode = genCode();
          const hashed = await hashPIN(plainCode);
          console.log(`Temp Code for ${m.name}: ${plainCode}`); 
          return { ...m, pinHash: hashed };
        }
        return m;
      }));

      await setDoc(doc(db, "appData", "members"), { list: updatedList }, { merge: true });
      setLoadingMsg("Invite codes generated! Check browser console (F12) for the plain-text codes.");
    } catch (err) {
      setLoadingMsg("Error generating codes: " + err.message);
    }
    setTimeout(() => setLoadingMsg(""), 5000);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h2 style={{ color: G.green, marginBottom: 20 }}>Admin Dashboard</h2>
      
      {loadingMsg && (
        <div style={{ background: G.lightGreen, color: G.green, padding: 15, borderRadius: 10, marginBottom: 20, fontWeight: "bold" }}>
          {loadingMsg}
        </div>
      )}

      {/* Admin Action Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
        <button onClick={addMissingMembers} style={{ padding: 15, borderRadius: 10, border: `1px solid ${G.border}`, background: "#fff", cursor: "pointer", fontWeight: "bold", color: G.text }}>
          1. Add Missing Members
        </button>
        
        <button onClick={fixNames} style={{ padding: 15, borderRadius: 10, border: `1px solid ${G.border}`, background: "#fff", cursor: "pointer", fontWeight: "bold", color: G.text }}>
          2. Fix Incorrect Names
        </button>
        
        <button onClick={generateInviteCodes} style={{ padding: 15, borderRadius: 10, border: `1px solid ${G.border}`, background: "#fff", cursor: "pointer", fontWeight: "bold", color: G.text }}>
          3. Generate Invite Codes (Console)
        </button>
      </div>

    </div>
  );
}
