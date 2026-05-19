import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import Shell from "../ui/Shell";
import BotNav from "../ui/BotNav";
import Toast from "../ui/Toast";
import Btn from "../ui/Btn";
import FFld from "../ui/FFld";
import { NetIcon, BothNetsIcon } from "../ui/icons";
import { RolePill, TeamPill, MemberRolePills } from "../ui/pills";
import AppHeader from "../ui/AppHeader";
import { ALL_FIXTURES, MATCH_FIXTURES } from "../constants/fixtures";
import { NAME_MAP, AMBIGUOUS_FIRST_NAMES, DIVISION_TEAMS, T20_SQUADS } from "../constants/admin-data";
import { ROLES, ROLE_META, can } from "../constants/roles";
import { TEAM_META, getTeamMeta } from "../constants/teams";
import { fmtShort, todayStr, isFuture } from "../utils/time";
import { getCoachTeams, getMemberRoleChips, maskEmail, isCoachMember } from "../utils/members";
import { EMAIL_SEED, normMember, uid } from "../constants/seeds";
import {
  DEFAULT_DUTY_CONFIG, DEFAULT_TEAM_CONFIG, STANDARD_ROLES,
  TRAINING_ROLE,
  getEffectiveConfig, isDutyEnabled,
  getSupportParents, setSupportParents, getSlotCount, countDuties, getSeasonYear,
  slugifyRoleId,
  buildTeamParentList, getTeamCoachNames,
  sessionBelongsToDutyTeam, isMatchSession,
  resolveDutyTeam, getRollupTeams,
  getMatchRoles, resolveRoleIcon, resolveRoleShort, resolveRoleLabel,
} from "../constants/parent-duty";
import {
  getUnsyncedFixtures,
  buildSessionsFromUnsynced,
} from "../constants/fixture-sync";

function ConfigRow({ label, sublabel, control }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "0.5px solid var(--color-border, #e2e8f0)"
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f1a3a" }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      {control}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 38, height: 22, borderRadius: 11,
        background: on ? "#1D9E75" : "#D3D1C7",
        border: "none", cursor: "pointer",
        position: "relative", padding: 0, flexShrink: 0
      }}>
      <span style={{
        position: "absolute", top: 2,
        left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff", transition: "left .15s"
      }} />
    </button>
  );
}

function Stepper({ value, min = 0, max = 99, onChange }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center",
      border: "0.5px solid #cbd5e1", borderRadius: 8, overflow: "hidden"
    }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{
          width: 28, height: 28, border: "none",
          background: "#f1f5f9", fontSize: 14,
          cursor: value > min ? "pointer" : "not-allowed",
          fontFamily: "inherit", padding: 0,
          opacity: value <= min ? 0.4 : 1
        }}>−</button>
      <span style={{
        width: 32, textAlign: "center",
        fontSize: 13, fontWeight: 700
      }}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{
          width: 28, height: 28, border: "none",
          background: "#f1f5f9", fontSize: 14,
          cursor: value < max ? "pointer" : "not-allowed",
          fontFamily: "inherit", padding: 0,
          opacity: value >= max ? 0.4 : 1
        }}>+</button>
    </div>
  );
}

// ─── Link Parent picker modal ─────────────────────────────────────────────
// Replaces the old window.prompt() that listed names statically and required
// typing. Tap to link; inline "+ Create new parent" creates the member and
// links the child in one step. Kept in this file for v1 — extract to
// src/components if reused.
function LinkParentModal({ childMember, members, G, showToast, onClose, onLink, onCreateAndLink }) {
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  // Phone + email pre-fill from the child's record — for orphan children, the
  // contact captured during the join-request flow is almost always the parent's.
  const [newPhone, setNewPhone] = useState(childMember.phone || "");
  const [newEmail, setNewEmail] = useState(childMember.email || "");

  // Defensive: if the child somehow already has a parent when the modal opens,
  // bail. The button shouldn't render in that case but race conditions happen.
  useEffect(() => {
    if (childMember?.parentId) {
      showToast?.("Already linked.");
      onClose();
    }
  }, [childMember, showToast, onClose]);

  const candidates = members
    .filter(p =>
      p.id !== childMember.id &&
      !(p.teams || []).some(t =>
        t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder")
      )
    )
    .filter(p =>
      !search.trim() || p.name.toLowerCase().includes(search.toLowerCase().trim())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const childTeam = (childMember.teams || [])[0] || null;

  const handleCreateAndLink = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const newParent = normMember({
      id: uid(),
      name: trimmed,
      phone: newPhone.trim() || null,
      email: newEmail.trim() || null,
      emailVerified: false,
      teams: [],
      memberType: "parent",
      role: "member",
      children: [childMember.id],
    });
    onCreateAndLink(newParent);
  };

  const rowStyle = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, padding: "10px 12px", minHeight: 44,
    border: `1px solid ${G.border}`, borderRadius: 9,
    background: G.white, cursor: "pointer",
    textAlign: "left", fontFamily: "inherit",
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    borderRadius: 9, border: `1.5px solid ${G.border}`,
    padding: "11px 13px", fontSize: 15, fontFamily: "'DM Sans',sans-serif",
    fontWeight: 500, background: G.cream, color: G.text,
    outline: "none", minHeight: 44,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        zIndex: 200, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: G.white, borderRadius: 16, padding: 20,
          maxWidth: 460, width: "100%",
          maxHeight: "calc(100vh - 32px)",
          display: "flex", flexDirection: "column", gap: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        }}>

        {/* Header */}
        <div style={{display: "flex", alignItems: "flex-start", gap: 8}}>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontWeight: 900, fontSize: 16, color: G.text, lineHeight: 1.3}}>
              Link {childMember.name} to a parent
            </div>
            {childTeam && (
              <div style={{fontSize: 12, color: G.muted, marginTop: 2}}>
                {childTeam}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: G.muted, fontSize: 22, lineHeight: 1, padding: "2px 6px",
              fontFamily: "inherit",
            }}>×</button>
        </div>

        {/* Search */}
        <input
          autoFocus
          type="search"
          placeholder="Search parents by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />

        {/* Candidate list */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          maxHeight: 280, overflowY: "auto",
          paddingRight: 2,
        }}>
          {candidates.length === 0 ? (
            <div style={{
              padding: "16px 12px", textAlign: "center",
              color: G.muted, fontSize: 13, fontStyle: "italic",
            }}>
              No matches. Want to add a new parent?
            </div>
          ) : (
            candidates.map(p => {
              const isParent = p.memberType === "parent" || (p.children || []).length > 0;
              return (
                <button key={p.id} type="button" onClick={() => onLink(p)} style={rowStyle}>
                  <span style={{fontWeight: 700, fontSize: 14, color: G.text}}>
                    {p.name}
                  </span>
                  <span style={{
                    background: isParent ? "#dbeafe" : "#dcfce7",
                    color: isParent ? "#1e40af" : "#166534",
                    padding: "3px 8px", borderRadius: 6,
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {isParent ? "👨‍👧 Parent" : "🏏 Player"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* OR divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          color: G.muted, fontSize: 11, fontWeight: 700,
          letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          <span style={{flex: 1, height: 1, background: G.border}}/>
          OR
          <span style={{flex: 1, height: 1, background: G.border}}/>
        </div>

        {/* Create-new toggle / form */}
        {!showCreateForm ? (
          <button type="button" onClick={() => setShowCreateForm(true)}
            style={{
              minHeight: 44, padding: "10px 14px",
              borderRadius: 10, fontFamily: "inherit",
              border: "1.5px solid #f59e0b", background: "#fffbeb",
              color: "#92400e", fontSize: 14, fontWeight: 800,
              cursor: "pointer",
            }}>
            + Create new parent
          </button>
        ) : (
          <div style={{
            border: `1px solid ${G.border}`, borderRadius: 12,
            padding: 12, background: G.cream,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: G.muted,
              letterSpacing: 1.3, textTransform: "uppercase",
            }}>
              New parent
            </div>
            <input
              type="text"
              placeholder="Name (required)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{...inputStyle, background: G.white}}
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              style={{...inputStyle, background: G.white}}
            />
            <input
              type="email"
              placeholder="Email (optional, for account verification)"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              style={{...inputStyle, background: G.white}}
            />
            <div style={{display: "flex", gap: 8}}>
              <button type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewName("");
                  setNewPhone("");
                  setNewEmail("");
                }}
                style={{
                  flex: 1, minHeight: 44, padding: "10px",
                  borderRadius: 10, border: `1.5px solid ${G.border}`,
                  background: G.white, color: G.text,
                  fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Cancel
              </button>
              <button type="button"
                onClick={handleCreateAndLink}
                disabled={!newName.trim()}
                style={{
                  flex: 1, minHeight: 44, padding: "10px",
                  borderRadius: 10, border: "none",
                  background: newName.trim() ? G.green : "#cbd5e1",
                  color: newName.trim() ? G.lime : "#64748b",
                  fontSize: 14, fontWeight: 800,
                  cursor: newName.trim() ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}>
                Create &amp; link
              </button>
            </div>
          </div>
        )}

        {/* Footer reassurance */}
        <div style={{
          fontSize: 11, color: G.muted, lineHeight: 1.5,
          paddingTop: 4,
        }}>
          Linking creates a relationship between this child and a parent member.
          The parent's account can later set a PIN to log in.
        </div>
      </div>
    </div>
  );
}

// ─── Link Child picker modal ──────────────────────────────────────────────
// Mirror of LinkParentModal but for the "+ Link Child" button on parent
// records. Candidate list = unparented juniors. Inline create has a team
// dropdown + email field (email pre-fills from the parent).
const JUNIOR_TEAM_MATCH = (team) =>
  team.startsWith("U") || team.includes("Girls");

function LinkChildModal({ parentMember, members, teams, G, onClose, onLink, onCreateAndLink }) {
  const juniorTeams = (teams || [])
    .map(t => t.name)
    .filter(JUNIOR_TEAM_MATCH);

  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState(juniorTeams[0] || "");
  const [newEmail, setNewEmail] = useState(parentMember.email || "");

  const candidates = members
    .filter(c =>
      c.id !== parentMember.id &&
      !c.parentId &&
      (c.teams || []).some(JUNIOR_TEAM_MATCH)
    )
    .filter(c =>
      !search.trim() || c.name.toLowerCase().includes(search.toLowerCase().trim())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleCreateAndLink = () => {
    if (!newName.trim() || !newTeam) return;
    const newChild = normMember({
      id: uid(),
      name: newName.trim(),
      email: newEmail.trim() || null,
      emailVerified: false,
      teams: [newTeam],
      memberType: "player", // children stored as players with parentId
      role: "member",
      parentId: parentMember.id,
      parentName: parentMember.name,
    });
    onCreateAndLink(newChild);
  };

  const rowStyle = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, padding: "10px 12px", minHeight: 44,
    border: `1px solid ${G.border}`, borderRadius: 9,
    background: G.white, cursor: "pointer",
    textAlign: "left", fontFamily: "inherit",
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    borderRadius: 9, border: `1.5px solid ${G.border}`,
    padding: "11px 13px", fontSize: 15, fontFamily: "'DM Sans',sans-serif",
    fontWeight: 500, background: G.cream, color: G.text,
    outline: "none", minHeight: 44,
  };

  const canCreate = !!newName.trim() && !!newTeam;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        zIndex: 200, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: G.white, borderRadius: 16, padding: 20,
          maxWidth: 460, width: "100%",
          maxHeight: "calc(100vh - 32px)",
          display: "flex", flexDirection: "column", gap: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        }}>

        {/* Header */}
        <div style={{display: "flex", alignItems: "flex-start", gap: 8}}>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontWeight: 900, fontSize: 16, color: G.text, lineHeight: 1.3}}>
              Link a child to {parentMember.name}
            </div>
            <div style={{fontSize: 12, color: G.muted, marginTop: 2}}>
              Find an existing junior member or create a new one
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: G.muted, fontSize: 22, lineHeight: 1, padding: "2px 6px",
              fontFamily: "inherit",
            }}>×</button>
        </div>

        {/* Search */}
        <input
          autoFocus
          type="search"
          placeholder="Search children by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />

        {/* Candidate list */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          maxHeight: 280, overflowY: "auto",
          paddingRight: 2,
        }}>
          {candidates.length === 0 ? (
            <div style={{
              padding: "16px 12px", textAlign: "center",
              color: G.muted, fontSize: 13, fontStyle: "italic",
            }}>
              No matches. Want to add a new child?
            </div>
          ) : (
            candidates.map(c => {
              const childTeams = (c.teams || []).filter(JUNIOR_TEAM_MATCH);
              return (
                <button key={c.id} type="button" onClick={() => onLink(c)} style={rowStyle}>
                  <span style={{fontWeight: 700, fontSize: 14, color: G.text}}>
                    {c.name}
                  </span>
                  <span style={{display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end"}}>
                    {childTeams.map(t => <TeamPill key={t} team={t}/>)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* OR divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          color: G.muted, fontSize: 11, fontWeight: 700,
          letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          <span style={{flex: 1, height: 1, background: G.border}}/>
          OR
          <span style={{flex: 1, height: 1, background: G.border}}/>
        </div>

        {/* Create-new toggle / form */}
        {!showCreateForm ? (
          <button type="button" onClick={() => setShowCreateForm(true)}
            style={{
              minHeight: 44, padding: "10px 14px",
              borderRadius: 10, fontFamily: "inherit",
              border: "1.5px solid #f59e0b", background: "#fffbeb",
              color: "#92400e", fontSize: 14, fontWeight: 800,
              cursor: "pointer",
            }}>
            + Create new child
          </button>
        ) : (
          <div style={{
            border: `1px solid ${G.border}`, borderRadius: 12,
            padding: 12, background: G.cream,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: G.muted,
              letterSpacing: 1.3, textTransform: "uppercase",
            }}>
              New child
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Name (required)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{...inputStyle, background: G.white}}
            />
            <select
              value={newTeam}
              onChange={e => setNewTeam(e.target.value)}
              style={{...inputStyle, background: G.white, cursor: "pointer"}}>
              {juniorTeams.length === 0 && <option value="">(no junior teams configured)</option>}
              {juniorTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="email"
              placeholder="Email (optional)"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              style={{...inputStyle, background: G.white}}
            />
            <div style={{fontSize: 11, color: G.muted, lineHeight: 1.5, fontStyle: "italic"}}>
              Used to verify the child's account at first login. Often the parent's email.
            </div>
            <div style={{display: "flex", gap: 8}}>
              <button type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewName("");
                  setNewTeam(juniorTeams[0] || "");
                  setNewEmail(parentMember.email || "");
                }}
                style={{
                  flex: 1, minHeight: 44, padding: "10px",
                  borderRadius: 10, border: `1.5px solid ${G.border}`,
                  background: G.white, color: G.text,
                  fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Cancel
              </button>
              <button type="button"
                onClick={handleCreateAndLink}
                disabled={!canCreate}
                style={{
                  flex: 1, minHeight: 44, padding: "10px",
                  borderRadius: 10, border: "none",
                  background: canCreate ? G.green : "#cbd5e1",
                  color: canCreate ? G.lime : "#64748b",
                  fontSize: 14, fontWeight: 800,
                  cursor: canCreate ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}>
                Create &amp; link
              </button>
            </div>
          </div>
        )}

        {/* Footer reassurance */}
        <div style={{
          fontSize: 11, color: G.muted, lineHeight: 1.5,
          paddingTop: 4,
        }}>
          Linking creates a relationship between this parent and child.
          The child's account can use the email above to verify at first login.
        </div>
      </div>
    </div>
  );
}

// ─── Assign-duty modal (candidate picker → notification preview) ──────────
// Two screens in one modal: tap a candidate to write the assignment, then a
// pre-filled notification template appears with WhatsApp / Email toggle.
// Eligibility mirrors ProfileView self-signup: parents whose kids are on
// the session's team or a rollup-mapped team.
function AssignDutyModal({
  session, sessionTeam, role, roleLabel,
  members, sessions, teams, currentUser, parentDutyConfig,
  G, showToast,
  onAssign, // (parent) => bool — performs the write, returns success
  onClose,
}) {
  const [screen, setScreen] = useState("candidates"); // "candidates" | "notify"
  const [search, setSearch] = useState("");
  const [assignedParent, setAssignedParent] = useState(null);

  // Notification state — preserved across channel toggles
  const [messageText, setMessageText] = useState("");
  const [channel, setChannel] = useState("whatsapp");

  const dutyTeam = resolveDutyTeam(sessionTeam);
  const rollupTeams = getRollupTeams(dutyTeam);
  const seasonYear = getSeasonYear(session.date);

  // Eligible parents: a parent member whose linked kid is on any rollup team.
  // We display duty count per parent for the team so admin can pick fairly.
  const eligible = members
    .filter(m => {
      if (m.memberType !== "parent" && (m.children || []).length === 0) return false;
      const kids = (m.children || [])
        .map(cid => members.find(x => x.id === cid))
        .filter(Boolean);
      return kids.some(k => (k.teams || []).some(t => rollupTeams.includes(t)));
    })
    .map(p => {
      const count = countDuties(p, sessions, rollupTeams, seasonYear);
      const kidNames = (p.children || [])
        .map(cid => members.find(x => x.id === cid)?.name)
        .filter(Boolean);
      return { ...p, _dutyCount: count, _kidNames: kidNames };
    })
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return p.name.toLowerCase().includes(q)
        || p._kidNames.some(n => n.toLowerCase().includes(q));
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const cfg = getEffectiveConfig(dutyTeam, parentDutyConfig);
  const minDuties = cfg?.minDuties || 0;

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    borderRadius: 9, border: `1.5px solid ${G.border}`,
    padding: "11px 13px", fontSize: 15, fontFamily: "'DM Sans',sans-serif",
    fontWeight: 500, background: G.cream, color: G.text,
    outline: "none", minHeight: 44,
  };

  const rowStyle = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, padding: "10px 12px", minHeight: 48,
    border: `1px solid ${G.border}`, borderRadius: 9,
    background: G.white, cursor: "pointer",
    textAlign: "left", fontFamily: "inherit",
  };

  const dateLabel = new Date(session.date).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short"
  });
  const timeStr = session.from || session.matchTime || "";
  const venuePhrase = session.venue ? ` at ${session.venue}` : "";
  const opponentPhrase = session.isMatch && session.matchOpponent
    ? ` vs ${session.matchOpponent}` : "";
  const sessionType = isMatchSession(session) ? "match" : "training";
  const sessionLabel = session.label || (session.isMatch ? "Match" : "Training");

  // Build message template once per assigned-parent change.
  // Admin can then edit freely in the textarea; we don't overwrite.
  const buildTemplate = (parent) => {
    const adminName = currentUser?.name || "FCC Admin";
    const firstName = parent.name.split(" ")[0];
    return (
      `Hi ${firstName},\n\n` +
      `You've been assigned to ${roleLabel} duty for ${sessionTeam} ${sessionType}${opponentPhrase} on ${dateLabel} at ${timeStr}${venuePhrase}.\n\n` +
      `Could you confirm? If you can't make it, please let me know ASAP.\n\n` +
      `— ${adminName}`
    );
  };

  const tapCandidate = (parent) => {
    const ok = onAssign(parent);
    if (!ok) return;
    setAssignedParent(parent);
    setMessageText(buildTemplate(parent));
    // Default channel: WhatsApp if phone, else email if email, else copy-only
    const hasPhone = !!(parent.phone || "").replace(/\D/g, "");
    const hasEmail = !!parent.email;
    setChannel(hasPhone ? "whatsapp" : hasEmail ? "email" : "whatsapp");
    setScreen("notify");
  };

  const handleSend = () => {
    if (!assignedParent) return;
    if (channel === "whatsapp") {
      const phoneDigits = (assignedParent.phone || "").replace(/\D/g, "");
      const url = phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(url, "_blank");
      showToast?.(phoneDigits
        ? `WhatsApp opened for ${assignedParent.name.split(" ")[0]}`
        : `WhatsApp opened — pick contact`);
      onClose();
    } else if (channel === "email") {
      if (!assignedParent.email) {
        showToast?.("No email on file for this parent");
        return;
      }
      const subject = `${roleLabel} duty for ${sessionTeam} on ${dateLabel}`;
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "duty-assigned",
          data: {
            to: assignedParent.email,
            subject,
            body: messageText,
            parentName: assignedParent.name,
          },
        }),
      })
        .then(r => r.ok ? r.json() : r.json().then(e => { throw e; }))
        .then(() => showToast?.(`Email sent to ${assignedParent.email}`))
        .catch(err => {
          console.error("[duty-assigned] email send failed:", err);
          showToast?.("Email send failed — see console");
        });
      onClose();
    }
  };

  const handleCopy = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText)
      .then(() => showToast?.("✓ Message copied"))
      .catch(() => showToast?.("Copy failed — select & copy manually"));
  };

  const handleSkip = () => {
    onClose();
  };

  const hasPhone = !!(assignedParent?.phone || "").replace(/\D/g, "");
  const hasEmail = !!assignedParent?.email;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        zIndex: 200, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: G.white, borderRadius: 16, padding: 20,
          maxWidth: 480, width: "100%",
          maxHeight: "calc(100vh - 32px)",
          display: "flex", flexDirection: "column", gap: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        }}>

        {/* Header — shared across both screens */}
        <div style={{display: "flex", alignItems: "flex-start", gap: 8}}>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontWeight: 900, fontSize: 16, color: G.text, lineHeight: 1.3}}>
              {screen === "candidates"
                ? `Assign ${roleLabel} · ${sessionTeam}`
                : `Notify ${assignedParent?.name}?`}
            </div>
            <div style={{fontSize: 12, color: G.muted, marginTop: 2}}>
              {screen === "candidates"
                ? `${sessionLabel} · ${dateLabel}${timeStr ? ` · ${timeStr}` : ""}${venuePhrase}`
                : `${roleLabel} · ${sessionTeam} · ${dateLabel}${timeStr ? ` · ${timeStr}` : ""}`}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: G.muted, fontSize: 22, lineHeight: 1, padding: "2px 6px",
              fontFamily: "inherit",
            }}>×</button>
        </div>

        {/* ─── Screen 1: Candidate picker ─────────────────────── */}
        {screen === "candidates" && (
          <>
            <input
              autoFocus
              type="search"
              placeholder="Search parents or kids by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={inputStyle}
            />

            <div style={{
              display: "flex", flexDirection: "column", gap: 6,
              maxHeight: 320, overflowY: "auto",
              paddingRight: 2,
            }}>
              {eligible.length === 0 ? (
                <div style={{
                  padding: "16px 12px", textAlign: "center",
                  color: G.muted, fontSize: 13, fontStyle: "italic",
                }}>
                  No eligible parents for {sessionTeam}.
                </div>
              ) : (
                eligible.map(p => {
                  const c = p._dutyCount;
                  const m = minDuties;
                  const badgeBg = c >= m && m > 0 ? "#dcfce7" : c > 0 ? "#fef3c7" : "#fee2e2";
                  const badgeCol = c >= m && m > 0 ? "#166534" : c > 0 ? "#92400e" : "#991b1b";
                  const kidsSummary = p._kidNames.length === 0
                    ? ""
                    : p._kidNames.length === 1
                      ? `— ${p._kidNames[0]}`
                      : `— ${p._kidNames[0].split(" ")[0]} +${p._kidNames.length - 1} more`;
                  return (
                    <button key={p.id} type="button" onClick={() => tapCandidate(p)} style={rowStyle}>
                      <div style={{display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0}}>
                        <span style={{fontWeight: 700, fontSize: 14, color: G.text}}>
                          {p.name}
                        </span>
                        {kidsSummary && (
                          <span style={{fontSize: 11, color: G.muted}}>
                            {kidsSummary}
                          </span>
                        )}
                      </div>
                      <span style={{
                        background: badgeBg, color: badgeCol,
                        padding: "3px 8px", borderRadius: 6,
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>
                        {c}/{m || "—"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div style={{
              fontSize: 11, color: G.muted, lineHeight: 1.5,
              paddingTop: 4,
            }}>
              Tap a parent to assign this duty. You'll get a chance to notify them
              before the modal closes.
            </div>
          </>
        )}

        {/* ─── Screen 2: Notification preview ──────────────────── */}
        {screen === "notify" && assignedParent && (
          <>
            <div style={{
              fontSize: 11, color: "#166534", background: "#dcfce7",
              borderRadius: 8, padding: "6px 10px", fontWeight: 700,
            }}>
              ✓ Assignment saved
            </div>

            {/* Channel toggle */}
            <div style={{display: "flex", gap: 6}}>
              <button type="button"
                disabled={!hasEmail}
                onClick={() => setChannel("email")}
                style={{
                  flex: 1, minHeight: 44, borderRadius: 10,
                  border: channel === "email" ? `1.5px solid ${G.green}` : `1px solid ${G.border}`,
                  background: channel === "email" ? `${G.green}14` : G.white,
                  color: !hasEmail ? G.muted : channel === "email" ? G.green : G.text,
                  fontSize: 13, fontWeight: 800,
                  cursor: hasEmail ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  opacity: hasEmail ? 1 : 0.55,
                }}>
                📧 Email{!hasEmail ? " (none)" : ""}
              </button>
              <button type="button"
                onClick={() => setChannel("whatsapp")}
                style={{
                  flex: 1, minHeight: 44, borderRadius: 10,
                  border: channel === "whatsapp" ? `1.5px solid ${G.green}` : `1px solid ${G.border}`,
                  background: channel === "whatsapp" ? `${G.green}14` : G.white,
                  color: channel === "whatsapp" ? G.green : G.text,
                  fontSize: 13, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                💬 WhatsApp{!hasPhone ? " (pick contact)" : ""}
              </button>
            </div>

            {!hasPhone && !hasEmail && (
              <div style={{
                fontSize: 11, color: "#92400e", background: "#fffbeb",
                border: "1px solid #fde68a", borderRadius: 8,
                padding: "8px 10px", lineHeight: 1.5,
              }}>
                This parent has no email or phone on file. Copy the message and
                send via your preferred channel.
              </div>
            )}

            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              rows={6}
              style={{
                ...inputStyle, minHeight: 140,
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: 1.5, resize: "vertical",
              }}
            />

            <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
              <button type="button" onClick={handleSkip}
                style={{
                  flex: 1, minHeight: 44, padding: "10px",
                  borderRadius: 10, border: `1.5px solid ${G.border}`,
                  background: G.white, color: G.text,
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Skip
              </button>
              <button type="button" onClick={handleCopy}
                style={{
                  flex: 1, minHeight: 44, padding: "10px",
                  borderRadius: 10, border: `1.5px solid ${G.border}`,
                  background: G.white, color: G.text,
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Copy
              </button>
              <button type="button"
                onClick={handleSend}
                disabled={channel === "email" && !hasEmail}
                style={{
                  flex: 1.5, minHeight: 44, padding: "10px",
                  borderRadius: 10, border: "none",
                  background: (channel === "email" && !hasEmail) ? "#cbd5e1" : "#f59e0b",
                  color: (channel === "email" && !hasEmail) ? "#64748b" : "#fff",
                  fontSize: 13, fontWeight: 800,
                  cursor: (channel === "email" && !hasEmail) ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}>
                Send
              </button>
            </div>

            <div style={{
              fontSize: 11, color: G.muted, lineHeight: 1.5, paddingTop: 4,
            }}>
              Assignment is saved either way. Skip if you'll notify them yourself.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminView() {
  const {
    G, view, setView, userRole, currentUser, teams, members,
    sessions, recurring, blockCals, inviteCodes, joinRequests, auditLog, reminderLogs,
    pins, resetPin,
    saveMembers, saveTeams, saveBlockCals, saveJoinRequests, saveSessions,
    showToast, logAction, joinRequests: _joinReq, toast,
    // Admin form state
    newName, setNewName, newTeam, setNewTeam,
    newEmail, setNewEmail, newPhone, setNewPhone,
    newMemberType, setNewMemberType,
    newLinkParent, setNewLinkParent,
    newGenCode, setNewGenCode,
    aSearch, setASearch, aFilter, setAFilter,
    aSubTab, setASubTab,
    adminListMode, setAdminListMode,
    selMember, setSelMember,
    expandedSessions, setExpandedSessions,
    editingRole, setEditingRole,
    newTName, setNewTName,
    newTSenior, setNewTSenior,
    editingTeam, setEditingTeam,
    coachSearch, setCoachSearch,
    adminSec, setAdminSec, toggleAdminSec,
    editingName, setEditingName,
    DAYS,
    rName, setRName, rTeam, setRTeam, rRestrict, setRRestrict,
    rDay, setRDay, rFrom, setRFrom, rTo, setRTo,
    rActiveFrom, setRActiveFrom, rActiveTo, setRActiveTo,
    rNet, setRNet,
    editingSlot, setEditingSlot,
    logFilter, setLogFilter, logOpen, setLogOpen,
    confirmDelete, setConfirmDelete,
    codeModal, setCodeModal,
    showAllBlocks, setShowAllBlocks,
    xlsParsed, setXlsParsed, xlsError, setXlsError,
    bCalDate, setBCalDate, bCalFrom, setBCalFrom,
    bCalTo, setBCalTo, bCalLabel, setBCalLabel,
    showBlockForm, setShowBlockForm,
    seniorTeamNames, ALL_TEAMS, adminVisible, adminGrouped,
    generateInviteCode, genCode, hashCode,
    addTeam, renameTeam, deleteTeam, toggleTeamSenior,
    addRecurringSlot, toggleRecurringSlot, deleteRecurringSlot,
    deleteRecurringSlotSilent, updateRecurringSlot,
    addMember, removeMember, renameMember, fixAllNames,
    toggleMemberTeam, updateRole,
    parentDutyConfig, saveParentDutyConfig,
  } = useAppContext();

  const [adminTab, setAdminTab] = useState("people"); // people | sessions | comms | system
  const TAB_SECTIONS = {
    people:   ["members", "addmember", "groups", "coaches"],
    sessions: ["blocknets", "recurring", "parentduty", "dutyoversight"],
    comms:    ["reminderlogs"],
    system:   ["backup", "auditlog"],
  };
  const sectionInTab = (key) => TAB_SECTIONS[adminTab]?.includes(key);

  const [dutyEditTeam, setDutyEditTeam] = useState(null);
  const [dutyOversightTeam, setDutyOversightTeam] = useState("U11");
  const [newCustomRole, setNewCustomRole] = useState("");
  // { childMember } when open, null when closed
  const [linkParentModal, setLinkParentModal] = useState(null);
  // { parentMember } when open, null when closed
  const [linkChildModal, setLinkChildModal] = useState(null);

  // ASSIGN DUTIES — currently selected team (null = empty state) and modal payload
  const [assignDutyTeam, setAssignDutyTeam] = useState(null);
  // { session, sessionTeam, role, roleLabel } when open, null when closed
  const [assignDutyModal, setAssignDutyModal] = useState(null);

  // Admin's per-request team overrides on the Join Requests queue.
  // Shape: { [requestId]: teamName }. Cleared from this state when request
  // is approved/declined (the request leaves the queue).
  const [overrideTeams, setOverrideTeams] = useState({});

  // Jump to a member's expanded card. Used by the linked-name pills on
  // parent/child cards so admin can hop between related profiles.
  // If the target isn't visible under the current sub-tab/search/team filter,
  // we reset those filters first so the card actually renders.
  const jumpToMember = (targetId) => {
    if (!targetId) return;
    const target = members.find(x => x.id === targetId);
    if (!target) return;
    const currentlyVisible = adminVisible.some(x => x.id === targetId);
    if (!currentlyVisible) {
      setASubTab("all");
      setASearch("");
      setAFilter("All");
    }
    // Flip to flat view so the card structure with the badge row is in scope.
    if (adminListMode !== "flat") setAdminListMode("flat");
    setSelMember(target);
    setTimeout(() => {
      const el = document.querySelector(`[data-member-id="${targetId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const iSt = (extra={}) => ({
    width:"100%", borderRadius:9, border:`1.5px solid ${G.border}`,
    padding:"11px 13px", fontSize:15, fontFamily:"'DM Sans',sans-serif",
    fontWeight:500, background:G.cream, color:G.text,
    outline:"none", boxSizing:"border-box", ...extra,
  });

    const namesNeedFix = userRole==="superadmin"
      ? members.filter(m=>!m.name.includes(" ")&&NAME_MAP[m.name])
      : [];
    const namesAmbiguous = userRole==="superadmin"
      ? members.filter(m=>!m.name.includes(" ")&&AMBIGUOUS_FIRST_NAMES.includes(m.name))
      : [];
    // Members who have a seed email but no stored email yet
    const emailsToSeed = userRole==="superadmin"
      ? members.filter(m=>!m.email && EMAIL_SEED[m.name])
      : [];
    function seedAllEmails() {
      const updated = members.map(m =>
        !m.email && EMAIL_SEED[m.name] ? {...m, email: EMAIL_SEED[m.name]} : m
      );
      saveMembers(updated);
      logAction("system", `Seeded ${emailsToSeed.length} email${emailsToSeed.length>1?"s":""}: ${emailsToSeed.map(m=>m.name).join(", ")}`);
      showToast(`${emailsToSeed.length} email${emailsToSeed.length>1?"s":""} seeded ✓`);
    }
    // Members who have a division assignment in DIVISION_TEAMS but not yet that team in Firebase
    const divisionUpdates = userRole==="superadmin"
      ? members.filter(m=>{
          const div = DIVISION_TEAMS[m.name];
          return div && !(m.teams||[]).includes(div);
        })
      : [];
    function applyDivisionTeams() {
      const updated = members.map(m=>{
        const div = DIVISION_TEAMS[m.name];
        if(!div) return m;
        const existing = m.teams||[];
        if(existing.includes(div)) return m;
        return normMember({...m, teams:[...existing, div]});
      });
      saveMembers(updated);
      logAction("system", `Assigned division teams to ${divisionUpdates.length} member${divisionUpdates.length>1?"s":""}: ${divisionUpdates.map(m=>m.name+" → "+DIVISION_TEAMS[m.name]).join(", ")}`);
      showToast(`Division teams assigned ✓`);
    }

    // ── T20 squad import ───────────────────────────────────────
    function resolvedName(squadName, teamKey) {
      const map = T20_SQUADS[teamKey]?.nameMap||{};
      return map[squadName]||squadName;
    }

    function computeT20Updates() {
      const results = {};
      Object.entries(T20_SQUADS).forEach(([teamKey,squad])=>{
        const toAddTeam=[];  // existing members missing this T20 team
        const toCreate=[];   // genuinely new members
        const roleUpdates=[]; // captain/VC role changes

        squad.members.forEach(rawName=>{
          const appName = resolvedName(rawName, teamKey);
          const existing = members.find(m=>m.name===appName);
          if(existing) {
            if(!(existing.teams||[]).includes(teamKey))
              toAddTeam.push(existing);
            // captain/vc role
            if(appName===squad.captain && existing.role==="member")
              roleUpdates.push({member:existing, role:"captain"});
            if(appName===squad.vc && existing.role==="member")
              roleUpdates.push({member:existing, role:"vicecaptain"});
          } else {
            // only create if in newMembers list
            const nm=(squad.newMembers||[]).find(n=>n.name===rawName||n.name===appName);
            if(nm) toCreate.push(nm);
          }
        });
        results[teamKey]={toAddTeam,toCreate,roleUpdates};
      });
      return results;
    }

    function applyT20Squads() {
      const updates = computeT20Updates();
      let updatedMembers = [...members];
      let created=0, teamsAdded=0, rolesSet=0;

      Object.entries(updates).forEach(([teamKey,{toAddTeam,toCreate,roleUpdates}])=>{
        // Add T20 team to existing members
        updatedMembers = updatedMembers.map(m=>{
          if(toAddTeam.find(x=>x.id===m.id))
            return normMember({...m, teams:[...(m.teams||[]),teamKey]});
          return m;
        });
        teamsAdded += toAddTeam.length;

        // Apply role updates
        updatedMembers = updatedMembers.map(m=>{
          const ru=roleUpdates.find(r=>r.member.id===m.id);
          if(ru) { rolesSet++; return {...m, role:ru.role}; }
          return m;
        });

        // Create new members
        toCreate.forEach(nm=>{
          updatedMembers.push(normMember({id:uid(),...nm}));
          created++;
        });
      });

      saveMembers(updatedMembers);
      logAction("system",`T20 squad import: ${teamsAdded} team assignments, ${created} new members, ${rolesSet} roles set`);
      showToast(`T20 squads imported ✓  · ${teamsAdded} updated · ${created} new`);
    }

    const t20Updates = userRole==="superadmin" ? computeT20Updates() : {};
    return (
    <Shell G={G}>
      <AppHeader title="Manage Members"
        sub={`${members.length} members · ${teams.length} groups`}
        onBack={()=>setView("schedule")}/>

      {/* ── Admin top-level tabs ────────────────────────────── */}
      <div style={{padding:"10px 16px 12px",borderBottom:`1px solid ${G.border}`,
        background:G.cream}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {key:"people",   label:"👥 People",   countFn: () => joinRequests.filter(r=>r.status==="pending").length},
            {key:"sessions", label:"🏏 Sessions", countFn: () => 0},
            {key:"comms",    label:"📧 Comms",    countFn: () => 0},
            {key:"system",   label:"⚙️ System",   countFn: () => 0},
          ].map(({key,label,countFn})=>{
            const active = adminTab === key;
            const count = countFn();
            return (
              <button key={key}
                onClick={()=>{
                  setAdminTab(key);
                  window.scrollTo({top:0, behavior:"smooth"});
                }}
                style={{padding:"7px 16px",borderRadius:20,
                  border:`1.5px solid ${active?G.green:G.border}`,
                  background:active?`${G.green}12`:G.white,
                  color:active?G.green:G.text,
                  fontSize:12,fontWeight:800,cursor:"pointer",
                  fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .13s",
                  display:"flex",alignItems:"center",gap:6,flex:"0 0 auto"}}>
                {label}
                {count > 0 && (
                  <span style={{background:"#ef4444",color:"#fff",borderRadius:99,
                    fontSize:10,fontWeight:900,padding:"1px 7px",minWidth:18,
                    textAlign:"center"}}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{padding:"14px 16px 20px"}}>

        {/* ── Members section ─────────────────────────────────── */}
        {sectionInTab("members") && (<>
        <div id="sec-members"/>
        <button onClick={()=>toggleAdminSec("members")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.members?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>
            👥 Members &amp; Verifications
          </span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.members?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.members&&<>
        {/* ── Self-verified members (email confirmed, no action needed) ── */}
        {can(userRole,"addMember")&&(()=>{
          const verified = members.filter(m=>m.emailVerified&&!m.pin&&!Object.keys(inviteCodes).find(id=>id===m.id));
          if(!verified.length) return null;
          return (
            <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:12,
              padding:"12px 14px",marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:12,color:"#166534",marginBottom:8,
                display:"flex",alignItems:"center",gap:6}}>
                <span style={{background:"#16a34a",color:"#fff",borderRadius:99,
                  fontSize:9,fontWeight:900,padding:"1px 6px"}}>{verified.length}</span>
                ✅ Members who self-verified — generate invite codes to give them access
              </div>
              {verified.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"8px 10px",background:G.white,borderRadius:8,marginBottom:6,
                  border:`1px solid ${G.border}`}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:G.text}}>{m.name}</div>
                    <div style={{fontSize:11,color:G.muted}}>📧 {m.email}</div>
                  </div>
                  <Btn sm bg={G.green} col={G.lime}
                    onClick={()=>{
                      const code=generateInviteCode(m.id);
                      setToast(`📋 Code for ${m.name.split(" ")[0]}: ${code}`);
                      setTimeout(()=>setToast(null),6000);
                    }}>
                    🎟️ Give Access
                  </Btn>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── One-time role migration (captain/VC → member) ──── */}
        {userRole==="superadmin"&&(()=>{
          const legacy = members.filter(m=>
            ["captain","vicecaptain","t20captain","t20vicecaptain"].includes(m.role||"")
          );
          if(!legacy.length) return null;
          return (
            <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",
              borderRadius:12,padding:"14px 16px",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:13,color:"#92400e",marginBottom:6}}>
                ⚠️ {legacy.length} member{legacy.length>1?"s":""} still have legacy captain/VC roles
              </div>
              <div style={{fontSize:12,color:"#78350f",marginBottom:10,lineHeight:1.6}}>
                These were set before team-based captain/VC assignment. Click below to reset them
                all to Member — then assign their leadership roles via Coaches &amp; Captains.
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                {legacy.map(m=>(
                  <span key={m.id} style={{fontSize:11,padding:"2px 8px",borderRadius:20,
                    background:"#fef9c3",color:"#92400e",fontWeight:700}}>
                    {m.name} ({m.role})
                  </span>
                ))}
              </div>
              <button onClick={()=>{
                  const updated = members.map(m=>
                    ["captain","vicecaptain","t20captain","t20vicecaptain"].includes(m.role||"")
                      ? {...m, role:"member"} : m
                  );
                  saveMembers(updated);
                  logAction("role",`Migrated ${legacy.length} legacy captain/VC roles to member`);
                  showToast(`✓ ${legacy.length} roles reset to Member`);
                }}
                style={{background:"#92400e",color:"#fff",border:"none",borderRadius:8,
                  padding:"8px 16px",fontSize:12,fontWeight:800,cursor:"pointer",
                  fontFamily:"inherit"}}>
                Reset all to Member
              </button>
            </div>
          );
        })()}

        {/* ── Join Requests ──────────────────────────────────── */}
        {can(userRole,"addMember")&&joinRequests.filter(r=>r.status==="pending").length>0&&(()=>{
          const pending = joinRequests.filter(r=>r.status==="pending");

          // Pair parent + child requests via parentLinkId. Parents render once
          // with their linked child(ren) inline; child requests are not rendered
          // separately. Unpaired requests (single adult, or legacy joins) keep
          // the single-card flow.
          const childByParentId = new Map();
          pending.forEach(r => {
            if (r.parentLinkId) {
              const arr = childByParentId.get(r.parentLinkId) || [];
              arr.push(r);
              childByParentId.set(r.parentLinkId, arr);
            }
          });
          const cards = pending.filter(r => !r.parentLinkId);

          // Team lists for the per-request override dropdown. Senior = adult/
          // non-junior, junior = U* / Girls. Mirrors SignupFlow conventions.
          const isJuniorName = n => n.startsWith("U") || n.includes("Girls");
          const seniorTeamList = teams
            .filter(t => t.senior || !isJuniorName(t.name))
            .map(t => t.name)
            .filter(n => !isJuniorName(n))
            .sort();
          const juniorTeamList = teams
            .map(t => t.name)
            .filter(isJuniorName)
            .sort();

          // Resolve admin's final team pick for a request:
          // 1. explicit override (admin tapped the dropdown) ─►
          // 2. requested team (req.playerTeam) ─►
          // 3. null (must be picked before approve).
          const finalTeam = (req) => {
            const ov = overrideTeams[req.id];
            if (ov !== undefined) return ov || null;
            return req.playerTeam || null;
          };

          // Build a single member record using the admin's final team pick.
          function buildMember(req, teamPick) {
            return normMember({
              id: uid(),
              name: req.playerName,
              team: teamPick,
              teams: teamPick ? [teamPick] : [],
              role: "member",
              email: req.email||null,
              phone: req.contact||null,
              emailVerified: req.emailVerified||false,
              consentGiven: req.consentGiven||false,
              consentDate: req.consentDate||null,
              pendingTeam: false, // resolved at approval time
              note: req.parentName
                ? `Parent: ${req.parentName}${req.contact ? " · " + req.contact : ""}`
                : req.contact || null,
            });
          }

          function approvePair(parentReq, childReqs) {
            const parentTeam = finalTeam(parentReq);
            if (!parentTeam) {
              showToast(`Pick a team for ${parentReq.playerName} first`);
              return;
            }
            for (const c of childReqs) {
              if (!finalTeam(c)) {
                showToast(`Pick a team for ${c.playerName} first`);
                return;
              }
            }

            const newPairMembers = [];
            let parentMember = null;
            if (parentReq.matchedMemberId) {
              parentMember = members.find(m => m.id === parentReq.matchedMemberId) || null;
            }
            if (!parentMember) {
              parentMember = buildMember(parentReq, parentTeam);
              newPairMembers.push(parentMember);
            }
            const childMembers = [];
            childReqs.forEach(creq => {
              const cTeam = finalTeam(creq);
              if (creq.matchedMemberId) {
                const existing = members.find(m => m.id === creq.matchedMemberId);
                if (existing) {
                  // Update existing junior with admin's team pick if different.
                  const merged = {
                    ...existing,
                    teams: cTeam ? [...new Set([...(existing.teams || []), cTeam])] : (existing.teams || []),
                    pendingTeam: false,
                  };
                  childMembers.push(merged);
                  return;
                }
              }
              const cm = buildMember(creq, cTeam);
              childMembers.push(cm);
              newPairMembers.push(cm);
            });

            const childIds = childMembers.map(c => c.id);
            const linkedParent = {
              ...parentMember,
              memberType: "parent",
              children: [...new Set([...(parentMember.children || []), ...childIds])],
              emailVerified: parentMember.emailVerified || parentReq.emailVerified || false,
              pendingTeam: false,
            };
            const linkedChildren = childMembers.map(c => ({
              ...c,
              parentId: linkedParent.id,
              parentName: linkedParent.name,
            }));

            // Merge into canonical members array.
            const existingIds = new Set(members.map(m => m.id));
            let updatedMembers = members.map(m => {
              if (m.id === linkedParent.id) return linkedParent;
              const c = linkedChildren.find(x => x.id === m.id);
              return c || m;
            });
            newPairMembers.forEach(nm => {
              if (existingIds.has(nm.id)) return;
              if (nm.id === linkedParent.id) updatedMembers.push(linkedParent);
              else {
                const c = linkedChildren.find(x => x.id === nm.id);
                updatedMembers.push(c || nm);
              }
            });
            saveMembers(updatedMembers);

            const approvedIds = new Set([parentReq.id, ...childReqs.map(c => c.id)]);
            saveJoinRequests(joinRequests.map(r => approvedIds.has(r.id) ? {...r, status: "approved"} : r));

            // Drop overrides for resolved requests.
            setOverrideTeams(prev => {
              const next = { ...prev };
              approvedIds.forEach(id => { delete next[id]; });
              return next;
            });

            const isNewParent = newPairMembers.some(nm => nm.id === linkedParent.id);
            if (isNewParent && parentReq.emailVerified && linkedParent.id) {
              setTimeout(() => generateInviteCode(linkedParent.id), 500);
            }

            logAction("request",
              `Approved pair: ${parentReq.playerName} → ${parentTeam}` +
              (childReqs.length ? ` + ${childReqs.length} child${childReqs.length > 1 ? "ren" : ""}: ${childReqs.map(c => `${c.playerName} (${finalTeam(c)})`).join(", ")}` : "")
            );

            if (parentReq.email) {
              fetch("/api/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "approved",
                  data: {
                    name: linkedParent.name,
                    email: parentReq.email,
                    playerTeam: parentTeam, // admin's final pick
                    isPair: childReqs.length > 0,
                    children: linkedChildren.map(c => ({ name: c.name, team: (c.teams || [])[0] || null })),
                  },
                }),
              }).catch(()=>{});
            }
            showToast(`${linkedParent.name}${childReqs.length ? ` + ${childReqs.length} child${childReqs.length > 1 ? "ren" : ""}` : ""} added ✓`);
          }

          function approveRequest(req) {
            // If part of a pair, bundle its children.
            const children = childByParentId.get(req.id) || [];
            if (children.length > 0) {
              approvePair(req, children);
              return;
            }
            // Solo request.
            const teamPick = finalTeam(req);
            if (!teamPick) {
              showToast(`Pick a team for ${req.playerName} first`);
              return;
            }
            const newMember = buildMember(req, teamPick);
            saveMembers([...members, newMember]);
            if (req.emailVerified && newMember.id) {
              setTimeout(()=>generateInviteCode(newMember.id),500);
            }
            saveJoinRequests(joinRequests.map(r=>r.id===req.id ? {...r,status:"approved"} : r));
            setOverrideTeams(prev => {
              const next = { ...prev };
              delete next[req.id];
              return next;
            });
            logAction("request", `Approved join request: ${req.playerName} → ${teamPick}${req.forChild&&req.parentName?" (parent: "+req.parentName+")":""}`);
            if (req.email) {
              fetch("/api/notify", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body: JSON.stringify({
                  type: "approved",
                  data: { name: req.playerName, email: req.email, playerTeam: teamPick },
                }),
              }).catch(()=>{});
            }
            showToast(`${req.playerName} added ✓`);
          }

          function declineRequest(req) {
            const children = childByParentId.get(req.id) || [];
            const ids = new Set([req.id, ...children.map(c => c.id)]);
            saveJoinRequests(joinRequests.map(r => ids.has(r.id) ? {...r, status: "declined"} : r));
            setOverrideTeams(prev => {
              const next = { ...prev };
              ids.forEach(id => { delete next[id]; });
              return next;
            });
            logAction("request", `Declined join request: ${req.playerName}${children.length ? ` + child${children.length > 1 ? "ren" : ""}` : ""}`);
            if (req.email) {
              fetch("/api/notify", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body: JSON.stringify({
                  type: "declined",
                  data: { name: req.playerName, email: req.email },
                }),
              }).catch(()=>{});
            }
            showToast("Request declined");
          }

          // Per-request team-override dropdown. junior/senior list selected
          // based on whether the request is for a child.
          const TeamPicker = ({ req, isChild }) => {
            const opts = isChild ? juniorTeamList : seniorTeamList;
            const value = finalTeam(req) || "";
            const requested = req.playerTeam || "";
            const pending = !!req.pendingTeam;
            return (
              <select
                value={value}
                onChange={e => setOverrideTeams(prev => ({ ...prev, [req.id]: e.target.value }))}
                style={{
                  fontSize: 12, fontWeight: 700,
                  padding: "6px 9px", borderRadius: 8,
                  border: `1.5px solid ${value ? G.green : "#dc2626"}`,
                  background: value ? "#f0fdf4" : "#fef2f2",
                  color: value ? G.green : "#991b1b",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  maxWidth: 200,
                }}>
                <option value="">— Pick a team —</option>
                {opts.map(t => (
                  <option key={t} value={t}>
                    {t}{t === requested && !pending ? " (requested)" : ""}
                  </option>
                ))}
              </select>
            );
          };

          return (
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,marginTop:4}}>
                <div style={{flex:1,height:1,background:G.border}}/>
                <div style={{fontSize:10,fontWeight:900,letterSpacing:1.5,color:"#dc2626",
                  textTransform:"uppercase",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{background:"#ef4444",color:"#fff",borderRadius:99,fontSize:9,
                    fontWeight:900,padding:"1px 6px"}}>{pending.length}</span>
                  Join Requests Pending
                </div>
                <div style={{flex:1,height:1,background:G.border}}/>
              </div>

              {cards.map(req => {
                const linkedChildren = childByParentId.get(req.id) || [];
                const isPair = linkedChildren.length > 0;
                const verified = !!req.emailVerified;
                const parentTeamReady = !!finalTeam(req);
                const allChildrenTeamsReady = linkedChildren.every(c => !!finalTeam(c));
                const canApprove = parentTeamReady && allChildrenTeamsReady;
                const missingFor = !parentTeamReady
                  ? req.playerName
                  : linkedChildren.find(c => !finalTeam(c))?.playerName;
                const isParentReq = isPair || (req.memberType === "parent");
                const isChildReq = req.forChild && !isPair;

                return (
                  <div key={req.id} style={{background:"#fff7ed",border:"1.5px solid #fed7aa",
                    borderRadius:12,padding:"12px 14px",marginBottom:10}}>

                    {/* Parent / single row */}
                    <div style={{display:"flex",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                      <div style={{flex:1, minWidth: 140}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:3}}>
                          <span style={{fontWeight:800,fontSize:14,color:G.text}}>
                            {isPair || isParentReq ? "👨‍👧 " : (isChildReq ? "👶 " : "🙋 ")}{req.playerName}
                          </span>
                          <span style={{fontSize:10,fontWeight:700,
                            padding:"1px 7px",borderRadius:20,
                            background: verified ? "#dcfce7" : "#fee2e2",
                            color: verified ? "#166534" : "#991b1b",
                            border: `0.5px solid ${verified ? "#86efac" : "#fca5a5"}`}}>
                            {verified ? "✓ email verified" : "✗ not verified"}
                          </span>
                          {isPair && (
                            <span style={{fontSize:10,fontWeight:700,
                              padding:"1px 7px",borderRadius:20,
                              background:"#dbeafe",color:"#1e40af",
                              border:"0.5px solid #93c5fd"}}>
                              Parent + {linkedChildren.length} child{linkedChildren.length > 1 ? "ren" : ""}
                            </span>
                          )}
                          {req.pendingTeam && (
                            <span style={{fontSize:10,fontWeight:700,
                              padding:"1px 7px",borderRadius:20,
                              background:"#fef3c7",color:"#92400e",
                              border:"0.5px solid #fde68a"}}>
                              ❓ needs team
                            </span>
                          )}
                        </div>
                        <div style={{fontSize:11,color:G.muted,lineHeight:1.6}}>
                          {req.forChild && req.parentName && `Parent: ${req.parentName}`}
                          {req.forChild && req.parentName && (req.email || req.contact) && " · "}
                          {req.email && `${req.email}`}
                          {req.email && req.contact && " · "}
                          {req.contact && `${req.contact}`}
                          <br/>
                          <span style={{color:"#9ca3af",fontSize:10}}>
                            {new Date(req.submittedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                          </span>
                        </div>
                      </div>
                      <TeamPicker req={req} isChild={!!req.forChild && !isPair}/>
                    </div>

                    {/* Linked child rows — each with its own team picker */}
                    {linkedChildren.length > 0 && (
                      <div style={{marginTop: 10, paddingLeft: 12, borderLeft: "2px solid #fed7aa"}}>
                        {linkedChildren.map(c => (
                          <div key={c.id} style={{
                            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                            marginBottom: 6,
                          }}>
                            <div style={{flex: 1, minWidth: 120}}>
                              <div style={{fontSize: 13, fontWeight: 700, color: G.text,
                                display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap"}}>
                                👶 {c.playerName}
                                {c.matchedMemberId && (
                                  <span style={{fontSize: 9, fontWeight: 700,
                                    background: "#e0e7ff", color: "#3730a3",
                                    padding: "1px 6px", borderRadius: 6}}>
                                    existing record
                                  </span>
                                )}
                                {c.pendingTeam && (
                                  <span style={{fontSize: 9, fontWeight: 700,
                                    background: "#fef3c7", color: "#92400e",
                                    padding: "1px 6px", borderRadius: 6}}>
                                    ❓ needs team
                                  </span>
                                )}
                              </div>
                            </div>
                            <TeamPicker req={c} isChild={true}/>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{display:"flex",gap:8,marginTop:12}}>
                      <button onClick={()=>{
                        if (!canApprove) {
                          showToast(`Pick a team for ${missingFor} first`);
                          return;
                        }
                        if (!verified) {
                          if (!window.confirm(`${req.playerName} hasn't verified their email. Approve anyway?`)) return;
                        }
                        approveRequest(req);
                      }}
                        disabled={!canApprove}
                        title={!canApprove ? `Pick a team for ${missingFor} first` : (isPair ? "Approve pair" : "Approve & add")}
                        style={{flex:1,
                          background: canApprove ? "#16a34a" : "#cbd5e1",
                          color: canApprove ? "#fff" : "#64748b",
                          border:"none",
                          borderRadius:9,padding:"9px 0",fontFamily:"inherit",
                          fontWeight:800,fontSize:12,
                          cursor: canApprove ? "pointer" : "not-allowed"}}>
                        ✓ Approve{isPair ? " pair" : " & Add"}
                      </button>
                      <button onClick={()=>declineRequest(req)}
                        style={{background:"#fee2e2",color:"#dc2626",border:"none",
                          borderRadius:9,padding:"9px 14px",fontFamily:"inherit",
                          fontWeight:800,fontSize:12,cursor:"pointer"}}>
                        ✗ Decline{isPair ? " pair" : ""}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}
        </>}
        </>)}

        {/* ── Add Member section ──────────────────────────────── */}
        {sectionInTab("addmember") && can(userRole,"addMember")&&<>
        <div id="sec-add-member"/>
        <button onClick={()=>toggleAdminSec("addmember")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.addmember?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>➕ Add New Member</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.addmember?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.addmember&&<>
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,
            padding:"10px 14px",marginBottom:10,fontSize:12,color:"#1e40af",lineHeight:1.5}}>
            💡 New members can also self-register via <b>"I'm new to the club"</b> on the login screen. Use the form below for admin-initiated additions only.
          </div>
          <form onSubmit={addMember} style={{background:G.white,borderRadius:12,
            border:`1.5px solid ${G.border}`,padding:14,marginBottom:20,
            display:"flex",flexDirection:"column",gap:10}}>
            
            {/* Member Type Toggle — now 3 options */}
            <div>
              <label style={{fontWeight:700,fontSize:12,color:G.mid,marginBottom:6,display:"block"}}>
                Member Type
              </label>
              <div style={{display:"flex",gap:6}}>
                <button type="button" onClick={()=>{setNewMemberType("player");setNewLinkParent("");}}
                  style={{flex:1,padding:"9px 6px",borderRadius:8,border:"none",
                    background:newMemberType==="player"?"#dcfce7":"#f1f5f9",
                    color:newMemberType==="player"?"#166534":"#64748b",
                    fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  🏏 Player
                </button>
                <button type="button" onClick={()=>{setNewMemberType("parent");setNewLinkParent("");}}
                  style={{flex:1,padding:"9px 6px",borderRadius:8,border:"none",
                    background:newMemberType==="parent"?"#fef9c3":"#f1f5f9",
                    color:newMemberType==="parent"?"#854d0e":"#64748b",
                    fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  👨‍👧 Parent
                </button>
                <button type="button" onClick={()=>setNewMemberType("child")}
                  style={{flex:1,padding:"9px 6px",borderRadius:8,border:"none",
                    background:newMemberType==="child"?"#dbeafe":"#f1f5f9",
                    color:newMemberType==="child"?"#1e40af":"#64748b",
                    fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  👶 Child
                </button>
              </div>
              {/* Contextual hint per type */}
              <div style={{fontSize:11,color:G.muted,marginTop:5,lineHeight:1.5}}>
                {newMemberType==="player"&&"A playing member. Assign to a team below."}
                {newMemberType==="parent"&&"A non-playing parent/guardian account. No team needed."}
                {newMemberType==="child"&&"A junior player. Link to their parent account if it already exists."}
              </div>
            </div>
            
            <FFld G={G} label="Full Name">
              <input style={iSt()} placeholder={newMemberType==="parent"?"e.g. Priya Sharma (parent)":"e.g. Arjun Sharma"}
                value={newName} onChange={e=>setNewName(e.target.value)} required/>
            </FFld>

            {/* Team only shown for players and children — parents have no team */}
            {newMemberType!=="parent"&&(
              <FFld G={G} label="Group / Team">
                <select style={iSt()} value={newTeam} onChange={e=>setNewTeam(e.target.value)}>
                  {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </FFld>
            )}
            
            {/* Parent Selector — only for children, with improved filter and empty state */}
            {newMemberType==="child"&&(
              <FFld G={G} label="Link to Parent Account">
                {(()=>{
                  const parentOptions = members.filter(m =>
                    m.memberType==="parent" ||
                    (!((m.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder"))) && m.memberType!=="child")
                  ).sort((a,b)=>a.name.localeCompare(b.name));
                  return parentOptions.length===0 ? (
                    <div style={{fontSize:12,color:"#b45309",background:"#fef3c7",
                      border:"1px solid #fcd34d",borderRadius:8,padding:"9px 12px",lineHeight:1.5}}>
                      ⚠️ No parent accounts found. Add the parent first using the <b>👨‍👧 Parent</b> type above, then come back to add the child.
                    </div>
                  ) : (
                    <>
                      <select style={iSt()} value={newLinkParent} onChange={e=>setNewLinkParent(e.target.value)}>
                        <option value="">— Not linked yet (can link later) —</option>
                        {parentOptions.map(m=>(
                          <option key={m.id} value={m.id}>
                            {m.name}{(m.children||[]).length>0?` (${(m.children||[]).length} child${(m.children||[]).length>1?"ren":""} already linked)`:""}
                          </option>
                        ))}
                      </select>
                      <div style={{fontSize:11,color:G.muted,marginTop:4}}>
                        Parent will see this child in their "My Family" tab.
                      </div>
                    </>
                  );
                })()}
              </FFld>
            )}
            
            <FFld G={G} label="Email (optional)">
              <input type="email" style={iSt()} placeholder="their@email.com"
                value={newEmail} onChange={e=>setNewEmail(e.target.value)}/>
            </FFld>
            <FFld G={G} label="Phone (optional)">
              <input type="tel" style={iSt()} placeholder="+45 XX XX XX XX"
                value={newPhone} onChange={e=>setNewPhone(e.target.value)}/>
            </FFld>

            {/* Generate invite code checkbox — useful when no email */}
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
              background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"9px 12px"}}>
              <input type="checkbox" checked={newGenCode} onChange={e=>setNewGenCode(e.target.checked)}
                style={{width:16,height:16,cursor:"pointer",accentColor:G.green}}/>
              <span style={{fontSize:12,color:"#166534",lineHeight:1.4}}>
                <b>Generate invite code after adding</b><br/>
                <span style={{fontWeight:400}}>Useful if the member has no email. Code will appear in a popup to share via WhatsApp.</span>
              </span>
            </label>

            <Btn type="submit" bg={G.green} col={G.lime} full>+ Add Member</Btn>
          </form>
        </>}{/* end adminSec.addmember */}
        </>}{/* end can addMember for addmember section */}

        {/* ── Member-related banners (People tab only) ─────────── */}
        {adminTab === "people" && (<>

        {/* Role legend */}
        <div style={{background:G.white,borderRadius:10,border:`1.5px solid ${G.border}`,
          padding:"10px 14px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:900,letterSpacing:1.5,color:G.mid,
            textTransform:"uppercase",marginBottom:8}}>Role Guide</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {ROLES.map(r=><RolePill key={r} role={r}/>)}
          </div>
          <div style={{fontSize:11,color:G.muted,marginTop:8,lineHeight:1.6}}>
            Captain & Vice Captain only available for Senior groups.<br/>
            Youth groups are member-only. Toggle Senior/Youth in Manage Groups below.
          </div>
        </div>

        {/* Invite code guide */}
        {userRole==="superadmin"&&(
          <div style={{background:"#f0f9ff",border:"1.5px solid #bae6fd",borderRadius:10,
            padding:"10px 14px",marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:1.5,color:"#0369a1",
              textTransform:"uppercase",marginBottom:6}}>🎟️ Invite Codes (for members without email)</div>
            <div style={{fontSize:11,color:"#0c4a6e",lineHeight:1.7}}>
              Members with <b>no email on file</b> and <b>no PIN yet</b> will show a <b>Gen Code</b> button.
              Tap it to generate a one-time code (e.g. <b>FCC-7K2P</b>), then share it with the member via WhatsApp.
              They'll enter it on first login to verify their identity before setting a PIN.
              Each code is single-use and expires after use.
            </div>
          </div>
        )}

        {/* ── Fix Names (superadmin only) ───────────────────── */}
        {(namesNeedFix.length>0||namesAmbiguous.length>0)&&(
          <div style={{background:"#fffbeb",border:"1.5px solid #fbbf24",borderRadius:12,
            padding:"14px 16px",marginBottom:16}}>
            <div style={{fontWeight:900,fontSize:13,color:"#92400e",marginBottom:6}}>
              ⚠️ Members with incomplete names detected
            </div>
            {namesNeedFix.length>0&&<>
              <div style={{fontSize:12,color:"#78350f",marginBottom:10}}>
                <b>{namesNeedFix.length}</b> member{namesNeedFix.length>1?"s":""} can be auto-fixed:{" "}
                {namesNeedFix.map(m=>m.name).join(", ")}
              </div>
              <Btn bg="#d97706" col="#fff" onClick={fixAllNames}>
                Fix {namesNeedFix.length} Name{namesNeedFix.length>1?"s":""} Automatically
              </Btn>
            </>}
            {namesAmbiguous.length>0&&(
              <div style={{fontSize:12,color:"#78350f",marginTop:namesNeedFix.length?10:0}}>
                <b>{namesAmbiguous.length}</b> need manual fix (ambiguous — use ✏️ pencil below):{" "}
                {namesAmbiguous.map(m=>m.name).join(", ")}
              </div>
            )}
          </div>
        )}

        {/* ── Seed Emails (superadmin only) ─────────────────── */}
        {emailsToSeed.length > 0 && (
          <div style={{background:"#eff6ff",border:"1.5px solid #93c5fd",borderRadius:12,
            padding:"14px 16px",marginBottom:16}}>
            <div style={{fontWeight:900,fontSize:13,color:"#1e3a5f",marginBottom:6}}>
              📧 Email addresses ready to import
            </div>
            <div style={{fontSize:12,color:"#1e40af",marginBottom:10,lineHeight:1.5}}>
              <b>{emailsToSeed.length}</b> member{emailsToSeed.length>1?"s":""} have email data from the uniform order form that can be imported now.
              This will also enable secure first-time login verification for those members.
            </div>
            <div style={{fontSize:11,color:"#3b82f6",marginBottom:10}}>
              {emailsToSeed.map(m=>m.name).join(", ")}
            </div>
            <Btn bg="#1e3a5f" col="#93c5fd" onClick={seedAllEmails}>
              Import {emailsToSeed.length} Email{emailsToSeed.length>1?"s":""} from Uniform Form
            </Btn>
          </div>
        )}

        {/* ── Division Team Assignments ──────────────────────── */}
        {divisionUpdates.length > 0 && (
          <div style={{background:"#eff6ff",border:"1.5px solid #93c5fd",
            borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontWeight:900,fontSize:13,color:"#1e3a5f",marginBottom:6}}>
              🏏 Division team assignments ready
            </div>
            <div style={{fontSize:12,color:"#1e40af",marginBottom:10,lineHeight:1.5}}>
              <b>{divisionUpdates.length}</b> member{divisionUpdates.length>1?"s":""} have a division squad assignment not yet reflected in the app.
              This will add their division group without removing any existing groups.
            </div>
            <div style={{fontSize:11,background:"#1e3a5f",color:"#93c5fd",
              borderRadius:7,padding:"7px 10px",marginBottom:10,lineHeight:1.8}}>
              {divisionUpdates.map(m=>`${m.name} → ${DIVISION_TEAMS[m.name]}`).join(" · ")}
            </div>
            <Btn bg="#1e3a5f" col="#93c5fd" onClick={applyDivisionTeams}>
              Assign Division Teams to {divisionUpdates.length} Member{divisionUpdates.length>1?"s":""}
            </Btn>
          </div>
        )}

        </>)}{/* end Member-related banners (People tab only) */}

        {/* ── Manage Groups ─────────────────────────────────── */}
        {sectionInTab("groups") && can(userRole,"addMember")&&<>
        <div id="sec-groups"/>
        <button onClick={()=>toggleAdminSec("groups")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.groups?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>🏏 Manage Groups</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.groups?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.groups&&<>
          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
            padding:14,marginBottom:20}}>

            {/* Existing teams */}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              {teams.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:7,
                  background:G.cream,borderRadius:9,padding:"7px 10px"}}>
                  {editingTeam?.id===t.id ? (
                    <input autoFocus style={{...iSt({padding:"5px 9px",fontSize:13}),flex:1}}
                      value={editingTeam.name}
                      onChange={e=>setEditingTeam({...editingTeam,name:e.target.value})}
                      onKeyDown={e=>{
                        if(e.key==="Enter"){e.preventDefault();renameTeam(t.id,editingTeam.name);}
                        if(e.key==="Escape") setEditingTeam(null);
                      }}/>
                  ) : (
                    <span style={{flex:1,fontWeight:800,fontSize:13,color:G.text}}>{t.name}</span>
                  )}
                  {/* Senior / Youth toggle */}
                  <button type="button" onClick={()=>toggleTeamSenior(t.id)}
                    title={t.senior?"Senior (click to set Youth)":"Youth (click to set Senior)"}
                    style={{background:t.senior?"#dcfce7":"#f1f5f9",color:t.senior?"#15803d":"#64748b",
                      border:"none",borderRadius:20,padding:"3px 9px",fontSize:10,fontWeight:800,
                      cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>
                    {t.senior?"Senior":"Youth"}
                  </button>
                  {/* Rename / confirm */}
                  {editingTeam?.id===t.id ? (
                    <button type="button" onClick={()=>renameTeam(t.id,editingTeam.name)}
                      style={{background:G.green,color:G.lime,border:"none",borderRadius:7,
                        padding:"4px 9px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>
                      ✓
                    </button>
                  ) : (
                    <button type="button" onClick={()=>setEditingTeam({id:t.id,name:t.name})}
                      style={{background:"transparent",color:G.muted,border:`1px solid ${G.border}`,
                        borderRadius:7,padding:"4px 8px",fontSize:12,cursor:"pointer",
                        fontFamily:"inherit"}}>
                      ✏️
                    </button>
                  )}
                  {/* Delete */}
                  <button type="button" onClick={()=>deleteTeam(t.id)}
                    style={{background:G.redBg,color:G.red,border:"none",borderRadius:7,
                      padding:"4px 8px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add new team */}
            <form onSubmit={addTeam} style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
              <input style={{...iSt({padding:"8px 11px",fontSize:13}),flex:1,minWidth:120}}
                placeholder="New group name…"
                value={newTName} onChange={e=>setNewTName(e.target.value)}/>
              <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,
                fontWeight:700,color:G.text,cursor:"pointer",flexShrink:0}}>
                <input type="checkbox" checked={newTSenior}
                  onChange={e=>setNewTSenior(e.target.checked)}
                  style={{width:14,height:14}}/>
                Senior
              </label>
              <Btn type="submit" bg={G.green} col={G.lime}>+ Add</Btn>
            </form>
          </div>
        </>}

        </>}

        {/* ── Team Coaches ────────────────────────────────────── */}
        {sectionInTab("coaches") && can(userRole,"addMember")&&<>
        <div id="sec-coaches"/>
        <button onClick={()=>toggleAdminSec("coaches")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.coaches?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>🧢 Coaches &amp; Captains</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.coaches?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.coaches&&<>
          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
            padding:14,marginBottom:16}}>
            {/* Quick link to Captain's XI */}
            <button onClick={()=>setView("captainxi")} style={{
              width:"100%", padding:"12px 16px", marginBottom:14,
              background:"linear-gradient(135deg, #14532d 0%, #166534 100%)",
              border:"none", borderRadius:10, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              fontFamily:"inherit"
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>⚓</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontWeight:800,fontSize:14,color:"#fff"}}>Captain's Playing XI</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Select lineups & share to WhatsApp</div>
                </div>
              </div>
              <span style={{color:"rgba(255,255,255,0.6)",fontSize:16}}>→</span>
            </button>
            
            <div style={{fontSize:12,color:G.muted,marginBottom:12,lineHeight:1.5}}>
              Assign coaches, captains and vice captains per team. Each person's role is team-specific — someone can be captain in Div 3 and VC in T20 Serie 4 at the same time.
            </div>
            {teams.map(t=>{
              const tCoaches = t.coaches||[];
              const search = coachSearch[t.id]||"";
              const teamMembers = members
                .filter(m=>(m.teams||[]).includes(t.name))
                .sort((a,b)=>a.name.localeCompare(b.name));
              const suggestions = search.trim().length>1
                ? members
                    .filter(m=>m.name.toLowerCase().includes(search.toLowerCase())&&!tCoaches.includes(m.name))
                    .sort((a,b)=>a.name.localeCompare(b.name))
                    .slice(0,6)
                : [];
              const tm = getTeamMeta(t.name);
              return (
                <div key={t.id} style={{
                  marginBottom:14,
                  borderRadius:12,
                  border:`1.5px solid ${G.border}`,
                  borderLeft:`4px solid ${tm.bg}`,
                  background:G.white,
                  position:"relative", // Allow dropdown to escape
                }}>
                  {/* Team header */}
                  <div style={{
                    background:`${tm.bg}18`,
                    borderBottom:`1px solid ${G.border}`,
                    padding:"10px 14px",
                    display:"flex",alignItems:"center",gap:8,
                  }}>
                    <span style={{fontWeight:900,fontSize:14,color:tm.bg}}>{t.name}</span>
                    {t.senior
                      ? <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20,
                          background:tm.bg,color:tm.text}}>Senior</span>
                      : <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20,
                          background:"#e5e7eb",color:"#374151"}}>Youth</span>
                    }
                    <span style={{fontSize:11,color:G.muted,marginLeft:"auto"}}>
                      {teamMembers.length} member{teamMembers.length!==1?"s":""}
                    </span>
                  </div>

                  <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:12}}>

                    {/* Coaches */}
                    <div>
                      <div style={{fontSize:10,fontWeight:900,color:G.muted,letterSpacing:1.2,
                        textTransform:"uppercase",marginBottom:6}}>
                        {t.name} Coach{tCoaches.length!==1?"es":""}
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                        {tCoaches.length===0&&(
                          <span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>No coaches assigned</span>
                        )}
                        {tCoaches.map(name=>(
                          <span key={name} style={{display:"inline-flex",alignItems:"center",gap:4,
                            fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,
                            background:"#fef9c3",color:"#92400e",border:"0.5px solid #fde68a"}}>
                            🧢 {name}
                            <button onClick={()=>{
                              saveTeams(teams.map(x=>x.id===t.id
                                ?{...x,coaches:tCoaches.filter(n=>n!==name)}:x));
                              logAction("member",`Removed coach ${name} from ${t.name}`);
                            }} style={{background:"none",border:"none",cursor:"pointer",
                              color:"#92400e",padding:0,fontSize:13,lineHeight:1,fontWeight:900}}>×</button>
                          </span>
                        ))}
                      </div>
                      <div style={{position:"relative"}}>
                        <input
                          placeholder={`Search to add ${t.name} coach…`}
                          value={search}
                          onChange={e=>setCoachSearch(s=>({...s,[t.id]:e.target.value}))}
                          style={iSt({padding:"7px 10px",fontSize:12,width:"100%",boxSizing:"border-box"})}/>
                        {suggestions.length>0&&(
                          <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,
                            background:G.white,border:`1.5px solid ${G.border}`,
                            borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,.1)",marginTop:2}}>
                            {suggestions.map(m=>(
                              <button key={m.id} type="button"
                                onClick={()=>{
                                  saveTeams(teams.map(x=>x.id===t.id
                                    ?{...x,coaches:[...tCoaches,m.name]}:x));
                                  setCoachSearch(s=>({...s,[t.id]:""}));
                                  logAction("member",`Added coach ${m.name} to ${t.name}`);
                                }}
                                style={{width:"100%",textAlign:"left",padding:"8px 12px",
                                  background:"none",border:"none",borderBottom:`1px solid ${G.border}`,
                                  cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
                                  color:G.text}}>
                                {m.name}
                                {getCoachTeams(m.name,teams).length>0&&(
                                  <span style={{fontSize:10,color:G.muted,marginLeft:6}}>
                                    (also coaches: {getCoachTeams(m.name,teams).join(", ")})
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Captain & VC — senior teams only */}
                    {t.senior&&(
                      <div style={{borderTop:`1px solid ${G.border}`,paddingTop:12}}>
                        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                          {/* Captain */}
                          <div style={{flex:1,minWidth:130}}>
                            <div style={{fontSize:10,fontWeight:900,color:G.muted,
                              letterSpacing:1.2,textTransform:"uppercase",marginBottom:5}}>
                              {t.name} Captain
                            </div>
                            {t.captain&&(
                              <div style={{display:"flex",alignItems:"center",gap:6,
                                marginBottom:6,padding:"4px 8px",borderRadius:20,
                                background:"#f0fdf4",border:"1px solid #86efac",
                                width:"fit-content"}}>
                                <span style={{fontSize:11,fontWeight:700,color:"#166534"}}>
                                  👨‍✈️ {t.captain}
                                </span>
                                <button onClick={()=>{
                                    saveTeams(teams.map(x=>x.id===t.id?{...x,captain:null}:x));
                                    logAction("role",`Removed ${t.name} captain`);
                                  }} style={{background:"none",border:"none",cursor:"pointer",
                                    color:"#166534",padding:0,fontSize:13,lineHeight:1}}>×</button>
                              </div>
                            )}
                            <select value={t.captain||""}
                              onChange={e=>{
                                saveTeams(teams.map(x=>x.id===t.id?{...x,captain:e.target.value||null}:x));
                                if(e.target.value) logAction("role",`Set ${t.name} captain: ${e.target.value}`);
                              }}
                              style={iSt({fontSize:12,padding:"5px 8px",borderRadius:7,background:G.white})}>
                              <option value="">{t.captain?"Change captain…":"— Assign captain —"}</option>
                              {teamMembers.map(m=>(
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          {/* VC */}
                          <div style={{flex:1,minWidth:130}}>
                            <div style={{fontSize:10,fontWeight:900,color:G.muted,
                              letterSpacing:1.2,textTransform:"uppercase",marginBottom:5}}>
                              {t.name} Vice Captain
                            </div>
                            {t.vicecaptain&&(
                              <div style={{display:"flex",alignItems:"center",gap:6,
                                marginBottom:6,padding:"4px 8px",borderRadius:20,
                                background:G.cream,border:`1px solid ${G.border}`,
                                width:"fit-content"}}>
                                <span style={{fontSize:11,fontWeight:700,color:G.muted}}>
                                  👷🏻‍♂️ {t.vicecaptain}
                                </span>
                                <button onClick={()=>{
                                    saveTeams(teams.map(x=>x.id===t.id?{...x,vicecaptain:null}:x));
                                    logAction("role",`Removed ${t.name} VC`);
                                  }} style={{background:"none",border:"none",cursor:"pointer",
                                    color:G.muted,padding:0,fontSize:13,lineHeight:1}}>×</button>
                              </div>
                            )}
                            <select value={t.vicecaptain||""}
                              onChange={e=>{
                                saveTeams(teams.map(x=>x.id===t.id?{...x,vicecaptain:e.target.value||null}:x));
                                if(e.target.value) logAction("role",`Set ${t.name} VC: ${e.target.value}`);
                              }}
                              style={iSt({fontSize:12,padding:"5px 8px",borderRadius:7,background:G.white})}>
                              <option value="">{t.vicecaptain?"Change VC…":"— Assign VC —"}</option>
                              {teamMembers.map(m=>(
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>}

        </>}

        {/* ── Parent duty config (super-admin only) ────────────── */}
        {sectionInTab("parentduty") && userRole === "superadmin" && <>
        <div id="sec-parentduty"/>
        <button onClick={()=>toggleAdminSec("parentduty")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.parentduty?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text,display:"flex",alignItems:"center",gap:8}}>
            ⚙️ Parent duty config
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#791F1F",
              background: "#FCEBEB", padding: "2px 6px", borderRadius: 6
            }}>SUPER ADMIN</span>
          </span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.parentduty?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.parentduty && (() => {
          const youthTeams = ["U11", "U13", "U15", "U15 Girls", "U16", "U18"];
          const configs = youthTeams.reduce((acc, t) => {
            acc[t] = getEffectiveConfig(t, parentDutyConfig);
            return acc;
          }, {});
          const patchTeamConfig = (team, patch) => {
            const current = configs[team];
            const updated = {
              ...parentDutyConfig,
              [team]: { ...current, ...patch }
            };
            saveParentDutyConfig(updated);
          };
          const editingCfg = dutyEditTeam ? configs[dutyEditTeam] : null;

          return (
            <div style={{
              background: G.white, borderRadius: 14, border: `1.5px solid ${G.border}`,
              padding: "16px 18px", marginBottom: 16
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 14 }}>
                {youthTeams.map(team => {
                  const cfg = configs[team];
                  const isEditing = dutyEditTeam === team;
                  const enabled = cfg.enabled;
                  const summary = enabled
                    ? `${cfg.trainingSlots > 0 ? "Training + " : ""}match days · ${cfg.minDuties} min`
                    : "Off";

                  return (
                    <div key={team} style={{
                      padding: "10px 0",
                      borderBottom: `0.5px solid ${G.border}`,
                      background: isEditing ? "#F8FAFC" : "transparent",
                      margin: isEditing ? "0 -18px" : "0",
                      paddingLeft: isEditing ? 18 : 0,
                      paddingRight: isEditing ? 18 : 0,
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: 8
                      }}>
                        <button
                          onClick={() => setDutyEditTeam(isEditing ? null : team)}
                          style={{
                            flex: 1, textAlign: "left",
                            background: "transparent", border: "none",
                            cursor: "pointer", fontFamily: "inherit", padding: 0
                          }}>
                          <div style={{
                            fontSize: 14, fontWeight: 700,
                            color: isEditing ? "#0C447C" : G.text,
                            display: "flex", alignItems: "center", gap: 8
                          }}>
                            {team}
                            {isEditing && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, color: "#0C447C",
                                background: "#E6F1FB", padding: "2px 6px", borderRadius: 6
                              }}>editing</span>
                            )}
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: enabled ? "#0F6E56" : G.muted,
                            marginTop: 2
                          }}>
                            {summary}
                          </div>
                        </button>
                        <button
                          onClick={() => patchTeamConfig(team, { enabled: !enabled })}
                          style={{
                            width: 38, height: 22, borderRadius: 11,
                            background: enabled ? "#1D9E75" : "#D3D1C7",
                            border: "none", cursor: "pointer",
                            position: "relative", padding: 0, flexShrink: 0
                          }}>
                          <span style={{
                            position: "absolute",
                            top: 2,
                            left: enabled ? 18 : 2,
                            width: 18, height: 18, borderRadius: "50%",
                            background: "#fff", transition: "left .15s"
                          }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {dutyEditTeam && editingCfg && (
                <div style={{
                  background: "#F8FAFC", borderRadius: 10,
                  padding: "14px 14px", border: "1px solid " + G.border
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase", color: G.muted, marginBottom: 12
                  }}>
                    {dutyEditTeam} settings
                  </div>

                  <ConfigRow
                    label="Training session duty"
                    sublabel="Parent present at practice"
                    control={
                      <Toggle
                        on={editingCfg.trainingSlots > 0}
                        onChange={(on) => patchTeamConfig(dutyEditTeam, {
                          trainingSlots: on ? 1 : 0
                        })}
                      />
                    }
                  />

                  <ConfigRow
                    label="Match day volunteers"
                    sublabel="Slots per match"
                    control={
                      <Stepper
                        value={editingCfg.matchSlots}
                        min={0}
                        max={4}
                        onChange={(v) => patchTeamConfig(dutyEditTeam, { matchSlots: v })}
                      />
                    }
                  />

                  <ConfigRow
                    label="Minimum duties per parent"
                    sublabel="Across the season"
                    control={
                      <Stepper
                        value={editingCfg.minDuties}
                        min={1}
                        max={10}
                        onChange={(v) => patchTeamConfig(dutyEditTeam, { minDuties: v })}
                      />
                    }
                  />

                  <div style={{ marginTop: 14 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 1,
                      textTransform: "uppercase", color: G.muted, marginBottom: 8
                    }}>
                      Match day roles · tap to toggle
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {Object.entries(STANDARD_ROLES).map(([id, role]) => {
                        const isOn = (editingCfg.standardRoles || []).includes(id);
                        return (
                          <button key={id}
                            onClick={() => {
                              const list = editingCfg.standardRoles || [];
                              const next = isOn ? list.filter(r => r !== id) : [...list, id];
                              patchTeamConfig(dutyEditTeam, { standardRoles: next });
                            }}
                            style={{
                              fontSize: 11, fontWeight: 700,
                              padding: "5px 10px", borderRadius: 12,
                              border: `0.5px solid ${isOn ? "#85B7EB" : G.border}`,
                              background: isOn ? "#E6F1FB" : G.white,
                              color: isOn ? "#0C447C" : G.muted,
                              cursor: "pointer", fontFamily: "inherit"
                            }}>
                            {role.label}
                          </button>
                        );
                      })}
                      {(editingCfg.customRoles || []).map(r => (
                        <span key={r.id} style={{
                          fontSize: 11, fontWeight: 700,
                          padding: "5px 10px", borderRadius: 12,
                          border: "0.5px solid #5DCAA5",
                          background: "#E1F5EE", color: "#085041",
                          display: "inline-flex", alignItems: "center", gap: 4
                        }}>
                          🔧 {r.label}
                          <button
                            onClick={() => {
                              if (!confirm(`Remove "${r.label}" from ${dutyEditTeam} roles?\n\nExisting assignments keep their label.`)) return;
                              patchTeamConfig(dutyEditTeam, {
                                customRoles: editingCfg.customRoles.filter(x => x.id !== r.id)
                              });
                            }}
                            style={{
                              background: "transparent", border: "none",
                              color: "#085041", cursor: "pointer",
                              fontFamily: "inherit", fontSize: 13,
                              padding: 0, opacity: 0.6
                            }}>×</button>
                        </span>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <input
                        type="text"
                        value={newCustomRole}
                        placeholder="Add custom role (e.g. Tea & snacks)"
                        onChange={(e) => setNewCustomRole(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newCustomRole.trim()) {
                            const label = newCustomRole.trim();
                            const id = slugifyRoleId(label);
                            const existing = editingCfg.customRoles || [];
                            if (existing.some(r => r.id === id)) {
                              showToast("That role already exists");
                              return;
                            }
                            patchTeamConfig(dutyEditTeam, {
                              customRoles: [...existing, { id, label, icon: "tools" }]
                            });
                            setNewCustomRole("");
                          }
                        }}
                        style={{
                          flex: 1, fontSize: 12, padding: "8px 10px",
                          border: "0.5px solid " + G.border, borderRadius: 8,
                          fontFamily: "inherit", background: G.white
                        }}
                      />
                      <button
                        disabled={!newCustomRole.trim()}
                        onClick={() => {
                          const label = newCustomRole.trim();
                          if (!label) return;
                          const id = slugifyRoleId(label);
                          const existing = editingCfg.customRoles || [];
                          if (existing.some(r => r.id === id)) {
                            showToast("That role already exists");
                            return;
                          }
                          patchTeamConfig(dutyEditTeam, {
                            customRoles: [...existing, { id, label, icon: "tools" }]
                          });
                          setNewCustomRole("");
                        }}
                        style={{
                          fontSize: 12, padding: "8px 14px", borderRadius: 8,
                          border: "0.5px solid #85B7EB",
                          background: newCustomRole.trim() ? "#E6F1FB" : G.border,
                          color: "#0C447C", fontWeight: 700,
                          cursor: newCustomRole.trim() ? "pointer" : "not-allowed",
                          fontFamily: "inherit"
                        }}>
                        + Add
                      </button>
                    </div>
                    <div style={{
                      fontSize: 10, color: G.muted, fontStyle: "italic", marginTop: 6
                    }}>
                      💡 Custom roles in teal · Standard roles in blue
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!confirm(`Reset ${dutyEditTeam} to default config?`)) return;
                      const def = DEFAULT_DUTY_CONFIG[dutyEditTeam] || DEFAULT_TEAM_CONFIG;
                      const updated = { ...parentDutyConfig, [dutyEditTeam]: { ...def } };
                      saveParentDutyConfig(updated);
                    }}
                    style={{
                      width: "100%", marginTop: 14,
                      background: "transparent",
                      border: `0.5px solid ${G.border}`, borderRadius: 8,
                      padding: "8px", fontSize: 11, fontWeight: 700,
                      color: G.muted, cursor: "pointer", fontFamily: "inherit"
                    }}>
                    Reset to defaults
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        </>}

        {/* ── Duty roster oversight (admin + coaches) ───────────── */}
        {sectionInTab("dutyoversight") && (can(userRole, "accessMembers") || isCoachMember(currentUser?.name, teams)) && <>
        <div id="sec-dutyoversight"/>
        <button onClick={()=>toggleAdminSec("dutyoversight")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.dutyoversight?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>🙋 Duty roster oversight</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.dutyoversight?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.dutyoversight && (() => {
          const enabledTeams = Object.keys({
            ...DEFAULT_DUTY_CONFIG, ...parentDutyConfig
          }).filter(t => isDutyEnabled(t, parentDutyConfig));

          if (enabledTeams.length === 0) return null;

          const activeTeam = enabledTeams.includes(dutyOversightTeam)
            ? dutyOversightTeam
            : enabledTeams[0];
          const cfg = getEffectiveConfig(activeTeam, parentDutyConfig);
          const today = new Date().toISOString().slice(0, 10);
          const seasonYear = getSeasonYear(today);

          const teamSessions = sessions.filter(s =>
            sessionBelongsToDutyTeam(s, activeTeam) &&
            new Date(s.date).getFullYear() === seasonYear
          );
          const upcomingSessions = teamSessions.filter(s => s.date >= today);
          const uncovered = upcomingSessions.filter(s => {
            const slots = getSlotCount(s, parentDutyConfig);
            return slots > 0 && getSupportParents(s).length < slots;
          }).length;

          const baseRoster = buildTeamParentList(activeTeam, members, sessions, teams, seasonYear);

          const knownNames = new Set(baseRoster.map(p => p.name.toLowerCase().trim()));
          const sessionOnlyMap = new Map();
          teamSessions.forEach(s => {
            getSupportParents(s).forEach(sp => {
              if (sp.unlinked && sp.memberName) {
                const k = sp.memberName.toLowerCase().trim();
                if (knownNames.has(k)) return;
                sessionOnlyMap.set(k, (sessionOnlyMap.get(k) || 0) + 1);
              }
            });
          });
          const sessionOnly = [];
          for (const [nameKey, count] of sessionOnlyMap) {
            let displayName = nameKey;
            for (const s of teamSessions) {
              const sp = getSupportParents(s).find(x => x.memberName?.toLowerCase().trim() === nameKey);
              if (sp) { displayName = sp.memberName; break; }
            }
            sessionOnly.push({
              id: `session-only:${nameKey}`,
              name: displayName,
              count,
              isOrphan: false,
              unlinked: true,
            });
          }
          const fairness = [...baseRoster, ...sessionOnly]
            .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));

          const excludedCoaches = getTeamCoachNames(activeTeam, teams).filter(name => {
            const m = members.find(mm => mm.name === name);
            if (!m) return false;
            const teamChildIds = new Set(
              members.filter(mm => (mm.teams || []).includes(activeTeam)).map(mm => mm.id)
            );
            return (m.children || []).some(cid => teamChildIds.has(cid));
          });

          return (
            <div style={{
              background: G.white, borderRadius: 14, border: `1.5px solid ${G.border}`,
              padding: "16px 18px", marginBottom: 16
            }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: G.muted,
                  letterSpacing: 1, textTransform: "uppercase",
                  display: "block", marginBottom: 6
                }}>
                  Team
                </label>
                <div style={{
                  position: "relative",
                  background: G.white,
                  border: `1.5px solid ${G.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                }}>
                  <select
                    value={activeTeam}
                    onChange={(e) => setDutyOversightTeam(e.target.value)}
                    style={{
                      width: "100%",
                      fontSize: 14, fontWeight: 700, color: G.text,
                      background: "transparent", border: "none",
                      fontFamily: "inherit",
                      appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
                      cursor: "pointer", outline: "none",
                      paddingRight: 24,
                    }}>
                    {enabledTeams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span style={{
                    position: "absolute",
                    right: 14, top: "50%", transform: "translateY(-50%)",
                    fontSize: 12, color: G.muted, pointerEvents: "none",
                  }}>▾</span>
                </div>
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14
              }}>
                <div style={{
                  background: "#F8FAFC", borderRadius: 8, padding: 10, textAlign: "center"
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: G.text }}>
                    {upcomingSessions.length}
                  </div>
                  <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>
                    Sessions left
                  </div>
                </div>
                <div style={{
                  background: uncovered > 0 ? "#FCEBEB" : "#E1F5EE",
                  borderRadius: 8, padding: 10, textAlign: "center"
                }}>
                  <div style={{
                    fontSize: 20, fontWeight: 800,
                    color: uncovered > 0 ? "#791F1F" : "#085041"
                  }}>
                    {uncovered}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: uncovered > 0 ? "#791F1F" : "#085041",
                    marginTop: 2
                  }}>
                    Uncovered
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                textTransform: "uppercase", color: G.muted, marginBottom: 8
              }}>
                Fairness · {fairness.length} on roster · min {cfg.minDuties} each
                {excludedCoaches.length > 0 && (
                  <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                    {" "}· {excludedCoaches.length} coach{excludedCoaches.length > 1 ? "es" : ""} excluded
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {fairness.map(p => {
                  const isZero = p.count === 0;
                  const minHit = p.count >= cfg.minDuties;
                  const pct = Math.min(100, Math.round((p.count / cfg.minDuties) * 100));
                  const barColor = minHit ? "#1D9E75" : isZero ? "#A32D2D" : "#378ADD";
                  return (
                    <div key={p.id} style={{
                      display: "grid",
                      gridTemplateColumns: "30px 1fr auto",
                      gap: 10, alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `0.5px solid ${G.border}`
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: isZero ? "#F7C1C1" : minHit ? "#9FE1CB" : "#B5D4F4",
                        color: isZero ? "#791F1F" : minHit ? "#085041" : "#0C447C",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 900
                      }}>
                        {p.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: G.text,
                          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap"
                        }}>
                          {p.name}
                          {p.isOrphan && (
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              background: "#FAEEDA", color: "#854F0B",
                              padding: "1px 6px", borderRadius: 6
                            }}>
                              {p.hasNamedParent ? `parent of ${p.kidName.split(" ")[0]}` : "no parent in app"}
                            </span>
                          )}
                          {p.unlinked && !p.isOrphan && (
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              background: "#F1EFE8", color: "#5F5E5A",
                              padding: "1px 6px", borderRadius: 6
                            }}>not in app</span>
                          )}
                          {p.isOrphan && !p.hasNamedParent && can(userRole, "accessMembers") && (
                            <button
                              onClick={() => {
                                const entered = window.prompt(`What's ${p.kidName}'s parent's name?`);
                                if (!entered || !entered.trim()) return;
                                const parentName = entered.trim();
                                const updMembers = members.map(m =>
                                  m.id === p.kidId ? { ...m, parentName } : m
                                );
                                saveMembers(updMembers);
                                logAction("members", `Parent name set for ${p.kidName}: "${parentName}" (by ${currentUser?.name})`);
                                showToast(`${parentName} added`);
                              }}
                              style={{
                                fontSize: 9, fontWeight: 800,
                                background: "#9FE1CB", color: "#085041",
                                border: "0.5px solid #5DCAA5",
                                padding: "2px 8px", borderRadius: 6,
                                cursor: "pointer", fontFamily: "inherit"
                              }}>
                              + Name parent
                            </button>
                          )}
                        </div>
                        <div style={{
                          height: 5, background: "#F1EFE8", borderRadius: 3,
                          marginTop: 4, overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%", width: `${pct}%`, background: barColor
                          }} />
                        </div>
                        {isZero && (
                          <div style={{ fontSize: 10, color: "#A32D2D", marginTop: 3 }}>
                            Needs a turn
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 800,
                        background: isZero ? "#FCEBEB" : minHit ? "#E1F5EE" : "#E6F1FB",
                        color: isZero ? "#791F1F" : minHit ? "#085041" : "#0C447C",
                        padding: "2px 8px", borderRadius: 10
                      }}>
                        ×{p.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Assign Duties (admin write surface) ─────────────── */}
        {adminSec.dutyoversight && (() => {
          const enabledTeams = Object.keys({
            ...DEFAULT_DUTY_CONFIG, ...parentDutyConfig
          }).filter(t => isDutyEnabled(t, parentDutyConfig));
          if (enabledTeams.length === 0) return null;

          const today = new Date().toISOString().slice(0, 10);
          const lookaheadDate = new Date();
          lookaheadDate.setDate(lookaheadDate.getDate() + 84); // 12 weeks
          const lookaheadStr = lookaheadDate.toISOString().slice(0, 10);

          const activeTeam = assignDutyTeam;

          let upcomingTraining = [];
          let upcomingMatches = [];
          if (activeTeam) {
            const teamUpcoming = sessions
              .filter(s => sessionBelongsToDutyTeam(s, activeTeam))
              .filter(s => s.date >= today && s.date <= lookaheadStr)
              .filter(s => getSlotCount(s, parentDutyConfig) > 0)
              .sort((a, b) => a.date.localeCompare(b.date) || (a.from || "").localeCompare(b.from || ""));
            upcomingTraining = teamUpcoming.filter(s => !isMatchSession(s));
            upcomingMatches = teamUpcoming.filter(s => isMatchSession(s));
            // One-shot diagnostic: confirms the calendar isn't empty for the picked team.
            if (typeof window !== "undefined") {
              const key = `__assignDutyDiag_${activeTeam}`;
              if (!window[key]) {
                console.log(
                  `[assign-duty] team=${activeTeam} sessions in next 12w: training=${upcomingTraining.length} match=${upcomingMatches.length}`
                );
                window[key] = true;
              }
            }
          }

          const renderChip = (s, roleId, label, icon) => {
            const filled = getSupportParents(s);
            const claimed = filled.find(sp => sp.role === roleId);
            if (claimed) {
              return (
                <span
                  key={roleId}
                  title={`Already assigned to ${claimed.memberName}. They need to unclaim before reassignment.`}
                  style={{
                    fontSize: 11, fontWeight: 700,
                    background: "#E1F5EE", color: "#085041",
                    border: "1px solid #9FE1CB",
                    borderRadius: 8, padding: "5px 10px",
                    display: "inline-flex", alignItems: "center", gap: 4,
                    cursor: "not-allowed", fontFamily: "inherit",
                  }}>
                  {icon} {claimed.memberName.split(" ")[0]}
                </span>
              );
            }
            return (
              <button key={roleId} type="button"
                onClick={() => setAssignDutyModal({
                  session: s,
                  sessionTeam: activeTeam,
                  role: roleId,
                  roleLabel: label,
                })}
                style={{
                  fontSize: 11, fontWeight: 700,
                  background: "#FFFFFF", color: G.text,
                  border: `1px dashed ${G.border}`,
                  borderRadius: 8, padding: "5px 10px",
                  cursor: "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                {icon} + {label}
              </button>
            );
          };

          return (
            <div style={{
              background: G.white, borderRadius: 14, border: `1.5px solid ${G.border}`,
              padding: "16px 18px", marginBottom: 16,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 900, letterSpacing: 1.5,
                textTransform: "uppercase", color: G.muted, marginBottom: 10,
              }}>
                Assign duties
              </div>

              {/* Team chip picker */}
              <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12}}>
                {enabledTeams.map(t => {
                  const active = t === activeTeam;
                  return (
                    <button key={t} type="button"
                      onClick={() => setAssignDutyTeam(active ? null : t)}
                      style={{
                        padding: "6px 12px", borderRadius: 99,
                        fontSize: 12, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                        border: active ? `1.5px solid ${G.green}` : `1px solid ${G.border}`,
                        background: active ? `${G.green}14` : G.white,
                        color: active ? G.green : G.text,
                      }}>
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Empty state — no team picked */}
              {!activeTeam && (
                <div style={{
                  padding: "16px 14px", textAlign: "center",
                  color: G.muted, fontSize: 13, fontStyle: "italic",
                  border: `1px dashed ${G.border}`, borderRadius: 10,
                }}>
                  Pick a team above to see the upcoming roster and assign parents.
                </div>
              )}

              {/* Calendar */}
              {activeTeam && upcomingTraining.length === 0 && upcomingMatches.length === 0 && (
                <div style={{
                  padding: "16px 14px", textAlign: "center",
                  color: G.muted, fontSize: 13, fontStyle: "italic",
                  border: `1px dashed ${G.border}`, borderRadius: 10,
                }}>
                  No upcoming sessions for {activeTeam} in the next 12 weeks.
                </div>
              )}

              {activeTeam && upcomingTraining.length > 0 && (
                <>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase", color: G.muted,
                    marginBottom: 6, marginTop: 4,
                  }}>
                    🎯 Upcoming training
                  </div>
                  <div style={{display: "flex", flexDirection: "column", gap: 6, marginBottom: 14}}>
                    {upcomingTraining.map(s => {
                      const slots = getSlotCount(s, parentDutyConfig);
                      const filled = getSupportParents(s);
                      const dateLabel = new Date(s.date).toLocaleDateString("en-GB", {
                        weekday: "short", day: "numeric", month: "short"
                      });
                      // Training: render one chip per support slot
                      const chips = [];
                      for (let i = 0; i < slots; i++) {
                        const sp = filled[i];
                        const key = sp ? `claimed-${i}` : `empty-${i}`;
                        if (sp) {
                          chips.push(
                            <span key={key}
                              title={`Already assigned to ${sp.memberName}. They need to unclaim before reassignment.`}
                              style={{
                                fontSize: 11, fontWeight: 700,
                                background: "#E1F5EE", color: "#085041",
                                border: "1px solid #9FE1CB",
                                borderRadius: 8, padding: "5px 10px",
                                display: "inline-flex", alignItems: "center", gap: 4,
                                cursor: "not-allowed", fontFamily: "inherit",
                              }}>
                              {resolveRoleIcon("support")} {sp.memberName.split(" ")[0]}
                            </span>
                          );
                        } else {
                          chips.push(
                            <button key={key} type="button"
                              onClick={() => setAssignDutyModal({
                                session: s,
                                sessionTeam: activeTeam,
                                role: "support",
                                roleLabel: TRAINING_ROLE.label,
                              })}
                              style={{
                                fontSize: 11, fontWeight: 700,
                                background: "#FFFFFF", color: G.text,
                                border: `1px dashed ${G.border}`,
                                borderRadius: 8, padding: "5px 10px",
                                cursor: "pointer", fontFamily: "inherit",
                                display: "inline-flex", alignItems: "center", gap: 4,
                              }}>
                              {resolveRoleIcon("support")} + {TRAINING_ROLE.short}
                            </button>
                          );
                        }
                      }
                      return (
                        <div key={s.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          background: G.cream, border: `1px solid ${G.border}`,
                          borderRadius: 8, padding: "8px 10px",
                        }}>
                          <div style={{fontSize: 16, flexShrink: 0}}>🎯</div>
                          <div style={{flex: 1, minWidth: 0}}>
                            <div style={{fontSize: 12, fontWeight: 700, color: G.text}}>
                              {dateLabel}{s.from ? ` · ${s.from}` : ""}{s.label ? ` · ${s.label}` : ""}
                            </div>
                            <div style={{fontSize: 10, color: G.muted, marginTop: 2}}>
                              {filled.length}/{slots} filled
                            </div>
                          </div>
                          <div style={{display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end"}}>
                            {chips}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {activeTeam && upcomingMatches.length > 0 && (
                <>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase", color: G.muted, marginBottom: 6,
                  }}>
                    🏏 Match days
                  </div>
                  <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                    {upcomingMatches.map(s => {
                      const slots = getSlotCount(s, parentDutyConfig);
                      const filled = getSupportParents(s);
                      const matchRoles = getMatchRoles(s.restrictedTo || activeTeam, parentDutyConfig);
                      const dateLabel = new Date(s.date).toLocaleDateString("en-GB", {
                        weekday: "short", day: "numeric", month: "short"
                      });
                      const opp = s.matchOpponent ? ` v ${s.matchOpponent}` : "";
                      const isFull = filled.length >= slots;
                      const sessionLabel = s.label ? ` · ${s.label}` : "";
                      // Render one chip per configured role; mark claimed roles as locked.
                      return (
                        <div key={s.id} style={{
                          background: G.cream, border: `1px solid ${G.border}`,
                          borderLeft: `4px solid ${isFull ? "#5DCAA5" : "#D3D1C7"}`,
                          borderRadius: 8, padding: "10px 12px",
                        }}>
                          <div style={{
                            display: "flex", justifyContent: "space-between",
                            gap: 8, marginBottom: 8, alignItems: "baseline", flexWrap: "wrap",
                          }}>
                            <div>
                              <div style={{fontSize: 13, fontWeight: 800, color: G.text}}>
                                🏏 {dateLabel}{opp}{sessionLabel}
                              </div>
                              {((s.from || s.matchTime) || s.venue) && (
                                <div style={{fontSize: 11, color: G.muted, marginTop: 2}}>
                                  {(s.from || s.matchTime) || ""}{s.venue ? ` · ${s.venue}` : ""}
                                </div>
                              )}
                            </div>
                            <span style={{
                              fontSize: 10, fontWeight: 800,
                              background: isFull ? "#E1F5EE" : "#FAEEDA",
                              color: isFull ? "#085041" : "#854F0B",
                              padding: "2px 8px", borderRadius: 10,
                            }}>
                              {filled.length}/{slots} covered
                            </span>
                          </div>
                          <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                            {matchRoles.map(r =>
                              renderChip(s, r.id, r.label, resolveRoleIcon(r.id))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}
        </>}

        {/* ── Block Nets Sessions ────────────────────────────── */}
        {sectionInTab("blocknets") && can(userRole,"addMember")&&<>
        <div id="sec-blocknets"/>
        <button onClick={()=>toggleAdminSec("blocknets")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.blocknets?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>🚫 Block Nets Sessions</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.blocknets?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.blocknets&&<>
          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
            padding:14,marginBottom:8}}>
            <div style={{fontSize:12,color:G.muted,marginBottom:10,lineHeight:1.5}}>
              Mark dates when the nets are unavailable (match days, events). Members will see these on the schedule.
            </div>
            {/* Import / sync 2026 fixtures */}
            {(()=>{
              // A block "looks like a fixture" if its label contains common fixture patterns
              const fixturePatterns = /^(Div [234]|T20 S|OB —|Women'|U1[3568]|Serie [45]|2\. Div|3\. Div|4\. Div|U 1[356]|Kvinder|Oldboys)/i;
              const existingFixtureBlocks = blockCals.filter(b=>fixturePatterns.test(b.label));
              const alreadyClean = MATCH_FIXTURES.every(f=>
                blockCals.some(b=>b.date===f.date&&b.label===f.label));

              function syncFixtures() {
                // Remove ALL existing fixture-style blocks, then add the current MATCH_FIXTURES
                const nonFixtureBlocks = blockCals.filter(b=>!fixturePatterns.test(b.label));
                const fresh = MATCH_FIXTURES.map(f=>({...f, id:uid()}));
                const updated = [...nonFixtureBlocks, ...fresh];
                saveBlockCals(updated);
                logAction("blockcal",`Synced 2026 home match fixtures: ${fresh.length} blocks (removed ${existingFixtureBlocks.length} old)`);
                showToast(`✓ ${fresh.length} match fixtures synced — ${existingFixtureBlocks.length} old blocks removed`);
              }

              if(alreadyClean) return (
                <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",borderRadius:8,
                  padding:"9px 12px",marginBottom:12,display:"flex",
                  alignItems:"center",justifyContent:"space-between",gap:10}}>
                  <div style={{fontSize:12,color:"#166534",fontWeight:700}}>
                    ✅ All {MATCH_FIXTURES.length} home fixtures synced
                  </div>
                  <button onClick={syncFixtures}
                    style={{background:"none",border:"1px solid #bbf7d0",borderRadius:8,
                      padding:"4px 10px",fontSize:11,fontWeight:700,color:"#166534",
                      cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                    🔄 Re-sync
                  </button>
                </div>
              );

              return (
                <div style={{background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:8,
                  padding:"10px 12px",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:12,color:"#1e40af"}}>
                        🏏 Sync 2026 Home Fixtures
                      </div>
                      <div style={{fontSize:11,color:"#3b82f6",marginTop:2}}>
                        {MATCH_FIXTURES.length} fixtures in schedule
                        {existingFixtureBlocks.length>0&&` · ${existingFixtureBlocks.length} old blocks will be replaced`}
                      </div>
                    </div>
                    <button onClick={syncFixtures}
                      style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:8,
                        padding:"7px 14px",fontSize:12,fontWeight:800,cursor:"pointer",
                        fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}>
                      Sync All
                    </button>
                  </div>
                  {existingFixtureBlocks.length>0&&(
                    <div style={{marginTop:8,fontSize:11,color:"#6b7280",
                      background:"#fef9c3",borderRadius:6,padding:"6px 10px",
                      border:"0.5px solid #fde68a"}}>
                      ⚠️ You have {existingFixtureBlocks.length} existing fixture blocks — clicking Sync will replace them all with the updated list ({MATCH_FIXTURES.length} fixtures). Any manually added event blocks will be kept.
                    </div>
                  )}
                </div>
              );
            })()}
            {/* ── Create match sessions from DCF fixtures ─────── */}
            {(() => {
              const unsynced = getUnsyncedFixtures(
                ALL_FIXTURES,
                sessions,
                new Date().toISOString().slice(0, 10)
              );
              const alreadySynced = (sessions || []).filter(s => s.createdBy === "Fixture sync").length;

              const onSync = () => {
                if (unsynced.length === 0) return;
                const teamList = [...new Set(unsynced.map(u => u.team))].sort();
                const confirmed = window.confirm(
                  `Create ${unsynced.length} match session${unsynced.length > 1 ? "s" : ""} ` +
                  `for ${teamList.length} team${teamList.length > 1 ? "s" : ""}?\n\n` +
                  `Teams: ${teamList.join(", ")}\n\n` +
                  `These sessions will appear in:\n` +
                  `• Parent duty roster (match-day sign-ups)\n` +
                  `• Captain's XI selection\n` +
                  `• ScorePro for live scoring\n\n` +
                  `Senior teams (Div 2/3/4, T20, OB) are not included — captains add those themselves.`
                );
                if (!confirmed) return;
                const newSessions = buildSessionsFromUnsynced(unsynced, MATCH_FIXTURES, teams);
                saveSessions([...(sessions || []), ...newSessions]);
                try {
                  logAction("session", `Fixture sync: created ${newSessions.length} match sessions (by ${currentUser?.name || "admin"})`);
                } catch {}
                try {
                  showToast(`✓ ${newSessions.length} match session${newSessions.length > 1 ? "s" : ""} created`);
                } catch {}
              };

              if (unsynced.length === 0) {
                return (
                  <div style={{
                    background: "#f0fdf4",
                    border: "1.5px solid #bbf7d0",
                    borderRadius: 8,
                    padding: "9px 12px",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}>
                    <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>
                      ✅ All youth & coached-team matches synced as sessions
                      {alreadySynced > 0 && (
                        <span style={{ fontWeight: 500, marginLeft: 6 }}>
                          ({alreadySynced} sessions created from fixtures)
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              const teamsCount = new Set(unsynced.map(u => u.team)).size;
              return (
                <div style={{
                  background: "#eff6ff",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 12, color: "#1e40af" }}>
                        📋 Create match sessions
                      </div>
                      <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>
                        {unsynced.length} match{unsynced.length > 1 ? "es" : ""} for {teamsCount} team{teamsCount > 1 ? "s" : ""} —
                        enables parent duty sign-up, captain XI, and scoring
                      </div>
                    </div>
                    <button
                      onClick={onSync}
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}>
                      Sync sessions
                    </button>
                  </div>
                </div>
              );
            })()}
            {/* ── DCF Schedule Upload ──────────────────────────── */}
            <div style={{marginBottom:14,padding:"12px 14px",background:G.cream,
              borderRadius:10,border:`1px solid ${G.border}`}}>
              <div style={{fontWeight:800,fontSize:12,color:G.text,marginBottom:4}}>
                📥 Update from DCF Schedule (Excel)
              </div>
              <div style={{fontSize:11,color:G.muted,marginBottom:10,lineHeight:1.5}}>
                When DCF publishes a new schedule, upload the Excel file here.
                The app will extract all Fredensborg home fixtures and let you review before applying.
              </div>
              <input type="file" accept=".xlsx,.xls"
                onChange={async e=>{
                  setXlsError(null); setXlsParsed(null);
                  const file = e.target.files?.[0]; if(!file) return;
                  try {
                    // Read file as ArrayBuffer then parse with SheetJS loaded dynamically
                    const buf = await file.arrayBuffer();
                    // Use SheetJS via CDN — inject script if not loaded
                    if(!window.XLSX) {
                      await new Promise((res,rej)=>{
                        const s=document.createElement('script');
                        s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                        s.onload=res; s.onerror=rej;
                        document.head.appendChild(s);
                      });
                    }
                    const wb = window.XLSX.read(buf, {type:'array', cellDates:true});
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const rows = window.XLSX.utils.sheet_to_json(sheet, {header:1, defval:''});
                    // Find header row
                    const hIdx = rows.findIndex(r=>String(r[0]).toLowerCase().includes('num')||String(r[3]).toLowerCase().includes('date')||String(r[4]).toLowerCase().includes('date'));
                    const dataRows = hIdx>=0 ? rows.slice(hIdx+1) : rows.slice(1);
                    // Parse: col indices based on known DCF format
                    // 0=num,1=series,2=division,3=match_type,4=date,5=time,6=team1,7=team2,8=ground
                    const fixtures = []; const allMatches = [];
                    dataRows.forEach(r=>{
                      const team1=String(r[6]||'').trim();
                      const team2=String(r[7]||'').trim();
                      const ground=String(r[8]||'').trim();
                      const division=String(r[2]||'').trim();
                      if(!team1&&!team2) return;
                      const isFred = team1.includes('Fredensborg')||team2.includes('Fredensborg');
                      if(!isFred) return;
                      // Parse date
                      let dateStr='';
                      const rawDate = r[4];
                      if(rawDate instanceof Date) {
                        dateStr = rawDate.toISOString().slice(0,10);
                      } else if(rawDate) {
                        const d = new Date(String(rawDate).split('-').reverse().join('-'));
                        if(!isNaN(d)) dateStr = d.toISOString().slice(0,10);
                      }
                      if(!dateStr) return;
                      const isHome = ground.toLowerCase().includes('fredensborg');
                      const opp = team1.includes('Fredensborg') ? team2 : team1;
                      const oppClean = opp.replace(/fredensborg\s*/i,'').trim();
                      // Label: shorten division name
                      const divShort = division
                        .replace('2026 Turnering','').replace('2026 T20','T20')
                        .replace('3. Division Øst - B','Div 3').replace('2. Division','Div 2')
                        .replace('4. Division Øst','Div 4').replace('Kvinderækken','Women\'s')
                        .replace('Oldboys Grp B','OB').trim();
                      const label = `${divShort} — FCC vs ${oppClean}`;
                      // Parse time for start hour
                      let fromH=10;
                      const ts=String(r[5]||'');
                      const tm=ts.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                      if(tm){
                        fromH=parseInt(tm[1]);
                        if(tm[3]&&tm[3].toUpperCase()==='PM'&&fromH<12) fromH+=12;
                      }
                      const from=`${String(fromH).padStart(2,'0')}:00`;
                      const isT20=divShort.includes('T20')||divShort.includes('Serie');
                      const toH=isT20?Math.min(fromH+8,22):Math.min(fromH+9,21);
                      const to=`${String(toH).padStart(2,'0')}:00`;
                      allMatches.push({dateStr,label,isHome,division:divShort,opp:oppClean});
                      if(isHome) fixtures.push({date:dateStr,from,to,label});
                    });
                    setXlsParsed({fixtures, allMatches, fileName:file.name});
                    e.target.value='';
                  } catch(err){
                    setXlsError(`Could not parse file: ${err.message}`);
                    e.target.value='';
                  }
                }}
                style={{fontSize:12,color:G.text,cursor:"pointer",fontFamily:"inherit",
                  marginBottom:xlsParsed||xlsError?8:0}}/>
              {xlsError&&(
                <div style={{fontSize:12,color:G.red,background:G.redBg,
                  borderRadius:8,padding:"8px 10px",marginTop:6}}>
                  ⚠️ {xlsError}
                </div>
              )}
              {xlsParsed&&(()=>{
                const {fixtures,allMatches,fileName} = xlsParsed;
                const homeCount = fixtures.length;
                const awayCount = allMatches.filter(m=>!m.isHome).length;
                // Compare with current blocks
                const fixturePatterns = /^(Div [234]|T20 Series|OB —|Women'|U1[3568]|Serie [45]|2\. Div|3\. Div|4\. Div|U 1[356]|Kvinder|Oldboys)/i;
                const existingFixBlocks = blockCals.filter(b=>fixturePatterns.test(b.label));
                const newDates = new Set(fixtures.map(f=>f.date+f.label));
                const oldDates = new Set(existingFixBlocks.map(b=>b.date+b.label));
                const toAdd = fixtures.filter(f=>!oldDates.has(f.date+f.label));
                const toRemove = existingFixBlocks.filter(b=>!newDates.has(b.date+b.label));
                return (
                  <div style={{background:G.white,border:`1.5px solid ${G.border}`,
                    borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontWeight:800,fontSize:12,color:G.text,marginBottom:6}}>
                      📋 Parsed: {fileName}
                    </div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
                      <span style={{fontSize:11,background:"#f0fdf4",color:"#166534",
                        padding:"3px 9px",borderRadius:20,fontWeight:700}}>
                        🏠 {homeCount} home fixtures
                      </span>
                      <span style={{fontSize:11,background:G.cream,color:G.muted,
                        padding:"3px 9px",borderRadius:20,fontWeight:700}}>
                        ✈️ {awayCount} away
                      </span>
                      {toAdd.length>0&&<span style={{fontSize:11,background:"#eff6ff",
                        color:"#1e40af",padding:"3px 9px",borderRadius:20,fontWeight:700}}>
                        ➕ {toAdd.length} new
                      </span>}
                      {toRemove.length>0&&<span style={{fontSize:11,background:"#fef2f2",
                        color:G.red,padding:"3px 9px",borderRadius:20,fontWeight:700}}>
                        🗑 {toRemove.length} removed
                      </span>}
                    </div>
                    {toAdd.length===0&&toRemove.length===0?(
                      <div style={{fontSize:12,color:"#166534",fontWeight:700}}>
                        ✅ Already up to date — no changes needed
                      </div>
                    ):(
                      <button onClick={()=>{
                        const nonFixtureBlocks = blockCals.filter(b=>!fixturePatterns.test(b.label));
                        const fresh = fixtures.map(f=>({...f,id:uid()}));
                        saveBlockCals([...nonFixtureBlocks,...fresh]);
                        logAction("blockcal",`Updated fixtures from ${fileName}: +${toAdd.length} added, -${toRemove.length} removed, ${homeCount} total`);
                        showToast(`✓ Fixtures updated — ${homeCount} home matches`);
                        setXlsParsed(null);
                      }} style={{background:G.green,color:G.lime,border:"none",
                        borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:800,
                        cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
                        ✓ Apply {homeCount} fixtures to Block Nets
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Existing blocks — show 5, rest behind toggle */}
            {(()=>{
              const upcoming = blockCals
                .filter(b=>isFuture(b.date)||b.date===todayStr())
                .sort((a,b)=>a.date.localeCompare(b.date));
              const visible = showAllBlocks ? upcoming : upcoming.slice(0,5);
              return (<>
                {upcoming.length===0&&(
                  <div style={{fontSize:12,color:G.muted,fontStyle:"italic",marginBottom:8}}>
                    No upcoming blocked dates yet.
                  </div>
                )}
                {visible.map(b=>(
                  <div key={b.id} style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",padding:"8px 10px",background:G.cream,
                    borderRadius:8,marginBottom:6,gap:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:G.text}}>{b.label}</div>
                      <div style={{fontSize:11,color:G.muted}}>{fmtShort(b.date)} · {b.from}–{b.to}</div>
                    </div>
                    <button onClick={()=>{
                        saveBlockCals(blockCals.filter(x=>x.id!==b.id));
                        logAction("blockcal",`Removed block: ${b.date} ${b.from}–${b.to} "${b.label}"`);
                      }}
                      style={{background:"none",border:"none",color:G.red,fontSize:16,
                        cursor:"pointer",padding:"2px 6px",lineHeight:1}}>×</button>
                  </div>
                ))}
                {upcoming.length>5&&(
                  <button onClick={()=>setShowAllBlocks(v=>!v)}
                    style={{background:"none",border:`1px dashed ${G.border}`,borderRadius:8,
                      width:"100%",padding:"7px",fontSize:12,fontWeight:700,color:G.muted,
                      cursor:"pointer",fontFamily:"inherit",marginBottom:6}}>
                    {showAllBlocks
                      ? "▲ Show fewer"
                      : `▼ Show all ${upcoming.length} blocked dates`}
                  </button>
                )}
              </>);
            })()}
            {/* Add new block — prominent button */}
            <div style={{marginTop:8}}>
              {!showBlockForm?(
                <button type="button" onClick={()=>setShowBlockForm(true)}
                  style={{width:"100%",background:G.green,color:G.lime,border:"none",
                    borderRadius:10,padding:"11px",fontSize:13,fontWeight:800,
                    cursor:"pointer",fontFamily:"inherit"}}>
                  🚫 Block a Date When Nets Are Unavailable
                </button>
              ):(
                <div style={{background:G.cream,borderRadius:10,padding:"12px",
                  border:`1.5px solid ${G.border}`}}>
                  <div style={{fontWeight:800,fontSize:13,color:G.text,marginBottom:10}}>
                    🚫 Add a Blocked Date
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <FFld G={G} label="Reason / Event name">
                      <input placeholder="e.g. Div 3 Home Match vs Svanholm"
                        style={iSt({padding:"9px 12px",fontSize:13})}
                        value={bCalLabel} onChange={e=>setBCalLabel(e.target.value)}/>
                    </FFld>
                    <FFld G={G} label="Date">
                      <input type="date" style={iSt({padding:"9px 12px",fontSize:13})}
                        value={bCalDate} onChange={e=>setBCalDate(e.target.value)}/>
                    </FFld>
                    <div style={{display:"flex",gap:8}}>
                      <FFld G={G} label="From" style={{flex:1}}>
                        <input type="time" style={iSt({padding:"9px 12px",fontSize:13})}
                          value={bCalFrom} onChange={e=>setBCalFrom(e.target.value)}/>
                      </FFld>
                      <FFld G={G} label="To" style={{flex:1}}>
                        <input type="time" style={iSt({padding:"9px 12px",fontSize:13})}
                          value={bCalTo} onChange={e=>setBCalTo(e.target.value)}/>
                      </FFld>
                    </div>
                    {/* Clash detection — existing blocks */}
                    {bCalDate&&(()=>{
                      const clash = blockCals.find(b=>b.date===bCalDate&&
                        timesOverlap(bCalFrom,bCalTo,b.from,b.to));
                      return clash ? (
                        <div style={{background:"#fff7ed",border:"1.5px solid #fed7aa",
                          borderRadius:8,padding:"8px 11px",fontSize:12,color:"#92400e"}}>
                          ⚠️ <b>Clash:</b> "{clash.label}" is already blocked on this date
                          ({clash.from}–{clash.to}). Check before saving.
                        </div>
                      ) : null;
                    })()}
                    {/* Clash detection — existing bookings */}
                    {bCalDate&&(()=>{
                      const clashingSessions = sessions.filter(s=>
                        s.date===bCalDate && timesOverlap(bCalFrom,bCalTo,s.from,s.to));
                      if(clashingSessions.length===0) return null;
                      return (
                        <div style={{background:"#fef3c7",border:"1.5px solid #f59e0b",
                          borderRadius:10,padding:"12px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <span style={{fontSize:16}}>⚠️</span>
                            <span style={{fontWeight:700,fontSize:13,color:"#78350f"}}>
                              Timing clashing with nets booking
                            </span>
                          </div>
                          <div style={{fontSize:12,color:"#92400e",marginBottom:10,lineHeight:1.5}}>
                            Detected {clashingSessions.length} nets booking{clashingSessions.length>1?"s":""} for the selected time.
                            Review before blocking.
                          </div>
                          <div style={{background:"#fffbeb",border:"1px solid #fcd34d",
                            borderRadius:8,padding:"10px 12px"}}>
                            <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.5px",
                              color:"#a16207",fontWeight:600,marginBottom:8}}>
                              Clashing booking{clashingSessions.length>1?"s":""}
                            </div>
                            {clashingSessions.slice(0,3).map(s=>{
                              const tm=getTeamMeta(s.restrictedTo||"Unassigned");
                              return (
                                <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,
                                  padding:"8px 10px",background:"#fff",border:"1px solid #e5e7eb",
                                  borderRadius:8,marginBottom:6}}>
                                  <div style={{width:10,height:10,borderRadius:"50%",
                                    background:tm.bg,flexShrink:0}}/>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:12,fontWeight:600,color:"#1f2937"}}>
                                      {s.label||"Session"}
                                    </div>
                                    <div style={{fontSize:10,color:"#6b7280"}}>
                                      {s.from}–{s.to} · Net {s.net==="both"?"1+2":s.net} · {s.players?.length||0} players
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {clashingSessions.length>3&&(
                              <div style={{fontSize:11,color:"#92400e",fontStyle:"italic",marginTop:4}}>
                                +{clashingSessions.length-3} more booking{clashingSessions.length-3>1?"s":""}
                              </div>
                            )}
                          </div>
                          <div style={{fontSize:11,color:"#92400e",marginTop:10,
                            background:"#fef9c3",borderRadius:6,padding:"8px 10px",
                            border:"0.5px solid #fde68a"}}>
                            💡 If you proceed, consider notifying affected members about the change.
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{display:"flex",gap:8}}>
                      <Btn bg={G.green} col={G.lime} full onClick={()=>{
                        if(!bCalDate){showToast("Please pick a date");return;}
                        const lbl = bCalLabel.trim()||"Nets Blocked";
                        saveBlockCals([...blockCals,{
                          id:uid(),date:bCalDate,from:bCalFrom,to:bCalTo,label:lbl}]);
                        logAction("blockcal",`Blocked nets: ${bCalDate} ${bCalFrom}–${bCalTo} "${lbl}"`);
                        setBCalDate("");setBCalFrom("10:00");setBCalTo("14:00");
                        setBCalLabel("");setShowBlockForm(false);
                        showToast("Date blocked ✓");
                      }}>✓ Save Blocked Date</Btn>
                      <Btn bg={G.cream} col={G.text} onClick={()=>setShowBlockForm(false)}>
                        Cancel
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>}

        </>}

        {/* ── Recurring Slots ───────────────────────────────── */}
        {sectionInTab("recurring") && can(userRole,"addMember")&&<>
        <div id="sec-recurring"/>
        <button onClick={()=>toggleAdminSec("recurring")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.recurring?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>🔁 Recurring Slots</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.recurring?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.recurring&&<>
          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
            padding:14,marginBottom:20}}>
            <div style={{fontSize:12,color:G.muted,marginBottom:12,lineHeight:1.5}}>
              Recurring sessions auto-appear in the schedule up to 3 weeks ahead.
              Toggle off to pause without deleting existing sessions.
            </div>

            {/* Existing slots */}
            {recurring.length===0&&(
              <div style={{textAlign:"center",padding:"16px 0",color:G.muted,fontSize:13}}>
                No recurring slots yet. Add one below.
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {recurring.map(slot=>(
                <div key={slot.id} style={{background:slot.enabled?G.cream:"#f1f5f9",
                  borderRadius:10,padding:"10px 12px",
                  border:`1.5px solid ${slot.enabled?G.border:"#cbd5e1"}`}}>
                  {editingSlot?.id===slot.id ? (
                    // ─── Inline edit form ───────────────────────
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <input style={iSt({padding:"7px 10px",fontSize:13})}
                        value={editingSlot.name}
                        onChange={e=>setEditingSlot({...editingSlot,name:e.target.value})}
                        placeholder="Slot name"/>
                      <div style={{display:"flex",gap:8}}>
                        <select style={iSt({padding:"7px 10px",fontSize:13,flex:1})}
                          value={editingSlot.day}
                          onChange={e=>setEditingSlot({...editingSlot,day:Number(e.target.value)})}>
                          {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                        </select>
                        <input type="time" style={iSt({padding:"7px 10px",fontSize:13,flex:1})}
                          value={editingSlot.from}
                          onChange={e=>setEditingSlot({...editingSlot,from:e.target.value})}/>
                        <input type="time" style={iSt({padding:"7px 10px",fontSize:13,flex:1})}
                          value={editingSlot.to}
                          onChange={e=>setEditingSlot({...editingSlot,to:e.target.value})}/>
                      </div>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:G.muted,
                          textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>Teams</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {teams.map(t=>{
                            const curTeams = editingSlot.teams||[editingSlot.team].filter(Boolean);
                            const sel = curTeams.includes(t.name);
                            return (
                              <button key={t.id} type="button"
                                onClick={()=>{
                                  const updated = sel
                                    ? curTeams.filter(x=>x!==t.name)
                                    : [...curTeams, t.name];
                                  setEditingSlot({...editingSlot,
                                    teams:updated, team:updated[0]||""});
                                }}
                                style={{background:sel?G.green:G.cream,color:sel?G.lime:G.text,
                                  border:sel?`2px solid ${G.green}`:`1.5px solid ${G.border}`,
                                  borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:700,
                                  cursor:"pointer",fontFamily:"inherit",transition:"all .1s"}}>
                                {sel?"✓ ":""}{t.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <label style={{display:"flex",alignItems:"center",gap:7,fontSize:13,
                        fontWeight:700,color:G.text,cursor:"pointer"}}>
                        <input type="checkbox" checked={editingSlot.restrictTeam}
                          onChange={e=>setEditingSlot({...editingSlot,restrictTeam:e.target.checked})}/>
                        Restrict to this team only
                      </label>
                      {/* Net picker */}
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:G.muted,
                          textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>Net</div>
                        <div style={{display:"flex",gap:6}}>
                          {[["1",<><NetIcon color={editingSlot.net==="1"?G.lime:G.text} size={13}/> Net 1</>],
                            ["2",<><NetIcon color={editingSlot.net==="2"?G.lime:G.text} size={13}/> Net 2</>],
                            ["both",<><BothNetsIcon color={editingSlot.net==="both"?G.lime:G.text} size={13}/> Both</>],
                          ].map(([val,lbl])=>(
                            <button key={val} type="button"
                              onClick={()=>setEditingSlot({...editingSlot,net:val})}
                              style={{flex:1,background:(editingSlot.net||"1")===val?G.green:G.cream,
                                color:(editingSlot.net||"1")===val?G.lime:G.text,
                                border:(editingSlot.net||"1")===val?`2px solid ${G.green}`:`1.5px solid ${G.border}`,
                                borderRadius:9,padding:"7px 4px",fontSize:12,fontWeight:700,
                                cursor:"pointer",fontFamily:"inherit",transition:"all .12s",
                                display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <FFld G={G} label="Active from">
                          <input type="date" style={iSt({padding:"7px 10px",fontSize:13})}
                            value={editingSlot.activeFrom||""}
                            onChange={e=>setEditingSlot({...editingSlot,activeFrom:e.target.value})}/>
                        </FFld>
                        <FFld G={G} label="Active until (blank = forever)">
                          <input type="date" style={iSt({padding:"7px 10px",fontSize:13})}
                            value={editingSlot.activeTo||""}
                            onChange={e=>setEditingSlot({...editingSlot,activeTo:e.target.value})}/>
                        </FFld>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn bg={G.green} col={G.lime}
                          onClick={()=>{updateRecurringSlot(slot.id,editingSlot);setEditingSlot(null);}}>
                          ✓ Save
                        </Btn>
                        <Btn bg={G.cream} col={G.muted} onClick={()=>setEditingSlot(null)}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    // ─── Display row ────────────────────────────
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:800,fontSize:13,color:slot.enabled?G.text:G.muted,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {slot.name}
                        </div>
                        <div style={{fontSize:11,color:G.muted,marginTop:2}}>
                          {DAYS[slot.day]} · {slot.from}–{slot.to}
                          {" · "}<NetIcon color={G.muted} size={11}/>{" "}
                          {slot.net==="both"?"Both Nets":`Net ${slot.net||"1"}`}
                          {(slot.teams?.length>0||slot.team)&&` · ${(slot.teams||[slot.team]).filter(Boolean).join(", ")}${slot.restrictTeam?" only":""}`}
                          {slot.activeTo&&` · ends ${fmtShort(slot.activeTo)}`}
                        </div>
                      </div>
                      {/* Toggle on/off */}
                      <button type="button" onClick={()=>toggleRecurringSlot(slot.id)}
                        style={{background:slot.enabled?"#dcfce7":"#f1f5f9",
                          color:slot.enabled?"#15803d":"#94a3b8",
                          border:"none",borderRadius:20,padding:"3px 10px",fontSize:11,
                          fontWeight:800,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>
                        {slot.enabled?"On":"Off"}
                      </button>
                      {/* Edit */}
                      <button type="button"
                        onClick={()=>setEditingSlot({...slot})}
                        style={{background:"transparent",color:G.muted,
                          border:`1px solid ${G.border}`,borderRadius:7,
                          padding:"4px 8px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                        ✏️
                      </button>
                      {/* Delete */}
                      <button type="button" onClick={()=>deleteRecurringSlot(slot.id)}
                        style={{background:G.redBg,color:G.red,border:"none",borderRadius:7,
                          padding:"4px 8px",fontSize:12,cursor:"pointer",fontFamily:"inherit",
                          fontWeight:800}}>×</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new slot form */}
            <div style={{borderTop:`1px solid ${G.border}`,paddingTop:12}}>
              <div style={{fontSize:11,fontWeight:800,color:G.mid,letterSpacing:1.3,
                textTransform:"uppercase",marginBottom:10}}>Add new slot</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <input style={iSt({padding:"9px 12px",fontSize:13})}
                  placeholder="Slot name e.g. U11 Saturday Training"
                  value={rName} onChange={e=>setRName(e.target.value)}/>
                <div style={{display:"flex",gap:8}}>
                  <select style={iSt({padding:"9px 10px",fontSize:13,flex:1})}
                    value={rDay} onChange={e=>setRDay(Number(e.target.value))}>
                    {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                  <input type="time" style={iSt({padding:"9px 10px",fontSize:13,flex:1})}
                    value={rFrom} onChange={e=>setRFrom(e.target.value)}/>
                  <input type="time" style={iSt({padding:"9px 10px",fontSize:13,flex:1})}
                    value={rTo} onChange={e=>setRTo(e.target.value)}/>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:G.muted,
                    textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>
                    Teams (tap to select, or leave empty for all)
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {teams.map(t=>{
                      const sel = rTeam.includes(t.name);
                      return (
                        <button key={t.id} type="button"
                          onClick={()=>setRTeam(ts=>sel?ts.filter(x=>x!==t.name):[...ts,t.name])}
                          style={{background:sel?G.green:G.cream,color:sel?G.lime:G.text,
                            border:sel?`2px solid ${G.green}`:`1.5px solid ${G.border}`,
                            borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700,
                            cursor:"pointer",fontFamily:"inherit",transition:"all .1s"}}>
                          {sel?"✓ ":""}{t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:7,fontSize:13,
                  fontWeight:700,color:G.text,cursor:"pointer"}}>
                  <input type="checkbox" checked={rRestrict}
                    onChange={e=>setRRestrict(e.target.checked)}/>
                  Restrict to this team only (others can view but not join)
                </label>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <FFld G={G} label="Active from">
                    <input type="date" style={iSt({padding:"9px 10px",fontSize:13})}
                      value={rActiveFrom} onChange={e=>setRActiveFrom(e.target.value)}/>
                  </FFld>
                  <FFld G={G} label="Active until (blank = forever)">
                    <input type="date" style={iSt({padding:"9px 10px",fontSize:13})}
                      value={rActiveTo} onChange={e=>setRActiveTo(e.target.value)}/>
                  </FFld>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:G.muted,
                    textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>
                    Net
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {[["1",<><NetIcon color={rNet==="1"?G.lime:G.text} size={13}/> Net 1</>],
                      ["2",<><NetIcon color={rNet==="2"?G.lime:G.text} size={13}/> Net 2</>],
                      ["both",<><BothNetsIcon color={rNet==="both"?G.lime:G.text} size={13}/> Both</>],
                    ].map(([val,lbl])=>(
                      <button key={val} type="button" onClick={()=>setRNet(val)}
                        style={{flex:1,background:rNet===val?G.green:G.cream,
                          color:rNet===val?G.lime:G.text,
                          border:rNet===val?`2px solid ${G.green}`:`1.5px solid ${G.border}`,
                          borderRadius:9,padding:"8px 4px",fontSize:12,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit",transition:"all .12s",
                          display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <Btn bg={G.green} col={G.lime} full
                  onClick={()=>{
                    if(!rName.trim()){showToast("Give the slot a name");return;}
                    addRecurringSlot({
                      name:rName.trim(), team:rTeam[0]||"", teams:rTeam, restrictTeam:rRestrict,
                      day:rDay, from:rFrom, to:rTo, net:rNet,
                      activeFrom:rActiveFrom, activeTo:rActiveTo||null,
                    });
                    setRName("");setRTeam([]);setRRestrict(false);
                    setRDay(6);setRFrom("14:00");setRTo("15:30");
                    setRActiveFrom(todayStr());setRActiveTo("");setRNet("1");
                  }}>
                  ↻ Add Recurring Slot
                </Btn>
              </div>
            </div>
          </div>
        </>}

        </>}

        {/* ── Data Backup & Export (superadmin only) ───────────────────── */}
        {sectionInTab("backup") && userRole==="superadmin"&&<>
        <div id="sec-backup"/>
        <button onClick={()=>toggleAdminSec("backup")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.backup?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>💾 Data Backup & Export</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.backup?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.backup&&(
          <div style={{background:G.white,borderRadius:12,border:`1.5px solid ${G.border}`,
            padding:16,marginBottom:20}}>
            
            {/* Status */}
            <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,
              padding:"10px 12px",marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#166534",marginBottom:4}}>
                ✅ Auto-backup enabled
              </div>
              <div style={{fontSize:11,color:"#15803d",lineHeight:1.5}}>
                Member data is automatically backed up daily to Firestore.<br/>
                Current member count: <b>{members.length}</b>
              </div>
            </div>
            
            {/* Export buttons */}
            <div style={{fontSize:11,fontWeight:700,color:G.mid,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>
              Export Data
            </div>
            
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{
                const data = {
                  exportedAt: new Date().toISOString(),
                  members: members,
                  teams: teams,
                  pins: pins
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `fcc_backup_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("Backup downloaded ✓");
              }} style={{padding:"12px 16px",background:"#1e40af",color:"#fff",border:"none",
                borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:8}}>
                <span>📥</span> Download Full Backup (JSON)
              </button>
              
              <button onClick={()=>{
                const csv = ["Name,Email,Phone,Teams,Role,Type"]
                  .concat(members.map(m => 
                    `"${m.name}","${m.email||""}","${m.phone||""}","${(m.teams||[]).join("; ")}","${m.role||"member"}","${m.memberType||"player"}"`
                  )).join("\n");
                const blob = new Blob([csv], {type: "text/csv"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `fcc_members_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("CSV downloaded ✓");
              }} style={{padding:"12px 16px",background:"#059669",color:"#fff",border:"none",
                borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:8}}>
                <span>📊</span> Download Members (CSV/Excel)
              </button>
            </div>
            
            {/* Restore info */}
            <div style={{marginTop:14,padding:"10px 12px",background:"#fefce8",border:"1px solid #fde047",
              borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:700,color:"#a16207",marginBottom:4}}>
                ⚠️ Restore from backup
              </div>
              <div style={{fontSize:11,color:"#92400e",lineHeight:1.5}}>
                To restore: Open Firebase Console → Firestore → fccnets → members → 
                paste the backup JSON into the "value" field. Daily backups are also stored 
                as <code style={{background:"#fef3c7",padding:"1px 4px",borderRadius:3}}>members_backup_YYYY-MM-DD</code> documents.
              </div>
            </div>
          </div>
        )}
        </>}

        {/* ── Audit Log (superadmin only) ───────────────────── */}
        {sectionInTab("auditlog") && userRole==="superadmin"&&<>
        <div id="sec-auditlog"/>
        <button onClick={()=>toggleAdminSec("auditlog")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.auditlog?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>👑 Audit Log</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.auditlog?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.auditlog&&(()=>{
          const CATEGORY_META = {
            member:    {icon:"👤", label:"Member",   col:"#0369a1", bg:"#e0f2fe"},
            role:      {icon:"🏷️", label:"Role",     col:"#7c3aed", bg:"#ede9fe"},
            team:      {icon:"🏏", label:"Team",     col:"#059669", bg:"#d1fae5"},
            session:   {icon:"📅", label:"Session",  col:"#d97706", bg:"#fef3c7"},
            recurring: {icon:"🔁", label:"Recurring",col:"#0891b2", bg:"#cffafe"},
            blockcal:  {icon:"🚫", label:"Block",    col:"#dc2626", bg:"#fee2e2"},
            pin:       {icon:"🔑", label:"PIN",      col:"#92400e", bg:"#fef3c7"},
            request:   {icon:"✋", label:"Request",  col:"#be185d", bg:"#fdf2f8"},
            system:    {icon:"⚙️", label:"System",  col:"#374151", bg:"#f3f4f6"},
          };
          const ROLE_COLOURS = {
            superadmin:"#86efac", admin:"#93c5fd", captain:"#c4b5fd",
            vicecaptain:"#a5b4fc", member:"#94a3b8",
          };
          const filtered = logFilter==="all"
            ? auditLog
            : auditLog.filter(e=>e.category===logFilter);
          function fmtTs(ts) {
            const d = new Date(ts);
            return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})
              +" "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
          }
          return (
            <>
              <div style={{background:"#0c1a2e",borderRadius:14,overflow:"hidden",
                border:"1.5px solid #1e3a5f",marginBottom:20}}>

                {/* Header bar */}
                <div style={{padding:"12px 16px",display:"flex",alignItems:"center",
                  gap:10,borderBottom:"1px solid #1e3a5f",cursor:"pointer"}}
                  onClick={()=>setLogOpen(o=>!o)}>
                  <div style={{flex:1}}>
                    <div style={{color:"#93c5fd",fontWeight:900,fontSize:13}}>
                      Admin Activity Log
                    </div>
                    <div style={{color:"#475569",fontSize:11,marginTop:1}}>
                      {auditLog.length} action{auditLog.length!==1?"s":""} recorded · visible only to you
                    </div>
                  </div>
                  <span style={{color:"#475569",fontSize:18,lineHeight:1}}>
                    {logOpen?"▲":"▼"}
                  </span>
                </div>

                {logOpen&&(
                  <>
                    {/* Category filter chips */}
                    <div style={{padding:"10px 12px",display:"flex",flexWrap:"wrap",
                      gap:5,borderBottom:"1px solid #1e3a5f"}}>
                      {["all",...Object.keys(CATEGORY_META)].map(cat=>{
                        const m = CATEGORY_META[cat];
                        const on = logFilter===cat;
                        return (
                          <button key={cat} onClick={()=>setLogFilter(cat)}
                            style={{border:"none",borderRadius:99,cursor:"pointer",
                              fontFamily:"inherit",fontWeight:700,fontSize:10,
                              padding:"3px 9px",
                              background: on ? (m?.bg||"#3b82f6") : "#1e3a5f",
                              color: on ? (m?.col||"#fff") : "#94a3b8",
                              transition:"all .1s"}}>
                            {m ? `${m.icon} ${m.label}` : "All"}
                          </button>
                        );
                      })}
                    </div>

                    {/* Log entries */}
                    <div style={{maxHeight:420,overflowY:"auto"}}>
                      {filtered.length===0&&(
                        <div style={{padding:"24px 16px",textAlign:"center",
                          color:"#475569",fontSize:13}}>
                          No actions recorded yet
                        </div>
                      )}
                      {filtered.map((entry,i)=>{
                        const m = CATEGORY_META[entry.category]||CATEGORY_META.system;
                        const isMe = entry.byId===currentUser.id;
                        return (
                          <div key={entry.id} style={{
                            padding:"10px 14px",
                            borderBottom: i<filtered.length-1 ? "1px solid #0f2240" : "none",
                            display:"flex",gap:10,alignItems:"flex-start",
                          }}>
                            {/* Category dot */}
                            <div style={{marginTop:2,width:28,height:28,borderRadius:"50%",
                              background:m.bg,display:"flex",alignItems:"center",
                              justifyContent:"center",fontSize:13,flexShrink:0}}>
                              {m.icon}
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,color:"#e2e8f0",lineHeight:1.4,
                                wordBreak:"break-word"}}>
                                {entry.detail}
                              </div>
                              <div style={{marginTop:4,display:"flex",
                                alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:10,fontWeight:800,
                                  color: ROLE_COLOURS[entry.byRole]||"#94a3b8",
                                  background:"rgba(255,255,255,0.07)",
                                  padding:"1px 6px",borderRadius:6}}>
                                  {isMe?"👑 You":entry.byName}
                                </span>
                                <span style={{fontSize:10,color:"#475569"}}>
                                  {fmtTs(entry.ts)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          );
        })()}
        </>}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* REMINDER LOGS — Superadmin only                           */}
        {/* ══════════════════════════════════════════════════════════ */}
        {sectionInTab("reminderlogs") && userRole==="superadmin"&&<>
        <div id="sec-reminderlogs"/>
        <button onClick={()=>toggleAdminSec("reminderlogs")}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
            padding:"8px 0",marginBottom:adminSec.reminderlogs?8:14}}>
          <span style={{fontWeight:900,fontSize:13,color:G.text}}>📧 Reminder Logs</span>
          <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
            {adminSec.reminderlogs?"▲ collapse":"▼ show"}
          </span>
        </button>
        {adminSec.reminderlogs&&(()=>{
          function fmtTs(ts) {
            if(!ts) return "—";
            const d = new Date(ts);
            return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})
              +" "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
          }
          function fmtShortDate(s) {
            if(!s) return "—";
            return new Date(s+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
          }
          return (
            <div style={{background:"#1e3a5f",borderRadius:14,overflow:"hidden",
              border:"1.5px solid #2d4a6f",marginBottom:20}}>
              
              {/* Header */}
              <div style={{padding:"14px 16px",borderBottom:"1px solid #2d4a6f"}}>
                <div style={{color:"#fbbf24",fontWeight:900,fontSize:14,marginBottom:4}}>
                  📧 Email Reminder Log
                </div>
                <div style={{color:"#94a3b8",fontSize:11}}>
                  {reminderLogs.length} reminder run{reminderLogs.length!==1?"s":""} recorded
                </div>
              </div>
              
              {reminderLogs.length===0 ? (
                <div style={{padding:"24px 16px",textAlign:"center",color:"#64748b",fontSize:13}}>
                  No reminder logs yet. Logs will appear here after the cron job runs.
                </div>
              ) : (
                <div style={{maxHeight:500,overflowY:"auto"}}>
                  {reminderLogs.map((log, idx) => {
                    const totalSent = log.totalSent || 0;
                    const totalSkipped = log.totalSkipped || 0;
                    const reminders = log.reminders || [];
                    return (
                    <div key={idx} style={{
                      padding:"14px 16px",
                      borderBottom: idx < reminderLogs.length - 1 ? "1px solid #2d4a6f" : "none",
                      background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.1)"
                    }}>
                      {/* Header: run timestamp + totals badge */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{color:"#fff",fontWeight:700,fontSize:13}}>
                          🗓️ Run at: {fmtTs(log.runAt)}
                        </div>
                        <div style={{
                          background: totalSent > 0 ? "#166534" : "#374151",
                          color: totalSent > 0 ? "#86efac" : "#9ca3af",
                          padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"
                        }}>
                          {totalSent} sent · {totalSkipped} skipped
                        </div>
                      </div>

                      {/* One sub-card per reminder run */}
                      {reminders.map((reminder, ridx) => {
                        const noSessions = reminder.message === "No sessions";
                        return (
                          <div key={ridx} style={{
                            background:"rgba(255,255,255,0.04)",
                            border:"1px solid rgba(251,191,36,0.18)",
                            borderRadius:10,padding:"10px 12px",
                            marginBottom: ridx < reminders.length - 1 ? 8 : 0
                          }}>
                            <div style={{color:"#fbbf24",fontWeight:700,fontSize:12,marginBottom:noSessions?6:8}}>
                              For: {fmtShortDate(reminder.date)} · {reminder.type === "24hr" ? "24h reminder" : "48h reminder"}
                            </div>
                            {noSessions ? (
                              <div style={{color:"#94a3b8",fontSize:11,fontStyle:"italic"}}>
                                No sessions on this date
                              </div>
                            ) : (
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                <div style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"5px 9px"}}>
                                  <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.5}}>Sessions</div>
                                  <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{reminder.sessions || 0}</div>
                                </div>
                                <div style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"5px 9px"}}>
                                  <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.5}}>Players</div>
                                  <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{reminder.players || 0}</div>
                                </div>
                                <div style={{background:"rgba(34,197,94,0.18)",borderRadius:8,padding:"5px 9px"}}>
                                  <div style={{fontSize:9,color:"#86efac",textTransform:"uppercase",letterSpacing:0.5}}>Sent</div>
                                  <div style={{fontSize:13,fontWeight:800,color:"#86efac"}}>{reminder.sent || 0}</div>
                                </div>
                                <div style={{background:"rgba(245,158,11,0.18)",borderRadius:8,padding:"5px 9px"}}>
                                  <div style={{fontSize:9,color:"#fbbf24",textTransform:"uppercase",letterSpacing:0.5}}>Skipped</div>
                                  <div style={{fontSize:13,fontWeight:800,color:"#fbbf24"}}>{reminder.skipped || 0}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
        </>}

        {/* ── Members list browser (People tab only) ─────────────── */}
        {adminTab === "people" && (<>

        {/* ── Sub-tab filter (Parents tab) ─────────────────────── */}
        {(() => {
          const parentCount = members.filter(m =>
            m.memberType === "parent" || (m.children || []).length > 0
          ).length;
          const childCount = members.filter(m =>
            (m.teams || []).some(t => t.startsWith("U") || t.includes("Girls"))
          ).length;
          const orphanCount = members.filter(m =>
            (m.teams || []).some(t => t.startsWith("U") || t.includes("Girls"))
            && !m.parentId && m.memberType !== "parent"
          ).length;
          const parentsWithoutPin = members.filter(m =>
            (m.memberType === "parent" || (m.children || []).length > 0) && !pins[m.id]
          ).length;
          const nonParentCount = members.length - parentCount;

          // Diagnostic: how many parents have memberType undefined but children linked?
          // Tells admin if normMember backfill missed anyone in production data.
          if (typeof window !== "undefined" && !window.__parentsTabDiagLogged) {
            const undefinedTypeParents = members.filter(m =>
              !m.memberType && (m.children || []).length > 0
            );
            console.log(
              `[parents-tab] memberType-undefined members with children: ${undefinedTypeParents.length}`,
              undefinedTypeParents.map(m => m.name)
            );
            // Junior teams available for the LinkChildModal team dropdown.
            const juniorTeamNames = (teams || [])
              .map(t => t.name)
              .filter(n => n.startsWith("U") || n.includes("Girls"));
            console.log(
              `[link-child] junior teams available (${juniorTeamNames.length}):`,
              juniorTeamNames
            );
            window.__parentsTabDiagLogged = true;
          }

          const tabs = [
            { id: "all",       label: "All",         count: members.length },
            { id: "players",   label: "🏏 Players",  count: nonParentCount },
            { id: "parents",   label: "👨‍👧 Parents", count: parentCount },
            { id: "attention", label: "⚠ Orphans",   count: orphanCount, tint: "red" },
          ];
          return (
            <>
              <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                {tabs.map(tab => {
                  const active = aSubTab === tab.id;
                  const red = tab.tint === "red";
                  return (
                    <button key={tab.id} type="button"
                      onClick={()=>setASubTab(tab.id)}
                      style={{
                        padding:"6px 12px",borderRadius:99,
                        fontSize:12,fontWeight:700,
                        cursor:"pointer",fontFamily:"inherit",
                        border: active
                          ? `1.5px solid ${red ? "#dc2626" : G.green}`
                          : `1px solid ${G.border}`,
                        background: active
                          ? (red ? "#fef2f2" : `${G.green}14`)
                          : G.white,
                        color: active
                          ? (red ? "#991b1b" : G.green)
                          : G.text,
                      }}>
                      {tab.label}
                      {tab.count > 0 && (
                        <span style={{marginLeft:6,opacity:0.7}}>({tab.count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{
                fontSize:11,color:G.muted,marginBottom:12,fontStyle:"italic",
              }}>
                {members.length} members · {parentCount} parents · {childCount} children
                {orphanCount > 0 && (
                  <span style={{color:"#dc2626",fontWeight:700}}>
                    {" · "}{orphanCount} unlinked
                  </span>
                )}
                {parentsWithoutPin > 0 && (
                  <span style={{color:"#92400e"}}>
                    {" · "}{parentsWithoutPin} parents not on app yet
                  </span>
                )}
              </div>
            </>
          );
        })()}

        {/* ── View mode toggle + Team jump bar ─────────────────── */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{display:"flex",gap:4,background:G.cream,borderRadius:20,
            padding:3,border:`1px solid ${G.border}`}}>
            {[["teams","👥 By Team"],["flat","≡ All Members"]].map(([mode,label])=>(
              <button key={mode} onClick={()=>setAdminListMode(mode)}
                style={{padding:"5px 12px",borderRadius:17,border:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:11,fontWeight:700,transition:"all .12s",
                  background:adminListMode===mode?G.green:"transparent",
                  color:adminListMode===mode?G.lime:G.muted}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {adminListMode==="teams"&&Object.keys(adminGrouped).length>2&&(
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:14,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:1.5,color:G.mid,
              textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
              <span>⚡ Jump to team</span>
              <span style={{flex:1,height:1,background:G.border,display:"block"}}/>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.keys(adminGrouped).map(team=>{
                const meta=getTeamMeta(team); const isFem=TEAM_META[team]?.feminine;
                return (
                  <button key={team}
                    onClick={()=>document.getElementById("team-section-"+team.replace(/\s+/g,"-"))
                      ?.scrollIntoView({behavior:"smooth",block:"start"})}
                    style={{background:isFem?"linear-gradient(135deg,#be185d,#9d174d)":meta.bg,
                      color:meta.text,border:"none",borderRadius:20,padding:"5px 12px",
                      fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
                    {isFem?"✨ ":""}{team}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search + filter */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <input style={iSt({flex:1,background:G.white})}
            placeholder="🔍  Search members…" value={aSearch}
            onChange={e=>setASearch(e.target.value)}/>
          <select style={iSt({width:"auto",minWidth:110,background:G.white,flexShrink:0})}
            value={aFilter} onChange={e=>setAFilter(e.target.value)}>
            <option value="All">All groups</option>
            {ALL_TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* ── Flat "All Members" view ──────────────────────────── */}
        {adminListMode==="flat"&&(()=>{
          // adminVisible already applies search + team-filter + sub-tab filter
          const flatList = [...adminVisible].sort((a,b)=>a.name.localeCompare(b.name));
          return (
            <div style={{display:"flex",flexDirection:"column",gap:0,
              background:G.white,border:`1.5px solid ${G.border}`,borderRadius:14,
              overflow:"hidden"}}>
              {flatList.length===0&&(
                <div style={{padding:"20px",textAlign:"center",color:G.muted,fontSize:13}}>
                  No members match
                </div>
              )}
              {flatList.map((m,i)=>{
                const rm=ROLE_META[m.role||"member"];
                const teamChips=(m.teams||[]).slice(0,3);
                const isExpanded = selMember?.id===m.id;
                return (
                  <div key={m.id} data-member-id={m.id}>
                    {aSubTab === "attention" && (
                      <div style={{
                        background:"#fef2f2",borderBottom:"1px solid #fecaca",
                        padding:"5px 14px",
                        fontSize:11,fontWeight:700,color:"#991b1b",
                      }}>
                        ⚠ No parent linked — tap to expand &amp; use "Link Parent"
                      </div>
                    )}
                    {/* Member row */}
                    <div onClick={()=>setSelMember(isExpanded?null:m)}
                      style={{display:"flex",alignItems:"center",gap:10,
                        padding:"10px 14px",cursor:"pointer",
                        borderBottom:(!isExpanded&&i<flatList.length-1)?`1px solid ${G.border}`:"none",
                        background:isExpanded?`${G.green}08`:"transparent",
                        transition:"background .1s"}}
                      onMouseEnter={e=>{if(!isExpanded)e.currentTarget.style.background=G.cream}}
                      onMouseLeave={e=>{if(!isExpanded)e.currentTarget.style.background="transparent"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",
                        background:`${rm?.bg||G.green}22`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:10,fontWeight:900,color:rm?.bg||G.green,flexShrink:0}}>
                        {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:13,color:G.text}}>{m.name}</span>
                          <MemberRolePills member={m} teams={teams} sm/>
                        </div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:2}}>
                          {teamChips.map(t=>{
                            const tm=getTeamMeta(t);
                            return <span key={t} style={{fontSize:9,padding:"1px 6px",
                              borderRadius:20,background:tm.bg,color:tm.text,fontWeight:700}}>
                              {t}
                            </span>;
                          })}
                          {(m.teams||[]).length>3&&<span style={{fontSize:9,color:G.muted}}>
                            +{(m.teams||[]).length-3}
                          </span>}
                          {(m.teams||[]).length===0&&<span style={{fontSize:9,color:G.muted,
                            fontStyle:"italic"}}>Unassigned</span>}
                        </div>
                      </div>
                      <span style={{color:G.muted,fontSize:14,transition:"transform .15s",
                        transform:isExpanded?"rotate(90deg)":"rotate(0deg)"}}>›</span>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded&&(
                      <div style={{background:G.cream,borderBottom:`1px solid ${G.border}`,
                        padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>

                        {/* Name editing */}
                        {editingName?.id===m.id+"_name_flat" ? (
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <input autoFocus
                              style={{...iSt({padding:"6px 10px",fontSize:13}),flex:1}}
                              value={editingName.value}
                              onChange={e=>setEditingName({...editingName,value:e.target.value})}
                              onKeyDown={e=>{
                                if(e.key==="Enter"){e.preventDefault();renameMember(m.id,editingName.value);setSelMember({...m,name:editingName.value});}
                                if(e.key==="Escape") setEditingName(null);
                              }}/>
                            <button type="button"
                              onClick={()=>{renameMember(m.id,editingName.value);setSelMember({...m,name:editingName.value});}}
                              style={{background:G.green,color:G.lime,border:"none",borderRadius:7,
                                padding:"6px 12px",fontSize:12,fontWeight:800,cursor:"pointer",
                                fontFamily:"inherit"}}>✓</button>
                            <button type="button" onClick={()=>setEditingName(null)}
                              style={{background:G.white,color:G.muted,border:`1px solid ${G.border}`,
                                borderRadius:7,padding:"6px 10px",fontSize:12,cursor:"pointer",
                                fontFamily:"inherit"}}>✕</button>
                          </div>
                        ) : (
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontWeight:800,fontSize:14,color:G.text,flex:1}}>
                              {m.name}
                            </span>
                            {can(userRole,"addMember")&&(
                              <button type="button"
                                onClick={e=>{e.stopPropagation();setEditingName({id:m.id+"_name_flat",value:m.name});}}
                                style={{background:"none",border:"none",cursor:"pointer",
                                  color:G.muted,fontSize:13,padding:"2px 4px"}}
                                title="Edit name">✏️ Edit name</button>
                            )}
                          </div>
                        )}

                        {/* Contact */}
                        {editingName?.id===m.id+"_contact_flat" ? (
                          <div style={{background:G.white,borderRadius:8,padding:"10px 12px",
                            border:`1px solid ${G.border}`}}>
                            <div style={{fontSize:10,fontWeight:800,color:G.muted,letterSpacing:1.2,
                              textTransform:"uppercase",marginBottom:8}}>Edit Contact</div>
                            <div style={{display:"flex",flexDirection:"column",gap:6}}>
                              <input type="email" placeholder="Email"
                                value={editingName.email||""}
                                onChange={e=>setEditingName({...editingName,email:e.target.value})}
                                style={iSt({fontSize:12,padding:"6px 10px",borderRadius:7})}/>
                              <input type="tel" placeholder="Phone"
                                value={editingName.phone||""}
                                onChange={e=>setEditingName({...editingName,phone:e.target.value})}
                                style={iSt({fontSize:12,padding:"6px 10px",borderRadius:7})}/>
                              <div style={{fontSize:11,color:"#92400e",background:"#fffbeb",
                                borderRadius:6,padding:"6px 8px",border:"1px solid #fde68a"}}>
                                ⚠️ This will update {m.name.split(" ")[0]}'s contact details. Check before saving.
                              </div>
                              <div style={{display:"flex",gap:6}}>
                                <button type="button" onClick={()=>{
                                    const newEmail=(editingName.email||"").trim()||null;
                                    const newPhone=(editingName.phone||"").trim()||null;
                                    saveMembers(members.map(x=>x.id===m.id?{...x,email:newEmail,phone:newPhone}:x));
                                    logAction("member",`Updated contact: ${m.name}`);
                                    showToast(`✓ Saved for ${m.name.split(" ")[0]}`);
                                    setSelMember({...m,email:newEmail,phone:newPhone});
                                    setEditingName(null);
                                  }}
                                  style={{flex:1,background:G.green,color:G.lime,border:"none",
                                    borderRadius:7,padding:"7px",fontSize:12,fontWeight:800,
                                    cursor:"pointer",fontFamily:"inherit"}}>✓ Save</button>
                                <button type="button" onClick={()=>setEditingName(null)}
                                  style={{background:G.white,color:G.muted,border:`1px solid ${G.border}`,
                                    borderRadius:7,padding:"7px 12px",fontSize:12,cursor:"pointer",
                                    fontFamily:"inherit"}}>Cancel</button>
                              </div>
                            </div>
                          </div>
                        ):(
                          <div style={{display:"flex",alignItems:"center",gap:8,
                            padding:"8px 10px",background:G.white,borderRadius:8,
                            border:`1px solid ${G.border}`}}>
                            <div style={{flex:1,fontSize:12,display:"flex",flexDirection:"column",gap:3}}>
                              <span style={{color:G.muted}}>
                                📧 {m.email?<b style={{color:G.text}}>{maskEmail(m.email)}</b>:<em style={{color:"#d1d5db"}}>no email</em>}
                              </span>
                              <span style={{color:G.muted}}>
                                📱 {m.phone?<b style={{color:G.text}}>{m.phone}</b>:<em style={{color:"#d1d5db"}}>no phone</em>}
                              </span>
                            </div>
                            {can(userRole,"addMember")&&(
                              <button type="button"
                                onClick={()=>setEditingName({id:m.id+"_contact_flat",value:"",
                                  email:m.email||"",phone:m.phone||""})}
                                style={{background:"none",border:"none",cursor:"pointer",
                                  color:G.muted,fontSize:13,padding:"2px 4px"}}>✏️</button>
                            )}
                          </div>
                        )}

                        {/* Parent/Child link info */}
                        {(m.parentName || m.childIds?.length > 0 || m.memberType === "parent") && (
                          <div style={{
                            background: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            borderRadius: 8,
                            padding: "8px 10px",
                            fontSize: 11,
                          }}>
                            {m.memberType === "parent" && (
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                                <span style={{fontSize:14}}>👨‍👧</span>
                                <span style={{fontWeight:700,color:"#0369a1"}}>Parent Account</span>
                              </div>
                            )}
                            {m.parentName && (
                              <div style={{color:"#0c4a6e"}}>
                                <span style={{fontWeight:600}}>Parent:</span> {m.parentName}
                              </div>
                            )}
                            {m.childIds?.length > 0 && (
                              <div style={{color:"#0c4a6e",marginTop:2}}>
                                <span style={{fontWeight:600}}>Children:</span>{" "}
                                {m.childIds.map(cid => {
                                  const child = members.find(x=>x.id===cid);
                                  return child?.name || cid;
                                }).join(", ")}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {can(userRole,"assignRoles")&&(m.id!==currentUser.id||userRole==="superadmin")&&(
                            <select value={["superadmin","admin","member"].includes(m.role||"member")?(m.role||"member"):"member"}
                              onChange={e=>updateRole(m.id,e.target.value)}
                              style={{border:`1px solid ${G.border}`,borderRadius:6,
                                padding:"5px 8px",fontSize:11,fontFamily:"inherit",
                                color:G.text,background:G.white,cursor:"pointer"}}>
                              {userRole==="superadmin"&&<option value="superadmin">👑 Super Admin</option>}
                              <option value="admin">👨🏻‍💻 Admin</option>
                              <option value="member">🏏 Member</option>
                            </select>
                          )}
                          {/* Member type & Link Children/Parent - for admin linking */}
                          {can(userRole,"assignRoles")&&(
                            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                              {/* Show member type badge */}
                              <span style={{
                                background: m.memberType === "parent" ? "#dbeafe" : "#dcfce7",
                                color: m.memberType === "parent" ? "#1e40af" : "#166534",
                                padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,
                              }}>
                                {m.memberType === "parent" ? "👨‍👧 Parent" : "🏏 Player"}
                              </span>

                              {/* Linked children pill — names + first team for fast hop */}
                              {(() => {
                                const linkedChildren = (m.children || [])
                                  .map(cid => members.find(x => x.id === cid))
                                  .filter(Boolean);
                                if (linkedChildren.length === 0) return null;
                                const first = linkedChildren[0];
                                const firstTeam = (first.teams || [])[0] || "";
                                const label = linkedChildren.length === 1
                                  ? `${first.name}${firstTeam ? ` · ${firstTeam}` : ""}`
                                  : linkedChildren.length === 2
                                    ? `${first.name.split(" ")[0]} · ${linkedChildren[1].name.split(" ")[0]}`
                                    : `${first.name.split(" ")[0]} +${linkedChildren.length - 1} more`;
                                return (
                                  <button type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (first.id === m.id) return; // defensive: no self-jump
                                      jumpToMember(first.id);
                                    }}
                                    title={linkedChildren.map(c => c.name).join(", ")}
                                    style={{
                                      background: "#dbeafe", color: "#1e40af",
                                      padding: "4px 10px", borderRadius: 6,
                                      fontSize: 11, fontWeight: 700,
                                      border: "1px solid #93c5fd",
                                      cursor: "pointer", fontFamily: "inherit",
                                      display: "inline-flex", alignItems: "center", gap: 4,
                                      maxWidth: "100%",
                                    }}>
                                    👨‍👧 {label}
                                  </button>
                                );
                              })()}

                              {/* PIN status pill — admin can see at a glance who's set up */}
                              <span style={{
                                background: pins[m.id] ? "#dcfce7" : "#fef3c7",
                                color: pins[m.id] ? "#166534" : "#92400e",
                                padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,
                              }}>
                                {pins[m.id] ? "🔑 PIN set" : "⏳ No PIN yet"}
                              </span>

                              {/* Junior + Linked/NoParent pills — surface link health */}
                              {(() => {
                                const isJunior = (m.teams || []).some(t =>
                                  t.startsWith("U") || t.includes("Girls")
                                );
                                if (!isJunior) return null;
                                const linked = !!m.parentId;
                                const parent = linked
                                  ? members.find(x => x.id === m.parentId)
                                  : null;
                                return (
                                  <>
                                    <span style={{
                                      background: "#ffedd5", color: "#c2410c",
                                      padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,
                                    }}>
                                      🧒 Junior
                                    </span>
                                    {linked && parent ? (
                                      <button type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (parent.id === m.id) return;
                                          jumpToMember(parent.id);
                                        }}
                                        title={`Linked to ${parent.name}`}
                                        style={{
                                          background: "#dcfce7", color: "#166534",
                                          padding: "4px 10px", borderRadius: 6,
                                          fontSize: 11, fontWeight: 700,
                                          border: "1px solid #86efac",
                                          cursor: "pointer", fontFamily: "inherit",
                                        }}>
                                        🔗 {parent.name}
                                      </button>
                                    ) : (
                                      <span style={{
                                        background: linked ? "#dcfce7" : "#fef3c7",
                                        color: linked ? "#166534" : "#92400e",
                                        padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,
                                      }}>
                                        {linked ? "🔗 Linked" : "⚠ No parent"}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}

                              {/* Duty count pill — only on Parents tab */}
                              {aSubTab === "parents" && (() => {
                                const dutyTeams = Array.from(new Set(
                                  (m.children || []).flatMap(cid => {
                                    const child = members.find(x => x.id === cid);
                                    return (child?.teams || [])
                                      .filter(t => t.startsWith("U") || t.includes("Girls"))
                                      .map(t => resolveDutyTeam(t));
                                  })
                                ));
                                if (dutyTeams.length === 0) return null;
                                const rollupTeams = dutyTeams.flatMap(dt => getRollupTeams(dt));
                                const done = countDuties(m, sessions, rollupTeams);
                                const min = dutyTeams.reduce(
                                  (sum, dt) => sum + (getEffectiveConfig(dt, parentDutyConfig)?.minDuties || 0),
                                  0
                                );
                                const bg = done >= min ? "#dcfce7" : done > 0 ? "#fef3c7" : "#fee2e2";
                                const col = done >= min ? "#166534" : done > 0 ? "#92400e" : "#991b1b";
                                return (
                                  <span style={{
                                    background: bg, color: col,
                                    padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,
                                  }}>
                                    {done}/{min} duties
                                  </span>
                                );
                              })()}

                              {/* Link Child button - for adults (not in junior teams) */}
                              {!(m.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder")) && (
                                <button
                                  onClick={() => setLinkChildModal({ parentMember: m })}
                                  style={{
                                    border:"1px solid #3b82f6",borderRadius:6,padding:"4px 8px",
                                    fontSize:10,fontWeight:700,fontFamily:"inherit",
                                    color:"#1e40af",background:"#eff6ff",cursor:"pointer",
                                  }}>
                                  + Link Child
                                </button>
                              )}
                              
                              {/* Link to Parent button - for juniors without parent */}
                              {(m.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder")) && !m.parentId && (
                                <button
                                  onClick={() => setLinkParentModal({ childMember: m })}
                                  style={{
                                    border:"1px solid #f59e0b",borderRadius:6,padding:"4px 8px",
                                    fontSize:10,fontWeight:700,fontFamily:"inherit",
                                    color:"#92400e",background:"#fffbeb",cursor:"pointer",
                                  }}>
                                  + Link Parent
                                </button>
                              )}
                              
                              {/* Show linked parent for juniors */}
                              {m.parentId && (
                                <span style={{fontSize:10,color:"#6b7280"}}>
                                  → {m.parentName || "Linked"}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Reset PIN — member has a PIN */}
                          {can(userRole,"resetOtherPin")&&m.id!==currentUser.id&&pins[m.id]&&(
                            <Btn onClick={()=>resetPin(m.id)} bg={G.amberBg} col={G.amber} sm>🔑 Reset PIN</Btn>
                          )}
                          {/* Reset Access — has email, no PIN */}
                          {can(userRole,"resetOtherPin")&&m.id!==currentUser.id&&!pins[m.id]&&m.email&&!inviteCodes[m.id]&&(
                            <Btn onClick={()=>{
                                const code=generateInviteCode(m.id);
                                setCodeModal({name:m.name,code});
                              }} bg={G.amberBg} col={G.amber} sm>🔑 Reset Access</Btn>
                          )}
                          {/* Gen Code — no email, no PIN, no code */}
                          {can(userRole,"resetOtherPin")&&!pins[m.id]&&!m.email&&!inviteCodes[m.id]&&(
                            <Btn sm bg="#f0f9ff" col="#0369a1" onClick={()=>{
                                const code=generateInviteCode(m.id);
                                setCodeModal({name:m.name,code});
                              }}>🎟️ Gen Code</Btn>
                          )}
                          {/* Code active — show it + allow regenerate */}
                          {can(userRole,"resetOtherPin")&&!pins[m.id]&&inviteCodes[m.id]&&(
                            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                              <span style={{fontSize:10,color:"#0369a1",fontWeight:700,
                                background:"#e0f2fe",borderRadius:6,padding:"3px 7px"}}>
                                🎟️ Code pending
                              </span>
                              <Btn sm bg="#f0f9ff" col="#0369a1" onClick={()=>{
                                  const code=generateInviteCode(m.id);
                                  setCodeModal({name:m.name,code});
                                }}>↻ New code</Btn>
                            </div>
                          )}
                          {can(userRole,"removeMember")&&m.id!==currentUser.id&&(
                            <Btn onClick={()=>setConfirmDelete(m)} bg={G.redBg} col={G.red} sm>× Remove</Btn>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Member list — Team view */}
        {adminListMode==="teams"&&Object.entries(adminGrouped).map(([team,list])=>{
          const meta = getTeamMeta(team);
          const isFem = TEAM_META[team]?.feminine;
          const accentColor = isFem ? "#be185d" : meta.bg;
          return (
          <div key={team} id={"team-section-"+team.replace(/\s+/g,"-")}
            style={{marginBottom:24, scrollMarginTop:80,
              background:G.white,
              border:`1.5px solid ${G.border}`,
              borderLeft:`4px solid ${accentColor}`,
              borderRadius:14,
              overflow:"hidden",
              boxShadow:"0 2px 10px rgba(0,0,0,0.05)",
            }}>
            {/* Team header bar */}
            {isFem ? (
              <div style={{background:"linear-gradient(135deg,#fce7f3,#fdf2f8)",
                borderBottom:"1.5px solid #f9a8d4",padding:"12px 16px",
                display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>✨</span>
                <div style={{flex:1}}>
                  <span style={{fontWeight:900,fontSize:15,
                    background:"linear-gradient(90deg,#9d174d,#be185d,#ec4899)",
                    WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                    {team}
                  </span>
                  <span style={{fontSize:12,color:"#be185d",fontWeight:700,marginLeft:8}}>
                    {list.length} player{list.length!==1?"s":""}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{background:`${accentColor}14`, borderBottom:`1px solid ${accentColor}30`,
                padding:"10px 16px",display:"flex",alignItems:"center",gap:8}}>
                <TeamPill team={team}/>
                <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
                  {list.length} player{list.length!==1?"s":""}
                </span>
                {seniorTeamNames.includes(team)&&(
                  <span style={{fontSize:10,color:G.muted,fontWeight:600,fontStyle:"italic"}}>
                    · Captain / VC eligible
                  </span>
                )}
              </div>
            )}
            {/* Member cards inside */}
            <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
            {list.map(m=>(
              <div key={m.id} style={{
                background: isFem ? "#fff5f9" : G.bg,
                border: `1px solid ${isFem ? "#fbcfe8" : G.border}`,
                borderRadius:10,padding:"10px 14px"}}>

                {aSubTab === "attention" && (
                  <div style={{
                    background:"#fef2f2",border:"1px solid #fecaca",
                    borderRadius:6,padding:"6px 10px",marginBottom:8,
                    fontSize:11,fontWeight:700,color:"#991b1b",
                  }}>
                    ⚠ No parent linked — use the "Link Parent" button below
                  </div>
                )}

                {/* Top row: name + pencil + delete */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  {editingName?.id===m.id ? (
                    <div style={{display:"flex",gap:6,alignItems:"center",flex:1}}>
                      <input autoFocus
                        style={{...iSt({padding:"5px 9px",fontSize:13}),flex:1}}
                        value={editingName.value}
                        onChange={e=>setEditingName({...editingName,value:e.target.value})}
                        onKeyDown={e=>{
                          if(e.key==="Enter"){e.preventDefault();renameMember(m.id,editingName.value);}
                          if(e.key==="Escape") setEditingName(null);
                        }}/>
                      <button type="button"
                        onClick={()=>renameMember(m.id,editingName.value)}
                        style={{background:G.green,color:G.lime,border:"none",borderRadius:7,
                          padding:"5px 10px",fontSize:13,cursor:"pointer",
                          fontFamily:"inherit",fontWeight:800,flexShrink:0}}>✓</button>
                      <button type="button" onClick={()=>setEditingName(null)}
                        style={{background:G.cream,color:G.muted,border:`1px solid ${G.border}`,
                          borderRadius:7,padding:"5px 9px",fontSize:13,cursor:"pointer",
                          fontFamily:"inherit",flexShrink:0}}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div style={{fontWeight:800,color:G.text,fontSize:15,flex:1}}>
                        {m.name}
                      </div>
                      {can(userRole,"addMember")&&(
                        <button type="button"
                          onClick={()=>setEditingName({id:m.id,value:m.name})}
                          style={{background:"none",border:"none",cursor:"pointer",
                            color:G.muted,fontSize:14,padding:"2px 4px",flexShrink:0}}
                          title="Edit name">✏️</button>
                      )}
                      {can(userRole,"removeMember")&&m.id!==currentUser.id&&(
                        <button type="button" onClick={()=>setConfirmDelete(m)}
                          style={{background:G.redBg,color:G.red,border:"none",borderRadius:7,
                            padding:"4px 9px",fontSize:13,cursor:"pointer",
                            fontFamily:"inherit",fontWeight:800,flexShrink:0}}>×</button>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom row: role pill + team chips + role dropdown + reset PIN */}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>

                  {/* Contact details row */}
                  {editingName?.id===m.id+"_contact" ? (
                    <div style={{background:G.cream,borderRadius:8,padding:"10px 12px",
                      border:`1px solid ${G.border}`}}>
                      <div style={{fontSize:10,fontWeight:800,color:G.muted,letterSpacing:1.2,
                        textTransform:"uppercase",marginBottom:8}}>Edit Contact Details</div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <input type="email" placeholder="Email address"
                          value={editingName.email||""}
                          onChange={e=>setEditingName({...editingName,email:e.target.value})}
                          style={iSt({fontSize:12,padding:"6px 10px",borderRadius:7})}/>
                        <input type="tel" placeholder="Phone (+45 XX XX XX XX)"
                          value={editingName.phone||""}
                          onChange={e=>setEditingName({...editingName,phone:e.target.value})}
                          style={iSt({fontSize:12,padding:"6px 10px",borderRadius:7})}/>
                        <div style={{fontSize:11,color:"#92400e",background:"#fffbeb",
                          borderRadius:6,padding:"6px 8px",border:"1px solid #fde68a"}}>
                          ⚠️ Saving will update {m.name}'s contact details in the system.
                          Make sure the information is correct before saving.
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button type="button"
                            onClick={()=>{
                              const newEmail=(editingName.email||"").trim()||null;
                              const newPhone=(editingName.phone||"").trim()||null;
                              const updated=members.map(x=>x.id===m.id?{...x,email:newEmail,phone:newPhone}:x);
                              saveMembers(updated);
                              logAction("member",`Updated contact: ${m.name} — email: ${newEmail||"none"}, phone: ${newPhone||"none"}`);
                              showToast(`✓ Contact details saved for ${m.name.split(" ")[0]}`);
                              setEditingName(null);
                            }}
                            style={{flex:1,background:G.green,color:G.lime,border:"none",
                              borderRadius:7,padding:"7px",fontSize:12,fontWeight:800,
                              cursor:"pointer",fontFamily:"inherit"}}>
                            ✓ Save changes
                          </button>
                          <button type="button" onClick={()=>setEditingName(null)}
                            style={{background:G.cream,color:G.muted,border:`1px solid ${G.border}`,
                              borderRadius:7,padding:"7px 12px",fontSize:12,cursor:"pointer",
                              fontFamily:"inherit"}}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:6,
                      padding:"6px 8px",background:G.cream,borderRadius:7,
                      border:`1px solid ${G.border}`}}>
                      <div style={{flex:1,minWidth:0,display:"flex",gap:10,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,color:G.muted}}>
                          📧 {m.email
                            ? <b style={{color:G.text}}>{maskEmail(m.email)}</b>
                            : <em style={{color:"#d1d5db"}}>no email</em>}
                        </span>
                        <span style={{fontSize:11,color:G.muted}}>
                          📱 {m.phone
                            ? <b style={{color:G.text}}>{m.phone}</b>
                            : <em style={{color:"#d1d5db"}}>no phone</em>}
                        </span>
                      </div>
                      {can(userRole,"addMember")&&(
                        <button type="button"
                          onClick={()=>setEditingName({id:m.id+"_contact",value:"",
                            email:m.email||"",phone:m.phone||""})}
                          style={{background:"none",border:"none",cursor:"pointer",
                            color:G.muted,fontSize:12,padding:"2px 4px",flexShrink:0}}
                          title="Edit email & phone">✏️</button>
                      )}
                    </div>
                  )}
                  {/* Team chips */}
                  <div>
                    <div style={{fontSize:10,fontWeight:800,color:G.muted,
                      letterSpacing:1.3,textTransform:"uppercase",marginBottom:5}}>Teams</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {teams.map(t=>{
                        const active=(m.teams||[]).includes(t.name);
                        return (
                          <button key={t.id} type="button"
                            onClick={()=>toggleMemberTeam(m.id,t.name)}
                            style={{
                              background:active?G.green:G.cream,
                              color:active?G.lime:G.muted,
                              border:active?`1.5px solid ${G.green}`:`1.5px solid ${G.border}`,
                              borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800,
                              cursor:"pointer",fontFamily:"inherit",transition:"all .12s",
                            }}>
                            {active?"✓ ":""}{t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Role + actions row */}
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <MemberRolePills member={m} teams={teams} sm/>
                    {getMemberRoleChips(m,teams).length===0&&<RolePill role={m.role||"member"}/>}
                    {can(userRole,"assignRoles")&&(m.id!==currentUser.id||userRole==="superadmin")&&(
                      <select value={["superadmin","admin","member"].includes(m.role||"member")?(m.role||"member"):"member"}
                        onChange={e=>updateRole(m.id,e.target.value)}
                        style={{border:`1px solid ${G.border}`,borderRadius:6,
                          padding:"4px 6px",fontSize:11,fontFamily:"inherit",
                          color:G.text,background:G.cream,cursor:"pointer"}}>
                        {userRole==="superadmin"&&<option value="superadmin">👑 Super Admin</option>}
                        <option value="admin">👨🏻‍💻 Admin</option>
                        <option value="member">🏏 Member</option>
                      </select>
                    )}
                    {/* Reset PIN — show for anyone with a PIN set */}
                    {can(userRole,"resetOtherPin")&&m.id!==currentUser.id&&pins[m.id]&&(
                      <Btn onClick={()=>resetPin(m.id)} bg={G.amberBg} col={G.amber} sm>🔑 Reset PIN</Btn>
                    )}
                    {/* Reset access — has email, no PIN, no pending code */}
                    {can(userRole,"resetOtherPin")&&m.id!==currentUser.id&&!pins[m.id]&&m.email&&!inviteCodes[m.id]&&(
                      <Btn onClick={()=>{
                          const code=generateInviteCode(m.id);
                          setCodeModal({name:m.name,code});
                        }} bg={G.amberBg} col={G.amber} sm>🔑 Reset Access</Btn>
                    )}
                    {/* Gen Code — no email, no PIN, no pending code */}
                    {can(userRole,"resetOtherPin")&&!pins[m.id]&&!m.email&&!inviteCodes[m.id]&&(
                      <Btn sm bg="#f0f9ff" col="#0369a1"
                        onClick={()=>{
                          const code = generateInviteCode(m.id);
                          setCodeModal({name:m.name,code});
                        }}>
                        🎟️ Gen Code
                      </Btn>
                    )}
                    {/* Show if code already exists — with option to regenerate */}
                    {can(userRole,"resetOtherPin")&&!pins[m.id]&&inviteCodes[m.id]&&(
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:10,color:"#0369a1",fontWeight:700,
                          background:"#e0f2fe",borderRadius:6,padding:"3px 7px"}}>
                          🎟️ Code active
                        </span>
                        <Btn sm bg="#f0f9ff" col="#0369a1"
                          onClick={()=>{
                            const code = generateInviteCode(m.id);
                            setCodeModal({name:m.name,code});
                          }}>
                          ↻ New
                        </Btn>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))}
            </div>{/* end padding wrapper */}
          </div>
          );
        })}

        </>)}{/* end Members list browser (People tab only) */}
      </div>
      <BotNav view="admin" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
      {toast&&<Toast msg={toast} G={G}/>}

      {/* ── Link Parent picker modal ─────────────────────── */}
      {linkParentModal && (
        <LinkParentModal
          childMember={linkParentModal.childMember}
          members={members}
          G={G}
          showToast={showToast}
          onClose={() => setLinkParentModal(null)}
          onLink={(parent) => {
            const child = linkParentModal.childMember;
            const updated = members.map(x => {
              if (x.id === parent.id) {
                return { ...x, children: [...new Set([...(x.children || []), child.id])], memberType: "parent" };
              }
              if (x.id === child.id) {
                return { ...x, parentId: parent.id, parentName: parent.name };
              }
              return x;
            });
            saveMembers(updated);
            if (selMember && selMember.id === child.id) {
              setSelMember({ ...child, parentId: parent.id, parentName: parent.name });
            }
            logAction("member", `Linked child ${child.name} to parent ${parent.name}`);
            showToast(`${child.name} linked to ${parent.name} ✓`);
            setLinkParentModal(null);
          }}
          onCreateAndLink={(newParent) => {
            const child = linkParentModal.childMember;
            const updated = [
              ...members.map(x =>
                x.id === child.id
                  ? { ...x, parentId: newParent.id, parentName: newParent.name }
                  : x
              ),
              newParent,
            ];
            saveMembers(updated);
            if (selMember && selMember.id === child.id) {
              setSelMember({ ...child, parentId: newParent.id, parentName: newParent.name });
            }
            logAction("member", `Created parent ${newParent.name} and linked child ${child.name}`);
            showToast(`${child.name} linked to new parent ${newParent.name} ✓`);
            setLinkParentModal(null);
          }}
        />
      )}

      {/* ── Link Child picker modal ─────────────────────── */}
      {linkChildModal && (
        <LinkChildModal
          parentMember={linkChildModal.parentMember}
          members={members}
          teams={teams}
          G={G}
          onClose={() => setLinkChildModal(null)}
          onLink={(child) => {
            const parent = linkChildModal.parentMember;
            const updated = members.map(x => {
              if (x.id === parent.id) {
                return { ...x, children: [...new Set([...(x.children || []), child.id])], memberType: "parent" };
              }
              if (x.id === child.id) {
                return { ...x, parentId: parent.id, parentName: parent.name };
              }
              return x;
            });
            saveMembers(updated);
            if (selMember && selMember.id === parent.id) {
              setSelMember({
                ...parent,
                children: [...new Set([...(parent.children || []), child.id])],
                memberType: "parent",
              });
            }
            logAction("member", `Linked child ${child.name} to parent ${parent.name}`);
            showToast(`${child.name} linked to ${parent.name} ✓`);
            setLinkChildModal(null);
          }}
          onCreateAndLink={(newChild) => {
            const parent = linkChildModal.parentMember;
            const updated = [
              ...members.map(x =>
                x.id === parent.id
                  ? {
                      ...x,
                      children: [...new Set([...(x.children || []), newChild.id])],
                      memberType: "parent",
                    }
                  : x
              ),
              newChild,
            ];
            saveMembers(updated);
            if (selMember && selMember.id === parent.id) {
              setSelMember({
                ...parent,
                children: [...new Set([...(parent.children || []), newChild.id])],
                memberType: "parent",
              });
            }
            logAction("member", `Created child ${newChild.name} and linked to parent ${parent.name}`);
            showToast(`${newChild.name} created and linked ✓`);
            setLinkChildModal(null);
          }}
        />
      )}

      {/* ── Assign-duty modal ──────────────────────────────── */}
      {assignDutyModal && (
        <AssignDutyModal
          session={assignDutyModal.session}
          sessionTeam={assignDutyModal.sessionTeam}
          role={assignDutyModal.role}
          roleLabel={assignDutyModal.roleLabel}
          members={members}
          sessions={sessions}
          teams={teams}
          currentUser={currentUser}
          parentDutyConfig={parentDutyConfig}
          G={G}
          showToast={showToast}
          onClose={() => setAssignDutyModal(null)}
          onAssign={(parent) => {
            const { session: s, sessionTeam, role, roleLabel } = assignDutyModal;
            const fresh = sessions.find(x => x.id === s.id) || s;
            const existing = getSupportParents(fresh);
            const slots = getSlotCount(fresh, parentDutyConfig);
            if (existing.length >= slots) {
              showToast("All slots already filled");
              return false;
            }
            if (existing.some(sp => sp.memberId === parent.id && sp.role === role)) {
              showToast(`${parent.name.split(" ")[0]} is already on this duty`);
              return false;
            }
            const newEntry = {
              memberId: parent.id,
              memberName: parent.name,
              role,
              roleLabel,
              unlinked: false,
              assignedBy: currentUser?.name || "admin",
              assignedAt: new Date().toISOString(),
            };
            const updated = setSupportParents(fresh, [...existing, newEntry]);
            saveSessions(sessions.map(x => x.id === fresh.id ? updated : x));
            logAction("duty",
              `Admin assigned ${parent.name} to ${roleLabel} for ${sessionTeam} ${s.date}` +
              (currentUser?.name ? ` (by ${currentUser.name})` : "")
            );
            return true;
          }}
        />
      )}

      {/* ── Invite code modal ────────────────────────────── */}
      {codeModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
          zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:G.white,borderRadius:16,padding:28,maxWidth:340,
            width:"100%",boxShadow:"0 8px 40px rgba(0,0,0,0.22)"}}>
            <div style={{fontSize:26,marginBottom:8,textAlign:"center"}}>🎟️</div>
            <div style={{fontWeight:900,fontSize:17,color:G.text,marginBottom:4,textAlign:"center"}}>
              Access code for {codeModal.name.split(" ")[0]}
            </div>
            <div style={{color:G.muted,fontSize:12,marginBottom:20,textAlign:"center",lineHeight:1.5}}>
              Share this code with {codeModal.name.split(" ")[0]} so they can log in and set their PIN.
              It can only be used once.
            </div>
            {/* Big code display */}
            <div style={{background:G.cream,border:`2px dashed ${G.green}`,borderRadius:12,
              padding:"18px 20px",marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:800,color:G.muted,letterSpacing:1.5,
                textTransform:"uppercase",marginBottom:6}}>Invite Code</div>
              <div style={{fontSize:28,fontWeight:900,color:G.green,letterSpacing:6,
                fontFamily:"monospace"}}>
                {codeModal.code}
              </div>
            </div>
            {/* Copy button */}
            <button onClick={()=>{
                navigator.clipboard.writeText(codeModal.code).then(()=>{
                  showToast("✓ Code copied to clipboard");
                }).catch(()=>{
                  showToast("Select the code above and copy manually");
                });
              }}
              style={{width:"100%",background:G.green,color:G.lime,border:"none",
                borderRadius:10,padding:"12px",fontSize:14,fontWeight:800,
                cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
              📋 Copy code
            </button>
            <button onClick={()=>setCodeModal(null)}
              style={{width:"100%",background:"transparent",color:G.muted,
                border:`1.5px solid ${G.border}`,borderRadius:10,padding:"11px",
                fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",
          zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:G.white,borderRadius:16,padding:28,maxWidth:340,width:"100%",
            boxShadow:"0 8px 40px rgba(0,0,0,0.18)"}}>
            <div style={{fontSize:22,marginBottom:8}}>🗑️</div>
            <div style={{fontWeight:900,fontSize:17,color:G.text,marginBottom:8}}>
              Remove member?
            </div>
            <div style={{color:G.muted,fontSize:14,marginBottom:6}}>
              You're about to permanently remove:
            </div>
            <div style={{fontWeight:800,fontSize:16,color:G.green,marginBottom:6}}>
              {confirmDelete.name}
            </div>
            <div style={{color:"#b91c1c",fontSize:13,marginBottom:22,
              background:G.redBg,borderRadius:8,padding:"10px 12px"}}>
              ⚠️ This cannot be undone. All their session history will remain but they will no longer appear in the member list.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button type="button"
                onClick={()=>setConfirmDelete(null)}
                style={{flex:1,padding:"11px 0",borderRadius:10,border:`1.5px solid ${G.border}`,
                  background:G.cream,color:G.text,fontWeight:800,fontSize:14,
                  cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
              <button type="button"
                onClick={()=>removeMember(confirmDelete.id)}
                style={{flex:1,padding:"11px 0",borderRadius:10,border:"none",
                  background:"#dc2626",color:"#fff",fontWeight:800,fontSize:14,
                  cursor:"pointer",fontFamily:"inherit"}}>
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
