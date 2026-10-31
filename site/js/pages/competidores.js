import { MEDAL_COLORS, MEDAL_NAMES, countryName, countryUrl, crest, esc, medalCounts, params, personUrl, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, rankBars, valueAxis } from "../charts.js";
import { card, chartCard, grid, kpis, startPage, table } from "../shell.js";

function profile(view, data, person) {
  document.title = `${person.name} · Observatorio ICPC`;
  const rows = [...person.rows].sort((a, b) => a.year - b.year);
  const medals = medalCounts(rows);
  const unis = [...new Set(rows.map((r) => r.uni))];
  const head = document.createElement("div");
  head.className = "profile";
  head.innerHTML = `${crest(person.name, 58)}<div><h1>${esc(person.name)}</h1><p>${unis.map((id) => `<a href="${uniUrl(id)}">${esc(data.byId.get(id).name)}</a>`).join(" · ")} · <a href="competidores.html">Todos los competidores</a></p></div>`;
  view.append(head);
  const ranks = rows.map((r) => r.rank).filter((r) => r != null);
  kpis(view, [
    [rows.length, "finales"],
    [ranks.length ? Math.round(Math.min(...ranks)) : "—", "mejor puesto"],
    [Math.max(...rows.map((r) => r.solved ?? 0)), "máx. resueltos"],
    [medals.gold + medals.silver + medals.bronze, "medallas"],
  ]);
  const a = grid(view);
  const c = colors();
  plot(chartCard(a, { title: "Su trayectoria", sub: "Percentil en cada final", span: 6, height: 300 }), {
    legend: false, tooltip: { trigger: "axis" },
    xAxis: categoryAxis(rows.map((r) => String(r.year))), yAxis: valueAxis({ min: 0, max: 100 }),
    series: [{ type: "line", symbolSize: 10, lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent }, data: rows.map((r) => r.pct) }],
  });
  card(a, {
    title: "Sus equipos", span: 6,
    html: table(
      ["Año", "Universidad", "Equipo", { label: "Puesto", num: 1 }, { label: "Res.", num: 1 }, "Compañeros"],
      [...rows].reverse().map((r) => [r.year, `<a href="${uniUrl(r.uni)}">${esc(r.uniName)}</a>`, esc(r.team), r.rank == null ? "—" : Math.round(r.rank), r.solved ?? "—", r.players.filter((_, i) => r.player_ids[i] !== person.key).map(esc).join(", ")]),
    ),
  });
}

startPage({
  page: "competidores",
    render(view, data) {
    const key = params().get("p");
    if (key) {
      const person = data.people.get(key);
      if (person) { profile(view, data, person); return; }
    }
    const head = document.createElement("div");
    head.className = "head";
    head.innerHTML = "<h1>Competidores</h1><p>Quiénes han pisado más finales. Usa el buscador para encontrar a cualquiera.</p>";
    view.append(head);
    const people = [...data.people.values()];
    const c = colors();
    const score = (p) => { const m = medalCounts(p.rows); return m.gold * 1e4 + m.silver * 100 + m.bronze; };
    const uniqueYears = (p) => new Set(p.rows.map((r) => r.year)).size;
    kpis(view, [
      [people.length.toLocaleString("es"), "personas"],
      [`${Math.round((100 * people.filter((p) => uniqueYears(p) === 1).length) / people.length)}%`, "van a una sola final"],
      [Math.max(...people.map(uniqueYears)), "finales como máximo"],
      [people.filter((p) => medalCounts(p.rows).gold > 0).length, "con oro"],
    ]);
    const a = grid(view);
    const byFinals = [...people].sort((x, y) => uniqueYears(y) - uniqueYears(x) || score(y) - score(x)).slice(0, 20);
    rankBars(chartCard(a, { title: "Más finales", span: 4, height: 520 }), byFinals.map((p) => ({ label: p.name, value: uniqueYears(p), url: personUrl(p.key) })));
    const medalists = [...people].filter((p) => score(p) > 0).sort((x, y) => score(y) - score(x)).slice(0, 20);
    plot(chartCard(a, { title: "Más medallas", span: 5, height: 520 }), {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 8, right: 16, top: 8, bottom: 34, containLabel: true },
      xAxis: valueAxis({ minInterval: 1 }),
      yAxis: categoryAxis(medalists.map((p) => p.name).reverse(), { axisLabel: { color: c.ink, interval: 0 } }),
      series: ["gold", "silver", "bronze"].map((m) => ({ name: MEDAL_NAMES[m], type: "bar", stack: "x", barMaxWidth: 16, itemStyle: { color: MEDAL_COLORS[m] }, data: medalists.map((p) => medalCounts(p.rows)[m]).reverse() })),
    }, { onClick: (p) => { location.href = personUrl(medalists[medalists.length - 1 - p.dataIndex].key); } });
    const histogram = new Map();
    people.forEach((p) => histogram.set(uniqueYears(p), (histogram.get(uniqueYears(p)) ?? 0) + 1));
    donut(chartCard(a, { title: "Finales por persona", span: 3, height: 520 }), [...histogram].sort((x, y) => x[0] - y[0]).map(([k, value]) => ({ name: `${k}`, value })));
    const byCountry = new Map();
    for (const p of people) { const last = p.rows[p.rows.length - 1].country; byCountry.set(last, (byCountry.get(last) ?? 0) + 1); }
    const topCountries = [...byCountry].sort((x, y) => y[1] - x[1]).slice(0, 12);
    card(a, {
      title: "Dónde compiten más personas", span: 12,
      html: `<div class="chips">${topCountries.map(([n, v]) => `<a class="chip" href="${countryUrl(n)}">${esc(countryName(data, n))} · ${v}</a>`).join("")}</div>`,
    });
  },
});
