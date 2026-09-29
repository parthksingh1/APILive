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

// ------------------------------------------------------------------ router

function route() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, anchor] = raw.split("#");
  const m = path.match(/^\/docs\/([a-z]+)/);
  closeSheet();
  closeMenu();
  if (m && state.docs[m[1]]) {
    showView("docs", m[1] === "changelog" ? "changelog" : "docs");
    loadDoc(m[1], anchor);
  } else {
    showView("keys", "keys");
    if (!acked()) requireAck(() => {});
  }
}

function showView(view, nav) {
  $("view-keys").hidden = view !== "keys";
  $("view-docs").hidden = view !== "docs";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === nav) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ docs

const docCache = {};

async function loadDoc(slug, anchor) {
  const body = $("docBody");
  renderDocNav(slug);
  if (!docCache[slug]) {
    body.replaceChildren(h("p", { class: "doc-loading" }, "Loading…"));
    try {
      docCache[slug] = await api("GET", `/api/docs/${slug}`);
    } catch (e) {
      body.replaceChildren(h("p", { class: "doc-loading" }, `Couldn't load this page: ${e.message}`));
      return;
    }
  }
  const doc = docCache[slug];
  body.innerHTML = doc.slug === "license" ? `<h1>License</h1>${doc.html}` : doc.html;
  document.title = `${doc.title} · apilive`;

  const toc = $("docToc");
  const items = doc.toc.filter((t) => t.level === 2 || t.level === 3);
  toc.replaceChildren(
    ...(items.length > 2
      ? [
          h("h4", {}, "On this page"),
          ...items.map((t) =>
            h("a", { href: `#/docs/${slug}#${t.id}`, class: `lvl-${t.level}`, onclick: (e) => (e.preventDefault(), scrollToId(t.id)) }, t.text),
          ),
        ]
      : []),
  );
  if (anchor) requestAnimationFrame(() => scrollToId(anchor));
  else body.focus({ preventScroll: true });
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDocNav(active) {
  $("docsNav").replaceChildren(
    ...DOC_NAV.flatMap(([group, slugs]) => [
      h("h4", {}, group),
      ...slugs
        .filter((s) => state.docs[s])
        .map((s) => h("a", { href: `#/docs/${s}`, "aria-current": s === active ? "page" : null }, state.docs[s])),
    ]),
  );
}

function wireDocs() {
  $("docBody").addEventListener("click", (e) => {
    const a = e.target.closest("a");
    const href = a?.getAttribute("href");
    if (href && href.startsWith("#") && !href.startsWith("#/")) {
      e.preventDefault();
      scrollToId(href.slice(1));
    }
  });
}

// ------------------------------------------------------------------ add dialog

const input = $("keyInput");
const select = $("providerSelect");

function detectLocal(text) {
  const forced = select.value || null;
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*[=:]\s*["'`]?([^"'`\s#]+)/);
    let name = null;
    let value = line.replace(/^Bearer\s+/i, "").replace(/^["'`]|["'`]$/g, "");
    if (m && m[2].length >= 16) {
      name = m[1];
      value = m[2];
    } else if (m && /^[A-Z][A-Z0-9]*_[A-Z0-9_]*$/.test(m[1])) {
      continue; // NAME=placeholder
    }
    if (/\s/.test(value) || value.length < 8) continue;
    let provider = forced;
    let confident = Boolean(forced);
    if (!provider) {
      const byEnv = name && state.providers.find((p) => p.env.includes(name));
      const exact = !byEnv && state.providers.find((p) => p.pattern && new RegExp(p.pattern).test(value));
      const loose = !byEnv && !exact ? state.providers.filter((p) => p.loose && new RegExp(p.loose).test(value)) : [];
      provider = (byEnv || exact || loose[0])?.id || null;
      confident = Boolean(byEnv || exact);
    }
    out.push({ provider, confident, preview: maskPreview(value), name });
  }
  return out;
}

function updatePreview() {
  const found = input.value.trim() ? detectLocal(input.value) : [];
  const n = found.length;
  $("addSubmit").disabled = n === 0;
  $("addSubmit").textContent = n > 1 ? `Check ${n} keys` : "Check key";
  const pv = $("preview");
  if (!input.value.trim()) return pv.replaceChildren();
  if (!n) return pv.replaceChildren(h("div", { class: "preview-empty" }, "No API keys found in this text."));
  const shown = found.slice(0, 6);
  pv.replaceChildren(
    ...shown.map((f) =>
      h(
        "div",
        { class: "preview-row" },
        mark(f.provider),
        h("span", {}, f.provider ? pName(f.provider) : h("span", { class: "muted" }, "Unknown. Choose a provider after adding")),
        f.provider && !f.confident ? h("span", { class: "tag" }, "Guess") : null,
        h("span", { class: "key-text" }, f.preview),
      ),
    ),
    ...(n > shown.length ? [h("div", { class: "preview-more" }, `and ${n - shown.length} more`)] : []),
  );
}

function openAdd() {
  requireAck(() => {
    closeSheet();
    const dlg = $("addDialog");
    if (!dlg.open) dlg.showModal();
    input.focus();
    updatePreview();
  });
}

async function submitAdd() {
  const text = input.value.trim();
  if (!text) return;
  const btn = $("addSubmit");
  btn.disabled = true;
  try {
    const { added, duplicates, limited, maxKeys } = await api("POST", "/api/keys", { text, provider: select.value || null });
    if (!added.length) {
      toast(limited ? `Limit reached: apilive checks at most ${maxKeys} keys per session` : duplicates ? "Those keys are already in the list" : "No API keys found in that text", { error: !duplicates });
      return;
    }
    $("addDialog").close();
    input.value = "";
    select.value = "";
    for (const e of added.slice().reverse()) state.entries.unshift(prepare(e));
    render();
    runChecks(added.filter((e) => e.provider).map((e) => e.ref));
    const notes = [duplicates && `${duplicates} already listed`, limited && `${limited} over the ${maxKeys}-key limit`].filter(Boolean);
    toast(`Added ${plural(added.length, "key")}${notes.length ? ` · ${notes.join(", ")}` : ""}`);
    const unknown = added.find((e) => !e.provider);
    if (unknown) openSheet(unknown.ref);
  } catch (e) {
    toast(e.message, { error: true });
  } finally {
    btn.disabled = false;
    updatePreview();
  }
}

function wireAdd() {
  const dlg = $("addDialog");
  input.addEventListener("input", updatePreview);
  select.addEventListener("change", updatePreview);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitAdd();
    }
  });
  $("addSubmit").addEventListener("click", submitAdd);
  dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
  dlg.addEventListener("click", (e) => e.target === dlg && dlg.close());
}

const prepare = (e) => ({ ...e, result: null, checking: false, checkedAt: null });

// ------------------------------------------------------------------ checks

const queue = [];
let active = 0;

function runChecks(refs) {
  requireAck(() => {
    for (const ref of refs) {
      const e = find(ref);
      if (!e || !e.provider || e.checking) continue;
      e.checking = true;
      queue.push(ref);
    }
    render();
    pump();
  });
}

function pump() {
  while (active < 6 && queue.length) {
    const ref = queue.shift();
    active++;
    checkOne(ref).finally(() => {
      active--;
      pump();
    });
  }
}

async function checkOne(ref) {
  const e = find(ref);
  if (!e) return;
  try {
    e.result = await api("POST", "/api/check", { ref });
  } catch (err) {
    e.result = { status: "error", message: /fetch|network/i.test(err.message) ? "Lost connection to apilive. Is it still running?" : err.message };
  }
  e.checking = false;
  e.checkedAt = new Date();
  state.lastChecked = e.checkedAt;
  if (!find(ref)) return;
  render();
  if (state.sheetRef === ref) renderSheet();
}

async function removeEntry(ref) {
  state.entries = state.entries.filter((e) => e.ref !== ref);
  if (state.sheetRef === ref) closeSheet();
  render();
  api("DELETE", `/api/keys/${ref}`).catch(() => {});
  toast("Key removed from memory");
}

async function setProvider(ref, provider) {
  try {
    const updated = await api("PATCH", `/api/keys/${ref}`, { provider });
    const e = find(ref);
    Object.assign(e, updated, { result: null });
    render();
    renderSheet();
    runChecks([ref]);
  } catch (err) {
    toast(err.message, { error: true });
  }
}

// ------------------------------------------------------------------ table

function visibleEntries() {
  const q = state.query.trim().toLowerCase();
  return state.entries.filter((e) => {
    const s = statusOf(e);
    if (state.filter === "live" && s !== "live") return false;
    if (state.filter === "issues" && !isIssue(s)) return false;
    if (state.filter === "pending" && s !== "pending") return false;
    if (!q) return true;
    return [pName(e.provider), e.masked, ...(e.sources || [])].join(" ").toLowerCase().includes(q);
  });
}

function render() {
  const has = state.entries.length > 0;
  const rows = visibleEntries();
  $("tbody").replaceChildren(...rows.map(buildRow));
  $("table").hidden = !has;
  $("emptyState").hidden = has;
  $("noMatch").hidden = !has || rows.length > 0;
  $("cardFoot").hidden = !has;
  renderTabs();
  renderFoot();
  renderBanner();
  $("recheckAllBtn").disabled = !state.entries.some((e) => e.provider && !e.checking);
}

function buildRow(e) {
  const s = statusOf(e);
  const r = e.result || {};
  // A factory, not a node: a DOM node can only be mounted in one cell.
  const pending = () => (s === "checking" ? h("span", { class: "skeleton" }) : h("span", { class: "muted" }, "—"));
  const live = s === "live";

  const menuBtn = h(
    "button",
    {
      class: "btn-icon row-menu-btn",
      type: "button",
      "aria-label": `Actions for ${pName(e.provider)} key`,
      "aria-haspopup": "menu",
      onclick: (ev) => {
        ev.stopPropagation();
        openRowMenu(ev.currentTarget, e);
      },
    },
    icon("more"),
  );

  const tr = h(
    "tr",
    {
      tabindex: "0",
      class: state.sheetRef === e.ref ? "is-active" : null,
      "aria-label": `${pName(e.provider)}, ${STATUS[s]}. Open details`,
      onclick: () => openSheet(e.ref),
      onkeydown: (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openSheet(e.ref);
        }
      },
    },
    h(
      "td",
      {},
      h(
        "div",
        { class: "cell-provider" },
        mark(e.provider),
        h("span", { class: "provider-name" }, e.provider ? pName(e.provider) : "Unknown"),
        !e.provider ? h("span", { class: "tag" }, "Choose provider") : !e.confident ? h("span", { class: "tag", title: "Detected from the key format. Open to confirm." }, "Guess") : null,
      ),
    ),
    h("td", {}, h("span", { class: "key-text in-table" }, e.masked)),
    h("td", { class: "col-source" }, h("span", { class: "source-text", title: (e.sources || []).join("\n") }, e.sources?.length ? e.sources.join(", ") : "Pasted")),
    h("td", {}, statusEl(s)),
    h(
      "td",
      { class: "num col-latency" },
      r.latencyMs != null && s !== "checking" ? h("span", { class: r.latencyMs > 1500 ? "warn-text" : null }, `${r.latencyMs} ms`) : pending(),
    ),
    h("td", { class: "num col-models" }, live && r.modelCount ? String(r.modelCount) : pending()),
    h("td", { class: "num col-credit" }, live && r.balance ? r.balance : pending()),
    h("td", { class: "col-actions" }, menuBtn),
  );
  return tr;
}

function counts() {
  const c = { all: state.entries.length, live: 0, issues: 0, pending: 0, checking: 0 };
  for (const e of state.entries) {
    const s = statusOf(e);
    if (s === "live") c.live++;
    else if (isIssue(s)) c.issues++;
    else if (s === "checking") c.checking++;
    else c.pending++;
  }
  return c;
}

function renderTabs() {
  const c = counts();
  const tabs = [
    ["all", "All", c.all],
    ["live", "Live", c.live],
    ["issues", "Needs attention", c.issues],
    ["pending", "Not checked", c.pending],
  ];
  $("tabs").replaceChildren(
    ...tabs
      .filter(([id, , n]) => id === "all" || id === state.filter || n > 0)
      .map(([id, label, n]) =>
        h(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": String(state.filter === id),
            onclick: () => {
              state.filter = id;
              render();
            },
          },
          label,
          h("span", { class: "count" }, n),
        ),
      ),
  );
}

function renderFoot() {
  const c = counts();
  const lat = state.entries.filter((e) => statusOf(e) === "live" && e.result?.latencyMs != null).map((e) => e.result.latencyMs);
  const avg = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null;
  $("cardFoot").replaceChildren(
    h(
      "div",
      { class: "foot-stats" },
      h("span", {}, h("b", {}, c.all), ` ${c.all === 1 ? "key" : "keys"}`),
      h("span", {}, h("b", {}, c.live), " live"),
      c.issues ? h("span", {}, h("b", {}, c.issues), " need attention") : null,
      avg != null ? h("span", {}, "avg ", h("b", {}, `${avg} ms`)) : null,
      c.checking ? h("span", {}, `checking ${c.checking}…`) : null,
    ),
    h("span", {}, state.lastChecked ? `Last checked ${state.lastChecked.toLocaleTimeString()}` : "Nothing checked yet"),
  );
  document.title = c.all && !c.checking && state.lastChecked ? `${c.live}/${c.all} live · apilive` : "apilive";
}

function renderBanner() {
  const envEntries = state.entries.filter((e) => e.origin === "env");
  const unchecked = envEntries.filter((e) => !e.result && !e.checking);
  $("envBanner").hidden = !unchecked.length;
  if (!unchecked.length) return;
  const where = [...new Set(envEntries.flatMap((e) => e.sources.map((s) => s.split(" · ").pop())))].map((s) => (s === "env" ? "environment variables" : s));
  $("envBannerTitle").textContent = `Found ${plural(unchecked.length, "key")} in ${state.cwd || "this folder"}`;
  $("envBannerSub").textContent = `From ${where.join(", ")}. Nothing is sent until you check.`;
}

// ------------------------------------------------------------------ menus

let menuAnchor = null;

function openMenu(anchor, items) {
  const menu = $("menu");
  if (menuAnchor === anchor && !menu.hidden) return closeMenu();
  menu.replaceChildren(
    ...items.map((it) => {
      if (it === "sep") return h("hr");
      if (it.note) return h("div", { class: "menu-note" }, it.note);
      const attrs = { role: "menuitem", class: it.danger ? "danger" : null };
      if (it.href) return h("a", { ...attrs, href: it.href, target: "_blank", rel: "noopener noreferrer", onclick: closeMenu }, icon(it.icon), it.label);
      return h(
        "button",
        {
          ...attrs,
          type: "button",
          disabled: it.disabled,
          onclick: () => {
            closeMenu();
            it.onClick();
          },
        },
        icon(it.icon),
        it.label,
      );
    }),
  );
  menu.hidden = false;
  menuAnchor = anchor;
  anchor.setAttribute("aria-expanded", "true");
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  const top = r.bottom + 6 + mh > innerHeight ? r.top - mh - 6 : r.bottom + 6;
  menu.style.top = `${Math.max(8, top)}px`;
  menu.style.left = `${Math.min(innerWidth - mw - 8, Math.max(8, r.right - mw))}px`;
  menu.querySelector("button, a")?.focus();
}

function closeMenu() {
  const menu = $("menu");
  if (menu.hidden) return;
  menu.hidden = true;
  menuAnchor?.setAttribute("aria-expanded", "false");
  menuAnchor = null;
}

function openRowMenu(anchor, e) {
  const p = state.byId[e.provider];
  openMenu(anchor, [
    { label: "Re-check", icon: "refresh", disabled: !e.provider || e.checking, onClick: () => runChecks([e.ref]) },
    { label: "View details", icon: "eye", onClick: () => openSheet(e.ref) },
    { label: "Change provider", icon: "swap", onClick: () => openSheet(e.ref, { focusProvider: true }) },
    p ? { label: `Open ${p.name} dashboard`, icon: "external", href: p.keyUrl } : null,
    "sep",
    { label: "Remove", icon: "trash", danger: true, onClick: () => removeEntry(e.ref) },
  ].filter(Boolean));
}

function openExportMenu(anchor) {
  openMenu(anchor, [
    { label: "Copy as Markdown", icon: "copy", onClick: exportMarkdown },
    { label: "Download CSV", icon: "table", onClick: () => download("csv") },
    { label: "Download JSON", icon: "download", onClick: () => download("json") },
    "sep",
    { note: "Keys are always masked in exports." },
  ]);
}

// ------------------------------------------------------------------ sheet

let sheetReturnFocus = null;

function openSheet(ref, { focusProvider = false } = {}) {
  if (!find(ref)) return;
  closeMenu();
  if (!state.sheetRef) sheetReturnFocus = document.activeElement;
  state.sheetRef = ref;
  $("sheet").hidden = false;
  $("sheetBackdrop").hidden = false;
  renderSheet();
  render();
  const target = focusProvider ? $("sheet").querySelector("select") : $("sheet").querySelector("[data-sheet-close]");
  (target || $("sheet").querySelector("[data-sheet-close]"))?.focus();
}

function closeSheet() {
  if (!state.sheetRef) return;
  state.sheetRef = null;
  $("sheet").hidden = true;
  $("sheetBackdrop").hidden = true;
  render();
  if (sheetReturnFocus?.isConnected) sheetReturnFocus.focus();
}

function renderSheet() {
  const e = find(state.sheetRef);
  if (!e) return closeSheet();
  const s = statusOf(e);
  const r = e.result || {};
  const p = state.byId[e.provider];
  const sheet = $("sheet");

  const providerField = h(
    "div",
    { class: "select" },
    h(
      "select",
      { "aria-label": "Provider for this key", onchange: (ev) => ev.target.value && ev.target.value !== e.provider && setProvider(e.ref, ev.target.value) },
      !e.provider ? h("option", { value: "" }, "Choose a provider…") : null,
      e.candidates?.length ? h("optgroup", { label: "Matches this key format" }, e.candidates.map((id) => h("option", { value: id, selected: id === e.provider }, pName(id)))) : null,
      h(
        "optgroup",
        { label: "All providers" },
        state.providers.filter((x) => !e.candidates?.includes(x.id)).map((x) => h("option", { value: x.id, selected: x.id === e.provider }, x.name)),
      ),
    ),
    icon("chevron", "icon-sm"),
  );

  const rows = [
    ["Status", statusEl(s)],
    ["Provider", e.confident && e.provider ? pName(e.provider) : providerField],
    ["Key", h("span", { class: "key-text" }, e.masked)],
    ["Found in", e.sources?.length ? e.sources.join(", ") : "Pasted"],
    r.latencyMs != null ? ["Latency", `${r.latencyMs} ms`] : null,
    r.httpStatus ? ["HTTP status", String(r.httpStatus)] : null,
    r.region ? ["Endpoint", r.region] : null,
    r.balance ? ["Credit", r.balance] : null,
    r.account ? ["Account", r.account] : null,
    r.rateLimit ? ["Rate limit", r.rateLimit] : null,
    e.checkedAt ? ["Checked", e.checkedAt.toLocaleTimeString()] : null,
    p ? ["Manage", h("a", { href: p.keyUrl, target: "_blank", rel: "noopener noreferrer" }, "Key dashboard", icon("external", "icon-sm"))] : null,
  ].filter(Boolean);

  const parts = [];
  if (!e.confident && e.provider) {
    parts.push(
      h(
        "div",
        { class: "alert", "data-s": "limited" },
        icon("info"),
        h("div", {}, h("strong", {}, "Provider guessed from the key format"), h("p", {}, "Several providers use this format. Confirm the provider below. apilive never tries a key against more than one provider.")),
      ),
    );
  } else if (!e.provider) {
    parts.push(h("div", { class: "alert", "data-s": "pending" }, icon("info"), h("div", {}, h("strong", {}, "Choose a provider"), h("p", {}, "apilive couldn't tell which provider this key belongs to."))));
  } else if (EXPLAIN[s] && s !== "pending") {
    const [title, text] = EXPLAIN[s];
    parts.push(h("div", { class: "alert", "data-s": s }, icon(s === "error" ? "info" : "alert"), h("div", {}, h("strong", {}, title), h("p", {}, text), r.message ? h("code", {}, r.message) : null)));
  }

  parts.push(h("section", {}, h("h3", {}, "Details"), h("dl", { class: "props" }, rows.map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", {}, v))))));

  if (r.models?.length) {
    const list = h("ul", { class: "model-list" });
    const fill = (q = "") => {
      const items = r.models.filter((m) => m.toLowerCase().includes(q.toLowerCase()));
      list.replaceChildren(
        ...(items.length
          ? items.map((m) => h("li", {}, h("button", { type: "button", title: "Copy model ID", onclick: () => copy(m, `Copied ${m}`) }, m, icon("copy", "icon-sm"))))
          : [h("li", { class: "none" }, "No models match.")]),
      );
    };
    fill();
    parts.push(
      h(
        "section",
        {},
        h(
          "div",
          { class: "models-tools" },
          h("h3", {}, `Models (${r.models.length})`),
          h(
            "label",
            { class: "search" },
            icon("search"),
            h("input", { type: "search", placeholder: "Filter models", "aria-label": "Filter models", oninput: (ev) => fill(ev.target.value) }),
          ),
        ),
        list,
      ),
    );
  }

  sheet.replaceChildren(
    h(
      "div",
      { class: "sheet-head" },
      mark(e.provider, "lg"),
      h("div", { class: "sheet-title" }, h("h2", { id: "sheetTitle" }, e.provider ? pName(e.provider) : "Unknown provider"), h("span", { class: "key-text" }, e.masked)),
      h("button", { class: "btn-icon", type: "button", "aria-label": "Close details", "data-sheet-close": true, onclick: closeSheet }, icon("x")),
    ),
    h("div", { class: "sheet-body" }, parts),
    h(
      "div",
      { class: "sheet-foot" },
      h("button", { class: "btn btn-danger btn-sm", type: "button", onclick: () => removeEntry(e.ref) }, icon("trash"), "Remove"),
      h("span", { class: "spacer" }),
      r.models?.length ? h("button", { class: "btn btn-secondary btn-sm", type: "button", onclick: () => copy(r.models.join("\n"), `Copied ${plural(r.models.length, "model ID")}`) }, icon("copy"), "Copy models") : null,
      h("button", { class: "btn btn-primary btn-sm", type: "button", disabled: !e.provider || e.checking, onclick: () => runChecks([e.ref]) }, icon("refresh"), e.checking ? "Checking…" : s === "pending" ? "Check" : "Re-check"),
    ),
  );
}

// ------------------------------------------------------------------ export

function report() {
  return state.entries.map((e) => ({
    provider: pName(e.provider),
    key: e.masked,
    source: e.sources?.join(", ") || "pasted",
    status: statusOf(e),
    latencyMs: e.result?.latencyMs ?? null,
    models: e.result?.modelCount ?? null,
    credit: e.result?.balance ?? null,
    message: e.result && e.result.status !== "live" ? (e.result.message ?? null) : null,
    checkedAt: e.checkedAt?.toISOString() ?? null,
  }));
}

function exportMarkdown() {
  const lines = report().map((r) => `| ${r.provider} | \`${r.key}\` | ${STATUS[r.status]} | ${r.latencyMs != null ? r.latencyMs + " ms" : "—"} | ${r.models ?? "—"} | ${r.credit ?? "—"} |`);
  copy(
    [
      `**apilive report**, ${new Date().toLocaleString()}`,
      "",
      "| Provider | Key | Status | Latency | Models | Credit |",
      "|---|---|---|---:|---:|---|",
      ...lines,
    ].join("\n"),
    "Markdown report copied",
  );
}

function download(kind) {
  const rows = report();
  let blob;
  if (kind === "csv") {
    const cols = Object.keys(rows[0] || { provider: "" });
    const cell = (v) => {
      const s = v == null ? "" : String(v);
      // Neutralise spreadsheet formulas (CSV injection).
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    blob = new Blob([[cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n")], { type: "text/csv" });
  } else {
    blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), results: rows }, null, 2)], { type: "application/json" });
  }
  const a = h("a", { href: URL.createObjectURL(blob), download: `apilive-report.${kind}` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Downloaded apilive-report.${kind}`);
}

// ------------------------------------------------------------------ update

async function loadUpdate() {
  try {
    const u = await api("GET", "/api/update");
    state.update = u;
    if (!u.updateAvailable) return;
    $("updateChipText").textContent = `Update: v${u.latest}`;
    $("updateChip").hidden = false;
    $("updateDesc").textContent = `apilive ${u.latest} is available. You have ${u.current}.`;
    $("updateCommandText").textContent = u.command || "npx apilive@latest";
    $("releaseNotesLink").href = u.releasesUrl;
  } catch {}
}

function wireUpdate() {
  const dlg = $("updateDialog");
  $("updateChip").addEventListener("click", () => dlg.showModal());
  $("updateCommand").addEventListener("click", () => copy($("updateCommandText").textContent, "Command copied"));
  dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
  dlg.addEventListener("click", (e) => e.target === dlg && dlg.close());
}

