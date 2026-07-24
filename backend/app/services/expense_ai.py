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


def material_expense_summary(db, month: str | None = None) -> dict:
    """Malzeme (gıda) gideri: fiili satın alımlardan (ingredient_batches) hesaplanır.
    Tutar = miktar × alım birim fiyatı. Birim fiyatı girilmemiş partiler (maliyeti
    bilinmeyen) sayılmaz. Sipariş 'teslim alındı' olunca oluşan partiler de buraya düşer.

    month verilirse (YYYY-MM) total/top_ingredients/batch_count o ayı yansıtır; aylık
    trend (by_month) her zaman tüm aylardır (ay seçici + grafik için)."""
    batches = db.table("ingredient_batches").select(
        "ingredient_id, quantity, unit_price, purchase_date"
    ).execute().data
    ings = {i["id"]: i for i in db.table("ingredients").select("id, name").execute().data}

    by_month = defaultdict(float)  # daima tüm aylar (trend)
    by_ing = defaultdict(float)    # month verilirse yalnız o ay
    total = 0.0
    count = 0
    for b in batches:
        up, q = b.get("unit_price"), b.get("quantity")
        if up is None or q is None:
            continue
        amt = float(q) * float(up)
        if amt <= 0:
            continue
        m = str(b.get("purchase_date") or "")[:7]
        if m:
            by_month[m] += amt
        if month and m != month:
            continue
        total += amt
        count += 1
        by_ing[b["ingredient_id"]] += amt

    top = sorted(
        ({"name": ings.get(k, {}).get("name", f"#{k}"), "amount": round(v, 2)}
         for k, v in by_ing.items()),
        key=lambda x: x["amount"], reverse=True,
    )[:6]
    return {
        "total": round(total, 2),
        "batch_count": count,
        "month": month,
        "by_month": [{"month": k, "amount": round(v, 2)} for k, v in sorted(by_month.items())],
        "top_ingredients": top,
    }


def _gather_context() -> dict:
    """Analize girecek tam gider tablosu: manuel işletme giderleri + fiili malzeme
    (gıda) gideri tek kategori dağılımında birleştirilir, aylık trend çıkarılır."""
    db = get_db()
    rows = db.table("expenses").select("*").execute().data

    by_category = defaultdict(float)
    by_month = defaultdict(float)
    for r in rows:
        by_category[r.get("category") or "Diğer"] += float(r.get("amount") or 0)
        m = str(r.get("expense_date") or "")[:7]
        if m:
            by_month[m] += float(r.get("amount") or 0)

    # Malzeme (gıda) giderini gerçek bir kategori olarak ekle — genelde en büyük kalem
    mat = material_expense_summary(db)
    if mat["total"] > 0:
        by_category["Malzeme (Gıda)"] += mat["total"]
        for mm in mat["by_month"]:
            by_month[mm["month"]] += mm["amount"]

    total = round(sum(by_category.values()), 2)
    cats = sorted(
        ({"category": k, "amount": round(v, 2), "share": round(v / total * 100, 1) if total else 0}
         for k, v in by_category.items()),
        key=lambda x: x["amount"], reverse=True,
    )
    months = [{"month": k, "amount": round(v, 2)} for k, v in sorted(by_month.items())]

    return {
        "total": total,
        "manual_total": round(sum(float(r.get("amount") or 0) for r in rows), 2),
        "material_total": mat["total"],
        "expense_count": len(rows),
        "by_category": cats,
        "by_month": months,
        "top_ingredients": mat["top_ingredients"],
    }


def _build_prompt(ctx: dict) -> str:
    cat_lines = "\n".join(
        f"- {c['category']}: {c['amount']} TL (toplam giderin %{c['share']}'ı)"
        for c in ctx["by_category"]
    ) or "- (kayıt yok)"
    month_lines = "\n".join(f"- {m['month']}: {m['amount']} TL" for m in ctx["by_month"]) or "- (kayıt yok)"
    top_ing = ", ".join(f"{t['name']} ({t['amount']} TL)" for t in ctx.get("top_ingredients", [])) or "-"
    return f"""Sen bir üniversite yemekhanesinin finans/işletme analistisin. Aşağıda yemekhanenin
TÜM işletme giderleri var: hem malzeme (gıda) alımları hem de gıda dışı giderler
(personel, elektrik, su, doğalgaz, tamir-bakım, kira, temizlik vb.).

Toplam gider: {ctx['total']} TL
- Malzeme (gıda) gideri: {ctx['material_total']} TL (fiili satın alımlardan)
- Gıda dışı işletme gideri: {ctx['manual_total']} TL ({ctx['expense_count']} kayıt)
En çok harcanan malzemeler: {top_ing}

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
    total = ctx["total"]
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

    # Malzeme (gıda) payı
    material = ctx["material_total"]
    if material > 0 and total > 0:
        observations.append(f"Malzeme (gıda) gideri {material} TL — toplam giderin %{material / total * 100:.0f}'ı.")

    # Öneriler (kategoriye göre)
    labels = {c["category"] for c in cats}
    if any("Malzeme" in l for l in labels):
        suggestions.append({
            "title": "Malzeme alımında tedarikçi ve mevsim avantajı",
            "detail": "En çok harcanan malzemelerde toplu alım/sözleşme yap, mevsiminde ucuz alternatiflere yönel; Otomatik Sipariş ile fiyat karşılaştır.",
            "potential_saving": "aylık ~%5-10",
        })
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
        "total": ctx["total"],
        "top_categories": ctx["by_category"][:5],
    }
    return result
