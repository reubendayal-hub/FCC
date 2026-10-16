// DEV ONLY: renders the app's Handbook Profile card in a mock of the Profile
// tab, so the handoff can be tested without logging in to the real app.
import React from "react";
import { createRoot } from "react-dom/client";
import HandbookEntryCard from "../../src/handbook-review/AppEntryCard.jsx";

const q = new URLSearchParams(location.search);
const me = { id: q.get("id") || "dev-" + (q.get("name") || "Parag Sample").toLowerCase().replace(/\W+/g, "-"), name: q.get("name") || "Parag Sample", email: q.get("email") || "parag@example.com", teams: ["Div 3"], role: "member" };

function MockProfile() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div style={{ background: "#14532d", color: "#fff", padding: "18px 16px 16px" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>My Profile</div>
        <div style={{ fontSize: 13, opacity: .7 }}>Member</div>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, background: "#f1f5f9", borderRadius: 12, padding: 4 }}>
          <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "#fff", fontWeight: 700, fontSize: 13, textAlign: "center", color: "#14532d" }}>🏏 My Profile</div>
          <div style={{ flex: 1, padding: "10px 12px", fontWeight: 700, fontSize: 13, textAlign: "center", color: "#64748b" }}>👨‍👧 My Family</div>
        </div>
        <HandbookEntryCard me={me} teams={[]} />
        <div style={{ background: "#14532d", borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 16, color: "#fff" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#a3e635", color: "#14532d", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22 }}>
            {me.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div><div style={{ fontWeight: 800, fontSize: 18 }}>{me.name}</div><div style={{ opacity: .7, fontSize: 13 }}>Div 3</div></div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, height: 220, opacity: .6 }} />
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<MockProfile />);
