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


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    iron: Optional[float] = None
    price: Optional[float] = None


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
