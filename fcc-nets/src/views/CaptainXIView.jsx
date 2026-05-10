import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import SidebarNav from "../ui/SidebarNav";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import AppHeader from "../ui/AppHeader";
import { FCC_LOGO } from "../constants/logo";
import { ALL_FIXTURES } from "../constants/fixtures";
import { can } from "../constants/roles";
import { getTeamCardColors } from "../constants/teams";
import { fmtShort, fmtLong } from "../utils/time";
import { uid } from "../constants/seeds";

// Club venue addresses for Google Maps links (verified from cricket.dk)
const CLUB_VENUES = {
  // Home ground
  "Fredensborg": { name: "Fredensborg Cricket Club", address: "Karlebovej 23, 3480 Fredensborg" },
  "FCC": { name: "Fredensborg Cricket Club", address: "Karlebovej 23, 3480 Fredensborg" },
  // Hovedstaden clubs
  "KB": { name: "Kjøbenhavns Boldklub", address: "Peter Bangs Vej 147, 2000 Frederiksberg" },
  "AB": { name: "Akademisk Boldklub", address: "Skovdiget 1, 2880 Bagsværd" },
  "Copenhagen": { name: "Copenhagen Cricket Greens", address: "Terrasserne 30, 2700 Brønshøj" },
  "Bella": { name: "Copenhagen Cricket Greens", address: "Terrasserne 30, 2700 Brønshøj" },
  "APMM": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Maersk": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Nørrebro": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Himalaya": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Himalayan": { name: "Kløvermarken", address: "Kløvermarksvej 50, 2300 København S" },
  "Glostrup": { name: "Solvangsparken", address: "Nørre Alle, 2600 Glostrup" },
  "Hvidovre": { name: "Enghøjskolens Sportsplads", address: "Bymuren 151, 2650 Hvidovre" },
  "Frem": { name: "Valby Idrætspark", address: "Julius Andersens Vej 5, 2450 København SV" },
  "Ishøj": { name: "Ishøj Idrætscenter", address: "Vejledalen 17, 2635 Ishøj" },
  "Tåstrup": { name: "Hedehusene Idrætscenter", address: "Stenbuen 34, 2640 Hedehusene" },
  "Albertslund": { name: "Albertslund Stadion", address: "Skallerne 14, 2620 Albertslund" },
  "Svanholm": { name: "Svanholm Park", address: "Svanholm Alle 2, 2660 Brøndby Strand" },
  "Soraner": { name: "Gentofte Sportspark", address: "Ved Stadion 6A, 2820 Gentofte" },
  "Soranerne": { name: "Gentofte Sportspark", address: "Ved Stadion 6A, 2820 Gentofte" },
  // Sjælland clubs
  "Køge": { name: "Køge Stadion", address: "Ved Stadion 10, 4600 Køge" },
  "Roskilde": { name: "Roskilde Cricket", address: "Poppelgårdsvej 4, 4000 Roskilde" },
  "Sorø": { name: "Sorø Akademi", address: "Søgade 18 C, 4180 Sorø" },
  // OB/Forty matches often at Valby or other grounds
  "Forty": { name: "Valby Idrætspark", address: "Julius Andersens Vej 5, 2450 København SV" },
};

// Get venue for a match (extracts club name from label)
const getMatchVenue = (label, isHome) => {
  if (isHome) return CLUB_VENUES["Fredensborg"];
  // Extract opponent from label like "Div 3 @ Hvidovre 2" or "OB vs Køge OB"
  const match = label.match(/[@vs]\s*([A-Za-zÆØÅæøå]+)/i);
  if (match) {
    const opponent = match[1];
    return CLUB_VENUES[opponent] || null;
  }
  return null;
};

export default function CaptainXIView() {
  const {
    G, view, setView, userRole, currentUser, handleLogout, teams, members,
    captainXIModal, setCaptainXIModal,
    xiSelection, setXiSelection,
    xiRoles, setXiRoles,
    xiNote, setXiNote,
    xiReportTime, setXiReportTime,
    xiMatchTime, setXiMatchTime,
    xiReportTimeUserTouched, setXiReportTimeUserTouched,
    templatesModalOpen, setTemplatesModalOpen,
    templateEditingId, setTemplateEditingId,
    templateEditingText, setTemplateEditingText,
    templateNewText, setTemplateNewText,
    templatePickerOpen, setTemplatePickerOpen,
    xiResetModalOpen, setXiResetModalOpen,
    xiResetSelected, setXiResetSelected,
    matchSelections, saveMatchSelections,
    noteTemplates, saveNoteTemplates,
    logAction,
    showToast, joinRequests, toast,
  } = useAppContext();

    const isAdmin = can(userRole,"accessMembers");
    // Get teams where user is captain or VC
    const myCaptainTeams = teams.filter(t => 
      t.senior && (t.captain === currentUser?.name || t.vicecaptain === currentUser?.name)
    );
    
    // If admin viewing via shortcut, show all senior teams
    const visibleTeams = isAdmin ? teams.filter(t => t.senior) : myCaptainTeams;
    
    const today = new Date().toISOString().slice(0, 10);
    
    // Map team names to fixture divisions
    const teamToDivision = {
      "Div 2": "Div 2", "Div 3": "Div 3", "Div 4": "Div 4",
      "T20 Serie 4": "T20 Serie 4", "T20 Serie 5": "T20 Serie 5",
      "Women's": "Women's", "OB": "OB",
    };
    
    // Get upcoming matches for visible teams
    const getUpcomingMatches = (teamName) => {
      const div = teamToDivision[teamName];
      if (!div) return [];
      return ALL_FIXTURES
        .filter(f => f.division === div && f.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    };
    
    // Get roster for a team
    const getTeamRoster = (teamName) => {
      return members
        .filter(m => (m.teams || []).includes(teamName))
        .sort((a, b) => a.name.localeCompare(b.name));
    };
    
    // Subtract 60 minutes from a "HH:MM" string. Returns "" if input invalid or result negative.
    const minusOneHour = (hhmm) => {
      if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return "";
      const [h, m] = hhmm.split(":").map(Number);
      const total = h * 60 + m - 60;
      if (total < 0) return "";
      return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
    };

    // Generate WhatsApp message
    const generateWhatsAppMessage = (match, selection) => {
      const { players, captain, vc, wk, note, reportTime, matchTime } = selection;
      const venue = getMatchVenue(match.label, match.home);
      const opponent = match.label.replace(/^(Div \d|Women's|OB|T20 Serie \d) (vs |@ )/i, "").replace(/\s*\d+$/, "");
      
      const division = match.label.match(/^(Div \d|T20 Serie \d|Women's|OB)/i)?.[1] || "";
      let msg = `Dear Team,\n\nPlaying XI for our ${division ? division + " " : ""}match against ${opponent}:\n\n`;
      
      players.forEach((p, i) => {
        let role = "";
        if (p === captain) role = " (C)";
        else if (p === vc) role = " (VC)";
        if (p === wk) role += role ? " (WK)" : " (WK)";
        msg += `${i + 1}. ${p}${role}\n`;
      });
      
      msg += `\n📅 ${fmtLong(match.date)}\n`;
      msg += `📍 ${venue ? `${venue.name}, ${venue.address}` : (match.home ? "Karlebo Cricket Ground, Karlebovej 23, 3480 Fredensborg" : "Away")}\n`;
      const displayMatchTime = matchTime || (match.label.includes("T20") ? "TBD" : "11:00");
      if (reportTime) {
        msg += `⏰ Reporting time: ${reportTime}\n`;
        msg += `🏏 Match starts: ${displayMatchTime}\n`;
      } else if (displayMatchTime !== "TBD") {
        msg += `⏰ Match: ${displayMatchTime}\n`;
      } else {
        msg += `⏰ Match time: TBD\n`;
      }
      
      if (note) {
        msg += `\n${note}\n`;
      }
      
      const team = visibleTeams.find(t => teamToDivision[t.name] === match.division);
      const captainName = team?.captain || currentUser?.name;
      const vcName = team?.vicecaptain;
      
      msg += `\nRegards,\n${captainName}${vcName ? ` & ${vcName}` : ""}`;
      
      return msg;
    };
    
    // Copy to clipboard
    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        alert("Copied to clipboard! Paste in WhatsApp.");
      } catch (e) {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("Copied to clipboard! Paste in WhatsApp.");
      }
    };
    
    // Open WhatsApp (mobile)
    const openWhatsApp = (text) => {
      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    };
    
    // Save selection (draft or finalized)
    const handleSaveSelection = (matchId, finalized = false) => {
      const selection = {
        players: xiSelection,
        captain: xiRoles.captain,
        vc: xiRoles.vc,
        wk: xiRoles.wk,
        note: xiNote,
        reportTime: xiReportTime,
        matchTime: xiMatchTime,
        savedAt: new Date().toISOString(),
        savedBy: currentUser?.name,
        finalized: finalized,
      };
      const updated = { ...matchSelections, [matchId]: selection };
      saveMatchSelections(updated);
      setCaptainXIModal(null);
      setXiSelection([]);
      setXiRoles({ captain: null, vc: null, wk: null });
      setXiNote("");
      setXiReportTime("");
      setXiMatchTime("");
      setXiReportTimeUserTouched(false);
    };
    
    // Open modal with existing selection if any
    const openSelectionModal = (match, division) => {
      const matchId = `${match.date}-${division}`;
      const existing = matchSelections[matchId];
      
      // Find the team for this division to get default captain/VC
      const team = visibleTeams.find(t => teamToDivision[t.name] === division);
      const defaultCaptain = team?.captain || null;
      const defaultVC = team?.vicecaptain || null;
      
      const defaultMatchTime = match.label.includes("T20") ? "" : "11:00";
      if (existing) {
        setXiSelection(existing.players || []);
        setXiRoles({ captain: existing.captain, vc: existing.vc, wk: existing.wk });
        setXiNote(existing.note || "");
        const savedMatch = existing.matchTime || defaultMatchTime;
        const savedReport = existing.reportTime || "";
        setXiMatchTime(savedMatch);
        setXiReportTime(savedReport);
        // Treat the saved report time as user-touched if it's not exactly 1hr before match time —
        // protects custom values from being clobbered when match time changes.
        setXiReportTimeUserTouched(savedReport !== "" && savedReport !== minusOneHour(savedMatch));
      } else {
        // For new selection, pre-assign captain and VC from team data
        setXiSelection([]);
        setXiRoles({ captain: defaultCaptain, vc: defaultVC, wk: null });
        // Home games get a starter note; away games stay blank.
        setXiNote(match.home
          ? "As this is a home game, we are responsible to be present ahead of time to prepare the ground."
          : "");
        setXiMatchTime(defaultMatchTime);
        setXiReportTime(minusOneHour(defaultMatchTime));
        setXiReportTimeUserTouched(false);
      }
      setCaptainXIModal({ match, division });
    };
    
    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole} currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
        <AppHeader title="Captain's XI" sub="Select your playing eleven" onBack={()=>setView("schedule")}/>
        
        {/* Superadmin selective reset button — opens modal to pick specific matches */}
        {userRole === "superadmin" && Object.keys(matchSelections).length > 0 && (
          <div style={{padding: "0 16px", marginBottom: 8}}>
            <button
              onClick={() => { setXiResetSelected(new Set()); setXiResetModalOpen(true); }}
              style={{
                width: "100%", padding: "10px 16px",
                background: "#fef2f2", border: "1.5px solid #fecaca",
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 13, fontWeight: 600, color: "#b91c1c"
              }}
            >
              <span>🗑️</span>
              Reset Match XI ({Object.keys(matchSelections).length})
            </button>
          </div>
        )}
        
        <div style={{padding:"16px",paddingBottom:120}}>
          {/* Manage note templates */}
          <div style={{marginBottom: 16}}>
            <button
              onClick={() => setTemplatesModalOpen(true)}
              style={{
                padding: "8px 14px", borderRadius: 999,
                border: `1px solid ${G.border}`, background: G.white,
                fontSize: 13, fontWeight: 700, color: G.text,
                cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              📝 Manage note templates
            </button>
          </div>
          {visibleTeams.length === 0 ? (
            <div style={{textAlign:"center",padding:40,color:G.muted}}>
              <div style={{fontSize:48,marginBottom:16}}>⚓</div>
              <div style={{fontWeight:700}}>No Captain Role</div>
              <div style={{fontSize:13,marginTop:8}}>You're not assigned as captain or vice-captain for any senior team.</div>
            </div>
          ) : (
            visibleTeams.map(team => {
              const matches = getUpcomingMatches(team.name);
              const roster = getTeamRoster(team.name);
              const tc = getTeamCardColors(team.name);
              
              if (matches.length === 0) return null;
              
              return (
                <div key={team.id} style={{marginBottom: 24}}>
                  {/* Team header */}
                  <div style={{
                    background: tc.border, color: "#fff",
                    padding: "12px 16px", borderRadius: "12px 12px 0 0",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{fontWeight: 800, fontSize: 16}}>{team.name}</div>
                      <div style={{fontSize: 11, opacity: 0.8}}>
                        {team.captain && `C: ${team.captain}`}
                        {team.captain && team.vicecaptain && " · "}
                        {team.vicecaptain && `VC: ${team.vicecaptain}`}
                      </div>
                    </div>
                    <div style={{fontSize: 11, opacity: 0.7}}>{matches.length} upcoming</div>
                  </div>
                  
                  {/* Matches list */}
                  <div style={{background: G.white, border: `1px solid ${G.border}`, borderTop: "none", borderRadius: "0 0 12px 12px"}}>
                    {matches.slice(0, 5).map((m, i) => {
                      const matchId = `${m.date}-${m.division}`;
                      const hasSelection = !!matchSelections[matchId];
                      const sel = matchSelections[matchId];
                      const isDraft = hasSelection && !sel.finalized;
                      const isFinalized = hasSelection && sel.finalized;
                      
                      return (
                        <div key={i} style={{
                          padding: "14px 16px",
                          borderBottom: i < matches.length - 1 ? `1px solid ${G.border}` : "none",
                        }}>
                          <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12}}>
                            <div style={{flex: 1}}>
                              <div style={{fontSize: 13, fontWeight: 600, color: G.text}}>
                                {m.label.replace(/^(Div \d|Women's|OB|T20 Serie \d) /i, "")}
                              </div>
                              <div style={{fontSize: 12, color: G.muted, marginTop: 2}}>
                                {fmtShort(m.date)} · {m.home ? "Home" : "Away"}
                              </div>
                              {hasSelection && (
                                <div style={{
                                  fontSize: 11, 
                                  color: isFinalized ? G.green : "#f59e0b", 
                                  marginTop: 4,
                                  display: "flex", alignItems: "center", gap: 4
                                }}>
                                  {isFinalized ? "✓" : "📝"} 
                                  {sel.players?.length || 0} players
                                  {isDraft && <span style={{
                                    background: "#fef3c7", color: "#92400e",
                                    padding: "1px 6px", borderRadius: 4,
                                    fontSize: 10, fontWeight: 700, marginLeft: 4
                                  }}>DRAFT</span>}
                                  {isFinalized && <span style={{
                                    background: "#dcfce7", color: "#166534",
                                    padding: "1px 6px", borderRadius: 4,
                                    fontSize: 10, fontWeight: 700, marginLeft: 4
                                  }}>SENT</span>}
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={() => openSelectionModal(m, m.division)}
                              style={{
                                background: isFinalized ? G.green : isDraft ? "#f59e0b" : tc.border,
                                color: "#fff", border: "none", borderRadius: 8,
                                padding: "8px 14px", fontSize: 12, fontWeight: 700,
                                cursor: "pointer", fontFamily: "inherit",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {isFinalized ? "Edit XI" : isDraft ? "Continue" : "Select XI"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {matches.length > 5 && (
                      <div style={{padding: "10px 16px", textAlign: "center", fontSize: 12, color: G.muted}}>
                        +{matches.length - 5} more matches
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Selection Modal */}
        {captainXIModal && (()=>{
          const { match, division } = captainXIModal;
          const matchId = `${match.date}-${division}`;
          const team = visibleTeams.find(t => teamToDivision[t.name] === division);
          const roster = getTeamRoster(team?.name);
          const tc = getTeamCardColors(division);
          const venue = getMatchVenue(match.label, match.home);
          
          const togglePlayer = (name) => {
            if (xiSelection.includes(name)) {
              setXiSelection(xiSelection.filter(n => n !== name));
              // Clear roles if removed
              if (xiRoles.captain === name) setXiRoles(r => ({...r, captain: null}));
              if (xiRoles.vc === name) setXiRoles(r => ({...r, vc: null}));
              if (xiRoles.wk === name) setXiRoles(r => ({...r, wk: null}));
            } else if (xiSelection.length < 11) {
              setXiSelection([...xiSelection, name]);
            }
          };
          
          const setRole = (role, name) => {
            setXiRoles(r => ({...r, [role]: r[role] === name ? null : name}));
          };

          // Card styles for the 4 stacked sections
          const cardStyle = {
            background: G.white,
            border: `1px solid ${G.border}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          };
          const cardHeaderStyle = {
            fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
            textTransform: "uppercase", color: G.muted,
            marginBottom: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          };
          const initials = (name) => {
            const parts = (name || "").split(/\s+/).filter(Boolean);
            return parts.slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
          };

          return (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center"
            }} onClick={() => setCaptainXIModal(null)}>
              <div style={{
                background: G.white, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500,
                maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column"
              }} onClick={e => e.stopPropagation()}>
                
                {/* Modal header */}
                <div style={{
                  background: tc.border, color: "#fff", padding: "16px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{fontWeight: 800, fontSize: 15}}>Select Playing XI</div>
                    <div style={{fontSize: 12, opacity: 0.85, marginTop: 2}}>
                      {match.label.replace(/^(Div \d|Women's|OB|T20 Serie \d) /i, "")} · {fmtShort(match.date)}
                    </div>
                  </div>
                  <button onClick={() => setCaptainXIModal(null)} style={{
                    background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                    width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 18
                  }}>×</button>
                </div>
                
                {/* Body — scrollable */}
                <div style={{flex: 1, overflowY: "auto", padding: 14, background: G.cream}}>
                  {/* CARD 1: Match details */}
                  <div style={cardStyle}>
                    <div style={cardHeaderStyle}>Match details</div>
                    <div style={{fontSize: 13, color: G.text, marginBottom: 6, display: "flex", alignItems: "center", gap: 8}}>
                      <span>📅</span><span>{fmtLong(match.date)}</span>
                    </div>
                    <div style={{fontSize: 13, color: G.text, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8}}>
                      <span>📍</span>
                      <span>
                        {match.home ? "Home" : "Away"}
                        {venue ? ` — ${venue.name}, ${venue.address}` : (match.home ? " — Karlebo Cricket Ground, Karlebovej 23, 3480 Fredensborg" : "")}
                      </span>
                    </div>
                    <div style={{display: "flex", gap: 12}}>
                      <div style={{width: 110, flexShrink: 0}}>
                        <label style={{fontSize: 11, fontWeight: 700, color: G.muted, display: "block", marginBottom: 4}}>
                          MATCH START
                        </label>
                        <input
                          type="time"
                          value={xiMatchTime}
                          placeholder="TBD"
                          onChange={e => {
                            const newMatch = e.target.value;
                            setXiMatchTime(newMatch);
                            if (!xiReportTimeUserTouched) {
                              setXiReportTime(minusOneHour(newMatch));
                            }
                          }}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: 8,
                            border: `1px solid ${G.border}`, fontSize: 14, fontFamily: "inherit",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                      <div style={{width: 110, flexShrink: 0}}>
                        <label style={{fontSize: 11, fontWeight: 700, color: G.muted, display: "block", marginBottom: 4}}>
                          REPORT TIME
                        </label>
                        <input
                          type="time"
                          value={xiReportTime}
                          onChange={e => {
                            setXiReportTime(e.target.value);
                            setXiReportTimeUserTouched(true);
                          }}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: 8,
                            border: `1px solid ${G.border}`, fontSize: 14, fontFamily: "inherit",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Squad */}
                  <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                      <span>Squad</span>
                      <span style={{textTransform: "none", letterSpacing: 0, fontSize: 12, fontWeight: 800}}>
                        <span style={{color: tc.border}}>{xiSelection.length}</span>
                        <span style={{color: G.muted, fontWeight: 600}}> of {roster.length} selected</span>
                      </span>
                    </div>
                    {roster.length === 0 ? (
                      <div style={{padding: 20, textAlign: "center", color: G.muted, fontSize: 13}}>
                        No players assigned to this team yet
                      </div>
                    ) : (
                      <div style={{position: "relative"}}>
                        <div style={{
                          position: "absolute", top: 0, left: 1, right: 1, height: 16,
                          background: `linear-gradient(${tc.bg}, rgba(255,255,255,0))`,
                          pointerEvents: "none", zIndex: 2,
                          borderTopLeftRadius: 9, borderTopRightRadius: 9
                        }}/>
                        <div style={{
                          maxHeight: "min(400px, 55vh)", overflowY: "auto",
                          border: `1.5px solid ${tc.border}`,
                          borderRadius: 10, background: tc.bg,
                          scrollbarWidth: "thin",
                          WebkitOverflowScrolling: "touch"
                        }}>
                          {roster.map((player, rowIdx) => {
                            const selected = xiSelection.includes(player.name);
                            const idx = xiSelection.indexOf(player.name);
                            const isC = xiRoles.captain === player.name;
                            const isVC = xiRoles.vc === player.name;
                            const isWK = xiRoles.wk === player.name;
                            const otherTeams = (player.teams || []).filter(t => t && t !== team?.name);
                            const isLast = rowIdx === roster.length - 1;
                            return (
                              <div key={player.id} onClick={() => togglePlayer(player.name)} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                minHeight: 44, padding: "8px 12px",
                                background: selected ? "#dcfce7" : "#ffffff",
                                borderLeft: selected ? `4px solid ${G.green}` : "4px solid transparent",
                                borderBottom: isLast ? "none" : "1px solid rgba(0,0,0,0.06)",
                                cursor: "pointer",
                                transition: "background 0.12s"
                              }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                                  background: selected ? G.green : G.cream,
                                  color: selected ? "#fff" : G.muted,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 12, fontWeight: 800,
                                }}>
                                  {selected ? idx + 1 : initials(player.name)}
                                </div>
                                <div style={{flex: 1, minWidth: 0}}>
                                  <div style={{
                                    fontWeight: 600, fontSize: 14, color: G.text, lineHeight: 1.2,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                  }}>
                                    {player.name}
                                  </div>
                                  {otherTeams.length > 0 && (
                                    <div style={{display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap"}}>
                                      {otherTeams.slice(0, 3).map(otName => {
                                        const oc = getTeamCardColors(otName);
                                        return (
                                          <span key={otName} style={{
                                            background: oc.badgeBg, color: oc.badgeText,
                                            fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
                                            padding: "1px 6px", borderRadius: 999,
                                          }}>{otName}</span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                {selected && (
                                  <div style={{display: "flex", gap: 4, flexShrink: 0}} onClick={e => e.stopPropagation()}>
                                    <button onClick={() => setRole("captain", player.name)} style={{
                                      width: 28, height: 28, borderRadius: 6,
                                      background: isC ? "#14532d" : G.white,
                                      color: isC ? "#fff" : G.muted,
                                      border: `1px solid ${isC ? "#14532d" : G.border}`,
                                      fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit"
                                    }}>C</button>
                                    <button onClick={() => setRole("vc", player.name)} style={{
                                      width: 28, height: 28, borderRadius: 6,
                                      background: isVC ? "#1e3a5f" : G.white,
                                      color: isVC ? "#fff" : G.muted,
                                      border: `1px solid ${isVC ? "#1e3a5f" : G.border}`,
                                      fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit"
                                    }}>VC</button>
                                    <button onClick={() => setRole("wk", player.name)} style={{
                                      width: 28, height: 28, borderRadius: 6,
                                      background: isWK ? "#7c2d12" : G.white,
                                      color: isWK ? "#fff" : G.muted,
                                      border: `1px solid ${isWK ? "#7c2d12" : G.border}`,
                                      fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit"
                                    }}>WK</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{
                          position: "absolute", bottom: 0, left: 1, right: 1, height: 16,
                          background: `linear-gradient(rgba(255,255,255,0), ${tc.bg})`,
                          pointerEvents: "none", zIndex: 2,
                          borderBottomLeftRadius: 9, borderBottomRightRadius: 9
                        }}/>
                      </div>
                    )}
                  </div>

                  {/* CARD 3: Roles */}
                  <div style={cardStyle}>
                    <div style={cardHeaderStyle}>Captain &amp; wicketkeeper</div>
                    <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                      {[
                        {key: "captain", label: "CAPTAIN",      color: "#14532d"},
                        {key: "vc",      label: "VICE-CAPTAIN", color: "#1e3a5f"},
                        {key: "wk",      label: "WICKETKEEPER", color: "#7c2d12"},
                      ].map(r => {
                        const name = xiRoles[r.key];
                        return (
                          <div key={r.key} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 10px", borderRadius: 8,
                            background: name ? G.cream : "transparent",
                            border: `1px solid ${name ? G.border : "transparent"}`,
                          }}>
                            <span style={{
                              fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                              padding: "3px 7px", borderRadius: 6,
                              background: r.color, color: "#fff", flexShrink: 0,
                            }}>{r.label}</span>
                            <span style={{flex: 1, fontSize: 13, fontWeight: name ? 700 : 500, color: name ? G.text : G.muted}}>
                              {name || "— not picked yet"}
                            </span>
                            {name && (
                              <button onClick={() => setRole(r.key, name)} style={{
                                background: "transparent", border: "none", cursor: "pointer",
                                fontSize: 18, color: G.muted, padding: "0 4px", lineHeight: 1, fontFamily: "inherit"
                              }} title="Clear">×</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{fontSize: 11, color: G.muted, marginTop: 8, lineHeight: 1.4}}>
                      Tap C / VC / WK on a selected player above to assign roles.
                    </div>
                  </div>

                  {/* CARD 4: Notes */}
                  <div style={cardStyle}>
                    <div style={cardHeaderStyle}>Captain&apos;s note</div>
                    <textarea
                      value={xiNote}
                      onChange={e => setXiNote(e.target.value)}
                      placeholder="e.g. Arrive 30 mins early for warm-up. Stay hydrated and bring snacks."
                      rows={3}
                      style={{
                        width: "100%", padding: "10px 12px", borderRadius: 8,
                        border: `1px solid ${G.border}`, fontSize: 14, fontFamily: "inherit",
                        resize: "vertical", minHeight: 70, boxSizing: "border-box"
                      }}
                    />
                    {noteTemplates.length > 0 && (
                      <div style={{position: "relative", marginTop: 8}}>
                        <button
                          onClick={() => setTemplatePickerOpen(o => !o)}
                          style={{
                            padding: "5px 12px", borderRadius: 999,
                            border: `1px solid ${G.border}`, background: G.white,
                            fontSize: 12, fontWeight: 700, color: G.text,
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          Use template ▾
                        </button>
                        {templatePickerOpen && (
                          <div style={{
                            position: "absolute", top: "100%", left: 0, marginTop: 4,
                            background: G.white, border: `1px solid ${G.border}`, borderRadius: 10,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10,
                            maxHeight: 280, overflowY: "auto", minWidth: 260, maxWidth: "90vw",
                          }}>
                            {noteTemplates.map(t => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  if (xiNote && !confirm("Replace current notes?")) return;
                                  setXiNote(t.text);
                                  setTemplatePickerOpen(false);
                                }}
                                style={{
                                  display: "block", width: "100%", textAlign: "left",
                                  padding: "10px 12px", border: "none",
                                  borderBottom: `1px solid ${G.border}`,
                                  background: G.white, cursor: "pointer", fontFamily: "inherit",
                                  fontSize: 13, color: G.text, lineHeight: 1.4,
                                }}
                              >
                                {t.text.length > 80 ? t.text.slice(0, 80) + "…" : t.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky footer with action buttons */}
                <div style={{
                  borderTop: `1px solid ${G.border}`, background: G.white,
                  padding: "14px 16px",
                  paddingBottom: "max(14px, env(safe-area-inset-bottom))",
                }}>
                  <button onClick={() => {
                    handleSaveSelection(matchId, false);
                  }} style={{
                    width: "100%", padding: "12px", borderRadius: 10, marginBottom: 10,
                    background: G.cream, color: G.text, border: `1.5px solid ${G.border}`,
                    fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}>
                    <span>📝</span> Save Draft ({xiSelection.length} players)
                  </button>
                  <div style={{display: "flex", gap: 10}}>
                    <button
                      onClick={() => handleSaveSelection(matchId, true)}
                      disabled={xiSelection.length !== 11}
                      style={{
                        flex: 1, padding: "12px", borderRadius: 10,
                        background: xiSelection.length === 11 ? G.green : G.border,
                        color: "#fff", border: "none",
                        fontWeight: 800, fontSize: 14,
                        cursor: xiSelection.length === 11 ? "pointer" : "not-allowed",
                        fontFamily: "inherit",
                        opacity: xiSelection.length === 11 ? 1 : 0.6
                      }}
                    >
                      {xiSelection.length === 11 ? "✓ Finalize XI" : `Need ${11 - xiSelection.length} more`}
                    </button>
                    {xiSelection.length === 11 && (
                      <button onClick={() => {
                        handleSaveSelection(matchId, true);
                        const sel = {
                          players: xiSelection,
                          captain: xiRoles.captain,
                          vc: xiRoles.vc,
                          wk: xiRoles.wk,
                          note: xiNote,
                          reportTime: xiReportTime,
                          matchTime: xiMatchTime,
                        };
                        const msg = generateWhatsAppMessage(match, sel);
                        if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
                          openWhatsApp(msg);
                        } else {
                          copyToClipboard(msg);
                        }
                      }} style={{
                        flex: 1, padding: "12px", borderRadius: 10,
                        background: "#25D366", color: "#fff", border: "none",
                        fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                      }}>
                        <span>📲</span> WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Note Templates Management Modal */}
        {templatesModalOpen && (() => {
          const truncate30 = s => (s.length > 30 ? s.slice(0,30) + "..." : s);
          const handleAdd = () => {
            const text = templateNewText.trim();
            if (!text) return;
            const nowIso = new Date().toISOString();
            const t = {
              id: uid(),
              text,
              createdBy: currentUser?.name || "unknown",
              createdAt: nowIso,
              updatedAt: nowIso,
            };
            saveNoteTemplates([...noteTemplates, t]);
            logAction("template", `Added note template: "${truncate30(text)}"`);
            setTemplateNewText("");
          };
          const handleEditSave = (id) => {
            const text = templateEditingText.trim();
            if (!text) return;
            const updated = noteTemplates.map(t =>
              t.id === id ? { ...t, text, updatedAt: new Date().toISOString() } : t
            );
            saveNoteTemplates(updated);
            logAction("template", `Edited note template: "${truncate30(text)}"`);
            setTemplateEditingId(null);
            setTemplateEditingText("");
          };
          const handleDelete = (t) => {
            if (!confirm(`Delete this template?\n\n"${truncate30(t.text)}"`)) return;
            saveNoteTemplates(noteTemplates.filter(x => x.id !== t.id));
            logAction("template", `Deleted note template: "${truncate30(t.text)}"`);
          };
          return (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center"
            }} onClick={() => { setTemplatesModalOpen(false); setTemplateEditingId(null); }}>
              <div style={{
                background: G.white, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500,
                maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column"
              }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                  background: G.green, color: "#fff", padding: "16px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{fontWeight: 800, fontSize: 15}}>Note templates</div>
                    <div style={{fontSize: 12, opacity: 0.85, marginTop: 2}}>Shared across all captains and VCs</div>
                  </div>
                  <button onClick={() => { setTemplatesModalOpen(false); setTemplateEditingId(null); }} style={{
                    background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                    width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 18
                  }}>×</button>
                </div>

                {/* Template list */}
                <div style={{flex: 1, overflowY: "auto", padding: "12px 16px"}}>
                  {noteTemplates.length === 0 ? (
                    <div style={{textAlign: "center", padding: 20, color: G.muted, fontSize: 13}}>
                      No templates yet.
                    </div>
                  ) : (
                    noteTemplates.map(t => (
                      <div key={t.id} style={{
                        background: G.cream, border: `1px solid ${G.border}`, borderRadius: 10,
                        padding: 12, marginBottom: 10,
                      }}>
                        {templateEditingId === t.id ? (
                          <>
                            <textarea
                              value={templateEditingText}
                              onChange={e => setTemplateEditingText(e.target.value)}
                              rows={3}
                              style={{
                                width: "100%", padding: "8px 10px", borderRadius: 8,
                                border: `1px solid ${G.border}`, fontSize: 13, fontFamily: "inherit",
                                resize: "vertical", marginBottom: 8,
                              }}
                            />
                            <div style={{display: "flex", gap: 8, justifyContent: "flex-end"}}>
                              <button
                                onClick={() => { setTemplateEditingId(null); setTemplateEditingText(""); }}
                                style={{
                                  padding: "6px 12px", borderRadius: 8,
                                  border: `1px solid ${G.border}`, background: G.white,
                                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                                }}
                              >Cancel</button>
                              <button
                                onClick={() => handleEditSave(t.id)}
                                disabled={!templateEditingText.trim()}
                                style={{
                                  padding: "6px 12px", borderRadius: 8,
                                  border: "none", background: G.green, color: "#fff",
                                  fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                                  cursor: templateEditingText.trim() ? "pointer" : "not-allowed",
                                  opacity: templateEditingText.trim() ? 1 : 0.6,
                                }}
                              >Save</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{fontSize: 13, color: G.text, lineHeight: 1.5, marginBottom: 8, whiteSpace: "pre-wrap"}}>
                              {t.text}
                            </div>
                            <div style={{display: "flex", gap: 8, justifyContent: "flex-end"}}>
                              <button
                                onClick={() => { setTemplateEditingId(t.id); setTemplateEditingText(t.text); }}
                                style={{
                                  padding: "5px 10px", borderRadius: 8,
                                  border: `1px solid ${G.border}`, background: G.white,
                                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                                }}
                              >✏️ Edit</button>
                              <button
                                onClick={() => handleDelete(t)}
                                style={{
                                  padding: "5px 10px", borderRadius: 8,
                                  border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c",
                                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                                }}
                              >🗑️ Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add new template */}
                <div style={{borderTop: `1px solid ${G.border}`, padding: "12px 16px", background: G.white}}>
                  <label style={{fontSize: 11, fontWeight: 700, color: G.muted, display: "block", marginBottom: 4}}>
                    ADD NEW TEMPLATE
                  </label>
                  <textarea
                    value={templateNewText}
                    onChange={e => setTemplateNewText(e.target.value)}
                    placeholder="e.g. Bring extra bottles of water — ground temperature can be high."
                    rows={2}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: 8,
                      border: `1px solid ${G.border}`, fontSize: 13, fontFamily: "inherit",
                      resize: "vertical", marginBottom: 8,
                    }}
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!templateNewText.trim()}
                    style={{
                      width: "100%", padding: "10px", borderRadius: 8,
                      border: "none", background: G.green, color: "#fff",
                      fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                      cursor: templateNewText.trim() ? "pointer" : "not-allowed",
                      opacity: templateNewText.trim() ? 1 : 0.6,
                    }}
                  >+ Add template</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Selective XI reset modal — super admin only */}
        {xiResetModalOpen && userRole === "superadmin" && (() => {
          const entries = Object.keys(matchSelections).map(matchId => {
            // matchId is `${date}-${division}` where date is YYYY-MM-DD (10 chars).
            const date = matchId.slice(0, 10);
            const division = matchId.slice(11);
            const fixture = ALL_FIXTURES.find(f => f.date === date && f.division === division);
            return {
              matchId,
              date,
              division,
              label: fixture?.label || `${division} · ${matchId}`,
            };
          }).sort((a, b) => a.date.localeCompare(b.date));

          const allSelected = entries.length > 0 && entries.every(e => xiResetSelected.has(e.matchId));
          const toggleOne = id => {
            const next = new Set(xiResetSelected);
            if (next.has(id)) next.delete(id); else next.add(id);
            setXiResetSelected(next);
          };
          const toggleAll = () => {
            if (allSelected) setXiResetSelected(new Set());
            else setXiResetSelected(new Set(entries.map(e => e.matchId)));
          };
          const closeModal = () => { setXiResetModalOpen(false); setXiResetSelected(new Set()); };
          const confirmReset = () => {
            const updated = { ...matchSelections };
            xiResetSelected.forEach(id => { delete updated[id]; });
            const n = xiResetSelected.size;
            saveMatchSelections(updated);
            showToast(`Reset ${n} match${n === 1 ? "" : "es"}`);
            closeModal();
          };

          const selectedCount = xiResetSelected.size;

          return (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center"
            }} onClick={closeModal}>
              <div style={{
                background: G.white, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500,
                maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column"
              }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                  background: G.green, color: "#fff", padding: "16px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{fontWeight: 800, fontSize: 15}}>Reset Match XI</div>
                    <div style={{fontSize: 12, opacity: 0.85, marginTop: 2}}>Pick the matches whose saved XI you want to clear</div>
                  </div>
                  <button onClick={closeModal} style={{
                    background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                    width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 18
                  }}>×</button>
                </div>

                {/* Select all toggle */}
                <div style={{
                  padding: "10px 16px", borderBottom: `1px solid ${G.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: G.cream,
                }}>
                  <button
                    onClick={toggleAll}
                    style={{
                      padding: "6px 12px", borderRadius: 8,
                      border: `1px solid ${G.border}`, background: G.white,
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      color: G.text,
                    }}
                  >{allSelected ? "Deselect all" : "Select all"}</button>
                  <div style={{fontSize: 12, fontWeight: 700, color: G.muted}}>
                    {selectedCount} of {entries.length} selected
                  </div>
                </div>

                {/* Match list */}
                <div style={{flex: 1, overflowY: "auto", padding: "12px 16px"}}>
                  {entries.length === 0 ? (
                    <div style={{textAlign: "center", padding: 20, color: G.muted, fontSize: 13}}>
                      No saved match XIs.
                    </div>
                  ) : (
                    entries.map(e => {
                      const checked = xiResetSelected.has(e.matchId);
                      return (
                        <label key={e.matchId} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          background: checked ? "#fef2f2" : G.cream,
                          border: `1px solid ${checked ? "#fecaca" : G.border}`,
                          borderRadius: 10, padding: 12, marginBottom: 8,
                          cursor: "pointer",
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(e.matchId)}
                            style={{width: 18, height: 18, cursor: "pointer", accentColor: G.green}}
                          />
                          <div style={{flex: 1, minWidth: 0}}>
                            <div style={{fontSize: 13, fontWeight: 700, color: G.text, marginBottom: 2}}>
                              {e.label}
                            </div>
                            <div style={{fontSize: 11, color: G.muted, fontWeight: 600}}>
                              {fmtLong(e.date)} · {e.division}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Footer actions */}
                <div style={{
                  borderTop: `1px solid ${G.border}`, padding: "12px 16px",
                  background: G.white, display: "flex", gap: 8,
                }}>
                  <button
                    onClick={closeModal}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 8,
                      border: `1px solid ${G.border}`, background: G.white,
                      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      color: G.text,
                    }}
                  >Cancel</button>
                  <button
                    onClick={confirmReset}
                    disabled={selectedCount === 0}
                    style={{
                      flex: 2, padding: "10px", borderRadius: 8,
                      border: "none",
                      background: selectedCount > 0 ? "#dc2626" : "#fca5a5",
                      color: "#fff",
                      fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                      cursor: selectedCount > 0 ? "pointer" : "not-allowed",
                    }}
                  >Reset selected ({selectedCount})</button>
                </div>
              </div>
            </div>
          );
        })()}

        <BotNav view={view} setView={setView} userRole={userRole} pendingCount={joinRequests.length} currentUser={currentUser} teams={teams} G={G}/>
        {toast&&<Toast msg={toast} G={G}/>}
      </Shell>
    );
}
