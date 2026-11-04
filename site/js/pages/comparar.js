import {
  TITLE_NAMES, avg, compareUrl, countryName, countrySeries, countryUrl, crest, esc,
  medalCounts, params, personUrl, quantile, teamKey, teamSeries, teamUrl,
  uniSeries, uniUrl,
} from "../core.js";
import { categoryAxis, colors, dispose, palette, plot, valueAxis } from "../charts.js";
import { bestResult } from "../profile.js";
import { card, chartCard, grid, isDark, startPage } from "../shell.js";

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
const fmt = (value, digits = 0) => (value == null ? "—" : Number(value).toLocaleString("es", { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const pctText = (value) => (value == null ? "—" : `${fmt(value, 1)}%`);
const signed = (value) => (value == null ? "—" : `${value > 0 ? "+" : ""}${fmt(value, 1)}`);
const place = (value) => (value == null ? "—" : fmt(Math.round(value)));
const topKey = (counts) => Object.entries(counts ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
const sum = (values) => values.reduce((total, value) => total + value, 0);

const heatColor = (value, max) => {
  if (!value) return "transparent";
  const t = max ? Math.min(1, Math.max(0, value / max)) : 0;
  const [from, to] = isDark() ? [[109, 34, 46], [253, 184, 48]] : [[232, 216, 178], [109, 34, 46]];
  return `rgba(${from.map((channel, index) => Math.round(channel + (to[index] - channel) * t)).join(",")},${(0.18 + 0.52 * t).toFixed(2)})`;
};
const heatInk = (value, max) => {
  const t = max ? Math.min(1, Math.max(0, value / max)) : 0;
  return isDark()
    ? (t > 0.55 ? "#2b0d12" : "#fbf4e4")
    : (t > 0.55 ? "#fbf4e4" : "#2b0d12");
};

function metricBoard(stats, groups, tint) {
  const widthOf = (row, stat) => {
    if (!row.best) return null;
    const values = stats.map(row.best).filter((value) => value != null && Number.isFinite(value));
    const value = row.best(stat);
    if (!values.length || value == null || !Number.isFinite(value)) return null;
    const max = Math.max(...values);
    const min = Math.min(...values.filter((item) => item > 0));
    if (row.dir === "min") {
      if (value <= 0) return max > 0 ? 100 : 0;
      return min ? Math.min(100, (100 * min) / value) : 0;
    }
    return max > 0 ? Math.min(100, (100 * value) / max) : 0;
  };
  return `<div class="compare-metric-groups">${groups.map((group) => `<section class="compare-metric-group"><h3>${esc(group.label)}</h3><div class="compare-metric-grid">${group.rows.map((row) => `<article class="compare-metric"><h4>${esc(row.label)}</h4><div class="compare-metric-lines">${stats.map((stat, index) => {
    const value = row.value(stat);
    const width = widthOf(row, stat);
    const hasBar = width != null && width > 0;
    return `<div class="compare-metric-line" style="--c:${tint[index]}" title="${esc(stat.item.name)}: ${value}"><span class="compare-metric-name">${esc(axisName(stat.item.name))}</span><span class="compare-metric-track${hasBar ? "" : " empty"}">${hasBar ? `<i style="width:${Math.max(2, width).toFixed(1)}%"></i>` : ""}</span><b>${value}</b></div>`;
  }).join("")}</div></article>`).join("")}</div></section>`).join("")}</div>`;
}

const chartName = (name) => {
  const clean = name
    .replace(/^Universidad de las /i, "")
    .replace(/^Universidad del /i, "")
    .replace(/^Universidad de la /i, "La ")
    .replace(/^Universidad de /i, "")
    .replace(/^University of /i, "");
  return clean.length > 21 ? `${clean.slice(0, 20)}…` : clean;
};
const axisName = (name) => chartName(name).replace(/\s*-\s*Sede.*$/i, "").replace(/\s*\(.*\)$/, "").trim();

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
      const topic = new URLSearchParams(location.search).get("tema");
      const suffix = topic ? `&tema=${encodeURIComponent(topic)}` : "";
      history.replaceState(null, "", `${compareUrl(nextKind, nextKeys)}${suffix}`);
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
      const regionalTitles = rows.flatMap((row) => row.titles.filter((title) => title !== "World").map((title) => ({ title, year: row.year })));
      const worldYears = rows.filter((row) => row.titles.includes("World")).map((row) => row.year);
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
        item, rows, pcts, best, worst, years, medals, world, regional, regionalTitles, worldYears,
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

    const tint = palette();
    const c = colors();
    const summary = document.createElement("div");
    summary.className = "compare-cards";
    summary.innerHTML = stats.map((s, index) => `<article class="compare-card" style="--compare-color:${tint[index]}">
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

    const withProfile = stats.filter((s) => s.profile);
    const fieldSolved = cx ? new Set(cx.problems.filter((problem) => problem.solved > 0).map((problem) => problem.id)) : new Set();
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
      xAxis: categoryAxis(stats.map((s) => axisName(s.item.name)), { axisLabel: { interval: 0, rotate: stats.length > 2 ? 24 : 0, fontSize: stats.length > 2 ? 9 : 10 } }),
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
        xAxis: categoryAxis(levelStats.map((s) => axisName(s.item.name)), { axisLabel: { interval: 0, rotate: levelStats.length > 2 ? 24 : 0, fontSize: levelStats.length > 2 ? 9 : 10 } }),
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

    if (wallRows.length) {
      const wallBody = card(a, {
        title: "Muros por nivel", span: 6,
        sub: "Problemas que el campo resolvió y la entidad intentó sin resolver, 2011–2025.",
        html: `<div class="plot" id="wall-chart" style="height:280px"></div><p class="note">No intentados: ${wallRows.map((row) => `${esc(row.s.item.name)}: ${row.untried.length}`).join(" · ")}.</p>`,
      });
      const wallGroups = [["N1–N2", 0, 1], ["N3–N4", 2, 3], ["N5–N6", 4, 5]];
      plot(wallBody.querySelector("#wall-chart"), {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { bottom: wallRows.length > 2 ? 54 : 34 },
        xAxis: categoryAxis(wallRows.map((row) => axisName(row.s.item.name)), { axisLabel: { interval: 0, rotate: wallRows.length > 2 ? 24 : 0, fontSize: 9 } }),
        yAxis: valueAxis({ minInterval: 1 }),
        series: wallGroups.map(([name, from, to], index) => ({
          name, type: "bar", stack: "walls", barMaxWidth: 38,
          itemStyle: { color: ["#c9a86a", "#d97f45", "#af3227"][index] },
          data: wallRows.map((row) => row.wallLevels[from] + row.wallLevels[to]),
        })),
      });
    } else {
      card(a, { title: "Muros por nivel", span: 6, html: '<p class="sub">Sin perfil de complejidad para estas entidades en 2011–2025.</p>' });
    }

    const groups = [
      {
        label: "Resultados",
        rows: [
          { label: "Finales", value: (s) => s.finals, best: (s) => s.finals, dir: "max" },
          { label: "Primera / última", value: (s) => (s.years.length ? `${s.years[0]}–${s.years[s.years.length - 1]}` : "—"), num: false },
          { label: "Mejor puesto", value: (s) => (s.best ? `${place(s.best.rank)} (${s.best.year})` : "—"), best: (s) => s.best?.rank, dir: "min" },
          { label: kind === "t" ? "Percentil medio" : "Percentil medio por equipo", value: (s) => pctText(s.avgPct), best: (s) => s.avgPct, dir: "max" },
          { label: "Consistencia (σ)", value: (s) => (s.sd == null ? "—" : fmt(s.sd, 1)), best: (s) => s.sd, dir: "min" },
          { label: "Tendencia reciente", value: (s) => (s.trend == null ? "—" : `${signed(s.trend)} pp`), best: (s) => s.trend, dir: "max" },
        ],
      },
      {
        label: "Problemas y dificultad",
        rows: [
          { label: "Solves totales", value: (s) => fmt(s.totalSolved), best: (s) => s.totalSolved, dir: "max" },
          { label: kind === "t" ? "Solves por final" : "Solves por participación", value: (s) => (s.avgSolved == null ? "—" : fmt(s.avgSolved, 1)), best: (s) => s.avgSolved, dir: "max" },
          { label: "Nivel medio resuelto", value: (s) => s.meanLevel ?? "—", best: (s) => s.meanLevel, dir: "max" },
          { label: "Penalización por resuelto", value: (s) => (s.timePerSolve == null ? "—" : fmt(s.timePerSolve, 1)), best: (s) => s.timePerSolve, dir: "min" },
          { label: "Problemas distintos 2011–2025", value: (s) => fmt(s.distinctSolves), best: (s) => s.distinctSolves, dir: "max" },
          { label: "Intentos por solve", value: (s) => s.attemptsPerSolve ?? "—", best: (s) => s.attemptsPerSolve, dir: "min" },
        ],
      },
      {
        label: "Medallas y títulos",
        rows: [
          { label: "Oro", value: (s) => s.medals.gold, best: (s) => s.medals.gold, dir: "max" },
          { label: "Plata", value: (s) => s.medals.silver, best: (s) => s.medals.silver, dir: "max" },
          { label: "Bronce", value: (s) => s.medals.bronze, best: (s) => s.medals.bronze, dir: "max" },
          { label: "Podios", value: (s) => s.podiums, best: (s) => s.podiums, dir: "max" },
          { label: "Títulos mundiales", value: (s) => s.world, best: (s) => s.world, dir: "max" },
          { label: "Títulos regionales", value: (s) => s.regional, best: (s) => s.regional, dir: "max" },
        ],
      },
      {
        label: "Contexto",
        rows: [
          { label: kind === "c" ? "Universidades" : kind === "u" ? "Equipos" : "Equipo", value: (s) => (kind === "t" ? "1" : kind === "c" ? s.universities : s.teams), best: (s) => (kind === "t" ? null : kind === "c" ? s.universities : s.teams), dir: "max" },
          { label: "Personas", value: (s) => s.people.length, best: (s) => s.people.length, dir: "max" },
          { label: "Con veteranos", value: (s) => pctText(s.vets), best: (s) => s.vets, dir: "max" },
          { label: "Participaciones", value: (s) => s.participations, best: (s) => s.participations, dir: "max" },
          { label: "Área dominante", value: (s) => (s.profile ? categoryLabel(cx, "areas", topKey(s.profile.areas)) : "—"), num: false },
          { label: "Técnica dominante", value: (s) => (s.profile ? categoryLabel(cx, "techniques", topKey(s.profile.techniques)) : "—"), num: false },
        ],
      },
    ];
    card(a, {
      title: "Frente a frente", span: 12,
      sub: "Cada tarjeta compara una métrica; la barra es relativa al máximo del grupo y el valor exacto está a la derecha. La dificultad y los temas cubren 2011–2025.",
      html: metricBoard(stats, groups, tint),
    });

    // Problems: overlap summary and exclusive-problem scatter.
    if (withProfile.length) {
      const canCompare = withProfile.length >= 2;
      const common = canCompare ? [...withProfile[0].solvedSet].filter((id) => withProfile.every((s) => s.solvedSet.has(id))) : [];
      const exclusive = canCompare ? withProfile.map((s) => [...s.solvedSet].filter((id) => !withProfile.some((other) => other !== s && other.solvedSet.has(id)))) : [];
      const exclusiveIds = [...new Set(exclusive.flat())];
      const overlap = `<div class="compare-overlap"><span><b>${common.length}</b> problemas en común</span>${withProfile.map((s, index) => `<span><b>${exclusive[index].length}</b> solo ${esc(s.item.name)}</span>`).join("")}</div>`;
      if (canCompare && exclusiveIds.length) {
        const body = card(a, {
          title: "Problemas exclusivos", span: 12,
          sub: "Cada punto es un problema que solo resolvió una de las entidades. El eje vertical es el nivel de dificultad.",
          html: `${overlap}<div class="plot" id="exclusive-chart" style="height:330px"></div><p class="note">Pasa el cursor por un punto para ver año, título, área y técnica. Solo problemas de 2011–2025.</p>`,
        });
        const cxYears = Array.from({ length: 15 }, (_, index) => String(2011 + index));
        plot(body.querySelector("#exclusive-chart"), {
          tooltip: {
            formatter: (point) => {
              const value = point.value;
              return `<b>${esc(value[3])}</b><br>${value[0]} · N${value[1]} · resuelto por ${value[2]}% del campo<br>${esc(value[4])} · ${esc(value[5])}<br><b>${esc(point.seriesName)}</b>`;
            },
          },
          grid: { bottom: 62 },
          xAxis: categoryAxis(cxYears, { boundaryGap: true }),
          yAxis: valueAxis({ min: 1, max: 6, minInterval: 1, name: "Nivel", nameTextStyle: { color: c.dim } }),
          series: withProfile.map((s) => ({
            name: s.item.name, type: "scatter", symbolSize: (value) => 8 + value[2] / 9,
            itemStyle: { color: tint[stats.indexOf(s)], opacity: 0.82 },
            data: exclusiveIds.filter((id) => s.solvedSet.has(id)).map((id) => {
              const problem = cx.problemById.get(id);
              if (!problem) return null;
              return {
                name: problem.title,
                value: [String(problem.year), problem.level, +(100 * problem.solveRate).toFixed(1), problem.title, categoryLabel(cx, "areas", problem.area), categoryLabel(cx, "techniques", problem.technique)],
              };
            }).filter(Boolean),
          })),
        });
      } else {
        card(a, {
          title: "Problemas exclusivos", span: 12,
          html: `${overlap}<p class="sub">${canCompare ? "No hay problemas exclusivos en la ventana 2011–2025." : "Añade otra entidad de la misma clase para ver problemas comunes y exclusivos."}</p>`,
        });
      }
    } else {
      card(a, {
        title: "Problemas en común y exclusivos", span: 12,
        html: '<p class="sub">Sin perfil de complejidad para estas entidades en 2011–2025. Los resultados y las medallas sí cubren toda la serie.</p>',
      });
    }

    // Topics: one heatmap with an area/technique selector.
    if (withProfile.length) {
      const areas = cx.areas;
      const areaValues = withProfile.map((s) => areas.map((area) => {
        const count = s.profile.areas[area.id] ?? 0;
        return { count, share: s.totalAreas ? (100 * count) / s.totalAreas : 0 };
      }));
      const areaMax = Math.max(1, ...areaValues.flat().map((item) => item.share));

      const techniques = [...cx.techniques].sort((x, y) => {
        const bx = withProfile.reduce((total, s) => total + (s.profile.techniques[y.id] ?? 0), 0);
        const ax = withProfile.reduce((total, s) => total + (s.profile.techniques[x.id] ?? 0), 0);
        return bx - ax;
      }).slice(0, 12);
      const techValues = withProfile.map((s) => techniques.map((tech) => {
        const count = s.profile.techniques[tech.id] ?? 0;
        return { count, share: s.totalTechniques ? (100 * count) / s.totalTechniques : 0 };
      }));
      const techMax = Math.max(1, ...techValues.flat().map((item) => item.share));

      const topicSets = {
        area: {
          columns: areas, values: areaValues, max: areaMax, rotate: 30, fontSize: 10, bottom: 72,
          height: Math.max(230, withProfile.length * 48 + 100),
          hint: "Desliza para ver todas las áreas →", foot: "Más intenso = mayor cuota. Solo el área principal de cada problema.",
        },
        tecnica: {
          columns: techniques, values: techValues, max: techMax, rotate: 32, fontSize: 9, bottom: 82,
          height: Math.max(250, withProfile.length * 48 + 110),
          hint: "Desliza para ver todas las técnicas →", foot: "Porcentaje sobre los solves de cada entidad. Solo la técnica principal de cada problema.",
        },
      };
      let topicKind = url.get("tema") === "tecnica" ? "tecnica" : "area";
      const topicBody = card(a, {
        title: "Temas", span: 12,
        sub: "Áreas o técnicas de los problemas resueltos, 2011–2025. Cambia la vista sin salir de la comparación.",
        html: `<div class="compare-topic-toolbar"><span class="seg" role="group" aria-label="Ver áreas o técnicas"><button data-topic="area" aria-pressed="true">Áreas</button><button data-topic="tecnica" aria-pressed="false">Técnicas</button></span></div><p class="mobile-hint" id="topic-hint"></p><div class="plot-scroll"><div class="plot" id="topic-heat" style="min-width:760px"></div></div><p class="note" id="topic-foot"></p>`,
      });
      const topicDiv = topicBody.querySelector("#topic-heat");
      const topicHint = topicBody.querySelector("#topic-hint");
      const topicFoot = topicBody.querySelector("#topic-foot");
      const topicOption = (set) => ({
        tooltip: {
          formatter: (point) => {
            const value = point.value;
            return `<b>${esc(set.columns[value[0]].label)}</b><br>${esc(withProfile[value[1]].item.name)}: ${fmt(value[2], 1)}% (${value[3]} solves)`;
          },
        },
        grid: { left: 8, right: 16, top: 12, bottom: set.bottom, containLabel: true },
        xAxis: categoryAxis(set.columns.map((column) => column.label), { axisLabel: { interval: 0, rotate: set.rotate, fontSize: set.fontSize } }),
        yAxis: categoryAxis(withProfile.map((s) => axisName(s.item.name)), { inverse: true, axisLabel: { interval: 0, fontSize: 10 } }),
        series: [{
          type: "heatmap",
          data: withProfile.flatMap((s, y) => set.columns.map((column, x) => {
            const item = set.values[y][x];
            return { value: [x, y, item.share, item.count], itemStyle: { color: heatColor(item.share, set.max) }, label: { color: heatInk(item.share, set.max) } };
          })),
          label: { show: true, fontSize: set.fontSize, formatter: (point) => (point.value[2] ? `${fmt(point.value[2], 1)}%` : "") },
          itemStyle: { borderColor: c.panel, borderWidth: 2 },
        }],
      });
      let topicChart = null;
      const drawTopic = () => {
        const set = topicSets[topicKind];
        if (topicChart) dispose(topicChart);
        topicDiv.style.height = `${set.height}px`;
        topicChart = plot(topicDiv, topicOption(set));
        topicHint.textContent = set.hint;
        topicFoot.textContent = set.foot;
        topicBody.querySelectorAll("[data-topic]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.topic === topicKind)));
      };
      topicBody.querySelectorAll("[data-topic]").forEach((button) => {
        button.onclick = () => {
          if (button.dataset.topic === topicKind) return;
          topicKind = button.dataset.topic;
          const query = new URLSearchParams(location.search);
          query.set("tema", topicKind);
          history.replaceState(null, "", `${location.pathname}?${query}`);
          drawTopic();
        };
      });
      drawTopic();

      // Specialization as a dot plot: one row per area, one dot per entity.
      const fieldAreas = cx.totals.solvedAreas ?? {};
      const fieldTotal = sum(Object.values(fieldAreas));
      const specRows = areas.map((area) => {
        const field = fieldTotal ? (100 * (fieldAreas[area.id] ?? 0)) / fieldTotal : 0;
        const points = withProfile.map((s) => {
          const count = s.profile.areas[area.id] ?? 0;
          const own = s.totalAreas ? (100 * count) / s.totalAreas : 0;
          return { count, own, diff: own - field };
        });
        return { area, field, points, spread: Math.max(...points.map((point) => Math.abs(point.diff))) };
      }).filter((row) => row.points.some((point) => point.count > 0)).sort((x, y) => y.spread - x.spread);
      if (specRows.length) {
        const diffs = specRows.flatMap((row) => row.points.filter((point) => point.count > 0).map((point) => point.diff));
        const specBody = card(a, {
          title: "Especialización por área", span: 12,
          sub: "Cada punto es una entidad. La línea 0 es la cuota global; arriba, las áreas que más diferencian a las entidades.",
          html: `<p class="mobile-hint">Desliza para ver todas las áreas →</p><div class="plot-scroll"><div class="plot" id="spec-dot" style="height:${Math.max(320, specRows.length * 30 + 70)}px;min-width:680px"></div></div><p class="note">Puntos a la derecha: más presentes de lo esperado. Puntos a la izquierda: menos presentes. Solo áreas con solves.</p>`,
        });
        plot(specBody.querySelector("#spec-dot"), {
          tooltip: {
            formatter: (point) => {
              const data = point.data;
              return `<b>${esc(data.entity)}</b><br>${esc(data.area)}: ${signed(point.value[0])} pp<br>Cuota ${fmt(data.own, 1)}% · campo ${fmt(data.field, 1)}%`;
            },
          },
          grid: { left: 8, right: 28, top: 12, bottom: 48, containLabel: true },
          xAxis: valueAxis({ min: Math.floor(Math.min(0, ...diffs) - 2), max: Math.ceil(Math.max(0, ...diffs) + 2), name: "puntos porcentuales", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: c.dim } }),
          yAxis: categoryAxis(specRows.map((row) => row.area.label), { inverse: true, axisLabel: { interval: 0, fontSize: 10 } }),
          series: withProfile.map((s, index) => ({
            name: s.item.name, type: "scatter", symbolSize: 11,
            itemStyle: { color: tint[stats.indexOf(s)] },
            data: specRows.map((row, y) => {
              const point = row.points[index];
              if (!point.count) return null;
              return { value: [point.diff, y], entity: s.item.name, area: row.area.label, own: point.own, field: row.field };
            }).filter(Boolean),
            markLine: index === 0 ? { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: c.dim, type: "dashed", width: 1 }, data: [{ xAxis: 0 }] } : undefined,
          })),
        });
      } else {
        card(a, { title: "Especialización por área", span: 12, html: '<p class="sub">Sin solves suficientes para calcular la especialización.</p>' });
      }

      const taskTotal = (s) => sum(Object.values(s.profile.tasks ?? {}));
      const burdenTotal = (s) => sum(Object.values(s.profile.burdens ?? {}));
      if (withProfile.some((s) => taskTotal(s))) {
        plot(chartCard(a, { title: "Tareas", sub: "Porcentaje de solves por tipo de tarea, 2011–2025", span: 6, height: 300 }), {
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: 8, right: 18, top: 16, bottom: 54, containLabel: true },
          xAxis: valueAxis({ min: 0, max: 100, axisLabel: { formatter: "{value}%" } }),
          yAxis: categoryAxis(withProfile.map((s) => axisName(s.item.name)), { inverse: true, axisLabel: { interval: 0, fontSize: 10 } }),
          series: cx.tasks.map((task, index) => ({
            name: task.label, type: "bar", stack: "tasks", barMaxWidth: 30,
            itemStyle: { color: ["#4984be", "#7fb3e4", "#fdb830", "#d97f45", "#4f9a8c", "#8e3b5c"][index % 6] },
            data: withProfile.map((s) => (taskTotal(s) ? +((100 * (s.profile.tasks?.[task.id] ?? 0)) / taskTotal(s)).toFixed(1) : 0)),
          })),
        });
      }
      if (withProfile.some((s) => burdenTotal(s))) {
        plot(chartCard(a, { title: "Carga de implementación", sub: "Porcentaje de solves según la carga del problema, 2011–2025", span: 6, height: 300 }), {
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: 8, right: 18, top: 16, bottom: 50, containLabel: true },
          xAxis: valueAxis({ min: 0, max: 100, axisLabel: { formatter: "{value}%" } }),
          yAxis: categoryAxis(withProfile.map((s) => axisName(s.item.name)), { inverse: true, axisLabel: { interval: 0, fontSize: 10 } }),
          series: cx.burdens.map((burden, index) => ({
            name: burden.label, type: "bar", stack: "burden", barMaxWidth: 30,
            itemStyle: { color: [c.blue, c.gold, c.red][index] },
            data: withProfile.map((s) => (burdenTotal(s) ? +((100 * (s.profile.burdens?.[burden.id] ?? 0)) / burdenTotal(s)).toFixed(1) : 0)),
          })),
        });
      }
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
    if (stats.length < 2) {
      card(a, { title: "Años en común", span: 12, html: '<p class="sub">Añade otra entidad para ver los años en común y el duelo directo.</p>' });
    } else if (!commonYears.length) {
      card(a, { title: "Años en común", span: 12, html: '<p class="sub">No hay finales compartidas entre estas entidades.</p>' });
    } else {
      const duel = `<div class="compare-overlap">${stats.map((a, i) => stats.map((b, j) => (i < j ? `<span><b>${esc(a.item.name)}</b> ${wins[i][j]}–${wins[j][i]} <b>${esc(b.item.name)}</b></span>` : "")).join("")).join("")}</div>`;
      const body = card(a, {
        title: "Años en común", span: 12,
        sub: "Finales compartidas. El número es el puesto del mejor equipo de cada entidad; el color, su percentil.",
        html: `<p class="mobile-hint">Desliza para ver todos los años →</p><div class="plot-scroll"><div class="plot" id="common-years" style="height:${Math.max(210, stats.length * 54 + 54)}px;min-width:680px"></div></div>${duel}<p class="note">Cada celda muestra el puesto en esa final. Las celdas vacías indican que la entidad no participó. El duelo cuenta los años comunes en los que una quedó por delante de la otra.</p>`,
      });
      plot(body.querySelector("#common-years"), {
        tooltip: {
          formatter: (point) => {
            const value = point.value;
            return `<b>${esc(stats[value[1]].item.name)}</b><br>${commonYears[value[0]]}: puesto ${place(value[3])} · ${value[4] ?? "—"} resueltos · percentil ${fmt(value[2], 1)}`;
          },
        },
        grid: { left: 8, right: 16, top: 12, bottom: commonYears.length > 12 ? 54 : 30, containLabel: true },
        xAxis: categoryAxis(commonYears.map(String), { axisLabel: { interval: 0, rotate: commonYears.length > 12 ? 30 : 0, fontSize: 10 } }),
        yAxis: categoryAxis(stats.map((s) => axisName(s.item.name)), { inverse: true, axisLabel: { interval: 0, fontSize: 10 } }),
        series: [{
          type: "heatmap",
          data: stats.flatMap((s, y) => commonYears.map((year, x) => {
            const row = bestRow(s, year);
            if (!row) return null;
            const pct = row.pct ?? 0;
            return { value: [x, y, pct, row.rank, row.solved], itemStyle: { color: heatColor(pct, 100) }, label: { color: heatInk(pct, 100) } };
          }).filter(Boolean)),
          label: { show: true, color: c.ink, fontSize: 10, formatter: (point) => (point.value[3] == null ? "" : place(point.value[3])) },
          itemStyle: { borderColor: c.panel, borderWidth: 2 },
        }],
      });
    }

    // Class-specific context.
    const panel = document.createElement("div");
    panel.className = "compare-panels";
    for (const s of stats) {
      const section = document.createElement("section");
      section.className = "compare-panel";
      section.style.setProperty("--compare-color", tint[stats.indexOf(s)]);
      if (kind === "t") {
        const people = s.people.slice().sort((x, y) => y.years.size - x.years.size || x.name.localeCompare(y.name, "es"));
        const finals = s.rows.slice().sort((x, y) => y.year - x.year);
        section.innerHTML = `<h3><a href="${s.item.url}">${esc(s.item.name)}</a></h3>
          <p class="sub">${esc(s.item.sub)} · ${s.finals} ${s.finals === 1 ? "final" : "finales"}</p>
          <div class="chips">${people.map((person) => `<a class="chip" href="${personUrl(person.id)}">${esc(person.name)}${person.years.size > 1 ? ` (${person.years.size})` : ""}</a>`).join("")}</div>
          <div class="compare-finals">${finals.map((row) => `<div class="compare-final"><b>${row.year}</b><span>${place(row.rank)}</span><small>${row.solved ?? "—"} res. · ${row.time ?? "—"} min</small></div>`).join("")}</div>`;
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
        const maxSolved = Math.max(1, ...list.map((group) => group.solved));
        section.innerHTML = `<h3><a href="${s.item.url}">${esc(s.item.name)}</a></h3>
          <p class="sub">${esc(s.item.sub)} · ${kind === "c" ? `${list.length} universidades` : `${list.length} equipos`}</p>
          <div class="compare-persons">${list.slice(0, 8).map((group) => `<a class="compare-person" href="${group.url}"><span class="compare-person-name">${esc(group.name)}</span><span class="compare-person-meta">${group.finals} finales · mejor ${group.best == null ? "—" : place(group.best)} · ${group.medals} medallas</span><span class="compare-person-bar"><i style="width:${Math.max(2, 100 * group.solved / maxSolved).toFixed(1)}%"></i></span><span class="compare-person-value">${group.solved}</span></a>`).join("")}</div>
          ${list.length > 8 ? `<p class="note">Y ${list.length - 8} más.</p>` : ""}`;
      }
      panel.append(section);
    }
    card(a, {
      title: kind === "c" ? "Universidades del país" : kind === "u" ? "Equipos de la universidad" : "Miembros y finales",
      span: 12,
      sub: kind === "t" ? "Miembros y recorrido del equipo." : "Las barras comparan los solves acumulados; el texto resume finales, mejor puesto y medallas.",
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
    const regionalStats = stats.filter((s) => s.regional > 0).sort((a, b) => b.regional - a.regional);
    if (regionalStats.length) {
      const detail = regionalStats.map((s) => {
        const regions = [...new Set(s.regionalTitles.map((item) => item.title))].map((title) => TITLE_NAMES[title] ?? title).join(", ");
        const years = [...new Set(s.regionalTitles.map((item) => item.year))].sort((a, b) => a - b);
        const span = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0]);
        return `<b>${esc(s.item.name)}</b> (${s.regional}): ${regions}, ${span}`;
      }).join(" · ");
      insights.push(`🏅 Títulos regionales: ${detail}.`);
    } else {
      insights.push("🏅 Ninguna de las entidades suma títulos regionales.");
    }
    const worldStats = stats.filter((s) => s.world > 0).sort((a, b) => b.world - a.world);
    if (worldStats.length) {
      const detail = worldStats.map((s) => {
        const years = [...new Set(s.worldYears)].sort((a, b) => a - b);
        const span = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0]);
        return `<b>${esc(s.item.name)}</b> (${s.world}): ${span}`;
      }).join(" · ");
      insights.push(`🌍 Títulos mundiales: ${detail}.`);
    }
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
