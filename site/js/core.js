// Data loading and the derived indexes every page reads.
import { fold } from "./fuzzy.js";

export { fold };

export const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const avg = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0);

export const sum = (values) => values.reduce((total, v) => total + v, 0);

export const quantile = (values, q) => {
  const ordered = [...values].sort((a, b) => a - b);
  const position = (ordered.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, ordered.length - 1);
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
};

export const number = (value) => Number(value).toLocaleString("es");

export const params = () => new URLSearchParams(location.search);

export const REGION_COLORS = {
  na: "#4984be", la: "#fdb830", eu: "#7fb3e4", ne: "#af3227",
  aa: "#c9a86a", aw: "#d97f45", ae: "#8e3b5c", ap: "#4f9a8c", other: "#8a8a8a",
};

export const MEDAL_COLORS = { gold: "#e0ad22", silver: "#9aa5ad", bronze: "#b4723c" };

export const MEDAL_NAMES = { gold: "Oro", silver: "Plata", bronze: "Bronce" };

let cache = null;

export async function loadData() {
  if (cache) return cache;
  const [core, predictions, world] = await Promise.all(
    ["core", "predictions", "world"].map((name) => fetch(`data/${name}.json`).then((r) => r.json())),
  );
  cache = index(core, predictions, world);
  return cache;
}

function index(core, predictions, world) {
  const unis = core.universities;
  const byId = new Map(unis.map((u) => [u.id, u]));
  const rows = [];
  for (const u of unis) {
    for (const r of u.results) rows.push({ ...r, uni: u.id, uniName: u.name, country: u.country, region: core.countries[u.country]?.region ?? "other" });
  }
  rows.sort((a, b) => a.year - b.year || (a.rank ?? 1e9) - (b.rank ?? 1e9));
  const countries = new Map();
  for (const r of rows) {
    const c = countries.get(r.country) ?? { name: r.country, es: core.countries[r.country]?.es ?? r.country, region: r.region, rows: [], unis: new Set() };
    c.rows.push(r);
    c.unis.add(r.uni);
    countries.set(r.country, c);
  }
  const people = new Map();
  for (const r of rows) {
    r.player_ids.forEach((id, i) => {
      const p = people.get(id) ?? { key: id, name: r.players[i], rows: [] };
      p.rows.push(r);
      people.set(id, p);
    });
  }
  const forecasts = new Map(predictions.teams.map((t) => [t.id, t]));
  return { ...core, unis, byId, rows, countriesIndex: countries, people, predictions, forecasts, world };
}

export const countryName = (data, name) => data.countries[name]?.es ?? name;

export const uniUrl = (id) => `universidad.html?u=${encodeURIComponent(id)}`;
export const countryUrl = (name) => `pais.html?c=${encodeURIComponent(name)}`;
export const personUrl = (key) => `competidores.html?p=${encodeURIComponent(key)}`;

export const compareUrl = (kind, keys) => `comparar.html?${kind}=${keys.map(encodeURIComponent).join(",")}`;

// Per-year best percentile of a country.
export function countrySeries(country) {
  const best = new Map();
  for (const r of country.rows) {
    if (r.pct != null) best.set(r.year, Math.max(best.get(r.year) ?? 0, r.pct));
  }
  return [...best].sort((a, b) => a[0] - b[0]);
}

export const uniSeries = (uni) => uni.results.filter((r) => r.pct != null).map((r) => [r.year, r.pct]);

export const medalCounts = (rows) => ({
  gold: rows.filter((r) => r.medal === "gold").length,
  silver: rows.filter((r) => r.medal === "silver").length,
  bronze: rows.filter((r) => r.medal === "bronze").length,
});

const MEDAL_RIBBONS = { gold: "#af3227", silver: "#2f6aa3", bronze: "#6d222e" };

// One small medal with its ribbon.
export const medalIcon = (kind, size = 20) => `<svg class="medal" width="${size}" height="${Math.round(size * 1.3)}" viewBox="0 0 20 26" role="img" aria-label="${MEDAL_NAMES[kind]}"><title>${MEDAL_NAMES[kind]}</title><path d="M5 0h4l3 9H8zM15 0h-4L8 9h4z" fill="${MEDAL_RIBBONS[kind]}"/><circle cx="10" cy="16.5" r="8.5" fill="${MEDAL_COLORS[kind]}" stroke="#0003"/><circle cx="10" cy="16.5" r="5.8" fill="none" stroke="#fff8" stroke-width="1.2"/><path d="m10 12.6 1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" fill="#fff" fill-opacity=".85"/></svg>`;

// Every medal of a record, gold first.
export const medalStrip = (counts, size = 20) => ["gold", "silver", "bronze"]
  .map((kind) => medalIcon(kind, size).repeat(counts[kind] ?? 0)).join("");

const CREST_COLORS = [
  ["#4984be", "#fbf4e4"], ["#af3227", "#fbf4e4"], ["#fdb830", "#2b0d12"],
  ["#6d222e", "#d6c499"], ["#1d3c5e", "#fdb830"], ["#d6c499", "#4a1520"],
];
const SKIP_WORDS = new Set("of the de la las los del do da and for y en university universidad universitet institute instituto state national nacional technology technical tecnologica science sciences school college universite universidade".split(" "));

const initials = (name) => {
  const words = fold(name).replace(/["'’().,\-]/g, " ").split(/\s+/).filter(Boolean);
  const kept = words.filter((w) => !SKIP_WORDS.has(w));
  return (kept.length ? kept : words).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
};

export function crest(name, size = 44) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const [fill, ink] = CREST_COLORS[hash % CREST_COLORS.length];
  const letters = initials(name);
  return `<svg class="crest" width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46" aria-hidden="true"><path d="M3 3h34v21c0 11-9 17-17 20C12 41 3 35 3 24z" fill="${fill}" stroke="#b39a5f" stroke-width="1.4"/><path d="M6.5 6.5h27" stroke="${ink}" stroke-opacity=".5"/><text x="20" y="27" text-anchor="middle" fill="${ink}" font-family="Cinzel,serif" font-weight="700" font-size="${letters.length > 1 ? 14 : 18}">${esc(letters)}</text></svg>`;
}
