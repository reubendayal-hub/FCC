// ─── Roles & permissions ──────────────────────────────────────
// Captain/VC managed per-team in Coaches & Captains section

export const ROLES = ["superadmin", "admin", "member"];

export const ROLE_META = {
  superadmin:     { label:"Super Admin",       bg:"#431407", text:"#fdba74", icon:"👑" },
  admin:          { label:"Admin",             bg:"#1e3a5f", text:"#93c5fd", icon:"👨🏻‍💻" },
  captain:        { label:"Captain",           bg:"#14532d", text:"#a3e635", icon:"👨‍✈️" },
  vicecaptain:    { label:"Vice Captain",      bg:"#1a3d2b", text:"#6ee7b7", icon:"👷🏻‍♂️" },
  t20captain:     { label:"T20 Captain",       bg:"#7c1d1d", text:"#fca5a5", icon:"🦸‍♂️" },
  t20vicecaptain: { label:"T20 Vice Captain",  bg:"#78350f", text:"#fde68a", icon:"🥷🏻" },
  member:         { label:"Member",            bg:"#374151", text:"#e5e7eb", icon:"🏏" },
};

// Permissions
export const CAN = {
  deleteSession:  ["superadmin","admin","captain","vicecaptain","t20captain","t20vicecaptain"],
  removePlayer:   ["superadmin","admin","captain","vicecaptain","t20captain","t20vicecaptain"],
  addOtherPlayer: ["superadmin","admin","captain","vicecaptain","t20captain","t20vicecaptain"],
  createSession:  ["superadmin","admin","captain","vicecaptain","t20captain","t20vicecaptain","member"],
  sendReminder:   ["superadmin","admin","captain","vicecaptain","t20captain","t20vicecaptain"],
  accessMembers:  ["superadmin","admin"],
  assignRoles:    ["superadmin","admin"],
  addMember:      ["superadmin","admin"],
  removeMember:   ["superadmin","admin"],
  resetOtherPin:  ["superadmin","admin"],
};

export const can = (role, action) => (CAN[action] || []).includes(role);
