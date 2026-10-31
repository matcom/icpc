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
from pathlib import Path

import forecast

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "data" / "sources"
SITE = ROOT / "site"
OUT = SITE / "data"

SITE_URL = "https://matcom.github.io/icpc"
NEXT_FINAL = {"year": 2026, "place": "Dubái", "dates": "4–9 abr 2027"}
WINDOW = 4


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


def percentile(rank: float | None, field_size: int) -> float | None:
    """100 for the champion, 0 for the last place."""
    if rank is None or field_size < 2:
        return None
    return round(100 * (1 - (rank - 1) / (field_size - 1)), 1)


def load_contests() -> tuple[dict[int, list[dict]], dict, dict[int, int]]:
    """Results come from cphof; regions and Spanish names from the yudivian dataset.

    Rows marked `qualified` never received a place, so they are not part of a final.
    """
    meta = json.loads((SOURCES / "yudivian-2006-2024.json").read_text())
    finals = json.loads((SOURCES / "cphof-1999-2025.json").read_text())
    fixes = json.loads((SOURCES / "name-fixes.json").read_text())
    contests: dict[int, list[dict]] = {}
    for year, final in finals.items():
        rows = []
        for row in final["rows"]:
            if row["position"] == "qualified":
                continue
            ids = [slug for slug, _ in row["players"]]
            names = [fixes.get(name, name) for _, name in row["players"]]
            rows.append({**row, "player_ids": ids, "players": names})
        contests[int(year)] = rows
    return contests, meta, {int(y): f["problems"] for y, f in finals.items()}


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


EXTRA_COUNTRIES = {"North Macedonia": {"es": "Macedonia del Norte", "region": "eu"}}


def build_universities(contests: dict[int, list[dict]], raw: dict) -> tuple[list[dict], dict]:
    names = canonical_names(contests, "university", load_aliases())
    countries = {
        name: {"es": c["spanish_name"], "region": c["region"]}
        for name, c in raw["countries"].items()
    } | EXTRA_COUNTRIES
    teams: dict[str, dict] = {}
    for year in sorted(contests):
        rows = contests[year]
        ranked = sum(parse_rank(r["position"]) is not None for r in rows)
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
                "pct": percentile(rank, ranked),
                "solved": to_int(row["solved"]),
                "time": to_int(row["time"]),
                "team": row["team"],
                "players": row["players"],
                "player_ids": row["player_ids"],
                "medal": row["medal"].lower() if row["medal"] else None,
                "titles": row["titles"],
            })
    universities = sorted(teams.values(), key=lambda u: u["id"])
    for uni in universities:
        uni["results"].sort(key=lambda r: r["year"])
        seen: set[str] = set()
        for result in uni["results"]:
            keys = set(result["player_ids"])
            result["veterans"] = len(keys & seen)
            seen |= keys
    return universities, countries


# ---------------------------------------------------------------- projection


def series_of(results: list[dict], before: int) -> list[tuple[int, float]]:
    return [(r["year"], r["pct"]) for r in results if r["pct"] is not None and r["year"] < before]


def similar_trajectories(owner: str, series: list[tuple[int, float]], pool: dict[str, list[tuple[int, float]]]) -> list[str]:
    """The five others with a past run closest to the owner's latest results."""
    if len(series) < 2:
        return []
    size = min(WINDOW, len(series))
    recent = [v for _, v in series[-size:]]
    closest: dict[str, float] = {}
    for other, other_series in pool.items():
        if other == owner:
            continue
        for i in range(len(other_series) - size + 1):
            distance = sum(abs(a - b) for a, (_, b) in zip(recent, other_series[i:i + size])) / size
            closest[other] = min(distance, closest.get(other, math.inf))
    return sorted(closest, key=closest.get)[:5]


def country_series(universities: list[dict], before: int) -> dict[str, list[tuple[int, float]]]:
    best: dict[str, dict[int, float]] = defaultdict(dict)
    for uni in universities:
        for r in uni["results"]:
            if r["pct"] is not None and r["year"] < before:
                best[uni["country"]][r["year"]] = max(best[uni["country"]].get(r["year"], 0), r["pct"])
    return {c: sorted(by_year.items()) for c, by_year in best.items()}


def build_predictions(universities: list[dict], countries: dict, regions: dict[str, str]) -> dict:
    predictions = forecast.project(universities, countries, regions)
    target = predictions["year"]
    pool = {u["id"]: series_of(u["results"], target) for u in universities}
    predictions["similar"] = {uid: found for uid, series in pool.items() if (found := similar_trajectories(uid, series, pool))}
    country_pool = country_series(universities, target)
    for country, series in country_pool.items():
        predictions["countries"].setdefault(country, {})["similar"] = similar_trajectories(country, series, country_pool)
    return predictions


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
    "North Macedonia": "Macedonia",
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
    ("regiones", "Regiones", "Historic podium of each current region, and the regional champion titles awarded at each final."),
    ("universidades", "Universidades", "University rankings, constancy heatmap and results."),
    ("equipo", "Equipo", "Profile of one team: the same name at the same university counts as one team."),
    ("renovacion", "Renovación", "How teams renew: returning members, careers and their link with results."),
    ("problemas", "Problemas", "Problems solved per final: distributions, totals and percentages."),
    ("medallas", "Medallas", "Medal tables by university and country, with the medals actually awarded."),
    ("competidores", "Competidores", "People with the most finals and the most medals."),
    ("predicciones", "Predicciones", "Probability of each place in the next final from a Bayesian model over past finals and Codeforces team ratings, with a backtest."),
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
    players = Counter(i for u in universities for r in u["results"] for i in r["player_ids"])
    display = {i: p for u in universities for r in u["results"] for i, p in zip(r["player_ids"], r["players"])}

    def table(headers: list[str], rows: list[list[object]]) -> str:
        lines = ["| " + " | ".join(headers) + " |", "|" + " --- |" * len(headers)]
        lines += ["| " + " | ".join(str(c) for c in row) + " |" for row in rows]
        return "\n".join(lines)

    uni_name = {u["id"]: u["name"] for u in universities}
    places = predictions["places"]
    bodies = {
        "index": table(["Year", "Teams", "Champion"], [
            [y, sum(1 for u in universities for r in u["results"] if r["year"] == y),
             next((u["name"] for u in universities for r in u["results"] if r["year"] == y and r["rank"] == 1), "")]
            for y in years]),
        "paises": table(["Country", "Appearances in finals"], [[c, n] for c, n in teams_by_country.most_common(30)]),
        "regiones": table(["Year", "Regional title", "University", "Rank"], [
            [r["year"], t, u["name"], round(r["rank"]) if r["rank"] else ""]
            for u in sorted(universities, key=lambda x: x["name"]) for r in u["results"] for t in r["titles"] if t != "World"][:200]),
        "universidades": table(["University", "Finals"], [[u["name"], len(u["results"])] for u in finals[:30]]),
        "renovacion": table(["Year", "% of teams with a returning member"], [[y, veteran_share[y]] for y in years]),
        "problemas": table(["Year", "Median solved", "Max solved"], [
            [y, statistics.median(s), max(s)] for y in years
            for s in [[r["solved"] for u in universities for r in u["results"] if r["year"] == y and r["solved"] is not None]]]),
        "medallas": table(["University", "Gold", "Silver", "Bronze"], [[n, g, s, b] for g, s, b, n in medal_rows[:30]]),
        "competidores": table(["Competitor", "Finals"], [[display[k], n] for k, n in players.most_common(30)]),
        "predicciones": table(["University", "Team", "Champion %", "Gold %", "Any medal %", "Likely place", "Data"], [
            [t["name"], t["team"] or "", round(100 * t["chances"][0], 1), round(100 * t["chances"][places.index(4)], 1), round(100 * t["chances"][places.index(12)], 1),
             f'{t["rank"]} ({t["rank_best"]}–{t["rank_worst"]})', t["kind"]] for t in predictions["teams"][:30]]),
        "comparar": "The comparison page reads `data/core.json`; its URL takes `?u=<id>,<id>` or `?c=<name>,<name>`.",
        "pais": "The page takes `?c=<country name in English>`; `data/core.json` holds the same results.",
        "universidad": "The page takes `?u=<university id>`; ids and results are in `data/core.json`.",
        "equipo": "The page takes `?u=<university id>&t=<team name>`; results are in `data/core.json`.",
        "datos": "Results and medals come from cphof.org, checked against icpc.global where it publishes them. "
                 "Regions, Spanish names and the catalogue of analyses come from `yudivian/icpc` (Apache-2.0).",
    }
    for slug, title, summary in PAGES:
        (SITE / f"{slug}.html.md").write_text(f"# {title}\n\n{summary}\n\n{bodies[slug]}\n")
    links = "\n".join(f"- [{t}]({SITE_URL}/{s}.html.md): {d}" for s, t, d in PAGES)
    (SITE / "llms.txt").write_text(
        "# Observatorio ICPC\n\n"
        f"> Public statistics of the ICPC World Finals since {years[0]}, as precomputed static files.\n\n"
        f"## Pages\n\n{links}\n\n"
        "## Data\n\n"
        f"- [core.json]({SITE_URL}/data/core.json): every university with its results per final.\n"
        f"- [predictions.json]({SITE_URL}/data/predictions.json): place probabilities of the next final per team, country and region, and their backtest.\n"
        f"- [results.csv]({SITE_URL}/data/results.csv): one row per team and final.\n"
        f"- [world.json]({SITE_URL}/data/world.json): GeoJSON used by the map.\n"
    )


def build() -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    contests, raw, problems = load_contests()
    years = sorted(contests)
    universities, countries = build_universities(contests, raw)
    region_names = {k: v["spanish_name"] for k, v in raw["regions"].items()}
    predictions = build_predictions(universities, countries, region_names)
    for name, meta in countries.items():
        meta["map"] = MAP_NAMES.get(name, name)
        if name in MAP_POINTS:
            meta["point"] = MAP_POINTS[name]
    core = {
        "years": years,
        "field": {str(y): len(contests[y]) for y in years},
        "problems": {str(y): n for y, n in problems.items()},
        "regions": region_names,
        "countries": countries,
        "next_final": NEXT_FINAL,
        "logos": json.loads((SOURCES / "logos.json").read_text()),
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
          f"{len(predictions['teams'])} projected teams, "
          f"champion backtest {predictions['backtest']['with_rosters']['champion']} "
          f"vs finals only {predictions['backtest']['finals_only']['champion']}")
