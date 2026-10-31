import { countryName, countryUrl, crest, esc, fold, medalCounts, params, personUrl, teamUrl, uniUrl } from "../core.js";
import { categoryAxis, colors, plot, valueAxis } from "../charts.js";
import { ficha, medalDonut, teamFacts } from "../profile.js";
import { card, chartCard, grid, kpis, startPage, table } from "../shell.js";

startPage({
  page: "equipo",
  render(view, data) {
    const url = params();
    const uni = data.byId.get(url.get("u"));
    const wanted = fold(url.get("t") ?? "");
    const rows = uni ? uni.results.filter((r) => fold(r.team) === wanted) : [];
    if (!rows.length) {
      view.innerHTML = `<div class="head"><h1>Equipo no encontrado</h1><p><a href="universidades.html">Ver las universidades</a></p></div>`;
      return;
    }
    const name = rows[rows.length - 1].team;
    document.title = `${name} · ${uni.name} · Observatorio ICPC`;
    const head = document.createElement("div");
    head.className = "profile";
    head.innerHTML = `${crest(uni.name, 58)}<div><h1>${esc(name)}</h1><p><a href="${uniUrl(uni.id)}">${esc(uni.name)}</a> · <a href="${countryUrl(uni.country)}">${esc(countryName(data, uni.country))}</a></p></div>`;
    view.append(head);
    const ranks = rows.map((r) => r.rank).filter((r) => r != null);
    const medals = medalCounts(rows);
    kpis(view, [
      [rows.length, rows.length === 1 ? "final" : "finales"],
      [ranks.length ? Math.round(Math.min(...ranks)) : "—", "mejor puesto"],
      [Math.max(...rows.map((r) => r.solved ?? 0)), "máx. resueltos"],
      [new Set(rows.flatMap((r) => r.player_ids)).size, "personas"],
      [medals.gold + medals.silver + medals.bronze, "medallas"],
    ]);
    const a = grid(view);
    card(a, { title: "Ficha", sub: "Mismo nombre y misma universidad cuentan como el mismo equipo.", span: 8, html: ficha(teamFacts(data, uni, rows)) });
    medalDonut(chartCard(a, { title: "Medallero", span: 4, height: 200 }), medals);
    const c = colors();
    plot(chartCard(a, { title: "Su trayectoria", sub: "Percentil en cada final (100 es el campeón)", span: 6, height: 300 }), {
      legend: false,
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(rows.map((r) => String(r.year))),
      yAxis: valueAxis({ min: 0, max: 100 }),
      series: [{ type: "line", symbolSize: 10, lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent }, data: rows.map((r) => r.pct) }],
    });
    card(a, {
      title: "Sus finales", span: 6,
      html: table(
        ["Año", { label: "Puesto", num: 1 }, { label: "Res.", num: 1 }, "Miembros"],
        [...rows].reverse().map((r) => [r.year, r.rank == null ? "—" : Math.round(r.rank), r.solved ?? "—", r.players.map((p, i) => `<a href="${personUrl(r.player_ids[i])}">${esc(p)}</a>`).join(", ")]),
      ),
    });
    const others = [...new Map(uni.results.filter((r) => fold(r.team) !== wanted).map((r) => [fold(r.team), r.team])).values()];
    if (others.length) {
      card(a, {
        title: "Otros equipos de la universidad", span: 12,
        html: `<div class="chips">${others.map((t) => `<a class="chip" href="${teamUrl(uni.id, t)}">${esc(t)}</a>`).join("")}</div>`,
      });
    }
  },
});
