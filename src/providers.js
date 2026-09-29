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
  {
    id: "gemini",
    name: "Google Gemini",
    mark: "Ge",
    keyUrl: "https://aistudio.google.com/app/apikey",
    env: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    pattern: /^AIza[\w-]{35}$/,
    regions: ["https://generativelanguage.googleapis.com/v1beta"],
    // Header auth keeps the key out of URLs (and any proxy logs).
    request: (key, base) => ({
      url: `${base}/models?pageSize=1000`,
      headers: { "x-goog-api-key": key },
    }),
    parse: (body) => ({ models: modelIds(body?.models) }),
  },
  {
    id: "groq",
    name: "Groq",
    mark: "Gq",
    keyUrl: "https://console.groq.com/keys",
    env: ["GROQ_API_KEY"],
    pattern: /^gsk_\w{20,}$/,
    regions: ["https://api.groq.com/openai/v1"],
    ...openAICompatible(),
  },
  {
    id: "mistral",
    name: "Mistral",
    mark: "Mi",
    keyUrl: "https://console.mistral.ai/api-keys",
    env: ["MISTRAL_API_KEY"],
    regions: ["https://api.mistral.ai/v1"],
    ...openAICompatible(),
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    mark: "OR",
    keyUrl: "https://openrouter.ai/keys",
    env: ["OPENROUTER_API_KEY"],
    pattern: /^sk-or-[\w-]{20,}$/,
    regions: ["https://openrouter.ai/api/v1"],
    // /key reports usage + credit limit; /models is public so it can't validate.
    request: (key, base) => ({ url: `${base}/key`, headers: bearer(key) }),
    parse: (body) => {
      const d = body?.data || {};
      let balance = null;
      if (d.limit_remaining != null) balance = `${money(d.limit_remaining)} / ${money(d.limit)}`;
      else if (d.usage != null) balance = `${money(d.usage)} used · no limit`;
      if (balance && d.is_free_tier) balance += " · free tier";
      return { balance, account: d.label || null };
    },
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    mark: "DS",
    keyUrl: "https://platform.deepseek.com/api_keys",
    env: ["DEEPSEEK_API_KEY"],
    loose: /^sk-[a-f0-9]{32}$/,
    regions: ["https://api.deepseek.com"],
    request: (key, base) => ({ url: `${base}/user/balance`, headers: bearer(key) }),
    parse: (body) => {
      const info = (body?.balance_infos || [])[0];
      if (info) return { balance: money(info.total_balance, info.currency) };
      if (body?.is_available != null) return { balance: body.is_available ? "Balance available" : "No balance" };
      return {};
    },
  },
  {
    id: "xai",
    name: "xAI Grok",
    mark: "xA",
    keyUrl: "https://console.x.ai",
    env: ["XAI_API_KEY", "GROK_API_KEY"],
    pattern: /^xai-\w{20,}$/,
    regions: ["https://api.x.ai/v1"],
    ...openAICompatible(),
  },
  {
    id: "together",
    name: "Together AI",
    mark: "To",
    keyUrl: "https://api.together.ai/settings/api-keys",
    env: ["TOGETHER_API_KEY", "TOGETHERAI_API_KEY"],
    pattern: /^tgp_v1_[\w-]{20,}$/,
    regions: ["https://api.together.xyz/v1"],
    ...openAICompatible(),
  },
  {
    id: "cohere",
    name: "Cohere",
    mark: "Co",
    keyUrl: "https://dashboard.cohere.com/api-keys",
    env: ["COHERE_API_KEY", "CO_API_KEY"],
    regions: ["https://api.cohere.com/v1"],
    request: (key, base) => ({ url: `${base}/models?page_size=1000`, headers: bearer(key) }),
    parse: (body) => ({ models: modelIds(body?.models) }),
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    mark: "Ki",
    keyUrl: "https://platform.moonshot.ai/console/api-keys",
    env: ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
    loose: /^sk-\w{40,}$/,
    regions: ["https://api.moonshot.ai/v1", "https://api.moonshot.cn/v1"],
    ...openAICompatible(),
    async extra(key, { base, get }) {
      const res = await get(`${base}/users/me/balance`, bearer(key));
      const d = res.body?.data;
      if (d?.available_balance == null) return {};
      const cur = base.includes(".cn") ? "CNY" : "USD";
      return { balance: money(d.available_balance, cur) };
    },
  },
  {
    id: "qwen",
    name: "Qwen (DashScope)",
    mark: "Qw",
    keyUrl: "https://bailian.console.alibabacloud.com/?apiKey=1",
    env: ["DASHSCOPE_API_KEY", "QWEN_API_KEY"],
    loose: /^sk-[a-f0-9]{32}$/,
    regions: [
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    ],
    ...openAICompatible(),
  },
  {
    id: "glm",
    name: "GLM (Zhipu / Z.ai)",
    mark: "GL",
    keyUrl: "https://z.ai/manage-apikey/apikey-list",
    env: ["ZHIPUAI_API_KEY", "ZAI_API_KEY", "GLM_API_KEY"],
    pattern: /^[a-f0-9]{32}\.[A-Za-z0-9]{16}$/,
    regions: ["https://api.z.ai/api/paas/v4", "https://open.bigmodel.cn/api/paas/v4"],
    ...openAICompatible(),
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    mark: "SF",
    keyUrl: "https://cloud.siliconflow.com/account/ak",
    env: ["SILICONFLOW_API_KEY", "SILICON_FLOW_API_KEY"],
    loose: /^sk-[a-z]{40,}$/,
    regions: ["https://api.siliconflow.com/v1", "https://api.siliconflow.cn/v1"],
    ...openAICompatible(),
    async extra(key, { base, get }) {
      const res = await get(`${base}/user/info`, bearer(key));
      const d = res.body?.data;
      if (d?.totalBalance == null) return {};
      const cur = base.includes(".cn") ? "CNY" : "USD";
      return { balance: money(d.totalBalance, cur), account: d.name || d.email || null };
    },
  },
  {
    id: "perplexity",
    name: "Perplexity",
    mark: "Px",
    keyUrl: "https://www.perplexity.ai/settings/api",
    env: ["PERPLEXITY_API_KEY", "PPLX_API_KEY"],
    pattern: /^pplx-\w{20,}$/,
    regions: ["https://api.perplexity.ai/v1"],
    ...openAICompatible(),
  },
  {
    id: "cerebras",
    name: "Cerebras",
    mark: "Ce",
    keyUrl: "https://cloud.cerebras.ai",
    env: ["CEREBRAS_API_KEY"],
    pattern: /^csk-\w{20,}$/,
    regions: ["https://api.cerebras.ai/v1"],
    ...openAICompatible(),
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    mark: "Fw",
    keyUrl: "https://fireworks.ai/account/api-keys",
    env: ["FIREWORKS_API_KEY"],
    pattern: /^fw_\w{20,}$/,
    regions: ["https://api.fireworks.ai/inference/v1"],
    ...openAICompatible(),
  },
  {
    id: "sambanova",
    name: "SambaNova",
    mark: "Sa",
    keyUrl: "https://cloud.sambanova.ai/apis",
    env: ["SAMBANOVA_API_KEY"],
    regions: ["https://api.sambanova.ai/v1"],
    // SambaNova's /models is public, so it can't prove anything. Instead we
    // send an embeddings request with no input: a bad key gets 401, a good key
    // gets a validation error. Nothing is ever computed or billed.
    request: (key, base) => ({
      url: `${base}/embeddings`,
      method: "POST",
      headers: { ...bearer(key), "Content-Type": "application/json" },
      body: JSON.stringify({ model: "E5-Mistral-7B-Instruct" }),
    }),
    acceptStatus: [400, 404, 422],
    parse: () => ({}),
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    mark: "HF",
    keyUrl: "https://huggingface.co/settings/tokens",
    env: ["HF_TOKEN", "HUGGINGFACE_API_KEY", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACEHUB_API_TOKEN"],
    pattern: /^hf_\w{20,}$/,
    regions: ["https://huggingface.co/api"],
    request: (key, base) => ({ url: `${base}/whoami-v2`, headers: bearer(key) }),
    parse: (body) => {
      const role = body?.auth?.accessToken?.role;
      return { account: [body?.name, role && `${role} token`].filter(Boolean).join(" · ") || null };
    },
  },
  {
    id: "replicate",
    name: "Replicate",
    mark: "Re",
    keyUrl: "https://replicate.com/account/api-tokens",
    env: ["REPLICATE_API_TOKEN", "REPLICATE_API_KEY"],
    pattern: /^r8_\w{20,}$/,
    regions: ["https://api.replicate.com/v1"],
    request: (key, base) => ({ url: `${base}/account`, headers: bearer(key) }),
    parse: (body) => ({
      account: [body?.username, body?.type].filter(Boolean).join(" · ") || null,
    }),
  },
  {
    id: "novita",
    name: "Novita AI",
    mark: "No",
    keyUrl: "https://novita.ai/settings/key-management",
    env: ["NOVITA_API_KEY"],
    regions: ["https://api.novita.ai"],
    // Novita's /models is public. The billing endpoint requires auth and is
    // free. Amounts are in 1/10000 USD.
    request: (key, base) => ({
      url: `${base}/openapi/v1/billing/balance/detail`,
      headers: bearer(key),
    }),
    parse: (body) =>
      body?.availableBalance != null
        ? { balance: money(Number(body.availableBalance) / 10000) }
        : {},
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
