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
    res = (
        get_db()
        .table("meals")
        .select(
            "id, name, category, portions, calories, protein, iron, "
            "meal_ingredients(quantity, ingredient_id, ingredients(name, unit, price, stock, is_local, origin_region, season_start_month, season_end_month, market_price))"
        )
        .execute()
    )
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


def _is_month_in_season(ingredient: dict, month: int) -> bool:
    start = ingredient.get("season_start_month")
    end = ingredient.get("season_end_month")
    if start is None or end is None:
        return False
    start = int(start)
    end = int(end)
    return (
        start <= end
        and start <= month <= end
        or start > end
        and (month >= start or month <= end)
    )


def _ingredient_price_advantage(ingredient: dict) -> float:
    price = float(ingredient.get("price") or 0)
    market_price = float(ingredient.get("market_price") or 0)
    if price <= 0 or market_price <= 0 or price >= market_price:
        return 0
    return round((market_price - price) / market_price, 4)


def _meal_seasonal_metrics(meal: dict, month: int) -> dict:
    items = meal.get("meal_ingredients") or []
    if not items:
        return {
            "seasonal_score": 0,
            "local_score": 0,
            "price_advantage_score": 0,
            "local_ingredient_ratio": 0,
            "seasonal_ingredients": [],
            "local_ingredients": [],
            "opportunity_ingredients": [],
        }

    seasonal_names = []
    local_names = []
    opportunity_names = []
    local_count = 0
    seasonal_count = 0
    price_advantages = []

    for item in items:
        ingredient = item.get("ingredients") or {}
        name = ingredient.get("name") or f"#{item.get('ingredient_id')}"
        is_seasonal = _is_month_in_season(ingredient, month)
        is_local = bool(ingredient.get("is_local"))
        price_advantage = _ingredient_price_advantage(ingredient)

        if is_seasonal:
            seasonal_count += 1
            seasonal_names.append(name)
        if is_local:
            local_count += 1
            local_names.append(name)
        if price_advantage > 0:
            price_advantages.append(price_advantage)
        if is_seasonal or is_local or price_advantage > 0:
            opportunity_names.append(name)

    total = max(len(items), 1)
    avg_price_advantage = (
        sum(price_advantages) / len(price_advantages) if price_advantages else 0
    )
    return {
        "seasonal_score": round(seasonal_count / total, 4),
        "local_score": round(local_count / total, 4),
        "price_advantage_score": round(avg_price_advantage, 4),
        "local_ingredient_ratio": round(local_count / total, 4),
        "seasonal_ingredients": seasonal_names,
        "local_ingredients": local_names,
        "opportunity_ingredients": sorted(set(opportunity_names)),
    }


def _meal_opportunity_score(meal: dict, month: int) -> float:
    cost = _meal_cost_per_portion(meal)
    metrics = _meal_seasonal_metrics(meal, month)
    return (
        _meal_score(meal, cost)
        + metrics["seasonal_score"] * 2
        + metrics["local_score"] * 1.5
        + metrics["price_advantage_score"] * 2
    )


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


def _build_gemini_prompt(
    by_category: dict[str, list[dict]],
    budget: float,
    extra_instructions: str | None,
    month: int,
) -> str:
    lines = []
    for category, meals in by_category.items():
        for m in meals:
            cost = _meal_cost_per_portion(m)
            metrics = _meal_seasonal_metrics(m, month)
            tags = []
            if metrics["seasonal_ingredients"]:
                tags.append(
                    "mevsimsel:" + ",".join(metrics["seasonal_ingredients"][:3])
                )
            if metrics["local_ingredients"]:
                tags.append("yerel:" + ",".join(metrics["local_ingredients"][:3]))
            if metrics["price_advantage_score"] > 0:
                tags.append(
                    f"fiyat-avantaji:%{round(metrics['price_advantage_score'] * 100)}"
                )
            tag_str = " | " + " | ".join(tags) if tags else ""
            lines.append(
                f"- meal_id={m['id']} | kategori={category} | {m['name']} | "
                f"porsiyon basi ~{cost}TL | {m.get('calories', 0)}kcal{tag_str}"
            )
    catalog_text = "\n".join(lines)
    extra_block = (
        f"\nEk talimat (öncelikli): {extra_instructions}\n"
        if extra_instructions
        else ""
    )
    return f"""Sen bir okul yemekhanesi menu planlama asistanisin. Asagida depodaki mevcut malzemelerle
SU AN YAPILABİLECEK yemeklerin katalogu var (kategori bazinda, meal_id ile).
Katalogda 'mevsimsel' etiketi o yemekte bu ay mevsiminde olan malzeme olduğunu,
'yerel' etiketi yerel/yerli tedarikli malzeme icerdigini, 'fiyat-avantaji' ise piyasa fiyatina
gore ucuz malzeme icerdigini gosterir. Bu etiketli yemekleri tercih et.
{catalog_text}

Gorev: Pazartesi'den Pazar'a kadar (7 gun) her gun, yukaridaki her kategoriden
(Corba, Ana Yemek, Ara Sicak, Tahil (Pilav/Makarna), Yogurt/Salata, Tatli/Meyve) BIRER yemek sec.
Ayni yemegi hafta icinde art arda gunlerde tekrar etme, cesitlilik sagla.
Mevsimsel, yerel ve fiyat-avantajli etiketli yemekleri onceliklendir.
{extra_block}
Haftalik butce yaklasik {budget} TL. Butceyi goz onunde bulundur ama her gun her kategoriden
bir secim yapmayi onceliklendir.
Sadece istenen JSON semasina uygun cikti uret, baska aciklama ekleme.
"""


def _client() -> genai.Client:
    if not settings.gemini_api_key:
        raise MenuAIError("GEMINI_API_KEY yapılandırılmamış.")
    return genai.Client(api_key=settings.gemini_api_key)


def _gemini_picks(
    by_category: dict[str, list[dict]],
    budget: float,
    extra_instructions: str | None,
    month: int,
) -> list[dict]:
    response = _client().models.generate_content(
        model=settings.gemini_model,
        contents=_build_gemini_prompt(by_category, budget, extra_instructions, month),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        ),
    )
    parsed = json.loads(response.text or "{}")
    return parsed.get("picks", [])


def _deterministic_pick(
    candidates: list[dict], rotation_idx: int, over_budget: bool, month: int = 0
) -> dict:
    """Bütçe aşıldıysa en ucuz yemeği, değilse mevsimsel/yerel/fiyat bonuslu
    opportunity skoruna göre en iyi yemeği seçer."""
    if over_budget:
        ordered = sorted(candidates, key=lambda m: _meal_cost_per_portion(m))
    else:
        ordered = sorted(
            candidates,
            key=lambda m: _meal_opportunity_score(m, month),
            reverse=True,
        )
    return ordered[rotation_idx % len(ordered)]


def suggest_seasonal_revisions(menu_id: int) -> dict:
    db = get_db()
    menu_res = db.table("weekly_menus").select("*").eq("id", menu_id).single().execute()
    if not menu_res.data:
        raise MenuAIError("Menu bulunamadi.")

    menu = menu_res.data
    month = date.fromisoformat(menu["week_start_date"]).month
    items_res = (
        db.table("weekly_menu_items")
        .select("*")
        .eq("weekly_menu_id", menu_id)
        .execute()
    )
    current_items = [
        item for item in items_res.data if item.get("meal_id") and item.get("category")
    ]
    catalog = _fetch_catalog()
    stock_map = _fetch_stock_map()

    revisions = []
    for item in current_items:
        current_meal = next(
            (meal for meal in catalog if meal["id"] == item["meal_id"]), None
        )
        if not current_meal:
            continue

        current_cost = _meal_cost_per_portion(current_meal)
        current_metrics = _meal_seasonal_metrics(current_meal, month)
        current_score = _meal_opportunity_score(current_meal, month)
        candidates = [
            meal
            for meal in catalog
            if meal["category"] == item["category"]
            and meal["id"] != item["meal_id"]
            and _is_makeable(meal, stock_map)
        ]

        best = None
        for candidate in candidates:
            candidate_cost = _meal_cost_per_portion(candidate)
            candidate_metrics = _meal_seasonal_metrics(candidate, month)
            savings = round(max(current_cost - candidate_cost, 0), 2)
            score_delta = _meal_opportunity_score(candidate, month) - current_score
            if savings <= 0 and score_delta <= 0.2:
                continue

            proposal = {
                "menu_item_id": item["id"],
                "day_of_week": item["day_of_week"],
                "category": item["category"],
                "current_meal_id": item["meal_id"],
                "current_meal_name": item["meal_name"],
                "current_cost": current_cost,
                "suggested_meal_id": candidate["id"],
                "suggested_meal_name": candidate["name"],
                "suggested_cost": candidate_cost,
                "estimated_savings": savings,
                "seasonal_score": candidate_metrics["seasonal_score"],
                "local_score": candidate_metrics["local_score"],
                "price_advantage_score": candidate_metrics["price_advantage_score"],
                "local_ingredient_ratio": candidate_metrics["local_ingredient_ratio"],
                "seasonal_ingredients": candidate_metrics["seasonal_ingredients"],
                "local_ingredients": candidate_metrics["local_ingredients"],
                "opportunity_ingredients": candidate_metrics["opportunity_ingredients"],
                "reason": _revision_reason(candidate_metrics, savings),
            }
            if best is None or (
                proposal["estimated_savings"],
                proposal["seasonal_score"],
                proposal["local_score"],
            ) > (
                best["estimated_savings"],
                best["seasonal_score"],
                best["local_score"],
            ):
                best = proposal

        if best:
            revisions.append(best)

    total_savings = round(sum(item["estimated_savings"] for item in revisions), 2)
    local_ratio = (
        round(
            sum(item["local_ingredient_ratio"] for item in revisions) / len(revisions),
            4,
        )
        if revisions
        else 0
    )
    return {
        "menu_id": menu_id,
        "week_start_date": menu["week_start_date"],
        "total_estimated_savings": total_savings,
        "average_local_ingredient_ratio": local_ratio,
        "revision_count": len(revisions),
        "revisions": revisions,
    }


def _revision_reason(metrics: dict, savings: float) -> str:
    parts = []
    if savings > 0:
        parts.append(f"porsiyon basina yaklasik {savings:.2f} TL tasarruf")
    if metrics["seasonal_ingredients"]:
        parts.append(
            "mevsim urunleri: " + ", ".join(metrics["seasonal_ingredients"][:3])
        )
    if metrics["local_ingredients"]:
        parts.append("yerel urunler: " + ", ".join(metrics["local_ingredients"][:3]))
    if metrics["price_advantage_score"] > 0:
        parts.append("piyasa fiyatina gore avantajli malzeme")
    return "; ".join(parts) or "mevsimsellik ve maliyet skoru daha yuksek"


def generate_weekly_menu(
    week_start_date: date, budget: float, extra_instructions: str | None = None
) -> dict:
    """Depodaki mevcut malzemelerle şu an yapılabilecek yemek kataloğundan (Yemek Kategorisi)
    7 günlük, kategori kategori dolu bir haftalık menü üretir. Önce Gemini'den öneri istenir;
    başarısız olursa veya bir öneri artık yapılamaz hale gelmişse (stok tükendiyse) besin/fiyat
    skoruna göre deterministik seçimle tamamlanır — bu yüzden GEMINI_API_KEY olmasa da çalışır.
    """
    catalog = _fetch_catalog()
    if not catalog:
        raise MenuAIError("Yemek kataloğunda hiç kayıt yok.")

    stock_map = _fetch_stock_map()
    by_category: dict[str, list[dict]] = {
        c: [m for m in catalog if m["category"] == c] for c in CATEGORIES
    }
    meals_by_id = {m["id"]: m for m in catalog}

    month = week_start_date.month

    gemini_picks_by_slot: dict[tuple[str, str], int] = {}
    try:
        for p in _gemini_picks(by_category, budget, extra_instructions, month):
            gemini_picks_by_slot[(p.get("day"), p.get("category"))] = p.get("meal_id")
    except Exception:
        gemini_picks_by_slot = {}

    rotation_idx = {c: 0 for c in CATEGORIES}
    running_cost = 0.0
    picks: list[tuple[str, str, dict]] = []

    for day in ALL_DAYS:
        for category in CATEGORIES:
            pool = [
                m for m in by_category.get(category, []) if _is_makeable(m, stock_map)
            ]
            if not pool:
                continue

            chosen = None
            gemini_choice_id = gemini_picks_by_slot.get((day, category))
            if gemini_choice_id is not None:
                candidate = meals_by_id.get(gemini_choice_id)
                if (
                    candidate
                    and candidate["category"] == category
                    and _is_makeable(candidate, stock_map)
                ):
                    chosen = candidate

            if chosen is None:
                over_budget = budget > 0 and running_cost > budget
                chosen = _deterministic_pick(
                    pool, rotation_idx[category], over_budget, month
                )
                rotation_idx[category] += 1

            _consume(chosen, stock_map)
            portions = max(chosen.get("portions") or 1, 1)
            running_cost += _meal_cost_per_portion(chosen) * portions
            picks.append((day, category, chosen))

    if not picks:
        raise MenuAIError(
            "Depodaki malzemelerle hiçbir yemek üretilemedi. Malzeme Deposu stoklarını kontrol edin."
        )

    db = get_db()
    menu_res = (
        db.table("weekly_menus")
        .insert(
            {
                "week_start_date": week_start_date.isoformat(),
                "budget": budget,
                "total_cost": 0,
                "total_calories": 0,
                "total_protein": 0,
                "total_iron": 0,
                "status": "draft",
                "notes": extra_instructions,
            }
        )
        .execute()
    )
    menu = menu_res.data[0]

    item_rows = []
    for day, category, meal in picks:
        portions = max(meal.get("portions") or 1, 1)
        cost_per_portion = _meal_cost_per_portion(meal)
        item_rows.append(
            {
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
            }
        )
    db.table("weekly_menu_items").insert(item_rows).execute()

    total_cost = sum(r["estimated_cost"] * r["portions"] for r in item_rows)
    total_calories = sum(r["calories"] for r in item_rows)
    total_protein = sum(r["protein"] for r in item_rows)
    total_iron = sum(r["iron"] for r in item_rows)
    db.table("weekly_menus").update(
        {
            "total_cost": round(total_cost, 2),
            "total_calories": round(total_calories, 2),
            "total_protein": round(total_protein, 2),
            "total_iron": round(total_iron, 2),
        }
    ).eq("id", menu["id"]).execute()

    final = db.table("weekly_menus").select("*").eq("id", menu["id"]).single().execute()
    items_res = (
        db.table("weekly_menu_items")
        .select("*")
        .eq("weekly_menu_id", menu["id"])
        .execute()
    )
    return {**final.data, "items": items_res.data}
