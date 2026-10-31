#!/usr/bin/env python3
"""Build every published dataset of the ICPC observatory from data/sources.

Standard library only. Output goes to site/: data/*.json, data/results.csv,
llms.txt and the Markdown twin of each page.
"""
from __future__ import annotations

import csv
import json
import math
import re
import statistics
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "data" / "sources"
SITE = ROOT / "site"
OUT = SITE / "data"

SITE_URL = "https://matcom.github.io/icpc"
NEXT_FINAL = {"year": 2026, "place": "Dubái", "dates": "15–20 nov 2026"}
PROBLEMS_2025 = 12
MEDAL_CUTS = ((4, "gold"), (8, "silver"), (12, "bronze"))
ANALOG_CASES = 40
WINDOW = 4
BACKTEST_FROM = 2014


def fold(text: str) -> str:
    """Case, accent and punctuation-insensitive key for a name."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    text = text.replace("&", " and ")
    return " ".join(re.findall(r"[a-z0-9]+", text))


def slugify(text: str) -> str:
    return fold(text).replace(" ", "-")


def parse_rank(position: object) -> float | None:
    """Exact rank, the midpoint of a tied range, or None for an unranked finalist."""
    text = str(position).strip()
    if text.isdigit():
        return int(text)
    match = re.fullmatch(r"(\d+)\s*-\s*(\d+)", text)
    return (int(match[1]) + int(match[2])) / 2 if match else None


def to_int(value: object) -> int | None:
    return int(value) if str(value).strip().isdigit() else None


def medal_for(rank: float | None) -> str | None:
    if rank is None:
        return None
    for cut, medal in MEDAL_CUTS:
        if rank <= cut:
            return medal
    return None


def percentile(rank: float | None, field_size: int) -> float | None:
    """100 for the champion, 0 for the last place."""
    if rank is None or field_size < 2:
        return None
    return round(100 * (1 - (rank - 1) / (field_size - 1)), 1)


def load_contests() -> tuple[dict[int, list[dict]], dict]:
    raw = json.loads((SOURCES / "yudivian-2006-2024.json").read_text())
    contests = {int(y): rows for y, rows in raw["contests"].items()}
    contests[2025] = json.loads((SOURCES / "cphof-2025.json").read_text())
    return contests, raw


def canonical_names(contests: dict[int, list[dict]], key: str, aliases: dict[str, str]) -> dict[str, str]:
    """Map each spelling to the most used spelling sharing its folded form."""
    counts: dict[str, Counter] = defaultdict(Counter)
    for rows in contests.values():
        for row in rows:
            name = aliases.get(row[key], row[key])
            counts[fold(name)][name] += 1
    mapping = {}
    for spellings in counts.values():
        best = spellings.most_common(1)[0][0]
        mapping.update({s: best for s in spellings})
    return {name: mapping[aliases.get(name, name)] for name in
            {r[key] for rows in contests.values() for r in rows}}


def load_aliases() -> dict[str, str]:
    path = SOURCES / "university-aliases.json"
    return json.loads(path.read_text()) if path.exists() else {}


def build_universities(contests: dict[int, list[dict]], raw: dict) -> tuple[list[dict], dict]:
    names = canonical_names(contests, "university", load_aliases())
    countries = {
        name: {"es": c["spanish_name"], "region": c["region"]}
        for name, c in raw["countries"].items()
    }
    teams: dict[str, dict] = {}
    for year in sorted(contests):
        rows = contests[year]
        for row in rows:
            uni = names[row["university"]]
            rank = parse_rank(row["position"])
            country = row["country"]
            countries.setdefault(country, {"es": country, "region": "other"})
            entry = teams.setdefault(uni, {
                "id": slugify(uni), "name": uni, "country": country, "results": [],
            })
            entry["results"].append({
                "year": year,
                "rank": rank,
                "pct": percentile(rank, len(rows)),
                "solved": to_int(row["solved"]),
                "time": to_int(row["time"]),
                "team": row["team"],
                "players": [p for p in row["players"] if p],
                "medal": medal_for(rank),
            })
    universities = sorted(teams.values(), key=lambda u: u["id"])
    for uni in universities:
        uni["results"].sort(key=lambda r: r["year"])
        seen: set[str] = set()
        for result in uni["results"]:
            keys = {fold(p) for p in result["players"]}
            result["veterans"] = len(keys & seen)
            seen |= keys
    return universities, countries


# ---------------------------------------------------------------- projection


@dataclass
class Window:
    """A run of consecutive appearances and what followed it."""
    owner: str
    values: tuple[float, ...]
    end_year: int
    next_pct: float | None
    returned: bool


@dataclass
class Forecast:
    pct: float | None
    low: float | None
    high: float | None
    returns: int
    cases: int
    similar: list[str] = field(default_factory=list)


def series_of(results: list[dict], before: int) -> list[tuple[int, float]]:
    return [(r["year"], r["pct"]) for r in results if r["pct"] is not None and r["year"] < before]


def windows_of(owner: str, series: list[tuple[int, float]], size: int) -> list[Window]:
    out = []
    for i in range(len(series) - size + 1):
        chunk = series[i:i + size]
        following = series[i + size] if i + size < len(series) else None
        out.append(Window(
            owner=owner,
            values=tuple(v for _, v in chunk),
            end_year=chunk[-1][0],
            next_pct=following[1] if following else None,
            returned=bool(following) and following[0] == chunk[-1][0] + 1,
        ))
    return out


def quantile(values: list[float], q: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    lower = math.floor(position)
    upper = min(lower + 1, len(ordered) - 1)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def forecast(owner: str, series: list[tuple[int, float]], pool: dict[str, list[tuple[int, float]]],
             target_year: int) -> Forecast | None:
    """Predict the next percentile from how the closest past trajectories continued."""
    if len(series) < 2:
        return None
    size = min(WINDOW, len(series))
    recent = [v for _, v in series[-size:]]
    scored: list[tuple[float, Window]] = []
    best_by_owner: dict[str, float] = {}
    for other, other_series in pool.items():
        if other == owner or len(other_series) < size:
            continue
        for window in windows_of(other, other_series, size):
            distance = sum(abs(a - b) for a, b in zip(window.values, recent)) / size
            if distance < best_by_owner.get(other, math.inf):
                best_by_owner[other] = distance
            if window.end_year < target_year - 1:
                scored.append((distance, window))
    scored.sort(key=lambda item: item[0])
    nearest = [w for _, w in scored[:ANALOG_CASES]]
    if not nearest:
        return None
    following = [w.next_pct for w in nearest if w.next_pct is not None]
    similar = sorted(best_by_owner, key=best_by_owner.get)[:5]
    return Forecast(
        pct=round(quantile(following, 0.5), 1) if following else None,
        low=round(quantile(following, 0.25), 1) if following else None,
        high=round(quantile(following, 0.75), 1) if following else None,
        returns=round(100 * sum(w.returned for w in nearest) / len(nearest)),
        cases=len(nearest),
        similar=similar,
    )


def spearman(xs: list[float], ys: list[float]) -> float:
    def ranks(values: list[float]) -> list[float]:
        order = sorted(range(len(values)), key=values.__getitem__)
        out = [0.0] * len(values)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
                j += 1
            for k in range(i, j + 1):
                out[order[k]] = (i + j) / 2
            i = j + 1
        return out
    a, b = ranks(xs), ranks(ys)
    return statistics.correlation(a, b)


def backtest(universities: list[dict], years: list[int]) -> dict:
    """Replay each final using only earlier results, against a last-result baseline."""
    per_year = []
    for year in [y for y in years if y >= BACKTEST_FROM]:
        pool = {u["id"]: series_of(u["results"], year) for u in universities}
        predicted, baseline, actual, inside = [], [], [], 0
        for uni in universities:
            result = next((r for r in uni["results"] if r["year"] == year and r["pct"] is not None), None)
            series = pool[uni["id"]]
            if result is None or len(series) < 2:
                continue
            guess = forecast(uni["id"], series, pool, year)
            if guess is None or guess.pct is None:
                continue
            predicted.append(guess.pct)
            baseline.append(series[-1][1])
            actual.append(result["pct"])
            inside += guess.low <= result["pct"] <= guess.high
        if len(actual) < 10:
            continue
        per_year.append({
            "year": year,
            "teams": len(actual),
            "spearman": round(spearman(predicted, actual), 3),
            "spearman_baseline": round(spearman(baseline, actual), 3),
            "mae": round(statistics.mean(abs(p - a) for p, a in zip(predicted, actual)), 1),
            "mae_baseline": round(statistics.mean(abs(p - a) for p, a in zip(baseline, actual)), 1),
            "inside_range": round(100 * inside / len(actual)),
        })
    return {
        "per_year": per_year,
        "spearman": round(statistics.mean(y["spearman"] for y in per_year), 3),
        "spearman_baseline": round(statistics.mean(y["spearman_baseline"] for y in per_year), 3),
        "mae": round(statistics.mean(y["mae"] for y in per_year), 1),
        "mae_baseline": round(statistics.mean(y["mae_baseline"] for y in per_year), 1),
        "inside_range": round(statistics.mean(y["inside_range"] for y in per_year)),
    }


def country_series(universities: list[dict], before: int) -> dict[str, list[tuple[int, float]]]:
    best: dict[str, dict[int, float]] = defaultdict(dict)
    for uni in universities:
        for r in uni["results"]:
            if r["pct"] is not None and r["year"] < before:
                best[uni["country"]][r["year"]] = max(best[uni["country"]].get(r["year"], 0), r["pct"])
    return {c: sorted(by_year.items()) for c, by_year in best.items()}


def build_predictions(universities: list[dict], years: list[int], field_size: int) -> dict:
    target = max(years) + 1
    pool = {u["id"]: series_of(u["results"], target) for u in universities}
    recent = max(years) - 4
    teams = []
    similar = {}
    for uni in universities:
        guess = forecast(uni["id"], pool[uni["id"]], pool, target)
        if guess is None:
            continue
        similar[uni["id"]] = guess.similar
        if guess.pct is None or uni["results"][-1]["year"] < recent:
            continue
        to_rank = lambda pct: round((1 - pct / 100) * (field_size - 1) + 1)
        teams.append({
            "id": uni["id"], "pct": guess.pct, "low": guess.low, "high": guess.high,
            "rank": to_rank(guess.pct), "rank_best": to_rank(guess.high), "rank_worst": to_rank(guess.low),
            "returns": guess.returns, "cases": guess.cases,
        })
    teams.sort(key=lambda t: -t["pct"])
    country_pool = country_series(universities, target)
    countries = {}
    for country, series in country_pool.items():
        guess = forecast(country, series, country_pool, target)
        if guess and guess.pct is not None:
            countries[country] = {
                "pct": guess.pct, "low": guess.low, "high": guess.high,
                "returns": guess.returns, "cases": guess.cases, "similar": guess.similar,
                "rank": round((1 - guess.pct / 100) * (field_size - 1) + 1),
                "rank_best": round((1 - guess.high / 100) * (field_size - 1) + 1),
                "rank_worst": round((1 - guess.low / 100) * (field_size - 1) + 1),
            }
    return {
        "year": target, "field_size": field_size, "window": WINDOW, "cases": ANALOG_CASES,
        "teams": teams, "similar": similar, "countries": countries,
        "backtest": backtest(universities, years),
    }


# ----------------------------------------------------------------------- map


def build_world() -> dict:
    """GeoJSON from the world-atlas topology, with antimeridian rings clamped."""
    topo = json.loads((SOURCES / "countries-110m.json").read_text())
    scale, translate = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        points = []
        for dx, dy in arc:
            x, y = x + dx, y + dy
            points.append((round(x * scale[0] + translate[0], 3), round(y * scale[1] + translate[1], 3)))
        arcs.append(points)

    def ring(indices: list[int]) -> list[list[float]]:
        points: list[tuple[float, float]] = []
        for index in indices:
            part = arcs[index] if index >= 0 else arcs[~index][::-1]
            points.extend(part if not points else part[1:])
        if any(abs(a[0] - b[0]) > 180 for a, b in zip(points, points[1:])):
            side = 1 if sum(1 if p[0] > 0 else -1 for p in points) > 0 else -1
            points = [(p[0] if p[0] * side > 0 else side * 180, p[1]) for p in points]
        return [list(p) for p in points]

    def spans_land(points: list[list[float]]) -> bool:
        lons = [p[0] for p in points]
        return max(lons) - min(lons) > 0.5 and not (min(lons) <= -179 and max(lons) < -170)

    features = []
    for geometry in topo["objects"]["countries"]["geometries"]:
        name = geometry["properties"]["name"]
        if name == "Antarctica":
            continue
        polygons = geometry["arcs"] if geometry["type"] == "MultiPolygon" else [geometry["arcs"]]
        features.append({
            "type": "Feature",
            "properties": {"name": name},
            "geometry": {"type": "MultiPolygon", "coordinates": [rings for poly in polygons if (rings := [x for x in (ring(r) for r in poly) if spans_land(x)])]},
        })
    return {"type": "FeatureCollection", "features": features}


MAP_NAMES = {
    "United States": "United States of America", "Viet Nam": "Vietnam",
    "Dominican Republic": "Dominican Rep.", "Bosnia and Herzegovina": "Bosnia and Herz.",
}
MAP_POINTS = {"Singapore": [103.82, 1.35], "Hong Kong": [114.17, 22.3], "Macau": [113.55, 22.2],
              "Bahrain": [50.55, 26.07], "Malta": [14.4, 35.9]}


# ------------------------------------------------------------------- outputs


def write_json(name: str, payload: object) -> None:
    (OUT / name).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))


def write_csv(universities: list[dict], countries: dict) -> None:
    rows = sorted(
        ((r["year"], r["rank"] if r["rank"] is not None else "", u["name"], u["country"],
          countries[u["country"]]["region"], r["team"], r["solved"], r["time"], r["pct"], r["medal"] or "",
          r["veterans"], "; ".join(r["players"])) for u in universities for r in u["results"]),
        key=lambda row: (row[0], row[1] if row[1] != "" else 9999),
    )
    with (OUT / "results.csv").open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["year", "rank", "university", "country", "region", "team", "solved", "time",
                         "percentile", "medal", "veterans", "players"])
        writer.writerows(rows)


PAGES = [
    ("index", "Panorama", "KPIs, world map, regions, country race and champions of the World Finals."),
    ("paises", "Países", "Country rankings, medals, renewal and historical comparison."),
    ("universidades", "Universidades", "University rankings, constancy heatmap and results."),
    ("renovacion", "Renovación", "How teams renew: returning members, careers and their link with results."),
    ("problemas", "Problemas", "Problems solved per final: distributions, totals and percentages."),
    ("medallas", "Medallas", "Medal tables by university and country, using positions 1 to 12."),
    ("competidores", "Competidores", "People with the most finals and the most medals."),
    ("predicciones", "Predicciones", "Projected 2026 results from comparable historical trajectories, with a backtest."),
    ("comparar", "Comparar", "Head-to-head comparison of universities or countries."),
    ("pais", "País", "Profile of one country: history, similar countries, projection and teams."),
    ("universidad", "Universidad", "Profile of one university: history, similar teams, projection and members."),
    ("datos", "Datos y método", "Sources, definitions, downloads and known limits."),
]


def write_markdown_twins(universities: list[dict], countries: dict, predictions: dict, years: list[int]) -> None:
    """One Markdown twin per page plus llms.txt, regenerated on every build."""
    teams_by_country = Counter(u["country"] for u in universities for _ in u["results"])
    finals = sorted(universities, key=lambda u: -len(u["results"]))
    medal_rows = []
    for uni in universities:
        counts = Counter(r["medal"] for r in uni["results"] if r["medal"])
        if counts:
            medal_rows.append((counts["gold"], counts["silver"], counts["bronze"], uni["name"]))
    medal_rows.sort(reverse=True)
    veteran_share = {
        year: round(100 * sum(r["veterans"] > 0 for u in universities for r in u["results"] if r["year"] == year)
                    / sum(1 for u in universities for r in u["results"] if r["year"] == year))
        for year in years
    }
    players = Counter(p for u in universities for r in u["results"] for p in {fold(x) for x in r["players"]})
    display = {fold(p): p for u in universities for r in u["results"] for p in r["players"]}

    def table(headers: list[str], rows: list[list[object]]) -> str:
        lines = ["| " + " | ".join(headers) + " |", "|" + " --- |" * len(headers)]
        lines += ["| " + " | ".join(str(c) for c in row) + " |" for row in rows]
        return "\n".join(lines)

    uni_name = {u["id"]: u["name"] for u in universities}
    bodies = {
        "index": table(["Year", "Teams", "Champion"], [
            [y, sum(1 for u in universities for r in u["results"] if r["year"] == y),
             next((u["name"] for u in universities for r in u["results"] if r["year"] == y and r["rank"] == 1), "")]
            for y in years]),
        "paises": table(["Country", "Teams in finals"], [[c, n] for c, n in teams_by_country.most_common(30)]),
        "universidades": table(["University", "Finals"], [[u["name"], len(u["results"])] for u in finals[:30]]),
        "renovacion": table(["Year", "% of teams with a returning member"], [[y, veteran_share[y]] for y in years]),
        "problemas": table(["Year", "Median solved", "Max solved"], [
            [y, statistics.median(s), max(s)] for y in years
            for s in [[r["solved"] for u in universities for r in u["results"] if r["year"] == y and r["solved"] is not None]]]),
        "medallas": table(["University", "Gold", "Silver", "Bronze"], [[n, g, s, b] for g, s, b, n in medal_rows[:30]]),
        "competidores": table(["Competitor", "Finals"], [[display[k], n] for k, n in players.most_common(30)]),
        "predicciones": table(["University", "Projected rank", "Middle half of cases"], [
            [uni_name[t["id"]], t["rank"], f'{t["rank_best"]}–{t["rank_worst"]}'] for t in predictions["teams"][:30]]),
        "comparar": "The comparison page reads `data/core.json`; its URL takes `?u=<id>,<id>` or `?c=<name>,<name>`.",
        "pais": "The page takes `?c=<country name in English>`; `data/core.json` holds the same results.",
        "universidad": "The page takes `?u=<university id>`; ids and results are in `data/core.json`.",
        "datos": "Sources: `yudivian/icpc` (2006–2024, Apache-2.0) and cphof.org (2025). "
                 "Medals follow the positional rule 1–4 gold, 5–8 silver, 9–12 bronze.",
    }
    for slug, title, summary in PAGES:
        (SITE / f"{slug}.html.md").write_text(f"# {title}\n\n{summary}\n\n{bodies[slug]}\n")
    links = "\n".join(f"- [{t}]({SITE_URL}/{s}.html.md): {d}" for s, t, d in PAGES)
    (SITE / "llms.txt").write_text(
        "# Observatorio ICPC\n\n"
        "> Public statistics of the ICPC World Finals since 2006, as precomputed static files.\n\n"
        f"## Pages\n\n{links}\n\n"
        "## Data\n\n"
        f"- [core.json]({SITE_URL}/data/core.json): every university with its results per final.\n"
        f"- [predictions.json]({SITE_URL}/data/predictions.json): next-final projections and their backtest.\n"
        f"- [results.csv]({SITE_URL}/data/results.csv): one row per team and final.\n"
        f"- [world.json]({SITE_URL}/data/world.json): GeoJSON used by the map.\n"
    )


def build() -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    contests, raw = load_contests()
    years = sorted(contests)
    universities, countries = build_universities(contests, raw)
    field_size = len(contests[years[-1]])
    predictions = build_predictions(universities, years, field_size)
    problems = {int(y): len(s["problems"]) for y, s in raw["stats"].items()}
    problems[2025] = PROBLEMS_2025
    for name, meta in countries.items():
        meta["map"] = MAP_NAMES.get(name, name)
        if name in MAP_POINTS:
            meta["point"] = MAP_POINTS[name]
    core = {
        "years": years,
        "field": {str(y): len(contests[y]) for y in years},
        "problems": {str(y): n for y, n in problems.items()},
        "regions": {k: v["spanish_name"] for k, v in raw["regions"].items()},
        "countries": countries,
        "next_final": NEXT_FINAL,
        "universities": universities,
    }
    write_json("core.json", core)
    write_json("predictions.json", predictions)
    write_json("world.json", build_world())
    write_csv(universities, countries)
    write_markdown_twins(universities, countries, predictions, years)
    return {"core": core, "predictions": predictions}


if __name__ == "__main__":
    result = build()
    core, predictions = result["core"], result["predictions"]
    print(f"{len(core['years'])} finals, {len(core['universities'])} universities, "
          f"{sum(len(u['results']) for u in core['universities'])} results, "
          f"{len(predictions['teams'])} projections, "
          f"backtest spearman {predictions['backtest']['spearman']} "
          f"vs baseline {predictions['backtest']['spearman_baseline']}")
