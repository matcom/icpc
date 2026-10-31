"""Bayesian projection of the next World Final.

A team's strength is s = gamma*a + beta*z. `a` is the university's lasting strength, a
Gaussian belief that widens between finals and that each final updates. `z` is this
year's roster, its Codeforces team rating; when unknown it is estimated from the
university's past ratings, with more variance. Rankings follow a Plackett-Luce model.
Simulating the final turns strengths into the probability of any place.
"""
import itertools
import json
import math
import os
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")  # these matrices are too small to gain from threads

import numpy as np  # noqa: E402

SOURCES = Path(__file__).resolve().parent.parent / "data" / "sources"

# Chosen by the predictive likelihood of the top 12 places: first group on the finals
# of 2006-2013, then gamma and beta on those of 2021-2024.
DRIFT = 0.1
ROSTER_NOISE = 0.3
NEWCOMER_VARIANCE = 1.5
NEWCOMER_MEAN = -1.5
NEWCOMER_SHRINK = 8.0
GAMMA = 0.6
BETA = 1.5
BACKTEST_GRID = list(itertools.product((0.4, 0.6, 0.8), (1.0, 1.5, 2.0)))

FIRST_RATED = 2021
RATING_CENTER = 2700
RATING_SCALE = 300
TOP = 12
SIMULATIONS = 60_000
PLACES = (1, 2, 3, 4, 8, 12, 20, 30, 50, 75, 100, 120)
STOPWORDS = set("the of de la el university universidad universidade univ u in at and do da del di".split())
COUNTRY_NAMES = {"United States of America": "United States", "The Netherlands": "Netherlands"}


def clean(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", ascii_text)).strip()


def name_key(text: str) -> str:
    return " ".join(sorted(t for t in clean(text).split() if t not in STOPWORDS))


def resolve(name: str, candidates: dict[str, str], aliases: dict[str, str]) -> str | None:
    """University id for a name written in a community list, or None.

    Only an equal name or a reviewed alias with exactly one hit counts: string
    similarity once joined Havana to Harvard and Zhejiang to Peking.
    """
    keys = {name_key(n): uid for uid, n in candidates.items()}
    if name_key(name) in keys:
        return keys[name_key(name)]
    pattern = aliases.get(clean(name))
    if not pattern:
        return None
    hits = [uid for uid, n in candidates.items() if re.search(pattern, clean(n))]
    return hits[0] if len(hits) == 1 else None


def team_rating(ratings: list[int | None]) -> float | None:
    """Codeforces' rating of a team: the R solving sum log10(1 + 10^((r - R) / 400)) = log10(2)."""
    known = [r for r in ratings if r]
    if not known:
        return None
    low, high = 0.0, 6000.0
    for _ in range(60):
        middle = (low + high) / 2
        if sum(math.log10(1 + 10 ** ((r - middle) / 400)) for r in known) > math.log10(2):
            low = middle
        else:
            high = middle
    return middle


def to_z(rating: float) -> float:
    return (rating - RATING_CENTER) / RATING_SCALE


def laplace(prior_mean: np.ndarray, prior_var: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Posterior mode and marginal variances of strengths, for teams listed best first."""
    s = prior_mean.copy()
    for _ in range(25):
        worths = np.exp(s)
        remaining = np.cumsum(worths[::-1])[::-1]
        chosen = np.triu(np.outer(1 / remaining, worths))
        gradient = 1 - chosen.sum(axis=0) - (s - prior_mean) / prior_var
        hessian = np.diag(chosen.sum(axis=0)) - chosen.T @ chosen + np.diag(1 / prior_var)
        step = np.linalg.solve(hessian, gradient)
        s = s + step
        if np.abs(step).max() < 1e-4:
            break
    return s, np.diag(np.linalg.inv(hessian))


def top_likelihood(samples: np.ndarray, top: int) -> np.ndarray:
    """Log-probability of the first `top` places, for teams listed best first."""
    worths = np.exp(samples)
    remaining = np.cumsum(worths[:, ::-1], axis=1)[:, ::-1]
    return np.log(worths[:, :top] / remaining[:, :top]).sum(axis=1)


class Belief:
    """What is known about every university, updated one final at a time."""

    def __init__(self, regions: dict[str, str], ratings: dict[int, dict[str, float]], gamma: float = GAMMA, beta: float = BETA, use_rosters: bool = True):
        self.regions, self.ratings, self.gamma, self.beta, self.use_rosters = regions, ratings, gamma, beta, use_rosters
        self.state: dict[str, tuple[float, float, int]] = {}
        self.newcomers: dict[str, list[float]] = defaultdict(list)
        pairs = [(to_z(by[u]), to_z(ratings[y + 1][u])) for y, by in ratings.items() if y + 1 in ratings for u in by if u in ratings[y + 1]]
        self.persistence = float(np.corrcoef(*zip(*pairs))[0, 1])
        self.roster_sd = float(np.std([after - self.persistence * before for before, after in pairs]))
        by_region = defaultdict(list)
        for by in ratings.values():
            for u, r in by.items():
                by_region[regions.get(u)].append(to_z(r))
        self.region_z = {g: float(np.mean(v)) for g, v in by_region.items()}

    def lasting(self, uid: str, year: int) -> tuple[float, float]:
        if uid in self.state:
            mean, variance, last = self.state[uid]
            return mean, variance + DRIFT * max(1, year - last)
        pool = [v for values in self.newcomers.values() for v in values]
        overall = float(np.mean(pool)) if pool else NEWCOMER_MEAN
        own = self.newcomers[self.regions.get(uid)]
        return (sum(own) + NEWCOMER_SHRINK * overall) / (len(own) + NEWCOMER_SHRINK), NEWCOMER_VARIANCE

    def roster(self, uid: str, year: int, known: dict[str, float]) -> tuple[float | None, float]:
        """The roster term z and its variance: exact if rated, else from the university's past."""
        if year < FIRST_RATED or not self.use_rosters:
            return None, 0.0
        if uid in known:
            return to_z(known[uid]), 0.0
        center = self.region_z.get(self.regions.get(uid), 0.0)
        wide = self.roster_sd ** 2 / (1 - self.persistence ** 2)
        past = [y for y in sorted(self.ratings) if y < year and uid in self.ratings[y]]
        if not past:
            return center, wide
        fade = self.persistence ** (year - past[-1])
        return center + fade * (to_z(self.ratings[past[-1]][uid]) - center), wide * (1 - fade ** 2)

    def predict(self, teams: list[str], year: int, known: dict[str, float]) -> tuple[np.ndarray, np.ndarray, list[tuple[float, float, float]]]:
        means, variances, terms = [], [], []
        for uid in teams:
            a, a_var = self.lasting(uid, year)
            z, z_var = self.roster(uid, year, known)
            weight, offset, extra = (1.0, 0.0, 0.0) if z is None else (self.gamma, self.beta * z, self.beta ** 2 * z_var)
            means.append(weight * a + offset)
            variances.append(weight ** 2 * a_var + ROSTER_NOISE ** 2 + extra)
            terms.append((weight, offset, extra))
        return np.array(means), np.array(variances), terms

    def update(self, teams: list[str], year: int, known: dict[str, float]) -> None:
        """Absorb a final, with `teams` listed best first."""
        mean, variance, terms = self.predict(teams, year, known)
        post_mean, post_var = laplace(mean, variance)
        precision = np.maximum(1 / post_var - 1 / variance, 1e-4)
        observed = (post_mean / post_var - mean / variance) / precision
        for i, uid in enumerate(teams):
            a, a_var = self.lasting(uid, year)
            weight, offset, extra = terms[i]
            noise = 1 / precision[i] + ROSTER_NOISE ** 2 + extra
            gain = a_var * weight / (weight ** 2 * a_var + noise)
            updated = a + gain * (observed[i] - offset - weight * a)
            if uid not in self.state:
                self.newcomers[self.regions.get(uid)].append(updated)
            self.state[uid] = (updated, (1 - gain * weight) * a_var, year)


def simulate(mean: np.ndarray, variance: np.ndarray, count: int, rng: np.random.Generator, attend: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray]:
    """Places of each team in `count` simulated finals. An absent team sorts after the field."""
    shape = (count, len(mean))
    performance = mean + rng.normal(size=shape) * np.sqrt(variance) + rng.gumbel(size=shape)
    present = rng.random(shape) < attend if attend is not None else np.ones(shape, dtype=bool)
    performance = np.where(present, performance, -1e9)
    return (-performance).argsort(axis=1).argsort(axis=1) + 1, present


def spearman(xs: np.ndarray, ys: np.ndarray) -> float:
    rank = lambda v: np.unique(v, return_inverse=True)[1].astype(float)
    return float(np.corrcoef(rank(xs), rank(ys))[0, 1])


def load_ratings(universities: list[dict], aliases: dict[str, str]) -> dict[int, dict[str, float]]:
    source = json.loads((SOURCES / "cf-team-ratings-2021-2024.json").read_text())
    ratings = {}
    for year, entry in source.items():
        field = {u["id"]: u["name"] for u in universities for r in u["results"] if r["year"] == int(year) and r["rank"] is not None}
        ratings[int(year)] = {uid: team["rating"] for team in entry["teams"] if (uid := resolve(team["university"], field, aliases))}
    return ratings


def finals_of(universities: list[dict]) -> dict[int, list[tuple[float, str]]]:
    finals = defaultdict(list)
    for uni in universities:
        for r in uni["results"]:
            if r["rank"] is not None:
                finals[r["year"]].append((r["rank"], uni["id"]))
    return {y: sorted(rows) for y, rows in sorted(finals.items())}


def replay(finals, regions, ratings, score_from, score_to, gamma=GAMMA, beta=BETA, use_rosters=True, simulations=4000):
    """Walk through the finals, predicting each scored one before absorbing it."""
    belief = Belief(regions, ratings, gamma, beta, use_rosters)
    rng = np.random.default_rng(7)
    scored = {}
    for year, rows in finals.items():
        if year > score_to:
            break
        teams = [uid for _, uid in rows]
        known = ratings.get(year, {})
        if year >= score_from:
            mean, variance, _ = belief.predict(teams, year, known)
            draws = mean + rng.normal(size=(300, len(mean))) * np.sqrt(variance)
            likelihood = float(np.logaddexp.reduce(top_likelihood(draws, min(TOP, len(teams)))) - math.log(300))
            scored[year] = {"likelihood": likelihood, "actual": np.array([r for r, _ in rows])}
            if simulations:
                places, _ = simulate(mean, variance, simulations, rng)
                scored[year].update(win=np.maximum((places == 1).mean(0), 1 / (2 * simulations)), gold=(places <= 4).mean(0), medal=(places <= TOP).mean(0), expected=places.mean(0))
        belief.update(teams, year, known)
    return scored


def score(finals: list[dict]) -> dict:
    return {
        "champion": round(float(np.mean([f["win"][0] for f in finals])), 3),
        "gold_brier": round(float(np.mean([np.mean((f["gold"] - (f["actual"] <= 4)) ** 2) for f in finals])), 4),
        "medal_brier": round(float(np.mean([np.mean((f["medal"] - (f["actual"] <= TOP)) ** 2) for f in finals])), 4),
        "spearman": round(float(np.mean([spearman(f["expected"], f["actual"]) for f in finals])), 3),
    }


def backtest(universities: list[dict], regions: dict[str, str], ratings: dict[int, dict[str, float]]) -> dict:
    """Score each rated final with gamma and beta chosen from the other rated finals."""
    finals = finals_of(universities)
    rated_years = sorted(ratings)
    likelihoods = {
        setting: {y: f["likelihood"] for y, f in replay(finals, regions, ratings, rated_years[0], rated_years[-1], *setting, simulations=0).items()}
        for setting in BACKTEST_GRID
    }
    with_rosters = {}
    for year in rated_years:
        best = max(BACKTEST_GRID, key=lambda setting: sum(v for y, v in likelihoods[setting].items() if y != year))
        with_rosters[year] = replay(finals, regions, ratings, year, year, *best)[year]
    finals_only = replay(finals, regions, ratings, rated_years[0], rated_years[-1], use_rosters=False)
    uniform = [{"win": np.full(len(f["actual"]), 1 / len(f["actual"])), "gold": np.full(len(f["actual"]), 4 / len(f["actual"])),
                "medal": np.full(len(f["actual"]), TOP / len(f["actual"])), "expected": f["actual"].astype(float), "actual": f["actual"]}
               for f in finals_only.values()]
    chance = score(uniform)
    chance["spearman"] = 0.0
    predicted = np.concatenate([f["medal"] for f in with_rosters.values()])
    happened = np.concatenate([f["actual"] <= TOP for f in with_rosters.values()])
    bins = [0, 0.02, 0.05, 0.1, 0.2, 0.4, 0.7, 1.01]
    calibration = []
    for low, high in zip(bins, bins[1:]):
        inside = (predicted >= low) & (predicted < high)
        if inside.any():
            calibration.append({"predicted": round(float(predicted[inside].mean()), 3), "happened": round(float(happened[inside].mean()), 3), "teams": int(inside.sum())})
    return {
        "chance": chance, "finals_only": score(list(finals_only.values())), "with_rosters": score(list(with_rosters.values())),
        "per_year": [{"year": y, "chance": round(1 / len(finals_only[y]["actual"]), 3), "finals_only": round(float(finals_only[y]["win"][0]), 3), "with_rosters": round(float(with_rosters[y]["win"][0]), 3)} for y in rated_years],
        "calibration": calibration,
    }


def next_field(universities: list[dict], regions: dict[str, str], aliases: dict[str, str]) -> tuple[list[dict], str]:
    """Teams of the next final: listed, confirmed by their university, or presumed from recent finals.

    Open seats in a region go to universities of its last three finals, in proportion to
    how many they attended, so a presumed team carries its chance of being there at all.
    """
    source = json.loads((SOURCES / "wf-2026-field.json").read_text())
    live = json.loads((SOURCES / "cf-ratings.json").read_text())
    names = {u["id"]: u["name"] for u in universities}
    by_id = {u["id"]: u for u in universities}
    teams, seen = [], set()
    for row in source["teams"]:
        uid = resolve(row["university"], names, aliases)
        if uid in seen:
            continue
        seen.add(uid or row["university"])
        country = by_id[uid]["country"] if uid else COUNTRY_NAMES.get(row["country"], row["country"])
        rating = team_rating([live["ratings"].get(h) for h in row["members"]]) or row["list_rating"]
        key = uid or f"nuevo:{row['university']}"
        regions[key] = row["region"]
        teams.append({"key": key, "id": uid, "name": by_id[uid]["name"] if uid else row["university"], "country": country, "team": row["team"], "rating": rating, "kind": "listed", "attend": 1.0})
    for row in source["confirmed"]:
        uid = resolve(row["university"], names, aliases)
        if uid not in seen:
            seen.add(uid)
            teams.append({"key": uid, "id": uid, "name": by_id[uid]["name"], "country": by_id[uid]["country"], "team": None, "rating": None, "kind": "confirmed", "attend": 1.0})
    finals = finals_of(universities)
    recent = list(finals)[-3:]
    seats = defaultdict(int)
    for _, uid in finals[recent[-1]]:
        seats[regions[uid]] += 1
    taken = defaultdict(int)
    for team in teams:
        taken[regions[team["key"]]] += 1
    for region, total in seats.items():
        attended = {u["id"]: sum(1 for r in u["results"] if r["year"] in recent and r["rank"] is not None)
                    for u in universities if regions.get(u["id"]) == region and u["id"] not in seen}
        attended = {uid: n for uid, n in attended.items() if n}
        chance = {uid: 0.0 for uid in attended}
        open_seats = max(0, total - taken[region])
        for _ in range(10):
            left = open_seats - sum(chance.values())
            free = {uid: attended[uid] for uid in chance if chance[uid] < 0.95}
            if left <= 1e-6 or not free:
                break
            for uid, n in free.items():
                chance[uid] = min(0.95, chance[uid] + left * n / sum(free.values()))
        for uid, p in chance.items():
            if p > 0:
                teams.append({"key": uid, "id": uid, "name": by_id[uid]["name"], "country": by_id[uid]["country"], "team": None, "rating": None, "kind": "presumed", "attend": round(p, 3)})
    return teams, live["fetched"]


def summarize(places: np.ndarray, present: np.ndarray, field_size: int) -> dict:
    """Place probabilities over all simulations, and the likely place when present."""
    cumulative = [round(float((places <= k).mean()), 4) for k in PLACES]
    shown = places[present]
    low, middle, high = (int(min(np.percentile(shown, q), field_size)) for q in (25, 50, 75))
    to_pct = lambda rank: round(100 * (1 - (rank - 1) / (field_size - 1)), 1)
    return {"chances": cumulative, "rank": middle, "rank_best": low, "rank_worst": high, "pct": to_pct(middle), "high": to_pct(low), "low": to_pct(high)}


def project(universities: list[dict], countries: dict, region_names: dict[str, str]) -> dict:
    regions = {u["id"]: countries[u["country"]]["region"] for u in universities}
    aliases = json.loads((SOURCES / "cf-name-aliases.json").read_text())
    ratings = load_ratings(universities, aliases)
    tested = backtest(universities, regions, ratings)
    belief = Belief(regions, ratings)
    finals = finals_of(universities)
    for year, rows in finals.items():
        belief.update([uid for _, uid in rows], year, ratings.get(year, {}))
    field, ratings_date = next_field(universities, regions, aliases)
    year = max(finals) + 1
    keys = [t["key"] for t in field]
    attend = np.array([t["attend"] for t in field])
    field_size = round(float(attend.sum()))
    known = {t["key"]: t["rating"] for t in field if t["rating"]}
    mean, variance, _ = belief.predict(keys, year, known)
    places, present = simulate(mean, variance, SIMULATIONS, np.random.default_rng(year), attend)

    teams = []
    for i, team in enumerate(field):
        teams.append({k: team[k] for k in ("id", "name", "country", "team", "kind", "attend")} | {
            "region": regions[team["key"]], "rating": round(team["rating"]) if team["rating"] else None,
            **summarize(places[:, i], present[:, i], field_size),
        })
    order = sorted(range(len(teams)), key=lambda i: (-teams[i]["chances"][0], -teams[i]["chances"][PLACES.index(TOP)]))
    by_group: dict[tuple[str, str], list[int]] = defaultdict(list)
    for i, team in enumerate(teams):
        by_group["country", team["country"]].append(i)
        by_group["region", team["region"]].append(i)
    country_rows, region_rows = {}, {}
    for (kind, name), members in by_group.items():
        best = places[:, members].min(axis=1)
        seen = present[:, members].any(axis=1)
        if kind == "country":
            country_rows[name] = {"expected_teams": round(float(attend[members].sum()), 1), "teams": len(members),
                                  **summarize(best[None].T, seen[None].T, field_size)}
        else:
            leaders = np.bincount(places[:, members].argmin(axis=1), minlength=len(members)) / SIMULATIONS
            ranked = sorted(range(len(members)), key=lambda j: -leaders[j])[:5]
            region_rows[name] = {"name": region_names[name], "world": round(float((best == 1).mean()), 3), "medal": round(float((best <= TOP).mean()), 3),
                                 "leaders": [{"name": teams[members[j]]["name"], "id": teams[members[j]]["id"], "kind": teams[members[j]]["kind"], "chance": round(float(leaders[j]), 3)} for j in ranked]}
    return {
        "year": year, "field_size": field_size, "places": PLACES, "ratings_date": ratings_date, "simulations": SIMULATIONS,
        "gamma": GAMMA, "beta": BETA,
        "teams": [teams[i] for i in order], "countries": country_rows, "regions": region_rows, "backtest": tested,
    }
