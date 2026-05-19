# Conversational signup + email verification

A from-scratch rebuild of the signup ("Request to Join") flow.

## Why we're doing this

Three observed problems with the current flow:

1. **Duplicates created daily** — new families don't realise they're
   already in the app (admin added them earlier, or coach added them).
   They submit a fresh join request, admin has duplicate-management work.
2. **Parents skip their own signup** — they create a child account but
   not themselves, leaving the kid orphaned. The new LinkParentModal
   patches over this but it's an after-the-fact fix.
3. **Admin approval queue burns Reuben's time** — every signup needs
   manual review, no triage, no pre-screen.

A fourth problem we want to address proactively:

4. **No email verification** — anyone can claim any email. Combined
   with auto-creation pressure, this lets bad actors set up accounts
   using someone else's identity.

## Big picture: the new flow

A guided, conversational onboarding that asks ONE question at a time.
Steps adapt based on who's joining (self / child / both). Search-first
prevents duplicates. Email verification proves identity before admin
review. Admin still has final say but their queue is pre-screened.

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: Who's joining?                                 │
│   [ Just me ] [ My child ] [ Me + my child ]            │
├─────────────────────────────────────────────────────────┤
│  Step 2: Look up — am I/is my child already here?       │
│   "Your name?" → live search → matches shown →          │
│   "Is this you?" / "Not me, continue"                   │
├─────────────────────────────────────────────────────────┤
│  Step 3: Phone (if not found)                           │
│   "+45 ..." (Danish norm — WhatsApp primary)            │
├─────────────────────────────────────────────────────────┤
│  Step 4: Email + verify                                 │
│   Code sent via Resend (existing infrastructure)        │
│   User enters 6-digit code                              │
├─────────────────────────────────────────────────────────┤
│  Step 5: Team — what age group / division?              │
│   (for self path) OR Step 2-4 repeat for child          │
├─────────────────────────────────────────────────────────┤
│  Step 6: Review + submit                                │
│   Shows all entered data, "Submit" sends to admin       │
├─────────────────────────────────────────────────────────┤
│  Step 7: Done                                           │
│   "Reuben will approve your account shortly.            │
│    We'll email you when you're in."                     │
└─────────────────────────────────────────────────────────┘
```

## Architecture

### Files to change

- `src/App.jsx` — current `submitJoinRequest` flow lives here (around
  line 4243); replace with state machine that drives the conversational
  flow
- Possibly: `src/views/SignupFlow.jsx` (new) — extract the entire flow
  into its own view if AdminView/ProfileView precedent applies
- `api/send-verify.js` — already exists, no changes needed
- `api/notify.js` — already exists; reuses joinrequest type
- `src/constants/seeds.js` — `normMember` already canonical, no changes

### State machine

The flow is driven by a single `signupState` object instead of dozens
of useState hooks. This makes the flow easier to reason about, navigate
back/forward, and persist across reloads.

```js
const [signupState, setSignupState] = useState({
  step: "who",  // who | lookup_self | phone_self | email_self | code_self |
                // team_self | lookup_child | team_child | phone_child |
                // email_child | code_child | review | done
  who: null,    // "me" | "child" | "both"
  
  // Self data
  selfName: "",
  selfMatch: null,        // existing member found by search
  selfPhone: "",
  selfEmail: "",
  selfEmailCode: "",      // user-entered code
  selfEmailVerified: false,
  selfTeam: "",
  
  // Child data
  childName: "",
  childMatch: null,
  childTeam: "",
  
  // Email verify
  sentCode: null,
  sentCodeExpiry: null,
  sentCodeEmail: null,
});
```

Persist to localStorage on every change so a refresh doesn't lose
progress. Key: `fcc-signup-state`. Auto-clear after submission.

### "Back" navigation

Each step has a small back chevron in the top-left. Tap → goes to
previous step, state preserved. Steps form a graph based on `who`:

- `who = "me"`: who → lookup_self → phone_self → email_self → code_self → team_self → review → done
- `who = "child"`: who → lookup_self → phone_self → email_self → code_self → lookup_child → team_child → review → done
- `who = "both"`: who → lookup_self → phone_self → email_self → code_self → team_self → lookup_child → team_child → review → done

Even when registering for a child, we capture the parent's data FIRST
and verify their email FIRST. This solves problem #2 by making it
structurally impossible to skip yourself.

## Step-by-step UI specification

### Step 1: WHO

A clean intro screen with three large buttons:

```jsx
"Hi! Let's get you signed up."
"Are you joining as..."

[ 🙋 Just me ]              ← single adult player
[ 👶 My child ]             ← parent registering kid only
[ 🙋👶 Me + my child ]      ← parent who also plays (cricket parent who's also a player)
```

Tapping sets `who` and advances to `lookup_self`.

### Step 2: LOOKUP — search-first

Header changes based on context:
- `who="me"` → "Let's see if you're already in our system. What's your full name?"
- `who="child"` or `"both"` → "Let's see if YOU are already in our system. What's your full name?" (clarify it's the adult, not the kid)

Input: name field, autofocus.

**Search behaviour:**

- Fires after 3+ characters typed
- Debounced 300ms
- Returns max 3 matches, "show more" if >3
- Each result shows:
  - First name + last initial (e.g. "Aniket R.")
  - Team(s) badge (e.g. "U13 · Div 2")
  - **NO email/phone shown** — that's the privacy filter
- Each result is tappable: "Yes, this is me"
- "Nope, none of these are me" button below results

**On match selected:**
- Mark `selfMatch = matchedMember`
- Skip phone/email-collect steps (we already have them, but we still need to verify email)
- Jump to `code_self` (send verification code to the email on file)
- Header in code step: "Welcome back, {firstName}! Let's confirm your email."

**On "Not me, continue":**
- Clear any partial match
- Proceed to `phone_self`

**No match found:**
- Show "Looks like you're new — let's set up your account"
- Auto-advance to `phone_self` after 1.5s

### Step 3: PHONE

"What's your phone number?"
"We'll use WhatsApp for quick updates."

Single input, type="tel". Pre-fill with "+45 " for Danish users.
Validation: at least 8 digits after country code. Optional but
encouraged. Skip button: "Add later".

### Step 4: EMAIL

"What's your email address?"
"We'll send a 6-digit code to confirm it."

Single input, type="email". Validation: standard email regex.
Tap "Continue" → fires `sendCode()` via existing infrastructure.
Show loading spinner while waiting.

### Step 5: CODE

"We sent a code to {email}."
"Enter it below to confirm."

6-digit code input (large, easy to tap, auto-advance between digits).
"Resend code" link below — fires sendCode() again with a fresh code,
shows toast "New code sent."
"Wrong email?" link → goes back to step 4 to edit.

Code valid 15 min (existing send-verify behaviour).

**On code correct:**
- Mark `selfEmailVerified: true`
- For new users: advance to `team_self`
- For matched users: skip team (we already have it), advance to `review`

**On code wrong:**
- Show inline error, allow retry
- After 3 wrong attempts: "Too many tries. Tap Resend for a fresh code."

### Step 6: TEAM (self)

"Which team are you joining?"

Dropdown of all senior + youth teams. Pre-filtered for adults if
`who="me"` (no youth teams shown — those are for the child path).

For `who="me"`: dropdown options include senior teams (Div 2/3/4,
T20 series, OB, Legends, Women's).

For `who="both"`: same — assumes adult is the player here.

### Step 7-9: CHILD repeat

If `who="child"` or `who="both"`, repeat the same lookup/team flow for
the child:

- `lookup_child`: search for child's name. Same UI as adult lookup.
  Search filtered to junior teams only (kids).
- `team_child`: dropdown of junior teams only. "I'm not sure yet"
  option preserved (current behaviour).
- NO phone/email/code steps for the child — children inherit the
  parent's email per our LinkChildModal email pre-fill convention.

**Critical**: link the child to the parent at submission time. The
`children` array on the parent and `parentId`/`parentName` on the
child must be set. Reuse existing helpers from `src/constants/seeds.js`
to ensure consistency.

### Step 10: REVIEW

Summary screen showing all entered data:

```
You ✓ (email verified)
  Priya Sharma
  +45 71 23 45 67
  priya@gmail.com
  Team: U13 parent

Your child
  Aarav Sharma
  Team: U13

[ Submit signup ]   [ Edit any step → ]
```

The "Edit any step" link opens a small selector to jump back to any
specific step. Submit creates the join request (one or two member
records depending on `who`) and proceeds to `done`.

### Step 11: DONE

```
🎉 You're submitted!

Reuben will review and approve your account shortly.
You'll get an email when it's ready.
```

Single back-to-login button.

## What gets written when?

### On code verification success:
- Email is marked verified IMMEDIATELY (member record's `emailVerified: true`)
- BUT the member is still in a "pending" state — admin hasn't approved yet
- This lets us distinguish "pre-approved verified email" from "post-approval active account"

### On final submission:
- Create joinRequest records (one for parent, one for child if applicable)
- Status: `pending`
- `emailVerified: true` carried through to the request
- `parentLinkId` on the child's request points to the parent's request
- Notification email fires to admin (existing `/api/notify` with type
  `joinrequest`, enriched with `verifiedEmail: true` flag)

### On admin approval (no change to existing flow):
- Member records created
- If approving a child request, ALSO approve the linked parent request
  (they're a pair, can't approve one without the other)
- Link them via `children` / `parentId` immediately

## Search privacy filter

The `lookup_self` and `lookup_child` searches must return SAFE shapes:

```js
// Server-side or client-side search returns:
{
  firstName: "Aniket",
  lastInitial: "R",
  teams: ["U13", "Div 2"],
  id: <memberId>  // used only to bind a match selection
  // NO email, NO phone, NO full last name, NO parentId
}
```

If you implement the search client-side (since `members` is in app
state), apply the filter in the search function before rendering.
Never let the result render reveal more than name + team badges.

## Admin queue — pre-screen summary

Inside `Coach HQ → Join Requests` (existing UI), enrich the display
of each request with:

- ✓ Email verified (green) / ✗ Email not yet verified (red)
- Phone number with country code visible
- Team requested
- If parent+child request: shown as a linked pair (one card with both
  rows visible)
- Action buttons: Approve (one tap for verified, asks for confirmation
  if not verified) / Decline / Edit before approve

A "verified by user" stamp goes a long way — admin can trust the
identity less manually.

## Auto-approval — DELIBERATELY NOT IN V1

We discussed this. Conclusion: even with email verification, full
auto-approval has too many risks for a youth sports club:
- Anyone with an email could create "I'm Aarav's parent" without
  being legit
- Senior team rosters have DCF eligibility rules

Keep manual approval. The pre-screen does the heavy work.

Future v2 considerations (NOT in this build):
- Auto-approve if the email domain matches existing club members
  (e.g. someone with gmail.com signing up — fine; someone with a
  fresh tempmail.org — flagged for admin)
- Auto-approve children when parent is already an approved member
  with verified email

## Edge cases to handle

1. **User abandons mid-flow**: localStorage preserves state. Coming
   back resumes where they left off, up to 24 hours, then state
   expires.

2. **Code expires while user types it**: Show "Code expired — tap
   Resend" inline; don't kick them back to the email step.

3. **Search returns 50 matches** (someone types "S"): UI shows first
   3 + count of others ("12 more — try a longer search").

4. **User found in match but their existing email is wrong**:
   Click match → code sent to old email → user can't access → "Wrong
   email?" link in code step → goes back to email step → updates
   email → new code sent → on verify, ALSO updates the matched
   member's email field.

5. **Parent registers child but child name matches existing kid**:
   Match shows. Parent confirms it's their kid. We link via parentId,
   not creating a duplicate. Admin sees "parent linking to existing
   child {X}" and can confirm.

6. **Parent already has a verified account, just adding another kid**:
   They sign in normally, use the existing Profile → My Family →
   "+ Create New Child Profile" flow. Don't redirect through signup.
   Detect this: if user is already logged in, the join flow link is
   hidden.

7. **Tabbed flow on mobile**: localStorage persistence covers tab
   close → reopen. But if the user opens TWO tabs and progresses both,
   they'll clash. Show a banner if state in another tab progresses
   beyond the current tab's step: "This signup was continued in
   another tab. Refresh to sync."

## What stays the same

- The existing self-verify flow at App.jsx:4420+ for *already-logged-in
  members* updating their email — that stays unchanged. It's used in
  a different context (Profile → Edit Email) and works fine.
- `/api/send-verify.js` and `/api/notify.js` — no backend changes
- `normMember` and `uid` helpers — no changes
- Admin approval flow — no changes (just enriched display)
- All existing member self-linking and admin-linking UI — no changes

## What we're NOT building

- Auto-approval (deliberate — see section above)
- Email-domain whitelisting (v2)
- "Find an admin" or "Contact us" channel within the flow (admin's
  WhatsApp / website covers this)
- Multi-language support (Danish/English toggle) — possible v2
- Login-time email verification for existing members not yet verified
  (separate concern)
- Bulk import of new members from CSV (separate concern)
- Captcha / bot protection (Resend's email verification IS the bot
  mitigation — bots can't intercept the code without a real inbox)
- Account merge tool for cases where a duplicate was created in the
  past (handled separately by admin)

## Acceptance criteria

### Flow logic
1. "Just me" path produces 1 member record with `emailVerified: true`
2. "My child" path produces 2 member records (parent + child), linked
3. "Me + my child" path also produces 2 records, linked, both with
   email verified... but wait — only parent verifies email. Child
   inherits.
4. Search returns matches by name; max 3 visible, more available via
   "show more"
5. Search returns NO email/phone/full surname for any match
6. Tapping a match → skips phone/email collection → just verifies
   email via code
7. Email verification flow works end-to-end (code sent, expires in
   15 min, "Resend" works, "Wrong email?" loops back)
8. localStorage preserves state across refresh within 24 hours
9. Submit creates joinRequest record(s) with `status: "pending"` AND
   `emailVerified: true`

### Privacy
10. Search response does NOT leak email/phone/parent linkage of
    existing members

### Admin queue
11. Pending requests display ✓/✗ for email verification
12. Parent+child pairs shown as a linked pair (not separately)
13. Approving a parent+child pair approves both at once

### Data integrity
14. Parent and child are linked at approval (children + parentId both
    set) — same path the LinkChildModal/LinkParentModal already use
15. No duplicate member records created if a match was selected during
    lookup

### UX
16. Each step has clear "back" navigation
17. "Edit any step" on review screen jumps to that step with state
    preserved
18. Code input auto-advances between digits, accepts paste

## Commit message

feat: conversational signup with email verification

Replaces the single-screen "Request to Join" form with a guided,
step-by-step onboarding flow:

- Adapts to "just me / my child / me + my child" upfront
- Searches existing members FIRST so people can identify themselves
  instead of creating duplicates (privacy-filtered — name + team
  only, no contact info)
- Forces parent account creation alongside child account (no more
  orphan kids on signup)
- Verifies email via 6-digit code (reuses existing /api/send-verify
  Resend infrastructure)
- Each step is one question; localStorage persistence so reloads
  don't lose progress
- Admin approval queue now shows verification status, treats
  parent+child pairs as one approval

Solves four observed pain points: duplicate accounts created by
people who didn't realise they were already in the app, parents
skipping their own signup when registering a child, no verification
of email ownership, and admin spending time triaging requests that
could have been pre-screened.

No data migration. No security rule changes. Existing self-verify
flow for logged-in members editing their email stays unchanged.

## Approach for Claude Code

1. Branch off main: `feature-conversational-signup`
2. Find and read the existing join request UI in App.jsx around
   line 4243+. Also read the existing email verify flow around
   line 4420+ (different code path, reuse its helpers).
3. Build new SignupFlow component (consider extracting to
   src/views/SignupFlow.jsx). State machine pattern with one
   `signupState` object.
4. Implement each step UI per spec. Mobile-first sizing (44px touch
   targets, single-column).
5. Wire up the existing /api/send-verify endpoint for the code step
   (same call pattern as in App.jsx line 4427).
6. Update the join request submission to enrich data with
   emailVerified: true, parentLinkId for paired records, etc.
7. Update the admin Join Requests display to show new fields.
8. Test all three paths end-to-end on localhost.
9. `npm run build` — must pass
10. Commit with the message above
11. DO NOT push — we'll do PR review carefully on this one

## Flags to surface

- This is a much larger change than recent patches. Expect 1500-2500
  line diff. Don't refactor anything you don't have to — focus on
  the new flow.
- The existing self-verify flow (line 4420+) and the new conversational
  signup MUST NOT collide. They're different entry points. Make sure
  state variables don't conflict.
- If extracting to src/views/SignupFlow.jsx, ensure all needed context
  (members, teams, saveMembers, saveJoinRequests, etc) flows down
  properly. Match how AdminView/ProfileView receive context.
- Test the email verify path with a real email address before
  declaring it works — the code is sent via Resend so you need
  network access.
- The "show me more" search results pagination is described but not
  critical. If easier, just show top 5 with no "show more" — flag
  what you did.
- Children that "inherit" the parent's email: set the child's email
  field to the parent's, set emailVerified to true (since the parent
  verified it). This matches LinkChildModal's existing pre-fill.

## Risk assessment

- **HIGH risk of breaking existing signup**. The current flow works
  (just with the problems we noted). The new flow is a replacement.
  Test thoroughly before merging — don't merge until you've tried
  all three paths (just me / child / both) end-to-end and verified
  records land correctly.
- **MEDIUM risk of breaking admin queue**. The display changes are
  additive but the data shape on join requests changes slightly
  (emailVerified, parentLinkId). Make sure existing pending requests
  still render correctly.
- **LOW risk of breaking email verify infrastructure**. We're reusing
  existing code; not changing the endpoint.
