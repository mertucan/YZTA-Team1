"""Servis tüketimi ve talep tahmini.

- close_day: "Günü Kapat" — o günün menüsü servis edildi sayılır; gereken malzeme
  partilerden FEFO (önce SKT'si yakın olan) düşülür, consumption_logs'a yazılır.
  Stok artık tahminle değil FİİLİ tüketimle iner.
- forecast_depletion: tüketim hızı (loglar) + gelecek menü ihtiyacından her malzemenin
  TÜKENİŞ TARİHİNİ ve önerilen sipariş gününü tahmin eder.
- suggest_min_stock: tüketim hızından malzeme bazlı kritik eşik önerir/uygular.
"""

from datetime import date, timedelta

from app.services.stock import min_stock_of

DAY_NAMES_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

LEAD_TIME_DAYS = 3    # tedarikçiden ortalama teslim süresi
SAFETY_DAYS = 2       # güvenlik payı
HISTORY_WINDOW_DAYS = 30


class ConsumptionError(Exception):
    pass


def _day_requirements(db, service_date: date) -> tuple[dict, dict | None, str]:
    """O günün menüsündeki yemeklerden malzeme ihtiyacını çıkarır.
    -> ({ingredient_id: miktar}, menu, gün adı)"""
    day_name = DAY_NAMES_TR[service_date.weekday()]

    menus = db.table("weekly_menus").select("id, week_start_date, portions").execute().data
    menu = None
    for m in menus:
        try:
            ws = date.fromisoformat(m["week_start_date"])
        except (TypeError, ValueError):
            continue
        if ws <= service_date <= ws + timedelta(days=6):
            menu = m
            break
    if not menu:
        raise ConsumptionError(f"{service_date.isoformat()} tarihini kapsayan haftalık menü yok.")

    items = db.table("weekly_menu_items").select(
        "meal_id, portions, day_of_week"
    ).eq("weekly_menu_id", menu["id"]).eq("day_of_week", day_name).execute().data
    meal_ids = [it["meal_id"] for it in items if it.get("meal_id")]
    if not meal_ids:
        raise ConsumptionError(f"{day_name} günü için menüde yemek yok.")

    meals = db.table("meals").select("id, portions").in_("id", meal_ids).execute().data
    recipe_portions = {m["id"]: max(int(m.get("portions") or 1), 1) for m in meals}
    mis = db.table("meal_ingredients").select(
        "meal_id, ingredient_id, quantity"
    ).in_("meal_id", meal_ids).execute().data
    per_portion: dict[int, list] = {}
    for mi in mis:
        per_portion.setdefault(mi["meal_id"], []).append(
            (mi["ingredient_id"], float(mi.get("quantity") or 0) / recipe_portions.get(mi["meal_id"], 1))
        )

    required: dict[int, float] = {}
    total_portions = 0
    for it in items:
        port = int(it.get("portions") or 0)
        total_portions = max(total_portions, port)
        for ing_id, per in per_portion.get(it.get("meal_id"), []):
            required[ing_id] = required.get(ing_id, 0) + per * port
    return required, {**menu, "total_portions": total_portions}, day_name


def close_day(db, service_date: date | None = None) -> dict:
    """Günü kapat: menü gereksinimini partilerden FEFO düşer, log yazar."""
    service_date = service_date or date.today()

    existing = db.table("consumption_logs").select("id").eq(
        "service_date", service_date.isoformat()
    ).execute().data
    if existing:
        raise ConsumptionError(f"{service_date.isoformat()} günü zaten kapatılmış.")

    required, menu, day_name = _day_requirements(db, service_date)

    ings = {i["id"]: i for i in db.table("ingredients").select("id, name, unit").execute().data}
    details = []
    affected: set[int] = set()
    for ing_id, need in sorted(required.items()):
        ing = ings.get(ing_id, {})
        # FEFO: SKT'si en yakın parti önce tüketilir (SKT'siz partiler en sona)
        batches = db.table("ingredient_batches").select(
            "id, quantity, expiry_date"
        ).eq("ingredient_id", ing_id).gt("quantity", 0).execute().data
        batches.sort(key=lambda b: (b.get("expiry_date") is None, b.get("expiry_date") or ""))

        remaining = round(need, 3)
        consumed = 0.0
        for b in batches:
            if remaining <= 0:
                break
            take = min(float(b["quantity"]), remaining)
            db.table("ingredient_batches").update(
                {"quantity": round(float(b["quantity"]) - take, 3)}
            ).eq("id", b["id"]).execute()
            consumed += take
            remaining = round(remaining - take, 3)
        affected.add(ing_id)
        details.append({
            "ingredient_id": ing_id, "name": ing.get("name", f"#{ing_id}"),
            "unit": ing.get("unit", ""), "required": round(need, 2),
            "consumed": round(consumed, 2), "shortfall": round(max(remaining, 0), 2),
        })

    # stok toplamlarını güncelle (ort. fiyat mantığı ingredients router'daki ile aynı)
    from app.routers.ingredients import _recompute_stock
    for ing_id in affected:
        _recompute_stock(ing_id)

    log = db.table("consumption_logs").insert({
        "service_date": service_date.isoformat(),
        "weekly_menu_id": menu["id"],
        "day_of_week": day_name,
        "total_portions": menu.get("total_portions") or 0,
        "details": details,
    }).execute().data[0]

    shortfalls = [d for d in details if d["shortfall"] > 0]
    return {**log, "consumed_count": len(details), "shortfall_count": len(shortfalls)}


def _daily_rates(db) -> dict[int, float]:
    """Malzeme başına günlük tüketim hızı: son 30 günün logları; log yoksa
    önümüzdeki 7 günün menü ihtiyacından türetilir."""
    since = (date.today() - timedelta(days=HISTORY_WINDOW_DAYS)).isoformat()
    logs = db.table("consumption_logs").select("service_date, details").gte(
        "service_date", since
    ).execute().data

    rates: dict[int, float] = {}
    if logs:
        days = max(len({l["service_date"] for l in logs}), 1)
        totals: dict[int, float] = {}
        for l in logs:
            for d in l.get("details") or []:
                totals[d["ingredient_id"]] = totals.get(d["ingredient_id"], 0) + float(d.get("consumed") or 0)
        rates = {k: v / days for k, v in totals.items()}

    # menü bazlı hız (log'u olmayan malzemeler için tamamlayıcı)
    today = date.today()
    menu_req: dict[int, float] = {}
    try:
        for offset in range(7):
            try:
                req, _, _ = _day_requirements(db, today + timedelta(days=offset))
                for k, v in req.items():
                    menu_req[k] = menu_req.get(k, 0) + v
            except ConsumptionError:
                continue
        for k, v in menu_req.items():
            menu_rate = v / 7
            if rates.get(k, 0) < menu_rate:
                rates[k] = max(rates.get(k, 0), menu_rate)
    except Exception:
        pass
    return rates


def forecast_depletion(db) -> list[dict]:
    """Her malzeme için: günlük hız, kaç gün yeter, tükeniş tarihi, önerilen sipariş günü."""
    ings = db.table("ingredients").select("id, name, unit, stock, min_stock").execute().data
    rates = _daily_rates(db)
    today = date.today()

    rows = []
    for ing in ings:
        rate = rates.get(ing["id"], 0)
        stock = float(ing.get("stock") or 0)
        if rate <= 0:
            continue
        days_left = stock / rate
        depletion = today + timedelta(days=int(days_left))
        order_by = depletion - timedelta(days=LEAD_TIME_DAYS + SAFETY_DAYS)
        rows.append({
            "ingredient_id": ing["id"], "name": ing["name"], "unit": ing["unit"],
            "stock": round(stock, 1), "min_stock": min_stock_of(ing),
            "daily_rate": round(rate, 2), "days_left": round(days_left, 1),
            "depletion_date": depletion.isoformat(),
            "order_by_date": max(order_by, today).isoformat(),
            "urgent": order_by <= today,
        })
    rows.sort(key=lambda r: r["days_left"])
    return rows


def suggest_min_stock(db, apply: bool = True) -> list[dict]:
    """Kritik eşik önerisi = günlük hız × (teslim süresi + güvenlik payı).
    apply=True ise ingredients.min_stock güncellenir."""
    ings = db.table("ingredients").select("id, name, unit, min_stock").execute().data
    rates = _daily_rates(db)
    changes = []
    for ing in ings:
        rate = rates.get(ing["id"], 0)
        if rate <= 0:
            continue
        suggested = round(rate * (LEAD_TIME_DAYS + SAFETY_DAYS), 1)
        current = ing.get("min_stock")
        if current is not None and abs(float(current) - suggested) < 0.5:
            continue
        if apply:
            db.table("ingredients").update({"min_stock": suggested}).eq("id", ing["id"]).execute()
        changes.append({"ingredient_id": ing["id"], "name": ing["name"], "unit": ing["unit"],
                        "old": float(current) if current is not None else None, "new": suggested,
                        "daily_rate": round(rate, 2)})
    return changes
