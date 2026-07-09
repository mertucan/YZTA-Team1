import json
from datetime import date

from google import genai
from google.genai import types

from app.config import settings
from app.database import get_db

ALL_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
CATEGORIES = [
    "Çorba",
    "Ana Yemek",
    "Ara Sıcak",
    "Tahıl (Pilav/Makarna)",
    "Yoğurt/Salata",
    "Tatlı/Meyve",
]

DAILY_CALORIE_TARGET = 800
DAILY_PROTEIN_TARGET_G = 30
DAILY_IRON_TARGET_MG = 5

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "picks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "day": {"type": "string"},
                    "category": {"type": "string"},
                    "meal_id": {"type": "integer"},
                },
                "required": ["day", "category", "meal_id"],
            },
        },
    },
    "required": ["picks"],
}


class MenuAIError(Exception):
    pass


def _fetch_catalog() -> list[dict]:
    res = get_db().table("meals").select(
        "id, name, category, portions, calories, protein, iron, "
        "meal_ingredients(quantity, ingredient_id, ingredients(name, unit, price))"
    ).execute()
    return res.data


def _fetch_stock_map() -> dict[int, float]:
    res = get_db().table("ingredients").select("id, stock").execute()
    return {row["id"]: float(row["stock"] or 0) for row in res.data}


def _meal_cost_per_portion(meal: dict) -> float:
    portions = max(meal.get("portions") or 1, 1)
    total = sum(
        float(it["quantity"]) * float((it.get("ingredients") or {}).get("price") or 0)
        for it in (meal.get("meal_ingredients") or [])
    )
    return round(total / portions, 2)


def _meal_score(meal: dict, cost_per_portion: float) -> float:
    price = max(cost_per_portion, 0.01)
    nutrition = (
        float(meal.get("calories") or 0) / DAILY_CALORIE_TARGET
        + float(meal.get("protein") or 0) / DAILY_PROTEIN_TARGET_G
        + float(meal.get("iron") or 0) / DAILY_IRON_TARGET_MG
    )
    return nutrition / price


def _is_makeable(meal: dict, stock_map: dict[int, float]) -> bool:
    for it in meal.get("meal_ingredients") or []:
        needed = float(it["quantity"])
        available = stock_map.get(it["ingredient_id"], 0)
        if needed > available:
            return False
    return True


def _consume(meal: dict, stock_map: dict[int, float]) -> None:
    for it in meal.get("meal_ingredients") or []:
        iid = it["ingredient_id"]
        stock_map[iid] = stock_map.get(iid, 0) - float(it["quantity"])


def _build_gemini_prompt(by_category: dict[str, list[dict]], budget: float, extra_instructions: str | None) -> str:
    lines = []
    for category, meals in by_category.items():
        for m in meals:
            cost = _meal_cost_per_portion(m)
            lines.append(
                f"- meal_id={m['id']} | kategori={category} | {m['name']} | "
                f"porsiyon başı ~{cost}TL | {m.get('calories', 0)}kcal"
            )
    catalog_text = "\n".join(lines)
    extra_block = f"\nEk talimat (öncelikli): {extra_instructions}\n" if extra_instructions else ""
    return f"""Sen bir okul yemekhanesi menü planlama asistanısın. Aşağıda depodaki mevcut malzemelerle
ŞU AN YAPILABİLECEK yemeklerin kataloğu var (kategori bazında, meal_id ile):
{catalog_text}

Görev: Pazartesi'den Pazar'a kadar (7 gün) her gün, yukarıdaki her kategoriden
(Çorba, Ana Yemek, Ara Sıcak, Tahıl (Pilav/Makarna), Yoğurt/Salata, Tatlı/Meyve) BİRER yemek seç.
Aynı yemeği hafta içinde art arda günlerde tekrar etme, çeşitlilik sağla.
{extra_block}
Haftalık bütçe yaklaşık {budget} TL. Bütçeyi göz önünde bulundur ama her gün her kategoriden
bir seçim yapmayı önceliklendir.
Sadece istenen JSON şemasına uygun çıktı üret, başka açıklama ekleme.
"""


def _client() -> genai.Client:
    if not settings.gemini_api_key:
        raise MenuAIError("GEMINI_API_KEY yapılandırılmamış.")
    return genai.Client(api_key=settings.gemini_api_key)


def _gemini_picks(by_category: dict[str, list[dict]], budget: float, extra_instructions: str | None) -> list[dict]:
    response = _client().models.generate_content(
        model=settings.gemini_model,
        contents=_build_gemini_prompt(by_category, budget, extra_instructions),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        ),
    )
    parsed = json.loads(response.text or "{}")
    return parsed.get("picks", [])


def _deterministic_pick(candidates: list[dict], rotation_idx: int, over_budget: bool) -> dict:
    if over_budget:
        ordered = sorted(candidates, key=lambda m: _meal_cost_per_portion(m))
    else:
        ordered = sorted(candidates, key=lambda m: _meal_score(m, _meal_cost_per_portion(m)), reverse=True)
    return ordered[rotation_idx % len(ordered)]


def generate_weekly_menu(week_start_date: date, budget: float, extra_instructions: str | None = None) -> dict:
    """Depodaki mevcut malzemelerle şu an yapılabilecek yemek kataloğundan (Yemek Kategorisi)
    7 günlük, kategori kategori dolu bir haftalık menü üretir. Önce Gemini'den öneri istenir;
    başarısız olursa veya bir öneri artık yapılamaz hale gelmişse (stok tükendiyse) besin/fiyat
    skoruna göre deterministik seçimle tamamlanır — bu yüzden GEMINI_API_KEY olmasa da çalışır.
    """
    catalog = _fetch_catalog()
    if not catalog:
        raise MenuAIError("Yemek kataloğunda hiç kayıt yok.")

    stock_map = _fetch_stock_map()
    by_category: dict[str, list[dict]] = {c: [m for m in catalog if m["category"] == c] for c in CATEGORIES}
    meals_by_id = {m["id"]: m for m in catalog}

    gemini_picks_by_slot: dict[tuple[str, str], int] = {}
    try:
        for p in _gemini_picks(by_category, budget, extra_instructions):
            gemini_picks_by_slot[(p.get("day"), p.get("category"))] = p.get("meal_id")
    except Exception:
        gemini_picks_by_slot = {}

    rotation_idx = {c: 0 for c in CATEGORIES}
    running_cost = 0.0
    picks: list[tuple[str, str, dict]] = []

    for day in ALL_DAYS:
        for category in CATEGORIES:
            pool = [m for m in by_category.get(category, []) if _is_makeable(m, stock_map)]
            if not pool:
                continue

            chosen = None
            gemini_choice_id = gemini_picks_by_slot.get((day, category))
            if gemini_choice_id is not None:
                candidate = meals_by_id.get(gemini_choice_id)
                if candidate and candidate["category"] == category and _is_makeable(candidate, stock_map):
                    chosen = candidate

            if chosen is None:
                over_budget = budget > 0 and running_cost > budget
                chosen = _deterministic_pick(pool, rotation_idx[category], over_budget)
                rotation_idx[category] += 1

            _consume(chosen, stock_map)
            portions = max(chosen.get("portions") or 1, 1)
            running_cost += _meal_cost_per_portion(chosen) * portions
            picks.append((day, category, chosen))

    if not picks:
        raise MenuAIError("Depodaki malzemelerle hiçbir yemek üretilemedi. Malzeme Deposu stoklarını kontrol edin.")

    db = get_db()
    menu_res = db.table("weekly_menus").insert({
        "week_start_date": week_start_date.isoformat(),
        "budget": budget,
        "total_cost": 0,
        "total_calories": 0,
        "total_protein": 0,
        "total_iron": 0,
        "status": "draft",
        "notes": extra_instructions,
    }).execute()
    menu = menu_res.data[0]

    item_rows = []
    for day, category, meal in picks:
        portions = max(meal.get("portions") or 1, 1)
        cost_per_portion = _meal_cost_per_portion(meal)
        item_rows.append({
            "weekly_menu_id": menu["id"],
            "day_of_week": day,
            "category": category,
            "meal_id": meal["id"],
            "meal_name": meal["name"],
            "portions": portions,
            "estimated_cost": cost_per_portion,
            "calories": meal.get("calories") or 0,
            "protein": meal.get("protein") or 0,
            "iron": meal.get("iron") or 0,
        })
    db.table("weekly_menu_items").insert(item_rows).execute()

    total_cost = sum(r["estimated_cost"] * r["portions"] for r in item_rows)
    total_calories = sum(r["calories"] for r in item_rows)
    total_protein = sum(r["protein"] for r in item_rows)
    total_iron = sum(r["iron"] for r in item_rows)
    db.table("weekly_menus").update({
        "total_cost": round(total_cost, 2),
        "total_calories": round(total_calories, 2),
        "total_protein": round(total_protein, 2),
        "total_iron": round(total_iron, 2),
    }).eq("id", menu["id"]).execute()

    final = db.table("weekly_menus").select("*").eq("id", menu["id"]).single().execute()
    items_res = db.table("weekly_menu_items").select("*").eq("weekly_menu_id", menu["id"]).execute()
    return {**final.data, "items": items_res.data}
