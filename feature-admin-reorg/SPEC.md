# Admin Panel Reorganisation — SPEC

**Branch:** `feature-admin-reorg`
**Off:** main (must be up-to-date with the just-merged conversational signup work)
**Risk:** Medium. Touches one large file (`AdminView.jsx`) but the changes are structural, not logic-modifying. No data shape changes. No security rule changes.

---

## Goal

Replace the flat list of 10 collapsible admin sections with 4 top-level tabs. Within each tab, the existing collapsible sections remain unchanged — only one tab's worth is visible at a time. The bottom-jump-chip strip is replaced by 4 tab buttons.

This makes the admin panel scannable, prevents accidentally scrolling past sections, and creates room for future sections to land in a sensible place (e.g. "All-club matches", "Members list view") without further crowding.

---

## Tab structure (decided)

| Tab        | Emoji | Sections (existing keys)                                                  |
|------------|-------|---------------------------------------------------------------------------|
| **People**  | 👥    | `members`, `addmember`, `groups`, `coaches`                              |
| **Sessions**| 🏏    | `blocknets`, `recurring`, `parentduty`, `dutyoversight`                  |
| **Comms**   | 📧    | `reminderlogs`                                                            |
| **System**  | ⚙️    | `backup`, `auditlog`                                                      |

The default landing tab is **People** (most-used).

---

## Behaviour

### Tab strip (replaces the existing "JUMP TO SECTION" chip strip)

- Fixed near the top of the Manage Members view, just below the `AppHeader`.
- 4 buttons in a single row: 👥 People · 🏏 Sessions · 📧 Comms · ⚙️ System
- Active tab: green border + light green fill (same active style as current jump chips: `border: 1px solid G.green`, `background: \`${G.green}12\``, `color: G.green`).
- Inactive tab: standard border, white fill, dark text.
- On narrow phones the row may wrap to 2x2 — that's fine.
- Each button shows a small red pill with a count if that tab has actionable items pending:
  - **People** pill = `joinRequests.filter(r=>r.status==="pending").length` (the pending join requests already shown in `Members` section). Hidden when 0.
  - Other tabs no pill (for now).
- Tapping a tab sets `adminTab` state and scrolls the page back to the top of the section area smoothly.

### Section behaviour within a tab

- Each section keeps its existing collapsible header (▼ show / ▲ collapse).
- The collapse state per section (`adminSec.{key}`) persists exactly as today.
- Sections from other tabs are NOT rendered at all (DOM-mount conditional), not just hidden. This keeps the page light and avoids stale `id="sec-*"` collisions.
- The existing `id="sec-*"` anchors stay in place inside each section for any future deep-linking, but the jump-chip functionality is gone.

### State

Add a new state:

```js
const [adminTab, setAdminTab] = useState("people"); // people | sessions | comms | system
```

Keep all existing `adminSec` state. No persistence to Firestore — tab state is per-session only (like the existing jump-chip behaviour today).

### URL/deep-link (out of scope)

No URL hash routing for tabs in v1. If we want `?tab=people` later, do as a follow-up.

---

## What stays the same

- **No logic changes to any section body.** Every section's internal code (pending join requests, add-member form, groups CRUD, coaches/captains assignment, parent-duty config, duty roster, block nets, recurring slots, backup buttons, audit log render, reminder logs) renders exactly as today.
- The existing `adminSec.{key}` collapse state and `toggleAdminSec(key)` toggle behave unchanged.
- The bottom `BotNav` strip and Toast continue to render unchanged.

---

## Implementation plan

### 1. State

In the AdminView main component body, add:

```js
const [adminTab, setAdminTab] = useState("people");
```

Define a constant mapping of which section keys belong in each tab:

```js
const TAB_SECTIONS = {
  people:   ["members", "addmember", "groups", "coaches"],
  sessions: ["blocknets", "recurring", "parentduty", "dutyoversight"],
  comms:    ["reminderlogs"],
  system:   ["backup", "auditlog"],
};
```

And a small helper:

```js
const sectionInTab = (key) => TAB_SECTIONS[adminTab]?.includes(key);
```

### 2. Replace the jump-chip strip

The current jump-to-section block (around lines 1204–1240, the wrapper with "JUMP TO SECTION" uppercase label and the chip array) becomes the tab strip:

```jsx
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
```

Remove the old "JUMP TO SECTION" uppercase label entirely. Drop the old `{[{label:"👥 Members", id:"sec-members", key:"members"}, ...].map(...)` chip block.

### 3. Conditionally render each section block by tab

For each of the 10 section blocks (each opens with a pattern like `<div id="sec-{key}"/>` then a toggle button then `{adminSec.{key}&&<>...</>}`), wrap the WHOLE block in a `{sectionInTab("{key}") && (...)}` conditional.

Specifically, find each of these and wrap them:

| Section file location (current line)     | key            |
|------------------------------------------|----------------|
| around 1245                              | `members`      |
| around 1751                              | `addmember`    |
| around 1908                              | `groups`       |
| around 1992                              | `coaches`      |
| around 2212                              | `parentduty`   |
| around 2513                              | `dutyoversight`|
| around 3054                              | `blocknets`    |
| around 3558                              | `recurring`    |
| around 3890                              | `backup`       |
| around 3981                              | `auditlog`     |
| around 4116                              | `reminderlogs` |

The wrap pattern:

```jsx
{sectionInTab("members") && (<>
  <div id="sec-members"/>
  <button onClick={()=>toggleAdminSec("members")} ...>...</button>
  {adminSec.members&&<>
    ...existing section body...
  </>}
</>)}
```

Apply the SAME pattern to each of the 10 sections. Do NOT change anything inside the section bodies.

### 4. Inter-section content blocks (gate to People tab)

There are 5 stray content blocks sitting between or alongside the 10 main sections. None of them is a "section" with its own collapsible — they're standalone banners or help cards. All 5 are about member data or member admin concepts, so all 5 should render only on the **People** tab.

**Block 1 — Role Guide (around lines 1877–1889)**
Currently sits between `addmember` and `groups` at the top level (no permission wrap). Wrap the whole block in `{sectionInTab("members") && (...)}` OR — cleaner — move it to render just before the `groups` section block, still gated to `sectionInTab("members")` or equivalently the People tab.

Recommended: wrap with `{adminTab === "people" && (...)}` since it doesn't belong to any single section key.

**Block 2 — Invite Code Guide (around lines 1891–1904)**
Currently top-level + gated to `userRole === "superadmin"`. Same treatment: wrap the whole `{userRole==="superadmin" && (...)}` in `{adminTab === "people" && ...}`.

**Block 3 — Fix Names banner (around lines 3820–3843)**
Currently sits INSIDE the `recurring` section's outer `{can(userRole,"addMember") && <>...</>}` permission wrap, but OUTSIDE the `{adminSec.recurring && <>...</>}` collapsible. It's a member-data action that has nothing to do with recurring slots — it's there for historical reasons.

Move it (with its conditional `{(namesNeedFix.length>0||namesAmbiguous.length>0) && (...)}`) OUT of the recurring permission wrap entirely, and re-render it inside the People tab, ideally just before the `groups` section so member-related help and banners cluster together.

**Block 4 — Seed Emails banner (around lines 3845–3863)**
Same as Block 3 — move out of recurring's permission wrap, render inside People tab. Same conditional `{emailsToSeed.length > 0 && (...)}` preserved.

**Block 5 — Division Team Assignments banner (around lines 3865–3884)**
Same as Block 3 — move out of recurring's permission wrap, render inside People tab. Same conditional `{divisionUpdates.length > 0 && (...)}` preserved.

After moving Blocks 3–5 out, the `recurring` permission wrap will end cleanly with just `</>}` after the `{adminSec.recurring && <>...</>}` close. Verify the JSX balances.

**Final placement in People tab:**

A good order inside the People tab (within `<div style={{padding:"14px 16px 20px"}}>`):

```
{adminTab === "people" && (<>
  {sectionInTab("members") && (... Members & Verifications ...)}
  {sectionInTab("addmember") && (... Add Member ...)}

  {/* Member-related banners cluster here, between Add Member and Groups */}
  {/* Role Guide — always shown */}
  {/* Invite Code Guide — superadmin only */}
  {/* Fix Names — when names need fixing */}
  {/* Seed Emails — when emails to import */}
  {/* Division Team Assignments — when divisionUpdates pending */}

  {sectionInTab("groups") && (... Groups ...)}
  {sectionInTab("coaches") && (... Coaches & Captains ...)}
</>)}
```

Implementer's choice: you can either (a) wrap each block in `{adminTab === "people" && ...}` individually (matching the existing 1:1 wrap pattern) or (b) group them inside one `{adminTab === "people" && (<>...</>)}` block. (b) reads cleaner — go with (b) if balancing tags isn't tricky, otherwise (a).

### 5. Optional follow-up cleanups (do these if straightforward, skip if risky)

- The duplicate `<div id="sec-members"/>` at line 1336 (inside the Members section, before "Join Requests") can be removed — it's leftover from the jump-chip era. Safe to delete.
- If `Btn` or similar atoms are imported but unused after this refactor, leave them — don't tidy imports in this PR.

---

## Acceptance criteria

1. Manage Members page loads with `People` tab active by default.
2. Members & Verifications, Add New Member, Groups, Coaches & Captains all visible (collapsed) under People. Nothing else visible.
3. Role Guide card shows on People tab, between Add Member and Groups.
4. Invite Code Guide (superadmin only) shows on People tab, between Add Member and Groups.
5. Fix Names banner shows on People tab WHEN there are names needing fixing — and ONLY on People tab.
6. Seed Emails banner shows on People tab WHEN there are emails to import — and ONLY on People tab.
7. Division Team Assignments banner shows on People tab WHEN there are pending updates — and ONLY on People tab.
8. Tap `Sessions` → only Block Nets, Recurring, Duty config, Duty roster visible. NO Fix Names / Seed Emails / Division banners.
9. Tap `Comms` → only Reminder Logs visible.
10. Tap `System` → only Backup, Audit Log visible.
11. Each section's individual ▼ show / ▲ collapse still works.
12. Pending join requests show a red count pill on the `People` tab; pill hides when count is 0.
13. Bottom `BotNav` and Toast still work.
14. No console errors. `npm run build` passes.
15. No data writes are added or changed.

---

## Out of scope (file as backlog)

- URL hash deep-linking to tabs.
- Persisting last-active tab across page reloads.
- Pills/badges on Sessions/Comms/System tabs.
- Renaming or reorganising sections inside a tab.
- Splitting AdminView.jsx into smaller files (worth doing but a separate Pass 2 modularisation epic).

---

## Risk & rollback

- Single-file change, no Firestore writes, no schema changes.
- Rollback: revert the merge commit. No data migration needed.
- Test on Vercel preview before merge.
