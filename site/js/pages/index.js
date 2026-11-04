import { REGION_COLORS, countryName, countryUrl, crest, esc, number, uniUrl } from "../core.js";
import { categoryAxis, colors, dispose, donut, plot, valueAxis } from "../charts.js";
import { barList, card, chartCard, grid, kpis, startPage } from "../shell.js";

/* global echarts */

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

// The world map keeps the projected aspect; only the card width changes.
const MAP_ASPECT = 2.15;
const fitMap = () => {
  const el = document.getElementById("map");
  if (!el || !el.clientWidth) return;
  el.style.height = `${Math.round((el.clientWidth - 8) / MAP_ASPECT + 60)}px`;
};
const resizeMap = () => {
  fitMap();
  const el = document.getElementById("map");
  const chart = el && echarts.getInstanceByDom(el);
  if (chart) chart.setOption({ visualMap: { show: innerWidth >= 640 } });
};
window.addEventListener("resize", resizeMap);

const METRICS = {
  teams: { label: "Participaciones", one: "participación", many: "participaciones" },
  presence: { label: "Presencia", one: "edición", many: "ediciones" },
  medals: { label: "Medallas", one: "medalla", many: "medallas" },
};

const unit = (metric, value) => (value === 1 ? METRICS[metric].one : METRICS[metric].many);

// One team is one participation; presence counts a country once per final.
function countryTotals(data, { metric, period = "cum", year, region = "all" }) {
  const totals = new Map();
  const editions = new Map();
  for (const r of data.rows) {
    if (region !== "all" && r.region !== region) continue;
    if (period === "cum" ? r.year > year : r.year !== year) continue;
    const entry = totals.get(r.country) ?? { value: 0, teams: 0, region: r.region };
    entry.teams += 1;
    if (metric === "teams") entry.value += 1;
    else if (metric === "medals") { if (r.medal) entry.value += 1; }
    else {
      const seen = editions.get(r.country) ?? new Set();
      if (!seen.has(r.year)) { seen.add(r.year); entry.value += 1; }
      editions.set(r.country, seen);
    }
    totals.set(r.country, entry);
  }
  return totals;
}

// Same order for the map, its side panel and the race: value, then participations, then name.
const ranked = (data, totals) => [...totals]
  .filter(([, entry]) => entry.value > 0)
  .sort((a, b) => b[1].value - a[1].value || b[1].teams - a[1].teams ||
    countryName(data, a[0]).localeCompare(countryName(data, b[0]), "es"));

const regionOptions = (data, selected) => [["all", "Todas"], ...Object.entries(data.regions)]
  .map(([value, label]) => `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`)
  .join("");

function drawMap(el, data, state, side) {
  echarts.registerMap("world", data.world);
  const c = colors();
  const dark = document.documentElement.dataset.theme === "vino";
  const compact = innerWidth < 640;
  const low = dark ? "#783c3e" : "#e8d8b2";
  const high = dark ? "#fbf4e4" : "#6d222e";
  const valuesAt = (year) => ranked(data, countryTotals(data, { metric: state.metric, period: state.period, year }))
    .map(([name, entry]) => [name, entry.value]);
  const maxValue = Math.max(...data.years.map((y) => Math.max(0, ...valuesAt(y).map(([, v]) => v))));
  const names = new Map(Object.entries(data.countries).map(([name, meta]) => [meta.map, name]));
  const label = (mapName) => countryName(data, names.get(mapName) ?? mapName);
  const options = data.years.map((year) => {
    const values = valuesAt(year);
    return {
      series: [
        { data: values.filter(([n]) => !data.countries[n]?.point).map(([n, v]) => ({ name: data.countries[n]?.map ?? n, value: v })) },
        { data: values.filter(([n]) => data.countries[n]?.point).map(([n, v]) => ({ name: data.countries[n].map, value: [...data.countries[n].point, v] })) },
      ],
    };
  });
  const chart = plot(el, {
    legend: false,
    baseOption: {
      timeline: {
        axisType: "category", data: data.years.map(String), autoPlay: false, playInterval: 900,
        currentIndex: data.years.length - 1, bottom: 2, left: 30, right: 30,
        label: { color: c.dim, fontFamily: "Jost" },
        lineStyle: { color: c.line }, itemStyle: { color: c.gold }, checkpointStyle: { color: c.red, borderColor: c.panel },
        controlStyle: { color: c.accent, borderColor: c.accent }, progress: { lineStyle: { color: c.accent }, itemStyle: { color: c.accent } },
        emphasis: { label: { color: c.ink }, itemStyle: { color: c.accent }, controlStyle: { color: c.red, borderColor: c.red } },
      },
      visualMap: {
        show: !compact, min: 0, max: Math.max(maxValue, 1), calculable: false, left: 12, bottom: 70, itemHeight: 90, itemWidth: 11,
        text: [`más ${METRICS[state.metric].many}`, "menos"], textStyle: { color: c.dim }, inRange: { color: [low, high] }, seriesIndex: [0, 1],
      },
      tooltip: {
        trigger: "item",
        formatter: (p) => {
          if (p.componentType === "timeline") return esc(p.name);
          const value = Array.isArray(p.value) ? p.value[2] : p.value;
          const total = Number.isFinite(value) ? value : 0;
          return `${esc(label(p.name))}: <b>${total}</b> ${esc(unit(state.metric, total))}`;
        },
      },
      geo: {
        map: "world", projection, roam: false, silent: false, top: 4, bottom: 56, left: 4, right: 4,
        itemStyle: { areaColor: c.land, borderColor: c.panel, borderWidth: 0.6 },
        emphasis: { disabled: true }, select: { disabled: true },
      },
      series: [
        { type: "map", geoIndex: 0, data: [], selectedMode: false, emphasis: { disabled: true } },
        { type: "scatter", coordinateSystem: "geo", symbolSize: 9, itemStyle: { borderColor: c.panel, borderWidth: 1 }, data: [] },
      ],
    },
    options,
  }, {
    onClick: (p) => {
      if (p.componentType === "timeline") return;
      const name = names.get(p.name);
      if (name && data.countriesIndex.has(name)) location.href = countryUrl(name);
    },
  });
  const sync = (index) => side(data.years[index]);
  chart.on("timelinechanged", (e) => sync(e.currentIndex));
  return chart;
}

function raceFrames(data, state) {
  return data.years.map((year) => ranked(data, countryTotals(data, { metric: state.metric, period: "cum", year, region: state.region }))
    .map(([name, entry]) => ({ name: countryName(data, name), value: entry.value })));
}

function drawRace(el, data, state) {
  el.innerHTML = "";
  const frames = raceFrames(data, state);
  if (!frames.some((frame) => frame.length)) {
    el.innerHTML = '<p class="sub">Ningún país con estos filtros.</p>';
    return { chart: null, stop() {}, run(onDone) { onDone(); }, last() {} };
  }
  const c = colors();
  const regionByEs = new Map([...data.countriesIndex.values()].map((x) => [x.es, x.region]));
  const toSeries = (frame) => frame.slice(0, 10).map((x) => ({ value: x.value, name: x.name, itemStyle: { color: REGION_COLORS[regionByEs.get(x.name)] ?? c.gold } }));
  const chart = plot(el, {
    legend: false,
    grid: { left: 8, right: 44, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      confine: true, backgroundColor: c.panel, borderColor: c.line,
      textStyle: { color: c.ink, fontFamily: "Jost, system-ui, sans-serif" },
      trigger: "item",
      formatter: (p) => `${esc(p.name)}: <b>${p.value}</b> ${esc(unit(state.metric, p.value))}`,
    },
    xAxis: valueAxis({ max: "dataMax", axisLabel: { show: false }, splitLine: { show: false } }),
    yAxis: categoryAxis(toSeries(frames[0]).map((x) => x.name), { inverse: true, max: 9, animationDuration: 300, animationDurationUpdate: 300, axisLabel: { color: c.ink, interval: 0 } }),
    animationDuration: 0,
    animationDurationUpdate: 800,
    animationEasing: "linear",
    animationEasingUpdate: "linear",
    series: [{
      type: "bar", realtimeSort: true, data: toSeries(frames[0]), barMaxWidth: 20,
      label: { show: true, position: "right", valueAnimation: true, color: c.ink },
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    }],
    graphic: [{ id: "year", type: "text", right: 40, bottom: 26, style: { text: String(data.years[0]), font: "600 40px Cinzel, serif", fill: c.gold, opacity: 0.8 } }],
  });
  let timer = null;
  const stop = () => { if (timer != null) { clearTimeout(timer); timer = null; } };
  const show = (index) => {
    if (chart.isDisposed()) return;
    const series = toSeries(frames[index]);
    chart.setOption({ yAxis: { data: series.map((x) => x.name) }, series: [{ data: series }], graphic: [{ id: "year", style: { text: String(data.years[index]) } }] });
  };
  return {
    chart,
    stop,
    run(onDone) {
      stop();
      let index = 0;
      const step = () => {
        if (chart.isDisposed()) { timer = null; return; }
        show(index);
        index += 1;
        if (index < frames.length) timer = setTimeout(step, 850);
        else { timer = null; onDone(); }
      };
      step();
    },
    last() { stop(); show(frames.length - 1); },
  };
}

startPage({
  page: "index",
  render(view, data) {
    const lastYear = data.years[data.years.length - 1];
    const champion = data.rows.find((r) => r.year === lastYear && r.rank === 1);
    const c = colors();
    const regions = Object.keys(data.regions);
    const years = data.years;
    const head = document.createElement("div");
    head.className = "head";
    head.innerHTML = `<h1>Observatorio ICPC</h1><p>Las finales mundiales desde ${data.years[0]}, de un vistazo.</p>`;
    view.append(head);
    kpis(view, [
      [data.years.length, "finales", "datos.html"],
      [number(data.rows.length), "participaciones en finales", "universidades.html"],
      [data.unis.length, "universidades", "universidades.html"],
      [data.countriesIndex.size, "países y territorios", "paises.html"],
      [number(data.people.size), "competidores", "competidores.html"],
      [champion.uniName, `campeón ${lastYear}`, uniUrl(champion.uni)],
    ]);

    const top = grid(view);
    const state = { metric: "teams", period: "cum" };
    const rankState = { region: "all" };
    const mapBody = card(top, {
      title: "El mapa de la final", span: 12,
      html: `<div class="filters" style="border:0;padding:0;margin:4px 0 6px;background:none"><span class="seg" role="group" aria-label="Métrica"><button data-m="teams">Participaciones</button><button data-m="presence">Presencia</button><button data-m="medals">Medallas</button></span><span class="seg" role="group" aria-label="Periodo"><button data-p="cum">Acumulado</button><button data-p="one">Ese año</button></span></div><div class="plot" id="map"></div>`,
    });
    const rankBody = card(top, {
      title: "Quién domina", span: 6,
      html: `<div class="filters" style="border:0;padding:0;margin:0 0 4px;background:none"><label>Región <select data-rank-region>${regionOptions(data, rankState.region)}</select></label></div><p class="sub" id="rank-sub"></p><div id="rank"></div>`,
    });

    const regionEl = chartCard(top, { title: "Reparto por región", sub: "Según el año y la métrica del mapa", span: 6, height: 360 });
    let regionChart = null;
    let shownYear = lastYear;
    const updateSide = (year) => {
      shownYear = year;
      const entries = ranked(data, countryTotals(data, { metric: state.metric, period: state.period, year }));
      const scope = rankState.region === "all" ? entries : entries.filter(([, entry]) => entry.region === rankState.region);
      const items = scope.slice(0, 8).map(([name, entry]) => ({ label: countryName(data, name), value: entry.value, url: countryUrl(name) }));
      const region = rankState.region === "all" ? "" : ` · ${data.regions[rankState.region]}`;
      rankBody.querySelector("#rank-sub").textContent = `${METRICS[state.metric].label}, ${state.period === "cum" ? `${data.years[0]}–${year}` : year}${region}`;
      rankBody.querySelector("#rank").innerHTML = barList(items);
      const byRegion = new Map();
      for (const [, entry] of entries) byRegion.set(entry.region, (byRegion.get(entry.region) ?? 0) + entry.value);
      const slices = [...byRegion].sort((a, b) => b[1] - a[1]).map(([region, value]) => ({ name: data.regions[region] ?? region, value, itemStyle: { color: REGION_COLORS[region] } }));
      if (regionChart) regionChart.setOption({ series: [{ data: slices }] });
      else regionChart = donut(regionEl, slices);
    };
    let mapChart = null;
    const redrawMap = () => {
      if (state.metric === "presence" && state.period === "one") state.period = "cum";
      dispose(mapChart);
      fitMap();
      mapChart = drawMap(mapBody.querySelector("#map"), data, state, updateSide);
      updateSide(lastYear);
      const one = mapBody.querySelector('[data-p="one"]');
      one.disabled = state.metric === "presence";
      one.setAttribute("aria-disabled", String(one.disabled));
      mapBody.querySelectorAll("[data-m]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.m === state.metric));
      mapBody.querySelectorAll("[data-p]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.p === state.period));
    };
    mapBody.querySelectorAll("[data-m]").forEach((b) => { b.onclick = () => { state.metric = b.dataset.m; redrawMap(); }; });
    mapBody.querySelectorAll("[data-p]").forEach((b) => { b.onclick = () => { state.period = b.dataset.p; redrawMap(); }; });
    redrawMap();
    rankBody.querySelector("[data-rank-region]").onchange = (event) => {
      rankState.region = event.target.value;
      updateSide(shownYear);
    };

    const champsRow = grid(view);
    const champs = data.rows.filter((r) => r.rank === 1);
    card(champsRow, {
      title: "Campeones, año por año", span: 12,
      html: `<div class="champs">${champs.map((r) => `<a class="champ" href="${uniUrl(r.uni)}"><b>${r.year}</b>${crest(r.uniName, 40)}<span>${esc(r.uniName)}</span></a>`).join("")}</div>`,
    });

    const main = grid(view);
    const raceState = { metric: "teams", region: "all" };
    const raceSubtitle = () => {
      const base = {
        teams: "Participaciones acumuladas, edición a edición: cada equipo en cada final suma una",
        presence: "Presencia acumulada, edición a edición: cada país suma una por final, con uno o más equipos",
        medals: "Medallas acumuladas, edición a edición: cada medalla suma una",
      }[raceState.metric];
      return raceState.region === "all" ? base : `${base} · ${data.regions[raceState.region]}`;
    };
    const raceBody = card(main, {
      title: "La carrera de los países", sub: raceSubtitle(), span: 7,
      html: `<div class="filters" style="border:0;padding:0;margin:4px 0 6px;background:none"><span class="seg" role="group" aria-label="Métrica"><button data-rm="teams">Participaciones</button><button data-rm="presence">Presencia</button><button data-rm="medals">Medallas</button></span><label>Región <select data-rr>${regionOptions(data, raceState.region)}</select></label><button class="chip" id="race-go" style="cursor:pointer">▶ Reproducir</button></div><div class="plot" id="race" style="height:${innerWidth < 640 ? 320 : 320}px"></div>`,
    });
    const go = raceBody.querySelector("#race-go");
    let race = null;
    const renderRace = () => {
      race?.stop();
      dispose(race?.chart);
      raceBody.closest(".card").querySelector(".sub").textContent = raceSubtitle();
      raceBody.querySelectorAll("[data-rm]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.rm === raceState.metric));
      race = drawRace(raceBody.querySelector("#race"), data, raceState);
      race.last();
      go.disabled = false;
    };
    raceBody.querySelectorAll("[data-rm]").forEach((b) => {
      b.onclick = () => { raceState.metric = b.dataset.rm; renderRace(); };
    });
    raceBody.querySelector("[data-rr]").onchange = (event) => { raceState.region = event.target.value; renderRace(); };
    go.onclick = () => {
      if (go.disabled) return;
      go.disabled = true;
      race.run(() => { go.disabled = false; });
    };
    renderRace();

    const trends = grid(view);
    const stacked = regions.map((region) => ({
      name: data.regions[region], type: "line", stack: "t", smooth: 0.25, symbol: "none", areaStyle: { opacity: 0.88 },
      lineStyle: { width: 0.5 }, itemStyle: { color: REGION_COLORS[region] },
      data: years.map((y) => data.rows.filter((r) => r.year === y && r.region === region).length),
    }));
    plot(chartCard(trends, { title: "Cómo cambió el mundo del ICPC", sub: "Finalistas por región en cada edición", span: 7, height: 350 }), {
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
      yAxis: valueAxis(),
      series: stacked,
    });
    const treeState = { metric: "teams", region: "all" };
    const treeSubtitle = () => {
      const base = `${METRICS[treeState.metric].label} desde ${data.years[0]}`;
      return treeState.region === "all" ? `${base}, por región` : `${base} · ${data.regions[treeState.region]}`;
    };
    const treeValue = (country) => (treeState.metric === "presence"
      ? new Set(country.rows.map((r) => r.year)).size
      : country.rows.length);
    const treeData = () => {
      const countries = [...data.countriesIndex.values()].filter((x) => treeState.region === "all" || x.region === treeState.region);
      const children = (region) => countries.filter((x) => x.region === region)
        .map((x) => ({ name: x.es, value: treeValue(x), id: x.name }));
      if (treeState.region !== "all") return [{ name: data.regions[treeState.region], itemStyle: { color: REGION_COLORS[treeState.region] }, children: children(treeState.region) }];
      return regions.map((region) => ({
        name: data.regions[region],
        itemStyle: { color: REGION_COLORS[region] },
        children: children(region),
      })).filter((node) => node.children.length);
    };
    const treeEl = chartCard(main, { title: "El peso de cada país", sub: treeSubtitle(), span: 5, height: 300 });
    const treeBody = treeEl.closest(".body");
    treeBody.insertAdjacentHTML("afterbegin", `<div class="filters" style="border:0;padding:0;margin:0 0 6px;background:none"><span class="seg" role="group" aria-label="Métrica"><button data-tm="teams">Participaciones</button><button data-tm="presence">Presencia</button></span><label>Región <select data-tr>${regionOptions(data, treeState.region)}</select></label></div>`);
    const treeChart = plot(treeEl, {
      legend: false,
      tooltip: {
        formatter: (p) => {
          const value = Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value;
          return `${esc(p.name)}: <b>${Number(value) || 0}</b> ${esc(unit(treeState.metric, Number(value) || 0))}`;
        },
      },
      series: [{
        type: "treemap", roam: false, nodeClick: false, breadcrumb: { show: false }, top: 4, bottom: 4, left: 2, right: 2, data: treeData(),
        label: { show: true, formatter: "{b}", color: "#fff", textShadowBlur: 3, textShadowColor: "#000c", fontSize: 12, fontWeight: 500 },
        upperLabel: { show: false },
        levels: [
          { itemStyle: { borderColor: c.panel, borderWidth: 3, gapWidth: 3 } },
          { colorAlpha: [0.62, 1], itemStyle: { gapWidth: 1, borderWidth: 1, borderColor: c.panel } },
        ],
      }],
    }, { onClick: (p) => { if (p.data?.id) location.href = countryUrl(p.data.id); } });
    const renderTree = () => {
      treeEl.closest(".card").querySelector(".sub").textContent = treeSubtitle();
      treeBody.querySelectorAll("[data-tm]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tm === treeState.metric));
      treeChart.setOption({ series: [{ data: treeData() }] });
    };
    treeBody.querySelectorAll("[data-tm]").forEach((b) => { b.onclick = () => { treeState.metric = b.dataset.tm; renderTree(); }; });
    treeBody.querySelector("[data-tr]").onchange = (event) => { treeState.region = event.target.value; renderTree(); };
    renderTree();

    const growth = years.map((y) => data.field[y]);
    plot(chartCard(trends, { title: "Una final cada vez más grande", sub: "Equipos y problemas por edición", span: 5, height: 340 }), {
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(years.map(String)),
      yAxis: [valueAxis(), valueAxis({ splitLine: { show: false }, min: 0, max: 16 })],
      series: [
        { name: "Equipos", type: "bar", data: growth, itemStyle: { color: c.gold, borderRadius: [3, 3, 0, 0] } },
        { name: "Problemas", type: "line", yAxisIndex: 1, data: years.map((y) => data.problems[y] ?? null), connectNulls: false, symbolSize: 7, lineStyle: { width: 3, color: c.red }, itemStyle: { color: c.red } },
      ],
    });

    const wallRow = grid(view);
    const wallState = { region: "all" };
    const wallData = () => {
      const pool = data.unis.filter((u) => wallState.region === "all" || data.countries[u.country]?.region === wallState.region);
      const sorted = [...pool].sort((a, b) => b.results.length - a.results.length || a.name.localeCompare(b.name, "es"));
      if (!sorted.length) return { items: [], cutoff: 0 };
      const cutoff = sorted[Math.min(40, sorted.length) - 1].results.length;
      return { items: sorted.filter((u) => u.results.length >= cutoff), cutoff };
    };
    const wallSubtitle = () => {
      const region = wallState.region === "all" ? "" : ` · ${data.regions[wallState.region]}`;
      return `Las universidades con más finales${region}. Escudos provisionales: monogramas generados.`;
    };
    const wallBody = card(wallRow, {
      title: "El muro de los veteranos", sub: wallSubtitle(), span: 12,
      html: `<div class="filters" style="border:0;padding:0;margin:0 0 6px;background:none"><label>Región <select data-wall-region>${regionOptions(data, wallState.region)}</select></label></div><div class="wall" id="wall"></div><p class="note" id="wall-note"></p>`,
    });
    const renderWall = () => {
      const { items, cutoff } = wallData();
      wallBody.closest(".card").querySelector(".sub").textContent = wallSubtitle();
      wallBody.querySelector("#wall").innerHTML = items.map((u) => `<a href="${uniUrl(u.id)}" title="${esc(u.name)}: ${u.results.length} finales">${crest(u.name, 42)}<br>${esc(u.name.replace(/University|Universidad|State|Institute of|\bof\b|\bde\b/g, "").trim().slice(0, 20))}</a>`).join("");
      wallBody.querySelector("#wall-note").textContent = cutoff
        ? `Corte en ${cutoff} ${cutoff === 1 ? "final" : "finales"}: entran todas las universidades con esa cantidad (${items.length} en total).`
        : "Ninguna universidad con estos filtros.";
    };
    wallBody.querySelector("[data-wall-region]").onchange = (event) => { wallState.region = event.target.value; renderWall(); };
    renderWall();
  },
});
