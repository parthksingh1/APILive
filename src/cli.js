// Command-line interface.

import fs from "node:fs";
import path from "node:path";
import { providerList, providers } from "./providers.js";
import { checkKey, pool, DEFAULT_TIMEOUT_MS } from "./check.js";
import { extractKeys, scanEnvironment } from "./env.js";
import { createApp, listenWithFallback, openBrowser, MAX_KEYS } from "./server.js";
import { checkForUpdate, installKind, updateCommand, runGlobalUpdate, readState, writeState, RELEASES_URL } from "./update.js";
import readline from "node:readline/promises";
import { mask, plural } from "./util.js";
import { c, sym, pad } from "./term.js";

const VERSION = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

const HELP = `
  ${c.bold("apilive")} ${c.dim("v" + VERSION)} — check if your LLM API keys are live, without spending credits.

  ${c.bold("Usage")}
    ${c.cyan("npx apilive")}                     Open the local web UI
    ${c.cyan("npx apilive check")} ${c.dim("[files…]")}      Check keys in .env files + environment
    ${c.cyan("npx apilive providers")}           List supported providers
    ${c.cyan("npx apilive update")}              Update to the latest version
    ${c.cyan("npx apilive privacy")} | ${c.cyan("terms")}     Show the Privacy Policy or Terms of Use

  ${c.bold("Options")}
    --port <n>            UI port ${c.dim("(default 4577)")}
    --no-open             Don't open the browser
    --no-env              Ignore environment variables, only read .env files
    --stdin               Read keys or .env text from stdin ${c.dim("(or: check -)")}
    -p, --provider <id>   Treat keys from stdin as this provider
    --json                Print machine-readable JSON ${c.dim("(check)")}
    --models              List each key's models ${c.dim("(check)")}
    --demo                UI with sample keys and fake responses ${c.dim("(for screenshots)")}
    --timeout <sec>       Per-request timeout ${c.dim(`(default ${DEFAULT_TIMEOUT_MS / 1000})`)}
    --concurrency <n>     Checks in parallel ${c.dim("(default 6)")}
    --no-update-check     Don't check npm for a newer version
    -y, --yes             Don't ask for confirmation (update)
    -h, --help            Show this help
    -v, --version         Show version

  ${c.bold("Examples")}
    ${c.dim("# scan ./.env, ./.env.local … and your shell environment")}
    npx apilive check

    ${c.dim("# check one key without it landing in shell history")}
    pbpaste | npx apilive check --stdin

    ${c.dim("# fail a CI job if any key is dead")}
    npx apilive check --no-env .env.production

  ${c.bold("Exit codes")}  0 all keys live · 1 a key failed · 2 no keys found / bad usage

  Keys are only ever sent to their own provider's official API, using free
  metadata endpoints (model lists, balance). Nothing is stored or logged.
  Only check keys you own or are authorized to use. See: apilive terms
`;

function parseArgs(argv) {
  const opts = {
    command: "ui",
    files: [],
    port: 4577,
    open: true,
    env: true,
    stdin: false,
    provider: null,
    json: false,
    models: false,
    demo: false,
    updateCheck: true,
    yes: false,
    timeout: DEFAULT_TIMEOUT_MS / 1000,
    concurrency: 6,
  };
  const need = (i, flag) => {
    if (argv[i + 1] == null) throw usage(`${flag} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h": case "--help": opts.command = "help"; break;
      case "-v": case "--version": opts.command = "version"; break;
      case "--port": opts.port = Number(need(i, a)); i++; break;
      case "--no-open": opts.open = false; break;
      case "--no-env": opts.env = false; break;
      case "--stdin": case "-": opts.stdin = true; break;
      case "-p": case "--provider": opts.provider = need(i, a); i++; break;
      case "--json": opts.json = true; break;
      case "--models": opts.models = true; break;
      case "--demo": opts.demo = true; break;
      case "--no-update-check": case "--no-update-notifier": opts.updateCheck = false; break;
      case "-y": case "--yes": opts.yes = true; break;
      case "--timeout": opts.timeout = Number(need(i, a)); i++; break;
      case "--concurrency": opts.concurrency = Number(need(i, a)); i++; break;
      default:
        if (a.startsWith("-")) throw usage(`Unknown option ${a}`);
        if (["ui", "check", "providers", "help", "version", "update", "privacy", "terms"].includes(a) && opts.command === "ui" && !opts.files.length) {
          opts.command = a;
        } else {
          opts.files.push(a);
        }
    }
  }
  if (!Number.isInteger(opts.port) || opts.port < 0 || opts.port > 65535) throw usage("--port must be 0–65535");
  if (!(opts.timeout > 0)) throw usage("--timeout must be a positive number of seconds");
  if (!(opts.concurrency >= 1)) throw usage("--concurrency must be at least 1");
  if (opts.provider && !providers[opts.provider]) {
    throw usage(`Unknown provider "${opts.provider}". Run \`apilive providers\` to see ids.`);
  }
  return opts;
}

function usage(message) {
  return Object.assign(new Error(message), { usage: true });
}

async function readStdin() {
  if (process.stdin.isTTY) {
    process.stderr.write(c.dim("  Paste keys or .env contents, then press Ctrl+D (Ctrl+Z, Enter on Windows):\n"));
  }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const STATUS_STYLE = {
  live: (s) => c.green(s),
  limited: (s) => c.yellow(s),
  no_credit: (s) => c.yellow(s),
  invalid: (s) => c.red(s),
  error: (s) => c.magenta(s),
};
const STATUS_LABEL = { live: "live", limited: "rate-limited", no_credit: "no credit", invalid: "invalid", error: "error" };

async function runCheck(opts) {
  let entries = [];
  let scanned = [];

  if (opts.stdin) {
    const text = await readStdin();
    entries = extractKeys(text, { forced: opts.provider });
  } else {
    const files = opts.files.length ? opts.files.map((f) => path.resolve(f)) : null;
    const r = scanEnvironment({ files, includeEnv: opts.env });
    entries = r.keys;
    scanned = r.scanned;
  }

  const missing = scanned.filter((s) => s.error);
  for (const m of missing) process.stderr.write(c.yellow(`  ${sym.error} ${m.file}: ${m.error}\n`));

  if (entries.length > MAX_KEYS) {
    console.error(c.yellow(`  Found ${entries.length} keys. apilive checks at most ${MAX_KEYS} at a time. It's built for your own keys, not bulk testing.`));
    entries = entries.slice(0, MAX_KEYS);
  }

  const unknown = entries.filter((e) => !e.provider);
  entries = entries.filter((e) => e.provider);

  if (!entries.length) {
    if (opts.json) {
      process.stdout.write(JSON.stringify({ results: [], summary: { total: 0 } }, null, 2) + "\n");
    } else {
      const where = scanned.filter((s) => !s.error).map((s) => path.relative(process.cwd(), s.file) || s.file);
      console.log(`\n  ${c.yellow("No API keys found.")}`);
      const looked = [...where, opts.env && !opts.stdin ? "environment variables" : null].filter(Boolean);
      console.log(c.dim(`  Looked in: ${looked.length ? looked.join(", ") : "no .env files in this folder"}${opts.env ? "" : " (--no-env: environment skipped)"}`));
      if (unknown.length) console.log(c.dim(`  ${plural(unknown.length, "key")} had an unrecognised format — pass --provider <id>.`));
      console.log(c.dim(`  Try: echo "sk-..." | npx apilive check --stdin\n`));
    }
    return 2;
  }

  const started = Date.now();
  const tty = process.stderr.isTTY && !opts.json;
  let done = 0;
  if (!opts.json) {
    console.log(`\n  ${c.bold("apilive")} ${c.dim(`v${VERSION}`)}  ${c.dim(sym.sep)}  checking ${plural(entries.length, "key")}  ${c.dim(sym.sep + " free endpoints only, no credits spent")}\n`);
  }
  const progress = () => tty && process.stderr.write(`\r  ${c.dim(`Checking ${done}/${entries.length}…`)}`);
  progress();

  const results = await pool(entries, opts.concurrency, async (e) => {
    const r = await checkKey(e.provider, e.key, { timeoutMs: opts.timeout * 1000 });
    done++;
    progress();
    return { entry: e, result: r };
  });
  if (tty) process.stderr.write("\r\x1b[2K");

  const counts = { live: 0, limited: 0, no_credit: 0, invalid: 0, error: 0 };
  for (const { result } of results) counts[result.status]++;
  const failed = counts.invalid + counts.no_credit + counts.error;

  if (opts.json) {
    const out = results.map(({ entry, result }) => ({
      provider: entry.provider,
      key: mask(entry.key),
      sources: entry.sources || [],
      ...result,
      models: opts.models ? result.models : undefined,
    }));
    process.stdout.write(
      JSON.stringify({ results: out, summary: { total: results.length, ...counts, ms: Date.now() - started } }, null, 2) + "\n",
    );
    return failed ? 1 : 0;
  }

  const nameWidth = Math.max(...results.map((r) => providers[r.entry.provider].name.length)) + 2;
  const keyWidth = Math.max(...results.map((r) => mask(r.entry.key).length)) + 2;

  for (const { entry, result } of results) {
    const style = STATUS_STYLE[result.status];
    const bits = [style(STATUS_LABEL[result.status])];
    if (result.latencyMs != null) bits.push(`${result.latencyMs}ms`);
    if (result.modelCount) bits.push(plural(result.modelCount, "model"));
    if (result.balance) bits.push(c.cyan(result.balance));
    if (result.account) bits.push(result.account);
    if (result.rateLimit) bits.push(c.dim(result.rateLimit));
    if (result.message && result.status !== "live") bits.push(c.dim(result.message));

    console.log(
      `  ${style(sym[result.status])} ${pad(c.bold(providers[entry.provider].name), nameWidth)}${pad(c.dim(mask(entry.key)), keyWidth)}${bits.join(c.dim(` ${sym.sep} `))}`,
    );
    const meta = [...(entry.sources || []), entry.confident === false ? `guessed ${providers[entry.provider].name} — use --provider to override` : null].filter(Boolean);
    if (meta.length) console.log(`    ${" ".repeat(nameWidth)}${c.dim(meta.join(", "))}`);
    if (opts.models && result.models?.length) {
      console.log(`    ${" ".repeat(nameWidth)}${c.gray(result.models.join(", "))}`);
    }
  }

  const summary = [
    counts.live && c.green(`${counts.live} live`),
    counts.limited && c.yellow(`${counts.limited} rate-limited`),
    counts.no_credit && c.yellow(`${counts.no_credit} no credit`),
    counts.invalid && c.red(`${counts.invalid} invalid`),
    counts.error && c.magenta(`${plural(counts.error, "error")}`),
  ].filter(Boolean);
  console.log(`\n  ${summary.join(c.dim(`  ${sym.sep}  `))}  ${c.dim(`${sym.sep}  ${((Date.now() - started) / 1000).toFixed(1)}s  ${sym.sep}  0 tokens spent`)}`);
  if (unknown.length) console.log(c.dim(`  Skipped ${plural(unknown.length, "key")} with an unrecognised format (use --provider).`));
  console.log();
  return failed ? 1 : 0;
}

function runProviders(opts) {
  if (opts.json) {
    process.stdout.write(JSON.stringify(providerList.map((p) => ({ id: p.id, name: p.name, env: p.env, keyUrl: p.keyUrl })), null, 2) + "\n");
    return 0;
  }
  console.log(`\n  ${c.bold(`${providerList.length} supported providers`)}\n`);
  const w = Math.max(...providerList.map((p) => p.id.length)) + 3;
  const nw = Math.max(...providerList.map((p) => p.name.length)) + 3;
  for (const p of providerList) {
    console.log(`  ${pad(c.cyan(p.id), w)}${pad(p.name, nw)}${c.dim(p.env.join(", "))}`);
  }
  console.log();
  return 0;
}

async function runUi(opts) {
  const app = createApp({
    version: VERSION,
    includeEnv: opts.env,
    demo: opts.demo,
    updateCheck: opts.updateCheck,
    files: opts.files.length ? opts.files.map((f) => path.resolve(f)) : null,
    timeoutMs: opts.timeout * 1000,
  });
  let port;
  try {
    port = await listenWithFallback(app, opts.port);
  } catch (e) {
    console.error(c.red(`  Could not start server: ${e.message}`));
    return 1;
  }
  const url = `http://127.0.0.1:${port}`;
  const found = app.keys.size;

  console.log(`
  ${c.green(sym.dot)} ${c.bold("apilive")} ${c.dim(`v${VERSION}`)}

  ${c.dim("Local:")}   ${c.cyan(url)}
  ${c.dim("Found:")}   ${found ? `${plural(found, "key")} in ${describeSources(app)}` : c.dim("no keys in .env / environment — paste some in the UI")}

  ${c.dim(`Runs only on this machine. Keys go only to their own provider and are never stored.`)}
  ${c.dim("Press Ctrl+C to stop.")}
`);
  if (opts.open) openBrowser(url);
  if (!opts.demo) checkForUpdate(VERSION, { disabled: !opts.updateCheck }).then(printUpdateNotice, () => {});

  await new Promise((resolve) => {
    const stop = () => {
      console.log(c.dim("\n  Stopped. Keys cleared from memory.\n"));
      app.close().finally(resolve);
      setTimeout(resolve, 500).unref();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  return 0;
}

function describeSources(app) {
  const s = new Set();
  for (const k of app.keys.values()) {
    for (const src of k.sources) s.add(src.split(" · ").pop());
  }
  return [...s].map((x) => (x === "env" ? "environment" : x)).join(", ");
}

export async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(c.red(`  ${e.message}`) + c.dim("  (see apilive --help)"));
    return 2;
  }
  switch (opts.command) {
    case "help": console.log(HELP); return 0;
    case "version": console.log(VERSION); return 0;
    case "providers": return runProviders(opts);
    case "update": return runUpdate(opts);
    case "privacy": return printDoc("PRIVACY.md");
    case "terms": return printDoc("TERMS.md");
    case "check": {
      const update = checkForUpdate(VERSION, { disabled: !opts.updateCheck || opts.json });
      firstRunNotice(opts);
      const code = await runCheck(opts);
      if (!opts.json) printUpdateNotice(await Promise.race([update, new Promise((r) => setTimeout(r, 800, null))]));
      return code;
    }
    default: return runUi(opts);
  }
}

function printDoc(file) {
  process.stdout.write(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8") + "\n");
  return 0;
}

// Shown once per machine, on stderr so it never pollutes piped output.
function firstRunNotice(opts) {
  if (opts.json || readState().noticeShown) return;
  process.stderr.write(
    c.dim(`
  Note: only check keys you own or are authorized to use. By using apilive you agree to its
  Terms (apilive terms) and Privacy Policy (apilive privacy). This note is shown once.
`),
  );
  writeState({ noticeShown: true });
}

function printUpdateNotice(u) {
  if (!u?.updateAvailable) return;
  const cmd = updateCommand(installKind());
  const lines = [
    `Update available: ${c.dim(u.current)} ${sym.arrow} ${c.green(u.latest)}`,
    `Run ${c.cyan(cmd === "npx apilive@latest" ? "npx apilive@latest" : "apilive update")} ${c.dim("·")} notes: ${c.dim(RELEASES_URL)}`,
  ];
  process.stderr.write(`  ${lines.join("\n  ")}\n\n`);
}

async function runUpdate(opts) {
  console.log(`
  ${c.bold("apilive")} ${c.dim(`v${VERSION}`)}  ${c.dim("checking for updates…")}`);
  const u = await checkForUpdate(VERSION, { force: true });
  if (u.disabled && !u.latest) {
    console.log(c.yellow("  Update checks are disabled (NO_UPDATE_NOTIFIER / DO_NOT_TRACK / CI). Unset them to use this command.\n"));
    return 2;
  }
  if (!u.latest && u.registryStatus === 404) {
    console.log(c.yellow("  apilive isn't published on the npm registry yet, so there's nothing to update to.\n"));
    return 1;
  }
  if (!u.latest) {
    console.log(c.yellow("  Couldn't reach the npm registry. Check your connection and try again.\n"));
    return 1;
  }
  if (!u.updateAvailable) {
    console.log(`  ${c.green(sym.live)} You're on the latest version (${VERSION}).
`);
    return 0;
  }
  console.log(`  New version: ${c.green(u.latest)}  ${c.dim(`(release notes: ${RELEASES_URL})`)}
`);
  const kind = installKind();
  if (kind === "npx") {
    console.log(`  You're running apilive through npx. Run this to use the latest version:

    ${c.cyan("npx apilive@latest")}
`);
    return 0;
  }
  if (kind !== "global") {
    console.log(`  Update with:

    ${c.cyan(updateCommand(kind))}
`);
    return 0;
  }
  if (!opts.yes) {
    if (!process.stdin.isTTY) {
      console.log(`  Run ${c.cyan("apilive update --yes")} to install without a prompt.
`);
      return 2;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`  Install apilive ${u.latest} now with "npm install -g apilive@latest"? (y/N) `)).trim().toLowerCase();
    rl.close();
    if (answer !== "y" && answer !== "yes") {
      console.log(c.dim("  Cancelled.\n"));
      return 0;
    }
  }
  const code = await runGlobalUpdate();
  console.log(code === 0 ? `
  ${c.green(sym.live)} Updated to ${u.latest}.
` : c.red(`
  npm exited with code ${code}. Try: npm install -g apilive@latest
`));
  return code === 0 ? 0 : 1;
}
