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
  const [appData, setAppData] = useState({
    members: [], // Initialized as empty array
    sessions: [],
    teams: []
  });

  useEffect(() => {
    // Your specific database paths
    const refs = {
      members: doc(db, "fcc-nets", "members"),
      sessions: doc(db, "fcc-nets", "sessions"),
      teams: doc(db, "fcc-nets", "teams")
    };

    const unsubs = Object.entries(refs).map(([key, ref]) => 
      onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          try {
            // Your data is stored as a string in the "value" field
            const val = JSON.parse(snap.data().value || "[]");
            setAppData(prev => ({ ...prev, [key]: val }));
          } catch (e) { console.error("JSON Parse error:", e); }
        }
      })
    );
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  if (!currentUser) {
    return <PinLogin members={appData.members || []} onLogin={setCurrentUser} />;
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
