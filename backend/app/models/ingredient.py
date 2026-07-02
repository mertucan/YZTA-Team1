from pydantic import BaseModel
from typing import Optional


class IngredientBase(BaseModel):
    name: str
    unit: str
    stock: float = 0
    calories: float = 0


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    stock: Optional[float] = None
    calories: Optional[float] = None


class Ingredient(IngredientBase):
    id: int

    class Config:
        from_attributes = True
