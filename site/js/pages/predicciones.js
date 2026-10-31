import { countryName, countryUrl, crest, esc, uniUrl } from "../core.js";
import { categoryAxis, colors, plot, valueAxis } from "../charts.js";
import { card, chartCard, grid, kpis, startPage, table } from "../shell.js";

const KINDS = { listed: "lista", confirmed: "confirmado", presumed: "supuesto" };

const percent = (p) => {
  const value = p * 100;
  if (value === 0) return "0\u00a0%";
  if (value < 0.1) return "<0,1\u00a0%";
  return `${value < 10 ? value.toFixed(1).replace(".", ",") : Math.round(value)}\u00a0%`;
};

const teamLink = (t) => (t.id ? `<a href="${uniUrl(t.id)}">${esc(t.name)}</a>` : esc(t.name));

startPage({
  page: "predicciones",
  title: "Predicciones",
  subtitle: "Probabilidad de cada puesto en la próxima final, equipo por equipo.",
  render(view, data) {
    const { predictions: P } = data;
    const bt = P.backtest;
    const c = colors();
    const at = (place) => P.places.indexOf(place);
    const medals = (q) => ({ champion: q[at(1)], gold: q[at(4)], silver: q[at(8)] - q[at(4)], bronze: q[at(12)] - q[at(8)], any: q[at(12)] });
    const listed = P.teams.filter((t) => t.kind === "listed").length;
    kpis(view, [
      [P.year, `${esc(data.next_final.place)}, ${data.next_final.dates}`],
      [P.teams[0].name, `favorito (${percent(P.teams[0].chances[0])})`, P.teams[0].id ? uniUrl(P.teams[0].id) : undefined],
      [percent(bt.with_rosters.champion), `dio al campeón real, de media (solo finales ${percent(bt.finals_only.champion)})`],
      [`${listed} de ${P.field_size}`, "equipos conocidos; el resto es supuesto"],
    ]);
    const a = grid(view);
    card(a, {
      title: "El podio esperado", span: 12,
      sub: "Oro son los puestos 1 a 4, plata del 5 al 8 y bronce del 9 al 12.",
      html: table(
        ["Universidad", "Equipo", { label: "Campeón", num: 1 }, { label: "Oro", num: 1 }, { label: "Plata", num: 1 }, { label: "Bronce", num: 1 }, { label: "Medalla", num: 1 }, { label: "Rating", num: 1 }, "Dato"],
        P.teams.slice(0, 20).map((t) => {
          const m = medals(t.chances);
          return [`${crest(t.name, 18)} ${teamLink(t)}`, esc(t.team ?? "—"), percent(m.champion), percent(m.gold), percent(m.silver), percent(m.bronze), percent(m.any), t.rating ?? "—", KINDS[t.kind]];
        }),
      ),
    });

    const nameOf = (name) => countryName(data, name);
    const countryOptions = Object.entries(P.countries).filter(([, v]) => v.chances).map(([name]) => ({ value: `c:${name}`, label: nameOf(name) })).sort((x, y) => x.label.localeCompare(y.label, "es"));
    const teamOptions = P.teams.map((t, i) => ({ value: `t:${i}`, label: t.name })).sort((x, y) => x.label.localeCompare(y.label, "es"));
    const asked = new URLSearchParams(location.search).get("q");
    const start = [...countryOptions, ...teamOptions].some((o) => o.value === asked) ? asked : "c:Cuba";
    const pick = card(a, {
      title: "Busca tu país o universidad", span: 12, id: "buscar",
      sub: "Para un país, la cifra es la de su mejor equipo.",
      html: `<div class="filters" style="border:0;padding:0;margin:0 0 10px;background:none"><label>Buscar <select id="pick-entity" aria-label="País o universidad">${[...countryOptions, ...teamOptions].map((o) => `<option value="${esc(o.value)}"${o.value === start ? " selected" : ""}>${esc(o.label)}</option>`).join("")}</select></label></div><div id="entity"></div><label class="place-slider"><span id="place-label"></span><input type="range" id="place" min="0" max="${P.places.length - 1}" value="${at(50)}"></label>`,
    });
    const showPlace = (entity) => {
      const index = Number(pick.querySelector("#place").value);
      pick.querySelector("#place-label").innerHTML = `Quedar entre los <b>${P.places[index]}</b> primeros: <b>${percent(entity.chances[index])}</b>`;
    };
    const drawEntity = () => {
      const value = pick.querySelector("#pick-entity").value;
      const isCountry = value.startsWith("c:");
      const entity = isCountry ? P.countries[value.slice(2)] : P.teams[Number(value.slice(2))];
      const m = medals(entity.chances);
      const about = isCountry
        ? `<a href="${countryUrl(value.slice(2))}">${esc(nameOf(value.slice(2)))}</a>: ${entity.expected_teams === 1 ? "1 equipo esperado" : `${String(entity.expected_teams).replace(".", ",")} equipos esperados`}. Su mejor equipo queda hacia el puesto ${entity.rank}; la mitad de las simulaciones, entre el ${entity.rank_best} y el ${entity.rank_worst}.`
        : `${teamLink(entity)}, ${esc(nameOf(entity.country))}${entity.team ? `, equipo ${esc(entity.team)}` : ""}${entity.rating ? `, rating ${entity.rating}` : ""}. Queda hacia el puesto ${entity.rank}; la mitad de las simulaciones, entre el ${entity.rank_best} y el ${entity.rank_worst}.${entity.kind === "presumed" ? ` Su plaza es supuesta: ${Math.round(entity.attend * 100)} % de que asista, ya incluido en las cifras.` : ""}`;
      pick.querySelector("#entity").innerHTML = `<p class="prose">${about}</p><div class="chance-cards">${[["Campeón", m.champion], ["Oro", m.gold], ["Plata", m.silver], ["Bronce", m.bronze], ["Alguna medalla", m.any], ["Top 50", entity.chances[at(50)]], ["Top 100", entity.chances[at(100)]]].map(([label, p]) => `<div><b>${percent(p)}</b>${label}</div>`).join("")}</div>`;
      showPlace(entity);
      return entity;
    };
    let entity = drawEntity();
    pick.querySelector("#pick-entity").addEventListener("change", (event) => {
      entity = drawEntity();
      const next = new URLSearchParams(location.search);
      next.set("q", event.target.value);
      history.replaceState(null, "", `?${next}`);
    });
    pick.querySelector("#place").addEventListener("input", () => showPlace(entity));

    card(a, {
      title: "Quién gana cada región", span: 12,
      sub: "Probabilidad de ser el mejor equipo de su región, y de que la región gane el título mundial o alguna medalla.",
      html: `<div class="region-chances">${Object.values(P.regions).sort((x, y) => y.world - x.world || y.medal - x.medal).map((r) => `<section><h3>${esc(r.name)}</h3><p>Título mundial ${percent(r.world)} · alguna medalla ${percent(r.medal)}</p>${r.leaders.map((l) => `<div class="leader"><span>${l.id ? `<a href="${uniUrl(l.id)}">${esc(l.name)}</a>` : esc(l.name)}${l.kind === "presumed" ? " <small>supuesto</small>" : ""}</span><b>${percent(l.chance)}</b><i style="width:${Math.max(l.chance * 100, 1)}%"></i></div>`).join("")}</section>`).join("")}</div>`,
    });

    plot(chartCard(a, { title: "¿Acierta? Lo que dio a cada campeón", sub: "Probabilidad que el modelo dio de antemano al campeón real, sin ver esa final", span: 6, height: 320 }), {
      tooltip: { trigger: "axis", valueFormatter: (v) => percent(v) },
      xAxis: categoryAxis(bt.per_year.map((y) => String(y.year))),
      yAxis: valueAxis({ min: 0, axisLabel: { color: c.dim, formatter: (v) => `${Math.round(v * 100)} %` } }),
      series: [
        { name: "Con ratings", type: "bar", itemStyle: { color: c.accent }, data: bt.per_year.map((y) => y.with_rosters) },
        { name: "Solo finales", type: "bar", itemStyle: { color: c.blue }, data: bt.per_year.map((y) => y.finals_only) },
        { name: "Al azar", type: "bar", itemStyle: { color: c.dim }, data: bt.per_year.map((y) => y.chance) },
      ],
    });
    plot(chartCard(a, { title: "¿Sus porcentajes son honestos?", sub: "Medalla: lo que predijo frente a lo que ocurrió. La diagonal es la calibración perfecta", span: 6, height: 320 }), {
      legend: false,
      grid: { left: 8, right: 16, top: 30, bottom: 34, containLabel: true },
      tooltip: { formatter: (p) => (p.data.teams ? `Predijo ${percent(p.value[0])}, ocurrió ${percent(p.value[1])} (${p.data.teams} equipos)` : "") },
      xAxis: valueAxis({ min: 0, max: 1, name: "Predicho", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: c.dim }, axisLabel: { color: c.dim, formatter: (v) => `${Math.round(v * 100)} %` } }),
      yAxis: valueAxis({ min: 0, max: 1, name: "Ocurrido", nameTextStyle: { color: c.dim }, axisLabel: { color: c.dim, formatter: (v) => `${Math.round(v * 100)} %` } }),
      series: [
        { type: "line", silent: true, symbol: "none", lineStyle: { type: "dashed", color: c.dim, width: 1 }, data: [[0, 0], [1, 1]] },
        { type: "scatter", itemStyle: { color: c.accent }, symbolSize: (v, p) => 7 + Math.sqrt(p.data.teams), data: bt.calibration.map((b) => ({ value: [b.predicted, b.happened], teams: b.teams })) },
      ],
    });
    const row = (label, key, digits) => [label, ...["chance", "finals_only", "with_rosters"].map((model) => (digits ? bt[model][key].toFixed(digits).replace(".", ",") : percent(bt[model][key])))];
    card(a, {
      title: "La prueba con finales pasadas", span: 6,
      sub: `Finales ${bt.per_year[0].year} a ${bt.per_year[bt.per_year.length - 1].year}, cada una predicha sin mirarla.`,
      html: table(["", { label: "Al azar", num: 1 }, { label: "Solo finales", num: 1 }, { label: "Con ratings", num: 1 }], [
        row("Probabilidad media del campeón real", "champion"),
        row("Error en P(oro), menos es mejor", "gold_brier", 3),
        row("Error en P(medalla), menos es mejor", "medal_brier", 3),
        row("Spearman, puesto esperado y real", "spearman", 2),
      ]),
    });
    card(a, {
      title: "Cómo funciona y qué no sabe", span: 6,
      html: `<div class="prose"><p>Cada equipo tiene una fuerza <code>${String(P.gamma).replace(".", ",")}·a + ${String(P.beta).replace(".", ",")}·z</code>. <b>a</b> es la fuerza de la universidad: cada final actualiza esa creencia por la regla de Bayes, y entre finales la creencia se abre. <b>z</b> es el rating actual en Codeforces de los tres miembros, combinado en un rating de equipo. Con esa fuerza se simula ${P.simulations.toLocaleString("es")} veces la final, con un modelo de Plackett-Luce.</p><ul><li><b>El campo está incompleto.</b> Hay ${listed} equipos de una lista comunitaria, y los ratings son del ${new Date(`${P.ratings_date}T12:00:00Z`).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}. Faltan China y parte de Europa: esas plazas se reparten entre las universidades de las tres últimas finales, marcadas como supuestas. Son estimaciones, no sus equipos reales.</li><li><b>El rating no lo es todo.</b> Mide a personas en Codeforces, no al equipo en una final. Una persona muy fuerte puede inflar a su equipo, y quien ya no compite allí puede salir por debajo de su nivel.</li><li><b>Pocas pruebas.</b> Solo hay ratings de cuatro finales, y el modelo no sabe de regionales ni de bajas.</li></ul></div>`,
    });
    card(a, {
      title: `Todos los equipos (${P.teams.length})`, span: 12,
      html: table(
        ["Universidad", "País", { label: "Puesto probable", num: 1 }, { label: "Top 12", num: 1 }, { label: "Top 50", num: 1 }, { label: "Asiste", num: 1 }, "Dato"],
        P.teams.map((t) => [teamLink(t), esc(nameOf(t.country)), `${t.rank} (${t.rank_best}–${t.rank_worst})`, percent(t.chances[at(12)]), percent(t.chances[at(50)]), `${Math.round(t.attend * 100)} %`, KINDS[t.kind]]),
      ),
    });
  },
});
