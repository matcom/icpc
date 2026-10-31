// Parts shared by the university and country profile pages.
import { MEDAL_COLORS, MEDAL_NAMES, esc } from "./core.js";
import { donut } from "./charts.js";

export const forecastCallout = (forecast, field, year) => (forecast?.pct != null
  ? `<div class="callout">Proyección ${year}: los ${forecast.cases} casos históricos más parecidos terminaron por el <b>puesto ${forecast.rank}</b> de ${field} (la mitad entre ${forecast.rank_best} y ${forecast.rank_worst}). El <b>${forecast.returns}%</b> volvió a la final al año siguiente.</div>`
  : '<div class="callout">Sin proyección: hacen falta al menos dos finales con puesto conocido y una aparición en los últimos cinco años.</div>');

export function medalDonut(el, counts) {
  const slices = Object.entries(counts).filter(([, v]) => v > 0).map(([key, value]) => ({ name: MEDAL_NAMES[key], value, itemStyle: { color: MEDAL_COLORS[key] } }));
  if (!slices.length) {
    el.style.height = "auto";
    el.innerHTML = '<p class="sub" style="padding:24px 0;text-align:center">Todavía sin medallas.</p>';
    return null;
  }
  return donut(el, slices, { center: String(slices.reduce((total, s) => total + s.value, 0)) });
}

export const chipLinks = (items) => `<div class="chips">${items.map((i) => `<a class="chip" href="${esc(i.url)}">${i.mark ?? ""}${esc(i.label)}</a>`).join("")}</div>`;
