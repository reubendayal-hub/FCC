// DEV ONLY: the normal Vite config plus /api/handbook/* served in-process
// against an in-memory Firestore fake. Nothing here is deployed.
//
//   npx vite --config scripts/handbook-dev/vite.config.mjs
//
// Admin password for this harness: "dev-admin" (or HANDBOOK_ADMIN_SECRET).

import { defineConfig, mergeConfig } from "vite";
import base from "../../vite.config.js";
import { createFakeFirestore } from "./fakeFirestore.mjs";

process.env.HANDBOOK_ADMIN_SECRET ||= "dev-admin";
process.env.CRON_SECRET ||= "dev-cron";
globalThis.__HANDBOOK_FAKE_DB__ = createFakeFirestore();
// Start "open" so the flow can be tested immediately.
// Local fake only: Reuben + Arun (real app ids) and the mock "Parag Sample" id from card-preview.
await globalThis.__HANDBOOK_FAKE_DB__.collection("handbookReviewConfig").doc("settings").set({
  open: true, open_to_all: false,
  testers: ["x3kkunl", "bzfuva3", "dev-parag-sample"], admins: [],
});

function handbookApi() {
  return {
    name: "handbook-api-dev",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!/^\/api\/handbook\//.test(req.url)) return next();
        // A client disconnect mid-request must not crash the dev server.
        handle(req, res).catch((e) => { try { res.statusCode = 500; res.end(String(e)); } catch { /* gone */ } });
      });
      async function handle(req, res) {
        const m = req.url.match(/^\/api\/handbook\/([a-z-]+)(\?.*)?$/);
        if (!m) { res.statusCode = 404; return res.end("{}"); }
        const { default: handler } = await server.ssrLoadModule("/api/handbook/[action].js");
        const query = Object.fromEntries(new URLSearchParams(m[2] || ""));
        query.action = m[1];
        let raw = "";
        for await (const chunk of req) raw += chunk;
        const r = {
          method: req.method, headers: req.headers, query, socket: req.socket,
          body: raw && (req.headers["content-type"] || "").includes("json") ? JSON.parse(raw) : raw,
        };
        if (globalThis.__HANDBOOK_DEV_OFFLINE__) { res.statusCode = 503; return res.end("{}"); }
        const s = {
          headersSent: false,
          setHeader: (k, v) => res.setHeader(k, v),
          status(code) { res.statusCode = code; return s; },
          json(obj) { s.headersSent = true; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return s; },
          send(buf) { s.headersSent = true; res.end(buf); return s; },
        };
        await handler(r, s);
      }
      // Dev switch to simulate a server outage: /__hbr-offline?on=1
      server.middlewares.use("/__hbr-offline", (req, res) => {
        globalThis.__HANDBOOK_DEV_OFFLINE__ = req.url.includes("on=1");
        res.end(`offline=${globalThis.__HANDBOOK_DEV_OFFLINE__}`);
      });
    },
  };
}

export default mergeConfig(base, defineConfig({ plugins: [handbookApi()] }));
