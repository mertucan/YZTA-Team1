import json
from datetime import date

from google import genai
from google.genai import types

from app.config import settings
from app.database import get_db

DAYS_OF_WEEK = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"]

# Okul yemekhanesi tek öğün (öğle yemeği) için makul günlük hedefler.
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
    return f"""Sen bir okul yemekhanesi için beslenme uzmanı yapay zekasın.

Aşağıda depoda STOKTA OLAN malzemelerin listesi var (yalnızca bu malzemeleri kullanabilirsin):
{context}

Görev: Pazartesi'den Cuma'ya kadar 5 günlük bir okul yemekhanesi öğle yemeği menüsü oluştur.
{extra_block}
Kurallar:
- Sadece yukarıda listelenen malzemeleri ve ingredient_id değerlerini kullan.
- Her malzemenin kullandığın miktarı, o malzemenin stok miktarını aşmamalı.
- Haftalık toplam maliyet (tüm günlerin malzeme fiyat * miktar toplamı) {budget} TL bütçesini kesinlikle aşmamalı, ama bütçeyi verimli kullan: toplam maliyet bütçenin yaklaşık %85-100'üne yakın olsun, gereksiz yere düşük kalmasın.
- Her gün için günlük hedeflere olabildiğince yaklaş: ~{DAILY_CALORIE_TARGET} kalori, ~{DAILY_PROTEIN_TARGET_G}g protein, ~{DAILY_IRON_TARGET_MG}mg demir.
- Her gün en az 1, en fazla 4 malzemeden oluşan tek bir yemek öner (meal_name kısa ve anlamlı olsun, örn. "Tavuk Sote ve Pilav").
- Yöneticinin ek talimatı varsa, yukarıdaki kurallarla çelişmediği sürece onu uygula.
- Sadece istenen JSON şemasına uygun çıktı üret, başka açıklama ekleme.
"""


def _client() -> genai.Client:
    if not settings.gemini_api_key:
        raise MenuAIError("GEMINI_API_KEY yapılandırılmamış.")
    return genai.Client(api_key=settings.gemini_api_key)


def generate_weekly_menu(week_start_date: date, budget: float, extra_instructions: str | None = None) -> dict:
    ingredients = _fetch_ingredients()
    if not ingredients:
        raise MenuAIError("Stokta malzeme bulunamadığı için menü oluşturulamıyor.")

    prompt = _build_prompt(budget, ingredients, extra_instructions)

    response = _client().models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        ),
    )

    try:
        parsed = json.loads(response.text)
    except (json.JSONDecodeError, TypeError) as exc:
        raise MenuAIError(f"Gemini yanıtı çözümlenemedi: {exc}") from exc

    days = parsed.get("days", [])
    if not days:
        raise MenuAIError("Gemini geçerli bir günlük menü listesi döndürmedi.")

    item_rows = []
    total_cost = total_calories = total_protein = total_iron = 0.0

    for day_entry in days:
        day_name = day_entry.get("day") or DAYS_OF_WEEK[len(item_rows) % 5]
        meal_name = day_entry.get("meal_name", "Menü")
        for raw_item in day_entry.get("items", []):
            ingredient = ingredients.get(raw_item.get("ingredient_id"))
            if ingredient is None:
                continue
            quantity = max(0.0, min(float(raw_item.get("quantity", 0)), float(ingredient["stock"])))
            if quantity <= 0:
                continue

            cost = quantity * float(ingredient.get("price", 0))
            calories = quantity * float(ingredient.get("calories", 0))
            protein = quantity * float(ingredient.get("protein", 0))
            iron = quantity * float(ingredient.get("iron", 0))

            total_cost += cost
            total_calories += calories
            total_protein += protein
            total_iron += iron

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

    if not item_rows:
        raise MenuAIError("Gemini yanıtından geçerli hiçbir menü kalemi üretilemedi.")

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
