"""The published data must keep its shape and its facts."""
import csv
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import build_data  # noqa: E402


@pytest.fixture(scope="session")
def built():
    return build_data.build()


@pytest.mark.parametrize("position, expected", [("1", 1), ("103 - 122", 112.5), ("finalist", None)])
def test_parse_rank(position, expected):
    assert build_data.parse_rank(position) == expected


def medals_of(built, year):
    rows = [r for u in built["core"]["universities"] for r in u["results"] if r["year"] == year]
    return [sum(r["medal"] == m for r in rows) for m in ("gold", "silver", "bronze")]


def test_medals_are_the_ones_awarded(built):
    assert medals_of(built, 2025) == [4, 4, 4]
    assert medals_of(built, 2009) == [4, 4, 5]
    assert medals_of(built, 1999) == [1, 1, 8]


def test_qualified_only_teams_are_not_published(built):
    assert build_data.parse_rank("qualified") is None
    finals = json.loads((build_data.SOURCES / "cphof-1999-2025.json").read_text())
    qualified = sum(r["position"] == "qualified" for f in finals.values() for r in f["rows"])
    total = sum(len(f["rows"]) for f in finals.values())
    assert qualified > 0
    assert sum(len(u["results"]) for u in built["core"]["universities"]) == total - qualified


def test_percentile_ends():
    assert build_data.percentile(1, 100) == 100
    assert build_data.percentile(100, 100) == 0
    assert build_data.percentile(None, 100) is None


def test_fold_joins_spelling_variants():
    assert build_data.fold("Moscow Institute of Physics & Technology") == build_data.fold("Moscow institute of physics and technology")
    assert build_data.fold("Universidad de Córdoba") == build_data.fold("universidad de cordoba")


def test_every_team_of_every_final_is_published(built):
    core = built["core"]
    assert core["years"] == list(range(1999, 2026))
    for year in core["years"]:
        published = sum(1 for u in core["universities"] for r in u["results"] if r["year"] == year)
        assert published == core["field"][str(year)]


def test_known_champions(built):
    uni_of = {r["year"]: u["name"] for u in built["core"]["universities"] for r in u["results"] if r["rank"] == 1}
    assert uni_of[1999] == "University of Waterloo"
    assert uni_of[2006] == "Saratov State University"
    assert uni_of[2025] == "St. Petersburg State University"


def test_spelling_variants_merge_into_one_university(built):
    names = [u["name"] for u in built["core"]["universities"]]
    assert sum(1 for n in names if build_data.fold(n) == "moscow institute of physics and technology") == 1


@pytest.mark.parametrize("old", ["St. Petersburg National Research University of IT, Mechanics and Optics", "University of California at Berkeley"])
def test_reviewed_aliases_are_applied(built, old):
    assert old not in {u["name"] for u in built["core"]["universities"]}


def test_university_ids_are_unique(built):
    ids = [u["id"] for u in built["core"]["universities"]]
    assert len(ids) == len(set(ids))


def test_first_appearance_has_no_veterans(built):
    for uni in built["core"]["universities"]:
        assert uni["results"][0]["veterans"] == 0


def test_veterans_count_returning_people_by_profile(built):
    for uni in built["core"]["universities"]:
        seen = set()
        for result in uni["results"]:
            assert result["veterans"] == len(set(result["player_ids"]) & seen)
            seen |= set(result["player_ids"])


def test_mojibake_names_are_repaired(built):
    names = {p for u in built["core"]["universities"] for r in u["results"] for p in r["players"]}
    assert "Thomas Würthinger" in names
    assert "Thomas Wьrthinger" not in names


def test_forecast_uses_only_the_past():
    history = {"a": [(2010, 90.0), (2011, 80.0), (2012, 70.0)], "b": [(2010, 90.0), (2011, 80.0), (2012, 10.0)], "c": [(2010, 50.0), (2011, 40.0)]}
    guess = build_data.forecast("c", history["c"], history, 2013)
    assert guess.pct == 40.0  # the median of what followed the two (90, 80) runs: 70 and 10
    assert guess.cases == 2
    assert build_data.series_of([{"year": 2020, "pct": 50.0}, {"year": 2021, "pct": 60.0}], 2021) == [(2020, 50.0)]


def test_projection_ranges_are_ordered_and_in_the_field(built):
    predictions = built["predictions"]
    assert predictions["teams"]
    for team in predictions["teams"]:
        assert 1 <= team["rank_best"] <= team["rank"] <= team["rank_worst"] <= predictions["field_size"]


def test_backtest_beats_its_baseline(built):
    backtest = built["predictions"]["backtest"]
    assert backtest["per_year"]
    assert backtest["spearman"] > backtest["spearman_baseline"]


def test_every_country_with_results_has_a_map_place(built):
    core = built["core"]
    world = json.loads((build_data.OUT / "world.json").read_text())
    shapes = {f["properties"]["name"] for f in world["features"]}
    assert "Antarctica" not in shapes
    used = {u["country"] for u in core["universities"]}
    missing = [c for c in used if core["countries"][c]["map"] not in shapes and "point" not in core["countries"][c]]
    assert not missing


def test_csv_has_one_row_per_result(built):
    with (build_data.OUT / "results.csv").open() as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == sum(len(u["results"]) for u in built["core"]["universities"])


def test_each_page_has_html_script_and_markdown_twin(built):
    for slug, _, _ in build_data.PAGES:
        assert (build_data.SITE / f"{slug}.html").exists(), slug
        assert (build_data.SITE / "js" / "pages" / f"{slug}.js").exists(), slug
        assert (build_data.SITE / f"{slug}.html.md").read_text().strip(), slug
    assert build_data.SITE_URL in (build_data.SITE / "llms.txt").read_text()


def winners_of(built, year, title):
    return [u["name"] for u in built["core"]["universities"] for r in u["results"] if r["year"] == year and title in r["titles"]]


def test_regional_titles_are_published(built):
    assert winners_of(built, 2025, "Northern Eurasia") == ["St. Petersburg State University"]
    assert winners_of(built, 2025, "Asia East") == ["Beijing Jiaotong University"]
    assert winners_of(built, 2017, "Europe") == ["St. Petersburg ITMO University"]


def test_world_title_goes_to_the_rank_one_team(built):
    for uni in built["core"]["universities"]:
        for result in uni["results"]:
            assert ("World" in result["titles"]) == (result["rank"] == 1), (uni["name"], result["year"])
