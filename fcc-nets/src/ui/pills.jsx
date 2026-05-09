import React from "react";
import { ROLE_META } from "../constants/roles";
import { getTeamMeta } from "../constants/teams";
import { getMemberRoleChips } from "../utils/members";

export const RolePill = ({role}) => {
  const m = ROLE_META[role] || ROLE_META.member;
  return <span style={{background:m.bg,color:m.text,borderRadius:20,padding:"2px 9px",
    fontSize:11,fontWeight:800}}>{m.icon} {m.label}</span>;
};

export const MemberRolePills = ({member, teams, sm}) => {
  const chips = getMemberRoleChips(member, teams);
  if(!chips.length) return null;
  return (<>
    {chips.map(c=>(
      <span key={c.key} style={{
        background:c.bg, color:c.text, borderRadius:20,
        padding:sm?"1px 6px":"2px 9px",
        fontSize:sm?9:11, fontWeight:800,
        display:"inline-flex", alignItems:"center", gap:3,
        whiteSpace:"nowrap",
      }}>
        {c.icon} {c.label}
      </span>
    ))}
  </>);
};

export const TeamPill = ({team, sm}) => {
  const m = getTeamMeta(team || "Unassigned");
  return <span style={{background:m.bg,color:m.text,borderRadius:20,
    padding:sm?"1px 7px":"2px 9px",fontSize:sm?10:11,fontWeight:800}}>{team || "Unassigned"}</span>;
};
