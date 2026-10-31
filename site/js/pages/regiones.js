import { REGION_COLORS, TITLE_NAMES, countryName, countryUrl, crest, esc, medalCounts, medalStrip, quantile, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, rankBars, valueAxis } from "../charts.js";
import { card, chartCard, filterRows, filters, grid, kpis, startPage } from "../shell.js";

const place = (rank) => (rank == null ? "sin puesto" : `puesto ${Math.round(rank)}`);

const winnerCell = (r) => (r
  ? `<a href="${uniUrl(r.uni)}" title="${esc(r.uniName)}, ${r.year}: ${place(r.rank)}, ${esc(r.team)}">${crest(r.uniName, 18)} <span>${esc(r.uniName)}</span><small>${esc(r.team)} · ${place(r.rank)}${r.medal ? ` ${medalStrip({ [r.medal]: 1 }, 12)}` : ""}</small></a>`
  : "");

const winnersTable = (years, columns, winnerOf) => `<div class="tablew winners"><table><thead><tr><th>Final</th>${columns.map(([, label]) => `<th>${esc(label)}</th>`).join("")}</tr></thead><tbody>${[...years].reverse().map((year) => `<tr><th>${year}</th>${columns.map(([key]) => `<td>${winnerCell(winnerOf(year, key))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

startPage({
  page: "regiones",
  title: "Regiones",
  subtitle: "Quién gana en cada región del mundo, final a final.",
  render(view, data) {
    const holder = document.createElement("div");
    const defaults = { from: data.years[0], to: data.years[data.years.length - 1], title: "North America" };
    const state = filters(view, data, { from: defaults.from, to: defaults.to }, () => draw());
    state.title = new URLSearchParams(location.search).get("title") ?? defaults.title;
    view.append(holder);
    const draw = () => {
      holder.innerHTML = "";
      const rows = filterRows(data, state);
      const c = colors();
      const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
      const awards = rows.flatMap((r) => r.titles.filter((t) => t !== "World").map((title) => ({ ...r, title })));
      const awarded = Object.entries(TITLE_NAMES).filter(([key]) => awards.some((a) => a.title === key));
      const titleOf = (year, key) => awards.find((a) => a.year === year && a.title === key);
      const tally = (items, keyOf) => {
        const counts = new Map();
        for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
        return [...counts].sort((x, y) => y[1] - x[1]);
      };
      const byUni = tally(awards, (a) => a.uni);
      const byCountry = tally(awards, (a) => a.country);
      kpis(holder, [
        [awards.length, "títulos regionales"],
        [awarded.length, "regiones con título"],
        [byUni.length ? data.byId.get(byUni[0][0]).name : "—", `más títulos (${byUni[0]?.[1] ?? 0})`, byUni.length ? uniUrl(byUni[0][0]) : undefined],
        [byCountry.length ? countryName(data, byCountry[0][0]) : "—", `país con más títulos (${byCountry[0]?.[1] ?? 0})`, byCountry.length ? countryUrl(byCountry[0][0]) : undefined],
      ]);
      const a = grid(holder);
      card(a, {
        title: "Campeones regionales, final a final", span: 12,
        sub: "Títulos entregados en la final, con las regiones de cada época: antes de 2018, por ejemplo, Rusia competía en Europa.",
        html: winnersTable(years, awarded, titleOf),
      });

      const focus = awarded.some(([key]) => key === state.title) ? state.title : awarded[0]?.[0];
      const focused = awards.filter((x) => x.title === focus);
      const focusBody = card(a, {
        title: "El palmarés de una región", span: 5,
        html: `<div class="filters" style="border:0;padding:0;margin:0 0 6px;background:none"><label>Región <select id="pick-title">${awarded.map(([key, label]) => `<option value="${esc(key)}"${key === focus ? " selected" : ""}>${esc(label)}</option>`).join("")}</select></label></div><div class="plot" id="palmares" style="height:380px"></div>`,
      });
      focusBody.querySelector("#pick-title").onchange = (event) => {
        state.title = event.target.value;
        const next = new URLSearchParams(location.search);
        if (state.title === defaults.title) next.delete("title"); else next.set("title", state.title);
        history.replaceState(null, "", next.toString() ? `?${next}` : location.pathname);
        draw();
      };
      rankBars(focusBody.querySelector("#palmares"), tally(focused, (x) => x.uni).slice(0, 14).map(([id, value]) => ({ label: data.byId.get(id).name, value, url: uniUrl(id) })));

      plot(chartCard(a, { title: "A qué altura gana cada región", sub: "Puesto mundial de su campeón en cada final; toca la leyenda para ocultar regiones", span: 7, height: 430 }), {
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
        tally(champions, (r) => r.region).map(([region, value]) => ({ name: data.regions[region] ?? region, value, itemStyle: { color: REGION_COLORS[region] } })),
        { center: String(champions.length) });

      const regions = Object.entries(data.regions).filter(([key]) => rows.some((r) => r.region === key));
      const best = (year, region) => rows.find((r) => r.year === year && r.region === region && r.rank != null);
      card(a, {
        title: "El mejor de cada región actual", span: 12,
        sub: "Mejor puesto de cada final según las 8 regiones de hoy, aplicadas a todos los años. No es un título entregado, pero permite comparar épocas.",
        html: winnersTable(years, regions, best),
      });
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
