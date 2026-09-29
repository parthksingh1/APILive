// apilive UI.
// Raw keys are posted once to the local apilive process and never kept here;
// this page only ever holds masked copies and opaque refs.

const TOKEN = document.querySelector('meta[name="apilive-token"]').content;
const $ = (id) => document.getElementById(id);
const ACK_KEY = "apilive-ack-v1";

const ICONS = {
  lock: '<rect width="16" height="10" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  github: '<path fill="currentColor" stroke="none" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  table: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18"/>',
};

const STATUS = {
  pending: "Not checked",
  checking: "Checking…",
  live: "Live",
  invalid: "Invalid",
  limited: "Rate-limited",
  no_credit: "No credit",
  error: "Unverified",
};

const EXPLAIN = {
  invalid: ["The provider rejected this key", "It may be revoked, mistyped or expired, or belong to a different provider."],
  no_credit: ["This key works, but the account has no credit", "Add credit or billing with the provider to use it."],
  limited: ["This key works, but is rate-limited right now", "Too many requests on this key. Try again in a moment."],
  error: ["apilive couldn't verify this key", "The provider didn't give a clear answer. It may be down, or blocked on your network."],
  pending: ["Not checked yet", "Check this key to see its status."],
};

const DOC_NAV = [
  ["Documentation", ["guide", "changelog"]],
  ["Legal", ["privacy", "terms", "license"]],
  ["Help", ["support", "security"]],
];

const state = {
  providers: [],
  byId: {},
  docs: {},
  entries: [], // { ref, provider, masked, name, sources, origin, confident, candidates, result, checking, checkedAt }
  filter: "all",
  query: "",
  sheetRef: null,
  cwd: "",
  maxKeys: 100,
  lastChecked: null,
  update: null,
};

// ------------------------------------------------------------------ helpers

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

function icon(name, cls = "") {
  const span = h("span", { class: `icon ${cls}`.trim(), "aria-hidden": "true" });
  span.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name] || ""}</svg>`;
  return span;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[el.dataset.icon] || ""}</svg>`;
  });
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { "x-apilive-token": TOKEN, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function toast(message, { error = false } = {}) {
  const el = h("div", { class: `toast${error ? " is-error" : ""}`, role: "status" }, icon(error ? "alert" : "check"), h("span", {}, message));
  $("toasts").append(el);
  setTimeout(() => {
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), 220);
  }, 2600);
}

async function copy(text, message = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast("Couldn't access the clipboard", { error: true });
  }
}

function maskPreview(k) {
  if (k.length <= 12) return k.slice(0, 2) + "…";
  return `${k.slice(0, Math.min(8, Math.floor(k.length / 5)))}…${k.slice(-4)}`;
}

const pName = (id) => state.byId[id]?.name || "Unknown provider";
const statusOf = (e) => (e.checking ? "checking" : e.result?.status || "pending");
const isIssue = (s) => ["invalid", "no_credit", "error", "limited"].includes(s);
const find = (ref) => state.entries.find((e) => e.ref === ref);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const isTyping = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;

function mark(providerId, cls = "") {
  const p = state.byId[providerId];
  return h("span", { class: `mono-mark ${cls}`.trim(), "aria-hidden": "true" }, p ? p.mark : "?");
}

function statusEl(s) {
  return h("span", { class: "status", "data-s": s }, s === "checking" ? h("span", { class: "spinner" }) : h("span", { class: "status-dot" }), STATUS[s]);
}

// ------------------------------------------------------------------ theme

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem("apilive-theme");
  } catch {}
  if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  $("themeBtn").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("apilive-theme", next);
    } catch {}
  });
}

// ------------------------------------------------------------------ acknowledgement

function acked() {
  try {
    return localStorage.getItem(ACK_KEY) === "1";
  } catch {
    return false;
  }
}

let afterAck = null;
function requireAck(fn) {
  if (acked()) return fn();
  afterAck = fn;
  $("ackCheck").checked = false;
  $("ackContinue").disabled = true;
  if (!$("ackDialog").open) $("ackDialog").showModal();
}

function wireAck() {
  const dlg = $("ackDialog");
  dlg.addEventListener("cancel", (e) => e.preventDefault());
  $("ackCheck").addEventListener("change", (e) => ($("ackContinue").disabled = !e.target.checked));
  $("ackContinue").addEventListener("click", () => {
    try {
      localStorage.setItem(ACK_KEY, "1");
    } catch {}
    dlg.close();
    const fn = afterAck;
    afterAck = null;
    fn?.();
  });
  dlg.querySelectorAll("[data-close-link]").forEach((a) => a.addEventListener("click", () => dlg.close()));
}

