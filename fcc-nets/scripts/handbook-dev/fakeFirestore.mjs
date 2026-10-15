// In-memory stand-in for the slice of the Firestore Admin API that
// api/_lib/handbook uses. DEV ONLY — lets the /handbook-review flow be
// exercised locally without touching staging or prod.

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] = o[k] && typeof o[k] === "object" ? o[k] : {};
  o[keys.at(-1)] = clone(value);
}

export function createFakeFirestore() {
  const store = new Map(); // "col/id" -> data
  const snap = (id, data) => ({ id, exists: data !== undefined, data: () => clone(data) });

  function doc(col, id) {
    const key = `${col}/${id}`;
    return {
      _key: key, id,
      async get() { return snap(id, store.get(key)); },
      async create(data) {
        if (store.has(key)) { const e = new Error("6 ALREADY_EXISTS: Document already exists"); e.code = 6; throw e; }
        store.set(key, clone(data));
      },
      async set(data, opts) { store.set(key, opts?.merge ? { ...(store.get(key) || {}), ...clone(data) } : clone(data)); },
      async update(patch) {
        if (!store.has(key)) { const e = new Error("5 NOT_FOUND"); e.code = 5; throw e; }
        const cur = store.get(key);
        for (const [p, v] of Object.entries(patch)) setPath(cur, p, v);
      },
    };
  }

  return {
    _store: store,
    collection(col) {
      return {
        doc: (id) => doc(col, id),
        async get() {
          const docs = [...store.entries()].filter(([k]) => k.startsWith(`${col}/`)).map(([k, v]) => snap(k.slice(col.length + 1), v));
          return { docs, empty: docs.length === 0 };
        },
      };
    },
    async runTransaction(fn) {
      const writes = [];
      const tx = {
        get: (ref) => ref.get(),
        update: (ref, patch) => writes.push(() => ref.update(patch)),
        set: (ref, data, opts) => writes.push(() => ref.set(data, opts)),
      };
      const out = await fn(tx);
      for (const w of writes) await w();
      return out;
    },
  };
}
