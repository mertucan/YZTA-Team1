from pydantic import BaseModel
from typing import Optional


class MealBase(BaseModel):
    name: str
    stock: int = 0
    ingredient_id: Optional[int] = None
    rating_id: Optional[int] = None
    calories: float = 0


class MealCreate(MealBase):
    pass


class MealUpdate(BaseModel):
    name: Optional[str] = None
    stock: Optional[int] = None
    ingredient_id: Optional[int] = None
    rating_id: Optional[int] = None
    calories: Optional[float] = None


class Meal(MealBase):
    id: int

    class Config:
        from_attributes = True
