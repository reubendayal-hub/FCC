// ─── Car-pool lift helpers ────────────────────────────────────
// Normalise lift data — handles old string format & new object format

export function getLiftObj(d) {
  if (!d) return { pref:"", seats:1, stop:"", stopOther:"", note:"", saved:false };
  if (typeof d === "string") return { pref:d, seats:1, stop:"", stopOther:"", note:"", saved:true };
  return d;
}

export function getLiftPref(d) {
  return getLiftObj(d).pref || "";
}
