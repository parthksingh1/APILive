<div align="center">

# apilive

**Are your API keys alive?**

Check LLM API keys for 24 providers in seconds, with latency, models and remaining credit.<br>
It never makes an inference call, so it costs **zero tokens**. It runs on your machine and has **zero dependencies**.

[![npm](https://img.shields.io/npm/v/apilive?color=34d399&label=npm)](https://www.npmjs.com/package/apilive)
[![CI](https://github.com/parthksingh1/apilive/actions/workflows/ci.yml/badge.svg)](https://github.com/parthksingh1/apilive/actions/workflows/ci.yml)
![dependencies](https://img.shields.io/badge/dependencies-0-34d399)
![node](https://img.shields.io/badge/node-%3E%3D18-3c873a)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

```bash
npx apilive
```

<img src="docs/screenshot.png" alt="apilive checking eight API keys: five live with latency, models and credit, one rate-limited, one invalid, one out of credit" width="860">

</div>

---

## Why

You have keys scattered across `.env` files, old projects and password managers. Some are revoked, some are out of credit, and you can't tell which without writing a curl command for each provider.

Online key checkers want you to paste secrets into someone else's website. **apilive runs on your own machine.** Every key goes straight to its own provider's official API and nowhere else.

## Features

- **24 providers**: OpenAI, Anthropic, Gemini, Groq, Mistral, OpenRouter, DeepSeek, xAI, Together, Cohere, Kimi, Qwen, GLM/Z.ai, SiliconFlow, Perplexity, Cerebras, Fireworks, SambaNova, Hugging Face, Replicate, Novita, DeepInfra, Hyperbolic and Nebius.
- **Zero cost.** It only calls model-list, account and balance endpoints. It never generates a token.
- **Finds your keys.** It scans `.env`, `.env.local`, `.env.production`… and your shell environment.
- **Auto-detects the provider** from the key format (`sk-ant-`, `gsk_`, `AIza…`) or the variable name.
- **More than "valid or not".** Each key is reported as `live`, `invalid`, `no credit`, `rate-limited` or `unverified`.
- **Shows what the key can do**: latency, available models, and remaining **credit** for OpenRouter, DeepSeek, Kimi, SiliconFlow and Novita.
- **Paste a whole `.env` file.** It picks out every key, skips placeholders and removes duplicates.
- **CI-ready CLI** with exit codes and `--json`.
- **Exports** a Markdown or JSON report with keys masked.

