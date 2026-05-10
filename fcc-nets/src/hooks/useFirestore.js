// ─── useFirestore hook ────────────────────────────────────────
// Owns all Firestore-backed state, the initial load + real-time
// sync, save functions, the recurring-session auto-generation
// effect, and the audit-log helper. Extracted from App.jsx during
// Pass 4 modularisation. Pure reorganisation — no behaviour changes.

import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { DEFAULT_TEAMS } from "../constants/teams";
import {
  PRESET_POLL,
  SEED_MEMBERS,
  SEED_NOTE_TEMPLATES,
  uid,
  normMember,
} from "../constants/seeds";
import { isAbsent } from "../utils/members";

// Storage keys (only the ones actually used in this hook)
const RECURRING_KEY = "recurring";
const JOINREQS_KEY  = "joinrequests";
const AUDITLOG_KEY  = "auditlog";

export function useFirestore({ currentUserRef }) {
  // ── Core data state ──────────────────────────────────────────
  const [sessions, setSessions] = useState([]);
  const [members,  setMembers]  = useState([]);
  const [pins,     setPins]     = useState({});
  const [teams,    setTeams]    = useState(DEFAULT_TEAMS);
  const [recurring, setRecurring] = useState([]);
  const [blockCals, setBlockCals] = useState([]);
  const [inviteCodes,  setInviteCodes]  = useState({});
  const [joinRequests, setJoinRequests] = useState([]);
  const [auditLog,     setAuditLog]     = useState([]);
  const [reminderLogs, setReminderLogs] = useState([]);
  const [cancelledSessions, setCancelledSessions] = useState([]);
  const [seasonPlans,    setSeasonPlans]    = useState({});
  const [allAttendance,  setAllAttendance]  = useState({});
  const [allSessionNotes,setAllSessionNotes]= useState([]);
  const [playerProgress, setPlayerProgress] = useState({});
  const [coachOverrides, setCoachOverrides] = useState({});
  const [matchSelections,setMatchSelections]= useState({});
  const [noteTemplates,  setNoteTemplates]  = useState([]);
  const [loading, setLoading] = useState(true);

  // Refs that always hold the latest values — avoid stale closures
  const sessionsRef  = useRef([]);
  const membersRef   = useRef([]);
  const teamsRef     = useRef(DEFAULT_TEAMS);
  const recurringRef = useRef([]);

  // ── Load + real-time sync via Firestore ──────────────────────
  useEffect(()=>{
    const refs = {
      sessions:    doc(db,"fccnets","sessions"),
      members:     doc(db,"fccnets","members"),
      pins:        doc(db,"fccnets","pins"),
      teams:       doc(db,"fccnets","teams"),
      recurring:   doc(db,"fccnets",RECURRING_KEY),
      blockcals:   doc(db,"fccnets","blockcals"),
      invitecodes: doc(db,"fccnets","invitecodes"),
      joinrequests:doc(db,"fccnets",JOINREQS_KEY),
      auditlog:    doc(db,"fccnets",AUDITLOG_KEY),
      reminderlogs:doc(db,"fccnets","reminderlogs"),
      cancelledsessions: doc(db,"fccnets","cancelledsessions"),
      seasonplans: doc(db,"fccnets","seasonplans"),
      attendance:  doc(db,"fccnets","attendance"),      // {sessionId: {playerId: true/false}}
      sessionnotes:doc(db,"fccnets","sessionnotes"),    // [{sessionId, playerId, text, coach, date}]
      playerprogress:doc(db,"fccnets","playerprogress"),// {playerId: {snapshots, currentPhase}}
      coachoverrides:doc(db,"fccnets","coachoverrides"),// {date-sessionId: {newCoach, oldCoach}}
      matchselections:doc(db,"fccnets","matchselections"),// {matchId: {players, captain, vc, wk, note, reportTime}}
      notetemplates:doc(db,"fccnets","captainnotes_templates"), // [{id, text, createdBy, createdAt, updatedAt}]
    };
    (async()=>{
      try {
        const [sr,mr,pr,tr,rr,br,ir,jr,ar,rlr,csr,spr,attr,snr,ppr,cor,msr,ntr] = await Promise.all([
          getDoc(refs.sessions),
          getDoc(refs.members),
          getDoc(refs.pins),
          getDoc(refs.teams),
          getDoc(refs.recurring),
          getDoc(refs.blockcals),
          getDoc(refs.invitecodes),
          getDoc(refs.joinrequests),
          getDoc(refs.auditlog),
          getDoc(refs.reminderlogs),
          getDoc(refs.cancelledsessions),
          getDoc(refs.seasonplans),
          getDoc(refs.attendance),
          getDoc(refs.sessionnotes),
          getDoc(refs.playerprogress),
          getDoc(refs.coachoverrides),
          getDoc(refs.matchselections),
          getDoc(refs.notetemplates),
        ]);
        // Sessions MUST be loaded before setLoading(false) so sessionsRef is
        // populated before the recurring useEffect runs — prevents lifts being wiped
        const initialSessions = sr.exists() ? JSON.parse(sr.data().value) : [];
        setSessions(initialSessions);
        sessionsRef.current = initialSessions;
        const initialMembers = mr.exists() ? JSON.parse(mr.data().value).map(normMember) : SEED_MEMBERS.map(normMember);
        setMembers(initialMembers);
        membersRef.current = initialMembers;
        setPins(        pr.exists() ? JSON.parse(pr.data().value) : {});
        // Merge DEFAULT_TEAMS fields into stored teams (fixes missing senior/captain/vc/coaches)
        const storedTeams = tr.exists() ? JSON.parse(tr.data().value) : DEFAULT_TEAMS;
        const mergedTeams = storedTeams.map(t => {
          const def = DEFAULT_TEAMS.find(d=>d.name===t.name);
          return {
            ...t,
            coaches:    t.coaches    ?? def?.coaches    ?? [],
            senior:     def?.senior  ?? t.senior        ?? false, // always trust DEFAULT_TEAMS for senior
            captain:    t.captain    ?? def?.captain    ?? null,
            vicecaptain:t.vicecaptain?? def?.vicecaptain?? null,
          };
        });
        setTeams(mergedTeams);
        teamsRef.current = mergedTeams;
        const initialRecurring = rr.exists() ? JSON.parse(rr.data().value) : [];
        setRecurring(initialRecurring);
        recurringRef.current = initialRecurring;
        setBlockCals(   br.exists() ? JSON.parse(br.data().value) : []);
        setInviteCodes( ir.exists() ? JSON.parse(ir.data().value) : {});
        setJoinRequests(jr.exists() ? JSON.parse(jr.data().value) : []);
        setAuditLog(    ar.exists() ? JSON.parse(ar.data().value) : []);
        setReminderLogs(rlr.exists() && rlr.data().list ? rlr.data().list : []);
        setCancelledSessions(csr.exists() ? JSON.parse(csr.data().value) : []);
        setSeasonPlans( spr.exists() ? JSON.parse(spr.data().value) : {});
        // New: attendance, notes, progress, coach overrides
        setAllAttendance(  attr.exists() ? JSON.parse(attr.data().value) : {});
        setAllSessionNotes(snr.exists() ? JSON.parse(snr.data().value) : []);
        setPlayerProgress( ppr.exists() ? JSON.parse(ppr.data().value) : {});
        setCoachOverrides( cor.exists() ? JSON.parse(cor.data().value) : {});
        setMatchSelections(msr.exists() ? JSON.parse(msr.data().value) : {});
        // Note templates: seed Firestore on first load if doc is missing
        if (ntr.exists()) {
          setNoteTemplates(JSON.parse(ntr.data().value));
        } else {
          const nowIso = new Date().toISOString();
          const seeded = SEED_NOTE_TEMPLATES.map((text, i) => ({
            id: `seed-${i+1}`,
            text,
            createdBy: "system",
            createdAt: nowIso,
            updatedAt: nowIso,
          }));
          setNoteTemplates(seeded);
          setDoc(doc(db,"fccnets","captainnotes_templates"), {value: JSON.stringify(seeded)}).catch(()=>{});
        }
      } catch(e) {
        setMembers(SEED_MEMBERS.map(normMember)); setPins({}); setTeams(DEFAULT_TEAMS); setRecurring([]); recurringRef.current=[]; setBlockCals([]); setInviteCodes({}); setJoinRequests([]); setAuditLog([]); setReminderLogs([]); setCancelledSessions([]);
        setAllAttendance({}); setAllSessionNotes([]); setPlayerProgress({}); setCoachOverrides({}); setMatchSelections({}); setNoteTemplates([]);
      }
      setLoading(false);
    })();
    // onSnapshot keeps sessions live for real-time updates after initial load
    const unsub = onSnapshot(refs.sessions, snap => {
      const val = snap.exists() ? JSON.parse(snap.data().value) : [];
      setSessions(val);
      sessionsRef.current = val;
    }, () => { setSessions([]); sessionsRef.current=[]; });
    return () => unsub();
  },[]);

  // ── Save functions ───────────────────────────────────────────
  const saveSessions  = async u => { setSessions(u); sessionsRef.current=u; await setDoc(doc(db,"fccnets","sessions"), {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveMembers   = async u => {
    // Version protection: don't save if new data has fewer members than before (possible corruption)
    const currentCount = membersRef.current?.length || 0;
    if (currentCount > 10 && u.length < currentCount * 0.5) {
      console.error("BLOCKED: Attempted to save members with suspicious data loss", {
        currentCount,
        newCount: u.length
      });
      return; // Block the save
    }

    setMembers(u);
    membersRef.current=u;

    // Save with version metadata
    await setDoc(doc(db,"fccnets","members"), {
      value: JSON.stringify(u),
      _version: Date.now(),
      _count: u.length
    }).catch(()=>{});

    // Auto-backup: save timestamped snapshot daily
    const backupKey = `members_backup_${new Date().toISOString().slice(0,10)}`;
    await setDoc(doc(db,"fccnets",backupKey), {
      value: JSON.stringify(u),
      savedAt: new Date().toISOString(),
      memberCount: u.length
    }).catch(()=>{});
  };
  const savePins      = async u => { setPins(u);      await setDoc(doc(db,"fccnets","pins"),     {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveTeams     = async u => { setTeams(u); teamsRef.current=u; await setDoc(doc(db,"fccnets","teams"),    {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveRecurring = async u => { setRecurring(u); recurringRef.current=u; await setDoc(doc(db,"fccnets",RECURRING_KEY),{value:JSON.stringify(u)}).catch(()=>{}); };
  const saveBlockCals   = async u => { setBlockCals(u);   await setDoc(doc(db,"fccnets","blockcals"),   {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveCancelledSessions = async u => { setCancelledSessions(u); await setDoc(doc(db,"fccnets","cancelledsessions"), {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveInviteCodes = async u => { setInviteCodes(u);  await setDoc(doc(db,"fccnets","invitecodes"), {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveJoinRequests= async u => { setJoinRequests(u); await setDoc(doc(db,"fccnets",JOINREQS_KEY),  {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveSeasonPlans = async u => { setSeasonPlans(u); await setDoc(doc(db,"fccnets","seasonplans"), {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveAllAttendance   = async u => { setAllAttendance(u);   await setDoc(doc(db,"fccnets","attendance"),     {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveAllSessionNotes = async u => { setAllSessionNotes(u); await setDoc(doc(db,"fccnets","sessionnotes"),   {value:JSON.stringify(u)}).catch(()=>{}); };
  const savePlayerProgress  = async u => { setPlayerProgress(u);  await setDoc(doc(db,"fccnets","playerprogress"), {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveCoachOverrides  = async u => { setCoachOverrides(u);  await setDoc(doc(db,"fccnets","coachoverrides"), {value:JSON.stringify(u)}).catch(()=>{}); };
  const saveMatchSelections = async u => { setMatchSelections(u); await setDoc(doc(db,"fccnets","matchselections"), {value:JSON.stringify(u)}).catch(()=>{});};
  const saveNoteTemplates   = async u => { setNoteTemplates(u);   await setDoc(doc(db,"fccnets","captainnotes_templates"), {value:JSON.stringify(u)}).catch(()=>{});};

  // ── Audit log ─────────────────────────────────────────────────
  // Cap at 500 entries; newest first. Only superadmin can read.
  const saveAuditLog = async u => {
    setAuditLog(u);
    await setDoc(doc(db,"fccnets",AUDITLOG_KEY), {value:JSON.stringify(u)}).catch(()=>{});
  };
  function logAction(category, detail) {
    const cu = currentUserRef?.current;
    if(!cu) return;
    const entry = {
      id: uid(),
      ts: new Date().toISOString(),
      byId: cu.id,
      byName: cu.name,
      byRole: cu.role || "member",
      category, // e.g. "member", "role", "team", "session", "pin", "request", "system"
      detail,   // human-readable description
    };
    setAuditLog(prev => {
      const next = [entry, ...prev].slice(0, 500);
      setDoc(doc(db,"fccnets",AUDITLOG_KEY), {value:JSON.stringify(next)}).catch(()=>{});
      return next;
    });
  }

  // ── Auto-generate recurring sessions ─────────────────────────
  useEffect(()=>{
    if(loading || recurring.length===0) return;
    const liveSessions = sessionsRef.current;
    const liveMembers  = membersRef.current; // use ref to avoid stale closure
    const liveTeams    = teamsRef.current;
    const liveRecurring = recurringRef.current; // use ref for latest cancelledDates
    const today = new Date(); today.setHours(0,0,0,0);
    const toAdd = [];

    // Build set of cancelled dates from cancelledSessions as backup check
    const cancelledFromArchive = new Set(
      cancelledSessions.map(c => `${c.recurringId}_${c.date}`)
    );

    recurring.forEach(slot=>{
      if(!slot.enabled) return;
      // Get cancelledDates from ref (most up-to-date) or fall back to state
      const slotFromRef = liveRecurring.find(r => r.id === slot.id);
      const cancelledDates = slotFromRef?.cancelledDates || slot.cancelledDates || [];
      for(let i=0; i<=21; i++){
        const d = new Date(today); d.setDate(today.getDate()+i);
        if(d.getDay() !== slot.day) continue;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        if(slot.activeFrom && dateStr < slot.activeFrom) continue;
        if(slot.activeTo   && dateStr > slot.activeTo)   continue;
        if(cancelledDates.includes(dateStr)) continue; // Skip cancelled dates from slot
        // Also check cancelledSessions archive as backup
        if(cancelledFromArchive.has(`${slot.id}_${dateStr}`)) continue;
        const exists = liveSessions.find(s=>
          s.recurringId===slot.id && s.date===dateStr);
        if(!exists) {
          // Auto-enroll members from the slot's teams
          const slotTeams = slot.teams?.length ? slot.teams : (slot.team ? [slot.team] : []);
          const autoPlayers = slotTeams.length
            ? liveMembers.filter(m=>
                (m.teams||[]).some(t=>slotTeams.includes(t)) &&
                !isAbsent(m, dateStr) // skip members marked away
              ).map(m=>m.name)
            : [];
          // Collect coaches from all slot teams
          const slotCoaches = [...new Set(slotTeams.flatMap(tn=>{
            const teamDef = (liveTeams||DEFAULT_TEAMS).find(t=>t.name===tn);
            return teamDef?.coaches||[];
          }))];
          toAdd.push({
            id:uid(), date:dateStr, from:slot.from, to:slot.to,
            label:slot.name, note:"", players:autoPlayers,
            poll: PRESET_POLL.map(o => ({...o, votes: []})), // Include voting options
            restrictedTo: slot.restrictTeam ? slot.team : null,
            sessionTeams: slotTeams,
            coaches: slotCoaches,
            recurringId: slot.id,
            net: slot.net || "1",
            lifts: {},
            createdBy: "Recurring",
          });
        }
      }
    });
    if(toAdd.length>0){
      const merged = [...liveSessions,...toAdd].sort((a,b)=>
        new Date(a.date)-new Date(b.date)||a.from.localeCompare(b.from));
      saveSessions(merged);
    }

    // Migration: Add poll options to existing recurring sessions that don't have them
    const needsPollUpdate = liveSessions.filter(s =>
      s.recurringId && (!s.poll || s.poll.length === 0)
    );
    if(needsPollUpdate.length > 0) {
      const updated = liveSessions.map(s => {
        if(s.recurringId && (!s.poll || s.poll.length === 0)) {
          return { ...s, poll: PRESET_POLL.map(o => ({...o, votes: []})) };
        }
        return s;
      });
      saveSessions(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loading, recurring, cancelledSessions]);

  return {
    sessions, setSessions, sessionsRef,
    members, setMembers, membersRef,
    pins, setPins,
    teams, setTeams, teamsRef,
    recurring, setRecurring, recurringRef,
    blockCals, setBlockCals,
    inviteCodes, setInviteCodes,
    joinRequests, setJoinRequests,
    auditLog, setAuditLog,
    reminderLogs, setReminderLogs,
    cancelledSessions, setCancelledSessions,
    seasonPlans, setSeasonPlans,
    allAttendance, setAllAttendance,
    allSessionNotes, setAllSessionNotes,
    playerProgress, setPlayerProgress,
    coachOverrides, setCoachOverrides,
    matchSelections, setMatchSelections,
    noteTemplates, setNoteTemplates,
    loading,
    saveSessions, saveMembers, savePins, saveTeams, saveRecurring,
    saveBlockCals, saveCancelledSessions, saveInviteCodes, saveJoinRequests,
    saveSeasonPlans, saveAllAttendance, saveAllSessionNotes, savePlayerProgress,
    saveCoachOverrides, saveMatchSelections, saveNoteTemplates, saveAuditLog,
    logAction,
  };
}
