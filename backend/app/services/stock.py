"""Akıllı stok analizi — SKT durumu ve gelecek-menü ihtiyacına göre eksik hesabı.

Hem /ingredients/alerts (uyarı paneli) hem /orders/generate (otomatik sipariş ajanı)
aynı hesabı kullanır; tek kaynak burasıdır."""

from datetime import date

# Stok bir malzemenin bu eşiğin altına inince "kritik" sayılır (menü ihtiyacı yoksa geçerli)
LOW_STOCK_THRESHOLD = 20
EXPIRING_SOON_DAYS = 7


def compute_alerts(db) -> dict:
    """Akıllı stok uyarıları:
    - expired: SKT'si geçmiş partiler (atılacak/yenilenecek miktar)
    - expiring_soon: SKT'si <= 7 gün kalan partiler
    - shortages: GELECEK (bugün ve sonrası) menülerdeki yemeklerin gerektirdiği toplam
      malzeme - eldeki stok. Menü ihtiyacı yoksa stok eşik altındaysa da eklenir.
    """
    today = date.today()

    ingredients = db.table("ingredients").select("id, name, unit, stock").execute().data
    ing_by_id = {i["id"]: i for i in ingredients}

    # ── SKT durumu (partiler) ──
    batches = db.table("ingredient_batches").select(
        "id, ingredient_id, quantity, expiry_date"
    ).gt("quantity", 0).execute().data
    expired, expiring = [], []
    for b in batches:
        exp = b.get("expiry_date")
        if not exp:
            continue
        try:
            exp_d = date.fromisoformat(exp)
        except ValueError:
            continue
        days = (exp_d - today).days
        ing = ing_by_id.get(b["ingredient_id"], {})
        row = {"batch_id": b["id"], "ingredient_id": b["ingredient_id"], "name": ing.get("name", "?"),
               "unit": ing.get("unit", ""), "quantity": b["quantity"],
               "expiry_date": exp, "days_left": days}
        if days < 0:
            expired.append(row)
        elif days <= EXPIRING_SOON_DAYS:
            expiring.append(row)
    expired.sort(key=lambda r: r["days_left"])
    expiring.sort(key=lambda r: r["days_left"])

    # ── Gelecek menü ihtiyacı ──
    meals = db.table("meals").select("id, portions").execute().data
    portions_by_meal = {m["id"]: max(int(m.get("portions") or 1), 1) for m in meals}
    mis = db.table("meal_ingredients").select("meal_id, ingredient_id, quantity").execute().data
    recipe = {}  # meal_id -> [(ingredient_id, 1 porsiyonluk miktar)]
    for mi in mis:
        per_portion = float(mi.get("quantity") or 0) / portions_by_meal.get(mi["meal_id"], 1)
        recipe.setdefault(mi["meal_id"], []).append((mi["ingredient_id"], per_portion))

    menus = db.table("weekly_menus").select("id, week_start_date").execute().data
    future_ids = [m["id"] for m in menus
                  if (m.get("week_start_date") or "9999") >= today.isoformat()]
    required = {}  # ingredient_id -> toplam gereken miktar
    if future_ids:
        items = db.table("weekly_menu_items").select(
            "weekly_menu_id, meal_id, portions"
        ).in_("weekly_menu_id", future_ids).execute().data
        for it in items:
            port = int(it.get("portions") or 0)
            for ing_id, per in recipe.get(it.get("meal_id"), []):
                required[ing_id] = required.get(ing_id, 0) + per * port

    shortages = []
    seen = set()
    for ing_id, req in required.items():
        ing = ing_by_id.get(ing_id)
        if not ing:
            continue
        stock = float(ing.get("stock") or 0)
        shortage = round(req - stock, 2)
        if shortage > 0:
            shortages.append({"ingredient_id": ing_id, "name": ing["name"], "unit": ing["unit"],
                              "stock": stock, "required": round(req, 2), "shortage": shortage,
                              "reason": "menu"})
            seen.add(ing_id)
    # Menü ihtiyacı olmayan ama stok eşik altı olanlar
    for ing in ingredients:
        if ing["id"] in seen:
            continue
        stock = float(ing.get("stock") or 0)
        if stock < LOW_STOCK_THRESHOLD:
            shortages.append({"ingredient_id": ing["id"], "name": ing["name"], "unit": ing["unit"],
                              "stock": stock, "required": LOW_STOCK_THRESHOLD,
                              "shortage": round(LOW_STOCK_THRESHOLD - stock, 2), "reason": "threshold"})
    shortages.sort(key=lambda r: r["shortage"], reverse=True)

    return {
        "expired": expired, "expiring_soon": expiring, "shortages": shortages,
        "counts": {"expired": len(expired), "expiring_soon": len(expiring),
                   "shortages": len(shortages)},
    }
