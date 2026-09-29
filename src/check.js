// Runs a single key check and normalises the result.
//
// Result:
//   {
//     provider, status, latencyMs, httpStatus, message,
//     models: string[] | null, modelCount, balance, account, rateLimit, region
//   }
//
// status is one of:
//   live       key authenticated
//   invalid    provider rejected the key (401/403, or a 400 that says so)
//   no_credit  key is valid but the account has no credit (402)
//   limited    key is valid but rate-limited right now (429)
//   error      could not reach the provider / unexpected response

import { providers } from "./providers.js";
import { mask } from "./util.js";

export const DEFAULT_TIMEOUT_MS = 15000;
const AUTH_HINT = /api[ _-]?key|token|auth|credential|unauthori[sz]ed|not valid/i;

export function cleanKey(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

export function validateKeyShape(key) {
  if (!key) return "No API key provided";
  if (key.length > 1024) return "That doesn't look like an API key (too long)";
  if (/[\s\u0000-\u001f\u007f]/.test(key)) return "API keys can't contain spaces or line breaks";
  return null;
}

async function send(fetchImpl, { url, method = "GET", headers = {}, body }, timeoutMs) {
  const res = await fetchImpl(url, {
    method,
    headers: { Accept: "application/json", "User-Agent": "apilive", ...headers },
    body,
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, body: json, text };
}

function extractMessage(res) {
  const b = res.body;
  const pick = [
    b?.error?.message,
    typeof b?.error === "string" ? b.error : null,
    b?.message,
    typeof b?.detail === "string" ? b.detail : b?.detail?.message,
    b?.title,
    b?.msg,
  ].find((x) => typeof x === "string" && x.trim());
  if (pick) return pick.trim();
  if (res.text && res.text.length < 200 && !res.text.trim().startsWith("<")) return res.text.trim();
  return `HTTP ${res.status}`;
}

export function classify(provider, res) {
  const s = res.status;
  if ((s >= 200 && s < 300) || provider.acceptStatus?.includes(s)) return "live";
  if (s === 401 || s === 403) return "invalid";
  if (s === 402) return "no_credit";
  if (s === 429) return "limited";
  if (s === 400 && AUTH_HINT.test(extractMessage(res))) return "invalid";
  return "error";
}

function networkMessage(e, timeoutMs) {
  if (e?.name === "TimeoutError" || e?.name === "AbortError") {
    return `Timed out after ${Math.round(timeoutMs / 1000)}s`;
  }
  const code = e?.cause?.code || e?.code;
  const map = {
    ENOTFOUND: "Could not resolve the provider's host (offline or DNS blocked?)",
    ECONNREFUSED: "Connection refused by the provider",
    ECONNRESET: "Connection reset by the provider",
    CERT_HAS_EXPIRED: "TLS certificate error",
    UND_ERR_CONNECT_TIMEOUT: "Connection timed out",
  };
  return map[code] || `Network error${code ? ` (${code})` : ""}: ${e?.message || "request failed"}`;
}

// Never echo a key back, even partially-masked ones providers send us.
function scrub(message, key) {
  let m = String(message);
  if (key && key.length >= 8) m = m.split(key).join(mask(key));
  return m.length > 300 ? m.slice(0, 297) + "…" : m;
}

export async function checkKey(providerId, rawKey, opts = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = globalThis.fetch } = opts;
  const provider = providers[providerId];
  const base = {
    provider: providerId,
    status: "error",
    latencyMs: null,
    httpStatus: null,
    message: null,
    models: null,
    modelCount: null,
    balance: null,
    account: null,
    rateLimit: null,
    region: null,
  };

  if (!provider) return { ...base, message: `Unknown provider "${providerId}"` };
  const key = cleanKey(rawKey);
  const shapeError = validateKeyShape(key);
  if (shapeError) return { ...base, status: "invalid", message: shapeError };

  const regions = provider.regions;
  let last = null;

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const t0 = Date.now();
    let res;
    try {
      res = await send(fetchImpl, provider.request(key, region), timeoutMs);
    } catch (e) {
      last = { ...base, latencyMs: Date.now() - t0, message: scrub(networkMessage(e, timeoutMs), key) };
      continue;
    }
    const status = classify(provider, res);
    const result = {
      ...base,
      status,
      latencyMs: Date.now() - t0,
      httpStatus: res.status,
      region: regions.length > 1 ? new URL(region).hostname : null,
    };

    if (status === "live") {
      let parsed = {};
      try {
        parsed = provider.parse(res.body ?? {}, res.headers) || {};
      } catch {
        parsed = {};
      }
      if (provider.extra) {
        try {
          const get = (url, headers) => send(fetchImpl, { url, headers }, timeoutMs);
          const more = await provider.extra(key, { base: region, get });
          parsed = { ...parsed, ...Object.fromEntries(Object.entries(more || {}).filter(([, v]) => v != null)) };
        } catch {
          // Optional enrichment — the key is still live.
        }
      }
      const models = parsed.models?.length ? parsed.models : null;
      return {
        ...result,
        models,
        modelCount: models ? models.length : null,
        balance: parsed.balance ?? null,
        account: parsed.account ?? null,
        rateLimit: parsed.rateLimit ?? null,
      };
    }

    result.message = scrub(extractMessage(res), key);
    last = result;
    // Only try the next region when this one said "not my key".
    if (status !== "invalid") break;
  }

  return last;
}

// Run tasks with bounded concurrency, preserving order.
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
