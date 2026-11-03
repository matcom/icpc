// Sortable tables: click a header to order by that column, click again to reverse.
// Sorting stays on the client and survives filters/theme redraws through an
// in-memory state keyed by the table position and its headers.

const sorts = new Map();
const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

// Parse the visible text as a Spanish number. Percentages, ranks ("12.º") and
// ranges ("10 (5–20)") keep their leading number; empty cells have no value.
function parseNumber(raw) {
  const match = String(raw).replace(/\s/g, "").match(/^[-+]?\d[\d.,]*/);
  if (!match) return null;
  let text = match[0];
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    text = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (comma >= 0) {
    text = text.replace(/,/g, ".");
  } else if (dot >= 0) {
    const parts = text.split(".");
    const thousands = parts.length > 2 || (parts[1]?.length === 3 && parts.length === 2);
    if (thousands) text = parts.join("");
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

const text = (cell) => String(cell.textContent ?? "").replace(/\s+/g, " ").trim();
const label = (cell) => (cell.dataset.sort ?? text(cell));

function columnType(table, index) {
  const header = table.tHead?.rows[0]?.cells[index];
  if (header?.classList.contains("n")) return "num";
  const values = [...table.tBodies].flatMap((body) => [...body.rows]).map((row) => label(row.cells[index] ?? { textContent: "", dataset: {} })).filter(Boolean);
  if (!values.length) return "text";
  const numeric = values.filter((value) => parseNumber(value) != null).length;
  return numeric / values.length >= 0.7 ? "num" : "text";
}

function tableKey(table) {
  const view = document.getElementById("view") ?? document;
  const tables = [...view.querySelectorAll("table")];
  const headers = [...(table.tHead?.rows[0]?.cells ?? [])].filter((cell) => !cell.classList.contains("pos")).map((cell) => text(cell)).join("|");
  return `${location.pathname}|${tables.indexOf(table)}|${headers}`;
}

// Fixed first column: it is not part of the data, so it never takes part in the
// sort. It is renumbered after every order change to show the current position.
function numberRows(table) {
  let position = 0;
  for (const body of table.tBodies) {
    for (const row of body.rows) {
      const value = String(++position);
      const cell = row.cells[0];
      if (cell?.classList.contains("pos") && cell.textContent !== value) cell.textContent = value;
    }
  }
}

function ensurePositions(table) {
  const head = table.tHead?.rows[0];
  if (head && !head.cells[0]?.classList.contains("pos")) {
    const th = document.createElement("th");
    th.className = "pos";
    th.textContent = "#";
    th.title = "Posición en el orden actual";
    th.setAttribute("aria-label", "Posición");
    head.prepend(th);
  }
  for (const body of table.tBodies) {
    for (const row of body.rows) {
      if (row.cells[0]?.classList.contains("pos")) continue;
      const td = document.createElement("td");
      td.className = "pos";
      row.prepend(td);
    }
  }
  numberRows(table);
}

function setHeaderState(table, column, direction) {
  for (const th of table.tHead?.rows[0]?.cells ?? []) {
    if (!th.dataset.sort) continue;
    th.setAttribute("aria-sort", Number(th.dataset.sort) === column ? (direction === "asc" ? "ascending" : "descending") : "none");
  }
}

function sortTable(table, column, direction, type, { save = true } = {}) {
  const rows = [...(table.tBodies[0]?.rows ?? [])];
  for (const [index, row] of rows.entries()) {
    if (row.dataset.origin == null) row.dataset.origin = String(index);
  }
  const values = new Map(rows.map((row) => {
    const raw = label(row.cells[column] ?? { textContent: "", dataset: {} });
    return [row, { empty: !raw, value: type === "num" ? parseNumber(raw) : raw }];
  }));
  const sign = direction === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const x = values.get(a);
    const y = values.get(b);
    if (x.empty || x.value == null) return y.empty || y.value == null ? 0 : 1;
    if (y.empty || y.value == null) return -1;
    const order = type === "num" ? x.value - y.value : collator.compare(x.value, y.value);
    return order ? sign * order : Number(a.dataset.origin) - Number(b.dataset.origin);
  });
  table.tBodies[0]?.append(...rows);
  numberRows(table);
  table.dataset.sorted = `${column}:${direction}`;
  setHeaderState(table, column, direction);
  if (save) sorts.set(table.dataset.tkey, { column, direction, type });
}

function enhance(table) {
  if (!table.tHead?.rows[0] || !table.tBodies.length) return;
  if (table.matches("table.heat, table[data-nosort]")) return;
  table.dataset.tkey = tableKey(table);
  ensurePositions(table);
  const headers = [...table.tHead.rows[0].cells];
  for (const [index, th] of headers.entries()) {
    if (th.dataset.sort || th.classList.contains("pos") || !text(th) || th.dataset.nosort != null) continue;
    th.dataset.sort = String(index);
    th.dataset.type = columnType(table, index);
    th.setAttribute("aria-sort", "none");
    th.tabIndex = 0;
  }
  const saved = sorts.get(table.dataset.tkey);
  if (!saved) return;
  const state = `${saved.column}:${saved.direction}`;
  if (table.dataset.sorted !== state) sortTable(table, saved.column, saved.direction, saved.type, { save: false });
}

export function refreshTables(root = document) {
  for (const table of root.querySelectorAll("table")) enhance(table);
}

function toggle(th) {
  const table = th.closest("table");
  if (!table) return;
  const column = Number(th.dataset.sort);
  const type = th.dataset.type ?? "text";
  const previous = sorts.get(table.dataset.tkey);
  const direction = previous?.column === column && previous.direction === "desc" ? "asc" : previous?.column === column ? "desc" : type === "num" ? "desc" : "asc";
  sortTable(table, column, direction, type);
}

document.addEventListener("click", (event) => {
  const th = event.target.closest("thead th[data-sort]");
  if (th) toggle(th);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const th = event.target.closest("thead th[data-sort]");
  if (!th) return;
  event.preventDefault();
  toggle(th);
});

// Pages redraw whole sections when filters or the theme change, so watch the
// view and re-apply the remembered order to freshly rendered tables.
export function watchTables(root) {
  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      refreshTables(root);
    });
  });
  observer.observe(root, { childList: true, subtree: true });
  refreshTables(root);
}
