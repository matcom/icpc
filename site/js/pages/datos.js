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
        <li>Resultados y medallas: <a href="https://www.cphof.org/">Competitive Programming Hall of Fame</a> (© Yury Pisarchyk), excluidos de la licencia de este repositorio y contrastados con <a href="https://icpc.global/worldfinals/results">icpc.global</a>.</li>
        <li>Análisis, regiones y nombres en español: <a href="https://github.com/yudivian/icpc">yudivian/icpc</a> (Apache-2.0), origen de este proyecto.</li>
        <li>Escudos de universidades: La Habana desde el tablero de la final 47 (Luxor 2023); UCI y Pinar del Río desde Wikimedia Commons (CC BY-SA 4.0); Las Villas y Oriente desde sus sitios oficiales. El resto, cuando aparece en los tableros de las finales 46 y 47, desde <a href="https://icpc.global/worldfinals/scoreboard/2023/scoreboards/index.html">icpc.global</a>. Las marcas pertenecen a cada universidad.</li>
        <li>Mapa del mundo: <a href="https://github.com/topojson/world-atlas">world-atlas</a>, basado en Natural Earth.</li>
        <li>Geometrías provinciales de Cuba: <a href="https://github.com/yudivian/cuba-geojsons">cuba-geojsons</a> (MIT), de Yudivián Almeida Cruz.</li>
        <li>Gráficos: <a href="https://echarts.apache.org/">Apache ECharts</a>.</li>
      </ul></div>`,
    });
    card(a, {
      title: "Descargas", span: 6,
      html: `<div class="prose"><ul>
        <li><a href="data/results.csv">results.csv</a>: una fila por equipo y final.</li>
        <li><a href="data/core.json">core.json</a>: universidades, resultados y regiones.</li>
        <li><a href="data/predictions.json">predictions.json</a>: proyecciones y su prueba hacia atrás.</li>
        <li><a href="data/sedes.json">sedes.json</a> y <a href="data/sedes.csv">sedes.csv</a>: las finales y sus sedes.</li>
        <li><a href="data/cuba.json">cuba.json</a> y <a href="data/cuba.csv">cuba.csv</a>: el corte de Cuba y su descarga.</li>
        <li><a href="data/complexity.json">complexity.json</a> y <a href="data/problem-statements.json">problem-statements.json</a>: dificultad, temas, enunciados y perfiles 2011–2025.</li>
        <li><a href="data/cuba-complexity.json">cuba-complexity.json</a>: la lectura cubana de dificultad, intentos, muros y universidades.</li>
        <li><a href="llms.txt">llms.txt</a>: índice para agentes; cada página tiene su versión Markdown.</li>
      </ul></div>`,
    });
    card(a, {
      title: "Definiciones", span: 12,
      html: `<div class="prose">
        <h2>Participación</h2><p>Un equipo en una final. Un país o universidad que vuelve suma otra, así que el total acumulado no es el número de equipos de una final ni de equipos distintos.</p>
        <h2>Percentil</h2><p>Puesto llevado a una escala de 0 a 100 dentro de su final: el campeón tiene 100 y el último 0. Así se comparan finales de distinto tamaño. Un puesto compartido (como 103–122) usa el punto medio; un equipo sin puesto publicado queda fuera de estos cálculos.</p>
        <h2>Medallas</h2><p>Son las entregadas en cada edición, cuyo número varía. Solo al filtrar por región se reparten por posición dentro de ella.</p>
        <h2>Mejor resultado</h2><p>La final con el mejor puesto. Si una universidad repite puesto, manda la que resolvió más problemas, después la de menor tiempo y, por último, la más antigua. Por eso el título de ITMO en 2015 (1.º con 13 problemas) figura por delante de sus otros primeros puestos con menos resueltos.</p>
        <h2>Veterano</h2><p>Persona que ya compitió por la misma universidad en una final anterior; se identifica por su perfil en cphof. En Renovación solo cuenta el periodo elegido. El porcentaje de apariciones divide apariciones de veteranos entre apariciones totales, de modo que no pasa de 100.</p>
        <h2>Dificultad</h2><p>N1–N6 se calculan con la tasa de resolución de cada problema en su final. «Intenta» es un envío registrado; «convierte» es resolver lo intentado; «no intentado» no implica no haberlo leído. La sección cubana de dificultad cubre 2011–2025: 25 equipos-edición, sin el equipo de 2010.</p>
        <h2>Proyección</h2><p>Se describe en <a href="predicciones.html">Predicciones</a>, junto con su prueba hacia atrás. Usa los ratings públicos de <a href="https://codeforces.com/apiHelp">Codeforces</a> y listas de equipos reunidas por su comunidad: <a href="https://codeforces.com/blog/entry/149719">2026</a>, <a href="https://codeforces.com/blog/entry/102593">2021</a>, <a href="https://codeforces.com/blog/entry/116946">2022</a>, <a href="https://codeforces.com/blog/entry/117183">2023</a> y <a href="https://codeforces.com/blog/entry/129887">2024</a>.</p>
      </div>`,
    });
    card(a, {
      title: "Límites conocidos", span: 12,
      html: `<div class="prose"><ul>
        <li>Solo finales mundiales: los regionales no están, así que nada aquí mide quién clasifica desde su regional.</li>
        <li>Las universidades se unifican con una lista revisada a mano; los campus y facultades que compitieron por separado siguen separados. Alguna persona puede contarse dos veces.</li>
        <li>Los equipos marcados solo como clasificados, sin puesto, no se cuentan. La fila de la Universidad Tecnológica de Pereira en 2014 consta en la fuente oficial y no en cphof.</li>
        <li>Fuera del top 12, la fuente oficial solo publica bandas y menciones; ahí el puesto exacto y los problemas dependen de cphof.</li>
        <li>No todas las universidades tienen escudo: cuando no aparece en los tableros de 2022–2023, se usa un monograma generado, no el oficial.</li>
        <li>Los 33 equipos de 2009 marcados solo como finalistas no tienen puesto y no cuentan para percentiles.</li>
      </ul></div>`,
    });
  },
});
