import React from "react";

export default function FamilyManager({ me, myChildren, availableChildren, members, onLink, onUnlink, onCreateChild, teams, juniorTeams }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [newChildName, setNewChildName] = React.useState("");
  const [newChildTeam, setNewChildTeam] = React.useState("");
  const [confirmUnlink, setConfirmUnlink] = React.useState(null);

  // Filter available children by search term
  const filteredChildren = searchTerm.length >= 2
    ? availableChildren.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Info card */}
      <div style={{background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:12,padding:14}}>
        <div style={{fontWeight:700,fontSize:14,color:"#1e40af",marginBottom:4}}>
          👨‍👧 Family Account
        </div>
        <div style={{fontSize:13,color:"#3b82f6",lineHeight:1.5}}>
          Link your children's profiles to your account to manage their bookings,
          view their progress, and receive notifications for their sessions.
        </div>
      </div>

      {/* Linked Children */}
      {myChildren.length > 0 && (
        <div>
          <div style={{fontWeight:800,fontSize:12,color:"#64748b",textTransform:"uppercase",
            letterSpacing:1,marginBottom:10}}>
            Linked Children ({myChildren.length})
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {myChildren.map(child => (
              <div key={child.id} style={{
                background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,
                padding:"12px 14px",display:"flex",alignItems:"center",gap:12,
              }}>
                <div style={{width:40,height:40,borderRadius:"50%",
                  background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:900,color:"#166534",flexShrink:0}}>
                  {child.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>{child.name}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>
                    {(child.teams||[]).join(", ") || "No team assigned"}
                  </div>
                </div>
                {confirmUnlink === child.id ? (
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={() => { onUnlink(child.id); setConfirmUnlink(null); }}
                      style={{background:"#dc2626",color:"#fff",border:"none",borderRadius:8,
                        padding:"6px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      Confirm
                    </button>
                    <button onClick={() => setConfirmUnlink(null)}
                      style={{background:"#e2e8f0",color:"#64748b",border:"none",borderRadius:8,
                        padding:"6px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmUnlink(child.id)}
                    style={{background:"none",border:"1px solid #e2e8f0",borderRadius:8,
                      padding:"6px 10px",fontSize:12,fontWeight:600,color:"#64748b",cursor:"pointer"}}>
                    Unlink
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Link Existing Child */}
      <div>
        <div style={{fontWeight:800,fontSize:12,color:"#64748b",textTransform:"uppercase",
          letterSpacing:1,marginBottom:10}}>
          🔍 Link Existing Player
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by child's name..."
          style={{width:"100%",padding:"12px 14px",border:"1.5px solid #e2e8f0",
            borderRadius:10,fontSize:14,fontFamily:"inherit",outline:"none",
            boxSizing:"border-box"}}
        />
        {searchTerm.length >= 2 && (
          <div style={{marginTop:8}}>
            {filteredChildren.length === 0 ? (
              <div style={{padding:"12px",background:"#fef3c7",borderRadius:10,
                fontSize:13,color:"#92400e"}}>
                No unlinked players found matching "{searchTerm}".
                You can create a new profile below.
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {filteredChildren.slice(0,5).map(child => (
                  <div key={child.id} style={{
                    background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,
                    padding:"10px 12px",display:"flex",alignItems:"center",gap:10,
                  }}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13,color:"#0f172a"}}>{child.name}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>
                        {(child.teams||[]).join(", ") || "No team"}
                      </div>
                    </div>
                    <button onClick={() => { onLink(child.id); setSearchTerm(""); }}
                      style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,
                        padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      Link
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create New Child */}
      <div>
        <button onClick={() => setShowCreate(!showCreate)}
          style={{width:"100%",padding:"12px",background:showCreate?"#f1f5f9":"#fff",
            border:"1.5px dashed #cbd5e1",borderRadius:10,fontSize:14,fontWeight:700,
            color:"#475569",cursor:"pointer",display:"flex",alignItems:"center",
            justifyContent:"center",gap:8}}>
          {showCreate ? "✕ Cancel" : "➕ Create New Child Profile"}
        </button>

        {showCreate && (
          <div style={{marginTop:12,padding:14,background:"#f8fafc",borderRadius:12,
            display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{fontWeight:600,fontSize:12,color:"#475569",marginBottom:4,display:"block"}}>
                Child's Name
              </label>
              <input
                type="text"
                value={newChildName}
                onChange={e => setNewChildName(e.target.value)}
                placeholder="Full name"
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",
                  borderRadius:8,fontSize:14,fontFamily:"inherit",outline:"none",
                  boxSizing:"border-box"}}
              />
            </div>
            <div>
              <label style={{fontWeight:600,fontSize:12,color:"#475569",marginBottom:4,display:"block"}}>
                Team (optional)
              </label>
              <select
                value={newChildTeam}
                onChange={e => setNewChildTeam(e.target.value)}
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",
                  borderRadius:8,fontSize:14,fontFamily:"inherit",outline:"none",
                  background:"#fff",boxSizing:"border-box"}}>
                <option value="">Select team...</option>
                {juniorTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button
              onClick={() => {
                if (!newChildName.trim()) return;
                onCreateChild(newChildName, newChildTeam);
                setNewChildName("");
                setNewChildTeam("");
                setShowCreate(false);
              }}
              disabled={!newChildName.trim()}
              style={{padding:"12px",background:newChildName.trim()?"#16a34a":"#cbd5e1",
                color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,
                cursor:newChildName.trim()?"pointer":"not-allowed"}}>
              Create & Link Child
            </button>
          </div>
        )}
      </div>

      {/* Hybrid account info */}
      {(me.teams||[]).length > 0 && (
        <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",borderRadius:12,padding:14}}>
          <div style={{fontWeight:700,fontSize:14,color:"#166534",marginBottom:4}}>
            🏏 Hybrid Account
          </div>
          <div style={{fontSize:13,color:"#16a34a",lineHeight:1.5}}>
            You're both a player ({(me.teams||[]).join(", ")}) and a parent.
            Your single login manages both your playing profile and your children's accounts.
          </div>
        </div>
      )}
    </div>
  );
}
