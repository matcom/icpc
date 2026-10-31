// ECharts wrapper: one look for every chart, and helpers for the recurring shapes.
/* global echarts */

const live = new Set();
const observers = new Map();

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const colors = () => ({
  ink: css("--ink"), dim: css("--dim"), line: css("--line"), panel: css("--panel"), panel2: css("--panel2"),
  accent: css("--accent"), blue: css("--blue-t"), red: css("--red-t"), gold: css("--gold"), land: css("--land"),
});

export const palette = () => {
  const c = colors();
  return [c.accent, c.blue, c.red, c.gold, "#4f9a8c", "#d97f45", "#8e3b5c", "#7fb3e4", "#fdb830", "#8a8a8a"];
};

// How many rows a plain legend takes at this width, so the chart can leave room for it.
const legendRows = (names, width) => {
  let rows = 1;
  let used = 0;
  for (const name of names) {
    const size = String(name).length * 6.8 + 34;
    if (used + size > width) { rows += 1; used = 0; }
    used += size;
  }
  return rows;
};

export function plot(el, option, { onClick } = {}) {
  const chart = echarts.init(el);
  const c = colors();
  const legendNames = option.legend?.data ?? (option.series ?? []).flatMap((s) => (s.type === "pie" ? s.data.map((d) => d.name) : s.name ? [s.name] : []));
  const rows = legendRows(legendNames, el.clientWidth || 600);
  const { baseOption, options, ...rest } = option;
  const merged = {
    color: palette(),
    animationDuration: 700,
    textStyle: { fontFamily: "Jost, system-ui, sans-serif", color: c.ink, fontSize: 13 },
    tooltip: {
      confine: true,
      backgroundColor: c.panel,
      borderColor: c.line,
      textStyle: { color: c.ink, fontFamily: "Jost, system-ui, sans-serif" },
    },
    grid: { left: 8, right: 16, top: 26, bottom: option.legend === false ? 8 : 10 + rows * 22, containLabel: true },
    ...rest,
    legend: option.legend === false ? { show: false } : { textStyle: { color: c.dim }, type: "plain", bottom: 0, left: "center", itemWidth: 12, itemHeight: 10, itemGap: 10, ...(option.legend ?? {}) },
    ...(baseOption ?? {}),
  };
  chart.setOption(baseOption ? { baseOption: merged, options } : merged);
  if (onClick) chart.on("click", onClick);
  live.add(chart);
  const observer = new ResizeObserver(() => chart.resize());
  observer.observe(el);
  observers.set(chart, observer);
  return chart;
}

export function disposeAll() {
  for (const chart of live) {
    observers.get(chart)?.disconnect();
    chart.dispose();
  }
  live.clear();
  observers.clear();
}

export const categoryAxis = (data, extra = {}) => {
  const c = colors();
  return {
    type: "category", data,
    axisLine: { lineStyle: { color: c.line } }, axisTick: { show: false },
    axisLabel: { color: c.dim, hideOverlap: true }, ...extra,
  };
};

export const valueAxis = (extra = {}) => {
  const c = colors();
  return {
    type: "value",
    splitLine: { lineStyle: { color: c.line } },
    axisLabel: { color: c.dim, hideOverlap: true }, ...extra,
    nameTextStyle: { color: c.dim, align: extra.nameLocation === "middle" ? "center" : "left", ...(extra.nameTextStyle ?? {}) },
  };
};

const shorten = (text, size = 26) => (text.length > size ? `${text.slice(0, size - 1)}…` : text);

// Horizontal ranking bars: items are { label, value, url? }.
export function rankBars(el, items, { format, color, onClick } = {}) {
  const c = colors();
  const ordered = [...items].reverse();
  return plot(el, {
    legend: false,
    grid: { left: 8, right: 44, top: 8, bottom: 8, containLabel: true },
    xAxis: valueAxis({ show: false }),
    yAxis: categoryAxis(ordered.map((i) => shorten(i.label)), { axisLabel: { color: c.ink, interval: 0 } }),
    tooltip: { trigger: "item", formatter: (p) => `${ordered[p.dataIndex].label}: <b>${format ? format(p.value) : p.value}</b>` },
    series: [{
      type: "bar",
      data: ordered.map((i) => i.value),
      barMaxWidth: 16,
      itemStyle: { color: color ?? c.accent, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: "right", color: c.ink, formatter: (p) => (format ? format(p.value) : p.value) },
    }],
  }, { onClick: onClick ?? ((p) => { const url = ordered[p.dataIndex].url; if (url) location.href = url; }) });
}

export function donut(el, slices, { onClick, center } = {}) {
  const c = colors();
  const rows = legendRows(slices.map((s) => s.name), el.clientWidth || 300);
  const centerPct = Math.max(34, 48 - rows * 4);
  const centerY = `${centerPct}%`;
  return plot(el, {
    legend: { bottom: 0 },
    tooltip: { trigger: "item", formatter: "{b}: <b>{c}</b> ({d}%)" },
    series: [{
      type: "pie",
      radius: rows > 2 ? ["34%", "58%"] : ["42%", "68%"],
      center: ["50%", centerY],
      itemStyle: { borderColor: c.panel, borderWidth: 2, borderRadius: 4 },
      label: { color: c.ink, formatter: (p) => `${Math.round(p.percent)}%`, fontSize: 12, overflow: "none", minMargin: 4 },
      labelLine: { length: 8, length2: 6, lineStyle: { color: c.dim } },
      labelLayout: { hideOverlap: true },
      data: slices,
    }],
    graphic: center ? [{ type: "text", left: "center", top: Math.round((el.clientHeight * centerPct) / 100) - 13, style: { text: center, fill: c.ink, font: "600 20px Cinzel, serif", textAlign: "center" } }] : [],
  }, { onClick });
}

// Percentile history of an entity, with similar trajectories and the next-final projection.
export function historyChart(el, { name, series, similar, forecast, nextYear, firstYear }) {
  const c = colors();
  const years = [];
  for (let y = firstYear; y <= nextYear; y++) years.push(y);
  const toData = (points) => years.map((y) => points.find((p) => p[0] === y)?.[1] ?? null);
  const options = [
    ...similar.map((s) => ({
      name: s.name, type: "line", data: toData(s.series), connectNulls: true, symbol: "none",
      lineStyle: { width: 1.2, color: c.blue, opacity: 0.45 }, itemStyle: { color: c.blue },
      emphasis: { focus: "series", lineStyle: { width: 3, opacity: 1 } },
    })),
    {
      name, type: "line", data: toData(series), connectNulls: true, symbolSize: 8,
      lineStyle: { width: 3, color: c.accent }, itemStyle: { color: c.accent }, z: 5,
    },
  ];
  if (forecast?.pct != null && series.length) {
    const last = series[series.length - 1];
    options.push({
      name: `Proyección ${nextYear}`, type: "line",
      data: years.map((y) => (y === last[0] ? last[1] : y === nextYear ? forecast.pct : null)),
      connectNulls: true, symbol: "circle", symbolSize: (v, p) => (p.dataIndex === years.length - 1 ? 11 : 0),
      lineStyle: { type: "dashed", color: c.red, width: 2 }, itemStyle: { color: c.red }, z: 6,
      markArea: { silent: true, itemStyle: { color: c.red, opacity: 0.16 }, data: [[{ xAxis: String(nextYear), yAxis: forecast.low }, { xAxis: String(nextYear), yAxis: forecast.high }]] },
    });
  }
  return plot(el, {
    tooltip: { trigger: "axis", formatter: (items) => `<b>${items[0].axisValue}</b><br>${items.filter((i) => i.value != null).sort((a, b) => b.value - a.value).map((i) => `${i.marker}${i.seriesName}: ${Math.round(i.value)}`).join("<br>")}` },
    legend: { data: [name, `Proyección ${nextYear}`] },
    xAxis: categoryAxis(years.map(String), { boundaryGap: false }),
    yAxis: valueAxis({ min: 0, max: 100, name: "Percentil", nameTextStyle: { color: c.dim } }),
    series: options,
  });
}
