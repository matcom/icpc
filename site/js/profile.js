// Parts shared by the university and country profile pages.
import { MEDAL_NAMES, esc, medalIcon } from "./core.js";

export const forecastCallout = (forecast, field, year) => (forecast?.pct != null
  ? `<div class="callout">Proyección ${year}: los ${forecast.cases} casos históricos más parecidos terminaron por el <b>puesto ${forecast.rank}</b> de ${field} (la mitad entre ${forecast.rank_best} y ${forecast.rank_worst}). El <b>${forecast.returns}%</b> volvió a la final al año siguiente.</div>`
  : '<div class="callout">Sin proyección: hacen falta al menos dos finales con puesto conocido y una aparición en los últimos cinco años.</div>');

export function medalDonut(el, counts) {
  el.style.height = "auto";
  const kinds = ["gold", "silver", "bronze"].filter((kind) => counts[kind] > 0);
  el.innerHTML = kinds.length
    ? `<ul class="medal-case">${kinds.map((kind) => `<li><b>${counts[kind]}</b><span>${MEDAL_NAMES[kind]}</span><span class="medals">${medalIcon(kind, 26).repeat(counts[kind])}</span></li>`).join("")}</ul>`
    : '<p class="sub" style="padding:24px 0;text-align:center">Todavía sin medallas.</p>';
}

export const chipLinks = (items) => `<div class="chips">${items.map((i) => `<a class="chip" href="${esc(i.url)}">${i.mark ?? ""}${esc(i.label)}</a>`).join("")}</div>`;
