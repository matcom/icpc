# Observatorio ICPC

A public dashboard of the ICPC World Finals: world map, countries, universities,
team renewal, problems, medals, competitors and next-final projections, with a
backtest. Static HTML, CSS and JavaScript over precomputed data.

Live at <https://matcom.github.io/icpc/>. Agents can start at
[`llms.txt`](https://matcom.github.io/icpc/llms.txt).

It ports and extends the analyses of [yudivian/icpc](https://github.com/yudivian/icpc).

## Run it

```bash
make data    # build site/data from data/sources (Python standard library only)
make serve   # http://127.0.0.1:8000
make test
```

## Layout

- `data/sources/`: the input files, kept as published.
- `scripts/build_data.py`: builds `site/data/*`, `site/llms.txt` and the Markdown twin of each page.
- `site/`: the published site. `js/pages/<page>.js` draws one page; `js/shell.js`, `js/charts.js` and `js/core.js` are shared.

## License

Apache-2.0. See `NOTICE` for data and asset sources.
