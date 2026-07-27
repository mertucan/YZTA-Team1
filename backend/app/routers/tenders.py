import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, status
from app.database import get_db

logger = logging.getLogger(__name__)
from app.schemas.tenders import (
    CostCalculationPayload,
    CostCalculationResult,
    TenderCostItemCreate,
    TenderCostItemRead,
    TenderCreate,
    TenderRead,
    TenderUpdate,
)

router = APIRouter(prefix="/tenders", tags=["tenders"])


# ----------------------------------------------------
# Helper to fetch company_id or default fallback
# ----------------------------------------------------
def _get_supabase_db():
    return get_db()


# ----------------------------------------------------
# 0. GET /tenders/companies-list - List available companies
# ----------------------------------------------------
@router.get("/companies-list")
def get_companies_list():
    db = _get_supabase_db()
    try:
        res = db.table("companies").select("*").execute()
        if res.data and len(res.data) > 0:
            formatted = []
            for comp in res.data:
                c_id = comp.get("id")
                c_name = comp.get("company_name") or comp.get("name") or f"Firma #{c_id}"
                formatted.append({"id": c_id, "name": c_name})
            return formatted
    except Exception as e:
        print("Company query exception:", e)
        pass
    return [{"id": 1, "name": "Ana Catering Firması A.Ş."}]



# ----------------------------------------------------
# 1. GET /tenders - List all tenders
# ----------------------------------------------------
@router.get("", response_model=list[TenderRead])
def list_tenders(status_filter: str | None = Query(None, alias="status")):
    db = _get_supabase_db()
    query = db.table("tenders").select("*").order("id", desc=True)
    if status_filter:
        query = query.eq("status", status_filter)
    
    res = query.execute()
    tenders = res.data or []
    
    # Fetch cost items for each tender if table exists
    if tenders:
        tender_ids = [t["id"] for t in tenders]
        try:
            items_res = db.table("tender_cost_items").select("*").in_("tender_id", tender_ids).execute()
            items_data = items_res.data or []
            items_by_tender = {}
            for item in items_data:
                items_by_tender.setdefault(item["tender_id"], []).append(item)
            
            for tender in tenders:
                tender["cost_items"] = items_by_tender.get(tender["id"], [])
        except Exception:
            for tender in tenders:
                tender["cost_items"] = []
                
    return tenders


def _get_active_company_id(db) -> int:
    try:
        res = db.table("companies").select("id").limit(1).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]["id"]
    except Exception:
        pass
        
    try:
        res = db.table("user_profiles").select("company_id").not_("company_id", "is", None).limit(1).execute()
        if res.data and len(res.data) > 0 and res.data[0].get("company_id"):
            return res.data[0]["company_id"]
    except Exception:
        pass
        
    return 1


# ----------------------------------------------------
# 2. POST /tenders - Create a new tender
# ----------------------------------------------------
@router.post("", response_model=TenderRead, status_code=status.HTTP_201_CREATED)
def create_tender(payload: TenderCreate):
    db = _get_supabase_db()
    data = payload.model_dump(mode="json")
    
    if not data.get("company_id"):
        data["company_id"] = _get_active_company_id(db)
    
    try:
        res = db.table("tenders").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="İhale kaydı oluşturulamadı")
        created = res.data[0]
        created["cost_items"] = []
        return created
    except HTTPException:
        raise
    except Exception:
        logger.exception("İhale oluşturulurken veritabanı hatası")
        raise HTTPException(status_code=500, detail="İhale kaydedilemedi. Lütfen tekrar deneyin.")


# ----------------------------------------------------
# 3. GET /tenders/{tender_id} - Get tender details
# ----------------------------------------------------
@router.get("/{tender_id}", response_model=TenderRead)
def get_tender(tender_id: int):
    db = _get_supabase_db()
    res = db.table("tenders").select("*").eq("id", tender_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="İhale bulunamadı")
    
    tender = res.data[0]
    try:
        items_res = db.table("tender_cost_items").select("*").eq("tender_id", tender_id).execute()
        tender["cost_items"] = items_res.data or []
    except Exception:
        tender["cost_items"] = []
        
    return tender


# ----------------------------------------------------
# 4. PATCH /tenders/{tender_id} - Update tender
# ----------------------------------------------------
@router.patch("/{tender_id}", response_model=TenderRead)
def update_tender(tender_id: int, payload: TenderUpdate):
    db = _get_supabase_db()
    update_data = {k: v for k, v in payload.model_dump(mode="json").items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Güncellenecek veri belirtilmedi")
        
    res = db.table("tenders").update(update_data).eq("id", tender_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="İhale bulunamadı veya güncellenemedi")
        
    tender = res.data[0]
    try:
        items_res = db.table("tender_cost_items").select("*").eq("tender_id", tender_id).execute()
        tender["cost_items"] = items_res.data or []
    except Exception:
        tender["cost_items"] = []
        
    return tender


# ----------------------------------------------------
# 5. DELETE /tenders/{tender_id} - Delete tender
# ----------------------------------------------------
@router.delete("/{tender_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tender(tender_id: int):
    db = _get_supabase_db()
    res = db.table("tenders").delete().eq("id", tender_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="İhale bulunamadı")
    return None


# ----------------------------------------------------
# 6. POST /tenders/calculate-cost - Live Cost Calculator
# ----------------------------------------------------
@router.post("/calculate-cost", response_model=CostCalculationResult)
def calculate_tender_cost(payload: CostCalculationPayload):
    raw_cost = payload.raw_ingredient_cost_per_portion
    labor_cost = raw_cost * (payload.labor_overhead_percent / 100.0)
    logistics = payload.logistics_cost_per_portion
    
    base_cost_per_portion = raw_cost + labor_cost + logistics
    margin_ratio = payload.target_profit_margin_percent / 100.0
    
    # Suggested bid price per portion to achieve target profit margin
    # Bid Price = Base Cost / (1 - Margin Ratio)
    if margin_ratio >= 1.0:
        suggested_bid = base_cost_per_portion * 2.0
    else:
        suggested_bid = base_cost_per_portion / (1.0 - margin_ratio) if (1.0 - margin_ratio) > 0 else base_cost_per_portion * 1.2
        
    total_meals = payload.daily_person_count * payload.days_count
    total_contract_value = suggested_bid * total_meals
    total_base_cost = base_cost_per_portion * total_meals
    estimated_total_profit = total_contract_value - total_base_cost
    
    return CostCalculationResult(
        raw_ingredient_cost=round(raw_cost, 2),
        labor_overhead_cost=round(labor_cost, 2),
        logistics_cost=round(logistics, 2),
        total_base_cost_per_portion=round(base_cost_per_portion, 2),
        suggested_bid_price_per_portion=round(suggested_bid, 2),
        total_estimated_meals=total_meals,
        total_contract_value=round(total_contract_value, 2),
        estimated_total_profit=round(estimated_total_profit, 2),
        profit_margin_percent=payload.target_profit_margin_percent,
    )


# ----------------------------------------------------
# 7. POST /tenders/{tender_id}/items - Add cost item
# ----------------------------------------------------
@router.post("/{tender_id}/items", response_model=TenderCostItemRead, status_code=status.HTTP_201_CREATED)
def add_tender_cost_item(tender_id: int, payload: TenderCostItemCreate):
    db = _get_supabase_db()
    
    # Ensure tender exists
    tender_res = db.table("tenders").select("id").eq("id", tender_id).execute()
    if not tender_res.data:
        raise HTTPException(status_code=404, detail="İhale bulunamadı")
        
    data = payload.model_dump(mode="json")
    data["tender_id"] = tender_id
    
    try:
        res = db.table("tender_cost_items").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Maliyet kalemi eklenemedi")
        return res.data[0]
    except HTTPException:
        raise
    except Exception:
        logger.exception("Maliyet kalemi eklenirken veritabanı hatası")
        raise HTTPException(status_code=500, detail="Maliyet kalemi eklenemedi. Lütfen tekrar deneyin.")
