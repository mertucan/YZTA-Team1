from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date


# ── Tedarikçi ──
class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    categories: Optional[str] = None  # virgülle ayrılmış kategoriler
    note: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    categories: Optional[str] = None
    note: Optional[str] = None


class Supplier(SupplierBase):
    id: int

    class Config:
        from_attributes = True


# ── Sipariş ──
class OrderItem(BaseModel):
    ingredient_id: int
    name: str
    unit: str
    quantity: float
    unit_price: Optional[float] = None
    line_total: Optional[float] = None
    reason: Optional[str] = None  # menu / threshold


class GenerateOrderRequest(BaseModel):
    supplier_id: Optional[int] = None


class OrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    status: Optional[str] = None  # draft / sent / received / cancelled
    note: Optional[str] = None
    items: Optional[List[OrderItem]] = None
