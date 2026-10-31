import { REGION_COLORS, avg, countryName, countryUrl, esc, medalCounts } from "../core.js";
import { categoryAxis, colors, donut, plot, rankBars, valueAxis } from "../charts.js";
import { card, chartCard, filterRows, filters, grid, startPage, table } from "../shell.js";

startPage({
  page: "paises",
  title: "Países",
  subtitle: "Quién llega a la final, quién gana y cómo cambia con los años.",
  render(view, data) {
    const holder = document.createElement("div");
    const state = filters(view, data, { from: data.years[0], to: data.years[data.years.length - 1], region: "all", min: 1, top: 20 }, () => draw());
    view.append(holder);
    const draw = () => {
      holder.innerHTML = "";
      const rows = filterRows(data, state);
      const byCountry = new Map();
      for (const r of rows) {
        const e = byCountry.get(r.country) ?? { name: r.country, rows: [], years: new Set(), unis: new Set(), region: r.region };
        e.rows.push(r); e.years.add(r.year); e.unis.add(r.uni);
        byCountry.set(r.country, e);
      }
      const list = [...byCountry.values()].filter((e) => e.years.size >= state.min);
      list.forEach((e) => {
        e.medals = medalCounts(e.rows);
        e.avg = avg(e.rows.filter((r) => r.pct != null).map((r) => r.pct));
        e.best = Math.min(...e.rows.map((r) => r.rank ?? 1e9));
      });
      const c = colors();
      const toItems = (fn) => [...list].sort((a, b) => fn(b) - fn(a)).slice(0, state.top).map((e) => ({ label: countryName(data, e.name), value: fn(e), url: countryUrl(e.name) }));
      const height = (n) => Math.max(320, Math.min(n, state.top) * 24 + 20);

      const a = grid(holder);
      rankBars(chartCard(a, { title: "Participaciones acumuladas", sub: "Cada equipo en cada final suma una", span: 4, height: height(list.length) }), toItems((e) => e.rows.length));
      rankBars(chartCard(a, { title: "Universidades finalistas", sub: "Cuántas universidades distintas", span: 4, height: height(list.length) }), toItems((e) => e.unis.size), { color: c.blue });
      rankBars(chartCard(a, { title: "Ediciones con presencia", span: 4, height: height(list.length) }), toItems((e) => e.years.size), { color: c.gold });

      const bubbles = list.map((e) => ({
        name: countryName(data, e.name), key: e.name,
        value: [e.rows.length, Math.round(e.avg), e.unis.size],
        itemStyle: { color: REGION_COLORS[e.region], opacity: 0.8 },
      }));
      plot(chartCard(a, { title: "Cantidad frente a calidad", sub: "Participaciones, percentil medio y número de universidades (tamaño)", span: 8, height: 420 }), {
        legend: false,
        tooltip: { formatter: (p) => `<b>${esc(p.name)}</b><br>${p.value[0]} participaciones · percentil medio ${p.value[1]} · ${p.value[2]} universidades` },
        xAxis: valueAxis({ type: "log", logBase: 2, min: 1, name: "Participaciones", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: c.dim } }),
        yAxis: valueAxis({ min: 0, max: 100, name: "Percentil medio", nameTextStyle: { color: c.dim } }),
        grid: { left: 8, right: 16, top: 30, bottom: 30, containLabel: true },
        series: [{
          type: "scatter", data: bubbles,
          symbolSize: (v) => 8 + Math.sqrt(v[2]) * 7,
          label: { show: true, formatter: (p) => (p.value[0] >= 25 ? p.name : ""), position: "top", color: c.ink, fontSize: 12 },
          labelLayout: { hideOverlap: true },
        }],
      }, { onClick: (p) => { location.href = countryUrl(p.data.key); } });

      const byRegion = new Map();
      for (const r of rows) byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + 1);
      donut(chartCard(a, { title: "Por región", span: 4, height: 420 }), [...byRegion].sort((x, y) => y[1] - x[1]).map(([region, value]) => ({ name: data.regions[region] ?? region, value, itemStyle: { color: REGION_COLORS[region] } })));

      const years = [];
      for (let y = state.from; y <= state.to; y++) years.push(y);
      const topTeams = [...list].sort((x, y) => y.rows.length - x.rows.length).slice(0, 8);
      const rankAt = (year) => {
        const counts = new Map();
        for (const r of rows) if (r.year === year) counts.set(r.country, Math.max(counts.get(r.country) ?? 0, r.pct ?? 0));
        return [...counts].sort((x, y) => y[1] - x[1]).map(([n]) => n);
      };
      const ranks = new Map(years.map((y) => [y, rankAt(y)]));
      plot(chartCard(a, { title: "La escalera de las potencias", sub: "Posición de cada país por su mejor equipo en cada final", span: 7, height: 400 }), {
        tooltip: { trigger: "item", formatter: (p) => `<b>${esc(p.seriesName)}</b>, ${p.name}: posición ${p.value}` },
        xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
        yAxis: valueAxis({ inverse: true, min: 1, minInterval: 1 }),
        series: topTeams.map((e) => ({
          name: countryName(data, e.name), type: "line", smooth: 0.3, symbolSize: 7, lineStyle: { width: 2.5 },
          data: years.map((y) => { const i = ranks.get(y).indexOf(e.name); return i < 0 ? null : i + 1; }),
          connectNulls: true, emphasis: { focus: "series" },
        })),
      });

      const heatCountries = [...list].sort((x, y) => y.rows.length - x.rows.length).slice(0, 18);
      const cells = [];
      heatCountries.forEach((e, i) => years.forEach((y, j) => {
        const n = e.rows.filter((r) => r.year === y).length;
        if (n) cells.push([j, i, n]);
      }));
      plot(chartCard(a, { title: "Equipos por país y año", span: 5, height: 400 }), {
        legend: false,
        tooltip: { formatter: (p) => `${esc(countryName(data, heatCountries[p.value[1]].name))}, ${years[p.value[0]]}: <b>${p.value[2]}</b>` },
        grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
        xAxis: categoryAxis(years.map((y) => String(y).slice(2))),
        yAxis: categoryAxis(heatCountries.map((e) => countryName(data, e.name)), { inverse: true, axisLabel: { color: c.ink, interval: 0, fontSize: 12 } }),
        visualMap: { show: false, min: 1, max: Math.max(1, ...cells.map((x) => x[2])), inRange: { color: [c.panel2, c.accent] } },
        series: [{ type: "heatmap", data: cells, itemStyle: { borderColor: c.panel, borderWidth: 1, borderRadius: 3 } }],
      });

      const ordered = [...list].sort((x, y) => y.medals.gold - x.medals.gold || y.rows.length - x.rows.length);
      card(a, {
        title: "Todos los países", span: 12,
        html: table(
          ["País", "Región", { label: "Particip.", num: 1, title: "Participaciones: cada equipo en cada final suma una" }, { label: "Univ.", num: 1 }, { label: "Ediciones", num: 1 }, { label: "Mejor", num: 1 }, { label: "Perc. medio", num: 1 }, { label: "Oro", num: 1 }, { label: "Plata", num: 1 }, { label: "Bronce", num: 1 }],
          ordered.map((e) => [`<a href="${countryUrl(e.name)}">${esc(countryName(data, e.name))}</a>`, esc(data.regions[e.region] ?? ""), e.rows.length, e.unis.size, e.years.size, e.best === 1e9 ? "—" : Math.round(e.best), Math.round(e.avg), e.medals.gold, e.medals.silver, e.medals.bronze]),
        ),
      });
    };
    draw();
  },
});
