from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.order import (
    Supplier, SupplierCreate, SupplierUpdate,
    GenerateOrderRequest, OrderUpdate,
)
from app.services.stock import compute_alerts

router = APIRouter(prefix="/orders", tags=["orders"])

_VALID_STATUS = {"draft", "sent", "received", "cancelled"}


# ══════════════════════════ Tedarikçiler ══════════════════════════
@router.get("/suppliers", response_model=list[Supplier])
def list_suppliers():
    return get_db().table("suppliers").select("*").order("name").execute().data


@router.post("/suppliers", response_model=Supplier, status_code=201)
def create_supplier(payload: SupplierCreate):
    res = get_db().table("suppliers").insert(payload.model_dump(mode="json")).execute()
    return res.data[0]


@router.patch("/suppliers/{supplier_id}", response_model=Supplier)
def update_supplier(supplier_id: int, payload: SupplierUpdate):
    updates = payload.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = get_db().table("suppliers").update(updates).eq("id", supplier_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return res.data[0]


@router.delete("/suppliers/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int):
    get_db().table("suppliers").delete().eq("id", supplier_id).execute()


# ══════════════════════════ Siparişler ══════════════════════════
def _unit_price_map(db) -> dict:
    """ingredient_id -> birim fiyat (TL/birim). Öncelik: Migros market birim fiyatı,
    yoksa malzemenin market_price'ı, yoksa türetilmiş ortalama alım fiyatı (price)."""
    prices = {}
    ings = db.table("ingredients").select("id, price, market_price").execute().data
    for i in ings:
        prices[i["id"]] = i.get("market_price") or i.get("price") or None
    mkt = db.table("ingredient_market_prices").select(
        "ingredient_id, unit_price"
    ).eq("source", "migros").execute().data
    for m in mkt:
        if m.get("unit_price"):
            prices[m["ingredient_id"]] = m["unit_price"]
    return prices


@router.post("/generate")
def generate_order(payload: GenerateOrderRequest):
    """Otomatik Sipariş Ajanı: güncel eksik listesinden (kritik stok + gelecek menü
    ihtiyacı) bir sipariş taslağı üretir. Her kalemin tahmini tutarı = eksik miktar ×
    birim fiyat. Müdürün manuel iş yükü sıfırlanır; taslak gözden geçirilip gönderilir."""
    db = get_db()
    shortages = compute_alerts(db)["shortages"]
    if not shortages:
        return {"created": False, "reason": "no_shortage",
                "message": "Stok yeterli — sipariş gerektiren malzeme yok."}

    price_map = _unit_price_map(db)
    items, total = [], 0.0
    for s in shortages:
        qty = s["shortage"]
        up = price_map.get(s["ingredient_id"])
        line = round(qty * float(up), 2) if up else None
        if line:
            total += line
        items.append({
            "ingredient_id": s["ingredient_id"], "name": s["name"], "unit": s["unit"],
            "quantity": qty, "unit_price": up, "line_total": line, "reason": s.get("reason"),
        })

    supplier_name = None
    supplier_id = payload.supplier_id
    if supplier_id:
        sup = db.table("suppliers").select("name").eq("id", supplier_id).execute().data
        supplier_name = sup[0]["name"] if sup else None

    row = {
        "supplier_id": supplier_id, "supplier_name": supplier_name,
        "status": "draft", "items": items, "total_estimated": round(total, 2),
        "auto_generated": True,
    }
    saved = db.table("purchase_orders").insert(row).execute()
    order = saved.data[0]
    order["created"] = True
    return order


@router.get("/")
def list_orders():
    return get_db().table("purchase_orders").select("*").order("created_at", desc=True).execute().data


@router.get("/{order_id}")
def get_order(order_id: int):
    res = get_db().table("purchase_orders").select("*").eq("id", order_id).execute().data
    if not res:
        raise HTTPException(status_code=404, detail="Order not found")
    return res[0]


@router.patch("/{order_id}")
def update_order(order_id: int, payload: OrderUpdate):
    db = get_db()
    updates = payload.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "status" in updates:
        if updates["status"] not in _VALID_STATUS:
            raise HTTPException(status_code=400, detail="Invalid status")
        now = datetime.now(timezone.utc).isoformat()
        if updates["status"] == "sent":
            updates.setdefault("sent_at", now)
        elif updates["status"] == "received":
            updates.setdefault("received_at", now)

    # tedarikçi değişince snapshot adını da güncelle
    if "supplier_id" in updates:
        sup = db.table("suppliers").select("name").eq("id", updates["supplier_id"]).execute().data
        updates["supplier_name"] = sup[0]["name"] if sup else None

    # kalemler güncellenirse toplamı yeniden hesapla
    if "items" in updates:
        updates["total_estimated"] = round(
            sum(float(it.get("line_total") or 0) for it in updates["items"]), 2)

    res = db.table("purchase_orders").update(updates).eq("id", order_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return res.data[0]


@router.post("/{order_id}/receive")
def receive_order(order_id: int):
    """Teslim alındı: siparişi 'received' yapar VE her kalemi stoğa parti olarak ekler
    (miktar = sipariş miktarı, birim fiyat = kalem birim fiyatı). Döngü kapanır —
    sipariş → teslim → stok otomatik güncellenir."""
    from app.routers.ingredients import _recompute_stock  # döngüsel import'u önlemek için lokal

    db = get_db()
    res = db.table("purchase_orders").select("*").eq("id", order_id).execute().data
    if not res:
        raise HTTPException(status_code=404, detail="Order not found")
    order = res[0]
    if order["status"] == "received":
        raise HTTPException(status_code=400, detail="Sipariş zaten teslim alınmış")

    today = date.today().isoformat()
    restocked = 0
    for it in order.get("items") or []:
        try:
            qty = float(it.get("quantity") or 0)
        except (TypeError, ValueError):
            qty = 0
        if qty <= 0 or not it.get("ingredient_id"):
            continue
        db.table("ingredient_batches").insert({
            "ingredient_id": it["ingredient_id"],
            "quantity": qty,
            "purchase_date": today,
            "unit_price": it.get("unit_price"),
        }).execute()
        _recompute_stock(it["ingredient_id"])
        restocked += 1

    upd = db.table("purchase_orders").update({
        "status": "received",
        "received_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", order_id).execute()
    result = upd.data[0]
    result["restocked_items"] = restocked
    return result


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int):
    get_db().table("purchase_orders").delete().eq("id", order_id).execute()
