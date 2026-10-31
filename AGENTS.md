# icpc

Public static dashboard of the ICPC World Finals for competitive programming
students: what the competition looks like, how a team or country has done
against similar ones, and what to expect next. The interface is in Spanish;
code, comments and docs are in English.

This file changes when the goals change. Nothing in it should be made false by a
commit that adds code or content.

## Principles

- Everything is static: `scripts/build_data.py` precomputes, GitHub Pages serves, the browser only filters and draws. No backend.
- Input files in `data/sources/` stay as published; corrections go through the pipeline, not by editing them.
- A projection is published only with its backtest against a baseline, and the page says what it cannot know.
- Agent-first, human on top: `llms.txt`, a Markdown twin per page and the downloadable data are generated on each build; the HTML links its twin.

## Working here

- `make test` is the gate. `make data` then `make serve` shows the site; check a UI change in a browser, at desktop and phone width.
- Work lands by issue, branch and PR. CI builds and deploys `main` to GitHub Pages.
- The pinned vision issue says what comes next.
