# Guide

apilive checks whether your API keys work, across 24 AI providers, without spending tokens. It runs on your computer and nothing is stored.

## Getting started

You need **Node.js 18 or newer**. Check with `node --version`.

```bash
npx apilive
```

This starts apilive on your computer and opens it in your browser at `http://127.0.0.1:4577`. Run it from a project folder and it lists the keys it finds in that folder's `.env` files and in your environment. **Nothing is sent until you choose to check.**

To install it permanently instead:

```bash
npm install -g apilive
apilive
```

## Checking keys in the app

1. Click **Add keys** (or press `K`).
2. Paste one key, several keys (one per line), or an entire `.env` file.
3. apilive detects each key's provider from its format (`sk-ant-…`, `gsk_…`, `AIza…`) or its variable name (`OPENAI_API_KEY`). Check the preview, change the provider if needed, and click **Check**.
4. Click any row to open its details: the full status, the provider's message, available models, credit and where the key was found.

Keys found in `.env` files show up automatically. Use **Check all** to test them.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `K` | Add keys |
| `/` | Filter the table |
| `R` | Re-check all |
| `Esc` | Close a dialog or panel |
| `Ctrl` / `⌘` + `Enter` | Check the keys in the Add dialog |

## What each status means

| Status | Meaning | What to do |
|---|---|---|
| **Live** | The provider accepted the key. | Nothing. It works. |
| **Invalid** | The provider rejected the key (usually HTTP 401 or 403). | The key is revoked, mistyped, expired, or belongs to a different provider. Create a new one in the provider's dashboard. |
| **No credit** | The key is valid but the account has no balance (HTTP 402). | Add credit or billing with the provider. |
| **Rate-limited** | The key is valid but is being throttled right now (HTTP 429). | Wait and check again. |
| **Unverified** | apilive couldn't get a clear answer: a network error, timeout or unexpected response. | Check your connection, proxy or firewall, then retry. The provider may be having an outage. |

> "Live" means the key authenticates. Some providers, such as OpenAI, don't report credit through their API, so a live key can still run out of quota when you use it for real.

## Command line

```bash
apilive check                        # scan ./.env* files and environment variables
apilive check .env.production        # scan specific files
apilive check --no-env               # only .env files, ignore environment variables
apilive check --stdin                # read keys from standard input
apilive check --json                 # machine-readable output
apilive check --models               # also list each key's models
apilive providers                    # list supported providers and variable names
apilive update                       # update to the latest version
apilive privacy | terms              # print the Privacy Policy or Terms
```

Pipe keys from your clipboard so they never end up in your shell history:

```bash
pbpaste | apilive check --stdin                     # macOS
Get-Clipboard | apilive check --stdin               # Windows PowerShell
xclip -o -selection clipboard | apilive check --stdin  # Linux
```

### Options

| Option | Description |
|---|---|
| `--port <n>` | Port for the app (default 4577). If it's busy, the next free port is used. |
| `--no-open` | Don't open the browser automatically |
| `--no-env` | Ignore environment variables; only read `.env` files |
| `--stdin` | Read keys or `.env` text from standard input |
| `-p, --provider <id>` | Treat keys from stdin as this provider (see `apilive providers`) |
| `--json` | JSON output |
| `--models` | Include model lists |
| `--timeout <sec>` | Per-request timeout (default 15) |
| `--concurrency <n>` | Number of checks run in parallel (default 6) |
| `--no-update-check` | Don't check npm for a newer version |
| `--demo` | Sample keys and simulated responses, for screenshots |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | All keys are live (rate-limited counts as live) |
| `1` | At least one key is invalid, out of credit or unverified |
| `2` | No keys found, or invalid usage |

### Using it in CI

```yaml
# .github/workflows/keys.yml
on:
  schedule: [{ cron: "0 6 * * *" }]
jobs:
  keys:
    runs-on: ubuntu-latest
    steps:
      - run: npx -y apilive@1 check
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Pin a major version (`apilive@1`) in CI so a future release can't change behaviour unexpectedly.

## How keys are detected

apilive recognises a key in one of two ways:

1. **By variable name**, such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` or `GROQ_API_KEY`. Run `apilive providers` for the full list.
2. **By format**, when the prefix is unique: `sk-ant-`, `sk-proj-`, `sk-or-`, `gsk_`, `AIza`, `xai-`, `pplx-`, `csk-`, `fw_`, `tgp_v1_`, `hf_`, `r8_`.

Some formats are shared. A plain `sk-…` key could belong to OpenAI, DeepSeek, Qwen, Kimi or SiliconFlow. apilive **will not** try the key against each of them, because that would send your key to companies it doesn't belong to. It shows its best guess and asks you to confirm.

Placeholder values like `your-key-here`, `sk-...` or `xxxx` are ignored.

## Updating

apilive checks the npm registry for a new version at most once a day and tells you when one is available. It never updates itself without your permission.

| How you run apilive | How to update |
|---|---|
| `npx apilive` | Run `npx apilive@latest`. npx then uses the newest version. |
| Installed globally | `apilive update` (runs `npm install -g apilive@latest` after asking) |
| Project dependency | `npm install apilive@latest` |

To turn off update checks, set `NO_UPDATE_NOTIFIER=1` or `DO_NOT_TRACK=1`, or pass `--no-update-check`. See the [Changelog](CHANGELOG.md) for what's new in each release.

## Troubleshooting

**The browser didn't open.** Open the address printed in the terminal (for example `http://127.0.0.1:4577`) yourself. Over SSH or in a container, use `--no-open` and forward the port.

**"Port in use".** apilive tries the next free port automatically. Use `--port 5000` to pick one.

**Every key shows "Unverified" with a network error.** You're offline, or a proxy or firewall is blocking access to the provider. Node.js ignores `HTTP_PROXY` by default. On Node 24 or newer, set `NODE_USE_ENV_PROXY=1` along with `HTTPS_PROXY` to route through a corporate proxy.

**A key I know works shows "Invalid".** Check it's assigned to the right provider. Open the row and look at the provider shown. Also check for regional accounts: Kimi, Qwen, GLM and SiliconFlow keys are tried against both their international and China endpoints.

**"Can't reach the apilive server" in the browser.** The terminal running apilive was closed. Start it again.

## FAQ

**Does checking cost money?**
No tokens are generated. apilive only uses endpoints that list models or show account or balance details, and providers normally don't bill for those. Pricing is up to each provider, though, so see the [Terms](TERMS.md).

**Is it safe to paste my keys?**
Keys stay in the apilive process on your own computer. They're sent only to the provider they belong to, never written to disk, and never sent to the maintainers. The web page itself only sees masked keys. See the [Privacy Policy](PRIVACY.md) and [Security Policy](SECURITY.md).

**Why is there a 100-key limit?**
apilive is built for managing your own keys. A small limit keeps it useful for that and much less useful for testing leaked keys in bulk, which you must never do (see the [Terms](TERMS.md)).

**Can I check keys for a provider that isn't listed?**
Not yet. [Request it](https://github.com/parthksingh1/apilive/issues/new?template=provider_request.yml) or add it yourself (see `CONTRIBUTING.md`).

**How do I uninstall?**
If you used `npx`, there's nothing to uninstall. Otherwise run `npm uninstall -g apilive`. Optionally delete the config folder described in the [Privacy Policy](PRIVACY.md).
