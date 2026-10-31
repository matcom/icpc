import { avg, compareUrl, countryName, countryUrl, crest, esc, medalCounts, params, personUrl, uniSeries, uniUrl } from "../core.js";
import { categoryAxis, colors, historyChart, plot, valueAxis } from "../charts.js";
import { chipLinks, ficha, forecastCallout, medalDonut, teamLink, universityFacts } from "../profile.js";
import { card, chartCard, grid, kpis, sequenceSvg, startPage, table } from "../shell.js";

startPage({
  page: "universidad",
  render(view, data) {
    const uni = data.byId.get(params().get("u"));
    if (!uni) {
      view.innerHTML = `<div class="head"><h1>Universidad no encontrada</h1><p><a href="universidades.html">Ver todas las universidades</a></p></div>`;
      return;
    }
    document.title = `${uni.name} · Observatorio ICPC`;
    const results = uni.results;
    const ranks = results.map((r) => r.rank).filter((r) => r != null);
    const last = results[results.length - 1];
    const medals = medalCounts(results);
    const forecast = data.forecasts.get(uni.id);
    const head = document.createElement("div");
    head.className = "profile";
    head.innerHTML = `${crest(uni.name, 58)}<div><h1>${esc(uni.name)}</h1><p><a href="${countryUrl(uni.country)}">${esc(countryName(data, uni.country))}</a> · <a href="${compareUrl("u", [uni.id])}">Comparar con otra universidad</a></p></div>`;
    view.append(head);
    kpis(view, [
      [results.length, "finales"],
      [ranks.length ? Math.round(Math.min(...ranks)) : "—", "mejor puesto"],
      [last.rank == null ? "—" : Math.round(last.rank), `último puesto (${last.year})`],
      [Math.max(...results.map((r) => r.solved ?? 0)), "máx. resueltos"],
      [medals.gold + medals.silver + medals.bronze, "medallas"],
      [`${Math.round((100 * results.filter((r) => r.veterans > 0).length) / results.length)}%`, "equipos con veteranos"],
    ]);
    const c = colors();
    const a = grid(view);
    card(a, { title: "Ficha", span: 12, html: ficha(universityFacts(data, uni)) });
    const similarIds = data.predictions.similar[uni.id] ?? [];
    const similar = similarIds.map((id) => ({ name: data.byId.get(id).name, series: uniSeries(data.byId.get(id)), id }));
    const body = card(a, {
      title: "Historial frente a sus parecidos", sub: "Percentil en cada final (100 es el campeón), con las trayectorias más parecidas", span: 8,
      html: `<div class="plot" id="hist" style="height:330px"></div>${chipLinks(similar.map((s) => ({ label: s.name, url: uniUrl(s.id) })))}${forecastCallout(forecast, data.predictions.field_size, data.predictions.year)}`,
    });
    historyChart(body.querySelector("#hist"), { name: uni.name, series: uniSeries(uni), similar, forecast, nextYear: data.predictions.year, firstYear: data.years[0] });

    const gaugeValue = Math.round(avg(results.filter((r) => r.pct != null).map((r) => r.pct)));
    plot(chartCard(a, { title: "Percentil medio", sub: "Promedio de todas sus finales", span: 4, height: 240 }), {
      legend: false,
      series: [{
        type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100, radius: "96%", center: ["50%", "62%"],
        progress: { show: true, width: 16, itemStyle: { color: c.accent } },
        axisLine: { lineStyle: { width: 16, color: [[1, c.panel2]] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { color: c.dim, distance: 20, fontSize: 11 },
        pointer: { show: false }, anchor: { show: false }, title: { show: false },
        detail: { valueAnimation: true, offsetCenter: [0, "-6%"], fontFamily: "Cinzel", fontWeight: 600, fontSize: 34, color: c.ink },
        data: [{ value: gaugeValue }],
      }],
    });

    const years = data.years;
    const by = new Map(results.map((r) => [r.year, r]));
    plot(chartCard(a, { title: "Problemas y puesto por edición", span: 7, height: 310 }), {
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(years.map(String)),
      yAxis: [valueAxis({ minInterval: 1, name: "Resueltos", nameTextStyle: { color: c.dim } }), valueAxis({ inverse: true, min: 1, splitLine: { show: false }, name: "Puesto", nameTextStyle: { color: c.dim } })],
      series: [
        { name: "Problemas resueltos", type: "bar", data: years.map((y) => by.get(y)?.solved ?? null), itemStyle: { color: c.gold, borderRadius: [3, 3, 0, 0] } },
        { name: "Puesto", type: "line", yAxisIndex: 1, connectNulls: true, data: years.map((y) => (by.get(y)?.rank == null ? null : Math.round(by.get(y).rank))), lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent }, symbolSize: 8 },
      ],
    });
    medalDonut(chartCard(a, { title: "Medallero", span: 5, height: 310 }), medals);

    card(a, {
      title: "Secuencia de participaciones", sub: "Cada arco une dos finales que comparten miembros; el número dice cuántos.", span: 12,
      html: sequenceSvg(data, uni),
    });
    card(a, {
      title: `Sus finales (${results.length})`, span: 12,
      html: table(
        ["Año", { label: "Puesto", num: 1 }, { label: "Res.", num: 1 }, { label: "Tiempo", num: 1 }, { label: "Vet.", num: 1, title: "Miembros que ya compitieron por esta universidad" }, "Equipo", "Miembros"],
        [...results].reverse().map((r) => [r.year, r.rank == null ? "—" : Math.round(r.rank), r.solved ?? "—", r.time ?? "—", r.veterans || "", teamLink(uni.id, r.team), r.players.map((p, i) => `<a href="${personUrl(r.player_ids[i])}">${esc(p)}</a>`).join(", ")]),
      ),
    });
  },
});
