import React, { useState, useEffect, useRef } from "react";
// Pass 4: db / firestore primitives are no longer used directly in App.jsx —
// all Firestore I/O is encapsulated in src/hooks/useFirestore.js.
import ProgressTracker from "./ProgressTracker";
import CoachCoordination from "./CoachCoordination";
// ─── Pass 1 modularisation: constants + pure utils ────────────
import { ROLES, ROLE_META, CAN, can } from "./constants/roles";
import {
  DEFAULT_TEAMS, TEAM_META, TEAM_CARD_COLORS, getTeamCardColors,
  EXTRA_COLORS, getTeamMeta,
} from "./constants/teams";
import { THEMES, THEME_KEYS } from "./constants/themes";
import { WMO, wmo, calcRainPeriods } from "./constants/weather";
import {
  localDateStr, todayStr, tomorrowStr, fmtShort, fmtLong,
  isToday, isFuture, isSessionPast,
  isAfterCutoff,
  NET_DAY_START, NET_DAY_END, NET_SPAN, netPct, toMinsNet,
  PRIME_ZONES, isPrimeTime,
} from "./utils/time";
import { hashPin } from "./utils/crypto";
import { getLiftObj, getLiftPref } from "./utils/lifts";
import {
  getCoachTeams, isCoachMember, getTeamRole,
  isTeamCaptainFor, isTeamVCFor,
  canOrCoach, maskEmail, isAbsent, profileCompletion, getMemberRoleChips,
} from "./utils/members";
import { netAvailGauge } from "./utils/sessions";
import { makeICS, waMsg } from "./utils/ics";
// ─── Pass 2 modularisation: dumb UI components ────────────────
import Btn from "./ui/Btn";
import Toast from "./ui/Toast";
import SLbl from "./ui/SLbl";
import FFld from "./ui/FFld";
import BackBtn from "./ui/BackBtn";
import { GroupIcon, NetIcon, BothNetsIcon } from "./ui/icons";
import { RolePill, TeamPill, MemberRolePills } from "./ui/pills";
import ProfileDial from "./ui/ProfileDial";
import AvailGauge from "./ui/AvailGauge";
import PinPad from "./ui/PinPad";
import WeatherBar from "./ui/WeatherBar";
import WeatherPage from "./ui/WeatherPage";
import SessCard from "./ui/SessCard";
import NetsTimeline from "./ui/NetsTimeline";
import FamilyManager from "./ui/FamilyManager";
import PlayerGroup from "./ui/PlayerGroup";
import CarpoolSheet from "./ui/CarpoolSheet";
import Shell from "./ui/Shell";
import BotNav from "./ui/BotNav";
import SidebarNav from "./ui/SidebarNav";
// ─── Pass 4 modularisation: shared seeds + custom hooks ──────
import {
  PRESET_POLL, SEED_NOTE_TEMPLATES, SEED_MEMBERS, EMAIL_SEED,
  uid, normMember,
} from "./constants/seeds";
import { useFirestore } from "./hooks/useFirestore";
import { useAuth } from "./hooks/useAuth";
// ─── Pass 5 modularisation: shared React context for view blocks ─
import { AppContext } from "./context/AppContext";
// ─── Pass 6 modularisation: fixtures constant ─────────────────
import { ALL_FIXTURES } from "./constants/fixtures";
// ─── Pass 6 prerequisite: club logo + AppHeader extracted ─────
import { FCC_LOGO } from "./constants/logo";
import AppHeader from "./ui/AppHeader";
// ─── Pass 6: view components ──────────────────────────────────
import WeatherView from "./views/WeatherView";
import PrivacyView from "./views/PrivacyView";
import HelpView from "./views/HelpView";
import CoachCoordinationView from "./views/CoachCoordinationView";
import CoachHQView from "./views/CoachHQView";
import AvailabilityView from "./views/AvailabilityView";
import ScheduleView from "./views/ScheduleView";
import AddSessionView from "./views/AddSessionView";


// Storage keys moved to src/hooks/useFirestore.js (Pass 4) — were
// only used inside the Firestore-loader effect and save functions.

// ─── 2026 Home Match Fixtures (Fredensborg ground only) ───────
// ─── Privacy notice (GDPR) ────────────────────────────────────
const PRIVACY_TEXT = `Fredensborg Cricket Club stores your name, email address, and phone number to manage your club membership and communicate about training, matches, and club activities. Your data is only accessible to club admins and coaches. It is stored securely on Google Firebase servers located in the EU (Frankfurt) and will not be shared with third parties. You have the right to access, correct, or request deletion of your data at any time by contacting the club admin. Data is retained for the duration of your membership and up to one year after. For members under 16, a parent or guardian must provide consent on their behalf.`;

// PRIVACY_SECTIONS moved into src/views/PrivacyView.jsx (Pass 6)

// ─── Match Fixtures 2026 (home matches only — blocks nets) ────
// Source: DCF 2026_Turnering_Schedule, 11-Mar-Consolidated
// Away matches excluded — nets not needed for away games
const MATCH_FIXTURES = [
  // ── 2. Division ──────────────────────────────────────────────
  { date:"2026-05-17", from:"10:00", to:"19:00", label:"Div 2 — FCC vs Århus 1" },
  { date:"2026-05-24", from:"11:00", to:"20:00", label:"Div 2 — FCC vs Himalaya 1" },
  { date:"2026-06-07", from:"11:00", to:"20:00", label:"Div 2 — FCC vs Copenhagen 1" },
  { date:"2026-07-26", from:"11:00", to:"20:00", label:"Div 2 — FCC vs Bella 1" },
  { date:"2026-08-15", from:"11:00", to:"20:00", label:"Div 2 — FCC vs Kolding 1" },
  { date:"2026-08-30", from:"11:00", to:"20:00", label:"Div 2 — FCC vs Frem 1" },
  // ── 3. Division Øst - B ──────────────────────────────────────
  { date:"2026-05-02", from:"13:00", to:"21:00", label:"Div 3 — FCC vs APMM 1" },
  { date:"2026-05-31", from:"10:00", to:"19:00", label:"Div 3 — FCC vs Frem 2" },
  { date:"2026-06-13", from:"14:00", to:"21:00", label:"Div 3 — FCC vs Hvidovre 2" },
  { date:"2026-06-27", from:"10:00", to:"19:00", label:"Div 3 — FCC vs Ishøj 3" },
  { date:"2026-08-22", from:"10:00", to:"19:00", label:"Div 3 — FCC vs APMM 1" },
  { date:"2026-09-05", from:"15:00", to:"21:00", label:"Div 3 — FCC vs AB 2" },
  // ── 4. Division Øst ──────────────────────────────────────────
  { date:"2026-05-10", from:"10:00", to:"19:00", label:"Div 4 — FCC vs Tårnby 1" },
  { date:"2026-05-31", from:"15:00", to:"21:00", label:"Div 4 — FCC vs Albertslund 3" },
  { date:"2026-06-14", from:"14:00", to:"21:00", label:"Div 4 — FCC vs Tåstrup 2" },
  { date:"2026-08-01", from:"10:00", to:"19:00", label:"Div 4 — FCC vs Hvidovre 3" },
  { date:"2026-08-09", from:"14:00", to:"21:00", label:"Div 4 — FCC vs Frem 3" },
  // ── Kvinderækken ─────────────────────────────────────────────
  { date:"2026-06-06", from:"10:00", to:"19:00", label:"Women's — FCC vs Esbjerg" },
  { date:"2026-06-14", from:"10:00", to:"19:00", label:"Women's — FCC vs Svanholm" },
  { date:"2026-08-02", from:"10:00", to:"19:00", label:"Women's — FCC vs KB" },
  // ── Oldboys ──────────────────────────────────────────────────
  { date:"2026-05-06", from:"18:00", to:"21:00", label:"OB — FCC vs Køge OB" },
  { date:"2026-05-27", from:"18:00", to:"21:00", label:"OB — FCC vs Hvidovre OB" },
  { date:"2026-06-18", from:"18:00", to:"21:00", label:"OB — FCC vs Forty Øst 1" },
  { date:"2026-08-12", from:"18:00", to:"21:00", label:"OB — FCC vs Tåstrup OB" },
  { date:"2026-08-18", from:"18:00", to:"21:00", label:"OB — FCC vs Svanholm OB" },
  { date:"2026-08-25", from:"18:00", to:"21:00", label:"OB — FCC vs Ishøj OB" },
  { date:"2026-09-03", from:"18:00", to:"21:00", label:"OB — FCC vs Hvidovre OB" },
  // ── T20 Serie 4 ──────────────────────────────────────────────
  { date:"2026-05-03", from:"13:00", to:"21:00", label:"T20 Series 4 — FCC vs Nørrebro 2" },
  { date:"2026-07-05", from:"10:00", to:"18:00", label:"T20 Series 4 — FCC vs AB 2" },
  { date:"2026-08-02", from:"15:00", to:"22:00", label:"T20 Series 4 — FCC vs Tåstrup 1" },
  // ── T20 Serie 5 ──────────────────────────────────────────────
  { date:"2026-05-16", from:"14:00", to:"22:00", label:"T20 Series 5 — FCC vs Himalaya 1" },
  { date:"2026-07-05", from:"14:00", to:"22:00", label:"T20 Series 5 — FCC vs Tårnby 1" },
  { date:"2026-07-11", from:"11:00", to:"19:00", label:"T20 Series 5 — FCC vs Tåstrup 2" },
  // ── U13 ──────────────────────────────────────────────────────
  { date:"2026-05-16", from:"10:00", to:"19:00", label:"U13 — FCC vs Glostrup U13" },
  { date:"2026-05-25", from:"10:00", to:"19:00", label:"U13 — FCC vs Soraner U13" },
  { date:"2026-06-13", from:"10:00", to:"19:00", label:"U13 — FCC vs Svanholm U13" },
  { date:"2026-06-20", from:"13:00", to:"21:00", label:"U13 — FCC vs Roskilde U13" },
  { date:"2026-08-09", from:"10:00", to:"19:00", label:"U13 — FCC vs KB U13" },
  // ── U15 ──────────────────────────────────────────────────────
  { date:"2026-04-26", from:"10:00", to:"19:00", label:"U15 — FCC vs KB U15" },
  { date:"2026-05-23", from:"10:00", to:"19:00", label:"U15 — FCC vs Svanholm U15" },
  { date:"2026-08-16", from:"14:00", to:"21:00", label:"U15 — FCC vs KB U15" },
  { date:"2026-09-05", from:"10:00", to:"19:00", label:"U15 — FCC vs Glostrup U15" },
  // ── U16 ──────────────────────────────────────────────────────
  { date:"2026-08-03", from:"10:00", to:"19:00", label:"U16 — FCC vs Svanholm U16" },
  { date:"2026-08-29", from:"10:00", to:"19:00", label:"U16 — FCC vs Glostrup U16" },
  // ── U18 ──────────────────────────────────────────────────────
  { date:"2026-06-21", from:"10:00", to:"19:00", label:"U18 — FCC vs Svanholm U18" },
  { date:"2026-07-25", from:"10:00", to:"19:00", label:"U18 — FCC vs KB U18" },
  { date:"2026-09-12", from:"10:00", to:"19:00", label:"U18 — FCC vs Glostrup U18" },
  // ── U11 Ministævne ───────────────────────────────────────────
  { date:"2026-08-16", from:"10:00", to:"17:00", label:"U11 — Home Ministævne" },
];

// ALL_FIXTURES moved to src/constants/fixtures.js (Pass 6)

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

// Division → app team name mapping for filtering
const DIVISION_TO_TEAM = {
  "Div 2":"Div 2","Div 3":"Div 3","Div 4":"Div 4",
  "Women's":"Women's","U13":"U13","U15":"U15","U16":"U18","U18":"U18",
};
let _themeKey = "navy";
try { _themeKey = localStorage.getItem("fcc-theme") || "navy"; } catch{}
if(!THEMES[_themeKey]) _themeKey = "navy";

// PRESET_POLL, SEED_NOTE_TEMPLATES and SEED_MEMBERS — moved to src/constants/seeds.js (Pass 4)

// ─── Name fix map ─────────────────────────────────────────────
// Maps first-name-only entries to their known full names.
// Entries with duplicate first names (e.g. "Adithya" → 2 people) are
// intentionally excluded — those must be fixed manually via the pencil icon.
const NAME_MAP = {
  "Aadya":"Aadya Kaul","Aarin":"Aarin Venkatesh","Abhinav":"Abhinav Singh",
  "Adam":"Adam Pirzada","Advik":"Advik Akar","Ahaan":"Ahaan Sinha",
  "Ahmed":"Ahmed Nawaz","Akshay":"Akshay Bhardwaj","Amer":"Amer Ramzan",
  "Amit":"Amit Yadav","Anagha":"Anagha Mahajan","Anant":"Anant Mahajan",
  "Anirudh":"Anirudh Ram Sriram","Anshu":"Ansh Gupta",
  "Anveshak":"Anveshak Vujjini","Abhijit":"Abhijit Guhagarkar",
  "Deepak":"Deepak Akar","Dhruv":"Dhruv Shah",
  "Gagan":"Gagan Sachdeva","Garghi":"Garghi Seenevas",
  "Hasnain":"Hasnain Ahmed","Ilayaraja":"Ilayaraja Karuppasamy",
  "Ishan":"Ishan Bordoloi","Jaya":"Jaya Nair",
  "Kamal":"Kamal Jayalaksminarasimhan","Kian":"Kian Kakoti",
  "Mishka":"Mishka Gupta","Monesh":"Monesh Shantharam",
  "Nimesh":"Nimesh Rajamohanan","Nirmal":"Nirmal Mohanan",
  "Pranavan":"Pranavan Aananth","Prithvi":"Prithvi Sagar",
  "Pronit":"Pronit Lahiri","Pulin":"Pulin Dhar",
  "Raghavendar":"Raghavendar Murali","Rajkumar":"Rajkumar Jeyaraman",
  "Raju":"Raju Dantuluri","Ramakrishnan":"Ramakrishnan Ravi",
  "Reuben":"Reuben Dayal","Rewanth":"Rewanth Punna",
  "Rohind":"Rohind Muthuselvaraj","Rohith":"Rohith Arunkumar",
  "Saatvik":"Saatvik Dantuluri","Sahasra":"Sahasra Dantuluri",
  "Sagar":"Sagar Gupta","Sahil":"Sahil Gagneja",
  "Samyak":"Samyak Jaggi Ram","Savir":"Savir Gagneja",
  "Senthil":"Senthil Gnanasambandan","Shardul":"Shardul Joshi",
  "Sharmila":"Sharmila C","Shashank":"Shashank Rastogi",
  "Shreyas":"Shreyas Gujjar","Stalin":"Stalin Natesan",
  "Syed":"Syed Hamza Kazmi","Taarush":"Taarush Jain",
  "Talat":"Talat Munshi","Trineth":"Trineth Arjun",
  "Vijay":"Vijay Deepak","Virendra":"Virendra Pawar",
  "Vishali":"Vishali Jain","Xavier":"Xavier Ramzan",
  "Yogismaan":"Yogismaan Kamal","Zachary":"Zachary Dayal","Zeb":"Zeb Pirzada",
  // Session refs use old short names too — include these common session-only names:
  "Rajesh":"Rajesh Muthukumar", // will be overridden for Rajesh Ayyappan if both exist
  // Renamed members — old name → new name:
  "Jay":"Jayashwanth J S",
};
// Names that are ambiguous (multiple people share the first name) — manual fix only:
const AMBIGUOUS_FIRST_NAMES = ["Adithya","Arun","Ashwin","Nitin","Rajesh","Vihaan","Vinay","Vivek"];

// ─── Division team rosters (from squad lists) ─────────────────
// Maps member names (as stored in Firebase) to their division team.
// Run "Assign Division Teams" in Admin Panel to apply these.
const DIVISION_TEAMS = {
  // Div 2
  "Aarin Venkatesh":       "Div 2",
  "Saatvik Dantuluri":     "Div 2",
  "Vinay Arunkumar":       "Div 2",
  "Dhruv Shah":            "Div 2",
  "Ashwin Shankar":        "Div 2",
  "Rewanth Punna":         "Div 2",
  "Syed Hamza Kazmi":      "Div 2",
  "Garghi Seenevas":       "Div 2",
  "Rohind Muthuselvaraj":  "Div 2",
  "Adithya Manimaran":     "Div 2",
  "Anirudh Ram Sriram":    "Div 2",
  "Vinay Kumar":           "Div 2",
  "Stalin Natesan":        "Div 2",
  "Virendra Pawar":        "Div 2",
  "Vijay Deepak":          "Div 2",
  "Muhammad Aun Zaheer":   "Div 2",
  // Div 3
  "Adam Pirzada":          "Div 3",
  "Advik Akar":            "Div 3",
  "Junaid Khan":           "Div 3",
  "Ahmed Nawaz":           "Div 3",
  "Prithvi Sagar":         "Div 3",
  "Reuben Dayal":          "Div 3",
  "Nimesh Rajamohanan":    "Div 3",
  "Sahil Gagneja":         "Div 3",
  "Deepak Akar":           "Div 3",
  "Nitin Jain":            "Div 3",
  "Vivek Bhatnagar":       "Div 3",
  "Balaji R":              "Div 3",
  "Ilayaraja Karuppasamy": "Div 3",
  // Div 4
  "Samyak Jaggi Ram":      "Div 4",
  "Abhinav Singh":         "Div 4",
  "Xavier Ramzan":         "Div 4",
  "Anveshak Vujjini":      "Div 4",
  "Amit Yadav":            "Div 4",
  "Gagan Sachdeva":        "Div 4",
  "Shreyas Gujjar":        "Div 4",
  "Nirmal Mohanan":        "Div 4",
  "Monesh Shantharam":     "Div 4",
  "Shashank Rastogi":      "Div 4",
  "Rajkumar Jeyaraman":    "Div 4",
  "Sagar Gupta":           "Div 4",
  "Vivek Satyarthi":       "Div 4",
  "Arun Shankar":          "Div 4",
  "Jayashwanth J S":       "Div 4",
  "Shardul Joshi":         "Div 4",
  "Pronit Lahiri":         "Div 4",
};

// ─── T20 Squads 2026 ─────────────────────────────────────────
// Separate tournament — mixed squads not tied to division groups.
const T20_SQUADS = {
  "T20 Serie 4": {
    captain: "Syed Hamza Kazmi",
    vc:      "Ashwin Shankar",
    nameMap: {
      "Chuchendra Durgesh Mattaparthi": "Durgesh",
      "Balaji Ramdas":                  "Balaji R",
    },
    // Genuinely new — not in EMAIL_SEED or existing member list
    newMembers: [
      {name:"Virendra Pawar",      teams:["T20 Serie 4"]},
      {name:"Muhammad Aun Zaheer", teams:["T20 Serie 4"]},
    ],
    members: [
      "Dhruv Shah","Ashwin Shankar","Rewanth Punna","Syed Hamza Kazmi",
      "Garghi Seenevas","Adithya Manimaran","Anirudh Ram Sriram","Vinay Kumar",
      "Stalin Natesan","Virendra Pawar","Vijay Deepak","Muhammad Aun Zaheer",
      "Chuchendra Durgesh Mattaparthi","Nimesh Rajamohanan","Deepak Akar",
      "Nitin Jain","Balaji Ramdas","Reuben Dayal",
    ],
  },
  "T20 Serie 5": {
    captain: "Aurangzeb Pirzada",
    vc:      "Vivek Satyarthi",
    nameMap: {
      "Aurangzeb Pirzada":              "Zeb Pirzada",        // Zeb is his preferred name in app
      "Arunkumar Krishnamurthy":        "Arun Krishnamurthy", // already in system
      "Arun Shankar Ambadipudi":        "Arun Shankar",       // already in system
      "Jayashwanth Jeganathan Subhashini": "Jayashwanth J S", // already in system
    },
    // Genuinely new — not in EMAIL_SEED or existing member list
    newMembers: [
      {name:"Aniket Rao",               teams:["T20 Serie 5"]}, // different from Aniket Sharma (U11 coach)
      {name:"Muhammad Junaid",          teams:["T20 Serie 5"]},
      {name:"Dantuluri Venkatakrishna", teams:["T20 Serie 5"]}, // different from Saatvik Dantuluri
      {name:"Vivek Bhatnagar",          teams:["T20 Serie 5"]}, // different from Vivek Satyarthi
      {name:"Sagar Sachdeva",           teams:["T20 Serie 5"]}, // different from Sagar Gupta
    ],
    members: [
      "Aniket Rao","Muhammad Junaid","Ahmed Nawaz","Prithvi Sagar","Sahil Gagneja",
      "Dantuluri Venkatakrishna","Arunkumar Krishnamurthy","Vivek Bhatnagar",
      "Amit Yadav","Gagan Sachdeva","Shreyas Gujjar","Nirmal Mohanan",
      "Monesh Shantharam","Shashank Rastogi","Aurangzeb Pirzada",
      "Rajkumar Jeyaraman","Sagar Sachdeva","Vivek Satyarthi",
      "Arun Shankar Ambadipudi","Jayashwanth Jeganathan Subhashini","Shardul Joshi",
    ],
  },
};

// EMAIL_SEED, uid, normMember — moved to src/constants/seeds.js (Pass 4)

// ─── Weather constants ────────────────────────────────────────
const FCC_LAT = 55.917762, FCC_LON = 12.415680;

// SVG arc dial
const dlICS = s => {
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([makeICS(s)],{type:"text/calendar"}));
  a.download=`fcc-nets-${s.date}.ics`; a.click();
};

// G is now set dynamically from theme — see App() below
let G = THEMES[_themeKey];

const iSt = (extra={}) => ({
  width:"100%", borderRadius:9, border:`1.5px solid ${G.border}`,
  padding:"11px 13px", fontSize:15, fontFamily:"'DM Sans',sans-serif",
  fontWeight:500, background:G.cream, color:G.text,
  outline:"none", boxSizing:"border-box", ...extra,
});

// ─── Atoms ────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // ── Pass 4: Firestore-backed state via custom hook ───────────
  // currentUserRef is synced below (after auth state is declared) so
  // logAction inside the hook can read the latest currentUser without
  // creating a circular hook dependency.
  const currentUserRef = useRef(null);
  const firestoreState = useFirestore({ currentUserRef });
  const {
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
  } = firestoreState;

  // Theme
  const [themeKey, setThemeKey] = useState(_themeKey);
  G = THEMES[themeKey] || THEMES.forest; // keep global G in sync for atoms
  const applyTheme = (key) => {
    if(!THEMES[key]) return;
    setThemeKey(key);
    G = THEMES[key];
    try { localStorage.setItem("fcc-theme", key); } catch{}
  };

  // Auth state — moved to useAuth (Pass 4). Hook call below, after
  // setView is declared so handleLogout can use it. inviteCodes /
  // joinRequests / auditLog / reminderLogs live in useFirestore.

  // App view
  const [view,     setView]     = useState("schedule");
  const [selSess,  setSelSess]  = useState(null);
  const [toast,    setToast]    = useState(null);
  // showToast defined here (used by useAuth and elsewhere) — moved up from
  // its old location below the auth state during Pass 4.
  const showToast = m => { setToast(m); setTimeout(()=>setToast(null),2700); };

  // ── Pass 4: Auth state + handlers via custom hook ─────────────
  const authState = useAuth({
    members, pins, savePins, saveMembers,
    inviteCodes, setInviteCodes, saveInviteCodes,
    showToast, logAction, setView,
  });
  const {
    currentUser, setCurrentUser,
    authView, setAuthView,
    pickSearch, setPickSearch,
    pinError, setPinError,
    pendingMember, setPendingMember,
    emailInput, setEmailInput,
    emailError, setEmailError,
    loginCodeSent, setLoginCodeSent,
    loginSentCode, setLoginSentCode,
    loginCodeExpiry, setLoginCodeExpiry,
    loginCodeInput, setLoginCodeInput,
    loginCodeSending, setLoginCodeSending,
    loginCodeError, setLoginCodeError,
    handlePickMember, handleVerifyEmail, handleVerifyCode,
    handleNewPin, handleEnterPin, handleLogout,
  } = authState;
  // Keep currentUserRef in sync each render so logAction inside
  // useFirestore can read the latest user without a hook cycle.
  currentUserRef.current = currentUser;

  const [sessAttendance, setSessAttendance] = useState({}); // {playerId: true/false/null} for current session
  const [attendanceSessionContext, setAttendanceSessionContext] = useState(null); // For passing session to Progress Tracker
  const [sessCoachView, setSessCoachView] = useState(null); // "attendance" | "notes" | null for inline coach views
  const [sessNotes, setSessNotes] = useState([]); // [{playerId, playerName, text, date, pillar}]
  const [sessNotesDraft, setSessNotesDraft] = useState({}); // {playerId: "text"}

  // teams / seasonPlans / allAttendance / allSessionNotes / playerProgress /
  // coachOverrides / cancelledSessions / recurring — moved to useFirestore (Pass 4)
  const seniorTeamNames = teams.filter(t=>t.senior).map(t=>t.name);
  const ALL_TEAMS = [...teams.map(t=>t.name), "Unassigned"];

  // Cancellation modal
  const [cancelModal, setCancelModal] = useState(null); // {session, slot} when cancelling

  // Add session form
  const [bDate,    setBDate]    = useState("");
  const [bFrom,    setBFrom]    = useState("18:00");
  const [bTo,      setBTo]      = useState("19:00");
  const [bNote,    setBNote]    = useState("");
  const [bLabel,   setBLabel]   = useState("");
  const [bNet,     setBNet]     = useState("1");  // "1" | "2" | "both"
  const [bLift,    setBLift]    = useState("");   // "" | "offer" | "need" | "self"
  const [liftEditing, setLiftEditing] = useState(false);  // carpool form open in session detail
  const [liftDraft,   setLiftDraft]   = useState(null);   // draft lift object while editing
  const [carpoolFocus,setCarpoolFocus]= useState(false);  // auto-scroll to carpool on open
  const [notInExpanded,setNotInExpanded] = useState(false); // "not coming" section toggle
  const [notInSearch, setNotInSearch] = useState(""); // search filter for "not coming" list
  const [editingLocation, setEditingLocation] = useState(false); // location editor modal
  const [assignOpen, setAssignOpen] = useState(null); // session id whose U11 parent-duty roster panel is open
  const [cancelReason, setCancelReason] = useState(""); // reason for cancelling a session
  const [showCancelled, setShowCancelled] = useState(false); // collapsed by default
  const [carpoolSheetSess, setCarpoolSheetSess] = useState(null); // bottom sheet session
  const carpoolRef = useRef(null);
  // sessionsRef / membersRef / teamsRef / recurringRef — moved to useFirestore (Pass 4)
  const [bRestrictTeam, setBRestrictTeam] = useState("");
  const [selP,     setSelP]     = useState([]);
  const [pSearch,  setPSearch]  = useState("");
  const [pFilter,  setPFilter]  = useState("All");
  const [otherGroupsOpen, setOtherGroupsOpen] = useState(false);
  // Poll builder
  const [bPollOpts, setBPollOpts] = useState([...PRESET_POLL]);
  const [bCustomOpt,setBCustomOpt]= useState("");
  // Session comments
  const [commentText, setCommentText] = useState("");

  // Admin state
  const [newName,  setNewName]  = useState("");
  const [newTeam,  setNewTeam]  = useState("Unassigned");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newMemberType, setNewMemberType] = useState("player"); // player | parent | child
  const [newLinkParent, setNewLinkParent] = useState(""); // parent member id to link child to
  const [newGenCode,   setNewGenCode]   = useState(false); // generate invite code after adding
  const [aSearch,  setASearch]  = useState("");
  const [aFilter,  setAFilter]  = useState("All");
  const [adminListMode, setAdminListMode] = useState("flat"); // "teams" | "flat" — flat by default
  const [selMember, setSelMember] = useState(null); // member selected in flat view
  const [expandedSessions, setExpandedSessions] = useState({});
  const [editingRole, setEditingRole] = useState(null);

  // Team management state
  const [newTName,  setNewTName]  = useState("");
  const [newTSenior,setNewTSenior]= useState(false);
  const [editingTeam,setEditingTeam]= useState(null);
  const [coachSearch, setCoachSearch] = useState({}); // {teamId: searchString}
  // Captain's Playing XI state
  // matchSelections — moved to useFirestore (Pass 4)
  const [captainXIModal, setCaptainXIModal] = useState(null); // {match, division} or null
  const [xiSelection, setXiSelection] = useState([]); // array of player names
  const [xiRoles, setXiRoles] = useState({ captain: null, vc: null, wk: null }); // special roles
  const [xiNote, setXiNote] = useState("");
  const [xiReportTime, setXiReportTime] = useState("");
  const [xiMatchTime, setXiMatchTime] = useState("");
  const [xiReportTimeUserTouched, setXiReportTimeUserTouched] = useState(false);
  // Captain note templates (shared club-wide)
  // noteTemplates — moved to useFirestore (Pass 4)
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templateEditingId, setTemplateEditingId] = useState(null);
  const [templateEditingText, setTemplateEditingText] = useState("");
  const [templateNewText, setTemplateNewText] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  // Selective XI reset (super admin only)
  const [xiResetModalOpen, setXiResetModalOpen] = useState(false);
  const [xiResetSelected, setXiResetSelected] = useState(() => new Set());
  // Admin section collapse — true = open. Members+AddMember open by default, rest collapsed
  const [adminSec, setAdminSec] = useState({
    members:true, addmember:true, groups:false,
    coaches:false, blocknets:false, recurring:false, backup:false, auditlog:false, reminderlogs:false
  });
  const toggleAdminSec = k => setAdminSec(s=>({...s,[k]:!s[k]}));
  const [editingName, setEditingName] = useState(null); // {id, value}

  // Recurring slot form state
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const [rName,       setRName]      = useState("");
  const [rTeam,       setRTeam]      = useState([]);  // array for multi-select
  const [rRestrict,   setRRestrict]  = useState(false);
  const [rDay,        setRDay]       = useState(6); // Saturday
  const [rFrom,       setRFrom]      = useState("14:00");
  const [rTo,         setRTo]        = useState("15:30");
  const [rActiveFrom, setRActiveFrom]= useState(todayStr());
  const [rActiveTo,   setRActiveTo]  = useState("");
  const [rNet,        setRNet]       = useState("1"); // net for new recurring slot
  const [editingSlot, setEditingSlot]= useState(null);
  // Permanently dismissed missing-member names (persisted in localStorage)
  const [dismissedMissing, setDismissedMissing] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("fcc-dismissed-missing")||"[]"); } catch{ return []; }
  });

  // Help / contact form
  const [helpMsg,  setHelpMsg]  = useState("");
  const [helpCat,  setHelpCat]  = useState("general");
  // Audit log UI state (superadmin only — safe to have at component level)
  const [logFilter, setLogFilter] = useState("all");
  const [logOpen,   setLogOpen]   = useState(false);
  // Request-to-join form state
  const [jrName,    setJrName]   = useState("");
  const [jrTeam,    setJrTeam]   = useState("");
  const [jrContact, setJrContact]= useState(""); // email
  const [jrPhone,   setJrPhone]  = useState(""); // phone (separate)
  const [jrForChild,setJrForChild]=useState(false);
  const [jrChildName,setJrChildName]=useState("");
  const [jrChildTeam,setJrChildTeam]=useState("");

  // ── Profile tabs for player-parent hybrid ────────────────────
  const [profileTab, setProfileTab] = useState("profile"); // profile|family
  const [showAllMatches, setShowAllMatches] = useState(false); // for My Matches in profile

  // ── Self-service verify/onboarding flow ────────────────────
  const [vfStep,      setVfStep]      = useState("search");   // search|found|notfound|code|parent|done
  const [vfSearch,    setVfSearch]    = useState("");
  const [vfMatch,     setVfMatch]     = useState(null);        // matched member object
  const [vfEmail,     setVfEmail]     = useState("");
  const [vfPhone,     setVfPhone]     = useState("");
  const [vfCode,      setVfCode]      = useState("");          // entered code
  const [vfSentCode,  setVfSentCode]  = useState("");          // generated code (client-side ephemeral)
  const [vfCodeExpiry,setVfCodeExpiry]= useState(null);
  const [vfSending,   setVfSending]   = useState(false);

  // Login email code flow — moved to useAuth (Pass 4)
  const [vfError,     setVfError]     = useState("");
  const [vfConsent,   setVfConsent]   = useState(false);
  const [vfIsParent,  setVfIsParent]  = useState(false);
  const [vfChildName, setVfChildName] = useState("");
  const [vfNewName,   setVfNewName]   = useState("");
  const [vfNewTeam,   setVfNewTeam]   = useState("");

  // ── Restore verification state from localStorage on mount ────
  useEffect(() => {
    const saved = localStorage.getItem("fcc-verify-state");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.expiry && Date.now() < state.expiry) {
          // Restore state if code hasn't expired
          setVfSentCode(state.code || "");
          setVfCodeExpiry(state.expiry || null);
          setVfEmail(state.email || "");
          setVfStep(state.step || "search");
          if (state.matchId && members.length > 0) {
            const match = members.find(m => m.id === state.matchId);
            if (match) setVfMatch(match);
          }
        } else {
          // Clear expired state
          localStorage.removeItem("fcc-verify-state");
        }
      } catch(e) { localStorage.removeItem("fcc-verify-state"); }
    }
  }, [members.length]);

  const userRole = currentUser?.role || "member";
  // showToast moved up to be available to useAuth (Pass 4).
  // cachedCurrentUser sync moved to useAuth (Pass 4).


  // ── Invite code helpers ───────────────────────────────────────
  // Generate a short human-readable code: FCC-XXXX (letters+digits, no ambiguous chars)
  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return "FCC-" + Array.from({length:4}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  }
  function hashCode(code) { return hashPin(code.toUpperCase()); }

  function generateInviteCode(memberId) {
    const m = members.find(x=>x.id===memberId);
    const plain = genCode();
    const updated = {...inviteCodes, [memberId]: hashCode(plain)};
    saveInviteCodes(updated);
    if(m) logAction("pin", `Generated invite code for: ${m.name}`);
    return plain; // caller is responsible for displaying the code
  }


  // ── Auto-scroll to carpool section when chip clicked ─────────
  useEffect(()=>{
    if(view==="session" && carpoolFocus && carpoolRef.current) {
      setTimeout(()=>{
        carpoolRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
      }, 120);
      setCarpoolFocus(false);
    }
  },[view, carpoolFocus]);

  // ── Auto-select current user when opening Add Session ────────
  useEffect(()=>{
    if(view==="add" && currentUser) {
      setSelP(ps => ps.includes(currentUser.name) ? ps : [currentUser.name, ...ps]);
      setPSearch(""); setPFilter("All"); setOtherGroupsOpen(false);
    }
  },[view]);

  // ── Weather fetch (Open-Meteo ECMWF — free, CORS-enabled) ────
  useEffect(()=>{
    function fetchWx() {
      const url=`https://api.open-meteo.com/v1/forecast?`+
        `latitude=${FCC_LAT}&longitude=${FCC_LON}`+
        `&current=temperature_2m,apparent_temperature,precipitation,`+
        `weathercode,windspeed_10m,is_day`+
        `&hourly=temperature_2m,apparent_temperature,precipitation,`+
        `precipitation_probability,weathercode,windspeed_10m,visibility,is_day`+
        `&daily=sunrise,sunset,precipitation_sum,weathercode,`+
        `temperature_2m_max,temperature_2m_min,windspeed_10m_max,`+
        `precipitation_probability_max`+
        `&timezone=Europe%2FCopenhagen&forecast_days=7&wind_speed_unit=ms`;
      fetch(url, {cache:"no-store"})
        .then(r=>r.json())
        .then(data=>{
          const todayD=localDateStr();
          const daily=(data.daily?.time||[]).map((date,i)=>({
            date,
            code:  data.daily.weathercode[i],
            max:   Math.round(data.daily.temperature_2m_max[i]),
            min:   Math.round(data.daily.temperature_2m_min[i]),
            windMax: Math.round(data.daily.windspeed_10m_max[i]*10)/10,
            rainSum: +(data.daily.precipitation_sum[i]||0).toFixed(1),
            rainProb: data.daily.precipitation_probability_max[i]||0,
            sunrise: data.daily.sunrise[i],
            sunset:  data.daily.sunset[i],
          }));
          setWxData({
            today: todayD,
            hourly: data.hourly,
            daily: daily,
            daily0: daily[0],
            // Current conditions from the /current endpoint
            current: data.current ? {
              temp:   Math.round(data.current.temperature_2m),
              feels:  Math.round(data.current.apparent_temperature),
              precip: +(data.current.precipitation||0).toFixed(1),
              code:   data.current.weathercode,
              wind:   Math.round(data.current.windspeed_10m*10)/10,
              isDay:  data.current.is_day,
            } : null,
            fetchedAt: Date.now(),
          });
        })
        .catch(()=>setWxData({error:true}));
    }
    fetchWx();
    // Re-fetch every 30 minutes so temperature stays current
    const timer = setInterval(fetchWx, 30*60*1000);
    return ()=>clearInterval(timer);
  },[]);


  function addTeam(e) {
    e.preventDefault();
    const n = newTName.trim();
    if(!n) return;
    if(teams.find(t=>t.name.toLowerCase()===n.toLowerCase())) {
      showToast("A team with that name already exists"); return;
    }
    saveTeams([...teams, {id:uid(), name:n, senior:newTSenior}]);
    logAction("group", `Created group: "${n}" (${newTSenior?"Senior":"Youth"})`);
    setNewTName(""); setNewTSenior(false);
    showToast(`Group "${n}" added ✓`);
  }

  function renameTeam(id, newName) {
    const n = newName.trim();
    if(!n) return;
    const old = teams.find(t=>t.id===id)?.name;
    if(!old) return;
    saveMembers(members.map(m=>m.team===old ? {...m,team:n} : m));
    saveTeams(teams.map(t=>t.id===id ? {...t,name:n} : t));
    logAction("group", `Renamed group: "${old}" → "${n}"`);
    setEditingTeam(null);
    showToast(`Renamed to "${n}" ✓`);
  }

  function deleteTeam(id) {
    const t = teams.find(t=>t.id===id);
    if(!t) return;
    if(!window.confirm(`Delete group "${t.name}"? Members in this group will be moved to Unassigned.`)) return;
    saveMembers(members.map(m=>m.team===t.name ? {...m,team:null,role:"member"} : m));
    saveTeams(teams.filter(t=>t.id!==id));
    logAction("group", `Deleted group: "${t.name}"`);
    showToast(`Group "${t.name}" deleted`);
  }

  function toggleTeamSenior(id) {
    const t = teams.find(t=>t.id===id);
    if(!t) return;
    if(t.senior) {
      saveMembers(members.map(m=>
        m.team===t.name && ["captain","vicecaptain"].includes(m.role)
          ? {...m,role:"member"} : m
      ));
    }
    saveTeams(teams.map(t=>t.id===id ? {...t,senior:!t.senior} : t));
    logAction("group", `Changed "${t.name}" type: ${t.senior?"Senior→Youth":"Youth→Senior"}`);
    showToast(`"${t.name}" set to ${t.senior?"Youth":"Senior"} ✓`);
  }

  // ── Recurring slots ───────────────────────────────────────────
  function addRecurringSlot(slot) {
    const next = [...recurring, {...slot, id:uid(), enabled:true}];
    saveRecurring(next);
    logAction("recurring", `Added recurring slot: "${slot.name}" (${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][slot.day]}, ${slot.from}–${slot.to}${slot.team?", "+slot.team:""})`);
    showToast(`Recurring slot "${slot.name}" added ✓`);
  }
  function toggleRecurringSlot(id) {
    const slot = recurring.find(r=>r.id===id);
    const next = recurring.map(r=>r.id===id ? {...r,enabled:!r.enabled} : r);
    saveRecurring(next);
    if(slot) logAction("recurring", `${slot.enabled?"Disabled":"Enabled"} recurring slot: "${slot.name}"`);
  }
  function deleteRecurringSlot(id) {
    const slot = recurring.find(r=>r.id===id);
    if(!slot) return;
    if(!window.confirm(`Delete recurring slot "${slot.name}"? Existing sessions from this slot are kept.`)) return;
    saveRecurring(recurring.filter(r=>r.id!==id));
    logAction("recurring", `Deleted recurring slot: "${slot.name}"`);
    showToast(`Slot "${slot.name}" deleted`);
  }
  function deleteRecurringSlotSilent(id) {
    // No confirm — used when checkbox is already the user's confirmation
    const slot = recurring.find(r=>r.id===id);
    if(!slot) return;
    saveRecurring(recurring.filter(r=>r.id!==id));
    logAction("recurring", `Deleted recurring slot: "${slot.name}"`);
  }
  function updateRecurringSlot(id, changes) {
    const slot = recurring.find(r=>r.id===id);
    saveRecurring(recurring.map(r=>r.id===id ? {...r,...changes} : r));
    if(slot) logAction("recurring", `Updated recurring slot: "${slot.name}" → "${changes.name||slot.name}"`);
    showToast("Slot updated ✓");
  }

  // ── Sessions ──────────────────────────────────────────────────
  // Returns true if two time ranges overlap (exclusive of touching endpoints)
  function timesOverlap(aFrom, aTo, bFrom, bTo) {
    const toMins = t => { const [h,m]=t.split(":").map(Number); return h*60+m; };
    return toMins(aFrom) < toMins(bTo) && toMins(bFrom) < toMins(aTo);
  }

  function handleAddSession(e) {
    e.preventDefault();
    if(!bDate||selP.length===0){showToast("Pick a date & at least one player");return;}
    const pollOptions = bPollOpts.map(o=>({...o, votes:[]}));
    const restrictedTo = bRestrictTeam || null;
    const isLeader = ["superadmin","admin","captain","vicecaptain","t20captain","t20vicecaptain"].includes(userRole)||!!getTeamRole(currentUser?.name,teams);

    // Absence check — warn if self is marked away on booking date
    if(bDate && currentUser && selP.includes(currentUser.name)) {
      const me = members.find(m=>m.id===currentUser.id);
      if(me && isAbsent(me, bDate)) {
        const abs = (me.absences||[]).find(a=>a.from<=bDate&&a.to>=bDate);
        const msg = `You've marked yourself away during this period (${abs?.category||"Away"}: ${fmtShort(abs?.from)} – ${fmtShort(abs?.to)}). Book anyway?`;
        if(!window.confirm(msg)) return;
      }
    }

    // Prime time enforcement for members
    if(!isLeader) {
      const prime = isPrimeTime(bFrom);
      const maxMins = toMinsNet(bFrom) + (prime ? 60 : 120);
      if(toMinsNet(bTo) > maxMins) {
        const allowed = prime ? "1 hour" : "2 hours";
        showToast(`⭐ Prime hours: max ${allowed} per booking at this time`);
        return;
      }
    }

    // Auto-enroll team members when session is restricted
    let autoPlayers = [...selP];
    if(isLeader && restrictedTo) {
      const teamMembers = members
        .filter(m => (m.teams||[]).includes(restrictedTo))
        .map(m => m.name);
      autoPlayers = [...new Set([...autoPlayers, ...teamMembers])];
    }

    // Exact match — merge players into existing session (including recurring)
    const ex=sessions.find(s=>s.date===bDate&&s.from===bFrom&&s.to===bTo);
    if(ex){
      const merged=[...new Set([...ex.players,...autoPlayers])];
      const mergedPoll = ex.poll || [];
      const existingIds = mergedPoll.map(o=>o.id);
      const newOpts = pollOptions.filter(o=>!existingIds.includes(o.id));
      saveSessions(sessions.map(s=>s.id===ex.id?{...s,players:merged,
        label:s.label||bLabel,restrictedTo:s.restrictedTo||restrictedTo,
        poll:[...mergedPoll,...newOpts]}:s));
      logAction("session", `Added players to session on ${bDate} (${bFrom}–${bTo}): ${autoPlayers.join(", ")}`);
      showToast(`Players added to session on ${fmtShort(bDate)} ✓`);
      // Confirmation email if current user added themselves
      if(autoPlayers.includes(currentUser?.name) && !ex.players.includes(currentUser?.name))
        sendBookingConfirm(members.find(m=>m.name===currentUser?.name),
          {...ex,label:ex.label||bLabel}, merged);
    } else {
      // Check 1: net conflict — same net at overlapping time
      const netConflict = sessions.find(s=>
        s.date===bDate &&
        timesOverlap(bFrom,bTo,s.from,s.to) &&
        (s.net==="both"||bNet==="both"||s.net===bNet)
      );
      if(netConflict) {
        showToast(`🚫 ${netConflict.net==="both"?"Both nets are":
          `Net ${netConflict.net} is`} already booked ${netConflict.from}–${netConflict.to}`);
        return;
      }
      // Check 2: player conflict — same player in an overlapping session
      const overlapping = sessions.filter(s=>
        s.date===bDate && timesOverlap(bFrom,bTo,s.from,s.to)
      );
      const alreadyBooked = overlapping.filter(s=>
        autoPlayers.some(p=>s.players.includes(p))
      );
      if(alreadyBooked.length>0) {
        const clash = alreadyBooked[0];
        showToast(`⚠️ ${autoPlayers.find(p=>clash.players.includes(p))} already has a session at this time (${clash.from}–${clash.to}${clash.label?" · "+clash.label:""})`);
        return;
      }
      const addedCount = autoPlayers.length - selP.length;
      const newSess = {id:uid(),date:bDate,from:bFrom,to:bTo,
        players:[...autoPlayers],note:bNote.trim(),label:bLabel.trim(),
        net:bNet,
        createdBy: currentUser?.name||null,
        lifts: bLift && currentUser?.name ? {[currentUser.name]: {pref:bLift,seats:1,stop:"",stopOther:"",note:"",saved:true}} : {},
        restrictedTo,poll:pollOptions,comments:[]};
      saveSessions([...sessions, newSess]
        .sort((a,b)=>new Date(a.date)-new Date(b.date)));
      logAction("session", `Created session: ${bDate} ${bFrom}–${bTo}${bLabel?" «"+bLabel+"»":""}${restrictedTo?" ("+restrictedTo+" only)":""} — ${autoPlayers.length} player${autoPlayers.length>1?"s":""}: ${autoPlayers.join(", ")}`);
      const autoMsg = addedCount > 0 ? ` · ${addedCount} team member${addedCount>1?"s":""} auto-enrolled` : "";
      showToast(`Session booked for ${fmtShort(bDate)} ✓${autoMsg}`);
      // Confirmation email to the person who booked
      if(autoPlayers.includes(currentUser?.name))
        sendBookingConfirm(members.find(m=>m.name===currentUser?.name), newSess, autoPlayers);
    }
    setBDate("");setBNote("");setBLabel("");setBRestrictTeam("");setBNet("1");setBLift("");
    setSelP([currentUser?.name].filter(Boolean));setBPollOpts([...PRESET_POLL]);setBCustomOpt("");
    setView("schedule");
  }

  function setLiftPref(sessId, name, liftObj) {
    // liftObj: {pref,seats,stop,stopOther,note,saved} or "" to clear
    const updated = sessions.map(s => {
      if(s.id !== sessId) return s;
      const lifts = {...(s.lifts||{})};
      if(liftObj && liftObj.pref) lifts[name] = liftObj;
      else delete lifts[name];
      return {...s, lifts};
    });
    saveSessions(updated);
    if(selSess?.id === sessId) {
      const newLifts = {...(selSess.lifts||{})};
      if(liftObj && liftObj.pref) newLifts[name] = liftObj;
      else delete newLifts[name];
      setSelSess({...selSess, lifts: newLifts});
    }
    setLiftEditing(false);
    setLiftDraft(null);
  }

  function handlePostComment(sessId, text) {
    if(!text.trim()) return;
    const comment = { id:uid(), name:currentUser.name, text:text.trim(),
      ts: new Date().toISOString() };
    saveSessions(sessions.map(s => s.id===sessId
      ? {...s, comments:[...(s.comments||[]), comment]}
      : s));
    setCommentText("");
  }

  function handleDeleteComment(sessId, commentId) {
    saveSessions(sessions.map(s => s.id===sessId
      ? {...s, comments:(s.comments||[]).filter(c=>c.id!==commentId)}
      : s));
  }

  function handleVote(sessId, optionId) {
    const userName = currentUser.name;
    const updated = sessions.map(s => {
      if(s.id !== sessId) return s;
      const poll = (s.poll||[]).map(o => {
        if(o.id !== optionId) return o;
        const hasVoted = (o.votes||[]).includes(userName);
        return {...o, votes: hasVoted
          ? o.votes.filter(v=>v!==userName)
          : [...(o.votes||[]), userName]};
      });
      return {...s, poll};
    });
    saveSessions(updated);
    // Keep selSess in sync
    const found = updated.find(s=>s.id===sessId);
    if(found) setSelSess(found);
  }

  function handleLeave(sessId, name) {
    const upd=sessions.map(s=>s.id===sessId
      ?{...s,players:s.players.filter(p=>p!==name)}:s).filter(s=>s.players.length>0);
    saveSessions(upd);
    const found=upd.find(s=>s.id===sessId);
    if(!found){setView("schedule");setSelSess(null);}
    else setSelSess(found);
    showToast("Removed from session");
  }

  // Send booking confirmation email if member has it enabled
  function sendBookingConfirm(member, sess, updatedPlayers) {
    if(!member?.email) return;
    if(!(member.emailBookingConfirm??true)) return;
    fetch("/api/send-booking-confirm",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        email: member.email,
        name:  member.name,
        date:  sess.date,
        from:  sess.from,
        to:    sess.to,
        label: sess.label||"",
        net:   sess.net||"",
        players: updatedPlayers||sess.players||[],
      })
    }).catch(()=>{});
  }

  function handleJoinDetail(name) {
    if(!selSess) return;
    if(selSess.players.includes(name)){showToast("Already in this session");return;}
    // Absence soft warn
    const mem = members.find(m=>m.name===name);
    if(mem && isAbsent(mem, selSess.date)) {
      const abs = (mem.absences||[]).find(a=>a.from<=selSess.date&&a.to>=selSess.date);
      const isSelf = name===currentUser?.name;
      const msg = isSelf
        ? `You've marked yourself away during this period (${abs?.category||"Away"}: ${fmtShort(abs?.from)} – ${fmtShort(abs?.to)}). Add yourself anyway?`
        : `${name.split(" ")[0]} is marked away on this date (${abs?.category||"Away"}: ${fmtShort(abs?.from)} – ${fmtShort(abs?.to)}). Add them anyway?`;
      if(!window.confirm(msg)) return;
    }
    const updatedPlayers = [...selSess.players, name];
    const upd=sessions.map(s=>s.id===selSess.id?{...s,players:updatedPlayers}:s);
    saveSessions(upd);
    setSelSess(upd.find(s=>s.id===selSess.id));
    showToast(`${name.split(" ")[0]} added ✓`);
    if(name===currentUser?.name)
      sendBookingConfirm(members.find(m=>m.name===name), selSess, updatedPlayers);
  }

  function handleDeleteSess(id) {
    const s = sessions.find(x=>x.id===id);
    saveSessions(sessions.filter(s=>s.id!==id));
    if(s) logAction("session", `Deleted session: ${s.date} ${s.from}–${s.to}${s.label?" «"+s.label+"»":""} (${s.players?.length||0} players)`);
    setView("schedule");setSelSess(null);
    showToast("Session deleted");
  }

  function openWA(date) {
    const msg=waMsg(sessions,date);
    if(!msg){showToast("No sessions for that date");return;}
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
  }

  // ── Members ───────────────────────────────────────────────────
  function addMember(e) {
    e.preventDefault();
    if(!newName.trim()) return;
    if(members.find(m=>m.name.toLowerCase()===newName.trim().toLowerCase())){
      showToast("Member already exists"); return;
    }
    const teamLabel = newTeam==="Unassigned" ? "no team" : newTeam;
    const newId = uid();
    const newMember = normMember({
      id: newId, 
      name: newName.trim(),
      // Parents get no team; children and players get the selected team
      teams: (newMemberType==="parent"||newTeam==="Unassigned") ? [] : [newTeam],
      role: "member",
      memberType: newMemberType==="child" ? "player" : newMemberType, // children are stored as players with a parentId
      email: newEmail.trim()||null,
      phone: newPhone.trim()||null,
      children: [],
      parentId: newMemberType==="child" ? (newLinkParent||null) : null,
      parentName: newMemberType==="child" && newLinkParent ? members.find(m=>m.id===newLinkParent)?.name : null,
    });
    
    // If linking child to a parent, also update the parent's children array
    let updatedMembers = [...members, newMember];
    if (newMemberType==="child" && newLinkParent) {
      updatedMembers = updatedMembers.map(m => 
        m.id === newLinkParent 
          ? { ...m, children: [...(m.children||[]), newId], memberType: "parent" }
          : m
      );
    }
    
    saveMembers(updatedMembers);
    const linkInfo = (newMemberType==="child"&&newLinkParent) ? ` · Linked to ${members.find(m=>m.id===newLinkParent)?.name}` : "";
    logAction("member", `Added member: ${newName.trim()} (${teamLabel})${newEmail?" · "+newEmail:""}${linkInfo}`);

    // Auto-generate invite code if requested (useful for members without email)
    if(newGenCode) {
      const code = generateInviteCode(newId);
      setCodeModal({name: newName.trim(), code});
    }

    setNewName(""); setNewEmail(""); setNewPhone(""); setNewMemberType("player"); setNewLinkParent(""); setNewGenCode(false);
    if(!newGenCode) showToast("Member added ✓");
  }

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [codeModal, setCodeModal] = useState(null); // {name, code} — invite code display modal
  const [schedFilter,   setSchedFilter]   = useState("all"); // "all" | "mine"
  const [blocksExpanded, setBlocksExpanded] = useState(false);
  const [showPastAll,       setShowPastAll]       = useState(false);
  const [showUpcomingAll,   setShowUpcomingAll]   = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(()=>{
    try{ return localStorage.getItem("fcc-welcome-v1")==="1"; }catch{ return false; }
  });
  const [showAllBlocks,  setShowAllBlocks]  = useState(false);
  const [xlsParsed,      setXlsParsed]      = useState(null);  // {fixtures, allMatches} from uploaded DCF xlsx
  const [xlsError,       setXlsError]       = useState(null);
  // Availability / absence state
  const [absFrom,        setAbsFrom]        = useState("");
  const [absTo,          setAbsTo]          = useState("");
  const [absCat,         setAbsCat]         = useState("Holiday");
  const [absNote,        setAbsNote]        = useState("");
  const [absConflicts,   setAbsConflicts]   = useState(null);
  const [avTeam,         setAvTeam]         = useState("");   // team availability view selection
  const [showMatches,    setShowMatches]    = useState(true); // match overlay toggle
  const [netsDate,       setNetsDate]       = useState(todayStr());
  const [wxData,         setWxData]         = useState(null); // weather data
  // blockCals — moved to useFirestore (Pass 4)
  const [bCalDate,      setBCalDate]      = useState("");
  const [bCalFrom,      setBCalFrom]      = useState("10:00");
  const [bCalTo,        setBCalTo]        = useState("14:00");
  const [bCalLabel,     setBCalLabel]     = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false); // member object to confirm delete
  const [profileEmail, setProfileEmail]   = useState("");
  const [profilePhone, setProfilePhone]   = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileAttrsEditing, setProfileAttrsEditing] = useState(false);
  const [profileAttrsDraft, setProfileAttrsDraft] = useState({ battingHand: "right", bowlingHand: "right", bowlingStyle: "" });
  const [changingPin,  setChangingPin]    = useState(false);
  const [oldPin,       setOldPin]         = useState("");
  const [newPin1,      setNewPin1]        = useState("");
  const [newPin2,      setNewPin2]        = useState("");
  const [pinMsg,       setPinMsg]         = useState("");

  function removeMember(id) {
    const m = members.find(x=>x.id===id);
    saveMembers(members.filter(m=>m.id!==id));
    if(m) logAction("member", `Deleted member: ${m.name} (was ${m.role||"member"}${m.teams?.length ? ", teams: "+m.teams.join(", ") : ""})`);
    setConfirmDelete(null);
    showToast("Member removed");
  }

  function renameMember(id, newName) {
    const trimmed = newName.trim();
    if(!trimmed) { setEditingName(null); return; }
    const old = members.find(m=>m.id===id)?.name;
    if(!old || trimmed===old) { setEditingName(null); return; }
    if(members.find(m=>m.id!==id && m.name.toLowerCase()===trimmed.toLowerCase())) {
      showToast("Another member already has that name"); return;
    }
    // Update member name
    saveMembers(members.map(m=>m.id===id ? {...m,name:trimmed} : m));
    logAction("member", `Renamed member: "${old}" → "${trimmed}"`);
    // Update all sessions that reference the old name
    const updSess = sessions.map(s=>({
      ...s,
      players: s.players.map(p=>p===old ? trimmed : p),
      poll: (s.poll||[]).map(o=>({
        ...o, votes:(o.votes||[]).map(v=>v===old ? trimmed : v)
      })),
    }));
    saveSessions(updSess);
    setEditingName(null);
    showToast(`Renamed to "${trimmed}" ✓`);
  }

  function fixAllNames() {
    // Only fix members whose entire name is a single word AND it exists in NAME_MAP
    let renames = []; // [{old, new}]
    const newMembers = members.map(m => {
      const isSingleWord = !m.name.includes(" ");
      const mapped = NAME_MAP[m.name];
      if (isSingleWord && mapped && mapped !== m.name) {
        renames.push({ old: m.name, new: mapped });
        return { ...m, name: mapped };
      }
      return m;
    });
    if (renames.length === 0) { showToast("All names already look complete ✓"); return; }
    // Apply renames to sessions (players + poll votes)
    const rMap = Object.fromEntries(renames.map(r => [r.old, r.new]));
    const newSessions = sessions.map(s => ({
      ...s,
      players: s.players.map(p => rMap[p] || p),
      poll: (s.poll || []).map(o => ({
        ...o, votes: (o.votes || []).map(v => rMap[v] || v),
      })),
    }));
    saveMembers(newMembers);
    saveSessions(newSessions);
    logAction("system", `Auto-fixed ${renames.length} name${renames.length>1?"s":""}: ${renames.map(r=>`"${r.old}"→"${r.new}"`).join(", ")}`);
    showToast(`Fixed ${renames.length} name${renames.length > 1 ? "s" : ""} ✓`);
  }

  function toggleMemberTeam(id, teamName) {
    const mem = members.find(m=>m.id===id);
    if(!mem) return;
    const current = mem.teams || [];
    const next = current.includes(teamName)
      ? current.filter(t=>t!==teamName)
      : [...current, teamName];
    // If no senior team remains and role is captain/VC, demote
    const hasSenior = next.some(t=>seniorTeamNames.includes(t));
    const newRole = (!hasSenior && ["captain","vicecaptain"].includes(mem.role))
      ? "member" : mem.role;
    const action = current.includes(teamName) ? "Removed" : "Added";
    logAction("team", `${action} ${mem.name} ${action==="Added"?"to":"from"} ${teamName}${newRole!==mem.role?` (demoted to member — no senior team)`:""}`);
    saveMembers(members.map(m=>m.id===id ? {...m,teams:next,role:newRole} : m));
  }

  function updateRole(id, role) {
    const mem = members.find(m=>m.id===id);
    const hasSenior = (mem?.teams||[]).some(t=>seniorTeamNames.includes(t));
    if(["captain","vicecaptain"].includes(role) && !hasSenior) {
      showToast("Captain/VC only available for Senior team members"); return;
    }
    logAction("role", `Changed role: ${mem?.name} → ${role} (was ${mem?.role||"member"})`);
    saveMembers(members.map(m=>m.id===id?{...m,role}:m));
    setEditingRole(null);
    showToast("Role updated ✓");
  }

  function saveProfile(confirmed=false) {
    const now = new Date().toISOString();
    const updated = members.map(m => m.id===currentUser.id
      ? {...m,
          email: profileEmail.trim(),
          phone: profilePhone.trim(),
          profileConfirmedAt: confirmed ? now : (m.profileConfirmedAt||null),
        } : m);
    saveMembers(updated);
    const fresh = updated.find(m=>m.id===currentUser.id);
    setCurrentUser(fresh);
    localStorage.setItem("fcc-current-user", JSON.stringify(fresh));
    setProfileEditing(false);
    showToast(confirmed ? "Profile confirmed ✓" : "Profile saved ✓");
  }

  function confirmProfile() {
    // Save current details + stamp confirmed date
    setProfileEmail(members.find(m=>m.id===currentUser.id)?.email||"");
    setProfilePhone(members.find(m=>m.id===currentUser.id)?.phone||"");
    saveProfile(true);
  }

  function handleChangePin() {
    if(!oldPin||!newPin1||!newPin2){setPinMsg("Fill in all fields");return;}
    // EMERGENCY: Accept 0000 as valid current PIN for everyone during recovery
    const isValidCurrent = oldPin === "0000" || hashPin(oldPin) === pins[currentUser.id];
    if(!isValidCurrent){setPinMsg("Current PIN is incorrect");return;}
    if(newPin1.length!==4||!/^\d+$/.test(newPin1)){setPinMsg("New PIN must be 4 digits");return;}
    if(newPin1!==newPin2){setPinMsg("New PINs don't match");return;}
    savePins({...pins,[currentUser.id]:hashPin(newPin1)});
    setChangingPin(false);setOldPin("");setNewPin1("");setNewPin2("");setPinMsg("");
    showToast("PIN changed ✓");
  }

  function resetPin(id) {
    const m = members.find(x=>x.id===id);
    const updated={...pins}; delete updated[id];
    savePins(updated);
    if(m) logAction("pin", `Reset PIN for: ${m.name}`);
    showToast("PIN cleared — member sets new PIN on next login");
  }

  // ── Computed ──────────────────────────────────────────────────
  const upcoming = [...sessions].filter(s=>!isSessionPast(s))
    .sort((a,b)=>new Date(a.date)-new Date(b.date)||a.from.localeCompare(b.from));
  const past=[...sessions].filter(s=>isSessionPast(s))
    .sort((a,b)=>new Date(b.date)-new Date(a.date)||b.from.localeCompare(a.from));

  const tomorrowSess=sessions.filter(s=>s.date===tomorrowStr()&&!isSessionPast(s));
  const todaySess   =sessions.filter(s=>s.date===todayStr()   &&!isSessionPast(s));

  // Player picker — member appears under EACH of their teams
  const pickVisible = members.filter(m=>
    !pSearch || m.name.toLowerCase().includes(pSearch.toLowerCase())
  );
  const myTeamsList = currentUser ? (members.find(m=>m.id===currentUser.id)?.teams||[]) : [];
  // Build pickGrouped with user's teams first, then others
  // IMPORTANT: Each player appears under their FIRST matching team only (no duplicates)
  const pickGrouped = (()=>{
    // Sort teams: user's teams first, then alphabetical
    const sortedTeams = [...ALL_TEAMS].sort((a,b)=>{
      const aIsMine = myTeamsList.includes(a);
      const bIsMine = myTeamsList.includes(b);
      if(aIsMine && !bIsMine) return -1;
      if(!aIsMine && bIsMine) return 1;
      return a.localeCompare(b);
    });
    
    const seen = new Set(); // Track which player IDs we've already placed
    const obj = {};
    
    for(const t of sortedTeams) {
      if(pFilter!=="All" && pFilter!==t) continue;
      const list = pickVisible.filter(m => {
        if(seen.has(m.id)) return false; // Already placed in another group
        const belongsToTeam = t==="Unassigned" 
          ? (m.teams||[]).length===0
          : (m.teams||[]).includes(t);
        if(belongsToTeam) {
          seen.add(m.id); // Mark as placed
          return true;
        }
        return false;
      });
      if(list.length) obj[t] = list;
    }
    
    return obj;
  })();

  // Admin list — member shown under EACH team (or Unassigned if none)
  const adminVisible = members.filter(m=>{
    const q=!aSearch||m.name.toLowerCase().includes(aSearch.toLowerCase());
    const t=aFilter==="All"
      ||(aFilter==="Unassigned" && (m.teams||[]).length===0)
      ||(m.teams||[]).includes(aFilter);
    return q&&t;
  });
  const adminGrouped = ALL_TEAMS.reduce((acc,t)=>{
    if(aFilter!=="All"&&aFilter!==t) return acc;
    const list = adminVisible.filter(m=>
      t==="Unassigned"
        ? (m.teams||[]).length===0
        : (m.teams||[]).includes(t)
    );
    if(list.length) acc[t]=list;
    return acc;
  },{});

  // ════════════════════════════════════════════════════════════
  // Pass 5: assemble shared context value
  // ════════════════════════════════════════════════════════════
  // Pure plumbing — wired into <AppContext.Provider> below, around the
  // entire render. View blocks still read these values from App's
  // closure today; Pass 6 will rewrite them to call useAppContext().
  const contextValue = {
    // ── from useFirestore (Pass 4 hook) ────────────────────────
    ...firestoreState,
    // ── from useAuth (Pass 4 hook) ─────────────────────────────
    ...authState,
    // ── theme ──────────────────────────────────────────────────
    G, themeKey, setThemeKey, applyTheme,
    // ── core UI state ──────────────────────────────────────────
    view, setView,
    selSess, setSelSess,
    toast, setToast, showToast,
    sessAttendance, setSessAttendance,
    attendanceSessionContext, setAttendanceSessionContext,
    sessCoachView, setSessCoachView,
    sessNotes, setSessNotes,
    sessNotesDraft, setSessNotesDraft,
    cancelModal, setCancelModal,
    // ── add-session form ───────────────────────────────────────
    bDate, setBDate, bFrom, setBFrom, bTo, setBTo,
    bNote, setBNote, bLabel, setBLabel, bNet, setBNet, bLift, setBLift,
    liftEditing, setLiftEditing, liftDraft, setLiftDraft,
    carpoolFocus, setCarpoolFocus,
    notInExpanded, setNotInExpanded,
    notInSearch, setNotInSearch,
    editingLocation, setEditingLocation,
    assignOpen, setAssignOpen,
    cancelReason, setCancelReason,
    showCancelled, setShowCancelled,
    carpoolSheetSess, setCarpoolSheetSess,
    carpoolRef,
    bRestrictTeam, setBRestrictTeam,
    selP, setSelP, pSearch, setPSearch, pFilter, setPFilter,
    otherGroupsOpen, setOtherGroupsOpen,
    bPollOpts, setBPollOpts, bCustomOpt, setBCustomOpt,
    commentText, setCommentText,
    // ── admin form / member-list state ─────────────────────────
    newName, setNewName, newTeam, setNewTeam,
    newEmail, setNewEmail, newPhone, setNewPhone,
    newMemberType, setNewMemberType,
    newLinkParent, setNewLinkParent,
    newGenCode, setNewGenCode,
    aSearch, setASearch, aFilter, setAFilter,
    adminListMode, setAdminListMode,
    selMember, setSelMember,
    expandedSessions, setExpandedSessions,
    editingRole, setEditingRole,
    // ── team management state ──────────────────────────────────
    newTName, setNewTName,
    newTSenior, setNewTSenior,
    editingTeam, setEditingTeam,
    coachSearch, setCoachSearch,
    // ── Captain XI state ───────────────────────────────────────
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
    // ── admin section collapse ─────────────────────────────────
    adminSec, setAdminSec, toggleAdminSec,
    editingName, setEditingName,
    // ── recurring slot form ────────────────────────────────────
    DAYS,
    rName, setRName, rTeam, setRTeam, rRestrict, setRRestrict,
    rDay, setRDay, rFrom, setRFrom, rTo, setRTo,
    rActiveFrom, setRActiveFrom, rActiveTo, setRActiveTo,
    rNet, setRNet,
    editingSlot, setEditingSlot,
    dismissedMissing, setDismissedMissing,
    // ── help / audit log UI ────────────────────────────────────
    helpMsg, setHelpMsg, helpCat, setHelpCat,
    logFilter, setLogFilter, logOpen, setLogOpen,
    // ── request-to-join form ───────────────────────────────────
    jrName, setJrName, jrTeam, setJrTeam,
    jrContact, setJrContact, jrPhone, setJrPhone,
    jrForChild, setJrForChild,
    jrChildName, setJrChildName, jrChildTeam, setJrChildTeam,
    // ── profile tabs ───────────────────────────────────────────
    profileTab, setProfileTab,
    showAllMatches, setShowAllMatches,
    // ── self-service verify flow ───────────────────────────────
    vfStep, setVfStep, vfSearch, setVfSearch, vfMatch, setVfMatch,
    vfEmail, setVfEmail, vfPhone, setVfPhone,
    vfCode, setVfCode, vfSentCode, setVfSentCode,
    vfCodeExpiry, setVfCodeExpiry, vfSending, setVfSending,
    vfError, setVfError, vfConsent, setVfConsent,
    vfIsParent, setVfIsParent,
    vfChildName, setVfChildName,
    vfNewName, setVfNewName, vfNewTeam, setVfNewTeam,
    // ── confirm/code/sched/availability state ──────────────────
    confirmDelete, setConfirmDelete,
    codeModal, setCodeModal,
    schedFilter, setSchedFilter,
    blocksExpanded, setBlocksExpanded,
    showPastAll, setShowPastAll,
    showUpcomingAll, setShowUpcomingAll,
    welcomeDismissed, setWelcomeDismissed,
    showAllBlocks, setShowAllBlocks,
    xlsParsed, setXlsParsed, xlsError, setXlsError,
    absFrom, setAbsFrom, absTo, setAbsTo,
    absCat, setAbsCat, absNote, setAbsNote,
    absConflicts, setAbsConflicts,
    avTeam, setAvTeam,
    showMatches, setShowMatches,
    netsDate, setNetsDate,
    wxData, setWxData,
    bCalDate, setBCalDate, bCalFrom, setBCalFrom,
    bCalTo, setBCalTo, bCalLabel, setBCalLabel,
    showBlockForm, setShowBlockForm,
    profileEmail, setProfileEmail,
    profilePhone, setProfilePhone,
    profileEditing, setProfileEditing,
    profileAttrsEditing, setProfileAttrsEditing,
    profileAttrsDraft, setProfileAttrsDraft,
    changingPin, setChangingPin,
    oldPin, setOldPin, newPin1, setNewPin1, newPin2, setNewPin2,
    pinMsg, setPinMsg,
    // ── derived values used inside view blocks ─────────────────
    userRole, seniorTeamNames, ALL_TEAMS,
    upcoming, past, tomorrowSess, todaySess,
    pickVisible, myTeamsList, pickGrouped,
    adminVisible, adminGrouped,
    // ── misc helpers defined inside App ────────────────────────
    generateInviteCode, genCode, hashCode,
    addTeam, renameTeam, deleteTeam, toggleTeamSenior,
    addRecurringSlot, toggleRecurringSlot, deleteRecurringSlot,
    deleteRecurringSlotSilent, updateRecurringSlot,
    timesOverlap, handleAddSession,
    setLiftPref, handlePostComment, handleDeleteComment,
    handleVote, handleLeave, sendBookingConfirm,
    handleJoinDetail, handleDeleteSess, openWA,
    addMember, removeMember, renameMember, fixAllNames,
    toggleMemberTeam, updateRole,
    saveProfile, confirmProfile, handleChangePin, resetPin,
    // ── module-scope constants commonly referenced ─────────────
    uid,
  };

  // ════════════════════════════════════════════════════════════
  // RENDER: Loading
  // ════════════════════════════════════════════════════════════
  const renderApp = () => {
  if(loading) return (
    <Shell G={G}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
        <div style={{textAlign:"center",color:G.mid}}>
          <div style={{fontSize:48,marginBottom:12}}>🏏</div>
          <div style={{fontWeight:800,fontSize:18}}>Loading FCC Training…</div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — pick member
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="pick") {
    const filtered = pickSearch.trim().length >= 1
      ? members.filter(m => m.name.toLowerCase().includes(pickSearch.toLowerCase()))
      : [];
    const hasQuery = pickSearch.trim().length >= 1;

    return (
      <Shell G={G}>
        {/* Header */}
        <div style={{background:G.green, padding:"36px 24px 32px", textAlign:"center"}}>
          <img src={FCC_LOGO} alt="FCC" style={{width:88,height:88,borderRadius:"50%",
            objectFit:"cover",margin:"0 auto 14px",display:"block",
            border:"3px solid rgba(255,255,255,0.25)",
            boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}/>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:28,fontWeight:900,letterSpacing:"-.5px",lineHeight:1}}>FCC Training</div>
          <div style={{color:"rgba(255,255,255,0.45)",fontSize:11,fontWeight:700,
            letterSpacing:2.5,textTransform:"uppercase",marginTop:5}}>Fredensborg CC</div>
        </div>

        <div style={{padding:"24px 20px 40px"}}>
          {/* Prompt text */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:15,fontWeight:800,color:G.text}}>Enter your name to find your profile and log in</div>
            <div style={{fontSize:12,color:G.muted,marginTop:4}}>
              Not listed? Ask an admin to add you.
            </div>
          </div>

          {/* Search input */}
          <div style={{position:"relative",marginBottom:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
              fontSize:18,pointerEvents:"none"}}>🔍</span>
            <input
              style={{...iSt({background:G.white,paddingLeft:44,fontSize:16,
                borderRadius:14,padding:"14px 14px 14px 44px",
                boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}),}}
              placeholder="Start typing your name…"
              value={pickSearch}
              onChange={e=>setPickSearch(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Results as chips */}
          {hasQuery && filtered.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:9,justifyContent:"center",
              marginTop:8}}>
              {filtered.map(m=>{
                const tm = m.team ? getTeamMeta(m.team) : null;
                return (
                  <button key={m.id} onClick={()=>handlePickMember(m)}
                    style={{
                      background: tm ? tm.bg : G.green,
                      color: tm ? tm.text : G.lime,
                      border:"none", borderRadius:30,
                      padding:"10px 18px",
                      fontFamily:"inherit", fontWeight:800, fontSize:14,
                      cursor:"pointer",
                      display:"flex", alignItems:"center", gap:7,
                      boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
                      transition:"transform .1s, box-shadow .1s",
                    }}
                    onMouseDown={e=>e.currentTarget.style.transform="scale(0.96)"}
                    onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
                  >
                    <span style={{width:24,height:24,borderRadius:"50%",
                      background:"rgba(255,255,255,0.2)",display:"inline-flex",
                      alignItems:"center",justifyContent:"center",
                      fontSize:10,fontWeight:900,flexShrink:0}}>
                      {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                    </span>
                    {m.name}
                    {(()=>{
                      const chips=getMemberRoleChips(m,teams);
                      return chips.length>0
                        ? <span style={{fontSize:12}}>{chips[0].icon}</span>
                        : null;
                    })()}
                  </button>
                );
              })}
            </div>
          )}

          {/* No results — offer Request to Join */}
          {hasQuery && filtered.length === 0 && (
            <div style={{textAlign:"center",padding:"24px 0 8px"}}>
              <div style={{fontSize:32,marginBottom:8}}>🤔</div>
              <div style={{fontWeight:800,color:G.text,fontSize:15}}>Not found</div>
              <div style={{fontSize:13,color:G.muted,marginTop:4,marginBottom:18,lineHeight:1.6}}>
                Not in the app yet? Submit a request<br/>and an admin will add you.
              </div>
              <button onClick={()=>{
                  setJrName(pickSearch.trim());
                  setJrTeam(""); setJrContact(""); setJrPhone(""); setJrForChild(false);
                  setJrChildName(""); setJrChildTeam("");
                  setAuthView("joinrequest");
                }}
                style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
                  padding:"12px 24px",fontFamily:"inherit",fontWeight:800,fontSize:14,
                  cursor:"pointer",boxShadow:"0 3px 12px rgba(20,83,45,.3)"}}>
                ✋ Request to Join
              </button>
            </div>
          )}

          {/* Idle hint */}
          {!hasQuery && (
            <div style={{textAlign:"center",padding:"20px 0 0"}}>
              <div style={{fontSize:40,marginBottom:10,opacity:.4}}>🏏</div>
              <div style={{fontSize:13,color:G.muted,lineHeight:1.7}}>
                {members.length} members registered<br/>
                <span style={{fontWeight:700,color:G.text}}>Start typing</span> to find your name
              </div>
              <div style={{marginTop:20,paddingTop:20,borderTop:`1px solid ${G.border}`}}>
                {/* Two-button row: existing members + new members */}
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{fontSize:12,color:G.muted,marginBottom:2}}>
                    Already a member?
                  </div>
                  <button onClick={()=>{setVfStep("search");setVfSearch("");setVfMatch(null);setVfEmail("");setVfPhone("");setVfCode("");setVfError("");setVfConsent(false);setVfIsParent(false);setAuthView("verify");}}
                    style={{background:G.white,color:G.green,border:`1.5px solid ${G.green}`,
                      borderRadius:20,padding:"9px 22px",fontSize:13,fontWeight:800,
                      cursor:"pointer",fontFamily:"inherit"}}>
                    ✅ Find My Account
                  </button>
                  <div style={{fontSize:10,color:G.muted,lineHeight:1.5}}>
                    Have an <b>FCC-XXXX</b> code from your admin?<br/>
                    Find your name first, then enter it.
                  </div>
                  <div style={{height:1,background:G.border,margin:"4px 0"}}/>
                  <div style={{fontSize:12,color:G.muted,marginBottom:2}}>
                    New to Fredensborg CC?
                  </div>
                  <button onClick={()=>{
                      setJrName(""); setJrTeam(""); setJrContact(""); setJrPhone("");
                      setJrForChild(false); setJrChildName(""); setJrChildTeam("");
                      setAuthView("joinrequest");
                    }}
                    style={{background:G.green,color:G.lime,border:"none",
                      borderRadius:20,padding:"9px 22px",fontSize:13,fontWeight:800,
                      cursor:"pointer",fontFamily:"inherit",
                      boxShadow:"0 3px 12px rgba(20,83,45,.25)"}}>
                    ✋ Join Fredensborg CC
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — Request to Join
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="joinrequest") {
    const nonPlayerOption = "I don't play / I'm a parent";
    const teamOptions = [...ALL_TEAMS.filter(t=>t!=="Unassigned"), nonPlayerOption];

    function submitJoinRequest() {
      const nameToCheck = jrForChild ? jrChildName.trim() : jrName.trim();
      if(!nameToCheck) { showToast("Please enter a name"); return; }
      const teamVal = jrForChild ? jrChildTeam : jrTeam;
      const req = {
        id: uid(),
        submittedAt: new Date().toISOString(),
        forChild: jrForChild,
        playerName: jrForChild ? jrChildName.trim() : jrName.trim(),
        playerTeam: teamVal==="unsure" ? null : (teamVal||null),
        parentName: jrForChild ? jrName.trim() : null,
        email: jrContact.trim()||null,      // stored as email not contact
        contact: jrPhone.trim()||null,       // phone in contact
        status: "pending",
      };
      saveJoinRequests([...joinRequests, req]);
      fetch("/api/notify", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          type:"joinrequest",
          data:{
            name: req.playerName,
            playerTeam: req.playerTeam||"Not sure yet",
            message: req.parentName
              ? `Parent: ${req.parentName}${req.email?" · "+req.email:""}${req.contact?" · "+req.contact:""}`
              : `${req.email||""}${req.contact?" · "+req.contact:""}`
          }
        })
      }).catch(()=>{});
      setAuthView("joinrequestdone");
    }

    return (
      <Shell G={G}>
        <div style={{background:G.green,padding:"20px 20px 16px",textAlign:"center"}}>
          <div style={{fontSize:26,marginBottom:4}}>✋</div>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Request to Join</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>
            An admin will review and add you shortly
          </div>
        </div>

        <div style={{padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Registering for yourself or a child? */}
          <div style={{background:"#fff",border:`1.5px solid ${G.border}`,borderRadius:12,
            padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:G.muted,
              textTransform:"uppercase",marginBottom:10}}>Who are you registering?</div>
            <div style={{display:"flex",gap:8}}>
              {[{v:false,label:"🙋 Myself"},{v:true,label:"👶 My child"}].map(opt=>(
                <button key={String(opt.v)} onClick={()=>{
                    if(opt.v && !jrForChild) {
                      // Switching TO child tab — move typed name to child field
                      if(jrName.trim()) { setJrChildName(jrName.trim()); setJrName(""); }
                    } else if(!opt.v && jrForChild) {
                      // Switching BACK to myself — move child name back if parent name empty
                      if(!jrName.trim() && jrChildName.trim()) { setJrName(jrChildName.trim()); setJrChildName(""); }
                    }
                    setJrForChild(opt.v);
                  }}
                  style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",
                    cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,
                    background:jrForChild===opt.v ? G.green : G.bg,
                    color:jrForChild===opt.v ? G.lime : G.muted,
                    transition:"all .12s"}}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Your name (always shown — either player or parent) */}
          <div style={{background:"#fff",border:`1.5px solid ${G.border}`,borderRadius:12,
            padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
            <FFld G={G} label={jrForChild ? "Your Name (Parent / Guardian)" : "Your Full Name"}>
              <input placeholder={jrForChild ? "e.g. Priya Sharma" : "e.g. Arjun Sharma"}
                style={iSt()} value={jrName}
                onChange={e=>setJrName(e.target.value)}/>
            </FFld>
            {!jrForChild&&(
              <FFld G={G} label="Your Team / Group">
                <select style={iSt()} value={jrTeam} onChange={e=>setJrTeam(e.target.value)}>
                  <option value="">— Select your team —</option>
                  {teamOptions.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </FFld>
            )}
            <FFld G={G} label="Your Email">
              <input type="email" placeholder="your@email.com"
                style={iSt()} value={jrContact}
                onChange={e=>setJrContact(e.target.value)}/>
            </FFld>
            <FFld G={G} label="Your Phone (optional)">
              <input type="tel" placeholder="+45 XX XX XX XX"
                style={iSt()} value={jrPhone||""}
                onChange={e=>setJrPhone?.(e.target.value)}/>
            </FFld>
          </div>

          {/* Child details — only if registering for child */}
          {jrForChild&&(
            <div style={{background:"#fdf2f8",border:"1.5px solid #f9a8d4",borderRadius:12,
              padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,
                color:"#be185d",textTransform:"uppercase",marginBottom:2}}>
                👶 Child's Details
              </div>
              <FFld G={G} label="Child's Full Name">
                <input placeholder="Child's full name"
                  style={iSt()} value={jrChildName}
                  onChange={e=>setJrChildName(e.target.value)}/>
              </FFld>
              <FFld G={G} label="Child's Team / Group">
                <select style={iSt()} value={jrChildTeam} onChange={e=>setJrChildTeam(e.target.value)}>
                  <option value="">— Select team —</option>
                  <option value="unsure">I'm not sure</option>
                  {teamOptions.filter(t=>t!==nonPlayerOption).map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FFld>
            </div>
          )}

          <button onClick={submitJoinRequest}
            style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
              padding:"15px",fontSize:15,fontWeight:800,cursor:"pointer",
              fontFamily:"inherit",boxShadow:"0 3px 14px rgba(20,83,45,.3)"}}>
            Submit Request →
          </button>
          <button onClick={()=>setAuthView("pick")}
            style={{background:"transparent",color:G.muted,border:"none",
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"6px"}}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — Request submitted confirmation
  // ════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════
  // RENDER: Self-service Verify / Onboarding
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="verify") {
    const ALL_TEAM_OPTS = teams.map(t=>t.name);
    const JUNIOR_TEAMS = teams.filter(t => 
      t.name.startsWith("U") || t.name === "Kvinder" || t.name.includes("Girls")
    ).map(t => t.name);
    const vfFiltered = vfSearch.trim().length>=2
      ? members.filter(m=>m.name.toLowerCase().includes(vfSearch.toLowerCase())).slice(0,8)
      : [];

    function generateCode() {
      return String(Math.floor(100000+Math.random()*900000));
    }

    async function sendCode(email, name) {
      setVfSending(true); setVfError("");
      const code = generateCode();
      try {
        const r = await fetch("/api/send-verify",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({email, name, code})
        });
        if(!r.ok) throw new Error("Send failed");
        const expiry = Date.now()+15*60*1000;
        setVfSentCode(code);
        setVfCodeExpiry(expiry);
        setVfStep("code");
        // Persist state so user doesn't lose it if they navigate away
        localStorage.setItem("fcc-verify-state", JSON.stringify({
          code,
          expiry,
          email,
          step: "code",
          matchId: vfMatch?.id || null,
        }));
      } catch(e) {
        setVfError("Could not send email. Please check the address and try again.");
      }
      setVfSending(false);
    }

    function verifyCode() {
      if(!vfSentCode) { setVfError("No code sent yet"); return; }
      if(Date.now()>vfCodeExpiry) { setVfError("Code expired — please request a new one"); return; }
      if(vfCode.trim()!==vfSentCode) { setVfError("Incorrect code — please try again"); return; }
      
      // Clear persisted state
      localStorage.removeItem("fcc-verify-state");
      
      // Code correct — activate account
      if(vfMatch) {
        // Update existing member with email/phone + consent
        const updated = members.map(m=>m.id===vfMatch.id ? {
          ...m,
          email: vfEmail.trim()||m.email,
          phone: vfPhone.trim()||m.phone,
          emailVerified: true,
          consentGiven: true,
          consentDate: new Date().toISOString().slice(0,10),
        } : m);
        saveMembers(updated);
        // Generate invite code so they can log in now
        generateInviteCode(vfMatch.id);
        logAction("member",`Self-verified email: ${vfMatch.name} — ${vfEmail}`);
        setVfStep("done");
      } else if(vfIsParent) {
        // Parent signing up — check if child already exists in the system
        const childName = vfChildName.trim().toLowerCase();
        const existingChild = members.find(m => 
          m.name.toLowerCase() === childName && 
          (m.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder"))
        );
        
        if(existingChild) {
          // Child exists — create parent account and link them
          const parentId = uid();
          const parentMember = {
            id: parentId,
            name: vfNewName.trim(),
            email: vfEmail.trim(),
            phone: vfPhone.trim()||"",
            teams: [],
            role: "member",
            memberType: "parent",
            children: [existingChild.id],
            emailVerified: true,
            consentGiven: vfConsent,
            consentDate: new Date().toISOString().slice(0,10),
            joinedAt: new Date().toISOString(),
          };
          
          // Update child to reference parent
          const updated = members.map(m => 
            m.id === existingChild.id 
              ? { ...m, parentId: parentId, parentName: vfNewName.trim() }
              : m
          );
          updated.push(parentMember);
          saveMembers(updated);
          generateInviteCode(parentId);
          logAction("member",`Parent verified and linked to existing child: ${vfNewName} → ${existingChild.name}`);
          setVfStep("done");
        } else {
          // Child doesn't exist — create join request for approval
          const req = {
            id: uid(),
            submittedAt: new Date().toISOString(),
            forChild: true,
            playerName: vfChildName.trim(),
            playerTeam: vfNewTeam||null,
            parentName: vfNewName.trim(),
            contact: vfPhone.trim()||null,
            email: vfEmail.trim(),
            emailVerified: true,
            consentGiven: vfConsent,
            consentDate: new Date().toISOString().slice(0,10),
            status:"pending",
          };
          saveJoinRequests([...joinRequests, req]);
          fetch("/api/notify",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({type:"joinrequest",data:{
              name:req.playerName, playerTeam:req.playerTeam,
              message:`Parent signup (child not found): ${vfNewName} registering ${vfChildName}`
            }})}).catch(()=>{});
          setVfStep("done");
        }
      } else {
        // New adult player — create join request with verified email
        const req = {
          id: uid(),
          submittedAt: new Date().toISOString(),
          forChild: false,
          playerName: vfNewName.trim(),
          playerTeam: vfNewTeam||null,
          parentName: null,
          contact: vfPhone.trim()||null,
          email: vfEmail.trim(),
          emailVerified: true,
          consentGiven: vfConsent,
          consentDate: new Date().toISOString().slice(0,10),
          status:"pending",
        };
        saveJoinRequests([...joinRequests, req]);
        fetch("/api/notify",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({type:"joinrequest",data:{
            name:req.playerName, playerTeam:req.playerTeam,
            message:`Email verified: ${vfEmail}`
          }})}).catch(()=>{});
        setVfStep("done");
      }
    }

    const hdr = (title,sub) => (
      <div style={{background:G.green,padding:"20px 20px 16px",textAlign:"center"}}>
        <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
          fontSize:18,fontWeight:900}}>{title}</div>
        {sub&&<div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>{sub}</div>}
      </div>
    );

    // ── Step: done ────────────────────────────────────────────
    if(vfStep==="done") return (
      <Shell G={G}>
        {hdr("All done! 🎉","FCC Training")}
        <div style={{padding:"32px 24px",textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:16}}>✅</div>
          {vfMatch ? (<>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,
              color:G.green,marginBottom:10}}>Account activated!</div>
            <div style={{fontSize:14,color:G.muted,lineHeight:1.6,marginBottom:24}}>
              Your email has been verified and your account is now set up.
              Go back to the login screen and tap your name to log in.
            </div>
          </>) : (<>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,
              color:G.green,marginBottom:10}}>Request submitted!</div>
            <div style={{fontSize:14,color:G.muted,lineHeight:1.6,marginBottom:24}}>
              Your email is verified. The admin will review your request and
              you'll be added to the app shortly.
            </div>
          </>)}
          <button onClick={()=>{setAuthView("pick");setVfStep("search");}}
            style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
              padding:"12px 28px",fontSize:14,fontWeight:800,cursor:"pointer",
              fontFamily:"inherit"}}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );

    // ── Step: code verification ───────────────────────────────
    if(vfStep==="code") return (
      <Shell G={G}>
        {hdr("Check your email","Enter the 6-digit code we sent you")}
        <div style={{padding:"24px 20px 40px"}}>
          <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:12,
            padding:"12px 16px",marginBottom:20,fontSize:13,color:"#166534"}}>
            📧 Code sent to <b>{vfEmail}</b>. Check your inbox (and spam folder).
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:6}}>
              ENTER 6-DIGIT CODE
            </label>
            <input value={vfCode} onChange={e=>setVfCode(e.target.value.replace(/\D/g,"").slice(0,6))}
              inputMode="numeric" maxLength={6} placeholder="123456"
              style={{...iSt({fontSize:24,textAlign:"center",letterSpacing:6,fontWeight:900,
                padding:"14px",borderRadius:12})}}/>
          </div>
          {vfError&&<div style={{background:G.redBg,color:G.red,borderRadius:8,
            padding:"8px 12px",fontSize:13,marginBottom:12}}>{vfError}</div>}
          <Btn bg={G.green} col={G.lime} full
            onClick={verifyCode} disabled={vfCode.length!==6}>
            ✓ Verify Code
          </Btn>
          <button onClick={()=>sendCode(vfEmail,vfMatch?.name||vfNewName)}
            style={{width:"100%",marginTop:10,background:"none",border:`1px solid ${G.border}`,
              borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:G.muted,
              cursor:"pointer",fontFamily:"inherit"}}>
            {vfSending?"Sending…":"Resend code"}
          </button>
          <button onClick={()=>setVfStep(vfMatch?"found":"notfound")}
            style={{width:"100%",marginTop:8,background:"none",border:"none",
              fontSize:12,color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
            ← Back
          </button>
        </div>
      </Shell>
    );

    // ── Step: found — existing member ─────────────────────────
    if(vfStep==="found" && vfMatch) {
      const hasEmail = !!(vfMatch.email||"").trim();
      return (
        <Shell G={G}>
          {hdr(`Hi, ${vfMatch.name.split(" ")[0]}!`,"FCC Training — account setup")}
          <div style={{padding:"20px 20px 40px"}}>
            {/* Privacy notice */}
            <div style={{background:G.cream,border:`1px solid ${G.border}`,borderRadius:10,
              padding:"12px 14px",marginBottom:16,fontSize:11,color:G.muted,lineHeight:1.6}}>
              <b style={{color:G.text}}>🔐 Privacy notice</b><br/>{PRIVACY_TEXT}
            </div>

            {hasEmail ? (<>
              <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:10,
                padding:"12px 14px",marginBottom:16}}>
                <div style={{fontWeight:800,fontSize:13,color:"#166534",marginBottom:4}}>
                  ✅ We have an email on file
                </div>
                <div style={{fontSize:13,color:G.muted}}>
                  {vfMatch.email.replace(/(.{2})(.*)(@.*)/, (m,a,b,c)=>a+"•".repeat(b.length)+c)}
                </div>
              </div>
              <div style={{fontSize:13,color:G.muted,marginBottom:16,lineHeight:1.6}}>
                Is this the correct email? We'll send a verification code to confirm.
              </div>
              <Btn bg={G.green} col={G.lime} full disabled={vfSending}
                onClick={()=>{ setVfEmail(vfMatch.email); sendCode(vfMatch.email, vfMatch.name); }}>
                {vfSending?"Sending…":"📧 Send verification code"}
              </Btn>
              <button onClick={()=>{setVfStep("search");}}
                style={{width:"100%",marginTop:10,background:"none",border:`1px solid ${G.border}`,
                  borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:G.muted,
                  cursor:"pointer",fontFamily:"inherit"}}>
                Not me / use a different email
              </button>
            </>) : (<>
              <div style={{fontSize:14,color:G.text,fontWeight:700,marginBottom:16}}>
                We found your profile but don't have your email yet.
                Add it below to activate your account.
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
                  YOUR EMAIL ADDRESS
                </label>
                <input type="email" value={vfEmail} onChange={e=>setVfEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
                  PHONE NUMBER <span style={{fontWeight:400}}>(optional)</span>
                </label>
                <input type="tel" value={vfPhone} onChange={e=>setVfPhone(e.target.value)}
                  placeholder="+45 XX XX XX XX"
                  style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
              </div>
              {vfError&&<div style={{background:G.redBg,color:G.red,borderRadius:8,
                padding:"8px 12px",fontSize:13,marginBottom:12}}>{vfError}</div>}
              <Btn bg={G.green} col={G.lime} full disabled={!vfEmail.includes("@")||vfSending}
                onClick={()=>sendCode(vfEmail,vfMatch.name)}>
                {vfSending?"Sending…":"📧 Send verification code"}
              </Btn>
            </>)}
            <button onClick={()=>setVfStep("search")}
              style={{width:"100%",marginTop:8,background:"none",border:"none",
                fontSize:12,color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
              ← Back to search
            </button>
          </div>
        </Shell>
      );
    }

    // ── Step: notfound — new member/parent ────────────────────
    if(vfStep==="notfound") return (
      <Shell G={G}>
        {hdr("Join Fredensborg CC","Set up your account")}
        <div style={{padding:"20px 20px 40px"}}>
          {/* Privacy notice */}
          <div style={{background:G.cream,border:`1px solid ${G.border}`,borderRadius:10,
            padding:"12px 14px",marginBottom:16,fontSize:11,color:G.muted,lineHeight:1.6}}>
            <b style={{color:G.text}}>🔐 Privacy notice</b><br/>{PRIVACY_TEXT}
          </div>

          {/* Parent toggle */}
          <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:16,
            cursor:"pointer",padding:"12px 14px",background:vfIsParent?"#dbeafe":"#f0fdf4",borderRadius:10,
            border:`1.5px solid ${vfIsParent?"#3b82f6":"#86efac"}`}}>
            <input type="checkbox" checked={vfIsParent}
              onChange={e=>setVfIsParent(e.target.checked)}
              style={{width:18,height:18,cursor:"pointer",flexShrink:0,marginTop:2}}/>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:vfIsParent?"#1e40af":"#166534"}}>
                I'm a parent registering on behalf of my child
              </span>
              {vfIsParent && (
                <div style={{fontSize:11,color:"#3b82f6",marginTop:4,lineHeight:1.4}}>
                  ✓ Your child will be added to the team roster. You'll receive booking confirmations at your email.
                </div>
              )}
              {!vfIsParent && (
                <div style={{fontSize:11,color:"#15803d",marginTop:4,lineHeight:1.4}}>
                  I am a player registering myself (adult or youth 16+)
                </div>
              )}
            </div>
          </label>

          {vfIsParent&&(
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
                CHILD'S NAME
              </label>
              <input value={vfChildName} onChange={e=>setVfChildName(e.target.value)}
                placeholder="Child's full name"
                style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
            </div>
          )}

          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
              {vfIsParent?"YOUR NAME (parent/guardian)":"YOUR FULL NAME"}
            </label>
            <input value={vfNewName} onChange={e=>setVfNewName(e.target.value)}
              placeholder={vfIsParent?"Parent/guardian name":"Your full name"}
              style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
              {vfIsParent?"CHILD'S TEAM / GROUP":"YOUR TEAM / GROUP"}
            </label>
            <select value={vfNewTeam} onChange={e=>setVfNewTeam(e.target.value)}
              style={iSt({fontSize:14,padding:"12px 14px",borderRadius:10})}>
              <option value="">{vfIsParent?"Select your child's team…":"Select your team…"}</option>
              <option value="unsure">Not sure</option>
              {vfIsParent 
                ? JUNIOR_TEAMS.map(t=><option key={t} value={t}>{t}</option>)
                : ALL_TEAM_OPTS.map(t=><option key={t} value={t}>{t}</option>)
              }
            </select>
            {vfIsParent && (
              <div style={{fontSize:10,color:G.muted,marginTop:4}}>
                This is the team your child will train with (U11, U13, U15, etc.)
              </div>
            )}
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
              EMAIL ADDRESS
            </label>
            <input type="email" value={vfEmail} onChange={e=>setVfEmail(e.target.value)}
              placeholder="your@email.com"
              style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:G.muted,display:"block",marginBottom:5}}>
              PHONE <span style={{fontWeight:400}}>(optional)</span>
            </label>
            <input type="tel" value={vfPhone} onChange={e=>setVfPhone(e.target.value)}
              placeholder="+45 XX XX XX XX"
              style={iSt({fontSize:15,padding:"12px 14px",borderRadius:10})}/>
          </div>

          {/* Consent */}
          <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:16,
            cursor:"pointer",padding:"12px 14px",background:"#fffbeb",borderRadius:10,
            border:"1px solid #fde68a"}}>
            <input type="checkbox" checked={vfConsent}
              onChange={e=>setVfConsent(e.target.checked)}
              style={{width:16,height:16,cursor:"pointer",flexShrink:0,marginTop:2}}/>
            <span style={{fontSize:12,color:"#78350f",lineHeight:1.6}}>
              I consent to Fredensborg Cricket Club storing my {vfIsParent?"child's":""}  personal data
              (name, email, phone) for the purpose of managing club membership and communications,
              as described in the privacy notice above.
              {vfIsParent&&" I confirm I have parental authority to provide this consent."}
            </span>
          </label>

          {vfError&&<div style={{background:G.redBg,color:G.red,borderRadius:8,
            padding:"8px 12px",fontSize:13,marginBottom:12}}>{vfError}</div>}

          <Btn bg={G.green} col={G.lime} full
            disabled={!vfConsent||!vfEmail.includes("@")||(vfIsParent?!vfChildName.trim():!vfNewName.trim())||vfSending}
            onClick={()=>sendCode(vfEmail, vfNewName||"Member")}>
            {vfSending?"Sending code…":"📧 Verify email & submit"}
          </Btn>
          <button onClick={()=>setVfStep("search")}
            style={{width:"100%",marginTop:8,background:"none",border:"none",
              fontSize:12,color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
            ← Back to search
          </button>
        </div>
      </Shell>
    );

    // ── Step: search ──────────────────────────────────────────
    return (
      <Shell G={G}>
        {hdr("Set up your account","Fredensborg Cricket Club")}
        <div style={{padding:"20px 20px 40px"}}>
          <div style={{fontSize:14,color:G.muted,marginBottom:20,lineHeight:1.6}}>
            First, let's find your profile. Type your name (or your child's name if you're a parent).
          </div>
          <div style={{position:"relative",marginBottom:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
              fontSize:16,pointerEvents:"none"}}>🔍</span>
            <input value={vfSearch} onChange={e=>setVfSearch(e.target.value)}
              placeholder="Start typing a name…"
              autoFocus
              style={{...iSt({paddingLeft:44,fontSize:15,borderRadius:12,padding:"13px 14px 13px 44px"})}}/>
          </div>
          {vfFiltered.length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
              {vfFiltered.map(m=>(
                <button key={m.id} onClick={()=>{
                    setVfMatch(m);
                    setVfEmail(m.email||"");
                    setVfPhone(m.phone||"");
                    setVfStep("found");
                  }}
                  style={{display:"flex",alignItems:"center",gap:12,
                    background:G.white,border:`1.5px solid ${G.border}`,borderRadius:10,
                    padding:"11px 14px",cursor:"pointer",fontFamily:"inherit",
                    textAlign:"left",transition:"border-color .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=G.green}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=G.border}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:`${G.green}18`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:12,fontWeight:900,color:G.green,flexShrink:0}}>
                    {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:G.text}}>{m.name}</div>
                    <div style={{fontSize:11,color:G.muted}}>
                      {(m.teams||[]).join(", ")||"No team assigned"}
                      {m.email?" · ✉️ email on file":" · no email yet"}
                    </div>
                  </div>
                  <span style={{marginLeft:"auto",fontSize:16,color:G.green}}>›</span>
                </button>
              ))}
            </div>
          )}
          {vfSearch.trim().length>=2&&vfFiltered.length===0&&(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:13,color:G.muted,marginBottom:16}}>
                Not found — you may not be in the system yet.
              </div>
              <button onClick={()=>{setVfNewName(vfSearch.trim());setVfStep("notfound");}}
                style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
                  padding:"11px 24px",fontSize:13,fontWeight:800,cursor:"pointer",
                  fontFamily:"inherit"}}>
                ✋ Register as a new member
              </button>
            </div>
          )}
          <div style={{marginTop:24,paddingTop:16,borderTop:`1px solid ${G.border}`,
            textAlign:"center"}}>
            <button onClick={()=>{setVfStep("notfound");setVfNewName("");}}
              style={{fontSize:12,color:G.muted,background:"none",border:"none",
                cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>
              I'm a new member / parent — register here
            </button>
          </div>
          <button onClick={()=>setAuthView("pick")}
            style={{width:"100%",marginTop:10,background:"none",border:`1px solid ${G.border}`,
              borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,color:G.muted,
              cursor:"pointer",fontFamily:"inherit"}}>
            ← Back to login
          </button>
        </div>
      </Shell>
    );
  }

  if(!currentUser && authView==="joinrequestdone") return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",minHeight:"100vh",padding:"40px 28px",textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:16}}>🎉</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
          fontSize:22,color:G.text,marginBottom:10}}>Request Sent!</div>
        <div style={{fontSize:14,color:G.muted,lineHeight:1.7,marginBottom:30}}>
          An admin will review your request and add you to the app.
          You'll be able to log in as soon as it's approved.<br/><br/>
          This usually happens within a day or two. 🏏
        </div>
        <button onClick={()=>setAuthView("pick")}
          style={{background:G.green,color:G.lime,border:"none",borderRadius:12,
            padding:"14px 32px",fontFamily:"inherit",fontWeight:800,fontSize:15,
            cursor:"pointer"}}>
          Back to Login
        </button>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — verify email (first-time, adults only)
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="verifyemail") {
    const storedEmail = EMAIL_SEED[pendingMember?.name||""] || (pendingMember?.email||"");
    const masked = maskEmail(storedEmail);

    async function sendLoginCode() {
      setLoginCodeSending(true); setLoginCodeError("");
      const code = String(Math.floor(100000+Math.random()*900000));
      try {
        const r = await fetch("/api/send-verify",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({email:storedEmail, name:pendingMember?.name||"", code})
        });
        if(!r.ok) throw new Error("Send failed");
        setLoginSentCode(code);
        setLoginCodeExpiry(Date.now()+15*60*1000);
        setLoginCodeSent(true);
      } catch(e) {
        setLoginCodeError("Could not send email. Ask your admin to reset your access.");
      }
      setLoginCodeSending(false);
    }

    function verifyLoginCode() {
      if(!loginSentCode) { setLoginCodeError("No code sent yet"); return; }
      if(Date.now()>loginCodeExpiry) { setLoginCodeError("Code expired — request a new one"); return; }
      if(loginCodeInput.trim()!==loginSentCode) { setLoginCodeError("Incorrect code — please try again"); return; }
      // Correct — proceed to set PIN
      setLoginCodeError("");
      setLoginCodeSent(false);
      setLoginSentCode("");
      setLoginCodeInput("");
      setAuthView("newpin");
    }

    function resetLoginCode() {
      setLoginCodeSent(false);
      setLoginSentCode("");
      setLoginCodeInput("");
      setLoginCodeError("");
    }

    return (
      <Shell G={G}>
        <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
          <div style={{background:G.green,padding:"22px 20px 18px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:6}}>📧</div>
            <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
              fontSize:19,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:12,marginTop:4}}>
              Verify your identity to set your PIN
            </div>
          </div>
          <div style={{flex:1,padding:"28px 24px"}}>
            {!loginCodeSent ? (<>
              <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",
                borderRadius:14,padding:"16px 18px",marginBottom:20}}>
                <div style={{fontWeight:800,fontSize:13,color:"#166534",marginBottom:6}}>
                  ✉️ We'll send a verification code to:
                </div>
                <div style={{fontSize:16,fontWeight:900,color:G.text,letterSpacing:1}}>
                  {masked}
                </div>
                <div style={{fontSize:11,color:G.muted,marginTop:6,lineHeight:1.5}}>
                  This is the email address we have on record.
                  Check your inbox (and spam folder) after sending.
                </div>
              </div>
              {loginCodeError&&<div style={{background:G.redBg,color:G.red,borderRadius:8,
                padding:"8px 12px",fontSize:13,marginBottom:12,fontWeight:700}}>
                ⚠️ {loginCodeError}
              </div>}
              <button onClick={sendLoginCode} disabled={loginCodeSending}
                style={{width:"100%",background:loginCodeSending?"#e5e7eb":G.green,
                  color:loginCodeSending?G.muted:G.lime,border:"none",borderRadius:12,
                  padding:"15px",fontSize:15,fontWeight:800,cursor:loginCodeSending?"default":"pointer",
                  fontFamily:"inherit",marginBottom:10}}>
                {loginCodeSending?"Sending…":"📧 Send verification code"}
              </button>
            </>) : (<>
              <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",
                borderRadius:14,padding:"14px 16px",marginBottom:20}}>
                <div style={{fontWeight:800,fontSize:13,color:"#166534",marginBottom:4}}>
                  Code sent! ✅
                </div>
                <div style={{fontSize:12,color:G.muted,lineHeight:1.5}}>
                  Check the inbox for <b style={{color:G.text}}>{masked}</b> and enter the 6-digit code below.
                  It expires in 15 minutes.
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:800,
                  color:G.muted,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>
                  Verification Code
                </label>
                <input autoFocus type="text" inputMode="numeric" maxLength={6}
                  placeholder="000000"
                  value={loginCodeInput}
                  onChange={e=>{setLoginCodeInput(e.target.value.replace(/\D/g,""));setLoginCodeError("");}}
                  onKeyDown={e=>e.key==="Enter"&&verifyLoginCode()}
                  style={{width:"100%",borderRadius:10,
                    border:`1.5px solid ${loginCodeError?"#ef4444":G.border}`,
                    padding:"13px 14px",fontSize:24,fontFamily:"'DM Sans',sans-serif",
                    fontWeight:700,background:"#fff",color:G.text,outline:"none",
                    boxSizing:"border-box",letterSpacing:6,textAlign:"center"}}/>
                {loginCodeError&&<div style={{marginTop:6,fontSize:12,color:"#dc2626",fontWeight:700}}>
                  ⚠️ {loginCodeError}
                </div>}
              </div>
              <button onClick={verifyLoginCode}
                style={{width:"100%",background:G.green,color:G.lime,border:"none",
                  borderRadius:12,padding:"15px",fontSize:15,fontWeight:800,
                  cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
                Verify &amp; Continue →
              </button>
              <button onClick={resetLoginCode}
                style={{width:"100%",background:"transparent",color:G.muted,border:"none",
                  fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"8px"}}>
                ← Didn't receive it? Send again
              </button>
            </>)}
            <button onClick={()=>{
                setPendingMember(null);setAuthView("pick");
                resetLoginCode();
              }}
              style={{width:"100%",background:"transparent",color:G.muted,border:"none",
                fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"8px"}}>
              ← Back
            </button>
            <div style={{marginTop:16,padding:"12px 14px",background:"#fffbeb",
              border:"1px solid #fde68a",borderRadius:10,fontSize:12,color:"#78350f",lineHeight:1.6}}>
              <b>Wrong email?</b> Ask your admin to update your email address or reset your access.
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — verify invite code (no email, first-time)
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="verifycode") return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{background:G.green,padding:"22px 20px 18px",textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:6}}>🔑</div>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{color:"rgba(255,255,255,0.65)",fontSize:12,marginTop:4}}>
            Enter your invite code to set up your account
          </div>
        </div>
        <div style={{flex:1,padding:"28px 24px"}}>
          <div style={{background:"#f0fdf4",border:"1.5px solid rgba(20,83,45,.15)",
            borderRadius:14,padding:"16px 18px",marginBottom:20}}>
            <div style={{fontSize:13,color:G.muted,lineHeight:1.6}}>
              Your admin has shared a personal <b style={{color:G.text}}>invite code</b> with you.
              It looks like <b style={{color:G.text}}>FCC-XXXX</b>.
              Enter it below to verify your identity and set your PIN.
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,fontWeight:800,
              color:G.muted,letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>
              Your Invite Code
            </label>
            <input
              type="text" autoFocus autoCapitalize="characters" spellCheck={false}
              placeholder="FCC-XXXX"
              value={emailInput}
              onChange={e=>{setEmailInput(e.target.value.toUpperCase());setEmailError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleVerifyCode()}
              style={{width:"100%",borderRadius:10,border:`1.5px solid ${emailError?"#ef4444":G.border}`,
                padding:"13px 14px",fontSize:18,fontFamily:"'DM Sans',sans-serif",
                fontWeight:700,background:"#fff",color:G.text,outline:"none",
                boxSizing:"border-box",letterSpacing:3,textAlign:"center"}}/>
            {emailError&&(
              <div style={{marginTop:6,fontSize:12,color:"#dc2626",fontWeight:700}}>
                ⚠️ {emailError}
              </div>
            )}
          </div>
          <button onClick={handleVerifyCode}
            style={{width:"100%",background:G.green,color:G.lime,border:"none",
              borderRadius:12,padding:"15px",fontSize:15,fontWeight:800,
              cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
            Verify &amp; Continue →
          </button>
          <button onClick={()=>{setPendingMember(null);setAuthView("pick");setEmailInput("");setEmailError("");}}
            style={{width:"100%",background:"transparent",color:G.muted,border:"none",
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:"8px"}}>
            ← Back
          </button>
          <div style={{marginTop:20,padding:"12px 14px",background:"#fffbeb",
            border:"1px solid #fde68a",borderRadius:10,fontSize:12,color:"#78350f",lineHeight:1.6}}>
            <b>Don't have a code?</b> Ask your admin to generate one for you — they can do it in the Members panel.
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — blocked (no email, no invite code)
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="blocked") return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{background:G.green,padding:"18px 20px 16px",textAlign:"center"}}>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>FCC Training</div>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
          padding:"0 24px"}}>
          <div style={{textAlign:"center",maxWidth:320}}>
            <div style={{fontSize:52,marginBottom:16}}>🔒</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,
              fontWeight:900,color:G.green,marginBottom:10}}>
              Account not activated yet
            </div>
            <div style={{fontSize:14,color:G.muted,lineHeight:1.6,marginBottom:20}}>
              Your profile exists but your account hasn't been set up with an email or access code yet.
            </div>
            <button onClick={()=>{
                setVfStep("search");
                setVfSearch(pendingMember?.name||"");
                setVfMatch(pendingMember||null);
                setVfEmail(pendingMember?.email||"");
                setVfPhone(pendingMember?.phone||"");
                setVfCode(""); setVfError(""); setVfConsent(false);
                if(pendingMember) setVfStep("found");
                setAuthView("verify");
              }}
              style={{width:"100%",background:G.green,color:G.lime,border:"none",
                borderRadius:12,padding:"13px 20px",fontSize:14,fontWeight:800,
                cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>
              ✅ Set up my account now
            </button>
            <button onClick={()=>{setPendingMember(null);setAuthView("pick");}}
              style={{background:"none",color:G.muted,border:`1px solid ${G.border}`,
                borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — set new PIN
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="newpin") return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        {/* Compact header at top */}
        <div style={{background:G.green,padding:"18px 20px 16px",textAlign:"center"}}>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Hi, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>
            First time? Set your 4-digit PIN
          </div>
        </div>
        {/* Keypad pushed to lower portion of screen */}
        <div style={{flex:1,display:"flex",alignItems:"flex-end",paddingBottom:60}}>
          <div style={{width:"100%"}}>
            <PinPad
              label="Choose a 4-digit PIN"
              onDone={handleNewPin}
              onCancel={()=>{ setPendingMember(null); setAuthView("pick"); }}
              error={pinError}
            />
          </div>
        </div>
      </div>
    </Shell>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER: Auth — enter PIN
  // ════════════════════════════════════════════════════════════
  if(!currentUser && authView==="enterpin") {
    const isYouthNoPinMember = ["U11","U13"].some(t=>(pendingMember?.teams||[]).includes(t))
      && !pins[pendingMember?.id];
    return (
    <Shell G={G}>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{background:G.green,padding:"18px 20px 16px",textAlign:"center"}}>
          <div style={{color:G.white,fontFamily:"'Playfair Display',serif",
            fontSize:19,fontWeight:900}}>Welcome back, {pendingMember?.name.split(" ")[0]}!</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:3}}>Enter your PIN</div>
        </div>
        {isYouthNoPinMember&&(
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",
            margin:"16px 20px 0",borderRadius:10,padding:"10px 14px",
            fontSize:12,color:"#92400e",lineHeight:1.6,textAlign:"center"}}>
            👋 First time? Try <b>0000</b> to log in, then set your own PIN.
          </div>
        )}
        <div style={{flex:1,display:"flex",alignItems:"flex-end",paddingBottom:60}}>
          <div style={{width:"100%"}}>
            <PinPad
              label="Enter your 4-digit PIN"
              onDone={handleEnterPin}
              onCancel={()=>{ setPendingMember(null); setAuthView("pick"); }}
              error={pinError}
            />
          </div>
        </div>
      </div>
    </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: App (authenticated)
  // ════════════════════════════════════════════════════════════

  // AppHeader extracted to src/ui/AppHeader.jsx (Pass 6)

  // ── SCHEDULE ────────────────────────────────────────────────
  if(view==="schedule") return <ScheduleView />;

  // ── ADD / JOIN ──────────────────────────────────────────────
  if(view==="add") return <AddSessionView />;

  // ── SESSION DETAIL ──────────────────────────────────────────
  if(view==="session"&&selSess) {
    const userMem = members.find(m=>m.name===currentUser?.name);
    const isRestricted = !!selSess.restrictedTo;
    const userInTeam = !isRestricted
      || (userMem?.teams||[]).includes(selSess.restrictedTo)
      || canOrCoach(userRole,"deleteSession",userMem,teams);
    const canAddOthers = canOrCoach(userRole,"addOtherPlayer",userMem,teams);
    const cutoff = isAfterCutoff(selSess.date);
    // Members not in session — admins/captains/coaches see all relevant, members only see own team
    const notIn = members.filter(m=>!selSess.players.includes(m.name))
      .filter(m=>{
        if(isRestricted) return (m.teams||[]).includes(selSess.restrictedTo) || canOrCoach(userRole,"deleteSession",userMem,teams);
        if(!canAddOthers) return (m.teams||[]).some(t=>(userMem?.teams||[]).includes(t));
        return true;
      });
    // Who's NOT coming from user's own team (or restricted team) — for the "absent" list
    const myTeams = userMem?.teams||[];
    const relevantTeam = isRestricted ? selSess.restrictedTo : (myTeams[0]||null);
    const absentFromTeam = relevantTeam
      ? members.filter(m=>(m.teams||[]).includes(relevantTeam) && !selSess.players.includes(m.name))
      : [];
    return (
      <Shell G={G}>
        <AppHeader
          onBack={()=>{setView("schedule");setSelSess(null);}}
          title={<>{fmtShort(selSess.date)}{isToday(selSess.date)&&
            <span style={{background:G.lime,color:G.green,borderRadius:20,
              padding:"1px 8px",fontSize:11,fontWeight:900,marginLeft:8}}>TODAY</span>}</>}
          sub={`${selSess.from} – ${selSess.to}${selSess.label?" · "+selSess.label:""}`}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn onClick={()=>dlICS(selSess)} bg="rgba(255,255,255,.15)" col={G.white} sm>
              📅 Save to Calendar
            </Btn>
            {can(userRole,"sendReminder")&&(
              <Btn onClick={()=>openWA(selSess.date)} bg={G.lime} col={G.green} sm>
                📲 Share on WhatsApp
              </Btn>
            )}
          </div>
        </AppHeader>

        <div style={{padding:"14px 16px 20px"}}>
          {/* Location change banner — highlighted when not at default venue */}
          {(()=>{
            const defaultLocation = "Karlebo Cricket Ground";
            const sessionLocation = selSess.location || defaultLocation;
            const isRelocated = sessionLocation !== defaultLocation;
            const canEditLocation = canOrCoach(userRole,"deleteSession",userMem,teams);
            
            return (
              <>
                {isRelocated && (
                  <div style={{
                    background:"linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                    border:"2px solid #c4b5fd",
                    borderRadius:12, padding:"12px 16px", marginBottom:14,
                    display:"flex", alignItems:"center", gap:10,
                    boxShadow:"0 4px 12px rgba(124,58,237,0.25)"
                  }}>
                    <span style={{fontSize:22}}>📍</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",
                        textTransform:"uppercase",letterSpacing:0.5}}>Location Change</div>
                      <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>{sessionLocation}</div>
                    </div>
                    {canEditLocation && (
                      <button onClick={()=>setEditingLocation(true)}
                        style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,
                          padding:"6px 10px",color:"#fff",fontSize:11,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit"}}>
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                )}
                
                {/* Location edit button for admins when at default location */}
                {!isRelocated && canEditLocation && (
                  <button onClick={()=>setEditingLocation(true)}
                    style={{background:"#f8fafc",border:"1px dashed #cbd5e1",borderRadius:8,
                      padding:"8px 12px",marginBottom:14,width:"100%",
                      display:"flex",alignItems:"center",gap:8,
                      cursor:"pointer",fontFamily:"inherit"}}>
                    <span style={{fontSize:14}}>📍</span>
                    <span style={{fontSize:12,color:G.muted}}>
                      {defaultLocation} <span style={{color:"#94a3b8",fontWeight:600}}>· tap to change location</span>
                    </span>
                  </button>
                )}
              </>
            );
          })()}
          
          {/* Location editor modal */}
          {editingLocation && (
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
              display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}
              onClick={()=>setEditingLocation(false)}>
              <div onClick={e=>e.stopPropagation()}
                style={{background:"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:340}}>
                <div style={{fontWeight:900,fontSize:16,marginBottom:16,color:G.text}}>
                  📍 Change Location
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[
                    {val:"Karlebo Cricket Ground", icon:"🏏", desc:"Default outdoor venue"},
                    {val:"Egedalshallen (Indoor)", icon:"🏠", desc:"Indoor training hall"},
                    {val:"Other", icon:"📍", desc:"Custom location"},
                  ].map(loc=>{
                    const sessionLocation = selSess.location || "Karlebo Cricket Ground";
                    return (
                      <button key={loc.val}
                        onClick={()=>{
                          const newLoc = loc.val === "Other" 
                            ? prompt("Enter location:", sessionLocation)
                            : loc.val;
                          if(newLoc) {
                            const updated = sessions.map(s=>
                              s.id===selSess.id ? {...s, location: newLoc} : s);
                            saveSessions(updated);
                            setSelSess({...selSess, location: newLoc});
                            showToast(`Location changed to ${newLoc}`);
                          }
                          setEditingLocation(false);
                        }}
                        style={{
                          display:"flex",alignItems:"center",gap:12,
                          background: sessionLocation===loc.val ? "#f0fdf4" : "#f8fafc",
                          border: sessionLocation===loc.val ? "2px solid #86efac" : "1.5px solid #e2e8f0",
                          borderRadius:12,padding:"14px 16px",
                          cursor:"pointer",fontFamily:"inherit",textAlign:"left"
                        }}>
                        <span style={{fontSize:24}}>{loc.icon}</span>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:G.text}}>{loc.val}</div>
                          <div style={{fontSize:11,color:G.muted}}>{loc.desc}</div>
                        </div>
                        {sessionLocation===loc.val && (
                          <span style={{marginLeft:"auto",color:G.green,fontWeight:800}}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <button onClick={()=>setEditingLocation(false)}
                  style={{marginTop:16,width:"100%",padding:12,background:"#f1f5f9",
                    border:"none",borderRadius:10,fontSize:14,fontWeight:700,
                    color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {selSess.note&&(
            <div style={{background:"#fff8e1",border:"1.5px solid #ffe082",borderRadius:10,
              padding:"10px 14px",marginBottom:14,fontSize:13,color:"#7a5c00",fontWeight:500}}>
              📋 {selSess.note}
            </div>
          )}

          {/* Show who created this booking (for non-recurring) */}
          {selSess.createdBy && selSess.createdBy !== "Recurring" && (
            <div style={{fontSize:11,color:G.muted,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span>📝 Booked by</span>
              <span style={{fontWeight:700,color:G.text}}>{selSess.createdBy}</span>
              {selSess.recurringId && <span style={{background:"#f0f9ff",color:"#0369a1",
                padding:"1px 6px",borderRadius:10,fontSize:9,fontWeight:700}}>from recurring</span>}
            </div>
          )}
          {selSess.createdBy === "Recurring" && (
            <div style={{fontSize:11,color:G.muted,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span>🔄 Auto-generated from recurring slot</span>
            </div>
          )}

          {isRestricted&&(
            <div style={{
              background: userInTeam ? "#f0fdf4" : "#fef9c3",
              border: `1.5px solid ${userInTeam ? G.lime : "#fde047"}`,
              borderRadius:10, padding:"10px 14px", marginBottom:14,
              fontSize:13, fontWeight:700,
              color: userInTeam ? G.green : "#92400e",
              display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{fontSize:18}}>🔒</span>
              <span>
                {userInTeam
                  ? `${selSess.restrictedTo} session — you're in`
                  : `This session is restricted to ${selSess.restrictedTo} members. You can view but not join.`}
              </span>
            </div>
          )}

          {/* ── Coaches for this session — team sessions only ── */}
          {(selSess.restrictedTo||selSess.sessionTeams?.length)&&(()=>{
            const derivedCoaches = selSess.coaches !== undefined
              ? selSess.coaches
              : [...new Set((selSess.sessionTeams||[selSess.restrictedTo].filter(Boolean)).flatMap(tn=>
                  teams.find(t=>t.name===tn)?.coaches||[]
                ))];
            const sessCoaches = derivedCoaches;
            const canEditCoaches = canOrCoach(userRole,"addOtherPlayer",userMem,teams);
            return (
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:700,color:G.muted,
                    textTransform:"uppercase",letterSpacing:1}}>🧢 Coaches</span>
                  {sessCoaches.length>0 ? sessCoaches.map(name=>(
                    <span key={name} style={{fontSize:11,fontWeight:700,padding:"2px 10px",
                      borderRadius:20,background:"#fef9c3",color:"#92400e",
                      border:"0.5px solid #fde68a"}}>
                      🧢 {name}
                    </span>
                  )) : (
                    <span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>None assigned</span>
                  )}
                </div>
                {/* Coach editor — captains/admins/coaches only */}
                {canEditCoaches&&(
                  <div style={{marginTop:4}}>
                    <div style={{fontSize:10,color:G.muted,marginBottom:5}}>
                      Tap to add/remove coaches for this session:
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {members.filter(m=>isCoachMember(m.name,teams)).sort((a,b)=>a.name.localeCompare(b.name)).map(m=>{
                        const on=sessCoaches.includes(m.name);
                        return (
                          <button key={m.id} type="button"
                            onClick={()=>{
                              const newList=on
                                ? sessCoaches.filter(n=>n!==m.name)
                                : [...sessCoaches,m.name];
                              const updSess={...selSess,coaches:newList};
                              setSelSess(updSess);
                              saveSessions(sessions.map(s=>s.id===selSess.id?updSess:s));
                            }}
                            style={{fontSize:11,fontWeight:700,padding:"3px 10px",
                              borderRadius:20,cursor:"pointer",fontFamily:"inherit",
                              background:on?"#fef9c3":"var(--color-bg,#f8fafc)",
                              color:on?"#92400e":G.muted,
                              border:`1px solid ${on?"#fde68a":"rgba(0,0,0,.1)"}`,
                              transition:"all .13s"}}>
                            {on?"🧢 ":"+ "}{m.name.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Parent Duty (U11 only) ── */}
          {selSess.restrictedTo === "U11" && (()=>{
            // Who are the U11 parents? Any member whose children include a U11 player.
            const u11ChildIds = new Set(
              members.filter(m => (m.teams||[]).includes("U11")).map(m => m.id)
            );
            const u11Parents = members.filter(m =>
              (m.children||[]).some(cid => u11ChildIds.has(cid))
            );
            // Season = all U11 sessions this year (including this one), past + future
            const seasonYear = new Date(selSess.date).getFullYear();
            const u11Sessions = sessions.filter(s =>
              s.restrictedTo === "U11" &&
              new Date(s.date).getFullYear() === seasonYear
            );
            // Count support-duty sessions per parent across the season
            const dutyCount = {};
            u11Parents.forEach(p => { dutyCount[p.id] = 0; });
            u11Sessions.forEach(s => {
              const sp = s.supportParent;
              if (sp && sp.memberId && dutyCount[sp.memberId] !== undefined) {
                dutyCount[sp.memberId] += 1;
              }
            });

            const support = selSess.supportParent || null;
            const meId = currentUser?.id;
            const myRow = members.find(m=>m.id===meId);
            const iAmU11Parent = !!myRow && (myRow.children||[]).some(cid => u11ChildIds.has(cid));
            const iAmTheSupport = support && support.memberId === meId;
            const isCoachOrAdmin = canOrCoach(userRole,"addOtherPlayer",userMem,teams);

            // ── Mutations ──
            const assignSupport = (memberId, memberName) => {
              const updSess = {
                ...selSess,
                supportParent: {
                  memberId,
                  memberName,
                  assignedBy: currentUser?.name || "unknown",
                  assignedAt: new Date().toISOString(),
                },
              };
              setSelSess(updSess);
              saveSessions(sessions.map(s => s.id===selSess.id ? updSess : s));
              logAction("session", `Support parent set: ${memberName} for U11 ${selSess.date} (by ${currentUser?.name})`);
              showToast(`${memberName.split(" ")[0]} signed up as support parent ✓`);
            };
            const clearSupport = () => {
              const prev = support?.memberName || "";
              const updSess = { ...selSess, supportParent: null };
              setSelSess(updSess);
              saveSessions(sessions.map(s => s.id===selSess.id ? updSess : s));
              logAction("session", `Support parent cleared: ${prev} for U11 ${selSess.date} (by ${currentUser?.name})`);
              showToast("Support parent slot cleared");
            };

            // ── Sorted fairness list for coach/admin view ──
            const fairness = u11Parents
              .map(p => ({ id: p.id, name: p.name, count: dutyCount[p.id] || 0 }))
              .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));

            const showAssignUI = assignOpen === selSess.id;

            return (
              <div style={{
                background: support ? "#fffbeb" : "#fef9c3",
                border: `1.5px solid ${support ? "#fcd34d" : "#fde047"}`,
                borderLeft: `4px solid ${support ? "#d4a217" : "#eab308"}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 14,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:support?6:8}}>
                  <span style={{fontSize:16}}>🙋</span>
                  <span style={{fontSize:11,fontWeight:800,letterSpacing:1,
                    textTransform:"uppercase",color:"#92400e"}}>
                    Support Parent
                  </span>
                </div>

                {support ? (
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{
                      width:34,height:34,borderRadius:"50%",
                      background:"#d4a217",color:"#fff",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:900,fontSize:13,flexShrink:0,
                    }}>
                      {support.memberName.split(" ").map(w=>w[0]).slice(0,2).join("")}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:800,color:"#0f1a3a"}}>
                        {support.memberName}
                      </div>
                      <div style={{fontSize:11,color:"#92400e"}}>
                        Signed up · thanks for helping the U11s
                      </div>
                    </div>
                    {(iAmTheSupport || isCoachOrAdmin) && (
                      <button onClick={clearSupport}
                        style={{background:"transparent",border:"1px solid #fcd34d",
                          color:"#92400e",borderRadius:8,padding:"5px 10px",
                          fontSize:11,fontWeight:700,cursor:"pointer",
                          fontFamily:"inherit",flexShrink:0}}>
                        {iAmTheSupport ? "Remove me" : "Clear"}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{fontSize:12,color:"#78350f",marginBottom:10,lineHeight:1.5}}>
                      One parent per session — equipment, safety, energy. <b>Not a coaching role.</b>
                    </div>
                    {iAmU11Parent && (
                      <button onClick={()=>assignSupport(meId, currentUser.name)}
                        style={{width:"100%",background:"#d4a217",border:"none",
                          color:"#fff",borderRadius:10,padding:"11px 14px",
                          fontSize:14,fontWeight:800,cursor:"pointer",
                          fontFamily:"inherit",marginBottom:8}}>
                        🙋 I'll support this session
                      </button>
                    )}
                    {!iAmU11Parent && !isCoachOrAdmin && (
                      <div style={{fontSize:12,color:"#92400e",fontStyle:"italic",padding:"4px 0"}}>
                        U11 parents can sign up here.
                      </div>
                    )}
                  </>
                )}

                {/* Fairness line: shown to the current parent (their own count) */}
                {iAmU11Parent && !isCoachOrAdmin && (()=>{
                  const myCount = dutyCount[meId] || 0;
                  return (
                    <div style={{fontSize:11,color:"#78350f",marginTop:6,
                      display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span>Your support sessions this season:</span>
                      <span style={{background:"#fef3c7",border:"0.5px solid #fde68a",
                        color:"#92400e",padding:"1px 8px",borderRadius:10,
                        fontWeight:800}}>{myCount}</span>
                    </div>
                  );
                })()}

                {/* Coach/admin fairness overview & assign UI */}
                {isCoachOrAdmin && (
                  <div style={{marginTop:10,paddingTop:10,
                    borderTop:"1px dashed #fcd34d"}}>
                    <button onClick={()=>setAssignOpen(assignOpen===selSess.id?null:selSess.id)}
                      style={{width:"100%",background:"transparent",
                        border:"1px dashed #d4a217",color:"#92400e",
                        borderRadius:8,padding:"8px 10px",
                        fontSize:12,fontWeight:700,cursor:"pointer",
                        fontFamily:"inherit",marginBottom:8}}>
                      {showAssignUI ? "▲ Hide season roster" : "▼ Season roster & assign"}
                    </button>

                    {showAssignUI && (
                      <>
                        {/* Fairness list */}
                        <div style={{fontSize:10,fontWeight:800,letterSpacing:0.8,
                          textTransform:"uppercase",color:"#92400e",marginBottom:6}}>
                          Season so far ({u11Sessions.filter(s=>s.supportParent).length}
                          /{u11Sessions.length} sessions covered)
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
                          {fairness.length === 0 && (
                            <div style={{fontSize:11,color:"#92400e",fontStyle:"italic"}}>
                              No U11 parents linked yet. Parents need to link their child in "My Family".
                            </div>
                          )}
                          {fairness.map(p => (
                            <div key={p.id} style={{
                              display:"flex",alignItems:"center",gap:8,
                              background:p.count===0?"#fef3c7":"transparent",
                              border:p.count===0?"0.5px solid #fde68a":"0.5px solid transparent",
                              borderRadius:8,padding:"4px 8px",
                            }}>
                              <span style={{fontSize:12,color:"#0f1a3a",flex:1,
                                fontWeight:p.count===0?700:500}}>
                                {p.name}
                              </span>
                              <span style={{fontSize:10,fontWeight:800,color:"#92400e",
                                background:"#fef9c3",padding:"1px 7px",borderRadius:10,
                                minWidth:22,textAlign:"center"}}>
                                ×{p.count}
                              </span>
                              {!support && (
                                <button onClick={()=>assignSupport(p.id, p.name)}
                                  style={{background:"#d4a217",color:"#fff",border:"none",
                                    borderRadius:6,padding:"3px 8px",fontSize:10,
                                    fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
                                  Assign
                                </button>
                              )}
                              {support && support.memberId !== p.id && (
                                <button onClick={()=>assignSupport(p.id, p.name)}
                                  style={{background:"transparent",
                                    color:"#92400e",border:"1px solid #d4a217",
                                    borderRadius:6,padding:"3px 8px",fontSize:10,
                                    fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                                  Swap
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{fontSize:10,color:"#92400e",fontStyle:"italic",lineHeight:1.5}}>
                          💡 Parents in yellow haven't covered a session this season. Assign them if they've not stepped up themselves.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Attendance & Notes pills for coaches ── */}
          {canOrCoach(userRole,"addOtherPlayer",userMem,teams) && selSess.restrictedTo && (
            <>
              <div style={{
                display:"flex",
                gap:8,
                marginBottom:12,
              }}>
                <button
                  onClick={()=>setSessCoachView(sessCoachView === "attendance" ? null : "attendance")}
                  style={{
                    flex:1,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:8,
                    padding:"12px 14px",
                    background: sessCoachView === "attendance" ? "#166534" : "#f0fdf4",
                    border: `1.5px solid ${sessCoachView === "attendance" ? "#166534" : "#86efac"}`,
                    borderRadius:10,
                    cursor:"pointer",
                    fontFamily:"inherit",
                  }}
                >
                  <span style={{fontSize:16}}>✓</span>
                  <span style={{fontSize:13,fontWeight:700,color: sessCoachView === "attendance" ? "#fff" : "#166534"}}>
                    Attendance
                  </span>
                </button>
                <button
                  onClick={()=>setSessCoachView(sessCoachView === "notes" ? null : "notes")}
                  style={{
                    flex:1,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:8,
                    padding:"12px 14px",
                    background: sessCoachView === "notes" ? "#92400e" : "#fef3c7",
                    border: `1.5px solid ${sessCoachView === "notes" ? "#92400e" : "#fde68a"}`,
                    borderRadius:10,
                    cursor:"pointer",
                    fontFamily:"inherit",
                  }}
                >
                  <span style={{fontSize:16}}>📝</span>
                  <span style={{fontSize:13,fontWeight:700,color: sessCoachView === "notes" ? "#fff" : "#92400e"}}>
                    Session Notes
                  </span>
                </button>
              </div>
              
              {/* Inline Attendance View */}
              {sessCoachView === "attendance" && (
                <div style={{
                  background:"#f0fdf4",
                  border:"1.5px solid #86efac",
                  borderRadius:12,
                  padding:"14px 16px",
                  marginBottom:14,
                }}>
                  <div style={{
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"center",
                    marginBottom:12,
                  }}>
                    <div style={{fontSize:12,fontWeight:800,color:"#166534"}}>
                      ✓ Mark Attendance
                    </div>
                    <button
                      onClick={()=>{
                        // Save attendance to Firestore
                        const sessionKey = `${selSess.date}_${selSess.id}`;
                        const updatedAttendance = {
                          ...allAttendance,
                          [sessionKey]: sessAttendance,
                        };
                        saveAllAttendance(updatedAttendance);
                        // Also update session object for immediate display
                        const updSess = {...selSess, attendance: sessAttendance};
                        setSelSess(updSess);
                        saveSessions(sessions.map(s=>s.id===selSess.id?updSess:s));
                        showToast("Attendance saved ✓");
                        setSessCoachView(null);
                      }}
                      style={{
                        padding:"6px 14px",
                        fontSize:11,
                        fontWeight:700,
                        background:"#166534",
                        color:"#fff",
                        border:"none",
                        borderRadius:6,
                        cursor:"pointer",
                        fontFamily:"inherit",
                      }}
                    >
                      💾 Save
                    </button>
                  </div>
                  
                  {/* Attendance summary */}
                  {(()=>{
                    const present = Object.values(sessAttendance).filter(v=>v===true).length;
                    const absent = Object.values(sessAttendance).filter(v=>v===false).length;
                    const total = selSess.players.length;
                    return (
                      <div style={{display:"flex",gap:8,marginBottom:12}}>
                        <div style={{flex:1,textAlign:"center",background:"#dcfce7",borderRadius:8,padding:"8px"}}>
                          <div style={{fontSize:18,fontWeight:800,color:"#166534"}}>{present}</div>
                          <div style={{fontSize:10,color:"#15803d",fontWeight:600}}>Present</div>
                        </div>
                        <div style={{flex:1,textAlign:"center",background:"#fef2f2",borderRadius:8,padding:"8px"}}>
                          <div style={{fontSize:18,fontWeight:800,color:"#dc2626"}}>{absent}</div>
                          <div style={{fontSize:10,color:"#b91c1c",fontWeight:600}}>Absent</div>
                        </div>
                        <div style={{flex:1,textAlign:"center",background:"#f1f5f9",borderRadius:8,padding:"8px"}}>
                          <div style={{fontSize:18,fontWeight:800,color:"#64748b"}}>{total - present - absent}</div>
                          <div style={{fontSize:10,color:"#64748b",fontWeight:600}}>Unmarked</div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Player attendance list */}
                  <div style={{maxHeight:300,overflowY:"auto"}}>
                    {selSess.players.map((name, idx) => {
                      const mem = members.find(m=>m.name===name);
                      const status = sessAttendance[mem?.id||name];
                      return (
                        <div key={name} style={{
                          display:"flex",
                          alignItems:"center",
                          gap:10,
                          padding:"10px 0",
                          borderBottom: idx < selSess.players.length - 1 ? "1px solid #c6f0d0" : "none",
                        }}>
                          {/* Toggle buttons */}
                          <div style={{display:"flex",gap:4}}>
                            <button
                              onClick={()=>setSessAttendance(prev=>({...prev,[mem?.id||name]: status===true ? null : true}))}
                              style={{
                                width:32,height:32,borderRadius:"50%",
                                background: status===true ? "#166534" : "#fff",
                                border: `2px solid ${status===true ? "#166534" : "#d1d5db"}`,
                                color: status===true ? "#fff" : "#9ca3af",
                                fontSize:14,fontWeight:700,cursor:"pointer",
                                display:"flex",alignItems:"center",justifyContent:"center",
                              }}
                            >✓</button>
                            <button
                              onClick={()=>setSessAttendance(prev=>({...prev,[mem?.id||name]: status===false ? null : false}))}
                              style={{
                                width:32,height:32,borderRadius:"50%",
                                background: status===false ? "#dc2626" : "#fff",
                                border: `2px solid ${status===false ? "#dc2626" : "#d1d5db"}`,
                                color: status===false ? "#fff" : "#9ca3af",
                                fontSize:14,fontWeight:700,cursor:"pointer",
                                display:"flex",alignItems:"center",justifyContent:"center",
                              }}
                            >✗</button>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{name}</div>
                          </div>
                          {status !== null && status !== undefined && (
                            <span style={{
                              fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10,
                              background: status===true ? "#dcfce7" : "#fef2f2",
                              color: status===true ? "#166534" : "#dc2626",
                            }}>
                              {status===true ? "Present" : "Absent"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Inline Notes View */}
              {sessCoachView === "notes" && (
                <div style={{
                  background:"#fef3c7",
                  border:"1.5px solid #fde68a",
                  borderRadius:12,
                  padding:"14px 16px",
                  marginBottom:14,
                }}>
                  <div style={{
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"center",
                    marginBottom:12,
                  }}>
                    <div style={{fontSize:12,fontWeight:800,color:"#92400e"}}>
                      📝 Session Notes
                    </div>
                    <div style={{fontSize:10,color:"#a16207"}}>
                      {fmtShort(selSess.date)} · {selSess.restrictedTo}
                    </div>
                  </div>
                  
                  {/* Quick add note for each player */}
                  <div style={{maxHeight:400,overflowY:"auto"}}>
                    {selSess.players.map((name, idx) => {
                      const mem = members.find(m=>m.name===name);
                      const noteKey = mem?.id||name;
                      const draftNote = sessNotesDraft[noteKey] || "";
                      const existingNotes = sessNotes.filter(n=>n.playerId===noteKey && n.sessionId===selSess.id);
                      
                      return (
                        <div key={name} style={{
                          padding:"12px 0",
                          borderBottom: idx < selSess.players.length - 1 ? "1px solid #fde68a" : "none",
                        }}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <div style={{
                              width:32,height:32,borderRadius:"50%",
                              background:"#fef9c3",border:"1.5px solid #fde68a",
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:11,fontWeight:700,color:"#92400e",
                            }}>
                              {name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                            <div style={{fontSize:13,fontWeight:600,color:"#78350f"}}>{name}</div>
                          </div>
                          
                          {/* Existing notes */}
                          {existingNotes.map((note, i) => (
                            <div key={i} style={{
                              background:"#fff",
                              borderRadius:6,
                              padding:"8px 10px",
                              marginBottom:6,
                              fontSize:12,
                              color:"#78350f",
                              borderLeft:"3px solid #f59e0b",
                            }}>
                              {note.text}
                              {note.pillar && (
                                <span style={{
                                  marginLeft:8,fontSize:9,padding:"1px 6px",
                                  background:"#fef3c7",borderRadius:4,color:"#92400e",
                                }}>{note.pillar}</span>
                              )}
                            </div>
                          ))}
                          
                          {/* Add note input */}
                          <div style={{display:"flex",gap:6}}>
                            <input
                              type="text"
                              placeholder="Add a note..."
                              value={draftNote}
                              onChange={e=>setSessNotesDraft(prev=>({...prev,[noteKey]:e.target.value}))}
                              style={{
                                flex:1,
                                padding:"8px 10px",
                                fontSize:12,
                                border:"1px solid #fde68a",
                                borderRadius:6,
                                background:"#fff",
                                fontFamily:"inherit",
                              }}
                            />
                            <button
                              disabled={!draftNote.trim()}
                              onClick={()=>{
                                if(!draftNote.trim()) return;
                                const newNote = {
                                  playerId: noteKey,
                                  playerName: name,
                                  sessionId: selSess.id,
                                  date: selSess.date,
                                  text: draftNote.trim(),
                                  coach: currentUser?.name,
                                  timestamp: new Date().toISOString(),
                                };
                                setSessNotes(prev=>[...prev, newNote]);
                                setSessNotesDraft(prev=>({...prev,[noteKey]:""}));
                                // Auto-save to Firestore immediately
                                const updatedNotes = [...allSessionNotes, newNote];
                                saveAllSessionNotes(updatedNotes);
                              }}
                              style={{
                                padding:"8px 12px",
                                fontSize:11,
                                fontWeight:700,
                                background: draftNote.trim() ? "#f59e0b" : "#e5e7eb",
                                color: draftNote.trim() ? "#fff" : "#9ca3af",
                                border:"none",
                                borderRadius:6,
                                cursor: draftNote.trim() ? "pointer" : "not-allowed",
                                fontFamily:"inherit",
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {sessNotes.filter(n=>n.sessionId===selSess.id).length > 0 && (
                    <button
                      onClick={()=>{
                        // Merge session notes with all notes and save
                        const sessionNoteIds = new Set(sessNotes.filter(n=>n.sessionId===selSess.id).map(n=>n.timestamp));
                        const otherNotes = allSessionNotes.filter(n=>!sessionNoteIds.has(n.timestamp));
                        const mergedNotes = [...otherNotes, ...sessNotes.filter(n=>n.sessionId===selSess.id)];
                        saveAllSessionNotes(mergedNotes);
                        showToast(`${sessNotes.filter(n=>n.sessionId===selSess.id).length} note(s) saved ✓`);
                        setSessCoachView(null);
                      }}
                      style={{
                        width:"100%",
                        marginTop:12,
                        padding:"10px",
                        fontSize:12,
                        fontWeight:700,
                        background:"#92400e",
                        color:"#fff",
                        border:"none",
                        borderRadius:8,
                        cursor:"pointer",
                        fontFamily:"inherit",
                      }}
                    >
                      💾 Save All Notes
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <SLbl mt={4} G={G}>Players ({selSess.players.length})</SLbl>
          {/* ── Persistent carpool section ─────────────────── */}
          {(userInTeam || selSess.players.includes(currentUser?.name))&&(()=>{
            const lifts=selSess.lifts||{};
            const myName=currentUser?.name;
            const myLiftObj=getLiftObj(lifts[myName]);
            const myPref=myLiftObj.pref;
            const isO=myPref==="offer",isN=myPref==="need",isSelf=myPref==="self";
            const dispS=d=>{const o=getLiftObj(d);if(!o.stop)return"";return o.stop==="Other"?(o.stopOther||"Other"):o.stop;};
            // Others who have set a pref (not current user)
            const otherOffers=selSess.players.filter(p=>p!==myName&&getLiftPref(lifts[p])==="offer");
            const otherNeeds =selSess.players.filter(p=>p!==myName&&getLiftPref(lifts[p])==="need");
            const anyOthers=otherOffers.length||otherNeeds.length;
            if(!myPref&&!anyOthers) {
              // No prefs at all — show compact prompt
              return (
                <button onClick={()=>{setLiftDraft(null);setCarpoolSheetSess(selSess);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,
                    padding:"11px 14px",marginBottom:10,borderRadius:10,cursor:"pointer",
                    fontFamily:"inherit",textAlign:"left",
                    background:"#f8fdf9",border:"1px solid #c6f0d0",boxSizing:"border-box"}}>
                  <span style={{fontSize:20}}>🚘</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:G.green}}>Car pool</div>
                    <div style={{fontSize:11,color:G.muted,marginTop:1}}>Tap to set your travel preference</div>
                  </div>
                  <span style={{fontSize:16,color:G.green}}>›</span>
                </button>
              );
            }
            // At least one pref set — show full section
            return (
              <div style={{background:"#f8fdf9",border:"1px solid #c6f0d0",borderRadius:12,
                padding:"10px 13px",marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:800,color:G.muted,textTransform:"uppercase",
                  letterSpacing:1.1,marginBottom:8}}>🚘 Car pool</div>
                {/* Others */}
                {otherOffers.map(name=>{
                  const obj=getLiftObj(lifts[name]);const loc=dispS(lifts[name]);
                  return <div key={name} style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                      background:"#dcfce7",color:"#166534",border:"0.5px solid #86efac"}}>🚘 Offering</span>
                    <span style={{fontWeight:700,fontSize:12,color:G.text}}>{name}</span>
                    {obj.seats>0&&<span style={{fontSize:11,color:G.muted}}>💺{obj.seats}</span>}
                    {loc&&<span style={{fontSize:11,color:G.muted}}>📍{loc}</span>}
                    {obj.note&&<span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>"{obj.note}"</span>}
                  </div>;
                })}
                {otherNeeds.map(name=>{
                  const obj=getLiftObj(lifts[name]);const loc=dispS(lifts[name]);
                  return <div key={name} style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                      background:"#dbeafe",color:"#1e3a5f",border:"0.5px solid #93c5fd"}}>🙋 Needs lift</span>
                    <span style={{fontWeight:700,fontSize:12,color:G.text}}>{name}</span>
                    {loc&&<span style={{fontSize:11,color:G.muted}}>📍{loc}</span>}
                    {obj.note&&<span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>"{obj.note}"</span>}
                  </div>;
                })}
                {/* Divider before my row */}
                {anyOthers>0&&<div style={{borderTop:`0.5px solid #c6f0d0`,margin:"6px 0"}}/>}
                {/* My preference */}
                {myPref ? (
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20,
                      background:isO?"#dcfce7":isN?"#dbeafe":"rgba(0,0,0,.05)",
                      color:isO?"#166534":isN?"#1e3a5f":G.muted,
                      border:`0.5px solid ${isO?"#86efac":isN?"#93c5fd":"rgba(0,0,0,.1)"}`}}>
                      {isO?"🚘 You: Offering":isN?"🙋 You: Need lift":"🚀 You: Own transport"}
                    </span>
                    {isO&&myLiftObj.seats>0&&<span style={{fontSize:11,color:G.muted}}>💺{myLiftObj.seats}</span>}
                    {dispS(myLiftObj)&&<span style={{fontSize:11,color:G.muted}}>📍{dispS(myLiftObj)}</span>}
                    {myLiftObj.note&&<span style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>"{myLiftObj.note}"</span>}
                    <button onClick={()=>{setLiftDraft({...myLiftObj});setCarpoolSheetSess(selSess);}}
                      style={{fontSize:11,background:"none",border:"none",color:G.muted,
                        textDecoration:"underline",cursor:"pointer",fontFamily:"inherit",padding:0}}>Edit</button>
                  </div>
                ) : (
                  <button onClick={()=>{setLiftDraft(null);setCarpoolSheetSess(selSess);}}
                    style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                      border:`1px solid #c6f0d0`,background:G.white,color:G.green,
                      cursor:"pointer",fontFamily:"inherit"}}>
                    🚘 Set your preference
                  </button>
                )}
              </div>
            );
          })()}
          {/* ── Players grouped by team, collapsible, alphabetical ── */}
          {(()=>{
            const lifts=selSess.lifts||{};
            // Group players by their primary team relevant to this session
            const ALL_SESS_TEAMS = [...new Set(selSess.players.flatMap(p=>{
              const m=members.find(x=>x.name===p);
              return (m?.teams||["Unassigned"]);
            }))];
            // Sort teams: restricted team first, then alpha
            const sortedTeams=[...ALL_SESS_TEAMS].sort((a,b)=>{
              if(a===selSess.restrictedTo) return -1;
              if(b===selSess.restrictedTo) return 1;
              return a.localeCompare(b);
            });
            // Build groups
            const groups=sortedTeams.map(team=>({
              team,
              players:[...selSess.players]
                .filter(p=>{
                  const m=members.find(x=>x.name===p);
                  const ts=m?.teams||[];
                  if(team==="Unassigned") return ts.length===0;
                  return ts.includes(team);
                })
                .sort((a,b)=>a.localeCompare(b)),
            })).filter(g=>g.players.length>0);

            // Deduplicate — each player appears in their first matching group only
            const seen=new Set();
            const dedupedGroups=groups.map(g=>({
              ...g,
              players:g.players.filter(p=>{ if(seen.has(p)) return false; seen.add(p); return true; })
            })).filter(g=>g.players.length>0);

            return dedupedGroups.map(({team,players})=>(
              <PlayerGroup key={team} team={team} players={players} members={members}
                teams={teams} G={G}
                lifts={lifts} selSess={selSess} isSelf={p=>currentUser?.name===p}
                cutoff={cutoff} canRemove={canOrCoach(userRole,"removePlayer",userMem,teams)}
                onRemove={p=>handleLeave(selSess.id,p)}
                onCarpoolEdit={p=>{
                  const lo=getLiftObj((selSess.lifts||{})[p]);
                  setLiftDraft({...lo});setCarpoolSheetSess(selSess);
                }}
                onCarpoolSet={()=>{setLiftDraft(null);setCarpoolSheetSess(selSess);}}
                single={dedupedGroups.length===1}
              />
            ));
          })()}


          {/* Poll voting */}
          {selSess.poll&&selSess.poll.length>0&&(()=>{
            const poll = selSess.poll;
            const totalVoters = [...new Set(poll.flatMap(o=>o.votes||[]))].length;
            const maxVotes = Math.max(...poll.map(o=>(o.votes||[]).length), 1);
            return (
              <div style={{marginBottom:20}}>
                <SLbl mt={4} G={G}>Session Poll</SLbl>
                <div style={{background:G.white,borderRadius:12,
                  border:`1.5px solid ${G.border}`,padding:14}}>
                  <div style={{fontSize:11,color:G.muted,fontWeight:700,marginBottom:12,
                    textTransform:"uppercase",letterSpacing:1.2}}>
                    {totalVoters} vote{totalVoters!==1?"s":""}
                    {selSess.players.includes(currentUser.name)
                      ? " · tap to vote" : " · join session to vote"}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {poll.map(o=>{
                      const votes = o.votes||[];
                      const hasVoted = votes.includes(currentUser.name);
                      const pct = Math.round((votes.length/maxVotes)*100);
                      const canVote = selSess.players.includes(currentUser.name);
                      return (
                        <button key={o.id} type="button"
                          onClick={()=>canVote&&handleVote(selSess.id,o.id)}
                          style={{width:"100%",textAlign:"left",border:"none",
                            background:"transparent",padding:0,
                            cursor:canVote?"pointer":"default",fontFamily:"inherit"}}>
                          <div style={{display:"flex",justifyContent:"space-between",
                            alignItems:"center",marginBottom:4}}>
                            <span style={{fontWeight:800,fontSize:14,color:G.text,
                              display:"flex",alignItems:"center",gap:6}}>
                              {hasVoted&&<span style={{color:G.green,fontSize:13}}>✓</span>}
                              {o.label}
                            </span>
                            <span style={{fontSize:12,fontWeight:800,
                              color:hasVoted?G.green:G.muted}}>
                              {votes.length} {votes.length===1?"vote":"votes"}
                            </span>
                          </div>
                          {/* Vote bar */}
                          <div style={{height:8,borderRadius:20,
                            background:G.border,overflow:"hidden"}}>
                            <div style={{height:"100%",borderRadius:20,
                              width:`${pct}%`,
                              background:hasVoted?G.green:"#a3e63580",
                              transition:"width .3s ease"}}/>
                          </div>
                          {/* Voter names */}
                          {votes.length>0&&(
                            <div style={{fontSize:11,color:G.muted,marginTop:3}}>
                              {votes.map(v=>v).join(", ")}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Who's not coming (admins/captains see add button; members see read-only) ── */}
          {notIn.length>0&&userInTeam&&(()=>{
            const isSelf = name => name === currentUser?.name;
            const label = canAddOthers ? "Add Players / Not Yet Signed Up" : "Not Yet Signed Up";
            
            // Flat alphabetical list - no duplicates since notIn is already unique by member
            const filteredNotIn = notInSearch.trim()
              ? notIn.filter(m => m.name.toLowerCase().includes(notInSearch.toLowerCase()))
              : notIn;
            const sortedNotIn = [...filteredNotIn].sort((a,b) => a.name.localeCompare(b.name));
            
            return (<>
              {/* Toggle header */}
              <button onClick={()=>{setNotInExpanded(v=>!v); if(!notInExpanded) setNotInSearch("");}}
                style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                  background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",
                  padding:"4px 0 8px",marginTop:4}}>
                <span style={{fontSize:12,fontWeight:900,letterSpacing:1.1,
                  textTransform:"uppercase",color:G.muted}}>
                  {label} ({notIn.length})
                </span>
                <span style={{fontSize:12,color:G.muted,fontWeight:700}}>
                  {notInExpanded?"▲ hide":"▼ show"}
                </span>
              </button>
              {notInExpanded&&(
                <div style={{background:G.white,border:`1.5px solid ${G.border}`,
                  borderRadius:12,padding:12,marginBottom:14}}>
                  
                  {/* Search input */}
                  <input
                    type="text"
                    placeholder="🔍 Search players..."
                    value={notInSearch}
                    onChange={e=>setNotInSearch(e.target.value)}
                    style={{
                      width:"100%",padding:"10px 12px",fontSize:13,
                      border:`1.5px solid ${G.border}`,borderRadius:10,
                      fontFamily:"inherit",marginBottom:10,
                      background:G.bg
                    }}
                  />
                  
                  {/* Count indicator */}
                  <div style={{fontSize:11,color:G.muted,marginBottom:8}}>
                    Showing {sortedNotIn.length} of {notIn.length} player{notIn.length!==1?"s":""}
                  </div>
                  
                  {/* Scrollable alphabetical list */}
                  <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                    {sortedNotIn.map(m=>{
                      const self = isSelf(m.name);
                      const canAdd = canAddOthers || self;
                      const away = selSess?.date && isAbsent(m, selSess.date);
                      const abs = away ? (m.absences||[]).find(a=>a.from<=selSess.date&&a.to>=selSess.date) : null;
                      const teamStr = (m.teams||[]).join(", ") || "Unassigned";
                      
                      return (
                        <button key={m.id}
                          onClick={canAdd ? ()=>handleJoinDetail(m.name) : undefined}
                          style={{
                            display:"flex",alignItems:"center",justifyContent:"space-between",
                            background: canAdd 
                              ? (away ? "#fffbeb" : G.bg) 
                              : "#f1f5f9",
                            border: canAdd 
                              ? (away ? "1.5px solid #fde68a" : `1px solid ${G.border}`)
                              : "1px solid #e2e8f0",
                            borderRadius:10,padding:"10px 14px",
                            cursor:canAdd?"pointer":"default",fontFamily:"inherit",
                            textAlign:"left",opacity:canAdd?1:0.65
                          }}
                          title={away?`Away: ${abs?.category||""} ${fmtShort(abs?.from)}–${fmtShort(abs?.to)}`:""}
                        >
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {canAdd && <span style={{color:G.green,fontWeight:900}}>+</span>}
                            <span style={{fontWeight:700,fontSize:13,
                              color: canAdd ? (away ? "#92400e" : G.text) : G.muted}}>
                              {m.name}{away&&" ✈️"}
                            </span>
                          </div>
                          <span style={{fontSize:10,color:G.muted}}>{teamStr}</span>
                        </button>
                      );
                    })}
                    {sortedNotIn.length === 0 && (
                      <div style={{padding:16,textAlign:"center",color:G.muted,fontSize:12}}>
                        No players match "{notInSearch}"
                      </div>
                    )}
                  </div>
                  
                  {!canAddOthers&&(
                    <div style={{fontSize:11,color:G.muted,marginTop:10,fontStyle:"italic"}}>
                      Only captains and admins can add other players.
                      {cutoff && " Sign-ups are locked — contact your captain."}
                    </div>
                  )}
                </div>
              )}
            </>);
          })()}

          {/* ── Comments ─────────────────────────────────────── */}
          {(()=>{
            const comments = selSess.comments || [];
            const isInSession = selSess.players.includes(currentUser?.name)
              || can(userRole,"deleteSession");
            const fmtTs = ts => {
              const d = new Date(ts);
              return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})
                + " · " + d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
            };
            return (
              <div style={{marginTop:24}}>
                <div style={{fontWeight:900,fontSize:12,letterSpacing:1.2,
                  textTransform:"uppercase",color:G.muted,marginBottom:10}}>
                  💬 Comments {comments.length>0&&`(${comments.length})`}
                </div>

                {comments.length===0&&(
                  <div style={{fontSize:12,color:G.muted,fontStyle:"italic",marginBottom:10}}>
                    No comments yet.{isInSession?" Be the first!":""}
                  </div>
                )}

                {comments.map(c=>(
                  <div key={c.id} style={{background:G.cream,borderRadius:10,
                    padding:"10px 13px",marginBottom:7,position:"relative"}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"flex-start",gap:8}}>
                      <div>
                        <span style={{fontWeight:800,fontSize:12,color:G.green}}>
                          {c.name}
                        </span>
                        <span style={{fontSize:11,color:G.muted,marginLeft:8}}>
                          {fmtTs(c.ts)}
                        </span>
                      </div>
                      {(c.name===currentUser?.name||can(userRole,"deleteSession"))&&(
                        <button onClick={()=>handleDeleteComment(selSess.id,c.id)}
                          style={{background:"none",border:"none",color:G.muted,
                            fontSize:14,cursor:"pointer",padding:"0 2px",lineHeight:1,
                            flexShrink:0}}>×</button>
                      )}
                    </div>
                    <div style={{fontSize:13,color:G.text,marginTop:4,lineHeight:1.5}}>
                      {c.text}
                    </div>
                  </div>
                ))}

                {isInSession ? (
                  <div style={{display:"flex",gap:8,marginTop:6}}>
                    <input
                      value={commentText}
                      onChange={e=>setCommentText(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){
                        e.preventDefault();
                        handlePostComment(selSess.id,commentText);
                      }}}
                      placeholder="Add a comment…"
                      style={{...iSt({flex:1}),fontSize:13,padding:"9px 12px"}}/>
                    <button onClick={()=>handlePostComment(selSess.id,commentText)}
                      disabled={!commentText.trim()}
                      style={{background:commentText.trim()?G.green:"#e2e8f0",
                        color:commentText.trim()?G.lime:G.muted,
                        border:"none",borderRadius:10,padding:"9px 16px",
                        fontSize:13,fontWeight:800,cursor:commentText.trim()?"pointer":"default",
                        fontFamily:"inherit",flexShrink:0,transition:"all .15s"}}>
                      Post
                    </button>
                  </div>
                ) : (
                  <div style={{fontSize:11,color:G.muted,fontStyle:"italic"}}>
                    Join this session to leave a comment.
                  </div>
                )}
              </div>
            );
          })()}

          {(()=>{
            const isRecurring = !!selSess.recurringId;
            const isMySession = selSess.createdBy===currentUser?.name;
            const isCaptainLevel = canOrCoach(userRole,"deleteSession",userMem,teams);
            // Members can only delete their own non-recurring sessions
            // Captains/admins/coaches can delete any session (recurring too)
            const canDelete = isCaptainLevel || (!isRecurring && isMySession);
            if(!canDelete) return null;
            const slot = isRecurring ? recurring.find(r=>r.id===selSess.recurringId) : null;
            
            // Handler to refresh/regenerate a recurring session (delete without cancelling)
            const handleRefreshSession = () => {
              if(!confirm("Refresh this session? It will be deleted and regenerated with current settings from the recurring slot.")) return;
              // Just delete the session - it will be regenerated by the recurring useEffect
              // Don't add to cancelledDates
              handleDeleteSess(selSess.id);
              showToast("Session refreshed — reload to see updated version");
            };
            
            return (
              <div style={{marginTop:22}}>
                {isRecurring&&slot&&(
                  <>
                    {/* Refresh session — for admins to regenerate with latest settings */}
                    <button onClick={handleRefreshSession}
                      style={{display:"block",width:"100%",marginBottom:10,
                        background:"#f0f9ff",border:"1.5px solid #0ea5e9",color:"#0369a1",
                        borderRadius:10,padding:"11px",fontSize:14,fontWeight:800,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      🔄 Refresh Session (Regenerate from Slot)
                    </button>
                    <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",
                      borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,
                      color:"#0369a1",lineHeight:1.5}}>
                      <b>💡 Use Refresh</b> after changing the recurring slot settings (time, coaches, etc.) 
                      to update this session with the new values.
                    </div>
                    
                    {/* Cancel just this date - opens confirmation modal */}
                    <button onClick={()=>setCancelModal({session: selSess, slot})}
                      style={{display:"block",width:"100%",marginBottom:10,
                        background:"#fef3c7",border:"1.5px solid #f59e0b",color:"#92400e",
                        borderRadius:10,padding:"11px",fontSize:14,fontWeight:800,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      🚫 Cancel This Training Only ({fmtShort(selSess.date)})
                    </button>
                    <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",
                      borderRadius:10,padding:"11px 14px",marginBottom:10,fontSize:12,
                      color:"#64748b",lineHeight:1.6}}>
                      <b>💡 Tip:</b> "Cancel This Training Only" stops the session on {fmtShort(selSess.date)} 
                      without affecting future weeks. The recurring slot "<b>{slot.name}</b>" continues.
                    </div>
                    <div style={{borderTop:"1px dashed #e2e8f0",paddingTop:12,marginTop:4}}>
                      <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:8,
                        textTransform:"uppercase",letterSpacing:0.5}}>
                        Or permanently delete the recurring slot:
                      </div>
                      <button onClick={()=>{
                          if(!confirm(`Delete the entire "${slot.name}" recurring slot? This will stop ALL future sessions.`)) return;
                          deleteRecurringSlotSilent(slot.id);
                          handleDeleteSess(selSess.id);
                        }}
                        style={{display:"block",width:"100%",
                          background:"transparent",border:`1.5px solid ${G.red}`,color:G.red,
                          borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit"}}>
                        🗑 Delete "{slot.name}" Recurring Slot (All Future Sessions)
                      </button>
                    </div>
                  </>
                )}
                {!isRecurring&&(
                  <>
                    {isMySession&&!isCaptainLevel&&(
                      <div style={{background:"#f0fdf4",border:"1px solid #86efac",
                        borderRadius:10,padding:"9px 13px",marginBottom:10,fontSize:12,
                        color:"#166534",lineHeight:1.5}}>
                        ℹ️ You created this session. You can delete it to cancel your booking.
                      </div>
                    )}
                    <button onClick={()=>handleDeleteSess(selSess.id)}
                      style={{display:"block",width:"100%",
                        background:"transparent",border:`1.5px solid ${G.red}`,color:G.red,
                        borderRadius:10,padding:"11px",fontSize:14,fontWeight:800,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      🗑 Cancel & Delete Booking
                    </button>
                  </>
                )}
              </div>
            );
          })()}
          
          {/* Cancellation confirmation modal */}
          {cancelModal && (()=>{
            const {session, slot} = cancelModal;
            const presetReasons = [
              "Weather conditions",
              "Ground unavailable",
              "Coach unavailable", 
              "Relocated to indoor venue",
              "Public holiday",
              "Not enough players",
              "Other",
            ];
            
            const handleConfirmCancel = () => {
              if(!cancelReason.trim()) {
                showToast("Please provide a reason for cancellation");
                return;
              }
              
              // Check if already cancelled (prevent duplicates)
              const alreadyCancelled = cancelledSessions.some(
                c => c.date === session.date && c.recurringId === session.recurringId
              );
              
              if(!alreadyCancelled) {
                // 1. Add to cancelledSessions archive
                const cancelRecord = {
                  id: uid(),
                  date: session.date,
                  label: session.label || slot?.name || "Training",
                  team: session.restrictedTo || session.sessionTeams?.[0] || "",
                  reason: cancelReason.trim(),
                  cancelledBy: currentUser?.name,
                  cancelledAt: new Date().toISOString(),
                  recurringId: session.recurringId,
                  originalPlayers: session.players || [],
                };
                saveCancelledSessions([cancelRecord, ...cancelledSessions].slice(0, 200)); // Keep last 200
              }
              
              // 2. Add date to recurring slot's cancelledDates (ALWAYS do this to prevent regeneration)
              if(slot) {
                const existingCancelled = slot.cancelledDates || [];
                if(!existingCancelled.includes(session.date)) {
                  const updated = recurring.map(r => 
                    r.id === slot.id 
                      ? { ...r, cancelledDates: [...existingCancelled, session.date] }
                      : r
                  );
                  saveRecurring(updated);
                }
              }
              
              // 3. Delete the session
              handleDeleteSess(session.id);
              
              // 4. Close modal and show confirmation
              setCancelModal(null);
              setCancelReason("");
              setSelSess(null);
              setView("schedule");
              showToast(`Cancelled: ${cancelReason.trim()}`);
            };
            
            return (
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
                display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
                onClick={()=>{setCancelModal(null);setCancelReason("");}}>
                <div onClick={e=>e.stopPropagation()}
                  style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:400,
                    maxHeight:"85vh",overflowY:"auto"}}>
                  
                  {/* Header */}
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    <div style={{width:44,height:44,borderRadius:12,background:"#fef3c7",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                      🚫
                    </div>
                    <div>
                      <div style={{fontWeight:900,fontSize:16,color:G.text}}>Cancel Training</div>
                      <div style={{fontSize:12,color:G.muted}}>
                        {session.label || "Session"} · {fmtShort(session.date)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Warning */}
                  <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:10,
                    padding:"12px 14px",marginBottom:16,fontSize:12,color:"#991b1b",lineHeight:1.5}}>
                    <b>⚠️ This will notify booked players</b> that the session is cancelled. 
                    Please provide a reason so everyone understands why.
                  </div>
                  
                  {/* Affected players */}
                  {session.players?.length > 0 && (
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,
                        textTransform:"uppercase",letterSpacing:0.5}}>
                        {session.players.length} player{session.players.length!==1?"s":""} booked
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {session.players.slice(0,10).map(p=>(
                          <span key={p} style={{background:"#f1f5f9",borderRadius:20,
                            padding:"2px 8px",fontSize:11,fontWeight:600,color:G.text}}>
                            {p.split(" ")[0]}
                          </span>
                        ))}
                        {session.players.length > 10 && (
                          <span style={{fontSize:11,color:G.muted,padding:"2px 4px"}}>
                            +{session.players.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Reason selection */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:8,
                      textTransform:"uppercase",letterSpacing:0.5}}>
                      Reason for cancellation *
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                      {presetReasons.map(r=>(
                        <button key={r}
                          onClick={()=>setCancelReason(r === "Other" ? "" : r)}
                          style={{
                            background: cancelReason===r ? "#fef3c7" : "#f8fafc",
                            border: cancelReason===r ? "1.5px solid #f59e0b" : "1px solid #e2e8f0",
                            borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:600,
                            color: cancelReason===r ? "#92400e" : G.text,
                            cursor:"pointer",fontFamily:"inherit"
                          }}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={cancelReason}
                      onChange={e=>setCancelReason(e.target.value)}
                      placeholder="Enter reason or add details..."
                      style={{width:"100%",padding:"10px 12px",fontSize:13,
                        border:`1.5px solid ${G.border}`,borderRadius:10,
                        fontFamily:"inherit",resize:"vertical",minHeight:60}}
                    />
                  </div>
                  
                  {/* Actions */}
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>{setCancelModal(null);setCancelReason("");}}
                      style={{flex:1,padding:"12px",background:"#f1f5f9",border:"none",
                        borderRadius:10,fontSize:14,fontWeight:700,color:G.muted,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      Go Back
                    </button>
                    <button onClick={handleConfirmCancel}
                      disabled={!cancelReason.trim()}
                      style={{flex:1,padding:"12px",
                        background: cancelReason.trim() ? "#f59e0b" : "#e2e8f0",
                        border:"none",borderRadius:10,fontSize:14,fontWeight:800,
                        color: cancelReason.trim() ? "#fff" : "#9ca3af",
                        cursor: cancelReason.trim() ? "pointer" : "not-allowed",
                        fontFamily:"inherit"}}>
                      Confirm Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        <BotNav view="session" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
        {toast&&<Toast msg={toast} G={G}/>}
        {carpoolSheetSess&&<CarpoolSheet
          sess={carpoolSheetSess}
          sessions={sessions}
          myName={currentUser?.name}
          liftDraft={liftDraft}
          setLiftDraft={setLiftDraft}
          liftEditing={liftEditing}
          setLiftEditing={setLiftEditing}
          saveSessions={saveSessions}
          selSess={selSess}
          setSelSess={setSelSess}
          onClose={()=>{setCarpoolSheetSess(null);setLiftDraft(null);setLiftEditing(false);}}
          G={G}
        />}
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Coach HQ (Coaches & Admins only)
  // ════════════════════════════════════════════════════════════
  if(view==="coachhq" && (can(userRole,"accessMembers") || isCoachMember(currentUser?.name, teams))) return <CoachHQView />;

  // ════════════════════════════════════════════════════════════
  // RENDER: Progress Tracker (from Coach HQ)
  // ════════════════════════════════════════════════════════════
  if((view==="progress-tracker" || view==="season-plan") && (can(userRole,"accessMembers") || isCoachMember(currentUser?.name, teams))) {
    const coachTeams = (teams||[]).filter(t=>(t.coaches||[]).includes(currentUser?.name));
    const isAdmin = can(userRole,"accessMembers");
    
    // Get players from coach's teams
    const coachPlayers = members.filter(m => {
      if(isAdmin) {
        // Admins see all youth players
        return (m.teams||[]).some(t=>t.startsWith("U"));
      }
      const memberTeams = m.teams || [];
      return coachTeams.some(ct => memberTeams.includes(ct.name));
    }).map(m => {
      // Get progress data from playerProgress state
      const progress = playerProgress[m.id] || {};
      return {
        id: m.id,
        name: m.name,
        team: (m.teams||[]).find(t=>t.startsWith("U")) || m.teams?.[0] || "Unassigned",
        avatarColor: TEAM_META[(m.teams||[])[0]]?.bg || G.green,
        sessionsAttended: 0, // TODO: Calculate from attendance collection
        sessionsTotal: 0,
        // Progress data from Firestore
        snapshots: progress.snapshots || {},
        currentPhase: progress.currentPhase || "phase1",
        notes: allSessionNotes.filter(n => n.playerId === m.id),
        // Player attributes
        battingHand: m.battingHand,
        bowlingArm: m.bowlingArm,
        bowlingStyle: m.bowlingStyle,
      };
    });
    
    // Get upcoming session for this coach's teams
    const coachSessions = sessions.filter(s => {
      if(isAdmin) return true;
      return coachTeams.some(ct => s.restrictedTo === ct.name);
    });
    const nextSession = coachSessions.find(s => isFuture(s.date));
    
    // Get available teams for this coach (youth teams only)
    const availableTeams = isAdmin 
      ? (teams||[]).filter(t=>t.name.startsWith("U") || t.name === "Kvinder").map(t=>t.name)
      : coachTeams.map(t=>t.name);
    
    return (
      <ProgressTracker
        session={nextSession ? {
          id: nextSession.id,
          name: nextSession.label || "Training Session",
          phase: "Phase 2",
          focus: "Building fundamentals",
          date: nextSession.date,
        } : {
          name: "No upcoming session",
          phase: "Phase 2",
        }}
        players={coachPlayers}
        teams={availableTeams}
        seasonPlans={seasonPlans}
        userRole={userRole}
        currentUser={currentUser}
        initialScreen={view === "season-plan" ? "phases" : "players"}
        onBack={() => setView("coachhq")}
        onSaveAttendance={(att) => {
          // Save to Firestore attendance
          const sessionKey = `${att.date}_${att.sessionId}`;
          const updated = { ...allAttendance, [sessionKey]: att.records };
          saveAllAttendance(updated);
          showToast("Attendance saved ✓");
        }}
        onSaveNote={(note) => {
          // Save to Firestore session notes
          const updatedNotes = [...allSessionNotes, {
            ...note,
            timestamp: new Date().toISOString(),
            coach: currentUser?.name,
          }];
          saveAllSessionNotes(updatedNotes);
          showToast("Note saved ✓");
        }}
        onSaveSeasonPlan={(teamName, plan) => {
          const updated = { ...seasonPlans, [teamName]: plan };
          saveSeasonPlans(updated);
          showToast(`${teamName} plan saved ✓`);
        }}
        onSaveAttributes={(playerId, attrs) => {
          // Save player attributes to members
          const updated = members.map(m => 
            m.id === playerId ? { ...m, ...attrs } : m
          );
          saveMembers(updated);
          showToast("Attributes saved ✓");
        }}
        onSaveSkills={(data) => {
          // Save skills to player progress
          // data: {playerId, phase, skills, updatedBy, updatedAt}
          const existing = playerProgress[data.playerId] || { snapshots: {} };
          const updated = {
            ...playerProgress,
            [data.playerId]: {
              ...existing,
              currentPhase: data.phase,
              snapshots: {
                ...existing.snapshots,
                [data.phase]: data.skills,
              },
              lastUpdatedBy: currentUser?.name,
              lastUpdatedAt: data.updatedAt,
            },
          };
          setPlayerProgress(updated); // Update local state immediately
          savePlayerProgress(updated); // Save to Firestore
          showToast("Skills updated ✓");
        }}
      />
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Coach Coordination (from Coach HQ)
  // ════════════════════════════════════════════════════════════
  if(view==="coach-coordination" && (can(userRole,"accessMembers") || isCoachMember(currentUser?.name, teams))) return <CoachCoordinationView />;

  // ── ADMIN / MEMBERS ─────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // RENDER: Profile
  // ════════════════════════════════════════════════════════════
  if(view==="profile"||(view==="admin"&&!can(userRole,"accessMembers"))) {
    const me = members.find(m=>m.id===currentUser.id)||currentUser;
    const myTeams = (me.teams||[]);
    const myChildren = (me.children||[]).map(cid => members.find(m=>m.id===cid)).filter(Boolean);
    const isPlayer = myTeams.length > 0;
    const isParent = myChildren.length > 0 || me.memberType === "parent";
    const showFamilyTab = isParent || isPlayer; // Everyone can potentially link kids
    const {pct, needsReconfirm, isComplete, confirmedAt} = profileCompletion(me);
    const isReconfirm = pct===100 && needsReconfirm;
    
    // Helper functions for family management
    const linkChildToParent = (childId) => {
      const currentChildren = me.children || [];
      if (currentChildren.includes(childId)) return; // Already linked
      const updated = members.map(m => {
        if (m.id === currentUser.id) {
          return { ...m, children: [...currentChildren, childId] };
        }
        if (m.id === childId) {
          return { ...m, parentId: currentUser.id, parentName: me.name };
        }
        return m;
      });
      saveMembers(updated);
      setCurrentUser({...me, children: [...currentChildren, childId]});
      showToast("Child linked ✓");
      logAction("member", `Linked child: ${members.find(m=>m.id===childId)?.name} → ${me.name}`);
    };
    
    const unlinkChild = (childId) => {
      const childName = members.find(m=>m.id===childId)?.name || "Unknown";
      const updated = members.map(m => {
        if (m.id === currentUser.id) {
          return { ...m, children: (m.children||[]).filter(c=>c!==childId) };
        }
        if (m.id === childId) {
          return { ...m, parentId: null, parentName: null };
        }
        return m;
      });
      saveMembers(updated);
      setCurrentUser({...me, children: (me.children||[]).filter(c=>c!==childId)});
      showToast("Child unlinked");
      logAction("member", `Unlinked child: ${childName} from ${me.name}`);
    };
    
    // Find junior players (U-teams, Girls, Kvinder) that aren't already linked to someone
    const availableChildren = members.filter(m => 
      m.id !== currentUser.id &&
      (m.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder")) &&
      !m.parentId // Not already linked to a parent
    );
    
    return (
      <Shell sidebar={<SidebarNav view={view} setView={setView} userRole={userRole}
          currentUser={currentUser} onLogout={handleLogout} teams={teams} logo={FCC_LOGO}/>} G={G}>
        <AppHeader onBack={()=>setView("schedule")}
          title={profileTab === "family" ? "My Family" : "My Profile"} 
          sub={profileTab === "family" ? "Manage linked children" : (ROLE_META[me.role||"member"]?.label||"Member")}/>
        <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>

          {/* Profile / Family Tab Switcher */}
          <div style={{display:"flex",gap:8,background:"#f1f5f9",borderRadius:12,padding:4}}>
            <button onClick={()=>setProfileTab("profile")} style={{
              flex:1, padding:"10px 12px", borderRadius:10, border:"none",
              background: profileTab==="profile" ? "#fff" : "transparent",
              boxShadow: profileTab==="profile" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              fontWeight:700, fontSize:13, cursor:"pointer",
              color: profileTab==="profile" ? G.green : "#64748b",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              🏏 {isPlayer ? "My Profile" : "Profile"}
            </button>
            <button onClick={()=>setProfileTab("family")} style={{
              flex:1, padding:"10px 12px", borderRadius:10, border:"none",
              background: profileTab==="family" ? "#fff" : "transparent",
              boxShadow: profileTab==="family" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              fontWeight:700, fontSize:13, cursor:"pointer",
              color: profileTab==="family" ? "#2563eb" : "#64748b",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              👨‍👧 My Family {myChildren.length > 0 && <span style={{
                background:"#2563eb", color:"#fff", borderRadius:10,
                padding:"1px 6px", fontSize:11,
              }}>{myChildren.length}</span>}
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* FAMILY TAB */}
          {/* ══════════════════════════════════════════════════════════ */}
          {profileTab === "family" && (
            <FamilyManager
              me={me}
              myChildren={myChildren}
              availableChildren={availableChildren}
              members={members}
              onLink={linkChildToParent}
              onUnlink={unlinkChild}
              onCreateChild={(name, team) => {
                const childId = uid();
                const child = {
                  id: childId,
                  name: name.trim(),
                  teams: team ? [team] : [],
                  role: "member",
                  memberType: "player",
                  parentId: currentUser.id,
                  parentName: me.name,
                  joinedAt: new Date().toISOString(),
                };
                const updatedMe = { ...me, children: [...(me.children||[]), childId] };
                const updated = members.map(m => m.id === currentUser.id ? updatedMe : m);
                updated.push(child);
                saveMembers(updated);
                setCurrentUser(updatedMe);
                showToast(`${name} added and linked ✓`);
                logAction("member", `Created and linked child: ${name} → ${me.name}`);
              }}
              teams={teams}
              juniorTeams={Object.keys(teams).filter(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder"))}
            />
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* PROFILE TAB */}
          {/* ══════════════════════════════════════════════════════════ */}
          {profileTab === "profile" && (<>
          {/* Avatar + name card */}
          {(()=>{
            const isFemTeam = myTeams.some(t=>TEAM_META[t]?.feminine);
            const headerBg = isFemTeam
              ? "linear-gradient(135deg,#9d174d,#be185d)"
              : G.green;
            const avatarBg = isFemTeam ? "#fbcfe8" : G.lime;
            const avatarFg = isFemTeam ? "#9d174d" : G.green;
            return (
              <div style={{background:headerBg,borderRadius:16,padding:"20px",
                display:"flex",alignItems:"center",gap:16}}>
                {isFemTeam&&<span style={{position:"absolute",fontSize:16,
                  top:0,right:8,opacity:.3,pointerEvents:"none"}}>✨</span>}
                <div style={{width:60,height:60,borderRadius:"50%",
                  background:avatarBg,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:22,fontWeight:900,color:avatarFg,flexShrink:0}}>
                  {me.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,
                    fontSize:20,color:"#fff"}}>{me.name}</div>
                  <div style={{marginTop:4,display:"flex",gap:6,flexWrap:"wrap"}}>
                    <MemberRolePills member={me} teams={teams}/>
                    {getMemberRoleChips(me,teams).length===0&&<RolePill role={me.role||"member"}/>}
                    {myTeams.map(t=><TeamPill key={t} team={t} sm/>)}
                    {myTeams.length===0&&<TeamPill team="Unassigned" sm/>}
                    {myChildren.length > 0 && (
                      <span style={{background:"#dbeafe",color:"#1e40af",padding:"2px 8px",
                        borderRadius:12,fontSize:11,fontWeight:700}}>
                        👨‍👧 Parent of {myChildren.length}
                      </span>
                    )}
                  </div>
                </div>
                {/* Completion dial */}
                {!isComplete&&<ProfileDial pct={pct}/>}
                {isComplete&&(
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:28}}>✅</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:700,
                      letterSpacing:1,textTransform:"uppercase",marginTop:2}}>Complete</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Profile status card — only shown if incomplete or needs reconfirm */}
          {!isComplete&&(
            <div style={{
              background: isReconfirm ? "#fffbeb" : "#fef2f2",
              border: `1.5px solid ${isReconfirm ? "#fcd34d" : "#fca5a5"}`,
              borderRadius:12, padding:"14px 16px",
            }}>
              <div style={{fontWeight:800,fontSize:14,
                color: isReconfirm ? "#92400e" : "#991b1b", marginBottom:6}}>
                {isReconfirm ? "⏰ Please reconfirm your details" : "📋 Profile incomplete"}
              </div>
              <div style={{fontSize:13,color: isReconfirm ? "#b45309":"#b91c1c",
                lineHeight:1.5,marginBottom:12}}>
                {isReconfirm
                  ? `It's been over 6 months since you last confirmed your details (${confirmedAt?.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})||"never"}). Please check they're still correct and confirm below.`
                  : "Your profile is missing contact details. The club needs these to reach you about training, matches and important updates."}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {icon:"📧", label:"Email", val:me.email, field:"email"},
                  {icon:"📱", label:"Phone", val:me.phone, field:"phone"},
                ].map(f=>(
                  <div key={f.field} style={{display:"flex",alignItems:"center",gap:8,
                    background:"rgba(255,255,255,.6)",borderRadius:8,padding:"8px 10px"}}>
                    <span style={{fontSize:16}}>{f.icon}</span>
                    <span style={{fontSize:13,color:G.text,flex:1}}>{f.label}</span>
                    <span style={{fontSize:12,fontWeight:800,
                      color: f.val ? "#16a34a" : "#dc2626"}}>
                      {f.val ? "✓ Set" : "✗ Missing"}
                    </span>
                  </div>
                ))}
              </div>
              {isReconfirm&&(
                <button type="button"
                  onClick={()=>{
                    const now = new Date().toISOString();
                    const updated = members.map(m=>m.id===currentUser.id
                      ? {...m, profileConfirmedAt:now} : m);
                    saveMembers(updated);
                    const fresh = updated.find(m=>m.id===currentUser.id);
                    setCurrentUser(fresh);
                    localStorage.setItem("fcc-current-user",JSON.stringify(fresh));
                    showToast("Details confirmed ✓");
                  }}
                  style={{marginTop:12,width:"100%",padding:"11px 0",borderRadius:10,
                    border:"none",background:"#f59e0b",color:"#fff",fontWeight:800,
                    fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                  ✓ Yes, my details are still correct
                </button>
              )}
            </div>
          )}

          {/* Contact details */}
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:14,padding:"18px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:14,color:G.text}}>Contact Details</div>
              {!profileEditing&&(
                <button type="button" onClick={()=>{
                  setProfileEmail(me.email||"");
                  setProfilePhone(me.phone||"");
                  setProfileEditing(true);
                }} style={{background:G.cream,border:`1px solid ${G.border}`,
                  borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",color:G.text}}>
                  ✏️ Edit
                </button>
              )}
            </div>
            {profileEditing ? (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <FFld G={G} label="Email address">
                  <input type="email" placeholder="your@email.com"
                    style={iSt({padding:"9px 12px",fontSize:14})}
                    value={profileEmail}
                    onChange={e=>setProfileEmail(e.target.value)}/>
                </FFld>
                <FFld G={G} label="Phone / Mobile">
                  <input type="tel" placeholder="+45 12 34 56 78"
                    style={iSt({padding:"9px 12px",fontSize:14})}
                    value={profilePhone}
                    onChange={e=>setProfilePhone(e.target.value)}/>
                </FFld>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <Btn bg={G.green} col={G.lime} full onClick={()=>{
                    // Save + auto-confirm if both fields now filled
                    const emailOk = profileEmail.trim().length > 0;
                    const phoneOk = profilePhone.trim().length > 0;
                    const now = new Date().toISOString();
                    const updated = members.map(m => m.id===currentUser.id
                      ? {...m,
                          email: profileEmail.trim(),
                          phone: profilePhone.trim(),
                          profileConfirmedAt: (emailOk&&phoneOk) ? now : (m.profileConfirmedAt||null),
                        } : m);
                    saveMembers(updated);
                    const fresh = updated.find(m=>m.id===currentUser.id);
                    setCurrentUser(fresh);
                    localStorage.setItem("fcc-current-user",JSON.stringify(fresh));
                    setProfileEditing(false);
                    showToast(emailOk&&phoneOk ? "Profile complete ✓" : "Saved ✓");
                  }}>Save</Btn>
                  <Btn bg={G.cream} col={G.muted} onClick={()=>setProfileEditing(false)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>📧</span>
                  <div>
                    <div style={{fontSize:11,color:G.muted,fontWeight:700,
                      textTransform:"uppercase",letterSpacing:1}}>Email</div>
                    <div style={{fontSize:14,color:me.email?G.text:G.muted,fontWeight:600}}>
                      {me.email||"Not set yet"}
                    </div>
                  </div>
                </div>
                <div style={{height:1,background:G.border}}/>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>📱</span>
                  <div>
                    <div style={{fontSize:11,color:G.muted,fontWeight:700,
                      textTransform:"uppercase",letterSpacing:1}}>Phone</div>
                    <div style={{fontSize:14,color:me.phone?G.text:G.muted,fontWeight:600}}>
                      {me.phone||"Not set yet"}
                    </div>
                  </div>
                </div>
                {/* Last confirmed date */}
                {me.profileConfirmedAt&&(
                  <div style={{fontSize:11,color:G.muted,marginTop:4,fontStyle:"italic"}}>
                    Last confirmed: {new Date(me.profileConfirmedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                    {" · "}Next check-in: {new Date(new Date(me.profileConfirmedAt).getTime()+6*30*24*60*60*1000).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Player attributes (batting/bowling hand) */}
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:14,padding:"18px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:14,color:G.text}}>🏏 Player Attributes</div>
              {!profileAttrsEditing&&(
                <button type="button" onClick={()=>{
                  setProfileAttrsDraft({
                    battingHand: me.battingHand||"right",
                    bowlingHand: me.bowlingHand||"right",
                    bowlingStyle: me.bowlingStyle||"",
                  });
                  setProfileAttrsEditing(true);
                }} style={{background:G.cream,border:`1px solid ${G.border}`,
                  borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",color:G.text}}>
                  ✏️ Edit
                </button>
              )}
            </div>
            {profileAttrsEditing ? (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,
                    textTransform:"uppercase",letterSpacing:1}}>Batting Hand</div>
                  <div style={{display:"flex",gap:8}}>
                    {["right","left"].map(h=>(
                      <button key={h}
                        onClick={()=>setProfileAttrsDraft(d=>({...d,battingHand:h}))}
                        style={{
                          flex:1,padding:"10px",fontSize:13,fontWeight:600,
                          background:profileAttrsDraft.battingHand===h?G.green:G.cream,
                          color:profileAttrsDraft.battingHand===h?G.lime:G.text,
                          border:`1.5px solid ${profileAttrsDraft.battingHand===h?G.green:G.border}`,
                          borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                        }}>
                        {h==="right"?"Right-handed":"Left-handed"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,
                    textTransform:"uppercase",letterSpacing:1}}>Bowling Arm</div>
                  <div style={{display:"flex",gap:8}}>
                    {["right","left"].map(h=>(
                      <button key={h}
                        onClick={()=>setProfileAttrsDraft(d=>({...d,bowlingHand:h}))}
                        style={{
                          flex:1,padding:"10px",fontSize:13,fontWeight:600,
                          background:profileAttrsDraft.bowlingHand===h?G.green:G.cream,
                          color:profileAttrsDraft.bowlingHand===h?G.lime:G.text,
                          border:`1.5px solid ${profileAttrsDraft.bowlingHand===h?G.green:G.border}`,
                          borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                        }}>
                        {h==="right"?"Right-arm":"Left-arm"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,
                    textTransform:"uppercase",letterSpacing:1}}>Bowling Style (optional)</div>
                  <select
                    value={profileAttrsDraft.bowlingStyle}
                    onChange={e=>setProfileAttrsDraft(d=>({...d,bowlingStyle:e.target.value}))}
                    style={iSt({padding:"10px 12px",fontSize:13})}>
                    <option value="">Not specified</option>
                    <option value="Fast">Fast</option>
                    <option value="Medium">Medium</option>
                    <option value="Spin">Spin</option>
                    <option value="Off-spin">Off-spin</option>
                    <option value="Leg-spin">Leg-spin</option>
                  </select>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <Btn bg={G.green} col={G.lime} full onClick={()=>{
                    const updated = members.map(m => m.id===currentUser.id
                      ? {...m,
                          battingHand: profileAttrsDraft.battingHand,
                          bowlingHand: profileAttrsDraft.bowlingHand,
                          bowlingStyle: profileAttrsDraft.bowlingStyle,
                        } : m);
                    saveMembers(updated);
                    const fresh = updated.find(m=>m.id===currentUser.id);
                    setCurrentUser(fresh);
                    localStorage.setItem("fcc-current-user",JSON.stringify(fresh));
                    setProfileAttrsEditing(false);
                    showToast("Attributes saved ✓");
                  }}>Save</Btn>
                  <Btn bg={G.cream} col={G.muted} onClick={()=>setProfileAttrsEditing(false)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,
                  background:G.cream,border:`1px solid ${G.border}`,
                  borderRadius:8,padding:"10px 14px",flex:1,minWidth:120}}>
                  <span style={{fontSize:18}}>🏏</span>
                  <div>
                    <div style={{fontSize:9,color:G.muted,fontWeight:700,textTransform:"uppercase"}}>Batting</div>
                    <div style={{fontSize:13,fontWeight:700,color:G.text}}>
                      {me.battingHand==="left"?"Left-handed":"Right-handed"}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,
                  background:G.cream,border:`1px solid ${G.border}`,
                  borderRadius:8,padding:"10px 14px",flex:1,minWidth:120}}>
                  <span style={{fontSize:18}}>⚾</span>
                  <div>
                    <div style={{fontSize:9,color:G.muted,fontWeight:700,textTransform:"uppercase"}}>Bowling</div>
                    <div style={{fontSize:13,fontWeight:700,color:G.text}}>
                      {me.bowlingHand==="left"?"Left-arm":"Right-arm"}
                      {me.bowlingStyle&&` ${me.bowlingStyle}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Change PIN */}
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:14,padding:"18px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:changingPin?14:0}}>
              <div style={{fontWeight:800,fontSize:14,color:G.text}}>🔐 Change PIN</div>
              {!changingPin&&(
                <button type="button"
                  onClick={()=>{setChangingPin(true);setPinMsg("");}}
                  style={{background:G.cream,border:`1px solid ${G.border}`,
                    borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",color:G.text}}>
                  Change
                </button>
              )}
            </div>
            {changingPin&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <FFld G={G} label="Current PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({padding:"9px 12px",fontSize:18,
                    letterSpacing:6,textAlign:"center"})}
                    value={oldPin} onChange={e=>setOldPin(e.target.value.replace(/\D/g,""))}/>
                </FFld>
                <FFld G={G} label="New PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({padding:"9px 12px",fontSize:18,
                    letterSpacing:6,textAlign:"center"})}
                    value={newPin1} onChange={e=>setNewPin1(e.target.value.replace(/\D/g,""))}/>
                </FFld>
                <FFld G={G} label="Confirm new PIN">
                  <input type="password" inputMode="numeric" maxLength={4}
                    placeholder="••••" style={iSt({padding:"9px 12px",fontSize:18,
                    letterSpacing:6,textAlign:"center"})}
                    value={newPin2} onChange={e=>setNewPin2(e.target.value.replace(/\D/g,""))}/>
                </FFld>
                {pinMsg&&<div style={{color:"#dc2626",fontSize:13,fontWeight:700}}>{pinMsg}</div>}
                <div style={{display:"flex",gap:8}}>
                  <Btn bg={G.green} col={G.lime} full onClick={handleChangePin}>Update PIN</Btn>
                  <Btn bg={G.cream} col={G.muted} onClick={()=>{
                    setChangingPin(false);setOldPin("");setNewPin1("");setNewPin2("");setPinMsg("");
                  }}>Cancel</Btn>
                </div>
              </div>
            )}
          </div>

          {/* ── My Availability ───────────────────────────────── */}
          {(()=>{
            const myAbsences = (me.absences||[]).sort((a,b)=>a.from.localeCompare(b.from));
            const ABS_CATS = ["Holiday","Work","Injury","Other"];
            const catColour = {Holiday:"#1e40af",Work:"#92400e",Injury:"#dc2626",Other:"#374151"};
            const catBg     = {Holiday:"#eff6ff",Work:"#fffbeb",Injury:"#fef2f2",Other:"#f3f4f6"};
            const catBord   = {Holiday:"#bfdbfe",Work:"#fde68a",Injury:"#fca5a5",Other:"#e5e7eb"};

            function saveAbsences(newList) {
              const updated = members.map(m=>m.id===me.id?{...m,absences:newList}:m);
              saveMembers(updated);
            }

            function addAbsence() {
              if(!absFrom||!absTo) { showToast("Please pick start and end dates"); return; }
              if(absTo<absFrom) { showToast("End date must be on or after start date"); return; }
              // Find conflicting sessions
              const conflicts = sessions.filter(s=>
                s.players.includes(me.name) &&
                s.date>=absFrom && s.date<=absTo
              );
              if(conflicts.length>0) {
                setAbsConflicts({from:absFrom,to:absTo,cat:absCat,note:absNote,sessions:conflicts});
                return; // show nudge
              }
              commitAbsence(absFrom,absTo,absCat,absNote,[]);
            }

            function commitAbsence(from,to,cat,note,sessionsToRemove) {
              const newAbs = {id:uid(),from,to,category:cat,note:note.trim()};
              saveAbsences([...myAbsences,newAbs]);
              if(sessionsToRemove.length>0) {
                const updated=sessions.map(s=>sessionsToRemove.find(c=>c.id===s.id)
                  ? {...s,players:s.players.filter(p=>p!==me.name)} : s);
                saveSessions(updated);
              }
              setAbsFrom(""); setAbsTo(""); setAbsCat("Holiday"); setAbsNote("");
              setAbsConflicts(null);
              showToast(`Away period saved ✓${sessionsToRemove.length>0?" · removed from "+sessionsToRemove.length+" session"+( sessionsToRemove.length>1?"s":""):""}`);
            }

            return (
              <div style={{background:G.white,border:`1.5px solid ${G.border}`,
                borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontWeight:900,fontSize:14,color:G.text,marginBottom:12,
                  display:"flex",alignItems:"center",gap:8}}>
                  ✈️ My Availability
                </div>

                {/* Conflict nudge */}
                {absConflicts&&(
                  <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",
                    borderRadius:10,padding:"12px 14px",marginBottom:14}}>
                    <div style={{fontWeight:800,fontSize:13,color:"#92400e",marginBottom:6}}>
                      ⚠️ You're signed up for {absConflicts.sessions.length} session{absConflicts.sessions.length>1?"s":""} during this period
                    </div>
                    <div style={{fontSize:12,color:"#78350f",marginBottom:10,lineHeight:1.6}}>
                      {absConflicts.sessions.map(s=>`${fmtShort(s.date)} ${s.from}–${s.to}${s.label?" · "+s.label:""}`).join("\n")}
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <button onClick={()=>commitAbsence(absConflicts.from,absConflicts.to,absConflicts.cat,absConflicts.note,absConflicts.sessions)}
                        style={{flex:1,background:"#92400e",color:"#fff",border:"none",
                          borderRadius:9,padding:"9px 0",fontFamily:"inherit",fontWeight:800,
                          fontSize:12,cursor:"pointer"}}>
                        Save &amp; remove me from those sessions
                      </button>
                      <button onClick={()=>commitAbsence(absConflicts.from,absConflicts.to,absConflicts.cat,absConflicts.note,[])}
                        style={{flex:1,background:G.cream,color:G.muted,border:`1px solid ${G.border}`,
                          borderRadius:9,padding:"9px 0",fontFamily:"inherit",fontWeight:700,
                          fontSize:12,cursor:"pointer"}}>
                        Save &amp; keep me in sessions
                      </button>
                    </div>
                    <button onClick={()=>setAbsConflicts(null)}
                      style={{width:"100%",marginTop:8,background:"none",border:"none",
                        fontSize:12,color:G.muted,cursor:"pointer",fontFamily:"inherit"}}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Existing absences */}
                {myAbsences.length>0&&(
                  <div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:6}}>
                    {myAbsences.map(a=>(
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,
                        padding:"9px 12px",borderRadius:9,
                        background:catBg[a.category]||"#f3f4f6",
                        border:`1px solid ${catBord[a.category]||"#e5e7eb"}`}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,
                            color:catColour[a.category]||G.text}}>
                            {a.category}
                            {a.from===a.to
                              ? ` · ${fmtShort(a.from)}`
                              : ` · ${fmtShort(a.from)} – ${fmtShort(a.to)}`}
                          </div>
                          {a.note&&<div style={{fontSize:11,color:G.muted,marginTop:2}}>
                            {a.note}
                            <span style={{fontStyle:"italic",opacity:.7}}> (note visible to admins only)</span>
                          </div>}
                        </div>
                        <button onClick={()=>saveAbsences(myAbsences.filter(x=>x.id!==a.id))}
                          style={{background:"none",border:"none",color:G.red,
                            fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new absence */}
                {!absConflicts&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{display:"flex",gap:8}}>
                      <div style={{flex:1}}>
                        <label style={{fontSize:10,fontWeight:700,color:G.muted,
                          display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>
                          From
                        </label>
                        <input type="date" value={absFrom}
                          onChange={e=>{ setAbsFrom(e.target.value); if(!absTo||absTo<e.target.value) setAbsTo(e.target.value); }}
                          min={todayStr()}
                          style={iSt({fontSize:13,padding:"8px 10px",borderRadius:8})}/>
                      </div>
                      <div style={{flex:1}}>
                        <label style={{fontSize:10,fontWeight:700,color:G.muted,
                          display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>
                          To
                        </label>
                        <input type="date" value={absTo}
                          onChange={e=>setAbsTo(e.target.value)}
                          min={absFrom||todayStr()}
                          style={iSt({fontSize:13,padding:"8px 10px",borderRadius:8})}/>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {ABS_CATS.map(c=>(
                        <button key={c} onClick={()=>setAbsCat(c)}
                          style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${absCat===c?catBord[c]||G.green:"rgba(0,0,0,.1)"}`,
                            background:absCat===c?(catBg[c]||G.cream):"transparent",
                            color:absCat===c?(catColour[c]||G.green):G.muted,
                            fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          {c}
                        </button>
                      ))}
                    </div>
                    {absCat==="Other"&&(
                      <input value={absNote} onChange={e=>setAbsNote(e.target.value)}
                        placeholder="Brief reason (visible to admins only)…"
                        style={iSt({fontSize:13,padding:"8px 10px",borderRadius:8})}/>
                    )}
                    <button onClick={addAbsence}
                      disabled={!absFrom||!absTo}
                      style={{background:absFrom&&absTo?G.green:"rgba(0,0,0,.1)",
                        color:absFrom&&absTo?G.lime:G.muted,border:"none",borderRadius:9,
                        padding:"10px 0",fontFamily:"inherit",fontWeight:800,fontSize:13,
                        cursor:absFrom&&absTo?"pointer":"default",width:"100%"}}>
                      + Mark as away
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Notifications ─────────────────────────────────── */}
          <div style={{background:G.white,border:`1.5px solid ${G.border}`,
            borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontWeight:900,fontSize:14,color:G.text,marginBottom:12}}>
              🔔 Notifications
            </div>
            {!me.email&&(
              <div style={{fontSize:12,color:G.muted,marginBottom:10,lineHeight:1.5,
                background:G.cream,borderRadius:8,padding:"8px 10px",
                border:`1px solid ${G.border}`}}>
                ℹ️ Add your email address to receive booking confirmations.
              </div>
            )}
            <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
              <div style={{paddingTop:1}}>
                <button onClick={()=>{
                    const updated=members.map(m=>m.id===me.id
                      ?{...m,emailBookingConfirm:!(me.emailBookingConfirm??true)}:m);
                    saveMembers(updated);
                    showToast((me.emailBookingConfirm??true)
                      ?"Booking confirmations off":"Booking confirmations on ✓");
                  }}
                  style={{width:44,height:24,borderRadius:20,border:"none",cursor:"pointer",
                    background:(me.emailBookingConfirm??true)&&me.email?G.green:"#d1d5db",
                    transition:"background .2s",position:"relative",flexShrink:0,
                    display:"block"}}>
                  <span style={{position:"absolute",top:2,
                    left:(me.emailBookingConfirm??true)&&me.email?22:2,
                    width:20,height:20,borderRadius:"50%",background:"#fff",
                    transition:"left .2s",display:"block"}}/>
                </button>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:G.text}}>
                  Booking confirmation emails
                </div>
                <div style={{fontSize:11,color:G.muted,marginTop:2,lineHeight:1.5}}>
                  Receive an email each time you join or book a session.
                  {me.email
                    ? ` Sent to ${maskEmail(me.email)}.`
                    : " No email on file — add one in your profile."}
                </div>
              </div>
            </label>

            <div style={{height:1,background:G.border,margin:"10px 0"}}/>

            <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
              <div style={{paddingTop:1}}>
                <button onClick={()=>{
                    const updated=members.map(m=>m.id===me.id
                      ?{...m,emailDayBeforeReminder:!(me.emailDayBeforeReminder??true)}:m);
                    saveMembers(updated);
                    showToast((me.emailDayBeforeReminder??true)
                      ?"Day-before reminders off":"Day-before reminders on ✓");
                  }}
                  style={{width:44,height:24,borderRadius:20,border:"none",cursor:"pointer",
                    background:(me.emailDayBeforeReminder??true)&&me.email?G.green:"#d1d5db",
                    transition:"background .2s",position:"relative",flexShrink:0,
                    display:"block"}}>
                  <span style={{position:"absolute",top:2,
                    left:(me.emailDayBeforeReminder??true)&&me.email?22:2,
                    width:20,height:20,borderRadius:"50%",background:"#fff",
                    transition:"left .2s",display:"block"}}/>
                </button>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:G.text}}>
                  Day-before reminders
                </div>
                <div style={{fontSize:11,color:G.muted,marginTop:2,lineHeight:1.5}}>
                  Get an email at 5pm the evening before any session you're booked into.
                  Helps you not forget and plan transport in time.
                </div>
              </div>
            </label>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* MY UPCOMING MATCHES — only for players with teams */}
          {/* ══════════════════════════════════════════════════════════ */}
          {myTeams.length > 0 && (()=>{
            const today = new Date().toISOString().slice(0, 10);
            // Map team names to fixture divisions - flexible matching
            const getMyDivisions = (teams) => {
              const divs = [];
              teams.forEach(t => {
                const tl = t.toLowerCase();
                if(tl.includes("div 2") || tl === "div 2") divs.push("Div 2");
                if(tl.includes("div 3") || tl === "div 3") divs.push("Div 3");
                if(tl.includes("div 4") || tl === "div 4") divs.push("Div 4");
                if(tl.includes("t20") && tl.includes("4")) divs.push("T20 Serie 4");
                if(tl.includes("t20") && tl.includes("5")) divs.push("T20 Serie 5");
                if(tl.includes("women") || tl.includes("kvinde")) divs.push("Women's");
                // Legends team plays in OB division
                if(tl === "ob" || tl.includes("oldboy") || tl.includes("legend")) divs.push("OB");
                // Junior teams
                if(tl.includes("u11")) divs.push("U11");
                if(tl.includes("u13")) divs.push("U13");
                if(tl.includes("u15")) divs.push("U15");
                if(tl.includes("u16")) divs.push("U16");
                if(tl.includes("u18") || tl.includes("u19")) divs.push("U18");
              });
              return [...new Set(divs)];
            };
            const myDivisions = getMyDivisions(myTeams);
            
            // Check if user can access full availability view
            const canAccessAvailability = can(userRole, "accessMembers") || 
              isCoachMember(currentUser?.name, teams) ||
              teams.some(t => (t.captain === me.name || t.viceCaptain === me.name));
            
            const allMyMatches = ALL_FIXTURES
              .filter(f => f.date >= today && myDivisions.includes(f.division))
              .sort((a, b) => a.date.localeCompare(b.date));
            
            const myMatches = showAllMatches ? allMyMatches : allMyMatches.slice(0, 6);
            
            if(allMyMatches.length === 0) return null;
            
            return (
              <div style={{background: G.white, border: `1.5px solid ${G.border}`,
                borderRadius: 14, padding: "18px 16px", overflow: "hidden"}}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 14}}>
                  <div style={{display: "flex", alignItems: "center", gap: 8}}>
                    <span style={{fontSize: 16}}>🏏</span>
                    <span style={{fontWeight: 800, fontSize: 14, color: G.text}}>My Upcoming Matches</span>
                  </div>
                  <span style={{fontSize: 12, color: G.muted}}>{allMyMatches.length} match{allMyMatches.length !== 1 ? "es" : ""}</span>
                </div>
                
                <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                  {myMatches.map((f, i) => {
                    const tc = getTeamCardColors(f.division);
                    return (
                      <div key={i} style={{
                        background: G.white,
                        borderRadius: 10,
                        borderLeft: `4px solid ${tc.border}`,
                        border: `0.5px solid ${G.border}`,
                        borderLeftWidth: 4,
                        borderLeftColor: tc.border,
                        overflow: "hidden",
                      }}>
                        <div style={{height: 3, background: tc.border}}/>
                        <div style={{padding: "10px 12px"}}>
                          <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap"}}>
                            <span style={{fontSize: 13, fontWeight: 500, color: G.text}}>
                              {fmtShort(f.date)}
                            </span>
                            <span style={{
                              background: tc.badgeBg, color: tc.badgeText,
                              padding: "1px 8px", borderRadius: 12,
                              fontSize: 9, fontWeight: 700,
                            }}>{f.division === "OB" ? "OB - Legends" : f.division}</span>
                          </div>
                          <div style={{fontSize: 14, fontWeight: 500, color: G.text, marginBottom: 2}}>
                            {f.label.replace(/^(Div \d|Women's|OB|T20 Serie \d) (vs |@ )/i, "")}
                          </div>
                          <div style={{fontSize: 11, color: G.muted}}>
                            {f.home ? "Home" : "Away"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Stats row */}
                <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14}}>
                  <div style={{background: G.cream, borderRadius: 8, padding: "10px", textAlign: "center"}}>
                    <div style={{fontSize: 18, fontWeight: 500, color: G.text}}>
                      {allMyMatches.length}
                    </div>
                    <div style={{fontSize: 9, color: G.muted, textTransform: "uppercase"}}>Total remaining</div>
                  </div>
                  <div style={{background: G.cream, borderRadius: 8, padding: "10px", textAlign: "center"}}>
                    <div style={{fontSize: 18, fontWeight: 500, color: G.text}}>
                      {allMyMatches.filter(f => f.home).length}
                    </div>
                    <div style={{fontSize: 9, color: G.muted, textTransform: "uppercase"}}>Home</div>
                  </div>
                  <div style={{background: G.cream, borderRadius: 8, padding: "10px", textAlign: "center"}}>
                    <div style={{fontSize: 18, fontWeight: 500, color: G.text}}>
                      {allMyMatches.filter(f => !f.home).length}
                    </div>
                    <div style={{fontSize: 9, color: G.muted, textTransform: "uppercase"}}>Away</div>
                  </div>
                </div>
                
                {/* Show more/less or link to availability */}
                {allMyMatches.length > 6 && (
                  <button onClick={() => canAccessAvailability ? setView("availability") : setShowAllMatches(v => !v)}
                    style={{width: "100%", marginTop: 12, padding: "10px",
                      background: G.cream, border: `1.5px solid ${G.border}`,
                      borderRadius: 8, fontSize: 12, fontWeight: 600,
                      color: G.text, cursor: "pointer", fontFamily: "inherit"}}>
                    {canAccessAvailability 
                      ? "View full season fixtures →"
                      : showAllMatches 
                        ? "▲ Show less" 
                        : `▼ Show all ${allMyMatches.length} matches`}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Theme switcher */}
          <div style={{background:G.white,borderRadius:14,border:`1.5px solid ${G.border}`,
            padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:G.muted,
              textTransform:"uppercase",marginBottom:12}}>App Theme</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {THEME_KEYS.map(key=>{
                const t=THEMES[key];
                const active=themeKey===key;
                return (
                  <button key={key} onClick={()=>applyTheme(key)}
                    style={{display:"flex",alignItems:"center",gap:12,
                      background:active?t.headerBg:"transparent",
                      border:`2px solid ${active?t.headerBg:G.border}`,
                      borderRadius:10,padding:"10px 14px",cursor:"pointer",
                      fontFamily:"inherit",transition:"all .15s"}}>
                    <span style={{fontSize:20}}>{t.emoji}</span>
                    <span style={{fontSize:14,fontWeight:700,
                      color:active?"#fff":G.text,flex:1,textAlign:"left"}}>
                      {t.label}
                    </span>
                    {active&&<span style={{fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:700}}>
                      Active ✓
                    </span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Help & Contact */}
          <button type="button" onClick={()=>setView("help")}
            style={{background:G.white,border:`1.5px solid ${G.border}`,
              borderRadius:12,padding:"13px 16px",fontFamily:"inherit",
              fontWeight:700,fontSize:14,color:G.text,cursor:"pointer",
              width:"100%",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
            <span style={{fontSize:20}}>💬</span>
            <span style={{flex:1}}>Help &amp; Contact Admin</span>
            <span style={{color:G.muted,fontSize:16}}>›</span>
          </button>

          {/* Privacy & Data */}
          <button type="button" onClick={()=>setView("privacy")}
            style={{background:G.white,border:`1.5px solid ${G.border}`,
              borderRadius:12,padding:"13px 16px",fontFamily:"inherit",
              fontWeight:700,fontSize:14,color:G.text,cursor:"pointer",
              width:"100%",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
            <span style={{fontSize:20}}>🔐</span>
            <span style={{flex:1}}>Privacy &amp; Your Data</span>
            <span style={{color:G.muted,fontSize:16}}>›</span>
          </button>
          </>)}

          {/* Sign out - always visible regardless of tab */}
          <button type="button" onClick={handleLogout}
            style={{background:"none",border:`1.5px solid ${G.border}`,
              borderRadius:12,padding:"13px",fontFamily:"inherit",
              fontWeight:800,fontSize:14,color:G.muted,cursor:"pointer",
              width:"100%"}}>
            Sign out
          </button>

        </div>
        <BotNav view="profile" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
        {toast&&<Toast msg={toast} G={G}/>}
      </Shell>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Help & Contact
  // ════════════════════════════════════════════════════════════
  if(view==="help") return <HelpView />;

  // ── WEATHER ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // RENDER: Privacy & Data
  // ════════════════════════════════════════════════════════════
  if(view==="privacy") return <PrivacyView />;

  // ════════════════════════════════════════════════════════════
  // RENDER: Captain's Playing XI
  // ════════════════════════════════════════════════════════════
  if(view==="captainxi") {
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

  // ════════════════════════════════════════════════════════════
  // RENDER: Team Availability
  // ════════════════════════════════════════════════════════════
  if(view==="availability") return <AvailabilityView />;
  if(view==="weather") return <WeatherView />;

  if(view==="admin"&&can(userRole,"accessMembers")) {
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
    // Members in SEED list but missing from live Firebase data (excluding dismissed)
    const existingNames = new Set(members.map(m=>m.name.toLowerCase()));
    const dismissedSet = new Set(dismissedMissing.map(n=>n.toLowerCase()));
    const membersToImport = userRole==="superadmin"
      ? SEED_MEMBERS.filter(m=>
          !existingNames.has(m.name.toLowerCase()) &&
          !dismissedSet.has(m.name.toLowerCase())
        )
      : [];
    function dismissMissingMember(name) {
      const updated=[...dismissedMissing, name];
      setDismissedMissing(updated);
      try{ localStorage.setItem("fcc-dismissed-missing",JSON.stringify(updated)); }catch{}
    }
    function dismissAllMissing() {
      const updated=[...dismissedMissing,...membersToImport.map(m=>m.name)];
      setDismissedMissing(updated);
      try{ localStorage.setItem("fcc-dismissed-missing",JSON.stringify(updated)); }catch{}
    }
    function importMissingMembers() {
      const toAdd = membersToImport.map(m=>normMember({
        ...m,
        id: uid(), // give fresh IDs to avoid collisions
        email: EMAIL_SEED[m.name] || null,
      }));
      saveMembers([...members, ...toAdd]);
      logAction("system", `Imported ${toAdd.length} missing member${toAdd.length>1?"s":""}: ${toAdd.map(m=>m.name).join(", ")}`);
      showToast(`${toAdd.length} member${toAdd.length>1?"s":""} added ✓`);
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

      {/* ── Admin section index ─────────────────────────────── */}
      <div style={{padding:"10px 16px 12px",borderBottom:`1px solid ${G.border}`,
        background:G.cream}}>
        <div style={{fontSize:10,fontWeight:900,letterSpacing:1.5,color:G.muted,
          textTransform:"uppercase",marginBottom:8}}>
          Jump to section
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {label:"👥 Members",    id:"sec-members",    key:"members"},
            {label:"➕ Add Member", id:"sec-add-member", key:"addmember"},
            {label:"🏏 Groups",     id:"sec-groups",     key:"groups"},
            {label:"🧢 Coaches & Captains", id:"sec-coaches", key:"coaches"},
            {label:"🚫 Block Nets", id:"sec-blocknets",  key:"blocknets"},
            {label:"🔁 Recurring",  id:"sec-recurring",  key:"recurring"},
            {label:"👑 Audit Log",  id:"sec-auditlog",   key:"auditlog"},
            {label:"📧 Reminder Logs", id:"sec-reminderlogs", key:"reminderlogs"},
          ].map(({label,id,key})=>(
            <button key={id}
              onClick={()=>{
                // Open the section then scroll to it
                setAdminSec(s=>({...s,[key]:true}));
                setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}),50);
              }}
              style={{padding:"5px 12px",borderRadius:20,
                border:`1px solid ${adminSec[key]?G.green:G.border}`,
                background:adminSec[key]?`${G.green}12`:G.white,
                color:adminSec[key]?G.green:G.text,
                fontSize:11,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .13s"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 16px 20px"}}>

        {/* ── Members section ─────────────────────────────────── */}
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
        <div id="sec-members"/>
        {can(userRole,"addMember")&&joinRequests.filter(r=>r.status==="pending").length>0&&(()=>{
          const pending = joinRequests.filter(r=>r.status==="pending");
          function approveRequest(req) {
            const playerTeam = req.playerTeam && req.playerTeam !== "I don't play / I'm a parent"
              ? req.playerTeam : null;
            const newMember = normMember({
              id: uid(),
              name: req.playerName,
              team: playerTeam,
              teams: playerTeam ? [playerTeam] : [],
              role: "member",
              email: req.email||null,
              phone: req.contact||null,
              emailVerified: req.emailVerified||false,
              consentGiven: req.consentGiven||false,
              consentDate: req.consentDate||null,
              note: req.parentName
                ? `Parent: ${req.parentName}${req.contact ? " · " + req.contact : ""}`
                : req.contact || null,
            });
            saveMembers([...members, newMember]);
            // Auto-generate invite code if email was verified
            if(req.emailVerified && newMember.id) {
              setTimeout(()=>generateInviteCode(newMember.id),500);
            }
            saveJoinRequests(joinRequests.map(r=>r.id===req.id ? {...r,status:"approved"} : r));
            logAction("request", `Approved join request: ${req.playerName}${req.playerTeam?" → "+req.playerTeam:""}${req.forChild&&req.parentName?" (parent: "+req.parentName+")":""}`);
            // Notify the member by email if we have their address
            if(req.email) {
              fetch("/api/notify", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body: JSON.stringify({
                  type: "approved",
                  data: { name: req.playerName, email: req.email, playerTeam },
                }),
              }).catch(()=>{});
            }
            showToast(`${req.playerName} added ✓`);
          }
          function declineRequest(req) {
            saveJoinRequests(joinRequests.map(r=>r.id===req.id ? {...r,status:"declined"} : r));
            logAction("request", `Declined join request: ${req.playerName}`);
            // Notify the member by email if we have their address
            if(req.email) {
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

              {pending.map(req=>(
                <div key={req.id} style={{background:"#fff7ed",border:"1.5px solid #fed7aa",
                  borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:3}}>
                        <span style={{fontWeight:800,fontSize:14,color:G.text}}>
                          {req.forChild ? "👶 " : "🙋 "}{req.playerName}
                        </span>
                        {req.emailVerified&&<span style={{fontSize:10,fontWeight:700,
                          padding:"1px 7px",borderRadius:20,background:"#dcfce7",
                          color:"#166534",border:"0.5px solid #86efac"}}>✅ email verified</span>}
                      </div>
                      <div style={{fontSize:11,color:G.muted,lineHeight:1.6}}>
                        {req.playerTeam ? `Team: ${req.playerTeam}` : "No team specified"}
                        {req.forChild && req.parentName && ` · Parent: ${req.parentName}`}
                        {req.email && ` · ${req.email}`}
                        {req.contact && ` · ${req.contact}`}
                        <br/>
                        <span style={{color:"#9ca3af",fontSize:10}}>
                          {new Date(req.submittedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,marginTop:10}}>
                    <button onClick={()=>approveRequest(req)}
                      style={{flex:1,background:"#16a34a",color:"#fff",border:"none",
                        borderRadius:9,padding:"9px 0",fontFamily:"inherit",
                        fontWeight:800,fontSize:12,cursor:"pointer"}}>
                      ✓ Approve &amp; Add
                    </button>
                    <button onClick={()=>declineRequest(req)}
                      style={{background:"#fee2e2",color:"#dc2626",border:"none",
                        borderRadius:9,padding:"9px 14px",fontFamily:"inherit",
                        fontWeight:800,fontSize:12,cursor:"pointer"}}>
                      ✗ Decline
                    </button>
                  </div>
                </div>
              ))}
            </>
          );
        })()}
        </>}

        {/* ── Add Member section ──────────────────────────────── */}
        {can(userRole,"addMember")&&<>
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
            💡 New members can also self-register via <b>"Join Fredensborg CC"</b> on the login screen. Use the form below for admin-initiated additions only.
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

        {/* ── Manage Groups ─────────────────────────────────── */}
        {can(userRole,"addMember")&&<>
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
        {can(userRole,"addMember")&&<>
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

        {/* ── Block Nets Sessions ────────────────────────────── */}
        {can(userRole,"addMember")&&<>
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
        {can(userRole,"addMember")&&<>
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

        {/* ── Missing Members (superadmin only) ────────────────── */}
        {membersToImport.length > 0 && (
          <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",
            borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              marginBottom:6}}>
              <div style={{fontWeight:900,fontSize:13,color:"#14532d"}}>
                👤 Members missing from app
              </div>
              <button onClick={dismissAllMissing}
                style={{background:"none",border:"1px solid #86efac",borderRadius:7,
                  padding:"3px 9px",fontSize:11,fontWeight:700,color:"#166534",
                  cursor:"pointer",fontFamily:"inherit"}}>
                Dismiss all
              </button>
            </div>
            <div style={{fontSize:12,color:"#166534",marginBottom:10,lineHeight:1.5}}>
              <b>{membersToImport.length}</b> member{membersToImport.length>1?"s":""} are in the master list but haven't been added to the app yet.
              Tap a name to dismiss it permanently if they've left the club.
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
              {membersToImport.map(m=>(
                <div key={m.name} style={{display:"flex",alignItems:"center",gap:0,
                  background:"#14532d",borderRadius:20,overflow:"hidden"}}>
                  <span style={{fontSize:11,color:"#4ade80",padding:"4px 10px",fontWeight:600}}>
                    {m.name}
                  </span>
                  <button onClick={()=>dismissMissingMember(m.name)}
                    title="Dismiss — this person has left the club"
                    style={{background:"rgba(255,255,255,.1)",border:"none",borderLeft:"1px solid rgba(255,255,255,.15)",
                      color:"#86efac",padding:"4px 8px",fontSize:12,fontWeight:900,
                      cursor:"pointer",fontFamily:"inherit",lineHeight:1}}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn bg="#14532d" col="#a3e635" onClick={importMissingMembers}>
                Add {membersToImport.length} Missing Member{membersToImport.length>1?"s":""}
              </Btn>
            </div>
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

        </>}

        {/* ── Data Backup & Export (superadmin only) ───────────────────── */}
        {userRole==="superadmin"&&<>
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
        {userRole==="superadmin"&&<>
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
        {userRole==="superadmin"&&<>
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
                  {reminderLogs.map((log, idx) => (
                    <div key={idx} style={{
                      padding:"14px 16px",
                      borderBottom: idx < reminderLogs.length - 1 ? "1px solid #2d4a6f" : "none",
                      background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.1)"
                    }}>
                      {/* Run timestamp + target date */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <div style={{color:"#fff",fontWeight:700,fontSize:13}}>
                            🗓️ For: {fmtShortDate(log.targetDate)}
                          </div>
                          <div style={{color:"#64748b",fontSize:10,marginTop:2}}>
                            Run at: {fmtTs(log.timestamp)}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{
                            background: log.playersSent > 0 ? "#166534" : "#374151",
                            color: log.playersSent > 0 ? "#86efac" : "#9ca3af",
                            padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700
                          }}>
                            {log.playersSent || 0} sent
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats row */}
                      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10}}>
                        <div style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 10px"}}>
                          <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.5}}>Sessions</div>
                          <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>{log.sessionsFound || 0}</div>
                        </div>
                        <div style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 10px"}}>
                          <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.5}}>Players</div>
                          <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>{log.totalPlayers || 0}</div>
                        </div>
                        <div style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 10px"}}>
                          <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.5}}>Skipped</div>
                          <div style={{fontSize:14,fontWeight:800,color:"#f59e0b"}}>{log.playersSkipped || 0}</div>
                        </div>
                        <div style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 10px"}}>
                          <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.5}}>Leaders</div>
                          <div style={{fontSize:14,fontWeight:800,color:"#60a5fa"}}>{log.leadersSent || 0}</div>
                        </div>
                      </div>
                      
                      {/* Sessions details */}
                      {log.sessionsDetails && log.sessionsDetails.length > 0 && (
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:10,color:"#94a3b8",marginBottom:4,fontWeight:700}}>Sessions:</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {log.sessionsDetails.map((s, i) => (
                              <span key={i} style={{
                                background:"#0c4a6e",color:"#7dd3fc",
                                padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:600
                              }}>
                                {s.label} ({s.playerCount})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Message if no sessions */}
                      {log.message && (
                        <div style={{color:"#94a3b8",fontSize:11,fontStyle:"italic"}}>
                          {log.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        </>}

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
          const flatList = members
            .filter(m=>{
              const q=!aSearch||m.name.toLowerCase().includes(aSearch.toLowerCase());
              const t=aFilter==="All"||(aFilter==="Unassigned"&&(m.teams||[]).length===0)||(m.teams||[]).includes(aFilter);
              return q&&t;
            })
            .sort((a,b)=>a.name.localeCompare(b.name));
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
                  <div key={m.id}>
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
                                {(m.children||[]).length > 0 && ` (${(m.children||[]).length} linked)`}
                              </span>
                              
                              {/* Link Child button - for adults (not in junior teams) */}
                              {!(m.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder")) && (
                                <button
                                  onClick={() => {
                                    // Find unlinked junior players
                                    const unlinkedJuniors = members.filter(c => 
                                      c.id !== m.id &&
                                      !c.parentId &&
                                      (c.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder"))
                                    );
                                    const childName = prompt(
                                      `Link a child to ${m.name}'s account.\n\nAvailable children:\n${unlinkedJuniors.slice(0,10).map(c=>c.name).join("\n")}${unlinkedJuniors.length>10?`\n...and ${unlinkedJuniors.length-10} more`:""}\n\nEnter child's name:`
                                    );
                                    if (!childName?.trim()) return;
                                    const child = members.find(c => 
                                      c.name.toLowerCase() === childName.trim().toLowerCase() &&
                                      (c.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder"))
                                    );
                                    if (!child) {
                                      showToast("Child not found in junior teams");
                                      return;
                                    }
                                    if (child.parentId) {
                                      showToast(`${child.name} is already linked to another parent`);
                                      return;
                                    }
                                    // Link them
                                    const updated = members.map(x => {
                                      if (x.id === m.id) {
                                        return { ...x, children: [...(x.children||[]), child.id], memberType: "parent" };
                                      }
                                      if (x.id === child.id) {
                                        return { ...x, parentId: m.id, parentName: m.name };
                                      }
                                      return x;
                                    });
                                    saveMembers(updated);
                                    setSelMember({...m, children: [...(m.children||[]), child.id], memberType: "parent"});
                                    logAction("member", `Linked child ${child.name} to parent ${m.name}`);
                                    showToast(`${child.name} linked to ${m.name} ✓`);
                                  }}
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
                                  onClick={() => {
                                    // Find potential parents (adults)
                                    const potentialParents = members.filter(p => 
                                      p.id !== m.id &&
                                      !(p.teams||[]).some(t => t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder"))
                                    );
                                    const parentName = prompt(
                                      `Link ${m.name} to a parent account.\n\nPotential parents:\n${potentialParents.slice(0,10).map(p=>p.name).join("\n")}${potentialParents.length>10?`\n...and ${potentialParents.length-10} more`:""}\n\nEnter parent's name:`
                                    );
                                    if (!parentName?.trim()) return;
                                    const parent = potentialParents.find(p => 
                                      p.name.toLowerCase() === parentName.trim().toLowerCase()
                                    );
                                    if (!parent) {
                                      showToast("Parent not found");
                                      return;
                                    }
                                    // Link them
                                    const updated = members.map(x => {
                                      if (x.id === parent.id) {
                                        return { ...x, children: [...(x.children||[]), m.id], memberType: "parent" };
                                      }
                                      if (x.id === m.id) {
                                        return { ...x, parentId: parent.id, parentName: parent.name };
                                      }
                                      return x;
                                    });
                                    saveMembers(updated);
                                    setSelMember({...m, parentId: parent.id, parentName: parent.name});
                                    logAction("member", `Linked child ${m.name} to parent ${parent.name}`);
                                    showToast(`${m.name} linked to ${parent.name} ✓`);
                                  }}
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
      </div>
      <BotNav view="admin" setView={setView} userRole={userRole} pendingCount={joinRequests.filter(r=>r.status==="pending").length} currentUser={currentUser} teams={teams} G={G}/>
      {toast&&<Toast msg={toast} G={G}/>}

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

  // Fallback
  return <Shell G={G}><div style={{padding:20,color:G.muted}}>Loading…</div></Shell>;
  }; // ── end renderApp (Pass 5) ─────────────────────────────────

  return (
    <AppContext.Provider value={contextValue}>
      {renderApp()}
    </AppContext.Provider>
  );
}
