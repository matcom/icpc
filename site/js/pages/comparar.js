import { avg, compareUrl, countrySeries, countryUrl, crest, esc, medalCounts, params, uniSeries, uniUrl } from "../core.js";
import { categoryAxis, colors, palette, plot, valueAxis } from "../charts.js";
import { card, chartCard, grid, startPage, table } from "../shell.js";

const MAX = 4;

startPage({
  page: "comparar",
  title: "Comparar",
  subtitle: "Pon frente a frente hasta cuatro universidades o países.",
  render(view, data, redraw) {
    const url = params();
    const kind = url.has("c") ? "c" : "u";
    const defaults = kind === "u" ? ["universidad-de-la-habana", "universidad-de-oriente-sede-antonio-maceo"] : ["Cuba", "Mexico"];
    const raw = (url.get(kind) ?? defaults.join(",")).split(",").map(decodeURIComponent).filter(Boolean);
    const known = kind === "u" ? (k) => data.byId.has(k) : (k) => data.countriesIndex.has(k);
    const keys = [...new Set(raw)].filter(known).slice(0, MAX);
    const entity = (key) => {
      if (kind === "u") {
        const u = data.byId.get(key);
        return { key, name: u.name, url: uniUrl(key), rows: u.results, series: uniSeries(u) };
      }
      const x = data.countriesIndex.get(key);
      return { key, name: x.es, url: countryUrl(key), rows: x.rows, series: countrySeries(x) };
    };
    const items = keys.map(entity);
    const go = (nextKind, nextKeys) => { history.replaceState(null, "", compareUrl(nextKind, nextKeys)); redraw(); };

    const options = kind === "u"
      ? [...data.unis].sort((a, b) => a.name.localeCompare(b.name, "es")).map((u) => [u.id, u.name])
      : [...data.countriesIndex.values()].sort((a, b) => a.es.localeCompare(b.es, "es")).map((x) => [x.name, x.es]);
    const bar = document.createElement("div");
    bar.className = "filters";
    bar.innerHTML = `<span class="seg" role="group" aria-label="Qué comparar"><button data-k="u" aria-pressed="${kind === "u"}">Universidades</button><button data-k="c" aria-pressed="${kind === "c"}">Países</button></span>
      <label>Añadir <select id="add"${keys.length >= MAX ? " disabled" : ""}><option value="">Elige…</option>${options.filter(([v]) => !keys.includes(v)).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></label>
      ${items.map((i) => `<span class="chip">${crest(i.name, 18)}${esc(i.name)}<button data-x="${esc(i.key)}" aria-label="Quitar ${esc(i.name)}">✕</button></span>`).join("")}`;
    view.append(bar);
    bar.querySelectorAll("[data-k]").forEach((b) => { b.onclick = () => { if (b.dataset.k !== kind) { const d = b.dataset.k === "u" ? ["universidad-de-la-habana", "universidad-de-oriente-sede-antonio-maceo"] : ["Cuba", "Mexico"]; go(b.dataset.k, d); } }; });
    bar.querySelector("#add").onchange = (e) => { if (e.target.value) go(kind, [...keys, e.target.value]); };
    bar.querySelectorAll("[data-x]").forEach((b) => { b.onclick = () => go(kind, keys.filter((k) => k !== b.dataset.x)); });
    if (!items.length) {
      card(view, { span: 12, html: '<p class="sub">Elige al menos uno para empezar.</p>' });
      return;
    }

    const c = colors();
    const tint = palette();
    const years = data.years;
    const a = grid(view);
    plot(chartCard(a, { title: "Percentil por edición", sub: kind === "u" ? "100 es el campeón" : "De su mejor equipo; 100 es el campeón", span: 8, height: 360 }), {
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
      yAxis: valueAxis({ min: 0, max: 100 }),
      series: items.map((item, i) => ({
        name: item.name, type: "line", connectNulls: true, symbolSize: 8, lineStyle: { width: 3, color: tint[i] }, itemStyle: { color: tint[i] },
        data: years.map((y) => item.series.find((p) => p[0] === y)?.[1] ?? null),
      })),
    });
    const stats = items.map((item) => {
      const rows = item.rows;
      const pct = rows.filter((r) => r.pct != null).map((r) => r.pct);
      const medals = medalCounts(rows);
      return {
        item,
        finals: new Set(rows.map((r) => r.year)).size,
        teams: rows.length,
        avg: avg(pct),
        solved: avg(rows.filter((r) => r.solved != null).map((r) => r.solved)),
        vets: (100 * rows.filter((r) => r.veterans > 0).length) / rows.length,
        medals: medals.gold + medals.silver + medals.bronze,
        best: Math.min(...rows.map((r) => r.rank ?? 1e9)),
        medalDetail: medals,
      };
    });
    const axes = [["finals", "Finales"], ["avg", "Percentil"], ["solved", "Resueltos"], ["vets", "Veteranos"], ["medals", "Medallas"]];
    plot(chartCard(a, { title: "Perfil", sub: "Cada eje se escala al máximo entre los elegidos", span: 4, height: 360 }), {
      tooltip: {},
      radar: {
        indicator: axes.map(([k, name]) => ({ name, max: Math.max(...stats.map((s) => s[k]), 1) })),
        axisName: { color: c.dim }, splitLine: { lineStyle: { color: c.line } }, splitArea: { show: false }, axisLine: { lineStyle: { color: c.line } }, radius: "62%",
      },
      series: [{
        type: "radar",
        data: stats.map((s, i) => ({ name: s.item.name, value: axes.map(([k]) => +s[k].toFixed(1)), lineStyle: { color: tint[i], width: 2.5 }, itemStyle: { color: tint[i] }, areaStyle: { color: tint[i], opacity: 0.13 } })),
      }],
    });
    plot(chartCard(a, { title: "Problemas resueltos", sub: kind === "u" ? "En cada edición" : "Media de sus equipos en cada edición", span: 6, height: 320 }), {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: categoryAxis(years.map(String)),
      yAxis: valueAxis({ minInterval: 1 }),
      series: items.map((item, i) => ({
        name: item.name, type: "bar", barMaxWidth: 12, itemStyle: { color: tint[i], borderRadius: [3, 3, 0, 0] },
        data: years.map((y) => { const v = item.rows.filter((r) => r.year === y && r.solved != null).map((r) => r.solved); return v.length ? +avg(v).toFixed(1) : null; }),
      })),
    });
    plot(chartCard(a, { title: "Renovación", sub: "% de equipos con algún veterano, acumulando por edición", span: 6, height: 320 }), {
      tooltip: { trigger: "axis", valueFormatter: (v) => `${v}%` },
      xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
      yAxis: valueAxis({ min: 0, max: 100 }),
      series: items.map((item, i) => ({
        name: item.name, type: "line", symbol: "none", smooth: 0.3, connectNulls: true, lineStyle: { width: 3, color: tint[i] }, itemStyle: { color: tint[i] },
        data: years.map((y) => { const t = item.rows.filter((r) => r.year <= y); return t.length ? Math.round((100 * t.filter((r) => r.veterans > 0).length) / t.length) : null; }),
      })),
    });
    card(a, {
      title: "Frente a frente", span: 12,
      html: table(
        [kind === "u" ? "Universidad" : "País", { label: "Finales", num: 1 }, { label: "Equipos", num: 1 }, { label: "Mejor", num: 1 }, { label: "Perc. medio", num: 1 }, { label: "Resueltos/final", num: 1 }, { label: "% veteranos", num: 1 }, { label: "Oro", num: 1 }, { label: "Plata", num: 1 }, { label: "Bronce", num: 1 }],
        stats.map((s) => [`<a href="${s.item.url}">${esc(s.item.name)}</a>`, s.finals, s.teams, s.best === 1e9 ? "—" : Math.round(s.best), Math.round(s.avg), s.solved.toFixed(1), Math.round(s.vets), s.medalDetail.gold, s.medalDetail.silver, s.medalDetail.bronze]),
      ),
    });
  },
});
