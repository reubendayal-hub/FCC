import React from "react";
import { Hero } from "./Welcome.jsx";
import { DEFAULT_DEADLINE_ISO } from "../content/config.js";

// Shown to anyone not on the test-drive allowlist (e.g. a forwarded link).
// Deliberately says nothing about who can get in.
export default function NotOpen() {
  return (
    <div className="screen">
      <Hero deadline={new Date(DEFAULT_DEADLINE_ISO).getTime()} countdown={false} />
      <div className="bars" aria-hidden="true" />
      <main className="col" style={{ paddingBlock: "22px 40px" }}>
        <div className="card stack" role="status">
          <h2 style={{ fontSize: 22 }}>Not open yet</h2>
          <p style={{ color: "var(--muted)" }}>
            The handbook review isn't open to members yet. When it opens, you'll find it in the FCC app under your Profile.
          </p>
        </div>
      </main>
    </div>
  );
}
