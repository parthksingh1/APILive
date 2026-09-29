// Small shared helpers.

// "sk-proj-abc…wxyz" — enough to recognise a key, never enough to use it.
export function mask(key) {
  const k = String(key ?? "");
  if (k.length <= 12) return k.slice(0, 2) + "…" + (k.length > 6 ? k.slice(-2) : "");
  const head = Math.min(8, Math.floor(k.length / 5));
  return `${k.slice(0, head)}…${k.slice(-4)}`;
}

export function plural(n, word, pluralWord = word + "s") {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
