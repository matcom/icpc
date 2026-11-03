// Cuba: the country slice, its field, its Latin-American podiums and its people.
import { countryUrl, crest, esc, personUrl, teamUrl, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, valueAxis } from "../charts.js";
import { barList, card, chartCard, grid, isDark, kpis, startPage, table } from "../shell.js";

/* global echarts */

const n = (value) => (value == null ? "—" : Number(value).toLocaleString("es"));
const one = (value, digits = 1) => (value == null ? "—" : Number(value).toFixed(digits).replace(".", ","));
const pct = (value, digits = 1) => (value == null ? "—" : `${one(value, digits)}%`);
const place = (value) => (value == null ? "—" : `${Math.round(value)}.º`);
const plural = (value, singular, many) => `${value} ${value === 1 ? singular : many}`;
const problems = (value) => plural(value, "problema", "problemas");
const teamWord = (value) => plural(value, "equipo", "equipos");
const rangePlace = (low, high) => (low === high ? place(low) : `${place(low)}–${place(high)}`);
const signed = (value) => {
  if (value == null) return "—";
  const digits = Number.isInteger(value) ? 0 : 1;
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${one(Math.abs(value), digits)}`;
};
const shortUni = (name) => {
  if (name.includes("La Habana")) return "UH";
  if (name.includes("Ciencias Informáticas")) return "UCI";
  if (name.includes("Las Villas")) return "UCLV";
  if (name.includes("Pinar")) return "Pinar";
  if (name.includes("Oriente")) return "Oriente";
  return name;
};
const uniLink = (row) => `<a href="${uniUrl(row.uni)}">${esc(row.uniName)}</a>`;
const teamLink = (row) => `<a href="${teamUrl(row.uni, row.team)}">${esc(row.team)}</a>`;
const placeLabel = (value) => (value === 1 ? "oro" : value === 2 ? "plata" : value === 3 ? "bronce" : "");
const recordDate = (row) => `${row.year} · ${esc(row.team)} · ${esc(shortUni(row.uniName))}`;

const SECTIONS = [
  ["mundo", "Mundo"],
  ["historia", "Historia"],
  ["equipos", "Equipos"],
  ["podios", "Podios"],
  ["campo", "Campo"],
  ["universidades", "Universidades"],
  ["personas", "Personas"],
  ["genero", "Género"],
  ["futuro", "Futuro"],
  ["album", "Álbum"],
  ["metodo", "Método"],
];

const ui = { year: 2025, simYear: 2025, simSolved: 5 };
let cubaPromise = null;
let renderToken = 0;

function readUi(cuba) {
  const query = new URLSearchParams(location.search);
  const years = cuba.years;
  const year = Number(query.get("year"));
  const simYear = Number(query.get("sim-year"));
  const simSolved = Number(query.get("sim-solved"));
  const simMax = Math.max(...cuba.simulator.map((row) => row.solved));
  if (years.includes(year)) ui.year = year;
  if (years.includes(simYear)) ui.simYear = simYear;
  if (query.has("sim-solved") && Number.isInteger(simSolved) && simSolved >= 0 && simSolved <= simMax) ui.simSolved = simSolved;
}

function section(view, id, kicker, title, sub) {
  const el = document.createElement("section");
  el.className = "cuba-section";
  el.id = id;
  el.innerHTML = `<header class="cuba-section-head"><span class="cuba-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2>${sub ? `<p>${sub}</p>` : ""}</header>`;
  view.append(el);
  return el;
}

function recordCard(title, row, note, value) {
  return `<article class="cuba-record"><span class="cuba-kicker">${esc(title)}</span>
    <b>${value ?? (row ? place(row.rank) : "—")}</b>
    <span>${row ? recordDate(row) : "—"}</span>
    <small>${note}</small>
    ${row ? `<a class="cuba-record-link" href="${teamUrl(row.uni, row.team)}">Ver el equipo</a>` : ""}
  </article>`;
}

function teamCard(row) {
  return `<article class="cuba-team${row.podiumPlace ? ` podium p${row.podiumPlace}` : ""}">
    <div class="cuba-team-top">${crest(row.uniName, 30)}
      <div><b><a href="${teamUrl(row.uni, row.team)}">${esc(row.team)}</a></b><small>${esc(row.uniName)} · ${row.year}</small></div>
      <span class="cuba-team-rank">${place(row.rank)}</span>
    </div>
    <div class="cuba-team-meta"><span>${problems(row.solved)}</span><span>${pct(row.pct)}</span><span>${teamWord(row.field)}</span></div>
    <ul class="cuba-team-players">${row.players.map((p) => `<li><a href="${personUrl(p.id)}">${esc(p.name)}</a></li>`).join("")}</ul>
    ${row.podiumPlace ? `<span class="cuba-podium-tag">${row.podiumPlace}.º de Latinoamérica</span>` : ""}
  </article>`;
}

function podiumCard(row) {
  const kind = row.place === 1 ? "gold" : row.place === 3 ? "bronze" : "silver";
  return `<article class="cuba-podium-card ${kind}">
    <span class="cuba-podium-place">${row.place}.º</span>
    <span class="cuba-podium-year">${row.year}</span>
    <b>${esc(shortUni(row.uniName))}</b>
    <span>${esc(row.uniName)}</span>
    <a href="${teamUrl(row.uni, row.team)}">${esc(row.team)}</a>
    <small>${place(row.rank)} de ${row.field ?? "—"} · ${problems(row.solved)} · ${pct(row.pct)}</small>
  </article>`;
}

function teamTable(rows) {
  return table([
    { label: "Año", num: true }, "Universidad", "Equipo", { label: "Puesto", num: true },
    { label: "Equipos en la final", num: true, title: "Número de equipos que compitieron en esa final" },
    { label: "Percentil", num: true }, { label: "Problemas", num: true },
    { label: "Desempate", num: true, title: "Posición dentro de los equipos que resolvieron los mismos problemas, por tiempo" },
    "Podio LatAm",
  ], rows.map((row) => [
    row.year, uniLink(row), teamLink(row), place(row.rank), row.field, pct(row.pct), row.solved,
    row.group ? `${row.group.position}/${row.group.size}` : "—",
    row.podiumPlace ? `<b>${row.podiumPlace}.º</b>` : "—",
  ])).replace('<div class="tablew">', '<div class="tablew cuba-teams-wrap">').replace("<table>", '<table class="cuba-teams-table">');
}

function clockCell(row) {
  if (!row.group || row.group.timePct == null) return "—";
  const size = Math.max(0, Math.min(100, row.group.timePct));
  return `<span class="cuba-clock"><i style="width:${size}%"></i></span><span>${one(row.group.timePct)}</span>`;
}

function clockTable(rows) {
  return table([
    { label: "Año", num: true }, "Universidad", "Equipo", { label: "Problemas", num: true },
    { label: "En el grupo", num: true }, { label: "Percentil de tiempo", num: true }, { label: "Puesto", num: true },
  ], rows.map((row) => [
    row.year, uniLink(row), teamLink(row), row.solved,
    row.group ? `${row.group.position}/${row.group.size}` : "—",
    clockCell(row), place(row.rank),
  ])).replace('<div class="tablew">', '<div class="tablew cuba-clock-wrap">').replace("<table>", '<table class="cuba-clock-table">');
}

function rangeRow(row, min, span, selected, cubaTeams) {
  const left = Math.min(98.5, Math.max(0, ((row.rankLow - min) / span) * 100));
  const width = Math.max(1.5, Math.min(100 - left, ((row.rankHigh - row.rankLow) / span) * 100));
  const marks = cubaTeams
    .filter((team) => team.solved === row.solved)
    .map((team) => {
      const markLeft = Math.min(98.5, Math.max(1.5, ((team.rank - min) / span) * 100));
      return `<span class="cuba-sim-mark" style="left:${markLeft}%" title="${esc(team.team)} · ${problems(team.solved)} · ${place(team.rank)}"><span class="cuba-sim-dot"></span></span>`;
    })
    .join("");
  return `<div class="cuba-range${selected ? " on" : ""}">
    <span class="cuba-range-label">${row.solved} problemas</span>
    <span class="cuba-range-track"><i style="left:${left}%;width:${width}%"></i><b style="left:${((row.rankMedian - min) / span) * 100}%"></b>${marks}</span>
    <span class="cuba-range-value">${rangePlace(row.rankLow, row.rankHigh)}</span>
    <small>${teamWord(row.count)} · ${pct(row.pctLow)}–${pct(row.pctHigh)}</small>
  </div>`;
}

function draw(view, data, cuba, cubaMap) {
  document.title = "Cuba · Observatorio ICPC";
  readUi(cuba);
  view.insertAdjacentHTML("beforeend", `<nav class="cuba-subnav" aria-label="Secciones de Cuba">${SECTIONS.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join("")}</nav>`);

  const hero = document.createElement("div");
  hero.className = "cuba-hero";
  hero.innerHTML = `<p class="cuba-lead">Cuba estuvo en las <b>16 finales</b> de la serie 2010–2025. Lo hizo con <b>26 equipos</b>, <b>57 personas</b> y <b>cinco universidades</b>. La Universidad de La Habana concentra 13 de esos equipos y los cinco podios latinoamericanos. El podio mundial sigue sin llegar: el mejor puesto es <b>44.º</b> (2017) y ninguna formación ha resuelto más de <b>cinco problemas</b>.</p>
    <div class="cuba-hero-note"><span>Una lectura de país, no un perfil más.</span> Reagrupa el podio latinoamericano, mira el campo desde dentro y publica el género solo en agregado.</div>`;
  view.append(hero);

  const heroKpis = kpis(view, [
    ["16", "finales, 2010–2025"],
    ["26", "equipos cubanos"],
    ["57", "personas distintas"],
    ["5", "podios latinoamericanos"],
    ["0", "medallas mundiales"],
    ["5", "problemas: el techo"],
    ["4.º de 11", "podios de Latinoamérica"],
    ["22.º de 79", "participaciones en el mundo"],
  ]);
  heroKpis.classList.add("cuba-kpis");

  // ---------------------------------------------------------------- 01 mundo
  const world = section(view, "mundo", "01 · El mundo", "Cuba en el espejo",
    "Una delegación pequeña y constante. En el tablero mundial está en la mitad baja; en Latinoamérica es cuarta por podios, con menos equipos que Brasil, Argentina, México y Colombia.");
  const w = grid(world);
  const c = colors();
  const mirror = cuba.mirror.countries;
  const labelSet = new Set(["Cuba", "Argentina", "Brazil", "Mexico", "Peru", "Colombia", "Chile", "Venezuela"]);
  plot(chartCard(w, {
    title: "Nivel y techo de cada país", span: 8, height: 340,
    sub: "Cada punto es un país con al menos 8 ediciones desde 2010. El tamaño es su número de equipos; el color, si tiene medallas mundiales.",
  }), {
    legend: false,
    grid: { left: 8, right: 34, top: 22, bottom: 36, containLabel: true },
    tooltip: {
      formatter: (p) => `<b>${esc(p.data.es)}</b><br>Percentil medio del mejor equipo: <b>${one(p.data.meanBest)}</b><br>Mejor puesto: <b>${place(p.data.bestRank)}</b><br>${p.data.teams} equipos en ${p.data.editions} ediciones<br>${p.data.medals} medallas mundiales`,
    },
    xAxis: valueAxis({ min: 0, max: 100, name: "Percentil medio del mejor equipo", nameLocation: "middle", nameGap: 26 }),
    yAxis: valueAxis({ inverse: true, min: 0, max: 90, name: "Mejor puesto", nameTextStyle: { color: c.dim } }),
    series: [{
      type: "scatter",
      symbolSize: (value) => 6 + Math.sqrt(value[2]) * 1.15,
      data: mirror.map((row) => ({
        name: row.es, country: row.country, es: row.country === "Spain" ? "España" : row.es,
        value: [row.meanBest, row.bestRank, row.teams, row.medals],
        meanBest: row.meanBest, bestRank: row.bestRank, teams: row.teams, editions: row.editions, medals: row.medals,
        itemStyle: {
          color: row.country === "Cuba" ? c.red : row.medals ? c.accent : c.blue,
          opacity: row.country === "Cuba" ? 1 : 0.72,
          borderColor: c.panel, borderWidth: 1,
        },
        label: {
          show: labelSet.has(row.country),
          formatter: row.country === "Spain" ? "España" : row.es,
          position: ({ Chile: "left", Cuba: "right", Colombia: "left", Peru: "bottom", Mexico: "top", Argentina: "top", Brazil: "right", Venezuela: "right" })[row.country] ?? "right",
          color: row.country === "Cuba" ? c.ink : c.dim, fontSize: 11,
        },
      })),
    }],
  });

  const facts = card(w, {
    title: "Lo que dicen los números", span: 4,
    html: `<ul class="cuba-facts">
      <li><b>22.º de 79</b> países por participaciones desde 2010: 26 equipos.</li>
      <li><b>33.º de 39</b> países con al menos 8 ediciones por percentil medio del mejor equipo: 30,8.</li>
      <li><b>49.º de 79</b> por mejor puesto histórico: 44.º, con 48 países por delante.</li>
      <li><b>0 medallas</b> mundiales. Entre los 24 países con 20 o más equipos, 9 nunca han subido al podio mundial; Cuba es uno.</li>
      <li><b>2.º de 16</b> en volatilidad entre los países que nunca faltaron a una final: 19,7 puntos de desviación del percentil del mejor equipo.</li>
    </ul><p class="note">La volatilidad mide cuánto cambia el mejor resultado de un año a otro. México (20,9) es el único país que nunca faltó y tiene una serie más irregular.</p>`,
  });
  facts.classList.add("cuba-facts-card");

  const topApps = cuba.world.appearances.top;
  const appsCard = card(w, {
    title: "Quién ocupa el tablero", span: 6,
    sub: "Países con más equipos en las finales de 2010 a 2025. Cuba, con 26, es 22.ª y no aparece entre los diez primeros.",
    html: barList([...topApps.map((row) => ({ label: row.es, value: row.value, url: countryUrl(row.country) })), { label: "Cuba (22.º)", value: cuba.world.appearances.cuba, url: countryUrl("Cuba") }], { format: (value) => n(value) }),
  });
  appsCard.classList.add("cuba-apps");
  const readCard = card(w, {
    title: "Cómo se lee el tablero", span: 6,
    html: `<div class="prose"><p>El ranking cuenta <b>equipos</b>, no países distintos ni personas. Un país con más plazas puede sumar más aunque rinda menos.</p>
      <p>Cuba tiene <b>26 equipos</b>: el <b>9,1%</b> de los equipos latinoamericanos de la serie. Con ese volumen es <b>22.ª del mundo</b>, pero <b>4.ª de Latinoamérica por podios</b> y aporta el <b>10,4%</b> de los podios de la región.</p>
      <p class="note">Estados Unidos, con 286 equipos, multiplica por once la delegación cubana. La comparación útil no es el volumen, sino el rendimiento por equipo. <a href="#podios">Ver el podio latinoamericano</a>.</p></div>`,
  });
  readCard.closest(".card")?.classList.add("cuba-aside");

  // -------------------------------------------------------------- 02 historia
  const historySection = section(view, "historia", "02 · Historia", "Una línea que sube, se rompe y vuelve a subir",
    "El mejor año fue 2017; el peor, 2025. Entre ambos, Cuba cambió de generación sin dejar de asistir a la final.");
  const h = grid(historySection);
  plot(chartCard(h, {
    title: "Equipos y mejor percentil, final por final", span: 6, height: 300,
    sub: "Las barras son equipos cubanos; la línea, el percentil del mejor equipo de Cuba en esa final. Más alto es mejor.",
  }), {
    tooltip: { trigger: "axis" },
    legend: { data: ["Equipos cubanos", "Mejor percentil"] },
    xAxis: categoryAxis(cuba.years.map(String)),
    yAxis: [
      valueAxis({ min: 0, max: cuba.totals.maxTeamsYear + 1, name: "Equipos", nameTextStyle: { color: c.dim } }),
      valueAxis({ min: 0, max: 100, name: "Percentil", nameTextStyle: { color: c.dim } }),
    ],
    series: [
      {
        name: "Equipos cubanos", type: "bar", data: cuba.field.map((row) => row.teams), barMaxWidth: 26,
        itemStyle: { color: isDark() ? "#6a3039" : "#dfcfa3", borderRadius: [4, 4, 0, 0] },
      },
      {
        name: "Mejor percentil", type: "line", yAxisIndex: 1, data: cuba.field.map((row) => row.cubaBestPct),
        symbolSize: 7, lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent },
        markPoint: {
          symbolSize: 46,
          data: [{ coord: ["2017", 65.9], value: "44.º" }],
          label: { color: c.ink, fontSize: 11, fontWeight: 600 },
          itemStyle: { color: c.gold, borderColor: c.panel, borderWidth: 1 },
        },
      },
    ],
  });

  const uhRows = (year) => cuba.teams.filter((row) => row.year === year && row.uni === "universidad-de-la-habana");
  const bestByPct = (rows) => rows.filter((row) => row.pct != null).sort((a, b) => b.pct - a.pct)[0] ?? null;
  const uhBest = cuba.years.map((year) => bestByPct(uhRows(year))?.pct ?? null);
  const otherBest = cuba.years.map((year) => bestByPct(cuba.teams.filter((row) => row.year === year && row.uni !== "universidad-de-la-habana"))?.pct ?? null);
  plot(chartCard(h, {
    title: "Si La Habana no hubiera ido", span: 6, height: 300,
    sub: "Percentil del mejor equipo cubano con y sin la Universidad de La Habana en cada final. Los huecos son los años en que La Habana no participó.",
  }), {
    tooltip: { trigger: "axis" },
    legend: { data: ["Mejor equipo de La Habana", "Mejor equipo del resto de Cuba"] },
    xAxis: categoryAxis(cuba.years.map(String), { boundaryGap: false }),
    yAxis: valueAxis({ min: 0, max: 100, name: "Percentil", nameTextStyle: { color: c.dim } }),
    series: [
      { name: "Mejor equipo de La Habana", type: "line", data: uhBest, connectNulls: false, symbolSize: 7, lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent } },
      { name: "Mejor equipo del resto de Cuba", type: "line", data: otherBest, connectNulls: true, symbolSize: 6, lineStyle: { width: 2, type: "dashed", color: c.blue }, itemStyle: { color: c.blue } },
    ],
  });

  const stories = card(h, {
    title: "Cuatro momentos", span: 12,
    html: `<div class="cuba-story-grid">
      <article class="cuba-story"><span class="cuba-kicker">2017 · El techo</span><h3>44.º y campeón de Latinoamérica</h3>
        <p>UH++ resolvió <b>5 problemas</b>, terminó <b>44.º de 127</b> y firmó el mejor percentil cubano: <b>65,9</b>. Fue el único año por encima de la mediana del campo y el único título regional.</p></article>
      <article class="cuba-story"><span class="cuba-kicker">2018 · La visa</span><h3>La plaza que no se pudo usar</h3>
        <p>Pinar del Río clasificó en 2017, pero el equipo no pudo viajar a Estados Unidos por el visado. La fuente conserva la clasificación sin puesto. En 2018 Cuba llevó tres equipos: <b>UCLV KFP</b> (100.º), <b>Oriente Netscape</b> (118.º) y <b>Pinar sUrPRise</b> (131.º). La Habana no estuvo.</p>
        <p class="note">El relato del visado es del equipo del proyecto; la base de resultados solo registra la clasificación de 2017.</p></article>
      <article class="cuba-story"><span class="cuba-kicker">2019–2023 · La edad de bronce</span><h3>Cuatro podios latinoamericanos</h3>
        <p>La Habana encadenó bronces en <b>2019, 2020, 2021 y 2023</b>. El último, UH Top en 2023, terminó <b>46.º de 130</b> con 5 problemas y <b>65,1</b> de percentil: el segundo mejor registro cubano.</p></article>
      <article class="cuba-story"><span class="cuba-kicker">2024–2025 · El suelo</span><h3>132.º en un campo más grande</h3>
        <p>2025 dejó el peor puesto de la serie: <b>132.º de 139</b> con 4 problemas. La caída coincide con un campo que creció de 103 equipos en 2010 a 139 en 2025, pero el percentil (5,1) también es el segundo más bajo.</p></article>
    </div>`,
  });
  stories.classList.add("cuba-stories-card");


  card(h, {
    title: "La cuenta, sin causalidad", span: 12,
    html: `<div class="cuba-two-col"><p>En <b>13 finales</b> hubo un equipo de La Habana; en <b>2010, 2014 y 2018</b> no. En esos tres años el mejor equipo cubano fue UCLV1 (92.º), Oriente Napster (96.º) y Pinar sUrPRise (131.º). Con La Habana, <b>5 de esas 13 finales</b> acabaron entre los 70 primeros; sin ella, ninguna de las tres.</p>
      <p class="note">No es un contrafactual causal: al quitar a La Habana también cambia el resto de la delegación, y los años sin La Habana no son comparables por casualidad. ${esc(cuba.counterfactual.note)}</p></div>`,
  });

  // --------------------------------------------------------------- 03 equipos
  const teams = section(view, "equipos", "03 · Equipos", "Veintiséis equipos, final por final",
    "La tabla completa de la serie, con puesto, problemas y desempate. El álbum con las personas está al final de la página.");
  const t = grid(teams);
  const tableBody = card(t, {
    title: "La tabla completa", span: 12,
    sub: "Ordena por cualquier columna. «Equipos en la final» es el tamaño del campo; el desempate es la posición dentro del grupo que resolvió los mismos problemas, por tiempo.",
    html: teamTable([...cuba.teams].reverse()),
  });
  tableBody.querySelector(".tablew")?.style.setProperty("--table-h", "620px");

  // ---------------------------------------------------------------- 04 podios
  const podiums = section(view, "podios", "04 · Podios", "El podio que Cuba sí alcanza",
    "No es un premio oficial del ICPC: es el podio por país, el mejor equipo de cada país latinoamericano en cada final. Cuba ha colocado un equipo en cinco de las 16 ediciones: es cuarta entre los siete países que han subido al podio (11 han tenido equipos).");
  kpis(podiums, [
    [cuba.podiums.totals.cubaPodiums, "podios latinoamericanos"],
    [cuba.podiums.totals.gold, "oro"],
    [cuba.podiums.totals.bronze, "bronces"],
    [`${cuba.podiums.totals.cubaPodiumRank}.º de ${cuba.podiums.totals.countriesWithPodiums}`, "países con podios"],
    [pct(cuba.podiums.totals.cubaPodiumShare), "de los podios de la región"],
    [pct(cuba.podiums.totals.cubaShare), "de los equipos de la región"],
  ]);
  const p = grid(podiums);
  card(p, {
    title: "Los cinco podios cubanos", span: 12,
    sub: "Cada tarjeta es un puesto cubano en el podio por país. La universidad que lo ocupó está siempre a la vista.",
    html: `<div class="cuba-podiums">${cuba.podiums.cuba.map(podiumCard).join("")}</div>`,
  });
  card(p, {
    title: "Qué universidad ocupó cada puesto", span: 12,
    sub: "La tabla que responde la pregunta directa: cada podio cubano, con su universidad y su resultado mundial.",
    html: table([
      { label: "Año", num: true }, { label: "Puesto", num: true }, "Universidad", "Equipo",
      { label: "Mundial", num: true }, { label: "Percentil", num: true }, { label: "Problemas", num: true },
    ], cuba.podiums.cuba.map((row) => [
      row.year, `<b>${row.place}.º</b>`, uniLink(row), teamLink(row), place(row.rank), pct(row.pct), row.solved,
    ])),
  });

  const podiumYears = cuba.podiums.years;
  plot(chartCard(p, {
    title: "Cuba en el podio latinoamericano", span: 6, height: 300,
    sub: "Puesto de Cuba entre los países de la región en cada final. La línea marca el corte del podio.",
  }), {
    legend: false,
    grid: { left: 8, right: 18, top: 24, bottom: 26, containLabel: true },
    tooltip: {
      formatter: (p) => {
        const row = podiumYears[p.dataIndex];
        const uni = row.cuba?.uniName ? `<br>${esc(row.cuba.uniName)} · ${place(row.cuba.rank)}` : "";
        return `<b>${row.year}</b>: ${row.cubaPlace}.º de ${row.latamCountries} países${uni}`;
      },
    },
    xAxis: categoryAxis(podiumYears.map((row) => String(row.year))),
    yAxis: valueAxis({ inverse: true, min: 0, max: 11 }),
    series: [{
      type: "bar", barMaxWidth: 24, barMinHeight: 2,
      data: podiumYears.map((row) => ({
        value: row.cubaPlace,
        itemStyle: { color: row.cubaPlace <= 3 ? c.accent : c.blue, opacity: row.cubaPlace <= 3 ? 1 : 0.55, borderRadius: [3, 3, 0, 0] },
      })),
      markLine: { silent: true, symbol: "none", lineStyle: { color: c.gold, type: "dashed" }, label: { show: false }, data: [{ yAxis: 3 }] },
    }],
  });

  const podiumCountries = cuba.podiums.countries;
  plot(chartCard(p, {
    title: "Peso relativo en la región", span: 6, height: 300,
    sub: "Porcentaje de equipos frente a porcentaje de podios en los 11 países con equipos. Por encima de la diagonal se rinde por encima del peso demográfico.",
  }), {
    legend: false,
    grid: { left: 8, right: 30, top: 22, bottom: 34, containLabel: true },
    tooltip: {
      formatter: (p) => `<b>${esc(p.data.es)}</b><br>${p.data.teams} equipos (${pct(p.data.teamShare)})<br>${p.data.podiums} podios (${pct(p.data.podiumShare)})`,
    },
    xAxis: valueAxis({ min: 0, max: 40, name: "% de equipos", nameLocation: "middle", nameGap: 26 }),
    yAxis: valueAxis({ min: 0, max: 35 }),
    series: [{
      type: "scatter",
      symbolSize: (value) => 9 + Math.sqrt(value[2]) * 1.4,
      data: podiumCountries.map((row) => ({
        name: row.es, es: row.es, teams: row.teams, podiums: row.podiums, teamShare: row.teamShare, podiumShare: row.podiumShare,
        value: [row.teamShare, row.podiumShare, row.teams],
        itemStyle: { color: row.country === "Cuba" ? c.red : row.podiums ? c.accent : c.blue, opacity: row.country === "Cuba" ? 1 : 0.68, borderColor: c.panel, borderWidth: 1 },
        label: {
          show: ["Cuba", "Argentina", "Brazil", "Mexico", "Peru"].includes(row.country),
          formatter: row.es,
          position: row.country === "Brazil" ? "left" : row.country === "Cuba" ? "right" : "top",
          color: row.country === "Cuba" ? c.ink : c.dim, fontSize: 11,
        },
      })),
      markLine: { silent: true, symbol: "none", lineStyle: { color: c.dim, type: "dashed" }, label: { show: false }, data: [[{ coord: [0, 0] }, { coord: [35, 35] }]] },
    }],
  });

  const podiumCell = (row) => (row
    ? `<a href="${uniUrl(row.uni)}">${esc(row.es)}</a> <small>${esc(shortUni(row.uniName))} · ${place(row.rank)}</small>`
    : "—");
  const latamTable = table(["Año", "1.º", "2.º", "3.º", "Cuba"], podiumYears.map((row) => [
    row.year, ...[0, 1, 2].map((i) => podiumCell(row.top[i])),
    row.cubaPlace <= 3 ? `<b>${row.cubaPlace}.º</b> ${esc(shortUni(row.cuba.uniName))} · ${place(row.cuba.rank)}` : `${row.cubaPlace}.º`,
  ]));
  card(p, {
    title: "Los 16 podios latinoamericanos", span: 12,
    sub: `Cuba aporta ${cuba.podiums.totals.cubaTeams} de los ${cuba.podiums.totals.latamTeams} equipos de la región (${pct(cuba.podiums.totals.cubaShare)}) y ${cuba.podiums.totals.cubaPodiums} de los ${cuba.podiums.totals.podiums} puestos de podio (${pct(cuba.podiums.totals.cubaPodiumShare)}).`,
    html: `<details class="cuba-details"><summary>Ver año por año</summary>${latamTable.replace('<div class="tablew">', '<div class="tablew" style="--table-h:560px">')}</details><p class="note">El podio por país es una reagregación del podio por universidad que ya publica <a href="regiones.html?podio=la">Regiones</a>. No es un premio oficial del ICPC. ${esc(cuba.podiums.definition)}</p>`,
  });

  // ----------------------------------------------------------------- 05 campo
  const field = section(view, "campo", "05 · Campo", "El techo de cinco",
    "Cuba no ha pasado de cinco problemas resueltos. La distancia al podio mundial se mide mejor en problemas que en puestos: un año puede tener un puesto peor y un percentil mejor.");
  kpis(field, [
    [cuba.totals.solvedMax, "problemas: el máximo"],
    [cuba.records.mostSolved.length, "equipos con 5"],
    [cuba.totals.teams6Plus, "equipos con 6 o más"],
    [signed(Math.max(...cuba.field.map((row) => row.gapTop50).filter((value) => value != null))), "mejor brecha al top 50"],
    [signed(Math.max(...cuba.field.map((row) => row.gapMedian).filter((value) => value != null))), "mejor brecha a la mediana"],
  ]);
  const f = grid(field);
  const solvedDist = [...cuba.records.solvedDist, { solved: "6+", teams: cuba.totals.teams6Plus }];
  plot(chartCard(f, {
    title: "El techo de cinco", span: 6, height: 300,
    sub: "Equipos cubanos por número de problemas resueltos. La barra de 6+ está vacía.",
  }), {
    legend: false,
    grid: { left: 8, right: 12, top: 26, bottom: 10, containLabel: true },
    tooltip: { trigger: "item", formatter: (p) => `${p.name} problemas: <b>${p.value}</b> equipos` },
    xAxis: categoryAxis(solvedDist.map((row) => String(row.solved))),
    yAxis: valueAxis({ min: 0, max: 8 }),
    series: [{
      type: "bar", barMaxWidth: 36, data: solvedDist.map((row) => ({ value: row.teams, itemStyle: { color: row.solved === "6+" ? c.red : row.solved === 5 ? c.gold : c.accent, borderRadius: [4, 4, 0, 0] } })),
      label: { show: true, position: "top", color: c.ink },
    }],
  });

  plot(chartCard(f, {
    title: "La brecha en problemas", span: 6, height: 300,
    sub: "Problemas resueltos por el mejor equipo cubano frente a la mediana del campo, el corte del top 50 y el corte de medalla.",
  }), {
    tooltip: { trigger: "axis" },
    legend: { data: ["Cuba (mejor equipo)", "Mediana del campo", "Corte del top 50", "Corte de medalla"] },
    xAxis: categoryAxis(cuba.years.map(String), { boundaryGap: false }),
    yAxis: valueAxis({ min: 0, max: 16, name: "Problemas", nameTextStyle: { color: c.dim } }),
    series: [
      { name: "Corte de medalla", type: "line", data: cuba.field.map((row) => row.medalSolved), symbol: "none", lineStyle: { width: 1.5, type: "dashed", color: c.red }, itemStyle: { color: c.red } },
      { name: "Corte del top 50", type: "line", data: cuba.field.map((row) => row.top50Solved), symbol: "none", lineStyle: { width: 1.5, type: "dashed", color: c.gold }, itemStyle: { color: c.gold } },
      { name: "Mediana del campo", type: "line", data: cuba.field.map((row) => row.medianSolved), symbol: "none", lineStyle: { width: 1.5, type: "dashed", color: c.blue }, itemStyle: { color: c.blue } },
      { name: "Cuba (mejor equipo)", type: "line", data: cuba.field.map((row) => row.cubaBestSolved), symbolSize: 7, lineStyle: { width: 4, color: c.accent }, itemStyle: { color: c.accent }, z: 5 },
    ],
  });

  const gapBody = card(f, {
    title: "La distancia, año por año", span: 12,
    sub: "Diferencia entre el mejor equipo cubano y cada corte. Un número negativo significa que Cuba se quedó por debajo.",
    html: table([
      { label: "Año", num: true }, { label: "Cuba", num: true }, { label: "Mediana", num: true }, { label: "Top 50", num: true },
      { label: "Medalla", num: true }, { label: "Brecha mediana", num: true }, { label: "Brecha top 50", num: true }, { label: "Brecha medalla", num: true },
    ], cuba.field.map((row) => [
      row.year, row.cubaBestSolved, one(row.medianSolved), row.top50Solved, row.medalSolved,
      signed(row.gapMedian), signed(row.gapTop50), signed(row.gapMedal),
    ])),
  });
  gapBody.querySelector(".tablew")?.style.setProperty("--table-h", "420px");

  const fastest = cuba.records.fastest;
  const slowest = cuba.records.slowest;
  card(f, {
    title: "Récords y rarezas", span: 12,
    sub: "Los extremos de la serie, con el contexto que hace falta para leerlos.",
    html: `<div class="cuba-records">
      ${recordCard("Mejor puesto", cuba.records.best, `${cuba.records.best.solved} problemas · ${pct(cuba.records.best.pct)} · campeón de Latinoamérica`)}
      ${recordCard("Peor puesto", cuba.records.worst, `${cuba.records.worst.solved} problemas · ${pct(cuba.records.worst.pct)} · el peor puesto de la serie`)}
      ${recordCard("Mejor percentil", cuba.records.bestPct, `${problems(cuba.records.bestPct.solved)} · puesto ${place(cuba.records.bestPct.rank)} de ${cuba.records.bestPct.field}`, pct(cuba.records.bestPct.pct))}
      ${recordCard("Peor percentil", cuba.records.worstPct, `${problems(cuba.records.worstPct.solved)} · puesto ${place(cuba.records.worstPct.rank)} de ${cuba.records.worstPct.field}`, pct(cuba.records.worstPct.pct))}
      ${recordCard("Mejor percentil de tiempo", fastest, `${fastest.group.position}.º de ${fastest.group.size} con ${problems(fastest.solved)} · puesto ${place(fastest.rank)}`, pct(fastest.group.timePct))}
      ${recordCard("Peor percentil de tiempo con 3+", slowest, `${slowest.group.position}.º de ${slowest.group.size} con ${problems(slowest.solved)} · puesto ${place(slowest.rank)}`, pct(slowest.group.timePct))}
      <article class="cuba-record"><span class="cuba-kicker">Techo</span><b>5</b><span>problemas, dos veces</span><small>${cuba.records.mostSolved.map((row) => `${row.year} ${esc(row.team)}`).join(" · ")}. Ningún equipo cubano ha resuelto 6.</small></article>
      <article class="cuba-record"><span class="cuba-kicker">La plaza que no se jugó</span><b>2017</b><span>Pinar del Río clasificó</span><small>El equipo sUrPRise no pudo viajar; en 2018 compitió y terminó 131.º. La fuente conserva la clasificación sin puesto.</small></article>
    </div>`,
  });

  card(f, {
    title: "El reloj del desempate", span: 12,
    sub: "Dentro del grupo que resolvió los mismos problemas, el tiempo decide. La barra es el percentil de tiempo: 100 es el más rápido del grupo.",
    html: `<div class="callout">El mejor percentil de tiempo de Cuba: <b>${fastest.year} ${esc(fastest.team)}</b>, ${fastest.group.position}.º de ${fastest.group.size} con ${problems(fastest.solved)} (${pct(fastest.group.timePct)} de percentil). El peor entre los que resolvieron 3 o más: <b>${slowest.year} ${esc(slowest.team)}</b>, ${slowest.group.position}.º de ${slowest.group.size} (${pct(slowest.group.timePct)}). En 2023 UH Top fue 11.º de 41; en 2025 The Chefs, 4.º de 6.</div>${clockTable([...cuba.teams].reverse())}`,
  }).querySelector(".tablew")?.style.setProperty("--table-h", "560px");

  const setParam = (key, value) => {
    const query = new URLSearchParams(location.search);
    query.set(key, String(value));
    history.replaceState(null, "", `?${query}${location.hash}`);
  };

  const machineBody = card(f, {
    title: "La máquina del tiempo", span: 6,
    sub: "Elige una final y mira el campo completo: cada punto es un equipo, el eje horizontal son los problemas y el vertical, el puesto. Cuba va en rojo.",
    html: `<div class="cuba-controls"><label>Año <select id="machine-year">${cuba.years.map((year) => `<option value="${year}"${year === ui.year ? " selected" : ""}>${year}</option>`).join("")}</select></label><span class="note">El corte de medalla y el del top 50 aparecen como líneas verticales.</span></div><div id="machine-stats"></div><div id="machine-plot" class="plot" style="height:300px"></div><div id="machine-teams"></div>`,
  });
  const machineChart = plot(machineBody.querySelector("#machine-plot"), (() => {
    const field = cuba.field.find((row) => row.year === ui.year);
    const points = data.rows.filter((row) => row.year === ui.year && row.rank != null).map((row) => {
      const cubaTeam = row.country === "Cuba";
      return {
        name: cubaTeam ? `${row.team} (${shortUni(row.uniName)})` : row.team,
        cuba: cubaTeam, year: row.year, solved: row.solved, rank: row.rank, pct: row.pct, team: row.team, uniName: row.uniName,
        value: [row.solved, row.rank],
        itemStyle: { color: cubaTeam ? c.red : c.blue, opacity: cubaTeam ? 1 : 0.28, borderColor: cubaTeam ? c.panel : "transparent", borderWidth: cubaTeam ? 1.2 : 0 },
        label: { show: cubaTeam, formatter: row.team, position: "top", color: c.ink, fontSize: 12 },
      };
    });
    return {
      legend: false,
      grid: { left: 8, right: 18, top: 24, bottom: 34, containLabel: true },
      tooltip: {
        formatter: (p) => `<b>${esc(p.data.team)}</b>${p.data.cuba ? " · Cuba" : ""}<br>${p.data.year} · ${p.data.solved} problemas · puesto ${p.data.rank}<br>Percentil ${one(p.data.pct)}`,
      },
      xAxis: valueAxis({ min: 0, max: field.problems + 1, name: "Problemas resueltos", nameLocation: "middle", nameGap: 26 }),
      yAxis: valueAxis({ inverse: true, min: 1, max: field.field + 2 }),
      series: [{
        type: "scatter", symbolSize: (value, params) => (params.data.cuba ? 11 : 5),
        data: points,
        markLine: {
          silent: true, symbol: "none",
          lineStyle: { type: "dashed", width: 1 },
          data: [
            { xAxis: field.top50Solved, lineStyle: { color: c.gold }, label: { formatter: "top 50", color: c.dim } },
            { xAxis: field.medalSolved, lineStyle: { color: c.red }, label: { formatter: "medalla", color: c.dim } },
          ],
        },
      }],
    };
  })());

  const updateMachine = () => {
    const field = cuba.field.find((row) => row.year === ui.year);
    const cubaRows = cuba.teams.filter((row) => row.year === ui.year);
    const points = data.rows.filter((row) => row.year === ui.year && row.rank != null).map((row) => {
      const cubaTeam = row.country === "Cuba";
      return {
        name: cubaTeam ? `${row.team} (${shortUni(row.uniName)})` : row.team,
        cuba: cubaTeam, year: row.year, solved: row.solved, rank: row.rank, pct: row.pct, team: row.team, uniName: row.uniName,
        value: [row.solved, row.rank],
        itemStyle: { color: cubaTeam ? c.red : c.blue, opacity: cubaTeam ? 1 : 0.28, borderColor: cubaTeam ? c.panel : "transparent", borderWidth: cubaTeam ? 1.2 : 0 },
        label: { show: cubaTeam, formatter: row.team, position: "top", color: c.ink, fontSize: 12 },
      };
    });
    machineBody.querySelector("#machine-stats").innerHTML = `<div class="cuba-mini-kpis">
      <div><b>${field.field}</b><span>equipos</span></div>
      <div><b>${field.problems}</b><span>problemas</span></div>
      <div><b>${one(field.medianSolved)}</b><span>mediana</span></div>
      <div><b>${field.top50Solved}</b><span>corte top 50</span></div>
      <div><b>${field.medalSolved}</b><span>corte medalla</span></div>
      <div><b>${field.cubaBestSolved}</b><span>mejor Cuba</span></div>
    </div>`;
    machineBody.querySelector("#machine-teams").innerHTML = cubaRows.length
      ? `<div class="cuba-machine-teams">${cubaRows.map((row) => `<a class="chip" href="${teamUrl(row.uni, row.team)}">${esc(row.team)} · ${place(row.rank)} · ${problems(row.solved)}</a>`).join("")}</div>`
      : '<p class="sub">Cuba no tuvo equipos en esta final.</p>';
    machineChart.setOption({
      xAxis: { max: field.problems + 1 },
      yAxis: { max: field.field + 2 },
      series: [{ data: points, markLine: { data: [
        { xAxis: field.top50Solved, lineStyle: { color: c.gold }, label: { formatter: "top 50", color: c.dim } },
        { xAxis: field.medalSolved, lineStyle: { color: c.red }, label: { formatter: "medalla", color: c.dim } },
      ] } }],
    });
  };
  machineBody.querySelector("#machine-year").onchange = (event) => {
    ui.year = Number(event.target.value);
    setParam("year", ui.year);
    updateMachine();
  };
  updateMachine();

  const simCounts = [...new Set(cuba.simulator.map((row) => row.solved))].sort((a, b) => a - b);
  const simBody = card(f, {
    title: "El simulador", span: 6,
    sub: "Si un equipo cubano hubiera resuelto N problemas en una final, ¿dónde habría quedado? Usa los equipos reales de esa final, no una proyección. Los puntos rojos marcan a los equipos cubanos.",
    html: `<div class="cuba-controls"><label>Año <select id="sim-year">${cuba.years.map((year) => `<option value="${year}"${year === ui.simYear ? " selected" : ""}>${year}</option>`).join("")}</select></label><label>Problemas <select id="sim-solved">${simCounts.map((value) => `<option value="${value}"${value === ui.simSolved ? " selected" : ""}>${value}</option>`).join("")}</select></label></div><div id="sim-result"></div><div id="sim-cuba"></div><div id="sim-ranges"></div>`,
  });
  simBody.classList.add("cuba-sim-card");
  const simYear = simBody.querySelector("#sim-year");
  const simSolved = simBody.querySelector("#sim-solved");
  const updateSim = () => {
    const rows = cuba.simulator.filter((row) => row.year === ui.simYear);
    if (!rows.length) return;
    const cubaRows = cuba.teams.filter((row) => row.year === ui.simYear);
    simBody.querySelector("#sim-cuba").innerHTML = cubaRows.length
      ? `<div class="cuba-sim-teams"><span class="cuba-sim-key"><i></i>Cuba en ${ui.simYear}</span>${cubaRows.map((row) => `<a class="chip" href="${teamUrl(row.uni, row.team)}">${esc(row.team)} · ${problems(row.solved)} · ${place(row.rank)}</a>`).join("")}</div>`
      : `<p class="note">Cuba no tuvo equipos en esta final.</p>`;
    const result = rows.find((row) => row.solved === ui.simSolved);
    if (result) {
      const countText = result.count === 1 ? "1 equipo resolvió" : `${result.count} equipos resolvieron`;
      const medalsText = result.medals === 1 ? "1 se llevó medalla" : `${result.medals} se llevaron medalla`;
      const top50Text = result.top50 === 1 ? "1 acabó entre los 50 primeros" : `${result.top50} acabaron entre los 50 primeros`;
      simBody.querySelector("#sim-result").innerHTML = `<div class="callout"><b>${problems(ui.simSolved)} en ${ui.simYear}</b>: un equipo habría quedado entre <b>${rangePlace(result.rankLow, result.rankHigh)}</b> (mediana ${place(result.rankMedian)}), en el percentil <b>${pct(result.pctLow)}–${pct(result.pctHigh)}</b>. Ese año, ${countText} ${ui.simSolved}; ${medalsText} y ${top50Text}.</div>`;
    } else {
      simBody.querySelector("#sim-result").innerHTML = `<div class="callout">Ningún equipo resolvió <b>${problems(ui.simSolved)}</b> en ${ui.simYear}. Prueba con otra cantidad o cambia de final.</div>`;
    }
    const min = Math.min(...rows.map((row) => row.rankLow));
    const max = Math.max(...rows.map((row) => row.rankHigh));
    const span = Math.max(1, max - min);
    simBody.querySelector("#sim-ranges").innerHTML = `<div class="cuba-ranges">${rows.map((row) => rangeRow(row, min, span, row.solved === ui.simSolved, cubaRows)).join("")}</div><p class="note">Cada barra cubre el rango real de puestos de los equipos que resolvieron ese número de problemas; el punto es la mediana. El eje va del mejor puesto (izquierda) al peor (derecha) de la final.</p>`;
  };
  simYear.onchange = (event) => {
    ui.simYear = Number(event.target.value);
    setParam("sim-year", ui.simYear);
    updateSim();
  };
  simSolved.onchange = (event) => {
    ui.simSolved = Number(event.target.value);
    setParam("sim-solved", ui.simSolved);
    updateSim();
  };
  updateSim();

  // ----------------------------------------------------------- 06 universidades
  const universities = section(view, "universidades", "06 · Universidades", "Cinco campus, un relevo",
    "La Habana no es toda Cuba: UCI, Las Villas, Oriente y Pinar también han llevado equipos. El mapa y el relevo muestran cuándo y desde dónde.");
  kpis(universities, [
    [cuba.totals.universities, "universidades"],
    [cuba.teams.filter((row) => row.uni === "universidad-de-la-habana").length, "equipos de La Habana"],
    [cuba.teams.filter((row) => row.uni !== "universidad-de-la-habana").length, "equipos del resto"],
    [cuba.universities.filter((row) => row.podiums > 0).length, "universidad con podios"],
  ]);
  const u = grid(universities);
  card(u, {
    title: "Las cinco universidades", span: 12,
    html: `<div class="cuba-uni-grid">${cuba.universities.map((row) => `<article class="cuba-uni">
      <div class="cuba-uni-top">${crest(row.name, 38)}<div><b><a href="${uniUrl(row.id)}">${esc(row.name)}</a></b><small>${row.first}–${row.last} · ${teamWord(row.teams)} · ${plural(row.years.length, "final", "finales")}</small></div></div>
      <div class="cuba-uni-stats"><span><b>${place(row.bestRank)}</b> mejor puesto</span><span><b>${pct(row.avgPct)}</b> percentil medio</span><span><b>${row.podiums}</b> podios</span><span><b>${row.medals}</b> medallas</span></div>
      <p class="note">Mejor resultado: ${row.bestYear}, ${esc(row.bestTeam)}.</p>
    </article>`).join("")}</div>`,
  });

  const provinceTeams = new Map();
  for (const row of cuba.universities) {
    if (row.province) provinceTeams.set(row.province, (provinceTeams.get(row.province) ?? 0) + row.teams);
  }
  const maxProvinceTeams = Math.max(1, ...provinceTeams.values());
  const provinceColor = (value) => {
    const t = Math.sqrt(value / maxProvinceTeams);
    return isDark() ? `rgba(253,184,48,${0.12 + 0.34 * t})` : `rgba(109,34,46,${0.14 + 0.24 * t})`;
  };
  const provinceRegions = [...provinceTeams].map(([name, teams]) => ({
    name,
    itemStyle: { areaColor: provinceColor(teams), borderColor: isDark() ? "#2b0d12" : "#fbf4e4", borderWidth: 0.7 },
  }));
  const mapBody = card(u, {
    title: "El mapa del relevo", span: 12,
    sub: "Las cinco sedes y las cuatro provincias que han llevado equipos a una final. El punto marca la universidad; el color de la provincia, su peso.",
    html: `<div id="cuba-map" class="plot cuba-map"></div><div class="legend"><span><i style="background:${provinceColor(maxProvinceTeams)}"></i>más equipos</span><span><i style="background:${provinceColor(1)}"></i>menos equipos</span><span><i style="background:${c.land}"></i>sin equipos</span></div><p class="note">Geometrías provinciales: <a href="https://github.com/yudivian/cuba-geojsons">cuba-geojsons</a> (MIT). La Habana (UH y UCI), Villa Clara, Pinar del Río y Santiago de Cuba son las cuatro provincias con equipos finalistas. Las coordenadas de las sedes son aproximadas.</p>`,
  });
  echarts.registerMap("cuba-provinces", cubaMap);
  plot(mapBody.querySelector("#cuba-map"), {
    legend: false,
    geo: {
      map: "cuba-provinces", left: 6, right: 6, top: 6, bottom: 6, aspectScale: 1,
      roam: false, silent: true,
      itemStyle: { areaColor: c.land, borderColor: c.panel, borderWidth: 0.8 },
      emphasis: { disabled: true }, select: { disabled: true },
      regions: provinceRegions,
    },
    tooltip: {
      formatter: (p) => `<b>${esc(p.data.fullName)}</b><br>${p.data.teams} equipos · ${p.data.podiums} podios latinoamericanos<br>Mejor puesto: ${place(p.data.bestRank)} (${p.data.bestYear})`,
    },
    series: [{
      type: "scatter", coordinateSystem: "geo", symbolSize: (value) => 9 + Math.sqrt(value[2]) * 3.5,
      data: cuba.universities.filter((row) => row.point).map((row) => ({
        name: shortUni(row.name), fullName: row.name, teams: row.teams, podiums: row.podiums, bestRank: row.bestRank, bestYear: row.bestYear,
        value: [...row.point, row.teams],
        itemStyle: { color: row.podiums ? c.accent : c.blue, borderColor: c.panel, borderWidth: 2 },
        label: {
          show: true, formatter: shortUni(row.name), position: row.name.includes("La Habana") ? "top" : row.name.includes("Ciencias") ? "bottom" : row.name.includes("Pinar") ? "left" : "right",
          color: c.ink, fontSize: 12, fontWeight: 600, textBorderColor: c.panel, textBorderWidth: 3,
        },
      })),
    }],
  });

  const relay = cuba.relay;
  const relayColor = (count) => (count ? (isDark() ? `rgba(253,184,48,${0.22 + count * 0.22})` : `rgba(109,34,46,${0.14 + count * 0.2})`) : "");
  const relayInk = (count) => (count ? (isDark() ? "#2b0d12" : "#fbf4e4") : "var(--dim)");
  const relayCard = card(u, {
    title: "El relevo, año por año", span: 8,
    sub: "Equipos por universidad en cada final. La Habana aparece en 13 de 16 años; el resto se reparte en relevos más cortos.",
    html: `<div class="tablew cuba-relay-wrap"><table class="heat cuba-relay"><thead><tr><th></th>${relay.years.map((year) => `<th>${String(year).slice(2)}</th>`).join("")}</tr></thead><tbody>${relay.universities.map((row) => `<tr><th class="u"><a href="${uniUrl(row.id)}">${esc(shortUni(row.name))}</a></th>${row.counts.map((count) => `<td class="c${count ? "" : " empty"}"${count ? ` style="background:${relayColor(count)};color:${relayInk(count)}"` : ""}>${count || ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="legend"><span><i style="background:${relayColor(1)}"></i>1 equipo</span><span><i style="background:${relayColor(2)}"></i>2 equipos</span><span><i style="background:${relayColor(3)}"></i>3 equipos</span></div><p class="note">La Habana: 13 equipos. Oriente: 6. UCI: 4. Las Villas: 2. Pinar del Río: 1. En 2018 coincidieron tres universidades distintas, el máximo de la serie.</p>`,
  });
  relayCard.closest(".card")?.classList.add("cuba-relay-card");
  const relayNote = card(u, {
    title: "Lectura del relevo", span: 4,
    html: `<ul class="cuba-facts">
      <li><b>La Habana:</b> 13 equipos en 13 de 16 finales; concentra exactamente la mitad de la delegación.</li>
      <li><b>Oriente:</b> 6 equipos en 6 finales (2014–2020, sin 2017).</li>
      <li><b>UCI:</b> 4 equipos (2011, 2013, 2021 y 2022).</li>
      <li><b>Las Villas:</b> 2 equipos; <b>Pinar del Río:</b> 1, en 2018.</li>
      <li><b>2018:</b> único año con tres universidades distintas: UCLV, Oriente y Pinar.</li>
      <li><b>Sin La Habana:</b> 2010, 2014 y 2018.</li>
    </ul>`,
  });
  relayNote.closest(".card")?.classList.add("cuba-relay-note-card", "cuba-aside");

  // --------------------------------------------------------------- 07 personas
  const people = section(view, "personas", "07 · Personas", "Cincuenta y siete nombres",
    "Cuba ha llevado 57 personas distintas. 21 repitieron; nadie llegó a tres finales. La experiencia se nota, aunque la muestra es pequeña.");
  kpis(people, [
    [cuba.people.total, "personas"],
    [cuba.people.repeaters, "repitieron"],
    [cuba.people.threePlus, "llegaron a 3+ finales"],
    [one(cuba.people.meanFinals, 2), "finales por persona"],
  ]);
  const pe = grid(people);
  plot(chartCard(pe, {
    title: "Nuevos y repetidores", span: 6, height: 300,
    sub: "Personas que debutaron y apariciones de quienes ya habían competido, por final.",
  }), {
    tooltip: { trigger: "axis" },
    legend: { data: ["Debutantes", "Apariciones de repetidores"] },
    xAxis: categoryAxis(cuba.years.map(String), { boundaryGap: false }),
    yAxis: valueAxis({ min: 0, max: 8, name: "Personas", nameTextStyle: { color: c.dim } }),
    series: [
      { name: "Debutantes", type: "bar", data: cuba.people.newByYear, barMaxWidth: 22, itemStyle: { color: c.blue, borderRadius: [3, 3, 0, 0] } },
      { name: "Apariciones de repetidores", type: "bar", data: cuba.people.repeatByYear, barMaxWidth: 22, itemStyle: { color: c.accent, borderRadius: [3, 3, 0, 0] } },
    ],
  });

  plot(chartCard(pe, {
    title: "El efecto experiencia", span: 6, height: 300,
    sub: "Percentil medio según cuántos miembros del equipo ya habían competido antes. Es una asociación, no una prueba de causa; Cuba no tuvo equipos con 3 veteranos.",
  }), {
    tooltip: { trigger: "axis" },
    legend: { data: ["Mundo", "Cuba"] },
    xAxis: categoryAxis(["0 veteranos", "1 veterano", "2 veteranos", "3 veteranos"]),
    yAxis: valueAxis({ min: 0, max: 100, name: "Percentil medio", nameTextStyle: { color: c.dim } }),
    series: [
      { name: "Mundo", type: "bar", data: cuba.experience.global.map((row) => row.meanPct), barMaxWidth: 26, itemStyle: { color: c.blue, opacity: 0.65 }, label: { show: true, position: "top", color: c.dim, fontSize: 11 } },
      { name: "Cuba", type: "bar", data: cuba.experience.cuba.map((row) => row.meanPct), barMaxWidth: 26, itemStyle: { color: c.accent }, label: { show: true, position: "top", color: c.ink, fontSize: 11, formatter: (p) => (p.value == null ? "sin datos" : one(p.value)) } },
    ],
  });

  const repeaters = card(pe, {
    title: "Quienes repitieron", span: 7,
    sub: "21 personas jugaron dos finales; ninguna jugó tres. La tabla está ordenada por nombre.",
    html: table(["Persona", { label: "Finales", num: true }, "Años", "Universidad", { label: "Mejor puesto", num: true }], cuba.people.repeatersList.map((row) => [
      `<a href="${personUrl(row.id)}">${esc(row.name)}</a>`, row.finals, row.years.join(" · "), row.unis.map((name) => esc(name)).join(" · "), place(row.bestRank),
    ])),
  });
  repeaters.querySelector(".tablew")?.style.setProperty("--table-h", "430px");
  card(pe, {
    title: "De dónde salen", span: 5,
    sub: "Personas, repetidores y plazas por universidad.",
    html: table(["Universidad", { label: "Personas", num: true }, { label: "Repiten", num: true }, { label: "Plazas", num: true }], cuba.people.byUniversity.map((row) => [
      `<a href="${uniUrl(row.id)}">${esc(shortUni(row.name))}</a>`, row.people, row.repeaters, row.slots,
    ])) + `<p class="note">La Habana aporta 26 de las 57 personas y 39 de las 78 plazas. UCI tiene la mayor proporción de debutantes: 8 de sus 10 personas jugaron una sola final.</p>`,
  });

  // ---------------------------------------------------------------- 08 género
  const gender = section(view, "genero", "08 · Género", "Cuatro mujeres en el agregado",
    "Publicamos solo agregados: 4 mujeres y 53 hombres entre las 57 personas cubanas. El detalle individual no se sirve en los datos del sitio.");
  kpis(gender, [
    [cuba.gender.women, "mujeres"],
    [cuba.gender.men, "hombres"],
    [pct((100 * cuba.gender.women) / cuba.gender.coverage.total), "de las personas son mujeres"],
    [`${cuba.gender.womenSlots}/${cuba.totals.slots}`, "plazas ocupadas por mujeres"],
    [`${cuba.gender.teamsWithWomen}/${cuba.totals.teams}`, "equipos con al menos una mujer"],
    [cuba.gender.teamsTwoPlus, "equipos con 2+"],
  ]);
  const g = grid(gender);
  plot(chartCard(g, {
    title: "Mujeres por final", span: 6, height: 300,
    sub: "Apariciones de mujeres y equipos con al menos una mujer. La serie no tiene mujeres en 2023, 2024 ni 2025.",
  }), {
    tooltip: { trigger: "axis" },
    legend: { data: ["Mujeres en la delegación", "Equipos con al menos una mujer"] },
    xAxis: categoryAxis(cuba.years.map(String)),
    yAxis: valueAxis({ min: 0, max: 3, name: "Cantidad", nameTextStyle: { color: c.dim } }),
    series: [
      { name: "Mujeres en la delegación", type: "bar", data: cuba.gender.timeline.map((row) => row.women), barMaxWidth: 22, itemStyle: { color: c.accent, borderRadius: [3, 3, 0, 0] }, label: { show: true, position: "top", color: c.ink, formatter: (p) => (p.value ? p.value : "") } },
      { name: "Equipos con al menos una mujer", type: "line", data: cuba.gender.timeline.map((row) => row.teams), symbolSize: 6, lineStyle: { width: 2, type: "dashed", color: c.blue }, itemStyle: { color: c.blue } },
    ],
  });
  donut(chartCard(g, {
    title: "Composición de los equipos", span: 6, height: 300,
    sub: "21 equipos sin mujeres, 5 con una mujer; ninguno con dos o más.",
  }), [
    { name: "Sin mujeres", value: 21 },
    { name: "Una mujer", value: 5 },
  ], { center: String(cuba.totals.teams) });
  const shareCell = (part, total) => `${part} <small>${pct((100 * part) / total)}</small>`;
  const finalsWithWomen = cuba.gender.timeline.filter((row) => row.women > 0).length;
  card(g, {
    title: "Mujeres sobre el total", span: 6,
    sub: "Peso de las mujeres en personas y plazas, y presencia de al menos una mujer en equipos, universidades y finales.",
    html: table(["Grupo", { label: "Total", num: true }, "Mujeres / con mujeres", "Sin mujeres"], [
      ["Personas", cuba.people.total, shareCell(cuba.gender.women, cuba.people.total), shareCell(cuba.gender.men, cuba.people.total)],
      ["Plazas", cuba.totals.slots, shareCell(cuba.gender.womenSlots, cuba.totals.slots), shareCell(cuba.gender.menSlots, cuba.totals.slots)],
      ["Equipos", cuba.totals.teams, shareCell(cuba.gender.teamsWithWomen, cuba.totals.teams), shareCell(cuba.totals.teams - cuba.gender.teamsWithWomen, cuba.totals.teams)],
      ["Universidades", cuba.totals.universities, shareCell(cuba.gender.universities, cuba.totals.universities), shareCell(cuba.totals.universities - cuba.gender.universities, cuba.totals.universities)],
      ["Finales", cuba.totals.editions, shareCell(finalsWithWomen, cuba.totals.editions), shareCell(cuba.totals.editions - finalsWithWomen, cuba.totals.editions)],
    ]) + `<p class="note">En equipos, universidades y finales, «con mujeres» significa al menos una mujer. En personas y plazas, «sin mujeres» son los hombres. La tabla mide presencia, no volumen.</p>`,
  });
  card(g, {
    title: "Por universidad", span: 6,
    sub: "Solo universidades con al menos una plaza ocupada por una mujer.",
    html: table(["Universidad", { label: "Mujeres", num: true }, { label: "Plazas", num: true }], cuba.gender.byUniversity.map((row) => [
      `<a href="${uniUrl(row.id)}">${esc(shortUni(row.name))}</a>`, row.people, row.slots,
    ])) + `<p class="note">UCI: 2 mujeres en 2 plazas. Oriente: 1 mujer en 2 plazas. La Habana: 1 mujer en 1 plaza.</p>`,
  });
  card(g, {
    title: "Cómo leerlo", span: 6,
    html: `<ul class="cuba-facts">
      <li>Primera mujer en una final cubana: <b>${cuba.gender.firstYear}</b>. Última: <b>${cuba.gender.lastYear}</b>.</li>
      <li><b>${cuba.gender.yearsWithout}</b> de 16 finales sin mujeres; el hueco más largo duró <b>${cuba.gender.longestGap}</b> años (2010–2015).</li>
      <li>Sin mujeres en <b>2023, 2024 y 2025</b>: el hueco abierto más reciente.</li>
      <li>El mejor equipo con una mujer fue <b>2022 UH++</b>: ${place(cuba.gender.bestTeam.rank)} de ${cuba.gender.bestTeam.field}, ${pct(cuba.gender.bestTeam.pct)}.</li>
      <li>Cobertura del dato: <b>${cuba.gender.coverage.known}/${cuba.gender.coverage.total}</b> personas.</li>
    </ul>`,
  });
  card(g, {
    title: "Privacidad del dato", span: 6,
    html: `<div class="callout">El género se publica solo en agregado. El archivo curado con la clasificación individual (57 filas) vive en <code>data/curated/cuba-gender.csv</code> y <b>no</b> se copia a <code>site/data</code>. Esta página no asocia nombres a género; solo cuenta.</div>`,
  });

  // ----------------------------------------------------------------- 09 futuro
  const future = section(view, "futuro", "09 · Futuro", "Lo que se puede esperar de 2026",
    "Una proyección, no una promesa: la Universidad de La Habana aparece en el campo previsto con UH Pop.");
  const projection = cuba.projection;
  const country = projection.country;
  const chanceAt = (wanted) => country.chances[projection.places.indexOf(wanted)] ?? null;
  const futureGrid = grid(future);
  card(futureGrid, {
    title: "La proyección de Cuba", span: 12,
    html: `<div class="chance-cards">
      <div><b>${country.rank}</b>puesto central<br><small>${country.rank_best}–${country.rank_worst} en la mitad de las simulaciones</small></div>
      <div><b>${pct(country.pct)}</b>percentil central<br><small>${pct(country.low)}–${pct(country.high)}</small></div>
      <div><b>${pct(chanceAt(12) * 100, 1)}</b>top 12<br><small>medalla o diploma</small></div>
      <div><b>${pct(chanceAt(50) * 100, 2)}</b>top 50<br><small>${projection.field} equipos previstos</small></div>
      <div><b>${pct(chanceAt(100) * 100, 1)}</b>top 100<br><small>la apuesta más probable</small></div>
      <div><b>${projection.teams[0]?.rating ?? "—"}</b>rating del equipo<br><small>${esc(projection.teams[0]?.team ?? "UH Pop")}</small></div>
    </div><p class="note">Proyección para ${projection.year} con ${projection.field} equipos. El equipo listado es <b>${esc(projection.teams[0]?.team ?? "UH Pop")}</b>, de la Universidad de La Habana. La plaza es firme; la incertidumbre está en el resultado.</p>`,
  });
  plot(chartCard(futureGrid, {
    title: "Probabilidad acumulada por puesto", span: 6, height: 300,
    sub: "Probabilidad de quedar entre los primeros N equipos, según el modelo. El eje vertical es el porcentaje.",
  }), {
    legend: false,
    grid: { left: 8, right: 18, top: 26, bottom: 30, containLabel: true },
    tooltip: { trigger: "axis", valueFormatter: (value) => `${one(value, 1)}%` },
    xAxis: categoryAxis(projection.places.map((value) => `≤${value}`)),
    yAxis: valueAxis({ min: 0, max: 60, name: "%", nameTextStyle: { color: c.dim } }),
    series: [{
      type: "line", smooth: 0.25, symbolSize: 7, data: country.chances.map((value) => value * 100),
      lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent }, areaStyle: { color: c.accent, opacity: 0.12 },
      label: { show: true, position: "top", color: c.dim, fontSize: 10, formatter: (p) => (p.value >= 1 ? `${one(p.value, 0)}%` : "") },
    }],
  });

  const scenarios = cuba.scenarios.rows;
  plot(chartCard(futureGrid, {
    title: "Qué compra cada problema", span: 6, height: 300,
    sub: "Puesto mediano de los equipos que resolvieron cada cantidad en las finales 2021–2025. No es una promesa para 2026.",
  }), {
    legend: false,
    grid: { left: 8, right: 18, top: 26, bottom: 30, containLabel: true },
    tooltip: {
      formatter: (p) => {
        const row = scenarios[p.dataIndex];
        return `<b>${row.solved} problemas</b><br>Puesto mediano: ${place(row.rankMedian)}<br>Rango: ${place(row.rankLow)}–${place(row.rankHigh)}<br>Percentil mediano: ${pct(row.pctMedian)}<br>${row.medals} medallas en ${row.teams} equipos`;
      },
    },
    xAxis: categoryAxis(scenarios.map((row) => `${row.solved} prob.`)),
    yAxis: valueAxis({ inverse: true, min: 0, max: 150 }),
    series: [{
      type: "bar", barMaxWidth: 34, data: scenarios.map((row) => ({ value: row.rankMedian, itemStyle: { color: row.solved >= 7 ? c.gold : row.solved === 6 ? c.accent : c.blue, opacity: 0.85, borderRadius: [3, 3, 0, 0] } })),
      label: { show: true, position: "bottom", color: c.ink, formatter: (p) => place(p.value) },
    }],
  });

  card(futureGrid, {
    title: "La letra pequeña", span: 12,
    html: `<div class="cuba-two-col"><div class="prose"><p><b>El modelo</b> usa los resultados anteriores, los ratings de los equipos y el tamaño del campo. En el backtest con plantillas, acierta el <b>${pct(projection.backtest.champion * 100, 1)}</b> de los campeones; su Brier de medalla es <b>${one(projection.backtest.medal_brier, 4)}</b> y su correlación de puestos, <b>${one(projection.backtest.spearman, 3)}</b>.</p>
      <p>No sabe de visados, lesiones, cambios de último minuto ni de la forma real de un equipo en el día de la final. La incertidumbre se publica como intervalo, no como certeza. <a href="predicciones.html">Ver el modelo completo</a>.</p></div>
      <div><p class="note">Países con una trayectoria parecida a la cubana en el modelo:</p><div class="chips">${projection.similar.map((row) => `<a class="chip" href="${countryUrl(row.country)}">${esc(row.es)}</a>`).join("")}</div><p class="note">Cuba llega con un solo equipo previsto. En 2026, como en siete de las 16 finales, la historia cubana se juega en una sola formación.</p></div></div>`,
  });

  // ------------------------------------------------------------------ 10 álbum
  const album = section(view, "album", "10 · Álbum", "Veintiséis equipos, uno por uno",
    "La ficha de cada equipo y las tres personas que lo formaron. Los nombres enlazan a cada competidor; los escudos, a su universidad.");
  const al = grid(album);
  card(al, {
    title: "El álbum completo", span: 12,
    sub: "Una ficha por equipo, en orden cronológico. El puesto y los problemas son los de la final; el podio latinoamericano se marca cuando corresponde.",
    html: `<div class="cuba-album">${cuba.teams.map(teamCard).join("")}</div>`,
  });

  // ----------------------------------------------------------------- 11 método
  const method = section(view, "metodo", "11 · Método", "Qué se puede afirmar y qué no",
    "Las definiciones que sostienen la página, las fuentes y los límites de cada lectura.");
  const m = grid(method);
  card(m, {
    title: "La serie", span: 6,
    html: `<div class="prose"><p>Se cuentan las finales de <b>2010 a 2025</b>: 16 ediciones. La serie regular empieza en 2010, no el debut de Cuba. Las filas marcadas como <code>qualified</code> no tienen puesto y no se cuentan como final: por eso la clasificación de Pinar del Río en 2017 no suma un equipo a los 26.</p>
      <p>En 2018 Cuba tuvo tres equipos porque Pinar del Río clasificó en 2017 pero no pudo viajar por el visado; el equipo compitió en 2018. La Habana no estuvo en 2010, 2014 ni 2018. El relato del visado es del equipo del proyecto; la fuente solo conserva la clasificación sin puesto.</p></div>`,
  });
  card(m, {
    title: "El podio por país", span: 6,
    html: `<div class="prose"><p>El podio latinoamericano no es un premio oficial del ICPC. Es una <b>reagregación</b>: en cada final se toma el mejor equipo de cada país de la región, se ordenan por percentil y se queda un podio de tres. Cuba suma 5 puestos en 16 ediciones: es 4.ª de los 7 países que han subido al podio (11 han tenido equipos).</p>
      <p>La tabla por universidad que ya publica <a href="regiones.html?podio=la">Regiones</a> es la otra cara del mismo dato. Allí se ve qué universidad ocupó cada puesto; aquí, qué país.</p></div>`,
  });
  card(m, {
    title: "Tiempo y desempate", span: 6,
    html: `<div class="prose"><p>Dentro del grupo que resolvió la misma cantidad de problemas, el tiempo ordena. El <b>percentil de tiempo</b> va de 0 (el más lento del grupo) a 100 (el más rápido). No cambia el puesto mundial, pero explica por qué dos equipos con los mismos problemas pueden acabar en puestos distintos.</p>
      <p>El mejor percentil de tiempo de Cuba es <b>2018 KFP</b>: 2.º de 25 equipos con 3 problemas (95,8). El peor entre los que resolvieron 3 o más es <b>2015 UH++</b>: 13.º de 14 (7,7).</p></div>`,
  });
  card(m, {
    title: "Género", span: 6,
    html: `<div class="prose"><p>El género se publica solo en agregado. La clasificación individual vive en <code>data/curated/cuba-gender.csv</code>, fuera de <code>site/data</code>; la página no asocia nombres a género. La cobertura es <b>${cuba.gender.coverage.known}/${cuba.gender.coverage.total}</b> personas.</p>
      <p>Con 4 mujeres y 53 hombres, cualquier porcentaje tiene un denominador pequeño. Los agregados describen la delegación; no explican por sí solos por qué hay tan pocas mujeres en las finales.</p></div>`,
  });
  card(m, {
    title: "Proyección", span: 6,
    html: `<div class="prose"><p>La proyección de 2026 es una simulación, no un pronóstico periodístico. Usa el campo previsto de <b>${projection.field}</b> equipos y los ratings disponibles. El intervalo central (${country.rank_best}–${country.rank_worst}) contiene la mitad de las simulaciones; los extremos son posibles.</p>
      <p>El backtest se publica para que se pueda discutir el método, no para convertirlo en una certeza. <a href="datos.html">Ver fuentes y método</a>.</p></div>`,
  });
  card(m, {
    title: "Descargas", span: 6,
    html: `<ul class="cuba-downloads">
      <li><a href="data/cuba.csv">cuba.csv</a><span>26 filas, una por equipo y final.</span></li>
      <li><a href="data/cuba.json">cuba.json</a><span>El corte completo: campo, podios, personas, género agregado y proyección.</span></li>
      <li><a href="data/cuba-map.json">cuba-map.json</a><span>Las 16 provincias del mapa, de cuba-geojsons.</span></li>
      <li><a href="cuba.html.md">cuba.html.md</a><span>La versión Markdown de esta página.</span></li>
      <li><a href="data/results.csv">results.csv</a><span>Todos los resultados de todas las finales.</span></li>
    </ul>`,
  });
  card(m, {
    title: "Lo que no se puede afirmar", span: 12,
    html: `<div class="prose cuba-wide"><p>La página no demuestra que La Habana sea la causa del rendimiento cubano, ni que la experiencia sea la causa de los mejores percentiles, ni que el visado explique por sí solo la ausencia de Pinar en 2017. Son asociaciones y hechos documentados, con muestras pequeñas. El mapa usa geometrías provinciales de cuba-geojsons (MIT) y coordenadas aproximadas de las sedes. El podio latinoamericano es una construcción analítica, no un premio del ICPC.</p>
      <p>Los datos de resultados y medallas vienen de <a href="https://www.cphof.org/">cphof.org</a> y se contrastan con <a href="https://icpc.global/worldfinals/results">icpc.global</a> cuando publica la final. Regiones, nombres en español y el catálogo de análisis vienen de <a href="https://github.com/yudivian/icpc">yudivian/icpc</a> (Apache-2.0).</p></div>`,
  });
}

startPage({
  page: "cuba",
  title: "Cuba",
  subtitle: "Dieciséis finales, veintiséis equipos y un podio mundial que todavía no llega.",
  render(view, data) {
    const token = ++renderToken;
    cubaPromise ??= Promise.all(["cuba.json", "cuba-map.json"].map((name) => fetch(`data/${name}`).then((response) => {
      if (!response.ok) throw new Error(`${name}: ${response.status}`);
      return response.json();
    }))).then(([cuba, cubaMap]) => ({ cuba, cubaMap }));
    cubaPromise
      .then((payload) => { if (token === renderToken) draw(view, data, payload.cuba, payload.cubaMap); })
      .catch((error) => {
        if (token !== renderToken) return;
        console.error(error);
        view.insertAdjacentHTML("beforeend", '<div class="card"><h2>No se pudo cargar Cuba</h2><p class="sub">Los archivos <code>data/cuba.json</code> y <code>data/cuba-map.json</code> no están disponibles. Ejecuta <code>make data</code> y recarga.</p></div>');
      });
  },
});
