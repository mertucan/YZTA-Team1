from pydantic import BaseModel
from typing import Optional
from datetime import date


class IngredientBase(BaseModel):
    name: str
    unit: str
    calories: float = 0
    protein: float = 0
    iron: float = 0
    price: float = 0
    is_local: bool = False
    origin_region: Optional[str] = None
    season_start_month: Optional[int] = None
    season_end_month: Optional[int] = None
    market_price: Optional[float] = None
    last_price_checked_at: Optional[date] = None


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    iron: Optional[float] = None
    price: Optional[float] = None
    is_local: Optional[bool] = None
    origin_region: Optional[str] = None
    season_start_month: Optional[int] = None
    season_end_month: Optional[int] = None
    market_price: Optional[float] = None
    last_price_checked_at: Optional[date] = None


class Ingredient(IngredientBase):
    id: int
    stock: float = 0

    class Config:
        from_attributes = True


class IngredientBatchBase(BaseModel):
    quantity: float
    purchase_date: date
    expiry_date: Optional[date] = None


class IngredientBatchCreate(IngredientBatchBase):
    pass


class IngredientBatchUpdate(BaseModel):
    quantity: Optional[float] = None
    purchase_date: Optional[date] = None
    expiry_date: Optional[date] = None


class IngredientBatch(IngredientBatchBase):
    id: int
    ingredient_id: int

    class Config:
        from_attributes = True
