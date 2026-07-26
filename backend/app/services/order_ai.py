"""AI Satın Alma Ajanı.

Eksik listesi + tükeniş tahmini + SKT durumu + tedarikçi kataloğunu birlikte okur ve
GEREKÇELİ bir sipariş planı üretir: hangi malzeme, ne kadar, hangi tedarikçiden, neden.
Gemini varsa malzeme→tedarikçi eşleşmesini ve gerekçeleri o yazar; yoksa kural tabanlı
plan devreye girer (sistem anahtar olmadan da çalışır)."""

import json
import logging

from app.config import settings
from app.services.stock import compute_alerts
from app.services.consumption import forecast_depletion

logger = logging.getLogger(__name__)

_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "orders": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "supplier_id": {"type": "integer"},
                    "rationale": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "ingredient_id": {"type": "integer"},
                                "quantity": {"type": "number"},
                                "reason": {"type": "string"},
                            },
                            "required": ["ingredient_id", "quantity", "reason"],
                        },
                    },
                },
                "required": ["supplier_id", "rationale", "items"],
            },
        },
    },
    "required": ["summary", "orders"],
}


def _gather_context(db) -> dict:
    alerts = compute_alerts(db)
    forecast = {f["ingredient_id"]: f for f in forecast_depletion(db)}
    suppliers = db.table("suppliers").select("id, name, categories").execute().data

    prices = {}
    for i in db.table("ingredients").select("id, price, market_price").execute().data:
        prices[i["id"]] = i.get("market_price") or i.get("price") or None
    for m in db.table("ingredient_market_prices").select(
        "ingredient_id, unit_price"
    ).eq("source", "migros").execute().data:
        if m.get("unit_price"):
            prices[m["ingredient_id"]] = m["unit_price"]

    return {"alerts": alerts, "forecast": forecast, "suppliers": suppliers, "prices": prices}


def _build_prompt(ctx: dict) -> str:
    lines = []
    for s in ctx["alerts"]["shortages"]:
        f = ctx["forecast"].get(s["ingredient_id"])
        extra = f" | tükeniş≈{f['depletion_date']} ({f['days_left']} gün)" if f else ""
        reason = "gelecek menü ihtiyacı" if s["reason"] == "menu" else "kritik stok eşiği"
        lines.append(
            f"- id={s['ingredient_id']} | {s['name']} | eksik {s['shortage']} {s['unit']} "
            f"(stok {s['stock']}, gereken {s['required']}) | sebep: {reason}{extra}"
        )
    sup_lines = "\n".join(
        f"- supplier_id={s['id']} | {s['name']} | kategoriler: {s.get('categories') or '-'}"
        for s in ctx["suppliers"]
    ) or "- (tedarikçi yok)"
    return f"""Sen bir üniversite yemekhanesinin satın alma uzmanısın. Aşağıda eksik malzemeler
ve tedarikçi listesi var.

Eksik malzemeler:
{chr(10).join(lines)}

Tedarikçiler:
{sup_lines}

Görev: Malzemeleri türlerine göre DOĞRU tedarikçiye ata (sebze-meyve → hal; et/tavuk →
et firması; bakliyat/kuru gıda/süt/yağ → toptan gıda). Her tedarikçi için ayrı sipariş oluştur.
- quantity: eksik miktarın üzerine %10-20 güvenlik payı ekle, pratik yuvarla (ör. 23.4→25).
- reason: o kalem için 1 kısa Türkçe cümle (neden bu miktar/neden şimdi; tükeniş tarihi varsa kullan).
- rationale: siparişin geneli için 1-2 cümle.
- summary: tüm planın 1-2 cümlelik yönetici özeti.
Sadece şemaya uygun JSON üret."""


def _llm_plan(ctx: dict) -> dict | None:
    if not settings.gemini_api_key or not ctx["suppliers"]:
        return None
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        resp = client.models.generate_content(
            model=settings.gemini_model,
            contents=_build_prompt(ctx),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_PLAN_SCHEMA,
            ),
        )
        parsed = json.loads(resp.text or "{}")
        if parsed.get("orders"):
            parsed["generated_by"] = "gemini"
            return parsed
    except Exception as exc:
        logger.warning("Gemini purchase plan failed, using rule-based: %s", exc)
    return None


def _rule_plan(ctx: dict) -> dict:
    """Kural tabanlı yedek: tek sipariş, kalem başına deterministik gerekçe."""
    items = []
    for s in ctx["alerts"]["shortages"]:
        f = ctx["forecast"].get(s["ingredient_id"])
        qty = round(s["shortage"] * 1.15, 1)  # %15 güvenlik payı
        if s["reason"] == "menu":
            reason = f"Gelecek menüler {s['required']} {s['unit']} gerektiriyor, stok {s['stock']} {s['unit']}."
        else:
            reason = f"Stok ({s['stock']} {s['unit']}) kritik eşiğin ({s['required']} {s['unit']}) altında."
        if f and f.get("urgent"):
            reason += f" Tahmini tükeniş: {f['depletion_date']}."
        items.append({"ingredient_id": s["ingredient_id"], "quantity": qty, "reason": reason})

    sup = ctx["suppliers"][0] if len(ctx["suppliers"]) == 1 else None
    return {
        "generated_by": "rule",
        "summary": f"{len(items)} eksik kalem için %15 güvenlik paylı tek sipariş taslağı oluşturuldu.",
        "orders": [{
            "supplier_id": sup["id"] if sup else 0,
            "rationale": "Kural tabanlı plan: tüm eksikler tek taslakta toplandı; tedarikçiyi gözden geçirin.",
            "items": items,
        }],
    }


def generate_ai_plan(db) -> dict:
    """Planı üretir ve her tedarikçi için TASLAK sipariş kaydeder."""
    ctx = _gather_context(db)
    if not ctx["alerts"]["shortages"]:
        return {"created": False, "reason": "no_shortage",
                "message": "Stok yeterli — sipariş gerektiren malzeme yok."}

    plan = _llm_plan(ctx) or _rule_plan(ctx)

    ings = {i["id"]: i for i in db.table("ingredients").select("id, name, unit").execute().data}
    sups = {s["id"]: s for s in ctx["suppliers"]}
    valid_ids = {s["ingredient_id"] for s in ctx["alerts"]["shortages"]}

    created = []
    for o in plan["orders"]:
        rows, total = [], 0.0
        for it in o.get("items") or []:
            iid = it.get("ingredient_id")
            if iid not in valid_ids or iid not in ings:  # LLM halüsinasyonuna karşı süzgeç
                continue
            up = ctx["prices"].get(iid)
            qty = round(float(it.get("quantity") or 0), 1)
            if qty <= 0:
                continue
            line = round(qty * float(up), 2) if up else None
            if line:
                total += line
            rows.append({"ingredient_id": iid, "name": ings[iid]["name"], "unit": ings[iid]["unit"],
                         "quantity": qty, "unit_price": up, "line_total": line,
                         "reason": (it.get("reason") or "")[:200]})
        if not rows:
            continue
        sup = sups.get(o.get("supplier_id"))
        saved = db.table("purchase_orders").insert({
            "supplier_id": sup["id"] if sup else None,
            "supplier_name": sup["name"] if sup else None,
            "status": "draft", "items": rows, "total_estimated": round(total, 2),
            "auto_generated": True, "note": (o.get("rationale") or "")[:400],
        }).execute().data[0]
        created.append(saved)

    return {"created": True, "generated_by": plan.get("generated_by"),
            "summary": plan.get("summary"), "orders": created}
