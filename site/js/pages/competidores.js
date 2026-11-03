import { REGION_COLORS, countryName, countryUrl, crest, esc, medalCounts, medalStrip, params, personUrl, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, valueAxis } from "../charts.js";
import { ficha, personFacts, teamLink } from "../profile.js";
import { card, chartCard, grid, kpis, startPage, table } from "../shell.js";

function profile(view, data, person) {
  document.title = `${person.name} · Observatorio ICPC`;
  const rows = [...person.rows].sort((a, b) => a.year - b.year);
  const medals = medalCounts(rows);
  const unis = [...new Set(rows.map((r) => r.uni))];
  const head = document.createElement("div");
  head.className = "profile";
  head.innerHTML = `${crest(person.name, 58)}<div><h1>${esc(person.name)}</h1><p>${unis.map((id) => `<a href="${uniUrl(id)}">${esc(data.byId.get(id).name)}</a>`).join(" · ")} · <a href="competidores.html">Todos los competidores</a></p></div>`;
  view.append(head);
  const ranks = rows.map((r) => r.rank).filter((r) => r != null);
  kpis(view, [
    [rows.length, "finales"],
    [ranks.length ? Math.round(Math.min(...ranks)) : "—", "mejor puesto"],
    [Math.max(...rows.map((r) => r.solved ?? 0)), "máx. resueltos"],
    [medals.gold + medals.silver + medals.bronze, "medallas"],
  ]);
  const a = grid(view);
  const c = colors();
  card(a, { title: "Ficha", span: 12, html: ficha(personFacts(data, person)) });
  plot(chartCard(a, { title: "Su trayectoria", sub: "Percentil en cada final", span: 6, height: 300 }), {
    legend: false, tooltip: { trigger: "axis" },
    xAxis: categoryAxis(rows.map((r) => String(r.year))), yAxis: valueAxis({ min: 0, max: 100 }),
    series: [{ type: "line", symbolSize: 10, lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent }, data: rows.map((r) => r.pct) }],
  });
  card(a, {
    title: "Sus equipos", span: 6,
    html: table(
      ["Año", "Universidad", "Equipo", { label: "Puesto", num: 1 }, { label: "Res.", num: 1 }, "Compañeros"],
      [...rows].reverse().map((r) => [r.year, `<a href="${uniUrl(r.uni)}">${esc(r.uniName)}</a>`, teamLink(r.uni, r.team), r.rank == null ? "—" : Math.round(r.rank), r.solved ?? "—", r.players.map((p, i) => [p, r.player_ids[i]]).filter(([, id]) => id !== person.key).map(([p, id]) => `<a href="${personUrl(id)}">${esc(p)}</a>`).join(", ")]),
    ),
  });
}

startPage({
  page: "competidores",
    render(view, data) {
    const key = params().get("p");
    if (key) {
      const person = data.people.get(key);
      if (person) { profile(view, data, person); return; }
    }
    const head = document.createElement("div");
    head.className = "head";
    head.innerHTML = "<h1>Competidores</h1><p>Quiénes han pisado más finales. Usa el buscador para encontrar a cualquiera.</p>";
    view.append(head);
    const people = [...data.people.values()];
    const medalTotal = (medals) => medals.gold + medals.silver + medals.bronze;
    const uniqueYears = (p) => new Set(p.rows.map((r) => r.year)).size;
    const threeFinals = people.filter((p) => uniqueYears(p) === 3).length;
    kpis(view, [
      [people.length.toLocaleString("es"), "personas"],
      [`${Math.round((100 * people.filter((p) => uniqueYears(p) === 1).length) / people.length)}%`, "van a una sola final"],
      [Math.max(...people.map(uniqueYears)), "finales como máximo"],
      [people.filter((p) => medalCounts(p.rows).gold > 0).length, "con oro"],
    ]);
    const a = grid(view);
    const c = colors();
    const state = { peopleRegion: "all", uniRegion: "all" };
    for (const name of ["peopleRegion", "uniRegion"]) {
      const value = params().get(name);
      if (value && (value === "all" || data.regions[value])) state[name] = value;
    }
    const regionOptions = (selected) => [["all", "Todas"], ...Object.entries(data.regions)]
      .map(([value, label]) => `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`).join("");
    const regionLegend = (regions) => `<div class="legend">${regions.map((region) => `<span><i style="background:${REGION_COLORS[region] ?? c.accent}"></i>${esc(data.regions[region] ?? region)}</span>`).join("")}</div>`;
    const remember = (name, value) => {
      const query = params();
      if (value === "all") query.delete(name); else query.set(name, value);
      history.replaceState(null, "", query.toString() ? `?${query}` : location.pathname);
    };
    const metaOf = (p) => {
      const rows = p.rows;
      const medals = medalCounts(rows);
      const last = rows[rows.length - 1];
      const best = Math.min(...rows.map((r) => r.rank ?? 1e9));
      return {
        finals: uniqueYears(p), medals,
        unis: [...new Set(rows.map((r) => r.uni))],
        countries: [...new Set(rows.map((r) => r.country))],
        best: best === 1e9 ? null : Math.round(best),
        region: data.countries[last.country]?.region ?? "other",
      };
    };
    const byFinals = people.map((p) => ({ p, meta: metaOf(p) }))
      .sort((x, y) => y.meta.finals - x.meta.finals || medalTotal(y.meta.medals) - medalTotal(x.meta.medals) || y.meta.medals.gold - x.meta.medals.gold)
      .slice(0, 20);
    const ordered = [...byFinals].reverse();
    const finalsPlot = chartCard(a, {
      title: "Más finales", span: 5, height: 500,
      sub: `${byFinals.length} de las ${threeFinals} personas que llegaron a 3 finales; la etiqueta resume sus medallas. Color por región del último país; el tooltip muestra universidades y países.`,
    });
    plot(finalsPlot, {
      legend: false,
      grid: { left: 8, right: 62, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        formatter: (p) => {
          const row = ordered[p.dataIndex];
          const medals = row.meta.medals;
          return `<b>${esc(row.p.name)}</b><br>${row.meta.finals} finales · ${medals.gold + medals.silver + medals.bronze} medallas<br>${row.meta.unis.map((id) => esc(data.byId.get(id).name)).join(" · ")}<br>${row.meta.countries.map((name) => esc(countryName(data, name))).join(" · ")}`;
        },
      },
      xAxis: valueAxis({ show: false }),
      yAxis: categoryAxis(ordered.map((row) => row.p.name), { axisLabel: { color: c.ink, interval: 0 } }),
      series: [{
        type: "bar", barMaxWidth: 16,
        data: ordered.map((row) => ({
          value: row.meta.finals,
          itemStyle: { color: REGION_COLORS[row.meta.region] ?? c.accent, borderRadius: [0, 4, 4, 0] },
        })),
        label: { show: true, position: "right", color: c.ink, formatter: (p) => { const row = ordered[p.dataIndex]; return `${row.meta.finals} · ${medalTotal(row.meta.medals)} med.`; } },
      }],
    });
    finalsPlot.insertAdjacentHTML("afterend", regionLegend([...new Set(ordered.map((row) => row.meta.region))]));

    const medalists = people.map((p) => ({ p, meta: metaOf(p) })).filter(({ meta }) => medalTotal(meta.medals) > 0)
      .sort((x, y) => medalTotal(y.meta.medals) - medalTotal(x.meta.medals) || y.meta.medals.gold - x.meta.medals.gold || y.meta.medals.silver - x.meta.medals.silver || y.meta.medals.bronze - x.meta.medals.bronze)
      .slice(0, 12);
    card(a, {
      title: "Más medallas", span: 4,
      sub: "Con la universidad y el país que aparecen en su última final.",
      html: `<ol class="medal-rows people-medals">${medalists.map(({ p, meta }) => `<li><a href="${personUrl(p.key)}"><span class="nm">${esc(p.name)}<small>${meta.unis.map((id) => esc(data.byId.get(id).name)).join(" · ")} · ${meta.countries.map((name) => esc(countryName(data, name))).join(" · ")}</small></span><span class="medals">${medalStrip(meta.medals, 20)}</span></a></li>`).join("")}</ol>`,
    });

    const histogram = new Map();
    people.forEach((p) => histogram.set(uniqueYears(p), (histogram.get(uniqueYears(p)) ?? 0) + 1));
    donut(chartCard(a, { title: "Finales por persona", span: 3, height: 520, sub: `Cada persona cuenta una vez; ${threeFinals} llegaron a tres finales.` }), [...histogram].sort((x, y) => x[0] - y[0]).map(([k, value]) => ({ name: `${k} ${k === 1 ? "final" : "finales"}`, value })), { center: people.length.toLocaleString("es"), labelFormatter: (p) => String(p.value) });

    const honorBody = card(a, {
      title: "Cuadro de honor", span: 12,
      sub: "Las personas con más finales, cruzadas con sus medallas, universidades y países.",
      html: table([
        "Persona", { label: "Finales", num: true }, "Medallas", "Universidades", "Países", { label: "Mejor puesto", num: true },
      ], byFinals.map(({ p, meta }) => [
        `<a href="${personUrl(p.key)}">${esc(p.name)}</a>`,
        meta.finals,
        meta.medals.gold + meta.medals.silver + meta.medals.bronze ? `<span class="medals">${medalStrip(meta.medals, 14)}</span>` : "—",
        meta.unis.map((id) => `<a href="${uniUrl(id)}">${esc(data.byId.get(id).name)}</a>`).join("<br>"),
        meta.countries.map((name) => `<a href="${countryUrl(name)}">${esc(countryName(data, name))}</a>`).join("<br>"),
        meta.best == null ? "—" : `${meta.best}.º`,
      ])),
    });
    honorBody.querySelector(".tablew")?.style.setProperty("--table-h", "520px");

    const byCountry = new Map();
    for (const p of people) { const last = p.rows[p.rows.length - 1].country; byCountry.set(last, (byCountry.get(last) ?? 0) + 1); }
    const countryRows = [...byCountry].map(([country, value]) => ({
      country, value, es: countryName(data, country), region: data.countries[country]?.region ?? "other",
    }));
    const countryData = (region) => countryRows.filter((row) => region === "all" || row.region === region)
      .map((row) => ({ name: row.es, value: row.value, country: row.country, region: row.region, itemStyle: { color: REGION_COLORS[row.region] ?? c.accent } }));
    // Label the largest countries of the current filter; fewer on phones so every label fits.
    const labelCutoff = (rows) => [...rows].sort((x, y) => y.value - x.value)[(window.innerWidth < 640 ? 8 : 10) - 1]?.value ?? 0;
    const countryCard = card(a, {
      title: "Competidores por país", span: 6,
      sub: "Cada persona cuenta una vez, por su último país. El área es proporcional al número de competidores.",
      html: `<div class="filters" style="border:0;padding:0;margin:0 0 10px;background:none"><label>Región <select id="people-region">${regionOptions(state.peopleRegion)}</select></label></div><div id="people-country-map" class="plot" style="height:400px"></div><div id="people-country-legend"></div><p class="note">Los países pequeños pueden no mostrar etiqueta; el tooltip sí los identifica.</p>`,
    });
    const countryLegend = countryCard.querySelector("#people-country-legend");
    let cutoff = labelCutoff(countryData(state.peopleRegion));
    const countryChart = plot(countryCard.querySelector("#people-country-map"), {
      legend: false,
      tooltip: {
        formatter: (p) => `<b>${esc(p.name)}</b><br>${p.value} competidores${p.data.region ? `<br>${esc(data.regions[p.data.region] ?? p.data.region)}` : ""}`,
      },
      series: [{
        type: "treemap", roam: false, nodeClick: false, breadcrumb: { show: false },
        width: "100%", height: "100%",
        itemStyle: { borderColor: c.panel, borderWidth: 1 },
        label: {
          show: true, color: c.ink, fontSize: 11, textBorderColor: c.panel, textBorderWidth: 2,
          formatter: (p) => (p.value >= cutoff ? `${p.name}\n${p.value}` : ""),
        },
        data: countryData(state.peopleRegion),
      }],
    }, { onClick: (p) => { if (p.data?.country) location.href = countryUrl(p.data.country); } });
    const updateCountry = () => {
      const rows = countryData(state.peopleRegion);
      cutoff = labelCutoff(rows);
      countryChart.setOption({ series: [{ data: rows }] });
      countryLegend.innerHTML = regionLegend([...new Set(rows.map((row) => row.region))]);
    };
    countryCard.querySelector("#people-region").onchange = (event) => {
      state.peopleRegion = event.target.value;
      remember("peopleRegion", state.peopleRegion);
      updateCountry();
    };
    updateCountry();

    const byUni = new Map();
    for (const p of people) { const last = p.rows[p.rows.length - 1].uni; byUni.set(last, (byUni.get(last) ?? 0) + 1); }
    const uniRows = [...byUni].map(([id, value]) => {
      const uni = data.byId.get(id);
      return { id, value, name: uni.name, region: data.countries[uni.country]?.region ?? "other" };
    });
    const uniCard = card(a, {
      title: "Universidades con más competidores", span: 6,
      sub: "Se cuenta la última universidad de cada persona. Filtra por región para ver solo sus universidades.",
      html: `<div class="filters" style="border:0;padding:0;margin:0 0 10px;background:none"><label>Región <select id="uni-region">${regionOptions(state.uniRegion)}</select></label></div><div id="uni-chips" class="chips"></div><p class="note">La región se toma del país de la universidad.</p>`,
    });
    const uniChips = uniCard.querySelector("#uni-chips");
    const updateUni = () => {
      const rows = uniRows.filter((row) => state.uniRegion === "all" || row.region === state.uniRegion)
        .sort((x, y) => y.value - x.value).slice(0, 12);
      uniChips.innerHTML = rows.length
        ? rows.map((row) => `<a class="chip" href="${uniUrl(row.id)}">${esc(row.name)} · ${row.value}</a>`).join("")
        : '<p class="sub">Ninguna universidad en esta región.</p>';
    };
    uniCard.querySelector("#uni-region").onchange = (event) => {
      state.uniRegion = event.target.value;
      remember("uniRegion", state.uniRegion);
      updateUni();
    };
    updateUni();
    uniCard.closest(".card")?.classList.add("cuba-aside");
  },
});
