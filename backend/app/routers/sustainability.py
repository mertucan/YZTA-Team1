from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.database import get_db

router = APIRouter(prefix="/sustainability", tags=["sustainability"])


class CarbonFactorCreate(BaseModel):
    ingredient_id: int
    co2_per_unit: float = Field(..., ge=0, description="1 birim malzeme başına kg CO2e emisyonu")
    notes: Optional[str] = None


class CarbonFactorUpdate(BaseModel):
    co2_per_unit: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


def _get_joined_carbon_factors(db) -> List[Dict[str, Any]]:
    """
    Supabase üzerindeki ingredient_carbon_factors tablosunu
    ingredients tablosu ile ingredient_id üzerinden JOIN ederek verileri çeker.
    """
    # 1. Yöntem: Direct table query & Join
    cf_data = []
    try:
        res = db.table("ingredient_carbon_factors").select("*").execute()
        cf_data = res.data or []
    except Exception:
        try:
            res = db.table("carbon_factors").select("*").execute()
            cf_data = res.data or []
        except Exception:
            cf_data = []

    ing_data = []
    try:
        res_ing = db.table("ingredients").select("*").execute()
        ing_data = res_ing.data or []
    except Exception:
        pass

    ing_dict = {ing["id"]: ing for ing in ing_data}

    # Eğer carbon_factors tablosu henüz veritabanında boşsa, varsayılan referans değerleri ile doldur
    if not cf_data and ing_dict:
        default_factors = {
            "dana": 27.0, "kuzu": 25.5, "tavuk": 6.9, "hindi": 5.4, "balık": 5.1,
            "peynir": 13.5, "süt": 3.2, "yumurta": 4.8, "tereyağı": 12.0,
            "pirinç": 4.5, "makarna": 1.7, "ekmek": 1.4, "un": 1.4, "mercimek": 0.9, "fasulye": 1.0,
            "patates": 0.5, "domates": 1.1, "salatalık": 0.8, "elma": 0.4, "zeytinyağı": 3.5
        }
        formatted = []
        for ing_id, ing in ing_dict.items():
            name_lower = ing.get("name", "").lower()
            co2 = 2.5
            for key, val in default_factors.items():
                if key in name_lower:
                    co2 = val
                    break
            formatted.append({
                "id": ing_id,
                "ingredient_id": ing_id,
                "co2_per_unit": float(co2),
                "notes": "Otomatik tahminli karbon faktörü",
                "created_at": None,
                "name": ing.get("name"),
                "unit": ing.get("unit") or "kg",
                "price": ing.get("price"),
                "is_local": bool(ing.get("is_local", False)),
                "category": ing.get("category") or ("Et & Kümes" if any(k in name_lower for k in ["tavuk","et","kuzu","köfte"]) else "Sebze & Tahıl")
            })
        return formatted

    formatted = []
    for row in cf_data:
        ing_id = row.get("ingredient_id")
        ing = ing_dict.get(ing_id, {})
        name_lower = (ing.get("name") or "").lower()
        formatted.append({
            "id": row.get("id"),
            "ingredient_id": ing_id,
            "co2_per_unit": float(row.get("co2_per_unit") or 0.0),
            "notes": row.get("notes"),
            "created_at": row.get("created_at"),
            "name": ing.get("name") or f"Malzeme #{ing_id}",
            "unit": ing.get("unit") or "kg",
            "price": ing.get("price"),
            "is_local": bool(ing.get("is_local", False)),
            "category": ing.get("category") or ("Et & Kümes" if any(k in name_lower for k in ["tavuk","et","kuzu","köfte"]) else "Sebze & Tahıl")
        })
    return formatted


@router.get("/carbon-factors")
def list_carbon_factors():
    """
    Supabase üzerindeki carbon_factors ve ingredients tablolarını JOIN ederek
    malzeme isimleri ve CO2 faktörleri ile birlikte listeler.
    """
    return _get_joined_carbon_factors(get_db())


@router.get("/summary")
def get_sustainability_summary():
    """
    Sürdürülebilirlik özet skor kartları ve metriklerini hesaplar.
    """
    factors = _get_joined_carbon_factors(get_db())
    if not factors:
        return {
            "total_carbon_footprint": 0.0,
            "average_co2_per_kg": 0.0,
            "local_ingredient_ratio": 0.0,
            "eco_score": 100,
            "eco_grade": "A+",
            "high_emission_count": 0,
            "total_ingredients_cataloged": 0
        }

    total_co2 = sum(f["co2_per_unit"] for f in factors)
    avg_co2 = total_co2 / len(factors) if factors else 0.0
    local_count = sum(1 for f in factors if f["is_local"])
    local_ratio = round((local_count / len(factors)) * 100, 1) if factors else 0.0
    high_emissions = [f for f in factors if f["co2_per_unit"] >= 10.0]

    # Eko-skor hesaplama (100 üzerinden)
    # Düşük ortalama CO2 ve yüksek yerellik skoru artırır
    base_score = 100 - (avg_co2 * 5) + (local_ratio * 0.25)
    eco_score = max(30, min(98, round(base_score)))

    if eco_score >= 90:
        eco_grade = "A+"
    elif eco_score >= 80:
        eco_grade = "A"
    elif eco_score >= 70:
        eco_grade = "B"
    elif eco_score >= 60:
        eco_grade = "C"
    else:
        eco_grade = "D"

    return {
        "total_carbon_footprint": round(total_co2 * 12.5, 1), # Tahmini aylık emisyon kg CO2e
        "average_co2_per_kg": round(avg_co2, 2),
        "local_ingredient_ratio": local_ratio,
        "eco_score": eco_score,
        "eco_grade": eco_grade,
        "high_emission_count": len(high_emissions),
        "total_ingredients_cataloged": len(factors)
    }


@router.get("/analysis")
def get_sustainability_analysis():
    """
    Karbon emisyon analiz grafikleri, kategori dağılımı ve alternatif öneriler.
    """
    factors = _get_joined_carbon_factors(get_db())

    # Kategori bazlı gruplama
    categories: Dict[str, Dict[str, Any]] = {}
    for f in factors:
        cat = f.get("category") or "Diğer"
        if cat not in categories:
            categories[cat] = {"category": cat, "count": 0, "total_co2": 0.0, "co2_values": []}
        categories[cat]["count"] += 1
        categories[cat]["total_co2"] += f["co2_per_unit"]
        categories[cat]["co2_values"].append(f["co2_per_unit"])

    total_all_co2 = sum(f["co2_per_unit"] for f in factors) or 1.0
    category_breakdown = []
    for cat, data in categories.items():
        avg = data["total_co2"] / data["count"] if data["count"] > 0 else 0
        share = round((data["total_co2"] / total_all_co2) * 100, 1)
        category_breakdown.append({
            "category": cat,
            "count": data["count"],
            "total_co2": round(data["total_co2"], 2),
            "average_co2": round(avg, 2),
            "share_percentage": share
        })

    # Sıralı yüksek emisyonlu malzemeler
    sorted_factors = sorted(factors, key=lambda x: x["co2_per_unit"], reverse=True)
    top_emitters = sorted_factors[:6]

    # Eko alternatif önerileri
    eco_swaps = [
        {
            "original": "Kırmızı Et (Dana)",
            "original_co2": 27.0,
            "alternative": "Hindi Eti / Bakliyat Mix",
            "alternative_co2": 4.2,
            "savings_percent": 84,
            "benefit": "Yıllık 1.2 Ton CO2 tasarrufu ve %35 daha düşük hammadde maliyeti"
        },
        {
            "original": "Sığır Sütü & Peynir",
            "original_co2": 13.5,
            "alternative": "Lokal Bitkisel Süt / Keçi Sütü",
            "alternative_co2": 3.1,
            "savings_percent": 77,
            "benefit": "Daha düşük karbon ve hipoalerjenik menü opsiyonu"
        },
        {
            "original": "İthal Pirinç",
            "original_co2": 4.5,
            "alternative": "Yerli Siyez / Yerli Bulgur",
            "alternative_co2": 1.1,
            "savings_percent": 75,
            "benefit": "Yerel üretici desteği ve yüksek lif içeriği"
        }
    ]

    # 6 aylık emisyon eğilimi (Simüle / Geçmiş)
    monthly_trend = [
        {"month": "Şubat", "total_co2_ton": 14.2, "eco_score": 72},
        {"month": "Mart", "total_co2_ton": 13.8, "eco_score": 75},
        {"month": "Nisan", "total_co2_ton": 12.9, "eco_score": 79},
        {"month": "Mayıs", "total_co2_ton": 11.5, "eco_score": 83},
        {"month": "Haziran", "total_co2_ton": 10.8, "eco_score": 86},
        {"month": "Temmuz", "total_co2_ton": 9.7, "eco_score": 89},
    ]

    return {
        "category_breakdown": category_breakdown,
        "top_emitters": top_emitters,
        "eco_swaps": eco_swaps,
        "monthly_trend": monthly_trend
    }


@router.post("/carbon-factors", status_code=201)
def create_or_update_carbon_factor(payload: CarbonFactorCreate):
    """
    Malzemeye ait karbon faktörünü ekler veya günceller.
    """
    db = get_db()
    data = {
        "ingredient_id": payload.ingredient_id,
        "co2_per_unit": payload.co2_per_unit,
        "notes": payload.notes
    }

    try:
        res = (
            db.table("carbon_factors")
            .upsert(data, on_conflict="ingredient_id")
            .execute()
        )
        return res.data[0] if res.data else data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Karbon faktörü kaydı başarısız: {exc}")


@router.patch("/carbon-factors/{factor_id}")
def update_carbon_factor(factor_id: int, payload: CarbonFactorUpdate):
    """
    Var olan bir karbon faktörü kaydını günceller.
    """
    db = get_db()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Güncellenecek alan belirtilmedi.")

    try:
        res = db.table("carbon_factors").update(updates).eq("id", factor_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Karbon faktörü bulunamadı.")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Güncelleme başarısız: {exc}")


@router.delete("/carbon-factors/{factor_id}", status_code=204)
def delete_carbon_factor(factor_id: int):
    """
    Karbon faktör kaydını siler.
    """
    db = get_db()
    try:
        db.table("carbon_factors").delete().eq("id", factor_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Silme işlemi başarısız: {exc}")
