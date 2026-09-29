import { test } from "node:test";
import assert from "node:assert/strict";
import { detectProvider, providerList } from "../src/providers.js";
import { checkKey, classify, cleanKey } from "../src/check.js";
import { extractKeys, parseDotenv, scanEnvironment } from "../src/env.js";
import { mask } from "../src/util.js";

const fakeFetch = (status, body = {}, headers = {}) => async () =>
  new Response(JSON.stringify(body), { status, headers });

test("detects providers from unique key prefixes", () => {
  const cases = {
    "sk-ant-api03-abcdefghijklmnopqrstuvwxyz": "anthropic",
    "sk-proj-abcdefghijklmnopqrstuvwxyz0123": "openai",
    "sk-or-v1-abcdefghijklmnopqrstuvwxyz": "openrouter",
    "gsk_abcdefghijklmnopqrstuvwxyz": "groq",
    // Built at runtime so secret scanners don't mistake test data for a real key.
    ["AI" + "za" + "Sy" + "x".repeat(33)]: "gemini",
    "xai-abcdefghijklmnopqrstuvwxyz": "xai",
    "pplx-abcdefghijklmnopqrstuvwxyz": "perplexity",
    "hf_abcdefghijklmnopqrstuvwxyz": "huggingface",
    "r8_abcdefghijklmnopqrstuvwxyz": "replicate",
    "csk-abcdefghijklmnopqrstuvwxyz": "cerebras",
  };
  for (const [key, id] of Object.entries(cases)) {
    const d = detectProvider(key);
    assert.equal(d.provider, id, key);
    assert.equal(d.confident, true, key);
  }
});

test("env var name beats key format", () => {
  const d = detectProvider("sk-0123456789abcdef0123456789abcdef", "DEEPSEEK_API_KEY");
  assert.deepEqual([d.provider, d.confident], ["deepseek", true]);
});

test("ambiguous sk- keys are flagged, not silently guessed", () => {
  const d = detectProvider("sk-0123456789abcdef0123456789abcdef");
  assert.equal(d.confident, false);
  assert.ok(d.candidates.includes("deepseek") && d.candidates.includes("qwen"));
});

test("every provider has the fields the UI and CLI rely on", () => {
  const ids = new Set();
  for (const p of providerList) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    for (const f of ["name", "mark", "keyUrl"]) assert.ok(p[f], `${p.id}.${f}`);
    assert.ok(p.env.length && p.regions.length && typeof p.request === "function", p.id);
    for (const r of p.regions) assert.ok(r.startsWith("https://"), `${p.id} must use https`);
  }
});

test("parseDotenv handles export, quotes and comments", () => {
  const out = parseDotenv(`# comment
export OPENAI_API_KEY="sk-proj-abc"
GROQ_API_KEY=gsk_x # trailing
EMPTY=
SINGLE='a b'`);
  assert.deepEqual(out, [
    { name: "OPENAI_API_KEY", value: "sk-proj-abc" },
    { name: "GROQ_API_KEY", value: "gsk_x" },
    { name: "EMPTY", value: "" },
    { name: "SINGLE", value: "a b" },
  ]);
});

test("extractKeys reads bare keys and .env text, skipping placeholders and duplicates", () => {
  const found = extractKeys(`OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz0123
ANTHROPIC_API_KEY=your-key-here
DATABASE_URL=postgres://localhost/db
gsk_abcdefghijklmnopqrstuvwxyz
gsk_abcdefghijklmnopqrstuvwxyz`);
  assert.deepEqual(found.map((f) => f.provider), ["openai", "groq"]);
});

test("extractKeys honours a forced provider", () => {
  const [f] = extractKeys("abcdefghijklmnopqrstuvwxyz123456", { forced: "mistral" });
  assert.equal(f.provider, "mistral");
});

test("scanEnvironment only accepts unknown variable names with unambiguous formats", () => {
  const { keys } = scanEnvironment({
    files: [],
    env: {
      MY_CLAUDE: "sk-ant-api03-abcdefghijklmnopqrstuvwxyz",
      RANDOM_SECRET: "sk-0123456789abcdef0123456789abcdef",
      MISTRAL_API_KEY: "abcdefghijklmnopqrstuvwxyz123456",
    },
  });
  assert.deepEqual(keys.map((k) => k.provider).sort(), ["anthropic", "mistral"]);
});

test("cleanKey strips Bearer prefix and quotes", () => {
  assert.equal(cleanKey('  Bearer "sk-abc"  '), "sk-abc");
});

test("mask never reveals most of the key", () => {
  const key = "sk-proj-abcdefghijklmnopqrstuvwxyz0123456789";
  const m = mask(key);
  assert.ok(m.endsWith("6789") && m.length < 16);
});

test("classify maps HTTP statuses to key states", () => {
  const p = providerList[0];
  const res = (status, body = {}) => ({ status, body, text: JSON.stringify(body) });
  assert.equal(classify(p, res(200)), "live");
  assert.equal(classify(p, res(401)), "invalid");
  assert.equal(classify(p, res(403)), "invalid");
  assert.equal(classify(p, res(402)), "no_credit");
  assert.equal(classify(p, res(429)), "limited");
  assert.equal(classify(p, res(400, { error: { message: "API key not valid" } })), "invalid");
  assert.equal(classify(p, res(400, { error: { message: "bad request" } })), "error");
  assert.equal(classify(p, res(503)), "error");
});

test("a 2xx HTML page (captive portal, bot challenge) is never 'live'", () => {
  const p = providerList[0];
  assert.equal(classify(p, { status: 200, body: null, text: "<html>Sign in to Wi-Fi</html>" }), "error");
});

test("validation-probe providers only count a real validation error as live", () => {
  const samba = providerList.find((p) => p.id === "sambanova");
  const res = (status, body, text = body ? JSON.stringify(body) : "") => ({ status, body, text });
  assert.equal(classify(samba, res(400, { error: { message: "input is required" } })), "live");
  assert.equal(classify(samba, res(404, null, "")), "error", "empty 404 seen from some regions");
  assert.equal(classify(samba, res(400, null, "")), "error", "400 without a JSON error");
  assert.equal(classify(samba, res(400, { error: { message: "Incorrect API key provided" } })), "invalid");
  assert.equal(classify(samba, res(401, { error: { message: "Incorrect API key provided" } })), "invalid");
});

test("checkKey parses models on success", async () => {
  const r = await checkKey("openai", "sk-proj-abcdefghijklmnopqrstuvwxyz", {
    fetchImpl: fakeFetch(200, { data: [{ id: "gpt-b" }, { id: "gpt-a" }] }, { "x-ratelimit-remaining-requests": "99" }),
  });
  assert.equal(r.status, "live");
  assert.deepEqual(r.models, ["gpt-a", "gpt-b"]);
  assert.equal(r.rateLimit, "99 req remaining");
});

test("checkKey scrubs the key out of provider error messages", async () => {
  const key = "sk-proj-abcdefghijklmnopqrstuvwxyz";
  const r = await checkKey("openai", key, { fetchImpl: fakeFetch(401, { error: { message: `bad key ${key}` } }) });
  assert.equal(r.status, "invalid");
  assert.ok(!r.message.includes(key));
});

test("checkKey tries the next region only when the key is rejected", async () => {
  const hosts = [];
  const fetchImpl = async (url) => {
    hosts.push(new URL(url).hostname);
    return hosts.length === 1
      ? new Response("{}", { status: 401 })
      : new Response(JSON.stringify({ data: [{ id: "kimi-k2" }] }), { status: 200 });
  };
  const r = await checkKey("kimi", "sk-abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqr", { fetchImpl });
  assert.equal(r.status, "live");
  assert.equal(hosts.length >= 2, true);
  assert.equal(r.region, "api.moonshot.cn");
});

test("OpenRouter and Novita report credit", async () => {
  const or = await checkKey("openrouter", "sk-or-v1-abcdefghijklmnopqrstuvwxyz", {
    fetchImpl: fakeFetch(200, { data: { limit: 10, limit_remaining: 7.5, usage: 2.5 } }),
  });
  assert.equal(or.balance, "$7.50 / $10.00");
  const nv = await checkKey("novita", "abcdefghijklmnopqrstuvwxyz", {
    fetchImpl: fakeFetch(200, { availableBalance: "123400" }),
  });
  assert.equal(nv.balance, "$12.34");
});

test("network failures become a readable error", async () => {
  const r = await checkKey("groq", "gsk_abcdefghijklmnopqrstuvwxyz", {
    fetchImpl: async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    },
  });
  assert.equal(r.status, "error");
  assert.match(r.message, /resolve/);
});

test("rejects keys containing whitespace without making a request", async () => {
  let called = false;
  const r = await checkKey("openai", "sk-abc def", { fetchImpl: async () => ((called = true), new Response("{}")) });
  assert.equal(r.status, "invalid");
  assert.equal(called, false);
});
