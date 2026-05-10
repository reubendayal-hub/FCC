import { useAppContext } from "../context/AppContext";
import CoachCoordination from "../CoachCoordination";
import { ALL_FIXTURES } from "../constants/fixtures";

export default function CoachCoordinationView() {
  const {
    setView, teams, currentUser, members, recurring,
    coachOverrides, setCoachOverrides, saveCoachOverrides,
    blockCals, showToast,
  } = useAppContext();

  return (
    <CoachCoordination
      teams={teams}
      allFixtures={ALL_FIXTURES}
      currentUser={currentUser}
      coachOverrides={coachOverrides}
      recurring={recurring}
      members={members}
      blockedDates={blockCals.map(b => ({
        date: b.date,
        reason: b.label,
        time: `${b.from}–${b.to}`,
      }))}
      onBack={() => setView("coachhq")}
      onReassign={(sessionId, date, newCoach, oldCoach) => {
        // Save to Firestore coachOverrides
        const overrideKey = `${date}_${sessionId}`;
        const updated = {
          ...coachOverrides,
          [overrideKey]: {
            newCoach,
            oldCoach,
            assignedBy: currentUser?.name,
            assignedAt: new Date().toISOString(),
          },
        };
        setCoachOverrides(updated); // Update local state immediately
        saveCoachOverrides(updated);
        showToast(`Reassigned to ${newCoach.split(" ")[0]} ✓`);
      }}
    />
  );
}
