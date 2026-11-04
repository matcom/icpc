// What the global search can find. `key` is the text the query is matched against.
import { countryName, countryUrl, personUrl, regionUrl, teamUrl, uniUrl } from "./core.js";

export function searchEntries(data) {
  const teams = data.teams
    ? [...data.teams.values()].map((t) => {
      const uni = data.byId.get(t.uni);
      return {
        kind: "Equipo", order: 3, label: t.name, count: t.rows.length, uni,
        key: t.name, url: teamUrl(t.uni, t.name), mark: uni.name,
        complexityKey: `t:${t.key}`,
        sub: `${uni.name} · ${t.rows.length} ${t.rows.length === 1 ? "final" : "finales"}`,
      };
    })
    : [];
  const countriesPerRegion = new Map();
  for (const country of data.countriesIndex.values()) {
    countriesPerRegion.set(country.region, (countriesPerRegion.get(country.region) ?? 0) + 1);
  }
  return [
    ...teams,
    ...Object.entries(data.regions ?? {}).map(([code, label]) => ({ kind: "Región", order: 0, label, sub: `${countriesPerRegion.get(code) ?? 0} países`, key: label, url: regionUrl(code), mark: label, complexityKey: `r:${code}` })),
    ...[...data.countriesIndex.values()].map((c) => ({ kind: "País", order: 0, label: c.es, sub: `${c.rows.length} participaciones`, key: `${c.es} ${c.name}`, url: countryUrl(c.name), mark: c.name, complexityKey: `c:${c.name}` })),
    ...data.unis.map((u) => ({ kind: "Universidad", order: 1, label: u.name, sub: `${countryName(data, u.country)} · ${u.results.length} finales`, key: u.name, url: uniUrl(u.id), mark: u.name, complexityKey: `u:${u.id}` })),
    ...[...data.people.values()].map((p) => ({ kind: "Competidor", order: 2, label: p.name, sub: `${p.rows[p.rows.length - 1].uniName} · ${p.rows.length} finales`, key: p.name, url: personUrl(p.key), mark: p.name })),
  ];
}
