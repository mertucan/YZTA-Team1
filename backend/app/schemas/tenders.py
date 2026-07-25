from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


# ==========================================
# İhale (Tender) Schemas
# ==========================================

class TenderBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="İhale Başlığı")
    institution_name: str = Field(..., min_length=2, max_length=255, description="İhaleyi Veren Kurum Adı")
    daily_person_count: int = Field(..., ge=1, description="Günlük Kişi Sayısı")
    meal_type: str = Field(default="Öğle Yemeği", max_length=50, description="Öğün Tipi")
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    profit_margin_percent: float = Field(default=20.0, ge=0, le=100, description="Hedeflenen Kâr Marjı (%)")
    status: str = Field(default="DRAFT", description="DRAFT, SUBMITTED, WON, LOST")


class TenderCreate(TenderBase):
    pass


class TenderUpdate(BaseModel):
    title: Optional[str] = None
    institution_name: Optional[str] = None
    daily_person_count: Optional[int] = None
    meal_type: Optional[str] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    profit_margin_percent: Optional[float] = None
    status: Optional[str] = None


class TenderCostItemBase(BaseModel):
    item_name: str = Field(..., min_length=2, max_length=150, description="Maliyet Kalemi Adı")
    cost_per_portion: float = Field(..., ge=0, description="Porsiyon Başı Maliyet (TL)")
    total_estimated_cost: float = Field(..., ge=0, description="Tahmini Toplam Maliyet (TL)")


class TenderCostItemCreate(TenderCostItemBase):
    pass


class TenderCostItemRead(TenderCostItemBase):
    id: int
    tender_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenderRead(TenderBase):
    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None
    cost_items: list[TenderCostItemRead] = []

    class Config:
        from_attributes = True


# ==========================================
# Maliyet Hesabı (Cost Calculation) Schemas
# ==========================================

class CostCalculationPayload(BaseModel):
    daily_person_count: int = Field(..., ge=1)
    days_count: int = Field(default=30, ge=1)
    raw_ingredient_cost_per_portion: float = Field(..., ge=0, description="Ham Malzeme Maliyeti (TL)")
    labor_overhead_percent: float = Field(default=25.0, ge=0, description="İşçilik & Mutfak Gideri (%)")
    logistics_cost_per_portion: float = Field(default=5.0, ge=0, description="Lojistik & Taşıma Maliyeti (TL)")
    target_profit_margin_percent: float = Field(default=20.0, ge=0, description="Hedef Kâr Marjı (%)")


class CostCalculationResult(BaseModel):
    raw_ingredient_cost: float
    labor_overhead_cost: float
    logistics_cost: float
    total_base_cost_per_portion: float
    suggested_bid_price_per_portion: float
    total_estimated_meals: int
    total_contract_value: float
    estimated_total_profit: float
    profit_margin_percent: float


# ==========================================
# Fatura / Hakediş (Invoice) Schemas
# ==========================================

class InvoiceBase(BaseModel):
    invoice_number: str = Field(..., max_length=50)
    client_name: str = Field(..., max_length=255)
    period_month: int = Field(..., ge=1, le=12)
    period_year: int = Field(..., ge=2020, le=2100)
    total_meals_delivered: int = Field(..., ge=0)
    unit_price: float = Field(..., ge=0)
    subtotal: float = Field(..., ge=0)
    vat_percent: float = Field(default=10.0, ge=0)
    vat_amount: float = Field(..., ge=0)
    grand_total: float = Field(..., ge=0)
    status: str = Field(default="ISSUED", description="DRAFT, ISSUED, PAID, CANCELLED")
    pdf_url: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    pass


class AutoInvoiceGeneratePayload(BaseModel):
    client_name: str = Field(..., max_length=255)
    period_month: int = Field(..., ge=1, le=12)
    period_year: int = Field(..., ge=2020, le=2100)
    unit_price: float = Field(..., ge=0)
    vat_percent: float = Field(default=10.0, ge=0)
    custom_meal_count: Optional[int] = Field(default=None, description="Varsa özel öğün sayısı")


class InvoiceStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(DRAFT|ISSUED|PAID|CANCELLED)$")


class InvoiceRead(InvoiceBase):
    id: int
    company_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
