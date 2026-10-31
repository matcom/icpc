import { REGION_COLORS, TITLE_NAMES, countryName, countryUrl, crest, esc, medalCounts, medalStrip, quantile, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, rankBars, valueAxis } from "../charts.js";
import { card, chartCard, filterRows, filters, grid, kpis, startPage } from "../shell.js";

const place = (rank) => (rank == null ? "sin puesto" : `puesto ${Math.round(rank)}`);

const podiumCell = (r) => (r
  ? `<a href="${uniUrl(r.uni)}" title="${esc(r.uniName)}, ${r.year}: ${place(r.rank)}, ${esc(r.team)}">${crest(r.uniName, 18)} <span>${esc(r.uniName)}</span><small>${esc(r.team)} · ${place(r.rank)}${r.medal ? ` ${medalStrip({ [r.medal]: 1 }, 12)}` : ""}</small></a>`
  : "");

// Olympic order: most finals as best of the region, then second, then third.
const regionTally = (podiums) => {
  const tally = new Map();
  podiums.forEach((podium) => podium.forEach((r, i) => {
    const row = tally.get(r.uni) ?? { uni: r.uni, name: r.uniName, places: [0, 0, 0] };
    row.places[i] += 1;
    tally.set(r.uni, row);
  }));
  return [...tally.values()].sort((x, y) => y.places[0] - x.places[0] || y.places[1] - x.places[1] || y.places[2] - x.places[2] || x.name.localeCompare(y.name, "es"));
};

const historicPodium = (top) => `<ol class="region-podium">${top.map((t, i) => `<li><a href="${uniUrl(t.uni)}"><b>${i + 1}.º</b>${crest(t.name, 34)}<span>${esc(t.name)}</span><small>${t.places[0]} veces la mejor, ${t.places[1]} segunda, ${t.places[2]} tercera</small></a></li>`).join("")}</ol>`;

const tallyTable = (rows) => `<div class="tablew"><table><thead><tr><th>Universidad</th><th>1.º</th><th>2.º</th><th>3.º</th></tr></thead><tbody>${rows.map((t) => `<tr><td><a href="${uniUrl(t.uni)}">${esc(t.name)}</a></td>${t.places.map((n) => `<td>${n}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

const finalsTable = (years, podiumOf) => `<div class="tablew winners region-finals"><table><thead><tr><th>Final</th><th>1.º de la región</th><th>2.º</th><th>3.º</th></tr></thead><tbody>${[...years].reverse().filter((year) => podiumOf(year).length).map((year) => `<tr><th>${year}</th>${[0, 1, 2].map((i) => `<td>${podiumCell(podiumOf(year)[i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

startPage({
  page: "regiones",
  title: "Regiones",
  subtitle: "El podio histórico de cada región del mundo y cómo se comparan.",
  render(view, data) {
    const holder = document.createElement("div");
    const defaults = { from: data.years[0], to: data.years[data.years.length - 1], region: "la" };
    const state = filters(view, data, { from: defaults.from, to: defaults.to }, () => draw());
    state.podiumRegion = new URLSearchParams(location.search).get("podio") ?? defaults.region;
    view.append(holder);
    const draw = () => {
      holder.innerHTML = "";
      const rows = filterRows(data, state);
      const c = colors();
      const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
      const awards = rows.flatMap((r) => r.titles.filter((t) => t !== "World").map((title) => ({ ...r, title })));
      const awarded = Object.entries(TITLE_NAMES).filter(([key]) => awards.some((a) => a.title === key));
      const titleOf = (year, key) => awards.find((a) => a.year === year && a.title === key);
      const tallyBy = (items, keyOf) => {
        const counts = new Map();
        for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
        return [...counts].sort((x, y) => y[1] - x[1]);
      };
      const byUni = tallyBy(awards, (a) => a.uni);
      const byCountry = tallyBy(awards, (a) => a.country);
      kpis(holder, [
        [awards.length, "títulos regionales"],
        [awarded.length, "regiones con título"],
        [byUni.length ? data.byId.get(byUni[0][0]).name : "—", `más títulos (${byUni[0]?.[1] ?? 0})`, byUni.length ? uniUrl(byUni[0][0]) : undefined],
        [byCountry.length ? countryName(data, byCountry[0][0]) : "—", `país con más títulos (${byCountry[0]?.[1] ?? 0})`, byCountry.length ? countryUrl(byCountry[0][0]) : undefined],
      ]);
      const regions = Object.entries(data.regions).filter(([key]) => rows.some((r) => r.region === key));
      const focus = regions.some(([key]) => key === state.podiumRegion) ? state.podiumRegion : regions[0]?.[0];
      const placed = rows.filter((r) => r.region === focus && r.rank != null).sort((x, y) => x.rank - y.rank);
      const podiumOf = (year) => placed.filter((r) => r.year === year).slice(0, 3);
      const tally = regionTally(years.map(podiumOf));
      const focusName = data.regions[focus] ?? "";
      const a = grid(holder);
      const podiumBody = card(a, {
        title: "El podio histórico de una región", span: 12,
        sub: `Veces que cada universidad fue la mejor, la segunda o la tercera de ${esc(focusName)} en una final, con las 8 regiones de hoy aplicadas a todos los años.`,
        html: `<div class="filters" style="border:0;padding:0;margin:0 0 10px;background:none"><label>Región <select id="pick-region">${regions.map(([key, label]) => `<option value="${esc(key)}"${key === focus ? " selected" : ""}>${esc(label)}</option>`).join("")}</select></label></div>${historicPodium(tally.slice(0, 3))}<div class="region-tables">${tallyTable(tally.slice(0, 12))}${finalsTable(years, podiumOf)}</div>`,
      });
      podiumBody.querySelector("#pick-region").onchange = (event) => {
        state.podiumRegion = event.target.value;
        const next = new URLSearchParams(location.search);
        if (state.podiumRegion === defaults.region) next.delete("podio"); else next.set("podio", state.podiumRegion);
        history.replaceState(null, "", next.toString() ? `?${next}` : location.pathname);
        draw();
      };

      plot(chartCard(a, { title: "A qué altura gana cada región", sub: "Puesto mundial de quien ganó el título regional en cada final; antes de 2018, por ejemplo, Rusia competía en Europa. Toca la leyenda para ocultar regiones", span: 12, height: 430 }), {
        tooltip: { trigger: "axis" },
        xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
        yAxis: valueAxis({ inverse: true, min: 1 }),
        series: awarded.map(([key, label]) => ({
          name: label, type: "line", connectNulls: false, symbolSize: 6, lineStyle: { width: 2 }, emphasis: { focus: "series" },
          data: years.map((y) => { const r = titleOf(y, key); return r?.rank == null ? null : Math.round(r.rank); }),
        })),
      });

      rankBars(chartCard(a, { title: "Más títulos regionales", sub: "Universidades", span: 4, height: 460 }),
        byUni.slice(0, 16).map(([id, value]) => ({ label: data.byId.get(id).name, value, url: uniUrl(id) })), { color: c.blue });
      donut(chartCard(a, { title: "Títulos por país", span: 4, height: 460 }),
        [...byCountry.slice(0, 10).map(([name, value]) => ({ name: countryName(data, name), value, key: name })), ...(byCountry.length > 10 ? [{ name: "Otros", value: byCountry.slice(10).reduce((s, x) => s + x[1], 0) }] : [])],
        { center: String(awards.length), onClick: (p) => { if (p.data.key) location.href = countryUrl(p.data.key); } });
      const champions = rows.filter((r) => r.rank === 1);
      donut(chartCard(a, { title: "Campeones del mundo por región", sub: "Con las regiones actuales", span: 4, height: 460 }),
        tallyBy(champions, (r) => r.region).map(([region, value]) => ({ name: data.regions[region] ?? region, value, itemStyle: { color: REGION_COLORS[region] } })),
        { center: String(champions.length) });

      const percentiles = regions.map(([key]) => rows.filter((r) => r.region === key && r.pct != null).map((r) => r.pct));
      plot(chartCard(a, { title: "Nivel de cada región", sub: "Percentil de sus equipos: mínimo, mitad central, mediana y máximo", span: 6, height: 360 }), {
        legend: false,
        tooltip: { trigger: "item", formatter: (p) => `<b>${esc(p.name)}</b> (${percentiles[p.dataIndex].length} participaciones)<br>Mediana ${Math.round(p.value[3])}` },
        xAxis: categoryAxis(regions.map(([, label]) => label), { axisLabel: { color: c.dim, interval: 0, fontSize: 11, formatter: (label) => label.replace(/ /g, "\n") } }),
        yAxis: valueAxis({ min: 0, max: 100 }),
        series: [{ type: "boxplot", itemStyle: { color: c.panel2, borderColor: c.accent, borderWidth: 2 }, data: percentiles.map((v) => [Math.min(...v), quantile(v, 0.25), quantile(v, 0.5), quantile(v, 0.75), Math.max(...v)]) }],
      });
      const medalTable = regions.map(([key, label]) => ({ label, counts: medalCounts(rows.filter((r) => r.region === key)) }));
      card(a, {
        title: "El medallero de cada región", span: 6,
        html: `<ol class="medal-rows">${medalTable.map((m) => `<li><a href="medallas.html?region=${m.label ? regions.find(([, l]) => l === m.label)[0] : ""}"><span class="nm">${esc(m.label)}</span><span class="medals">${medalStrip(m.counts, 13)}</span></a></li>`).join("")}</ol>`,
      });
    };
    draw();
  },
});
