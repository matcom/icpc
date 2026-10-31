// Fuzzy matching for every selector and for the global search.

export const fold = (text) =>
  String(text).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const words = (text) => fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

function isSubsequence(needle, text) {
  let i = 0;
  for (const c of text) if (c === needle[i]) i += 1;
  return i === needle.length;
}

// Levenshtein distance, giving up once it passes `limit`.
function distance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, current[j]);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

function wordScore(needle, word) {
  if (word === needle) return 100;
  if (word.startsWith(needle)) return 85;
  if (word.includes(needle)) return 65;
  // A year or a count is exact: 2019 is not a misspelled 2020.
  if (needle.length >= 3 && !/^\d+$/.test(needle)) {
    const limit = needle.length >= 5 ? 2 : 1;
    const whole = distance(needle, word, limit);
    if (whole <= limit) return 60 - whole * 10;
    const start = distance(needle, word.slice(0, needle.length), limit);
    if (start <= limit) return 45 - start * 10;
    if (isSubsequence(needle, word)) return 20;
  }
  return 0;
}

// 0 means no match; a higher score is a better match.
export function fuzzyScore(query, text) {
  const needles = words(query);
  if (!needles.length) return 0;
  const haystack = words(text);
  let total = 0;
  for (const needle of needles) {
    let best = 0;
    for (const word of haystack) best = Math.max(best, wordScore(needle, word));
    if (!best) {
      const acronym = needles.length === 1 && needle.length >= 2 && isSubsequence(needle, haystack.map((w) => w[0]).join(""));
      if (!acronym) return 0;
      best = needle === haystack.map((w) => w[0]).join("") ? 90 : 55;
    }
    total += best;
  }
  if (fold(text).startsWith(fold(query).trim())) total += 25;
  return total - haystack.length * 0.1;
}

// The items matching `query`, best first; `text` reads an item's searchable text.
export function fuzzyFilter(query, items, text = (item) => item) {
  return items
    .map((item) => ({ item, score: fuzzyScore(query, text(item)) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((hit) => hit.item);
}
