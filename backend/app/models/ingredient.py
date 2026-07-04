from pydantic import BaseModel
from typing import Optional
from datetime import date


class IngredientBase(BaseModel):
    name: str
    unit: str
    stock: float = 0
    calories: float = 0
    protein: float = 0
    iron: float = 0
    price: float = 0
    expiry_date: Optional[date] = None


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    stock: Optional[float] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    iron: Optional[float] = None
    price: Optional[float] = None
    expiry_date: Optional[date] = None


class Ingredient(IngredientBase):
    id: int

    class Config:
        from_attributes = True
