import json
from datetime import date
from math import floor

from google import genai
from google.genai import types

from app.config import settings
from app.database import get_db

DAYS_OF_WEEK = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"]

DAILY_CALORIE_TARGET = 800
DAILY_PROTEIN_TARGET_G = 30
DAILY_IRON_TARGET_MG = 5

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "days": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "day": {"type": "string"},
                    "meal_name": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "ingredient_id": {"type": "integer"},
                                "quantity": {"type": "number"},
                            },
                            "required": ["ingredient_id", "quantity"],
                        },
                    },
                },
                "required": ["day", "meal_name", "items"],
            },
        },
    },
    "required": ["days"],
}


class MenuAIError(Exception):
    pass


def _fetch_ingredients() -> dict[int, dict]:
    res = get_db().table("ingredients").select("*").gt("stock", 0).execute()
    return {row["id"]: row for row in res.data}


def _build_ingredient_context(ingredients: dict[int, dict]) -> str:
    lines = [
        f"- id={i['id']} | {i['name']} | stok={i['stock']}{i['unit']} | "
        f"fiyat={i.get('price', 0)}TL/{i['unit']} | kalori={i.get('calories', 0)} | "
        f"protein={i.get('protein', 0)}g | demir={i.get('iron', 0)}mg"
        for i in ingredients.values()
    ]
    return "\n".join(lines)


def _build_prompt(budget: float, ingredients: dict[int, dict], extra_instructions: str | None) -> str:
    context = _build_ingredient_context(ingredients)
    extra_block = (
        f"\nOkul yöneticisinin ek talimatı (buna öncelik ver): {extra_instructions}\n"
        if extra_instructions else ""
    )
    return f"""Sen bir okul yemekhanesi için beslenme uzmanı yapay zekasısın.

Aşağıda depoda STOKTA OLAN malzemelerin listesi var (yalnızca bu malzemeleri kullanabilirsin):
{context}

Görev: Pazartesi'den Cuma'ya kadar 5 günlük bir okul yemekhanesi öğle yemeği menüsü oluştur.
{extra_block}
Kurallar:
- Sadece yukarıda listelenen malzemeleri ve ingredient_id değerlerini kullan.
- Her malzemenin kullandığın miktarı, o malzemenin stok miktarını aşmamalı.
- Haftalık toplam maliyet (tüm günlerin malzeme fiyat * miktar toplamı) {budget} TL bütçesini kesinlikle aşmamalı, ama bütçeyi verimli kullan: toplam maliyet bütçenin yaklaşık %85-100'üne yakın olsun.
- Her gün için günlük hedeflere olabildiğince yaklaş: ~{DAILY_CALORIE_TARGET} kalori, ~{DAILY_PROTEIN_TARGET_G}g protein, ~{DAILY_IRON_TARGET_MG}mg demir.
- Her gün en az 1, en fazla 4 malzemeden oluşan tek bir yemek öner (meal_name kısa ve anlamlı olsun, örn. "Tavuk Sote ve Pilav").
- Yöneticinin ek talimatı varsa, yukarıdaki kurallarla çelişmediği sürece onu uygula.
- Sadece istenen JSON şemasına uygun çıktı üret, başka açıklama ekleme.
"""


def _client() -> genai.Client:
    if not settings.gemini_api_key:
        raise MenuAIError("GEMINI_API_KEY yapılandırılmamış.")
    return genai.Client(api_key=settings.gemini_api_key)


def _ingredient_score(ingredient: dict) -> float:
    price = max(float(ingredient.get("price") or 0), 0.01)
    calories = float(ingredient.get("calories") or 0)
    protein = float(ingredient.get("protein") or 0)
    iron = float(ingredient.get("iron") or 0)
    nutrition_score = (
        calories / DAILY_CALORIE_TARGET
        + protein / DAILY_PROTEIN_TARGET_G
        + iron / DAILY_IRON_TARGET_MG
    )
    return nutrition_score / price


def _fallback_plan(budget: float, ingredients: dict[int, dict]) -> dict:
    remaining_stock = {ingredient_id: float(row.get("stock") or 0) for ingredient_id, row in ingredients.items()}
    ranked = sorted(ingredients.values(), key=_ingredient_score, reverse=True)
    if not ranked:
        return {"days": []}

    daily_budget = max(budget / len(DAYS_OF_WEEK), 0)
    days = []
    for index, day in enumerate(DAYS_OF_WEEK):
        day_items = []
        spent = 0.0
        candidates = ranked[index:] + ranked[:index]

        for ingredient in candidates:
            if len(day_items) >= 4:
                break
            ingredient_id = ingredient["id"]
            stock_left = remaining_stock.get(ingredient_id, 0)
            if stock_left <= 0:
                continue

            price = max(float(ingredient.get("price") or 0), 0.01)
            item_budget = max((daily_budget - spent) / max(1, 4 - len(day_items)), price)
            quantity = min(stock_left, item_budget / price)
            if quantity <= 0:
                continue

            if str(ingredient.get("unit", "")).lower() == "adet":
                quantity = max(1, floor(quantity))
            else:
                quantity = round(quantity, 2)

            cost = quantity * price
            if budget and spent + cost > daily_budget * 1.05 and day_items:
                continue

            day_items.append({"ingredient_id": ingredient_id, "quantity": quantity})
            remaining_stock[ingredient_id] = stock_left - quantity
            spent += cost

        if not day_items:
            ingredient = ranked[index % len(ranked)]
            quantity = min(remaining_stock.get(ingredient["id"], 0), 1)
            if quantity > 0:
                day_items.append({"ingredient_id": ingredient["id"], "quantity": quantity})
                remaining_stock[ingredient["id"]] -= quantity

        main_name = ingredients[day_items[0]["ingredient_id"]]["name"] if day_items else "Günün Menüsü"
        days.append({"day": day, "meal_name": f"{main_name} Menüsü", "items": day_items})

    return {"days": days}


def _generate_with_gemini(budget: float, ingredients: dict[int, dict], extra_instructions: str | None) -> dict:
    response = _client().models.generate_content(
        model=settings.gemini_model,
        contents=_build_prompt(budget, ingredients, extra_instructions),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        ),
    )
    return json.loads(response.text or "{}")


def _materialize_menu(parsed: dict, ingredients: dict[int, dict]) -> list[dict]:
    item_rows = []
    used_stock: dict[int, float] = {}

    for day_index, day_entry in enumerate(parsed.get("days", [])):
        day_name = day_entry.get("day") or DAYS_OF_WEEK[day_index % len(DAYS_OF_WEEK)]
        meal_name = day_entry.get("meal_name") or "Menü"
        for raw_item in day_entry.get("items", []):
            ingredient = ingredients.get(raw_item.get("ingredient_id"))
            if ingredient is None:
                continue

            stock_left = float(ingredient["stock"]) - used_stock.get(ingredient["id"], 0)
            quantity = max(0.0, min(float(raw_item.get("quantity", 0)), stock_left))
            if quantity <= 0:
                continue

            used_stock[ingredient["id"]] = used_stock.get(ingredient["id"], 0) + quantity
            cost = quantity * float(ingredient.get("price", 0))
            calories = quantity * float(ingredient.get("calories", 0))
            protein = quantity * float(ingredient.get("protein", 0))
            iron = quantity * float(ingredient.get("iron", 0))

            item_rows.append({
                "day_of_week": day_name,
                "meal_name": meal_name,
                "ingredient_id": ingredient["id"],
                "quantity": quantity,
                "estimated_cost": round(cost, 2),
                "calories": round(calories, 2),
                "protein": round(protein, 2),
                "iron": round(iron, 2),
            })

    return item_rows


def generate_weekly_menu(week_start_date: date, budget: float, extra_instructions: str | None = None) -> dict:
    ingredients = _fetch_ingredients()
    if not ingredients:
        raise MenuAIError("Stokta malzeme bulunamadığı için menü oluşturulamıyor.")

    try:
        parsed = _generate_with_gemini(budget, ingredients, extra_instructions)
        item_rows = _materialize_menu(parsed, ingredients)
    except MenuAIError:
        raise
    except Exception:
        parsed = _fallback_plan(budget, ingredients)
        item_rows = _materialize_menu(parsed, ingredients)

    if not item_rows:
        parsed = _fallback_plan(budget, ingredients)
        item_rows = _materialize_menu(parsed, ingredients)

    if not item_rows:
        raise MenuAIError("Geçerli hiçbir menü kalemi üretilemedi.")

    total_cost = sum(row["estimated_cost"] for row in item_rows)
    total_calories = sum(row["calories"] for row in item_rows)
    total_protein = sum(row["protein"] for row in item_rows)
    total_iron = sum(row["iron"] for row in item_rows)

    db = get_db()
    menu_res = db.table("weekly_menus").insert({
        "week_start_date": week_start_date.isoformat(),
        "budget": budget,
        "total_cost": round(total_cost, 2),
        "total_calories": round(total_calories, 2),
        "total_protein": round(total_protein, 2),
        "total_iron": round(total_iron, 2),
        "status": "draft",
        "notes": extra_instructions,
    }).execute()
    menu = menu_res.data[0]

    for row in item_rows:
        row["weekly_menu_id"] = menu["id"]
    items_res = db.table("weekly_menu_items").insert(item_rows).execute()

    return {**menu, "items": items_res.data}
