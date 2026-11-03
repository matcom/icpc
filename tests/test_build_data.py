"""The published data must keep its shape and its facts."""
import csv
import json
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import build_data  # noqa: E402
import forecast  # noqa: E402
import refresh_ratings  # noqa: E402


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


def test_projection_ranges_are_ordered_and_in_the_field(built):
    predictions = built["predictions"]
    assert predictions["teams"]
    for team in predictions["teams"]:
        assert 1 <= team["rank_best"] <= team["rank"] <= team["rank_worst"] <= predictions["field_size"]
        assert team["chances"] == sorted(team["chances"])


def test_simulated_places_are_coherent(built):
    predictions = built["predictions"]
    total = lambda place: sum(t["chances"][predictions["places"].index(place)] for t in predictions["teams"])
    assert total(1) == pytest.approx(1, abs=0.01)
    assert total(4) == pytest.approx(4, abs=0.01)
    assert total(12) == pytest.approx(12, abs=0.01)
    assert sum(t["attend"] for t in predictions["teams"]) == pytest.approx(predictions["field_size"], abs=1)


def test_backtest_beats_finals_only_and_chance(built):
    backtest = built["predictions"]["backtest"]
    rosters, finals_only, chance = backtest["with_rosters"], backtest["finals_only"], backtest["chance"]
    assert rosters["champion"] > finals_only["champion"] > chance["champion"]
    assert rosters["medal_brier"] < finals_only["medal_brier"] < chance["medal_brier"]
    assert rosters["spearman"] > finals_only["spearman"]


def test_community_names_join_only_by_equal_name_or_alias():
    candidates = {"h": "Harvard University", "la": "Universidad de La Habana", "p": "Peking University"}
    aliases = {"havana university": "universidad de la habana"}
    assert forecast.resolve("Havana University", candidates, aliases) == "la"
    assert forecast.resolve("Zhejiang University", candidates, aliases) is None
    assert forecast.resolve("The Peking University", candidates, aliases) == "p"


def test_team_rating_matches_the_codeforces_formula():
    assert forecast.team_rating([None, None]) is None
    single = forecast.team_rating([3000])
    assert single == pytest.approx(3000, abs=1)
    assert 3000 < forecast.team_rating([3000, 3000, 3000]) < 3400


def test_stronger_prior_and_first_place_raise_the_posterior():
    mean, variance = forecast.laplace(np.zeros(3), np.ones(3))
    assert mean[0] > mean[1] > mean[2]
    assert (variance < 1).all()


def test_ratings_match_by_handle_not_position():
    users = [{"handle": "Bob", "rating": 2000}, {"handle": "alice", "rating": 3000}]
    found, missing = refresh_ratings.ratings_by_handle(["Alice", "bob", "carol"], users)
    assert found == {"Alice": 3000, "bob": 2000}
    assert missing == ["carol"]


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


def test_every_logo_has_a_file_and_a_university(built):
    core = built["core"]
    ids = {u["id"] for u in core["universities"]}
    assert len(core["logos"]) >= 5
    for uni, logo in core["logos"].items():
        assert uni in ids, uni
        assert logo["source"] and logo["licence"]
        assert (build_data.SITE / "logos" / f"{uni}.png").exists(), uni


def test_cuba_slice_has_the_expected_totals(built):
    cuba = built["cuba"]
    assert cuba["years"] == list(range(2010, 2026))
    assert cuba["totals"] == {
        "editions": 16,
        "teams": 26,
        "slots": 78,
        "people": 57,
        "universities": 5,
        "podiums": 3,
        "medals": 0,
        "regionalTitles": 1,
        "maxTeamsYear": 3,
        "bestRank": 44,
        "worstRank": 132,
        "bestPct": 65.9,
        "worstPct": 1.8,
        "solvedMax": 5,
        "teams6Plus": 0,
        "repeatPeople": 21,
        "people3Plus": 0,
        "finalsPerPerson": 1.37,
    }
    assert len(cuba["teams"]) == 26
    assert {row["year"] for row in cuba["teams"]} == set(cuba["years"])
    assert all(row["field"] and row["group"]["size"] > 0 for row in cuba["teams"])


def test_cuba_podiums_name_the_university_of_each_place(built):
    cuba = built["cuba"]
    podiums = cuba["podiums"]
    assert podiums["totals"] | {} == {
        **podiums["totals"],
        "latamTeams": 286,
        "cubaTeams": 26,
        "cubaShare": 9.1,
        "podiums": 48,
        "cubaPodiums": 3,
        "cubaPodiumShare": 6.3,
        "cubaPerEdition": 0.19,
        "cubaRank": 4,
        "gold": 1,
        "silver": 0,
        "bronze": 2,
    }
    assert [(row["year"], row["place"]) for row in podiums["cuba"]] == [
        (2017, 1), (2021, 3), (2023, 3)
    ]
    assert {row["uni"] for row in podiums["cuba"]} == {"universidad-de-la-habana"}
    assert {row["uniName"] for row in podiums["cuba"]} == {"Universidad de La Habana"}
    assert podiums["cuba"][0]["rank"] == 44
    assert podiums["cuba"][0]["field"] == 127
    assert len(podiums["years"]) == 16
    assert all(row["cuba"]["uniName"] for row in podiums["years"])
    assert podiums["totals"]["countriesWithTeams"] == 11
    assert podiums["totals"]["countriesWithPodiums"] == 7
    assert podiums["totals"]["cubaPodiumRank"] == 4
    assert all(row["latamCountries"] >= len(row["top"]) for row in podiums["years"])
    assert [row["latamCountries"] for row in podiums["years"]] == [6, 7, 7, 7, 8, 8, 8, 9, 10, 7, 8, 8, 6, 8, 8, 9]
    assert [row["cubaPlace"] for row in podiums["years"]] == [13, 13, 16, 8, 10, 10, 13, 1, 10, 5, 7, 3, 8, 3, 10, 16]
    assert [row["country"] for row in podiums["years"][0]["top"]] == ["Brazil", "Brazil", "Argentina"]
    assert [row["country"] for row in podiums["years"][7]["top"]] == ["Cuba", "Argentina", "Argentina"]
    assert [row["country"] for row in podiums["years"][15]["top"]] == ["Brazil", "Argentina", "Argentina"]


def test_cuba_gender_is_aggregate_only(built):
    cuba = built["cuba"]
    gender = cuba["gender"]
    assert gender["women"] == 4
    assert gender["men"] == 53
    assert gender["womenSlots"] == 5
    assert gender["menSlots"] == 73
    assert gender["teamsWithWomen"] == 5
    assert gender["teamsTwoPlus"] == 0
    assert gender["universities"] == 3
    assert gender["coverage"] == {"known": 57, "total": 57, "missing": []}
    assert gender["firstYear"] == 2016
    assert gender["lastYear"] == 2022
    assert gender["lastGap"] == [2023, 2024, 2025]
    assert sum(1 for row in gender["timeline"] if row["women"] > 0) == 4
    assert all(set(player) == {"id", "name"} for team in cuba["teams"] for player in team["players"])
    assert not (build_data.OUT / "cuba-gender.csv").exists()
    curated = ROOT / "data" / "curated" / "cuba-gender.csv"
    with curated.open() as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 57
    assert sum(row["gender"] == "f" for row in rows) == 4
    site_text = "".join(path.read_text() for path in build_data.OUT.glob("*.json"))
    assert '"gender":"f"' not in site_text
    assert '"gender": "f"' not in site_text


def test_cuba_csv_has_one_row_per_team(built):
    with (build_data.OUT / "cuba.csv").open() as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 26
    assert set(rows[0]) == {
        "year", "university", "team", "rank", "field", "percentile", "solved", "time",
        "group_position", "group_size", "veterans", "members",
    }
    assert {row["university"] for row in rows} == {
        university["name"] for university in built["cuba"]["universities"]
    }


def test_cuba_2018_visa_story_is_preserved(built):
    cuba = built["cuba"]
    note = cuba["note2018"]
    assert note["qualified"] == [{
        "year": 2017,
        "uniName": "Universidad de Pinar del Río",
        "team": "sUrPRise",
        "players": ["Elio Alejandro Govea Aguilar", "José Guerra Carmenate", "Manuel Alejandro Díaz Pérez"],
    }]
    assert [row["uni"] for row in note["teams2018"]] == [
        "universidad-central-marta-abreu-de-las-villas",
        "universidad-de-oriente-sede-antonio-maceo",
        "universidad-de-pinar-del-rio",
    ]
    assert [row["rank"] for row in note["teams2018"]] == [100, 118, 131]
    assert all(row["year"] == 2017 for row in note["qualified"])
    assert not any(row["year"] == 2017 and row["uni"] == "universidad-de-pinar-del-rio" for row in cuba["teams"])
    assert sum(row["year"] == 2017 for row in cuba["teams"]) == 1


def test_cuba_field_and_simulator_are_coherent(built):
    cuba = built["cuba"]
    assert len(cuba["field"]) == 16
    assert len(cuba["simulator"]) > 100
    field_2017 = next(row for row in cuba["field"] if row["year"] == 2017)
    assert field_2017["cubaBestSolved"] == 5
    assert field_2017["cubaBestRank"] == 44
    assert field_2017["gapMedian"] == 1
    assert field_2017["gapTop50"] == 0
    assert field_2017["gapMedal"] == -3
    assert cuba["records"]["mostSolved"][0]["year"] == 2017
    assert cuba["records"]["fastest"]["year"] == 2018
    assert cuba["records"]["slowest"]["year"] == 2015
    assert cuba["scenarios"]["years"] == [2021, 2022, 2023, 2024, 2025]
    assert cuba["projection"]["teams"][0]["team"] == "UH Pop"


def test_cuba_map_has_the_sixteen_provinces(built):
    cuba_map = json.loads((build_data.OUT / "cuba-map.json").read_text())
    assert cuba_map["type"] == "FeatureCollection"
    assert len(cuba_map["features"]) == 16
    names = {feature["properties"]["name"] for feature in cuba_map["features"]}
    assert {"La Habana", "Villa Clara", "Pinar del Río", "Santiago de Cuba"} <= names
    assert "Guantánamo" in names
    assert "Guantanmo" not in names
    assert all(feature["properties"]["name"] for feature in cuba_map["features"])
    assert {row["province"] for row in built["cuba"]["universities"]} == {
        "La Habana", "Villa Clara", "Pinar del Río", "Santiago de Cuba"
    }
