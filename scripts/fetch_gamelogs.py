#!/usr/bin/env python3
"""Pull NBA regular-season game logs into the Player Props tab.

The local script used nba_api and wrote every season to CSV for R. stats.nba.com
does not answer from the host that builds this site, so this job reads the same
box-score fields from ESPN's public game log. The tab charts at most 30 games,
so each player keeps the newest 30 regular-season games. A name with no NBA
match is skipped, same as the local script.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

# Same list as the local top-stars script. Accents are matched loosely.
PLAYERS = [
    "Nikola Jokić",
    "Shai Gilgeous-Alexander",
    "Luka Dončić",
    "Giannis Antetokounmpo",
    "Victor Wembanyama",
    "LeBron James",
    "Jayson Tatum",
    "Anthony Edwards",
    "Tyrese Maxey",
    "Jalen Brunson",
    "Jamal Murray",
    "Devin Booker",
    "Stephen Curry",
    "Kevin Durant",
    "Donovan Mitchell",
    "Cooper Flagg",
]
KEEP_GAMES = 30
LINE_SAMPLE = 10
OUT_PATH = Path(__file__).resolve().parents[1] / "lib" / "player-gamelogs.ts"
FETCHED_PREFIX = "// fetched:"

MONTHS = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}


def fold_name(value: str) -> str:
    stripped = unicodedata.normalize("NFKD", value)
    plain = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    return plain.casefold()


def current_season(today: date) -> str:
    start = today.year if today.month >= 10 else today.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def previous_season(season: str) -> str:
    start = int(season.split("-", 1)[0]) - 1
    return f"{start}-{str(start + 1)[-2:]}"


def parse_game_date(value: object) -> str:
    text = str(value).strip()
    if "T" in text:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed.astimezone(ZoneInfo("America/New_York")).date().isoformat()
    iso = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", text)
    if iso:
        return text
    match = re.fullmatch(r"([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})", text)
    if not match:
        raise ValueError(f"Unrecognized game date: {value}")
    month = MONTHS[match.group(1).upper()]
    return date(int(match.group(3)), month, int(match.group(2))).isoformat()


def parse_minutes(value: object) -> int:
    if value is None or (isinstance(value, float) and value != value):
        return 0
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return 0
    if ":" in text:
        minutes, seconds = text.split(":", 1)
        return int(float(minutes)) + (1 if int(float(seconds)) >= 30 else 0)
    return int(round(float(text)))


def team_from_matchup(matchup: str) -> str:
    token = matchup.strip().split(" ", 1)[0]
    return token.upper()


def nearest_half(value: float) -> float:
    return round(value * 2) / 2


def stat_number(value: object) -> int:
    if value is None or (isinstance(value, float) and value != value):
        return 0
    return int(round(float(value)))


def game_from_row(row: dict) -> dict:
    result = str(row.get("WL") or "").strip().upper()
    if result not in ("W", "L"):
        raise ValueError(f"Game is missing a W/L result: {row.get('GAME_DATE')}")
    matchup = str(row["MATCHUP"]).strip()
    return {
        "date": parse_game_date(row["GAME_DATE"]),
        "matchup": matchup,
        "result": result,
        "minutes": parse_minutes(row.get("MIN")),
        "points": stat_number(row.get("PTS")),
        "rebounds": stat_number(row.get("REB")),
        "assists": stat_number(row.get("AST")),
        "blocks": stat_number(row.get("BLK")),
        "steals": stat_number(row.get("STL")),
        "_team": team_from_matchup(matchup),
    }


def recent_games(rows: list[dict], limit: int = KEEP_GAMES) -> list[dict]:
    games = [game_from_row(row) for row in rows]
    games.sort(key=lambda game: game["date"])
    return games[-limit:]


def average(games: list[dict], key: str) -> float:
    sample = games[-LINE_SAMPLE:]
    if not sample:
        return 0
    return sum(game[key] for game in sample) / len(sample)


def stat_lines(games: list[dict]) -> dict[str, float]:
    return {
        "PTS": nearest_half(average(games, "points")),
        "REB": nearest_half(average(games, "rebounds")),
        "AST": nearest_half(average(games, "assists")),
        "BLK": nearest_half(average(games, "blocks")),
        "STL": nearest_half(average(games, "steals")),
    }


def hit_rate(games: list[dict], line: float) -> float:
    if not games:
        return 0
    hits = sum(1 for game in games if game["points"] > line)
    return round(hits / len(games), 4)


def player_record(player_id: str | int, full_name: str, games: list[dict]) -> dict:
    lines = stat_lines(games)
    public_games = [{key: game[key] for key in game if key != "_team"} for game in games]
    team = games[-1]["_team"] if games else ""
    return {
        "playerId": str(player_id),
        "playerName": full_name,
        "team": team,
        "stat": "PTS",
        "line": lines["PTS"],
        "overOdds": {},
        "underOdds": {},
        "historicalHitRate": hit_rate(public_games, lines["PTS"]),
        "last10HitRate": hit_rate(public_games[-LINE_SAMPLE:], lines["PTS"]),
        "recentGames": public_games,
    }


def render_module(players: list[dict], lines: dict[str, dict[str, float]], season: str, fetched_at: str) -> str:
    players_json = json.dumps(players, indent=2)
    lines_json = json.dumps(lines, indent=2)
    return (
        "// Generated by scripts/fetch_gamelogs.py. Do not edit.\n"
        f"{FETCHED_PREFIX} {fetched_at}\n"
        "// NBA regular-season game logs. The starting line is the recent average, not a book price.\n"
        f"// Season window: {season} plus the prior season when that is needed to fill {KEEP_GAMES} games.\n"
        "import type { PlayerProp } from './types'\n"
        "\n"
        f"export const PLAYER_LOG_SEASON = {json.dumps(season)}\n"
        "\n"
        f"export const PLAYER_GAMELOG_PLAYERS: PlayerProp[] = {players_json}\n"
        "\n"
        f"export const PLAYER_STAT_LINES: Record<string, Record<string, number>> = {lines_json}\n"
    )


def find_player(full_name: str, catalog: list[dict]) -> dict:
    target = fold_name(full_name)
    matches = [player for player in catalog if fold_name(player["full_name"]) == target]
    if not matches:
        raise ValueError(f"Player not found: {full_name}")
    return matches[0]


def espn_season_year(season: str) -> int:
    return int(season.split("-", 1)[0]) + 1


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "HotHandAnalytics/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def search_players(full_name: str) -> list[dict]:
    query = urllib.parse.urlencode({"query": full_name, "limit": 10, "type": "player"})
    payload = fetch_json(f"https://site.api.espn.com/apis/common/v3/search?{query}")
    found = []
    for item in payload.get("items") or []:
        if item.get("type") != "player" or item.get("league") != "nba":
            continue
        found.append({"id": item["id"], "full_name": item.get("displayName") or full_name})
    return found


def rows_from_gamelog(payload: dict) -> list[dict]:
    events = payload.get("events") or {}
    labels = payload.get("labels") or []
    rows = []
    for season_type in payload.get("seasonTypes") or []:
        name = str(season_type.get("displayName") or "")
        if "Regular Season" not in name:
            continue
        team = str(season_type.get("displayTeam") or "").upper()
        for category in season_type.get("categories") or []:
            for event in category.get("events") or []:
                event_id = str(event.get("eventId") or "")
                info = events.get(event_id) or {}
                stats = event.get("stats") or []
                if len(stats) != len(labels) or not info:
                    continue
                mapped = dict(zip(labels, stats))
                result = str(info.get("gameResult") or "").strip().upper()
                if result not in ("W", "L"):
                    continue
                opponent = (info.get("opponent") or {}).get("abbreviation") or ""
                side = "vs." if info.get("atVs") == "vs" else "@"
                played_for = str((info.get("team") or {}).get("abbreviation") or team).upper()
                rows.append({
                    "GAME_DATE": info.get("gameDate"),
                    "MATCHUP": f"{played_for} {side} {opponent}".strip(),
                    "WL": result,
                    "MIN": mapped.get("MIN"),
                    "PTS": mapped.get("PTS"),
                    "REB": mapped.get("REB"),
                    "AST": mapped.get("AST"),
                    "BLK": mapped.get("BLK"),
                    "STL": mapped.get("STL"),
                })
    return rows


def fetch_season_rows(player_id: str, season: str) -> list[dict]:
    year = espn_season_year(season)
    url = (
        "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/"
        f"athletes/{player_id}/gamelog?season={year}"
    )
    return rows_from_gamelog(fetch_json(url))


def fetch_player(full_name: str, today: date) -> dict | None:
    import time

    catalog = search_players(full_name)
    try:
        found = find_player(full_name, catalog)
    except ValueError:
        partial = [player["full_name"] for player in catalog][:3]
        print(
            f"Skipping {full_name} - player ID not found. Close names: {partial}",
            file=sys.stderr,
        )
        return None
    season = current_season(today)
    rows = fetch_season_rows(found["id"], season)
    if len(rows) < KEEP_GAMES:
        time.sleep(0.4)
        rows = fetch_season_rows(found["id"], previous_season(season)) + rows
    games = recent_games(rows)
    if not games:
        print(f"Skipping {full_name} - no regular-season games", file=sys.stderr)
        return None
    return player_record(found["id"], found["full_name"], games)


def body_without_stamp(text: str) -> str:
    lines = [line for line in text.splitlines() if not line.startswith(FETCHED_PREFIX)]
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    today = date.today()
    season = current_season(today)
    records = []
    lines = {}
    for index, name in enumerate(PLAYERS):
        if index:
            import time
            time.sleep(0.4)
        record = fetch_player(name, today)
        if record is None:
            continue
        records.append(record)
        lines[record["playerId"]] = stat_lines(
            [
                {
                    "points": game["points"],
                    "rebounds": game["rebounds"],
                    "assists": game["assists"],
                    "blocks": game["blocks"],
                    "steals": game["steals"],
                }
                for game in record["recentGames"]
            ]
        )
        print(f"Saved {len(record['recentGames'])} games for {record['playerName']}", file=sys.stderr)

    if not records:
        raise ValueError("No players were saved")

    fetched_at = datetime.now().astimezone().isoformat(timespec="seconds")
    rendered = render_module(records, lines, season, fetched_at)
    previous = OUT_PATH.read_text(encoding="utf-8") if OUT_PATH.exists() else ""
    OUT_PATH.write_text(rendered, encoding="utf-8")
    if previous and body_without_stamp(previous) == body_without_stamp(rendered):
        return 42
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"fetch_gamelogs failed: {error}", file=sys.stderr)
        sys.exit(1)
