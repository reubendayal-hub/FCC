import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { G } from "./utils/theme";

// Components
import Shell from "./components/layout/Shell";
import PinLogin from "./components/auth/PinLogin";
import BookingGrid from "./components/schedule/BookingGrid";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("schedule");
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState({
    members: [],
    sessions: [],
    teams: []
  });

  useEffect(() => {
    const refs = {
      members: doc(db, "fcc-nets", "members"),
      sessions: doc(db, "fcc-nets", "sessions"),
      teams: doc(db, "fcc-nets", "teams")
    };

    const unsubs = Object.entries(refs).map(([key, ref]) => 
      onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          try {
            const val = JSON.parse(snap.data().value || "[]");
            setAppData(prev => ({ ...prev, [key]: val }));
          } catch (e) { console.error("Error parsing " + key, e); }
        }
        if (key === "members") setLoading(false);
      }, (err) => {
        console.error("Firebase error:", err);
        if (key === "members") setLoading(false);
      })
    );
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: G.cream, color: G.green, fontWeight: 800 }}>Loading Club Data...</div>;
  }

  if (!currentUser) {
    return <PinLogin members={appData.members} onLogin={setCurrentUser} />;
  }

  return (
    <Shell currentUser={currentUser} setView={setView} onLogout={() => setCurrentUser(null)}>
      {view === "schedule" && (
        <BookingGrid 
          currentUser={currentUser} 
          sessions={appData.sessions || []} 
        />
      )}
    </Shell>
  );
}
