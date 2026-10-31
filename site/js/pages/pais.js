import { REGION_COLORS, avg, compareUrl, countryName, countrySeries, countryUrl, crest, esc, fold, medalCounts, params, personUrl, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, historyChart, plot, valueAxis } from "../charts.js";
import { chipLinks, forecastCallout, medalDonut } from "../profile.js";
import { card, chartCard, grid, kpis, startPage, table } from "../shell.js";

startPage({
  page: "pais",
  render(view, data) {
    const name = params().get("c");
    const country = data.countriesIndex.get(name);
    if (!country) {
      view.innerHTML = `<div class="head"><h1>País no encontrado</h1><p><a href="paises.html">Ver todos los países</a></p></div>`;
      return;
    }
    document.title = `${country.es} · Observatorio ICPC`;
    const predict = data.predictions.countries[name];
    const years = data.years;
    const rows = [...country.rows].sort((a, b) => b.year - a.year || (a.rank ?? 1e9) - (b.rank ?? 1e9));
    const medals = medalCounts(rows);
    const best = Math.min(...rows.map((r) => r.rank ?? 1e9));
    const withVet = rows.filter((r) => r.veterans > 0).length;
    const head = document.createElement("div");
    head.className = "profile";
    head.innerHTML = `${crest(name, 58)}<div><h1>${esc(country.es)}</h1><p>${esc(data.regions[country.region] ?? "")} · <a href="${compareUrl("c", [name])}">Comparar con otro país</a></p></div>`;
    view.append(head);
    kpis(view, [
      [rows.length, "equipos en la final"],
      [country.unis.size, "universidades"],
      [new Set(rows.map((r) => r.year)).size, "ediciones"],
      [best === 1e9 ? "—" : Math.round(best), "mejor puesto"],
      [medals.gold + medals.silver + medals.bronze, "medallas"],
      [`${Math.round((100 * withVet) / rows.length)}%`, "equipos con veteranos"],
    ]);
    const c = colors();
    const a = grid(view);
    const similar = (predict?.similar ?? []).map((n) => ({ name: countryName(data, n), series: countrySeries(data.countriesIndex.get(n)), key: n }));
    const historyBody = card(a, {
      title: "Historial frente a sus parecidos", sub: "Mejor percentil de cada final (100 es el campeón), con los países de trayectoria más parecida", span: 8,
      html: `<div class="plot" id="hist" style="height:330px"></div>${chipLinks(similar.map((s) => ({ label: s.name, url: countryUrl(s.key) })))}${forecastCallout(predict, data.predictions.field_size, data.predictions.year)}`,
    });
    historyChart(historyBody.querySelector("#hist"), { name: country.es, series: countrySeries(country), similar, forecast: predict, nextYear: data.predictions.year, firstYear: years[0] });
    medalDonut(chartCard(a, { title: "Medallero", sub: "Puestos 1–4, 5–8 y 9–12", span: 4, height: 300 }), medals);

    plot(chartCard(a, { title: "Equipos por año", span: 4, height: 290 }), {
      legend: false, tooltip: { trigger: "axis" },
      xAxis: categoryAxis(years.map(String)), yAxis: valueAxis({ minInterval: 1 }),
      series: [{ type: "bar", data: years.map((y) => rows.filter((r) => r.year === y).length), itemStyle: { color: c.gold, borderRadius: [3, 3, 0, 0] } }],
    });
    const unis = [...country.unis].map((id) => data.byId.get(id)).sort((x, y) => y.results.length - x.results.length);
    donut(chartCard(a, { title: "Reparto entre universidades", span: 4, height: 290 }),
      unis.slice(0, 8).map((u) => ({ name: u.name, value: u.results.length })).concat(unis.length > 8 ? [{ name: "Otras", value: unis.slice(8).reduce((s, u) => s + u.results.length, 0) }] : []),
      { onClick: (p) => { const u = unis.find((x) => x.name === p.name); if (u) location.href = uniUrl(u.id); } });
    plot(chartCard(a, { title: "Renovación de sus equipos", sub: "% con algún miembro que ya compitió por su universidad", span: 4, height: 290 }), {
      legend: false, tooltip: { trigger: "axis", valueFormatter: (v) => `${v}%` },
      xAxis: categoryAxis(years.map(String), { boundaryGap: false }), yAxis: valueAxis({ min: 0, max: 100 }),
      series: [{
        type: "line", smooth: 0.25, connectNulls: true, areaStyle: { opacity: 0.18, color: c.accent }, lineStyle: { color: c.accent, width: 2.5 }, itemStyle: { color: c.accent },
        data: years.map((y) => { const t = rows.filter((r) => r.year === y); return t.length ? Math.round((100 * t.filter((r) => r.veterans > 0).length) / t.length) : null; }),
      }],
    });

    const sameRegion = [...data.countriesIndex.values()].filter((x) => x.region === country.region);
    const measure = (x) => ({
      teams: x.rows.length,
      unis: x.unis.size,
      solved: avg(x.rows.filter((r) => r.solved != null).map((r) => r.solved)),
      pct: avg(x.rows.filter((r) => r.pct != null).map((r) => r.pct)),
      vets: (100 * x.rows.filter((r) => r.veterans > 0).length) / x.rows.length,
    });
    const own = measure(country);
    const regional = sameRegion.map(measure);
    const regionMean = Object.fromEntries(Object.keys(own).map((k) => [k, avg(regional.map((m) => m[k]))]));
    const max = Object.fromEntries(Object.keys(own).map((k) => [k, Math.max(...regional.map((m) => m[k]), 1)]));
    plot(chartCard(a, { title: "Frente a su región", sub: "Cada eje se escala al máximo de la región", span: 5, height: 340 }), {
      tooltip: {},
      radar: {
        indicator: [["teams", "Equipos"], ["unis", "Universidades"], ["solved", "Resueltos"], ["pct", "Percentil"], ["vets", "Veteranos"]].map(([k, label]) => ({ name: label, max: max[k] })),
        axisName: { color: c.dim }, splitLine: { lineStyle: { color: c.line } }, splitArea: { show: false }, axisLine: { lineStyle: { color: c.line } }, radius: "66%",
      },
      series: [{
        type: "radar",
        data: [
          { name: country.es, value: Object.keys(own).map((k) => +own[k].toFixed(1)), lineStyle: { color: c.accent, width: 2.5 }, itemStyle: { color: c.accent }, areaStyle: { color: c.accent, opacity: 0.2 } },
          { name: "Media de la región", value: Object.keys(own).map((k) => +regionMean[k].toFixed(1)), lineStyle: { color: REGION_COLORS[country.region] ?? c.blue, width: 2 }, itemStyle: { color: REGION_COLORS[country.region] ?? c.blue } },
        ],
      }],
    });
    card(a, {
      title: `Todos sus equipos (${rows.length})`, span: 7,
      html: table(
        ["Año", { label: "Puesto", num: 1 }, { label: "Res.", num: 1 }, { label: "Vet.", num: 1, title: "Miembros que ya compitieron por esta universidad" }, "Universidad y equipo"],
        rows.map((r) => [r.year, r.rank == null ? "—" : Math.round(r.rank), r.solved ?? "—", r.veterans || "", `<a href="${uniUrl(r.uni)}">${esc(r.uniName)}</a><br><small>${esc(r.team)}: ${r.players.map((p) => `<a href="${personUrl(fold(p))}">${esc(p)}</a>`).join(", ")}</small>`]),
      ),
    });
  },
});
