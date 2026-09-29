// `apilive --demo`: sample keys + canned provider responses, no network.
// Handy for screenshots and screen recordings without exposing real keys.

const models = (...ids) => ({ data: ids.map((id) => ({ id })) });

const RESPONSES = {
  "api.openai.com": [200, models("gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini", "o3", "o4-mini", "gpt-image-1", "text-embedding-3-large", "text-embedding-3-small", "whisper-1", "tts-1"), { "x-ratelimit-remaining-requests": "4999" }],
  "api.anthropic.com": [200, models("claude-opus-5-5", "claude-sonnet-5", "claude-haiku-4-5-20251001", "claude-opus-4-1", "claude-sonnet-4-5")],
  "generativelanguage.googleapis.com": [200, { models: ["gemini-3-pro", "gemini-3-flash", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "text-embedding-004"].map((n) => ({ name: `models/${n}` })) }],
  "openrouter.ai": [200, { data: { label: "laptop", limit: 20, limit_remaining: 13.42, usage: 6.58 } }],
  "api.deepseek.com": [200, { is_available: true, balance_infos: [{ currency: "USD", total_balance: "4.20" }] }],
  "api.groq.com": [429, { error: { message: "Rate limit reached for requests per minute. Please try again in 2s." } }],
  "api.mistral.ai": [401, { detail: "Unauthorized" }],
  "api.x.ai": [402, { error: "Your team has run out of credits. Purchase more at console.x.ai." }],
};

export const DEMO_KEYS = [
  ["openai", "OPENAI_API_KEY", "sk-proj-DEMOdemoDEMOdemoDEMOdemo7Hq2"],
  ["anthropic", "ANTHROPIC_API_KEY", "sk-ant-api03-DEMOdemoDEMOdemoDEMOdemoQ9xa"],
  ["gemini", "GEMINI_API_KEY", "AIzaSyDEMOdemoDEMOdemoDEMOdemoDEMOd4kQ"],
  ["openrouter", "OPENROUTER_API_KEY", "sk-or-v1-DEMOdemoDEMOdemoDEMOdemo2c81"],
  ["deepseek", "DEEPSEEK_API_KEY", "sk-DEMOdemoDEMOdemoDEMOdemo0f3e"],
  ["groq", "GROQ_API_KEY", "gsk_DEMOdemoDEMOdemoDEMOdemoWm4T"],
  ["mistral", "MISTRAL_API_KEY", "demo_mistral_not_a_real_key_91Lz"],
  ["xai", "XAI_API_KEY", "xai-DEMOdemoDEMOdemoDEMOdemo5sYr"],
].map(([provider, name, key]) => ({
  provider,
  name,
  key,
  confident: true,
  candidates: [],
  sources: [`${name} · ${provider === "groq" || provider === "xai" ? ".env.local" : ".env"}`],
}));

export async function demoFetch(url) {
  const host = new URL(url).hostname;
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 700));
  const [status, body, headers = {}] = RESPONSES[host] || [401, { error: { message: "Invalid API key" } }];
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
