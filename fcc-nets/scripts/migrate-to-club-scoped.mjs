#!/usr/bin/env node
// One-time migration: copies fccnets/* → clubs/fredensborg/data/* on staging.
// Safe to run multiple times (idempotent — overwrites, never duplicates).
// NEVER deletes fccnets/* docs; they remain as backup.
//
// Usage:
//   FIREBASE_ADMIN_SA_STAGING=$(cat path/to/staging-sa.json) node scripts/migrate-to-club-scoped.mjs
//
// Prerequisites:
//   npm install firebase-admin  (or it's already in devDependencies)

import admin from "firebase-admin";

const CLUB_ID = "fredensborg";

// All known keys under fccnets/ — keep in sync with useFirestore.js
const KNOWN_KEYS = [
  "sessions",
  "members",
  "pins",
  "teams",
  "recurring",
  "blockcals",
  "invitecodes",
  "joinrequests",
  "auditlog",
  "reminderlogs",
  "cancelledsessions",
  "seasonplans",
  "attendance",
  "sessionnotes",
  "playerprogress",
  "coachoverrides",
  "matchselections",
  "captainnotes_templates",
  "parentdutyconfig",
];

function initAdmin() {
  const saJson = process.env.FIREBASE_ADMIN_SA_STAGING;
  if (!saJson) {
    console.error("Error: FIREBASE_ADMIN_SA_STAGING env var not set.");
    process.exit(1);
  }
  const sa = JSON.parse(saJson);
  if (sa.project_id !== "cricops-staging") {
    console.error(`ABORT: service account project_id is "${sa.project_id}", expected "cricops-staging". Refusing to run against any other project.`);
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

async function migrate() {
  initAdmin();
  const db = admin.firestore();

  console.log(`\nMigrating fccnets/* → clubs/${CLUB_ID}/data/* on staging\n`);

  let copied = 0;
  let missing = [];

  for (const key of KNOWN_KEYS) {
    const srcRef = db.doc(`fccnets/${key}`);
    const dstRef = db.doc(`clubs/${CLUB_ID}/data/${key}`);

    const snap = await srcRef.get();
    if (!snap.exists) {
      console.log(`  SKIP  ${key} (not found in fccnets)`);
      missing.push(key);
      continue;
    }

    await dstRef.set(snap.data());
    console.log(`  OK    ${key}`);
    copied++;
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Copied:  ${copied} / ${KNOWN_KEYS.length} docs`);
  if (missing.length > 0) {
    console.log(`Missing: ${missing.join(", ")}`);
  } else {
    console.log(`Missing: none`);
  }
  console.log(`fccnets/* docs untouched (backup preserved).`);
  console.log(`─────────────────────────────────\n`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
