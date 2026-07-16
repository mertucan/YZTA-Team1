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
from app.services.a101 import A101Error, fetch_ingredient_market_price

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


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
    # Sabit sıralama: satır güncellenince (ör. A101 fiyat çekimi market_price yazar)
    # Postgres satırı fiziksel olarak sona taşır; id sırası listeyi oynatmaz.
    res = get_db().table("ingredients").select("*").order("id").execute()
    return res.data


@router.get("/a101/prices")
def list_a101_prices():
    """Tüm malzemelerin A101 eşleştirme/fiyat kayıtları (frontend satır yanında gösterir)."""
    res = get_db().table("ingredient_market_prices").select("*").eq("source", "a101").execute()
    return res.data


@router.post("/{ingredient_id}/a101/fetch")
def fetch_a101_price(ingredient_id: int):
    """A101 Veri Çek: malzemeyi A101 ürünüyle eşleştirir (ilk seferde katalogda arar),
    ürün sayfasından güncel fiyatı çeker, birim uyumunu doğrular ve kaydeder.
    Birim fiyat bulunursa malzemenin market_price alanına da yazılır (mevsimsel
    fiyat-avantajı analizini besler)."""
    db = get_db()
    ing_res = db.table("ingredients").select("id, name, unit").eq("id", ingredient_id).execute()
    if not ing_res.data:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    ingredient = ing_res.data[0]

    existing = (
        db.table("ingredient_market_prices")
        .select("product_url")
        .eq("ingredient_id", ingredient_id)
        .eq("source", "a101")
        .execute()
    )
    known_url = existing.data[0]["product_url"] if existing.data else None

    try:
        info = fetch_ingredient_market_price(ingredient["name"], ingredient["unit"], known_url)
    except A101Error as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # ağ hatası vb.
        raise HTTPException(status_code=502, detail=f"A101'e ulaşılamadı: {exc}") from exc

    row = {
        "ingredient_id": ingredient_id,
        "source": "a101",
        **info,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
    saved = (
        db.table("ingredient_market_prices")
        .upsert(row, on_conflict="ingredient_id,source")
        .execute()
    )

    # Birim fiyat mevsimsel analizin kullandığı market_price alanını da günceller
    if info.get("unit_price"):
        db.table("ingredients").update({
            "market_price": info["unit_price"],
            "last_price_checked_at": date.today().isoformat(),
        }).eq("id", ingredient_id).execute()

    return saved.data[0] if saved.data else row


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
