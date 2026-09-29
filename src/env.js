// Finds API keys in .env files, the process environment, or pasted text.

import fs from "node:fs";
import path from "node:path";
import { detectProvider, providerForEnvName, providers } from "./providers.js";
import { cleanKey } from "./check.js";

export const DEFAULT_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.test",
  ".env.test.local",
  ".env.production",
  ".env.production.local",
];

const PLACEHOLDER = /^(|x+|\.\.\.|changeme|change_me|todo|null|undefined|none|your[-_ ].*|<.*>|\$\{.*\}|sk-\.\.\.|sk-x+|.*\*{3,}.*)$/i;

// Minimal dotenv parser: KEY=VALUE, `export KEY=VALUE`, quotes, inline comments.
export function parseDotenv(text) {
  const out = [];
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*[=:]\s*(.*)?$/);
    if (!m) continue;
    let value = (m[2] ?? "").trim();
    const q = value[0];
    if ((q === '"' || q === "'" || q === "`") && value.indexOf(q, 1) > 0) {
      value = value.slice(1, value.indexOf(q, 1));
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    out.push({ name: m[1], value });
  }
  return out;
}

function looksLikeKey(value) {
  return value.length >= 16 && !PLACEHOLDER.test(value) && !/\s/.test(value);
}

// Turn arbitrary pasted text (one key, many keys, or a whole .env) into
// candidate entries. `forced` pins every bare key to one provider.
export function extractKeys(text, { forced = null } = {}) {
  const found = [];
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const [pair] = parseDotenv(line);
    // A base64-ish key ending in "=" parses as a pair too, so only treat the
    // line as NAME=VALUE when the value itself looks like a key.
    if (pair && looksLikeKey(cleanKey(pair.value))) {
      const key = cleanKey(pair.value);
      const byName = providerForEnvName(pair.name);
      if (byName || forced) {
        found.push({ key, name: pair.name, provider: forced || byName, confident: true, candidates: [] });
        continue;
      }
      const d = detectProvider(key);
      if (d.provider) found.push({ key, name: pair.name, ...d });
      continue;
    }
    // NAME=placeholder / NAME= lines are config, not a bare key.
    if (pair && /^[A-Z][A-Z0-9]*_[A-Z0-9_]*$/.test(pair.name)) continue;
    const key = cleanKey(line);
    if (!key || /\s/.test(key)) continue;
    if (forced) {
      found.push({ key, name: null, provider: forced, confident: true, candidates: [] });
    } else {
      found.push({ key, name: null, ...detectProvider(key) });
    }
  }
  return dedupe(found);
}

function dedupe(entries) {
  const map = new Map();
  for (const e of entries) {
    const id = `${e.provider}\u0000${e.key}`;
    const prev = map.get(id);
    if (prev) {
      for (const s of e.sources || []) if (!prev.sources?.includes(s)) prev.sources = [...(prev.sources || []), s];
    } else {
      map.set(id, { ...e });
    }
  }
  return [...map.values()];
}

// Scan .env files in `cwd` (or explicit `files`) plus the process environment.
export function scanEnvironment({ cwd = process.cwd(), files = null, env = process.env, includeEnv = true } = {}) {
  const found = [];
  const targets = files ?? DEFAULT_ENV_FILES.map((f) => path.join(cwd, f));
  const scanned = [];

  for (const file of targets) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (e) {
      if (files) scanned.push({ file, error: e.code === "ENOENT" ? "not found" : e.message });
      continue;
    }
    scanned.push({ file });
    const label = path.relative(cwd, file) || file;
    for (const { name, value } of parseDotenv(text)) {
      const entry = fromVar(name, value);
      if (entry) found.push({ ...entry, sources: [`${name} · ${label}`] });
    }
  }

  if (includeEnv) {
    for (const [name, value] of Object.entries(env)) {
      const entry = fromVar(name, value ?? "");
      if (entry) found.push({ ...entry, sources: [`${name} · env`] });
    }
  }

  return { keys: dedupe(found), scanned };
}

function fromVar(name, value) {
  const key = cleanKey(value);
  if (!looksLikeKey(key)) return null;
  const byName = providerForEnvName(name);
  if (byName) return { key, name, provider: byName, confident: true, candidates: [] };
  // Unknown variable name: only accept keys whose format is unambiguous.
  const d = detectProvider(key);
  if (d.confident && providers[d.provider]) return { key, name, ...d };
  return null;
}
