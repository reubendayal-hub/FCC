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
await globalThis.__HANDBOOK_FAKE_DB__.collection("handbookReviewConfig").doc("settings").set({ open: true });

function handbookApi() {
  return {
    name: "handbook-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const m = req.url.match(/^\/api\/handbook\/([a-z-]+)(\?.*)?$/);
        if (!m) return next();
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
        try { await handler(r, s); } catch (e) { res.statusCode = 500; res.end(String(e)); }
      });
      // Dev switch to simulate a server outage: /__hbr-offline?on=1
      server.middlewares.use("/__hbr-offline", (req, res) => {
        globalThis.__HANDBOOK_DEV_OFFLINE__ = req.url.includes("on=1");
        res.end(`offline=${globalThis.__HANDBOOK_DEV_OFFLINE__}`);
      });
    },
  };
}

export default mergeConfig(base, defineConfig({ plugins: [handbookApi()] }));
