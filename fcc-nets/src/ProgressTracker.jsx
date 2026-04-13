import React, { useState, useEffect, useMemo } from "react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
// FCC brand colors + progress-specific palette
const PT = {
  // Core brand
  navy: "#1B2A5C",
  gold: "#D4A217",
  lime: "#E8FFE8",
  green: "#14532d",
  white: "#FFFFFF",
  
  // Backgrounds
  bg: "#F8FAFC",
  card: "#FFFFFF",
  cream: "#FBF6E6",
  
  // Text
  text: "#1e293b",
  muted: "#64748b",
  subtle: "#94a3b8",
  
  // Skill level colors (1-4 scale)
  skill1: { bg: "#FEE2E2", text: "#991B1B", label: "Developing" },
  skill2: { bg: "#FEF3C7", text: "#92400E", label: "Emerging" },
  skill3: { bg: "#DBEAFE", text: "#1E40AF", label: "Competent" },
  skill4: { bg: "#1B2A5C", text: "#FFFFFF", label: "Proficient" },
  
  // Status
  success: "#16a34a",
  successBg: "#dcfce7",
  successText: "#166534",
  warning: "#f59e0b",
  error: "#dc2626",
  errorBg: "#fee2e2",
  errorText: "#991b1b",
  
  // Borders & shadows
  border: "#e2e8f0",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowLg: "0 4px 12px rgba(0,0,0,0.1)",
};

// ─── Pillar Definitions (5 Skills) ────────────────────────────────────────────
const PILLARS = [
  { id: "batting", name: "Batting", icon: "🏏", color: "#3B82F6" },
  { id: "bowling", name: "Bowling", icon: "🏐", color: "#EF4444" },
  { id: "fielding", name: "Fielding", icon: "🤲", color: "#22C55E" },
  { id: "wicketKeeping", name: "Wicket Keeping", icon: "🧤", color: "#8B5CF6" },
  { id: "cricketIQ", name: "Cricket IQ", icon: "🧠", color: "#F59E0B" },
];

// ─── Phase Definitions ────────────────────────────────────────────────────────
const PHASES = [
  { id: "pre", name: "Pre", short: "Pre", desc: "Initial assessment" },
  { id: "phase1", name: "Phase 1", short: "Ph1", desc: "Foundation skills" },
  { id: "phase2", name: "Phase 2", short: "Ph2", desc: "Development" },
  { id: "phase3", name: "Phase 3", short: "Ph3", desc: "Refinement" },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────
const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

const getSkillStyle = (level) => {
  if (level === 4) return PT.skill4;
  if (level === 3) return PT.skill3;
  if (level === 2) return PT.skill2;
  return PT.skill1;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const formatDateFull = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

// ─── Radar Chart Component ────────────────────────────────────────────────────
// SVG radar chart showing skill levels across all 5 pillars
function RadarChart({ data, size = 200, showLabels = true }) {
  const center = size / 2;
  const radius = (size / 2) - (showLabels ? 35 : 15);
  const levels = 4; // 1-4 skill scale
  
  // Calculate points for each pillar (5 points = pentagon)
  const angleStep = (2 * Math.PI) / PILLARS.length;
  const startAngle = -Math.PI / 2; // Start from top
  
  const getPoint = (index, value) => {
    const angle = startAngle + (index * angleStep);
    const r = (value / levels) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };
  
  // Background grid (pentagon shapes)
  const gridLines = [];
  for (let l = 1; l <= levels; l++) {
    const r = (l / levels) * radius;
    const points = PILLARS.map((_, i) => {
      const angle = startAngle + (i * angleStep);
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(" ");
    gridLines.push(
      <polygon
        key={`grid-${l}`}
        points={points}
        fill="none"
        stroke={PT.border}
        strokeWidth={l === levels ? 1.5 : 0.5}
        opacity={0.6}
      />
    );
  }
  
  // Axis lines
  const axes = PILLARS.map((_, i) => {
    const angle = startAngle + (i * angleStep);
    return (
      <line
        key={`axis-${i}`}
        x1={center}
        y1={center}
        x2={center + radius * Math.cos(angle)}
        y2={center + radius * Math.sin(angle)}
        stroke={PT.border}
        strokeWidth={0.5}
      />
    );
  });
  
  // Data polygon
  const dataPoints = PILLARS.map((p, i) => {
    const value = data[p.id] || 0;
    const point = getPoint(i, value);
    return `${point.x},${point.y}`;
  }).join(" ");
  
  // Labels
  const labels = showLabels ? PILLARS.map((p, i) => {
    const angle = startAngle + (i * angleStep);
    const labelR = radius + 22;
    const x = center + labelR * Math.cos(angle);
    const y = center + labelR * Math.sin(angle);
    const value = data[p.id] || 0;
    
    return (
      <g key={`label-${i}`}>
        <text
          x={x}
          y={y - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
        >
          {p.icon}
        </text>
        <text
          x={x}
          y={y + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fill={PT.muted}
        >
          {value > 0 ? value : "—"}
        </text>
      </g>
    );
  }) : null;
  
  // Data points dots
  const dots = PILLARS.map((p, i) => {
    const value = data[p.id] || 0;
    if (value === 0) return null;
    const point = getPoint(i, value);
    return (
      <circle
        key={`dot-${i}`}
        cx={point.x}
        cy={point.y}
        r={4}
        fill={PT.navy}
        stroke={PT.white}
        strokeWidth={2}
      />
    );
  });
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={PT.navy} stopOpacity="0.3" />
          <stop offset="100%" stopColor={PT.gold} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {gridLines}
      {axes}
      <polygon
        points={dataPoints}
        fill="url(#radarFill)"
        stroke={PT.navy}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dots}
      {labels}
    </svg>
  );
}

// ─── Progress Timeline Component ──────────────────────────────────────────────
// Horizontal timeline showing skill progression through phases
function ProgressTimeline({ snapshots, currentPhase, pillar, compact = false }) {
  const pillarData = PILLARS.find(p => p.id === pillar);
  
  return (
    <div style={{ marginBottom: compact ? 8 : 12 }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 6, 
        marginBottom: compact ? 4 : 6,
      }}>
        <span style={{ fontSize: compact ? 12 : 14 }}>{pillarData?.icon}</span>
        <span style={{ 
          fontSize: compact ? 11 : 12, 
          fontWeight: 600, 
          color: PT.text,
          minWidth: compact ? 85 : 100,
        }}>
          {pillarData?.name}
        </span>
      </div>
      
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: compact ? 2 : 4,
        padding: compact ? "4px 0" : "6px 0",
      }}>
        {PHASES.map((phase, idx) => {
          const value = snapshots?.[phase.id]?.[pillar] || 0;
          const isCurrent = phase.id === currentPhase;
          const style = value > 0 ? getSkillStyle(value) : { bg: PT.bg, text: PT.subtle };
          
          return (
            <React.Fragment key={phase.id}>
              {/* Phase node */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
              }}>
                <div style={{
                  width: compact ? 28 : 32,
                  height: compact ? 28 : 32,
                  borderRadius: "50%",
                  background: style.bg,
                  color: style.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: compact ? 11 : 13,
                  fontWeight: 700,
                  border: isCurrent ? `2px solid ${PT.gold}` : "2px solid transparent",
                  boxShadow: isCurrent ? `0 0 0 2px ${PT.cream}` : "none",
                  transition: "all 0.2s ease",
                }}>
                  {value > 0 ? value : "—"}
                </div>
                <span style={{
                  fontSize: compact ? 8 : 9,
                  color: isCurrent ? PT.gold : PT.muted,
                  fontWeight: isCurrent ? 700 : 500,
                  marginTop: compact ? 2 : 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}>
                  {phase.short}
                </span>
              </div>
              
              {/* Connector line */}
              {idx < PHASES.length - 1 && (
                <div style={{
                  flex: compact ? 0.3 : 0.4,
                  height: 2,
                  background: snapshots?.[PHASES[idx + 1].id]?.[pillar] > 0 
                    ? PT.navy 
                    : PT.border,
                  marginBottom: compact ? 14 : 16,
                  borderRadius: 1,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Attendance Ring Component ────────────────────────────────────────────────
function AttendanceRing({ attended, total, size = 60 }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? attended / total : 0;
  const offset = circumference - (progress * circumference);
  const percentage = Math.round(progress * 100);
  
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={PT.border}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percentage >= 80 ? PT.success : percentage >= 60 ? PT.warning : PT.error}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: PT.text }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// ─── Skill Badge Component (Improved with name visible) ───────────────────────
function SkillBadge({ level, pillar, showName = true }) {
  const pillarData = PILLARS.find(p => p.id === pillar);
  const style = level > 0 ? getSkillStyle(level) : { bg: PT.bg, text: PT.subtle, label: "Not rated" };
  
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 10,
      background: style.bg,
      color: style.text,
    }}>
      <span style={{ fontSize: 16 }}>{pillarData?.icon}</span>
      {showName && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ 
            fontSize: 10, 
            opacity: 0.8,
            lineHeight: 1,
          }}>
            {pillarData?.name}
          </span>
          <span style={{ 
            fontSize: 12, 
            fontWeight: 600,
            lineHeight: 1.2,
          }}>
            {style.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Note Card Component ──────────────────────────────────────────────────────
function NoteCard({ note, compact = false }) {
  return (
    <div style={{
      background: PT.card,
      border: `1px solid ${PT.border}`,
      borderRadius: 10,
      padding: compact ? "10px 12px" : "14px 16px",
      marginBottom: compact ? 8 : 12,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: PT.navy,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          {note.coach}
        </span>
        <span style={{
          fontSize: 10,
          color: PT.subtle,
        }}>
          {formatDate(note.date)}
        </span>
      </div>
      <p style={{
        fontSize: compact ? 12 : 13,
        color: PT.text,
        lineHeight: 1.5,
        margin: 0,
      }}>
        "{note.text}"
      </p>
      {note.pillar && !compact && (
        <div style={{ marginTop: 8 }}>
          <SkillBadge level={0} pillar={note.pillar} showName={false} />
        </div>
      )}
    </div>
  );
}

// ─── Player Avatar Component ──────────────────────────────────────────────────
function PlayerAvatar({ name, size = 40, color }) {
  const bgColor = color || PT.navy;
  
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: bgColor,
      color: PT.white,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.32,
      fontWeight: 700,
      flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Attendance Toggle Button ─────────────────────────────────────────────────
function AttendanceToggle({ isPresent, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: isPresent === null 
          ? `2px solid ${PT.border}` 
          : "none",
        background: isPresent === true 
          ? PT.success 
          : isPresent === false 
            ? PT.error 
            : "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s ease",
      }}
    >
      {isPresent === true && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {isPresent === false && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

// ─── Session Item (Draggable) ─────────────────────────────────────────────────
function SessionItem({ session, onDragStart, onDragOver, onDrop, onEdit }) {
  const pillarData = PILLARS.find(p => p.id === session.pillar);
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, session)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, session); }}
      onDrop={(e) => onDrop?.(e, session)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        background: PT.bg,
        border: `1px solid ${PT.border}`,
        borderRadius: 10,
        marginBottom: 8,
        cursor: "grab",
        transition: "background 0.15s",
      }}
    >
      <span style={{ color: PT.subtle, fontSize: 16, cursor: "grab" }}>≡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: PT.text }}>
          {session.title}
        </div>
        <div style={{ fontSize: 11, color: PT.muted, marginTop: 2 }}>
          {session.week} · {formatDateFull(session.date)}
        </div>
      </div>
      <span style={{ fontSize: 18 }}>{pillarData?.icon || "📋"}</span>
      <button
        onClick={() => onEdit?.(session)}
        style={{
          background: "transparent",
          border: `1px solid ${PT.border}`,
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 10,
          color: PT.muted,
          cursor: "pointer",
        }}
      >
        Edit
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 1: Mark Attendance
// ═══════════════════════════════════════════════════════════════════════════════
function MarkAttendance({ 
  session, 
  players, 
  attendance, 
  onToggleAttendance,
  onSaveAttendance,
  onSelectPlayer,
}) {
  const presentCount = Object.values(attendance).filter(v => v === true).length;
  const totalCount = players.length;
  
  return (
    <div style={{ padding: "12px 16px" }}>
      {/* Session focus */}
      {session?.focus && (
        <div style={{
          background: PT.cream,
          borderLeft: `3px solid ${PT.gold}`,
          borderRadius: "0 10px 10px 0",
          padding: "10px 14px",
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#7A5500",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 3,
          }}>
            Phase Focus Goal
          </div>
          <div style={{ fontSize: 12, color: "#412402" }}>
            {session.focus}
          </div>
        </div>
      )}
      
      {/* Player list */}
      <div style={{
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 16,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: PT.subtle,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            Players · tap name for progress
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: PT.success,
          }}>
            {presentCount}/{totalCount} present
          </span>
        </div>
        
        {players.map((player, idx) => {
          const isPresent = attendance[player.id];
          
          return (
            <div
              key={player.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: idx < players.length - 1 ? `1px solid ${PT.border}` : "none",
                opacity: isPresent === false ? 0.6 : 1,
              }}
            >
              <AttendanceToggle
                isPresent={isPresent}
                onToggle={() => {
                  // Cycle: null -> true -> false -> null
                  const next = isPresent === null ? true : isPresent === true ? false : null;
                  onToggleAttendance(player.id, next);
                }}
              />
              
              <PlayerAvatar 
                name={player.name} 
                size={38} 
                color={isPresent === false ? "#888" : player.avatarColor}
              />
              
              <div 
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => onSelectPlayer?.(player)}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: PT.text }}>
                  {player.name}
                </div>
                {player.lastNote && (
                  <div style={{ fontSize: 11, color: PT.muted, marginTop: 2 }}>
                    {player.lastNote}
                  </div>
                )}
              </div>
              
              <span style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 12,
                background: isPresent === true ? PT.successBg : isPresent === false ? PT.errorBg : PT.bg,
                color: isPresent === true ? PT.successText : isPresent === false ? PT.errorText : PT.muted,
                fontWeight: 500,
              }}>
                {isPresent === true ? "Present" : isPresent === false ? "Absent" : "—"}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Save button */}
      <button
        onClick={() => onSaveAttendance?.(attendance)}
        style={{
          width: "100%",
          padding: "14px",
          background: PT.navy,
          color: PT.white,
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Save attendance
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 2: Training Plan (Editable)
// ═══════════════════════════════════════════════════════════════════════════════
function TrainingPlan({ 
  sessions, 
  currentPhase,
  onReorder,
  onAddSession,
  onEditSession,
}) {
  const [draggedSession, setDraggedSession] = useState(null);
  
  const handleDragStart = (e, session) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const handleDragOver = (e, session) => {
    e.preventDefault();
  };
  
  const handleDrop = (e, targetSession) => {
    e.preventDefault();
    if (draggedSession && draggedSession.id !== targetSession.id) {
      onReorder?.(draggedSession.id, targetSession.id);
    }
    setDraggedSession(null);
  };
  
  return (
    <div style={{ padding: "12px 16px" }}>
      {/* Phase info */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: PT.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Current Phase
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: PT.text, marginTop: 2 }}>
            {currentPhase || "Phase 2"}
          </div>
        </div>
        <button
          onClick={onAddSession}
          style={{
            background: PT.navy,
            color: PT.white,
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          + Add session
        </button>
      </div>
      
      {/* Session list */}
      <div style={{
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: PT.subtle,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 12,
        }}>
          Upcoming sessions · drag to reorder
        </div>
        
        {sessions.map(session => (
          <SessionItem
            key={session.id}
            session={session}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onEdit={onEditSession}
          />
        ))}
      </div>
      
      <div style={{
        fontSize: 11,
        color: PT.muted,
        textAlign: "center",
        padding: "8px",
      }}>
        Drag sessions to reorder · Tap "Edit" to change details
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 3: Quick Note Entry
// ═══════════════════════════════════════════════════════════════════════════════
function QuickNoteEntry({ 
  player, 
  phaseFocus, 
  lastNote, 
  onSave, 
  onBack,
}) {
  const [noteText, setNoteText] = useState("");
  const [selectedPillar, setSelectedPillar] = useState(null);
  
  const handleSave = () => {
    if (!noteText.trim()) return;
    onSave({
      playerId: player.id,
      text: noteText.trim(),
      pillar: selectedPillar,
      date: new Date().toISOString(),
    });
    setNoteText("");
    setSelectedPillar(null);
  };
  
  return (
    <div style={{ padding: "12px 16px" }}>
      {/* Header */}
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: PT.subtle,
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        marginBottom: 10,
      }}>
        Logging note for
      </div>
      
      {/* Player card */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 12,
        marginBottom: 16,
      }}>
        <PlayerAvatar 
          name={player.name} 
          size={44} 
          color={player.avatarColor}
        />
        <div>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: PT.text,
          }}>
            {player.name}
          </div>
          <div style={{
            fontSize: 11,
            color: PT.muted,
            marginTop: 2,
          }}>
            {player.phase || "Phase 1"} · {player.sessionsAttended || 0} sessions attended
          </div>
        </div>
      </div>
      
      {/* Phase focus */}
      {phaseFocus && (
        <div style={{
          background: PT.cream,
          borderLeft: `3px solid ${PT.gold}`,
          borderRadius: "0 10px 10px 0",
          padding: "10px 14px",
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#7A5500",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 3,
          }}>
            Phase Focus Goal
          </div>
          <div style={{
            fontSize: 12,
            color: "#412402",
          }}>
            {phaseFocus}
          </div>
        </div>
      )}
      
      {/* Last note */}
      {lastNote && (
        <div style={{
          background: PT.card,
          border: `1px solid ${PT.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 16,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: PT.subtle,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Last Note
            </span>
            <span style={{
              fontSize: 10,
              color: PT.subtle,
            }}>
              {formatDate(lastNote.date)}
            </span>
          </div>
          <p style={{
            fontSize: 12,
            color: PT.muted,
            lineHeight: 1.5,
            margin: 0,
          }}>
            "{lastNote.text}"
          </p>
        </div>
      )}
      
      {/* Pillar selector */}
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: PT.text,
        marginBottom: 8,
      }}>
        Tag a skill area (optional)
      </div>
      <div style={{
        display: "flex",
        gap: 6,
        marginBottom: 16,
        flexWrap: "wrap",
      }}>
        {PILLARS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPillar(selectedPillar === p.id ? null : p.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 16,
              border: selectedPillar === p.id 
                ? `2px solid ${PT.navy}` 
                : `1px solid ${PT.border}`,
              background: selectedPillar === p.id ? PT.navy : PT.card,
              color: selectedPillar === p.id ? PT.white : PT.text,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {p.icon} {p.name}
          </button>
        ))}
      </div>
      
      {/* Note input */}
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: PT.text,
        marginBottom: 8,
      }}>
        Today's observation
      </div>
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="What did you notice today?"
        style={{
          width: "100%",
          minHeight: 100,
          padding: "12px 14px",
          border: `2px solid ${PT.navy}`,
          borderRadius: 12,
          fontSize: 14,
          fontFamily: "inherit",
          resize: "vertical",
          outline: "none",
          marginBottom: 16,
          boxSizing: "border-box",
        }}
      />
      
      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!noteText.trim()}
        style={{
          width: "100%",
          padding: "14px",
          background: noteText.trim() ? PT.navy : PT.border,
          color: noteText.trim() ? PT.white : PT.muted,
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: noteText.trim() ? "pointer" : "not-allowed",
          fontFamily: "inherit",
        }}
      >
        Save Note
      </button>
      
      <div style={{
        textAlign: "center",
        fontSize: 11,
        color: PT.subtle,
        marginTop: 10,
      }}>
        or hold to voice record 🎤
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 4: Player Progress Card (Coach View) - All 5 Skills
// ═══════════════════════════════════════════════════════════════════════════════
function PlayerProgressCard({ player, snapshots, notes, currentPhase }) {
  // Calculate current skill levels from most recent phase
  const currentSkills = useMemo(() => {
    if (!snapshots || !currentPhase) return {};
    return snapshots[currentPhase] || {};
  }, [snapshots, currentPhase]);
  
  return (
    <div style={{ padding: "12px 16px" }}>
      {/* Player header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px",
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 14,
        marginBottom: 16,
      }}>
        <PlayerAvatar 
          name={player.name} 
          size={50} 
          color={player.avatarColor}
        />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: PT.text,
          }}>
            {player.name}
          </div>
          <div style={{
            fontSize: 12,
            color: PT.muted,
            marginTop: 3,
          }}>
            {player.team || "U11"} · Season 2026 · Focus: {player.focus || "All-round"}
          </div>
        </div>
      </div>
      
      {/* Two-column layout: Radar + Attendance */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 16,
      }}>
        {/* Radar chart */}
        <div style={{
          background: PT.card,
          border: `1px solid ${PT.border}`,
          borderRadius: 14,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: PT.subtle,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 8,
            alignSelf: "flex-start",
          }}>
            Skill Profile
          </div>
          <RadarChart data={currentSkills} size={160} />
        </div>
        
        {/* Attendance */}
        <div style={{
          background: PT.card,
          border: `1px solid ${PT.border}`,
          borderRadius: 14,
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: PT.subtle,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 10,
            alignSelf: "flex-start",
          }}>
            Attendance
          </div>
          <AttendanceRing 
            attended={player.sessionsAttended || 13} 
            total={player.sessionsTotal || 18} 
            size={70}
          />
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: PT.text,
            marginTop: 8,
          }}>
            {player.sessionsAttended || 13}/{player.sessionsTotal || 18}
          </div>
          <div style={{
            fontSize: 10,
            color: PT.muted,
          }}>
            sessions
          </div>
        </div>
      </div>
      
      {/* Current skill levels with names */}
      <div style={{
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: PT.subtle,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 12,
        }}>
          Current Skill Levels
        </div>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}>
          {PILLARS.map(pillar => (
            <SkillBadge 
              key={pillar.id}
              level={currentSkills[pillar.id] || 0} 
              pillar={pillar.id}
              showName={true}
            />
          ))}
        </div>
      </div>
      
      {/* Phase snapshots - ALL 5 SKILLS */}
      <div style={{
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 16,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: PT.subtle,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            Phase Snapshots — All 5 Skills
          </div>
          <div style={{
            fontSize: 9,
            color: PT.subtle,
            fontStyle: "italic",
          }}>
            Coach view only
          </div>
        </div>
        
        {PILLARS.map(pillar => (
          <ProgressTimeline
            key={pillar.id}
            snapshots={snapshots}
            currentPhase={currentPhase}
            pillar={pillar.id}
            compact={true}
          />
        ))}
        
        <div style={{
          fontSize: 9,
          color: PT.subtle,
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${PT.border}`,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            border: `2px solid ${PT.gold}`,
          }} />
          Gold ring = current phase
        </div>
      </div>
      
      {/* Recent notes */}
      <div style={{
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 14,
        padding: "14px 16px",
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: PT.subtle,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 12,
        }}>
          Recent Observations
        </div>
        
        {notes && notes.length > 0 ? (
          notes.slice(0, 3).map((note, idx) => (
            <NoteCard key={idx} note={note} compact />
          ))
        ) : (
          <div style={{
            fontSize: 13,
            color: PT.subtle,
            fontStyle: "italic",
            padding: "20px 0",
            textAlign: "center",
          }}>
            No notes recorded yet
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 5: Season Report (Parent View)
// ═══════════════════════════════════════════════════════════════════════════════
function SeasonReport({ player, report }) {
  return (
    <div style={{ padding: "12px 16px" }}>
      {/* Hero header */}
      <div style={{
        background: PT.navy,
        borderRadius: 16,
        padding: "24px 20px",
        textAlign: "center",
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "1px",
          color: "rgba(255,255,255,0.5)",
          marginBottom: 6,
        }}>
          Season 2026 · End of Season Report
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: PT.white,
          marginBottom: 8,
        }}>
          {player.name}
        </div>
        <span style={{
          display: "inline-block",
          background: PT.gold,
          color: "#412402",
          fontSize: 11,
          fontWeight: 700,
          padding: "4px 12px",
          borderRadius: 12,
        }}>
          {player.team || "U11"}
        </span>
      </div>
      
      {/* What they worked on */}
      <div style={{
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 14,
        padding: "16px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: PT.subtle,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 8,
        }}>
          What {player.name.split(" ")[0]} worked on this season
        </div>
        <p style={{
          fontSize: 14,
          color: PT.text,
          lineHeight: 1.6,
          margin: 0,
        }}>
          {report?.summary || `${player.name.split(" ")[0]} came into 2026 eager to develop all aspects of their game. Over the season, we focused on building solid fundamentals and growing their confidence in match situations.`}
        </p>
      </div>
      
      {/* Highlight quote */}
      {(report?.highlight || true) && (
        <div style={{
          background: "#EEF1F8",
          borderLeft: `4px solid ${PT.navy}`,
          borderRadius: "0 14px 14px 0",
          padding: "14px 16px",
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#3D4F7A",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 6,
          }}>
            A Moment from This Season
          </div>
          <p style={{
            fontSize: 14,
            color: PT.navy,
            fontStyle: "italic",
            lineHeight: 1.5,
            margin: 0,
          }}>
            "{report?.highlight || "Remembered to shorten the run-up and landed the ball in a good length three times in a row — a real breakthrough moment."}"
          </p>
        </div>
      )}
      
      {/* What we saw grow */}
      <div style={{
        background: PT.card,
        border: `1px solid ${PT.border}`,
        borderRadius: 14,
        padding: "16px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: PT.subtle,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 8,
        }}>
          One Thing We Saw Grow
        </div>
        <p style={{
          fontSize: 14,
          color: PT.text,
          lineHeight: 1.6,
          margin: 0,
        }}>
          {report?.growth || `${player.name.split(" ")[0]}'s confidence in their own decisions. They stopped looking to coaches for approval mid-action and started trusting their instincts — exactly what we want to see.`}
        </p>
      </div>
      
      {/* Focus for next season */}
      <div style={{
        background: PT.cream,
        border: `1px solid ${PT.gold}`,
        borderRadius: 14,
        padding: "16px",
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#7A5500",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 8,
        }}>
          Focus for Next Season
        </div>
        <p style={{
          fontSize: 14,
          color: "#412402",
          lineHeight: 1.6,
          margin: 0,
        }}>
          {report?.nextFocus || `Continuing to build on this season's progress. With another year of focused development, ${player.name.split(" ")[0]} has real potential to grow into a confident all-round cricketer.`}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PROGRESS TRACKER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProgressTracker({
  session,
  players,
  trainingSessions,
  currentUser,
  userRole,
  onBack,
  onSaveNote,
  onSaveAttendance,
  onSaveRating,
  onReorderSessions,
  onAddSession,
  onEditSession,
}) {
  const [activeScreen, setActiveScreen] = useState("attendance"); // attendance | plan | note | progress | report
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [attendance, setAttendance] = useState({});
  
  // Initialize attendance from session data
  useEffect(() => {
    if (session?.attendance) {
      setAttendance(session.attendance);
    } else if (players) {
      // Default all to null (not marked)
      const initial = {};
      players.forEach(p => { initial[p.id] = null; });
      setAttendance(initial);
    }
  }, [session, players]);
  
  const isCoach = userRole === "admin" || userRole === "coach";
  
  const handleToggleAttendance = (playerId, value) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: value,
    }));
  };
  
  const handleSaveAttendance = (att) => {
    onSaveAttendance?.(att);
  };
  
  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
    setActiveScreen("progress");
  };
  
  const handleSaveNote = (note) => {
    onSaveNote?.(note);
    setActiveScreen("attendance");
    setSelectedPlayer(null);
  };
  
  // Screen titles
  const screenTitles = {
    attendance: { title: session?.name || "U11 Session", sub: "Mark Attendance" },
    plan: { title: "Training Plan", sub: session?.phase || "Phase 2" },
    note: { title: "Quick Note", sub: selectedPlayer?.name },
    progress: { title: "Player Progress", sub: selectedPlayer?.name || "Coach View" },
    report: { title: "Season Report", sub: "Parent View" },
  };
  
  const currentTitle = screenTitles[activeScreen];
  
  // Default training sessions for demo
  const defaultTrainingSessions = trainingSessions || [
    { id: "s1", title: "Bowling — Line & Length", pillar: "bowling", week: "Week 6", date: "2026-01-17" },
    { id: "s2", title: "Batting — Front foot drives", pillar: "batting", week: "Week 7", date: "2026-01-24" },
    { id: "s3", title: "Wicket Keeping — Stance & take", pillar: "wicketKeeping", week: "Week 8", date: "2026-01-31" },
    { id: "s4", title: "Fielding — Catching drills", pillar: "fielding", week: "Week 9", date: "2026-02-07" },
    { id: "s5", title: "Cricket IQ — Game scenarios", pillar: "cricketIQ", week: "Week 10", date: "2026-02-14" },
  ];
  
  return (
    <div style={{
      minHeight: "100vh",
      background: PT.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: PT.navy,
        padding: "12px 16px 14px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <button
            onClick={() => {
              if (activeScreen === "attendance" || activeScreen === "plan") {
                onBack?.();
              } else {
                setActiveScreen("attendance");
                setSelectedPlayer(null);
              }
            }}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              color: PT.white,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ← Back
          </button>
          
          {session?.phase && (
            <div style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: "4px 12px",
              fontSize: 11,
              color: PT.white,
            }}>
              {session.phase}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontSize: 17,
            fontWeight: 600,
            color: PT.white,
          }}>
            {currentTitle.title}
          </div>
          <div style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            marginTop: 2,
          }}>
            {currentTitle.sub}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ paddingBottom: 90 }}>
        {activeScreen === "attendance" && (
          <MarkAttendance
            session={session}
            players={players || []}
            attendance={attendance}
            onToggleAttendance={handleToggleAttendance}
            onSaveAttendance={handleSaveAttendance}
            onSelectPlayer={handleSelectPlayer}
          />
        )}
        
        {activeScreen === "plan" && (
          <TrainingPlan
            sessions={defaultTrainingSessions}
            currentPhase={session?.phase || "Phase 2"}
            onReorder={onReorderSessions}
            onAddSession={onAddSession}
            onEditSession={onEditSession}
          />
        )}
        
        {activeScreen === "note" && selectedPlayer && (
          <QuickNoteEntry
            player={selectedPlayer}
            phaseFocus={selectedPlayer.phaseFocus || session?.focus}
            lastNote={selectedPlayer.notes?.[0]}
            onSave={handleSaveNote}
            onBack={() => {
              setActiveScreen("attendance");
              setSelectedPlayer(null);
            }}
          />
        )}
        
        {activeScreen === "progress" && selectedPlayer && (
          <PlayerProgressCard
            player={selectedPlayer}
            snapshots={selectedPlayer.snapshots}
            notes={selectedPlayer.notes}
            currentPhase={selectedPlayer.currentPhase || "phase2"}
          />
        )}
        
        {activeScreen === "report" && selectedPlayer && (
          <SeasonReport
            player={selectedPlayer}
            report={selectedPlayer.report}
          />
        )}
      </div>
      
      {/* Bottom navigation */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: PT.card,
        borderTop: `1px solid ${PT.border}`,
        display: "flex",
        justifyContent: "space-around",
        padding: "10px 0 20px",
        zIndex: 100,
      }}>
        {[
          { id: "attendance", icon: "✓", label: "Attendance" },
          { id: "plan", icon: "📅", label: "Plan" },
          { id: "note", icon: "✏️", label: "Log Note", needsPlayer: true },
          { id: "progress", icon: "📊", label: "Progress", coachOnly: true, needsPlayer: true },
          { id: "report", icon: "📄", label: "Report", needsPlayer: true },
        ].map(nav => {
          if (nav.coachOnly && !isCoach) return null;
          
          const isActive = activeScreen === nav.id;
          const isDisabled = nav.needsPlayer && !selectedPlayer;
          
          return (
            <button
              key={nav.id}
              onClick={() => {
                if (!isDisabled) {
                  if ((nav.id === "progress" || nav.id === "note" || nav.id === "report") && !selectedPlayer && players?.length > 0) {
                    // Auto-select first player if none selected
                    setSelectedPlayer(players[0]);
                  }
                  setActiveScreen(nav.id);
                }
              }}
              disabled={isDisabled}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                padding: "4px 10px",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.3 : 1,
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: isActive ? PT.navy : PT.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}>
                {nav.icon}
              </div>
              <span style={{
                fontSize: 9,
                color: isActive ? PT.navy : PT.muted,
                fontWeight: isActive ? 700 : 500,
              }}>
                {nav.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS FOR USE IN APP.JSX
// ═══════════════════════════════════════════════════════════════════════════════
export {
  RadarChart,
  AttendanceRing,
  SkillBadge,
  ProgressTimeline,
  NoteCard,
  PlayerAvatar,
  AttendanceToggle,
  SessionItem,
  MarkAttendance,
  TrainingPlan,
  QuickNoteEntry,
  PlayerProgressCard,
  SeasonReport,
  PILLARS,
  PHASES,
  PT as ProgressTrackerTheme,
};
