import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { api } from "./api.js";
import { createSync } from "./sync.js";
import { readToken, saveToken, forgetToken, urlToken, storedToken, readPrefill, clearPrefill, samePerson } from "./identity.js";
import { DEFAULT_DEADLINE_ISO, TOTAL_PARTS, FABRIC } from "./content/config.js";
import Welcome from "./components/Welcome.jsx";
import Hub from "./components/Hub.jsx";
import PartReader from "./components/PartReader.jsx";
import Complete from "./components/Complete.jsx";
import FabricReader from "./components/FabricReader.jsx";
import NotOpen from "./components/NotOpen.jsx";

// Route lives in the hash so the browser back button works:
//   ""  → hub,  "#/part/7" → part reader,  "#/fabric" → "The fabric of FCC",  "#/done" → completion
function parseHash() {
  const m = window.location.hash.match(/^#\/part\/(\d{1,2})$/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= TOTAL_PARTS) return { part: n };
  }
  if (window.location.hash === "#/done") return { done: true };
  if (window.location.hash === "#/fabric" && FABRIC) return { fabric: true };
  return {};
}
const hashFor = (r) => (r.part ? `#/part/${r.part}` : r.fabric ? "#/fabric" : r.done ? "#/done" : "#/");

// Optional ?theme=light|dark override (handy for previews); otherwise follow the device.
const THEME = (() => { const t = new URLSearchParams(window.location.search).get("theme"); return t === "light" || t === "dark" ? t : undefined; })();

const noopSync = { subscribe: () => () => {}, getSnapshot: () => null };

export default function App() {
  const [token, setToken] = useState(() => readToken());
  const [config, setConfig] = useState(null);
  const [phase, setPhase] = useState(token ? "loading" : "welcome"); // loading | welcome | ready | notopen | failed
  const [linkError, setLinkError] = useState("");
  // The first route restores the saved scroll position (reload / reopen mid-part).
  const [route, setRoute] = useState(() => ({ ...parseHash(), restore: true }));
  const [toast, setToast] = useState("");
  // Opened from the FCC app: who the app says is logged in (one-tap start).
  const [prefill, setPrefill] = useState(readPrefill);

  const sync = useMemo(() => (token ? createSync(token) : null), [token]);
  const snap = useSyncExternalStore((sync || noopSync).subscribe, (sync || noopSync).getSnapshot);

  // Public config (deadline, openToAll) for the welcome screen.
  useEffect(() => {
    api.config().then(setConfig).catch(() => setConfig({ unreachable: true }));
  }, []);

  // Who may start a review while it's not open to all: only allowlisted app
  // members, arriving from the app. A forwarded link alone shows "Not open yet".
  const [startAccess, setStartAccess] = useState("unknown"); // unknown | allowed | denied
  useEffect(() => {
    if (phase !== "welcome" || !config) return undefined;
    if (config.unreachable) { setPhase("failed"); return undefined; } // fail closed: never show the start form unchecked
    if (config.openToAll) { setStartAccess("allowed"); return undefined; }
    if (!prefill?.memberId) { setStartAccess("denied"); return undefined; }
    let alive = true;
    setStartAccess("unknown");
    api.access(prefill.memberId)
      .then((d) => { if (alive) setStartAccess(d.allowed ? "allowed" : "denied"); })
      .catch(() => { if (alive) setStartAccess("denied"); });
    return () => { alive = false; };
  }, [phase, config, prefill]);

  // Load the reviewer's review and start autosave.
  useEffect(() => {
    if (!sync) return undefined;
    let alive = true;
    sync.start();
    sync.load().then((res) => {
      if (!alive) return;
      if (res.ok) {
        // This device holds someone else's review, but the app says a different
        // member is here now: start fresh for them (their own link still works).
        if (prefill && !samePerson(sync.getSnapshot().review, prefill)) {
          setToken(null);
          setPhase("welcome");
          return;
        }
        if (prefill) { clearPrefill(); setPrefill(null); }
        saveToken(token);
        setPhase("ready");
        // Strip ?r= from the address bar once it's stored, so it isn't shared by accident.
        if (window.location.search.includes("r=")) {
          window.history.replaceState(null, "", `/handbook-review/${window.location.hash}`);
        }
      } else if (res.notOpen) {
        window.history.replaceState(null, "", "/handbook-review/");
        setPhase("notopen");
      } else if (res.notFound) {
        const fromLink = urlToken() === token;
        window.history.replaceState(null, "", "/handbook-review/");
        const fallback = fromLink ? storedToken() : null;
        if (fallback && fallback !== token) {
          // Bad link, but this device already has a review: carry on with that one.
          setToken(fallback);
          return;
        }
        if (!fromLink) forgetToken();
        setToken(null);
        setLinkError("We couldn't find that review link. Start a new review below.");
        setPhase("welcome");
      } else {
        setPhase("failed");
      }
    });
    return () => { alive = false; sync.stop(); };
  }, [sync]);

  useEffect(() => {
    const onPop = () => setRoute(parseHash());
    window.addEventListener("hashchange", onPop);
    return () => window.removeEventListener("hashchange", onPop);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => setToast(""), 2800);
  }, []);

  const go = useCallback((r) => {
    const h = hashFor(r);
    if (window.location.hash !== h) window.history.pushState(null, "", h);
    setRoute(r);
    if (!r.part) window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  function onStarted({ reviewToken }) {
    clearPrefill();
    setPrefill(null);
    saveToken(reviewToken);
    setLinkError("");
    setPhase("loading");
    setToken(reviewToken);
    go({});
  }

  const effectiveConfig = snap?.config || config;
  const deadline = new Date(effectiveConfig?.deadlineISO || DEFAULT_DEADLINE_ISO).getTime();
  const closed = !!effectiveConfig?.closed || snap?.status === "closed";

  let screen;
  if (phase === "notopen" || (phase === "welcome" && startAccess === "denied")) {
    screen = <NotOpen />;
  } else if (phase === "welcome" && startAccess === "unknown") {
    screen = <div className="spinner" role="progressbar" aria-label="Loading" />;
  } else if (phase === "welcome") {
    screen = <Welcome allowFullForm={!!config?.openToAll} deadline={deadline} closed={!!config?.closed} onStarted={onStarted} linkError={linkError} prefill={prefill} onNotMe={() => { clearPrefill(); setPrefill(null); }} />;
  } else if (phase === "failed") {
    screen = (
      <div className="col" style={{ paddingTop: "30vh", textAlign: "center" }}>
        <h2>We couldn't reach the server</h2>
        <p style={{ color: "var(--muted)", margin: "8px 0 16px" }}>Check your connection. Nothing you've typed on this device is lost.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  } else if (phase === "loading" || !snap?.review) {
    screen = <div className="spinner" role="progressbar" aria-label="Loading" />;
  } else {
    const props = { snap, sync, token, deadline, closed, go, showToast };
    screen = route.part
      ? <PartReader key={route.part} partId={route.part} restore={!!route.restore} {...props} />
      : route.fabric
        ? <FabricReader {...props} />
      : route.done && snap.review.doneCount === TOTAL_PARTS
        ? <Complete {...props} />
        : <Hub {...props} />;
  }

  return (
    <div className="hbr" data-theme={THEME}>
      {screen}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
