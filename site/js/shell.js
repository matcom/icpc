// Page frame: navigation, search, theme, cards, KPIs and shared filters.
import { crest, countryName, countryUrl, esc, fold, loadData, personUrl, uniUrl } from "./core.js";
import { disposeAll } from "./charts.js";

const NAV = [
  ["index", "Panorama", "◉"],
  ["paises", "Países", "⚑"],
  ["universidades", "Universidades", "⌂"],
  ["renovacion", "Renovación", "↻"],
  ["problemas", "Problemas", "✓"],
  ["medallas", "Medallas", "★"],
  ["competidores", "Competidores", "☺"],
  ["predicciones", "Predicciones", "◔"],
  ["comparar", "Comparar", "⇄"],
  ["datos", "Datos y método", "ⓘ"],
];

const THEME_KEY = "icpc-theme";
document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) ?? "pergamino";

export const isDark = () => document.documentElement.dataset.theme === "vino";

export async function startPage({ page, title, subtitle, render }) {
  const data = await loadData();
  const current = NAV.find(([slug]) => slug === page) ? page : null;
  const twin = `${location.pathname.split("/").pop() || "index.html"}.md`;
  document.body.innerHTML = `
    <div class="stripe"></div>
    <div class="layout">
      <aside class="side">
        <a class="brand" href="index.html"><span class="balloons"><i></i><i></i><i></i></span><span><b>Observatorio</b><small>ICPC World Finals</small></span></a>
        <nav aria-label="Secciones">${NAV.map(([slug, label, icon]) => `<a href="${slug === "index" ? "index" : slug}.html"${slug === current ? ' aria-current="page"' : ""}><span class="ic">${icon}</span>${label}</a>`).join("")}</nav>
        <div class="next">Próxima final<b>${esc(data.next_final.place)}</b><small>${esc(data.next_final.dates)}</small></div>
      </aside>
      <div class="content">
        <header class="bar">
          <div class="search"><input id="q" type="search" placeholder="Busca universidad, país o competidor…" autocomplete="off" aria-label="Buscar"><div class="results" id="res" hidden></div></div>
          <div class="themes" role="group" aria-label="Tema"><button data-theme-to="pergamino">Pergamino</button><button data-theme-to="vino">Vino</button></div>
        </header>
        <main id="view"></main>
        <footer><span>Datos: <a href="https://cphof.org">cphof.org</a> y <a href="https://github.com/yudivian/icpc">yudivian/icpc</a>.</span> <a href="datos.html">Método y límites</a> · <a href="${esc(twin)}">Versión Markdown</a> · <a href="https://github.com/matcom/icpc">Código</a></footer>
      </div>
    </div>`;
  wireSearch(data);
  const draw = () => {
    disposeAll();
    const view = document.getElementById("view");
    view.innerHTML = title ? `<div class="head"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>` : "";
    render(view, data, draw);
  };
  wireTheme(draw);
  draw();
}

function wireTheme(draw) {
  const mark = () => document.querySelectorAll("[data-theme-to]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.themeTo === document.documentElement.dataset.theme));
  mark();
  document.querySelectorAll("[data-theme-to]").forEach((b) => {
    b.onclick = () => {
      document.documentElement.dataset.theme = b.dataset.themeTo;
      localStorage.setItem(THEME_KEY, b.dataset.themeTo);
      mark();
      draw();
    };
  });
}

function wireSearch(data) {
  const input = document.getElementById("q");
  const box = document.getElementById("res");
  const entries = [
    ...[...data.countriesIndex.values()].map((c) => ({ kind: "País", order: 0, label: c.es, sub: `${c.rows.length} participaciones`, key: fold(`${c.es} ${c.name}`), url: countryUrl(c.name), mark: c.name })),
    ...data.unis.map((u) => ({ kind: "Universidad", order: 1, label: u.name, sub: `${countryName(data, u.country)} · ${u.results.length} finales`, key: fold(u.name), url: uniUrl(u.id), mark: u.name })),
    ...[...data.people.values()].map((p) => ({ kind: "Competidor", order: 2, label: p.name, sub: `${p.rows[p.rows.length - 1].uniName} · ${p.rows.length} finales`, key: fold(p.name), url: personUrl(p.key), mark: p.name })),
  ];
  input.oninput = () => {
    const needle = fold(input.value.trim());
    if (needle.length < 2) { box.hidden = true; return; }
    const hits = entries.filter((e) => e.key.includes(needle)).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)).slice(0, 12);
    box.hidden = false;
    box.innerHTML = hits.length
      ? hits.map((h) => `<a href="${esc(h.url)}">${crest(h.mark, 26)}<span>${esc(h.label)}<small>${esc(h.sub)}</small></span><em>${h.kind}</em></a>`).join("")
      : '<p class="none">Sin resultados</p>';
  };
  input.onkeydown = (event) => {
    if (event.key === "Enter") box.querySelector("a")?.click();
    if (event.key === "Escape") { box.hidden = true; input.blur(); }
  };
  document.addEventListener("click", (event) => { if (!event.target.closest(".search")) box.hidden = true; });
}

// ------------------------------------------------------------ building blocks

export function grid(parent) {
  const el = document.createElement("div");
  el.className = "dash";
  parent.append(el);
  return el;
}

export function card(parent, { title, sub, span = 6, html = "", id }) {
  const el = document.createElement("section");
  el.className = `card s${span}`;
  if (id) el.id = id;
  el.innerHTML = `${title ? `<h2>${esc(title)}</h2>` : ""}${sub ? `<p class="sub">${esc(sub)}</p>` : ""}<div class="body">${html}</div>`;
  parent.append(el);
  return el.querySelector(".body");
}

// A card holding one chart canvas; returns the canvas element.
export function chartCard(parent, { title, sub, span = 6, height = 340 }) {
  const body = card(parent, { title, sub, span });
  const el = document.createElement("div");
  el.className = "plot";
  el.style.height = `${window.innerWidth < 640 ? Math.min(height, 340) : height}px`;
  body.append(el);
  return el;
}

export function kpis(parent, items) {
  const el = document.createElement("div");
  el.className = "kpis";
  el.innerHTML = items.map(([value, label, href]) => `<${href ? `a href="${esc(href)}"` : "div"} class="kpi"><b${String(value).length > 11 ? ' class="long"' : ""}>${esc(value)}</b><span>${esc(label)}</span></${href ? "a" : "div"}>`).join("");
  parent.append(el);
  return el;
}

export function barList(items, { format = (v) => v } = {}) {
  if (!items.length) return '<p class="sub">Ningún resultado con estos filtros.</p>';
  const max = Math.max(...items.map((i) => i.value), 1e-9);
  return `<ol class="hb">${items.map((item, n) => `<li><a href="${esc(item.url ?? "#")}"><span class="ix">${n + 1}</span><span class="nm">${esc(item.label)}</span><span class="v">${format(item.value)}</span><span class="bar"><i style="width:${(100 * item.value) / max}%"></i></span></a></li>`).join("")}</ol>`;
}

export function table(headers, rows) {
  return `<div class="tablew"><table><thead><tr>${headers.map((h) => `<th${h.num ? ' class="n"' : ""}${h.title ? ` title="${esc(h.title)}"` : ""}>${esc(h.label ?? h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c, i) => `<td${headers[i].num ? ' class="n"' : ""}>${c ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

// Filter bar whose values live in the URL, so a filtered view can be shared.
export function filters(parent, data, defaults, onChange) {
  const url = new URLSearchParams(location.search);
  const state = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (url.has(key)) state[key] = typeof defaults[key] === "number" ? Number(url.get(key)) : url.get(key);
  }
  const options = (items, selected) => items.map(([value, label]) => `<option value="${esc(value)}"${String(value) === String(selected) ? " selected" : ""}>${esc(label)}</option>`).join("");
  const years = data.years.map((y) => [y, y]);
  const fields = [];
  if ("from" in state) fields.push(`<label>Desde <select data-f="from">${options(years, state.from)}</select></label>`);
  if ("to" in state) fields.push(`<label>Hasta <select data-f="to">${options(years, state.to)}</select></label>`);
  if ("region" in state) fields.push(`<label>Región <select data-f="region">${options([["all", "Todas"], ...Object.entries(data.regions)], state.region)}</select></label>`);
  if ("min" in state) fields.push(`<label>Mín. finales <select data-f="min">${options([1, 2, 3, 5, 8, 10, 15].map((v) => [v, v]), state.min)}</select></label>`);
  if ("top" in state) fields.push(`<label>Mostrar <select data-f="top">${options([10, 20, 30, 50, 100].map((v) => [v, v]), state.top)}</select></label>`);
  if ("scope" in state) fields.push(`<span class="seg" role="group" aria-label="Agrupar por"><button data-scope="uni">Universidades</button><button data-scope="country">Países</button></span>`);
  const el = document.createElement("div");
  el.className = "filters";
  el.innerHTML = fields.join("");
  parent.append(el);
  const emit = () => {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(state)) {
      if (value === defaults[key]) next.delete(key); else next.set(key, value);
    }
    const query = next.toString();
    history.replaceState(null, "", query ? `?${query}` : location.pathname);
    onChange(state);
  };
  el.querySelectorAll("[data-f]").forEach((select) => {
    select.onchange = () => {
      const key = select.dataset.f;
      state[key] = typeof defaults[key] === "number" ? Number(select.value) : select.value;
      if (state.from > state.to) {
        if (key === "from") state.to = state.from; else state.from = state.to;
        el.querySelector('[data-f="from"]').value = state.from;
        el.querySelector('[data-f="to"]').value = state.to;
      }
      emit();
    };
  });
  const scopeButtons = el.querySelectorAll("[data-scope]");
  const markScope = () => scopeButtons.forEach((b) => b.setAttribute("aria-pressed", b.dataset.scope === state.scope));
  markScope();
  scopeButtons.forEach((b) => { b.onclick = () => { state.scope = b.dataset.scope; markScope(); emit(); }; });
  return state;
}

export const filterRows = (data, state) => data.rows.filter((r) =>
  (state.from == null || r.year >= state.from) && (state.to == null || r.year <= state.to) &&
  (state.region == null || state.region === "all" || r.region === state.region));

export function universityPicker(data, selected, label) {
  const names = [...data.unis].sort((a, b) => a.name.localeCompare(b.name, "es"));
  return `<label>${esc(label)} <select data-pick>${names.map((u) => `<option value="${esc(u.id)}"${u.id === selected ? " selected" : ""}>${esc(u.name)}</option>`).join("")}</select></label>`;
}

// Sequence of participations: arcs join finals that share team members.
export function sequenceSvg(data, uni) {
  const years = data.years;
  const width = window.innerWidth < 640 ? 440 : 760;
  const pad = 12;
  const cell = (width - 2 * pad) / years.length;
  const base = 170;
  const x = (year) => pad + cell * (year - years[0]) + cell / 2;
  const byYear = new Map(uni.results.map((r) => [r.year, r]));
  let svg = "";
  let highest = base - 26;
  uni.results.forEach((a, i) => {
    for (const b of uni.results.slice(i + 1)) {
      const shared = a.player_ids.filter((p) => b.player_ids.includes(p)).length;
      if (!shared) continue;
      const x1 = x(a.year);
      const x2 = x(b.year);
      const top = base - 20 - Math.min(130, (x2 - x1) * 0.7);
      highest = Math.min(highest, (top + base - 13) / 2 - 12);
      const color = ["", "var(--blue-t)", "var(--accent)", "var(--red-t)"][Math.min(shared, 3)];
      svg += `<path d="M${x1} ${base - 13}Q${(x1 + x2) / 2} ${top} ${x2} ${base - 13}" fill="none" stroke="${color}" stroke-width="${shared + 0.6}" opacity=".85"><title>${a.year} a ${b.year}: ${shared} en común</title></path>`;
      svg += `<text x="${(x1 + x2) / 2}" y="${(top + base - 13) / 2 + 1}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)" paint-order="stroke" stroke="var(--panel)" stroke-width="3">${shared}</text>`;
    }
  });
  const size = Math.min(cell - 2, 22);
  for (const year of years) {
    const r = byYear.get(year);
    svg += `<rect x="${x(year) - size / 2}" y="${base - size / 2}" width="${size}" height="${size}" rx="4" fill="${r ? "var(--accent)" : "none"}" stroke="var(--line)"><title>${year}${r ? `: puesto ${r.rank == null ? "sin dato" : Math.round(r.rank)}, ${esc(r.team)}` : ""}</title></rect><text x="${x(year)}" y="${base + 27}" text-anchor="middle" font-size="${width < 500 ? 10 : 11}" fill="var(--dim)">${String(year).slice(2)}</text>`;
  }
  return `<svg class="seq" viewBox="0 ${highest} ${width} ${base + 34 - highest}" role="img" aria-label="Secuencia de participaciones de ${esc(uni.name)}">${svg}</svg><div class="legend"><span><i style="background:var(--blue-t)"></i>1 miembro en común</span><span><i style="background:var(--accent)"></i>2</span><span><i style="background:var(--red-t)"></i>3</span></div>`;
}
