#!/usr/bin/env python3
import importlib.util
import unittest
from datetime import date
from pathlib import Path


def load_module():
    path = Path(__file__).with_name("fetch_gamelogs.py")
    spec = importlib.util.spec_from_file_location("fetch_gamelogs", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


mod = load_module()


class FetchGamelogsTest(unittest.TestCase):
    def test_season_starts_in_october(self):
        self.assertEqual(mod.current_season(date(2026, 11, 21)), "2026-27")
        self.assertEqual(mod.current_season(date(2026, 6, 15)), "2025-26")
        self.assertEqual(mod.previous_season("2026-27"), "2025-26")

    def test_parses_nba_date_and_minutes(self):
        self.assertEqual(mod.parse_game_date("NOV 21, 2026"), "2026-11-21")
        self.assertEqual(mod.parse_game_date("2026-11-21"), "2026-11-21")
        self.assertEqual(mod.parse_game_date("2026-11-21T03:00:00.000+00:00"), "2026-11-20")
        self.assertEqual(mod.parse_minutes("35:30"), 36)
        self.assertEqual(mod.parse_minutes("35:12"), 35)
        self.assertEqual(mod.parse_minutes(32), 32)

    def test_keeps_newest_games_and_a_half_point_line(self):
        rows = []
        for day in range(1, 6):
            rows.append({
                "GAME_DATE": f"NOV {day}, 2026",
                "MATCHUP": "DEN vs. LAL",
                "WL": "W",
                "MIN": "34",
                "PTS": 20 + day,
                "REB": 10,
                "AST": 8,
                "BLK": 1,
                "STL": 1,
            })
        games = mod.recent_games(rows, limit=3)
        self.assertEqual([game["date"] for game in games], ["2026-11-03", "2026-11-04", "2026-11-05"])
        self.assertEqual(mod.team_from_matchup("DEN @ MIN"), "DEN")
        self.assertEqual(mod.stat_lines(games)["PTS"], 24.0)

    def test_regular_season_rows_skip_preseason(self):
        payload = {
            "labels": ["MIN", "REB", "AST", "BLK", "STL", "PTS"],
            "events": {
                "1": {
                    "gameDate": "2026-11-21T03:00:00.000+00:00",
                    "gameResult": "W",
                    "atVs": "vs",
                    "opponent": {"abbreviation": "HOU"},
                    "team": {"abbreviation": "DEN"},
                }
            },
            "seasonTypes": [
                {
                    "displayName": "2026-27 Preseason",
                    "displayTeam": "DEN",
                    "categories": [{"events": [{"eventId": "1", "stats": ["10", "1", "1", "0", "0", "4"]}]}],
                },
                {
                    "displayName": "2026-27 Regular Season",
                    "displayTeam": "DEN",
                    "categories": [{"events": [{"eventId": "1", "stats": ["38", "7", "11", "0", "0", "26"]}]}],
                },
            ],
        }
        rows = mod.rows_from_gamelog(payload)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["MATCHUP"], "DEN vs. HOU")
        self.assertEqual(rows[0]["PTS"], "26")

    def test_name_fold_ignores_accents(self):
        catalog = [{"id": 203999, "full_name": "Nikola Jokić"}]
        found = mod.find_player("Nikola Jokic", catalog)
        self.assertEqual(found["id"], 203999)

    def test_stamp_does_not_count_as_a_data_change(self):
        first = mod.render_module([], {}, "2025-26", "2026-11-21T12:00:00-07:00")
        second = mod.render_module([], {}, "2025-26", "2026-11-22T12:00:00-07:00")
        self.assertNotEqual(first, second)
        self.assertEqual(mod.body_without_stamp(first), mod.body_without_stamp(second))


if __name__ == "__main__":
    unittest.main()
