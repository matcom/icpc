// Sedes: where the World Finals were played and how the host country did.
import { REGION_COLORS, countryUrl, esc, teamUrl, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, rankBars, valueAxis } from "../charts.js";
import { card, chartCard, grid, kpis, startPage, table } from "../shell.js";

/* global echarts */

const one = (value, digits = 1) => (value == null ? "—" : Number(value).toFixed(digits).replace(".", ","));
const place = (value) => (value == null ? "—" : `${Math.round(value)}.º`);
const signed = (value) => {
  if (value == null) return "—";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${one(Math.abs(value))}`;
};

const projectNE = ([lon, lat]) => {
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const l2 = phi * phi;
  const l4 = l2 * l2;
  return [
    lambda * (0.8707 - 0.131979 * l2 + l4 * (-0.013791 + l4 * (0.003971 * l2 - 0.001529 * l4))),
    -phi * (1.007226 + l2 * (0.015085 + l4 * (-0.044475 + 0.028874 * l2 - 0.005916 * l4))),
  ];
};
const projection = { project: projectNE, unproject: ([x, y]) => [(x * 180) / Math.PI / 0.8707, (-y * 180) / Math.PI] };

let sedesPromise = null;
let renderToken = 0;

function draw(view, data, sedes) {
  document.title = "Sedes · Observatorio ICPC";
  view.querySelector("#sedes-loading")?.remove();
  const c = colors();
  const finals = sedes.finals;
  const totals = sedes.totals;
  const hostCountries = sedes.countries;
  const hostUniFinals = finals.filter((row) => row.hostUniversity?.competed);

  const hero = document.createElement("div");
  hero.className = "cuba-hero";
  hero.innerHTML = `<p class="cuba-lead">El Mundial ha pasado por <b>${totals.cities} ciudades</b> de <b>${totals.countries} países</b>. Estados Unidos ha sido la sede más frecuente (<b>${totals.mostHostedCountry.finals} finales</b>); China y Rusia, tres cada uno. En la serie 1999–2025 <b>no hubo una final en América Latina</b>. La sede no garantiza el título: solo <b>${totals.hostCountryChampions} de ${totals.finals}</b> campeones eran del país anfitrión.</p>
    <div class="cuba-hero-note"><span>Una lectura de las finales, no de un país.</span> Ciudades, rotación, ventaja local y universidades que organizaron.</div>`;
  view.append(hero);

  const heroKpis = kpis(view, [
    [totals.finals, "finales, 1999–2025"],
    [totals.cities, "ciudades"],
    [totals.countries, "países anfitriones"],
    [totals.regions, "regiones"],
    [totals.mostHostedCountry.finals, "finales en Estados Unidos"],
    [totals.latamHosts, "finales en América Latina"],
    [totals.hostCountryChampions, "campeones locales"],
    [totals.hostUniversityFinals, "universidades anfitrionas que compitieron"],
  ]);
  heroKpis.classList.add("sedes-kpis");

  // ------------------------------------------------------------------- map
  const mapCard = card(view, {
    title: "El mapa de las finales", span: 12,
    sub: "Cada punto es una final. El color indica la región anfitriona; Orlando y Luxor aparecen dos veces.",
    html: `<div id="sedes-map" class="plot sedes-map"></div><div class="legend" id="sedes-map-legend"></div><p class="note">La ciudad de 2007 fue Urayasu, en el área de Tokio, donde está el Tokyo Bay Hilton. Las coordenadas son aproximadas.</p>`,
  });
  const regiones = [...new Set(finals.map((row) => row.region))];
  mapCard.querySelector("#sedes-map-legend").innerHTML = regiones.map((region) => `<span><i style="background:${REGION_COLORS[region] ?? c.gold}"></i>${esc(data.regions[region] ?? region)}</span>`).join("");
  echarts.registerMap("world", data.world);
  plot(mapCard.querySelector("#sedes-map"), {
    legend: false,
    tooltip: {
      formatter: (p) => {
        const row = p.data;
        const champ = row.champion ? `<br>Campeón: <b>${esc(row.champion.uniName)}</b>` : "";
        return `<b>${row.year} · ${esc(row.city)}</b><br>${esc(row.es)} · ${esc(row.host || "—")}<br>${row.teams} equipos · ${row.countries} países${champ}`;
      },
    },
    geo: {
      map: "world", projection, roam: false, top: 4, bottom: 8, left: 4, right: 4,
      itemStyle: { areaColor: c.land, borderColor: c.panel, borderWidth: 0.6 },
      emphasis: { disabled: true }, select: { disabled: true },
    },
    series: [{
      type: "scatter", coordinateSystem: "geo", symbolSize: 9,
      data: finals.map((row) => ({
        name: row.city, year: row.year, city: row.city, es: row.es, region: row.region,
        host: row.host, teams: row.teams, countries: row.countries, champion: row.champion,
        value: [row.lon, row.lat],
        itemStyle: { color: REGION_COLORS[row.region] ?? c.gold, borderColor: c.panel, borderWidth: 1.2 },
        label: { show: totals.repeatCities.includes(row.city), formatter: row.city, position: "top", color: c.ink, fontSize: 11, textBorderColor: c.panel, textBorderWidth: 2 },
      })),
    }],
  });

  // -------------------------------------------------------------- rotation
  const rot = grid(view);
  rankBars(chartCard(rot, {
    title: "Países que han sido sede", span: 6, height: 390,
    sub: "Finales organizadas por cada país entre 1999 y 2025. Estados Unidos concentra seis; China y Rusia, tres.",
  }), hostCountries.map((row) => ({ label: row.es, value: row.hosted, url: countryUrl(row.country) })), { format: (value) => value, color: c.accent });

  const regionCounts = new Map();
  for (const row of finals) regionCounts.set(row.region, (regionCounts.get(row.region) ?? 0) + 1);
  donut(chartCard(rot, {
    title: "Finales por región anfitriona", span: 6, height: 390,
    sub: "Siete regiones han albergado al menos una final. América Latina no aparece.",
  }), [...regionCounts].map(([region, value]) => ({
    name: data.regions[region] ?? region, value, itemStyle: { color: REGION_COLORS[region] ?? c.gold },
  })), { center: String(totals.finals) });

  // ------------------------------------------------------------------ home
  const home = grid(view);
  const homeRows = hostCountries.filter((row) => row.home.meanPct != null && row.away.meanPct != null);
  const labelSet = new Set(["United States", "Russia", "China", "Canada", "Poland"]);
  plot(chartCard(home, {
    title: "¿Se juega mejor en casa?", span: 6, height: 350,
    sub: "Percentil medio del país anfitrión en las finales que organizó (vertical) frente a las que no (horizontal). Por encima de la diagonal, mejor en casa.",
  }), {
    legend: false,
    grid: { left: 8, right: 28, top: 28, bottom: 36, containLabel: true },
    tooltip: {
      formatter: (p) => {
        const row = p.data;
        return `<b>${esc(row.es)}</b><br>${row.hosted} finales como sede<br>En casa: ${one(row.home.meanPct)} (${row.home.teams} equipos)<br>Fuera: ${one(row.away.meanPct)} (${row.away.teams} equipos)<br>Diferencia: ${signed(row.deltaPct)}`;
      },
    },
    xAxis: valueAxis({ min: 0, max: 100, name: "Percentil medio fuera", nameLocation: "middle", nameGap: 26 }),
    yAxis: valueAxis({ min: 0, max: 100, name: "Percentil medio en casa", nameTextStyle: { color: c.dim } }),
    series: [{
      type: "scatter",
      symbolSize: (value) => 7 + value[2] * 3,
      data: homeRows.map((row) => ({
        name: row.es, es: row.es, country: row.country, hosted: row.hosted,
        home: row.home, away: row.away, deltaPct: row.deltaPct,
        value: [row.away.meanPct, row.home.meanPct, row.hosted],
        itemStyle: { color: REGION_COLORS[row.region] ?? c.gold, opacity: 0.82, borderColor: c.panel, borderWidth: 1 },
        label: {
          show: labelSet.has(row.country), formatter: row.es,
          position: row.country === "United States" ? "right" : row.country === "China" ? "right" : row.country === "Canada" ? "left" : row.country === "Poland" ? "left" : "top",
          color: c.ink, fontSize: 11,
        },
      })),
      markLine: { silent: true, symbol: "none", lineStyle: { color: c.dim, type: "dashed" }, label: { show: false }, data: [[{ coord: [0, 0] }, { coord: [100, 100] }]] },
    }],
  });

  const reading = card(home, {
    title: "Lectura", span: 6,
    html: `<ul class="cuba-facts">
      <li>Solo <b>${totals.homeBetter} de ${hostCountries.length}</b> países mejoraron su percentil medio en casa.</li>
      <li><b>Rusia</b> (${signed(hostCountries.find((row) => row.country === "Russia")?.deltaPct)}) y <b>Kazajistán</b> (${signed(hostCountries.find((row) => row.country === "Kazakhstan")?.deltaPct)}) son las excepciones.</li>
      <li><b>Estados Unidos</b> (${signed(hostCountries.find((row) => row.country === "United States")?.deltaPct)}) y <b>Suecia</b> (${signed(hostCountries.find((row) => row.country === "Sweden")?.deltaPct)}) rindieron peor en casa.</li>
      <li>Rusia ganó <b>3 de sus 3</b> finales en casa; China, <b>2 de 3</b>.</li>
      <li>La universidad anfitriona subió al podio en <b>${totals.hostUniversityPodiums} de ${hostUniFinals.length}</b> finales.</li>
      <li>El anfitrión suele tener más plazas; la comparación es descriptiva, no causal.</li>
    </ul>`,
  });
  reading.closest(".card")?.classList.add("cuba-aside");
  const homeBody = card(home, {
    title: "En casa y fuera", span: 12,
    sub: "Percentil medio de los equipos de cada país anfitrión. La diferencia es casa menos fuera.",
    html: table([
      "País", { label: "Sedes", num: true }, { label: "Equipos casa", num: true }, { label: "Perc. casa", num: true },
      { label: "Perc. fuera", num: true }, { label: "Diferencia", num: true }, { label: "Medallas casa", num: true },
    ], hostCountries.map((row) => [
      `<a href="${countryUrl(row.country)}">${esc(row.es)}</a>`, row.hosted, row.home.teams, one(row.home.meanPct),
      one(row.away.meanPct), signed(row.deltaPct), row.home.medals,
    ])) + `<p class="note">Solo ${totals.homeBetter} de ${hostCountries.length} países mejoraron su percentil medio en casa. Es descriptivo, no causal: el anfitrión suele tener más plazas y la muestra es pequeña.</p>`,
  });
  homeBody.querySelector(".tablew")?.style.setProperty("--table-h", "420px");

  const hostUniBody = card(home, {
    title: "La universidad que organiza", span: 12,
    sub: "Finales en las que la universidad anfitriona también compitió. La sede no siempre juega en casa.",
    html: table(["Año", "Sede", "Universidad", "Puesto", "Equipo"], hostUniFinals.map((row) => [
      row.year, `${esc(row.city)}, ${esc(row.es)}`, `<a href="${uniUrl(row.hostUniversity.id)}">${esc(row.hostUniversity.name)}</a>`,
      place(row.hostUniversity.rank), row.hostUniversity.team ? `<a href="${teamUrl(row.hostUniversity.id, row.hostUniversity.team)}">${esc(row.hostUniversity.team)}</a>` : "—",
    ])) + `<p class="note">${totals.hostUniversityPodiums} de estas ${hostUniFinals.length} universidades subieron al podio en su propia final.</p>`,
  });
  hostUniBody.querySelector(".tablew")?.style.setProperty("--table-h", "380px");

  // --------------------------------------------------------------- changes
  const changes = [
    ["2011", "De Sharm el-Sheikh a Orlando", "La final estaba prevista en Egipto, pero se trasladó a Orlando por la inestabilidad política de la primavera árabe."],
    ["2017", "Rapid City y los visados", "Varios equipos no pudieron viajar a Estados Unidos. La final se jugó igualmente y las universidades afectadas recibieron plazas directas para 2018."],
    ["2020", "World Finals Moscow", "La edición de 2020 se pospuso por la pandemia y se disputó en Moscú del 1 al 5 de octubre de 2021."],
    ["2021", "World Finals Dhaka", "La edición de 2021 se jugó en Daca del 6 al 11 de noviembre de 2022."],
    ["2022–2023", "World Finals Luxor", "Las ediciones 46 y 47 compartieron Luxor en abril de 2024, organizadas por la AASTMT; antes estaban previstas en Sharm el-Sheikh."],
  ];
  card(view, {
    title: "Sedes que cambiaron", span: 12,
    sub: "Traslados, retrasos y ediciones que se recuerdan por el nombre de la ciudad, no solo por el año.",
    html: `<div class="sedes-changes">${changes.map(([year, title, text]) => `<article class="sedes-change"><span class="sedes-change-year">${esc(year)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div>`,
  });

  // --------------------------------------------------------------- all finals
  const finalsBody = card(view, {
    title: "Todas las finales", span: 12,
    sub: "La ciudad, el anfitrión, el tamaño del campo y el campeón. Ordena por cualquier columna.",
    html: table([
      { label: "Año", num: true }, "Ciudad", "País", "Anfitrión", { label: "Equipos", num: true },
      { label: "Países", num: true }, { label: "Problemas", num: true }, "Campeón",
    ], finals.map((row) => [
      row.year, esc(row.city), `<a href="${countryUrl(row.country)}">${esc(row.es)}</a>`, esc(row.host || "—"),
      row.teams, row.countries, row.problems,
      row.champion ? `<a href="${uniUrl(row.champion.uni)}">${esc(row.champion.uniName)}</a> <small>${esc(row.champion.team)}</small>` : "—",
    ])),
  });
  finalsBody.querySelector(".tablew")?.style.setProperty("--table-h", "620px");

  // ---------------------------------------------------------------- method
  const method = grid(view);
  card(method, {
    title: "La serie", span: 6,
    html: `<div class="prose"><p>Se cuentan las <b>${totals.finals} finales de ${totals.first} a ${totals.last}</b>. La sede es la ciudad donde se disputó la competición; el anfitrión es la universidad u organización que figura en la fuente. La sede de 2007 fue Urayasu, no Tokio: el Tokyo Bay Hilton está en esa ciudad del área metropolitana.</p>
      <p>Las ediciones de 2020 y 2021 se llaman por su ciudad —Moscow y Dhaka— para no confundirlas con el año en que se jugaron. Las de 2022 y 2023 comparten Luxor y fueron organizadas por la Arab Academy for Science, Technology and Maritime Transport (AASTMT).</p></div>`,
  });
  card(method, {
    title: "Ventaja local", span: 6,
    html: `<div class="prose"><p>El porcentaje de podios y el percentil medio se calculan con los equipos del país anfitrión. “En casa” son las finales que organizó; “fuera”, todas las demás de la serie. No es un experimento: el anfitrión puede tener más equipos y la muestra es pequeña.</p>
      <p>Solo <b>${totals.homeBetter} de ${hostCountries.length}</b> países mejoraron su percentil medio en casa. La lectura interesante no es “jugar en casa ayuda”, sino cuándo y para quién.</p></div>`,
  });
  card(method, {
    title: "Descargas", span: 6,
    html: `<ul class="cuba-downloads">
      <li><a href="data/sedes.csv">sedes.csv</a><span>Una fila por final, con ciudad, anfitrión y resultado local.</span></li>
      <li><a href="data/sedes.json">sedes.json</a><span>Las sedes, los países anfitriones y las universidades que compitieron.</span></li>
      <li><a href="data/results.csv">results.csv</a><span>Todos los resultados de todas las finales.</span></li>
    </ul>`,
  });
  card(method, {
    title: "Fuentes", span: 6,
    html: `<div class="prose"><p>Ciudades, fechas y anfitriones: páginas de historia del <a href="https://icpc.global/">ICPC</a> y la tabla histórica de <a href="https://en.wikipedia.org/wiki/International_Collegiate_Programming_Contest">Wikipedia</a>. Resultados, países y campeones: <a href="https://www.cphof.org/">cphof.org</a>, contrastado con <a href="https://icpc.global/worldfinals/results">icpc.global</a>.</p>
      <p>Las coordenadas son aproximadas y se usan solo para el mapa. Las notas de traslados y visados se conservan como contexto, no como una explicación causal de los resultados.</p></div>`,
  });
}

startPage({
  page: "sedes",
  title: "Sedes",
  subtitle: "Dónde se jugó el Mundial y qué cambió para los equipos que jugaban en casa.",
  render(view, data) {
    const token = ++renderToken;
    view.insertAdjacentHTML("beforeend", '<p class="sub" id="sedes-loading">Cargando las sedes…</p>');
    sedesPromise ??= fetch("data/sedes.json").then((response) => {
      if (!response.ok) throw new Error(`sedes.json: ${response.status}`);
      return response.json();
    });
    sedesPromise
      .then((sedes) => { if (token === renderToken) draw(view, data, sedes); })
      .catch((error) => {
        if (token !== renderToken) return;
        console.error(error);
        view.insertAdjacentHTML("beforeend", '<div class="card"><h2>No se pudieron cargar las sedes</h2><p class="sub">Ejecuta <code>make data</code> y recarga.</p></div>');
      });
  },
});
