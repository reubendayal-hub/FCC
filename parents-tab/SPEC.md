# Parents tab — Admin Members section

## Goal

Give admins a single pane to see, filter, and triage parent/child accounts.
Without this, admins can't easily answer:
- "Which parents are on this app?"
- "Which children don't have a parent linked?"
- "Who do I need to nudge to set up their account?"

## Where it lives

Inside the existing `Admin → Members & Verifications` section.
Add a **tab bar** ABOVE the existing team-filter chips.

```
┌──────────────────────────────────────────────────────┐
│  👥 Members & Verifications                  collapse │
│                                                       │
│  [ All ] [ 🏏 Players ] [ 👨‍👧 Parents ] [ ⚠ Orphans ] │   ← NEW
│                                                       │
│  Stats: 89 members · 34 parents · 41 children · 5 unlinked   ← NEW
│                                                       │
│  Search: [_____________]                              │   existing
│  Teams:  [All] [U11] [U13] ... [Unassigned]           │   existing
│                                                       │
│  ...member cards...                                   │   existing
└──────────────────────────────────────────────────────┘
```

The tab bar acts as an **additional filter** layered on top of the existing
team-chip filter and search.

## State

Add one new state: `aSubTab` = `"all" | "players" | "parents" | "attention"`.
Default: `"all"`.

Persist across navigations using the same pattern as other admin state
(if it's already in URL/session storage or just useState, match that).

## Filter logic

Extend the existing `adminVisible` filter at line ~4022:

```js
const adminVisible = members.filter(m => {
  const q = !aSearch || m.name.toLowerCase().includes(aSearch.toLowerCase());
  const t = aFilter === "All"
    || (aFilter === "Unassigned" && (m.teams || []).length === 0)
    || (m.teams || []).includes(aFilter);

  // NEW: sub-tab filter
  const isParent = m.memberType === "parent" || (m.childIds || []).length > 0;
  const isChild = !!m.parentId;
  const isOrphanChild = (m.teams || []).some(team =>
    team.startsWith("U") || team.includes("Girls")
  ) && !m.parentId && m.memberType !== "parent";

  const sub =
       aSubTab === "all"
    || (aSubTab === "players"   && !isParent)
    || (aSubTab === "parents"   && isParent)
    || (aSubTab === "attention" && isOrphanChild);

  return q && t && sub;
});
```

Note the **orphan definition**: a member who's on a junior/girls team, has
no `parentId`, and isn't themselves a parent. This catches children who
exist as members but aren't linked to any parent account.

## Tab bar UI

Style: pill buttons, same family as existing team filter chips.

```jsx
<div style={{
  display: "flex", gap: 6, marginBottom: 12,
  flexWrap: "wrap"
}}>
  {[
    { id: "all",       label: "All",         count: members.length },
    { id: "players",   label: "🏏 Players",  count: nonParentCount },
    { id: "parents",   label: "👨‍👧 Parents", count: parentCount },
    { id: "attention", label: "⚠ Orphans",   count: orphanCount,
      tint: "red" },
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => setASubTab(tab.id)}
      style={{
        padding: "6px 12px", borderRadius: 99,
        fontSize: 12, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
        border: aSubTab === tab.id
          ? `1.5px solid ${tab.tint === "red" ? "#dc2626" : G.green}`
          : `1px solid ${G.border}`,
        background: aSubTab === tab.id
          ? (tab.tint === "red" ? "#fef2f2" : G.greenPale)
          : G.white,
        color: aSubTab === tab.id
          ? (tab.tint === "red" ? "#991b1b" : G.green)
          : G.text,
      }}
    >
      {tab.label}
      {tab.count > 0 && (
        <span style={{ marginLeft: 6, opacity: 0.7 }}>
          ({tab.count})
        </span>
      )}
    </button>
  ))}
</div>
```

Counts come from `members` (not filtered) — they show the total in each
category regardless of current search/team filter.

## Stats strip

A single-line summary BELOW the tab bar:

```jsx
<div style={{
  fontSize: 11, color: G.muted, marginBottom: 10,
  fontStyle: "italic",
}}>
  {members.length} members · {parentCount} parents · {childCount} children
  {orphanCount > 0 && (
    <span style={{ color: "#dc2626", fontWeight: 700 }}>
      {" · "}{orphanCount} unlinked
    </span>
  )}
  {parentsWithoutPin > 0 && (
    <span style={{ color: "#92400e" }}>
      {" · "}{parentsWithoutPin} parents not on app yet
    </span>
  )}
</div>
```

Counts computed once at the top of the render:

```js
const parentCount = members.filter(m =>
  m.memberType === "parent" || (m.childIds || []).length > 0
).length;

const childCount = members.filter(m =>
  (m.teams || []).some(t => t.startsWith("U") || t.includes("Girls"))
).length;

const orphanCount = members.filter(m =>
  (m.teams || []).some(t => t.startsWith("U") || t.includes("Girls"))
  && !m.parentId && m.memberType !== "parent"
).length;

const parentsWithoutPin = members.filter(m =>
  (m.memberType === "parent" || (m.childIds || []).length > 0) && !m.pin
).length;

const nonParentCount = members.length - parentCount;
```

## Orphans tab — extra context

When `aSubTab === "attention"`, the member card render should include a
**red banner** at the top of each card:

```jsx
{aSubTab === "attention" && (
  <div style={{
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 6, padding: "6px 10px", marginBottom: 8,
    fontSize: 11, fontWeight: 700, color: "#991b1b",
  }}>
    ⚠ No parent linked — use the "Link Parent" button below
  </div>
)}
```

The existing "Link Parent" button is already in the card actions — admin
taps it directly from the orphan list. No new linking UI needed in v1.

## Member card — small additions

Two small additions inside the existing card render (line ~13816 area):

1. **PIN status pill** — next to the existing member type badge:
   ```jsx
   <span style={{
     background: m.pin ? "#dcfce7" : "#fef3c7",
     color: m.pin ? "#166534" : "#92400e",
     padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
   }}>
     {m.pin ? "🔑 PIN set" : "⏳ No PIN yet"}
   </span>
   ```

2. **Duty count** — only shown when `aSubTab === "parents"`. Pulls from
   the existing `countDuties` helper in `src/constants/parent-duty.js`:
   ```jsx
   {aSubTab === "parents" && (() => {
     const config = parentDutyConfig || DEFAULT_DUTY_CONFIG;
     const minDuties = config.minDutiesPerParent || 4;
     const done = countDuties(m.name, sessions);
     return (
       <span style={{
         background: done >= minDuties ? "#dcfce7"
                   : done > 0           ? "#fef3c7"
                                        : "#fee2e2",
         color:      done >= minDuties ? "#166534"
                   : done > 0           ? "#92400e"
                                        : "#991b1b",
         padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
       }}>
         {done}/{minDuties} duties
       </span>
     );
   })()}
   ```

## What stays the same

- Search box — unchanged
- Team filter chips — unchanged, layered with sub-tab
- Member card body — unchanged except for the two small additions above
- Link/edit/role-assign actions — unchanged
- Existing self-verified members banner — unchanged

## What we're NOT building in v1

- Parents-without-PIN as a triage tab (deferred — Q3 of original 4 questions)
- Parents-with-zero-duties triage (deferred)
- Bulk select/assign
- Send PIN setup link / Nudge actions
- Improved linking UI (that's Issue #2 — separate branch)
- Heuristic parent matching ("Did you mean: Aniket Rao?")

These come in v2 or in the linking-UI feature.

## Acceptance criteria

1. Admin opens Members section → sees tab bar with counts
2. Tap "Parents" → only sees parent members; each card has PIN status + duty count
3. Tap "Orphans" → only sees junior team members with no parentId; each card has red "No parent linked" banner
4. Stats strip shows accurate counts; the red "unlinked" count matches "Orphans" tab count
5. Existing search and team filter still work, layered with the sub-tab
6. No data migration. No security rule changes. No new Firestore collections.

## Safety

- No write operations from the tab itself — it's a read/filter/triage view
- All existing actions (Link Parent, etc.) reuse the existing code paths
- Visible to all admins, not super-admin gated
