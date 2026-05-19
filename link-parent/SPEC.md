# Link Parent modal — proper picker + inline create

## Why

The existing "+ Link Parent" button on orphan child cards uses `window.prompt()`
showing the first 10 candidate names as a static text list. The list isn't
tappable (it's prompt message text), can't be searched/scrolled, and offers
no way to create a parent member who isn't already in the app. Result:
admins recall names from memory and type them in.

This patch replaces the prompt with a real modal: search-as-you-type, full
scrollable list, click-to-select, plus an inline "Create new parent" path.

## Scope

Replace the `window.prompt()` call inside the "+ Link Parent" button at
line ~13927–13965 of App_63-updated.jsx (find the current location after
modularisation — likely in `AdminView.jsx` member card render).

The sibling "+ Link Child" button at line ~13877 has the SAME pattern. Per
this spec, we leave that one alone for now — Issue #2 is parent-linking
specifically. If straightforward to reuse the same modal component for
"+ Link Child" later, fine — but don't over-scope.

## State

Add one new state at the top of the component that holds the modal data:

```js
const [linkParentModal, setLinkParentModal] = useState(null);
// shape when open: { childMember: <member object> }
// null when closed
```

## Button onClick — REPLACE the prompt

Find the existing "+ Link Parent" button. Replace the entire onClick body:

```js
// BEFORE
onClick={() => {
  const potentialParents = members.filter(p => ...);
  const parentName = prompt(...);
  // ...all the prompt-driven linking logic
}}

// AFTER
onClick={() => setLinkParentModal({ childMember: m })}
```

The linking logic moves into the modal's "Link" button (see below).

## Modal render

Render the modal somewhere near the bottom of AdminView's JSX, alongside
other top-level modals (look for `cancelModal && (() => { ... })()` or
similar pattern — match that):

```jsx
{linkParentModal && (() => {
  const { childMember } = linkParentModal;

  // Local state inside the IIFE doesn't work — lift these to outer state OR
  // factor the modal into a small dedicated component. Simpler: factor it.
  return (
    <LinkParentModal
      childMember={childMember}
      members={members}
      onClose={() => setLinkParentModal(null)}
      onLink={(parent) => {
        // existing linking logic, just parametrised
        const updated = members.map(x => {
          if (x.id === parent.id) {
            return {
              ...x,
              children: [...(x.children || []), childMember.id],
              memberType: "parent",
            };
          }
          if (x.id === childMember.id) {
            return { ...x, parentId: parent.id, parentName: parent.name };
          }
          return x;
        });
        saveMembers(updated);
        if (selMember && selMember.id === childMember.id) {
          setSelMember({ ...childMember, parentId: parent.id, parentName: parent.name });
        }
        logAction("member", `Linked child ${childMember.name} to parent ${parent.name}`);
        showToast(`${childMember.name} linked to ${parent.name} ✓`);
        setLinkParentModal(null);
      }}
      onCreateAndLink={(newParent) => {
        // newParent already includes id, name, phone (optional), memberType: "parent"
        const updated = [
          ...members.map(x =>
            x.id === childMember.id
              ? { ...x, parentId: newParent.id, parentName: newParent.name }
              : x
          ),
          newParent,
        ];
        saveMembers(updated);
        if (selMember && selMember.id === childMember.id) {
          setSelMember({ ...childMember, parentId: newParent.id, parentName: newParent.name });
        }
        logAction("member", `Created parent ${newParent.name} and linked child ${childMember.name}`);
        showToast(`${childMember.name} linked to new parent ${newParent.name} ✓`);
        setLinkParentModal(null);
      }}
    />
  );
})()}
```

## LinkParentModal component

Define as a small functional component in the same file (above the main
component, or in `src/components/LinkParentModal.jsx` if there's already a
components directory — match the project convention).

### Props

- `childMember` — the child being linked to a parent
- `members` — full members array
- `onClose` — closes modal
- `onLink(parentMember)` — links to existing member
- `onCreateAndLink(newParent)` — creates new parent then links

### Internal state

```js
const [search, setSearch] = useState("");
const [showCreateForm, setShowCreateForm] = useState(false);
const [newName, setNewName] = useState("");
const [newPhone, setNewPhone] = useState("");
```

### Candidate list

```js
const candidates = members
  .filter(p =>
    p.id !== childMember.id &&
    !(p.teams || []).some(t =>
      t.startsWith("U") || t.includes("Girls") || t.includes("Kvinder")
    )
  )
  .filter(p =>
    !search.trim() || p.name.toLowerCase().includes(search.toLowerCase().trim())
  )
  .sort((a, b) => a.name.localeCompare(b.name));
```

Sort is alphabetical — keep it simple per spec.

### Layout

Standard modal overlay (match existing modal styling):
- Backdrop: semi-transparent dark, click closes
- Card: centered, max-width 460px, padding 20px, white background, rounded
- Stacks on mobile to full width with small margin

Top section:
- Title: `Link ${childMember.name} to a parent`
- Subtitle: small muted text — child's team in brackets, e.g. "U13"
- Close button (X) top-right

Search input:
- Full width, large enough for finger tap on mobile (44px+ tall)
- Placeholder: "Search parents by name…"
- Autofocus on open

Candidate list:
- Scrollable, max-height 280px
- Each row: name (bold) + memberType badge (small pill: "👨‍👧 Parent" or
  "🏏 Player" using existing badge colors — blue/green from member card)
- Tap row → calls `onLink(candidate)` immediately. No "select then confirm"
  step — one tap, done.
- Empty state when search returns nothing: small muted message
  "No matches. Want to add a new parent?"

Divider with "OR" centred.

"+ Create new parent" button:
- Full width, outline style with gold border (FCC's accent)
- Tap → reveals inline form (showCreateForm = true)

Inline create form (when expanded):
- Two fields: Name (required), Phone (optional)
- Two buttons:
  - "Cancel" — collapses form back to button
  - "Create & link" — disabled until name is non-empty
    - On tap: build a new member object, call `onCreateAndLink(newParent)`

```js
const handleCreateAndLink = () => {
  if (!newName.trim()) return;
  const newParent = normMember({
    id: uid(),  // existing uid helper
    name: newName.trim(),
    phone: newPhone.trim() || null,
    email: null,
    teams: [],
    memberType: "parent",
    role: "member",
    children: [childMember.id],  // pre-linked
  });
  onCreateAndLink(newParent);
};
```

Note: `normMember` and `uid` need to be imported into the modal — wherever
they live. (`normMember` is at line ~603 in App_63; `uid` is probably in
`src/constants/seeds.js`.)

## Footer note

At the bottom of the modal, small muted text:
"Linking creates a relationship between this child and a parent member. The parent's account can later set a PIN to log in."

This is just a reassurance line so admins know nothing magical is happening.

## Mobile responsiveness

- Modal should be tappable on mobile (admins do this from phones)
- Search input + candidate rows: min 44px tall
- "+ Create new parent" button: min 44px tall
- New-parent form fields: min 44px tall

## What stays the same

- The "+ Link Parent" button's visibility logic (junior team + no parentId)
- The data fields written on link: parent gets `children: [...]` + `memberType: "parent"`; child gets `parentId` + `parentName`
- The toast + logAction calls
- The selMember refresh

## What we're NOT building in this patch

- "+ Link Child" button (sibling, same pattern — separate patch if needed)
- Heuristic name-matching (last-name suggestions)
- Bulk linking (link multiple kids to one parent at once)
- "Suggest a parent" auto-detection
- Phone number validation
- Email field on inline create (deliberately omitted to keep create flow fast)
- "Unlink" flow — that already exists elsewhere

## Acceptance criteria

1. Tap "+ Link Parent" on an orphan child card → proper modal opens, not browser prompt
2. Type in search field → list filters live, no need to press Enter
3. Tap any row in the candidate list → child is linked to that parent, modal closes, toast confirms, card refreshes to show "→ Parent name"
4. Tap "+ Create new parent" → inline form appears
5. Fill name (+ optional phone) → tap "Create & link" → new parent member is created AND child is linked to them in one step; modal closes; toast confirms
6. Close button (X) and clicking backdrop → modal closes without linking
7. New parent member shows up correctly in: Members list (Players or Parents sub-tab); the linked child's card → Parent: {name}; the parent's card → Children: [child]
8. No data migration. No security rule changes. No new Firestore collections.

## Edge cases to handle

- **Empty candidates** — if no adults exist at all, the candidate list is empty. Show empty state + "+ Create new parent" prominently.
- **Search has no matches** — empty state message points to Create.
- **Create with duplicate name** — don't block; just create. If admin truly wants to link to an existing parent of that name, they'll spot it in the list before tapping Create.
- **Create with empty name** — Create button stays disabled.
- **Child already has a parent** — shouldn't happen because the button only shows for unparented children, but defensive: if `childMember.parentId` is set when modal opens, close immediately with a toast "Already linked."

## Commit message

feat: replace Link Parent prompt with proper picker modal

The previous "+ Link Parent" button used window.prompt(), which only
showed the first 10 candidate names as static text and required typing
the full name. Replaces it with a proper modal:

- Search-as-you-type filters the full candidate list live
- Tap any row to link immediately
- Inline "+ Create new parent" for parents who don't yet have a
  member record — creates the member and links the child in one step
- Mobile-friendly (44px+ touch targets, scrollable candidate list)

The "+ Link Child" sibling button uses the same prompt() pattern and is
deliberately out of scope here — separate patch if needed.

No data migration. No security rule changes. The data shape written on
link is unchanged from the previous flow.

## Files affected

- AdminView.jsx (or wherever the orphan card render lives)
- New: LinkParentModal component (inline or in src/components/)

## Approach for Claude Code

1. Branch off main: `feature-link-parent-modal`
2. Find the existing "+ Link Parent" button + its prompt-based onClick
3. Add `linkParentModal` state to the parent component
4. Replace the onClick with `setLinkParentModal({ childMember: m })`
5. Add the modal render at the bottom of the JSX
6. Build the LinkParentModal component (inline in the file is fine for v1; extract later if reused)
7. `npm run build` — must pass
8. Commit with the message above
9. DO NOT push — let admin verify the UI first
