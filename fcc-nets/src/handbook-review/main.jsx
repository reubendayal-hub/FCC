import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// We restore the reader's scroll position ourselves (resume); stop the
// browser from fighting it on reload.
try { window.history.scrollRestoration = "manual"; } catch { /* ignore */ }

createRoot(document.getElementById("root")).render(<App />);
