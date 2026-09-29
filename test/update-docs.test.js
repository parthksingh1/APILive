import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compareVersions, checkForUpdate, updateCheckDisabled, readState } from "../src/update.js";
import { renderMarkdown } from "../src/markdown.js";
import { createApp, DOCS, MAX_KEYS } from "../src/server.js";

const saved = { ...process.env };
before(() => {
  process.env.APILIVE_CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "apilive-test-"));
  for (const k of ["CI", "NO_UPDATE_NOTIFIER", "APILIVE_NO_UPDATE_CHECK", "DO_NOT_TRACK", "NODE_ENV"]) delete process.env[k];
});
after(() => {
  fs.rmSync(process.env.APILIVE_CONFIG_DIR, { recursive: true, force: true });
  process.env = saved;
});

test("compareVersions orders semver correctly", () => {
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareVersions("1.1.0", "1.1.0"), 0);
  assert.equal(compareVersions("v1.0.0", "1.0.1"), -1);
  assert.equal(compareVersions("2.0.0-beta.1", "1.9.0"), 1);
});

test("update check honours opt-out environment variables", () => {
  assert.equal(updateCheckDisabled(), false);
  for (const k of ["NO_UPDATE_NOTIFIER", "APILIVE_NO_UPDATE_CHECK", "CI"]) {
    process.env[k] = "1";
    assert.equal(updateCheckDisabled(), true, k);
    delete process.env[k];
  }
  process.env.DO_NOT_TRACK = "1";
  assert.equal(updateCheckDisabled(), true);
  delete process.env.DO_NOT_TRACK;
  assert.equal(updateCheckDisabled(true), true, "flag");
});

test("update check reports a newer version, sends nothing but the package name, and caches", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ version: "9.9.9" }), { status: 200 });
  };
  const u = await checkForUpdate("1.1.0", { fetchImpl });
  assert.equal(u.updateAvailable, true);
  assert.equal(u.latest, "9.9.9");
  assert.equal(calls[0].url, "https://registry.npmjs.org/apilive/latest");
  assert.equal(calls[0].init.method, undefined, "GET only, no body");
  assert.equal(readState().latestVersion, "9.9.9");

  await checkForUpdate("1.1.0", { fetchImpl });
  assert.equal(calls.length, 1, "second call within 24h uses the cache");
});

test("disabled update check makes no request", async () => {
  let called = false;
  const u = await checkForUpdate("1.1.0", { disabled: true, fetchImpl: async () => ((called = true), new Response("{}")) });
  assert.equal(u.disabled, true);
  assert.equal(called, false);
});

test("markdown renderer escapes HTML and neutralises unsafe links", () => {
  const { html } = renderMarkdown('# Hi <script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](https://example.com) <img src=x onerror=alert(1)>');
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("javascript:"));
  assert.match(html, /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">ok<\/a>/);
});

test("markdown renderer maps doc links to in-app routes and builds a TOC", () => {
  const { html, toc } = renderMarkdown("## Section one\n\nSee the [Terms](TERMS.md) and [guide](docs/GUIDE.md#faq).\n\n| a | b |\n|---|---|\n| 1 | 2 |");
  assert.match(html, /href="#\/docs\/terms"/);
  assert.match(html, /href="#\/docs\/guide#faq"/);
  assert.match(html, /<table>/);
  assert.deepEqual(toc, [{ level: 2, id: "section-one", text: "Section one" }]);
});

test("every bundled document exists and renders", () => {
  for (const [slug, d] of Object.entries(DOCS)) {
    const file = new URL(`../${d.file}`, import.meta.url);
    assert.ok(fs.existsSync(file), `${slug}: ${d.file} missing`);
    if (d.file.endsWith(".md")) assert.ok(renderMarkdown(fs.readFileSync(file, "utf8")).html.length > 100, slug);
  }
});

test("server serves docs and enforces the key limit", async () => {
  const app = createApp({ version: "test", includeEnv: false, files: [], updateCheck: false, fetchImpl: async () => new Response("{}") });
  const port = await app.listen(0);
  const base = `http://127.0.0.1:${port}`;
  const token = (await (await fetch(base + "/")).text()).match(/content="([a-f0-9]{48})"/)[1];
  const headers = { "x-apilive-token": token, "Content-Type": "application/json" };
  try {
    const doc = await (await fetch(base + "/api/docs/privacy", { headers })).json();
    assert.equal(doc.title, "Privacy Policy");
    assert.match(doc.html, /<h1 id="privacy-policy">/);
    assert.equal((await fetch(base + "/api/docs/nope", { headers })).status, 404);
    assert.equal((await fetch(base + "/api/docs/privacy")).status, 403, "docs API still needs the token");

    const text = Array.from({ length: MAX_KEYS + 5 }, (_, i) => `gsk_${String(i).padStart(24, "0")}abcd`).join("\n");
    const r = await (await fetch(base + "/api/keys", { method: "POST", headers, body: JSON.stringify({ text }) })).json();
    assert.equal(r.added.length, MAX_KEYS);
    assert.equal(r.limited, 5);
  } finally {
    await app.close();
  }
});
