"""Fetch the current Codeforces rating of every member of the next final's listed teams.

A failure keeps the committed snapshot, so a Codeforces outage never stops a deploy.
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

SOURCES = Path(__file__).resolve().parent.parent / "data" / "sources"
API = "https://codeforces.com/api/user.info?handles="


def fetch(handles: list[str]) -> list[dict]:
    url = API + urllib.parse.quote(";".join(handles))
    with urllib.request.urlopen(url, timeout=60) as reply:
        return json.load(reply)["result"]


def ratings_by_handle(requested: list[str], users: list[dict]) -> tuple[dict[str, int | None], list[str]]:
    """Match by name, never by position: the API does not keep the requested order."""
    by_name = {u["handle"].lower(): u for u in users}
    found = {h: by_name[h.lower()].get("rating") for h in requested if h.lower() in by_name}
    return found, [h for h in requested if h.lower() not in by_name]


def main() -> None:
    field = json.loads((SOURCES / "wf-2026-field.json").read_text())
    handles = sorted({h for team in field["teams"] for h in team["members"] if h})
    try:
        ratings, renamed = ratings_by_handle(handles, fetch(handles))
        for handle in renamed:  # the API follows a rename when asked for one handle
            time.sleep(2.1)
            try:
                users = fetch([handle])
            except urllib.error.HTTPError:
                continue
            if users:
                ratings[handle] = users[0].get("rating")
    except (OSError, ValueError, KeyError) as error:
        print(f"Keeping the ratings snapshot: {error}", file=sys.stderr)
        return
    payload = {"fetched": date.today().isoformat(), "ratings": ratings}
    (SOURCES / "cf-ratings.json").write_text(json.dumps(payload, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
    print(f"{sum(r is not None for r in ratings.values())} of {len(handles)} handles rated")


if __name__ == "__main__":
    main()
