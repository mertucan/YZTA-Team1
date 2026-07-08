from pydantic import BaseModel
from typing import Literal, Optional

MealCategory = Literal[
    "Çorba",
    "Ana Yemek",
    "Ara Sıcak",
    "Tahıl (Pilav/Makarna)",
    "Yoğurt/Salata",
    "Tatlı/Meyve",
]


class MealIngredientInput(BaseModel):
    ingredient_id: int
    quantity: float


class MealIngredientOut(BaseModel):
    ingredient_id: int
    ingredient_name: str
    unit: str
    quantity: float


class MealBase(BaseModel):
    name: str
    category: MealCategory = "Ana Yemek"
    portions: int = 1


class MealCreate(MealBase):
    items: list[MealIngredientInput] = []


class MealUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[MealCategory] = None
    portions: Optional[int] = None
    items: Optional[list[MealIngredientInput]] = None


class Meal(MealBase):
    id: int
    calories: float = 0
    protein: float = 0
    iron: float = 0
    items: list[MealIngredientOut] = []

    class Config:
        from_attributes = True
