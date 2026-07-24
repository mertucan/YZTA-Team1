"""Harcama (gider) yapay zeka analizi.

Yemekhane işletme giderlerini (personel, elektrik, su, tamir...) analiz edip
yöneticiye tasarruf önerileri ve gözlemler üretir. Önce Gemini denenir; anahtar
yoksa veya hata olursa kural tabanlı deterministik analiz devreye girer — böylece
GEMINI_API_KEY olmadan da çalışır (menü planlayıcı ile aynı desen)."""

import json
import logging
from collections import defaultdict

from app.config import settings
from app.database import get_db

logger = logging.getLogger(__name__)

_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "observations": {"type": "array", "items": {"type": "string"}},
        "suggestions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "detail": {"type": "string"},
                    "potential_saving": {"type": "string"},
                },
                "required": ["title", "detail"],
            },
        },
    },
    "required": ["headline", "observations", "suggestions"],
}


def _gather_context() -> dict:
    """Analize girecek özet: kategori dağılımı, aylık trend, gıda maliyeti kıyası."""
    db = get_db()
    rows = db.table("expenses").select("*").execute().data

    by_category = defaultdict(float)
    by_month = defaultdict(float)
    for r in rows:
        by_category[r.get("category") or "Diğer"] += float(r.get("amount") or 0)
        m = str(r.get("expense_date") or "")[:7]
        if m:
            by_month[m] += float(r.get("amount") or 0)

    total = round(sum(by_category.values()), 2)
    cats = sorted(
        ({"category": k, "amount": round(v, 2), "share": round(v / total * 100, 1) if total else 0}
         for k, v in by_category.items()),
        key=lambda x: x["amount"], reverse=True,
    )
    months = [{"month": k, "amount": round(v, 2)} for k, v in sorted(by_month.items())]

    # Gıda maliyeti bağlamı: onaylı/taslak haftalık menülerin toplam gıda maliyeti
    menus = db.table("weekly_menus").select("total_cost").execute().data
    food_cost = round(sum(float(m.get("total_cost") or 0) for m in menus), 2)

    return {
        "total_non_food": total,
        "expense_count": len(rows),
        "by_category": cats,
        "by_month": months,
        "food_cost_context": food_cost,
    }


def _build_prompt(ctx: dict) -> str:
    cat_lines = "\n".join(
        f"- {c['category']}: {c['amount']} TL (toplam giderin %{c['share']}'ı)"
        for c in ctx["by_category"]
    ) or "- (kayıt yok)"
    month_lines = "\n".join(f"- {m['month']}: {m['amount']} TL" for m in ctx["by_month"]) or "- (kayıt yok)"
    return f"""Sen bir üniversite yemekhanesinin finans/işletme analistisin. Aşağıda gıda DIŞI
işletme giderleri (personel, elektrik, su, doğalgaz, tamir-bakım, kira, temizlik vb.) var.

Toplam gıda dışı gider: {ctx['total_non_food']} TL ({ctx['expense_count']} kayıt)
Referans olarak planlanan haftalık menülerin toplam gıda maliyeti: {ctx['food_cost_context']} TL

Kategori dağılımı:
{cat_lines}

Aylık trend:
{month_lines}

Görev: Yöneticiye yönelik, TÜRKÇE, somut ve uygulanabilir bir analiz üret.
- headline: tek cümlelik genel değerlendirme.
- observations: 3-5 kısa gözlem (en büyük kalem, artış/azalış trendi, dikkat çeken oran vb.).
- suggestions: 3-5 tasarruf/iyileştirme önerisi; her biri title + detail, mümkünse potential_saving
  (ör. "aylık ~%10" gibi) içersin. Gerçekçi ol, uydurma rakam verme.
Sadece istenen JSON şemasına uygun çıktı üret."""


def _gemini_analyze(ctx: dict) -> dict | None:
    if not settings.gemini_api_key:
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
                response_schema=_SCHEMA,
            ),
        )
        parsed = json.loads(resp.text or "{}")
        if parsed.get("headline") and parsed.get("suggestions"):
            parsed["generated_by"] = "gemini"
            return parsed
    except Exception as exc:  # ağ/kota/şema hatası → kural tabanlıya düş
        logger.warning("Gemini expense analysis failed, using rule-based: %s", exc)
    return None


def _rule_based(ctx: dict) -> dict:
    """Gemini yoksa: kategori payları ve aylık trendden mantıklı çıkarımlar."""
    cats = ctx["by_category"]
    total = ctx["total_non_food"]
    observations, suggestions = [], []

    if not cats:
        return {
            "generated_by": "rule",
            "headline": "Henüz analiz edilecek harcama kaydı yok.",
            "observations": ["Gider ekledikçe otomatik analiz burada oluşur."],
            "suggestions": [],
        }

    top = cats[0]
    observations.append(f"En büyük gider kalemi: {top['category']} — {top['amount']} TL (toplamın %{top['share']}'ı).")
    if len(cats) > 1:
        observations.append(f"İkinci sırada {cats[1]['category']} ({cats[1]['amount']} TL) geliyor.")

    # Aylık trend değişimi
    months = ctx["by_month"]
    if len(months) >= 2:
        prev, last = months[-2], months[-1]
        if prev["amount"] > 0:
            change = (last["amount"] - prev["amount"]) / prev["amount"] * 100
            trend = "arttı" if change > 0 else "azaldı"
            observations.append(f"{last['month']} gideri bir önceki aya göre %{abs(change):.0f} {trend}.")

    # Gıda dışı / gıda kıyası
    food = ctx["food_cost_context"]
    if food > 0:
        ratio = total / food
        observations.append(f"Gıda dışı giderler, planlanan gıda maliyetinin ~{ratio:.1f} katı.")

    # Öneriler (kategoriye göre)
    labels = {c["category"] for c in cats}
    if any("Elektrik" in l or "Doğalgaz" in l or "Su" in l for l in labels):
        suggestions.append({
            "title": "Enerji ve su tüketimini optimize et",
            "detail": "Yüksek tüketimli saatlerde ekipman kullanımını planla, tasarruflu ekipman ve sensörlü aydınlatma/su armatürleri değerlendir.",
            "potential_saving": "aylık ~%8-12",
        })
    if any("Personel" in l for l in labels):
        suggestions.append({
            "title": "Personel vardiyalarını talebe göre planla",
            "detail": "Devamsızlık ve öğün yoğunluğu verisine göre vardiya sayısını dengele; düşük yoğunluklu günlerde fazla mesaiden kaçın.",
            "potential_saving": "aylık ~%5",
        })
    if any("Tamir" in l or "Bakım" in l for l in labels):
        suggestions.append({
            "title": "Önleyici bakıma geç",
            "detail": "Arıza sonrası onarım yerine periyodik bakım planı, ani tamir giderlerini ve ekipman duruşlarını azaltır.",
            "potential_saving": "yıllık kayda değer",
        })
    suggestions.append({
        "title": f"En büyük kalemi ({top['category']}) mercek altına al",
        "detail": f"Toplam giderin %{top['share']}'ını oluşturuyor; tedarikçi/sözleşme yenilemesi ve alternatif teklifler bu kalemde en hızlı kazanımı sağlar.",
        "potential_saving": "değişken",
    })

    return {
        "generated_by": "rule",
        "headline": f"Toplam {total} TL gider; en ağır kalem {top['category']}. Öncelik bu kalemde tasarruf.",
        "observations": observations,
        "suggestions": suggestions[:5],
    }


def analyze_expenses() -> dict:
    ctx = _gather_context()
    result = _gemini_analyze(ctx) or _rule_based(ctx)
    result["context"] = {
        "total": ctx["total_non_food"],
        "top_categories": ctx["by_category"][:5],
    }
    return result
