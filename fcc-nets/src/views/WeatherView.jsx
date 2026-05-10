import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import SidebarNav from "../ui/SidebarNav";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import WeatherPage from "../ui/WeatherPage";
import AppHeader from "../ui/AppHeader";
import { FCC_LOGO } from "../constants/logo";

export default function WeatherView() {
  const {
    G, view, setView, userRole, currentUser, handleLogout, teams,
    wxData, joinRequests, toast,
  } = useAppContext();

  return (
    <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
        currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
      <AppHeader title="Ground Forecast" sub="Karlebo · 55.918°N 12.416°E"
        onBack={()=>setView("schedule")}/>
      <WeatherPage wx={wxData} setView={setView} G={G}/>
      <BotNav view="schedule" setView={setView} userRole={userRole}
        pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
      {toast&&<Toast msg={toast} G={G}/>}
    </Shell>
  );
}
