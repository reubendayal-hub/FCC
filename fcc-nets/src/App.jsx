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
  const [members, setMembers] = useState([]);
  const [view, setView] = useState("schedule"); 

  // Global Member Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appData", "members"), (docSnap) => {
      if (docSnap.exists()) {
        setMembers(docSnap.data().list || []);
      }
    });
    return () => unsub();
  }, []);

  // 1. If not logged in, show the Login screen
  if (!currentUser) {
    return <PinLogin members={members} onLogin={setCurrentUser} />;
  }

  // 2. If logged in, wrap the active view in the Shell layout
  return (
    <Shell currentUser={currentUser} setView={setView} onLogout={() => setCurrentUser(null)}>
      {view === "schedule" && <BookingGrid currentUser={currentUser} members={members} />}
      {view === "admin" && currentUser.role === "admin" && <AdminDashboard members={members} />}
    </Shell>
  );
}
