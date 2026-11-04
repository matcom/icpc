#!/usr/bin/env python3
"""Build every published dataset of the ICPC observatory from data/sources.

Standard library only. Output goes to site/: data/*.json, data/results.csv,
llms.txt and the Markdown twin of each page.
"""
from __future__ import annotations

import csv
import hashlib
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


def team_fold(text: str) -> str:
    """Same team-name key as the browser: case and accent insensitive, spaces collapsed."""
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    return " ".join(text.split())


def team_key(uni_id: str, team: str) -> str:
    return f"{uni_id}|{team_fold(team)}"


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


def best_result(rows: list[dict]) -> dict | None:
    """Best final: rank first, then problems solved, then time, then earliest year."""
    ranked = [row for row in rows if row.get("rank") is not None]
    if not ranked:
        return None
    best = ranked[0]
    for row in ranked[1:]:
        if row["rank"] < best["rank"]:
            best = row
            continue
        if row["rank"] > best["rank"]:
            continue
        row_solved = row.get("solved") or 0
        best_solved = best.get("solved") or 0
        if row_solved != best_solved:
            if row_solved > best_solved:
                best = row
            continue
        row_time = row.get("time")
        best_time = best.get("time")
        if row_time is not None and best_time is not None:
            if row_time != best_time:
                if row_time < best_time:
                    best = row
                continue
        if row["year"] < best["year"]:
            best = row
    return best


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


def load_logos() -> dict[str, dict]:
    """Logo metadata plus a cache-busting version: the scoreboard id when known."""
    logos = json.loads((SOURCES / "logos.json").read_text())
    for uni, logo in logos.items():
        match = re.search(r"/affiliations/(\d+)\.png", logo.get("source", ""))
        path = SITE / "logos" / f"{uni}.png"
        if match:
            logo["v"] = match[1]
        elif path.exists():
            logo["v"] = hashlib.sha256(path.read_bytes()).hexdigest()[:8]
    return logos


EXTRA_COUNTRIES = {"North Macedonia": {"es": "Macedonia del Norte", "region": "eu"}}
COUNTRY_ES_FIXES = {"Spain": "España", "Belarus": "Bielorrusia", "Kazakhstan": "Kazajistán"}


def build_universities(contests: dict[int, list[dict]], raw: dict) -> tuple[list[dict], dict]:
    names = canonical_names(contests, "university", load_aliases())
    countries = {
        name: {"es": COUNTRY_ES_FIXES.get(name, c["spanish_name"]), "region": c["region"]}
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



HOST_ALIASES = {
    "ITMO University": "St. Petersburg ITMO University",
    "KTH Royal Institute of Technology": "KTH - Royal Institute of Technology",
    "University of Porto": "Universidade do Porto",
}


def build_sedes(universities: list[dict], countries: dict, problems: dict[int, int]) -> dict:
    """Every World Finals venue joined to its final and its host country."""
    venues = list(csv.DictReader((SOURCES / "world-finals-venues.csv").open()))
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
    by_year: dict[int, list[dict]] = defaultdict(list)
    for row in all_rows:
        by_year[row["year"]].append(row)
    uni_by_fold = {fold(u["name"]): u for u in universities}

    def stats(rows: list[dict]) -> dict:
        ranked = [r for r in rows if r["rank"] is not None]
        pcts = [r["pct"] for r in ranked if r["pct"] is not None]
        return {
            "teams": len(rows),
            "meanPct": round(statistics.mean(pcts), 1) if pcts else None,
            "medals": sum(1 for r in rows if r["medal"]),
            "bestRank": round(min((r["rank"] for r in ranked), default=0), 1) if ranked else None,
            "top10": sum(1 for r in ranked if r["rank"] <= 10),
        }

    def brief(row: dict | None) -> dict | None:
        if row is None:
            return None
        return {
            "country": row["country"],
            "es": countries.get(row["country"], {}).get("es", row["country"]),
            "uni": row["uni"],
            "uniName": row["uniName"],
            "team": row["team"],
            "rank": round(row["rank"], 1) if row["rank"] is not None else None,
            "pct": row["pct"],
            "medal": row["medal"],
        }

    finals = []
    for venue in venues:
        year = int(venue["year"])
        rows = by_year[year]
        host_country = venue["country"]
        meta = countries.get(host_country, {})
        host_rows = [r for r in rows if r["country"] == host_country]
        host_uni = None
        for part in re.split(r"\s*/\s*", venue["host"] or ""):
            key = fold(HOST_ALIASES.get(part, part))
            uni = uni_by_fold.get(key)
            if not uni:
                continue
            result = next((r for r in uni["results"] if r["year"] == year), None)
            host_uni = {
                "id": uni["id"],
                "name": uni["name"],
                "competed": result is not None,
                "rank": round(result["rank"], 1) if result and result["rank"] is not None else None,
                "pct": result["pct"] if result else None,
                "team": result["team"] if result else None,
                "medal": result["medal"] if result else None,
            }
            break
        finals.append({
            "year": year,
            "city": venue["city"],
            "country": host_country,
            "es": meta.get("es", host_country),
            "region": meta.get("region", "other"),
            "host": venue["host"],
            "hostUniversity": host_uni,
            "date": venue["date"],
            "lat": float(venue["lat"]),
            "lon": float(venue["lon"]),
            "note": venue["note"],
            "teams": len(rows),
            "countries": len({r["country"] for r in rows}),
            "problems": problems.get(year),
            "champion": brief(next((r for r in rows if r["rank"] == 1), None)),
            "hostCountry": stats(host_rows),
        })

    host_countries = []
    for country in sorted({f["country"] for f in finals}):
        hosted = [f for f in finals if f["country"] == country]
        hosted_years = {f["year"] for f in hosted}
        home = [r for r in all_rows if r["country"] == country and r["year"] in hosted_years]
        away = [r for r in all_rows if r["country"] == country and r["year"] not in hosted_years]
        home_stats, away_stats = stats(home), stats(away)
        delta = (
            round(home_stats["meanPct"] - away_stats["meanPct"], 1)
            if home_stats["meanPct"] is not None and away_stats["meanPct"] is not None else None
        )
        host_countries.append({
            "country": country,
            "es": countries.get(country, {}).get("es", country),
            "region": countries.get(country, {}).get("region", "other"),
            "hosted": len(hosted),
            "years": sorted(hosted_years),
            "cities": sorted({f["city"] for f in hosted}),
            "home": home_stats,
            "away": away_stats,
            "deltaPct": delta,
        })
    host_countries.sort(key=lambda c: (-c["hosted"], c["es"]))

    city_counts = Counter(f["city"] for f in finals)
    max_city = max(city_counts.values())
    country_counts = Counter(f["country"] for f in finals)
    max_country = max(country_counts.values())
    host_uni_finals = [f for f in finals if f["hostUniversity"] and f["hostUniversity"]["competed"]]
    totals = {
        "finals": len(finals),
        "cities": len(city_counts),
        "countries": len({f["country"] for f in finals}),
        "regions": len({f["region"] for f in finals}),
        "hostCountries": len(host_countries),
        "repeatCities": [city for city, count in city_counts.items() if count > 1],
        "repeatCountries": [country for country, count in country_counts.items() if count > 1],
        "mostHostedCountry": {
            "country": max(country_counts, key=country_counts.get),
            "es": countries.get(max(country_counts, key=country_counts.get), {}).get("es", ""),
            "finals": max_country,
        },
        "mostHostedCities": [city for city, count in city_counts.items() if count == max_city],
        "mostHostedCityFinals": max_city,
        "hostCountryChampions": sum(1 for f in finals if f["champion"] and f["champion"]["country"] == f["country"]),
        "hostUniversityFinals": len(host_uni_finals),
        "hostUniversityPodiums": sum(1 for f in host_uni_finals if f["hostUniversity"]["rank"] is not None and f["hostUniversity"]["rank"] <= 3),
        "homeBetter": sum(1 for c in host_countries if c["deltaPct"] is not None and c["deltaPct"] > 0),
        "latamHosts": sum(1 for f in finals if f["region"] == "la"),
        "first": finals[0]["year"],
        "last": finals[-1]["year"],
    }
    return {"finals": finals, "countries": host_countries, "totals": totals}


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
        best = best_result(cuba)
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

    # Podium by team: the three best Latin-American teams of each final. A country
    # can take more than one place, because several of its teams can reach the top 3.
    podium_years = []
    latam_countries = {r["country"] for r in all_rows if r["year"] in years and r["region"] == "la"}
    podium_by_country: dict[str, dict] = {
        country: {
            "country": country, "es": es(country), "teams": 0, "podiums": 0,
            "gold": 0, "silver": 0, "bronze": 0, "medals": 0,
        }
        for country in latam_countries
    }
    latam_teams = 0
    for year in years:
        latam = sorted(
            (r for r in all_rows if r["year"] == year and r["region"] == "la" and r["rank"] is not None),
            key=lambda r: (r["rank"], r["time"] if r["time"] is not None else math.inf),
        )
        latam_teams += len(latam)
        top = []
        for index, row in enumerate(latam[:3]):
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
                "field": row["field"],
            })
            stats = podium_by_country[row["country"]]
            stats["podiums"] += 1
            if index == 0:
                stats["gold"] += 1
            elif index == 1:
                stats["silver"] += 1
            else:
                stats["bronze"] += 1
        cuba_best = next((row for row in latam if row["country"] == "Cuba"), None)
        cuba_place = latam.index(cuba_best) + 1 if cuba_best else None
        cuba_share = round(100 * sum(1 for r in cuba_rows if r["year"] == year) / len(latam), 1) if latam else None
        podium_years.append({
            "year": year,
            "latamTeams": len(latam),
            "latamCountries": len({r["country"] for r in latam}),
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
    podium_countries = sorted(
        podium_by_country.values(),
        key=lambda c: (-c["podiums"], -c["gold"], -c["silver"], -c["bronze"], -c["teams"], c["es"]),
    )
    countries_with_podiums = [c for c in podium_countries if c["podiums"] > 0]
    for index, row in enumerate(countries_with_podiums):
        row["podiumRank"] = index + 1
    cuba_podium_rank = next((c["podiumRank"] for c in countries_with_podiums if c["country"] == "Cuba"), None)
    total_podiums = 3 * len(years)
    for index, row in enumerate(podium_countries):
        row["teamShare"] = round(100 * row["teams"] / latam_teams, 1) if latam_teams else None
        row["podiumShare"] = round(100 * row["podiums"] / total_podiums + 1e-9, 1) if total_podiums else None
        row["perEdition"] = round(row["podiums"] / len(years), 2) if years else None
        row["rank"] = index + 1
    cuba_podiums = [{
        "year": entry["year"],
        "place": row["place"],
        "country": "Cuba",
        "rank": row["rank"],
        "pct": row["pct"],
        "solved": row["solved"],
        "uni": row["uni"],
        "uniName": row["uniName"],
        "team": row["team"],
        "field": row["field"],
    } for entry in podium_years for row in entry["top"] if row["country"] == "Cuba"]
    podium_place = {(p["year"], p["uni"], p["team"]): p["place"] for p in cuba_podiums}
    cuba_country_stats = next((c for c in podium_countries if c["country"] == "Cuba"), {})
    podiums = {
        "definition": "Podio por equipo: los tres mejores equipos latinoamericanos de cada final, ordenados por puesto. No es un premio oficial del ICPC; un país puede ocupar más de un lugar si varios de sus equipos entran en el top 3.",
        "years": podium_years,
        "cuba": cuba_podiums,
        "countries": podium_countries,
        "totals": {
            "latamTeams": latam_teams,
            "cubaTeams": len(cuba_rows),
            "cubaShare": round(100 * len(cuba_rows) / latam_teams, 1) if latam_teams else None,
            "podiums": total_podiums,
            "cubaPodiums": len(cuba_podiums),
            "cubaPodiumShare": round(100 * len(cuba_podiums) / total_podiums + 1e-9, 1) if total_podiums else None,
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
        best = best_result(rows)
        absent_best.append(brief(best))
    present_best = []
    for year in years:
        if year not in uh_years:
            continue
        rows = [r for r in cuba_rows if r["year"] == year and r["uni"] == "universidad-de-la-habana"]
        if rows:
            present_best.append(brief(best_result(rows)))
    counterfactual = {
        "absentYears": absent,
        "absent": absent_best,
        "presentCount": len(present_best),
        "presentTop70": sum(1 for r in present_best if r["rank"] is not None and r["rank"] <= 70),
        "presentBest": best_result(present_best) if present_best else None,
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
        best = best_result(rows)
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
        best = best_result(rows)
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
    best_team = best_result(teams_with_women) if teams_with_women else None
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
        "best": brief(best_result(cuba_rows)),
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



# ------------------------------------------------------------------ complexity

COMPLEXITY_LEVELS = [
    ("n1", 1, "Abierto", 0.80, 1.00, "Casi todos los equipos lo resuelven."),
    ("n2", 2, "Accesible", 0.60, 0.80, "La mayoría lo resuelve."),
    ("n3", 3, "Intermedio", 0.40, 0.60, "Lo resuelve cerca de la mitad."),
    ("n4", 4, "Exigente", 0.20, 0.40, "Solo una minoría."),
    ("n5", 5, "Duro", 0.10, 0.20, "Muy pocos."),
    ("n6", 6, "Excepcional", 0.00, 0.10, "Casi nadie; no implica imposible."),
]


def complexity_level(rate: float) -> int:
    for _, level, _, low, _, _ in COMPLEXITY_LEVELS:
        if rate >= low:
            return level
    return 6


def read_curated_csv(name: str) -> list[dict]:
    with (CURATED / name).open(encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def build_complexity(universities: list[dict], countries: dict, region_names: dict) -> dict:
    """Cross the 2011-2025 scoreboard matrix with the v1 multi-label taxonomy."""
    difficulty = [r for r in read_curated_csv("problem-difficulty.csv") if 2011 <= int(r["year"]) <= 2025]
    matrix = [r for r in read_curated_csv("scoreboard-matrix.csv") if 2011 <= int(r["year"]) <= 2025]
    team_rows = [r for r in read_curated_csv("team-results.csv") if 2011 <= int(r["year"]) <= 2025]
    topics = {r["problem_id"]: r for r in read_curated_csv("problem-topics.csv")}
    taxonomy = json.loads((CURATED / "taxonomy.json").read_text(encoding="utf-8"))
    area_label = {x["id"]: x["label"] for x in taxonomy["dimensions"]["areas"]}
    tech_label = {x["id"]: x["label"] for x in taxonomy["dimensions"]["techniques"]}
    tech_family = {x["id"]: x["family"] for x in taxonomy["dimensions"]["techniques"]}
    task_label = {x["id"]: x["label"] for x in taxonomy["dimensions"]["tasks"]}
    burden_label = {x["id"]: x["label"] for x in taxonomy["dimensions"]["burdens"]}
    format_label = {x["id"]: x["label"] for x in taxonomy["dimensions"]["formats"]}

    def split(value: str) -> list[str]:
        return [x for x in (value or "").split(";") if x]

    problems = []
    for row in difficulty:
        pid = f'wf-{row["year"]}-{row["letter"].lower()}'
        topic = topics[pid]
        rate = float(row["solve_rate"])
        level = complexity_level(rate)
        teams = int(row["teams"])
        solved = int(row["solved"])
        attempts = int(row["attempts"])
        first_solve = row.get("first_solve_min", "").strip()
        median_solve = row.get("median_solve_min", "").strip()
        problems.append({
            "id": pid,
            "year": int(row["year"]),
            "letter": row["letter"],
            "title": row["title"],
            "area": topic["primary_area"],
            "areas": [topic["primary_area"]] + split(topic["secondary_areas"]),
            "technique": topic["primary_technique"],
            "techniques": [topic["primary_technique"]] + split(topic["secondary_techniques"]),
            "task": topic["primary_task"],
            "tasks": [topic["primary_task"]] + split(topic["secondary_tasks"]),
            "burden": topic["implementation_burden"],
            "level": level,
            "levelId": COMPLEXITY_LEVELS[level - 1][0],
            "levelLabel": COMPLEXITY_LEVELS[level - 1][2],
            "teams": teams,
            "solved": solved,
            "solveRate": round(rate, 4),
            "attempts": attempts,
            "failedPerTeam": round((attempts - solved) / teams, 3) if teams else None,
            "attemptsPerSolve": round(attempts / solved, 2) if solved else None,
            "firstSolveMin": float(first_solve) if first_solve else None,
            "medianSolveMin": float(median_solve) if median_solve else None,
            "firstSolveOrder": None,
            "format": topic["format"],
            "confidence": float(topic["confidence"]),
            "sourceQuality": topic["source_quality"],
            "evidence": topic["evidence"],
        })

    problem_by_key = {(p['year'], p['letter']): p for p in problems}

    for year in range(2011, 2026):
        ordered = sorted(
            (problem for problem in problems if problem["year"] == year and problem["firstSolveMin"] is not None),
            key=lambda problem: problem["firstSolveMin"],
        )
        for position, problem in enumerate(ordered, 1):
            problem["firstSolveOrder"] = position

    def level_counts(items: list[dict]) -> list[int]:
        counts = [0] * 6
        for item in items:
            counts[item["level"] - 1] += 1
        return counts

    area_counts = Counter(p["area"] for p in problems)
    tech_counts = Counter(p["technique"] for p in problems)
    task_counts = Counter(p["task"] for p in problems)
    burden_counts = Counter(p["burden"] for p in problems)
    area_levels = {a: [0] * 6 for a in area_label}
    tech_levels = {t: [0] * 6 for t in tech_label}
    for p in problems:
        area_levels[p["area"]][p["level"] - 1] += 1
        tech_levels[p["technique"]][p["level"] - 1] += 1

    editions = []
    for year in range(2011, 2026):
        rows = [p for p in problems if p["year"] == year]
        if not rows:
            continue
        ordered = [problem for problem in rows if problem["firstSolveMin"] is not None]
        first_blood = min(ordered, key=lambda problem: problem["firstSolveMin"]) if ordered else None
        last_blood = max(ordered, key=lambda problem: problem["firstSolveMin"]) if ordered else None

        def blood(problem: dict | None) -> dict | None:
            if problem is None:
                return None
            return {
                "id": problem["id"], "letter": problem["letter"], "title": problem["title"],
                "level": problem["level"], "solveRate": problem["solveRate"],
                "firstSolveMin": problem["firstSolveMin"],
            }

        editions.append({
            "year": year,
            "problems": len(rows),
            "teams": sum(1 for r in team_rows if int(r["year"]) == year),
            "levels": level_counts(rows),
            "meanLevel": round(sum(p["level"] for p in rows) / len(rows), 2),
            "areas": dict(Counter(p["area"] for p in rows)),
            "techniques": dict(Counter(p["technique"] for p in rows)),
            "tasks": dict(Counter(p["task"] for p in rows)),
            "burdens": dict(Counter(p["burden"] for p in rows)),
            "firstBlood": blood(first_blood),
            "lastBlood": blood(last_blood),
        })

    edition_by_year = {edition["year"]: edition for edition in editions}
    order_quartiles = []
    for quartile in range(4):
        rows = []
        for problem in problems:
            if problem["firstSolveOrder"] is None:
                continue
            edition = edition_by_year[problem["year"]]
            position = (problem["firstSolveOrder"] - 1) / max(edition["problems"] - 1, 1)
            if min(3, int(position * 4)) == quartile:
                rows.append(problem)
        order_quartiles.append({
            "id": f"q{quartile + 1}",
            "label": ["Q1 · primeros", "Q2", "Q3", "Q4 · últimos"][quartile],
            "count": len(rows),
            "meanSolveRate": round(sum(problem["solveRate"] for problem in rows) / len(rows), 4) if rows else None,
            "meanLevel": round(sum(problem["level"] for problem in rows) / len(rows), 2) if rows else None,
            "meanAttemptsPerSolve": round(
                sum(problem["attemptsPerSolve"] for problem in rows if problem["attemptsPerSolve"] is not None)
                / max(1, sum(1 for problem in rows if problem["attemptsPerSolve"] is not None)), 2
            ) if rows else None,
            "meanFailedPerTeam": round(sum(problem["failedPerTeam"] or 0 for problem in rows) / len(rows), 2) if rows else None,
        })

    # Rank quartiles and entity profiles use solved cells, not problem counts.
    team_meta = {}
    for row in team_rows:
        rank = row["rank"].strip()
        team_meta[(int(row["year"]), row["university"], row["team"])] = {
            "rank": float(rank) if rank else None,
            "country": row["country"],
            "region": countries.get(row["country"], {}).get("region", "other"),
        }
    field_size = Counter(int(r["year"]) for r in team_rows)
    uni_by_name = {u["name"]: u for u in universities}
    uni_by_fold = {fold(u["name"]): u for u in universities}

    quartiles = {
        "top10": {"id": "top10", "label": "Top 10%", "teams": 0, "solves": 0,
                  "levels": [0] * 6, "attemptsByLevel": [0] * 6, "solvesByLevel": [0] * 6,
                  "areas": Counter(), "techniques": Counter(), "burdens": Counter()},
        "10-25": {"id": "10-25", "label": "10–25%", "teams": 0, "solves": 0,
                  "levels": [0] * 6, "attemptsByLevel": [0] * 6, "solvesByLevel": [0] * 6,
                  "areas": Counter(), "techniques": Counter(), "burdens": Counter()},
        "25-50": {"id": "25-50", "label": "25–50%", "teams": 0, "solves": 0,
                  "levels": [0] * 6, "attemptsByLevel": [0] * 6, "solvesByLevel": [0] * 6,
                  "areas": Counter(), "techniques": Counter(), "burdens": Counter()},
        "50-100": {"id": "50-100", "label": "50–100%", "teams": 0, "solves": 0,
                   "levels": [0] * 6, "attemptsByLevel": [0] * 6, "solvesByLevel": [0] * 6,
                   "areas": Counter(), "techniques": Counter(), "burdens": Counter()},
    }

    def quartile_of(year: int, university: str, team: str) -> str | None:
        meta = team_meta.get((year, university, team))
        if not meta or not meta["rank"] or not field_size[year]:
            return None
        pct = meta["rank"] / field_size[year]
        if pct <= 0.10:
            return "top10"
        if pct <= 0.25:
            return "10-25"
        if pct <= 0.50:
            return "25-50"
        return "50-100"

    def empty_profile() -> dict:
        return {
            "editions": 0, "solves": 0, "levels": [0] * 6,
            "attempts": 0, "attemptsByLevel": [0] * 6,
            "areas": Counter(), "techniques": Counter(), "tasks": Counter(),
            "burdens": Counter(), "formats": Counter(),
            "solvedProblems": set(), "attemptedProblems": set(),
        }

    uni_profiles = defaultdict(empty_profile)
    country_profiles = defaultdict(empty_profile)
    region_profiles = defaultdict(empty_profile)
    team_profiles = defaultdict(empty_profile)
    seen_editions = {"uni": defaultdict(set), "country": defaultdict(set), "region": defaultdict(set)}

    for row in matrix:
        year = int(row["year"])
        letter = row["letter"]
        topic = topics[f'wf-{year}-{letter.lower()}']
        problem = problem_by_key[(year, letter)]
        level = problem["level"]
        solved = int(row["solved"])
        attempts = int(row["attempts"])
        uni = row["university"]
        country = row["country"]
        region = countries.get(country, {}).get("region", "other")
        uni_meta = uni_by_name.get(uni) or uni_by_fold.get(fold(uni))
        if not uni_meta:
            continue
        tkey = team_key(uni_meta["id"], row["team"])
        q = quartile_of(year, uni, row["team"])
        if q:
            quartiles[q]["attemptsByLevel"][level - 1] += attempts
            quartiles[q]["solvesByLevel"][level - 1] += solved
            if solved:
                quartiles[q]["solves"] += 1
                quartiles[q]["levels"][level - 1] += 1
                quartiles[q]["areas"][topic["primary_area"]] += 1
                quartiles[q]["techniques"][topic["primary_technique"]] += 1
                quartiles[q]["burdens"][topic["implementation_burden"]] += 1
        for profile, key in ((uni_profiles, uni), (country_profiles, country), (region_profiles, region), (team_profiles, tkey)):
            profile[key]["attempts"] += attempts
            profile[key]["attemptsByLevel"][level - 1] += attempts
            if attempts:
                profile[key]["attemptedProblems"].add(problem["id"])
            if solved:
                profile[key]["solves"] += 1
                profile[key]["levels"][level - 1] += 1
                profile[key]["areas"][topic["primary_area"]] += 1
                profile[key]["techniques"][topic["primary_technique"]] += 1
                profile[key]["tasks"][topic["primary_task"]] += 1
                profile[key]["burdens"][topic["implementation_burden"]] += 1
                profile[key]["formats"][topic["format"]] += 1
                profile[key]["solvedProblems"].add(problem["id"])

    for row in team_rows:
        year = int(row["year"])
        uni = row["university"]
        country = row["country"]
        region = countries.get(country, {}).get("region", "other")
        uni_meta = uni_by_name.get(uni) or uni_by_fold.get(fold(uni))
        if not uni_meta:
            continue
        tkey = team_key(uni_meta["id"], row["team"])
        uni_profiles[uni]["editions"] += 1
        country_profiles[country]["editions"] += 1
        region_profiles[region]["editions"] += 1
        team_profiles[tkey]["editions"] += 1
        team_profiles[tkey]["name"] = row["team"]
        team_profiles[tkey]["uni"] = uni_meta["id"]
        team_profiles[tkey]["uniName"] = uni_meta["name"]
        team_profiles[tkey]["country"] = uni_meta["country"]
        team_profiles[tkey]["countryLabel"] = countries.get(uni_meta["country"], {}).get("es", uni_meta["country"])
        team_profiles[tkey]["region"] = countries.get(uni_meta["country"], {}).get("region", "other")
        team_profiles[tkey]["regionLabel"] = region_names.get(team_profiles[tkey]["region"], "")
        q = quartile_of(year, uni, row["team"])
        if q:
            quartiles[q]["teams"] += 1

    def finish_profile(profile: dict) -> dict:
        solves = profile["solves"]
        levels = profile["levels"]
        attempts_by_level = profile["attemptsByLevel"]
        attempts = profile["attempts"]
        solved_problems = sorted(profile["solvedProblems"])
        return {
            "editions": profile["editions"],
            "solves": solves,
            "distinctSolves": len(solved_problems),
            "levels": levels,
            "meanLevel": round(sum((i + 1) * n for i, n in enumerate(levels)) / solves, 2) if solves else None,
            "attempts": attempts,
            "attemptsByLevel": attempts_by_level,
            "attemptsPerSolve": round(attempts / solves, 2) if solves else None,
            "failureRate": [round((a - s) / a, 4) if a else None for a, s in zip(attempts_by_level, levels)],
            "areas": dict(profile["areas"]),
            "techniques": dict(profile["techniques"]),
            "tasks": dict(profile["tasks"]),
            "burdens": dict(profile["burdens"]),
            "formats": dict(profile["formats"]),
            "solvedProblems": solved_problems,
            "attemptedProblems": sorted(profile["attemptedProblems"]),
        }

    universities_payload = []
    for name, profile in uni_profiles.items():
        meta = uni_by_name.get(name)
        if not meta:
            continue
        item = finish_profile(profile)
        item.update({
            "id": meta["id"], "name": name, "country": meta["country"],
            "countryLabel": countries.get(meta["country"], {}).get("es", meta["country"]),
            "region": countries.get(meta["country"], {}).get("region", "other"),
            "regionLabel": region_names.get(countries.get(meta["country"], {}).get("region", "other"), ""),
        })
        universities_payload.append(item)
    universities_payload.sort(key=lambda x: (-x["solves"], x["name"]))

    countries_payload = []
    for name, profile in country_profiles.items():
        item = finish_profile(profile)
        item.update({
            "name": name, "label": countries.get(name, {}).get("es", name),
            "region": countries.get(name, {}).get("region", "other"),
            "regionLabel": region_names.get(countries.get(name, {}).get("region", "other"), ""),
        })
        countries_payload.append(item)
    countries_payload.sort(key=lambda x: (-x["solves"], x["name"]))

    regions_payload = []
    for code, profile in region_profiles.items():
        item = finish_profile(profile)
        item.update({"id": code, "label": code})
        regions_payload.append(item)

    teams_payload = []
    for key, profile in team_profiles.items():
        item = finish_profile(profile)
        item.update({
            "key": key,
            "name": profile.get("name", ""),
            "uni": profile.get("uni"),
            "uniName": profile.get("uniName", ""),
            "country": profile.get("country", ""),
            "countryLabel": profile.get("countryLabel", ""),
            "region": profile.get("region", "other"),
            "regionLabel": profile.get("regionLabel", ""),
        })
        teams_payload.append(item)
    teams_payload.sort(key=lambda x: (-x["solves"], x["name"]))

    quartile_payload = []
    for q in ("top10", "10-25", "25-50", "50-100"):
        item = quartiles[q]
        attempts = item["attemptsByLevel"]
        solves = item["solvesByLevel"]
        quartile_payload.append({
            "id": item["id"], "label": item["label"], "teams": item["teams"], "solves": item["solves"],
            "solvesPerTeam": round(item["solves"] / item["teams"], 2) if item["teams"] else None,
            "levels": item["levels"],
            "meanLevel": round(sum((i + 1) * n for i, n in enumerate(item["levels"])) / item["solves"], 2) if item["solves"] else None,
            "attemptsByLevel": attempts,
            "solvesByLevel": solves,
            "failureRate": [round((a - s) / a, 4) if a else None for a, s in zip(attempts, solves)],
            "areas": dict(item["areas"]), "techniques": dict(item["techniques"]), "burdens": dict(item["burdens"]),
        })

    technique_area = [
        {"technique": t, "area": a, "count": n}
        for (t, a), n in Counter((p["technique"], p["area"]) for p in problems).items()
    ]

    solved_areas = Counter()
    solved_techniques = Counter()
    solved_burdens = Counter()
    solved_levels = [0] * 6
    for problem in problems:
        solved = problem["solved"]
        solved_areas[problem["area"]] += solved
        solved_techniques[problem["technique"]] += solved
        solved_burdens[problem["burden"]] += solved
        solved_levels[problem["level"] - 1] += solved

    average_edition = {
        "year": "avg",
        "label": "Promedio 2011–2025",
        "problems": len(problems),
        "teams": len(team_rows),
        "levels": level_counts(problems),
        "meanLevel": round(sum(p["level"] for p in problems) / len(problems), 2),
        "areas": dict(area_counts),
        "techniques": dict(tech_counts),
        "tasks": dict(task_counts),
        "burdens": dict(burden_counts),
    }

    return {
        "scope": {"from": 2011, "to": 2025, "problems": len(problems),
                  "teams": len(team_rows), "editions": len(editions),
                  "firstSolveCoverage": sum(1 for problem in problems if problem["firstSolveOrder"] is not None)},
        "levels": [
            {"id": i, "level": l, "label": label, "min": low, "max": high, "definition": definition}
            for i, l, label, low, high, definition in COMPLEXITY_LEVELS
        ],
        "areas": [{"id": a, "label": area_label[a], "count": area_counts[a], "levels": area_levels[a]}
                  for a in sorted(area_label, key=lambda x: (-area_counts[x], area_label[x]))],
        "techniques": [{"id": t, "label": tech_label[t], "family": tech_family[t],
                        "count": tech_counts[t], "levels": tech_levels[t]}
                       for t in sorted(tech_label, key=lambda x: (-tech_counts[x], tech_label[x]))],
        "tasks": [{"id": t, "label": task_label[t], "count": task_counts[t]}
                  for t in sorted(task_label, key=lambda x: (-task_counts[x], task_label[x]))],
        "burdens": [{"id": b, "label": burden_label[b], "count": burden_counts[b]}
                    for b in ("low", "medium", "high")],
        "formats": [{"id": f, "label": format_label[f]} for f in format_label],
        "problems": sorted(problems, key=lambda p: (p["year"], p["letter"])),
        "editions": editions,
        "averageEdition": average_edition,
        "orderQuartiles": order_quartiles,
        "rankQuartiles": quartile_payload,
        "universities": universities_payload,
        "countries": countries_payload,
        "teams": teams_payload,
        "regions": regions_payload,
        "techniqueArea": technique_area,
        "totals": {
            "levels": level_counts(problems),
            "areas": dict(area_counts), "techniques": dict(tech_counts),
            "tasks": dict(task_counts), "burdens": dict(burden_counts),
            "solves": sum(p["solved"] for p in problems),
            "attempts": sum(p["attempts"] for p in problems),
            "solvedAreas": dict(solved_areas),
            "solvedTechniques": dict(solved_techniques),
            "solvedBurdens": dict(solved_burdens),
            "solvedLevels": solved_levels,
        },
    }



# --------------------------------------------------------------- statements

def statement_heading(line: str) -> str | None:
    """A section heading, tolerating the extra spacing of the PDF extractor."""
    compact = re.sub(r"\s+", " ", line).strip()
    if re.fullmatch(r"(?i)(input|output|note|notes|examples?|scoring|interaction|constraints)", compact):
        return compact
    if re.fullmatch(r"(?i)explanation(?: of sample \d+)?", compact):
        return compact
    if re.match(r"(?i)^explanation of sample \d+", compact):
        return compact.split(":", 1)[0].strip()
    if re.fullmatch(r"(?i)sample input(?: \d+)?(?: sample output(?: \d+)?)?", compact):
        return compact
    if re.fullmatch(r"(?i)sample output(?: \d+)?", compact):
        return compact
    if re.fullmatch(r"(?i)sample input.*sample input", compact):
        return compact
    if re.fullmatch(r"(?i)output for the sample input", compact):
        return compact
    return None
STATEMENT_NOISE = re.compile(r"(ICPC Foundation|Problem ID:|Picture from|World Finals \| ICPC|Annual hosted by ICPC World Championship)", re.IGNORECASE)
STATEMENT_HEADER = re.compile(
    r"^(ACM-ICPC World Finals|ICPC(?: \d{4})? World Finals|\d{4} World Finals|"
    r"ICPC World Championship|\d+(?:st|nd|rd|th) ICPC World Championship|\d+(?:st|nd|rd|th) Annual hosted by|"
    r"Problem [A-Z]:|Picture from|Figure [A-Z]\.\d+|St\. Petersburg|Rapid City|Championship AASTMT|ICPC World$)",
    re.IGNORECASE,
)
def statement_blocks(path: Path, title: str) -> list[dict]:
    """Turn an extracted PDF statement into small prose/preformatted blocks."""
    text = path.read_text(encoding="utf-8")
    if text.startswith("---"):
        parts = text.split("---", 2)
        text = parts[2] if len(parts) > 2 else text
    lines = [line.replace("\u00a0", " ").rstrip() for line in text.splitlines()]
    blocks: list[dict] = []
    paragraph: list[str] = []
    preformatted: list[str] = []
    mode = "prose"

    def flush_paragraph() -> None:
        nonlocal paragraph
        if not paragraph:
            return
        joined = " ".join(paragraph)
        joined = re.sub(r"(\w)-\s+(\w)", r"\1\2", joined)
        joined = re.sub(r"\s+", " ", joined).strip()
        if joined:
            blocks.append({"t": "p", "x": joined})
        paragraph = []

    def flush_preformatted() -> None:
        nonlocal preformatted
        if not preformatted:
            return
        joined = "\n".join(preformatted).strip("\n")
        if joined:
            blocks.append({"t": "pre", "x": joined})
        preformatted = []

    for raw in lines:
        compact = re.sub(r"\s+", " ", raw).strip()
        if not compact:
            if mode == "pre":
                preformatted.append("")
            else:
                flush_paragraph()
            continue
        # Page headers, footers, figure captions and repeated problem labels.
        if STATEMENT_NOISE.search(compact) or STATEMENT_HEADER.match(compact):
            continue
        if compact.startswith("# ") or re.fullmatch(r"Problem [A-Z]", compact):
            continue
        if re.match(r"^Time Limit:", compact, re.IGNORECASE):
            continue
        if title and compact.strip('"') == title:
            continue
        heading = statement_heading(compact)
        if heading:
            if mode == "pre":
                flush_preformatted()
            else:
                flush_paragraph()
            head, _, rest = compact.partition(":")
            head = re.sub(r"\s+", " ", head).strip()
            blocks.append({"t": "h", "x": head})
            if rest.strip():
                paragraph.append(rest.strip())
            is_sample = re.match(r"(?i)^(sample input|sample output|output for the sample input)", head)
            mode = "pre" if is_sample else "prose"
            continue
        if mode == "pre":
            preformatted.append(raw)
            continue
        if "•" in compact and len(compact) < 40 and len(re.findall(r"[a-z]{3}", compact)) <= 1:
            continue
        if len(compact) <= 22 and compact.islower() and not re.search(r"[.!?:;\d]", compact):
            continue
        # Short figure-axis fragments left by the PDF extractor.
        if len(compact) < 44 and not re.search(r"[a-z]{3}", compact):
            continue
        if len(re.findall(r"\d+", compact)) >= 4 and len(re.findall(r"[A-Za-z]{4,}", compact)) <= 2 and not re.search(r"[.!?:;]$", compact) and len(compact) < 110:
            continue
        paragraph.append(compact)
    if mode == "pre":
        flush_preformatted()
    else:
        flush_paragraph()
    return blocks


def build_complexity_search(complexity: dict) -> dict:
    """Compact complexity fingerprints for the global search cards."""
    area_label = {area["id"]: area["label"] for area in complexity["areas"]}
    tech_label = {tech["id"]: tech["label"] for tech in complexity["techniques"]}

    def compact(profile: dict) -> dict:
        areas = profile.get("areas", {})
        techniques = profile.get("techniques", {})
        area_total = sum(areas.values())
        tech_total = sum(techniques.values())
        top_areas = [
            {
                "label": area_label.get(area, area),
                "count": count,
                "share": round(100 * count / area_total, 1) if area_total else None,
            }
            for area, count in sorted(areas.items(), key=lambda item: (-item[1], area_label.get(item[0], item[0])))[:2]
        ]
        top_technique = None
        if techniques:
            tech, count = sorted(techniques.items(), key=lambda item: (-item[1], tech_label.get(item[0], item[0])))[0]
            top_technique = {
                "label": tech_label.get(tech, tech),
                "count": count,
                "share": round(100 * count / tech_total, 1) if tech_total else None,
            }
        return {
            "meanLevel": profile.get("meanLevel"),
            "levels": profile.get("levels", [0] * 6),
            "solves": profile.get("solves", 0),
            "topAreas": top_areas,
            "topTechnique": top_technique,
        }

    index = {}
    for university in complexity.get("universities", []):
        index[f"u:{university['id']}"] = compact(university)
    for country in complexity.get("countries", []):
        index[f"c:{country['name']}"] = compact(country)
    for team in complexity.get("teams", []):
        index[f"t:{team['key']}"] = compact(team)
    for region in complexity.get("regions", []):
        index[f"r:{region['id']}"] = compact(region)
    return index


def build_problem_statements(complexity: dict) -> dict:
    """Attach the official statement to every problem in the 2011-2025 window."""
    statements = {}
    for problem in complexity["problems"]:
        path = SOURCES / "problems" / str(problem["year"]) / f"{problem['letter']}.md"
        if not path.exists():
            continue
        blocks = statement_blocks(path, problem["title"])
        if blocks:
            statements[problem["id"]] = {
                "blocks": blocks,
                "chars": sum(len(block["x"]) for block in blocks),
            }
    return statements



# --------------------------------------------------------------- Cuba x complexity

def build_cuba_complexity(complexity: dict, cuba: dict) -> dict:
    """Cross the 2011-2025 scoreboard matrix with the taxonomy, Cuba only."""
    problems = {problem["id"]: problem for problem in complexity["problems"]}
    area_label = {area["id"]: area["label"] for area in complexity["areas"]}
    tech_label = {technique["id"]: technique["label"] for technique in complexity["techniques"]}
    matrix = [row for row in read_curated_csv("scoreboard-matrix.csv") if 2011 <= int(row["year"]) <= 2025]
    cuba_rows = [row for row in matrix if row["country"] == "Cuba"]

    field_levels = {level: {"rows": 0, "attempted": 0, "solved": 0} for level in range(1, 7)}
    for row in matrix:
        problem = problems[f'wf-{row["year"]}-{row["letter"].lower()}']
        stats = field_levels[problem["level"]]
        stats["rows"] += 1
        stats["attempted"] += 1 if int(row["attempts"] or 0) > 0 else 0
        stats["solved"] += 1 if int(row["solved"] or 0) > 0 else 0

    by_problem = defaultdict(lambda: {"teams": 0, "solved": 0, "attempts": 0})
    level_stats = {level: {"rows": 0, "attempted": 0, "solved": 0} for level in range(1, 7)}
    area_stats = defaultdict(lambda: {"rows": 0, "attempted": 0, "solved": 0})
    tech_stats = defaultdict(lambda: {"rows": 0, "attempted": 0, "solved": 0})
    solved_problem_ids = set()
    attempted_problem_ids = set()

    for row in cuba_rows:
        problem = problems[f'wf-{row["year"]}-{row["letter"].lower()}']
        solved = int(row["solved"] or 0)
        attempts = int(row["attempts"] or 0)
        target = by_problem[problem["id"]]
        target["teams"] += 1
        target["solved"] += solved
        target["attempts"] += attempts
        for stats in (level_stats[problem["level"]], area_stats[problem["area"]], tech_stats[problem["technique"]]):
            stats["rows"] += 1
            stats["attempted"] += 1 if attempts > 0 else 0
            stats["solved"] += 1 if solved > 0 else 0
        if solved:
            solved_problem_ids.add(problem["id"])
        if attempts:
            attempted_problem_ids.add(problem["id"])

    total_solves = sum(problem["solved"] for problem in complexity["problems"])
    cuba_total_solves = sum(stats["solved"] for stats in level_stats.values())

    def rate(value: int, total: int) -> float | None:
        return round(value / total, 4) if total else None

    def problem_payload(problem: dict) -> dict:
        stats = by_problem.get(problem["id"], {"teams": 0, "solved": 0, "attempts": 0})
        status = "solved" if stats["solved"] else "attempted" if stats["attempts"] else "not-attempted"
        return {
            "id": problem["id"], "year": problem["year"], "letter": problem["letter"],
            "title": problem["title"], "level": problem["level"], "levelLabel": problem["levelLabel"],
            "area": problem["area"], "areaLabel": area_label.get(problem["area"], problem["area"]),
            "technique": problem["technique"], "techniqueLabel": tech_label.get(problem["technique"], problem["technique"]),
            "fieldRate": problem["solveRate"], "fieldSolved": problem["solved"], "fieldTeams": problem["teams"],
            "cubaTeams": stats["teams"], "cubaSolved": stats["solved"], "cubaAttempts": stats["attempts"],
            "status": status,
        }

    problems_payload = [problem_payload(problem) for problem in complexity["problems"]]
    muros = sorted(
        (problem for problem in problems_payload if problem["status"] == "attempted"),
        key=lambda problem: (-problem["fieldRate"], problem["year"], problem["letter"]),
    )
    untried = sorted(
        (problem for problem in problems_payload if problem["status"] == "not-attempted"),
        key=lambda problem: (-problem["fieldRate"], problem["year"], problem["letter"]),
    )

    levels_payload = []
    for level in complexity["levels"]:
        stats = level_stats[level["level"]]
        field = field_levels[level["level"]]
        levels_payload.append({
            "level": level["level"], "label": level["label"],
            "range": f"{round(100 * level['min'])}–{round(100 * level['max'])}%",
            "solves": stats["solved"], "teamProblemRows": stats["rows"], "attemptedRows": stats["attempted"],
            "attemptRate": rate(stats["attempted"], stats["rows"]),
            "solveRate": rate(stats["solved"], stats["rows"]),
            "conditionalSolveRate": rate(stats["solved"], stats["attempted"]),
            "fieldAttemptRate": rate(field["attempted"], field["rows"]),
            "fieldConditionalSolveRate": rate(field["solved"], field["attempted"]),
        })

    def dimension_payload(items: list[dict], stats_by_id: dict, field_totals: dict, label_map: dict) -> list[dict]:
        rows = []
        for item in items:
            stats = stats_by_id[item["id"]]
            cuba_share = stats["solved"] / cuba_total_solves if cuba_total_solves else 0
            field_share = (field_totals.get(item["id"], 0) / total_solves) if total_solves else 0
            rows.append({
                "id": item["id"], "label": label_map.get(item["id"], item["id"]), "count": item["count"],
                "solves": stats["solved"], "teamProblemRows": stats["rows"], "attemptedRows": stats["attempted"],
                "attemptRate": rate(stats["attempted"], stats["rows"]),
                "solveRate": rate(stats["solved"], stats["rows"]),
                "conditionalSolveRate": rate(stats["solved"], stats["attempted"]),
                "cubaShare": round(cuba_share, 4), "fieldShare": round(field_share, 4),
                "specialization": round(cuba_share - field_share, 4),
            })
        return sorted(rows, key=lambda row: (-row["solves"], row["label"]))

    areas_payload = dimension_payload(complexity["areas"], area_stats, complexity["totals"]["solvedAreas"], area_label)
    techniques_payload = dimension_payload(complexity["techniques"], tech_stats, complexity["totals"]["solvedTechniques"], tech_label)

    cuba_by_year = defaultdict(list)
    for row in cuba_rows:
        cuba_by_year[int(row["year"])].append(row)
    cuba_field = {row["year"]: row for row in cuba["field"]}
    editions_payload = []
    for edition in complexity["editions"]:
        rows = cuba_by_year.get(edition["year"], [])
        if not rows:
            continue
        levels = [0] * 6
        for row in rows:
            problem = problems[f'wf-{row["year"]}-{row["letter"].lower()}']
            levels[problem["level"] - 1] += int(row["solved"] or 0)
        field = cuba_field.get(edition["year"], {})
        editions_payload.append({
            "year": edition["year"], "teams": len({(row["university"], row["team"]) for row in rows}),
            "solves": sum(levels), "levels": levels,
            "teamProblemRows": len(rows), "attemptedRows": sum(1 for row in rows if int(row["attempts"] or 0) > 0),
            "meanLevel": edition["meanLevel"], "fieldSize": field.get("field"),
            "cubaBestPct": field.get("cubaBestPct"), "cubaBestRank": field.get("cubaBestRank"),
            "cubaBestSolved": field.get("cubaBestSolved"),
        })

    university_rows = defaultdict(list)
    for row in cuba_rows:
        university_rows[row["university"]].append(row)
    universities_payload = []
    for university in complexity["universities"]:
        if university["country"] != "Cuba":
            continue
        rows = university_rows.get(university["name"], [])
        solved_ids = {
            f'wf-{row["year"]}-{row["letter"].lower()}'
            for row in rows if int(row["solved"] or 0) > 0
        }
        attempted_ids = {
            f'wf-{row["year"]}-{row["letter"].lower()}'
            for row in rows if int(row["attempts"] or 0) > 0
        }
        top_area = max(university["areas"].items(), key=lambda item: item[1])[0] if university["areas"] else None
        top_technique = max(university["techniques"].items(), key=lambda item: item[1])[0] if university["techniques"] else None
        item = dict(university)
        item.update({
            "share": round(university["solves"] / cuba_total_solves, 4) if cuba_total_solves else 0,
            "solvedProblems": len(solved_ids), "attemptedProblems": len(attempted_ids),
            "topArea": top_area, "topAreaLabel": area_label.get(top_area, top_area) if top_area else None,
            "topTechnique": top_technique, "topTechniqueLabel": tech_label.get(top_technique, top_technique) if top_technique else None,
        })
        universities_payload.append(item)
    universities_payload.sort(key=lambda university: (-university["solves"], university["name"]))

    cuba_country = next(country for country in complexity["countries"] if country["name"] == "Cuba")

    def profile_vector(entity: dict) -> list[float]:
        total = entity["solves"] or 1
        areas = [
            entity["areas"].get(area["id"], 0) / total - complexity["totals"]["solvedAreas"].get(area["id"], 0) / total_solves
            for area in complexity["areas"]
        ]
        techniques = [
            entity["techniques"].get(technique["id"], 0) / total - complexity["totals"]["solvedTechniques"].get(technique["id"], 0) / total_solves
            for technique in complexity["techniques"]
        ]
        return areas + techniques

    def similarity(left: list[float], right: list[float]) -> float:
        distance = sum(abs(a - b) for a, b in zip(left, right)) / 2
        return max(0.0, min(1.0, 1 - distance))

    cuba_vector = profile_vector(cuba_country)
    similar_countries = []
    for country in complexity["countries"]:
        if country["name"] == "Cuba" or country["solves"] < 20:
            continue
        similar_countries.append({
            "name": country["name"], "label": country["label"], "solves": country["solves"],
            "meanLevel": country["meanLevel"], "levels": country["levels"],
            "similarity": round(similarity(cuba_vector, profile_vector(country)), 4),
        })
    similar_countries.sort(key=lambda country: -country["similarity"])

    first_rows = []
    by_team = defaultdict(list)
    for row in cuba_rows:
        if int(row["solved"] or 0) and row["time_min"].strip():
            problem = problems[f'wf-{row["year"]}-{row["letter"].lower()}']
            by_team[(int(row["year"]), row["university"], row["team"])].append((float(row["time_min"]), problem))
    for (year, university, team), items in by_team.items():
        time_min, problem = min(items, key=lambda item: item[0])
        first_rows.append({
            "year": year, "university": university, "team": team, "timeMin": time_min,
            "letter": problem["letter"], "title": problem["title"], "level": problem["level"],
            "area": problem["area"], "areaLabel": area_label.get(problem["area"], problem["area"]),
            "technique": problem["technique"],
        })
    first_rows.sort(key=lambda row: (row["year"], row["university"], row["team"]))
    first_by_level = [0] * 6
    first_by_area = Counter()
    for row in first_rows:
        first_by_level[row["level"] - 1] += 1
        first_by_area[row["area"]] += 1

    comparison = [
        {"label": "Cuba", "levels": cuba_country["levels"], "total": cuba_country["solves"]},
        {"label": "Latinoamérica", "levels": next(region["levels"] for region in complexity["regions"] if region["id"] == "la"),
         "total": next(region["solves"] for region in complexity["regions"] if region["id"] == "la")},
        {"label": "Mundo", "levels": complexity["totals"]["solvedLevels"], "total": total_solves},
    ]

    edition_2025 = next((edition for edition in complexity["editions"] if edition["year"] == 2025), None)
    field_2025 = cuba_field.get(2025, {})
    rows_2025 = cuba_by_year.get(2025, [])
    levels_2025 = [0] * 6
    for row in rows_2025:
        problem = problems[f'wf-2025-{row["letter"].lower()}']
        levels_2025[problem["level"] - 1] += int(row["solved"] or 0)

    return {
        "scope": {
            "from": 2011, "to": 2025, "editions": len(editions_payload),
            "teamEditions": len({(row["year"], row["university"], row["team"]) for row in cuba_rows}),
            "problems": len(problems), "solves": cuba_total_solves,
            "solvedProblems": len(solved_problem_ids), "attemptedProblems": len(attempted_problem_ids),
            "walls": len(muros), "untried": len(untried),
        },
        "totals": {
            "teamProblemRows": len(cuba_rows),
            "attemptedRows": sum(1 for row in cuba_rows if int(row["attempts"] or 0) > 0),
            "solvedRows": sum(1 for row in cuba_rows if int(row["solved"] or 0) > 0),
            "attempts": sum(int(row["attempts"] or 0) for row in cuba_rows),
            "solves": cuba_total_solves,
            "levels": [level_stats[level]["solved"] for level in range(1, 7)],
        },
        "levels": levels_payload,
        "areas": areas_payload,
        "techniques": techniques_payload,
        "editions": editions_payload,
        "problems": problems_payload,
        "muros": muros,
        "untried": untried,
        "universities": universities_payload,
        "similarCountries": similar_countries[:5],
        "comparison": comparison,
        "firstSolve": {
            "teams": len(first_rows), "byLevel": first_by_level,
            "byArea": dict(first_by_area), "rows": first_rows,
        },
        "callout2025": {
            "year": 2025, "meanLevel": edition_2025["meanLevel"] if edition_2025 else None,
            "cubaBestPct": field_2025.get("cubaBestPct"), "cubaBestRank": field_2025.get("cubaBestRank"),
            "fieldSize": field_2025.get("field"), "teams": len({(row["university"], row["team"]) for row in rows_2025}),
            "solves": sum(levels_2025), "levels": levels_2025,
            "attemptedRows": sum(1 for row in rows_2025 if int(row["attempts"] or 0) > 0),
        },
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


def write_sedes_csv(sedes: dict) -> None:
    with (OUT / "sedes.csv").open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["year", "city", "country", "host", "date", "teams", "countries", "problems",
                         "champion", "host_country_teams", "host_country_mean_pct", "host_country_medals",
                         "host_university", "host_university_rank"])
        for row in sedes["finals"]:
            host = row["hostUniversity"] or {}
            writer.writerow([
                row["year"], row["city"], row["country"], row["host"], row["date"], row["teams"],
                row["countries"], row["problems"], row["champion"]["uniName"] if row["champion"] else "",
                row["hostCountry"]["teams"], row["hostCountry"]["meanPct"], row["hostCountry"]["medals"],
                host.get("name", ""), host.get("rank", ""),
            ])


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
    ("complejidad", "Complejidad", "Difficulty, topics, problem statements and university/country specialization in the World Finals, 2011–2025."),
    ("medallas", "Medallas", "Medal tables by university and country, with the medals actually awarded."),
    ("competidores", "Competidores", "People with the most finals and the most medals."),
    ("predicciones", "Predicciones", "Probability of each place in the next final from a Bayesian model over past finals and Codeforces team ratings, with a backtest."),
    ("sedes", "Sedes", "Every World Finals host city, its host country, its champion and the local performance."),
    ("comparar", "Comparar", "Head-to-head comparison of universities, countries or teams, including solved problems, difficulty levels and topics."),
    ("pais", "País", "Profile of one country: history, similar countries, projection and teams."),
    ("universidad", "Universidad", "Profile of one university: history, similar teams, projection and members."),
    ("cuba", "Cuba", "The Cuban slice: 16 finals, 26 teams, field gaps, Latin-American podiums, people, gender aggregates, records and the 2026 projection."),
    ("datos", "Datos y método", "Sources, definitions, downloads and known limits."),
]


def _best_area(profile: dict, area_label: dict, solved_areas: dict, global_total: int) -> str:
    total = profile.get("solves") or 1
    scored = []
    for area, count in (profile.get("areas") or {}).items():
        expected = (solved_areas.get(area) or 0) / (global_total or 1)
        scored.append((count / total - expected, area))
    if not scored:
        return "—"
    diff, area = max(scored)
    return f"{area_label.get(area, area)} ({diff * 100:+.1f} pp)"


def _pct(value: float | None) -> str:
    return "—" if value is None else f"{round(100 * value)}%"


def cuba_complexity_markdown(payload: dict | None, table_fn) -> str:
    if not payload:
        return "Dificultad 2011–2025: datos no disponibles."
    scope = payload["scope"]
    callout = payload["callout2025"]
    parts = [
        f"## Dificultad 2011–2025\n\n"
        f"{scope['teamEditions']} equipos-edición, {scope['solves']} problemas resueltos, "
        f"{scope['solvedProblems']} problemas distintos con al menos un solve cubano, "
        f"{scope['walls']} muros (intentados y no resueltos) y {scope['untried']} no intentados. "
        "El equipo de 2010 queda fuera porque la taxonomía empieza en 2011.",
        table_fn(["Nivel", "Resueltos", "Intenta", "Convierte", "Campo intenta", "Campo convierte"], [
            [f"N{l['level']} · {l['label']}", l["solves"], _pct(l["attemptRate"]), _pct(l["conditionalSolveRate"]),
             _pct(l["fieldAttemptRate"]), _pct(l["fieldConditionalSolveRate"])]
            for l in payload["levels"]]),
        table_fn(["Área", "Resueltos", "Intenta", "Convierte", "Especialización"], [
            [a["label"], a["solves"], _pct(a["attemptRate"]), _pct(a["conditionalSolveRate"]),
             f"{a['specialization'] * 100:+.1f} pp"] for a in payload["areas"][:10]]),
        table_fn(["Universidad", "Resueltos", "Nivel medio", "N1", "N2", "N3", "N4", "N5", "N6"], [
            [u["name"], u["solves"], u["meanLevel"], *u["levels"]] for u in payload["universities"]]),
        "Muros: problemas que Cuba intentó y no resolvió, ordenados por la tasa del campo.",
        table_fn(["Problema", "Edición", "Nivel", "Área", "Tasa campo", "Intentos Cuba"], [
            [m["title"], f'{m["year"]} {m["letter"]}', f'N{m["level"]}', m["areaLabel"],
             _pct(m["fieldRate"]), m["cubaAttempts"]] for m in payload["muros"][:10]]),
        "No intentados: problemas que el campo resolvió y Cuba no envió. No implica que no los haya leído; "
        "puede ser tiempo, prioridad o estrategia.",
        table_fn(["Problema", "Edición", "Nivel", "Área", "Tasa campo"], [
            [m["title"], f'{m["year"]} {m["letter"]}', f'N{m["level"]}', m["areaLabel"], _pct(m["fieldRate"])]
            for m in payload["untried"][:8]]),
        f"2025: final más abierta del período (nivel medio {callout['meanLevel']}), peor resultado cubano "
        f"({callout['cubaBestRank']}.º de {callout['fieldSize']}, percentil {callout['cubaBestPct']}). "
        f"Cuba intentó {callout['attemptedRows']} problemas y resolvió {callout['solves']}.",
    ]
    return "\n\n".join(parts)


def write_markdown_twins(universities: list[dict], countries: dict, predictions: dict, years: list[int], cuba: dict, sedes: dict, complexity: dict, cuba_complexity: dict | None = None) -> None:
    """One Markdown twin per page plus llms.txt, regenerated on every build."""
    area_label = {a["id"]: a["label"] for a in (complexity or {}).get("areas", [])}
    tech_label = {t["id"]: t["label"] for t in (complexity or {}).get("techniques", [])}
    task_label = {t["id"]: t["label"] for t in (complexity or {}).get("tasks", [])}
    solved_areas = (complexity or {}).get("totals", {}).get("solvedAreas", {})
    global_solves = (complexity or {}).get("totals", {}).get("solves", 1)

    def best_area(profile: dict) -> str:
        return _best_area(profile, area_label, solved_areas, global_solves)

    friction_traps, friction_walls = [], []
    if complexity:
        rates = [problem["solveRate"] * 100 for problem in complexity["problems"]]
        failed = [problem["failedPerTeam"] or 0 for problem in complexity["problems"]]
        rate_median = statistics.median(rates)
        failed_median = statistics.median(failed)
        ranked = sorted(complexity["problems"], key=lambda problem: problem["failedPerTeam"] or 0, reverse=True)
        friction_traps = [problem for problem in ranked if problem["solveRate"] * 100 >= rate_median and (problem["failedPerTeam"] or 0) >= failed_median][:5]
        friction_walls = [problem for problem in ranked if problem["solveRate"] * 100 < rate_median and (problem["failedPerTeam"] or 0) >= failed_median][:5]

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
        "comparar": "The comparison page reads `data/core.json` and `data/complexity.json`; its URL takes repeated `?u=<id>`, `?c=<name>` or `?t=<university>|<team>` parameters. Complexity and topics cover 2011–2025.",
        "pais": "The page takes `?c=<country name in English>`; `data/core.json` holds the same results.",
        "universidad": "The page takes `?u=<university id>`; ids and results are in `data/core.json`.",
        "equipo": "The page takes `?u=<university id>&t=<team name>`; results are in `data/core.json`.",
        "sedes": "\n\n".join([
            "World Finals venues, 1999–2025. A country can host more than once; the host country and host university are shown.",
            table(["Year", "City", "Country", "Host", "Teams", "Countries", "Champion"], [
                [r["year"], r["city"], r["es"], r["host"], r["teams"], r["countries"],
                 r["champion"]["uniName"] if r["champion"] else ""]
                for r in sedes["finals"]]),
            "Host country at home and away:",
            table(["Country", "Hosted", "Home teams", "Home percentile", "Away percentile", "Difference"], [
                [r["es"], r["hosted"], r["home"]["teams"], r["home"]["meanPct"], r["away"]["meanPct"], r["deltaPct"]]
                for r in sedes["countries"]]),
            "Host universities that competed in their own final:",
            table(["Year", "City", "University", "Rank", "Team"], [
                [r["year"], r["city"], r["hostUniversity"]["name"], r["hostUniversity"]["rank"], r["hostUniversity"]["team"]]
                for r in sedes["finals"] if r["hostUniversity"] and r["hostUniversity"]["competed"]]),
        ]),
        "cuba": "\n\n".join([
            "Every Cuban team in the World Finals, 2010–2025.",
            table(["Year", "University", "Team", "Rank", "Teams in final", "Percentile", "Solved", "Time", "Group"], [
                [r["year"], r["uniName"], r["team"], r["rank"], r["field"], r["pct"], r["solved"], r["time"],
                 f'{r["group"]["position"]}/{r["group"]["size"]}' if r.get("group") else ""]
                for r in cuba["teams"]]),
            "Podium by team: the three best Latin-American teams in each final. "
            "A country can take more than one place; Cuba's best team place is shown.",
            table(["Year", "LatAm teams", "Cuba teams", "1.º", "2.º", "3.º", "Cuba best place"], [
                [r["year"], r["latamTeams"], r["cubaTeams"],
                 *[f'{t["es"]} · {t["uniName"]} ({t["rank"]})' for t in r["top"]],
                 r["cubaPlace"] if r["cubaPlace"] else "—"]
                for r in cuba["podiums"]["years"]]),
            f'Gender, aggregate only: {cuba["gender"]["women"]} women and {cuba["gender"]["men"]} men; '
            f'{cuba["gender"]["womenSlots"]} of {cuba["totals"]["slots"]} slots; '
            f'{cuba["gender"]["teamsWithWomen"]} of {cuba["totals"]["teams"]} teams. '
            "No individual gender labels are published.",
            f'2026 projection: {cuba["projection"]["country"].get("rank")} '
            f'({cuba["projection"]["country"].get("rank_best")}–{cuba["projection"]["country"].get("rank_worst")}) '
            f'of {cuba["projection"]["field"]}, percentile {cuba["projection"]["country"].get("pct")}.',
            cuba_complexity_markdown(cuba_complexity, table),
        ]),
        "complejidad": "Datos de complejidad no disponibles. Ejecuta `make data` con los archivos de `data/curated/`." if complexity is None else "\n\n".join([
            "Esta página cubre solo las finales de **2011 a 2025**: 15 ediciones, 179 problemas y 1.893 equipos-edición. "
            "Quedan fuera 2008–2010. La versión HTML incluye buscador de problemas, universidades y países, "
            "fichas con el enunciado y un comparador de ediciones.",
            "## Categorías N1–N6",
            "Se calculan con la tasa de resolución de cada problema en su final: equipos que lo resolvieron / equipos que participaron. "
            "Los nombres son la lectura principal; el número es una etiqueta.",
            table(["Nivel", "Nombre", "Rango", "Definición", "Problemas"], [
                [f"N{l['level']}", l["label"], f"{round(100*l['min'])}–{round(100*l['max'])}%", l["definition"], c]
                for l, c in zip(complexity["levels"], complexity["totals"]["levels"])]),
            "## Áreas y técnicas",
            "Un problema puede tener varias etiquetas; los gráficos y estas tablas usan la primaria. "
            "El área es el objeto del problema; la técnica es la herramienta. Las estructuras de datos son técnicas, no áreas.",
            table(["Área", "Problemas", "% N5–N6"], [
                [a["label"], a["count"], round(100 * (a["levels"][4] + a["levels"][5]) / a["count"]) if a["count"] else 0]
                for a in complexity["areas"][:12]]),
            table(["Técnica", "Problemas", "% N5–N6"], [
                [t["label"], t["count"], round(100 * (t["levels"][4] + t["levels"][5]) / t["count"]) if t["count"] else 0]
                for t in complexity["techniques"][:15]]),
            "## Ediciones",
            table(["Edición", "Problemas", "Nivel medio", "N1", "N2", "N3", "N4", "N5", "N6"], [
                [e["year"], e["problems"], e["meanLevel"], *e["levels"]] for e in complexity["editions"]]),
            "## Fricción",
            "Trampa: tasa por encima de la mediana pero muchos intentos fallidos. Muro: tasa por debajo de la mediana y muchos fallos.",
            table(["Tipo", "Problema", "Edición", "Nivel", "Tasa", "Fallidos/equipo", "Int./res."], [
                *[["Trampa", p["title"], f'{p["year"]} {p["letter"]}', f'N{p["level"]}', f'{round(100*p["solveRate"])}%', p["failedPerTeam"], p["attemptsPerSolve"]] for p in friction_traps],
                *[["Muro", p["title"], f'{p["year"]} {p["letter"]}', f'N{p["level"]}', f'{round(100*p["solveRate"])}%', p["failedPerTeam"], p["attemptsPerSolve"]] for p in friction_walls],
            ]),
            "## Cuartiles",
            table(["Cuartil", "Equipos-edición", "Resueltos/equipo", "Nivel medio"], [
                [q["label"], q["teams"], q["solvesPerTeam"], q["meanLevel"]] for q in complexity["rankQuartiles"]]),
            "## Orden de ataque",
            "Q1 = problemas que se resolvieron primero; Q4 = últimos primeros-solves. El orden usa el minuto del primer solve de cada problema; no se muestran curvas por minuto.",
            table(["Cuartil", "Problemas", "Tasa media", "Nivel medio", "Int./res."], [
                [q["label"], q["count"], f'{round(100*q["meanSolveRate"])}%', q["meanLevel"], q["meanAttemptsPerSolve"]]
                for q in complexity["orderQuartiles"]]),
            table(["Edición", "Primero en resolverse", "Último en resolverse"], [
                [e["year"],
                 f'{e["firstBlood"]["letter"]} · {e["firstBlood"]["title"]} (N{e["firstBlood"]["level"]}, {round(100*e["firstBlood"]["solveRate"])}%)' if e["firstBlood"] else "—",
                 f'{e["lastBlood"]["letter"]} · {e["lastBlood"]["title"]} (N{e["lastBlood"]["level"]}, {round(100*e["lastBlood"]["solveRate"])}%)' if e["lastBlood"] else "—"]
                for e in complexity["editions"]]),
            "## Técnica × área",
            table(["Técnica", "Área", "Problemas"], [
                [tech_label[pair["technique"]], area_label[pair["area"]], pair["count"]]
                for pair in sorted(complexity["techniqueArea"], key=lambda pair: pair["count"], reverse=True)[:10]]),
            "## Universidades y países",
            "Especialización relativa: diferencia entre el porcentaje observado de problemas resueltos y el esperado por el perfil global, "
            "en puntos porcentuales. La tabla muestra la mayor fortaleza de cada entidad.",
            table(["Universidad", "País", "Equipos-edición", "Resueltos", "Nivel medio", "Mayor fortaleza"], [
                [u["name"], u["countryLabel"], u["editions"], u["solves"], u["meanLevel"], best_area(u)]
                for u in complexity["universities"][:10]]),
            table(["País", "Equipos-edición", "Resueltos", "Nivel medio", "Mayor fortaleza"], [
                [c["label"], c["editions"], c["solves"], c["meanLevel"], best_area(c)]
                for c in complexity["countries"][:10]]),
            "## Problemas",
            table(["Problema", "Edición", "Nivel", "Área", "Técnica", "Tarea", "Tasa"], [
                [p["title"], f'{p["year"]} {p["letter"]}', f'N{p["level"]}', area_label[p["area"]],
                 tech_label[p["technique"]], task_label[p["task"]], f'{round(100*p["solveRate"])}%']
                for p in complexity["problems"]]),
            "## Metodología",
            "**Categorías.** N1 Abierto (80–100%), N2 Accesible (60–80%), N3 Intermedio (40–60%), "
            "N4 Exigente (20–40%), N5 Duro (10–20%), N6 Excepcional (0–10%). N6 no significa imposible: "
            "mide que menos del 10% de los equipos lo resolvió.",
            "**Taxonomía.** Área (objeto), técnica (herramienta), tarea (optimizar, contar, decidir, construir, calcular, simular), "
            "carga de implementación (baja, media, alta; revisión manual) y formato. Es multi-etiqueta: una primaria y cero o más secundarias.",
            "**Índices.** Tasa de resolución = resueltos / equipos. Fallidos por equipo = (intentos − resueltos) / equipos. "
            "Intentos por resuelto = intentos / resueltos. Orden de primera solución = posición según el minuto del primer solve dentro de su final; "
            "se usa solo para ordenar y no se muestran curvas por minuto. "
            "Nivel medio = promedio de N1–N6 de los problemas resueltos (o de la final). "
            "Especialización = % observado − % esperado global, en puntos porcentuales. "
            "Cuartiles = puesto / tamaño del campo: top 10%, 10–25%, 25–50%, 50–100%.",
            "**Fuentes y límites.** Scoreboard matrix 2011–2025 (zibada y Kattis, verificado contra core.json), "
            "taxonomía v1 revisada, dificultad por problema y enunciados extraídos de los PDF oficiales. "
            "El scoreboard es por equipo, no por miembro; la carga es manual; cada final tiene 11–15 problemas. "
            "No se usan curvas por minuto; el minuto del primer solve solo ordena los problemas. "
            "20 de 179 problemas no tienen primera solución registrada.",
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
        f"- [sedes.json]({SITE_URL}/data/sedes.json): every World Finals venue, host country and local performance.\n"
        f"- [sedes.csv]({SITE_URL}/data/sedes.csv): one row per World Finals venue.\n"
        f"- [cuba.json]({SITE_URL}/data/cuba.json): the Cuban slice: teams, field gaps, Latin-American podiums, people, gender aggregates, records and projection.\n"
        f"- [complexity.json]({SITE_URL}/data/complexity.json): problem-level difficulty, multi-label topics, editions and university/country/team profiles, 2011–2025.\n"
        f"- [complexity-search.json]({SITE_URL}/data/complexity-search.json): compact complexity fingerprints used by the global search.\n"
        f"- [problem-statements.json]({SITE_URL}/data/problem-statements.json): extracted statements for the 2011–2025 problems.\n"
        f"- [cuba-complexity.json]({SITE_URL}/data/cuba-complexity.json): Cuba's 2011–2025 difficulty, attempts, walls, universities and practice gaps.\n"
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
        "logos": load_logos(),
        "universities": universities,
    }
    cuba = build_cuba(universities, countries, predictions, problems)
    sedes = build_sedes(universities, countries, problems)
    write_json("core.json", core)
    write_json("predictions.json", predictions)
    write_json("world.json", build_world())
    write_json("cuba.json", cuba)
    write_json("cuba-map.json", build_cuba_map())
    write_json("sedes.json", sedes)
    write_csv(universities, countries)
    write_cuba_csv(cuba)
    write_sedes_csv(sedes)
    try:
        complexity = build_complexity(universities, countries, region_names)
        write_json("complexity.json", complexity)
        write_json("complexity-search.json", build_complexity_search(complexity))
        try:
            write_json("problem-statements.json", build_problem_statements(complexity))
        except Exception as exc:
            print(f"statements skipped: {exc}")
        try:
            cuba_complexity = build_cuba_complexity(complexity, cuba)
            write_json("cuba-complexity.json", cuba_complexity)
        except Exception as exc:
            print(f"cuba complexity skipped: {exc}")
            cuba_complexity = None
    except Exception as exc:
        print(f"complexity skipped: {exc}")
        (OUT / "complexity-search.json").unlink(missing_ok=True)
        complexity = None
        cuba_complexity = None
    write_markdown_twins(universities, countries, predictions, years, cuba, sedes, complexity, cuba_complexity)
    return {"core": core, "predictions": predictions, "cuba": cuba, "sedes": sedes, "complexity": complexity, "cuba_complexity": cuba_complexity}


if __name__ == "__main__":
    result = build()
    core, predictions, cuba = result["core"], result["predictions"], result["cuba"]
    print(f"{len(core['years'])} finals, {len(core['universities'])} universities, "
          f"{sum(len(u['results']) for u in core['universities'])} results, "
          f"{len(predictions['teams'])} projected teams, "
          f"Cuba {cuba['totals']['teams']} teams / {cuba['totals']['podiums']} podiums, "
          f"champion backtest {predictions['backtest']['with_rosters']['champion']} "
          f"vs finals only {predictions['backtest']['finals_only']['champion']}")
