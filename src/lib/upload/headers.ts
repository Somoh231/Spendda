export function normalizeHeader(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/[%$]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreMatch(header: string, alias: string) {
  const h = normalizeHeader(header);
  const a = normalizeHeader(alias);
  if (!h || !a) return -1;
  if (h === a) return 100;
  if (h.replace(/\s/g, "") === a.replace(/\s/g, "")) return 95;
  if (h.startsWith(a)) return 90;
  if (h.endsWith(a)) return 85;
  if (h.includes(a)) return 80;
  // token overlap heuristic
  const ht = new Set(h.split(" "));
  const at = a.split(" ");
  const overlap = at.filter((t) => ht.has(t)).length;
  if (overlap >= Math.max(2, Math.ceil(at.length * 0.75))) return 70 + overlap;
  return -1;
}

/** Best fuzzy score for one physical column header against a list of aliases. */
export function maxAliasScoreForHeader(header: string, aliases: readonly string[]) {
  let best = -1;
  for (const a of aliases) {
    const s = scoreMatch(header, a);
    if (s > best) best = s;
  }
  return best;
}

export function pickHeader(headers: string[], aliases: string[]) {
  let best: { header: string; score: number } | null = null;
  for (const h of headers) {
    for (const a of aliases) {
      const score = scoreMatch(h, a);
      if (score < 0) continue;
      if (!best || score > best.score) best = { header: h, score };
    }
  }
  return best?.header;
}

