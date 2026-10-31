import { card, grid, kpis, startPage } from "../shell.js";

startPage({
  page: "datos",
  title: "Datos y método",
  subtitle: "De dónde sale cada número y hasta dónde fiarse.",
  render(view, data) {
    kpis(view, [
      [`${data.years[0]}–${data.years[data.years.length - 1]}`, "finales cubiertas"],
      [data.rows.length.toLocaleString("es"), "resultados"],
      [data.predictions.teams.length, "proyecciones"],
    ]);
    const a = grid(view);
    card(a, {
      title: "Fuentes", span: 6,
      html: `<div class="prose"><ul>
        <li>Finales 2006–2024: el conjunto de datos de <a href="https://github.com/yudivian/icpc">yudivian/icpc</a> (Apache-2.0), origen de este proyecto.</li>
        <li>Final 2025: tabla publicada en <a href="https://www.cphof.org/standings/icpc/2025">cphof.org</a>.</li>
        <li>Mapa: <a href="https://github.com/topojson/world-atlas">world-atlas</a>, basado en Natural Earth.</li>
        <li>Gráficos: <a href="https://echarts.apache.org/">Apache ECharts</a>.</li>
      </ul></div>`,
    });
    card(a, {
      title: "Descargas", span: 6,
      html: `<div class="prose"><ul>
        <li><a href="data/results.csv">results.csv</a>: una fila por equipo y final.</li>
        <li><a href="data/core.json">core.json</a>: universidades, resultados y regiones.</li>
        <li><a href="data/predictions.json">predictions.json</a>: proyecciones y su prueba hacia atrás.</li>
        <li><a href="llms.txt">llms.txt</a>: índice para agentes; cada página tiene su versión Markdown.</li>
      </ul></div>`,
    });
    card(a, {
      title: "Definiciones", span: 12,
      html: `<div class="prose">
        <h2>Participación</h2><p>Un equipo en una final. Un país o universidad que vuelve suma otra, así que el total acumulado no es el número de equipos de una final ni de equipos distintos.</p>
        <h2>Percentil</h2><p>Puesto llevado a una escala de 0 a 100 dentro de su final: el campeón tiene 100 y el último 0. Así se comparan finales de distinto tamaño. Un puesto compartido (como 103–122) usa el punto medio; un equipo sin puesto publicado queda fuera de estos cálculos.</p>
        <h2>Medallas</h2><p>Se usa la regla de posición: 1–4 oro, 5–8 plata, 9–12 bronce. Algunas ediciones reales repartieron otro número.</p>
        <h2>Veterano</h2><p>Miembro que ya compitió por la misma universidad en una final anterior. En Renovación solo cuenta el periodo elegido. El porcentaje de apariciones divide apariciones de veteranos entre apariciones totales, de modo que no pasa de 100.</p>
        <h2>Proyección</h2><p>Se describe en <a href="predicciones.html">Predicciones</a>, junto con su prueba hacia atrás.</p>
      </div>`,
    });
    card(a, {
      title: "Límites conocidos", span: 12,
      html: `<div class="prose"><ul>
        <li>Solo finales mundiales: los regionales no están, así que nada aquí mide quién clasifica desde su regional.</li>
        <li>Los nombres de universidades y personas se unifican por escritura. Las variantes más alejadas pueden contarse como dos.</li>
        <li>Los escudos son monogramas generados, no los oficiales.</li>
        <li>Los equipos marcados solo como finalistas no tienen puesto y no cuentan para percentiles.</li>
      </ul></div>`,
    });
  },
});
