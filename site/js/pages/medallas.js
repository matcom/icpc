import { MEDAL_COLORS, MEDAL_NAMES, REGION_COLORS, countryName, countryUrl, esc, uniUrl } from "../core.js";
import { categoryAxis, colors, donut, plot, valueAxis } from "../charts.js";
import { card, chartCard, filterRows, filters, grid, startPage, table } from "../shell.js";

const MEDALS = ["gold", "silver", "bronze"];
const medalOf = (position) => (position <= 4 ? "gold" : position <= 8 ? "silver" : position <= 12 ? "bronze" : null);

startPage({
  page: "medallas",
  title: "Medallas",
  subtitle: "El medallero histórico, por universidad y por país.",
  render(view, data) {
    const holder = document.createElement("div");
    const state = filters(view, data, { from: 2010, to: data.years[data.years.length - 1], region: "all", min: 1, top: 30, scope: "uni" }, () => draw());
    view.append(holder);
    const draw = () => {
      holder.innerHTML = "";
      const rows = filterRows(data, state);
      const entries = new Map();
      const awards = [];
      for (const year of new Set(rows.map((r) => r.year))) {
        // With a region selected, positions are recomputed inside that region.
        rows.filter((r) => r.year === year).sort((x, y) => (x.rank ?? 1e9) - (y.rank ?? 1e9)).forEach((r, i) => {
          const key = state.scope === "uni" ? r.uni : r.country;
          const e = entries.get(key) ?? { key, places: Array(12).fill(0), years: new Set(), gold: 0, silver: 0, bronze: 0 };
          entries.set(key, e);
          e.years.add(year);
          if (r.rank != null && i < 12) e.places[i] += 1;
          const medal = state.region === "all" ? r.medal : (r.rank != null && i < 12 ? medalOf(i + 1) : null);
          if (!medal) return;
          e[medal] += 1;
          awards.push({ ...r, medal });
        });
      }
      const label = (key) => (state.scope === "uni" ? data.byId.get(key).name : countryName(data, key));
      const link = (key) => (state.scope === "uni" ? uniUrl(key) : countryUrl(key));
      const list = [...entries.values()].filter((e) => e.years.size >= state.min && e.gold + e.silver + e.bronze > 0)
        .sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.years.size - a.years.size);
      const c = colors();
      const a = grid(holder);

      const top = list.slice(0, Math.min(state.top, 20)).reverse();
      plot(chartCard(a, { title: "Las grandes potencias", span: 7, height: Math.max(360, top.length * 26 + 50) }), {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 8, right: 18, top: 8, bottom: 34, containLabel: true },
        xAxis: valueAxis({ minInterval: 1 }),
        yAxis: categoryAxis(top.map((e) => { const n = label(e.key); return n.length > 28 ? `${n.slice(0, 27)}…` : n; }), { axisLabel: { color: c.ink, interval: 0 } }),
        series: MEDALS.map((m) => ({ name: MEDAL_NAMES[m], type: "bar", stack: "m", barMaxWidth: 18, itemStyle: { color: MEDAL_COLORS[m] }, data: top.map((e) => e[m]) })),
      }, { onClick: (p) => { location.href = link(top[p.dataIndex].key); } });

      const byRegion = new Map();
      for (const r of awards) byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + 1);
      donut(chartCard(a, { title: "Medallas por región", span: 5, height: Math.max(360, top.length * 26 + 50) }),
        [...byRegion].sort((x, y) => y[1] - x[1]).map(([region, value]) => ({ name: data.regions[region] ?? region, value, itemStyle: { color: REGION_COLORS[region] } })),
        { center: String(awards.length) });

      const years = [...new Set(rows.map((r) => r.year))].sort((x, y) => x - y);
      const regions = [...new Set(awards.map((r) => r.region))];
      plot(chartCard(a, { title: "El reparto de las medallas", sub: "Por región, en cada edición", span: 7, height: 340 }), {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        xAxis: categoryAxis(years.map(String)),
        yAxis: valueAxis({ minInterval: 1 }),
        series: regions.map((region) => ({ name: data.regions[region] ?? region, type: "bar", stack: "r", itemStyle: { color: REGION_COLORS[region] }, data: years.map((y) => awards.filter((r) => r.year === y && r.region === region).length) })),
      });

      const flows = new Map();
      for (const r of awards) {
        const key = `${r.region}|${r.medal}`;
        flows.set(key, (flows.get(key) ?? 0) + 1);
      }
      plot(chartCard(a, { title: "De dónde sale cada medalla", span: 5, height: 340 }), {
        legend: false,
        tooltip: { trigger: "item" },
        series: [{
          type: "sankey", left: 8, right: 70, top: 8, bottom: 8, nodeWidth: 12, nodeGap: 9, emphasis: { focus: "adjacency" },
          lineStyle: { color: "gradient", opacity: 0.4, curveness: 0.5 },
          label: { color: c.ink, fontSize: 12 },
          data: [
            ...regions.map((region) => ({ name: data.regions[region] ?? region, itemStyle: { color: REGION_COLORS[region] } })),
            ...MEDALS.map((m) => ({ name: MEDAL_NAMES[m], itemStyle: { color: MEDAL_COLORS[m] } })),
          ],
          links: [...flows].map(([key, value]) => { const [region, medal] = key.split("|"); return { source: data.regions[region] ?? region, target: MEDAL_NAMES[medal], value }; }),
        }],
      });

      const shown = list.slice(0, state.top);
      card(a, {
        title: "Medallero", span: 12,
        html: table(
          [{ label: "#", num: 1 }, state.scope === "uni" ? "Universidad" : "País", { label: "Oro", num: 1 }, { label: "Plata", num: 1 }, { label: "Bronce", num: 1 }, { label: "Total", num: 1 }, { label: "Finales", num: 1 }, ...Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}º`, num: 1 }))],
          shown.map((e, i) => [i + 1, `<a href="${link(e.key)}">${esc(label(e.key))}</a>`, `<b>${e.gold}</b>`, e.silver, e.bronze, e.gold + e.silver + e.bronze, e.years.size, ...e.places.map((v) => v || "")]),
        ) + '<p class="note">Son las medallas realmente entregadas, según cphof, cuyo número varía de una edición a otra. Con una región elegida se reparten por posición dentro de esa región: puestos 1–4 oro, 5–8 plata y 9–12 bronce.</p>',
      });
    };
    draw();
  },
});
