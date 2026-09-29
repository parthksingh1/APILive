// Update checks and self-update.
//
// Privacy: the only request is GET https://registry.npmjs.org/apilive/latest.
// It sends no keys, no usage data and no identifiers. At most once a day.
// Disable with --no-update-check, NO_UPDATE_NOTIFIER=1, APILIVE_NO_UPDATE_CHECK=1
// or DO_NOT_TRACK=1. It is skipped automatically in CI.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PACKAGE = "apilive";
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE}/latest`;
const INTERVAL_MS = 24 * 60 * 60 * 1000;
export const RELEASES_URL = "https://github.com/parthksingh1/apilive/releases";

export function configDir() {
  if (process.env.APILIVE_CONFIG_DIR) return process.env.APILIVE_CONFIG_DIR;
  if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "apilive");
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Preferences", "apilive");
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "apilive");
}

const stateFile = () => path.join(configDir(), "state.json");

export function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), "utf8"));
  } catch {
    return {};
  }
}

export function writeState(patch) {
  try {
    fs.mkdirSync(configDir(), { recursive: true });
    fs.writeFileSync(stateFile(), JSON.stringify({ ...readState(), ...patch }, null, 2));
  } catch {
    // Read-only home, sandbox… never fatal.
  }
}

export function updateCheckDisabled(flagDisabled = false) {
  const env = process.env;
  return Boolean(
    flagDisabled ||
      env.NO_UPDATE_NOTIFIER ||
      env.APILIVE_NO_UPDATE_CHECK ||
      env.DO_NOT_TRACK === "1" ||
      env.CI ||
      env.NODE_ENV === "test" ||
      readState().updateCheck === false,
  );
}

export function compareVersions(a, b) {
  const parse = (v) => String(v).replace(/^v/, "").split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? 1 : -1;
  return 0;
}

// Returns { current, latest, updateAvailable, checkedAt, disabled }.
export async function checkForUpdate(current, { disabled = false, force = false, fetchImpl = globalThis.fetch } = {}) {
  const base = { current, latest: null, updateAvailable: false, checkedAt: null, disabled: false };
  if (updateCheckDisabled(disabled)) return { ...base, disabled: true };

  const state = readState();
  const fresh = state.lastUpdateCheck && Date.now() - state.lastUpdateCheck < INTERVAL_MS;
  let latest = state.latestVersion || null;
  let checkedAt = state.lastUpdateCheck || null;
  let registryStatus = null;

  if (force || !fresh || !latest) {
    try {
      const res = await fetchImpl(REGISTRY_URL, {
        headers: { Accept: "application/json", "User-Agent": "apilive-update-check" },
        signal: AbortSignal.timeout(2500),
      });
      registryStatus = res.status;
      if (res.ok) {
        const body = await res.json();
        if (typeof body.version === "string") {
          latest = body.version;
          checkedAt = Date.now();
          writeState({ latestVersion: latest, lastUpdateCheck: checkedAt });
        }
      }
    } catch {
      // Offline or blocked — silently skip.
    }
  }
  return { ...base, latest, checkedAt, registryStatus, updateAvailable: Boolean(latest && compareVersions(latest, current) > 0) };
}

// How was apilive launched? Decides how to update it.
export function installKind() {
  const here = path.dirname(fileURLToPath(import.meta.url)).toLowerCase();
  if (here.includes(`${path.sep}_npx${path.sep}`) || process.env.npm_command === "exec") return "npx";
  try {
    const r = spawnSync("npm", ["root", "-g"], { encoding: "utf8", shell: process.platform === "win32", timeout: 8000 });
    const globalRoot = r.stdout?.trim().toLowerCase();
    if (globalRoot && here.startsWith(globalRoot)) return "global";
  } catch {}
  if (here.includes(`${path.sep}node_modules${path.sep}`)) return "local";
  return "source";
}

export function updateCommand(kind = installKind()) {
  return {
    npx: "npx apilive@latest",
    global: "npm install -g apilive@latest",
    local: "npm install apilive@latest",
    source: "git pull",
  }[kind];
}

export function runGlobalUpdate() {
  return new Promise((resolve) => {
    const child = spawn("npm", ["install", "-g", `${PACKAGE}@latest`], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}
