# Admin duty assignment + notification

## Why

Parent self-signup is first-come-first-served. For opening events and
critical match days, admins need to assign duties to specific parents
to guarantee coverage — without waiting for organic signup.

Right now admins resort to WhatsApp asks ("Aniket, can you drive Saturday?")
and the parent-duty-app stays empty of that assignment, breaking the
admin's view of who's covering what.

This feature gives admins a calendar-style view of upcoming sessions
per team, with the same role chips parents see — but admin can assign
ANY eligible parent to ANY open role, then notify the parent via email
or WhatsApp.

## Where it lives

Inside the existing **"Duty roster oversight"** section in the Admin
panel. That section currently shows duty summary stats. Add the
assignment view BELOW the existing oversight content (don't replace it).

Optionally rename the section heading from "Duty roster oversight" to
**"Duty roster"** (drop the passive word) since this section now both
shows AND lets admin act.

## Structure

```
┌──────────────────────────────────────────────────────────┐
│ 🧑‍⚖️ Duty roster                                collapse │
│                                                          │
│  [ existing oversight stats: 23/45 duties claimed... ]   │   existing
│                                                          │
│  ──────────────────────────────────────────────────      │
│                                                          │
│  ASSIGN DUTIES                                           │   NEW
│  Team: [ U11 ▼ ] [ U13 ▼ ] [ U15 ▼ ] [ Women's ▼ ]      │
│                                                          │
│  [ Selected team's calendar with role chips ]            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The team chips at the top are the existing team-filter pattern (same
component the admin sees elsewhere). Selecting a team filters the
calendar to that team's sessions.

Default state: no team selected → empty state asks admin to pick one.

## Calendar view

Layout mirrors the Profile view's "My parent duties" section, with
admin powers added. For the selected team:

1. **Training section** (🎯 icon)
   - Lists upcoming training sessions, chronological
   - Each session row: date · time · session label
   - Role chips for each duty role (Drive / Seats / Kit / Scorer as
     configured per team) — same chips parents see
   - Empty role chips are tappable BY ADMIN
   - Filled role chips show the parent's name and are LOCKED (per
     earlier decision — only allow assigning empty roles for v1)

2. **Match days section** (🏏 icon)
   - Same structure as training, but for `isMatch: true` sessions
   - Match label includes opponent (e.g. "vs Glostrup U13") and venue

Time horizon: same as Profile (12 weeks lookahead).

## Eligible parents for assignment

When admin taps an empty role chip, a parent picker modal opens
(similar pattern to LinkParentModal — search-as-you-type, scrollable
list, tap to select).

Candidate logic:

```js
const sessionTeam = getSessionTeam(session);
const rollupTeams = getRollupTeams(sessionTeam, teams);
// e.g. for U13 session, rollupTeams = ["U13", "U13 B"]

const eligibleParents = members.filter(m => {
  // Must be a parent
  if (m.memberType !== "parent" && (m.children || []).length === 0) return false;
  
  // Must have a kid on the session team or a rollup team
  const kidsOnTeam = (m.children || [])
    .map(cid => members.find(x => x.id === cid))
    .filter(Boolean)
    .some(kid => (kid.teams || []).some(t => rollupTeams.includes(t)));
  
  if (!kidsOnTeam) return false;
  
  // Optionally exclude parents already at duty cap for this team
  // (for v1, just show all, admin can decide)
  return true;
});
```

This matches the existing self-signup eligibility (`buildTeamParentList`
in `src/constants/parent-duty.js`). Reuse that helper directly if its
signature allows — DO NOT duplicate the eligibility logic.

## The assignment modal

When admin taps an empty role chip → modal opens.

Header:
- Title: `Assign {role} for {team} · {sessionLabel}`
- Subtitle: `{date} · {time}{venuePhrase}`
- Close (X)

Search input (autofocus). Same component as LinkParentModal's search.

Candidate list:
- Each row: parent name + child name(s) + team(s)
- Example row: `Vivek Bhatnagar — Charlie · U13`
- Truncate if multiple kids: `Vivek Bhatnagar — Charlie + 1 more`
- Show duty count badge: `0/4`, `2/4`, `4/4`
  - Color: green if at/above min, amber if partial, red if zero
  - Helps admin pick parents who need duties, not parents who are full

Tap row → triggers assignment write:

```js
const assignedParents = getSupportParents(session, sessionTeam, role) || [];
if (assignedParents.includes(parent.name)) {
  // Already assigned (defensive — chip should have been locked)
  showToast(`${parent.name} is already on this duty`);
  return;
}
setSupportParents(session, sessionTeam, role, [...assignedParents, parent.name]);
saveSessions([...sessions.map(s => s.id === session.id ? updatedSession : s)]);
logAction("duty", `Admin assigned ${parent.name} to ${role} for ${sessionTeam} ${date}`);
```

After assignment write:
- Modal closes the candidate list view
- Switches to **notification preview** (next section)

## Notification preview

Same modal, second screen. Shown immediately after successful assignment.

Header:
- Title: `Notify {parent.name}?`
- Subtitle: shows what was just assigned: `{role} · {team} · {date} · {time}`

Channel toggle:
- Two pills, side by side: `📧 Email` and `💬 WhatsApp`
- Default: WhatsApp (higher open rates in Denmark; assign-and-go workflow)
- Tapping a pill switches the preview

Message preview (editable textarea):

```js
const adminName = currentUser?.name || "FCC Admin";
const dateStr = formatDate(session.date); // "Sat 24 May"
const timeStr = session.from; // "10:00"
const venuePhrase = session.home ? " at home" : ` at ${session.venue}`;
const opponentPhrase = session.isMatch ? ` vs ${session.matchOpponent}` : "";
const sessionType = session.isMatch ? "match" : "training";

const template = `Hi ${parent.name.split(" ")[0]},

You've been assigned to ${role} duty for ${sessionTeam} ${sessionType}${opponentPhrase} on ${dateStr} at ${timeStr}${venuePhrase}.

Could you confirm? If you can't make it, please let me know ASAP.

— ${adminName}`;
```

Render as a `<textarea>` pre-filled with template, 6 rows tall, full
width. Admin can edit freely.

Actions:
- **"Send" button** — primary, gold accent
- **"Skip" button** — secondary, just closes modal without sending
- **"Copy to clipboard"** — tertiary, useful for forwarding to other channels

On Send:

```js
if (channel === "whatsapp") {
  // WhatsApp via wa.me — opens user's WhatsApp pre-filled
  // The parent's phone should be pre-filled if available
  const phone = (parent.phone || "").replace(/\D/g, ""); // strip non-digits
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  window.open(url, "_blank");
  showToast(`WhatsApp opened — review and send`);
} else if (channel === "email") {
  // Email via Resend (existing /api/notify endpoint, OR add new endpoint)
  // Pass parent.email as recipient, subject auto-generated, body = messageText
  fetch("/api/notify", {
    method: "POST",
    body: JSON.stringify({
      type: "duty-assigned",
      to: parent.email,
      subject: `${role} duty for ${sessionTeam} on ${dateStr}`,
      body: messageText,
      parentName: parent.name,
    }),
  });
  showToast(`Email sent to ${parent.email}`);
}
setAssignModal(null);
```

For email, the `/api/notify.js` Vercel function will need a new
`duty-assigned` type case. Add it to the existing handler:

```js
// In api/notify.js, add a new case
case "duty-assigned":
  return sendEmail({
    from: FROM,
    to: req.body.to,
    subject: req.body.subject,
    html: wrapHtml(
      "Duty assignment",
      `<p style="font-size:14px;line-height:1.6;color:#1e3a5f;">
        ${req.body.body.replace(/\n/g, "<br/>")}
      </p>`
    ),
  });
```

## Channel availability fallback

If parent has no phone: hide WhatsApp option (or show with warning
"No phone on file"). If parent has no email: hide email option.

If both are missing: show only "Copy to clipboard" + a message:
"This parent has no email or phone on file. Copy the message and send
via your preferred channel."

This shouldn't happen in production but is defensive against incomplete
records.

## Locked (already-claimed) chips

For v1: if a role is already claimed by a parent, the chip shows the
parent's name and is NOT tappable by admin. To reassign, admin must
have the original parent unclaim first (parent goes to their own
Profile → My duties → tap to unclaim).

Display style for locked chips:
- Background: light gray (existing claimed-chip style)
- Text: parent's first name + role icon
- Tooltip on hover: "Already assigned to {full name}. They need to
  unclaim before reassignment."

## What stays the same

- All existing parent self-signup flows in Profile view (unchanged)
- Duty count helpers (`countDuties`, `getRollupTeams`, etc)
- Session storage / write path (`saveSessions` with `setSupportParents`)
- The existing "Duty roster oversight" stats display

## What we're NOT building in v1

- Multi-parent assignment per role (one parent per role per session)
- Reassignment from filled chips (admin must ask parent to unclaim first)
- Batch assign (assign N parents to N sessions at once)
- Conflict detection (parent already at max duties — let admin override)
- Suggested assignments / round-robin / fairness
- Recurring assignment templates (e.g. "Aniket drives every other Sat")
- SMS notification (just email + WhatsApp)
- Read receipts / acknowledgement tracking

## Acceptance criteria

1. Open Admin → Duty roster section → see ASSIGN DUTIES sub-section below
   the existing stats
2. Team chips visible at top; tap a team → calendar appears
3. Calendar shows training section + match days section, with role chips
4. Tap an empty role chip → modal opens with eligible-parents list
5. Search filters live
6. Each candidate shows duty count badge (color-coded)
7. Tap a candidate → assignment writes successfully; modal switches to
   notification preview
8. Notification preview shows pre-filled template with session details
9. Toggle channel WhatsApp ↔ Email works; preview updates if needed
10. Edit message in textarea — edits persist when toggling channels
11. Tap Send → WhatsApp opens (or Email sends via Resend); toast confirms
12. Tap Skip → no notification, but assignment is saved; toast confirms
13. Already-claimed chips show parent's name, are NOT tappable
14. Refresh: assigned duties persist (saved to Firestore)
15. Parent's Profile view → My duties section shows the admin-assigned
    duty correctly (it's stored via the same data path)
16. logAction logs each admin assignment
17. No data migration, no security rule changes
18. No regression in parent self-signup flow

## Commit message

feat: Admin duty assignment with notification preview

Adds an ASSIGN DUTIES section to the Duty roster admin panel. Admin
picks a team, sees the same training + match calendar parents see in
Profile, and can assign any eligible parent to any empty role chip.

Eligibility mirrors self-signup logic: parents whose kids are on the
session's team OR a rollup-mapped team (e.g. U13 B parents eligible
for U13 sessions).

After assignment, admin sees a notification preview modal:
- Auto-generated template (date / role / team / time / opponent)
- Editable in a textarea — admin can personalize
- Channel toggle: WhatsApp (wa.me deep-link) or Email (Resend)
- "Send" (does it), "Skip" (assignment saved without notify), "Copy"
  (clipboard for other channels)

For v1: only empty role chips are tappable. To reassign a claimed
duty, the original parent must first unclaim in their Profile.

Reuses existing helpers (getSupportParents, setSupportParents,
getRollupTeams, countDuties from src/constants/parent-duty.js) and
the existing Resend email infrastructure (api/notify.js, with a new
"duty-assigned" case added).

No data migration. No security rule changes. Parent self-signup
unchanged.

## Approach for Claude Code

1. Branch off main: `feature-admin-duty-assign`
2. Find the "Duty roster oversight" section in AdminView
3. Add the ASSIGN DUTIES sub-section (team picker + calendar render)
4. Build the AssignDutyModal (candidate list + notification preview as
   two screens in one modal)
5. Add "duty-assigned" case to api/notify.js for email sending
6. Reuse `src/constants/parent-duty.js` helpers — do not duplicate logic
7. `npm run build` — must pass
8. Commit with the message above
9. DO NOT push

## Flags to surface

- If buildTeamParentList signature doesn't match what's needed for the
  eligibility logic above, adapt — but flag what you changed
- If api/notify.js requires deployment to test the email path, note it
  in the commit message (Vercel auto-deploys on push of main, but the
  branch preview should also handle this)
- Test the WhatsApp path WITHOUT a real phone number too — wa.me
  without a number opens WA and asks admin to pick contact. That's the
  fallback path for missing phone numbers.
- console.log a count of how many sessions are visible per team to
  verify the calendar isn't broken
- If the existing oversight section is currently empty/stub, flag that
  before commit so we can decide whether to flesh it out separately
