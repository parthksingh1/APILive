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

## Usage

### Web UI

```bash
npx apilive
```

This opens `http://127.0.0.1:4577`. Any keys found in the current directory's `.env*` files or in your environment are listed but **not sent anywhere until you click Check**. You can also paste one key or an entire `.env` file.

### Terminal

```bash
npx apilive check                      # scan ./.env* + environment
npx apilive check .env.production      # specific files
npx apilive check --no-env             # only .env files, ignore shell env
pbpaste | npx apilive check --stdin    # from clipboard, stays out of shell history
npx apilive check --json               # machine-readable
npx apilive providers                  # list providers + env var names
```

```text
  apilive v1.1.0  ·  checking 4 keys  · free endpoints only, no credits spent

  ✓ OpenAI      sk-proj…7Hq2   live · 412ms · 87 models · 4999 req remaining
                OPENAI_API_KEY · .env
  ✓ OpenRouter  sk-or-v…2c81   live · 390ms · $13.42 / $20.00
                OPENROUTER_API_KEY · .env
  ~ Groq        gsk_DE…Wm4T    rate-limited · 305ms
                GROQ_API_KEY · .env.local
  ✗ Mistral     DEMOde…91Lz    invalid · 604ms · Unauthorized
                MISTRAL_API_KEY · .env

  2 live  ·  1 rate-limited  ·  1 invalid  ·  1.1s  ·  0 tokens spent
```

**Exit codes:** `0` all keys live (or only rate-limited) · `1` a key is invalid, out of credit, or unverifiable · `2` no keys found or bad usage.

### In CI

```yaml
# .github/workflows/keys.yml — nightly check that production keys still work
on:
  schedule: [{ cron: "0 6 * * *" }]
jobs:
  keys:
    runs-on: ubuntu-latest
    steps:
      - run: npx -y apilive@1 check   # pin the major version in CI
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Options

| Flag | Description |
|---|---|
| `--port <n>` | UI port (default `4577`, falls back to the next free port) |
| `--no-open` | Don't open the browser |
| `--no-env` | Ignore environment variables; only read `.env` files |
| `--stdin` | Read keys or `.env` text from stdin |
| `-p, --provider <id>` | Treat keys from stdin as this provider |
| `--json` | JSON output for `check` |
| `--models` | Print each key's model list |
| `--timeout <sec>` | Per-request timeout (default `15`) |
| `--concurrency <n>` | Parallel checks (default `6`) |
| `--demo` | UI with sample keys and simulated responses, for screenshots |
| `--no-update-check` | Don't check npm for a newer version |

Other commands: `apilive update` (update in place), `apilive privacy`, `apilive terms`. The [Guide](docs/GUIDE.md) has the full reference, troubleshooting and FAQ.

