import { crest, esc, fold } from "../core.js";
import { fuzzyFilter } from "../fuzzy.js";
import { categoryAxis, colors, levelColor, levelRatePlot, plot, valueAxis } from "../charts.js";
import { card, grid, kpis, startPage } from "../shell.js";

const complexity = await fetch("data/complexity.json", { cache: "no-cache" })
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);

if (!complexity) {
  document.body.innerHTML = '<p class="loading">Los datos de complejidad no están disponibles. Ejecuta <code>make data</code> con los archivos de <code>data/curated/</code>.</p>';
} else {
  const areaLabel = Object.fromEntries(complexity.areas.map((item) => [item.id, item.label]));
  const techLabel = Object.fromEntries(complexity.techniques.map((item) => [item.id, item.label]));
  const taskLabel = Object.fromEntries(complexity.tasks.map((item) => [item.id, item.label]));
  const burdenLabel = Object.fromEntries(complexity.burdens.map((item) => [item.id, item.label]));
  const formatLabel = Object.fromEntries((complexity.formats ?? []).map((item) => [item.id, item.label]));
  const problemById = new Map(complexity.problems.map((problem) => [problem.id, problem]));
  const uniById = new Map(complexity.universities.map((uni) => [uni.id, uni]));
  const countryByName = new Map(complexity.countries.map((country) => [country.name, country]));
  const REGION_OPTIONS = [...new Map(complexity.universities.map((uni) => [uni.region, uni.regionLabel])).entries()]
    .filter(([id, label]) => id && label)
    .sort((left, right) => left[1].localeCompare(right[1], "es"));

  const QUARTILE_COLORS = ["#6d222e", "#2f6aa3", "#d97f45", "#8a8a8a"];
  const TECH_SHORT = {
    dynamic_programming: "DP",
    graph_reasoning: "Grafos",
    greedy: "Greedy",
    geometric_reasoning: "Geom.",
    simulation: "Simulación",
    binary_search: "B. binaria",
    brute_force: "Fuerza bruta",
    algebra: "Álgebra",
  };
  const levelName = (level) => {
    const item = complexity.levels[level - 1];
    return `N${item.level} · ${item.label}`;
  };
  const levelRange = (level) => {
    const item = complexity.levels[level - 1];
    return `${Math.round(item.min * 100)}–${Math.round(item.max * 100)}%`;
  };
  const pct = (value) => `${Math.round(value * 100)}%`;
  const formatInt = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const pct1 = (value) => `${(value * 100).toFixed(1)}%`;
  const signed = (value) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;
  const totalOf = (values) => values.reduce((total, value) => total + value, 0);
  const share = (value, total) => (total ? value / total : 0);
  const meanLevel = (levels) => {
    const total = totalOf(levels);
    return total ? totalOf(levels.map((count, index) => count * (index + 1))) / total : null;
  };
  const median = (values) => {
    const ordered = [...values].sort((left, right) => left - right);
    const position = (ordered.length - 1) / 2;
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, ordered.length - 1);
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
  };
  const shorten = (text, size = 28) => (text.length > size ? `${text.slice(0, size - 1)}…` : text);
  const badge = (level) =>
    `<span class="badge"><i style="background:${levelColor(level - 1)}"></i>${esc(levelName(level))}</span>`;
  const levelBadgeShort = (level) =>
    `<span class="badge"><i style="background:${levelColor(level - 1)}"></i>N${level}</span>`;

  const taskLevels = Object.fromEntries(complexity.tasks.map((task) => [task.id, [0, 0, 0, 0, 0, 0]]));
  for (const problem of complexity.problems) {
    taskLevels[problem.task][problem.level - 1] += 1;
  }

  const dimensionLabel = (dim) => (dim === "areas" ? "Áreas" : dim === "tasks" ? "Tareas" : "Técnicas");
  const dimensionItems = (dim) => {
    if (dim === "areas") {
      return complexity.areas
        .filter((item) => item.count > 0)
        .map((item) => ({ id: item.id, label: item.label, count: item.count, levels: item.levels }));
    }
    if (dim === "tasks") {
      return complexity.tasks
        .filter((item) => item.count > 0)
        .map((item) => ({ id: item.id, label: item.label, count: item.count, levels: taskLevels[item.id] }));
    }
    return complexity.techniques
      .filter((item) => item.count > 0)
      .map((item) => ({ id: item.id, label: item.label, count: item.count, levels: item.levels }));
  };

  const state = {
    problems: { q: "", year: "all", area: "all", technique: "all", level: "all", burden: "all" },
    edition: { a: "2014", b: "2025", dim: "areas", view: "mix" },
    fingerprint: { sort: "level" },
    friction: { dim: "techniques", category: "all" },
    topics: { dim: "techniques", sort: "count", compareDim: "techniques" },
    dominance: { kind: "uni", dim: "areas", category: "geometry", view: "ranking", region: "all" },
    profile: { kind: "uni", id: "st-petersburg-itmo-university", compare: null },
  };

  let refreshProfileView = null;
  let statementsPromise = null;
  let modalElement = null;

  const loadStatements = () => {
    if (!statementsPromise) {
      statementsPromise = fetch("data/problem-statements.json")
        .then((response) => (response.ok ? response.json() : {}))
        .catch(() => ({}));
    }
    return statementsPromise;
  };

  const statementHtml = (statement) => {
    if (!statement?.blocks?.length) {
      return '<p class="sub">El enunciado no está disponible en el corpus para este problema.</p>';
    }
    return statement.blocks
      .map((block) => {
        if (block.t === "h") return `<h4>${esc(block.x)}</h4>`;
        if (block.t === "pre") return `<pre>${esc(block.x)}</pre>`;
        return `<p>${esc(block.x)}</p>`;
      })
      .join("");
  };

  const problemDetailHtml = (problem) => {
    const extras = [];
    if (problem.areas.length > 1) {
      extras.push(`Áreas secundarias: ${problem.areas.slice(1).map((id) => areaLabel[id] ?? id).join(", ")}`);
    }
    if (problem.techniques.length > 1) {
      extras.push(`Técnicas secundarias: ${problem.techniques.slice(1).map((id) => techLabel[id] ?? id).join(", ")}`);
    }
    if (problem.tasks.length > 1) {
      extras.push(`Tareas secundarias: ${problem.tasks.slice(1).map((id) => taskLabel[id] ?? id).join(", ")}`);
    }
    const editionSize = complexity.editions.find((edition) => edition.year === problem.year)?.problems;
    const orderText = problem.firstSolveOrder ? `${problem.firstSolveOrder} / ${editionSize}` : "—";
    return `
      <div class="modal-chips">
        ${badge(problem.level)}
        <span class="badge">${problem.year} ${esc(problem.letter)}</span>
        <span class="badge">${esc(areaLabel[problem.area] ?? problem.area)}</span>
        <span class="badge">${esc(techLabel[problem.technique] ?? problem.technique)}</span>
        <span class="badge">${esc(taskLabel[problem.task] ?? problem.task)}</span>
        <span class="badge">Carga ${esc((burdenLabel[problem.burden] ?? problem.burden).toLowerCase())}</span>
      </div>
      <div class="modal-stats">
        <div class="modal-stat"><b>${problem.teams}</b><span>equipos en la final</span></div>
        <div class="modal-stat"><b>${problem.solved}</b><span>lo resolvieron (${pct(problem.solveRate)})</span></div>
        <div class="modal-stat"><b>${problem.attempts}</b><span>intentos totales</span></div>
        <div class="modal-stat"><b>${problem.failedPerTeam ?? "—"}</b><span>fallidos por equipo</span></div>
        <div class="modal-stat"><b>${problem.attemptsPerSolve ?? "—"}</b><span>intentos por resuelto</span></div>
        <div class="modal-stat"><b>${orderText}</b><span>orden de primera solución</span></div>
      </div>
      ${extras.length ? `<p class="sub">${extras.map(esc).join(" · ")}</p>` : ""}
      <p class="sub"><b>Clasificación:</b> ${esc(problem.evidence)}</p>
      <p class="sub">Calidad de fuente ${esc(problem.sourceQuality)} · confianza ${Number(problem.confidence).toFixed(2)} · formato ${esc(formatLabel[problem.format] ?? problem.format)}.</p>
      <div class="statement">
        <h3>Enunciado</h3>
        <div data-statement><p class="sub">Cargando enunciado…</p></div>
        <p class="statement-note">Enunciado original en inglés, extraído del PDF oficial de la final. Esta ficha no enlaza a soluciones.</p>
      </div>`;
  };

  const ensureModal = () => {
    if (modalElement) return modalElement;
    modalElement = document.createElement("div");
    modalElement.className = "modal";
    modalElement.hidden = true;
    modalElement.innerHTML = `
      <div class="modal-backdrop" data-close></div>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <h3 id="modal-title"></h3>
          <p id="modal-sub"></p>
          <button class="modal-close" type="button" aria-label="Cerrar">×</button>
        </div>
        <div class="modal-body"></div>
      </div>`;
    document.body.append(modalElement);
    modalElement.querySelector("[data-close]").onclick = closeProblem;
    modalElement.querySelector(".modal-close").onclick = closeProblem;
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modalElement.hidden) closeProblem();
    });
    return modalElement;
  };

  function closeProblem() {
    if (!modalElement) return;
    modalElement.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openProblem(id) {
    const problem = problemById.get(id);
    if (!problem) return;
    const modal = ensureModal();
    const body = modal.querySelector(".modal-body");
    modal.querySelector("#modal-title").textContent = `${problem.year} ${problem.letter} · ${problem.title}`;
    modal.querySelector("#modal-sub").textContent = `${levelName(problem.level)} · ${areaLabel[problem.area]} · ${techLabel[problem.technique]}`;
    body.innerHTML = problemDetailHtml(problem);
    body.scrollTop = 0;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector(".modal-close").focus();
    loadStatements().then((statements) => {
      const holder = body.querySelector("[data-statement]");
      if (holder?.isConnected) holder.innerHTML = statementHtml(statements[id]);
    });
  }

  const problemSearchText = (problem) =>
    fold([
      problem.title,
      problem.year,
      problem.letter,
      `N${problem.level}`,
      problem.levelLabel,
      areaLabel[problem.area],
      techLabel[problem.technique],
      taskLabel[problem.task],
      burdenLabel[problem.burden],
    ].join(" "));

  const problemRows = () => {
    const terms = fold(state.problems.q.trim()).split(/\s+/).filter(Boolean);
    return complexity.problems.filter((problem) => {
      const haystack = problemSearchText(problem);
      return (
        terms.every((term) => haystack.includes(term)) &&
        (state.problems.year === "all" || problem.year === Number(state.problems.year)) &&
        (state.problems.area === "all" || problem.area === state.problems.area) &&
        (state.problems.technique === "all" || problem.technique === state.problems.technique) &&
        (state.problems.level === "all" || problem.level === Number(state.problems.level)) &&
        (state.problems.burden === "all" || problem.burden === state.problems.burden)
      );
    });
  };

  const renderProblemRows = (container, countElement) => {
    const rows = problemRows();
    countElement.textContent = `${rows.length} de ${complexity.problems.length} problemas`;
    if (!rows.length) {
      container.innerHTML = '<p class="sub">Ningún problema cumple estos filtros. Prueba con menos condiciones o limpia la búsqueda.</p>';
      return;
    }
    container.innerHTML = `<div class="tablew problem-table"><table><thead><tr>
      <th>Edición</th><th>Problema</th><th>Nivel</th><th>Área</th><th>Técnica</th><th>Tarea</th><th>Carga</th><th class="n">Tasa</th>
    </tr></thead><tbody>${rows
      .map(
        (problem) => `<tr data-id="${problem.id}" tabindex="0">
          <td>${problem.year} ${esc(problem.letter)}</td><td class="title">${esc(problem.title)}</td>
          <td>${badge(problem.level)}</td><td>${esc(areaLabel[problem.area] ?? problem.area)}</td>
          <td>${esc(techLabel[problem.technique] ?? problem.technique)}</td><td>${esc(taskLabel[problem.task] ?? problem.task)}</td>
          <td>${esc(burdenLabel[problem.burden] ?? problem.burden)}</td>
          <td class="n" data-sort="${problem.solveRate}"><span class="rate-cell"><span class="rate-bar"><i style="width:${problem.solveRate * 100}%"></i></span>${pct(problem.solveRate)}</span></td>
        </tr>`,
      )
      .join("")}</tbody></table></div>`;
    container.querySelectorAll("tr[data-id]").forEach((row) => {
      const open = () => openProblem(row.dataset.id);
      row.onclick = open;
      row.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      };
    });
  };

  const setupProblemExplorer = (root) => {
    const search = root.querySelector("#problem-search");
    const count = root.querySelector("#problem-count");
    const table = root.querySelector("#problem-table");
    const selects = {
      year: root.querySelector("#filter-year"),
      area: root.querySelector("#filter-area"),
      technique: root.querySelector("#filter-technique"),
      level: root.querySelector("#filter-level"),
      burden: root.querySelector("#filter-burden"),
    };

    const syncSelects = () => {
      Object.entries(selects).forEach(([key, select]) => {
        select.value = state.problems[key];
      });
    };
    const draw = () => renderProblemRows(table, count);

    search.oninput = () => {
      state.problems.q = search.value;
      draw();
    };
    Object.entries(selects).forEach(([key, select]) => {
      select.onchange = () => {
        state.problems[key] = select.value;
        draw();
      };
    });
    root.querySelector("#problem-clear").onclick = () => {
      state.problems = { q: "", year: "all", area: "all", technique: "all", level: "all", burden: "all" };
      search.value = "";
      syncSelects();
      draw();
      search.focus();
    };
    root.querySelectorAll("[data-quick]").forEach((button) => {
      button.onclick = () => {
        const quick = button.dataset.quick;
        state.problems = { q: "", year: "all", area: "all", technique: "all", level: "all", burden: "all" };
        if (quick === "n6") state.problems.level = "6";
        if (quick === "geometry") state.problems.area = "geometry";
        if (quick === "dp") state.problems.technique = "dynamic_programming";
        search.value = "";
        syncSelects();
        draw();
      };
    });
    syncSelects();
    draw();
  };

  const levelStack = (element, items, { horizontal = false, rotate = 0, labelInterval = 0 } = {}) => {
    const levels = complexity.levels;
    const labels = items.map((item) => item.label ?? String(item.year ?? ""));
    const series = levels.map((level, index) => ({
      name: level.label,
      type: "bar",
      stack: "total",
      barMaxWidth: horizontal ? 18 : 34,
      itemStyle: { color: levelColor(index) },
      emphasis: { focus: "series" },
      data: items.map((item) => {
        const total = totalOf(item.levels);
        return total ? Number(((100 * item.levels[index]) / total).toFixed(1)) : 0;
      }),
    }));
    plot(element, {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const item = items[params[0]?.dataIndex ?? 0];
          if (!item) return "";
          const total = totalOf(item.levels);
          return `<b>${esc(item.label ?? item.year ?? "")}</b><br>${levels
            .map((level, index) => `${level.label}: ${item.levels[index]} (${total ? Math.round((100 * item.levels[index]) / total) : 0}%)`)
            .join("<br>")}`;
        },
      },
      legend: { data: levels.map((level) => level.label) },
      xAxis: horizontal
        ? valueAxis({ max: 100, axisLabel: { formatter: "{value}%" } })
        : categoryAxis(labels, { axisLabel: { interval: labelInterval, rotate, fontSize: 12 } }),
      yAxis: horizontal
        ? categoryAxis(labels, { axisLabel: { interval: 0, width: 170, overflow: "truncate" } })
        : valueAxis({ max: 100, axisLabel: { formatter: "{value}%" } }),
      series,
    });
  };

  const editionFor = (value) => {
    if (value === "avg") return complexity.averageEdition;
    return complexity.editions.find((edition) => String(edition.year) === String(value)) ?? complexity.editions[0];
  };

  const editionLabel = (edition) => (edition.year === "avg" ? "Promedio" : String(edition.year));

  const renderEditionComparison = () => {
    const levelsBody = document.getElementById("edition-compare");
    const topicsBody = document.getElementById("edition-topics");
    if (!levelsBody || !topicsBody) return;
    const a = editionFor(state.edition.a);
    const b = editionFor(state.edition.b);
    const aLabel = editionLabel(a);
    const bLabel = editionLabel(b);
    const same = a === b;
    const levelRows = complexity.levels
      .map((level, index) => {
        const aShare = share(a.levels[index], a.problems);
        const bShare = share(b.levels[index], b.problems);
        const delta = bShare - aShare;
        return `<div class="cmp-row">
          <div class="cmp-cat">N${level.level} · ${esc(level.label)}<small>${levelRange(level.level)}</small></div>
          <div class="cmp-track"><i style="width:${aShare * 100}%"></i><span>${Math.round(aShare * 100)}%</span></div>
          <div class="cmp-track b"><i style="width:${bShare * 100}%"></i><span>${Math.round(bShare * 100)}%</span></div>
          <div class="cmp-delta">${delta === 0 ? "0 pp" : `${delta > 0 ? "+" : ""}${Math.round(delta * 100)} pp`}</div>
        </div>`;
      })
      .join("");

    const dim = state.edition.dim;
    const labels = dim === "areas" ? areaLabel : techLabel;
    const keys = new Set([...Object.keys(a[dim] ?? {}), ...Object.keys(b[dim] ?? {})]);
    const topicRows = [...keys]
      .map((id) => ({
        id,
        label: labels[id] ?? id,
        a: share(a[dim]?.[id] ?? 0, a.problems),
        b: share(b[dim]?.[id] ?? 0, b.problems),
      }))
      .sort((left, right) => Math.max(right.a, right.b) - Math.max(left.a, left.b));
    const topTopics = topicRows.slice(0, 7);
    const topicsTable = `<div class="tablew cmp-topics"><table data-nosort><thead><tr><th>${dim === "areas" ? "Área" : "Técnica"}</th><th class="n">${esc(aLabel)}</th><th class="n">${esc(bLabel)}</th><th class="n">Δ</th></tr></thead><tbody>${topTopics
      .map((row) => {
        const delta = row.b - row.a;
        return `<tr><td>${esc(row.label)}</td><td class="n">${pct(row.a)}</td><td class="n">${pct(row.b)}</td><td class="n delta">${delta === 0 ? "0 pp" : `${delta > 0 ? "+" : ""}${Math.round(delta * 100)} pp`}</td></tr>`;
      })
      .join("")}</tbody></table></div>`;

    const n1a = a.levels[0];
    const n1b = b.levels[0];
    const n6a = a.levels[5];
    const n6b = b.levels[5];
    const meanDiff = b.meanLevel - a.meanLevel;
    const verdict = Math.abs(meanDiff) < 0.15
      ? "El nivel medio es casi el mismo."
      : `${meanDiff > 0 ? bLabel : aLabel} tiene un nivel medio más alto (${meanDiff > 0 ? b.meanLevel : a.meanLevel} frente a ${meanDiff > 0 ? a.meanLevel : b.meanLevel}).`;
    const summary = same
      ? "Estás comparando la misma edición. Elige otra para ver diferencias."
      : `${bLabel} tiene ${pct(share(n1b, b.problems))} de problemas abiertos frente a ${pct(share(n1a, a.problems))} de ${aLabel}. En excepcionales, ${pct(share(n6b, b.problems))} frente a ${pct(share(n6a, a.problems))}. ${verdict}`;
    const topicChanges = topicRows
      .map((row) => ({ ...row, delta: row.b - row.a }))
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
      .slice(0, 2);
    const changeText = topicChanges.length
      ? `Mayores cambios en ${dim === "areas" ? "áreas" : "técnicas"}: ${topicChanges
          .map((row) => `${esc(row.label)} (${row.delta > 0 ? "+" : ""}${Math.round(row.delta * 100)} pp)`)
          .join(" y ")}.`
      : "";

    levelsBody.innerHTML = `
      <div class="cmp-head">
        <div class="cmp-side"><div class="year">${esc(aLabel)}</div><small>${a.year === "avg" ? `${a.problems} problemas en ${complexity.scope.editions} finales` : `${a.problems} problemas`} · ${a.teams} equipos-edición</small><small>Nivel medio ${a.meanLevel}</small></div>
        <div class="cmp-vs">vs</div>
        <div class="cmp-side"><div class="year b">${esc(bLabel)}</div><small>${b.year === "avg" ? `${b.problems} problemas en ${complexity.scope.editions} finales` : `${b.problems} problemas`} · ${b.teams} equipos-edición</small><small>Nivel medio ${b.meanLevel}</small></div>
      </div>
      <div class="cmp-legend"><span><i style="background:var(--accent)"></i>${esc(aLabel)}</span><span><i style="background:var(--blue-t)"></i>${esc(bLabel)}</span></div>
      ${levelRows}
      <p class="note">Cada problema pesa entre ${Math.round(100 / Math.max(a.problems, 1))} y ${Math.round(100 / Math.max(b.problems, 1))} puntos porcentuales: las diferencias de uno o dos problemas no son una tendencia.</p>`;

    topicsBody.innerHTML = `
      <p class="cmp-summary">${summary}</p>
      <p class="note" style="margin:0 0 8px">${changeText || "Sin cambios temáticos destacados."}</p>
      <div class="filters" style="margin:0 0 8px;padding:0;border:0;background:none">
        <span class="seg" role="group" aria-label="Dimensión de comparación">
          <button type="button" data-cmp-dim="areas" aria-pressed="${dim === "areas"}">Áreas</button>
          <button type="button" data-cmp-dim="techniques" aria-pressed="${dim === "techniques"}">Técnicas</button>
        </span>
      </div>
      ${topicsTable}
      <p class="note">Participación de cada tema en los problemas de la final. Una diferencia de un problema pesa mucho con 11–15 problemas.</p>
      <p class="callout"><b>Lectura:</b> usa los cambios como pista, no como conclusión: una final de 12 problemas no alcanza para hablar de tendencia.</p>`;

    topicsBody.querySelectorAll("[data-cmp-dim]").forEach((button) => {
      button.onclick = () => {
        state.edition.dim = button.dataset.cmpDim;
        renderEditionComparison();
      };
    });
  };

  const setupEditionComparison = (root) => {
    const selectA = root.querySelector("#edition-a");
    const selectB = root.querySelector("#edition-b");
    selectA.onchange = () => {
      state.edition.a = selectA.value;
      renderEditionComparison();
    };
    selectB.onchange = () => {
      state.edition.b = selectB.value;
      renderEditionComparison();
    };
    root.querySelector("#edition-swap").onclick = () => {
      const previous = state.edition.a;
      state.edition.a = state.edition.b;
      state.edition.b = previous;
      selectA.value = state.edition.a;
      selectB.value = state.edition.b;
      renderEditionComparison();
    };
    selectA.value = state.edition.a;
    selectB.value = state.edition.b;
    renderEditionComparison();
  };

  const topicItems = (dim) => {
    if (dim === "areas") {
      return complexity.areas
        .filter((item) => item.count > 0)
        .map((item) => ({ id: item.id, label: `${item.label} (${item.count})`, count: item.count, levels: item.levels }));
    }
    if (dim === "tasks") {
      return complexity.tasks
        .filter((item) => item.count > 0)
        .map((item) => ({ id: item.id, label: `${item.label} (${item.count})`, count: item.count, levels: taskLevels[item.id] }));
    }
    return complexity.techniques
      .filter((item) => item.count > 0)
      .map((item) => ({ id: item.id, label: `${item.label} (${item.count})`, count: item.count, levels: item.levels }));
  };

  const renderTopics = (root) => {
    const plotElement = root.querySelector("#topic-plot");
    const dim = state.topics.dim;
    let items = topicItems(dim);
    if (state.topics.sort === "difficulty") {
      const filtered = items.filter((item) => item.count >= 5);
      items = (filtered.length >= 5 ? filtered : items).sort((left, right) => {
        const leftShare = share(left.levels[4] + left.levels[5], left.count);
        const rightShare = share(right.levels[4] + right.levels[5], right.count);
        return rightShare - leftShare;
      });
    } else {
      items = items.sort((left, right) => right.count - left.count);
    }
    levelStack(plotElement, items.slice(0, 12), { horizontal: true });
  };

  const setupTopics = (root) => {
    const dimSelect = root.querySelector("#topic-dim");
    const sortSelect = root.querySelector("#topic-sort");
    dimSelect.value = state.topics.dim;
    sortSelect.value = state.topics.sort;
    dimSelect.onchange = () => {
      state.topics.dim = dimSelect.value;
      renderTopics(root);
    };
    sortSelect.onchange = () => {
      state.topics.sort = sortSelect.value;
      renderTopics(root);
    };
    renderTopics(root);
  };


  const drawEditionTrend = (element) => {
    const editions = complexity.editions;
    plot(element, {
      legend: false,
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const edition = editions[params[0]?.dataIndex ?? 0];
          if (!edition) return "";
          return `<b>${edition.year}</b><br>Nivel medio ${edition.meanLevel}<br>${edition.problems} problemas · ${edition.levels[5]} N6`;
        },
      },
      xAxis: categoryAxis(editions.map((edition) => String(edition.year)), { boundaryGap: false, axisLabel: { interval: 1 } }),
      yAxis: valueAxis({ min: 1, max: 6, interval: 1, axisLabel: { formatter: (value) => `N${value}` } }),
      series: [{
        type: "line",
        data: editions.map((edition) => edition.meanLevel),
        symbolSize: 8,
        lineStyle: { width: 3, color: colors().accent },
        itemStyle: { color: colors().accent },
        areaStyle: { color: colors().accent, opacity: 0.08 },
      }],
    });
  };

  const renderEditionView = (root) => {
    const holder = root.querySelector("#edition-plot-holder");
    if (!holder) return;
    holder.innerHTML = '<div id="edition-plot" class="plot" style="height:360px"></div>';
    const element = holder.querySelector("#edition-plot");
    const hardest = [...complexity.editions].sort((left, right) => right.meanLevel - left.meanLevel)[0];
    const easiest = [...complexity.editions].sort((left, right) => left.meanLevel - right.meanLevel)[0];
    if (state.edition.view === "mix") {
      levelStack(element, complexity.editions, { rotate: window.innerWidth < 760 ? 45 : 0, labelInterval: window.innerWidth < 760 ? 1 : 0 });
    } else {
      drawEditionTrend(element);
    }
    root.querySelector("#edition-note").textContent = state.edition.view === "mix"
      ? "Cada final tiene entre 11 y 15 problemas: una diferencia de un problema mueve la barra entre 7 y 9 puntos."
      : `Máximo: ${hardest.year} (${hardest.meanLevel}). Mínimo: ${easiest.year} (${easiest.meanLevel}). Más alto = más exigente; no hay una tendencia lineal.`;
    root.querySelectorAll("[data-edition-view]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.editionView === state.edition.view);
    });
  };

  const setupEditionView = (root) => {
    root.querySelectorAll("[data-edition-view]").forEach((button) => {
      button.onclick = () => {
        state.edition.view = button.dataset.editionView;
        renderEditionView(root);
      };
    });
    renderEditionView(root);
  };

  const frictionData = () => {
    const rates = complexity.problems.map((problem) => problem.solveRate * 100);
    const failed = complexity.problems.map((problem) => problem.failedPerTeam ?? 0);
    const rateMedian = median(rates);
    const failedMedian = median(failed);
    const ranked = [...complexity.problems].sort((left, right) => (right.failedPerTeam ?? 0) - (left.failedPerTeam ?? 0));
    const traps = ranked.filter((problem) => problem.solveRate * 100 >= rateMedian && (problem.failedPerTeam ?? 0) >= failedMedian).slice(0, 5);
    const walls = ranked.filter((problem) => problem.solveRate * 100 < rateMedian && (problem.failedPerTeam ?? 0) >= failedMedian).slice(0, 5);
    return { rateMedian, failedMedian, traps, walls };
  };

  const frictionPrimaryKey = (dim) => (dim === "areas" ? "area" : dim === "tasks" ? "task" : "technique");
  const frictionFiltered = (data, filter) => {
    if (filter.category === "all") return data;
    const key = frictionPrimaryKey(filter.dim);
    const match = (problem) => problem[key] === filter.category;
    return { ...data, traps: data.traps.filter(match), walls: data.walls.filter(match) };
  };

  const drawFriction = (element, data, filter) => {
    const filtered = frictionFiltered(data, filter);
    const labelled = new Set([...filtered.traps, ...filtered.walls].map((problem) => problem.id));
    const hasFilter = filter.category !== "all";
    plot(element, {
      legend: false,
      tooltip: {
        formatter: (params) => {
          const item = params.data;
          return `<b>${item.year} ${item.letter} · ${esc(item.name)}</b><br>${esc(levelName(item.level))}<br>${item.solved}/${item.teams} (${Math.round(item.rate)}%)<br>${item.attempts} intentos · ${item.attemptsPerSolve ?? "—"} intentos/resuelto`;
        },
      },
      grid: { left: 8, right: 18, top: 8, bottom: 34, containLabel: true },
      xAxis: valueAxis({ min: 0, max: 100, name: window.innerWidth < 760 ? "" : "Tasa de resolución", nameLocation: "middle", nameGap: 26, axisLabel: { formatter: "{value}%" } }),
      yAxis: valueAxis({ min: 0, name: window.innerWidth < 760 ? "" : "Fallidos por equipo", nameLocation: "middle", nameGap: 38, nameRotate: 90 }),
      series: [{
        type: "scatter",
        data: complexity.problems.map((problem) => ({
          id: problem.id, name: problem.title, year: problem.year, letter: problem.letter,
          level: problem.level, solved: problem.solved, teams: problem.teams,
          rate: problem.solveRate * 100, attempts: problem.attempts, attemptsPerSolve: problem.attemptsPerSolve,
          failed: problem.failedPerTeam ?? 0, value: [problem.solveRate * 100, problem.failedPerTeam ?? 0],
          area: problem.area, technique: problem.technique, task: problem.task,
        })),
        itemStyle: {
          color: (params) => levelColor(params.data.level - 1),
          opacity: (params) => (hasFilter && params.data[frictionPrimaryKey(filter.dim)] !== filter.category ? 0.12 : 0.8),
        },
        symbolSize: 9,
        label: {
          show: true, position: "top", color: colors().ink, fontSize: 10,
          formatter: (params) => (labelled.has(params.data.id) ? `${params.data.year} ${params.data.letter}` : ""),
        },
        labelLayout: { hideOverlap: true },
        markLine: {
          silent: true, symbol: "none",
          lineStyle: { type: "dashed", color: colors().dim, opacity: 0.5 },
          data: [{ xAxis: data.rateMedian }, { yAxis: data.failedMedian }],
        },
      }],
    }, { onClick: (params) => openProblem(params.data.id) });
  };

  const frictionTableHtml = (data, filter) => {
    const filtered = frictionFiltered(data, filter);
    const labels = filter.dim === "areas" ? areaLabel : filter.dim === "tasks" ? taskLabel : techLabel;
    const key = frictionPrimaryKey(filter.dim);
    const row = (problem, kind) => `<tr data-id="${problem.id}" tabindex="0">
      <td><span class="badge">${kind}</span></td>
      <td class="title" title="${esc(problem.title)}">${esc(shorten(problem.title, 28))}<small>${levelBadgeShort(problem.level)}</small></td>
      <td>${esc(shorten(labels[problem[key]] ?? problem[key], 20))}</td>
      <td class="n">${pct(problem.solveRate)}</td>
      <td class="n">${problem.attemptsPerSolve?.toFixed(1) ?? "—"}</td>
    </tr>`;
    const rows = [...filtered.traps.map((problem) => row(problem, "Trampa")), ...filtered.walls.map((problem) => row(problem, "Muro"))];
    return `<div class="tablew friction-table"><table data-nosort><thead><tr><th>Tipo</th><th>Problema</th><th>Tema</th><th class="n">Tasa</th><th class="n">Int./res.</th></tr></thead><tbody>${rows.length ? rows.join("") : '<tr><td colspan="5" class="sub">No hay trampas o muros con este tema.</td></tr>'}</tbody></table></div>`;
  };

  const renderFriction = (plotRoot, tableRoot) => {
    const data = frictionData();
    const holder = plotRoot.querySelector("#friction-plot-holder");
    holder.innerHTML = '<div id="friction-plot" class="plot" style="height:380px"></div>';
    drawFriction(holder.querySelector("#friction-plot"), data, state.friction);
    const table = tableRoot.querySelector("#friction-table");
    table.innerHTML = frictionTableHtml(data, state.friction);
    table.querySelectorAll("tr[data-id]").forEach((row) => {
      const open = () => openProblem(row.dataset.id);
      row.onclick = open;
      row.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      };
    });
  };

  const setupFriction = (plotRoot, tableRoot) => {
    const dimSelect = tableRoot.querySelector("#friction-dim");
    const categorySelect = tableRoot.querySelector("#friction-category");
    const fillCategories = () => {
      const options = dimensionItems(state.friction.dim);
      if (state.friction.category !== "all" && !options.some((option) => option.id === state.friction.category)) {
        state.friction.category = "all";
      }
      categorySelect.innerHTML = `<option value="all">Todos</option>${options
        .map((option) => `<option value="${option.id}">${esc(option.label)}</option>`)
        .join("")}`;
      categorySelect.value = state.friction.category;
    };
    dimSelect.value = state.friction.dim;
    fillCategories();
    dimSelect.onchange = () => {
      state.friction.dim = dimSelect.value;
      state.friction.category = "all";
      fillCategories();
      renderFriction(plotRoot, tableRoot);
    };
    categorySelect.onchange = () => {
      state.friction.category = categorySelect.value;
      renderFriction(plotRoot, tableRoot);
    };
    renderFriction(plotRoot, tableRoot);
  };

  const drawCrossHeatmap = (element) => {
    const areas = complexity.areas.slice(0, 8);
    const techniques = complexity.techniques.filter((technique) => technique.count > 0).slice(0, 10);
    const areaIndex = new Map(areas.map((area, index) => [area.id, index]));
    const techniqueIndex = new Map(techniques.map((technique, index) => [technique.id, index]));
    const data = complexity.techniqueArea
      .filter((pair) => areaIndex.has(pair.area) && techniqueIndex.has(pair.technique))
      .map((pair) => [areaIndex.get(pair.area), techniqueIndex.get(pair.technique), pair.count]);
    const max = Math.max(...data.map((pair) => pair[2]), 1);
    plot(element, {
      legend: false,
      tooltip: {
        formatter: (params) => `${esc(techniques[params.value[1]].label)} · ${esc(areas[params.value[0]].label)}: <b>${params.value[2]}</b> problemas`,
      },
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
      xAxis: categoryAxis(areas.map((area) => area.label), { axisLabel: { interval: 0, rotate: 35 } }),
      yAxis: categoryAxis(techniques.map((technique) => shorten(technique.label, 22)), { axisLabel: { interval: 0 } }),
      visualMap: { show: false, min: 0, max, inRange: { color: [colors().panel2, colors().gold] } },
      series: [{
        type: "heatmap",
        data,
        label: { show: true, color: colors().ink, fontSize: 11, formatter: (params) => params.value[2] || "" },
        itemStyle: { borderColor: colors().panel, borderWidth: 1, borderRadius: 2 },
      }],
    });
  };

  const dominanceEntities = (kind) => (kind === "country" ? complexity.countries : complexity.universities);
  const dominanceGlobal = (dim) => complexity.totals[dim === "areas" ? "solvedAreas" : "solvedTechniques"] ?? {};
  const dominanceOptions = (dim) => (dim === "areas" ? complexity.areas : complexity.techniques);

  const renderDominanceMap = (root) => {
    const { kind, dim, category: selectedCategory, region } = state.dominance;
    const body = root.querySelector("#dominance-body");
    const entities = dominanceEntities(kind)
      .filter((entity) => entity.solves >= 20 && (region === "all" || entity.region === region))
      .slice(0, 12);
    const categories = dominanceOptions(dim).slice(0, 8);
    if (!entities.length) {
      body.innerHTML = '<p class="sub">No hay entidades con suficientes problemas resueltos en esta región.</p>';
      return;
    }
    const global = dominanceGlobal(dim);
    const globalTotal = complexity.totals.solves || 1;
    const maxAbs = Math.max(
      ...entities.flatMap((entity) =>
        categories.map((category) => Math.abs((entity[dim]?.[category.id] ?? 0) / entity.solves - (global[category.id] ?? 0) / globalTotal)),
      ),
      0.01,
    );
    const cell = (entity, category, selected) => {
      const diff = (entity[dim]?.[category.id] ?? 0) / entity.solves - (global[category.id] ?? 0) / globalTotal;
      const alpha = Math.min(0.55, (Math.abs(diff) / maxAbs) * 0.55);
      const background = diff >= 0 ? `rgba(47,106,163,${alpha})` : `rgba(175,50,39,${alpha})`;
      const text = Math.abs(diff) < 0.0005 ? "0" : `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)}`;
      return `<td class="${selected ? "sel" : ""}" style="background:${background}" title="${esc(category.label)}: ${text} pp">${text}</td>`;
    };
    body.innerHTML = `<div class="tablew spec-map"><table data-nosort><thead><tr><th>${kind === "country" ? "País" : "Universidad"}</th>${categories
      .map((category) => `<th class="${category.id === selectedCategory ? "sel" : ""}">${esc(category.label)}</th>`)
      .join("")}</tr></thead><tbody>${entities
      .map(
        (entity) => `<tr><th>${esc(kind === "country" ? entity.label : entity.name)}</th>${categories
          .map((category) => cell(entity, category, category.id === selectedCategory))
          .join("")}</tr>`,
      )
      .join("")}</tbody></table></div>
      <div class="spec-map-legend"><span><i class="pos"></i>Más de lo esperado</span><span><i class="neg"></i>Menos de lo esperado</span></div>
      <p class="note">Tabla de calor: cada celda es la diferencia en puntos porcentuales frente al perfil global. El tema elegido se resalta. Solo entidades con al menos 20 problemas resueltos. Para tu universidad, usa el buscador de perfiles.</p>`;
  };

  const renderDominance = (root) => {
    if (state.dominance.view === "map") {
      renderDominanceMap(root);
      return;
    }
    const { kind, dim, category } = state.dominance;
    const body = root.querySelector("#dominance-body");
    const global = dominanceGlobal(dim);
    const globalTotal = complexity.totals.solves || 1;
    const expected = (global[category] ?? 0) / globalTotal;
    const rows = dominanceEntities(kind)
      .filter((entity) => entity.solves >= 20 && (entity.region === state.dominance.region || state.dominance.region === "all") && (entity[dim]?.[category] ?? 0) > 0)
      .map((entity) => {
        const observed = (entity[dim]?.[category] ?? 0) / entity.solves;
        return {
          id: kind === "country" ? entity.name : entity.id,
          label: kind === "country" ? entity.label : entity.name,
          sub: kind === "country" ? (entity.regionLabel ?? "") : (entity.countryLabel ?? entity.country),
          diff: observed - expected,
        };
      })
      .filter((row) => row.diff > 0)
      .sort((left, right) => right.diff - left.diff)
      .slice(0, 10);
    if (!rows.length) {
      body.innerHTML = '<p class="sub">No hay entidades con suficientes problemas resueltos para este tema.</p>';
      return;
    }
    const maxDiff = Math.max(...rows.map((row) => row.diff), 0.01);
    body.innerHTML = `<div class="rank-list">${rows
      .map(
        (row, index) => `<button type="button" class="rank-row" data-kind="${kind}" data-id="${esc(row.id)}">
          <span class="rank-pos">${index + 1}</span>
          <span class="rank-name">${esc(row.label)}<small>${esc(row.sub)}</small></span>
          <span class="rank-track"><i style="width:${Math.max(2, (row.diff / maxDiff) * 100)}%"></i></span>
          <span class="rank-val">${signed(row.diff)}</span>
        </button>`,
      )
      .join("")}</div>
      <p class="note">Solo entidades con al menos 20 problemas resueltos. La barra es la diferencia en puntos porcentuales frente al perfil global. Haz clic para abrir el perfil.</p>`;
    body.querySelectorAll(".rank-row").forEach((button) => {
      button.onclick = () => refreshProfileView?.(button.dataset.kind, button.dataset.id, true);
    });
  };

  const setupDominance = (root) => {
    const kindButtons = root.querySelectorAll("[data-dom-kind]");
    const viewButtons = root.querySelectorAll("[data-dom-view]");
    const dimSelect = root.querySelector("#dom-dim");
    const categorySelect = root.querySelector("#dom-category");
    const regionSelect = root.querySelector("#dom-region");
    const fillCategories = () => {
      const options = dominanceOptions(state.dominance.dim);
      if (!options.some((option) => option.id === state.dominance.category)) {
        state.dominance.category = options[0]?.id;
      }
      categorySelect.innerHTML = options
        .map((option) => `<option value="${option.id}">${esc(option.label)}</option>`)
        .join("");
      categorySelect.value = state.dominance.category;
    };
    const sync = () => {
      kindButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.domKind === state.dominance.kind));
      viewButtons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.domView === state.dominance.view));
      dimSelect.value = state.dominance.dim;
      regionSelect.value = state.dominance.region;
      fillCategories();
    };
    kindButtons.forEach((button) => {
      button.onclick = () => {
        state.dominance.kind = button.dataset.domKind;
        sync();
        renderDominance(root);
      };
    });
    viewButtons.forEach((button) => {
      button.onclick = () => {
        state.dominance.view = button.dataset.domView;
        sync();
        renderDominance(root);
      };
    });
    dimSelect.onchange = () => {
      state.dominance.dim = dimSelect.value;
      state.dominance.category = dominanceOptions(state.dominance.dim)[0]?.id;
      sync();
      renderDominance(root);
    };
    categorySelect.onchange = () => {
      state.dominance.category = categorySelect.value;
      renderDominance(root);
    };
    regionSelect.onchange = () => {
      state.dominance.region = regionSelect.value;
      renderDominance(root);
    };
    sync();
    renderDominance(root);
  };

  const fingerprintRowsHtml = () => {
    const byLevel = state.fingerprint.sort === "level";
    return complexity.editions
      .map((edition) => {
        const problems = complexity.problems
          .filter((problem) => problem.year === edition.year)
          .sort((left, right) => {
            if (byLevel) return left.level - right.level || left.letter.localeCompare(right.letter);
            const leftOrder = left.firstSolveOrder ?? 999;
            const rightOrder = right.firstSolveOrder ?? 999;
            return leftOrder - rightOrder || left.letter.localeCompare(right.letter);
          });
        return `<div class="fp-row"><span class="fp-year">${edition.year}</span><span class="fp-cells">${problems
          .map((problem) => {
            const order = problem.firstSolveOrder ? ` · orden #${problem.firstSolveOrder}` : " · sin primera solución registrada";
            return `<button type="button" class="fp-cell" data-id="${problem.id}" style="background:${levelColor(problem.level - 1)};color:${problem.level <= 4 ? "#2b0d12" : "#fff"}" title="${problem.year} ${problem.letter} · ${esc(problem.title)} · ${esc(levelName(problem.level))}${order}">${esc(problem.letter)}</button>`;
          })
          .join("")}</span></div>`;
      })
      .join("");
  };

  const renderFingerprint = (root) => {
    const body = root.querySelector("#fingerprint-body");
    if (!body) return;
    const hard2014 = complexity.editions.find((edition) => edition.year === 2014);
    const open2025 = complexity.editions.find((edition) => edition.year === 2025);
    const long2020 = [...complexity.editions].sort((left, right) => right.problems - left.problems)[0];
    body.innerHTML = `<div class="fingerprint-matrix">${fingerprintRowsHtml()}<div class="fp-legend">${complexity.levels
      .map((level, index) => `<span><i style="background:${levelColor(index)}"></i>${esc(level.label)}</span>`)
      .join("")}</div>
      <p class="note">${state.fingerprint.sort === "level"
        ? `Cada fila va de N1 a N6. ${hard2014.year}: ${hard2014.levels[5]} de ${hard2014.problems} N6. ${open2025.year}: ${open2025.levels[0]} de ${open2025.problems} N1. ${long2020.year}: ${long2020.problems} problemas.`
        : "Cada fila va del primer problema en resolverse al último. Los problemas sin primera solución registrada quedan al final."} Haz clic en un cuadrado para abrir la ficha.</p>`;
    body.querySelectorAll(".fp-cell").forEach((cell) => {
      cell.onclick = () => openProblem(cell.dataset.id);
    });
    root.querySelectorAll("[data-fingerprint-sort]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.fingerprintSort === state.fingerprint.sort);
    });
  };

  const setupFingerprint = (root) => {
    root.querySelectorAll("[data-fingerprint-sort]").forEach((button) => {
      button.onclick = () => {
        state.fingerprint.sort = button.dataset.fingerprintSort;
        renderFingerprint(root);
      };
    });
    renderFingerprint(root);
  };

  const drawDimensionScatter = (element, dim) => {
    const items = dimensionItems(dim);
    const threshold = dim === "techniques" ? 8 : dim === "areas" ? 5 : 0;
    plot(element, {
      legend: false,
      tooltip: {
        formatter: (params) => {
          const item = params.data;
          return `<b>${esc(item.name)}</b><br>${item.count} problemas<br>${item.share.toFixed(1)}% N5–N6<br>${item.easy.toFixed(1)}% N1–N2`;
        },
      },
      grid: { left: 8, right: window.innerWidth < 760 ? 24 : 74, top: 38, bottom: 34, containLabel: true },
      xAxis: valueAxis({ min: 0, name: "Problemas", nameLocation: "middle", nameGap: 26 }),
      yAxis: valueAxis({
        min: 0, max: 100, name: "% N5–N6", nameLocation: "end", nameGap: 8,
        nameTextStyle: { align: "left" }, axisLabel: { formatter: "{value}%" },
      }),
      series: [{
        type: "scatter",
        data: items.map((item) => ({
          id: item.id,
          name: item.label,
          count: item.count,
          share: share(item.levels[4] + item.levels[5], item.count) * 100,
          easy: share(item.levels[0] + item.levels[1], item.count) * 100,
          value: [item.count, share(item.levels[4] + item.levels[5], item.count) * 100],
        })),
        itemStyle: { color: colors().accent, opacity: 0.75 },
        symbolSize: (value, params) => 7 + Math.sqrt(params.data.count) * 2.4,
        label: {
          show: true, position: "top", color: colors().ink, fontSize: 10,
          formatter: (params) => {
            if (params.data.count < threshold) return "";
            if (dim === "techniques" && TECH_SHORT[params.data.id]) return TECH_SHORT[params.data.id];
            return shorten(params.data.name, dim === "areas" ? 16 : 18);
          },
        },
        labelLayout: { hideOverlap: true },
      }],
    });
  };

  const dimensionReadingHtml = (dim) => {
    const items = [...dimensionItems(dim)].sort((left, right) => right.count - left.count);
    const rows = items.slice(0, 8).map((item) => {
      const hard = share(item.levels[4] + item.levels[5], item.count);
      return `<div class="topic-read-row"><b>${esc(item.label)}</b><span>${item.count} problemas · ${Math.round(hard * 100)}% N5–N6</span></div>`;
    }).join("");
    const top = items[0];
    const hardest = items
      .filter((item) => item.count >= 3)
      .sort((left, right) => share(right.levels[4] + right.levels[5], right.count) - share(left.levels[4] + left.levels[5], left.count))[0];
    const intro = top && hardest
      ? `${esc(top.label)} es lo más frecuente (${top.count} problemas), pero ${esc(hardest.label)} tiene la mayor proporción N5–N6 (${Math.round(share(hardest.levels[4] + hardest.levels[5], hardest.count) * 100)}%).`
      : "No hay suficientes datos para esta dimensión.";
    return `<div class="topic-read-list">${rows}</div>
      <p class="note">${intro} Frecuencia y dificultad no van de la mano; usa el selector de la izquierda para cambiar de dimensión.</p>
      <p class="callout"><b>Para practicar:</b> empieza por lo más frecuente y luego busca lo más duro. La etiqueta es la primaria de cada problema.</p>`;
  };

  const renderCompare = (plotRoot, readingRoot) => {
    const dim = state.topics.compareDim;
    const holder = plotRoot.querySelector("#compare-plot-holder");
    holder.innerHTML = '<div id="compare-plot" class="plot" style="height:360px"></div>';
    drawDimensionScatter(holder.querySelector("#compare-plot"), dim);
    readingRoot.querySelector("#compare-reading").innerHTML = dimensionReadingHtml(dim);
  };

  const setupCompare = (plotRoot, readingRoot) => {
    const select = plotRoot.querySelector("#compare-dim");
    select.value = state.topics.compareDim;
    select.onchange = () => {
      state.topics.compareDim = select.value;
      renderCompare(plotRoot, readingRoot);
    };
    renderCompare(plotRoot, readingRoot);
  };

  const drawRankFailure = (element) => {
    const levels = complexity.levels.map((level) => `N${level.level}`);
    plot(element, {
      tooltip: {
        trigger: "axis",
        formatter: (params) => `<b>${params[0].axisValue}</b><br>${params.map((param) => `${param.marker}${param.seriesName}: ${param.value}%`).join("<br>")}`,
      },
      legend: { data: complexity.rankQuartiles.map((quartile) => quartile.label) },
      grid: { left: 8, right: 16, top: 8, bottom: 34, containLabel: true },
      xAxis: categoryAxis(levels, { axisLabel: { interval: 0 } }),
      yAxis: valueAxis({ min: 0, max: 100, name: window.innerWidth < 760 ? "" : "% intentos fallidos", nameLocation: "middle", nameGap: 38, nameRotate: 90, axisLabel: { formatter: "{value}%" } }),
      series: complexity.rankQuartiles.map((quartile, index) => ({
        name: quartile.label,
        type: "line",
        symbolSize: 7,
        data: quartile.failureRate.map((value) => (value == null ? null : +(100 * value).toFixed(1))),
        lineStyle: { width: 2, color: QUARTILE_COLORS[index] },
        itemStyle: { color: QUARTILE_COLORS[index] },
      })),
    });
  };

  const profileEntries = () => [
    ...complexity.universities.map((uni) => ({
      kind: "uni",
      id: uni.id,
      label: uni.name,
      sub: `Universidad · ${uni.countryLabel ?? uni.country} · ${uni.solves} problemas resueltos`,
      key: fold(`${uni.name} ${uni.countryLabel ?? uni.country} ${uni.regionLabel ?? ""}`),
    })),
    ...complexity.countries.map((country) => ({
      kind: "country",
      id: country.name,
      label: country.label,
      sub: `País · ${country.regionLabel ?? ""} · ${country.editions} equipos-edición · ${country.solves} resueltos`,
      key: fold(`${country.label} ${country.name} ${country.regionLabel ?? ""}`),
    })),
  ];

  const profileRows = (entity, dim) => {
    const total = entity.solves || 1;
    const globalTotal = complexity.totals.solves || 1;
    const global = complexity.totals[dim === "areas" ? "solvedAreas" : "solvedTechniques"] ?? {};
    return Object.entries(entity[dim] ?? {})
      .map(([id, count]) => ({
        id,
        count,
        observed: count / total,
        expected: (global[id] ?? 0) / globalTotal,
        difference: count / total - (global[id] ?? 0) / globalTotal,
      }))
      .sort((left, right) => right.difference - left.difference);
  };

  const distributionHtml = (levels, label) => {
    const total = totalOf(levels);
    const segments = levels
      .map((count, index) =>
        count
          ? `<i style="width:${(100 * count) / total}%;background:${levelColor(index)}" title="${esc(levelName(index + 1))}: ${count} (${Math.round((100 * count) / total)}%)"></i>`
          : "",
      )
      .join("");
    return `<div class="dist-row"><span>${esc(label)}</span><div class="dist-track">${segments}</div></div>`;
  };

  const specBlock = (entity, dim) => {
    if (!entity.solves) return '<p class="sub">Sin problemas resueltos en 2011–2025.</p>';
    const labels = dim === "areas" ? areaLabel : techLabel;
    const rows = profileRows(entity, dim);
    const positive = rows.filter((row) => row.difference > 0.005).slice(0, 5);
    const negative = rows.filter((row) => row.difference < -0.005).slice(-5).reverse();
    const maxAbs = Math.max(...rows.map((row) => Math.abs(row.difference)), 0.01);
    const rowHtml = (row) => {
      const width = Math.min(50, (Math.abs(row.difference) / maxAbs) * 50);
      return `<div class="spec-row" title="${esc(labels[row.id] ?? row.id)}: observado ${pct1(row.observed)} · esperado ${pct1(row.expected)}">
        <span class="spec-name">${esc(labels[row.id] ?? row.id)}</span>
        <span class="spec-track"><i class="spec-fill ${row.difference >= 0 ? "pos" : "neg"}" style="width:${width}%"></i></span>
        <span class="spec-val ${row.difference >= 0 ? "pos" : "neg"}">${signed(row.difference)}</span>
      </div>`;
    };
    const strengths = positive.length ? positive.map(rowHtml).join("") : '<p class="sub">Sin fortalezas claras.</p>';
    const weaknesses = negative.length ? negative.map(rowHtml).join("") : '<p class="sub">Sin debilidades claras.</p>';
    return `<div class="spec-head"><span>Fortalezas</span><span>vs. promedio</span></div><div class="spec-list">${strengths}</div>
      <div class="spec-head"><span>Debilidades</span><span>vs. promedio</span></div><div class="spec-list">${weaknesses}</div>`;
  };

  const comparisonHtml = (entity, other, kind) => {
    const labelA = kind === "country" ? entity.label : entity.name;
    const labelB = kind === "country" ? other.label : other.name;
    const dimensions = [["areas", "Áreas"], ["techniques", "Técnicas"]];
    const tables = dimensions
      .map(([dim, title]) => {
        const labels = dim === "areas" ? areaLabel : techLabel;
        const keys = new Set([...Object.keys(entity[dim] ?? {}), ...Object.keys(other[dim] ?? {})]);
        const rows = [...keys]
          .map((id) => {
            const a = share(entity[dim]?.[id] ?? 0, entity.solves);
            const b = share(other[dim]?.[id] ?? 0, other.solves);
            return { id, label: labels[id] ?? id, a, b, diff: a - b };
          })
          .sort((left, right) => Math.abs(right.diff) - Math.abs(left.diff))
          .slice(0, 6);
        return `<div><h3>${title}</h3><table data-nosort><thead><tr><th></th><th class="n">${esc(shorten(labelA, 18))}</th><th class="n">${esc(shorten(labelB, 18))}</th><th class="n">Δ</th></tr></thead><tbody>${rows
          .map(
            (row) => `<tr><td>${esc(row.label)}</td><td class="n">${pct(row.a)}</td><td class="n">${pct(row.b)}</td><td class="n">${row.diff === 0 ? "0" : `${row.diff > 0 ? "+" : ""}${Math.round(row.diff * 100)} pp`}</td></tr>`,
          )
          .join("")}</tbody></table></div>`;
      })
      .join("");
    return `<div class="profile-compare"><h3>Comparación: ${esc(labelA)} vs ${esc(labelB)}</h3><div class="profile-compare-grid">${tables}</div><p class="note">Diferencia en puntos porcentuales; positivo significa que ${esc(labelA)} tiene más participación. Solo se muestran las mayores diferencias.</p></div>`;
  };

  const drawOrderChart = (element) => {
    const items = complexity.orderQuartiles;
    plot(element, {
      legend: false,
      tooltip: {
        formatter: (params) => {
          const item = items[params.dataIndex];
          return `<b>${esc(item.label)}</b><br>${item.count} problemas<br>Tasa media ${Math.round(item.meanSolveRate * 100)}%<br>Nivel medio ${item.meanLevel}<br>${item.meanAttemptsPerSolve} intentos/resuelto`;
        },
      },
      grid: { left: 8, right: 18, top: 38, bottom: 26, containLabel: true },
      xAxis: categoryAxis(items.map((item) => item.label.split(" ")[0]), { axisLabel: { interval: 0 } }),
      yAxis: valueAxis({ min: 0, max: 100, name: "% resueltos", nameLocation: "end", nameGap: 8, nameTextStyle: { align: "left" }, axisLabel: { formatter: "{value}%" } }),
      series: [{
        type: "bar",
        barMaxWidth: 54,
        data: items.map((item) => ({
          value: +(item.meanSolveRate * 100).toFixed(1),
          itemStyle: { color: levelColor(Math.min(5, Math.max(0, Math.round(item.meanLevel) - 1))) },
        })),
        label: { show: true, position: "top", color: colors().ink, formatter: "{c}%" },
      }],
    });
  };

  const orderTableHtml = () => `<div class="tablew quartile-table"><table data-nosort><thead><tr><th>Cuartil</th><th class="n">Problemas</th><th class="n">Tasa media</th><th class="n">Nivel medio</th><th class="n">Int./res.</th></tr></thead><tbody>${complexity.orderQuartiles
    .map((item) => `<tr><td>${esc(item.label)}</td><td class="n">${item.count}</td><td class="n">${Math.round(item.meanSolveRate * 100)}%</td><td class="n">${item.meanLevel}</td><td class="n">${item.meanAttemptsPerSolve}</td></tr>`)
    .join("")}</tbody></table></div>`;

  const firstLastHtml = () => `<div class="order-list"><div class="order-head"><span></span><span>Primero en resolverse</span><span></span><span>Último en resolverse</span></div>${complexity.editions
    .map((edition) => {
      const first = edition.firstBlood;
      const last = edition.lastBlood;
      const cell = (problem) => problem
        ? `<span class="order-problem"><b>${esc(problem.letter)}</b> ${esc(shorten(problem.title, 18))}<small>N${problem.level} · ${pct(problem.solveRate)}</small></span>`
        : '<span class="order-problem muted">—</span>';
      return `<div class="order-row"><span class="order-year">${edition.year}</span>${cell(first)}<span class="order-arrow">→</span>${cell(last)}</div>`;
    })
    .join("")}</div>`;

  const profileVector = (entity) => {
    const total = entity.solves || 1;
    const globalTotal = complexity.totals.solves || 1;
    const areas = complexity.areas.map(
      (area) => share(entity.areas?.[area.id] ?? 0, total) - share(complexity.totals.solvedAreas?.[area.id] ?? 0, globalTotal),
    );
    const techniques = complexity.techniques.map(
      (technique) => share(entity.techniques?.[technique.id] ?? 0, total) - share(complexity.totals.solvedTechniques?.[technique.id] ?? 0, globalTotal),
    );
    return [...areas, ...techniques];
  };

  const profileSimilarity = (left, right) => {
    const distance = totalOf(left.map((value, index) => Math.abs(value - right[index]))) / 2;
    return Math.max(0, Math.min(1, 1 - distance));
  };

  const similarHtml = (entity, kind) => {
    const pool = (kind === "country" ? complexity.countries : complexity.universities)
      .filter((candidate) => candidate !== entity && candidate.solves >= 20);
    const vector = profileVector(entity);
    const rows = pool
      .map((candidate) => ({ entity: candidate, similarity: profileSimilarity(vector, profileVector(candidate)) }))
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, 5);
    if (!rows.length) return `<h3>${kind === "country" ? "Países similares" : "Universidades similares"}</h3><p class="sub">Sin suficientes datos para comparar.</p>`;
    return `<h3>${kind === "country" ? "Países similares" : "Universidades similares"}</h3>
      <div class="similar-list">${rows
        .map(
          (row) => `<button type="button" class="similar-row" data-similar-link="${esc(kind === "country" ? row.entity.name : row.entity.id)}">
            <span class="similar-name">${esc(kind === "country" ? row.entity.label : row.entity.name)}<small>${esc(kind === "country" ? (row.entity.regionLabel ?? "") : (row.entity.countryLabel ?? row.entity.country))} · nivel ${row.entity.meanLevel ?? "—"}</small></span>
            <span class="similar-val">${Math.round(row.similarity * 100)}%</span>
          </button>`,
        )
        .join("")}</div>
      <p class="note">Similitud de perfil por áreas y técnicas. No mide nivel absoluto.</p>`;
  };

  const renderProfile = (root) => {
    const kind = state.profile.kind;
    const entity = kind === "country" ? countryByName.get(state.profile.id) : uniById.get(state.profile.id);
    const body = root.querySelector("#profile-body");
    if (!entity) {
      body.innerHTML = '<p class="sub">No se encontró esa entidad.</p>';
      return;
    }
    const isCountry = kind === "country";
    const label = isCountry ? entity.label : entity.name;
    const subtitle = isCountry
      ? `${entity.regionLabel ?? ""} · ${entity.editions} equipos-edición`
      : `${entity.countryLabel ?? entity.country} · ${entity.regionLabel ?? ""} · ${entity.editions} equipos-edición`;
    const n56 = share(entity.levels[4] + entity.levels[5], entity.solves);
    const headerIcon = isCountry
      ? `<span class="badge">${esc(entity.regionLabel ?? "País")}</span>`
      : crest(entity.name, 48);
    const countryLinks = isCountry
      ? complexity.universities
          .filter((uni) => uni.country === entity.name)
          .slice(0, 6)
          .map((uni) => `<button type="button" data-uni-link="${esc(uni.id)}">${esc(uni.name)}</button>`)
          .join("")
      : "";
    const universityCountry = isCountry
      ? ""
      : `<button type="button" data-country-link="${esc(entity.country)}">${esc(entity.countryLabel ?? entity.country)}</button>`;
    const countryProfile = isCountry ? null : countryByName.get(entity.country);

    body.innerHTML = `
      <div class="profile-head">${headerIcon}<div><h3>${esc(label)}</h3><p>${esc(subtitle)}</p></div></div>
      <div class="profile-stats">
        <div class="profile-stat"><b>${entity.editions}</b><span>equipos-edición</span></div>
        <div class="profile-stat"><b>${entity.solves}</b><span>problemas resueltos</span></div>
        <div class="profile-stat"><b>${entity.meanLevel ?? "—"}</b><span>nivel medio</span></div>
        <div class="profile-stat"><b>${entity.solves ? pct(n56) : "—"}</b><span>de lo resuelto es N5–N6</span></div>
      </div>
      <div class="profile-grid-main">
        <div class="profile-block level-block">
          <h3>Nivel de los problemas que resuelve</h3>
          <div class="dist">
            ${distributionHtml(entity.levels, label)}
            ${distributionHtml(complexity.totals.solvedLevels, "Promedio global")}
          </div>
          <div class="dist-legend">${complexity.levels
            .map((level, index) => `<span><i style="background:${levelColor(index)}"></i>${esc(level.label)}</span>`)
            .join("")}</div>
          <p class="profile-note"><b>${entity.solves ? pct(n56) : "—"}</b> de lo que resuelve es N5–N6, frente a <b>${pct(share(complexity.totals.solvedLevels[4] + complexity.totals.solvedLevels[5], complexity.totals.solves))}</b> global. Nivel medio <b>${entity.meanLevel ?? "—"}</b> frente a <b>${meanLevel(complexity.totals.solvedLevels)?.toFixed(2) ?? "—"}</b> global.</p>
        </div>
        <div class="profile-block country-block">
          <h3>${isCountry ? "Universidades del país" : "País"}</h3>
          <div class="profile-links">${isCountry ? countryLinks || '<span class="muted">Sin universidades con datos.</span>' : universityCountry}</div>
          ${!isCountry && countryProfile ? `<p class="profile-note"><b>${esc(countryProfile.label)}</b>: ${countryProfile.editions} equipos-edición · ${countryProfile.solves} resueltos · nivel medio ${countryProfile.meanLevel}.</p>` : ""}
          <p class="profile-note">${isCountry ? "El perfil del país agrega todos sus equipos; no es un promedio de universidades." : "El perfil de la universidad agrega todos sus equipos en 2011–2025."}${entity.solves < 20 ? " Con pocos problemas resueltos, las diferencias son orientativas." : ""}</p>
        </div>
        <div class="profile-block areas-block">
          <h3>Especialización por área</h3>
          ${specBlock(entity, "areas")}
          <p class="profile-note">Diferencia entre el porcentaje observado y el esperado por el perfil global, en puntos porcentuales. Positivo: más frecuente de lo esperado; negativo: menos frecuente.</p>
        </div>
        <div class="profile-block techniques-block">
          <h3>Técnicas</h3>
          ${specBlock(entity, "techniques")}
        </div>
        <div class="profile-block" style="grid-column:1/-1">
          <h3>Resuelve por nivel</h3>
          <div class="plot" id="profile-level-rates" style="height:300px"></div>
          <p class="profile-note">De los problemas que enfrentó, % resueltos en cada nivel. 100 % = todos los enfrentados.</p>
        </div>
      </div>
      <div class="profile-similar">${similarHtml(entity, kind)}</div>`;

    const ratesEl = body.querySelector("#profile-level-rates");
    if (ratesEl) {
      const regionProfile = complexity.regions.find((region) => region.id === entity.region);
      const country = countryProfile || countryByName.get(entity.country);
      const series = isCountry
        ? [
            { name: entity.label, data: entity.levelRates ?? [], color: colors().accent },
            { name: entity.regionLabel || regionProfile?.label || "Región", data: regionProfile?.levelRates ?? [], color: colors().blue },
            { name: "Mundo", data: complexity.world?.levelRates ?? [], color: colors().dim },
          ]
        : [
            { name: entity.name, data: entity.levelRates ?? [], color: colors().accent },
            { name: country?.label || country?.name || "País", data: country?.levelRates ?? [], color: colors().blue },
            { name: entity.regionLabel || regionProfile?.label || "Región", data: regionProfile?.levelRates ?? [], color: colors().gold },
            { name: "Mundo", data: complexity.world?.levelRates ?? [], color: colors().dim },
          ];
      levelRatePlot(ratesEl, series);
    }
    if (state.profile.compare) {
      const other = state.profile.compare.kind === "country"
        ? countryByName.get(state.profile.compare.id)
        : uniById.get(state.profile.compare.id);
      if (other && other !== entity) body.insertAdjacentHTML("beforeend", comparisonHtml(entity, other, kind));
    }

    body.querySelectorAll("[data-uni-link]").forEach((button) => {
      button.onclick = () => refreshProfileView?.("uni", button.dataset.uniLink, false);
    });
    body.querySelectorAll("[data-country-link]").forEach((button) => {
      button.onclick = () => refreshProfileView?.("country", button.dataset.countryLink, false);
    });
    body.querySelectorAll("[data-similar-link]").forEach((button) => {
      button.onclick = () => refreshProfileView?.(kind, button.dataset.similarLink, false);
    });
  };

  const setupProfile = (root) => {
    const input = root.querySelector("#profile-search");
    const results = root.querySelector("#profile-results");
    const compareInput = root.querySelector("#profile-compare-search");
    const compareResults = root.querySelector("#profile-compare-results");
    const compareWrap = root.querySelector("#profile-compare-wrap");
    const compareToggle = root.querySelector("#profile-compare-toggle");
    const compareClear = root.querySelector("#profile-compare-clear");
    let active = -1;
    let compareActive = -1;

    const close = () => {
      results.hidden = true;
      active = -1;
    };
    const closeCompare = () => {
      compareResults.hidden = true;
      compareActive = -1;
    };
    const paint = () => {
      const needle = input.value.trim();
      if (needle.length < 2) {
        close();
        return;
      }
      const hits = fuzzyFilter(needle, profileEntries(), (entry) => entry.key).slice(0, 8);
      results.innerHTML = hits.length
        ? hits
            .map(
              (hit) =>
                `<button type="button" data-kind="${hit.kind}" data-id="${esc(hit.id)}"><b>${esc(hit.label)}</b><small>${esc(hit.sub)}</small></button>`,
            )
            .join("")
        : '<p class="finder-empty">Sin resultados.</p>';
      results.hidden = false;
      active = -1;
    };
    const paintCompare = () => {
      const needle = compareInput.value.trim();
      if (needle.length < 2) {
        closeCompare();
        return;
      }
      const entries = profileEntries().filter((entry) => entry.kind === state.profile.kind);
      const hits = fuzzyFilter(needle, entries, (entry) => entry.key).slice(0, 8);
      compareResults.innerHTML = hits.length
        ? hits
            .map(
              (hit) =>
                `<button type="button" data-kind="${hit.kind}" data-id="${esc(hit.id)}"><b>${esc(hit.label)}</b><small>${esc(hit.sub)}</small></button>`,
            )
            .join("")
        : '<p class="finder-empty">Sin resultados.</p>';
      compareResults.hidden = false;
      compareActive = -1;
    };
    const sync = () => {
      root.querySelectorAll("[data-profile-kind]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.profileKind === state.profile.kind);
      });
      input.placeholder = "Busca tu universidad o país…";
      input.value = "";
      compareInput.placeholder = state.profile.kind === "country" ? "Comparar con otro país…" : "Comparar con otra universidad…";
      compareToggle.setAttribute("aria-pressed", String(Boolean(state.profile.compare)));
    };
    const choose = (kind, id, scroll) => {
      state.profile.kind = kind;
      state.profile.id = id;
      if (state.profile.compare && state.profile.compare.kind !== kind) state.profile.compare = null;
      if (state.profile.compare && state.profile.compare.id === id) state.profile.compare = null;
      sync();
      renderProfile(root);
      if (scroll) root.closest(".card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    refreshProfileView = choose;

    root.querySelectorAll("[data-profile-kind]").forEach((button) => {
      button.onclick = () => {
        const kind = button.dataset.profileKind;
        const fallback = kind === "country" ? complexity.countries[0]?.name : complexity.universities[0]?.id;
        choose(kind, fallback, false);
      };
    });
    input.oninput = paint;
    input.onkeydown = (event) => {
      const buttons = [...results.querySelectorAll("button[data-id]")];
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!buttons.length) return;
        active = (active + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons.forEach((button, index) => button.classList.toggle("on", index === active));
        buttons[active]?.scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter") {
        event.preventDefault();
        (buttons[active] ?? buttons[0])?.click();
      } else if (event.key === "Escape") {
        close();
        input.blur();
      }
    };
    results.onclick = (event) => {
      const button = event.target.closest("button[data-id]");
      if (!button) return;
      choose(button.dataset.kind, button.dataset.id, false);
      close();
      input.focus();
    };
    compareInput.oninput = paintCompare;
    compareInput.onkeydown = (event) => {
      const buttons = [...compareResults.querySelectorAll("button[data-id]")];
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!buttons.length) return;
        compareActive = (compareActive + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons.forEach((button, index) => button.classList.toggle("on", index === compareActive));
        buttons[compareActive]?.scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter") {
        event.preventDefault();
        (buttons[compareActive] ?? buttons[0])?.click();
      } else if (event.key === "Escape") {
        closeCompare();
        compareInput.blur();
      }
    };
    compareResults.onclick = (event) => {
      const button = event.target.closest("button[data-id]");
      if (!button) return;
      state.profile.compare = { kind: button.dataset.kind, id: button.dataset.id };
      compareInput.value = "";
      closeCompare();
      compareToggle.setAttribute("aria-pressed", "true");
      renderProfile(root);
    };
    compareToggle.onclick = () => {
      const opening = compareWrap.hidden;
      compareWrap.hidden = !opening;
      compareToggle.setAttribute("aria-pressed", String(opening));
      if (opening) {
        compareInput.focus();
      } else {
        state.profile.compare = null;
        compareInput.value = "";
        closeCompare();
        renderProfile(root);
      }
    };
    compareClear.onclick = () => {
      state.profile.compare = null;
      compareWrap.hidden = true;
      compareToggle.setAttribute("aria-pressed", "false");
      compareInput.value = "";
      closeCompare();
      renderProfile(root);
    };
    document.addEventListener("click", (event) => {
      if (!root.querySelector(".profile-search")?.contains(event.target)) close();
      if (!compareWrap.contains(event.target)) closeCompare();
    });
    sync();
    renderProfile(root);
  };

  const insightsHtml = () => {
    const n6 = complexity.totals.levels[5];
    const n6Share = share(n6, complexity.scope.problems);
    const geo = complexity.totals.areas.geometry ?? 0;
    const graphs = complexity.totals.areas.graphs ?? 0;
    const geoShare = share(geo + graphs, complexity.scope.problems);
    const dp = complexity.techniques.find((item) => item.id === "dynamic_programming");
    const dpShare = dp ? share(dp.levels[4] + dp.levels[5], dp.count) : 0;
    const top10 = complexity.rankQuartiles.find((item) => item.id === "top10");
    const bottom = complexity.rankQuartiles.find((item) => item.id === "50-100");
    const graphsArea = complexity.areas.find((item) => item.id === "graphs");
    const graphsHard = graphsArea ? share(graphsArea.levels[4] + graphsArea.levels[5], graphsArea.count) : 0;
    const hardest = [...complexity.editions].sort((left, right) => right.meanLevel - left.meanLevel)[0];
    const easiest = [...complexity.editions].sort((left, right) => left.meanLevel - right.meanLevel)[0];
    return `<div class="insight-grid">
      <div class="insight"><b>${Math.round(n6Share * 100)}%</b><div><p>${n6} de ${complexity.scope.problems} problemas son N6: los resolvió menos del 10% de los equipos.</p><small>N6 no significa imposible; mide rareza en la final.</small></div></div>
      <div class="insight"><b>${Math.round(geoShare * 100)}%</b><div><p>Geometría y grafos concentran ${geo + graphs} de ${complexity.scope.problems} problemas.</p><small>Son las dos áreas más frecuentes del período.</small></div></div>
      <div class="insight"><b>${dp?.count ?? "—"}</b><div><p>Programación dinámica es la técnica más frecuente${dp ? `; ${Math.round(dpShare * 100)}% de sus problemas son N5–N6` : ""}.</p><small>Se usa la técnica primaria de cada problema.</small></div></div>
      <div class="insight"><b>${top10?.solvesPerTeam?.toFixed(1) ?? "—"}</b><div><p>El top 10% resuelve ${top10?.solvesPerTeam?.toFixed(1) ?? "—"} problemas por equipo; el 50% inferior, ${bottom?.solvesPerTeam?.toFixed(1) ?? "—"}.</p><small>Cuartiles por puesto en cada final.</small></div></div>
      <div class="insight"><b>${Math.round(graphsHard * 100)}%</b><div><p>Grafos es el área con mayor proporción N5–N6; geometría es la más frecuente (${geo} problemas).</p><small>La frecuencia y la dificultad no siempre van juntas.</small></div></div>
      <div class="insight"><b>${hardest.meanLevel}</b><div><p>${hardest.year} fue la final más exigente; ${easiest.year} la más abierta (${easiest.meanLevel}).</p><small>Nivel medio de los problemas de cada edición.</small></div></div>
    </div>`;
  };

  startPage({
    page: "complejidad",
    title: "Complejidad",
    subtitle: "Dificultad, temas y especialización en las finales 2011–2025.",
    render(view) {
      const dash = grid(view);

      const hero = card(dash, {
        span: 12,
        html: `<div class="scope"><span class="scope-tag">2011–2025</span><p>Esta página analiza solo las finales de <b>2011 a 2025</b>: ${complexity.scope.editions} ediciones, ${complexity.scope.problems} problemas y ${formatInt(complexity.scope.teams)} equipos-edición. Quedan fuera 2008–2010. Usa el explorador de problemas y el buscador de universidades y países más abajo.</p></div>
          <nav class="toc" aria-label="Secciones de esta página">
            <a href="#problemas">Problemas</a><a href="#ediciones">Ediciones</a><a href="#temas">Temas</a><a href="#friccion">Fricción</a><a href="#orden">Orden</a><a href="#perfil">Universidad y país</a><a href="#metodologia">Metodología</a>
          </nav>`,
      });
      hero.closest(".card").classList.add("finder-card");

      const n6 = complexity.totals.levels[5];
      const kpiElement = kpis(dash, [
        [String(complexity.scope.problems), "problemas"],
        [String(complexity.scope.editions), "finales"],
        [formatInt(complexity.scope.teams), "equipos-edición"],
        [`${n6} (${Math.round(share(n6, complexity.scope.problems) * 100)}%)`, "problemas N6"],
      ]);
      kpiElement.classList.add("s12");

      card(dash, {
        title: "La escala de dificultad",
        sub: "N1–N6 por tasa de resolución en la final. Los nombres importan más que los números.",
        span: 12,
        html: `<div class="level-scale">${complexity.levels
          .map((level, index) => {
            const count = complexity.totals.levels[index];
            return `<div class="level-tile">
              <div class="lt-top"><i class="dot" style="background:${levelColor(index)}"></i><b>N${level.level}</b><span class="range">${levelRange(level.level)}</span></div>
              <b>${esc(level.label)}</b>
              <p>${esc(level.definition)}</p>
              <span class="count"><b>${count}</b> problemas · ${Math.round(share(count, complexity.scope.problems) * 100)}%</span>
            </div>`;
          })
          .join("")}</div>`,
      });

      const problemCard = card(dash, {
        id: "problemas",
        title: "Explorador de problemas",
        sub: "Busca por título, edición, área, técnica, tarea o nivel. Haz clic en una fila para leer el enunciado.",
        span: 12,
        html: `<div class="problem-toolbar">
          <label class="search-field">Buscar problema<input id="problem-search" type="search" placeholder="Título, año, área, técnica…" autocomplete="off"></label>
          <label>Año<select id="filter-year" data-plain><option value="all">Todos</option>${complexity.editions.map((edition) => `<option value="${edition.year}">${edition.year}</option>`).join("")}</select></label>
          <label>Área<select id="filter-area" data-plain><option value="all">Todas</option>${complexity.areas.map((area) => `<option value="${area.id}">${esc(area.label)}</option>`).join("")}</select></label>
          <label>Técnica<select id="filter-technique" data-plain><option value="all">Todas</option>${complexity.techniques.filter((tech) => tech.count > 0).map((tech) => `<option value="${tech.id}">${esc(tech.label)}</option>`).join("")}</select></label>
          <label>Nivel<select id="filter-level" data-plain><option value="all">Todos</option>${complexity.levels.map((level) => `<option value="${level.level}">N${level.level} · ${esc(level.label)}</option>`).join("")}</select></label>
          <label>Carga<select id="filter-burden" data-plain><option value="all">Todas</option>${complexity.burdens.map((burden) => `<option value="${burden.id}">${esc(burden.label)}</option>`).join("")}</select></label>
          <div class="clear"><button id="problem-clear" type="button">Limpiar</button></div>
        </div>
        <div class="quick"><span>Atajos:</span><button type="button" data-quick="n6">Solo N6</button><button type="button" data-quick="geometry">Geometría</button><button type="button" data-quick="dp">Programación dinámica</button><button type="button" data-quick="reset">Todo</button></div>
        <div class="problem-meta"><p class="sub" id="problem-count"></p><p class="sub">Ordena haciendo clic en los encabezados.</p></div>
        <p class="sub mobile-hint">Desliza la tabla para ver todas las columnas.</p>
        <div id="problem-table"></div>`,
      });
      setupProblemExplorer(problemCard);

      const hardest = [...complexity.editions].sort((left, right) => right.meanLevel - left.meanLevel)[0];
      const easiest = [...complexity.editions].sort((left, right) => left.meanLevel - right.meanLevel)[0];
      const editionMix = card(dash, {
        id: "ediciones",
        title: "Dificultad por edición",
        sub: "Mezcla N1–N6 o nivel medio de cada final.",
        span: 6,
        html: `<div class="filters" style="margin:0 0 8px;padding:0;border:0;background:none">
          <span class="seg" role="group" aria-label="Vista de ediciones">
            <button type="button" data-edition-view="mix" aria-pressed="true">Mezcla</button>
            <button type="button" data-edition-view="trend" aria-pressed="false">Nivel medio</button>
          </span>
        </div>
        <div id="edition-plot-holder"><div id="edition-plot" class="plot" style="height:360px"></div></div>
        <p class="note" id="edition-note"></p>`,
      });
      setupEditionView(editionMix);

      const fingerprintCard = card(dash, {
        title: "Huella de cada edición",
        sub: "Cada cuadrado es un problema. El color indica N1–N6; la letra, el problema.",
        span: 6,
        html: `<div class="filters" style="margin:0 0 8px;padding:0;border:0;background:none">
          <span class="seg" role="group" aria-label="Orden de la huella">
            <button type="button" data-fingerprint-sort="level" aria-pressed="true">Por nivel</button>
            <button type="button" data-fingerprint-sort="order" aria-pressed="false">Orden de primera solución</button>
          </span>
        </div>
        <div id="fingerprint-body"></div>`,
      });
      setupFingerprint(fingerprintCard);

      const comparisonLevels = card(dash, {
        title: "Comparar ediciones: dificultad",
        sub: "Elige dos finales, o una final y el promedio del período, y compara la mezcla N1–N6.",
        span: 7,
        html: `<div class="cmp-controls">
          <label>A<select id="edition-a" data-plain>${complexity.editions.map((edition) => `<option value="${edition.year}">${edition.year}</option>`).join("")}<option value="avg">Promedio 2011–2025</option></select></label>
          <label>B<select id="edition-b" data-plain>${complexity.editions.map((edition) => `<option value="${edition.year}">${edition.year}</option>`).join("")}<option value="avg">Promedio 2011–2025</option></select></label>
          <button type="button" class="chip" id="edition-swap" style="min-height:40px">Intercambiar</button>
        </div>
        <div id="edition-compare"></div>`,
      });
      const comparisonTopics = card(dash, {
        title: "Comparar ediciones: temas",
        sub: "Qué áreas o técnicas ganan y pierden participación entre las dos finales.",
        span: 5,
        html: '<div id="edition-topics"></div>',
      });
      setupEditionComparison(comparisonLevels);

      const topicsChart = card(dash, {
        id: "temas",
        title: "Qué temas son más difíciles",
        sub: "Porcentaje de problemas N1–N6 por técnica, área o tarea. Se usa la etiqueta primaria.",
        span: 7,
        html: `<div class="filters" style="margin:0 0 8px;padding:0;border:0;background:none">
          <label>Ver por<select id="topic-dim" data-plain><option value="techniques">Técnicas</option><option value="areas">Áreas</option><option value="tasks">Tareas</option></select></label>
          <label>Ordenar por<select id="topic-sort" data-plain><option value="count">Más frecuentes</option><option value="difficulty">Mayor % N5–N6</option></select></label>
        </div><div id="topic-plot" class="plot" style="height:440px"></div>`,
      });
      setupTopics(topicsChart);

      const topicTable = card(dash, {
        title: "Técnicas: frecuencia y dificultad",
        sub: "Cuántos problemas usan cada técnica y qué proporción es dura o excepcional.",
        span: 5,
        html: `<div class="tablew"><table><thead><tr><th>Técnica</th><th class="n">Problemas</th><th class="n">% N5–N6</th></tr></thead><tbody>${complexity.techniques
          .filter((tech) => tech.count > 0)
          .map((tech) => {
            const hard = share(tech.levels[4] + tech.levels[5], tech.count);
            return `<tr><td>${esc(tech.label)}</td><td class="n">${tech.count}</td><td class="n" data-sort="${hard}"><span class="rate-cell"><span class="rate-bar"><i style="width:${hard * 100}%"></i></span>${Math.round(hard * 100)}%</span></td></tr>`;
          })
          .join("")}</tbody></table></div>`,
      });
      topicTable.closest(".card").classList.add("topic-table-card");

      const compareCard = card(dash, {
        title: "Comunes y difíciles",
        sub: "Frecuencia frente a porcentaje N5–N6. Cada punto es una técnica, un área o una tarea.",
        span: 7,
        html: `<div class="filters" style="margin:0 0 8px;padding:0;border:0;background:none">
          <label>Ver por<select id="compare-dim" data-plain><option value="techniques">Técnicas</option><option value="areas">Áreas</option><option value="tasks">Tareas</option></select></label>
        </div>
        <div id="compare-plot-holder"><div id="compare-plot" class="plot" style="height:360px"></div></div>
        <p class="note">Arriba a la derecha: frecuentes y duras. Abajo a la derecha: frecuentes y asequibles. El tamaño del punto es la cantidad de problemas.</p>`,
      });

      const compareReading = card(dash, {
        title: "Lectura: comunes y difíciles",
        sub: "Qué es frecuente y qué es duro en la dimensión elegida.",
        span: 5,
        html: '<div id="compare-reading"></div>',
      });
      compareReading.closest(".card").classList.add("topic-read-card");
      setupCompare(compareCard, compareReading);

      const frictionCard = card(dash, {
        id: "friccion",
        title: "Fricción: problemas que engañan",
        sub: "Tasa de resolución frente a intentos fallidos por equipo. Cada punto es un problema; las líneas son las medianas del período.",
        span: 7,
        html: `<div id="friction-plot-holder"><div id="friction-plot" class="plot" style="height:380px"></div></div>
          <div class="dist-legend">${complexity.levels
            .map((level, index) => `<span><i style="background:${levelColor(index)}"></i>${esc(level.label)}</span>`)
            .join("")}</div>
          <p class="note">Los problemas etiquetados son los de más fricción. Si eliges un tema, se resaltan sus problemas. Haz clic en un punto para abrir su ficha.</p>`,
      });

      const frictionList = card(dash, {
        title: "Trampas y muros",
        sub: "Trampa: tasa por encima de la mediana pero muchos intentos fallidos. Muro: tasa por debajo de la mediana y muchos fallos.",
        span: 5,
        html: `<div class="friction-controls">
          <label>Dimensión<select id="friction-dim" data-plain><option value="techniques">Técnicas</option><option value="areas">Áreas</option><option value="tasks">Tareas</option></select></label>
          <label>Tema<select id="friction-category" data-plain></select></label>
        </div>
        <div id="friction-table"></div>
        <p class="note">Int./res. = intentos por problema resuelto.</p>`,
      });
      setupFriction(frictionCard, frictionList);

      const orderCard = card(dash, {
        id: "orden",
        title: "Orden de ataque",
        sub: "Tasa media de resolución según el orden de primera solución. Q1 = problemas que se resolvieron primero; Q4 = últimos primeros-solves.",
        span: 7,
        html: `<div id="order-plot" class="plot" style="height:300px"></div>
          ${orderTableHtml()}
          <p class="note">El orden usa el minuto del primer solve de cada problema; no se muestran curvas por minuto. Q1–Q4 reparten los problemas de cada final por su posición de primera solución. ${complexity.scope.firstSolveCoverage} de ${complexity.scope.problems} problemas tienen primera solución registrada. Int./res. = intentos por problema resuelto.</p>`,
      });
      drawOrderChart(orderCard.querySelector("#order-plot"));

      const firstLastCard = card(dash, {
        title: "Apertura y cierre",
        sub: "Primer y último problema en resolverse en cada final.",
        span: 5,
        html: firstLastHtml(),
      });
      firstLastCard.closest(".card").classList.add("firstlast-card");

      const crossCard = card(dash, {
        title: "Técnica × área",
        sub: "Qué técnicas se usan en cada área. Cuenta problemas con esa combinación de etiquetas primarias.",
        span: 7,
        html: `<div id="cross-plot" class="plot" style="height:400px"></div>
          <p class="note">Una celda vacía significa que la combinación no aparece como etiqueta primaria; puede existir como etiqueta secundaria.</p>`,
      });
      drawCrossHeatmap(crossCard.querySelector("#cross-plot"));

      const topPairs = [...complexity.techniqueArea]
        .sort((left, right) => right.count - left.count)
        .slice(0, 10)
        .map((pair) => [techLabel[pair.technique] ?? pair.technique, areaLabel[pair.area] ?? pair.area, pair.count]);
      const pairsCard = card(dash, {
        title: "Combinaciones más frecuentes",
        sub: "Pares de técnica y área primarias con más problemas en el período.",
        span: 5,
        html: `<div class="tablew"><table data-nosort><thead><tr><th>Técnica</th><th>Área</th><th class="n">Problemas</th></tr></thead><tbody>${topPairs
          .map(([technique, area, count]) => `<tr><td>${esc(technique)}</td><td>${esc(area)}</td><td class="n">${count}</td></tr>`)
          .join("")}</tbody></table></div>`,
      });

      const dominanceCard = card(dash, {
        title: "¿Quién destaca en cada tema?",
        sub: "Especialización relativa: cuánto supera cada universidad o país el perfil global en un área o técnica. No mide volumen absoluto. Filtra por región y abre un perfil con un clic.",
        span: 12,
        html: `<div class="dominance-controls">
          <span class="seg" role="group" aria-label="Entidades">
            <button type="button" data-dom-kind="uni" aria-pressed="true">Universidades</button>
            <button type="button" data-dom-kind="country" aria-pressed="false">Países</button>
          </span>
          <span class="seg" role="group" aria-label="Vista"><button type="button" data-dom-view="ranking" aria-pressed="true">Ranking</button><button type="button" data-dom-view="map" aria-pressed="false">Tabla</button></span>
          <label>Región<select id="dom-region" data-plain><option value="all">Todas</option>${REGION_OPTIONS.map(([id, label]) => `<option value="${id}">${esc(label)}</option>`).join("")}</select></label>
          <label>Dimensión<select id="dom-dim" data-plain><option value="areas">Áreas</option><option value="techniques">Técnicas</option></select></label>
          <label>Tema<select id="dom-category" data-plain></select></label>
        </div>
        <div id="dominance-body"></div>`,
      });
      setupDominance(dominanceCard);

      const profileCard = card(dash, {
        id: "perfil",
        title: "Tu universidad y tu país",
        sub: "Busca una universidad o un país y mira en qué áreas y técnicas destaca frente al promedio de las finales.",
        span: 12,
        html: `<div class="profile-controls">
          <span class="seg" role="group" aria-label="Tipo de perfil"><button type="button" data-profile-kind="uni" aria-pressed="true">Universidad</button><button type="button" data-profile-kind="country" aria-pressed="false">País</button></span>
          <div class="profile-search"><input id="profile-search" type="search" autocomplete="off" placeholder="Busca tu universidad…" aria-label="Buscar universidad o país"><div class="profile-results" id="profile-results" hidden></div></div>
          <button type="button" class="chip" id="profile-compare-toggle" aria-pressed="false">Comparar</button>
        </div>
        <div class="profile-compare-wrap" id="profile-compare-wrap" hidden>
          <div class="profile-search"><input id="profile-compare-search" type="search" autocomplete="off" placeholder="Comparar con otra universidad…" aria-label="Comparar con otra universidad o país"><div class="profile-results" id="profile-compare-results" hidden></div></div>
          <button type="button" class="chip" id="profile-compare-clear">Quitar comparación</button>
        </div>
        <div id="profile-body"></div>`,
      });
      profileCard.closest(".card").classList.add("profile-card");
      setupProfile(profileCard);

      const rankFailureCard = card(dash, {
        title: "¿Por qué unos equipos ganan y otros no?",
        sub: "Porcentaje de intentos fallidos por nivel y cuartil de ranking.",
        span: 6,
        html: `<div id="rank-failure" class="plot" style="height:320px"></div>
          <div class="tablew quartile-table"><table data-nosort><thead><tr><th>Brecha de fallo</th><th class="n">Top 10%</th><th class="n">50–100%</th><th class="n">Diferencia</th></tr></thead><tbody>${[0, 3, 5]
            .map((index) => {
              const top = complexity.rankQuartiles.find((quartile) => quartile.id === "top10").failureRate[index];
              const bottom = complexity.rankQuartiles.find((quartile) => quartile.id === "50-100").failureRate[index];
              return `<tr><td>N${index + 1}</td><td class="n">${Math.round(top * 100)}%</td><td class="n">${Math.round(bottom * 100)}%</td><td class="n">${Math.round((bottom - top) * 100)} pp</td></tr>`;
            })
            .join("")}</tbody></table></div>
          <p class="note">Los mejores equipos intentan más problemas difíciles; por eso su tasa de fallo en N6 no es menor. La brecha se estrecha en los niveles altos: en N6 casi todos fallan.</p>`,
      });
      drawRankFailure(rankFailureCard.querySelector("#rank-failure"));

      const quartileCard = card(dash, {
        title: "Profundidad por cuartil",
        sub: "Mezcla N1–N6 de los problemas resueltos por equipos de cada cuartil de ranking.",
        span: 6,
        html: `<div id="quartile-plot" class="plot" style="height:320px"></div>
          <div class="tablew quartile-table"><table data-nosort><thead><tr><th>Cuartil</th><th class="n">Equipos-edición</th><th class="n">Resueltos/equipo</th><th class="n">Nivel medio</th></tr></thead><tbody>${complexity.rankQuartiles
            .map((quartile) => `<tr><td>${esc(quartile.label)}</td><td class="n">${quartile.teams}</td><td class="n">${quartile.solvesPerTeam ?? "—"}</td><td class="n">${quartile.meanLevel ?? "—"}</td></tr>`)
            .join("")}</tbody></table></div>
          <p class="note">Cuartiles por puesto en cada final. Un mismo equipo puede caer en cuartiles distintos en años distintos.</p>`,
      });
      levelStack(quartileCard.querySelector("#quartile-plot"), complexity.rankQuartiles, { horizontal: false });

      const insightCard = card(dash, {
        title: "Lo que dicen los datos",
        sub: "Seis lecturas rápidas del período 2011–2025.",
        span: 12,
        html: insightsHtml(),
      });
      insightCard.closest(".card").classList.add("insight-card");

      card(dash, {
        id: "metodologia",
        title: "Metodología",
        sub: "Qué mide cada elemento, cómo se calcula y de dónde sale.",
        span: 12,
        html: `<div class="method-columns"><div class="method-column">
          <section><h3>Alcance</h3><p>Finales de <b>2011 a 2025</b>: ${complexity.scope.editions} ediciones, ${complexity.scope.problems} problemas y ${formatInt(complexity.scope.teams)} equipos-edición. Quedan fuera 2008–2010. No se usan curvas por minuto; el minuto del primer solve solo se usa para ordenar los problemas.</p></section>
          <section><h3>Categorías N1–N6</h3><p>Se calculan con la tasa de resolución de cada problema en su final: equipos que lo resolvieron / equipos que participaron. Los nombres son la lectura principal; el número es una etiqueta.</p><div class="level-list">${complexity.levels
            .map((level, index) => `<span class="badge"><i style="background:${levelColor(index)}"></i>N${level.level} · ${esc(level.label)} (${levelRange(level.level)}) · ${complexity.totals.levels[index]}</span>`)
            .join("")}</div></section>
          <section><h3>Áreas, técnicas y tareas</h3><p><b>Área</b> es el objeto del problema (geometría, grafos, strings, teoría de números, optimización, etc.). <b>Técnica</b> es la herramienta (DP, greedy, flujo, búsqueda binaria, segment tree, etc.). Las estructuras de datos son técnicas, no áreas. <b>Tarea</b> es lo que se pide: optimizar, contar, decidir, construir, calcular o simular.</p><p>La taxonomía es multi-etiqueta: cada problema tiene un área, una técnica y una tarea primarias, más cero o más secundarias. Los gráficos usan la primaria para que las categorías sumen.</p></section>
          <section><h3>Glosario</h3><p><b>Equipo-edición:</b> un equipo en una final; un mismo equipo puede repetir en varias finales.</p><p><b>Problema perfecto:</b> lo resolvieron todos los equipos de esa final.</p><p><b>Primera solución:</b> el primer equipo que resolvió el problema; su minuto solo se usa para ordenar.</p></section>
          </div><div class="method-column">
          <section><h3>Carga de implementación y formato</h3><p>La carga es baja, media o alta: una revisión manual del código esperado, no una medida de dificultad conceptual. No se usa como área ni como técnica. El formato es estándar o interactivo.</p></section>
          <section><h3>Índices</h3><ul><li><b>Tasa de resolución</b> = resueltos / equipos de esa final.</li><li><b>Fallidos por equipo</b> = (intentos − resueltos) / equipos.</li><li><b>Intentos por resuelto</b> = intentos / resueltos.</li><li><b>Nivel medio</b> = promedio de N1–N6 de los problemas resueltos por una entidad, o de los problemas de una final.</li><li><b>Especialización</b> = porcentaje observado − porcentaje esperado por el perfil global, en puntos porcentuales.</li><li><b>Cuartiles</b> = puesto / tamaño del campo: top 10%, 10–25%, 25–50%, 50–100%.</li><li><b>Orden de primera solución</b> = posición según el minuto del primer solve dentro de su final. Se usa solo para ordenar; no se muestran curvas por minuto.</li></ul></section>
          <section><h3>Fuentes</h3><p>Scoreboard matrix 2011–2025 (zibada y Kattis, verificado contra <code>core.json</code>), taxonomía v1 revisada, dificultad por problema y enunciados extraídos de los PDF oficiales de cada final.</p></section>
          <section><h3>Límites</h3><ul><li>El scoreboard es por equipo, no por miembro.</li><li>La carga es manual y la taxonomía tiene confianza A/B/C.</li><li>Cada final tiene 11–15 problemas: los porcentajes son gruesos.</li><li>N6 no significa imposible: ${complexity.totals.levels[5]} problemas (${Math.round(share(complexity.totals.levels[5], complexity.scope.problems) * 100)}%) fueron resueltos por menos del 10%.</li><li>${complexity.scope.problems - complexity.scope.firstSolveCoverage} de ${complexity.scope.problems} problemas no tienen primera solución registrada; no entran en el análisis de orden.</li></ul></section>
        </div></div>`,
      });
    },
  });
}
