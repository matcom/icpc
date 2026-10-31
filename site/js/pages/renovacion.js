import { REGION_COLORS, avg, countryName, countryUrl, esc, fold, personUrl, quantile, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, rankBars, valueAxis } from "../charts.js";
import { card, chartCard, filterRows, filters, grid, sequenceSvg, startPage, universityPicker } from "../shell.js";

const METRICS = {
  pteams: { label: "% equipos", title: "% de equipos con veteranos", value: (e) => (100 * e.repeatedTeams) / e.teams, format: (v) => `${Math.round(v)}%` },
  teams: { label: "Equipos", title: "Equipos con veteranos", value: (e) => e.repeatedTeams, format: (v) => v },
  pplayers: { label: "% apariciones", title: "% de apariciones de veteranos", value: (e) => (e.appearances ? (100 * e.repeatedPlayers) / e.appearances : 0), format: (v) => `${Math.round(v)}%` },
  players: { label: "Apariciones", title: "Apariciones de veteranos", value: (e) => e.repeatedPlayers, format: (v) => v },
};
const VET_LABELS = ["Todos debutan", "1 veterano", "2 veteranos", "Los 3 son veteranos"];

startPage({
  page: "renovacion",
  title: "Renovación",
  subtitle: "Cuánto se renuevan los equipos, quién repite y si repetir ayuda.",
  render(view, data) {
    const holder = document.createElement("div");
    const defaults = { from: 2010, to: data.years[data.years.length - 1], region: "all", min: 1, top: 20, scope: "uni", metric: "pteams", a: "universidad-de-la-habana", b: "universidad-de-oriente-sede-antonio-maceo" };
    const state = filters(view, data, defaults, () => draw());
    if (!data.byId.has(state.a)) state.a = data.unis[0].id;
    if (!data.byId.has(state.b)) state.b = data.unis[1].id;
    view.append(holder);
    const draw = () => {
      holder.innerHTML = "";
      const rows = filterRows(data, state);
      const entities = new Map();
      const perYear = new Map();
      const pctByVets = [[], [], [], []];
      for (const r of rows) {
        const key = state.scope === "uni" ? r.uni : r.country;
        const e = entities.get(key) ?? { key, teams: 0, repeatedTeams: 0, repeatedPlayers: 0, appearances: 0, seen: new Set(), years: new Set(), pct: [] };
        entities.set(key, e);
        const names = r.players.map(fold);
        const veterans = names.filter((n) => e.seen.has(n)).length;
        e.teams += 1; e.appearances += names.length; e.repeatedPlayers += veterans;
        if (veterans) e.repeatedTeams += 1;
        e.years.add(r.year);
        if (r.pct != null) e.pct.push(r.pct);
        names.forEach((n) => e.seen.add(n));
        const y = perYear.get(r.year) ?? [0, 0, 0, 0];
        y[Math.min(veterans, 3)] += 1;
        perYear.set(r.year, y);
        if (r.pct != null) pctByVets[Math.min(veterans, 3)].push(r.pct);
      }
      const label = (key) => (state.scope === "uni" ? data.byId.get(key).name : countryName(data, key));
      const link = (key) => (state.scope === "uni" ? uniUrl(key) : countryUrl(key));
      const metric = METRICS[state.metric];
      const items = [...entities.values()].filter((e) => e.years.size >= state.min && e.repeatedTeams > 0)
        .map((e) => ({ label: label(e.key), value: metric.value(e), url: link(e.key) }))
        .sort((x, y) => y.value - x.value).slice(0, state.top);
      const c = colors();
      const a = grid(holder);

      const metricBody = card(a, {
        title: metric.title, span: 5,
        sub: `Un veterano ya compitió por la misma ${state.scope === "uni" ? "universidad" : "delegación"} en una edición anterior del periodo.`,
        html: `<span class="seg" role="group" aria-label="Métrica">${Object.entries(METRICS).map(([k, m]) => `<button data-metric="${k}" aria-pressed="${k === state.metric}">${m.label}</button>`).join("")}</span><div class="plot" id="metric" style="height:${Math.max(320, state.top * 24 + 20)}px;margin-top:8px"></div>`,
      });
      rankBars(metricBody.querySelector("#metric"), items, { format: metric.format });
      metricBody.querySelectorAll("[data-metric]").forEach((b) => { b.onclick = () => { state.metric = b.dataset.metric; draw(); }; });

      const years = [...perYear.keys()].sort((x, y) => x - y).slice(1);
      const shares = (i) => years.map((y) => { const v = perYear.get(y); const t = v[0] + v[1] + v[2] + v[3]; return Math.round((100 * v[i]) / t); });
      const right = document.createElement("div");
      right.className = "s7";
      right.style.cssText = "display:grid;gap:14px;align-content:start;min-width:0";
      a.append(right);
      plot(chartCard(right, { title: "De qué están hechos los equipos", sub: "Reparto por número de veteranos, en cada edición", span: 12, height: 300 }), {
        tooltip: { trigger: "axis", valueFormatter: (v) => `${v}%` },
        xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
        yAxis: valueAxis({ max: 100 }),
        series: VET_LABELS.map((name, i) => ({
          name, type: "line", stack: "s", symbol: "none", smooth: 0.2, areaStyle: { opacity: 0.85 }, lineStyle: { width: 0.5 },
          itemStyle: { color: [c.panel2 === "#efe2c3" ? "#dfcfa3" : "#6a3039", c.blue, c.accent, c.red][i] },
          data: shares(i),
        })),
      });
      const box = pctByVets.map((v) => (v.length ? [Math.min(...v), quantile(v, 0.25), quantile(v, 0.5), quantile(v, 0.75), Math.max(...v)] : [0, 0, 0, 0, 0]));
      plot(chartCard(right, { title: "¿Ayuda repetir?", sub: "Percentil de los equipos según cuántos veteranos traen. Es una asociación, no prueba causa.", span: 12, height: 300 }), {
        legend: false,
        tooltip: { trigger: "item", formatter: (p) => `<b>${p.name}</b> (${pctByVets[p.dataIndex].length} equipos)<br>Mediana: ${Math.round(p.value[3])}<br>Mitad central: ${Math.round(p.value[2])}–${Math.round(p.value[4])}` },
        xAxis: categoryAxis(VET_LABELS, { axisLabel: { color: c.ink, interval: 0 } }),
        yAxis: valueAxis({ min: 0, max: 100, name: "Percentil", nameTextStyle: { color: c.dim } }),
        series: [{ type: "boxplot", data: box, itemStyle: { color: c.panel2, borderColor: c.accent, borderWidth: 2 } }],
      });

      const people = new Map();
      for (const r of rows) for (const n of r.players) {
        const k = fold(n);
        const p = people.get(k) ?? { name: n, years: new Set(), last: r };
        p.years.add(r.year); p.last = r;
        people.set(k, p);
      }
      const careers = new Map();
      for (const p of people.values()) careers.set(Math.min(p.years.size, 5), (careers.get(Math.min(p.years.size, 5)) ?? 0) + 1);
      donut(chartCard(a, { title: "¿Cuántas finales juega una persona?", sub: "Competidores del periodo", span: 4, height: 320 }),
        [...careers].sort((x, y) => x[0] - y[0]).map(([k, value], i) => ({ name: k === 5 ? "5 o más" : `${k} ${k === 1 ? "final" : "finales"}`, value, itemStyle: { color: [c.gold, c.accent, c.blue, c.red, "#4f9a8c"][i] } })));

      const scatter = [...entities.values()].filter((e) => e.teams >= Math.max(3, state.min) && e.pct.length).map((e) => {
        const region = state.scope === "uni" ? data.countries[data.byId.get(e.key).country]?.region : data.countries[e.key]?.region;
        return { name: label(e.key), key: e.key, value: [Math.round((100 * e.repeatedTeams) / e.teams), Math.round(avg(e.pct)), e.teams], itemStyle: { color: REGION_COLORS[region] ?? c.gold, opacity: 0.75 } };
      });
      plot(chartCard(a, { title: "Renovación frente a resultado", sub: "Con al menos 3 participaciones. El tamaño es su cantidad.", span: 8, height: 320 }), {
        legend: false,
        tooltip: { formatter: (p) => `<b>${esc(p.name)}</b><br>${p.value[0]}% con veteranos · percentil medio ${p.value[1]} · ${p.value[2]} participaciones` },
        grid: { left: 8, right: 16, top: 26, bottom: 30, containLabel: true },
        xAxis: valueAxis({ min: 0, max: 100, name: "% de equipos con veteranos", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: c.dim } }),
        yAxis: valueAxis({ min: 0, max: 100, name: "Percentil medio", nameTextStyle: { color: c.dim } }),
        series: [{ type: "scatter", data: scatter, symbolSize: (v) => 6 + Math.sqrt(v[2]) * 3.2 }],
      }, { onClick: (p) => { location.href = link(p.data.key); } });

      const seqBody = card(a, {
        title: "Secuencia de participaciones", sub: "Cada arco une dos ediciones que comparten miembros; el número dice cuántos.", span: 12,
        html: `<div class="filters" style="border:0;padding:0;background:none">${universityPicker(data, state.a, "Comparar")}${universityPicker(data, state.b, "con")}</div><div class="dash" style="margin:0"><div class="s6"><h3 style="font-size:14.5px"><a href="${uniUrl(state.a)}">${esc(data.byId.get(state.a).name)}</a></h3>${sequenceSvg(data, data.byId.get(state.a))}</div><div class="s6"><h3 style="font-size:14.5px"><a href="${uniUrl(state.b)}">${esc(data.byId.get(state.b).name)}</a></h3>${sequenceSvg(data, data.byId.get(state.b))}</div></div>`,
      });
      const pickers = seqBody.querySelectorAll("[data-pick]");
      pickers[0].onchange = (e) => { state.a = e.target.value; draw(); };
      pickers[1].onchange = (e) => { state.b = e.target.value; draw(); };

      const veterans = [...people.entries()].sort((x, y) => y[1].years.size - x[1].years.size).slice(0, 15);
      card(a, {
        title: "Los más repetidores", sub: "Más finales con la misma ortografía de su nombre", span: 12,
        html: `<div class="chips">${veterans.map(([k, p]) => `<a class="chip" href="${personUrl(k)}">${esc(p.name)} · ${p.years.size}</a>`).join("")}</div><p class="note">Los nombres se comparan sin distinguir mayúsculas ni acentos, así que una variante de escritura cuenta como persona nueva. Al inicio de un periodo nadie tiene pasado, por eso el primer año se omite en la evolución.</p>`,
      });
    };
    draw();
  },
});
