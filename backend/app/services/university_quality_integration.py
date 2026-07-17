import csv
import json
import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from io import StringIO
from typing import Any

from google import genai
from google.genai import types

from app.config import settings
from app.database import get_db

logger = logging.getLogger(__name__)

RANKING_ORGANIZATIONS = [
    {
        "id": "qs",
        "name": "QS Sustainability",
        "methodology_url": "https://www.topuniversities.com/sustainability-rankings",
        "basis": "QS Sustainability içindeki Quality of Life ve kampüste sağlık/iyi oluş kanıtları için destekleyici veri paketi.",
        "score_label": "QS kanıt hazırlığı",
        "score_weights": {
            "nutrition_quality_score": 0.35,
            "healthy_menu_score": 0.30,
            "data_coverage_score": 0.20,
            "menu_diversity_score": 0.15,
        },
        "required_fields": ["evidence_readiness_score", "healthy_menu_ratio", "plant_forward_ratio", "data_coverage_ratio"],
    },
    {
        "id": "the",
        "name": "THE Impact Rankings",
        "methodology_url": "https://www.timeshighereducation.com/world-university-rankings/impact-rankings-2025-methodology",
        "basis": "THE Impact Rankings SDG 2 Zero Hunger, SDG 3 Good Health and Well-being ve kanıt destekli politika/metrik yaklaşımı için hazır veri.",
        "score_label": "THE SDG kanıt hazırlığı",
        "score_weights": {
            "healthy_menu_score": 0.30,
            "nutrition_quality_score": 0.25,
            "data_coverage_score": 0.25,
            "approved_menu_score": 0.10,
            "menu_diversity_score": 0.10,
        },
        "required_fields": ["evidence_readiness_score", "healthy_menu_ratio", "menu_diversity_score", "data_coverage_ratio"],
    },
    {
        "id": "greenmetric",
        "name": "UI GreenMetric",
        "methodology_url": "https://uigreenmetric.com/rankings/guidelines/university/questionnaire",
        "basis": "UI GreenMetric sağlık altyapısı, SDG etkisi ve organik atık/operasyonel sürdürülebilirlik kanıtları için tamamlayıcı yemekhane verisi.",
        "score_label": "GreenMetric operasyon kanıtı",
        "score_weights": {
            "plant_forward_score": 0.35,
            "approved_menu_score": 0.25,
            "data_coverage_score": 0.20,
            "cost_efficiency_score": 0.10,
            "menu_diversity_score": 0.10,
        },
        "required_fields": ["evidence_readiness_score", "plant_forward_ratio", "approved_menu_ratio", "average_cost_per_menu"],
    },
    {
        "id": "custom",
        "name": "Özel Sıralama Kuruluşu",
        "methodology_url": None,
        "basis": "Kurum içi veya özel sıralama talepleri için açıklanabilir, kanıtlanabilir beslenme kalite veri seti.",
        "score_label": "Özel kanıt hazırlığı",
        "score_weights": {
            "nutrition_quality_score": 0.45,
            "healthy_menu_score": 0.20,
            "menu_diversity_score": 0.15,
            "data_coverage_score": 0.20,
        },
        "required_fields": ["evidence_readiness_score", "menu_count", "item_count", "period"],
    },
]

EXPORT_FIELDS = [
    "organization_id",
    "organization_name",
    "methodology_basis",
    "methodology_url",
    "period_start",
    "period_end",
    "generated_at",
    "menu_count",
    "approved_menu_count",
    "item_count",
    "evidence_readiness_score",
    "nutrition_quality_score",
    "healthy_menu_ratio",
    "menu_diversity_score",
    "plant_forward_ratio",
    "approved_menu_ratio",
    "data_coverage_ratio",
    "average_calories",
    "average_protein",
    "average_iron",
    "average_cost_per_menu",
    "methodology_note",
]

METHODOLOGY_NOTE = (
    "Bu çıktı resmi sıralama puanı değildir; resmi metodolojilerde istenen kanıt/veri "
    "başlıklarına hazırlık seviyesini gösterir. Resmi puanlama kuruluşların kendi "
    "anketleri, kanıt incelemesi, normalizasyonu ve dış veri kaynaklarıyla yapılır."
)

PLANT_FORWARD_KEYWORDS = (
    "salata",
    "sebze",
    "zeytinyagli",
    "zeytinyagli",
    "mercimek",
    "nohut",
    "fasulye",
    "meyve",
    "bulgur",
    "tahil",
)
TURKISH_ASCII_TRANSLATION = str.maketrans(
    {
        "ç": "c",
        "Ç": "C",
        "ğ": "g",
        "Ğ": "G",
        "ı": "i",
        "I": "I",
        "İ": "I",
        "ö": "o",
        "Ö": "O",
        "ş": "s",
        "Ş": "S",
        "ü": "u",
        "Ü": "U",
    }
)


def get_ranking_organizations() -> list[dict[str, Any]]:
    return RANKING_ORGANIZATIONS


def build_quality_payload(
    organization_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Any]:
    organization = _find_organization(organization_id)
    menus = _fetch_menus(start_date, end_date)
    menu_ids = [menu["id"] for menu in menus]
    items = _fetch_items(menu_ids)

    metrics = _calculate_metrics(menus, items, organization)
    period_start = start_date or _min_menu_date(menus)
    period_end = end_date or _max_menu_date(menus)

    dataset = {
        "organization_id": organization["id"],
        "organization_name": organization["name"],
        "score_label": organization["score_label"],
        "score_weights": _score_weights_for_response(organization["score_weights"]),
        "methodology_basis": organization["basis"],
        "methodology_url": organization["methodology_url"],
        "period_start": period_start.isoformat() if period_start else None,
        "period_end": period_end.isoformat() if period_end else None,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        **metrics,
        "methodology_note": METHODOLOGY_NOTE,
    }

    return {
        "organization": organization,
        "dataset": dataset,
        "fields": EXPORT_FIELDS,
        "methodology": _build_methodology(metrics, organization),
        "export_allowed": bool(menus and items),
        "suppression_reason": None if menus and items else "Seçilen aralıkta sıralama exportu için menü verisi bulunamadı.",
    }


def payload_to_csv(payload: dict[str, Any]) -> str:
    output = StringIO()
    output.write("sep=;\r\n")
    writer = csv.DictWriter(output, fieldnames=EXPORT_FIELDS, extrasaction="ignore", delimiter=";")
    writer.writeheader()
    writer.writerow({field: _format_value(payload["dataset"].get(field)) for field in EXPORT_FIELDS})
    return output.getvalue()


def payload_to_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload["dataset"], ensure_ascii=False, indent=2, default=str)


def build_ai_insights(payload: dict[str, Any]) -> dict[str, Any]:
    if not settings.gemini_api_key:
        return _fallback_ai_insights(payload, "GEMINI_API_KEY yapılandırılmadığı için kurallı analiz üretildi.")

    try:
        response = genai.Client(api_key=settings.gemini_api_key).models.generate_content(
            model=settings.gemini_model,
            contents=_build_insight_prompt(payload),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "evidence_summary": {"type": "string"},
                        "missing_evidence": {"type": "array", "items": {"type": "string"}},
                        "recommended_actions": {"type": "array", "items": {"type": "string"}},
                        "application_note": {"type": "string"},
                    },
                    "required": [
                        "evidence_summary",
                        "missing_evidence",
                        "recommended_actions",
                        "application_note",
                    ],
                },
            ),
        )
        parsed = json.loads(response.text or "{}")
        return {
            "generated_by": "gemini",
            "evidence_summary": parsed.get("evidence_summary") or "",
            "missing_evidence": parsed.get("missing_evidence") or [],
            "recommended_actions": parsed.get("recommended_actions") or [],
            "application_note": parsed.get("application_note") or METHODOLOGY_NOTE,
        }
    except Exception as exc:
        logger.warning("Gemini quality insights failed; using rules fallback: %s", exc)
        return _fallback_ai_insights(payload, _friendly_ai_fallback_note(exc))


def _build_insight_prompt(payload: dict[str, Any]) -> str:
    dataset = payload["dataset"]
    methodology = payload.get("methodology") or []
    methodology_text = "\n".join(
        f"- {item['metric']}: {item['formula']} | {item['official_basis']}"
        for item in methodology
    )
    weights = ", ".join(
        f"{item['label']} %{item['weight_percent']}"
        for item in dataset.get("score_weights", [])
    )
    return f"""
Sen bir üniversite sürdürülebilirlik ve kurumsal sıralama başvuru danışmanısın.
YemekhanAI aşağıdaki kurum içi beslenme kalite metriklerini üretti.

Kuruluş: {dataset.get("organization_name")}
Metodoloji dayanağı: {dataset.get("methodology_basis")}
Skor etiketi: {dataset.get("score_label")}
Kanıta hazırlık skoru: {dataset.get("evidence_readiness_score")}
Ağırlıklar: {weights}
Menü sayısı: {dataset.get("menu_count")}
Menü kalemi: {dataset.get("item_count")}
Onaylı menü oranı: {dataset.get("approved_menu_ratio")}
Sağlıklı menü oranı: {dataset.get("healthy_menu_ratio")}
Bitkisel odak oranı: {dataset.get("plant_forward_ratio")}
Veri kapsama oranı: {dataset.get("data_coverage_ratio")}
Çeşitlilik skoru: {dataset.get("menu_diversity_score")}
Ortalama kalori/protein/demir: {dataset.get("average_calories")} kcal / {dataset.get("average_protein")} g / {dataset.get("average_iron")} mg
Ortalama menü maliyeti: {dataset.get("average_cost_per_menu")} TL

Hesaplama yöntemi:
{methodology_text}

Görev:
1. Resmi sıralama puanı hesapladığını iddia etmeden, başvuruda kullanılabilecek kısa bir kanıt özeti yaz.
2. Eksik veya zayıf kanıt alanlarını madde madde çıkar.
3. Üniversite yöneticisi için uygulanabilir iyileştirme aksiyonları öner.
4. Çıktı Türkçe olsun, abartılı pazarlama dili kullanma, kurumsal ve gerçekçi yaz.
"""


def _friendly_ai_fallback_note(exc: Exception) -> str:
    detail = str(exc)
    normalized = detail.lower()
    if "resource_exhausted" in normalized or "429" in detail or "quota" in normalized:
        return "Gemini kotası veya hız limiti nedeniyle AI servisi şu anda kullanılamıyor; sistem yerel kurallı analiz üretti."
    if (
        "permission_denied" in normalized
        or "permission denied" in normalized
        or "denied access" in normalized
        or "forbidden" in normalized
        or "403" in detail
    ):
        return "Gemini API anahtarının bağlı olduğu Google projesi üretim çağrılarına yetkili değil; sistem yerel kurallı analiz üretti."
    if "api key" in normalized or "apikey" in normalized or "invalid_argument" in normalized:
        return "Gemini API anahtarı geçersiz veya yanlış yapılandırılmış; sistem yerel kurallı analiz üretti."
    return "Gemini servisi geçici olarak yanıt vermedi; sistem yerel kurallı analiz üretti."


def _fallback_ai_insights(payload: dict[str, Any], note: str) -> dict[str, Any]:
    dataset = payload["dataset"]
    missing: list[str] = []
    actions: list[str] = []

    if dataset.get("data_coverage_ratio", 0) < 0.8:
        missing.append("Menü veri kapsaması düşük; bazı hafta içi günlerinde kanıtlanabilir menü kaydı eksik görünüyor.")
        actions.append("Haftalık menü yayınlama ve onay sürecini tüm günleri kapsayacak şekilde zorunlu hale getirin.")
    if dataset.get("healthy_menu_ratio", 0) < 0.5:
        missing.append("Sağlıklı menü oranı orta/düşük seviyede; protein ve kalori dengesi her kalemde yeterli görünmüyor.")
        actions.append("Ana yemeklerde protein hedefi ve kalori aralığı kontrolü için diyetisyen onay adımı ekleyin.")
    if dataset.get("plant_forward_ratio", 0) < 0.35:
        missing.append("Bitkisel odak oranı sınırlı; sürdürülebilir menü kanıtı güçlendirilebilir.")
        actions.append("Haftalık menüye bakliyat, sebze ve tahıl bazlı seçenekler için minimum oran hedefi tanımlayın.")
    if dataset.get("approved_menu_ratio", 0) < 0.7:
        missing.append("Onaylı menü oranı düşük; resmi başvuru için süreç kanıtı zayıf kalabilir.")
        actions.append("Menü onaylarını rol bazlı iş akışına bağlayıp export öncesi onay durumunu tamamlayın.")
    if dataset.get("menu_diversity_score", 0) < 60:
        missing.append("Menü çeşitliliği sınırlı; kategori dağılımı resmi kanıt anlatımını zayıflatabilir.")
        actions.append("Çorba, ana yemek, tahıl, salata/yoğurt ve meyve/tatlı kategorileri için haftalık çeşitlilik hedefi belirleyin.")

    if not missing:
        missing.append("Temel metriklerde kritik eksik görünmüyor; dış başvuru için gıda atığı, öğrenci erişimi ve memnuniyet gibi destekleyici belgeler eklenebilir.")
    if not actions:
        actions.append("Mevcut metrik paketini resmi başvuru belgeleriyle birlikte saklayın ve dönemsel karşılaştırma raporu üretin.")

    score = dataset.get("evidence_readiness_score", 0)
    summary = (
        f"{dataset.get('organization_name')} için hazırlanan veri paketinde kanıta hazırlık skoru {score}. "
        f"Dönemde {dataset.get('menu_count')} menü ve {dataset.get('item_count')} menü kalemi üzerinden "
        "sağlık, sürdürülebilirlik, veri kapsama ve operasyonel kalite göstergeleri üretilmiştir."
    )
    return {
        "generated_by": "rules",
        "evidence_summary": summary,
        "missing_evidence": missing,
        "recommended_actions": actions,
        "application_note": note,
    }


def _find_organization(organization_id: str) -> dict[str, Any]:
    normalized = organization_id.lower()
    for organization in RANKING_ORGANIZATIONS:
        if organization["id"] == normalized:
            return organization
    return RANKING_ORGANIZATIONS[-1]


def _fetch_menus(start_date: date | None, end_date: date | None) -> list[dict[str, Any]]:
    query = get_db().table("weekly_menus").select("*").order("week_start_date", desc=False)
    if start_date:
        query = query.gte("week_start_date", start_date.isoformat())
    if end_date:
        query = query.lte("week_start_date", end_date.isoformat())
    return query.execute().data or []


def _fetch_items(menu_ids: list[int]) -> list[dict[str, Any]]:
    if not menu_ids:
        return []
    return (
        get_db()
        .table("weekly_menu_items")
        .select("weekly_menu_id, day_of_week, meal_name, category, estimated_cost, calories, protein, iron")
        .in_("weekly_menu_id", menu_ids)
        .execute()
        .data
        or []
    )


def _calculate_metrics(
    menus: list[dict[str, Any]],
    items: list[dict[str, Any]],
    organization: dict[str, Any],
) -> dict[str, Any]:
    menu_count = len(menus)
    item_count = len(items)
    approved_count = sum(1 for menu in menus if str(menu.get("status")).lower() == "approved")
    average_calories = _average(items, "calories")
    average_protein = _average(items, "protein")
    average_iron = _average(items, "iron")
    average_cost_per_menu = _safe_divide(sum(_to_float(menu.get("total_cost")) for menu in menus), menu_count)
    healthy_items = [
        item for item in items
        if _to_float(item.get("protein")) >= 15 and 450 <= _to_float(item.get("calories")) <= 900
    ]
    categories = {str(item.get("category") or "").strip().lower() for item in items if item.get("category")}
    days = {(item.get("weekly_menu_id"), item.get("day_of_week")) for item in items if item.get("day_of_week")}
    plant_forward_items = [item for item in items if _is_plant_forward(item)]
    expected_weekday_slots = max(menu_count * 5, 1)

    nutrition_quality_component = (
        _target_score(average_calories, 650, 850) * 0.35
        + _target_score(average_protein, 18, 35) * 0.30
        + _target_score(average_iron, 3, 8) * 0.20
        + _ratio(approved_count, menu_count) * 100 * 0.15
    )
    component_scores = {
        "nutrition_quality_score": nutrition_quality_component,
        "healthy_menu_score": _ratio(len(healthy_items), item_count) * 100,
        "menu_diversity_score": min(len(categories) / 6, 1) * 100,
        "plant_forward_score": _ratio(len(plant_forward_items), item_count) * 100,
        "approved_menu_score": _ratio(approved_count, menu_count) * 100,
        "data_coverage_score": min(len(days) / expected_weekday_slots, 1) * 100,
        "cost_efficiency_score": _cost_efficiency_score(average_cost_per_menu),
    }
    quality_score = round(_weighted_score(component_scores, organization["score_weights"]), 2)

    return {
        "menu_count": menu_count,
        "approved_menu_count": approved_count,
        "item_count": item_count,
        "evidence_readiness_score": quality_score,
        "nutrition_quality_score": round(nutrition_quality_component, 2),
        "healthy_menu_ratio": round(_ratio(len(healthy_items), item_count), 4),
        "menu_diversity_score": round(min(len(categories) / 6, 1) * 100, 2),
        "plant_forward_ratio": round(_ratio(len(plant_forward_items), item_count), 4),
        "approved_menu_ratio": round(_ratio(approved_count, menu_count), 4),
        "data_coverage_ratio": round(min(len(days) / expected_weekday_slots, 1), 4),
        "average_calories": round(average_calories, 2),
        "average_protein": round(average_protein, 2),
        "average_iron": round(average_iron, 2),
        "average_cost_per_menu": round(average_cost_per_menu, 2),
        "component_scores": {key: round(value, 2) for key, value in component_scores.items()},
    }


def _build_methodology(metrics: dict[str, Any], organization: dict[str, Any]) -> list[dict[str, str]]:
    score_formula = " + ".join(
        f"{_component_label(component)} %{int(weight * 100)}"
        for component, weight in organization["score_weights"].items()
    )
    return [
        {
            "metric": organization["score_label"],
            "formula": score_formula,
            "official_basis": "Resmi kurumlar nihai puanı kendileri hesaplar; bu skor seçilen kuruluşun metodoloji odağına göre kanıt hazırlığını gösterir.",
            "current_value": str(metrics.get("evidence_readiness_score", 0)),
        },
        {
            "metric": "Beslenme Kalite Bileşeni",
            "formula": "Kalori hedef aralığı 650-850 %35, protein 18-35 g %30, demir 3-8 mg %20, onaylı menü oranı %15.",
            "official_basis": "THE SDG 2/3 ve QS iyi oluş başlıkları için sağlıklı kampüs beslenmesi kanıtı.",
            "current_value": str(metrics.get("nutrition_quality_score", 0)),
        },
        {
            "metric": "Sağlıklı Menü Oranı",
            "formula": "Protein >= 15 g ve kalori 450-900 aralığındaki menü kalemleri / tüm menü kalemleri.",
            "official_basis": "SDG 2 Zero Hunger ve SDG 3 Good Health kapsamında dengeli beslenme kanıtı.",
            "current_value": str(metrics.get("healthy_menu_ratio", 0)),
        },
        {
            "metric": "Çeşitlilik Skoru",
            "formula": "Benzersiz menü kategorisi sayısı / 6 kategori tavan değeri.",
            "official_basis": "Beslenme hizmetinin tek tip değil, dengeli ve çeşitli sunulduğunu gösteren operasyon kanıtı.",
            "current_value": str(metrics.get("menu_diversity_score", 0)),
        },
        {
            "metric": "Bitkisel Odak Oranı",
            "formula": "Sebze, salata, bakliyat, meyve ve tahıl anahtar kelimeleri geçen kalemler / tüm kalemler.",
            "official_basis": "UI GreenMetric ve sürdürülebilir kampüs operasyonları için bitkisel/atık etkisi düşük menü sinyali.",
            "current_value": str(metrics.get("plant_forward_ratio", 0)),
        },
        {
            "metric": "Veri Kapsama Oranı",
            "formula": "Dolu menü günü sayısı / beklenen hafta içi menü günü sayısı.",
            "official_basis": "THE metodolojisindeki kurumsal veri ve kanıt doğrulanabilirliği yaklaşımına uyum.",
            "current_value": str(metrics.get("data_coverage_ratio", 0)),
        },
    ]


def _score_weights_for_response(weights: dict[str, float]) -> list[dict[str, Any]]:
    return [
        {
            "component": component,
            "label": _component_label(component),
            "weight": round(weight, 4),
            "weight_percent": int(weight * 100),
        }
        for component, weight in weights.items()
    ]


def _weighted_score(component_scores: dict[str, float], weights: dict[str, float]) -> float:
    return sum(component_scores.get(component, 0) * weight for component, weight in weights.items())


def _component_label(component: str) -> str:
    labels = {
        "nutrition_quality_score": "beslenme bileşeni",
        "healthy_menu_score": "sağlıklı menü",
        "menu_diversity_score": "çeşitlilik",
        "plant_forward_score": "bitkisel odak",
        "approved_menu_score": "onaylı menü",
        "data_coverage_score": "veri kapsama",
        "cost_efficiency_score": "maliyet verimliliği",
    }
    return labels.get(component, component)


def _is_plant_forward(item: dict[str, Any]) -> bool:
    haystack = f"{item.get('meal_name') or ''} {item.get('category') or ''}".lower()
    normalized = haystack.translate(str.maketrans({"ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c"}))
    return any(keyword in normalized for keyword in PLANT_FORWARD_KEYWORDS)


def _average(rows: list[dict[str, Any]], field: str) -> float:
    return _safe_divide(sum(_to_float(row.get(field)) for row in rows), len(rows))


def _ratio(numerator: int, denominator: int) -> float:
    return _safe_divide(numerator, denominator)


def _safe_divide(numerator: float, denominator: int) -> float:
    if denominator <= 0:
        return 0
    return numerator / denominator


def _target_score(value: float, lower: float, upper: float) -> float:
    if lower <= value <= upper:
        return 100
    if value <= 0:
        return 0
    distance = lower - value if value < lower else value - upper
    return max(0, 100 - (distance / upper) * 100)


def _cost_efficiency_score(average_cost: float) -> float:
    if average_cost <= 0:
        return 0
    if average_cost <= 75:
        return 100
    if average_cost >= 200:
        return 35
    return max(35, 100 - ((average_cost - 75) / 125) * 65)


def _to_float(value: Any) -> float:
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0


def _min_menu_date(menus: list[dict[str, Any]]) -> date | None:
    dates = [_parse_date(menu.get("week_start_date")) for menu in menus]
    dates = [value for value in dates if value]
    return min(dates) if dates else None


def _max_menu_date(menus: list[dict[str, Any]]) -> date | None:
    dates = [_parse_date(menu.get("week_start_date")) for menu in menus]
    dates = [value for value in dates if value]
    return max(dates) if dates else None


def _parse_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _format_value(value: Any) -> Any:
    if isinstance(value, str):
        return value.translate(TURKISH_ASCII_TRANSLATION)
    if isinstance(value, float):
        return f"{value:.4f}".replace(".", ",")
    return value
