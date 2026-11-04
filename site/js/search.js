// What the global search can find. `key` is the text the query is matched against.
import { countryName, countryUrl, personUrl, teamUrl, uniUrl } from "./core.js";

export function searchEntries(data) {
  const teams = data.teams
    ? [...data.teams.values()].map((t) => {
      const uni = data.byId.get(t.uni);
      return {
        kind: "Equipo", order: 3, label: t.name, count: t.rows.length, uni,
        key: t.name, url: teamUrl(t.uni, t.name), mark: uni.name,
        sub: `${uni.name} · ${t.rows.length} ${t.rows.length === 1 ? "final" : "finales"}`,
      };
    })
    : [];
  return [
    ...teams,
    ...[...data.countriesIndex.values()].map((c) => ({ kind: "País", order: 0, label: c.es, sub: `${c.rows.length} participaciones`, key: `${c.es} ${c.name}`, url: countryUrl(c.name), mark: c.name })),
    ...data.unis.map((u) => ({ kind: "Universidad", order: 1, label: u.name, sub: `${countryName(data, u.country)} · ${u.results.length} finales`, key: u.name, url: uniUrl(u.id), mark: u.name })),
    ...[...data.people.values()].map((p) => ({ kind: "Competidor", order: 2, label: p.name, sub: `${p.rows[p.rows.length - 1].uniName} · ${p.rows.length} finales`, key: p.name, url: personUrl(p.key), mark: p.name })),
  ];
}
