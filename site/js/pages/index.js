import { REGION_COLORS, countryName, countryUrl, crest, esc, number, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, valueAxis } from "../charts.js";
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

function drawMap(el, data, state, side) {
  echarts.registerMap("world", data.world);
  const c = colors();
  const dark = document.documentElement.dataset.theme === "vino";
  const low = dark ? "#783c3e" : "#e8d8b2";
  const high = dark ? "#fdb830" : "#6d222e";
  const metricValue = (r) => (state.metric === "teams" ? 1 : r.medal ? 1 : 0);
  const valuesAt = (year) => {
    const totals = new Map();
    for (const r of data.rows) {
      if (state.period === "cum" ? r.year <= year : r.year === year) totals.set(r.country, (totals.get(r.country) ?? 0) + metricValue(r));
    }
    return [...totals].filter(([, v]) => v > 0);
  };
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
        min: 0, max: Math.max(maxValue, 1), calculable: false, left: 12, bottom: 70, itemHeight: 90, itemWidth: 11,
        text: ["más", "menos"], textStyle: { color: c.dim }, inRange: { color: [low, high] }, seriesIndex: [0, 1],
      },
      tooltip: {
        trigger: "item",
        formatter: (p) => {
          const value = Array.isArray(p.value) ? p.value[2] : p.value;
          return `${esc(label(p.name))}: <b>${Number.isFinite(value) ? value : 0}</b>`;
        },
      },
      geo: {
        map: "world", projection, roam: false, silent: false, top: 4, bottom: 56, left: 4, right: 4,
        itemStyle: { areaColor: c.land, borderColor: c.panel, borderWidth: 0.6 },
        emphasis: { itemStyle: { areaColor: c.red }, label: { show: false } },
        select: { disabled: true },
      },
      series: [
        { type: "map", geoIndex: 0, data: [] },
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

function raceFrames(data) {
  const totals = new Map();
  return data.years.map((year) => {
    for (const r of data.rows) if (r.year === year) totals.set(r.country, (totals.get(r.country) ?? 0) + 1);
    return [...totals].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: countryName(data, name), value }));
  });
}

function drawRace(el, data) {
  const frames = raceFrames(data);
  const c = colors();
  const regionByEs = new Map([...data.countriesIndex.values()].map((x) => [x.es, x.region]));
  const toSeries = (frame) => frame.slice(0, 12).map((x) => ({ value: x.value, name: x.name, itemStyle: { color: REGION_COLORS[regionByEs.get(x.name)] ?? c.gold } }));
  const chart = plot(el, {
    legend: false,
    grid: { left: 8, right: 44, top: 8, bottom: 8, containLabel: true },
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
  return {
    run(onDone) {
      let index = 0;
      const step = () => {
        chart.setOption({ yAxis: { data: toSeries(frames[index]).map((x) => x.name) }, series: [{ data: toSeries(frames[index]) }], graphic: [{ id: "year", style: { text: String(data.years[index]) } }] });
        index += 1;
        if (index < frames.length) setTimeout(step, 850); else onDone();
      };
      step();
    },
    last() {
      const i = frames.length - 1;
      chart.setOption({ yAxis: { data: toSeries(frames[i]).map((x) => x.name) }, series: [{ data: toSeries(frames[i]) }], graphic: [{ id: "year", style: { text: String(data.years[i]) } }] });
    },
  };
}

startPage({
  page: "index",
  render(view, data) {
    const lastYear = data.years[data.years.length - 1];
    const champion = data.rows.find((r) => r.year === lastYear && r.rank === 1);
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
    const mapBody = card(top, {
      title: "El mapa de la final", span: 8,
      html: `<div class="filters" style="border:0;padding:0;margin:4px 0 6px;background:none"><span class="seg" role="group" aria-label="Métrica"><button data-m="teams">Participaciones</button><button data-m="top">Medallas</button></span><span class="seg" role="group" aria-label="Periodo"><button data-p="cum">Acumulado</button><button data-p="one">Ese año</button></span></div><div class="plot" id="map" style="height:${innerWidth < 640 ? 330 : 470}px"></div>`,
    });
    const rankBody = card(top, { title: "Quién domina", span: 4, html: '<p class="sub" id="rank-sub"></p><div id="rank"></div>' });

    const regionEl = chartCard(top, { title: "Reparto por región", sub: "Según el año y la métrica del mapa", span: 4, height: 310 });
    let regionChart = null;
    const updateSide = (year) => {
      const rows = data.rows.filter((r) => (state.period === "cum" ? r.year <= year : r.year === year) && (state.metric === "teams" || r.medal));
      const byCountry = new Map();
      for (const r of rows) byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + 1);
      const items = [...byCountry].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ label: countryName(data, name), value, url: countryUrl(name) }));
      rankBody.querySelector("#rank-sub").textContent = `${state.metric === "teams" ? "Participaciones" : "Medallas"}, ${state.period === "cum" ? `${data.years[0]}–${year}` : year}`;
      rankBody.querySelector("#rank").innerHTML = barList(items);
      const byRegion = new Map();
      for (const r of rows) byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + 1);
      const slices = [...byRegion].sort((a, b) => b[1] - a[1]).map(([region, value]) => ({ name: data.regions[region] ?? region, value, itemStyle: { color: REGION_COLORS[region] } }));
      if (regionChart) regionChart.setOption({ series: [{ data: slices }] });
      else regionChart = donut(regionEl, slices);
    };
    let mapChart = null;
    const redrawMap = () => {
      mapChart?.dispose();
      mapChart = drawMap(mapBody.querySelector("#map"), data, state, updateSide);
      updateSide(lastYear);
      mapBody.querySelectorAll("[data-m]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.m === state.metric));
      mapBody.querySelectorAll("[data-p]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.p === state.period));
    };
    mapBody.querySelectorAll("[data-m]").forEach((b) => { b.onclick = () => { state.metric = b.dataset.m; redrawMap(); }; });
    mapBody.querySelectorAll("[data-p]").forEach((b) => { b.onclick = () => { state.period = b.dataset.p; redrawMap(); }; });
    redrawMap();

    const raceBody = card(top, {
      title: "La carrera de los países", sub: "Participaciones acumuladas, edición a edición: cada equipo en cada final suma una", span: 8,
      html: `<button class="chip" id="race-go" style="cursor:pointer">▶ Reproducir</button><div class="plot" id="race" style="height:${innerWidth < 640 ? 320 : 320}px"></div>`,
    });
    const race = drawRace(raceBody.querySelector("#race"), data);
    race.last();
    const go = raceBody.querySelector("#race-go");
    go.onclick = () => { go.disabled = true; race.run(() => { go.disabled = false; }); };

    const champs = data.rows.filter((r) => r.rank === 1);
    card(view, {
      title: "Campeones, año por año", span: 12,
      html: `<div class="champs">${champs.map((r) => `<a class="champ" href="${uniUrl(r.uni)}"><b>${r.year}</b>${crest(r.uniName, 40)}<span>${esc(r.uniName)}</span></a>`).join("")}</div>`,
    }).closest(".card").style.marginBottom = "14px";

    const mid = grid(view);
    const regions = Object.keys(data.regions);
    const years = data.years;
    const stacked = regions.map((region) => ({
      name: data.regions[region], type: "line", stack: "t", smooth: 0.25, symbol: "none", areaStyle: { opacity: 0.88 },
      lineStyle: { width: 0.5 }, itemStyle: { color: REGION_COLORS[region] },
      data: years.map((y) => data.rows.filter((r) => r.year === y && r.region === region).length),
    }));
    plot(chartCard(mid, { title: "Cómo cambió el mundo del ICPC", sub: "Finalistas por región en cada edición", span: 7, height: 350 }), {
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
      yAxis: valueAxis(),
      series: stacked,
    });
    const c = colors();
    const tree = regions.map((region) => ({
      name: data.regions[region],
      itemStyle: { color: REGION_COLORS[region] },
      children: [...data.countriesIndex.values()].filter((x) => x.region === region).map((x) => ({ name: x.es, value: x.rows.length, id: x.name })),
    })).filter((node) => node.children.length);
    plot(chartCard(mid, { title: "El peso de cada país", sub: `Participaciones desde ${data.years[0]}, por región`, span: 5, height: 350 }), {
      legend: false,
      tooltip: { formatter: (p) => `${esc(p.name)}: <b>${p.value}</b>` },
      series: [{
        type: "treemap", roam: false, nodeClick: false, breadcrumb: { show: false }, top: 4, bottom: 4, left: 2, right: 2, data: tree,
        label: { show: true, formatter: "{b}", color: "#fff", textShadowBlur: 3, textShadowColor: "#000c", fontSize: 12, fontWeight: 500 },
        upperLabel: { show: false },
        levels: [
          { itemStyle: { borderColor: c.panel, borderWidth: 3, gapWidth: 3 } },
          { colorAlpha: [0.62, 1], itemStyle: { gapWidth: 1, borderWidth: 1, borderColor: c.panel } },
        ],
      }],
    }, { onClick: (p) => { if (p.data?.id) location.href = countryUrl(p.data.id); } });

    const veterans = [...data.unis].sort((a, b) => b.results.length - a.results.length).slice(0, 40);
    card(mid, {
      title: "El muro de los veteranos", sub: "Las universidades con más finales. Escudos provisionales: monogramas generados.", span: 7,
      html: `<div class="wall">${veterans.map((u) => `<a href="${uniUrl(u.id)}" title="${esc(u.name)}: ${u.results.length} finales">${crest(u.name, 42)}<br>${esc(u.name.replace(/University|Universidad|State|Institute of|\bof\b|\bde\b/g, "").trim().slice(0, 20))}</a>`).join("")}</div>`,
    });
    const growth = years.map((y) => data.field[y]);
    plot(chartCard(mid, { title: "Una final cada vez más grande", sub: "Equipos y problemas por edición", span: 5, height: 340 }), {
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(years.map(String)),
      yAxis: [valueAxis(), valueAxis({ splitLine: { show: false }, min: 0, max: 16 })],
      series: [
        { name: "Equipos", type: "bar", data: growth, itemStyle: { color: c.gold, borderRadius: [3, 3, 0, 0] } },
        { name: "Problemas", type: "line", yAxisIndex: 1, data: years.map((y) => data.problems[y] ?? null), connectNulls: false, symbolSize: 7, lineStyle: { width: 3, color: c.red }, itemStyle: { color: c.red } },
      ],
    });
  },
});
