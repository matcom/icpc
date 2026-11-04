import {
  avg, compareUrl, countryName, countrySeries, countryUrl, crest, esc,
  medalCounts, params, personUrl, quantile, teamKey, teamSeries, teamUrl,
  uniSeries, uniUrl,
} from "../core.js";
import { categoryAxis, colors, palette, plot, valueAxis } from "../charts.js";
import { bestResult } from "../profile.js";
import { card, chartCard, grid, startPage, table } from "../shell.js";

const MAX = 4;
const CLASS = {
  u: { label: "Universidades", one: "Universidad", defaults: ["universidad-de-la-habana", "universidad-de-oriente-sede-antonio-maceo"] },
  c: { label: "Países", one: "País", defaults: ["Cuba", "Mexico"] },
  t: { label: "Equipos", one: "Equipo" },
};
const LEVEL_COLORS = ["#d9c9a3", "#c9a86a", "#d97f45", "#af3227", "#8e3b5c", "#4a1520"];

let complexityPromise = null;

function loadComplexity() {
  if (!complexityPromise) {
    complexityPromise = fetch("data/complexity.json", { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`complexity ${response.status}`);
        return response.json();
      })
      .then((cx) => ({
        ...cx,
        problemById: new Map(cx.problems.map((p) => [p.id, p])),
        uniById: new Map(cx.universities.map((p) => [p.id, p])),
        countryByName: new Map(cx.countries.map((p) => [p.name, p])),
        teamByKey: new Map((cx.teams ?? []).map((p) => [p.key, p])),
      }))
      .catch(() => null);
  }
  return complexityPromise;
}

// Start the larger complexity file in parallel with the shell's core data.
loadComplexity();

const median = (values) => (values.length ? quantile(values, 0.5) : null);
const stdev = (values) => {
  if (values.length < 2) return null;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((v) => (v - mean) ** 2)));
};
const share = (value, total) => (total ? (100 * value) / total : null);
const fmt = (value, digits = 0) => (value == null ? "—" : Number(value).toLocaleString("es", { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const pctText = (value) => (value == null ? "—" : `${fmt(value, 1)}%`);
const signed = (value) => (value == null ? "—" : `${value > 0 ? "+" : ""}${fmt(value, 1)}`);
const place = (value) => (value == null ? "—" : fmt(Math.round(value)));
const topKey = (counts) => Object.entries(counts ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
const sum = (values) => values.reduce((total, value) => total + value, 0);
const chartName = (name) => {
  const clean = name.replace(/^Universidad (de |del |de la |de las )?/i, "").replace(/^University of /i, "");
  return clean.length > 21 ? `${clean.slice(0, 20)}…` : clean;
};

function compareTable(stats, groups) {
  const head = `<thead><tr><th></th>${stats.map((s) => `<th><a href="${s.item.url}">${esc(s.item.name)}</a></th>`).join("")}</tr></thead>`;
  const body = groups.map((group) => {
    const rows = group.rows.map((row) => {
      const values = stats.map((s) => row.value(s));
      let bestIndex = -1;
      if (row.best && stats.length > 1) {
        const numbers = stats.map((s) => row.best(s));
        const valid = numbers.map((value, index) => [value, index]).filter(([value]) => value != null && Number.isFinite(value));
        if (valid.length) {
          bestIndex = (row.dir === "min"
            ? valid.reduce((a, b) => (b[0] < a[0] ? b : a))
            : valid.reduce((a, b) => (b[0] > a[0] ? b : a)))[1];
        }
      }
      return `<tr><th>${esc(row.label)}</th>${values.map((value, index) => `<td${row.num === false ? "" : ' class="n"'}${index === bestIndex ? ' data-best="1"' : ""}>${value}</td>`).join("")}</tr>`;
    }).join("");
    return `<tr class="compare-group"><th colspan="${stats.length + 1}">${esc(group.label)}</th></tr>${rows}`;
  }).join("");
  return `<div class="tablew compare-table"><table data-nosort>${head}<tbody>${body}</tbody></table></div>`;
}

function heatTable(stats, columns, valueOf, totalOf, label) {
  return `<div class="tablew compare-heat"><table data-nosort><thead><tr><th>${esc(label)}</th>${columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${stats.map((s) => {
    const total = totalOf(s);
    return `<tr><th><a href="${s.item.url}">${esc(s.item.name)}</a></th>${columns.map((c) => {
      const value = valueOf(s, c);
      const size = total ? value / total : 0;
      const alpha = 0.04 + 0.46 * Math.min(1, size * 3);
      return `<td style="background:rgba(175,50,39,${alpha.toFixed(3)})" title="${esc(c.label)}: ${value}">${total ? fmt(100 * size, 1) : "—"}</td>`;
    }).join("")}</tr>`;
  }).join("")}</tbody></table></div>`;
}

function categoryLabel(cx, kind, id) {
  if (!id) return "—";
  if (!cx) return id;
  const list = kind === "areas" ? cx.areas : cx.techniques;
  return list.find((x) => x.id === id)?.label ?? id;
}

startPage({
  page: "comparar",
  title: "Comparar",
  subtitle: "Resultados, problemas, dificultad y temas. Universidades contra universidades, países contra países y equipos contra equipos.",
  async render(view, data, redraw, isCurrent = () => true) {
    const url = params();
    const kind = url.has("c") ? "c" : url.has("t") ? "t" : "u";
    const loading = document.createElement("p");
    loading.className = "loading";
    loading.textContent = "Cargando resultados y perfiles de complejidad…";
    view.append(loading);
    const cx = await loadComplexity().catch(() => null);
    loading.remove();
    if (!isCurrent()) return;

    const known = kind === "u"
      ? (key) => data.byId.has(key)
      : kind === "c"
        ? (key) => data.countriesIndex.has(key)
        : (key) => data.teams.has(key);
    const defaultKeys = (nextKind) => {
      if (nextKind === "t") {
        return [...data.teams.values()]
          .sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name, "es"))
          .slice(0, 2)
          .map((team) => team.key);
      }
      return CLASS[nextKind].defaults;
    };
    const defaults = defaultKeys(kind);
    const raw = url.has(kind)
      ? url.getAll(kind).flatMap((value) => (value.includes("|") ? [value] : value.split(","))).filter(Boolean)
      : defaults;
    const keys = [...new Set(raw)].filter(known).slice(0, MAX);

    const profileOf = (key) => {
      if (!cx) return null;
      if (kind === "u") return cx.uniById.get(key) ?? null;
      if (kind === "c") return cx.countryByName.get(key) ?? null;
      return cx.teamByKey.get(key) ?? null;
    };
    const entity = (key) => {
      if (kind === "u") {
        const uni = data.byId.get(key);
        return {
          key, name: uni.name, url: uniUrl(key), rows: uni.results, series: uniSeries(uni),
          crest: uni.name, sub: countryName(data, uni.country), subUrl: countryUrl(uni.country),
          profile: profileOf(key),
        };
      }
      if (kind === "c") {
        const country = data.countriesIndex.get(key);
        return {
          key, name: country.es, url: countryUrl(key), rows: country.rows, series: countrySeries(country),
          crest: country.es, sub: data.regions[country.region] ?? country.region, subUrl: null,
          profile: profileOf(key),
        };
      }
      const team = data.teams.get(key);
      const uni = data.byId.get(team.uni);
      return {
        key, name: team.name, url: teamUrl(team.uni, team.name), rows: team.rows, series: teamSeries(team),
        crest: uni.name, sub: uni.name, subUrl: uniUrl(team.uni), profile: profileOf(key),
      };
    };
    const items = keys.map(entity);
    const go = (nextKind, nextKeys) => {
      history.replaceState(null, "", compareUrl(nextKind, nextKeys));
      redraw();
    };

    const options = kind === "u"
      ? [...data.unis].sort((a, b) => a.name.localeCompare(b.name, "es")).map((uni) => [uni.id, uni.name])
      : kind === "c"
        ? [...data.countriesIndex.values()].sort((a, b) => a.es.localeCompare(b.es, "es")).map((country) => [country.name, country.es])
        : [...data.teams.values()]
          .sort((a, b) => a.name.localeCompare(b.name, "es") || data.byId.get(a.uni).name.localeCompare(data.byId.get(b.uni).name, "es"))
          .map((team) => [team.key, `${team.name} · ${data.byId.get(team.uni).name}`]);

    const bar = document.createElement("div");
    bar.className = "filters compare-bar";
    bar.innerHTML = `<span class="seg" role="group" aria-label="Qué comparar">${["u", "c", "t"].map((value) => `<button data-k="${value}" aria-pressed="${kind === value}">${CLASS[value].label}</button>`).join("")}</span>
      <label>Añadir <select id="add"${keys.length >= MAX ? " disabled" : ""}><option value="">Elige…</option>${options.filter(([value]) => !keys.includes(value)).map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join("")}</select></label>
      ${items.map((item) => `<span class="chip compare-chip">${crest(item.crest, 20)}<span class="compare-chip-text"><b>${esc(item.name)}</b><small>${esc(item.sub)}</small></span><button data-x="${esc(item.key)}" aria-label="Quitar ${esc(item.name)}">✕</button></span>`).join("")}
      ${items.length ? '<button type="button" class="compare-clear">Vaciar</button>' : ""}`;
    view.append(bar);
    bar.querySelectorAll("[data-k]").forEach((button) => {
      button.onclick = () => {
        if (button.dataset.k !== kind) go(button.dataset.k, defaultKeys(button.dataset.k));
      };
    });
    const add = bar.querySelector("#add");
    add.onchange = (event) => { if (event.target.value) go(kind, [...keys, event.target.value]); };
    bar.querySelectorAll("[data-x]").forEach((button) => {
      button.onclick = () => go(kind, keys.filter((key) => key !== button.dataset.x));
    });
    bar.querySelector(".compare-clear")?.addEventListener("click", () => go(kind, []));

    if (!items.length) {
      card(view, { span: 12, html: '<p class="sub">Elige al menos una entidad para empezar. Puedes comparar hasta cuatro de la misma clase.</p>' });
      return;
    }

    const stats = items.map((item) => {
      const rows = item.rows;
      const pcts = rows.filter((r) => r.pct != null).map((r) => r.pct);
      const ranked = rows.filter((r) => r.rank != null);
      const best = bestResult(rows);
      const worst = ranked.length ? ranked.reduce((a, b) => (b.rank > a.rank ? b : a)) : null;
      const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
      const medals = medalCounts(rows);
      const titles = rows.flatMap((r) => r.titles);
      const world = titles.filter((title) => title === "World").length;
      const regional = titles.length - world;
      const people = new Map();
      for (const row of rows) {
        row.player_ids.forEach((id, index) => {
          const person = people.get(id) ?? { id, name: row.players[index], years: new Set() };
          person.years.add(row.year);
          people.set(id, person);
        });
      }
      const teams = new Set(rows.map((row) => teamKey(row.uni, row.team)));
      const universities = new Set(rows.map((row) => row.uni));
      const solvedValues = rows.map((r) => r.solved).filter((value) => value != null);
      const totalSolved = sum(solvedValues);
      const timeRows = rows.filter((r) => r.time != null && r.solved > 0);
      const timeTotal = sum(timeRows.map((r) => r.time));
      const timeSolved = sum(timeRows.map((r) => r.solved));
      const yearly = new Map();
      for (const row of rows) {
        if (row.pct != null) yearly.set(row.year, Math.max(yearly.get(row.year) ?? 0, row.pct));
      }
      const yearlyPct = [...yearly].sort((a, b) => a[0] - b[0]).map(([, value]) => value);
      const trend = yearlyPct.length >= 6
        ? avg(yearlyPct.slice(-3)) - avg(yearlyPct.slice(0, 3))
        : null;
      const profile = item.profile;
      const levels = profile?.levels ?? [0, 0, 0, 0, 0, 0];
      const attempts = profile?.attemptsByLevel ?? [0, 0, 0, 0, 0, 0];
      const solvedSet = new Set(profile?.solvedProblems ?? []);
      const attemptedSet = new Set(profile?.attemptedProblems ?? []);
      return {
        item, rows, pcts, best, worst, years, medals, world, regional,
        finals: years.length, participations: rows.length,
        people: [...people.values()], teams: teams.size, universities: universities.size,
        totalSolved, avgSolved: solvedValues.length ? avg(solvedValues) : null,
        maxSolved: solvedValues.length ? Math.max(...solvedValues) : null,
        timePerSolve: timeSolved ? timeTotal / timeSolved : null,
        avgPct: pcts.length ? avg(pcts) : null,
        medianPct: median(pcts), sd: stdev(pcts), trend,
        vets: rows.length ? (100 * rows.filter((r) => r.veterans > 0).length) / rows.length : null,
        podiums: ranked.filter((r) => r.rank <= 3).length,
        top10: ranked.filter((r) => r.rank <= 10).length,
        profile, levels, attempts, solvedSet, attemptedSet,
        distinctSolves: profile?.distinctSolves ?? solvedSet.size,
        meanLevel: profile?.meanLevel ?? null,
        attemptsPerSolve: profile?.attemptsPerSolve ?? null,
        totalAreas: sum(Object.values(profile?.areas ?? {})),
        totalTechniques: sum(Object.values(profile?.techniques ?? {})),
      };
    });

    const summary = document.createElement("div");
    summary.className = "compare-cards";
    summary.innerHTML = stats.map((s) => `<article class="compare-card">
      <div class="compare-card-head">${crest(s.item.crest, 44)}<div><a href="${s.item.url}">${esc(s.item.name)}</a><small>${s.item.subUrl ? `<a href="${s.item.subUrl}">${esc(s.item.sub)}</a>` : esc(s.item.sub)}</small></div></div>
      <div class="compare-card-grid">
        <span><b>${s.best ? place(s.best.rank) : "—"}</b><small>mejor puesto</small></span>
        <span><b>${s.finals}</b><small>finales</small></span>
        <span><b>${s.medals.gold + s.medals.silver + s.medals.bronze}</b><small>medallas</small></span>
        <span><b>${pctText(s.avgPct)}</b><small>percentil medio</small></span>
        <span><b>${fmt(s.totalSolved)}</b><small>solves</small></span>
        <span><b>${s.meanLevel ?? "—"}</b><small>nivel medio</small></span>
      </div>
    </article>`).join("");
    view.append(summary);

    const tint = palette();
    const c = colors();
    const years = data.years;
    const a = grid(view);

    plot(chartCard(a, { title: "Percentil por edición", sub: "100 es el campeón de esa final", span: 8, height: 360 }), {
      tooltip: { trigger: "axis" },
      xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
      yAxis: valueAxis({ min: 0, max: 100 }),
      series: items.map((item, index) => ({
        name: item.name, type: "line", connectNulls: true, symbolSize: 8,
        lineStyle: { width: 3, color: tint[index] }, itemStyle: { color: tint[index] },
        data: years.map((year) => item.series.find((point) => point[0] === year)?.[1] ?? null),
      })),
    });

    const box = stats.map((s, index) => {
      const values = [...s.pcts].sort((x, y) => x - y);
      if (!values.length) return null;
      return {
        value: [values[0], quantile(values, 0.25), quantile(values, 0.5), quantile(values, 0.75), values[values.length - 1]],
        itemStyle: { color: tint[index] },
      };
    });
    plot(chartCard(a, { title: "Distribución de resultados", sub: "Cada caja resume todas las finales de la entidad", span: 4, height: 360 }), {
      tooltip: {
        formatter: (point) => {
          const s = stats[point.dataIndex];
          const v = point.data?.value ?? point.data;
          if (!s || !v) return esc(s?.item.name ?? "");
          return `<b>${esc(s.item.name)}</b><br>Mínimo ${fmt(v[0], 1)}<br>Q1 ${fmt(v[1], 1)}<br>Mediana ${fmt(v[2], 1)}<br>Q3 ${fmt(v[3], 1)}<br>Máximo ${fmt(v[4], 1)}`;
        },
      },
      grid: { bottom: stats.length > 2 ? 54 : 32 },
      xAxis: categoryAxis(stats.map((s) => chartName(s.item.name)), { axisLabel: { interval: 0, rotate: stats.length > 2 ? 24 : 0, fontSize: stats.length > 2 ? 9 : 10 } }),
      yAxis: valueAxis({ min: 0, max: 100 }),
      series: [{ type: "boxplot", data: box, boxWidth: [12, 38] }],
    });

    plot(chartCard(a, { title: "Problemas resueltos por edición", sub: kind === "t" ? "En cada final" : "Media de sus equipos en cada final", span: 6, height: 320 }), {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: categoryAxis(years.map(String)),
      yAxis: valueAxis({ minInterval: 1 }),
      series: items.map((item, index) => ({
        name: item.name, type: "bar", barMaxWidth: 12,
        itemStyle: { color: tint[index], borderRadius: [3, 3, 0, 0] },
        data: years.map((year) => {
          const solved = item.rows.filter((row) => row.year === year && row.solved != null).map((row) => row.solved);
          return solved.length ? +avg(solved).toFixed(1) : null;
        }),
      })),
    });

    const scatter = stats.filter((s) => s.meanLevel != null && s.avgPct != null);
    if (scatter.length) {
      plot(chartCard(a, { title: "Dificultad media frente a resultado", sub: "Nivel medio de los problemas que resuelve cada entidad", span: 6, height: 320 }), {
        tooltip: {
          formatter: (point) => {
            const s = scatter[point.dataIndex];
            return `<b>${esc(s.item.name)}</b><br>Nivel medio ${s.meanLevel}<br>Percentil medio ${pctText(s.avgPct)}<br>${s.distinctSolves} problemas distintos`;
          },
        },
        xAxis: valueAxis({ min: 1, max: 6, name: "Nivel medio", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: c.dim } }),
        yAxis: valueAxis({ min: 0, max: 100, name: "Percentil medio", nameTextStyle: { color: c.dim } }),
        series: [{
          type: "scatter",
          data: scatter.map((s, index) => ({
            name: s.item.name,
            value: [s.meanLevel, s.avgPct, s.distinctSolves],
            itemStyle: { color: tint[stats.indexOf(s)], opacity: 0.8 },
          })),
          symbolSize: (value) => 12 + Math.sqrt(value[2] || 1) * 2.2,
          label: { show: true, position: "top", color: c.ink, fontSize: 11, formatter: (point) => chartName(point.data.name) },
          labelLayout: { hideOverlap: true },
        }],
      });
    } else {
      card(a, { title: "Dificultad media frente a resultado", span: 6, height: 320, html: '<p class="sub">Sin perfil de complejidad para estas entidades en 2011–2025.</p>' });
    }

    const levelStats = stats.filter((s) => s.profile && s.levels.some((value) => value > 0));
    if (levelStats.length) {
      const levelNames = cx.levels.map((level) => level.label);
      plot(chartCard(a, { title: "Niveles de dificultad", sub: "Porcentaje de solves en cada nivel, 2011–2025", span: 6, height: 320 }), {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: (points) => {
            const s = levelStats[points[0].dataIndex];
            return `<b>${esc(s.item.name)}</b><br>${points.map((point) => `${point.marker}${point.seriesName}: ${point.value}%`).join("<br>")}<br><small>${s.levels.reduce((sum, value) => sum + value, 0)} solves</small>`;
          },
        },
        grid: { bottom: levelStats.length > 2 ? 54 : 32 },
        xAxis: categoryAxis(levelStats.map((s) => chartName(s.item.name)), { axisLabel: { interval: 0, rotate: levelStats.length > 2 ? 24 : 0, fontSize: levelStats.length > 2 ? 9 : 10 } }),
        yAxis: valueAxis({ min: 0, max: 100, axisLabel: { formatter: "{value}%" } }),
        series: levelNames.map((name, level) => ({
          name, type: "bar", stack: "levels", barMaxWidth: 42,
          itemStyle: { color: LEVEL_COLORS[level] },
          data: levelStats.map((s) => {
            const total = s.levels.reduce((sum, value) => sum + value, 0);
            return total ? +(100 * s.levels[level] / total).toFixed(1) : 0;
          }),
        })),
      });
    } else {
      card(a, { title: "Niveles de dificultad", span: 6, html: '<p class="sub">Sin perfil de complejidad para estas entidades en 2011–2025.</p>' });
    }

    const groups = [
      {
        label: "Resultados",
        rows: [
          { label: "Finales", value: (s) => s.finals, best: (s) => s.finals, dir: "max" },
          { label: "Participaciones", value: (s) => s.participations, best: (s) => s.participations, dir: "max" },
          { label: "Primera / última", value: (s) => s.years.length ? `${s.years[0]}–${s.years[s.years.length - 1]}` : "—", num: false },
          { label: "Mejor puesto", value: (s) => s.best ? `${place(s.best.rank)} (${s.best.year})` : "—", best: (s) => s.best?.rank, dir: "min" },
          { label: "Peor puesto", value: (s) => s.worst ? `${place(s.worst.rank)} (${s.worst.year})` : "—" },
          { label: kind === "t" ? "Percentil medio" : "Percentil medio por equipo", value: (s) => pctText(s.avgPct), best: (s) => s.avgPct, dir: "max" },
          { label: "Percentil mediano", value: (s) => pctText(s.medianPct), best: (s) => s.medianPct, dir: "max" },
          { label: "Consistencia (σ)", value: (s) => (s.sd == null ? "—" : fmt(s.sd, 1)), best: (s) => s.sd, dir: "min" },
          { label: "Tendencia reciente", value: (s) => (s.trend == null ? "—" : `${signed(s.trend)} pp`), best: (s) => s.trend, dir: "max" },
          { label: "Con veteranos", value: (s) => pctText(s.vets), best: (s) => s.vets, dir: "max" },
        ],
      },
      {
        label: "Problemas y dificultad",
        rows: [
          { label: "Solves totales", value: (s) => fmt(s.totalSolved), best: (s) => s.totalSolved, dir: "max" },
          { label: kind === "t" ? "Solves por final" : "Solves por participación", value: (s) => (s.avgSolved == null ? "—" : fmt(s.avgSolved, 1)), best: (s) => s.avgSolved, dir: "max" },
          { label: "Máximo en una final", value: (s) => fmt(s.maxSolved), best: (s) => s.maxSolved, dir: "max" },
          { label: "Penalización por resuelto", value: (s) => (s.timePerSolve == null ? "—" : fmt(s.timePerSolve, 1)), best: (s) => s.timePerSolve, dir: "min" },
          { label: "Problemas distintos 2011–2025", value: (s) => fmt(s.distinctSolves), best: (s) => s.distinctSolves, dir: "max" },
          { label: "Nivel medio resuelto", value: (s) => s.meanLevel ?? "—", best: (s) => s.meanLevel, dir: "max" },
          { label: "Intentos por solve", value: (s) => s.attemptsPerSolve ?? "—", best: (s) => s.attemptsPerSolve, dir: "min" },
          { label: "Podios", value: (s) => s.podiums, best: (s) => s.podiums, dir: "max" },
          { label: "Top 10", value: (s) => s.top10, best: (s) => s.top10, dir: "max" },
        ],
      },
      {
        label: "Medallas y títulos",
        rows: [
          { label: "Oro", value: (s) => s.medals.gold, best: (s) => s.medals.gold, dir: "max" },
          { label: "Plata", value: (s) => s.medals.silver, best: (s) => s.medals.silver, dir: "max" },
          { label: "Bronce", value: (s) => s.medals.bronze, best: (s) => s.medals.bronze, dir: "max" },
          { label: "Títulos mundiales", value: (s) => s.world, best: (s) => s.world, dir: "max" },
          { label: "Títulos regionales", value: (s) => s.regional, best: (s) => s.regional, dir: "max" },
        ],
      },
      {
        label: "Contexto",
        rows: [
          { label: kind === "c" ? "Universidades" : kind === "u" ? "Equipos" : "Equipo", value: (s) => (kind === "t" ? "1" : kind === "c" ? s.universities : s.teams), best: (s) => (kind === "t" ? null : kind === "c" ? s.universities : s.teams), dir: "max" },
          { label: "Personas", value: (s) => s.people.length, best: (s) => s.people.length, dir: "max" },
          { label: "Área dominante", value: (s) => (s.profile ? categoryLabel(cx, "areas", topKey(s.profile.areas)) : "—"), num: false },
          { label: "Técnica dominante", value: (s) => (s.profile ? categoryLabel(cx, "techniques", topKey(s.profile.techniques)) : "—"), num: false },
        ],
      },
    ];
    card(a, {
      title: "Frente a frente", span: 12,
      sub: "El mejor valor de cada fila se marca en color. La dificultad y los temas cubren 2011–2025.",
      html: compareTable(stats, groups),
    });

    // Problems, overlap and walls.
    const withProfile = stats.filter((s) => s.profile);
    if (withProfile.length) {
      const canCompare = withProfile.length >= 2;
      const common = canCompare ? [...withProfile[0].solvedSet].filter((id) => withProfile.every((s) => s.solvedSet.has(id))) : [];
      const exclusive = canCompare ? withProfile.map((s) => [...s.solvedSet].filter((id) => !withProfile.some((other) => other !== s && other.solvedSet.has(id)))) : [];
      const exclusiveIds = [...new Set(exclusive.flat())];
      const fieldSolved = new Set(cx.problems.filter((p) => p.solved > 0).map((p) => p.id));
      const wallRows = withProfile.map((s) => {
        const walls = [...s.attemptedSet].filter((id) => fieldSolved.has(id) && !s.solvedSet.has(id));
        const untried = [...fieldSolved].filter((id) => !s.attemptedSet.has(id));
        const byLevel = (ids) => {
          const counts = [0, 0, 0, 0, 0, 0];
          for (const id of ids) {
            const problem = cx.problemById.get(id);
            if (problem) counts[problem.level - 1] += 1;
          }
          return counts;
        };
        return { s, walls, untried, wallLevels: byLevel(walls), untriedLevels: byLevel(untried) };
      });
      const problemRows = (ids, limit) => ids
        .map((id) => cx.problemById.get(id))
        .filter(Boolean)
        .sort((x, y) => x.year - y.year || x.letter.localeCompare(y.letter))
        .slice(0, limit)
        .map((problem) => [
          problem.year, problem.letter, esc(problem.title), problem.level,
          esc(categoryLabel(cx, "areas", problem.area)), esc(categoryLabel(cx, "techniques", problem.technique)),
        ]);
      const commonRows = problemRows(common, 20);
      const exclusiveRows = exclusiveIds
        .map((id) => cx.problemById.get(id))
        .filter(Boolean)
        .sort((x, y) => x.year - y.year || x.letter.localeCompare(y.letter))
        .slice(0, 30)
        .map((problem) => [
          ...problemRows([problem.id], 1)[0],
          withProfile.filter((s) => s.solvedSet.has(problem.id)).map((s) => esc(s.item.name)).join(", "),
        ]);
      card(a, {
        title: "Problemas en común y exclusivos", span: 12,
        sub: "Solo problemas de 2011–2025. Un problema cuenta como exclusivo si ninguna otra entidad seleccionada lo resolvió.",
        html: `${canCompare ? `<div class="compare-overlap"><span><b>${common.length}</b> en común</span>${withProfile.map((s, index) => `<span><b>${exclusive[index].length}</b> solo ${esc(s.item.name)}</span>`).join("")}</div>
          <h3 class="compare-subhead">Resueltos por todas (${common.length})</h3>
          ${common.length ? table(
            ["Año", "Letra", "Problema", { label: "Nivel", num: 1 }, "Área", "Técnica"],
            commonRows,
          ) : '<p class="sub">No hay problemas comunes en la ventana de complejidad.</p>'}
          ${common.length > 20 ? `<p class="note">Se muestran 20 de ${common.length}.</p>` : ""}
          <h3 class="compare-subhead">Exclusivos (${exclusiveIds.length})</h3>
          ${exclusiveIds.length ? table(
            ["Año", "Letra", "Problema", { label: "Nivel", num: 1 }, "Área", "Técnica", "Lo resolvió"],
            exclusiveRows,
          ) : '<p class="sub">No hay problemas exclusivos en la ventana de complejidad.</p>'}
          <p class="note">Se muestran hasta 30 problemas exclusivos de ${exclusiveIds.length}. Los temas son el área y la técnica principal del catálogo.</p>` : '<p class="sub">Añade otra entidad de la misma clase para ver problemas comunes y exclusivos.</p>'}
          <h3 class="compare-subhead">Muros y problemas no intentados</h3>
          ${table(
            ["Entidad", { label: "Muros", num: 1 }, { label: "N1–N2", num: 1 }, { label: "N3–N4", num: 1 }, { label: "N5–N6", num: 1 }, { label: "No intentados", num: 1 }],
            wallRows.map(({ s, walls, untried, wallLevels, untriedLevels }) => [
              `<a href="${s.item.url}">${esc(s.item.name)}</a>`, walls.length,
              wallLevels[0] + wallLevels[1], wallLevels[2] + wallLevels[3], wallLevels[4] + wallLevels[5],
              untried.length,
            ]),
          )}
          <p class="note">Un muro es un problema que el campo resolvió, la entidad intentó y no resolvió. No intentado es un problema resuelto por el campo que la entidad ni siquiera intentó. Solo se cuentan problemas de 2011–2025.</p>`,
      });
    } else {
      card(a, {
        title: "Problemas en común y exclusivos", span: 12,
        html: '<p class="sub">Sin perfil de complejidad para estas entidades en 2011–2025. Los resultados y las medallas sí cubren toda la serie.</p>',
      });
    }

    // Areas and techniques heatmaps.
    if (withProfile.length) {
      const areas = cx.areas;
      const techniques = [...cx.techniques].sort((x, y) => {
        const bx = withProfile.reduce((total, s) => total + (s.profile.techniques[y.id] ?? 0), 0);
        const ax = withProfile.reduce((total, s) => total + (s.profile.techniques[x.id] ?? 0), 0);
        return bx - ax;
      }).slice(0, 12);
      const areaBody = card(a, {
        title: "Áreas", span: 12,
        sub: "Porcentaje de solves de cada entidad en cada área principal, 2011–2025.",
        html: heatTable(withProfile, areas.map((area) => ({ ...area })), (s, area) => s.profile.areas[area.id] ?? 0, (s) => s.totalAreas, "Entidad"),
      });
      areaBody.querySelector(".tablew")?.style.setProperty("--table-h", "420px");
      const techBody = card(a, {
        title: "Técnicas", span: 12,
        sub: "Las 12 técnicas con más solves entre las entidades elegidas; porcentaje sobre sus solves.",
        html: heatTable(withProfile, techniques.map((tech) => ({ ...tech })), (s, tech) => s.profile.techniques[tech.id] ?? 0, (s) => s.totalTechniques, "Entidad"),
      });
      techBody.querySelector(".tablew")?.style.setProperty("--table-h", "420px");

      const fieldAreas = cx.totals.solvedAreas ?? {};
      const fieldTotal = sum(Object.values(fieldAreas));
      card(a, {
        title: "Especialización por área", span: 12,
        sub: "Diferencia entre la cuota de la entidad y la cuota del campo. Positivo: más presente de lo habitual.",
        html: `<div class="compare-specialization">${withProfile.map((s) => {
          const total = s.totalAreas;
          const diffs = areas.map((area) => {
            const own = total ? (100 * (s.profile.areas[area.id] ?? 0)) / total : 0;
            const field = fieldTotal ? (100 * (fieldAreas[area.id] ?? 0)) / fieldTotal : 0;
            return { label: area.label, value: own - field, count: s.profile.areas[area.id] ?? 0 };
          }).filter((item) => item.count > 0).sort((x, y) => y.value - x.value);
          const positive = diffs.filter((item) => item.value > 0).slice(0, 3);
          const negative = diffs.filter((item) => item.value < 0).sort((x, y) => x.value - y.value).slice(0, 3);
          return `<div class="compare-specialization-row"><b><a href="${s.item.url}">${esc(s.item.name)}</a></b>
            <span><small>Destaca</small>${positive.map((item) => `${esc(item.label)} ${signed(item.value)} pp`).join(" · ") || "—"}</span>
            <span><small>Menos presente</small>${negative.map((item) => `${esc(item.label)} ${signed(item.value)} pp`).join(" · ") || "—"}</span>
            ${s.profile.solves < 10 ? '<small class="compare-small">Muestra pequeña: interpretar con cautela.</small>' : ""}</div>`;
        }).join("")}</div>`,
      });
    }

    // Common years and head-to-head record.
    const yearEntities = new Map();
    for (const [index, s] of stats.entries()) {
      for (const row of s.rows) {
        const seen = yearEntities.get(row.year) ?? new Set();
        seen.add(index);
        yearEntities.set(row.year, seen);
      }
    }
    const commonYears = [...yearEntities].filter(([, seen]) => seen.size >= 2).map(([year]) => year).sort((x, y) => x - y);
    const bestRow = (stat, year) => stat.rows
      .filter((row) => row.year === year)
      .reduce((best, row) => {
        if (!best) return row;
        if (row.rank == null) return best;
        if (best.rank == null) return row;
        return row.rank < best.rank ? row : best;
      }, null);
    const wins = stats.map(() => stats.map(() => 0));
    for (const year of commonYears) {
      const rows = stats.map((s) => bestRow(s, year));
      const ranked = rows.map((row, index) => [row?.rank, index]).filter(([rank]) => rank != null);
      if (ranked.length < 2) continue;
      const best = ranked.reduce((a, b) => (b[0] < a[0] ? b : a));
      for (const [rank, index] of ranked) {
        for (const [otherRank, otherIndex] of ranked) {
          if (index !== otherIndex && rank < otherRank) wins[index][otherIndex] += 1;
        }
      }
    }
    card(a, {
      title: "Años en común", span: 12,
      sub: "Finales en las que coinciden al menos dos de las entidades elegidas.",
      html: stats.length < 2
        ? '<p class="sub">Añade otra entidad para ver los años en común y el duelo directo.</p>'
        : commonYears.length
        ? `${table(
          ["Año", ...stats.map((s) => s.item.name)],
          commonYears.map((year) => [year, ...stats.map((s) => {
            const row = bestRow(s, year);
            return row ? `${place(row.rank)} · ${row.solved ?? "—"} res.` : "—";
          })]),
        )}
        ${stats.length > 1 ? `<h3 class="compare-subhead">Duelo directo</h3><div class="tablew compare-duel"><table data-nosort><thead><tr><th></th>${stats.map((s) => `<th>${esc(s.item.name)}</th>`).join("")}</tr></thead><tbody>${stats.map((a, i) => `<tr><th>${esc(a.item.name)}</th>${stats.map((b, j) => `<td>${i === j ? "—" : `${wins[i][j]}–${wins[j][i]}`}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="note">Cada celda cuenta los años comunes en los que la entidad de la fila quedó por delante de la de la columna.</p>` : ""}`
        : '<p class="sub">No hay finales compartidas entre estas entidades.</p>',
    });

    // Class-specific context.
    const panel = document.createElement("div");
    panel.className = "compare-panels";
    for (const s of stats) {
      const section = document.createElement("section");
      section.className = "compare-panel";
      if (kind === "t") {
        const people = s.people.slice().sort((x, y) => y.years.size - x.years.size || x.name.localeCompare(y.name, "es"));
        const finals = s.rows.slice().sort((x, y) => y.year - x.year);
        section.innerHTML = `<h3><a href="${s.item.url}">${esc(s.item.name)}</a></h3>
          <p class="sub">${esc(s.item.sub)} · ${s.finals} ${s.finals === 1 ? "final" : "finales"}</p>
          <div class="chips">${people.map((person) => `<a class="chip" href="${personUrl(person.id)}">${esc(person.name)}${person.years.size > 1 ? ` (${person.years.size})` : ""}</a>`).join("")}</div>
          ${table(
            ["Año", { label: "Puesto", num: 1 }, { label: "Res.", num: 1 }, { label: "Tiempo", num: 1 }],
            finals.map((row) => [row.year, place(row.rank), row.solved ?? "—", row.time ?? "—"]),
          )}`;
      } else {
        const groups = new Map();
        for (const row of s.rows) {
          const key = kind === "c" ? row.uni : teamKey(row.uni, row.team);
          const group = groups.get(key) ?? {
            key, name: kind === "c" ? row.uniName : row.team, url: kind === "c" ? uniUrl(row.uni) : teamUrl(row.uni, row.team), rows: [],
          };
          group.rows.push(row);
          groups.set(key, group);
        }
        const list = [...groups.values()].map((group) => {
          const ranks = group.rows.map((row) => row.rank).filter((rank) => rank != null);
          const medals = medalCounts(group.rows);
          return {
            ...group, finals: new Set(group.rows.map((row) => row.year)).size,
            best: ranks.length ? Math.min(...ranks) : null,
            medals: medals.gold + medals.silver + medals.bronze,
            solved: sum(group.rows.map((row) => row.solved ?? 0)),
          };
        }).sort((x, y) => (x.best ?? 1e9) - (y.best ?? 1e9) || y.finals - x.finals);
        section.innerHTML = `<h3><a href="${s.item.url}">${esc(s.item.name)}</a></h3>
          <p class="sub">${esc(s.item.sub)} · ${kind === "c" ? `${list.length} universidades` : `${list.length} equipos`}</p>
          ${table(
            [kind === "c" ? "Universidad" : "Equipo", { label: "Finales", num: 1 }, { label: "Mejor", num: 1 }, { label: "Solves", num: 1 }, { label: "Medallas", num: 1 }],
            list.slice(0, 8).map((group) => [`<a href="${group.url}">${esc(group.name)}</a>`, group.finals, group.best == null ? "—" : place(group.best), group.solved, group.medals]),
          )}
          ${list.length > 8 ? `<p class="note">Y ${list.length - 8} más.</p>` : ""}`;
      }
      panel.append(section);
    }
    card(a, {
      title: kind === "c" ? "Universidades del país" : kind === "u" ? "Equipos de la universidad" : "Miembros y finales",
      span: 12,
      html: panel.outerHTML,
    });

    // Quick reading.
    const highest = (list, pick) => list.reduce((best, item) => (pick(item) > pick(best) ? item : best), list[0]);
    const lowest = (list, pick) => list.reduce((best, item) => (pick(item) < pick(best) ? item : best), list[0]);
    const withAvg = stats.filter((s) => s.avgPct != null);
    const withLevel = stats.filter((s) => s.meanLevel != null);
    const insights = [];
    if (withAvg.length) insights.push(`📈 <b>${esc(highest(withAvg, (s) => s.avgPct).item.name)}</b> tiene el mejor percentil medio (${pctText(highest(withAvg, (s) => s.avgPct).avgPct)}).`);
    insights.push(`📅 <b>${esc(highest(stats, (s) => s.finals).item.name)}</b> acumula más finales (${highest(stats, (s) => s.finals).finals}).`);
    const rankedStats = stats.filter((s) => s.best);
    if (rankedStats.length) insights.push(`🏁 El mejor puesto es de <b>${esc(lowest(rankedStats, (s) => s.best.rank).item.name)}</b> (${place(lowest(rankedStats, (s) => s.best.rank).best.rank)} en ${lowest(rankedStats, (s) => s.best.rank).best.year}).`);
    if (withLevel.length) insights.push(`🧩 <b>${esc(highest(withLevel, (s) => s.meanLevel).item.name)}</b> resuelve la mezcla de mayor nivel medio (${highest(withLevel, (s) => s.meanLevel).meanLevel}); no implica mejor resultado, sino problemas más exigentes.`);
    if (withProfile.length) {
      const commonCount = [...withProfile[0].solvedSet].filter((id) => withProfile.every((s) => s.solvedSet.has(id))).length;
      insights.push(`🧠 Hay <b>${commonCount}</b> problemas resueltos por todas las entidades con perfil 2011–2025.`);
      for (const s of withProfile.filter((item) => item.profile.solves > 0)) {
        const area = categoryLabel(cx, "areas", topKey(s.profile.areas));
        const tech = categoryLabel(cx, "techniques", topKey(s.profile.techniques));
        insights.push(`🎯 <b>${esc(s.item.name)}</b> se apoya en <b>${esc(area)}</b> y <b>${esc(tech)}</b>.`);
      }
    }
    if (stats.length === 2) {
      const [x, y] = stats;
      const xw = wins[0][1];
      const yw = wins[1][0];
      insights.push(`⚔️ En los años comunes, <b>${esc(x.item.name)}</b> quedó delante ${xw} ${xw === 1 ? "vez" : "veces"} y <b>${esc(y.item.name)}</b> ${yw}.`);
    }
    card(a, {
      title: "Lectura rápida", span: 12,
      html: `<ul class="ficha">${insights.map((text) => `<li>${text}</li>`).join("")}</ul>`,
    });
  },
});
