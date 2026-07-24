from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.ingredient import (
    Ingredient,
    IngredientCreate,
    IngredientUpdate,
    IngredientBatch,
    IngredientBatchCreate,
    IngredientBatchUpdate,
)
from app.services.migros import MigrosError, fetch_ingredient_market_price, diagnose

router = APIRouter(prefix="/ingredients", tags=["ingredients"])

# Stok bir malzemenin bu eşiğin altına inince "kritik" sayılır (menü ihtiyacı yoksa geçerli)
_LOW_STOCK_THRESHOLD = 20
_EXPIRING_SOON_DAYS = 7


@router.get("/alerts")
def stock_alerts():
    """Akıllı stok uyarıları:
    - expired: SKT'si geçmiş partiler (atılacak/yenilenecek miktar)
    - expiring_soon: SKT'si <= 7 gün kalan partiler
    - shortages: GELECEK (bugün ve sonrası) menülerdeki yemeklerin gerektirdiği toplam
      malzeme - eldeki stok. Menü ihtiyacı yoksa stok eşik altındaysa da eklenir.
    Böylece 'neye ne kadar ihtiyaç var' müdüre tek bakışta çıkar (otomatik siparişin temeli)."""
    db = get_db()
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
        elif days <= _EXPIRING_SOON_DAYS:
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
        if stock < _LOW_STOCK_THRESHOLD:
            shortages.append({"ingredient_id": ing["id"], "name": ing["name"], "unit": ing["unit"],
                              "stock": stock, "required": _LOW_STOCK_THRESHOLD,
                              "shortage": round(_LOW_STOCK_THRESHOLD - stock, 2), "reason": "threshold"})
    shortages.sort(key=lambda r: r["shortage"], reverse=True)

    return {
        "expired": expired, "expiring_soon": expiring, "shortages": shortages,
        "counts": {"expired": len(expired), "expiring_soon": len(expiring),
                   "shortages": len(shortages)},
    }


def _recompute_stock(ingredient_id: int) -> None:
    """Parti değişince toplam stoğu VE ortalama birim fiyatı günceller.
    ingredients.price = eldeki partilerin miktar-ağırlıklı ortalama birim fiyatı;
    AI menü planlayıcı maliyet hesabında bu türetilmiş fiyatı kullanır."""
    db = get_db()
    batches = db.table("ingredient_batches").select("quantity, unit_price").eq("ingredient_id", ingredient_id).execute()
    total = sum(float(b["quantity"]) for b in batches.data)
    updates: dict = {"stock": total}

    priced = [
        (float(b["quantity"]), float(b["unit_price"]))
        for b in batches.data
        if b.get("unit_price") is not None and float(b["unit_price"]) > 0 and float(b["quantity"]) > 0
    ]
    weight = sum(q for q, _ in priced)
    if weight > 0:
        updates["price"] = round(sum(q * p for q, p in priced) / weight, 2)

    db.table("ingredients").update(updates).eq("id", ingredient_id).execute()


@router.get("/", response_model=list[Ingredient])
def list_ingredients():
    # Sabit sıralama: satır güncellenince (ör. Migros fiyat çekimi market_price yazar)
    # Postgres satırı fiziksel olarak sona taşır; id sırası listeyi oynatmaz.
    res = get_db().table("ingredients").select("*").order("id").execute()
    return res.data


@router.get("/market/prices")
def list_market_prices():
    """Tüm malzemelerin Migros eşleştirme/fiyat kayıtları (frontend satır yanında gösterir)."""
    res = get_db().table("ingredient_market_prices").select("*").eq("source", "migros").execute()
    return res.data


@router.get("/market/health")
def market_health():
    """Migros fiyat servisi sağlık kontrolü (kanarya sorgu 'domates')."""
    return diagnose(force_heal=False)


@router.post("/market/self-heal")
def market_self_heal():
    """Servisi zorla kontrol eder: JSON alan adları değişmişse tespit eder."""
    return diagnose(force_heal=True)


@router.post("/{ingredient_id}/market/fetch")
def fetch_market_price(ingredient_id: int):
    """Migros Fiyat Çek: malzemeyi Migros ürünüyle eşleştirir, güncel fiyatı ve GERÇEK
    birim (kg/lt/adet) fiyatını çıkarır. Zayıf/işlenmiş eşleşme 'güvenilmez' işaretlenir;
    o durumda malzeme fiyatı güncellenmez (menü planlayıcıya sızmaz)."""
    db = get_db()
    ing_res = db.table("ingredients").select("id, name, unit").eq("id", ingredient_id).execute()
    if not ing_res.data:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    ingredient = ing_res.data[0]

    existing = (
        db.table("ingredient_market_prices")
        .select("product_url")
        .eq("ingredient_id", ingredient_id)
        .eq("source", "migros")
        .execute()
    )
    known_url = existing.data[0]["product_url"] if existing.data else None

    try:
        info = fetch_ingredient_market_price(ingredient["name"], ingredient["unit"], known_url)
    except MigrosError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # ağ hatası vb.
        raise HTTPException(status_code=502, detail=f"Migros'a ulaşılamadı: {exc}") from exc

    # LLM ajanı Migros'ta uygun ham ürün BULAMADIYSA (ör. karnabahar/mandalina taze yok):
    # kayıt yazma, malzeme verisine dokunma; frontend'e 'manuel giriş' durumu döndür.
    if info.get("needs_manual_entry"):
        # varsa eski eşleşme kaydını temizle ki yanlış ürün görünmesin
        db.table("ingredient_market_prices").delete().eq("ingredient_id", ingredient_id).eq("source", "migros").execute()
        return {
            "ingredient_id": ingredient_id, "source": "migros",
            "product_url": None, "product_name": None, "unit_price": None,
            "reliable": False, "needs_verification": True, "needs_manual_entry": True,
            "verified_by_llm": info.get("verified_by_llm", False),
            "confidence": 0.0, "warning": info.get("warning"),
        }

    # Güvenilmez eşleşme (ör. "Tavuk Göğsü" → "Tavuk Baget") malzemenin kendi
    # verisini (birim/fiyat) BOZMAMALI: kayıt tutulur ama malzeme güncellenmez,
    # menü planlayıcı bu şüpheli fiyatı kullanmaz. UI 'doğrulama gerekli' gösterir.
    reliable = bool(info.get("reliable"))

    detected_unit = info.get("detected_unit")
    unit_changed = False
    new_unit = None
    final_unit = ingredient["unit"]
    # Migros'un gerçek satış birimi farklıysa malzemenin birimini eşitle (yalnızca güvenilirse)
    if reliable and detected_unit and detected_unit != ingredient["unit"]:
        db.table("ingredients").update({"unit": detected_unit}).eq("id", ingredient_id).execute()
        final_unit = detected_unit
        unit_changed = True
        new_unit = detected_unit

    row = {
        "ingredient_id": ingredient_id,
        "source": "migros",
        "product_url": info["product_url"],
        "product_name": info["product_name"],
        "pack_quantity": info.get("pack_quantity"),
        "pack_unit": final_unit,
        "last_price": info["last_price"],
        "unit_price": info.get("unit_price"),
        "unit_matched": info.get("unit_price") is not None,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
    saved = (
        db.table("ingredient_market_prices")
        .upsert(row, on_conflict="ingredient_id,source")
        .execute()
    )

    # market_price'ı (mevsimsel analiz + planlayıcı kullanır) YALNIZCA güvenilir
    # sonuçta güncelle. Güvenilmezse eski/elle girilmiş değer korunur.
    if reliable and info.get("unit_price"):
        db.table("ingredients").update({
            "market_price": info["unit_price"],
            "last_price_checked_at": date.today().isoformat(),
        }).eq("id", ingredient_id).execute()

    result = saved.data[0] if saved.data else row
    result["unit_changed"] = unit_changed
    result["new_unit"] = new_unit
    result["reliable"] = reliable
    result["needs_verification"] = not reliable
    result["needs_manual_entry"] = False
    result["verified_by_llm"] = info.get("verified_by_llm", False)
    result["confidence"] = info.get("confidence")
    result["warning"] = info.get("warning")
    return result


@router.get("/{ingredient_id}", response_model=Ingredient)
def get_ingredient(ingredient_id: int):
    res = get_db().table("ingredients").select("*").eq("id", ingredient_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return res.data


@router.post("/", response_model=Ingredient, status_code=201)
def create_ingredient(payload: IngredientCreate):
    res = get_db().table("ingredients").insert({**payload.model_dump(mode="json"), "stock": 0}).execute()
    return res.data[0]


@router.patch("/{ingredient_id}", response_model=Ingredient)
def update_ingredient(ingredient_id: int, payload: IngredientUpdate):
    updates = payload.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = get_db().table("ingredients").update(updates).eq("id", ingredient_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return res.data[0]


@router.delete("/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int):
    get_db().table("ingredients").delete().eq("id", ingredient_id).execute()


@router.get("/{ingredient_id}/batches", response_model=list[IngredientBatch])
def list_batches(ingredient_id: int):
    res = (
        get_db()
        .table("ingredient_batches")
        .select("*")
        .eq("ingredient_id", ingredient_id)
        .order("purchase_date", desc=True)
        .execute()
    )
    return res.data


@router.post("/{ingredient_id}/batches", response_model=IngredientBatch, status_code=201)
def create_batch(ingredient_id: int, payload: IngredientBatchCreate):
    res = (
        get_db()
        .table("ingredient_batches")
        .insert({**payload.model_dump(mode="json"), "ingredient_id": ingredient_id})
        .execute()
    )
    _recompute_stock(ingredient_id)
    return res.data[0]


@router.patch("/{ingredient_id}/batches/{batch_id}", response_model=IngredientBatch)
def update_batch(ingredient_id: int, batch_id: int, payload: IngredientBatchUpdate):
    updates = payload.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = (
        get_db()
        .table("ingredient_batches")
        .update(updates)
        .eq("id", batch_id)
        .eq("ingredient_id", ingredient_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    _recompute_stock(ingredient_id)
    return res.data[0]


@router.delete("/{ingredient_id}/batches/{batch_id}", status_code=204)
def delete_batch(ingredient_id: int, batch_id: int):
    get_db().table("ingredient_batches").delete().eq("id", batch_id).eq("ingredient_id", ingredient_id).execute()
    _recompute_stock(ingredient_id)
