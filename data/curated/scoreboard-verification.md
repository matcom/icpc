# Verificación de la matriz de scoreboards

Corte: 2026-11-03. Cobertura: 2008–2025.

## Resultado

- Filas equipo × problema: **25,512**.
- Problemas cubiertos: **212**.
- Equipos emparejados con `core.json`: **2,160**.
- Equipos con `solved` idéntico a `core.json`: **2,071**.
- Equipos con penalización idéntica: **2,057**.

En los años con fuente final (2008 y 2011–2025), **todos** los equipos emparejados coinciden en problemas resueltos y penalización:

- Equipos: **1,982**.
- `solved` verificado: **1,982 / 1,982**.
- Penalización verificada: **1,982 / 1,982**.

## Cobertura por edición

| Año | Fuente | Estado | Equipos | Emparejados | solved OK | Penalización OK |
|---:|---|---|---:|---:|---:|---:|
| 2008 | icpcgate | final | 104 | 89 | 89 | 89 |
| 2009 | icpcgate | partial | 88 | 75 | 14 | 0 |
| 2010 | icpcgate | partial | 117 | 103 | 75 | 75 |
| 2011 | zibada | final | 101 | 100 | 100 | 100 |
| 2012 | kattis | final | 112 | 112 | 112 | 112 |
| 2013 | kattis | final | 119 | 119 | 119 | 119 |
| 2014 | kattis | final | 122 | 121 | 121 | 121 |
| 2015 | kattis | final | 128 | 128 | 128 | 128 |
| 2016 | kattis | final | 128 | 128 | 128 | 128 |
| 2017 | kattis | final | 128 | 127 | 127 | 127 |
| 2018 | zibada | final | 140 | 140 | 140 | 140 |
| 2019 | zibada | final | 135 | 135 | 135 | 135 |
| 2020 | zibada | final | 117 | 117 | 117 | 117 |
| 2021 | zibada | final | 132 | 132 | 132 | 132 |
| 2022 | zibada | final | 124 | 124 | 124 | 124 |
| 2023 | zibada | final | 130 | 130 | 130 | 130 |
| 2024 | zibada | final | 141 | 141 | 141 | 141 |
| 2025 | zibada | final | 139 | 139 | 139 | 139 |

## Años parciales

**2009 y 2010** no tienen una fuente final por problema localizada. La única matriz disponible es un corte congelado:

- 2009: 51 equipos con menos problemas que `core.json`; diferencias {-3: 3, -2: 12, -1: 36}.
- 2010: 28 equipos con menos problemas que `core.json`; diferencias {-2: 7, -1: 21}.

Por eso la matriz de esos dos años se publica con `status=partial` y no debe usarse como resultado final.

## Cobertura de equipos

- 2008: 89/97 equipos. Faltan 8 equipos del core en la fuente; todos tienen 0 resueltos, así que el conteo de resueltos es completo, pero sus intentos no están representados.
- 2011: 100/104 equipos. Faltan 4 equipos del core en la fuente; todos tienen 0 resueltos, así que el conteo de resueltos es completo, pero sus intentos no están representados.
- 2014: 121/121 equipos. La fuente tiene 1 equipo extra con 0 resueltos que no está en core.json.
- 2017: 127/127 equipos. La fuente tiene 1 equipo extra con 0 resueltos que no está en core.json.
- 2009: 75/100 equipos. Faltan 25 equipos del core (2 de ellos con resueltos > 0); los conteos de resueltos e intentos están incompletos.
- 2010: 103/103 equipos. Están todos los equipos, pero 28 tienen menos problemas resueltos que core.json porque la fuente se congeló antes del final.

## Validaciones externas

### Conteo oficial por problema

Contra las páginas de soluciones oficiales (2019, 2022, 2023 y 2025):

- Comparaciones: **45**.
- Coincidencias: **45**.
- Diferencias: **0**.

### Fuentes independientes

| Año | Fuente A | Fuente B | Equipos comunes | Conjuntos distintos |
|---:|---|---|---:|---:|
| 2012 | kattis | zibada | 112 | 0 |
| 2013 | kattis | icpcgate | 109 | 0 |
| 2016 | kattis | zibada | 128 | 0 |
| 2017 | kattis | zibada | 127 | 0 |

## Casos conocidos

- 2022_Y: 124/124 (tasa 1.000).
- 2022_Z: 0/124 (tasa 0.000).
- 2023_G: 117/130 (tasa 0.900).
- 2023_E: 0/130 (tasa 0.000).
- 2023_J: 1/130 (tasa 0.008).
- 2025_C: 0/139 (tasa 0.000).

## Artefactos

- `scoreboard-matrix.csv`: matriz equipo × problema.
- `team-results.csv`: agregado por equipo, con `core_solved` y `core_penalty`.
- `problem-difficulty.csv`: agregado por problema.
- `scoreboard-sources.csv`: fuente y URL por edición.
- `scoreboard-verification.json`: reporte completo.

## Diccionario

- `solved`: 1 si el equipo resolvió el problema, 0 si no.
- `attempts`: envíos al problema; si no se resolvió, son los rechazados.
- `time_min`: minuto de aceptación; vacío si no se resolvió.
- `penalty_min`: suma de `time_min + 20 × (attempts − 1)` sobre los resueltos.
- `status`: `final` o `partial` según la fuente de esa edición.
- `verified`: `true` si `solved` coincide con `core.json`, `false` si no, `na` si `core.json` no tiene el dato.
