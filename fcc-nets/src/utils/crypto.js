// ─── PIN hashing (djb2) ───────────────────────────────────────
// Note: this is a simple non-cryptographic hash used for local PIN obfuscation,
// not a secure password hash.
export function hashPin(pin) {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) + h) + pin.charCodeAt(i);
  }
  return String(h >>> 0);
}
