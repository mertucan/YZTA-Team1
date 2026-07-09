from pydantic import BaseModel
from typing import Optional
from datetime import date


class WeeklyMenuGenerate(BaseModel):
    week_start_date: date
    budget: float
    extra_instructions: Optional[str] = None


class WeeklyMenuCreateManual(BaseModel):
    week_start_date: date
    budget: float = 0


class WeeklyMenuMealItemCreate(BaseModel):
    day_of_week: str
    category: str
    meal_id: int


class WeeklyMenuItem(BaseModel):
    id: int
    weekly_menu_id: int
    day_of_week: str
    meal_name: str
    ingredient_id: Optional[int] = None
    meal_id: Optional[int] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    portions: Optional[int] = None
    estimated_cost: float
    calories: float
    protein: float
    iron: float

    class Config:
        from_attributes = True


class WeeklyMenu(BaseModel):
    id: int
    week_start_date: date
    budget: float
    total_cost: float
    total_calories: float
    total_protein: float
    total_iron: float
    status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class WeeklyMenuDetail(WeeklyMenu):
    items: list[WeeklyMenuItem] = []


class WeeklyMenuStatusUpdate(BaseModel):
    status: str
