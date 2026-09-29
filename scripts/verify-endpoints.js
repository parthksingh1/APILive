#!/usr/bin/env node
// Guards against false positives: sends an obviously fake key to every
// provider and fails if any of them reports it as live.
//
// A provider whose validation endpoint is public (answers 200 without auth)
// would mark EVERY key as working — this catches that before it ships.
// Run it in CI on a schedule, since providers change their APIs.

import { providerList } from "../src/providers.js";
import { checkKey, pool } from "../src/check.js";

const fake = (p) => {
  const tail = "apiliveFakeKey0000000000000000000000000000";
  const byPrefix = {
    openai: "sk-proj-", anthropic: "sk-ant-api03-", groq: "gsk_", openrouter: "sk-or-v1-",
    xai: "xai-", perplexity: "pplx-", cerebras: "csk-", huggingface: "hf_", replicate: "r8_",
    fireworks: "fw_", together: "tgp_v1_", deepseek: "sk-", kimi: "sk-", qwen: "sk-", siliconflow: "sk-",
  };
  if (p.id === "gemini") return "AIzaSy" + tail.slice(0, 33);
  if (p.id === "glm") return "0123456789abcdef0123456789abcdef.apiliveFakeKey00";
  return (byPrefix[p.id] || "") + tail;
};

const results = await pool(providerList, 8, async (p) => ({ p, r: await checkKey(p.id, fake(p)) }));

let bad = 0;
for (const { p, r } of results) {
  const ok = r.status === "invalid";
  const warn = r.status === "error" || r.status === "limited";
  if (r.status === "live" || r.status === "no_credit") bad++;
  const mark = ok ? "ok  " : warn ? "WARN" : "FAIL";
  console.log(`${mark}  ${p.id.padEnd(12)} ${String(r.status).padEnd(9)} ${String(r.httpStatus ?? "-").padEnd(4)} ${r.message ?? ""}`.slice(0, 160));
}

console.log(
  bad
    ? `\n${bad} provider(s) accepted a fake key — their endpoint cannot validate keys. Fix before release.`
    : "\nNo provider accepted a fake key.",
);
process.exit(bad ? 1 : 0);
