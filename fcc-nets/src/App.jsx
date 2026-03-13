// src/App.jsx
import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { G, FCC_LOGO } from "./utils/theme";

// Component Imports
import Shell from "./components/layout/Shell";
import PinLogin from "./components/auth/PinLogin";
import AdminDashboard from "./components/admin/AdminDashboard";
import BookingGrid from "./components/schedule/BookingGrid";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [appData, setAppData] = useState({
    members: [],
    sessions: [],
    teams: [],
    recurring: [],
    blocked: []
  });

  // ─── EXACT FIREBASE PATHS FROM YOUR OLD APP ──────────────────
  const refs = {
    members:   doc(db, "fcc-nets", "members"),
    sessions:  doc(db, "fcc-nets", "sessions"),
    teams:     doc(db, "fcc-nets", "teams"),
    recurring: doc(db, "fcc-nets", "recurring"),
    blocked:   doc(db, "fcc-nets", "blocked"),
  };

  useEffect(() => {
    // 1. Listen for Members
    const unsubMembers = onSnapshot(refs.members, snap => {
      setAppData(prev => ({ 
        ...prev, 
        members: snap.exists() ? JSON.parse(snap.data().value) : [] 
      }));
    });

    // 2. Listen for Sessions
    const unsubSessions = onSnapshot(refs.sessions, snap => {
      setAppData(prev => ({ 
        ...prev, 
        sessions: snap.exists() ? JSON.parse(snap.data().value) : [] 
      }));
    });

    // 3. Listen for Teams
    const unsubTeams = onSnapshot(refs.teams, snap => {
      setAppData(prev => ({ 
        ...prev, 
        teams: snap.exists() ? JSON.parse(snap.data().value) : [] 
      }));
    });

    return () => {
      unsubMembers();
      unsubSessions();
      unsubTeams();
    };
  }, []);

  if (!currentUser) {
    return <PinLogin members={appData.members} onLogin={setCurrentUser} />;
  }

  return (
    <Shell currentUser={currentUser} setView={(v) => {}} onLogout={() => setCurrentUser(null)}>
      <BookingGrid 
        currentUser={currentUser} 
        sessions={appData.sessions} 
        members={appData.members}
      />
    </Shell>
  );
}
