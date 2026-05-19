# LinkChildModal + email retrofit on LinkParentModal

Two related changes in one patch:

1. **NEW**: `LinkChildModal` — replaces the `window.prompt()` on the
   "+ Link Child" button (sibling of "+ Link Parent" we already shipped)
2. **RETROFIT**: add an email field to the existing `LinkParentModal`'s
   "+ Create new parent" form

Both make the create-paths capture an email so the new member can verify
their account at first login. Email is **optional** on both.

---

## Part 1 — NEW: LinkChildModal

### Why

The "+ Link Child" button on parent records still uses `window.prompt()`
showing the first 10 children as static text. Same broken UX as the
"+ Link Parent" button was — names aren't tappable, list isn't scrollable,
no way to create a child member who isn't yet in the app.

### Scope

Replace the `window.prompt()` call inside the "+ Link Child" button at
line ~13877–13923 of App_63-updated.jsx (find current location after
modularisation — same area as the previously-fixed "+ Link Parent" button).

### State

Add new state next to existing `linkParentModal`:

```js
const [linkChildModal, setLinkChildModal] = useState(null);
// shape when open: { parentMember: <member object> }
// null when closed
```

### Button onClick — REPLACE the prompt

```js
// BEFORE
onClick={() => {
  const unlinkedJuniors = members.filter(c => ...);
  const childName = prompt(...);
  // ...all the prompt-driven linking logic
}}

// AFTER
onClick={() => setLinkChildModal({ parentMember: m })}
```

### Modal render

Add alongside the existing `linkParentModal` render at the bottom of the
JSX:

```jsx
{linkChildModal && (
  <LinkChildModal
    parentMember={linkChildModal.parentMember}
    members={members}
    onClose={() => setLinkChildModal(null)}
    onLink={(child) => {
      const updated = members.map(x => {
        if (x.id === linkChildModal.parentMember.id) {
          return {
            ...x,
            children: [...(x.children || []), child.id],
            memberType: "parent",
          };
        }
        if (x.id === child.id) {
          return {
            ...x,
            parentId: linkChildModal.parentMember.id,
            parentName: linkChildModal.parentMember.name,
          };
        }
        return x;
      });
      saveMembers(updated);
      if (selMember && selMember.id === linkChildModal.parentMember.id) {
        setSelMember({
          ...linkChildModal.parentMember,
          children: [...(linkChildModal.parentMember.children || []), child.id],
          memberType: "parent",
        });
      }
      logAction("member", `Linked child ${child.name} to parent ${linkChildModal.parentMember.name}`);
      showToast(`${child.name} linked to ${linkChildModal.parentMember.name} ✓`);
      setLinkChildModal(null);
    }}
    onCreateAndLink={(newChild) => {
      const updated = [
        ...members.map(x =>
          x.id === linkChildModal.parentMember.id
            ? {
                ...x,
                children: [...(x.children || []), newChild.id],
                memberType: "parent",
              }
            : x
        ),
        newChild,
      ];
      saveMembers(updated);
      if (selMember && selMember.id === linkChildModal.parentMember.id) {
        setSelMember({
          ...linkChildModal.parentMember,
          children: [...(linkChildModal.parentMember.children || []), newChild.id],
          memberType: "parent",
        });
      }
      logAction("member", `Created child ${newChild.name} and linked to parent ${linkChildModal.parentMember.name}`);
      showToast(`${newChild.name} created and linked ✓`);
      setLinkChildModal(null);
    }}
  />
)}
```

### LinkChildModal component

Define inline in the same file as LinkParentModal — match the existing
pattern. Or, if you want, put both modal components in
`src/components/LinkMemberModals.jsx` — admin's choice.

#### Props

- `parentMember` — the parent being linked to a child
- `members` — full members array
- `onClose` — closes modal
- `onLink(childMember)` — links to existing junior member
- `onCreateAndLink(newChild)` — creates new child member then links

#### Junior teams allow-list

```js
// Same definition used in Parents tab orphan detection
const JUNIOR_TEAM_MATCH = (team) =>
  team.startsWith("U") || team.includes("Girls");

// All junior teams currently in the system, for the Create-child team dropdown
const juniorTeams = (teams || [])
  .map(t => t.name)
  .filter(JUNIOR_TEAM_MATCH);
```

`teams` array comes from context (existing prop on AdminView).

#### Internal state

```js
const [search, setSearch] = useState("");
const [showCreateForm, setShowCreateForm] = useState(false);
const [newName, setNewName] = useState("");
const [newTeam, setNewTeam] = useState(juniorTeams[0] || "");
const [newEmail, setNewEmail] = useState(parentMember.email || "");
```

Note: `newEmail` pre-fills from the parent's email. Admin can clear or
replace it.

#### Candidate list

```js
const candidates = members
  .filter(c =>
    c.id !== parentMember.id &&
    !c.parentId &&
    (c.teams || []).some(JUNIOR_TEAM_MATCH)
  )
  .filter(c =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase().trim())
  )
  .sort((a, b) => a.name.localeCompare(b.name));
```

This is: members on a junior team, not the parent themselves, who don't
already have a parent linked. Same filter as the original prompt's logic.

#### Modal layout

Match LinkParentModal layout — same overall shape so admins recognise it.

Top:
- Title: `Link a child to ${parentMember.name}`
- Subtitle: small muted, e.g. "Find an existing junior member or create a new one"
- Close (X)

Search input (autofocus on open, full width, 44px+ tall).

Candidate list (scrollable, max-height ~280px):
- Each row: name (bold) + team badges (small pills, existing team-color
  scheme) — admin can see at a glance which team the kid is on
- Tap row → calls `onLink(candidate)` immediately
- Empty state: "No matches. Want to add a new child?"

Divider "OR".

"+ Create new child" button (full width, gold outline, 44px+ tall) →
reveals inline form.

Inline create form (when expanded):
- Name (required, autofocus when revealed)
- Team (required, dropdown of junior teams only)
- Email (optional, pre-filled from parent's email, with note: "Used to verify the child's account at first login. Often the parent's email.")
- Two buttons:
  - "Cancel" → collapses form
  - "Create & link" → disabled until name + team are both set

```js
const handleCreateAndLink = () => {
  if (!newName.trim() || !newTeam) return;
  const newChild = normMember({
    id: uid(),
    name: newName.trim(),
    email: newEmail.trim() || null,
    emailVerified: false,  // explicit — admin can verify later
    teams: [newTeam],
    memberType: "player",  // children stored as players with parentId
    role: "member",
    parentId: parentMember.id,
    parentName: parentMember.name,
  });
  onCreateAndLink(newChild);
};
```

Note: `memberType` is `"player"` because children are stored as players
with a `parentId`. This matches the existing addMember flow at line ~3765.

### Footer note

Small muted text at the bottom:
"Linking creates a relationship between this parent and child. The child's account can use the email above to verify at first login."

---

## Part 2 — RETROFIT: add email field to LinkParentModal

### Why

We shipped LinkParentModal with name + phone only. Now that we're
standardising email-as-verification-anchor across both create-paths,
the parent create flow needs an email field too.

### Changes

Inside the existing `LinkParentModal` component's create form:

1. Add a new state:
   ```js
   const [newEmail, setNewEmail] = useState("");
   ```
   No pre-fill — the parent is the *anchor* here, there's no other email
   to pull from.

2. Add an email input below the phone input:
   ```jsx
   <input
     type="email"
     placeholder="Email (optional, for account verification)"
     value={newEmail}
     onChange={e => setNewEmail(e.target.value)}
     style={inputStyle}
   />
   ```

3. Update `handleCreateAndLink` to include email:
   ```js
   const newParent = normMember({
     id: uid(),
     name: newName.trim(),
     phone: newPhone.trim() || null,
     email: newEmail.trim() || null,
     emailVerified: false,
     teams: [],
     memberType: "parent",
     role: "member",
     children: [childMember.id],
   });
   onCreateAndLink(newParent);
   ```

### What stays the same

- Name still required
- Phone still optional
- Create button still disabled until name is non-empty (NOT email — email stays optional)
- All other linking logic unchanged

---

## Universal: emailVerified field

Both create paths set `emailVerified: false` explicitly. This is correct:
- The member exists with an email
- At first login they'll be prompted to verify via the existing flow
  (don't change that — it's already wired)
- Admin can manually flip `emailVerified: true` later via the existing
  member-edit UI if they trust the email

The existing verify-link sender (`send-verify_1.js` in the project)
handles the actual verification flow. This patch only captures the email
at the right moment.

---

## What we're NOT building in this patch

- Triggering an automatic verify email send on Create (separate concern)
- Editing an existing child/parent's team/email from the link modal
- "Unlink" actions in the modal (already exist elsewhere)
- Bulk linking (multiple children to one parent at once)
- Auto-detection of which adult might be a kid's parent (heuristic — saved for later if needed)
- Refactoring LinkParentModal and LinkChildModal into a shared component
  (deliberate scope creep prevention — two clear components is fine)

---

## Acceptance criteria

### LinkChildModal
1. Tap "+ Link Child" on a parent's card → proper modal opens, not prompt
2. Search filters live
3. Tap any junior member → linked immediately, modal closes, toast confirms
4. Tap "+ Create new child" → inline form appears with team dropdown and email field
5. Email field pre-filled from parent's email when modal opened
6. Create requires name + team only; email stays optional
7. Created child shows up correctly: linked to parent, on chosen team, with `parentId`/`parentName` set, `memberType: "player"`

### LinkParentModal email retrofit
8. Email input appears below phone on the Create form
9. Create still only requires name (email + phone both optional)
10. Created parent has `email` set when provided, `emailVerified: false`
11. Existing link-to-existing-parent flow unchanged

### Both
12. `emailVerified` defaults to `false` on all created members
13. No data migration. No security rule changes.
14. No new Firestore writes from the modal — same `saveMembers` calls as before

---

## Commit message

feat: LinkChildModal + email field on LinkParentModal

Replaces the window.prompt() on the "+ Link Child" button with a proper
modal mirroring the LinkParentModal we shipped earlier:
- Search-as-you-type filters unparented junior members
- Tap any row to link immediately
- Inline "+ Create new child" with team dropdown and email field
  (email pre-fills from the parent being linked to)
- Email is captured for later account verification; emailVerified set
  to false on creation

Also retrofits an email field onto the existing LinkParentModal's
"+ Create new parent" form for symmetry. Name remains required; phone
and email both optional.

Both create paths now capture an email at creation time so the new
member can verify their account at first login via the existing verify
flow. No automatic verification email is sent from the modal — that
stays a separate concern.

No data migration. No security rule changes. No new Firestore writes.

---

## Files affected

- AdminView.jsx (or wherever the "+ Link Child" button + LinkParentModal live)
- LinkParentModal component (in-place edit — add email field)
- New LinkChildModal component (inline in same file, or extracted to
  src/components/LinkMemberModals.jsx alongside LinkParentModal — admin's
  choice based on existing conventions)

---

## Approach for Claude Code

1. Branch off main: `feature-link-child-modal`
2. Find the existing "+ Link Child" button + its prompt-based onClick
3. Add `linkChildModal` state alongside the existing `linkParentModal`
4. Replace the onClick with `setLinkChildModal({ parentMember: m })`
5. Add the modal render at the bottom of the JSX alongside LinkParentModal
6. Build the LinkChildModal component (mirror LinkParentModal's structure)
7. Retrofit email field onto LinkParentModal's create form
8. `npm run build` — must pass
9. Commit with the message above
10. DO NOT push — let admin verify the UI first
