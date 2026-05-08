// ─── Teams: default list, colour meta, card colour meta ───────

// Senior teams can have captains/vice captains; youth cannot
export const DEFAULT_TEAMS = [
  {id:"div2",   name:"Div 2",        senior:true,  coaches:[], captain:null, vicecaptain:null},
  {id:"div3",   name:"Div 3",        senior:true,  coaches:[], captain:null, vicecaptain:null},
  {id:"div4",   name:"Div 4",        senior:true,  coaches:[], captain:null, vicecaptain:null},
  {id:"t20s4",  name:"T20 Serie 4",  senior:true,  coaches:[], captain:null, vicecaptain:null},
  {id:"t20s5",  name:"T20 Serie 5",  senior:true,  coaches:[], captain:null, vicecaptain:null},
  {id:"womens", name:"Women's",      senior:true,  coaches:["Arun Krishnamurthy"], captain:null, vicecaptain:null},
  {id:"ob",     name:"OB",           senior:true,  coaches:[], captain:null, vicecaptain:null},
  {id:"u18",    name:"U18",          senior:false, coaches:[], captain:null, vicecaptain:null},
  {id:"u15",    name:"U15",          senior:false, coaches:["Zeb Pirzada"], captain:null, vicecaptain:null},
  {id:"u15g",   name:"U15 Girls",    senior:false, coaches:["Zeb Pirzada","Rajesh Muthukumar","Kuda"], captain:null, vicecaptain:null},
  {id:"u13",    name:"U13",          senior:false, coaches:["Zeb Pirzada"], captain:null, vicecaptain:null},
  {id:"u11",    name:"U11",          senior:false, coaches:["Reuben Dayal","Aniket Sharma","Nitin Gupta"], captain:null, vicecaptain:null},
];

export const TEAM_META = {
  "Div 2":       { bg:"#14532d", text:"#a3e635" },
  "Div 3":       { bg:"#1e3a5f", text:"#93c5fd" },
  "Div 4":       { bg:"#3b1f6e", text:"#c4b5fd" },
  "T20 Serie 4": { bg:"#7c1d1d", text:"#fca5a5" },
  "T20 Serie 5": { bg:"#78350f", text:"#fde68a" },
  "Women's":     { bg:"#9d174d", text:"#fce7f3", accent:"#fbcfe8", feminine:true },
  "OB":          { bg:"#1a3a2a", text:"#86efac" },
  "U18":         { bg:"#7c2d12", text:"#fed7aa" },
  "U15":         { bg:"#713f12", text:"#fde68a" },
  "U15 Girls":   { bg:"#be185d", text:"#fdf2f8", accent:"#fbcfe8", feminine:true },
  "U13":         { bg:"#0c4a6e", text:"#bae6fd" },
  "U11":         { bg:"#064e3b", text:"#6ee7b7" },
  "Unassigned":  { bg:"#374151", text:"#d1d5db" },
};

// Card accent colors for session cards (border, top bar, circle)
export const TEAM_CARD_COLORS = {
  "U11":         { border:"#f59e0b", bg:"#fef3c7", text:"#92400e", badgeBg:"#fef3c7", badgeText:"#92400e" },
  "U13":         { border:"#8b5cf6", bg:"#ede9fe", text:"#6d28d9", badgeBg:"#ede9fe", badgeText:"#6d28d9" },
  "U15":         { border:"#8b5cf6", bg:"#ede9fe", text:"#6d28d9", badgeBg:"#ede9fe", badgeText:"#6d28d9" },
  "U15 Girls":   { border:"#ec4899", bg:"#fce7f3", text:"#be185d", badgeBg:"#fce7f3", badgeText:"#be185d" },
  "U18":         { border:"#8b5cf6", bg:"#ede9fe", text:"#6d28d9", badgeBg:"#ede9fe", badgeText:"#6d28d9" },
  "Girls":       { border:"#ec4899", bg:"#fce7f3", text:"#be185d", badgeBg:"#fce7f3", badgeText:"#be185d" },
  "Kvinder":     { border:"#ec4899", bg:"#fce7f3", text:"#be185d", badgeBg:"#fce7f3", badgeText:"#be185d" },
  "Women's":     { border:"#ec4899", bg:"#fce7f3", text:"#be185d", badgeBg:"#fce7f3", badgeText:"#be185d" },
  "2. Division": { border:"#3b82f6", bg:"#dbeafe", text:"#1d4ed8", badgeBg:"#dbeafe", badgeText:"#1d4ed8" },
  "Div 2":       { border:"#3b82f6", bg:"#dbeafe", text:"#1d4ed8", badgeBg:"#dbeafe", badgeText:"#1d4ed8" },
  "3. Division": { border:"#0d9488", bg:"#ccfbf1", text:"#0f766e", badgeBg:"#ccfbf1", badgeText:"#0f766e" },
  "Div 3":       { border:"#0d9488", bg:"#ccfbf1", text:"#0f766e", badgeBg:"#ccfbf1", badgeText:"#0f766e" },
  "4. Division": { border:"#f97316", bg:"#ffedd5", text:"#c2410c", badgeBg:"#ffedd5", badgeText:"#c2410c" },
  "Div 4":       { border:"#f97316", bg:"#ffedd5", text:"#c2410c", badgeBg:"#ffedd5", badgeText:"#c2410c" },
  "T20 Serie 4": { border:"#3b82f6", bg:"#dbeafe", text:"#1d4ed8", badgeBg:"#dbeafe", badgeText:"#1d4ed8" },
  "T20 Serie 5": { border:"#0d9488", bg:"#ccfbf1", text:"#0f766e", badgeBg:"#ccfbf1", badgeText:"#0f766e" },
  "OB":          { border:"#1e3a5f", bg:"#e0e7ff", text:"#1e3a5f", badgeBg:"#e0e7ff", badgeText:"#1e3a5f" },
  "Legends":     { border:"#1e3a5f", bg:"#e0e7ff", text:"#1e3a5f", badgeBg:"#e0e7ff", badgeText:"#1e3a5f" },
};

export const getTeamCardColors = name => {
  if (!name) return { border:"#9ca3af", bg:"#f3f4f6", text:"#374151", badgeBg:"#f3f4f6", badgeText:"#374151" };
  // Check exact match first
  if (TEAM_CARD_COLORS[name]) return TEAM_CARD_COLORS[name];
  // Check if name contains key patterns
  const n = name.toLowerCase();
  if (n.includes("u11")) return TEAM_CARD_COLORS["U11"];
  if (n.includes("u13")) return TEAM_CARD_COLORS["U13"];
  if (n.includes("u15") && (n.includes("girl") || n.includes("kvinde"))) return TEAM_CARD_COLORS["U15 Girls"];
  if (n.includes("u15")) return TEAM_CARD_COLORS["U15"];
  if (n.includes("u18")) return TEAM_CARD_COLORS["U18"];
  if (n.includes("girl") || n.includes("kvinde") || n.includes("women")) return TEAM_CARD_COLORS["Girls"];
  if (n.includes("2. div") || n.includes("div 2") || n.includes("2.div")) return TEAM_CARD_COLORS["2. Division"];
  if (n.includes("3. div") || n.includes("div 3") || n.includes("3.div")) return TEAM_CARD_COLORS["3. Division"];
  if (n.includes("4. div") || n.includes("div 4") || n.includes("4.div")) return TEAM_CARD_COLORS["4. Division"];
  if (n.includes("t20")) return TEAM_CARD_COLORS["T20 Serie 4"];
  if (n.includes("legend") || n.includes("ob")) return TEAM_CARD_COLORS["OB"];
  // Default gray
  return { border:"#9ca3af", bg:"#f3f4f6", text:"#374151", badgeBg:"#f3f4f6", badgeText:"#374151" };
};

// Fallback colour pool for dynamically added teams
export const EXTRA_COLORS = [
  {bg:"#1a3a2a",text:"#86efac"},{bg:"#7c3a00",text:"#fdba74"},
  {bg:"#312e81",text:"#a5b4fc"},{bg:"#065f46",text:"#6ee7b7"},
  {bg:"#1e1b4b",text:"#c7d2fe"},{bg:"#4c0519",text:"#fda4af"},
];

export const getTeamMeta = name =>
  TEAM_META[name] ||
  EXTRA_COLORS[Math.abs([...name].reduce((h,c)=>h*31+c.charCodeAt(0),0)) % EXTRA_COLORS.length];
