// Content config for /handbook-review. Content-only: the part text itself
// is generated from public/club-handbook.html (see scripts/extract-handbook.mjs).
import { PARTS as SOURCE_PARTS, SOURCE_VERSION_LINE, SOURCE_FOOTER } from "./generated/parts.js";

export const HANDBOOK_VERSION = "v0.4";
export { SOURCE_VERSION_LINE, SOURCE_FOOTER };

// Review closes 30 Nov 2026, 23:59 Europe/Copenhagen (CET, UTC+1).
// The server's handbookReviewConfig/settings.deadlineISO overrides this.
export const DEFAULT_DEADLINE_ISO = "2026-11-30T23:59:00+01:00";

export const COMMITTEES = [
  "Youth",
  "Matches",
  "Coaching",
  "Finance & Sponsorship",
  "Comms & Growth",
  "Equipment & Grounds",
  "Events & Social",
  "Culture & Togetherness",
];

// Role-interest prompts shown in a part's verdict card.
// kind "committees" = multi-select chips; kind "toggle" = one yes/no.
export const ROLE_INTEREST = {
  6:  { kind: "committees", key: "committees", label: "I'd like to help with…" },
  7:  { kind: "toggle", key: "selector",  label: "I'd consider being a selector" },
  8:  { kind: "toggle", key: "coaching",  label: "I'd like to help with coaching" },
  9:  { kind: "toggle", key: "captaincy", label: "I'd like to be considered for captain / vice-captain" },
  12: { kind: "toggle", key: "oneFcc",    label: "I'd like to help build One FCC" },
};

export const ROLE_INTEREST_LABELS = {
  selector: "Selection",
  coaching: "Coaching",
  captaincy: "Captaincy",
  oneFcc: "One FCC",
};

export const ROLE_GROUPS = [
  { value: "senior", label: "Senior player" },
  { value: "youth-parent", label: "Youth parent" },
  { value: "coach", label: "Coach" },
  { value: "board", label: "Board" },
  { value: "other", label: "Other" },
];

// ~220 words per minute, rounded up, minimum 1.
export const readMins = (words) => Math.max(1, Math.ceil(words / 220));

export const PARTS = SOURCE_PARTS.map((p) => ({
  id: p.id,
  anchor: p.anchor,
  eyebrow: p.eyebrow,
  title: p.tocTitle,
  heading: p.heading,
  summary: p.summary,
  readMins: readMins(p.words),
  words: p.words,
  roleInterest: ROLE_INTEREST[p.id] || null,
  html: p.html,
}));

export const TOTAL_PARTS = PARTS.length;
export const TOTAL_READ_MINS = readMins(SOURCE_PARTS.reduce((n, p) => n + p.words, 0));
