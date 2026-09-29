// Provider registry.
//
// Every provider is validated against a FREE endpoint — model listing,
// account or balance. These authenticate the key and return metadata without
// running inference, so a check never spends tokens or credits.
//
// Each endpoint here has been confirmed to REJECT a fake key (see
// `npm run verify`). An endpoint that answers 200 without auth would report
// every key as live, so public listing endpoints are never used.
//
// Provider shape:
//   id, name, mark             display (plain monogram, never a logo)
//   keyUrl                     where users create / manage keys
//   env                        env var names that hold this provider's key
//   pattern                    regex that uniquely identifies the key format
//   loose                      regex that *might* be this provider (ambiguous)
//   regions                    base URLs tried in order until one accepts the key
//   request(key, base)         -> { url, method?, headers, body? }
//   parse(body, headers)       -> { models?, balance?, account?, rateLimit? }
//   acceptStatus               extra HTTP statuses that prove the key authenticated
//   extra(key, ctx)            optional follow-up lookup (e.g. balance); failures ignored

const bearer = (key) => ({ Authorization: `Bearer ${key}` });

export function modelIds(list) {
  if (!Array.isArray(list)) return [];
  const ids = list
    .map((m) => (typeof m === "string" ? m : m?.id ?? m?.name))
    .filter((x) => typeof x === "string" && x)
    .map((x) => x.replace(/^models\//, ""));
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function rateLimit(headers) {
  const req = headers?.get?.("x-ratelimit-remaining-requests");
  const tok = headers?.get?.("x-ratelimit-remaining-tokens");
  const parts = [];
  if (req != null) parts.push(`${req} req`);
  if (tok != null) parts.push(`${tok} tokens`);
  return parts.length ? `${parts.join(" · ")} remaining` : null;
}

const money = (n, currency = "USD") => {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const sym = { USD: "$", CNY: "¥", RMB: "¥" }[String(currency).toUpperCase()];
  return sym ? `${sym}${v.toFixed(2)}` : `${v.toFixed(2)} ${currency}`;
};

// OpenAI-compatible `GET {base}/models`.
function openAICompatible(path = "/models") {
  return {
    request: (key, base) => ({ url: base + path, headers: bearer(key) }),
    parse: (body, headers) => ({
      models: modelIds(Array.isArray(body) ? body : body?.data),
      rateLimit: rateLimit(headers),
    }),
  };
}

const list = [
  {
    id: "openai",
    name: "OpenAI",
    mark: "OA",
    keyUrl: "https://platform.openai.com/api-keys",
    env: ["OPENAI_API_KEY", "OPENAI_KEY"],
    pattern: /^sk-(proj|svcacct|admin)-[\w-]{20,}$/,
    loose: /^sk-[A-Za-z0-9]{48}$/,
    regions: ["https://api.openai.com/v1"],
    ...openAICompatible(),
  },
  {
    id: "anthropic",
    name: "Anthropic",
    mark: "An",
    keyUrl: "https://console.anthropic.com/settings/keys",
    env: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"],
    pattern: /^sk-ant-[\w-]{20,}$/,
    regions: ["https://api.anthropic.com/v1"],
    request: (key, base) => ({
      url: `${base}/models?limit=1000`,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    }),
    parse: (body) => ({ models: modelIds(body?.data) }),
  },
];

export const providers = Object.fromEntries(list.map((p) => [p.id, p]));
export const providerList = list;

// Public, serialisable view for the UI / `apilive providers`.
export function describeProviders() {
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    mark: p.mark,
    keyUrl: p.keyUrl,
    env: p.env,
    pattern: p.pattern?.source ?? null,
    loose: p.loose?.source ?? null,
    balance: Boolean(p.extra) || ["openrouter", "deepseek", "novita"].includes(p.id),
  }));
}

const envIndex = new Map(list.flatMap((p) => p.env.map((name) => [name, p.id])));

// Work out which provider a key belongs to.
// Returns { provider: id|null, confident: boolean, candidates: id[] }.
export function detectProvider(key, envName) {
  if (envName && envIndex.has(envName)) {
    return { provider: envIndex.get(envName), confident: true, candidates: [] };
  }
  const exact = list.find((p) => p.pattern?.test(key));
  if (exact) return { provider: exact.id, confident: true, candidates: [] };

  const candidates = list.filter((p) => p.loose?.test(key)).map((p) => p.id);
  return { provider: candidates[0] ?? null, confident: false, candidates };
}

export function providerForEnvName(name) {
  return envIndex.get(name) ?? null;
}
