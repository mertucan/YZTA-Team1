from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.catering_management.auth import Principal, require_roles
from app.catering_management.core.database import get_db as get_catering_db
from app.catering_management.models import PartnerProductIntegration, Role
from app.database import get_db as get_supabase_db

router = APIRouter(prefix="/partner-products", tags=["partner-products"])

PARTNER_ROLES = (
    Role.partner_company,
    Role.dietitian,
    Role.chef,
    Role.catering_admin,
    Role.super_admin,
)
REVIEW_ROLES = (Role.dietitian, Role.chef, Role.catering_admin, Role.super_admin)

REQUEST_STATUSES = {"PENDING_REVIEW", "APPROVED", "NEEDS_REVISION", "REJECTED", "INTEGRATED"}


class PartnerProductCreate(BaseModel):
    brand_name: str = Field(min_length=2, max_length=120)
    product_name: str = Field(min_length=2, max_length=160)
    product_category: str = Field(min_length=2, max_length=80)
    suggested_menu_category: str = Field(min_length=2, max_length=80)
    serving_size: str | None = Field(default=None, max_length=80)
    calories: float = Field(default=0, ge=0)
    protein: float = Field(default=0, ge=0)
    sugar: float = Field(default=0, ge=0)
    sodium: float = Field(default=0, ge=0)
    target_segments: str | None = Field(default=None, max_length=240)
    allergens: str | None = Field(default=None, max_length=240)
    integration_note: str | None = None


class PartnerProductStatusUpdate(BaseModel):
    status: str = Field(pattern="^(PENDING_REVIEW|APPROVED|NEEDS_REVISION|REJECTED|INTEGRATED)$")
    review_note: str | None = None


class PartnerProductRead(BaseModel):
    id: int
    company_id: int | None
    submitted_by: int
    reviewed_by: int | None
    partner_company_name: str
    brand_name: str
    product_name: str
    product_category: str
    suggested_menu_category: str
    serving_size: str | None
    calories: float
    protein: float
    sugar: float
    sodium: float
    target_segments: str | None
    allergens: str | None
    integration_note: str | None
    status: str
    review_note: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PartnerProductUsageItem(BaseModel):
    product_id: int
    brand_name: str
    product_name: str
    status: str
    usage_count: int
    menu_count: int
    latest_week_start_date: str | None = None
    categories: list[str] = []


@router.get("/menu-opportunities")
def list_menu_opportunities(_: Principal = Depends(require_roles(*PARTNER_ROLES))):
    db = get_supabase_db()
    menus = db.table("weekly_menus").select("id, week_start_date, status").order("week_start_date", desc=True).limit(8).execute()
    items = db.table("weekly_menu_items").select("weekly_menu_id, category, meal_name, calories, protein").execute()

    items_by_menu: dict[int, list[dict]] = {}
    category_counts: dict[str, int] = {}
    for item in items.data or []:
        menu_id = item.get("weekly_menu_id")
        if menu_id is not None:
            items_by_menu.setdefault(menu_id, []).append(item)
        category = item.get("category") or "Diger"
        category_counts[category] = category_counts.get(category, 0) + 1

    return {
        "categories": [
            {"category": category, "menu_item_count": count}
            for category, count in sorted(category_counts.items(), key=lambda pair: pair[0])
        ],
        "recent_menus": [
            {
                **menu,
                "item_count": len(items_by_menu.get(menu["id"], [])),
                "sample_items": items_by_menu.get(menu["id"], [])[:4],
            }
            for menu in (menus.data or [])
        ],
    }


@router.get("/requests", response_model=list[PartnerProductRead])
def list_partner_requests(
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(*PARTNER_ROLES)),
):
    query = select(PartnerProductIntegration).order_by(desc(PartnerProductIntegration.created_at)).limit(50)
    if principal.role == Role.partner_company:
        query = query.where(PartnerProductIntegration.submitted_by == principal.profile.id)
    return db.scalars(query).all()


@router.get("/usage", response_model=list[PartnerProductUsageItem])
def list_partner_product_usage(
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(*PARTNER_ROLES)),
):
    query = select(PartnerProductIntegration).order_by(desc(PartnerProductIntegration.updated_at))
    if principal.role == Role.partner_company:
        query = query.where(PartnerProductIntegration.submitted_by == principal.profile.id)
    products = db.scalars(query).all()
    product_ids = [product.id for product in products]
    if not product_ids:
        return []

    supabase = get_supabase_db()
    item_res = (
        supabase.table("weekly_menu_items")
        .select("weekly_menu_id, partner_product_integration_id, category")
        .in_("partner_product_integration_id", product_ids)
        .execute()
    )
    rows = item_res.data or []
    menu_ids = sorted({row["weekly_menu_id"] for row in rows if row.get("weekly_menu_id") is not None})
    menu_dates: dict[int, str] = {}
    if menu_ids:
        menu_res = (
            supabase.table("weekly_menus")
            .select("id, week_start_date")
            .in_("id", menu_ids)
            .execute()
        )
        menu_dates = {row["id"]: row["week_start_date"] for row in (menu_res.data or [])}

    usage_by_product: dict[int, dict] = {
        product.id: {"usage_count": 0, "menu_ids": set(), "categories": set(), "latest": None}
        for product in products
    }
    for row in rows:
        product_id = row.get("partner_product_integration_id")
        if product_id not in usage_by_product:
            continue
        usage = usage_by_product[product_id]
        usage["usage_count"] += 1
        menu_id = row.get("weekly_menu_id")
        if menu_id is not None:
            usage["menu_ids"].add(menu_id)
            week = menu_dates.get(menu_id)
            if week and (usage["latest"] is None or week > usage["latest"]):
                usage["latest"] = week
        if row.get("category"):
            usage["categories"].add(row["category"])

    return [
        {
            "product_id": product.id,
            "brand_name": product.brand_name,
            "product_name": product.product_name,
            "status": product.status,
            "usage_count": usage_by_product[product.id]["usage_count"],
            "menu_count": len(usage_by_product[product.id]["menu_ids"]),
            "latest_week_start_date": usage_by_product[product.id]["latest"],
            "categories": sorted(usage_by_product[product.id]["categories"]),
        }
        for product in products
    ]


@router.post("/requests", response_model=PartnerProductRead, status_code=status.HTTP_201_CREATED)
def create_partner_request(
    payload: PartnerProductCreate,
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(*PARTNER_ROLES)),
):
    company_name = principal.profile.company.company_name if principal.profile.company else principal.profile.full_name
    request = PartnerProductIntegration(
        company_id=principal.company_id,
        submitted_by=principal.profile.id,
        partner_company_name=company_name,
        brand_name=payload.brand_name,
        product_name=payload.product_name,
        product_category=payload.product_category,
        suggested_menu_category=_normalize_menu_category(payload.suggested_menu_category),
        serving_size=payload.serving_size,
        calories=payload.calories,
        protein=payload.protein,
        sugar=payload.sugar,
        sodium=payload.sodium,
        target_segments=payload.target_segments,
        allergens=payload.allergens,
        integration_note=payload.integration_note,
        status="PENDING_REVIEW",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.put("/requests/{request_id}", response_model=PartnerProductRead)
def revise_partner_request(
    request_id: int,
    payload: PartnerProductCreate,
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(Role.partner_company)),
):
    request = db.get(PartnerProductIntegration, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Partner product request not found")
    if request.submitted_by != principal.profile.id:
        raise HTTPException(status_code=403, detail="Cannot revise another partner request")
    if request.status != "NEEDS_REVISION":
        raise HTTPException(status_code=400, detail="Only requests needing revision can be resubmitted")

    request.brand_name = payload.brand_name
    request.product_name = payload.product_name
    request.product_category = payload.product_category
    request.suggested_menu_category = _normalize_menu_category(payload.suggested_menu_category)
    request.serving_size = payload.serving_size
    request.calories = payload.calories
    request.protein = payload.protein
    request.sugar = payload.sugar
    request.sodium = payload.sodium
    request.target_segments = payload.target_segments
    request.allergens = payload.allergens
    request.integration_note = payload.integration_note
    request.status = "PENDING_REVIEW"
    request.reviewed_by = None
    db.commit()
    db.refresh(request)
    return request


@router.patch("/requests/{request_id}/status", response_model=PartnerProductRead)
def update_partner_request_status(
    request_id: int,
    payload: PartnerProductStatusUpdate,
    db: Session = Depends(get_catering_db),
    principal: Principal = Depends(require_roles(*REVIEW_ROLES)),
):
    if payload.status not in REQUEST_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid request status")
    request = db.get(PartnerProductIntegration, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Partner product request not found")

    request.status = payload.status
    request.review_note = payload.review_note
    request.reviewed_by = principal.profile.id
    db.commit()
    db.refresh(request)
    return request


def _normalize_menu_category(value: str) -> str:
    clean = value.strip()
    aliases = {
        "tahil": "Tahıl (Pilav/Makarna)",
        "tahıl": "Tahıl (Pilav/Makarna)",
        "pilav": "Tahıl (Pilav/Makarna)",
        "makarna": "Tahıl (Pilav/Makarna)",
        "salata": "Yogurt/Salata",
        "yogurt": "Yogurt/Salata",
        "yoğurt": "Yogurt/Salata",
        "tatli": "Tatli/Meyve",
        "tatlı": "Tatli/Meyve",
        "meyve": "Tatli/Meyve",
    }
    return aliases.get(clean.casefold(), clean)
