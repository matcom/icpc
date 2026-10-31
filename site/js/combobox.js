// Turns every <select> into a typeahead with fuzzy search. The select stays in the
// DOM, hidden, and keeps its value and change event, so pages use it as before.
import { fuzzyFilter } from "./fuzzy.js";
import { esc } from "./core.js";

const MAX_SHOWN = 80;

const optionsOf = (select) => [...select.options].map((o) => ({ value: o.value, label: o.textContent }));

function upgrade(select) {
  select.dataset.combo = "1";
  select.hidden = true;
  const box = document.createElement("span");
  box.className = "combo";
  const labelText = select.closest("label")?.firstChild?.textContent?.trim() || select.getAttribute("aria-label") || "Elegir";
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-label", labelText);
  const list = document.createElement("ul");
  list.className = "combo-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  box.append(input, list);
  select.after(box);

  const options = optionsOf(select);
  const longest = Math.max(...options.map((o) => o.label.length), 4);
  box.style.setProperty("--combo-ch", Math.min(longest + 4, 34));
  let hits = [];
  let active = -1;

  const showSelected = () => {
    const current = options.find((o) => o.value === select.value);
    input.value = current?.value ? current.label : "";
    input.placeholder = current && !current.value ? current.label : "";
    input.disabled = select.disabled;
  };
  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    showSelected();
  };
  const paint = () => {
    list.innerHTML = hits.length
      ? hits.slice(0, MAX_SHOWN).map((o, i) => `<li role="option" data-i="${i}" aria-selected="${o.value === select.value}"${i === active ? ' class="on"' : ""}>${esc(o.label)}</li>`).join("")
      : '<li class="none">Sin resultados</li>';
    list.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  };
  const open = (query) => {
    const choices = options.filter((o) => o.value !== "");
    hits = query ? fuzzyFilter(query, choices, (o) => o.label) : choices;
    active = query ? 0 : hits.findIndex((o) => o.value === select.value);
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    paint();
  };
  const choose = (option) => {
    const changed = select.value !== option.value;
    select.value = option.value;
    close();
    input.blur();
    if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
  };

  input.onfocus = () => { input.select(); open(""); };
  input.onclick = () => { if (list.hidden) open(""); };
  input.oninput = () => open(input.value.trim());
  input.onblur = close;
  input.onkeydown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (list.hidden) open("");
      const count = Math.min(hits.length, MAX_SHOWN);
      if (count) active = (active + (event.key === "ArrowDown" ? 1 : -1) + count) % count;
      paint();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!list.hidden && hits[Math.max(active, 0)]) choose(hits[Math.max(active, 0)]);
    } else if (event.key === "Escape") {
      close();
      input.blur();
    }
  };
  // Keep the focus in the input until the choice is made, even inside a <label>.
  list.onmousedown = (event) => event.preventDefault();
  list.onclick = (event) => {
    event.preventDefault();
    const item = event.target.closest("[data-i]");
    if (item) choose(hits[Number(item.dataset.i)]);
  };
  select.addEventListener("refresh", showSelected);
  showSelected();
}

const upgradeWithin = (root) => {
  if (root.nodeType !== 1) return;
  if (root.matches("select:not([data-combo])")) upgrade(root);
  root.querySelectorAll("select:not([data-combo])").forEach(upgrade);
};

export function watchSelects(root) {
  upgradeWithin(root);
  new MutationObserver((changes) => {
    for (const change of changes) change.addedNodes.forEach(upgradeWithin);
  }).observe(root, { childList: true, subtree: true });
}
