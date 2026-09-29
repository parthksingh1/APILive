// Local web UI server. Zero dependencies — just node:http.
//
// Security model:
//   • Binds to 127.0.0.1 only — never reachable from your network.
//   • Rejects any request whose Host header isn't 127.0.0.1/localhost on our
//     port (blocks DNS-rebinding attacks from malicious websites).
//   • Every /api call needs a random per-session token that is only embedded in
//     the page this server renders — other sites can't read it (same-origin).
//   • Raw keys stay in this process's memory. The browser only ever receives
//     masked keys and opaque refs. Nothing is written to disk or logged.

import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describeProviders, providers } from "./providers.js";
import { checkKey, DEFAULT_TIMEOUT_MS } from "./check.js";
import { extractKeys, scanEnvironment } from "./env.js";
import { mask } from "./util.js";
import { DEMO_KEYS, demoFetch } from "./demo.js";
import { renderMarkdown } from "./markdown.js";
import { checkForUpdate, installKind, updateCommand, RELEASES_URL } from "./update.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");

// Bundled documents, served (rendered) inside the app so they work offline.
export const DOCS = {
  guide: { title: "Guide", file: "docs/GUIDE.md" },
  changelog: { title: "Changelog", file: "CHANGELOG.md" },
  privacy: { title: "Privacy Policy", file: "PRIVACY.md" },
  terms: { title: "Terms of Use", file: "TERMS.md" },
  security: { title: "Security", file: "SECURITY.md" },
  support: { title: "Support", file: "SUPPORT.md" },
  license: { title: "License", file: "LICENSE" },
};
const STATIC = {
  "/app.js": "text/javascript; charset=utf-8",
  "/style.css": "text/css; charset=utf-8",
  "/favicon.svg": "image/svg+xml",
};
export const MAX_KEYS = 100; // built for your own keys, not bulk testing
const MAX_BODY = 1024 * 1024;

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; " +
    "font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cache-Control": "no-store",
};

export function createApp({ version, cwd = process.cwd(), includeEnv = true, files = null, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl, demo = false, updateCheck = true } = {}) {
  if (demo) fetchImpl = demoFetch;
  // Kick off the (cached, opt-out) update check without blocking startup.
  const updatePromise = checkForUpdate(version, { disabled: !updateCheck || demo }).catch(() => null);
  const token = crypto.randomBytes(24).toString("hex");
  const keys = new Map(); // ref -> entry (with raw key)
  let allowedHosts = new Set();

  const scan = demo
    ? { keys: DEMO_KEYS, scanned: [{ file: ".env" }, { file: ".env.local" }] }
    : scanEnvironment({ cwd, files, includeEnv });
  for (const k of scan.keys.slice(0, MAX_KEYS)) add(k, "env");

  const indexHtml = fs
    .readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf8")
    .replace("__APILIVE_TOKEN__", token);

  function add(entry, origin) {
    for (const e of keys.values()) {
      if (e.key === entry.key && e.provider === entry.provider) return { entry: e, duplicate: true };
    }
    const ref = crypto.randomBytes(6).toString("hex");
    const e = { ...entry, ref, origin, sources: entry.sources || [] };
    keys.set(ref, e);
    return { entry: e, duplicate: false };
  }

  const view = (e) => ({
    ref: e.ref,
    provider: e.provider,
    masked: mask(e.key),
    name: e.name || null,
    sources: e.sources,
    origin: e.origin,
    confident: e.confident,
    candidates: e.candidates || [],
  });

  function send(res, status, body, type = "application/json; charset=utf-8") {
    const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    res.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": type });
    res.end(payload);
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(Object.assign(new Error("Request too large"), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on("end", () => {
        try {
          resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
        } catch {
          reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
        }
      });
      req.on("error", reject);
    });
  }

  function tokenOk(req) {
    const given = Buffer.from(String(req.headers["x-apilive-token"] || ""));
    const want = Buffer.from(token);
    return given.length === want.length && crypto.timingSafeEqual(given, want);
  }

  async function handle(req, res) {
    const host = String(req.headers.host || "").toLowerCase();
    if (!allowedHosts.has(host)) return send(res, 421, { error: "Invalid host" });

    const url = new URL(req.url, `http://${host}`);
    const p = url.pathname;

    if (req.method === "GET" && (p === "/" || p === "/index.html")) {
      return send(res, 200, indexHtml, "text/html; charset=utf-8");
    }
    if (req.method === "GET" && STATIC[p]) {
      const file = path.join(PUBLIC_DIR, p.slice(1));
      return send(res, 200, fs.readFileSync(file), STATIC[p]);
    }
    if (!p.startsWith("/api/")) return send(res, 404, { error: "Not found" });

    const origin = req.headers.origin;
    if (origin && !allowedHosts.has(origin.replace(/^https?:\/\//, "").toLowerCase())) {
      return send(res, 403, { error: "Cross-origin request blocked" });
    }
    if (!tokenOk(req)) return send(res, 403, { error: "Missing or invalid session token" });
    if (req.method !== "GET" && req.method !== "DELETE" && !String(req.headers["content-type"] || "").startsWith("application/json")) {
      return send(res, 415, { error: "Expected application/json" });
    }

    if (req.method === "GET" && p === "/api/state") {
      return send(res, 200, {
        version,
        cwd: demo ? "my-app" : path.basename(cwd),
        demo,
        providers: describeProviders(),
        scanned: scan.scanned.filter((s) => !s.error).map((s) => path.relative(cwd, s.file) || s.file),
        envIncluded: includeEnv,
        maxKeys: MAX_KEYS,
        docs: Object.entries(DOCS).map(([slug, d]) => ({ slug, title: d.title })),
        keys: [...keys.values()].map(view),
      });
    }

    if (req.method === "GET" && p === "/api/update") {
      const u = (await updatePromise) || { current: version, updateAvailable: false, disabled: true };
      const kind = u.updateAvailable ? installKind() : null;
      return send(res, 200, { ...u, command: kind ? updateCommand(kind) : null, releasesUrl: RELEASES_URL });
    }

    const doc = p.match(/^\/api\/docs\/([a-z]+)$/);
    if (req.method === "GET" && doc) {
      const meta = DOCS[doc[1]];
      if (!meta) return send(res, 404, { error: "Unknown document" });
      const text = fs.readFileSync(path.join(ROOT, meta.file), "utf8");
      const rendered = meta.file === "LICENSE" ? { html: `<pre class="license">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`, toc: [] } : renderMarkdown(text);
      return send(res, 200, { slug: doc[1], title: meta.title, ...rendered });
    }

    if (req.method === "POST" && p === "/api/keys") {
      const body = await readJson(req);
      const forced = body.provider && providers[body.provider] ? body.provider : null;
      const found = extractKeys(String(body.text || "").slice(0, MAX_BODY), { forced });
      const added = [];
      let duplicates = 0;
      let limited = 0;
      for (const f of found) {
        if (keys.size >= MAX_KEYS) {
          limited++;
          continue;
        }
        const r = add(f, "manual");
        if (r.duplicate) duplicates++;
        else added.push(view(r.entry));
      }
      return send(res, 200, { added, duplicates, limited, maxKeys: MAX_KEYS });
    }

    const m = p.match(/^\/api\/keys\/([a-f0-9]{12})$/);
    if (m) {
      const entry = keys.get(m[1]);
      if (!entry) return send(res, 404, { error: "Unknown key" });
      if (req.method === "DELETE") {
        keys.delete(m[1]);
        return send(res, 200, { ok: true });
      }
      if (req.method === "PATCH") {
        const body = await readJson(req);
        if (!providers[body.provider]) return send(res, 400, { error: "Unknown provider" });
        entry.provider = body.provider;
        entry.confident = true;
        return send(res, 200, view(entry));
      }
    }

    if (req.method === "POST" && p === "/api/check") {
      const body = await readJson(req);
      const entry = keys.get(String(body.ref || ""));
      if (!entry) return send(res, 404, { error: "Unknown key" });
      if (!entry.provider) return send(res, 400, { error: "Choose a provider for this key first" });
      const result = await checkKey(entry.provider, entry.key, { timeoutMs, fetchImpl });
      return send(res, 200, { ref: entry.ref, ...result });
    }

    return send(res, 404, { error: "Not found" });
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : "Internal error" });
    });
  });

  return {
    server,
    token,
    keys,
    scan,
    listen(port) {
      return new Promise((resolve, reject) => {
        const onError = (e) => {
          server.off("listening", onListening);
          reject(e);
        };
        const onListening = () => {
          server.off("error", onError);
          const actual = server.address().port;
          allowedHosts = new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
          resolve(actual);
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, "127.0.0.1");
      });
    },
    close: () =>
      new Promise((r) => {
        server.close(() => r());
        server.closeAllConnections?.();
      }),
  };
}

export async function listenWithFallback(app, port, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await app.listen(port + i);
    } catch (e) {
      if (e.code !== "EADDRINUSE" || i === attempts - 1) throw e;
    }
  }
}

export function openBrowser(url) {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true });
    child.on("error", () => {});
    child.unref();
  } catch {
    // No browser available (SSH, container…) — the URL is printed anyway.
  }
}
