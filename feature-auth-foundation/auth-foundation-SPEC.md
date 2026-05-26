# CricOps Stage 0 — Auth Foundation SPEC

**Branch:** `feature-auth-foundation`
**Off:** main (up to date, with mobile-nav-polish merged)
**Environment:** STAGING Firebase project ONLY. Never production.
**Risk:** HIGH (touches auth + is the gateway to rules). Mitigated by staging-only + manual gates below.

---

## 🚨 STOP — Manual prerequisites (a human must do these FIRST)

This SPEC must NOT be implemented until ALL of the following exist. If any are missing, STOP and tell Reuben which prerequisite is not met. Do not scaffold placeholders, do not proceed against production, do not invent credentials.

1. **A separate staging Firebase project exists** — distinct project ID from production (e.g. `cricops-staging`), created in the Firebase console by Reuben. Confirm the project ID is NOT the production one.
2. **Firebase Auth is enabled** on the staging project (Authentication → Get Started).
3. **An Admin SDK service-account key** for the STAGING project has been generated (Project Settings → Service Accounts → Generate new private key) and its contents stored as Vercel environment variables for a **preview/staging deployment only** — NOT production env. Variable name: `FIREBASE_ADMIN_SA_STAGING` (the full JSON, or split into project_id / client_email / private_key).
4. **A staging Firestore database** seeded with a copy of throwaway test data (a few members + a pins doc). NOT a copy of live member PII unless Reuben explicitly approves.
5. **The staging Firebase web config** (apiKey, authDomain, projectId, etc.) is available as Vercel env vars for the staging deployment, separate from prod config.

If these are confirmed, proceed. The whole point of staging is that mistakes here cost nothing.

---

## Goal

Replace client-only PIN auth with a server-validated custom-token flow, so Firestore requests carry a verifiable identity (`uid + clubId + role`). This is the prerequisite for tenant isolation (Stage 3) and native biometric login.

**Member-facing UX does not change.** Pick name → enter PIN, exactly as today. The change is entirely under the hood.

---

## The flow being built

1. Member picks name + enters PIN (existing UI in `useAuth.js` — unchanged)
2. On PIN submit, client POSTs `{ memberId, pin }` to new Vercel function `/api/auth-token`
3. Function (Firebase Admin SDK, STAGING credentials):
   - Reads the `pins` doc server-side (`clubs/fredensborg/data/pins` or, pre-migration, `fccnets/pins` — see note)
   - Verifies the submitted PIN's hash against the stored hash
   - If valid, mints a Firebase custom token with `uid = memberId` and custom claims `{ clubId: "fredensborg", role: <member's role> }`
   - Returns `{ token }`
   - If invalid, returns 401 (no token, no detail leak)
4. Client calls `signInWithCustomToken(token)` → real Firebase Auth session
5. Subsequent Firestore requests carry `request.auth.uid` + `request.auth.token.clubId` + `request.auth.token.role`

---

## Important scoping notes

- **Data path:** Stage 2 (club-scoped paths) has NOT happened yet. So in Stage 0, the function reads pins from the CURRENT path `fccnets/pins` on staging. The `clubId` claim is hardcoded to `"fredensborg"` for now. When Stage 2 lands, the read path changes to `clubs/{clubId}/data/pins`. Write the function so the collection base is a single constant at the top, easy to change later.
- **Hashing:** PIN hashing currently uses `hashPin` in `src/utils/crypto.js`. The server function must use the SAME hash algorithm so stored hashes validate. Port or replicate that exact hash logic server-side. Confirm the algorithm before implementing — if it's a simple deterministic hash, replicate it; do not guess.
- **Emergency 0000 bypass:** `useAuth.js` currently has an emergency universal PIN `0000` (post-recovery). DECISION NEEDED from Reuben: keep the 0000 bypass in the new server flow during transition, or drop it? Default: KEEP it server-side during Stage 0 so nobody is locked out, remove in a later hardening pass. Implement the bypass in the function (if pin === "0000", mint token without hash check) but gate it behind an env flag `ALLOW_EMERGENCY_PIN=true` so it can be switched off without a deploy.
- **Rules:** Stage 0 does NOT write production rules. On staging only, you may set permissive-but-authed rules to test that authed requests work (e.g. `allow read, write: if request.auth != null`). Do NOT touch production rules in this stage at all.

---

## Implementation

### 1. New Vercel function: `fcc-nets/api/auth-token.js`

- Initialise Firebase Admin SDK using the STAGING service-account env var (`FIREBASE_ADMIN_SA_STAGING`). Initialise once (guard against re-init on warm invocations).
- Accept POST `{ memberId, pin }`. Reject non-POST with 405.
- Read `fccnets/pins` (constant `PINS_PATH` at top of file). Parse the `{value: JSON.stringify(...)}` shape used throughout the app.
- Look up `pins[memberId]`. Compute hash of submitted pin using the ported `hashPin` logic. Compare.
- Emergency bypass: if `process.env.ALLOW_EMERGENCY_PIN === "true"` and `pin === "0000"`, treat as valid.
- On valid: read the member's role from `fccnets/members` (find member by id, default role `"member"`). Mint custom token:
  `admin.auth().createCustomToken(memberId, { clubId: "fredensborg", role })`
- Return `{ token }` with 200. On invalid: 401 `{ error: "invalid credentials" }`. On any server error: 500, log server-side, leak nothing.
- CORS: allow the staging origin only.

### 2. Client: Firebase Auth init

- In `src/firebase.js` (or wherever Firebase is initialised), ensure Firebase Auth is initialised alongside Firestore. Export `auth`.
- Use STAGING web config from env for the staging deployment.

### 3. Client: wire into `useAuth.js`

- In `handleEnterPin` and `handleNewPin` (the success paths), after the existing local success logic, add: call `/api/auth-token` with `{ memberId, pin }`, receive `{ token }`, call `signInWithCustomToken(auth, token)`.
- This is ADDITIVE — keep the existing localStorage `currentUser` flow so nothing breaks if the token call fails (log the failure, don't block login during Stage 0). The Firebase session is layered on top; the app still works off `currentUser` state as today.
- On `handleLogout`, also call `signOut(auth)`.

### 4. Token refresh

- Firebase custom-token sessions auto-refresh via the SDK while the app is open. For Stage 0, no extra refresh logic needed beyond default SDK behaviour. Note for later: on app cold-start with a persisted session, the SDK restores it automatically.

---

## Acceptance criteria (all verified on STAGING)

1. Member logs in with name + PIN exactly as before — no visible UX change.
2. After login, `auth.currentUser` is non-null and `auth.currentUser.uid === memberId`.
3. `auth.currentUser.getIdTokenResult()` shows custom claims `{ clubId: "fredensborg", role: <role> }`.
4. Wrong PIN → 401 from `/api/auth-token`, no token minted, login fails gracefully.
5. The `pins` doc is read SERVER-SIDE only; confirm the client bundle no longer needs to read `fccnets/pins` for validation (it may still read it for other existing features in Stage 0 — that's fine, full lockdown comes with rules in Stage 3).
6. Emergency 0000 works when `ALLOW_EMERGENCY_PIN=true`, fails when unset/false.
7. `npm run build` passes.
8. NOTHING was changed on the production Firebase project. Confirm the deploy used staging env vars.

---

## Explicitly OUT of scope for Stage 0

- Club-scoped data paths (Stage 2)
- Production security rules (Stage 3)
- Removing client-side `currentUser`/localStorage (later)
- Removing the 0000 bypass permanently (later hardening)
- Native biometric integration (native epic)
- Any production deployment

---

## Rollback

- Single new file (`api/auth-token.js`) + additive changes to `firebase.js` and `useAuth.js`.
- All on staging. If anything breaks, revert the branch — production is untouched throughout.
- No data migration in this stage, so no data to roll back.
