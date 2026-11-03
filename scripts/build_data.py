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


# ------------------------------------------------------------------- cuba


CURATED = ROOT / "data" / "curated"

# Approximate coordinates of the five Cuban campuses that reached a final.
CUBA_POINTS = {
    "universidad-de-la-habana": [-82.38, 23.14],
    "universidad-de-las-ciencias-informaticas": [-82.42, 23.04],
    "universidad-central-marta-abreu-de-las-villas": [-79.96, 22.42],
    "universidad-de-pinar-del-rio": [-83.70, 22.42],
    "universidad-de-oriente-sede-antonio-maceo": [-75.83, 20.02],
}

# Provinces where those campuses sit, for the map colour and the profile cards.
CUBA_PROVINCES = {
    "universidad-de-la-habana": "La Habana",
    "universidad-de-las-ciencias-informaticas": "La Habana",
    "universidad-central-marta-abreu-de-las-villas": "Villa Clara",
    "universidad-de-pinar-del-rio": "Pinar del Río",
    "universidad-de-oriente-sede-antonio-maceo": "Santiago de Cuba",
}

# The source spells a few names without accents or with a typo.
CUBA_PROVINCE_NAMES = {
    "Ciego de Avila": "Ciego de Ávila",
    "Guantanmo": "Guantánamo",
    "Sancti Spiritus": "Sancti Spíritus",
}


def build_cuba_map() -> dict:
    """Province boundaries for the Cuba map, with names prepared for ECharts."""
    raw = json.loads((SOURCES / "cuba-provinces.geojson").read_text())
    features = []
    for feature in raw["features"]:
        props = feature["properties"]
        province = props.get("province", "")
        features.append({
            "type": "Feature",
            "properties": {
                "name": CUBA_PROVINCE_NAMES.get(province, province),
                "province_id": props.get("province_id"),
                "dpa": props.get("DPA_province_code"),
            },
            "geometry": feature["geometry"],
        })
    return {"type": "FeatureCollection", "features": features}


def quantile(values: list[float], q: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    lower = math.floor(position)
    upper = min(lower + 1, len(ordered) - 1)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def gender_map() -> dict[str, str]:
    """Curated gender of the Cuban finalists; it is not copied to site/data."""
    path = CURATED / "cuba-gender.csv"
    with path.open() as handle:
        rows = list(csv.DictReader(handle))
    return {row["person_id"]: row["gender"] for row in rows}


def build_cuba(universities: list[dict], countries: dict, predictions: dict, problems: dict[int, int]) -> dict:
    """The Cuban slice: teams, field, Latin-American podiums, people and aggregates."""
    all_rows = []
    for uni in universities:
        for result in uni["results"]:
            all_rows.append({
                **result,
                "uni": uni["id"],
                "uniName": uni["name"],
                "country": uni["country"],
                "region": countries.get(uni["country"], {}).get("region", "other"),
            })
    all_rows.sort(key=lambda r: (r["year"], r["rank"] if r["rank"] is not None else 1e9))
    cuba_rows = [r for r in all_rows if r["country"] == "Cuba"]
    cuba_rows.sort(key=lambda r: (r["year"], r["rank"] if r["rank"] is not None else 1e9))
    years = sorted({r["year"] for r in cuba_rows})
    field_size = {year: sum(1 for r in all_rows if r["year"] == year) for year in {r["year"] for r in all_rows}}
    for row in all_rows:
        row["field"] = field_size[row["year"]]

    # Where a team finished inside the group that solved the same number of problems.
    for row in cuba_rows:
        group = [x for x in all_rows if x["year"] == row["year"] and x["solved"] == row["solved"] and x["time"] is not None]
        group.sort(key=lambda x: (x["time"], x["rank"] if x["rank"] is not None else 1e9))
        position = next((i for i, x in enumerate(group) if x is row), None)
        row["group"] = {
            "position": position + 1 if position is not None else None,
            "size": len(group),
            "timePct": round(100 * (1 - position / (len(group) - 1)), 1) if position is not None and len(group) > 1 else None,
        }

    def es(country: str) -> str:
        return countries.get(country, {}).get("es", country)

    def brief(row: dict | None, place: int | None = None) -> dict | None:
        if row is None:
            return None
        return {
            "year": row["year"],
            "uni": row["uni"],
            "uniName": row["uniName"],
            "team": row["team"],
            "rank": round(row["rank"], 1) if row["rank"] is not None else None,
            "field": row["field"],
            "pct": row["pct"],
            "solved": row["solved"],
            "time": row["time"],
            "medal": row["medal"],
            "veterans": row["veterans"],
            "group": row.get("group"),
            "players": [{"id": pid, "name": name} for pid, name in zip(row["player_ids"], row["players"])],
            "podiumPlace": place,
        }

    # Field of each final, the cut-offs Cuba is measured against, and the solved box.
    field = []
    for year in years:
        ranked = [r for r in all_rows if r["year"] == year and r["rank"] is not None]
        solved = [r["solved"] for r in ranked if r["solved"] is not None]
        cuba = [r for r in cuba_rows if r["year"] == year]
        best = min(cuba, key=lambda r: r["rank"] if r["rank"] is not None else 1e9) if cuba else None
        ordered = sorted(ranked, key=lambda r: r["rank"])
        top50 = ordered[49] if len(ordered) >= 50 else ordered[-1]
        medalists = [r for r in ranked if r["medal"] and r["solved"] is not None]
        medal_cut = min((r["solved"] for r in medalists), default=None)
        median = statistics.median(solved) if solved else None
        entry = {
            "year": year,
            "field": field_size[year],
            "problems": problems.get(year),
            "teams": len(cuba),
            "medianSolved": round(median, 1) if median is not None else None,
            "top50Solved": top50["solved"] if top50 else None,
            "medalSolved": medal_cut,
            "solvedBox": [round(quantile(solved, q), 1) for q in (0, 0.25, 0.5, 0.75, 1)] if solved else None,
            "cubaBestSolved": best["solved"] if best else None,
            "cubaBestRank": round(best["rank"], 1) if best and best["rank"] is not None else None,
            "cubaBestPct": best["pct"] if best else None,
            "cubaBestTeam": best["team"] if best else None,
            "cubaBestUni": best["uniName"] if best else None,
            "gapMedian": best["solved"] - median if best and best["solved"] is not None and median is not None else None,
            "gapTop50": best["solved"] - top50["solved"] if best and best["solved"] is not None and top50 and top50["solved"] is not None else None,
            "gapMedal": best["solved"] - medal_cut if best and best["solved"] is not None and medal_cut is not None else None,
        }
        field.append(entry)

    # Simulator and time machine: rank interval of each solved count in each final.
    simulator = []
    for year in years:
        ranked = [r for r in all_rows if r["year"] == year and r["rank"] is not None]
        highest = max((r["solved"] for r in ranked if r["solved"] is not None), default=0)
        for solved in range(0, highest + 1):
            group = [r for r in ranked if r["solved"] == solved]
            if not group:
                continue
            ranks = [r["rank"] for r in group]
            simulator.append({
                "year": year,
                "solved": solved,
                "count": len(group),
                "rankLow": round(min(ranks), 1),
                "rankHigh": round(max(ranks), 1),
                "rankMedian": round(statistics.median(ranks), 1),
                "pctLow": round(percentile(max(ranks), len(ranked)), 1),
                "pctHigh": round(percentile(min(ranks), len(ranked)), 1),
                "medals": sum(1 for r in group if r["medal"]),
                "top50": sum(1 for r in group if r["rank"] <= 50),
            })

    # Podium by country: the best team of each Latin-American country, by percentile.
    podium_years = []
    latam_countries = {r["country"] for r in all_rows if r["year"] in years and r["region"] == "la"}
    podium_by_country: dict[str, dict] = {
        country: {"country": country, "es": es(country), "teams": 0, "podiums": 0, "gold": 0, "medals": 0}
        for country in latam_countries
    }
    latam_teams = 0
    for year in years:
        latam = [r for r in all_rows if r["year"] == year and r["region"] == "la" and r["rank"] is not None]
        latam_teams += len(latam)
        best: dict[str, dict] = {}
        for row in latam:
            if row["country"] not in best or row["pct"] > best[row["country"]]["pct"]:
                best[row["country"]] = row
        ordered = sorted(best.values(), key=lambda r: (-r["pct"], r["rank"]))
        top = []
        for index, row in enumerate(ordered[:3]):
            top.append({
                "place": index + 1,
                "country": row["country"],
                "es": es(row["country"]),
                "rank": round(row["rank"], 1),
                "pct": row["pct"],
                "solved": row["solved"],
                "uni": row["uni"],
                "uniName": row["uniName"],
                "team": row["team"],
                "medal": row["medal"],
            })
            stats = podium_by_country[row["country"]]
            stats["podiums"] += 1
            if index == 0:
                stats["gold"] += 1
        cuba_best = best.get("Cuba")
        cuba_place = ordered.index(cuba_best) + 1 if cuba_best else None
        cuba_share = round(100 * sum(1 for r in cuba_rows if r["year"] == year) / len(latam), 1) if latam else None
        podium_years.append({
            "year": year,
            "latamTeams": len(latam),
            "latamCountries": len(best),
            "cubaTeams": sum(1 for r in cuba_rows if r["year"] == year),
            "cubaShare": cuba_share,
            "cubaPlace": cuba_place,
            "top": top,
            "cuba": {
                "place": cuba_place,
                "country": "Cuba",
                "es": "Cuba",
                "rank": round(cuba_best["rank"], 1) if cuba_best else None,
                "pct": cuba_best["pct"] if cuba_best else None,
                "solved": cuba_best["solved"] if cuba_best else None,
                "uni": cuba_best["uni"] if cuba_best else None,
                "uniName": cuba_best["uniName"] if cuba_best else None,
                "team": cuba_best["team"] if cuba_best else None,
                "medal": cuba_best["medal"] if cuba_best else None,
                "field": cuba_best["field"] if cuba_best else None,
            },
        })
    for row in all_rows:
        if row["country"] in podium_by_country and row["region"] == "la" and row["year"] in years:
            podium_by_country[row["country"]]["teams"] += 1
            if row["medal"]:
                podium_by_country[row["country"]]["medals"] += 1
    podium_countries = sorted(podium_by_country.values(), key=lambda c: (-c["podiums"], -c["gold"], -c["teams"], c["es"]))
    countries_with_podiums = [c for c in podium_countries if c["podiums"] > 0]
    for index, row in enumerate(countries_with_podiums):
        row["podiumRank"] = index + 1
    cuba_podium_rank = next((c["podiumRank"] for c in countries_with_podiums if c["country"] == "Cuba"), None)
    total_podiums = 3 * len(years)
    for index, row in enumerate(podium_countries):
        row["teamShare"] = round(100 * row["teams"] / latam_teams, 1) if latam_teams else None
        row["podiumShare"] = round(100 * row["podiums"] / total_podiums, 1) if total_podiums else None
        row["perEdition"] = round(row["podiums"] / len(years), 2) if years else None
        row["rank"] = index + 1
    cuba_podiums = [{
        "year": entry["year"],
        "place": entry["cuba"]["place"],
        "country": "Cuba",
        "rank": entry["cuba"]["rank"],
        "pct": entry["cuba"]["pct"],
        "solved": entry["cuba"]["solved"],
        "uni": entry["cuba"]["uni"],
        "uniName": entry["cuba"]["uniName"],
        "team": entry["cuba"]["team"],
        "field": entry["cuba"]["field"],
    } for entry in podium_years if entry["cubaPlace"] and entry["cubaPlace"] <= 3]
    podium_place = {(p["year"], p["uni"], p["team"]): p["place"] for p in cuba_podiums}
    cuba_country_stats = next((c for c in podium_countries if c["country"] == "Cuba"), {})
    podiums = {
        "definition": "Podio por país: el mejor equipo de cada país latinoamericano, ordenado por percentil. No es un premio oficial del ICPC; reagrupa el podio por universidad que ya publica Regiones.",
        "years": podium_years,
        "cuba": cuba_podiums,
        "countries": podium_countries,
        "totals": {
            "latamTeams": latam_teams,
            "cubaTeams": len(cuba_rows),
            "cubaShare": round(100 * len(cuba_rows) / latam_teams, 1) if latam_teams else None,
            "podiums": total_podiums,
            "cubaPodiums": len(cuba_podiums),
            "cubaPodiumShare": round(100 * len(cuba_podiums) / total_podiums, 1) if total_podiums else None,
            "cubaPerEdition": round(len(cuba_podiums) / len(years), 2) if years else None,
            "cubaRank": cuba_country_stats.get("rank"),
            "cubaPodiumRank": cuba_podium_rank,
            "countriesWithTeams": len(podium_countries),
            "countriesWithPodiums": len(countries_with_podiums),
            "gold": sum(1 for p in cuba_podiums if p["place"] == 1),
            "silver": sum(1 for p in cuba_podiums if p["place"] == 2),
            "bronze": sum(1 for p in cuba_podiums if p["place"] == 3),
        },
    }

    # The 2017 qualification that never became a final.
    raw_finals = json.loads((SOURCES / "cphof-1999-2025.json").read_text())
    qualified = []
    for year, final in raw_finals.items():
        if int(year) not in years:
            continue
        for row in final["rows"]:
            if row["country"] == "Cuba" and row["position"] == "qualified":
                qualified.append({
                    "year": int(year),
                    "uniName": row["university"],
                    "team": row["team"],
                    "players": [name for _, name in row["players"]],
                })
    note2018 = {
        "qualified": qualified,
        "teams2018": [brief(r) for r in cuba_rows if r["year"] == 2018],
        "visaSource": "Según el equipo del proyecto; la fuente solo conserva la clasificación sin puesto.",
    }

    # Teams with the place they occupied in Cuba's country podium, or None.
    teams = [brief(r, podium_place.get((r["year"], r["uni"], r["team"]))) for r in cuba_rows]
    teams = [t for t in teams if t is not None]

    # Counterfactual: finals without the University of Havana.
    uh_years = {r["year"] for r in cuba_rows if r["uni"] == "universidad-de-la-habana"}
    absent = [year for year in years if year not in uh_years]
    absent_best = []
    for year in absent:
        rows = [r for r in cuba_rows if r["year"] == year]
        best = min(rows, key=lambda r: r["rank"] if r["rank"] is not None else 1e9)
        absent_best.append(brief(best))
    present_best = []
    for year in years:
        if year not in uh_years:
            continue
        rows = [r for r in cuba_rows if r["year"] == year and r["uni"] == "universidad-de-la-habana"]
        if rows:
            present_best.append(brief(min(rows, key=lambda r: r["rank"] if r["rank"] is not None else 1e9)))
    counterfactual = {
        "absentYears": absent,
        "absent": absent_best,
        "presentCount": len(present_best),
        "presentTop70": sum(1 for r in present_best if r["rank"] is not None and r["rank"] <= 70),
        "presentBest": min(present_best, key=lambda r: r["rank"] if r["rank"] is not None else 1e9) if present_best else None,
        "note": "No es causal: en esos años también cambió el resto de la delegación.",
    }

    # Experience effect: mean percentile by number of returning members.
    def experience(scope_rows: list[dict]) -> list[dict]:
        out = []
        for veterans in range(4):
            values = [r["pct"] for r in scope_rows if r["veterans"] == veterans and r["pct"] is not None]
            out.append({"veterans": veterans, "teams": len(values), "meanPct": round(statistics.mean(values), 1) if values else None})
        return out

    # Countries in the mirror: at least eight editions since 2010.
    window = [r for r in all_rows if r["year"] in years]
    teams_by_country = Counter(r["country"] for r in window)
    medals_by_country = Counter(r["country"] for r in window if r["medal"])
    best_by_country: dict[str, dict[int, float]] = defaultdict(dict)
    best_rank: dict[str, float] = {}
    for row in window:
        if row["pct"] is not None:
            best_by_country[row["country"]][row["year"]] = max(best_by_country[row["country"]].get(row["year"], 0), row["pct"])
        if row["rank"] is not None:
            best_rank[row["country"]] = min(best_rank.get(row["country"], 1e9), row["rank"])
    mirror_rows = []
    for country, by_year in best_by_country.items():
        if len(by_year) < 8:
            continue
        mirror_rows.append({
            "country": country,
            "es": es(country),
            "teams": teams_by_country[country],
            "editions": len(by_year),
            "meanBest": round(statistics.mean(by_year.values()), 1),
            "bestRank": round(best_rank.get(country, 1e9), 1),
            "medals": medals_by_country[country],
        })
    mirror_rows.sort(key=lambda r: (-r["meanBest"], r["es"]))
    for index, row in enumerate(mirror_rows):
        row["rank"] = index + 1
    mirror = {
        "countries": mirror_rows,
        "cubaRank": next((r["rank"] for r in mirror_rows if r["country"] == "Cuba"), None),
        "total": len(mirror_rows),
    }

    # Relay: teams per university and final.
    cuba_unis = [u for u in universities if u["country"] == "Cuba"]
    cuba_unis.sort(key=lambda u: (-len(u["results"]), u["name"]))
    relay = {
        "years": years,
        "universities": [{
            "id": u["id"],
            "name": u["name"],
            "counts": [sum(1 for r in u["results"] if r["year"] == year) for year in years],
        } for u in cuba_unis],
    }

    # Country ranking in the world, always over the 2010-2025 window.
    appearances = Counter(r["country"] for r in window)
    appearance_order = sorted(appearances.items(), key=lambda item: (-item[1], es(item[0])))
    mean_best_order = sorted(mirror_rows, key=lambda r: (-r["meanBest"], r["es"]))
    best_rank_order = sorted(best_rank.items(), key=lambda item: (item[1], es(item[0])))
    never_missed = [country for country in appearances if len(best_by_country[country]) == len(years)]
    volatility = {country: round(statistics.pstdev(best_by_country[country].values()), 1) for country in never_missed}
    volatility_order = sorted(volatility.items(), key=lambda item: -item[1])
    medals20 = [country for country, count in appearances.items() if count >= 20]
    world = {
        "appearances": {
            "cuba": appearances["Cuba"],
            "rank": next(i for i, (country, _) in enumerate(appearance_order, 1) if country == "Cuba"),
            "total": len(appearance_order),
            "top": [{"country": c, "es": es(c), "value": n} for c, n in appearance_order[:10]],
        },
        "meanBest": {
            "cuba": round(statistics.mean(best_by_country["Cuba"].values()), 1),
            "rank": next(i for i, row in enumerate(mean_best_order, 1) if row["country"] == "Cuba"),
            "total": len(mean_best_order),
            "top": mean_best_order[:10],
        },
        "bestRank": {
            "cuba": round(best_rank["Cuba"], 1),
            "rank": next(i for i, (country, _) in enumerate(best_rank_order, 1) if country == "Cuba"),
            "better": sum(1 for rank in best_rank.values() if rank < best_rank["Cuba"]),
            "total": len(best_rank_order),
        },
        "medals": {
            "cuba": medals_by_country["Cuba"],
            "countries20": len(medals20),
            "withoutMedal": sum(1 for country in medals20 if not medals_by_country[country]),
            "withoutMedalList": [es(country) for country in medals20 if not medals_by_country[country]],
        },
        "volatility": {
            "cuba": volatility["Cuba"],
            "rank": next(i for i, (country, _) in enumerate(volatility_order, 1) if country == "Cuba"),
            "total": len(never_missed),
            "neverMissed": [es(country) for country in never_missed],
        },
    }

    # Universities: teams, best result, podiums and map position.
    uni_rows = []
    for uni in cuba_unis:
        rows = uni["results"]
        best = min(rows, key=lambda r: r["rank"] if r["rank"] is not None else 1e9)
        podiums_of_uni = sum(1 for p in cuba_podiums if p["uni"] == uni["id"])
        uni_rows.append({
            "id": uni["id"],
            "name": uni["name"],
            "teams": len(rows),
            "years": [r["year"] for r in rows],
            "first": min(r["year"] for r in rows),
            "last": max(r["year"] for r in rows),
            "bestRank": round(best["rank"], 1) if best["rank"] is not None else None,
            "bestPct": best["pct"],
            "bestYear": best["year"],
            "bestTeam": best["team"],
            "avgPct": round(statistics.mean([r["pct"] for r in rows if r["pct"] is not None]), 1),
            "podiums": podiums_of_uni,
            "medals": sum(1 for r in rows if r["medal"]),
            "point": CUBA_POINTS.get(uni["id"]),
            "province": CUBA_PROVINCES.get(uni["id"]),
        })

    # People: finals, repeats, first appearances and trajectories.
    people: dict[str, dict] = {}
    for row in cuba_rows:
        for pid, name in zip(row["player_ids"], row["players"]):
            person = people.setdefault(pid, {
                "id": pid, "name": name, "years": set(), "unis": set(), "rows": [],
            })
            person["years"].add(row["year"])
            person["unis"].add(row["uniName"])
            person["rows"].append(row)
    for person in people.values():
        rows = person.pop("rows")
        person["finals"] = len(person["years"])
        person["years"] = sorted(person["years"])
        person["unis"] = sorted(person["unis"])
        best = min(rows, key=lambda r: r["rank"] if r["rank"] is not None else 1e9)
        person["bestRank"] = round(best["rank"], 1) if best["rank"] is not None else None
        person["bestYear"] = best["year"]
        person["first"] = min(person["years"])
    people_list = sorted(people.values(), key=lambda p: (-p["finals"], p["name"]))
    repeaters = [p for p in people_list if p["finals"] > 1]
    by_finals = Counter(p["finals"] for p in people_list)
    new_by_year = []
    repeat_by_year = []
    for year in years:
        new_by_year.append(sum(1 for p in people.values() if p["first"] == year))
        repeat_by_year.append(sum(1 for r in cuba_rows if r["year"] == year for pid in r["player_ids"] if people[pid]["first"] < year))
    people_by_uni = []
    for uni in cuba_unis:
        ids = {pid for r in uni["results"] for pid in r["player_ids"]}
        people_by_uni.append({
            "id": uni["id"],
            "name": uni["name"],
            "people": len(ids),
            "repeaters": sum(1 for pid in ids if people[pid]["finals"] > 1),
            "slots": sum(len(r["player_ids"]) for r in uni["results"]),
        })
    people_section = {
        "total": len(people_list),
        "repeaters": len(repeaters),
        "threePlus": sum(1 for p in people_list if p["finals"] >= 3),
        "meanFinals": round(sum(p["finals"] for p in people_list) / len(people_list), 2) if people_list else None,
        "byFinals": [{"finals": n, "count": by_finals[n]} for n in sorted(by_finals)],
        "newByYear": new_by_year,
        "repeatByYear": repeat_by_year,
        "byUniversity": people_by_uni,
        "repeatersList": repeaters,
    }

    # Gender: aggregates only, from the curated file kept outside site/data.
    gender = gender_map()
    missing = sorted(set(people) - set(gender))
    women_ids = {pid for pid, value in gender.items() if value == "f"}
    women_slots = sum(1 for r in cuba_rows for pid in r["player_ids"] if pid in women_ids)
    teams_with_women = [r for r in cuba_rows if any(pid in women_ids for pid in r["player_ids"])]
    women_people = [p for p in people_list if p["id"] in women_ids]
    composition = Counter(sum(1 for pid in r["player_ids"] if pid in women_ids) for r in cuba_rows)
    gender_timeline = []
    for year in years:
        rows = [r for r in cuba_rows if r["year"] == year]
        gender_timeline.append({
            "year": year,
            "women": sum(1 for r in rows for pid in r["player_ids"] if pid in women_ids),
            "teams": sum(1 for r in rows if any(pid in women_ids for pid in r["player_ids"])),
        })
    gender_by_uni = []
    for uni in cuba_unis:
        ids = {pid for r in uni["results"] for pid in r["player_ids"] if pid in women_ids}
        slots = sum(1 for r in uni["results"] for pid in r["player_ids"] if pid in women_ids)
        if slots:
            gender_by_uni.append({"id": uni["id"], "name": uni["name"], "people": len(ids), "slots": slots})
    years_without = [row["year"] for row in gender_timeline if row["women"] == 0]
    longest = 0
    current = 0
    for year in years:
        current = current + 1 if year in years_without else 0
        longest = max(longest, current)
    last_gap = []
    for row in reversed(gender_timeline):
        if row["women"]:
            break
        last_gap.append(row["year"])
    last_gap.reverse()
    best_team = min(teams_with_women, key=lambda r: r["rank"] if r["rank"] is not None else 1e9) if teams_with_women else None
    gender_section = {
        "women": len(women_people),
        "men": len(people_list) - len(women_people),
        "womenSlots": women_slots,
        "menSlots": len(cuba_rows) * 3 - women_slots,
        "teamsWithWomen": len(teams_with_women),
        "teamsTwoPlus": sum(1 for r in cuba_rows if sum(1 for pid in r["player_ids"] if pid in women_ids) >= 2),
        "universities": len(gender_by_uni),
        "coverage": {"known": len(people_list) - len(missing), "total": len(people_list), "missing": missing},
        "timeline": gender_timeline,
        "byUniversity": gender_by_uni,
        "composition": [{"women": n, "teams": composition[n]} for n in range(0, 4)],
        "firstYear": next((row["year"] for row in gender_timeline if row["women"]), None),
        "lastYear": next((row["year"] for row in reversed(gender_timeline) if row["women"]), None),
        "yearsWithout": len(years_without),
        "longestGap": longest,
        "lastGap": last_gap,
        "bestTeam": brief(best_team),
    }

    # Records and rare facts.
    solved_max = max(r["solved"] for r in cuba_rows if r["solved"] is not None)
    fastest_pool = [r for r in cuba_rows if r["solved"] is not None and r["solved"] >= 3 and (r["group"]["size"] or 0) > 1]
    fastest = min(fastest_pool, key=lambda r: (r["group"]["position"] - 1) / (r["group"]["size"] - 1)) if fastest_pool else None
    slowest = max(fastest_pool, key=lambda r: (r["group"]["position"] - 1) / (r["group"]["size"] - 1)) if fastest_pool else None
    records = {
        "best": brief(min(cuba_rows, key=lambda r: r["rank"] if r["rank"] is not None else 1e9)),
        "worst": brief(max(cuba_rows, key=lambda r: r["rank"] if r["rank"] is not None else -1)),
        "bestPct": brief(max(cuba_rows, key=lambda r: r["pct"] if r["pct"] is not None else -1)),
        "worstPct": brief(min(cuba_rows, key=lambda r: r["pct"] if r["pct"] is not None else 1e9)),
        "fastest": brief(fastest),
        "slowest": brief(slowest),
        "mostSolved": [brief(r) for r in cuba_rows if r["solved"] == solved_max],
        "neverSix": sum(1 for r in cuba_rows if (r["solved"] or 0) >= 6),
        "solvedDist": [{"solved": n, "teams": sum(1 for r in cuba_rows if r["solved"] == n)} for n in range(1, solved_max + 1)],
        "pinar": qualified[0] if qualified else None,
    }

    # Historical scenarios over the last five finals, not a projection.
    recent = years[-5:]
    scenarios = []
    for solved in range(3, 9):
        rows = [r for r in all_rows if r["year"] in recent and r["solved"] == solved and r["rank"] is not None]
        if not rows:
            continue
        ranks = [r["rank"] for r in rows]
        scenarios.append({
            "solved": solved,
            "teams": len(rows),
            "rankLow": round(min(ranks), 1),
            "rankHigh": round(max(ranks), 1),
            "rankMedian": round(statistics.median(ranks), 1),
            "pctMedian": round(statistics.median([r["pct"] for r in rows if r["pct"] is not None]), 1),
            "medals": sum(1 for r in rows if r["medal"]),
        })

    cuba_projection = predictions["countries"].get("Cuba", {})
    cuba_teams_projection = [t for t in predictions["teams"] if t["country"] == "Cuba"]
    projection = {
        "year": predictions["year"],
        "field": predictions["field_size"],
        "places": predictions["places"],
        "country": cuba_projection,
        "teams": cuba_teams_projection,
        "similar": [{"country": c, "es": es(c)} for c in cuba_projection.get("similar", [])],
        "backtest": predictions["backtest"]["with_rosters"],
    }

    totals = {
        "editions": len(years),
        "teams": len(cuba_rows),
        "slots": len(cuba_rows) * 3,
        "people": len(people_list),
        "universities": len(cuba_unis),
        "podiums": len(cuba_podiums),
        "medals": sum(1 for r in cuba_rows if r["medal"]),
        "regionalTitles": sum(1 for r in cuba_rows for t in r["titles"] if t != "World"),
        "maxTeamsYear": max(sum(1 for r in cuba_rows if r["year"] == year) for year in years),
        "bestRank": records["best"]["rank"],
        "worstRank": records["worst"]["rank"],
        "bestPct": records["bestPct"]["pct"],
        "worstPct": records["worstPct"]["pct"],
        "solvedMax": solved_max,
        "teams6Plus": records["neverSix"],
        "repeatPeople": len(repeaters),
        "people3Plus": people_section["threePlus"],
        "finalsPerPerson": people_section["meanFinals"],
    }

    return {
        "country": "Cuba",
        "es": "Cuba",
        "region": "la",
        "years": years,
        "totals": totals,
        "teams": teams,
        "field": field,
        "simulator": simulator,
        "podiums": podiums,
        "note2018": note2018,
        "counterfactual": counterfactual,
        "experience": {"global": experience(all_rows), "cuba": experience(cuba_rows)},
        "mirror": mirror,
        "relay": relay,
        "world": world,
        "universities": uni_rows,
        "people": people_section,
        "gender": gender_section,
        "records": records,
        "scenarios": {"years": recent, "rows": scenarios},
        "projection": projection,
    }


def write_cuba_csv(cuba: dict) -> None:
    with (OUT / "cuba.csv").open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["year", "university", "team", "rank", "field", "percentile", "solved", "time",
                         "group_position", "group_size", "veterans", "members"])
        for row in cuba["teams"]:
            group = row["group"] or {}
            writer.writerow([row["year"], row["uniName"], row["team"], row["rank"], row["field"], row["pct"],
                             row["solved"], row["time"], group.get("position"), group.get("size"),
                             row["veterans"], "; ".join(p["name"] for p in row["players"])])


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
    ("cuba", "Cuba", "The Cuban slice: 16 finals, 26 teams, field gaps, Latin-American podiums, people, gender aggregates, records and the 2026 projection."),
    ("datos", "Datos y método", "Sources, definitions, downloads and known limits."),
]


def write_markdown_twins(universities: list[dict], countries: dict, predictions: dict, years: list[int], cuba: dict) -> None:
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
        "cuba": "\n\n".join([
            "Every Cuban team in the World Finals, 2010–2025.",
            table(["Year", "University", "Team", "Rank", "Teams in final", "Percentile", "Solved", "Time", "Group"], [
                [r["year"], r["uniName"], r["team"], r["rank"], r["field"], r["pct"], r["solved"], r["time"],
                 f'{r["group"]["position"]}/{r["group"]["size"]}' if r.get("group") else ""]
                for r in cuba["teams"]]),
            "Podium by country: the best team of each Latin-American country in each final, by percentile. "
            "It is a reaggregation, not an official ICPC award; the Cuban university of each Cuban podium place is shown.",
            table(["Year", "LatAm teams", "Cuba teams", "Cuba place", "Cuban university"], [
                [r["year"], r["latamTeams"], r["cubaTeams"],
                 r["cubaPlace"] if r["cubaPlace"] else "—",
                 r["cuba"]["uniName"] if r["cubaPlace"] and r["cubaPlace"] <= 3 else (r["cuba"]["uniName"] or "—")]
                for r in cuba["podiums"]["years"]]),
            f'Gender, aggregate only: {cuba["gender"]["women"]} women and {cuba["gender"]["men"]} men; '
            f'{cuba["gender"]["womenSlots"]} of {cuba["totals"]["slots"]} slots; '
            f'{cuba["gender"]["teamsWithWomen"]} of {cuba["totals"]["teams"]} teams. '
            "No individual gender labels are published.",
            f'2026 projection: {cuba["projection"]["country"].get("rank")} '
            f'({cuba["projection"]["country"].get("rank_best")}–{cuba["projection"]["country"].get("rank_worst")}) '
            f'of {cuba["projection"]["field"]}, percentile {cuba["projection"]["country"].get("pct")}.',
        ]),
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
        f"- [cuba.json]({SITE_URL}/data/cuba.json): the Cuban slice: teams, field gaps, Latin-American podiums, people, gender aggregates, records and projection.\n"
        f"- [cuba.csv]({SITE_URL}/data/cuba.csv): one row per Cuban team and final.\n"
        f"- [cuba-map.json]({SITE_URL}/data/cuba-map.json): province boundaries used by the Cuba map (cuba-geojsons, MIT).\n"
        f"- [world.json]({SITE_URL}/data/world.json): GeoJSON used by the world map.\n"
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
    cuba = build_cuba(universities, countries, predictions, problems)
    write_json("core.json", core)
    write_json("predictions.json", predictions)
    write_json("world.json", build_world())
    write_json("cuba.json", cuba)
    write_json("cuba-map.json", build_cuba_map())
    write_csv(universities, countries)
    write_cuba_csv(cuba)
    write_markdown_twins(universities, countries, predictions, years, cuba)
    return {"core": core, "predictions": predictions, "cuba": cuba}


if __name__ == "__main__":
    result = build()
    core, predictions, cuba = result["core"], result["predictions"], result["cuba"]
    print(f"{len(core['years'])} finals, {len(core['universities'])} universities, "
          f"{sum(len(u['results']) for u in core['universities'])} results, "
          f"{len(predictions['teams'])} projected teams, "
          f"Cuba {cuba['totals']['teams']} teams / {cuba['totals']['podiums']} podiums, "
          f"champion backtest {predictions['backtest']['with_rosters']['champion']} "
          f"vs finals only {predictions['backtest']['finals_only']['champion']}")
