import { REGION_COLORS, countryName, countryUrl, esc, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, valueAxis } from "../charts.js";
import { card, chartCard, grid, kpis, startPage, table } from "../shell.js";

startPage({
  page: "predicciones",
  title: "Predicciones",
  subtitle: "Qué esperar en la próxima final según trayectorias históricas parecidas.",
  render(view, data) {
    const { predictions: P } = data;
    const bt = P.backtest;
    const c = colors();
    const teams = P.teams.map((t) => ({ ...t, uni: data.byId.get(t.id), region: data.countries[data.byId.get(t.id).country]?.region }));
    kpis(view, [
      [P.year, `${esc(data.next_final.place)}, ${data.next_final.dates}`],
      [teams.length, "universidades proyectadas"],
      [bt.spearman.toFixed(2), `acierto del orden (base ${bt.spearman_baseline.toFixed(2)})`],
      [`${bt.inside_range}%`, "cae dentro del rango (ideal 50%)"],
    ]);
    const a = grid(view);
    const top = teams.slice(0, 25);
    plot(chartCard(a, { title: `Los candidatos de ${P.year}`, sub: "Punto: puesto esperado. Barra: mitad central de los casos parecidos.", span: 8, height: 640 }), {
      legend: false,
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (items) => { const t = top[items[0].dataIndex]; return `<b>${esc(t.uni.name)}</b><br>Puesto esperado ${t.rank} (${t.rank_best}–${t.rank_worst})<br>Vuelve a la final: ${t.returns}%`; },
      },
      grid: { left: 8, right: 22, top: 8, bottom: 26, containLabel: true },
      xAxis: valueAxis({ min: 1, name: "Puesto", nameLocation: "middle", nameGap: 20, nameTextStyle: { color: c.dim } }),
      yAxis: categoryAxis(top.map((t) => (t.uni.name.length > 30 ? `${t.uni.name.slice(0, 29)}…` : t.uni.name)), { inverse: true, axisLabel: { color: c.ink, interval: 0 } }),
      series: [
        { type: "bar", stack: "r", silent: true, itemStyle: { color: "transparent" }, data: top.map((t) => t.rank_best), barWidth: 8 },
        { type: "bar", stack: "r", itemStyle: { color: c.gold, opacity: 0.5, borderRadius: 4 }, data: top.map((t) => t.rank_worst - t.rank_best), barWidth: 8 },
        { type: "scatter", symbolSize: 12, itemStyle: { color: c.accent }, z: 5, data: top.map((t, i) => [t.rank, i]), encode: { x: 0, y: 1 } },
      ],
    }, { onClick: (p) => { const t = top[p.dataIndex ?? p.value?.[1]]; if (t) location.href = uniUrl(t.id); } });

    const side = document.createElement("div");
    side.className = "s4";
    side.style.cssText = "display:grid;gap:14px;align-content:start;min-width:0";
    a.append(side);
    const medalists = teams.slice(0, 12);
    const byRegion = new Map();
    for (const t of medalists) byRegion.set(t.region, (byRegion.get(t.region) ?? 0) + 1);
    donut(chartCard(side, { title: "Regiones del top 12 esperado", span: 12, height: 300 }), [...byRegion].sort((x, y) => y[1] - x[1]).map(([r, value]) => ({ name: data.regions[r] ?? r, value, itemStyle: { color: REGION_COLORS[r] } })), { center: "12" });
    plot(chartCard(side, { title: "¿Funciona? La prueba hacia atrás", sub: "Correlación del orden real con el proyectado usando solo el pasado", span: 12, height: 300 }), {
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(bt.per_year.map((y) => String(y.year)), { boundaryGap: false }),
      yAxis: valueAxis({ min: 0, max: 1 }),
      series: [
        { name: "Este modelo", type: "line", symbolSize: 7, lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent }, data: bt.per_year.map((y) => y.spearman) },
        { name: "Repetir su último puesto", type: "line", symbol: "none", lineStyle: { width: 2, type: "dashed", color: c.blue }, itemStyle: { color: c.blue }, data: bt.per_year.map((y) => y.spearman_baseline) },
      ],
    });

    plot(chartCard(a, { title: "Volver y brillar", sub: "Probabilidad de volver a la final frente al percentil esperado", span: 6, height: 380 }), {
      legend: false,
      tooltip: { formatter: (p) => `<b>${esc(p.data.name)}</b><br>Vuelve: ${p.value[0]}% · percentil esperado ${p.value[1]}` },
      grid: { left: 8, right: 16, top: 26, bottom: 30, containLabel: true },
      xAxis: valueAxis({ min: 0, max: 100, name: "% vuelve a la final", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: c.dim } }),
      yAxis: valueAxis({ min: 0, max: 100, name: "Percentil esperado", nameTextStyle: { color: c.dim } }),
      series: [{ type: "scatter", symbolSize: 11, data: teams.map((t) => ({ name: t.uni.name, id: t.id, value: [t.returns, t.pct], itemStyle: { color: REGION_COLORS[t.region] ?? c.gold, opacity: 0.75 } })) }],
    }, { onClick: (p) => { location.href = uniUrl(p.data.id); } });
    const countries = Object.entries(P.countries).map(([name, f]) => ({ name, ...f })).sort((x, y) => y.pct - x.pct).slice(0, 25);
    card(a, {
      title: "Por país", sub: "Puesto esperado de su mejor equipo", span: 6,
      html: table(
        ["País", { label: "Puesto", num: 1 }, { label: "Rango", num: 1 }, { label: "Vuelve", num: 1 }],
        countries.map((x) => [`<a href="${countryUrl(x.name)}">${esc(countryName(data, x.name))}</a>`, x.rank, `${x.rank_best}–${x.rank_worst}`, `${x.returns}%`]),
      ),
    });
    card(a, {
      title: `Todas las proyecciones (${teams.length})`, span: 12,
      html: table(
        [{ label: "#", num: 1 }, "Universidad", "País", { label: "Puesto", num: 1 }, { label: "Rango", num: 1 }, { label: "Vuelve", num: 1 }],
        teams.map((t, i) => [i + 1, `<a href="${uniUrl(t.id)}">${esc(t.uni.name)}</a>`, esc(countryName(data, t.uni.country)), t.rank, `${t.rank_best}–${t.rank_worst}`, `${t.returns}%`]),
      ),
    });
    card(a, {
      title: "Cómo leerlo", span: 12,
      html: `<p class="prose">Para cada universidad se toman sus últimos ${P.window} resultados y se buscan los ${P.cases} tramos históricos más parecidos de otras universidades. El puesto esperado es la mediana de lo que les pasó después, y el rango es su mitad central. No sabe quién clasificó de verdad a la próxima final ni quién compone cada equipo, así que incluye universidades que quizá no estén. En la prueba con finales desde ${bt.per_year[0].year}, el orden real se correlaciona ${bt.spearman.toFixed(2)} con el proyectado, frente a ${bt.spearman_baseline.toFixed(2)} si se repite el último puesto, y el error medio es de ${bt.mae} puntos de percentil frente a ${bt.mae_baseline}. Es una orientación, no una apuesta.</p>`,
    });
  },
});
