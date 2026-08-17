# CricOps Multi-Tenant SaaS — Epic Plan

**Status:** Scoping restart. See "Prior attempt" below — this is not a from-scratch start.
**What this is:** Turning the single-club FCC Training App into CricOps — a multi-tenant product where any club runs on shared infrastructure with isolated data and per-club branding.

---

## Prior attempt (discovered 2026-08-17, not reflected in the rest of this doc)

Two stages of this migration were already built and pushed, staging-only, in May 2026 — then stalled with no Stage 3+ and no merge. Found via Vercel deployment history while debugging an unrelated broken link; this doc previously said "no code work starts yet," which was wrong.

- `feature-auth-foundation` (Stage 0, 2026-05-26): server-side PIN check + Firebase custom-token mint against a separate `cricops-staging` Firebase project. Has an open, never-answered decision point (keep the emergency `0000` PIN bypass server-side or drop it) and an un-stripped debug commit logging uid + custom claims.
- `feature-club-scoped-data` (Stage 2, off Stage 0, 2026-05-27): adds a `cdoc()` helper to `useFirestore.js` and repoints all ~40 `doc(db,"fccnets",key)` calls to `clubs/fredensborg/data/{key}`, plus a one-time migration script. Explicitly scoped staging-only; explicitly deferred updating the prod-facing serverless email functions (`send-reminders.js`, `send-conflict-alert.js`, `send-duty-reminders.js`) to Stage 5.

Neither branch touched production or `main`. Both are now stale — `main` has since gained an unrelated ~4,500-line feature (Ministaevne registration) that these branches don't have, so a straight merge isn't realistic without reconciling that first. The `fccnets/notifsettings` doc added on 2026-08-17 (`fix-notification-plumbing`) also predates this migration and would need the same `cdoc()` treatment if Stage 2 is ever resumed.

Decide before writing new plan content below: resume this chain (rebase Stage 2 onto current `main`, answer the `0000`-bypass question, continue to Stage 3+), or treat it as abandoned and start over. The rest of this document was written without knowing this existed and may need reconciling either way.

---

## The decision, stated plainly

CricOps is the **product**. Each club is a **tenant**. The app brands itself per-club: "CricOps — Fredensborg Cricket Club". Fredensborg is the first (and for now only) tenant. The platform is built for many clubs but operated for one until you choose to open it.

**Decided parameters:**
- **Data isolation:** collection-per-club — `clubs/{clubId}/data/{key}` in one shared Firebase project
- **Onboarding:** built but closed — only Fredensborg runs for now; new-club flow exists but is gated to `owner`
- **Monetisation:** 2-month free trial, then flat fee per club. Build the trial/paid *state* now; defer the actual payment mechanism until a second club is real
- **Roles:** `owner` (you — sees/manages all clubs) → `clubadmin` (per-club admin, was `admin`/`superadmin`) → `member` (per-club). All roles except `owner` are scoped to a single club
- **Billing mechanism:** deferred. Store `{ plan, status, trialEndsAt }` per club; wire Stripe/MobilePay/manual invoicing only when needed

---

## Why this is lower-risk than it looks

The single most important finding from the codebase audit:

> **All 40 references to the `"fccnets"` collection live in ONE file: `src/hooks/useFirestore.js`.**

The entire data-access surface is centralised. Every read (the 18-doc initial load + real-time sync) and every write (the ~20 `saveX` functions) goes through this one hook. That means the hardest part of multi-tenancy — repointing all data access to be club-scoped — is concentrated, not scattered across 16 files.

Change the collection path from `doc(db, "fccnets", key)` to `doc(db, "clubs", clubId, "data", key)` in this one hook, thread a `clubId` through, and the entire app becomes club-scoped. The views, the admin panel, the coach tools — none of them touch Firestore directly, so none of them need to change for data isolation.

This is the difference between "months of risky surgery across the whole app" and "a focused change in one well-understood file plus a config layer plus security rules." Still a serious epic, but a tractable one.

---

## Architecture overview

### Data model — before and after

**Today (single-club):**
```
fccnets/
  sessions, members, pins, teams, recurring, blockcals,
  invitecodes, joinrequests, auditlog, reminderlogs,
  cancelledsessions, seasonplans, attendance, sessionnotes,
  playerprogress, coachoverrides, matchselections,
  captainnotes_templates, parentdutyconfig
  (18 singleton docs, all club-wide)
```

**After (multi-tenant):**
```
clubs/
  fredensborg/                          ← clubId
    profile  { name, productName, logo, theme, plan, status, trialEndsAt, createdAt }
    data/
      sessions, members, pins, teams, ... (same 18 docs, now club-scoped)
  <future-club-id>/
    profile  { ... }
    data/
      sessions, members, ...

cricops/                                ← platform-level (owner only)
  clubs-index   { [clubId]: { name, status, memberCount, lastActive } }
  owners        { [uid]: true }
```

Each club is a fully isolated subtree. No query ever crosses a club boundary except the owner-level index.

### Branding layer (the visible part of the rebrand)

A single `clubProfile` object, loaded once at app start from `clubs/{clubId}/profile`, drives all branding:

```js
clubProfile = {
  productName: "CricOps",
  clubName: "Fredensborg Cricket Club",
  shortName: "Fredensborg",        // for compact UI
  logo: "<url or asset key>",
  theme: "forest",                 // existing theme key
  plan: "trial",
  status: "active",
  trialEndsAt: <timestamp>,
}
```

Every hardcoded brand string in the app (header, splash, login, help, ICS calendar exports) reads from this object. Display format: `{productName} — {clubName}` or `{productName}` alone where space is tight.

⚠️ **IMPORTANT — team names are NOT branding.** "Fredensborg 2", "Fredensborg 3" in `constants/fixtures.js` and `fixture-sync.js` are real DCF league team names. They are tenant *data*, not product branding. They stay exactly as they are and move into `clubs/fredensborg/data/teams` + fixtures. Do not touch them during the branding rename.

### Resolving "which club am I?"

For the native apps and web, the app needs to know which tenant it's serving:

- **v1 (Fredensborg only):** `clubId` is hardcoded to `"fredensborg"` via a build-time constant / env var. Zero ambiguity, zero risk.
- **Later (multi-club):** resolve `clubId` from one of — subdomain (`fredensborg.cricops.app`), a club-code entered at first launch, or the logged-in member's `clubId`. Decide at open-up time. The hardcoded constant becomes a resolver function — a small change because everything already reads from one place.

### Roles across tenants

```
owner       → CricOps operator (you). Not tied to a club. Can list all clubs,
              create/suspend clubs, impersonate a clubadmin for support.
clubadmin   → per-club admin. Full admin powers WITHIN their club only.
              (replaces today's "superadmin" + "admin" within a club)
member      → per-club member (player/parent). As today.
```

Member records gain a `clubId`. Auth resolves the member → their club → loads that club's data. The `owner` role lives in `cricops/owners`, separate from any club's member list.

---

## Security rules — THE critical risk area

🚨 **HARD RULE — non-negotiable, references the 12 May 2026 incident:**

Multi-tenancy is enforced primarily by Firestore security rules. Getting them wrong either (a) breaks the live app (as on 12 May, when `fccnets` rules went from `"if true"` to auth-required with no staging and broke production), or (b) leaks one club's data to another.

**Therefore:**
1. **A separate staging Firebase project is created FIRST**, before any rules work. All rules development and testing happens there against seed data.
2. Production rules are NEVER edited directly. Changes are validated on staging, then applied to production only after the app has been verified against them on staging.
3. The migration of Fredensborg's live data is rehearsed on staging end-to-end before it touches production.
4. Rules are tested with the Firebase Rules emulator + unit tests covering cross-tenant access attempts (club A trying to read club B must fail).

The rules model, roughly:
- `clubs/{clubId}/data/{doc}` — readable/writable only by members whose token resolves to that `clubId`, with writes further gated by role
- `clubs/{clubId}/profile` — readable by club members, writable by clubadmin + owner
- `cricops/**` — owner only

Because today's app uses PIN-based auth (not Firebase Auth), there's a prerequisite question (see Open Questions): rules can only enforce tenant isolation if the client is authenticated in a way Firestore rules can see. This likely means introducing Firebase Anonymous Auth or custom tokens. **This is the single biggest technical dependency in the epic** and is called out as Stage 0.

---

## Stage-gated plan

### Stage 0 — Auth foundation + staging project (prerequisite) — RESOLVED

The thing everything else depends on. Today's PIN auth is invisible to Firestore rules, so true tenant isolation isn't enforceable yet.

**Decided approach (May 2026): custom Firebase tokens on a stable per-member UID, with server-side PIN validation.**

Why this and not the alternatives:
- Pure Anonymous Auth gives a throwaway UID each login, so custom claims sit on a disposable identity and per-user rules + native "remember me" get messy. Stable UID is cleaner.
- Custom token on `uid = memberId` means rules can do `request.auth.uid == memberId` for self-edit, and `request.auth.token.clubId` for tenant scope.
- Since a Vercel mint-function is needed regardless, it also validates the PIN server-side — closing a real hole: today `fccnets/pins` is client-readable, so anyone can pull hashed 4-digit PINs and brute-force them offline. Server-side validation means the pins doc is never shipped to the client.

**The login flow (UI unchanged for members):**
1. Member picks name + enters PIN (existing UI)
2. Client POSTs `{ memberId, pin }` to new Vercel function `/api/auth-token`
3. Function (Firebase Admin SDK) reads the pins doc server-side, verifies the hash; if valid, mints a custom token with `uid = memberId` and claims `{ clubId, role }`
4. Client calls `signInWithCustomToken(token)` → real Firebase session
5. Every Firestore request now carries verifiable `uid + clubId + role`; rules enforce club isolation

**Tasks:**
- Stand up a separate **staging Firebase project** (mirrors production, throwaway data) — all of this is built and tested here first
- Enable Firebase Auth (custom token provider) on staging
- Write `/api/auth-token` Vercel function (Admin SDK, server-side PIN check, token mint)
- Add Firebase Auth init + `signInWithCustomToken` call after PIN success in `useAuth.js`
- Store the Admin SDK service-account key as a Vercel environment secret (never in the repo)
- Handle token refresh / re-auth on expiry
- Prove: a logged-in client carries a verifiable identity (uid + clubId + role) that rules can read on staging

**Note for native apps:** the custom-token session persists on device and pairs cleanly with biometric login — biometric unlock re-uses the stored session rather than re-entering the PIN. This is the foundation the native epic's biometric feature builds on.

**Gate:** rules on staging can distinguish "this client belongs to club X with role Y"; PIN validation happens server-side; pins doc is no longer client-readable.

### Stage 1 — Branding layer (`clubProfile`) — SHIP THIS INDEPENDENTLY
The cosmetic rebrand, decoupled from all the hard stuff. Safe, fast, shippable on its own.

- Introduce `clubProfile` object, hardcoded to Fredensborg for now
- Replace every brand string (`"FCC Training"`, header subtitle, splash, login, help, ICS export) with `clubProfile` references
- Display "CricOps — Fredensborg Cricket Club" in the header
- Leave team names / fixtures / league data untouched
- **Gate:** app shows CricOps branding, nothing else changed, fixtures still work. Ship to production as its own PR.

### Stage 2 — Club-scoped data layer (staging only)
The core repoint. Done entirely on staging against copied data.

- Add `clubId` constant (hardcoded `"fredensborg"`)
- Change `useFirestore.js` collection paths from `fccnets/{key}` to `clubs/{clubId}/data/{key}`
- Thread `clubId` through reads, writes, backup writes, audit log
- Migrate a *copy* of Fredensborg data into `clubs/fredensborg/data/` on staging
- Verify the entire app works against the new paths on staging
- **Gate:** full app works on staging reading/writing club-scoped paths

### Stage 3 — Tenant isolation rules (staging only)
Lock the boundaries.

- Write security rules enforcing per-club read/write + role gating
- Rules emulator tests: cross-tenant access denied, role escalation denied
- Add a second throwaway test club on staging; prove zero data bleed between them
- **Gate:** automated rules tests pass; manual cross-tenant probing fails as expected

### Stage 4 — Role model + owner console (staging only)
The platform layer.

- Implement `owner` / `clubadmin` / `member` roles
- Minimal owner console: list clubs, see status/member counts, suspend/activate a club
- Per-club `profile` doc with `{ plan, status, trialEndsAt }` (billing *state*, no payment yet)
- **Gate:** owner can see Fredensborg + test club; clubadmin sees only their own

### Stage 5 — Production migration (the careful one)
Move the real Fredensborg onto the new architecture.

- Full dress rehearsal on staging first (already done in Stage 2, repeat with final code)
- Maintenance-window migration of live Fredensborg data into `clubs/fredensborg/`
- Apply tested rules to production (validated on staging, never hand-edited)
- Smoke-test every flow on production
- Keep the old `fccnets/*` docs as a read-only backup for a grace period; delete only after confidence
- **Gate:** Fredensborg fully live on multi-tenant infra, no regressions

### Stage 6 — Onboarding flow (built, gated closed)
The new-club path — exists but only `owner` can use it.

- Club creation: name, short name, theme, first clubadmin, seed teams
- Generates `clubs/{newId}/` subtree + profile with 2-month trial
- Gated to `owner` only — not public
- **Gate:** you can create a real second club from the owner console when ready

### Stage 7 (deferred) — Open up + billing
Only when you decide to actually sell it.

- Public/invite club signup
- Trial→paid enforcement, payment mechanism (Stripe / MobilePay / manual — decide then)
- Suspension on non-payment
- **Not scheduled.** Switch on when a real second club wants in.

---

## How this interacts with the native apps epic

This is the crucial sequencing point. **Multi-tenancy should be settled before the native apps ship publicly**, because:

- The native apps bake in how the app resolves "which club" — if that's hardcoded to Fredensborg and you later go multi-club, you'd ship an app update to every club's phone to change it
- The auth foundation (Stage 0) affects biometric login in the native epic
- Push notification tokens need to be club-scoped (a push for Fredensborg must never go to another club's members)

**Recommended combined sequence:**
1. Admin reorg PR (in progress) → merge
2. Mobile-web-tweaks PR (safe-area, touch-action) → merge
3. **CricOps Stage 1 (branding layer)** → merge — gets the rebrand live cheaply
4. CricOps Stage 0 (auth foundation + staging) — unblocks both epics
5. CricOps Stages 2–5 (data layer, rules, roles, migration) — on staging, then careful production cutover
6. THEN native apps Stages 1–5 — built on the multi-tenant, properly-authed base
7. CricOps Stage 6 (onboarding) and Stage 7 (billing) — when you want to grow

Stage 1 branding ships now and independently. Everything else gates behind the auth foundation.

---

## Open questions to resolve before Stage 0

1. **Auth mechanism** — the big one. Options: (a) Firebase Anonymous Auth tied to member record, (b) custom tokens minted server-side after PIN verification, (c) move to full Firebase Auth (email/password or phone). This affects rules, biometric login, and effort. Needs a dedicated discussion — it's the technical lynchpin.
2. **clubId resolution at open-up time** — subdomain vs club-code vs member-derived. Deferrable to Stage 7, but worth a view early since it touches the native apps.
3. **PIN model under multi-tenancy** — PINs are currently club-wide-unique-ish. Across clubs, two members in different clubs could share a PIN — fine if auth resolves club first. Confirm.
4. **Data residency / GDPR** — multiple clubs' personal data on one project. As an EU operation (Denmark), worth a brief check on what per-club data-processing terms you'd need before charging clubs.
5. **Backup strategy per club** — today's `members_backup_{date}` pattern needs to become club-scoped.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Security rules break production again | HIGH | Staging-first hard gate. Never edit prod rules directly. Rehearse migration on staging. |
| Cross-tenant data leak | HIGH | Rules emulator tests for cross-tenant denial; two-club bleed test before any real second club |
| Auth foundation harder than expected | MEDIUM | Stage 0 is isolated and gated; if it stalls, Stage 1 branding still shipped value |
| Production migration data loss | HIGH | Keep `fccnets/*` as read-only backup; delete only after grace period |
| Scope creep into full SaaS before ready | MEDIUM | Stages 6–7 explicitly deferred; build capability, don't operate it |
| Native apps ship single-club then need rework | MEDIUM | Sequence multi-tenancy before public native launch |

---

## What ships when (summary)

- **Now, independently:** Stage 1 branding (CricOps — Fredensborg Cricket Club live)
- **Foundation:** Stage 0 auth + staging project
- **On staging, then careful prod cutover:** Stages 2–5
- **Built but closed:** Stage 6 onboarding
- **Deferred until you sell it:** Stage 7 billing + public signup

Fredensborg runs on multi-tenant infrastructure as tenant #1. The product is ready for more clubs whenever you choose, without a rewrite.

---

## Immediate next step

Before any of this starts: **the auth mechanism (Open Question 1) needs its own focused discussion.** It's the lynchpin — it determines whether tenant isolation is even enforceable, and it affects the native apps' biometric login. Everything in Stages 0+ depends on it. Stage 1 branding can proceed in parallel since it's independent.

End of epic plan.
