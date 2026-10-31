// What the global search can find. `key` is the text the query is matched against.
import { countryName, countryUrl, personUrl, teamUrl, uniUrl } from "./core.js";

export function searchEntries(data) {
  const teams = new Map();
  for (const u of data.unis) {
    for (const r of u.results) {
      const key = `${u.id}|${r.team}`.toLowerCase();
      const entry = teams.get(key) ?? { kind: "Equipo", order: 3, label: r.team, count: 0, uni: u, key: r.team, url: teamUrl(u.id, r.team), mark: u.name };
      entry.count += 1;
      teams.set(key, entry);
    }
  }
  for (const t of teams.values()) t.sub = `${t.uni.name} · ${t.count} ${t.count === 1 ? "final" : "finales"}`;
  return [
    ...teams.values(),
    ...[...data.countriesIndex.values()].map((c) => ({ kind: "País", order: 0, label: c.es, sub: `${c.rows.length} participaciones`, key: `${c.es} ${c.name}`, url: countryUrl(c.name), mark: c.name })),
    ...data.unis.map((u) => ({ kind: "Universidad", order: 1, label: u.name, sub: `${countryName(data, u.country)} · ${u.results.length} finales`, key: u.name, url: uniUrl(u.id), mark: u.name })),
    ...[...data.people.values()].map((p) => ({ kind: "Competidor", order: 2, label: p.name, sub: `${p.rows[p.rows.length - 1].uniName} · ${p.rows.length} finales`, key: p.name, url: personUrl(p.key), mark: p.name })),
  ];
}
