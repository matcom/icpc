import { REGION_COLORS, avg, quantile, uniUrl } from "../core.js";
import { categoryAxis, colors, plot, rankBars, valueAxis } from "../charts.js";
import { card, chartCard, filterRows, filters, grid, startPage, universityPicker } from "../shell.js";

const mode = (values) => {
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
};

startPage({
  page: "problemas",
  title: "Problemas y puestos",
  subtitle: "Qué tan difícil fue cada final y cuánto resuelve cada universidad.",
  render(view, data) {
    const holder = document.createElement("div");
    const defaults = { from: 2010, to: data.years[data.years.length - 1], region: "all", min: 1, top: 20, a: "universidad-de-la-habana", b: "universidad-de-oriente-sede-antonio-maceo" };
    const state = filters(view, data, defaults, () => draw());
    if (!data.byId.has(state.a)) state.a = data.unis[0].id;
    if (!data.byId.has(state.b)) state.b = data.unis[1].id;
    view.append(holder);
    const draw = () => {
      holder.innerHTML = "";
      const rows = filterRows(data, state);
      const c = colors();
      const years = [...new Set(rows.map((r) => r.year))].sort((x, y) => x - y);
      const solvedAt = (y) => rows.filter((r) => r.year === y && r.solved != null).map((r) => r.solved);
      const a = grid(holder);

      const picker = card(a, { span: 12, html: `<div class="filters" style="border:0;padding:0;margin:0;background:none">${universityPicker(data, state.a, "Comparar")}${universityPicker(data, state.b, "con")}</div>` });
      const pickers = picker.querySelectorAll("[data-pick]");
      pickers[0].onchange = (e) => { state.a = e.target.value; draw(); };
      pickers[1].onchange = (e) => { state.b = e.target.value; draw(); };

      const uniLine = (id, color, field) => {
        const by = new Map(data.byId.get(id).results.map((r) => [r.year, r]));
        return { name: data.byId.get(id).name, type: "line", connectNulls: true, symbolSize: 8, lineStyle: { width: 3, color }, itemStyle: { color }, z: 5, data: years.map((y) => (by.get(y)?.[field] == null ? null : Math.round(by.get(y)[field]))) };
      };
      const stat = (name, fn, style = {}) => ({ name, type: "line", symbol: "none", lineStyle: { width: 1.6, ...style }, itemStyle: { color: style.color }, data: years.map((y) => { const v = solvedAt(y); return v.length ? +fn(v).toFixed(1) : null; }) });
      plot(chartCard(a, { title: "Problemas resueltos por edición", sub: "Máximo, media, mediana, moda y mínimo, con las dos universidades elegidas", span: 7, height: 360 }), {
        tooltip: { trigger: "axis" },
        xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
        yAxis: valueAxis({ minInterval: 1 }),
        series: [
          stat("Máximo", (v) => Math.max(...v), { color: c.blue }),
          stat("Media", avg, { color: c.gold }),
          stat("Mediana", (v) => quantile(v, 0.5), { color: c.gold, type: "dashed" }),
          stat("Moda", mode, { color: c.dim, type: "dotted" }),
          stat("Mínimo", (v) => Math.min(...v), { color: c.blue, type: "dotted" }),
          uniLine(state.a, c.accent, "solved"),
          uniLine(state.b, c.red, "solved"),
        ],
      });
      plot(chartCard(a, { title: "Distribución por edición", sub: "Cajas: mínimo, mitad central, mediana y máximo", span: 5, height: 360 }), {
        legend: false,
        tooltip: { trigger: "item", formatter: (p) => `<b>${p.name}</b><br>Mediana ${p.value[3]} · máximo ${p.value[5]}` },
        xAxis: categoryAxis(years.map(String)),
        yAxis: valueAxis({ minInterval: 1 }),
        series: [{
          type: "boxplot", itemStyle: { color: c.panel2, borderColor: c.accent },
          data: years.map((y) => { const v = solvedAt(y); return [Math.min(...v), quantile(v, 0.25), quantile(v, 0.5), quantile(v, 0.75), Math.max(...v)]; }),
        }],
      });

      const worst = years.map((y) => Math.max(...rows.filter((r) => r.year === y && r.rank != null).map((r) => r.rank), 1));
      const median = years.map((y) => { const v = rows.filter((r) => r.year === y && r.rank != null).map((r) => r.rank); return v.length ? Math.round(quantile(v, 0.5)) : null; });
      plot(chartCard(a, { title: "Lugar por edición", sub: "Sobre la mediana y el último puesto de cada final", span: 7, height: 340 }), {
        tooltip: { trigger: "axis" },
        xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
        yAxis: valueAxis({ inverse: true, min: 1 }),
        series: [
          { name: "Último puesto", type: "line", symbol: "none", data: worst.map(Math.round), lineStyle: { color: c.blue, width: 1.6 }, itemStyle: { color: c.blue } },
          { name: "Mediana", type: "line", symbol: "none", data: median, lineStyle: { color: c.gold, width: 1.6, type: "dashed" }, itemStyle: { color: c.gold } },
          uniLine(state.a, c.accent, "rank"),
          uniLine(state.b, c.red, "rank"),
        ],
      });
      const maxSolved = Math.max(...rows.map((r) => r.solved ?? 0));
      const cells = [];
      years.forEach((y, i) => {
        const values = solvedAt(y);
        for (let s = 0; s <= maxSolved; s++) {
          const n = values.filter((v) => v === s).length;
          if (n) cells.push([i, s, Math.round((100 * n) / values.length)]);
        }
      });
      plot(chartCard(a, { title: "Mapa de calor de la dificultad", sub: "% de equipos que resolvió cada cantidad de problemas", span: 5, height: 340 }), {
        legend: false,
        tooltip: { formatter: (p) => `${years[p.value[0]]}: <b>${p.value[2]}%</b> resolvió ${p.value[1]}` },
        grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
        xAxis: categoryAxis(years.map((y) => String(y).slice(2))),
        yAxis: categoryAxis(Array.from({ length: maxSolved + 1 }, (_, i) => String(i))),
        visualMap: { show: false, min: 0, max: Math.max(...cells.map((x) => x[2]), 1), inRange: { color: [c.panel2, c.accent] } },
        series: [{ type: "heatmap", data: cells, itemStyle: { borderColor: c.panel, borderWidth: 1, borderRadius: 3 } }],
      });

      const total = new Map();
      for (const r of rows) {
        const e = total.get(r.uni) ?? { id: r.uni, name: r.uniName, solved: 0, possible: 0, inPossible: 0, years: new Set() };
        total.set(r.uni, e);
        e.solved += r.solved ?? 0;
        e.years.add(r.year);
        const problems = data.problems[r.year];
        if (problems) { e.possible += problems; e.inPossible += r.solved ?? 0; }
      }
      const list = [...total.values()].filter((e) => e.years.size >= state.min);
      const height = Math.max(320, state.top * 24 + 20);
      rankBars(chartCard(a, { title: "Total de problemas resueltos", sub: "Acumulado del periodo", span: 4, height }),
        [...list].sort((x, y) => y.solved - x.solved).slice(0, state.top).map((e) => ({ label: e.name, value: e.solved, url: uniUrl(e.id) })));
      rankBars(chartCard(a, { title: "% de problemas resueltos", sub: "Sobre los de sus finales, desde 2010", span: 4, height }),
        list.filter((e) => e.possible).sort((x, y) => y.inPossible / y.possible - x.inPossible / x.possible).slice(0, state.top).map((e) => ({ label: e.name, value: Math.round((100 * e.inPossible) / e.possible), url: uniUrl(e.id) })),
        { format: (v) => `${v}%`, color: c.blue });
      const regions = [...new Set(rows.map((r) => r.region))].sort();
      plot(chartCard(a, { title: "Problemas por región", sub: "Media por edición", span: 4, height }), {
        tooltip: { trigger: "axis" },
        xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
        yAxis: valueAxis(),
        series: regions.map((region) => ({
          name: data.regions[region] ?? region, type: "line", smooth: 0.3, symbol: "none", lineStyle: { width: 2 }, itemStyle: { color: REGION_COLORS[region] }, connectNulls: true,
          data: years.map((y) => { const v = rows.filter((r) => r.year === y && r.region === region && r.solved != null).map((r) => r.solved); return v.length ? +avg(v).toFixed(1) : null; }),
        })),
      });
    };
    draw();
  },
});
