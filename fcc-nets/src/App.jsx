import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { G, FCC_LOGO } from "./utils/theme";

// Components
import Shell from "./components/layout/Shell";
import PinLogin from "./components/auth/PinLogin";
import BookingGrid from "./components/schedule/BookingGrid";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("schedule");
  const [appData, setAppData] = useState({
    members: [],
    sessions: [],
    teams: [],
    blocked: [],
    recurring: []
  });

  // EXACT REFS FROM YOUR ORIGINAL CODE
  const refs = {
    members: doc(db, "fcc-nets", "members"),
    sessions: doc(db, "fcc-nets", "sessions"),
    teams: doc(db, "fcc-nets", "teams"),
    blocked: doc(db, "fcc-nets", "blocked"),
    recurring: doc(db, "fcc-nets", "recurring")
  };

  useEffect(() => {
    const unsubs = Object.entries(refs).map(([key, ref]) => 
      onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const val = JSON.parse(snap.data().value || "[]");
          setAppData(prev => ({ ...prev, [key]: val }));
        }
      })
    );
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  if (!currentUser) {
    return <PinLogin members={appData.members} onLogin={setCurrentUser} />;
  }

  return (
    <Shell currentUser={currentUser} setView={setView} onLogout={() => setCurrentUser(null)}>
      {view === "schedule" && (
        <BookingGrid 
          currentUser={currentUser} 
          sessions={appData.sessions} 
          members={appData.members}
          teams={appData.teams}
          blocked={appData.blocked}
        />
      )}
      {/* Admin Panel and others will be added here next */}
    </Shell>
  );
}
