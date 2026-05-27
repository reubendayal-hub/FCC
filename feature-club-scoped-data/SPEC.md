# CricOps Stage 2 — Club-Scoped Data Layer SPEC

**Branch:** `feature-club-scoped-data` (off `feature-auth-foundation`, NOT off main — see note)
**Environment:** STAGING (cricops-staging) ONLY. Production never touched in this stage.
**Risk:** HIGH — this repoints every data read/write. Mitigated by: staging-only, single-file change, a one-helper pattern, and a tested data migration.

---

## 🚨 STOP — Prerequisites (verify before implementing)

1. `feature-auth-foundation` is pushed and working on staging (Stage 0 verified — login mints token with `clubId: fredensborg`). ✅ (done 26 May 2026)
2. The `[AUTH DEBUG]` block has been stripped from `useAuth.js`.
3. cricops-staging Firestore currently holds the seed data under the OLD path `fccnets/*` (members, pins). This stage MIGRATES that to the new path.
4. All work happens against cricops-staging via Vercel preview. Confirm `VITE_FIREBASE_PROJECT_ID=cricops-staging` in the preview env.

**Branch note:** branch this OFF `feature-auth-foundation` (not main), because Stage 2 needs the auth/clubId work. This is the ONE allowed exception to "branch off main" — Stages 0→2→3 form a stacked chain that merges together later. Document this clearly so it's not mistaken for the past branching incident.

---

## Goal

Repoint the entire data layer from the single-club path `fccnets/{key}` to the club-scoped path `clubs/{clubId}/data/{key}`, with `clubId` hardcoded to `"fredensborg"` for now. After this stage, all reads and writes are club-scoped, and the app works identically — just reading/writing from a club subtree instead of the flat collection.

No UX change. No new features. Pure structural repoint + a data migration.

---

## The core pattern (keep it this simple)

ALL 40 data references live in `src/hooks/useFirestore.js` and follow ONE pattern: `doc(db, "fccnets", <key>)`. The change is mechanical:

1. Add a club constant and a single helper at the top of the hook:

```js
// Hardcoded for now; becomes a resolver in the multi-club open-up stage.
const CLUB_ID = import.meta.env.VITE_CLUB_ID || "fredensborg";

// Club-scoped doc helper — replaces all doc(db,"fccnets",key) calls.
const cdoc = (key) => doc(db, "clubs", CLUB_ID, "data", key);
```

2. Replace EVERY `doc(db,"fccnets",X)` with `cdoc(X)`. That covers:
   - The `refs` map (lines ~57-74)
   - `parentdutyconfig` onSnapshot (line ~169)
   - `captainnotes_templates` seed write (line ~150)
   - All ~20 `saveX` functions (lines ~187-263)
   - The members backup write (line ~211, `backupKey`)
   - The audit log writes (lines ~247, ~263)

3. Nothing else in the file changes. Same keys, same `{value: JSON.stringify(...)}` shape, same logic.

That's the entire code change. One constant, one helper, find-and-replace the path. Minimal diff = easy review = low risk.

---

## Data migration (staging)

The code now reads `clubs/fredensborg/data/*`, but the seed data is at `fccnets/*`. Migrate it.

**Approach: a one-time migration script run against staging**, NOT an in-app auto-migration (in-app migration on every load is fragile and we want this controlled).

Write a standalone Node script `scripts/migrate-to-club-scoped.mjs` that:
- Connects to cricops-staging using the Admin SDK (the staging service-account JSON)
- Reads every doc under `fccnets/` (the known keys list — sessions, members, pins, teams, recurring, blockcals, invitecodes, joinrequests, auditlog, reminderlogs, cancelledsessions, seasonplans, attendance, sessionnotes, playerprogress, coachoverrides, matchselections, captainnotes_templates, parentdutyconfig)
- Writes each to `clubs/fredensborg/data/{sameKey}` preserving the exact `{value: ...}` shape
- Does NOT delete the old `fccnets/*` docs (keep as backup)
- Prints a summary: how many docs copied, any missing
- Is idempotent — safe to run twice (overwrites, doesn't duplicate)

The script reads the key list from a shared constant so it stays in sync. Run it manually against staging, confirm the `clubs/fredensborg/data/*` subtree is populated, THEN deploy the repointed code to preview.

---

## Also update: the auth-token function path

`api/auth-token.js` currently reads pins from `PINS_PATH = "fccnets/pins"` (a constant at the top, per Stage 0 design). Update that constant to the club-scoped path:

```js
const CLUB_ID = "fredensborg";
const PINS_PATH = `clubs/${CLUB_ID}/data/pins`;
const MEMBERS_PATH = `clubs/${CLUB_ID}/data/members`;
```

Confirm the Admin SDK `.doc()` / `.collection()` calls in that function use the new nested path correctly (Admin SDK uses `db.doc("clubs/fredensborg/data/pins")` or `db.collection("clubs").doc("fredensborg").collection("data").doc("pins")`).

---

## What about the serverless email functions?

`api/send-reminders.js`, `api/send-conflict-alert.js`, `api/send-duty-reminders.js` also read `fccnets/*` via the REST API. For Stage 2 on STAGING, these are not exercised (no emails sent in testing). BUT note them: they will need the same path update before production cutover (Stage 5). For now, leave them, and add a TODO comment at the top of each noting the path must change to club-scoped before prod migration. Do NOT change them in this stage — they're prod-facing and out of scope here.

---

## Acceptance criteria (all on STAGING preview)

1. Migration script run; `clubs/fredensborg/data/*` populated with all keys present in `fccnets/*`.
2. App loads on preview, reads all data from the club-scoped path — schedule, members, sessions all render as before.
3. A write (e.g. edit a member, toggle a session) persists to `clubs/fredensborg/data/*`, NOT to `fccnets/*` (verify in Firestore console — the old docs stay frozen, new writes go to the club subtree).
4. Login still works (Alice/1234, Bob/4321) — `auth-token.js` reads pins from the new path.
5. `npm run build` passes.
6. `grep -c 'doc(db,"fccnets"' src/hooks/useFirestore.js` returns 0 (all repointed).
7. Production fcc-nets untouched. No prod env vars added/changed.

---

## Out of scope for Stage 2

- Security rules enforcing isolation (that's Stage 3 — Stage 2 just moves the data; staging rules stay permissive-but-authed for now)
- Updating the prod-facing email functions (Stage 5 cutover)
- Removing old `fccnets/*` docs (kept as backup)
- Multi-club clubId resolution (stays hardcoded "fredensborg")
- Production migration (Stage 5)

---

## Rollback

- Code change is one file + one new script. Revert the branch to roll back code.
- Migration only COPIES data (never deletes `fccnets/*`), so there's nothing to undo data-wise — the old path remains intact and the old code (on main) still reads it.
- All staging. Production is never touched in this stage.
