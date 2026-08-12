import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Trophy, Calendar, Clock, MapPin, Sparkles, Medal, Share2 } from "lucide-react";
import {
  C, GOLD, FCC_LOGO, INVITED, PUBLIC_POLL_MS, pluralize, deriveExtraClubs,
  ClubBadge, useCountdown, ScoreTile, Confetti, Tooltip,
} from "./ministaevneShared.jsx";

// Deterministic per-club scatter — FNV-1a hash of the club name seeds a
// mulberry32 PRNG, so every club always lands in the same spot on every
// reload (not re-randomized per render, and not dependent on how many
// other clubs are confirmed).
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clusterPosition(name) {
  const rng = mulberry32(hashString(name));
  const angle = rng() * Math.PI * 2;
  const radius = 24 + rng() * 21;
  const jitterX = (rng() - 0.5) * 8;
  const jitterY = (rng() - 0.5) * 8;
  const rotation = (rng() - 0.5) * 30;
  const x = 50 + Math.cos(angle) * radius + jitterX;
  const y = 50 + Math.sin(angle) * radius + jitterY;
  return { x: Math.max(9, Math.min(91, x)), y: Math.max(9, Math.min(91, y)), rotation };
}

function badgeSizeFor(players, isHost) {
  if (isHost) return 106;
  const p = Number(players) || 0;
  const size = 50 + Math.min(p, 20) * 1.45;
  return Math.round(Math.max(46, Math.min(size, 80)));
}

// Gentle, per-club drift so the cluster feels alive rather than pasted in
// place — amplitude/timing seeded off the name (salted differently from
// clusterPosition so the float direction isn't correlated with where the
// badge sits) so it's still stable across reloads, just not static.
function floatParamsFor(name, isHost) {
  const rng = mulberry32(hashString(name + "::float"));
  const amp = isHost ? 0.5 : 1;
  return {
    fx: (rng() - 0.5) * 16 * amp,
    fy: -(8 + rng() * 10) * amp,
    fr: (rng() - 0.5) * 6,
    duration: 3.4 + rng() * 2.6,
    delay: -(rng() * 4), // negative delay staggers starting phase, not just start time
  };
}

export default function MinistaevneLive() {
  const target = useMemo(() => new Date("2026-08-16T11:00:00+02:00").getTime(), []);
  const { d, h, m, s } = useCountdown(target);

  const [confirmedList, setConfirmedList] = useState([]);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState("");
  const [hovered, setHovered] = useState("");
  const [shareLabel, setShareLabel] = useState("Share");
  const knownNames = useRef(null); // null until first fetch resolves — guards the initial-load celebration

  const showToast = useCallback((msg, ms = 3200) => {
    setToast(msg);
    setTimeout(() => setToast(""), ms);
  }, []);

  const fetchPublicList = useCallback(async () => {
    try {
      const res = await fetch("/api/ministaevne-public");
      if (!res.ok) return;
      const json = await res.json();
      const list = json.registrations || [];
      const names = new Set(list.map((r) => r.clubName));

      if (knownNames.current) {
        const arrivals = [...names].filter((n) => !knownNames.current.has(n));
        if (arrivals.length > 0) {
          setBurst((b) => b + 1);
          showToast(arrivals.length === 1 ? `${arrivals[0]} just joined! 🏆` : `${arrivals.length} new clubs just joined! 🏆`);
        }
      }
      knownNames.current = names;
      setConfirmedList(list);
    } catch { /* keep last known list on transient network errors */ }
  }, [showToast]);

  useEffect(() => {
    fetchPublicList();
    const t = setInterval(fetchPublicList, PUBLIC_POLL_MS);
    return () => clearInterval(t);
  }, [fetchPublicList]);

  const extraClubs = useMemo(() => deriveExtraClubs(confirmedList), [confirmedList]);
  const registrationsByClub = useMemo(() => {
    const map = {};
    confirmedList.forEach((r) => { map[r.clubName] = r; });
    return map;
  }, [confirmedList]);

  const ALL_CLUBS = [...INVITED, ...extraClubs];
  const confirmedNames = new Set(confirmedList.map((r) => r.clubName));
  const confirmedClubs = ALL_CLUBS.filter((c) => confirmedNames.has(c.name));
  const teamsTotal = confirmedList.reduce((n, r) => n + (Number(r.teams) || 1), 0);
  const clubCount = confirmedClubs.length;

  const clusterClubs = useMemo(() => confirmedClubs.map((c) => {
    const r = registrationsByClub[c.name];
    const pos = c.host ? { x: 50, y: 50, rotation: 0 } : clusterPosition(c.name);
    const size = badgeSizeFor(r?.players, c.host);
    const float = floatParamsFor(c.name, c.host);
    return { ...c, ...pos, size, float, zIndex: c.host ? 1000 : Math.round(size) };
  }), [confirmedClubs, registrationsByClub]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  async function handleShare() {
    const shareData = {
      title: "U11 Ministævne — Fredensborg Cricket Club",
      text: "Follow along as clubs confirm for our first ever U11 Ministævne — Sun 16 Aug 2026.",
      url: shareUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled — no-op */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLabel("Link copied ✓");
      setTimeout(() => setShareLabel("Share"), 2200);
    } catch {
      showToast("Couldn't copy link — copy it from the address bar");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `
        radial-gradient(900px 500px at 15% 0%, rgba(240,180,41,0.10), transparent 60%),
        radial-gradient(900px 500px at 85% 0%, rgba(59,130,246,0.10), transparent 60%),
        radial-gradient(1000px 600px at 20% 60%, rgba(239,68,68,0.06), transparent 60%),
        radial-gradient(1000px 600px at 80% 75%, rgba(18,183,106,0.09), transparent 60%),
        linear-gradient(180deg, ${C.night2}, ${C.night})
      `,
      color: C.cream, fontFamily: "'Helvetica Neue', Arial, sans-serif", position: "relative", paddingBottom: 90, overflow: "hidden",
    }}>
      <style>{`
        @keyframes confettiFall { 0% { transform: translate(0,0) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--dx), 360px) rotate(var(--rot)); opacity: 0; } }
        @keyframes popIn { 0%{ transform: scale(.4); opacity:0; } 65%{ transform: scale(1.1);} 100%{ transform: scale(1); opacity:1; } }
        @keyframes digitPulse { 0%{ transform: scale(1.25); opacity:.3; } 100%{ transform: scale(1); opacity:1; } }
        @keyframes floodSweep { 0%{ opacity:.35;} 50%{ opacity:.6;} 100%{ opacity:.35;} }
        @keyframes ticker { from{ transform: translateX(0);} to{ transform: translateX(-50%);} }
        @keyframes pulseRing { 0%{ transform: scale(1); opacity: .55; } 100%{ transform: scale(1.7); opacity: 0; } }
        @keyframes floatDrift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(var(--fx), calc(var(--fy) * 0.6)) rotate(var(--fr)); }
          66% { transform: translate(calc(var(--fx) * -0.7), var(--fy)) rotate(calc(var(--fr) * -1)); }
        }
        @keyframes shine { 0%{ transform: translateX(-120%) rotate(20deg);} 100%{ transform: translateX(220%) rotate(20deg);} }
        .badge-shine::after { content: ""; position: absolute; top: -50%; left: -20%; width: 40%; height: 200%; background: linear-gradient(120deg, transparent, rgba(255,255,255,0.55), transparent); animation: shine 3.2s ease-in-out infinite; }
      `}</style>

      <div style={{ position: "absolute", top: -80, left: "10%", width: 300, height: 500, background: `conic-gradient(from 200deg, ${C.gold2}22, transparent 40%)`, filter: "blur(30px)", animation: "floodSweep 6s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -80, right: "10%", width: 300, height: 500, background: `conic-gradient(from 340deg, ${C.blue}22, transparent 40%)`, filter: "blur(30px)", animation: "floodSweep 7s ease-in-out infinite 1s", pointerEvents: "none" }} />

      {/* ── Hero ─────────────────────────────────────────── */}
      <div style={{ textAlign: "center", padding: "40px 20px 18px", position: "relative" }}>
        <Trophy size={36} color={C.gold2} style={{
          position: "absolute", top: 20, left: 20,
          filter: `drop-shadow(0 4px 10px ${C.gold3}aa)`,
        }} />

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img src={FCC_LOGO} alt="Fredensborg Cricket Club" style={{
            width: 64, height: 64, borderRadius: "50%", objectFit: "cover",
            border: `3px solid ${C.gold2}`, boxShadow: `0 6px 20px rgba(0,0,0,0.5), 0 0 16px ${C.gold2}55`,
          }} />
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: `linear-gradient(90deg, ${C.ember}, #ff7a52)`, color: "#fff", fontSize: 11, fontWeight: 800,
          letterSpacing: 1.4, padding: "6px 16px", borderRadius: 99, marginBottom: 18, textTransform: "uppercase",
          boxShadow: `0 4px 14px ${C.ember}55`,
        }}><Sparkles size={13} /> Our First Ever</div>

        <h1 style={{ fontSize: 46, fontWeight: 900, letterSpacing: -1.5, margin: 0, lineHeight: 1, textTransform: "uppercase" }}>
          <span style={{ color: C.cream }}>U11 </span>
          <span style={{ backgroundImage: GOLD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: `drop-shadow(0 2px 6px ${C.gold3}66)` }}>Ministævne</span>
        </h1>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: C.muted, fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} color={C.gold2} /> Sun 16 Aug 2026</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} color={C.blue} /> 11:00–13:00</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} color={C.red} /> Fredensborg CC</span>
        </div>

        <div style={{
          display: "inline-flex", gap: 10, marginTop: 28, padding: "16px 20px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          <ScoreTile value={d} label="DAYS" flashKey={d} accent={C.gold2} />
          <ScoreTile value={h} label="HRS" flashKey={h} accent={C.blue} />
          <ScoreTile value={m} label="MIN" flashKey={m} accent={C.red} />
          <ScoreTile value={s} label="SEC" flashKey={s} accent={C.silver2} />
        </div>
      </div>

      {/* ── Live ticker ──────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(90deg, ${C.turf}, #1a4a30, ${C.blue}33, ${C.turf})`,
        padding: "10px 0", overflow: "hidden", whiteSpace: "nowrap", margin: "26px 0",
        borderTop: `1px solid ${C.emerald}44`, borderBottom: `1px solid ${C.emerald}44`,
      }}>
        <div style={{ display: "inline-block", animation: "ticker 16s linear infinite", fontWeight: 800, fontSize: 12.5 }}>
          {`🏆  ${pluralize(clubCount, "club")} confirmed  ·  ${pluralize(teamsTotal, "team")} registered so far  ·  `.repeat(6)}
        </div>
      </div>

      {/* ── Confirmed cluster ────────────────────────────── */}
      <div style={{ padding: "10px 20px 6px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 16 }}>
          <Medal size={14} color={C.gold2} />
          <span style={{ backgroundImage: GOLD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Confirmed — {pluralize(clubCount, "club")}
          </span>
        </div>

        <div style={{
          position: "relative", width: "100%", maxWidth: 440, aspectRatio: "1 / 1", margin: "0 auto",
        }}>
          <Confetti burstKey={burst} />

          {/* Host glow — a soft ring pulsing behind the centered host badge */}
          {confirmedNames.has(INVITED.find((c) => c.host)?.name) && (
            <div style={{
              position: "absolute", left: "50%", top: "50%", width: 130, height: 130,
              transform: "translate(-50%,-50%)", borderRadius: "50%",
              border: `2px solid ${C.gold2}66`, animation: "pulseRing 2.6s ease-out infinite", pointerEvents: "none",
            }} />
          )}

          {clusterClubs.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 13, fontWeight: 700, textAlign: "center", padding: 20 }}>
              No clubs confirmed yet — check back soon!
            </div>
          )}

          {clusterClubs.map((c) => (
            // Nested so each animated layer owns its own `transform` and none
            // stomp on each other: outer = fixed anchor position + rotation,
            // then a one-shot entrance (scale), then a continuous float
            // (translate/rotate drift) wrapping the actual badge + hover state.
            <div key={c.name} style={{
              position: "absolute", left: `${c.x}%`, top: `${c.y}%`, zIndex: c.zIndex,
              transform: `translate(-50%,-50%) rotate(${c.rotation}deg)`,
            }}>
              <div style={{ animation: "popIn 0.5s cubic-bezier(.2,1.4,.4,1)" }}>
                <div style={{
                  animation: `floatDrift ${c.float.duration}s ease-in-out ${c.float.delay}s infinite`,
                  "--fx": `${c.float.fx}px`, "--fy": `${c.float.fy}px`, "--fr": `${c.float.fr}deg`,
                }}>
                  {/* Click-to-toggle only (not hover) — the badge is
                      continuously drifting, so a stationary cursor would
                      fire a spurious mouseleave the instant it floats away. */}
                  <div style={{ position: "relative" }}>
                    <Tooltip text={`${c.name} — ${registrationsByClub[c.name]?.teamName || `${c.name} U11`} · ${registrationsByClub[c.name]?.players || "—"} players`} show={hovered === c.name} />
                    <ClubBadge
                      size={c.size} ringWidth={c.host ? 4 : 3.5} bg={c.bg} img={c.host ? FCC_LOGO : undefined}
                      onClick={() => setHovered(hovered === c.name ? "" : c.name)}
                      title={c.name}
                    >
                      <span className="badge-shine" style={{ position: "relative", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>{c.short}</span>
                    </ClubBadge>
                    <span style={{
                      position: "absolute", top: -4, right: -4, minWidth: 22, height: 22, padding: "0 5px",
                      borderRadius: 99, backgroundImage: GOLD, color: "#3a2a04", fontWeight: 900, fontSize: 10.5,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1.5px solid #0B121C", boxShadow: "0 3px 8px rgba(0,0,0,0.5)",
                    }} title={`${registrationsByClub[c.name]?.players || 0} players`}>
                      {registrationsByClub[c.name]?.players ?? "—"}
                    </span>
                    {c.host && (
                      <span style={{
                        position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                        fontSize: 8.5, backgroundImage: GOLD, color: "#3a2a04", fontWeight: 900,
                        padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap",
                        boxShadow: "0 3px 8px rgba(0,0,0,0.4)",
                      }}>HOST</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: C.muted, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          Tap a club for details · badge size reflects player count
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", backgroundImage: GOLD,
          color: "#3a2a04", fontWeight: 900, fontSize: 13, padding: "11px 20px", borderRadius: 99,
          boxShadow: "0 10px 26px rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", gap: 6,
          maxWidth: "88vw", textAlign: "center",
        }}><Trophy size={15} /> {toast}</div>
      )}

      {/* ── Floating share button ─────────────────────────── */}
      <button onClick={handleShare} title="Share this page" style={{
        position: "fixed", right: 18, bottom: 18, zIndex: 35,
        display: "flex", alignItems: "center", gap: 8,
        borderRadius: 99, border: "1.5px solid rgba(255,255,255,0.18)",
        background: "linear-gradient(160deg, #16202F, #0B121C)", color: C.gold2,
        padding: "12px 18px", cursor: "pointer", fontWeight: 800, fontSize: 13,
        boxShadow: "0 10px 26px rgba(0,0,0,0.5)",
      }}>
        <Share2 size={18} /> {shareLabel}
      </button>
    </div>
  );
}
