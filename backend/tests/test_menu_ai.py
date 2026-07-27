import unittest

from bootstrap import *  # noqa: F401,F403
from app.services.menu_ai import (
    _deterministic_pick,
    _ingredient_price_advantage,
    _is_month_in_season,
    _normalize_partner_category,
)


class MenuAiTests(unittest.TestCase):
    def test_partner_category_aliases_are_normalized(self):
        self.assertEqual(_normalize_partner_category("corba"), "Çorba")
        self.assertEqual(_normalize_partner_category("pilav"), "Tahıl (Pilav/Makarna)")
        self.assertEqual(_normalize_partner_category(None), "Ana Yemek")

    def test_month_in_season_supports_wrapping_ranges(self):
        winter_ingredient = {"season_start_month": 11, "season_end_month": 2}
        summer_ingredient = {"season_start_month": 6, "season_end_month": 8}

        self.assertTrue(_is_month_in_season(winter_ingredient, 1))
        self.assertTrue(_is_month_in_season(winter_ingredient, 12))
        self.assertFalse(_is_month_in_season(winter_ingredient, 7))
        self.assertTrue(_is_month_in_season(summer_ingredient, 7))

    def test_price_advantage_only_when_internal_price_is_lower(self):
        self.assertEqual(_ingredient_price_advantage({"price": 8, "market_price": 10}), 0.2)
        self.assertEqual(_ingredient_price_advantage({"price": 12, "market_price": 10}), 0)
        self.assertEqual(_ingredient_price_advantage({"price": 0, "market_price": 10}), 0)

    def test_deterministic_pick_prefers_cheapest_when_over_budget(self):
        expensive = {
            "name": "expensive",
            "portions": 1,
            "meal_ingredients": [{"quantity": 1, "ingredients": {"price": 40}}],
        }
        cheap = {
            "name": "cheap",
            "portions": 1,
            "meal_ingredients": [{"quantity": 1, "ingredients": {"price": 10}}],
        }

        self.assertEqual(
            _deterministic_pick([expensive, cheap], rotation_idx=0, over_budget=True)["name"],
            "cheap",
        )

    def test_deterministic_pick_prefers_higher_opportunity_score_under_budget(self):
        seasonal = {
            "name": "seasonal",
            "portions": 1,
            "calories": 600,
            "protein": 25,
            "iron": 4,
            "meal_ingredients": [
                {
                    "quantity": 1,
                    "ingredients": {
                        "price": 10,
                        "is_local": True,
                        "season_start_month": 7,
                        "season_end_month": 9,
                        "market_price": 12,
                    },
                }
            ],
        }
        plain = {
            "name": "plain",
            "portions": 1,
            "calories": 600,
            "protein": 25,
            "iron": 4,
            "meal_ingredients": [{"quantity": 1, "ingredients": {"price": 10}}],
        }

        self.assertEqual(
            _deterministic_pick([plain, seasonal], rotation_idx=0, over_budget=False, month=7)["name"],
            "seasonal",
        )
