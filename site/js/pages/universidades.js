import { REGION_COLORS, avg, countryName, esc, medalCounts, uniUrl } from "../core.js";
import { colors, plot, rankBars, valueAxis } from "../charts.js";
import { card, chartCard, filterRows, filters, grid, isDark, startPage, table } from "../shell.js";

function heatColor(pct) {
  const t = (pct / 100) ** 2.2;
  const [from, to] = isDark() ? [[120, 60, 62], [253, 184, 48]] : [[232, 216, 178], [109, 34, 46]];
  return `rgb(${from.map((v, i) => Math.round(v + (to[i] - v) * t)).join()})`;
}
const heatInk = (pct) => {
  const strong = (pct / 100) ** 2.2 > 0.42;
  return isDark() ? (strong ? "#2b0d12" : "#fbf4e4") : (strong ? "#fbf4e4" : "#2b0d12");
};

startPage({
  page: "universidades",
  title: "Universidades",
  subtitle: "Constancia, resultados y lugar en el mapa de cada universidad finalista.",
  render(view, data) {
    const holder = document.createElement("div");
    const state = filters(view, data, { from: data.years[0], to: data.years[data.years.length - 1], region: "all", min: 1, top: 20 }, () => draw());
    view.append(holder);
    const draw = () => {
      holder.innerHTML = "";
      const rows = filterRows(data, state);
      const map = new Map();
      for (const r of rows) {
        const e = map.get(r.uni) ?? { id: r.uni, name: r.uniName, country: r.country, region: r.region, rows: [] };
        e.rows.push(r);
        map.set(r.uni, e);
      }
      const list = [...map.values()].filter((e) => e.rows.length >= state.min);
      list.forEach((e) => {
        e.avg = avg(e.rows.filter((r) => r.pct != null).map((r) => r.pct));
        e.best = Math.min(...e.rows.map((r) => r.rank ?? 1e9));
        e.medals = medalCounts(e.rows);
        e.solved = e.rows.reduce((s, r) => s + (r.solved ?? 0), 0);
      });
      const c = colors();
      const items = (fn) => [...list].sort((a, b) => fn(b) - fn(a)).slice(0, state.top).map((e) => ({ label: e.name, value: fn(e), url: uniUrl(e.id) }));
      const height = Math.max(320, state.top * 24 + 20);
      const a = grid(holder);
      rankBars(chartCard(a, { title: "Más finales", span: 4, height }), items((e) => e.rows.length));
      rankBars(chartCard(a, { title: "Más problemas resueltos", span: 4, height }), items((e) => e.solved), { color: c.blue });
      rankBars(chartCard(a, { title: "Mejor percentil medio", sub: "Con al menos 3 finales en el periodo", span: 4, height }),
        [...list].filter((e) => e.rows.length >= Math.max(3, state.min)).sort((x, y) => y.avg - x.avg).slice(0, state.top).map((e) => ({ label: e.name, value: Math.round(e.avg), url: uniUrl(e.id) })), { color: c.gold });

      plot(chartCard(a, { title: "Constancia frente a resultado", sub: "Cada punto es una universidad; el color indica su región", span: 7, height: 420 }), {
        legend: false,
        tooltip: { formatter: (p) => `<b>${esc(p.data.name)}</b><br>${p.value[0]} finales · percentil medio ${p.value[1]}` },
        grid: { left: 8, right: 16, top: 30, bottom: 30, containLabel: true },
        xAxis: valueAxis({ minInterval: 1, name: "Finales", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: c.dim } }),
        yAxis: valueAxis({ min: 0, max: 100, name: "Percentil medio", nameTextStyle: { color: c.dim } }),
        series: [{
          type: "scatter",
          data: list.map((e) => ({ name: e.name, id: e.id, value: [e.rows.length, Math.round(e.avg)], itemStyle: { color: REGION_COLORS[e.region], opacity: 0.72 }, symbolSize: e.medals.gold ? 15 : 9 })),
          label: { show: true, color: c.ink, fontSize: 11, position: "top", formatter: (p) => (p.value[0] >= 14 && p.value[1] >= 86 ? p.name.replace(/ University$/, "") : "") },
          labelLayout: { hideOverlap: true },
        }],
      }, { onClick: (p) => { location.href = uniUrl(p.data.id); } });

      const regions = [...new Set(list.map((e) => e.region))];
      plot(chartCard(a, { title: "Del continente al campus", sub: "Finales por región, país y universidad. Toca para abrir.", span: 5, height: 420 }), {
        legend: false,
        tooltip: { formatter: (p) => `${esc(p.name)}: <b>${p.value}</b>` },
        series: [{
          type: "sunburst", radius: ["12%", "96%"], sort: "desc",
          itemStyle: { borderColor: c.panel, borderWidth: 1 },
          label: { rotate: "radial", color: "#fff", fontSize: 10, minAngle: 8, formatter: (p) => p.name.slice(0, 16) },
          levels: [{}, { label: { fontSize: 11 } }, { label: { fontSize: 10 } }, { label: { show: false } }],
          data: regions.map((region) => {
            const countries = [...new Set(list.filter((e) => e.region === region).map((e) => e.country))];
            return {
              name: data.regions[region] ?? region, itemStyle: { color: REGION_COLORS[region] },
              children: countries.map((country) => ({
                name: countryName(data, country),
                children: list.filter((e) => e.country === country).map((e) => ({ name: e.name, value: e.rows.length, id: e.id })),
              })),
            };
          }),
        }],
      }, { onClick: (p) => { if (p.data?.id) location.href = uniUrl(p.data.id); } });

      const years = [];
      for (let y = state.from; y <= state.to; y++) years.push(y);
      const top = [...list].sort((x, y) => y.rows.length - x.rows.length || y.avg - x.avg).slice(0, 30);
      card(a, {
        title: "Constelación de constancia", sub: "Las 30 con más finales. Cuanto más intenso, mejor resultado; el número es el puesto.", span: 12,
        html: `<div class="tablew"><table class="heat"><thead><tr><th></th>${years.map((y) => `<th>${String(y).slice(2)}</th>`).join("")}</tr></thead><tbody>${top.map((e) => {
          const by = new Map(e.rows.map((r) => [r.year, r]));
          return `<tr><td class="u"><a href="${uniUrl(e.id)}" title="${esc(e.name)}">${esc(e.name)}</a></td>${years.map((y) => {
            const r = by.get(y);
            if (!r) return '<td class="c empty"></td>';
            if (r.pct == null) return `<td class="c" style="background:var(--line)" title="${y}: sin puesto"></td>`;
            return `<td class="c" style="background:${heatColor(r.pct)};color:${heatInk(r.pct)}" title="${y}: puesto ${Math.round(r.rank)}">${Math.round(r.rank)}</td>`;
          }).join("")}</tr>`;
        }).join("")}</tbody></table></div>`,
      });
      const ordered = [...list].sort((x, y) => y.rows.length - x.rows.length || y.avg - x.avg);
      card(a, {
        title: `Todas (${list.length})`, span: 12,
        html: table(
          ["Universidad", "País", { label: "Finales", num: 1 }, { label: "Mejor", num: 1 }, { label: "Perc. medio", num: 1 }, { label: "Resueltos", num: 1 }, { label: "Oro", num: 1 }, { label: "Plata", num: 1 }, { label: "Bronce", num: 1 }],
          ordered.map((e) => [`<a href="${uniUrl(e.id)}">${esc(e.name)}</a>`, esc(countryName(data, e.country)), e.rows.length, e.best === 1e9 ? "—" : Math.round(e.best), Math.round(e.avg), e.solved, e.medals.gold, e.medals.silver, e.medals.bronze]),
        ),
      });
    };
    draw();
  },
});
