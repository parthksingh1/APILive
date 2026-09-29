// Tiny ANSI helper that respects NO_COLOR / FORCE_COLOR / non-TTY output.

const enabled =
  process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== "0" : !process.env.NO_COLOR && process.stdout.isTTY;

const wrap = (open, close) => (s) => (enabled ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

export const unicode = process.platform !== "win32" || Boolean(process.env.WT_SESSION || process.env.TERM_PROGRAM);

export const sym = unicode
  ? { live: "✓", invalid: "✗", error: "!", limited: "~", no_credit: "$", dot: "●", arrow: "→", sep: "·" }
  : { live: "+", invalid: "x", error: "!", limited: "~", no_credit: "$", dot: "*", arrow: "->", sep: "|" };

// Visible width, ignoring ANSI escapes.
export const width = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, "").length;
export const pad = (s, n) => s + " ".repeat(Math.max(0, n - width(s)));
