// Minimal Markdown → HTML for the bundled docs (README-style subset).
// All text is HTML-escaped first; only a fixed set of tags is ever emitted.

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const slugify = (s) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Map links between bundled docs onto in-app routes.
const DOC_ROUTES = {
  "PRIVACY.md": "#/docs/privacy",
  "TERMS.md": "#/docs/terms",
  "SECURITY.md": "#/docs/security",
  "SUPPORT.md": "#/docs/support",
  "CHANGELOG.md": "#/docs/changelog",
  "LICENSE": "#/docs/license",
  "docs/GUIDE.md": "#/docs/guide",
  "GUIDE.md": "#/docs/guide",
};

function href(url) {
  const [base, hash] = url.split("#");
  const clean = base.replace(/^\.\.?\//, "");
  if (DOC_ROUTES[clean]) return { url: DOC_ROUTES[clean] + (hash ? `#${hash}` : ""), external: false };
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return { url, external: true };
  if (url.startsWith("#")) return { url, external: false };
  return null; // unknown relative link — render as text
}

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const target = href(url.replace(/&amp;/g, "&"));
    if (!target) return label;
    const ext = target.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${esc(target.url)}"${ext}>${label}</a>`;
  });
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:]|$)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,;:]|$)/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
}

export function renderMarkdown(src) {
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  const toc = [];
  let i = 0;

  const isBlockStart = (l) => /^(#{1,6}\s|```|>|\s*[-*]\s|\s*\d+\.\s|\|)/.test(l) || /^-{3,}\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code${lang ? ` data-lang="${esc(lang)}"` : ""}>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const html = inline(h[2].trim());
      const id = slugify(html);
      if (level === 2 || level === 3) toc.push({ level, id, text: html.replace(/<[^>]+>/g, "") });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++;
      continue;
    }
    if (/^-{3,}\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }
    if (line.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${renderMarkdown(buf.join("\n")).html}</blockquote>`);
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|\s*$/g, "").split("|").map((c) => c.trim());
      const [head, sep, ...body] = rows;
      if (sep && /^[\s|:-]+$/.test(sep)) {
        out.push(
          `<div class="table-wrap"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>` +
            `<tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
        );
      } else {
        out.push(`<p>${rows.map((r) => inline(r)).join("<br>")}</p>`);
      }
      continue;
    }
    const list = line.match(/^\s*([-*]|\d+\.)\s+/);
    if (list) {
      const ordered = /\d/.test(list[1]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*([-*]|\d+\.)\s+(.*)$/);
        if (m) {
          items.push(m[2]);
          i++;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += " " + lines[i++].trim();
        } else break;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++].trim());
    if (!buf.length) buf.push(lines[i++].trim());
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return { html: out.join("\n"), toc };
}
