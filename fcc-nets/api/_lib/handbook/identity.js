// Reviewer identity for /handbook-review — PHASE 1 (test page).
//
// A reviewer is whoever holds a random reviewToken (192 bits). They tell us
// their name + email + role group; nothing is verified. This is the ONLY
// module that knows how a reviewer is identified. Phase 2 (inside the app,
// behind login) replaces startReview/resolveReviewId with the verified
// member id; the rest of the API only ever sees an opaque review id.

import crypto from "node:crypto";

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

export function newReviewToken() {
  return crypto.randomBytes(24).toString("base64url"); // 32 chars
}

// Returns the review document id for this request, or null.
export function resolveReviewId(req) {
  const r = (req.method === "GET" ? req.query?.r : req.body?.r) || "";
  return TOKEN_RE.test(r) ? r : null;
}

export function identityFields({ name, email, roleGroup, memberId }) {
  return { name, email, roleGroup, memberId: memberId || null, source: memberId ? "app" : "link" };
}
