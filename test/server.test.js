import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";

let app, base, token;

before(async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ data: [{ id: "m1" }] }), { status: 200 });
  app = createApp({ version: "test", includeEnv: false, files: [], fetchImpl, updateCheck: false });
  const port = await app.listen(0);
  base = `http://127.0.0.1:${port}`;
  const html = await (await fetch(base + "/")).text();
  token = html.match(/name="apilive-token" content="([a-f0-9]+)"/)[1];
});
after(() => app.close());

const api = (path, { method = "GET", body, headers = {} } = {}) =>
  fetch(base + path, {
    method,
    headers: { "x-apilive-token": token, ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

test("serves the UI with a per-session token and strict CSP", async () => {
  const res = await fetch(base + "/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-security-policy"), /default-src 'none'/);
  assert.equal(token.length, 48);
});

test("rejects API calls without the session token", async () => {
  const res = await fetch(base + "/api/state");
  assert.equal(res.status, 403);
});

test("rejects foreign Host headers (DNS rebinding)", async () => {
  const { request } = await import("node:http");
  const status = await new Promise((resolve) => {
    const req = request(base + "/api/state", { headers: { Host: "attacker.example", "x-apilive-token": token } }, (res) => resolve(res.statusCode));
    req.end();
  });
  assert.equal(status, 421);
});

test("rejects cross-origin requests even with a token", async () => {
  const res = await api("/api/state", { headers: { Origin: "https://attacker.example" } });
  assert.equal(res.status, 403);
});

test("adds, checks and deletes keys without returning raw keys", async () => {
  const key = "gsk_abcdefghijklmnopqrstuvwxyz0123";
  const added = await (await api("/api/keys", { method: "POST", body: { text: key } })).json();
  assert.equal(added.added.length, 1);
  const entry = added.added[0];
  assert.equal(entry.provider, "groq");
  assert.ok(!JSON.stringify(added).includes(key), "raw key leaked to the browser");

  const result = await (await api("/api/check", { method: "POST", body: { ref: entry.ref } })).json();
  assert.equal(result.status, "live");
  assert.deepEqual(result.models, ["m1"]);

  const state = await (await api("/api/state")).json();
  assert.ok(!JSON.stringify(state).includes(key));

  assert.equal((await api(`/api/keys/${entry.ref}`, { method: "DELETE" })).status, 200);
  assert.equal(app.keys.size, 0);
});

test("requires JSON content type for writes", async () => {
  const res = await fetch(base + "/api/keys", {
    method: "POST",
    headers: { "x-apilive-token": token, "Content-Type": "text/plain" },
    body: "x",
  });
  assert.equal(res.status, 415);
});
