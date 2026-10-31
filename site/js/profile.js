// Parts shared by the university, country, team and competitor profiles.
import { MEDAL_NAMES, TITLE_NAMES, esc, fold, medalIcon, personUrl, teamUrl, uniUrl } from "./core.js";

export const forecastCallout = (forecast, field, year) => (forecast?.pct != null
  ? `<div class="callout">Proyección ${year}: los ${forecast.cases} casos históricos más parecidos terminaron por el <b>puesto ${forecast.rank}</b> de ${field} (la mitad entre ${forecast.rank_best} y ${forecast.rank_worst}). El <b>${forecast.returns}%</b> volvió a la final al año siguiente.</div>`
  : '<div class="callout">Sin proyección: hacen falta al menos dos finales con puesto conocido y una aparición en los últimos cinco años.</div>');

export function medalDonut(el, counts) {
  el.style.height = "auto";
  const kinds = ["gold", "silver", "bronze"].filter((kind) => counts[kind] > 0);
  el.innerHTML = kinds.length
    ? `<ul class="medal-case">${kinds.map((kind) => `<li><b>${counts[kind]}</b><span>${MEDAL_NAMES[kind]}</span><span class="medals">${medalIcon(kind, 26).repeat(counts[kind])}</span></li>`).join("")}</ul>`
    : '<p class="sub" style="padding:24px 0;text-align:center">Todavía sin medallas.</p>';
}

export const chipLinks = (items) => `<div class="chips">${items.map((i) => `<a class="chip" href="${esc(i.url)}">${i.mark ?? ""}${esc(i.label)}</a>`).join("")}</div>`;

// "2015, 2016 y 2017"
export const listEs = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`);

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const placeText = (r, field) => `puesto ${Math.round(r.rank)} de ${field[r.year]} en ${r.year}${r.solved != null ? `, con ${plural(r.solved, "problema resuelto", "problemas resueltos")}` : ""}`;

const bestResult = (rows) => [...rows].filter((r) => r.rank != null).sort((a, b) => a.rank - b.rank || a.year - b.year)[0];

const titleFacts = (rows) => {
  const byTitle = new Map();
  for (const r of rows) for (const t of r.titles) byTitle.set(t, [...(byTitle.get(t) ?? []), r.year]);
  const facts = [];
  if (byTitle.has("World")) facts.push(`🏆 <b>Campeonato del mundo</b> en ${listEs(byTitle.get("World"))}.`);
  for (const [title, years] of byTitle) {
    if (title !== "World") facts.push(`🏅 <b>Título de ${esc(TITLE_NAMES[title] ?? title)}</b> en ${listEs(years)}.`);
  }
  return facts;
};

const medalFacts = (rows) => ["gold", "silver", "bronze"].flatMap((kind) => {
  const years = rows.filter((r) => r.medal === kind).map((r) => r.year);
  return years.length ? [`${medalIcon(kind, 18)} Medalla de ${MEDAL_NAMES[kind].toLowerCase()} en ${listEs(years)}.`] : [];
});

export const teamLink = (uni, team) => `<a href="${teamUrl(uni, team)}">${esc(team)}</a>`;
const personLink = (id, name) => `<a href="${personUrl(id)}">${esc(name)}</a>`;

const streaks = (years, allYears) => {
  const present = new Set(years);
  let best = [];
  let run = [];
  let gap = [];
  let bestGap = [];
  for (const y of allYears.filter((v) => v >= years[0] && v <= years[years.length - 1])) {
    if (present.has(y)) {
      run = [...run, y];
      gap = [];
      if (run.length > best.length) best = run;
    } else {
      gap = [...gap, y];
      run = [];
      if (gap.length > bestGap.length) bestGap = gap;
    }
  }
  return { best, bestGap };
};

// People of a set of results, with the finals each one played in them.
const peopleOf = (rows) => {
  const people = new Map();
  for (const r of rows) {
    r.player_ids.forEach((id, i) => {
      const p = people.get(id) ?? { id, name: r.players[i], years: [] };
      p.years.push(r.year);
      people.set(id, p);
    });
  }
  return [...people.values()].sort((a, b) => b.years.length - a.years.length || a.name.localeCompare(b.name, "es"));
};

export const ficha = (facts) => `<ul class="ficha">${facts.filter(Boolean).map((f) => `<li>${f}</li>`).join("")}</ul>`;

export function personFacts(data, person) {
  const rows = [...person.rows].sort((a, b) => a.year - b.year);
  const facts = titleFacts(rows);
  const byUni = new Map();
  for (const r of rows) byUni.set(r.uni, [...(byUni.get(r.uni) ?? []), r]);
  for (const [uni, list] of byUni) {
    const teams = [...new Map(list.map((r) => [fold(r.team), r.team])).values()];
    facts.push(`🎓 Compitió por <a href="${uniUrl(uni)}">${esc(data.byId.get(uni).name)}</a> en ${listEs(list.map((r) => r.year))}, con ${teams.length === 1 ? "el equipo" : "los equipos"} ${listEs(teams.map((t) => teamLink(uni, t)))}.`);
  }
  facts.push(...medalFacts(rows));
  const best = bestResult(rows);
  if (best) facts.push(`📈 Mejor resultado: ${placeText(best, data.field)}.`);
  const mates = peopleOf(rows).filter((p) => p.id !== person.key);
  if (mates.length) facts.push(`🤝 Compañeros de equipo: ${listEs(mates.map((p) => `${personLink(p.id, p.name)}${p.years.length > 1 ? ` (${p.years.length} finales)` : ""}`))}.`);
  return facts;
}

export function universityFacts(data, uni) {
  const rows = uni.results;
  const years = rows.map((r) => r.year);
  const facts = titleFacts(rows);
  facts.push(`📅 Debutó en ${years[0]} y lleva ${plural(rows.length, "final", "finales")}, la última en ${years[years.length - 1]}.`);
  const { best: streak, bestGap } = streaks(years, data.years);
  if (streak.length > 1) facts.push(`🔥 Racha más larga: ${streak.length} finales seguidas, de ${streak[0]} a ${streak[streak.length - 1]}.`);
  if (bestGap.length) facts.push(`⏳ Mayor ausencia: ${plural(bestGap.length, "final", "finales")}, ${bestGap.length === 1 ? `en ${bestGap[0]}` : `de ${bestGap[0]} a ${bestGap[bestGap.length - 1]}`}.`);
  facts.push(...medalFacts(rows));
  const best = bestResult(rows);
  if (best) facts.push(`📈 Mejor resultado: ${placeText(best, data.field)}, con ${teamLink(uni.id, best.team)}.`);
  const teams = new Map();
  for (const r of rows) {
    const t = teams.get(fold(r.team)) ?? { team: r.team, n: 0 };
    t.n += 1;
    teams.set(fold(r.team), t);
  }
  facts.push(`👥 ${plural(teams.size, "equipo", "equipos")}: ${listEs([...teams.values()].sort((a, b) => b.n - a.n).map((t) => `${teamLink(uni.id, t.team)}${t.n > 1 ? ` (${t.n})` : ""}`))}.`);
  const people = peopleOf(rows);
  const returning = people.filter((p) => p.years.length > 1);
  facts.push(`🧑‍💻 ${plural(people.length, "persona ha competido", "personas han competido")} por ella${returning.length ? `; ${returning.length} ${returning.length === 1 ? "repitió" : "repitieron"}: ${listEs(returning.slice(0, 8).map((p) => `${personLink(p.id, p.name)} (${p.years.length})`))}${returning.length > 8 ? " y otras" : ""}` : ""}.`);
  const rivals = [...data.unis].filter((u) => u.country === uni.country).sort((a, b) => b.results.length - a.results.length);
  if (rivals.length > 1) facts.push(`🌎 Es la n.º ${rivals.findIndex((u) => u.id === uni.id) + 1} de ${rivals.length} de su país por número de finales.`);
  return facts;
}

export function teamFacts(data, uni, rows) {
  const years = rows.map((r) => r.year);
  const facts = titleFacts(rows);
  facts.push(`📅 Compitió por <a href="${uniUrl(uni.id)}">${esc(uni.name)}</a> en ${listEs(years)} (${plural(rows.length, "final", "finales")}).`);
  facts.push(...medalFacts(rows));
  const best = bestResult(rows);
  if (best) facts.push(`📈 Mejor resultado: ${placeText(best, data.field)}.`);
  const people = peopleOf(rows);
  facts.push(`🧑‍💻 Con este nombre compitieron ${listEs(people.map((p) => `${personLink(p.id, p.name)}${p.years.length > 1 ? ` (${p.years.length})` : ""}`))}.`);
  return facts;
}
